import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ADMIN_EXHIBITOR_EVENT_ID,
  createAdminExhibitor,
  listAdminExhibitorCompanies,
  listAdminExhibitorSummaries,
} from '../../../../src/components/admin/exhibitors/adminExhibitorsService';
import { AdminCompanyOption } from '../../../../src/components/admin/registrants/adminRegistrantsService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AdminExhibitorCreateScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<AdminCompanyOption[]>([]);
  const [existingCompanyIds, setExistingCompanyIds] = useState<Set<string>>(new Set());
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [createBoothNumber, setCreateBoothNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [companyRows, exhibitorRows] = await Promise.all([
        listAdminExhibitorCompanies(),
        listAdminExhibitorSummaries(),
      ]);
      setCompanies(companyRows);
      setExistingCompanyIds(new Set(exhibitorRows.map((row) => row.companyId)));
    } catch (e: any) {
      setError(e?.message || 'Unable to load exhibitor creation data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selectedCompanyName = useMemo(() => {
    if (!selectedCompanyId) return 'No company selected';
    return companies.find((company) => company.id === selectedCompanyId)?.name || 'No company selected';
  }, [companies, selectedCompanyId]);

  const filteredCompanyOptions = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return [] as AdminCompanyOption[];
    return companies
      .filter((company) => !existingCompanyIds.has(company.id))
      .filter((company) => {
        const name = String(company.name || '').toLowerCase();
        const email = String(company.email || '').toLowerCase();
        const type = String(company.type || '').toLowerCase();
        return name.includes(q) || email.includes(q) || type.includes(q);
      })
      .slice(0, 40);
  }, [companies, companySearch, existingCompanyIds]);

  const createExhibitor = async () => {
    if (!selectedCompanyId) {
      Alert.alert('Company required', 'Select a company first.');
      return;
    }
    if (existingCompanyIds.has(selectedCompanyId)) {
      Alert.alert('Already exists', 'This company already has an exhibitor profile.');
      return;
    }
    try {
      setSaving(true);
      const exhibitorId = await createAdminExhibitor({
        companyId: selectedCompanyId,
        boothNumber: createBoothNumber,
        eventId: ADMIN_EXHIBITOR_EVENT_ID,
      });
      router.replace({
        pathname: '/(main)/admin/exhibitors/[exhibitorId]',
        params: { exhibitorId },
      });
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Unable to create exhibitor profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Create Exhibitor</Text>
          <Text style={styles.meta}>Event ID: {ADMIN_EXHIBITOR_EVENT_ID}</Text>
          <Text style={styles.meta}>
            Selected company: <Text style={styles.selectedCompany}>{selectedCompanyName}</Text>
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.meta}>Loading...</Text> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.subsectionTitle}>Company Search</Text>
          <TextInput
            value={companySearch}
            onChangeText={setCompanySearch}
            placeholder='Search company by name/email/type'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />

          {companySearch.trim().length > 0 ? (
            <View style={styles.searchResults}>
              {filteredCompanyOptions.map((company) => (
                <View key={company.id} style={styles.companyResultRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.companyResultName}>{company.name}</Text>
                    <Text style={styles.companyResultMeta}>
                      {[company.type, company.email].filter(Boolean).join(' • ') || '—'}
                    </Text>
                  </View>
                  <AppButton
                    title='Select'
                    onPress={() => {
                      setSelectedCompanyId(company.id);
                      setCompanySearch('');
                    }}
                    style={styles.adminButton}
                  />
                </View>
              ))}
              {!filteredCompanyOptions.length ? (
                <Text style={styles.meta}>No available company matches found.</Text>
              ) : null}
            </View>
          ) : null}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.subsectionTitle}>Booth Number</Text>
          <TextInput
            value={createBoothNumber}
            onChangeText={setCreateBoothNumber}
            placeholder='Booth number'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
          />
          <View style={{ marginTop: 12 }}>
            <AppButton
              title={saving ? 'Creating...' : 'Create Exhibitor'}
              onPress={createExhibitor}
              disabled={saving}
              style={styles.adminButton}
            />
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
  subsectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 15, marginBottom: 10 },
  meta: { color: ui.colors.muted, marginTop: 6, lineHeight: 19 },
  error: { color: ui.colors.danger, marginTop: 10 },
  selectedCompany: { color: ui.colors.text, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  searchResults: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 8,
    gap: 8,
  },
  companyResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    padding: 8,
  },
  companyResultName: { color: ui.colors.text, fontWeight: '700' },
  companyResultMeta: { color: ui.colors.muted, marginTop: 2, fontSize: 12 },
  adminButton: { borderRadius: 10 },
});
