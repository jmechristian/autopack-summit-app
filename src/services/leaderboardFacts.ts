import type * as APITypes from '../API';
import { APS_ID } from '../config/apsConfig';
import { emptyLeaderboardFacts, type LeaderboardFacts } from '../config/leaderboardPoints';
import { normalizeExpertiseTags } from '../constants/expertiseTags';
import {
  apsAdminAnnouncementsByEventIdAndCreatedAt,
  apsAppFeedbacksByUserIdAndCreatedAt,
  apsAppUserExhibitorViewsByUserProfileIdAndCreatedAt,
  apsAppUserFavoriteExhibitorsByUserProfileIdAndCreatedAt,
  apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt,
  apsAppUserFavoriteSpeakersByUserProfileIdAndCreatedAt,
  apsAppUserFavoriteSponsorsByUserProfileIdAndCreatedAt,
  apsAppUserNotesByUserId,
  apsAppUserPassportStampsByUserProfileIdAndCreatedAt,
  apsDmMessagesBySenderUserIdAndCreatedAt,
  getApsAnnouncementOpen,
  profileAffiliatesByProfileId,
  profileEducationsByProfileId,
  profileInterestsByProfileId,
} from '../graphql/queries';
import { fetchOwnedContactRequestRows } from '../utils/contactRequestQueries';
import { graphqlApiKeyClient, graphqlAuthClient } from '../utils/graphqlClient';
import { drainIndexedList } from '../utils/paginateGraphql';

const exhibitorsByEvent = /* GraphQL */ `
  query LeaderboardPassportExhibitorsByEvent($eventId: ID!, $limit: Int, $nextToken: String) {
    apsAppExhibitorProfilesByEventId(eventId: $eventId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        __typename
      }
      nextToken
      __typename
    }
  }
`;

function filled(value?: string | null) {
  return String(value || '').trim().length > 0;
}

function countByEvent<T extends { eventId?: string | null }>(rows: T[], eventId = APS_ID) {
  return rows.filter((row) => !row.eventId || row.eventId === eventId).length;
}

async function safeList<T>(fn: () => Promise<T[]>, fallback: T[] = []): Promise<T[]> {
  try {
    return await fn();
  } catch (error) {
    console.warn('Leaderboard facts query failed:', error);
    return fallback;
  }
}

const EXHIBITOR_COUNT_TTL_MS = 10 * 60_000;
let exhibitorCountCache: { at: number; count: number } | null = null;

export async function loadExhibitorCount(eventId = APS_ID): Promise<number> {
  if (exhibitorCountCache && Date.now() - exhibitorCountCache.at < EXHIBITOR_COUNT_TTL_MS) {
    return exhibitorCountCache.count;
  }
  const ids = new Set<string>();
  let nextToken: string | null | undefined = null;
  do {
    const resp = (await graphqlApiKeyClient.graphql({
      query: exhibitorsByEvent,
      variables: { eventId, limit: 200, nextToken },
    })) as any;
    const data = resp?.data?.apsAppExhibitorProfilesByEventId as {
      items?: ({ id?: string | null } | null)[] | null;
      nextToken?: string | null;
    } | undefined;
    for (const item of data?.items || []) {
      if (item?.id) ids.add(item.id);
    }
    nextToken = data?.nextToken;
  } while (nextToken);
  exhibitorCountCache = { at: Date.now(), count: ids.size };
  return ids.size;
}

export function factsFromProfile(profile?: APITypes.ApsAppUserProfile | null): Pick<
  LeaderboardFacts,
  | 'hasPhoto'
  | 'hasBio'
  | 'hasLinkedIn'
  | 'hasPhone'
  | 'hasJobTitle'
  | 'hasExpertise'
  | 'expertiseCount'
  | 'hasAffiliation'
  | 'hasEducation'
  | 'hasInterest'
  | 'hasResume'
> {
  const affiliates = (profile as any)?.affiliates?.items || [];
  const education = (profile as any)?.education?.items || [];
  const interests = (profile as any)?.interests?.items || [];
  const expertiseCount = normalizeExpertiseTags(profile?.expertise).length;
  return {
    hasPhoto: filled(profile?.profilePicture),
    hasBio: filled(profile?.bio),
    hasLinkedIn: filled(profile?.linkedin),
    hasPhone: filled(profile?.phone),
    hasJobTitle: filled(profile?.jobTitle),
    hasExpertise: expertiseCount > 0,
    expertiseCount,
    hasAffiliation: affiliates.filter(Boolean).length > 0,
    hasEducation: education.filter(Boolean).length > 0,
    hasInterest: interests.filter(Boolean).length > 0,
    hasResume: filled(profile?.resume),
  };
}

export async function loadProfileExtras(profileId: string) {
  const [affiliates, education, interests] = await Promise.all([
    safeList(() =>
      drainIndexedList<{ id?: string | null }>({
        client: graphqlApiKeyClient,
        query: profileAffiliatesByProfileId,
        field: 'profileAffiliatesByProfileId',
        variables: { profileId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ id?: string | null }>({
        client: graphqlApiKeyClient,
        query: profileEducationsByProfileId,
        field: 'profileEducationsByProfileId',
        variables: { profileId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ id?: string | null }>({
        client: graphqlApiKeyClient,
        query: profileInterestsByProfileId,
        field: 'profileInterestsByProfileId',
        variables: { profileId },
      }),
    ),
  ]);
  return {
    hasAffiliation: affiliates.length > 0,
    hasEducation: education.length > 0,
    hasInterest: interests.length > 0,
  };
}

export async function loadCurrentUserFacts(params: {
  profile: APITypes.ApsAppUserProfile;
  appUserId: string;
  cognitoUserId: string;
  stampTotal?: number;
}): Promise<LeaderboardFacts> {
  const { profile, appUserId, cognitoUserId } = params;
  const profileId = profile.id;
  const facts = emptyLeaderboardFacts();
  Object.assign(facts, factsFromProfile(profile));

  const [
    extras,
    requests,
    stamps,
    favoriteSessions,
    favoriteExhibitors,
    favoriteSpeakers,
    favoriteSponsors,
    notes,
    views,
    feedback,
    dms,
    stampTotal,
    announcementOpens,
  ] = await Promise.all([
    profile.affiliates?.items && profile.education?.items && profile.interests?.items
      ? Promise.resolve({
          hasAffiliation: (profile.affiliates.items || []).filter(Boolean).length > 0,
          hasEducation: (profile.education.items || []).filter(Boolean).length > 0,
          hasInterest: (profile.interests.items || []).filter(Boolean).length > 0,
        })
      : loadProfileExtras(profileId),
    safeList(() => fetchOwnedContactRequestRows(cognitoUserId)),
    safeList(() =>
      drainIndexedList<{ exhibitorId?: string | null; eventId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserPassportStampsByUserProfileIdAndCreatedAt,
        field: 'apsAppUserPassportStampsByUserProfileIdAndCreatedAt',
        variables: { userProfileId: profileId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ eventId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt,
        field: 'apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt',
        variables: { userProfileId: profileId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ eventId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserFavoriteExhibitorsByUserProfileIdAndCreatedAt,
        field: 'apsAppUserFavoriteExhibitorsByUserProfileIdAndCreatedAt',
        variables: { userProfileId: profileId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ eventId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserFavoriteSpeakersByUserProfileIdAndCreatedAt,
        field: 'apsAppUserFavoriteSpeakersByUserProfileIdAndCreatedAt',
        variables: { userProfileId: profileId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ eventId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserFavoriteSponsorsByUserProfileIdAndCreatedAt,
        field: 'apsAppUserFavoriteSponsorsByUserProfileIdAndCreatedAt',
        variables: { userProfileId: profileId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ sessionId?: string | null; profileId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserNotesByUserId,
        field: 'apsAppUserNotesByUserId',
        variables: { userId: appUserId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ eventId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppUserExhibitorViewsByUserProfileIdAndCreatedAt,
        field: 'apsAppUserExhibitorViewsByUserProfileIdAndCreatedAt',
        variables: { userProfileId: profileId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ eventId?: string | null }>({
        client: graphqlAuthClient,
        query: apsAppFeedbacksByUserIdAndCreatedAt,
        field: 'apsAppFeedbacksByUserIdAndCreatedAt',
        variables: { userId: appUserId },
      }),
    ),
    safeList(() =>
      drainIndexedList<{ id?: string | null }>({
        client: graphqlAuthClient,
        query: apsDmMessagesBySenderUserIdAndCreatedAt,
        field: 'apsDmMessagesBySenderUserIdAndCreatedAt',
        variables: { senderUserId: cognitoUserId, sortDirection: 'DESC' },
        pageSize: 1,
      }),
    ),
    params.stampTotal != null ? Promise.resolve(params.stampTotal) : loadExhibitorCount().catch(() => 0),
    countAnnouncementOpens(cognitoUserId),
  ]);

  facts.hasAffiliation = extras.hasAffiliation;
  facts.hasEducation = extras.hasEducation;
  facts.hasInterest = extras.hasInterest;
  facts.acceptedConnections = requests.filter(
    (row) => row.eventId === APS_ID && row.status === 'ACCEPTED',
  ).length;
  facts.sentRequests = requests.filter(
    (row) => row.eventId === APS_ID && row.requestedByUserId === cognitoUserId,
  ).length;
  facts.stamps = new Set(
    stamps.filter((row) => row.eventId === APS_ID && row.exhibitorId).map((row) => String(row.exhibitorId)),
  ).size;
  facts.stampTotal = stampTotal;
  facts.favoriteSessions = countByEvent(favoriteSessions);
  facts.favoriteExhibitors = countByEvent(favoriteExhibitors);
  facts.favoriteSpeakers = countByEvent(favoriteSpeakers);
  facts.favoriteSponsors = countByEvent(favoriteSponsors);
  facts.sessionNotes = notes.filter((note) => !!note.sessionId).length;
  facts.contactNotes = notes.filter((note) => !!note.profileId).length;
  facts.exhibitorViews = countByEvent(views);
  facts.feedbackCount = feedback.filter((row) => row.eventId === APS_ID).length;
  facts.sentDms = dms.length;
  facts.announcementOpens = announcementOpens;
  return facts;
}

async function countAnnouncementOpens(userId: string): Promise<number> {
  const announcements = await safeList(() =>
    drainIndexedList<{ id?: string | null }>({
      client: graphqlAuthClient,
      query: apsAdminAnnouncementsByEventIdAndCreatedAt,
      field: 'apsAdminAnnouncementsByEventIdAndCreatedAt',
      variables: { eventId: APS_ID, sortDirection: 'DESC' },
    }),
  );
  const ids = announcements.map((item) => item.id).filter((id): id is string => !!id).slice(0, 24);
  let opened = 0;
  for (let i = 0; i < ids.length; i += 8) {
    const batch = ids.slice(i, i + 8);
    const results = await Promise.all(
      batch.map(async (announcementId) => {
        try {
          const resp = (await graphqlAuthClient.graphql({
            query: getApsAnnouncementOpen as any,
            variables: { id: `o:${announcementId}|u:${userId}` },
          })) as any;
          return Number(!!resp?.data?.getApsAnnouncementOpen?.id);
        } catch {
          return 0;
        }
      }),
    );
    opened += results.reduce((sum: number, value: number) => sum + value, 0);
    // Award only needs 3 opens; stop hitting AppSync once that's met.
    if (opened >= 3) return opened;
  }
  return opened;
}
