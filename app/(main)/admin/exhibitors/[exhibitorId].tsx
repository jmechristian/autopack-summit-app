import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminExhibitorRow,
  deleteAdminExhibitor,
  getAdminExhibitorDetail,
  updateAdminExhibitorBoothNumber,
} from '../../../../src/components/admin/exhibitors/adminExhibitorsService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AdminExhibitorDetailScreen() {
  const { exhibitorId } = useLocalSearchParams<{ exhibitorId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<AdminExhibitorRow | null>(null);
  const [boothDraft, setBoothDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!exhibitorId) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await getAdminExhibitorDetail(exhibitorId);
      setRow(detail);
      setBoothDraft(detail.boothNumber || '');
    } catch (e: any) {
      setError(e?.message || 'Unable to load exhibitor detail.');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [exhibitorId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const approvedCount = useMemo(() => row?.approvedRegistrants.length || 0, [row?.approvedRegistrants.length]);

  const saveBooth = async () => {
    if (!row) return;
    try {
      setSaving(true);
      await updateAdminExhibitorBoothNumber(row.id, boothDraft);
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to update booth number.');
    } finally {
      setSaving(false);
    }
  };

  const removeExhibitor = async () => {
    if (!row) return;
    Alert.alert('Delete exhibitor', `Remove exhibitor profile for ${row.company.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteAdminExhibitor(row.id);
            setRow(null);
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message || 'Unable to delete exhibitor profile.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Exhibitor Detail</Text>
          <Text style={styles.meta}>Approved registrants shown: {approvedCount}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.meta}>Loading exhibitor detail...</Text> : null}
        </AppCard>

        {!loading && !row ? (
          <AppCard style={styles.card}>
            <Text style={styles.meta}>Exhibitor detail is unavailable.</Text>
          </AppCard>
        ) : null}

        {!loading && row ? (
          <AppCard style={styles.card}>
            <Text style={styles.companyName}>{row.company.name}</Text>
            <Text style={styles.meta}>Company ID: {row.company.id}</Text>
            <Text style={styles.meta}>Email: {row.company.email || '—'}</Text>
            <Text style={styles.meta}>Phone: {row.company.phone || '—'}</Text>
            <Text style={styles.meta}>Website: {row.company.website || '—'}</Text>
            <Text style={styles.meta}>Type: {row.company.type || '—'}</Text>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Booth Number</Text>
              <View style={styles.boothRow}>
                <TextInput
                  value={boothDraft}
                  onChangeText={setBoothDraft}
                  placeholder='Enter booth number'
                  placeholderTextColor={ui.colors.muted}
                  style={[styles.input, styles.boothInput]}
                />
                <AppButton
                  title={saving ? 'Saving...' : 'Save'}
                  onPress={saveBooth}
                  disabled={saving}
                  style={styles.adminButton}
                />
                <AppButton
                  title={deleting ? 'Deleting...' : 'Delete'}
                  variant='outline'
                  onPress={removeExhibitor}
                  disabled={deleting}
                  style={styles.adminButton}
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Approved Registrants</Text>
              {!row.approvedRegistrants.length ? (
                <Text style={styles.meta}>No approved registrants for this company.</Text>
              ) : (
                row.approvedRegistrants.map((registrant) => {
                  const fullName =
                    `${registrant.firstName || ''} ${registrant.lastName || ''}`.trim() || 'Unnamed';
                  return (
                    <View key={registrant.id} style={styles.registrantRow}>
                      <Text style={styles.registrantName}>{fullName}</Text>
                      <Text style={styles.registrantMeta}>
                        {registrant.email || 'No email'} • {registrant.attendeeType || 'No type'}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </AppCard>
        ) : null}
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
  companyName: { color: ui.colors.primary, fontWeight: '900', fontSize: 18 },
  meta: { color: ui.colors.muted, marginTop: 6, lineHeight: 19 },
  error: { color: ui.colors.danger, marginTop: 10 },
  sectionBlock: { marginTop: 20 },
  boothRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  boothInput: { flex: 1 },
  adminButton: { borderRadius: 10 },
  registrantRow: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
  },
  registrantName: { color: ui.colors.text, fontWeight: '700' },
  registrantMeta: { color: ui.colors.muted, marginTop: 4, fontSize: 12 },
});
