import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminSponsorSummary,
  listAdminSponsorSummaries,
} from '../../../../src/components/admin/sponsors/adminSponsorsService';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';
import { resolveProfilePictureUri } from '../../../../src/utils/storageUtils';

export default function AdminSponsorsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminSponsorSummary[]>([]);
  const [search, setSearch] = useState('');
  const [logoUriByCompanyId, setLogoUriByCompanyId] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAdminSponsorSummaries();
      setRows(data);
    } catch (e: any) {
      setError(e?.message || 'Unable to load sponsors.');
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
    const unresolvedRows = rows.filter(
      (row) => !!row.companyLogo && logoUriByCompanyId[row.companyId] === undefined,
    );
    if (!unresolvedRows.length) return;

    async function resolveLogos() {
      const updates: Record<string, string | null> = {};
      await Promise.all(
        unresolvedRows.map(async (row) => {
          updates[row.companyId] = await resolveProfilePictureUri(row.companyLogo);
        }),
      );
      if (!cancelled && Object.keys(updates).length) {
        setLogoUriByCompanyId((prev) => ({ ...prev, ...updates }));
      }
    }

    resolveLogos();
    return () => {
      cancelled = true;
    };
  }, [rows, logoUriByCompanyId]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const companyName = String(row.companyName || '').toLowerCase();
      const companyEmail = String(row.companyEmail || '').toLowerCase();
      const registrantMatches = row.registrantSearchText.some((value) =>
        String(value || '').toLowerCase().includes(q),
      );
      return companyName.includes(q) || companyEmail.includes(q) || registrantMatches;
    });
  }, [rows, search]);

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Sponsors</Text>
          <Text style={styles.meta}>Companies: {rows.length}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='search-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>Search</Text>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search by company email/name or registrant name/email'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
        </AppCard>

        {loading ? <Text style={styles.meta}>Loading sponsors...</Text> : null}

        {!loading && !filteredRows.length ? (
          <AppCard style={styles.card}>
            <Text style={styles.meta}>No sponsors matched your search.</Text>
          </AppCard>
        ) : null}

        {!loading &&
          filteredRows.map((row) => {
            const logoUri = logoUriByCompanyId[row.companyId] || null;
            return (
              <Pressable
                key={row.id}
                onPress={() => router.push({ pathname: '/(main)/admin/sponsors/[sponsorId]', params: { sponsorId: row.id } })}
              >
                <AppCard style={styles.listRowCard}>
                  <View style={styles.logoWrap}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.logoImage} resizeMode='contain' />
                    ) : (
                      <Text style={styles.logoFallback}>
                        {(row.companyName || 'S').slice(0, 1).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.listTextWrap}>
                    <Text style={styles.companyName}>{row.companyName}</Text>
                    <Text style={styles.meta}>{row.companyEmail || 'No company email'}</Text>
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
  listRowCard: {
    marginBottom: ui.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  listTextWrap: { flex: 1 },
  logoWrap: {
    width: 54,
    height: 54,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: 54, height: 54 },
  logoFallback: { color: ui.colors.muted, fontSize: 20, fontWeight: '900' },
});
