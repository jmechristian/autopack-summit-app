import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';
import { confirmAction, showAlert } from '../../../../src/utils/alert';
import {
  AdminQrRegenProgress,
  AdminRegistrantListItem,
  listAdminRegistrants,
  regenerateAdminAttendeeQrCodes,
} from '../../../../src/components/admin/registrants/adminRegistrantsService';

export default function AdminRegistrantsListScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [registrants, setRegistrants] = useState<AdminRegistrantListItem[]>([]);
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenProgress, setRegenProgress] = useState<AdminQrRegenProgress | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await listAdminRegistrants();
      setRegistrants(rows);
    } catch (e: any) {
      setError(e?.message || 'Unable to load registrants.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registrants;
    return registrants.filter((item) => {
      const name = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
      const email = (item.email || '').toLowerCase();
      const company = (item.companyName || '').toLowerCase();
      return name.includes(q) || email.includes(q) || company.includes(q);
    });
  }, [registrants, search]);

  const runQrRegen = useCallback(() => {
    confirmAction({
      title: 'Regenerate attendee QR codes?',
      message:
        'This replaces every attendee QR with an app link so a phone camera opens the profile. Passport exhibitor codes are not changed.',
      confirmText: 'Regenerate',
      onConfirm: async () => {
        try {
          setRegenBusy(true);
          setRegenProgress({ processed: 0, updated: 0, failed: 0, done: false });
          const result = await regenerateAdminAttendeeQrCodes(setRegenProgress);
          showAlert(
            'QR codes updated',
            `Updated ${result.updated} attendee codes${result.failed ? ` (${result.failed} failed)` : ''}.`,
          );
        } catch (e: any) {
          showAlert('Could not regenerate QR codes', e?.message || 'Please try again after deploying the API.');
        } finally {
          setRegenBusy(false);
        }
      },
    });
  }, []);

  return (
    <AppScreen style={styles.screen}>
      <View style={styles.headerRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder='Search registrants'
          placeholderTextColor={ui.colors.muted}
          style={styles.searchInput}
          autoCapitalize='none'
        />
        <Pressable style={styles.createButton} onPress={() => router.push('/(main)/admin/registrants/create')}>
          <Ionicons name='add' size={16} color='#fff' />
          <Text style={styles.createButtonText}>New</Text>
        </Pressable>
      </View>
      <Pressable
        style={[styles.regenButton, regenBusy && styles.regenButtonDisabled]}
        onPress={runQrRegen}
        disabled={regenBusy}
      >
        {regenBusy ? <ActivityIndicator size='small' color='#fff' /> : <Ionicons name='qr-code-outline' size={16} color='#fff' />}
        <Text style={styles.createButtonText}>
          {regenBusy
            ? `Regenerating… ${regenProgress?.updated || 0}/${regenProgress?.processed || 0}`
            : 'Regenerate attendee QR codes'}
        </Text>
      </Pressable>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size='large' color={ui.colors.primary} />
          <Text style={styles.muted}>Loading registrants...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {filtered.map((item) => {
            const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed';
            return (
              <AppCard
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/(main)/admin/registrants/${item.id}` as any)}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.name}>{fullName}</Text>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusText}>{item.status || 'UNKNOWN'}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{item.email || 'No email'}</Text>
                <Text style={styles.meta}>
                  {(item.attendeeType || 'No type').toString()} • {item.companyName || 'No company'}
                </Text>
              </AppCard>
            );
          })}
          {!filtered.length ? <Text style={styles.muted}>No registrants found.</Text> : null}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  headerRow: {
    flexDirection: 'row',
    gap: ui.space.sm,
    marginBottom: ui.space.md,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: ui.colors.text,
  },
  createButton: {
    backgroundColor: ui.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  regenButton: {
    backgroundColor: ui.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: ui.space.md,
  },
  regenButtonDisabled: {
    opacity: 0.7,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  listContent: { paddingBottom: ui.space.lg },
  card: { marginBottom: ui.space.sm },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  name: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, flex: 1 },
  statusPill: {
    borderRadius: 999,
    backgroundColor: '#E8F0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { color: ui.colors.primary, fontSize: 11, fontWeight: '700' },
  meta: { marginTop: 4, color: ui.colors.muted },
  muted: { color: ui.colors.muted, marginTop: 8 },
  error: { color: ui.colors.danger, marginBottom: 10 },
});

