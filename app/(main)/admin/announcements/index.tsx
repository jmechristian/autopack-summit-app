import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminAnnouncementListRow,
  formatAnnouncementListMeta,
  listAdminAnnouncements,
} from '../../../../src/components/admin/announcements/adminAnnouncementsService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

function statusStyle(status: AdminAnnouncementListRow['status']) {
  if (status === 'published') return styles.statusPublished;
  if (status === 'scheduled') return styles.statusScheduled;
  return styles.statusReady;
}

export default function AdminAnnouncementsListScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminAnnouncementListRow[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await listAdminAnnouncements());
    } catch (e: any) {
      setError(e?.message || 'Unable to load announcements.');
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
      const body = row.bodyPreview.toLowerCase();
      const status = row.statusLabel.toLowerCase();
      return title.includes(q) || body.includes(q) || status.includes(q);
    });
  }, [rows, search]);

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Announcements</Text>
          <Text style={styles.helpText}>
            Send push notifications to everyone with notifications enabled. Scheduled
            announcements publish automatically in the background at the scheduled time.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.createButtonWrap}>
            <AppButton
              title='New Announcement'
              onPress={() => router.push('/(main)/admin/announcements/create')}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='search-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>History ({rows.length})</Text>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search by title, body, or status'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
        </AppCard>

        {loading ? <Text style={styles.meta}>Loading announcements...</Text> : null}

        {!loading && !filteredRows.length ? (
          <AppCard style={styles.card}>
            <Text style={styles.meta}>No announcements matched your search.</Text>
          </AppCard>
        ) : null}

        {!loading &&
          filteredRows.map((row) => (
            <Pressable
              key={row.id}
              onPress={() =>
                router.push({
                  pathname: '/(main)/admin/announcements/[announcementId]',
                  params: { announcementId: row.id },
                })
              }
            >
              <AppCard style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTitleWrap}>
                    <Text style={styles.title}>{row.title}</Text>
                    <View style={[styles.statusPill, statusStyle(row.status)]}>
                      <Text style={styles.statusText}>{row.statusLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.preview} numberOfLines={2}>
                    {row.bodyPreview}
                  </Text>
                  <Text style={styles.meta}>{formatAnnouncementListMeta(row)}</Text>
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
  title: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, flex: 1 },
  preview: { color: '#374151', marginTop: 6, lineHeight: 20 },
  meta: { color: ui.colors.muted, marginTop: 6, lineHeight: 18 },
  helpText: { color: ui.colors.muted, lineHeight: 20, marginBottom: 4 },
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
  rowTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  statusPublished: { backgroundColor: '#15803d' },
  statusScheduled: { backgroundColor: '#2563eb' },
  statusReady: { backgroundColor: '#b45309' },
});
