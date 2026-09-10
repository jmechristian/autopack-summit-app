import { getCurrentUser } from 'aws-amplify/auth';
import { create } from 'zustand';
import { APS_ID } from '../config/apsConfig';
import {
  evaluateLeaderboardScore,
  leaderboardDisplayName,
  type EvaluatedScore,
} from '../config/leaderboardPoints';
import {
  getLeaderboardEntry,
  isLeaderboardSchemaError,
  leaderboardEntryId,
  listLeaderboardEntries,
  rankLeaderboardEntries,
  upsertLeaderboardEntry,
  visibleLeaderboard,
  type LeaderboardEntryRecord,
  type RankedLeaderboardEntry,
} from '../services/leaderboardEntries';
import { loadCurrentUserFacts } from '../services/leaderboardFacts';
import { useApsStore } from './apsStore';
import { usePointsToastStore } from './pointsToastStore';

const BOARD_CACHE_MS = 60_000;
const SCORE_CACHE_MS = 20_000;

let queuedRefresh: { force: boolean; includeMyScore: boolean; celebrate?: boolean } | null = null;

type LeaderboardState = {
  myScore: EvaluatedScore | null;
  myRank: number | null;
  myPoints: number;
  rankedAll: RankedLeaderboardEntry[];
  entries: RankedLeaderboardEntry[];
  loading: boolean;
  scoreLoading: boolean;
  rankingUnavailable: boolean;
  error: string | null;
  lastBoardAt: number | null;
  lastScoreAt: number | null;
  refresh: (opts?: { force?: boolean; includeMyScore?: boolean; celebrate?: boolean }) => Promise<void>;
};

function applyMyEntry(entries: RankedLeaderboardEntry[], mine: LeaderboardEntryRecord) {
  const next = entries.filter((entry) => entry.userProfileId !== mine.userProfileId);
  return rankLeaderboardEntries([...next, mine]);
}

function findMine(ranked: RankedLeaderboardEntry[], profileId?: string | null) {
  if (!profileId) return null;
  return ranked.find((entry) => entry.userProfileId === profileId) || null;
}

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  myScore: null,
  myRank: null,
  myPoints: 0,
  rankedAll: [],
  entries: [],
  loading: false,
  scoreLoading: false,
  rankingUnavailable: false,
  error: null,
  lastBoardAt: null,
  lastScoreAt: null,

  refresh: async (opts) => {
    if (get().loading) {
      queuedRefresh = {
        force: !!opts?.force || !!queuedRefresh?.force,
        includeMyScore: opts?.includeMyScore !== false || queuedRefresh?.includeMyScore !== false,
        celebrate: !!opts?.celebrate || !!queuedRefresh?.celebrate,
      };
      return;
    }
    const includeMyScore = opts?.includeMyScore !== false;
    const celebrate = !!opts?.celebrate;
    const previousScore = get().myScore;
    const previousTotal = previousScore?.total ?? get().myPoints;
    const now = Date.now();
    const appUser = useApsStore.getState().currentAppUser;
    const profile = appUser?.profile || null;
    const profileId = profile?.id || null;
    const boardFresh = !opts?.force && !!get().lastBoardAt && now - get().lastBoardAt! < BOARD_CACHE_MS;
    const scoreFresh = !opts?.force && !!get().lastScoreAt && now - get().lastScoreAt! < SCORE_CACHE_MS;
    if (boardFresh && (!includeMyScore || scoreFresh)) {
      const mine = findMine(get().rankedAll, profileId);
      if (mine && (mine.points !== get().myPoints || mine.rank !== get().myRank)) {
        set({ myRank: mine.rank, myPoints: mine.points });
      }
      return;
    }

    const hasBoard = get().rankedAll.length > 0 || get().entries.length > 0;
    const needsScore = includeMyScore && !scoreFresh;
    set({
      loading: !hasBoard || !boardFresh,
      scoreLoading: needsScore,
      error: null,
    });
    try {
      let ranked = get().rankedAll.length ? get().rankedAll : get().entries;
      let rankingUnavailable = get().rankingUnavailable;

      if (!boardFresh) {
        try {
          ranked = rankLeaderboardEntries(await listLeaderboardEntries());
          rankingUnavailable = false;
          let listedMine = findMine(ranked, profileId);
          if (!listedMine && profileId) {
            const stored = await getLeaderboardEntry(leaderboardEntryId(profileId));
            if (stored && stored.points > 0) {
              ranked = applyMyEntry(ranked, stored);
              listedMine = findMine(ranked, profileId);
            }
          }
          set({
            rankedAll: ranked,
            entries: visibleLeaderboard(ranked),
            myRank: listedMine?.rank ?? (profileId ? null : get().myRank),
            myPoints: listedMine?.points ?? (profileId ? 0 : get().myPoints),
            rankingUnavailable,
            lastBoardAt: Date.now(),
          });
        } catch (error) {
          if (isLeaderboardSchemaError(error)) {
            rankingUnavailable = true;
          } else {
            console.warn('Leaderboard list failed:', error);
          }
        }
      }

      if (includeMyScore && profileId && appUser?.id && !scoreFresh) {
        const user = await getCurrentUser();
        const facts = await loadCurrentUserFacts({
          profile,
          appUserId: appUser.id,
          cognitoUserId: user.userId,
        });
        const myScore = evaluateLeaderboardScore(facts);
        const localEntry: LeaderboardEntryRecord = {
          id: leaderboardEntryId(profileId),
          eventId: APS_ID,
          userProfileId: profileId,
          displayName: leaderboardDisplayName(profile?.firstName, profile?.lastName),
          company: profile?.company || null,
          jobTitle: profile?.jobTitle || null,
          profilePicture: profile?.profilePicture || null,
          points: myScore.total,
        };
        try {
          const saved = await upsertLeaderboardEntry({
            profileId,
            ownerUserId: user.userId,
            firstName: profile?.firstName,
            lastName: profile?.lastName,
            company: profile?.company,
            jobTitle: profile?.jobTitle,
            profilePicture: profile?.profilePicture,
            score: myScore,
          });
          ranked = applyMyEntry(ranked, saved || localEntry);
        } catch (error) {
          ranked = applyMyEntry(ranked, localEntry);
          if (isLeaderboardSchemaError(error)) {
            rankingUnavailable = true;
          } else {
            console.warn('Leaderboard ranking sync failed:', error);
          }
        }
        const mine = findMine(ranked, profileId);
        if (celebrate && myScore.total > previousTotal) {
          const prevEarned = new Set(
            (previousScore?.awards || []).filter((award) => award.earned).map((award) => award.id),
          );
          const unlocked = previousScore
            ? myScore.awards.filter((award) => award.earned && !prevEarned.has(award.id)).map((award) => award.label)
            : [];
          usePointsToastStore.getState().show(myScore.total - previousTotal, unlocked);
        }
        set({
          myScore,
          myRank: mine?.rank ?? null,
          myPoints: mine?.points ?? myScore.total,
          rankedAll: ranked,
          entries: visibleLeaderboard(ranked),
          rankingUnavailable,
          loading: false,
          scoreLoading: false,
          lastBoardAt: Date.now(),
          lastScoreAt: Date.now(),
        });
        return;
      }

      const mine = findMine(ranked, profileId);
      set({
        myRank: mine?.rank ?? get().myRank,
        myPoints: mine?.points ?? get().myPoints,
        rankedAll: ranked,
        entries: visibleLeaderboard(ranked),
        rankingUnavailable,
        loading: false,
        scoreLoading: false,
        lastBoardAt: boardFresh ? get().lastBoardAt : Date.now(),
        lastScoreAt: includeMyScore ? Date.now() : get().lastScoreAt,
      });
    } catch (error: any) {
      set({
        loading: false,
        scoreLoading: false,
        error: error?.message || 'Unable to load the leaderboard.',
      });
    } finally {
      const next = queuedRefresh;
      queuedRefresh = null;
      if (next) void get().refresh(next);
    }
  },
}));
