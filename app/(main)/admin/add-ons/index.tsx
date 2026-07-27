import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminAddOnListRow,
  listAdminAddOns,
} from '../../../../src/components/admin/addons/adminAddOnsService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

function formatPrice(value: number | null) {
  if (value === null || value === undefined) return '—';
  return `$${value}`;
}

export default function AdminAddOnsListScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminAddOnListRow[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await listAdminAddOns());
    } catch (e: any) {
      setError(e?.message || 'Unable to load add-ons.');
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
      const title = row.title.toLowerCase();
      const date = String(row.date || '').toLowerCase();
      const time = String(row.time || '').toLowerCase();
      const location = String(row.location || '').toLowerCase();
      return title.includes(q) || date.includes(q) || time.includes(q) || location.includes(q);
    });
  }, [rows, search]);

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Add-ons</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.createButtonWrap}>
            <AppButton
              title='New Add-on'
              onPress={() => router.push('/(main)/admin/add-ons/create')}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='search-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>Search Add-ons ({rows.length})</Text>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search by title, date, time, or location'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
        </AppCard>

        {loading ? <Text style={styles.meta}>Loading add-ons...</Text> : null}

        {!loading && !filteredRows.length ? (
          <AppCard style={styles.card}>
            <Text style={styles.meta}>No add-ons matched your search.</Text>
          </AppCard>
        ) : null}

        {!loading &&
          filteredRows.map((row) => (
            <Pressable
              key={row.id}
              onPress={() =>
                router.push({
                  pathname: '/(main)/admin/add-ons/[addOnId]',
                  params: { addOnId: row.id },
                })
              }
            >
              <AppCard style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{row.title}</Text>
                  <Text style={styles.meta}>
                    {[row.date || 'No date', row.time || 'No time', row.location || 'No location'].join(' • ')}
                  </Text>
                  <Text style={styles.meta}>
                    {`Limit: ${row.limit ?? '—'} • Price: ${formatPrice(row.price)} • Pending: ${row.pendingCount} • Approved: ${row.approvedCount}`}
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
  title: { color: ui.colors.primary, fontWeight: '800', fontSize: 16 },
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
