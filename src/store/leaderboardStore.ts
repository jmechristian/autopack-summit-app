import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  evaluateLeaderboardScore,
  isStaffAttendeeType,
  type EvaluatedScore,
} from '../config/leaderboardPoints';
import {
  getLeaderboardEntry,
  isLeaderboardSchemaError,
  leaderboardEntryId,
  listLeaderboardEntries,
  listStaffProfileIds,
  rankLeaderboardEntries,
  upsertLeaderboardEntry,
  visibleLeaderboard,
  withoutStaffEntries,
  type RankedLeaderboardEntry,
} from '../services/leaderboardEntries';
import { loadCurrentUserFacts } from '../services/leaderboardFacts';
import { useApsStore } from './apsStore';
import { usePointsToastStore } from './pointsToastStore';

const BOARD_CACHE_MS = 120_000;
const SCORE_CACHE_MS = 45_000;

let boardInFlight = false;
let scoreInFlight = false;
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

function findMine(ranked: RankedLeaderboardEntry[], profileId?: string | null) {
  if (!profileId) return null;
  return ranked.find((entry) => entry.userProfileId === profileId) || null;
}

function currentUserIsStaff() {
  const appUser = useApsStore.getState().currentAppUser;
  return (
    isStaffAttendeeType(appUser?.profile?.attendeeType) ||
    isStaffAttendeeType(appUser?.registrant?.attendeeType)
  );
}

function enqueue(opts?: { force?: boolean; includeMyScore?: boolean; celebrate?: boolean }) {
  queuedRefresh = {
    force: !!opts?.force || !!queuedRefresh?.force,
    includeMyScore: opts?.includeMyScore !== false || queuedRefresh?.includeMyScore !== false,
    celebrate: !!opts?.celebrate || !!queuedRefresh?.celebrate,
  };
}

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set, get) => ({
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
        const includeMyScore = opts?.includeMyScore !== false;
        const force = !!opts?.force;
        const celebrate = !!opts?.celebrate;
        const now = Date.now();
        const state = get();
        const appUser = useApsStore.getState().currentAppUser;
        const profile = appUser?.profile || null;
        const profileId = profile?.id || null;
        const boardFresh = !force && !!state.lastBoardAt && now - state.lastBoardAt! < BOARD_CACHE_MS;
        const scoreFresh = !force && !!state.lastScoreAt && now - state.lastScoreAt! < SCORE_CACHE_MS;

        if (boardFresh && (!includeMyScore || scoreFresh)) {
          return;
        }

        const wantBoard = !boardFresh;
        const wantScore = includeMyScore && !scoreFresh && !!profileId && !!appUser?.id;
        const wantHydrate = !wantScore && !!profileId && state.myPoints <= 0;

        const tasks: Promise<void>[] = [];

        if (wantBoard) {
          if (boardInFlight) enqueue(opts);
          else tasks.push(loadBoard(set, get, profileId));
        }

        if (wantScore) {
          if (scoreInFlight) enqueue({ ...opts, includeMyScore: true, celebrate });
          else {
            tasks.push(
              loadScore(set, get, {
                profile,
                profileId: profileId!,
                appUserId: appUser!.id,
                celebrate,
                previousScore: state.myScore,
                previousTotal: state.myScore?.total ?? state.myPoints,
              }),
            );
          }
        } else if (wantHydrate) {
          if (!scoreInFlight) tasks.push(hydrateStoredPoints(set, get, profileId!));
        }

        if (!tasks.length) return;
        await Promise.all(tasks);

        const next = queuedRefresh;
        queuedRefresh = null;
        if (next) void get().refresh(next);
      },
    }),
    {
      name: 'aps-leaderboard-score',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        myScore: state.myScore,
        myPoints: state.myPoints,
      }),
    },
  ),
);

async function hydrateStoredPoints(
  set: (partial: Partial<LeaderboardState>) => void,
  get: () => LeaderboardState,
  profileId: string,
) {
  try {
    const stored = await getLeaderboardEntry(leaderboardEntryId(profileId));
    if (!stored || stored.points <= 0) return;
    set({
      myPoints: Math.max(stored.points, get().myPoints),
    });
  } catch (error) {
    if (!isLeaderboardSchemaError(error)) {
      console.warn('Leaderboard stored score lookup failed:', error);
    }
  }
}

async function loadBoard(
  set: (partial: Partial<LeaderboardState>) => void,
  get: () => LeaderboardState,
  profileId: string | null,
) {
  boardInFlight = true;
  const hasBoard = get().rankedAll.length > 0 || get().entries.length > 0;
  set({ loading: !hasBoard, error: null });
  try {
    const [listed, staffIds] = await Promise.all([listLeaderboardEntries(), listStaffProfileIds()]);
    if (profileId && currentUserIsStaff()) staffIds.add(profileId);

    const ranked = rankLeaderboardEntries(withoutStaffEntries(listed, staffIds));
    const listedMine = findMine(ranked, profileId);

    set({
      rankedAll: ranked,
      entries: visibleLeaderboard(ranked),
      myRank: listedMine?.rank ?? (profileId && staffIds.has(profileId) ? null : get().myRank),
      rankingUnavailable: false,
      loading: false,
      lastBoardAt: Date.now(),
    });
  } catch (error) {
    if (isLeaderboardSchemaError(error)) {
      set({ rankingUnavailable: true, loading: false, lastBoardAt: Date.now() });
    } else {
      console.warn('Leaderboard list failed:', error);
      set({
        loading: false,
        error: (error as { message?: string })?.message || 'Unable to load the leaderboard.',
      });
    }
  } finally {
    boardInFlight = false;
  }
}

async function loadScore(
  set: (partial: Partial<LeaderboardState>) => void,
  get: () => LeaderboardState,
  params: {
    profile: NonNullable<ReturnType<typeof useApsStore.getState>['currentAppUser']>['profile'];
    profileId: string;
    appUserId: string;
    celebrate: boolean;
    previousScore: EvaluatedScore | null;
    previousTotal: number;
  },
) {
  const profile = params.profile;
  if (!profile) return;

  scoreInFlight = true;
  set({ scoreLoading: !get().myScore && get().myPoints <= 0, error: null });
  try {
    await hydrateStoredPoints(set, get, params.profileId);

    const user = await getCurrentUser();
    const facts = await loadCurrentUserFacts({
      profile,
      appUserId: params.appUserId,
      cognitoUserId: user.userId,
    });
    const myScore = evaluateLeaderboardScore(facts);
    const hideFromBoard = currentUserIsStaff();

    if (!hideFromBoard) {
      try {
        await upsertLeaderboardEntry({
          profileId: params.profileId,
          ownerUserId: user.userId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          company: profile.company,
          jobTitle: profile.jobTitle,
          profilePicture: profile.profilePicture,
          score: myScore,
        });
      } catch (error) {
        if (isLeaderboardSchemaError(error)) {
          set({ rankingUnavailable: true });
        } else {
          console.warn('Leaderboard ranking sync failed:', error);
        }
      }
    }

    if (params.celebrate && myScore.total > params.previousTotal) {
      const prevEarned = new Set(
        (params.previousScore?.awards || []).filter((award) => award.earned).map((award) => award.id),
      );
      const unlocked = params.previousScore
        ? myScore.awards.filter((award) => award.earned && !prevEarned.has(award.id)).map((award) => award.label)
        : [];
      usePointsToastStore.getState().show(myScore.total - params.previousTotal, unlocked);
    }

    set({
      myScore,
      myPoints: myScore.total,
      scoreLoading: false,
      lastScoreAt: Date.now(),
    });
  } catch (error: any) {
    set({
      scoreLoading: false,
      error: error?.message || 'Unable to load your summit score.',
    });
  } finally {
    scoreInFlight = false;
  }
}
