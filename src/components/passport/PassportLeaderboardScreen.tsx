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
import { LEADERBOARD_VISIBLE_LIMIT } from '../../config/leaderboardPoints';
import { useCurrentUserProfile } from '../../hooks/useApsStore';
import {
  rankPassportLeaderboard,
  visibleLeaderboard,
} from '../../services/leaderboardEntries';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import { autopackColors } from '../../theme';
import { ui } from '../../ui/tokens';
import { LeaderboardAvatar } from '../leaderboard/LeaderboardAvatar';
import { LeaderboardScreenSkeleton } from '../leaderboard/LeaderboardSkeletons';

function medalColor(rank: number) {
  if (rank === 1) return autopackColors.apYellow;
  if (rank === 2) return '#9CA3AF';
  if (rank === 3) return '#B45309';
  return ui.colors.subtle;
}

function stampLabel(count: number) {
  return `${count} stamp${count === 1 ? '' : 's'}`;
}

export default function PassportLeaderboardScreen() {
  const profile = useCurrentUserProfile();
  const myScore = useLeaderboardStore((s) => s.myScore);
  const rankedAll = useLeaderboardStore((s) => s.rankedAll);
  const loading = useLeaderboardStore((s) => s.loading);
  const lastBoardAt = useLeaderboardStore((s) => s.lastBoardAt);
  const error = useLeaderboardStore((s) => s.error);
  const rankingUnavailable = useLeaderboardStore((s) => s.rankingUnavailable);
  const refresh = useLeaderboardStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const rows = useMemo(
    () => visibleLeaderboard(rankPassportLeaderboard(rankedAll)),
    [rankedAll],
  );
  const myStamps = myScore?.counts.stamps ?? 0;
  const stampTotal = myScore?.counts.stampTotal ?? 0;
  const mine = useMemo(
    () => rows.find((row) => row.userProfileId === profile?.id) || null,
    [profile?.id, rows],
  );
  const myName = useMemo(() => {
    const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
    return name || 'You';
  }, [profile?.firstName, profile?.lastName]);
  const waiting = !error && lastBoardAt == null && rankedAll.length === 0 && myStamps <= 0;

  if (waiting) return <LeaderboardScreenSkeleton />;

  return (
    <Animated.View style={styles.container} entering={FadeIn.duration(220)}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading && !waiting} onRefresh={() => void refresh({ force: true })} />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Pressable style={styles.youCard} onPress={() => router.push('/(main)/hub/passport' as any)}>
              <View style={styles.youTop}>
                <LeaderboardAvatar name={myName} picture={profile?.profilePicture} size={52} />
                <View style={styles.youText}>
                  <Text style={styles.youEyebrow}>Your passport</Text>
                  <Text style={styles.youTitle}>
                    {mine ? `#${mine.rank}` : 'Unranked'} · {stampLabel(mine?.stamps ?? myStamps)}
                  </Text>
                  <Text style={styles.youHint}>
                    {stampTotal > 0
                      ? `${mine?.stamps ?? myStamps} of ${stampTotal} exhibitor stamps collected`
                      : 'Scan exhibitor QR codes to climb this board.'}
                  </Text>
                </View>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLink}>Back to your passport</Text>
                <Ionicons name='chevron-forward' size={16} color='#111827' />
              </View>
            </Pressable>
            {rankingUnavailable ? (
              <Text style={styles.notice}>
                Rankings go live after the leaderboard table is published. Your personal stamps still work.
              </Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {rows.length > 0 ? <Text style={styles.sectionTitle}>Top {LEADERBOARD_VISIBLE_LIMIT} collectors</Text> : null}
            {rows.length > 0 ? (
              <Text style={styles.pullHint}>Ranked by unique exhibitor stamps. Pull to refresh.</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading && !rankingUnavailable ? (
            <Text style={styles.empty}>Be first on the passport board — scan an exhibitor QR.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const isMe = item.userProfileId === profile?.id;
          return (
            <Pressable
              style={[styles.row, isMe && styles.rowMe]}
              onPress={() =>
                router.push({
                  pathname: '/(main)/hub/community/[id]',
                  params: { id: item.userProfileId },
                })
              }
              accessibilityRole='button'
              accessibilityLabel={`Open ${item.displayName}'s profile`}
            >
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
              <Text style={styles.rowPoints}>{item.stamps}</Text>
              <Ionicons name='chevron-forward' size={16} color={ui.colors.muted} />
            </Pressable>
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
