import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { defaultRisingStarYear, risingStarLabel } from '../../../config/risingStars';
import {
  clearProfileRisingStar,
  listProfilesForRisingStarAdmin,
  setProfileRisingStar,
} from '../../../services/risingStars';
import { LeaderboardAvatar } from '../../leaderboard/LeaderboardAvatar';
import { AppCard } from '../../../ui/AppCard';
import { AppScreen } from '../../../ui/AppScreen';
import { ui } from '../../../ui/tokens';

type AdminProfile = Awaited<ReturnType<typeof listProfilesForRisingStarAdmin>>[number];

function nameOf(row: AdminProfile) {
  return `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Attendee';
}

export default function AdminRisingStarsScreen() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [yearDrafts, setYearDrafts] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listProfilesForRisingStarAdmin();
      setProfiles(rows);
      const drafts: Record<string, string> = {};
      for (const row of rows) {
        drafts[row.id] = String(row.risingStarYear || defaultRisingStarYear());
      }
      setYearDrafts(drafts);
      const awarded = rows.filter((row) => row.risingStarYear).length;
      setNotice(
        awarded
          ? `${awarded} Rising Star${awarded === 1 ? '' : 's'} on file.`
          : 'No Rising Stars yet. Search an attendee and assign a year.',
      );
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load profiles. If you just added the schema fields, run amplify push first.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const awarded = useMemo(
    () =>
      profiles
        .filter((row) => row.risingStarYear)
        .sort((a, b) => (b.risingStarYear || 0) - (a.risingStarYear || 0) || nameOf(a).localeCompare(nameOf(b))),
    [profiles],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles.slice(0, 40);
    return profiles
      .filter((row) =>
        [nameOf(row), row.email, row.company, row.jobTitle]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      )
      .slice(0, 40);
  }, [profiles, search]);

  const assign = async (row: AdminProfile) => {
    const year = Number(yearDrafts[row.id] || defaultRisingStarYear());
    setSavingId(row.id);
    setError(null);
    try {
      await setProfileRisingStar(row.id, year);
      setNotice(`${nameOf(row)} is now ${risingStarLabel(year)}.`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Unable to save Rising Star.');
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (row: AdminProfile) => {
    Alert.alert('Remove Rising Star?', `Clear the award from ${nameOf(row)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setSavingId(row.id);
          setError(null);
          try {
            await clearProfileRisingStar(row.id);
            setNotice(`Removed Rising Star from ${nameOf(row)}.`);
            await load();
          } catch (e: any) {
            setError(e?.message || 'Unable to clear Rising Star.');
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  };

  const renderEditor = (row: AdminProfile) => {
    const busy = savingId === row.id;
    const name = nameOf(row);
    return (
      <View key={row.id} style={styles.rowCard}>
        <LeaderboardAvatar name={name} picture={row.profilePicture} size={40} />
        <View style={styles.rowText}>
          <Text style={styles.rowName}>{name}</Text>
          <Text style={styles.rowMeta}>
            {[row.jobTitle, row.company].filter(Boolean).join(' · ') || row.email || 'No title'}
          </Text>
          {row.risingStarYear ? (
            <Text style={styles.awarded}>{risingStarLabel(row.risingStarYear)}</Text>
          ) : null}
          <View style={styles.editRow}>
            <TextInput
              value={yearDrafts[row.id] || ''}
              onChangeText={(value) =>
                setYearDrafts((prev) => ({ ...prev, [row.id]: value.replace(/[^\d]/g, '').slice(0, 4) }))
              }
              keyboardType='number-pad'
              placeholder='Year'
              placeholderTextColor={ui.colors.muted}
              style={styles.yearInput}
            />
            <Pressable
              style={[styles.actionBtn, styles.saveBtn, busy && styles.disabled]}
              disabled={busy}
              onPress={() => void assign(row)}
            >
              {busy ? (
                <ActivityIndicator color='#111827' />
              ) : (
                <Text style={styles.saveText}>{row.risingStarYear ? 'Update' : 'Make Rising Star'}</Text>
              )}
            </Pressable>
            {row.risingStarYear ? (
              <Pressable
                style={[styles.actionBtn, styles.clearBtn, busy && styles.disabled]}
                disabled={busy}
                onPress={() => void remove(row)}
              >
                <Text style={styles.clearText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Rising Stars</Text>
          <Text style={styles.meta}>
            Mark an attendee profile as a Rising Star and set the award year. That badge shows on
            their profile, community page, and the public Rising Stars screen.
          </Text>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.meta}>Loading attendees…</Text> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Current honorees ({awarded.length})</Text>
          {!awarded.length && !loading ? (
            <Text style={styles.meta}>None assigned yet.</Text>
          ) : (
            awarded.map(renderEditor)
          )}
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='search-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>Find an attendee</Text>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search by name, email, company, or title'
            placeholderTextColor={ui.colors.muted}
            style={styles.search}
            autoCapitalize='none'
          />
          {!search.trim() ? (
            <Text style={styles.meta}>Type to search all app profiles, then assign a year.</Text>
          ) : (
            filtered.map(renderEditor)
          )}
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl, paddingTop: 6 },
  card: { marginBottom: ui.space.md, paddingVertical: 14 },
  title: { color: ui.colors.primary, fontWeight: '800', fontSize: 20 },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  meta: { color: ui.colors.muted, marginTop: 6, lineHeight: 20, fontWeight: '600' },
  notice: { color: '#047857', marginTop: 10, fontWeight: '700' },
  error: { color: ui.colors.danger, marginTop: 8, fontWeight: '700' },
  search: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: ui.colors.text,
    marginBottom: 10,
  },
  rowCard: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 8,
  },
  rowText: { flex: 1 },
  rowName: { color: ui.colors.text, fontWeight: '800' },
  rowMeta: { color: ui.colors.muted, marginTop: 2, fontSize: 12, fontWeight: '600' },
  awarded: { color: '#B45309', marginTop: 4, fontWeight: '800', fontSize: 12 },
  editRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, alignItems: 'center' },
  yearInput: {
    width: 72,
    height: 40,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: ui.colors.text,
    fontWeight: '800',
  },
  actionBtn: {
    minHeight: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: { backgroundColor: ui.colors.secondary },
  saveText: { fontWeight: '800', color: '#111827' },
  clearBtn: { backgroundColor: '#FEE2E2' },
  clearText: { fontWeight: '800', color: ui.colors.danger },
  disabled: { opacity: 0.6 },
});
