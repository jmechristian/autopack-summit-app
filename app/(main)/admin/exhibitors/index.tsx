import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminExhibitorSummary,
  listAdminExhibitorSummaries,
} from '../../../../src/components/admin/exhibitors/adminExhibitorsService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AdminExhibitorsListScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminExhibitorSummary[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAdminExhibitorSummaries();
      setRows(data);
    } catch (e: any) {
      setError(e?.message || 'Unable to load exhibitors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const companyName = String(row.companyName || '').toLowerCase();
      const companyEmail = String(row.companyEmail || '').toLowerCase();
      const booth = String(row.boothNumber || '').toLowerCase();
      const registrantMatches = row.registrantSearchText.some((value) =>
        String(value || '').toLowerCase().includes(q),
      );
      return (
        companyName.includes(q) || companyEmail.includes(q) || booth.includes(q) || registrantMatches
      );
    });
  }, [rows, search]);

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Exhibitors</Text>
          <Text style={styles.meta}>Companies: {rows.length}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.createButtonWrap}>
            <AppButton
              title='New Exhibitor'
              onPress={() => router.push('/(main)/admin/exhibitors/create')}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='search-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>Search</Text>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search by company, booth, registrant name, or registrant email'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
        </AppCard>

        {loading ? <Text style={styles.meta}>Loading exhibitors...</Text> : null}

        {!loading && !filteredRows.length ? (
          <AppCard style={styles.card}>
            <Text style={styles.meta}>No exhibitors matched your search.</Text>
          </AppCard>
        ) : null}

        {!loading &&
          filteredRows.map((row) => (
            <Pressable
              key={row.id}
              onPress={() =>
                router.push({
                  pathname: '/(main)/admin/exhibitors/[exhibitorId]',
                  params: { exhibitorId: row.id },
                })
              }
            >
              <AppCard style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyName}>{row.companyName}</Text>
                  <Text style={styles.meta}>
                    {row.companyEmail || 'No company email'} • Booth {row.boothNumber || '—'}
                  </Text>
                </View>
                <Ionicons name='chevron-forward' size={18} color={ui.colors.muted} />
              </AppCard>
            </Pressable>
          ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl, paddingTop: 6 },
  card: { marginBottom: ui.space.md, paddingVertical: 14 },
  rowCard: {
    marginBottom: ui.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  companyName: { color: ui.colors.primary, fontWeight: '800', fontSize: 16 },
  meta: { color: ui.colors.muted, marginTop: 4, lineHeight: 18 },
  error: { color: ui.colors.danger, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  createButtonWrap: { marginTop: 12 },
  adminButton: { borderRadius: 10 },
});
