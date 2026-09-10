import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { autopackColors } from '../../theme';
import { ui } from '../../ui/tokens';
import { isWeb } from '../../utils/platform';

function Bone({ style }: { style?: object }) {
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    if (isWeb) return;
    pulse.value = withRepeat(withTiming(0.88, { duration: 850 }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isWeb ? 0.62 : pulse.value,
  }));

  return <Animated.View style={[styles.bone, style, animatedStyle]} />;
}

export function LeaderboardScreenSkeleton() {
  return (
    <View style={styles.screen} accessibilityLabel='Loading leaderboard'>
      <View style={styles.youCard}>
        <View style={styles.youTop}>
          <Bone style={styles.avatarLg} />
          <View style={styles.youText}>
            <Bone style={styles.lineSm} />
            <Bone style={styles.lineLg} />
            <Bone style={styles.lineMd} />
          </View>
        </View>
        <Bone style={styles.linkLine} />
      </View>
      <Text style={styles.status}>Loading the board…</Text>
      {Array.from({ length: 8 }, (_, index) => (
        <View key={index} style={styles.row}>
          <Bone style={styles.rank} />
          <Bone style={styles.avatarSm} />
          <View style={styles.rowText}>
            <Bone style={styles.rowName} />
            <Bone style={styles.rowMeta} />
          </View>
          <Bone style={styles.points} />
        </View>
      ))}
    </View>
  );
}

export function PointsGuideSkeleton() {
  return (
    <View style={styles.screen} accessibilityLabel='Loading points breakdown'>
      <View style={styles.youCard}>
        <Bone style={styles.lineSm} />
        <Bone style={styles.heroPts} />
        <Bone style={styles.lineWide} />
        <Bone style={styles.lineMd} />
      </View>
      <Text style={styles.status}>Tallying your summit score…</Text>
      <View style={styles.card}>
        <Bone style={styles.sectionTitle} />
        <Bone style={styles.lineMd} />
        <View style={styles.chips}>
          {Array.from({ length: 5 }, (_, index) => (
            <Bone key={index} style={styles.chip} />
          ))}
        </View>
      </View>
      {Array.from({ length: 3 }, (_, cardIndex) => (
        <View key={cardIndex} style={styles.card}>
          <View style={styles.categoryHeader}>
            <Bone style={styles.sectionTitle} />
            <Bone style={styles.points} />
          </View>
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <View key={rowIndex} style={styles.awardRow}>
              <Bone style={styles.icon} />
              <View style={styles.rowText}>
                <Bone style={styles.rowName} />
                <Bone style={styles.rowMeta} />
              </View>
              <Bone style={styles.points} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#E6F1F8',
    padding: 16,
    gap: 10,
  },
  status: {
    marginTop: 4,
    marginBottom: 2,
    color: ui.colors.muted,
    fontWeight: '700',
  },
  youCard: {
    borderRadius: 18,
    backgroundColor: autopackColors.apYellow,
    padding: 16,
    gap: 10,
  },
  youTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  youText: { flex: 1, gap: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chips: { flexDirection: 'row', gap: 8 },
  awardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowText: { flex: 1, gap: 6 },
  bone: {
    backgroundColor: 'rgba(17, 24, 39, 0.12)',
    borderRadius: 8,
  },
  avatarLg: { width: 52, height: 52, borderRadius: 26 },
  avatarSm: { width: 40, height: 40, borderRadius: 20 },
  rank: { width: 28, height: 28, borderRadius: 14 },
  icon: { width: 20, height: 20, borderRadius: 10 },
  chip: { flex: 1, height: 36, borderRadius: 999 },
  lineSm: { width: 108, height: 10, borderRadius: 6 },
  lineMd: { width: '72%', height: 12, borderRadius: 6 },
  lineLg: { width: '82%', height: 18, borderRadius: 6 },
  lineWide: { width: '92%', height: 12, borderRadius: 6 },
  linkLine: { width: 148, height: 12, borderRadius: 6 },
  heroPts: { width: 120, height: 28, borderRadius: 8, marginTop: 2 },
  sectionTitle: { width: 140, height: 14, borderRadius: 6 },
  rowName: { width: '68%', height: 12, borderRadius: 6 },
  rowMeta: { width: '42%', height: 10, borderRadius: 6 },
  points: { width: 36, height: 14, borderRadius: 6 },
});
