import { APS_ID } from '../config/apsConfig';
import {
  LEADERBOARD_VISIBLE_LIMIT,
  isStaffAttendeeType,
  leaderboardDisplayName,
  scoreBreakdownPayload,
  type EvaluatedScore,
} from '../config/leaderboardPoints';
import {
  apsAppLeaderboardEntriesByEventIdAndUpdatedAt,
  createApsAppLeaderboardEntry,
  getApsAppLeaderboardEntry,
  leaderboardProfileIdByRegistrant,
  leaderboardStaffProfiles,
  leaderboardStaffRegistrants,
  leaderboardEventRegistrantTypes,
  updateApsAppLeaderboardEntry,
} from '../graphql/leaderboardOps';
import { graphqlApiKeyClient, graphqlAuthClient } from '../utils/graphqlClient';
import { drainIndexedList } from '../utils/paginateGraphql';

export type LeaderboardEntryRecord = {
  id: string;
  owner?: string | null;
  eventId: string;
  userProfileId: string;
  displayName: string;
  company?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
  points: number;
  breakdown?: string | Record<string, unknown> | null;
  updatedAt?: string | null;
};

export type RankedLeaderboardEntry = LeaderboardEntryRecord & {
  rank: number;
};

export function leaderboardEntryId(profileId: string, eventId = APS_ID) {
  return `lb:${eventId}|p:${profileId}`;
}

export function isLeaderboardSchemaError(error: unknown) {
  const message = String((error as { message?: string })?.message || error || '');
  const errors = (error as { errors?: { message?: string }[] })?.errors || [];
  const combined = [message, ...errors.map((item) => item?.message || '')].join(' ');
  return /cannot query field|unknown type|undefined field|not authorized|unauthorized|no matching resolver/i.test(
    combined,
  );
}

function asEntry(raw: any): LeaderboardEntryRecord | null {
  if (!raw?.id || !raw.userProfileId) return null;
  return {
    id: String(raw.id),
    owner: raw.owner || null,
    eventId: String(raw.eventId || APS_ID),
    userProfileId: String(raw.userProfileId),
    displayName: String(raw.displayName || 'Attendee'),
    company: raw.company || null,
    jobTitle: raw.jobTitle || null,
    profilePicture: raw.profilePicture || null,
    points: Number(raw.points || 0),
    breakdown: raw.breakdown || null,
    updatedAt: raw.updatedAt || null,
  };
}

export function rankLeaderboardEntries(entries: LeaderboardEntryRecord[]): RankedLeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aTime = a.updatedAt || '';
    const bTime = b.updatedAt || '';
    if (aTime !== bTime) return aTime.localeCompare(bTime);
    return a.displayName.localeCompare(b.displayName);
  });
  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function getLeaderboardEntry(id: string): Promise<LeaderboardEntryRecord | null> {
  let lastError: unknown = null;
  for (const client of [graphqlApiKeyClient, graphqlAuthClient]) {
    try {
      const resp = await client.graphql({
        query: getApsAppLeaderboardEntry,
        variables: { id },
      });
      const entry = asEntry((resp as any)?.data?.getApsAppLeaderboardEntry);
      if (entry) return entry;
    } catch (error) {
      lastError = error;
      if (isLeaderboardSchemaError(error)) throw error;
    }
  }
  if (lastError && isLeaderboardSchemaError(lastError)) throw lastError;
  return null;
}

export async function listLeaderboardEntries(eventId = APS_ID): Promise<LeaderboardEntryRecord[]> {
  let lastError: unknown = null;
  for (const client of [graphqlApiKeyClient, graphqlAuthClient]) {
    try {
      const rows = await drainIndexedList<any>({
        client,
        query: apsAppLeaderboardEntriesByEventIdAndUpdatedAt,
        field: 'apsAppLeaderboardEntriesByEventIdAndUpdatedAt',
        variables: { eventId },
        pageSize: 500,
      });
      return rows.map(asEntry).filter((row): row is LeaderboardEntryRecord => !!row && row.points > 0);
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return [];
}

const STAFF_CACHE_MS = 10 * 60_000;
const STAFF_LOOKUP_CHUNK = 8;
let staffIdCache: { at: number; ids: Set<string> } | null = null;

async function listEventRegistrantsForStaff() {
  try {
    return await drainIndexedList<{
      id?: string | null;
      attendeeType?: string | null;
      appUser?: { profileId?: string | null; profile?: { id?: string | null } | null } | null;
    }>({
      client: graphqlApiKeyClient,
      query: leaderboardStaffRegistrants,
      field: 'apsRegistrantsByApsID',
      variables: { apsID: APS_ID },
      pageSize: 200,
    });
  } catch (error) {
    console.warn('Nested staff registrant lookup failed, using type-only list:', error);
    return drainIndexedList<{
      id?: string | null;
      attendeeType?: string | null;
      appUser?: { profileId?: string | null; profile?: { id?: string | null } | null } | null;
    }>({
      client: graphqlApiKeyClient,
      query: leaderboardEventRegistrantTypes,
      field: 'apsRegistrantsByApsID',
      variables: { apsID: APS_ID },
      pageSize: 200,
    });
  }
}

async function profileIdForRegistrant(registrantId: string): Promise<string | null> {
  for (const client of [graphqlApiKeyClient, graphqlAuthClient]) {
    try {
      const resp = await client.graphql({
        query: leaderboardProfileIdByRegistrant,
        variables: { registrantId },
      });
      const appUser = (resp as any)?.data?.apsAppUsersByRegistrantId?.items?.find(Boolean);
      const profileId = appUser?.profile?.id || appUser?.profileId;
      if (profileId) return String(profileId);
    } catch {
      // try the next client
    }
  }
  return null;
}

/**
 * Board-only staff set. Event registrant type is the source of truth (profile
 * attendeeType is often unset). Never used by the personal Summit Score path.
 */
export async function listStaffProfileIds(): Promise<Set<string>> {
  if (staffIdCache && Date.now() - staffIdCache.at < STAFF_CACHE_MS) {
    return new Set(staffIdCache.ids);
  }
  const ids = new Set<string>();
  try {
    const [registrants, staffProfiles] = await Promise.all([
      listEventRegistrantsForStaff(),
      drainIndexedList<{ id?: string | null; attendeeType?: string | null }>({
        client: graphqlApiKeyClient,
        query: leaderboardStaffProfiles,
        field: 'listApsAppUserProfiles',
        variables: { filter: { attendeeType: { eq: 'STAFF' } } },
        pageSize: 200,
      }),
    ]);

    const missingRegistrantIds: string[] = [];
    for (const row of registrants) {
      if (!row.id || !isStaffAttendeeType(row.attendeeType)) continue;
      const nestedId = row.appUser?.profile?.id || row.appUser?.profileId;
      if (nestedId) ids.add(String(nestedId));
      else missingRegistrantIds.push(String(row.id));
    }

    for (let i = 0; i < missingRegistrantIds.length; i += STAFF_LOOKUP_CHUNK) {
      const chunk = missingRegistrantIds.slice(i, i + STAFF_LOOKUP_CHUNK);
      const profileIds = await Promise.all(chunk.map(profileIdForRegistrant));
      for (const profileId of profileIds) {
        if (profileId) ids.add(profileId);
      }
    }

    for (const row of staffProfiles) {
      if (row.id && isStaffAttendeeType(row.attendeeType)) ids.add(row.id);
    }
  } catch (error) {
    console.warn('Staff leaderboard filter failed:', error);
    return ids;
  }
  staffIdCache = { at: Date.now(), ids };
  return new Set(ids);
}

export function withoutStaffEntries<T extends { userProfileId: string }>(
  entries: T[],
  staffIds: Set<string>,
) {
  if (!staffIds.size) return entries;
  return entries.filter((entry) => !staffIds.has(entry.userProfileId));
}

export function visibleLeaderboard(entries: RankedLeaderboardEntry[]) {
  return entries.slice(0, LEADERBOARD_VISIBLE_LIMIT);
}

export async function upsertLeaderboardEntry(params: {
  profileId: string;
  ownerUserId: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
  score: EvaluatedScore;
  eventId?: string;
}): Promise<LeaderboardEntryRecord | null> {
  const eventId = params.eventId || APS_ID;
  const id = leaderboardEntryId(params.profileId, eventId);
  const payload = {
    displayName: leaderboardDisplayName(params.firstName, params.lastName),
    company: (params.company || '').trim() || null,
    jobTitle: (params.jobTitle || '').trim() || null,
    profilePicture: (params.profilePicture || '').trim() || null,
    points: params.score.total,
    breakdown: JSON.stringify(scoreBreakdownPayload(params.score)),
  };

  const existing = await getLeaderboardEntry(id);
  if (existing) {
    const resp = await graphqlAuthClient.graphql({
      query: updateApsAppLeaderboardEntry,
      variables: { input: { id, ...payload } },
    });
    return asEntry((resp as any)?.data?.updateApsAppLeaderboardEntry) || {
      ...existing,
      ...payload,
    };
  }

  if (params.score.total <= 0) return null;

  const resp = await graphqlAuthClient.graphql({
    query: createApsAppLeaderboardEntry,
    variables: {
      input: {
        id,
        owner: params.ownerUserId,
        eventId,
        userProfileId: params.profileId,
        ...payload,
      },
    },
  });
  return asEntry((resp as any)?.data?.createApsAppLeaderboardEntry);
}
