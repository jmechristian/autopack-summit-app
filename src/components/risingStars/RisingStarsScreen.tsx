import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  RISING_STAR_NOMINATE_URL,
  RISING_STAR_PROGRAM,
  risingStarLabel,
} from '../../config/risingStars';
import {
  groupRisingStarsByYear,
  risingStarDisplayName,
  listRisingStars,
  type RisingStarProfile,
} from '../../services/risingStars';
import { autopackColors } from '../../theme';
import { ui } from '../../ui/tokens';
import { RiveLoader } from '../RiveLoader';
import { LeaderboardAvatar } from '../leaderboard/LeaderboardAvatar';

export default function RisingStarsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stars, setStars] = useState<RisingStarProfile[]>([]);

  const load = useCallback(async () => {
    const rows = await listRisingStars();
    setStars(rows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const grouped = groupRisingStarsByYear(stars);

  if (loading) return <RiveLoader />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await load();
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{RISING_STAR_PROGRAM.eyebrow}</Text>
        <Text style={styles.heroTitle}>{RISING_STAR_PROGRAM.title}</Text>
        <Text style={styles.heroBody}>{RISING_STAR_PROGRAM.summary}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Program details</Text>
        <View style={styles.chipWrap}>
          {RISING_STAR_PROGRAM.criteria.map((item) => (
            <View key={item} style={styles.chip}>
              <Ionicons name='checkmark-circle' size={16} color={autopackColors.apBlue} />
              <Text style={styles.chipText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Goal</Text>
        {RISING_STAR_PROGRAM.goals.map((goal) => (
          <View key={goal} style={styles.goalRow}>
            <View style={styles.goalDot} />
            <Text style={styles.goalText}>{goal}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Industry judges</Text>
        <Text style={styles.meta}>A team of 3 confirmed judges</Text>
        {RISING_STAR_PROGRAM.judges.map((judge) => (
          <View key={judge} style={styles.judgeRow}>
            <Ionicons name='person-circle-outline' size={22} color={ui.colors.primary} />
            <Text style={styles.judgeName}>{judge}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Past Rising Stars</Text>
        {!grouped.length ? (
          <Text style={styles.meta}>
            Honorees will appear here after they’re added in Admin, with name, photo, company, and
            title.
          </Text>
        ) : (
          grouped.map(([year, rows]) => (
            <View key={year} style={styles.yearBlock}>
              <Text style={styles.yearLabel}>{risingStarLabel(year)}</Text>
              {rows.map((star) => {
                const name = risingStarDisplayName(star);
                return (
                  <Pressable
                    key={star.id}
                    style={styles.starRow}
                    onPress={() => router.push(`/(main)/hub/community/${star.id}` as any)}
                  >
                    <LeaderboardAvatar name={name} picture={star.profilePicture} size={48} />
                    <View style={styles.starText}>
                      <Text style={styles.starName}>{name}</Text>
                      {!!star.jobTitle && <Text style={styles.starMeta}>{star.jobTitle}</Text>}
                      {!!star.company && <Text style={styles.starMeta}>{star.company}</Text>}
                    </View>
                    <Ionicons name='chevron-forward' size={18} color={ui.colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </View>

      <Pressable
        style={styles.nominateBtn}
        onPress={() => void Linking.openURL(RISING_STAR_NOMINATE_URL)}
        accessibilityRole='link'
        accessibilityLabel='Nominate your Rising Star'
      >
        <Ionicons name='star' size={18} color='#111827' />
        <Text style={styles.nominateText}>Nominate Your Rising Star</Text>
        <Ionicons name='open-outline' size={16} color='#111827' />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F1F8' },
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  hero: {
    borderRadius: 18,
    backgroundColor: '#0C3B68',
    padding: 18,
    gap: 8,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  heroBody: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', lineHeight: 21 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: ui.colors.text },
  meta: { color: ui.colors.muted, fontWeight: '600', lineHeight: 20 },
  chipWrap: { gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: { flex: 1, color: ui.colors.text, fontWeight: '700' },
  goalRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  goalDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: autopackColors.apYellow,
    marginTop: 7,
  },
  goalText: { flex: 1, color: '#374151', fontWeight: '600', lineHeight: 21 },
  judgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  judgeName: { fontWeight: '800', color: ui.colors.text, fontSize: 15 },
  yearBlock: { gap: 8, marginTop: 4 },
  yearLabel: {
    fontWeight: '800',
    color: ui.colors.primary,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ui.colors.border,
  },
  starText: { flex: 1 },
  starName: { fontWeight: '800', color: ui.colors.text, fontSize: 16 },
  starMeta: { marginTop: 2, color: ui.colors.muted, fontWeight: '600' },
  nominateBtn: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: autopackColors.apYellow,
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nominateText: { fontWeight: '900', color: '#111827', fontSize: 16 },
});
