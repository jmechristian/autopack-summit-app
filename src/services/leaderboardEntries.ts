import { APS_ID } from '../config/apsConfig';
import {
  LEADERBOARD_VISIBLE_LIMIT,
  leaderboardDisplayName,
  scoreBreakdownPayload,
  type EvaluatedScore,
} from '../config/leaderboardPoints';
import {
  apsAppLeaderboardEntriesByEventIdAndUpdatedAt,
  createApsAppLeaderboardEntry,
  getApsAppLeaderboardEntry,
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
  try {
    const resp = await graphqlAuthClient.graphql({
      query: getApsAppLeaderboardEntry,
      variables: { id },
    });
    return asEntry((resp as any)?.data?.getApsAppLeaderboardEntry);
  } catch (error) {
    if (isLeaderboardSchemaError(error)) throw error;
    return null;
  }
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
