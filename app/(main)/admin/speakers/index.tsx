import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminSpeakerSummary,
  createSpeakerFromRegistrant,
  listAdminSpeakersSummaries,
} from '../../../../src/components/admin/speakers/adminSpeakersService';
import {
  AdminRegistrantListItem,
  listAdminRegistrants,
} from '../../../../src/components/admin/registrants/adminRegistrantsService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';
import { resolveProfilePictureUri } from '../../../../src/utils/storageUtils';

export default function AdminSpeakersListScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speakerRows, setSpeakerRows] = useState<AdminSpeakerSummary[]>([]);
  const [registrants, setRegistrants] = useState<AdminRegistrantListItem[]>([]);
  const [speakerSearch, setSpeakerSearch] = useState('');
  const [registrantSearch, setRegistrantSearch] = useState('');
  const [headshotUriBySpeakerId, setHeadshotUriBySpeakerId] = useState<Record<string, string | null>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [speakers, registrantsData] = await Promise.all([
        listAdminSpeakersSummaries(),
        listAdminRegistrants(),
      ]);
      setSpeakerRows(speakers);
      setRegistrants(registrantsData);
    } catch (e: any) {
      setError(e?.message || 'Unable to load speakers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  React.useEffect(() => {
    let cancelled = false;
    const unresolvedRows = speakerRows.filter(
      (row) => !!row.profilePicture && headshotUriBySpeakerId[row.id] === undefined,
    );
    if (!unresolvedRows.length) return;

    async function resolveHeadshots() {
      const updates: Record<string, string | null> = {};
      await Promise.all(
        unresolvedRows.map(async (row) => {
          updates[row.id] = await resolveProfilePictureUri(row.profilePicture);
        }),
      );
      if (!cancelled && Object.keys(updates).length) {
        setHeadshotUriBySpeakerId((prev) => ({ ...prev, ...updates }));
      }
    }
    resolveHeadshots();
    return () => {
      cancelled = true;
    };
  }, [speakerRows, headshotUriBySpeakerId]);

  const filteredSpeakers = useMemo(() => {
    const q = speakerSearch.trim().toLowerCase();
    if (!q) return speakerRows;
    return speakerRows.filter((row) => {
      const name = row.fullName.toLowerCase();
      const email = String(row.email || '').toLowerCase();
      const company = String(row.company || '').toLowerCase();
      return name.includes(q) || email.includes(q) || company.includes(q);
    });
  }, [speakerRows, speakerSearch]);

  const filteredRegistrantCandidates = useMemo(() => {
    const q = registrantSearch.trim().toLowerCase();
    if (!q) return [] as AdminRegistrantListItem[];
    return registrants
      .filter((row) => {
        const name = `${row.firstName || ''} ${row.lastName || ''}`.trim().toLowerCase();
        const email = String(row.email || '').toLowerCase();
        const company = String(row.companyName || '').toLowerCase();
        return name.includes(q) || email.includes(q) || company.includes(q);
      })
      .slice(0, 40);
  }, [registrants, registrantSearch]);

  const createFromRegistrant = async (registrant: AdminRegistrantListItem) => {
    try {
      setSavingId(registrant.id);
      const speakerId = await createSpeakerFromRegistrant(registrant.id);
      await load();
      Alert.alert('Speaker created', `${registrant.firstName || 'Registrant'} is now a speaker.`);
      router.push({
        pathname: '/(main)/admin/speakers/[speakerId]',
        params: { speakerId },
      });
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Unable to create speaker from this registrant.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='person-add-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>Create Speaker From Registrant</Text>
          </View>
          <TextInput
            value={registrantSearch}
            onChangeText={setRegistrantSearch}
            placeholder='Search registrants by name, company, or email'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
          {registrantSearch.trim().length > 0 ? (
            <View style={styles.searchResults}>
              {filteredRegistrantCandidates.map((registrant) => {
                const name = `${registrant.firstName || ''} ${registrant.lastName || ''}`.trim() || 'Unnamed';
                return (
                  <View key={registrant.id} style={styles.registrantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.registrantName}>{name}</Text>
                      <Text style={styles.registrantMeta}>
                        {[registrant.companyName || 'No company', registrant.email || 'No email'].join(' • ')}
                      </Text>
                    </View>
                    <AppButton
                      title={savingId === registrant.id ? 'Creating...' : 'Create Speaker'}
                      disabled={savingId === registrant.id}
                      onPress={() => createFromRegistrant(registrant)}
                      style={styles.adminButton}
                    />
                  </View>
                );
              })}
              {!filteredRegistrantCandidates.length ? (
                <Text style={styles.meta}>No registrant matches found.</Text>
              ) : null}
            </View>
          ) : null}
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='search-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>Search Speakers ({speakerRows.length})</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TextInput
            value={speakerSearch}
            onChangeText={setSpeakerSearch}
            placeholder='Search by speaker name, company, or email'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
        </AppCard>

        {loading ? <Text style={styles.meta}>Loading speakers...</Text> : null}

        {!loading && !filteredSpeakers.length ? (
          <AppCard style={styles.card}>
            <Text style={styles.meta}>No speakers matched your search.</Text>
          </AppCard>
        ) : null}

        {!loading &&
          filteredSpeakers.map((row) => {
            const uri = headshotUriBySpeakerId[row.id] || null;
            return (
              <Pressable
                key={row.id}
                onPress={() =>
                  router.push({
                    pathname: '/(main)/admin/speakers/[speakerId]',
                    params: { speakerId: row.id },
                  })
                }
              >
                <AppCard style={styles.rowCard}>
                  <View style={styles.headshotWrap}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.headshotImg} resizeMode='cover' />
                    ) : (
                      <Text style={styles.headshotFallback}>
                        {row.fullName.slice(0, 1).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{row.fullName}</Text>
                    <Text style={styles.meta}>
                      {[row.company || 'No company', row.email || 'No email'].join(' • ')}
                    </Text>
                  </View>
                  <Ionicons name='chevron-forward' size={18} color={ui.colors.muted} />
                </AppCard>
              </Pressable>
            );
          })}
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
    paddingVertical: 10,
  },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  rowTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  meta: { color: ui.colors.muted, marginTop: 4, lineHeight: 18 },
  error: { color: ui.colors.danger, marginTop: 10 },
  headshotWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headshotImg: { width: 52, height: 52 },
  headshotFallback: { color: ui.colors.muted, fontWeight: '900', fontSize: 18 },
  searchResults: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 8,
    gap: 8,
  },
  registrantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    padding: 8,
  },
  registrantName: { color: ui.colors.text, fontWeight: '700' },
  registrantMeta: { color: ui.colors.muted, marginTop: 2, fontSize: 12 },
  adminButton: { borderRadius: 10 },
});
