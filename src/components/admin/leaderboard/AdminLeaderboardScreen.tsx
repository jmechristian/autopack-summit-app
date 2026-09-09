import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppCard } from '../../../ui/AppCard';
import { AppScreen } from '../../../ui/AppScreen';
import { ui } from '../../../ui/tokens';
import {
  listStoredAdminLeaderboard,
  metricsFromRows,
  recalculateAllLeaderboardScores,
  storedEntriesToAdminRows,
  type AdminLeaderboardRow,
} from './adminLeaderboardService';

export default function AdminLeaderboardScreen() {
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<AdminLeaderboardRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadStored = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await listStoredAdminLeaderboard();
      setRows(storedEntriesToAdminRows(entries));
      setNotice(entries.length ? `Showing ${entries.length} stored scores.` : 'No stored scores yet. Recalculate to backfill.');
    } catch (e: any) {
      setError(e?.message || 'Unable to load the stored leaderboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStored();
    }, [loadStored]),
  );

  const recalculate = async () => {
    setRecalculating(true);
    setError(null);
    try {
      const result = await recalculateAllLeaderboardScores();
      setRows(result.rows.filter((row) => row.points > 0));
      if (result.rankingUnavailable) {
        setNotice('Scores calculated locally. Persist them after amplify push creates the leaderboard table.');
      } else {
        setNotice(`Recalculated ${result.rows.length} attendees and wrote ${result.written} scores.${result.errors ? ` ${result.errors} failed.` : ''}`);
      }
    } catch (e: any) {
      setError(e?.message || 'Recalculate failed.');
    } finally {
      setRecalculating(false);
    }
  };

  const metrics = useMemo(() => metricsFromRows(rows), [rows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.company].some((value) => value.toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Summit Score Leaderboard</Text>
          <Text style={styles.meta}>
            Recalculate scores from existing activity (profiles, connections, stamps, favorites, notes, feedback).
          </Text>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.meta}>Loading stored rankings...</Text> : null}
          <Pressable style={styles.button} onPress={() => void recalculate()} disabled={recalculating}>
            <Text style={styles.buttonText}>{recalculating ? 'Recalculating...' : 'Recalculate from activity'}</Text>
          </Pressable>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.title}>Metrics</Text>
          <Text style={styles.meta}>People on the board: {metrics.peopleOnBoard}</Text>
          <Text style={styles.meta}>Total points awarded: {metrics.totalPoints}</Text>
          <Text style={styles.meta}>Top score: {metrics.topScore}</Text>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.title}>Rankings ({rows.length})</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search by name, email, or company'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
          {!filtered.length ? (
            <Text style={styles.meta}>No attendees matched.</Text>
          ) : (
            filtered.map((row) => {
              const open = expandedId === row.profileId;
              return (
                <Pressable
                  key={row.profileId}
                  style={styles.row}
                  onPress={() => setExpandedId(open ? null : row.profileId)}
                >
                  <View style={styles.rowTop}>
                    <Text style={styles.rank}>#{row.rank}</Text>
                    <View style={styles.rowText}>
                      <Text style={styles.name}>{row.name}</Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {[row.company, row.email].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text style={styles.points}>{row.points}</Text>
                  </View>
                  {open ? (
                    <View style={styles.breakdown}>
                      <Text style={styles.meta}>
                        Connections {row.connections} · Stamps {row.stamps}
                      </Text>
                      <Text style={styles.meta}>
                        Profile {row.categoryTotals.profile} · Networking {row.categoryTotals.networking} · Passport{' '}
                        {row.categoryTotals.passport} · Explore {row.categoryTotals.explore} · Feedback{' '}
                        {row.categoryTotals.feedback}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { gap: 12, paddingBottom: 28 },
  card: { gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: ui.colors.primary },
  meta: { color: ui.colors.muted, fontWeight: '600' },
  notice: { color: '#374151', fontWeight: '600' },
  error: { color: ui.colors.danger, fontWeight: '700' },
  button: {
    marginTop: 6,
    backgroundColor: ui.colors.primary,
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: ui.colors.text,
  },
  row: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ui.colors.border,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 36, fontWeight: '800', color: ui.colors.text },
  rowText: { flex: 1 },
  name: { fontWeight: '800', color: ui.colors.text },
  points: { fontWeight: '900', color: ui.colors.primary },
  breakdown: { marginTop: 8, gap: 4 },
});
