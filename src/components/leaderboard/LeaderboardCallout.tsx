import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import { ui } from '../../ui/tokens';

export function LeaderboardCallout({ style }: { style?: StyleProp<ViewStyle> }) {
  const myScore = useLeaderboardStore((s) => s.myScore);
  const myRank = useLeaderboardStore((s) => s.myRank);
  const myPoints = useLeaderboardStore((s) => s.myPoints);
  const loading = useLeaderboardStore((s) => s.loading);
  const scoreLoading = useLeaderboardStore((s) => s.scoreLoading);
  const points = myScore?.total ?? myPoints;
  const hint = myScore?.nextHint;
  const checking = (loading || scoreLoading) && points <= 0;
  const title = myRank
    ? `You’re #${myRank} · ${points} pts`
    : points > 0
      ? `${points} pts and climbing`
      : checking
        ? 'Checking the board...'
        : 'Get on the board';

  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() => router.push('/(main)/hub/leaderboard' as any)}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name='trophy' size={20} color='#fff' />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>Summit Score</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Ionicons name='chevron-forward' size={22} color='#111827' />
      </View>
      <Text style={styles.subtitle}>
        {hint || 'Earn points by connecting, completing your profile, and hunting stamps.'}
      </Text>
      <Pressable
        onPress={() => router.push('/(main)/hub/points' as any)}
        hitSlop={8}
        style={styles.linkWrap}
      >
        <Text style={styles.link}>How points work</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: ui.colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1 },
  eyebrow: {
    color: 'rgba(17,24,39,0.72)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: '#1F2937',
    fontWeight: '700',
    lineHeight: 20,
  },
  linkWrap: { alignSelf: 'flex-start' },
  link: {
    color: '#111827',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
