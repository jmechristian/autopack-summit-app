import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminPassportExhibitorRow,
  AdminPassportRegistrantRow,
  getAdminPassportTrackerData,
} from '../../../src/components/admin/passport/adminPassportService';
import { AppCard } from '../../../src/ui/AppCard';
import { AppScreen } from '../../../src/ui/AppScreen';
import { ui } from '../../../src/ui/tokens';

function fmtPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default function AdminPassportScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrantSearch, setRegistrantSearch] = useState('');
  const [exhibitorSearch, setExhibitorSearch] = useState('');
  const [metrics, setMetrics] = useState({
    totalRegistrants: 0,
    eligibleRegistrants: 0,
    totalExhibitors: 0,
    totalStamps: 0,
    totalPossibleStamps: 0,
    averageCompletionPercent: 0,
    completedRegistrants: 0,
  });
  const [registrantRows, setRegistrantRows] = useState<AdminPassportRegistrantRow[]>([]);
  const [exhibitorRows, setExhibitorRows] = useState<AdminPassportExhibitorRow[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminPassportTrackerData();
      setMetrics(data.metrics);
      setRegistrantRows(data.registrantRows);
      setExhibitorRows(data.exhibitorRows);
    } catch (e: any) {
      setError(e?.message || 'Unable to load passport tracker.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filteredRegistrants = useMemo(() => {
    const q = registrantSearch.trim().toLowerCase();
    if (!q) return registrantRows;
    return registrantRows.filter((row) => {
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.company.toLowerCase().includes(q) ||
        row.attendeeType.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      );
    });
  }, [registrantRows, registrantSearch]);

  const filteredExhibitors = useMemo(() => {
    const q = exhibitorSearch.trim().toLowerCase();
    if (!q) return exhibitorRows;
    return exhibitorRows.filter(
      (row) =>
        row.companyName.toLowerCase().includes(q) || String(row.boothNumber || '').toLowerCase().includes(q),
    );
  }, [exhibitorRows, exhibitorSearch]);

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Passport Challenge Tracker</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.meta}>Loading tracker...</Text> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Event Metrics</Text>
          <Text style={styles.meta}>Total registrants: {metrics.totalRegistrants}</Text>
          <Text style={styles.meta}>Eligible registrants: {metrics.eligibleRegistrants}</Text>
          <Text style={styles.meta}>Total exhibitors: {metrics.totalExhibitors}</Text>
          <Text style={styles.meta}>Total stamps: {metrics.totalStamps}</Text>
          <Text style={styles.meta}>Total possible stamps: {metrics.totalPossibleStamps}</Text>
          <Text style={styles.meta}>Average completion: {fmtPercent(metrics.averageCompletionPercent)}</Text>
          <Text style={styles.meta}>Completed registrants: {metrics.completedRegistrants}</Text>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='search-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>Registrant Progress ({registrantRows.length})</Text>
          </View>
          <TextInput
            value={registrantSearch}
            onChangeText={setRegistrantSearch}
            placeholder='Search by name, email, or company'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
          <View style={{ marginTop: 10 }}>
            {!filteredRegistrants.length ? (
              <Text style={styles.meta}>No registrants matched your search.</Text>
            ) : (
              filteredRegistrants.map((row) => (
                <Pressable
                  key={row.registrantId}
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/admin/registrants/[registrantId]',
                      params: { registrantId: row.registrantId },
                    })
                  }
                >
                  <View style={styles.rowCard}>
                    <View style={styles.rowMain}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowName}>{row.name}</Text>
                        <Text style={styles.rowMeta}>{row.company}</Text>
                        {!row.eligible ? (
                          <Text style={styles.ineligible}>Not eligible (missing app profile)</Text>
                        ) : null}
                      </View>
                      <View style={styles.percentPill}>
                        <Text style={styles.percentValue}>{fmtPercent(row.percentComplete)}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='search-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>Exhibitor Leaderboard ({exhibitorRows.length})</Text>
          </View>
          <TextInput
            value={exhibitorSearch}
            onChangeText={setExhibitorSearch}
            placeholder='Search by company or booth'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
          <View style={{ marginTop: 10 }}>
            {!filteredExhibitors.length ? (
              <Text style={styles.meta}>No exhibitors matched your search.</Text>
            ) : (
              filteredExhibitors.map((row) => (
                <View key={row.exhibitorId} style={styles.rowCard}>
                  <Text style={styles.rowName}>{row.companyName}</Text>
                  <Text style={styles.rowMeta}>
                    Booth {row.boothNumber || '—'} • Stamps: {row.stampCount}
                  </Text>
                </View>
              ))
            )}
          </View>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl, paddingTop: 6 },
  card: { marginBottom: ui.space.md, paddingVertical: 14 },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  meta: { color: ui.colors.muted, marginTop: 4, lineHeight: 18 },
  error: { color: ui.colors.danger, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 8,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowName: { color: ui.colors.text, fontWeight: '700' },
  rowMeta: { color: ui.colors.muted, marginTop: 2, fontSize: 12 },
  ineligible: { color: '#B45309', marginTop: 5, fontSize: 12, fontWeight: '700' },
  percentPill: {
    minWidth: 86,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0C3B68',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  percentValue: { color: '#fff', fontWeight: '900', fontSize: 16 },
});

