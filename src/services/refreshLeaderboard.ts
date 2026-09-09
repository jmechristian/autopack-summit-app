let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let dirty = false;

const DEBOUNCE_MS = 400;

export function refreshLeaderboardInBackground() {
  dirty = true;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushLeaderboardRefresh();
  }, DEBOUNCE_MS);
}

async function flushLeaderboardRefresh() {
  if (inFlight) {
    dirty = true;
    return;
  }
  if (!dirty) return;
  dirty = false;
  inFlight = true;
  try {
    const { useLeaderboardStore } = await import('../store/leaderboardStore');
    await useLeaderboardStore.getState().refresh({ force: true, includeMyScore: true, celebrate: true });
  } catch (error) {
    console.warn('Leaderboard refresh failed:', error);
  } finally {
    inFlight = false;
    if (dirty) void flushLeaderboardRefresh();
  }
}
