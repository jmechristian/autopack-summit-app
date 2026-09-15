import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCurrentUserProfile } from '../../hooks/useApsStore';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import { autopackColors } from '../../theme';
import { ui } from '../../ui/tokens';
import { LEADERBOARD_VISIBLE_LIMIT } from '../../config/leaderboardPoints';
import { LeaderboardAvatar } from './LeaderboardAvatar';
import { LeaderboardScreenSkeleton } from './LeaderboardSkeletons';

function medalColor(rank: number) {
  if (rank === 1) return autopackColors.apYellow;
  if (rank === 2) return '#9CA3AF';
  if (rank === 3) return '#B45309';
  return ui.colors.subtle;
}

export default function LeaderboardScreen() {
  const profile = useCurrentUserProfile();
  const myScore = useLeaderboardStore((s) => s.myScore);
  const myRank = useLeaderboardStore((s) => s.myRank);
  const myPoints = useLeaderboardStore((s) => s.myPoints);
  const entries = useLeaderboardStore((s) => s.entries);
  const loading = useLeaderboardStore((s) => s.loading);
  const lastBoardAt = useLeaderboardStore((s) => s.lastBoardAt);
  const error = useLeaderboardStore((s) => s.error);
  const rankingUnavailable = useLeaderboardStore((s) => s.rankingUnavailable);
  const refresh = useLeaderboardStore((s) => s.refresh);
  const waitingForBoard = !error && lastBoardAt == null && entries.length === 0;
  const showFullSkeleton = waitingForBoard && (myScore?.total ?? myPoints) <= 0;

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const myName = useMemo(() => {
    const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
    return name || 'You';
  }, [profile?.firstName, profile?.lastName]);

  if (showFullSkeleton) {
    return <LeaderboardScreenSkeleton />;
  }

  return (
    <Animated.View style={styles.container} entering={FadeIn.duration(220)}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading && !waitingForBoard}
            onRefresh={() => void refresh({ force: true })}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Pressable style={styles.youCard} onPress={() => router.push('/(main)/hub/points' as any)}>
              <View style={styles.youTop}>
                <LeaderboardAvatar name={myName} picture={profile?.profilePicture} size={52} />
                <View style={styles.youText}>
                  <Text style={styles.youEyebrow}>Your summit score</Text>
                  <Text style={styles.youTitle}>
                    {myRank ? `#${myRank}` : 'Unranked'} · {myScore?.total ?? myPoints} pts
                  </Text>
                  <Text style={styles.youHint}>{myScore?.nextHint || 'Complete an action to start scoring.'}</Text>
                </View>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLink}>See your breakdown</Text>
                <Ionicons name='chevron-forward' size={16} color='#111827' />
              </View>
            </Pressable>

            {rankingUnavailable ? (
              <Text style={styles.notice}>
                Rankings go live after the leaderboard table is published. Your personal score still works.
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {entries.length > 0 ? <Text style={styles.sectionTitle}>Top {LEADERBOARD_VISIBLE_LIMIT}</Text> : null}
            {entries.length > 0 ? (
              <Text style={styles.pullHint}>Pull to refresh for the latest scores.</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              Be first on the board — finish your profile or send a connection.
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isMe = item.userProfileId === profile?.id;
          return (
            <View style={[styles.row, isMe && styles.rowMe]}>
              <View style={[styles.rankBadge, { backgroundColor: medalColor(item.rank) }]}>
                <Text style={[styles.rankText, item.rank > 3 && styles.rankTextMuted]}>{item.rank}</Text>
              </View>
              <LeaderboardAvatar name={item.displayName} picture={item.profilePicture} size={40} />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.displayName}
                  {isMe ? ' (you)' : ''}
                </Text>
                {!!item.company && (
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.company}
                  </Text>
                )}
              </View>
              <Text style={styles.rowPoints}>{item.points}</Text>
            </View>
          );
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F1F8' },
  content: { padding: 16, paddingBottom: 32 },
  headerBlock: { gap: 12, marginBottom: 8 },
  youCard: {
    borderRadius: 18,
    backgroundColor: autopackColors.apYellow,
    padding: 16,
    gap: 12,
  },
  youTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  youText: { flex: 1 },
  youEyebrow: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', color: '#374151' },
  youTitle: { marginTop: 2, fontSize: 20, fontWeight: '900', color: '#111827' },
  youHint: { marginTop: 4, color: '#374151', fontWeight: '600' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breakdownLink: { fontWeight: '800', color: '#111827' },
  notice: { color: '#374151', fontWeight: '600' },
  error: { color: ui.colors.danger, fontWeight: '600' },
  sectionTitle: { marginTop: 8, fontSize: 16, fontWeight: '800', color: ui.colors.text },
  pullHint: { marginTop: -4, color: ui.colors.muted, fontWeight: '600' },
  empty: { marginTop: 16, color: ui.colors.muted, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowMe: { borderWidth: 1.5, borderColor: autopackColors.apYellow },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontWeight: '800', color: '#111827' },
  rankTextMuted: { color: ui.colors.muted },
  rowText: { flex: 1 },
  rowName: { fontWeight: '800', color: ui.colors.text },
  rowMeta: { color: ui.colors.muted, marginTop: 2 },
  rowPoints: { fontWeight: '900', color: ui.colors.primary, fontSize: 16 },
});
