import { APS_ID } from '../config/apsConfig';
import { graphqlApiKeyClient } from '../utils/graphqlClient';
import { parseAttendeeQrPayload, type ParsedAttendeeQr } from '../utils/attendeeQr';

const scanRegistrantsByEmail = /* GraphQL */ `
  query ScanRegistrantsByEmail($email: String!) {
    apsRegistrantsByEmail(email: $email, limit: 25) {
      items {
        id
        apsID
        email
        appUserId
        __typename
      }
      __typename
    }
  }
`;

const scanAppUserByRegistrantId = /* GraphQL */ `
  query ScanAppUserByRegistrantId($registrantId: ID!) {
    apsAppUsersByRegistrantId(registrantId: $registrantId, limit: 1) {
      items {
        id
        profileId
        profile {
          id
          userId
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;

const scanGetProfile = /* GraphQL */ `
  query ScanGetApsAppUserProfile($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      userId
      __typename
    }
  }
`;

const scanGetRegistrant = /* GraphQL */ `
  query ScanGetApsRegistrant($id: ID!) {
    getApsRegistrant(id: $id) {
      id
      appUserId
      __typename
    }
  }
`;

export type ResolveAttendeeQrResult =
  | { ok: true; profileId: string; userId?: string }
  | { ok: false; error: string };

type ResolvedProfile = { profileId: string; userId?: string };

function graphqlData(resp: unknown): any {
  if (resp && typeof resp === 'object' && 'data' in resp) return (resp as any).data;
  return (resp as any)?.data ?? null;
}

async function graphqlSafe<T = any>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const resp = await graphqlApiKeyClient.graphql({ query, variables });
    return graphqlData(resp) as T;
  } catch (error: any) {
    if (error?.data) return error.data as T;
    return null;
  }
}

function emailCandidates(email: string) {
  const trimmed = email.trim();
  const lower = trimmed.toLowerCase();
  return trimmed === lower ? [trimmed] : [lower, trimmed];
}

async function profileForRegistrant(registrantId: string): Promise<ResolvedProfile | null> {
  const data = await graphqlSafe<{
    apsAppUsersByRegistrantId?: {
      items?: Array<{
        id?: string | null;
        profileId?: string | null;
        profile?: { id?: string | null; userId?: string | null } | null;
      } | null> | null;
    };
  }>(scanAppUserByRegistrantId, { registrantId });
  const user = data?.apsAppUsersByRegistrantId?.items?.find(Boolean);
  const profileId = user?.profileId || user?.profile?.id || null;
  if (!profileId) return null;
  return { profileId, userId: user?.id || user?.profile?.userId || undefined };
}

async function loadProfile(profileId: string): Promise<ResolvedProfile | null> {
  const data = await graphqlSafe<{
    getApsAppUserProfile?: { id?: string | null; userId?: string | null } | null;
  }>(scanGetProfile, {
    id: profileId,
  });
  const profile = data?.getApsAppUserProfile;
  if (!profile?.id) return null;
  return { profileId: profile.id, userId: profile.userId || undefined };
}

async function resolveRegistrantId(registrantId: string): Promise<ResolvedProfile | null> {
  const fromUser = await profileForRegistrant(registrantId);
  if (fromUser) return fromUser;

  const registrant = await graphqlSafe<{ getApsRegistrant?: { id?: string | null; appUserId?: string | null } | null }>(
    scanGetRegistrant,
    { id: registrantId },
  );
  const appUserId = registrant?.getApsRegistrant?.appUserId;
  if (!appUserId) return null;
  const data = await graphqlSafe<{
    getApsAppUser?: { id?: string | null; profileId?: string | null; profile?: { id?: string | null } | null } | null;
  }>(
    /* GraphQL */ `
      query ScanGetApsAppUser($id: ID!) {
        getApsAppUser(id: $id) {
          id
          profileId
          profile {
            id
            __typename
          }
          __typename
        }
      }
    `,
    { id: appUserId },
  );
  const profileId = data?.getApsAppUser?.profileId || data?.getApsAppUser?.profile?.id || null;
  if (!profileId) return null;
  return { profileId, userId: data?.getApsAppUser?.id || appUserId };
}

async function resolveEmail(
  email: string,
): Promise<ResolvedProfile | { registrantWithoutProfile: true } | null> {
  let sawRegistrant = false;
  for (const candidate of emailCandidates(email)) {
    const data = await graphqlSafe<{
      apsRegistrantsByEmail?: {
        items?: Array<{ id?: string | null; apsID?: string | null } | null> | null;
      };
    }>(scanRegistrantsByEmail, { email: candidate });
    const items = (data?.apsRegistrantsByEmail?.items || []).filter((item) => !!item?.id);
    const preferred = items.find((item) => item?.apsID === APS_ID) || items[0];
    if (!preferred?.id) continue;
    sawRegistrant = true;
    const resolved = await profileForRegistrant(preferred.id);
    if (resolved) return resolved;
  }
  if (sawRegistrant) return { registrantWithoutProfile: true };
  return null;
}

async function resolveParsed(parsed: ParsedAttendeeQr): Promise<ResolveAttendeeQrResult> {
  if (parsed.kind === 'passport') {
    return {
      ok: false,
      error: "That's an exhibitor passport QR. Open Passport Challenge to collect a stamp.",
    };
  }

  if (parsed.kind === 'profile' && parsed.profileId) {
    const existing = await loadProfile(parsed.profileId);
    if (existing) return { ok: true, ...existing };
    const fromRegistrant = await resolveRegistrantId(parsed.profileId);
    if (fromRegistrant) return { ok: true, ...fromRegistrant };
    return { ok: false, error: "We couldn't find an app profile for this attendee." };
  }

  if (parsed.kind === 'registrant' && parsed.registrantId) {
    const resolved = await resolveRegistrantId(parsed.registrantId);
    if (resolved) return { ok: true, ...resolved };
    return { ok: false, error: "This attendee hasn't set up their app profile yet." };
  }

  if (parsed.kind === 'email' && parsed.email) {
    const resolved = await resolveEmail(parsed.email);
    if (resolved && 'profileId' in resolved) return { ok: true, ...resolved };
    if (resolved && 'registrantWithoutProfile' in resolved) {
      return { ok: false, error: "This attendee hasn't set up their app profile yet." };
    }
    return { ok: false, error: "We couldn't find an app profile for this attendee." };
  }

  return { ok: false, error: 'Not a valid APS attendee QR code.' };
}

export async function resolveAttendeeQrPayload(payload: string): Promise<ResolveAttendeeQrResult> {
  return resolveParsed(parseAttendeeQrPayload(payload));
}
