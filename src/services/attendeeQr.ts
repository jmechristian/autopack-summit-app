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
  | { ok: true; profileId: string }
  | { ok: false; error: string };

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

async function profileIdForRegistrant(registrantId: string): Promise<string | null> {
  const data = await graphqlSafe<{
    apsAppUsersByRegistrantId?: {
      items?: Array<{ profileId?: string | null; profile?: { id?: string | null } | null } | null> | null;
    };
  }>(scanAppUserByRegistrantId, { registrantId });
  const user = data?.apsAppUsersByRegistrantId?.items?.find(Boolean);
  return user?.profileId || user?.profile?.id || null;
}

async function profileExists(profileId: string): Promise<boolean> {
  const data = await graphqlSafe<{ getApsAppUserProfile?: { id?: string | null } | null }>(scanGetProfile, {
    id: profileId,
  });
  return !!data?.getApsAppUserProfile?.id;
}

async function resolveRegistrantId(registrantId: string): Promise<string | null> {
  const fromUser = await profileIdForRegistrant(registrantId);
  if (fromUser) return fromUser;

  const registrant = await graphqlSafe<{ getApsRegistrant?: { id?: string | null; appUserId?: string | null } | null }>(
    scanGetRegistrant,
    { id: registrantId },
  );
  const appUserId = registrant?.getApsRegistrant?.appUserId;
  if (!appUserId) return null;
  const data = await graphqlSafe<{
    getApsAppUser?: { profileId?: string | null; profile?: { id?: string | null } | null } | null;
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
  return data?.getApsAppUser?.profileId || data?.getApsAppUser?.profile?.id || null;
}

async function resolveEmail(email: string): Promise<{ profileId: string } | { registrantWithoutProfile: true } | null> {
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
    const profileId = await profileIdForRegistrant(preferred.id);
    if (profileId) return { profileId };
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
    if (await profileExists(parsed.profileId)) return { ok: true, profileId: parsed.profileId };
    const fromRegistrant = await resolveRegistrantId(parsed.profileId);
    if (fromRegistrant) return { ok: true, profileId: fromRegistrant };
    return { ok: false, error: "We couldn't find an app profile for this attendee." };
  }

  if (parsed.kind === 'registrant' && parsed.registrantId) {
    const profileId = await resolveRegistrantId(parsed.registrantId);
    if (profileId) return { ok: true, profileId };
    return { ok: false, error: "This attendee hasn't set up their app profile yet." };
  }

  if (parsed.kind === 'email' && parsed.email) {
    const resolved = await resolveEmail(parsed.email);
    if (resolved && 'profileId' in resolved) return { ok: true, profileId: resolved.profileId };
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
