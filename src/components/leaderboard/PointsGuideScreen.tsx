import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AWARD_CATEGORIES, CONNECTION_MILESTONES } from '../../config/leaderboardPoints';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import { autopackColors } from '../../theme';
import { ui } from '../../ui/tokens';
import { PointsGuideSkeleton } from './LeaderboardSkeletons';

export default function PointsGuideScreen() {
  const myScore = useLeaderboardStore((s) => s.myScore);
  const loading = useLeaderboardStore((s) => s.loading);
  const scoreLoading = useLeaderboardStore((s) => s.scoreLoading);
  const lastScoreAt = useLeaderboardStore((s) => s.lastScoreAt);
  const error = useLeaderboardStore((s) => s.error);
  const refresh = useLeaderboardStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const waitingForScore = !myScore && !error && (scoreLoading || lastScoreAt == null);
  const connections = myScore?.counts.connections ?? 0;

  if (waitingForScore) {
    return <PointsGuideSkeleton />;
  }

  return (
    <Animated.ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      entering={FadeIn.duration(220)}
      refreshControl={
        <RefreshControl
          refreshing={!!myScore && (scoreLoading || loading)}
          onRefresh={() => void refresh({ force: true })}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Your breakdown</Text>
        <Text style={styles.heroTitle}>{myScore?.total ?? 0} pts</Text>
        <Text style={styles.heroHint}>{myScore?.nextHint || 'Earn points by jumping into the summit.'}</Text>
        <Text style={styles.heroHint}>Scores save as you earn them. Pull to refresh for the latest totals.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Connection chase</Text>
        <Text style={styles.meta}>
          {connections} accepted connection{connections === 1 ? '' : 's'}
        </Text>
        <View style={styles.milestoneRow}>
          {CONNECTION_MILESTONES.map((milestone) => {
            const done = connections >= milestone.threshold;
            return (
              <View key={milestone.id} style={[styles.milestoneChip, done && styles.milestoneChipDone]}>
                <Text style={[styles.milestoneText, done && styles.milestoneTextDone]}>{milestone.threshold}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {AWARD_CATEGORIES.map((category) => {
        const awards = (myScore?.awards || []).filter((award) => award.category === category.id);
        const subtotal = myScore?.categoryTotals[category.id] ?? 0;
        return (
          <View key={category.id} style={styles.card}>
            <View style={styles.categoryHeader}>
              <Text style={styles.sectionTitle}>{category.label}</Text>
              <Text style={styles.subtotal}>{subtotal} pts</Text>
            </View>
            {awards.map((award) => (
              <Pressable
                key={award.id}
                style={styles.awardRow}
                onPress={() => router.push(award.href as any)}
              >
                <Ionicons
                  name={award.earned ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={award.earned ? '#047857' : ui.colors.muted}
                />
                <View style={styles.awardText}>
                  <Text style={styles.awardLabel}>{award.label}</Text>
                  <Text style={styles.awardDetail}>
                    {award.detail ||
                      (award.earned ? 'Earned' : `Still available · ${award.points} pts`)}
                  </Text>
                </View>
                <Text style={[styles.awardPoints, award.earned && styles.awardPointsEarned]}>
                  {award.earned ? `+${award.pointsEarned}` : award.points}
                </Text>
              </Pressable>
            ))}
          </View>
        );
      })}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F1F8' },
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  hero: {
    borderRadius: 18,
    backgroundColor: autopackColors.apYellow,
    padding: 18,
  },
  heroEyebrow: { fontWeight: '800', textTransform: 'uppercase', color: '#374151', fontSize: 12 },
  heroTitle: { marginTop: 4, fontSize: 32, fontWeight: '900', color: '#111827' },
  heroHint: { marginTop: 6, color: '#374151', fontWeight: '600' },
  error: { marginTop: 8, color: ui.colors.danger, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: ui.colors.text },
  meta: { marginTop: 4, color: ui.colors.muted, fontWeight: '600' },
  milestoneRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  milestoneChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: ui.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneChipDone: { backgroundColor: '#D1FAE5' },
  milestoneText: { fontWeight: '800', color: ui.colors.muted },
  milestoneTextDone: { color: '#047857' },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subtotal: { fontWeight: '800', color: ui.colors.primary },
  awardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ui.colors.border,
  },
  awardText: { flex: 1 },
  awardLabel: { fontWeight: '700', color: ui.colors.text },
  awardDetail: { marginTop: 2, color: ui.colors.muted, fontSize: 12 },
  awardPoints: { fontWeight: '800', color: ui.colors.muted },
  awardPointsEarned: { color: '#047857' },
});
