import type * as APITypes from '../../../API';
import { APS_ID } from '../../../config/apsConfig';
import {
  emptyLeaderboardFacts,
  evaluateLeaderboardScore,
  leaderboardDisplayName,
  type AwardCategoryId,
  type EvaluatedScore,
  type LeaderboardFacts,
} from '../../../config/leaderboardPoints';
import { getAppUserByRegistrantId } from '../../../graphql/customQueries';
import {
  apsAnnouncementOpensByEventIdAndCreatedAt,
  apsAppFeedbacksByEventIdAndCreatedAt,
  apsAppUserExhibitorViewsByEventIdAndCreatedAt,
  apsAppUserFavoriteExhibitorsByEventIdAndCreatedAt,
  apsAppUserFavoriteSessionsByEventIdAndCreatedAt,
  apsAppUserFavoriteSpeakersByEventIdAndCreatedAt,
  apsAppUserFavoriteSponsorsByEventIdAndCreatedAt,
  apsAppUserPassportStampsByEventIdAndCreatedAt,
  apsContactRequestsByStatusAndUpdatedAt,
  listApsAppUserNotes,
} from '../../../graphql/queries';
import {
  isLeaderboardSchemaError,
  listLeaderboardEntries,
  rankLeaderboardEntries,
  upsertLeaderboardEntry,
  type RankedLeaderboardEntry,
} from '../../../services/leaderboardEntries';
import { factsFromProfile, loadExhibitorCount } from '../../../services/leaderboardFacts';
import { graphqlAuthClient } from '../../../utils/graphqlClient';
import { drainIndexedList } from '../../../utils/paginateGraphql';
import { listAdminRegistrants, type AdminRegistrantListItem } from '../registrants/adminRegistrantsService';

export type AdminLeaderboardRow = {
  rank: number;
  profileId: string;
  registrantId: string;
  name: string;
  email: string;
  company: string;
  points: number;
  categoryTotals: Record<AwardCategoryId, number>;
  connections: number;
  stamps: number;
  score: EvaluatedScore;
};

export type AdminLeaderboardMetrics = {
  peopleOnBoard: number;
  scoredPeople: number;
  totalPoints: number;
  topScore: number;
};

type ProfileBundle = {
  registrant: AdminRegistrantListItem;
  profile: APITypes.ApsAppUserProfile;
  appUserId: string;
};

function increment(map: Map<string, number>, key?: string | null, amount = 1) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + amount);
}

function addToSet(map: Map<string, Set<string>>, key?: string | null, value?: string | null) {
  if (!key || !value) return;
  const set = map.get(key) || new Set<string>();
  set.add(value);
  map.set(key, set);
}

async function safeList<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch (error) {
    console.warn(`Admin leaderboard ${label} failed:`, error);
    return [];
  }
}

async function mapInChunks<T, R>(items: T[], size: number, fn: (item: T) => Promise<R | null>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const rows = await Promise.all(chunk.map(fn));
    for (const row of rows) {
      if (row) out.push(row);
    }
  }
  return out;
}

async function loadProfileBundles(registrants: AdminRegistrantListItem[]): Promise<ProfileBundle[]> {
  return mapInChunks(registrants, 8, async (registrant) => {
    try {
      const resp = await graphqlAuthClient.graphql({
        query: getAppUserByRegistrantId,
        variables: { registrantId: registrant.id },
      });
      const appUser = (resp as any)?.data?.apsAppUsersByRegistrantId?.items?.find(Boolean);
      const profile = appUser?.profile as APITypes.ApsAppUserProfile | undefined;
      if (!profile?.id || !appUser?.id) return null;
      return { registrant, profile, appUserId: String(appUser.id) };
    } catch {
      return null;
    }
  });
}

async function loadActivityIndexes() {
  const [
    stamps,
    favoriteSessions,
    favoriteExhibitors,
    favoriteSpeakers,
    favoriteSponsors,
    views,
    feedback,
    opens,
    notes,
    acceptedRequests,
    pendingRequests,
  ] = await Promise.all([
    safeList('stamps', () =>
      drainIndexedList<{ userProfileId?: string | null; exhibitorId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserPassportStampsByEventIdAndCreatedAt,
        field: 'apsAppUserPassportStampsByEventIdAndCreatedAt',
        variables: { eventId: APS_ID },
      }),
    ),
    safeList('favoriteSessions', () =>
      drainIndexedList<{ userProfileId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserFavoriteSessionsByEventIdAndCreatedAt,
        field: 'apsAppUserFavoriteSessionsByEventIdAndCreatedAt',
        variables: { eventId: APS_ID },
      }),
    ),
    safeList('favoriteExhibitors', () =>
      drainIndexedList<{ userProfileId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserFavoriteExhibitorsByEventIdAndCreatedAt,
        field: 'apsAppUserFavoriteExhibitorsByEventIdAndCreatedAt',
        variables: { eventId: APS_ID },
      }),
    ),
    safeList('favoriteSpeakers', () =>
      drainIndexedList<{ userProfileId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserFavoriteSpeakersByEventIdAndCreatedAt,
        field: 'apsAppUserFavoriteSpeakersByEventIdAndCreatedAt',
        variables: { eventId: APS_ID },
      }),
    ),
    safeList('favoriteSponsors', () =>
      drainIndexedList<{ userProfileId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserFavoriteSponsorsByEventIdAndCreatedAt,
        field: 'apsAppUserFavoriteSponsorsByEventIdAndCreatedAt',
        variables: { eventId: APS_ID },
      }),
    ),
    safeList('views', () =>
      drainIndexedList<{ userProfileId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserExhibitorViewsByEventIdAndCreatedAt,
        field: 'apsAppUserExhibitorViewsByEventIdAndCreatedAt',
        variables: { eventId: APS_ID },
      }),
    ),
    safeList('feedback', () =>
      drainIndexedList<{ userId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppFeedbacksByEventIdAndCreatedAt,
        field: 'apsAppFeedbacksByEventIdAndCreatedAt',
        variables: { eventId: APS_ID },
      }),
    ),
    safeList('announcementOpens', () =>
      drainIndexedList<{ userId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAnnouncementOpensByEventIdAndCreatedAt,
        field: 'apsAnnouncementOpensByEventIdAndCreatedAt',
        variables: { eventId: APS_ID },
      }),
    ),
    safeList('notes', () =>
      drainIndexedList<{ userId?: string | null; sessionId?: string | null; profileId?: string | null }>({
        client: graphqlAuthClient,
        query: listApsAppUserNotes,
        field: 'listApsAppUserNotes',
      }),
    ),
    safeList('acceptedRequests', () =>
      drainIndexedList<{
        eventId?: string | null;
        userAId?: string | null;
        userBId?: string | null;
        requestedByUserId?: string | null;
        owners?: string[] | null;
      }>({
        client: graphqlAuthClient,
        query: apsContactRequestsByStatusAndUpdatedAt,
        field: 'apsContactRequestsByStatusAndUpdatedAt',
        variables: { status: 'ACCEPTED', sortDirection: 'DESC' },
      }),
    ),
    safeList('pendingRequests', () =>
      drainIndexedList<{
        eventId?: string | null;
        requestedByUserId?: string | null;
      }>({
        client: graphqlAuthClient,
        query: apsContactRequestsByStatusAndUpdatedAt,
        field: 'apsContactRequestsByStatusAndUpdatedAt',
        variables: { status: 'PENDING', sortDirection: 'DESC' },
      }),
    ),
  ]);

  const stampsByProfile = new Map<string, Set<string>>();
  for (const row of stamps) addToSet(stampsByProfile, row.userProfileId, row.exhibitorId);

  const countByProfile = (rows: { userProfileId?: string | null }[]) => {
    const map = new Map<string, number>();
    for (const row of rows) increment(map, row.userProfileId);
    return map;
  };

  const connectionsByUser = new Map<string, number>();
  for (const row of acceptedRequests) {
    if (row.eventId && row.eventId !== APS_ID) continue;
    const owners = Array.isArray(row.owners) ? row.owners : [row.userAId, row.userBId];
    for (const owner of owners) increment(connectionsByUser, owner);
  }

  const sentByUser = new Map<string, number>();
  for (const row of [...acceptedRequests, ...pendingRequests]) {
    if ((row as { eventId?: string | null }).eventId && (row as { eventId?: string }).eventId !== APS_ID) continue;
    increment(sentByUser, row.requestedByUserId);
  }

  const sessionNotesByUser = new Map<string, number>();
  const contactNotesByUser = new Map<string, number>();
  for (const note of notes) {
    if (note.sessionId) increment(sessionNotesByUser, note.userId);
    if (note.profileId) increment(contactNotesByUser, note.userId);
  }

  const feedbackByUser = new Map<string, number>();
  for (const row of feedback) increment(feedbackByUser, row.userId);

  const opensByUser = new Map<string, number>();
  for (const row of opens) increment(opensByUser, row.userId);

  return {
    stampsByProfile,
    favoriteSessionsByProfile: countByProfile(favoriteSessions),
    favoriteExhibitorsByProfile: countByProfile(favoriteExhibitors),
    favoriteSpeakersByProfile: countByProfile(favoriteSpeakers),
    favoriteSponsorsByProfile: countByProfile(favoriteSponsors),
    viewsByProfile: countByProfile(views),
    connectionsByUser,
    sentByUser,
    sessionNotesByUser,
    contactNotesByUser,
    feedbackByUser,
    opensByUser,
  };
}

function factsForBundle(
  bundle: ProfileBundle,
  stampTotal: number,
  activity: Awaited<ReturnType<typeof loadActivityIndexes>>,
): LeaderboardFacts {
  const facts = emptyLeaderboardFacts();
  Object.assign(facts, factsFromProfile(bundle.profile));
  const userId = bundle.appUserId;
  const profileId = bundle.profile.id;
  facts.acceptedConnections = activity.connectionsByUser.get(userId) || 0;
  facts.sentRequests = activity.sentByUser.get(userId) || 0;
  facts.stamps = activity.stampsByProfile.get(profileId)?.size || 0;
  facts.stampTotal = stampTotal;
  facts.favoriteSessions = activity.favoriteSessionsByProfile.get(profileId) || 0;
  facts.favoriteExhibitors = activity.favoriteExhibitorsByProfile.get(profileId) || 0;
  facts.favoriteSpeakers = activity.favoriteSpeakersByProfile.get(profileId) || 0;
  facts.favoriteSponsors = activity.favoriteSponsorsByProfile.get(profileId) || 0;
  facts.sessionNotes = activity.sessionNotesByUser.get(userId) || 0;
  facts.contactNotes = activity.contactNotesByUser.get(userId) || 0;
  facts.exhibitorViews = activity.viewsByProfile.get(profileId) || 0;
  facts.announcementOpens = activity.opensByUser.get(userId) || 0;
  facts.feedbackCount = activity.feedbackByUser.get(userId) || 0;
  facts.sentDms = 0;
  return facts;
}

export async function listStoredAdminLeaderboard(): Promise<RankedLeaderboardEntry[]> {
  return rankLeaderboardEntries(await listLeaderboardEntries());
}

function parseStoredBreakdown(raw?: string | Record<string, unknown> | null) {
  const empty = {
    profile: 0,
    networking: 0,
    passport: 0,
    explore: 0,
    feedback: 0,
  };
  if (!raw) return { categories: empty, counts: { connections: 0, stamps: 0 } };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      categories: { ...empty, ...(parsed?.categories || {}) },
      counts: {
        connections: Number(parsed?.counts?.connections || 0),
        stamps: Number(parsed?.counts?.stamps || 0),
      },
    };
  } catch {
    return { categories: empty, counts: { connections: 0, stamps: 0 } };
  }
}

export function storedEntriesToAdminRows(entries: RankedLeaderboardEntry[]): AdminLeaderboardRow[] {
  return entries.map((entry) => {
    const parsed = parseStoredBreakdown(entry.breakdown);
    return {
      rank: entry.rank,
      profileId: entry.userProfileId,
      registrantId: '',
      name: entry.displayName,
      email: '',
      company: entry.company || '',
      points: entry.points,
      categoryTotals: parsed.categories,
      connections: parsed.counts.connections,
      stamps: parsed.counts.stamps,
      score: {
        total: entry.points,
        awards: [],
        categoryTotals: parsed.categories,
        nextHint: '',
        counts: {
          connections: parsed.counts.connections,
          sentRequests: 0,
          stamps: parsed.counts.stamps,
          stampTotal: 0,
          feedback: 0,
        },
      },
    };
  });
}

export async function recalculateAllLeaderboardScores(): Promise<{
  rows: AdminLeaderboardRow[];
  written: number;
  errors: number;
  rankingUnavailable: boolean;
}> {
  const [registrants, stampTotal, activity] = await Promise.all([
    listAdminRegistrants(),
    loadExhibitorCount(),
    loadActivityIndexes(),
  ]);
  const bundles = await loadProfileBundles(registrants);

  const computed: AdminLeaderboardRow[] = bundles
    .map((bundle) => {
      const score = evaluateLeaderboardScore(factsForBundle(bundle, stampTotal, activity));
      return {
        rank: 0,
        profileId: bundle.profile.id,
        registrantId: bundle.registrant.id,
        name: leaderboardDisplayName(bundle.profile.firstName, bundle.profile.lastName),
        email: bundle.profile.email || bundle.registrant.email || '',
        company: bundle.profile.company || bundle.registrant.companyName || '',
        points: score.total,
        categoryTotals: score.categoryTotals,
        connections: score.counts.connections,
        stamps: score.counts.stamps,
        score,
      };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));

  let written = 0;
  let errors = 0;
  let rankingUnavailable = false;
  const byProfile = new Map(bundles.map((bundle) => [bundle.profile.id, bundle]));

  for (const row of computed) {
    if (row.points <= 0) continue;
    const bundle = byProfile.get(row.profileId);
    if (!bundle) continue;
    try {
      await upsertLeaderboardEntry({
        profileId: bundle.profile.id,
        ownerUserId: bundle.appUserId,
        firstName: bundle.profile.firstName,
        lastName: bundle.profile.lastName,
        company: bundle.profile.company,
        jobTitle: bundle.profile.jobTitle,
        profilePicture: bundle.profile.profilePicture,
        score: row.score,
      });
      written += 1;
    } catch (error) {
      if (isLeaderboardSchemaError(error)) {
        rankingUnavailable = true;
        break;
      }
      console.warn('Admin leaderboard upsert failed:', row.profileId, error);
      errors += 1;
    }
  }

  return { rows: computed, written, errors, rankingUnavailable };
}

export function metricsFromRows(rows: { points: number }[]): AdminLeaderboardMetrics {
  const scored = rows.filter((row) => row.points > 0);
  return {
    peopleOnBoard: scored.length,
    scoredPeople: scored.length,
    totalPoints: scored.reduce((sum, row) => sum + row.points, 0),
    topScore: scored[0]?.points || 0,
  };
}
