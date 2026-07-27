import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { RegistrantStatus, RegistrantType } from '../../../../src/API';
import {
  getAdminRegistrantDetail,
  reissueAdminRegistrantTempPassword,
  upsertRegistrantTableNumber,
  updateAdminAddOnRequestStatus,
  updateRegistrantAttendeeType,
  updateRegistrantApprovalStatus,
  updateRegistrantCompanyAndProfile,
  updateRegistrantEmailAndProfile,
} from '../../../../src/components/admin/registrants/adminRegistrantsService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AdminRegistrantDetailScreen() {
  const { registrantId } = useLocalSearchParams<{ registrantId?: string }>();
  const id = Array.isArray(registrantId) ? registrantId[0] : registrantId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [companyDraftId, setCompanyDraftId] = useState<string | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [tableNumberDraft, setTableNumberDraft] = useState('');
  const [attendeeTypeDraft, setAttendeeTypeDraft] = useState<RegistrantType>(RegistrantType.OEM);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [latestReissuedTempPassword, setLatestReissuedTempPassword] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const loaded = await getAdminRegistrantDetail(id);
      setDetail(loaded);
      setEmailDraft(loaded.registrant?.email || '');
      setCompanyDraftId(loaded.registrant?.companyId || null);
      setTableNumberDraft(
        loaded.seatingRegistrant?.tableNumber === 0 || loaded.seatingRegistrant?.tableNumber
          ? String(loaded.seatingRegistrant.tableNumber)
          : '',
      );
      setAttendeeTypeDraft(
        (loaded.profile?.attendeeType || loaded.registrant?.attendeeType || RegistrantType.OEM) as RegistrantType,
      );
    } catch (e: any) {
      setError(e?.message || 'Unable to load registrant detail.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selectedCompanyName = useMemo(() => {
    if (!detail?.companies?.length) return 'No company selected';
    return detail.companies.find((c: any) => c.id === companyDraftId)?.name || 'No company selected';
  }, [companyDraftId, detail?.companies]);

  const filteredCompanies = useMemo(() => {
    const rows = detail?.companies || [];
    const q = companySearch.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((company: any) => {
        const name = String(company?.name || '').toLowerCase();
        const email = String(company?.email || '').toLowerCase();
        const type = String(company?.type || '').toLowerCase();
        return name.includes(q) || email.includes(q) || type.includes(q);
      })
      .slice(0, 80);
  }, [companySearch, detail?.companies]);

  const saveEmail = async () => {
    if (!id) return;
    try {
      setSavingKey('email');
      await updateRegistrantEmailAndProfile(id, emailDraft, detail?.profile?.id || null);
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to update email.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveCompany = async () => {
    if (!id) return;
    try {
      setSavingKey('company');
      await updateRegistrantCompanyAndProfile({
        registrantId: id,
        companyId: companyDraftId,
        profileId: detail?.profile?.id || null,
        companyName: detail?.companies?.find((c: any) => c.id === companyDraftId)?.name || null,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to update company.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveAttendeeType = async () => {
    if (!id) return;
    try {
      setSavingKey('attendeeType');
      await updateRegistrantAttendeeType({
        registrantId: id,
        attendeeType: attendeeTypeDraft,
        profileId: detail?.profile?.id || null,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to update attendee type.');
    } finally {
      setSavingKey(null);
    }
  };

  const updateApproval = async (status: RegistrantStatus) => {
    if (!id) return;
    try {
      setSavingKey('approval');
      await updateRegistrantApprovalStatus(id, status);
      await load();
    } catch (e: any) {
      Alert.alert('Operation failed', e?.message || 'Unable to change approval status.');
    } finally {
      setSavingKey(null);
    }
  };

  const updateAddOn = async (requestId: string, status: string) => {
    try {
      setSavingKey(`addon-${requestId}`);
      await updateAdminAddOnRequestStatus(requestId, status);
      await load();
    } catch (e: any) {
      Alert.alert('Operation failed', e?.message || 'Unable to update add-on request.');
    } finally {
      setSavingKey(null);
    }
  };

  const reissueTempPassword = async () => {
    if (!id) return;
    try {
      setSavingKey('reissue');
      const resp = await reissueAdminRegistrantTempPassword({
        registrantId: id,
        email: emailDraft || undefined,
      });
      setLatestReissuedTempPassword(resp.tempPassword);
      Alert.alert('Temporary password reissued', 'A new temporary password was generated.');
      await load();
    } catch (e: any) {
      Alert.alert('Operation failed', e?.message || 'Unable to reissue temporary password.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveTableNumber = async () => {
    if (!id) return;
    const trimmed = tableNumberDraft.trim();
    const parsed = trimmed ? Number(trimmed) : null;
    if (trimmed && (!Number.isFinite(parsed) || parsed < 0)) {
      Alert.alert('Invalid table number', 'Please enter a valid non-negative number.');
      return;
    }
    try {
      setSavingKey('table');
      await upsertRegistrantTableNumber({
        registrantId: id,
        seatingRegistrantId: detail?.seatingRegistrant?.id || null,
        tableNumber: parsed == null ? null : Math.floor(parsed),
        category: detail?.seatingRegistrant?.category || 'Registrant',
        role: detail?.seatingRegistrant?.role || registrant?.attendeeType || null,
        notes: detail?.seatingRegistrant?.notes || null,
        firstName: registrant?.firstName || null,
        lastName: registrant?.lastName || null,
        company: registrant?.company?.name || null,
        email: registrant?.email || null,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to update table number.');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <AppScreen style={styles.screen}>
        <Text style={styles.muted}>Loading registrant detail...</Text>
      </AppScreen>
    );
  }

  if (!id || !detail?.registrant) {
    return (
      <AppScreen style={styles.screen}>
        <Text style={styles.error}>{error || 'Registrant not found.'}</Text>
      </AppScreen>
    );
  }

  const registrant = detail.registrant;
  const addOnRequests = detail.addOnRequests || [];
  const pendingAddOns = addOnRequests.filter((item: any) => String(item.status || '').toUpperCase() === 'PENDING');
  const approvedAddOns = addOnRequests.filter((item: any) => String(item.status || '').toUpperCase() === 'APPROVED');

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.header}>
          <Text style={styles.name}>
            {`${registrant.firstName || ''} ${registrant.lastName || ''}`.trim() || 'Unnamed'}
          </Text>
          <Text style={styles.meta}>{registrant.email || 'No email'}</Text>
          <Text style={styles.meta}>Registrant ID: {registrant.id}</Text>
        </View>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Registrant Email</Text>
          <TextInput value={emailDraft} onChangeText={setEmailDraft} style={styles.input} autoCapitalize='none' />
          <View style={styles.actionsRow}>
            <AppButton
              title={savingKey === 'email' ? 'Saving...' : 'Save Email'}
              onPress={saveEmail}
              disabled={savingKey === 'email'}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Company Assignment</Text>
          <Text style={styles.meta}>
            Selected: <Text style={styles.selectedCompanyName}>{selectedCompanyName}</Text>
          </Text>
          <View style={styles.selectedCompanySpacer} />
          <TextInput
            value={companySearch}
            onChangeText={setCompanySearch}
            placeholder='Search companies by name/email/type'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
          />
          {companySearch.trim().length > 0 ? (
            <View style={styles.companySearchResults}>
              <Pressable
                style={[styles.companyResultRow, !companyDraftId && styles.companyResultRowActive]}
                onPress={() => {
                  setCompanyDraftId(null);
                  setCompanySearch('');
                }}
              >
                <Text style={[styles.companyResultTitle, !companyDraftId && styles.companyResultTitleActive]}>
                  No company
                </Text>
              </Pressable>
              {filteredCompanies.map((company: any) => (
                <Pressable
                  key={company.id}
                  style={[styles.companyResultRow, companyDraftId === company.id && styles.companyResultRowActive]}
                  onPress={() => {
                    setCompanyDraftId(company.id);
                    setCompanySearch('');
                  }}
                >
                  <Text style={[styles.companyResultTitle, companyDraftId === company.id && styles.companyResultTitleActive]}>
                    {company.name}
                  </Text>
                  <Text
                    style={[
                      styles.companyResultMeta,
                      companyDraftId === company.id && styles.companyResultMetaActive,
                    ]}
                  >
                    {[company.type, company.email].filter(Boolean).join(' • ') || '—'}
                  </Text>
                </Pressable>
              ))}
              {!filteredCompanies.length ? (
                <Text style={[styles.meta, { paddingHorizontal: 10, paddingVertical: 6 }]}>No matches found.</Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.actionsRow}>
            <AppButton
              title={savingKey === 'company' ? 'Saving...' : 'Save Company'}
              onPress={saveCompany}
              disabled={savingKey === 'company'}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Registration & Payment</Text>
          <Text style={styles.meta}>Status: {registrant.status || 'UNKNOWN'}</Text>
          <Text style={styles.meta}>Terms Accepted: {registrant.termsAccepted ? 'Yes' : 'No'}</Text>
          <Text style={styles.meta}>Interests: {registrant.interests || '—'}</Text>
          <Text style={styles.meta}>Other Interest: {registrant.otherInterest || '—'}</Text>
          <Text style={styles.meta}>Buyer Question: {registrant.buyerQuestion || '—'}</Text>
          <Text style={styles.meta}>Packaging Challenge: {registrant.packagingChallenge || '—'}</Text>
          <Text style={styles.meta}>Certification: {registrant.certification || '—'}</Text>
          <Text style={styles.meta}>Total Amount: {registrant.totalAmount ?? 0}</Text>
          <Text style={styles.meta}>Discount Code: {registrant.discountCode || '—'}</Text>
          <Text style={styles.meta}>Payment Confirmation: {registrant.paymentConfirmation || '—'}</Text>
          <View style={styles.invoiceRow}>
            <Text style={styles.meta}>Invoice: </Text>
            {registrant.invoice ? (
              <Pressable
                onPress={async () => {
                  const raw = String(registrant.invoice || '').trim();
                  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                  const canOpen = await Linking.canOpenURL(url);
                  if (!canOpen) {
                    Alert.alert('Invalid link', 'Unable to open invoice URL.');
                    return;
                  }
                  await Linking.openURL(url);
                }}
              >
                <Text style={styles.invoiceLink}>Link Here</Text>
              </Pressable>
            ) : (
              <Text style={styles.meta}>—</Text>
            )}
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Table / Seating Assignment</Text>
          <Text style={styles.meta}>
            Seating record: {detail.seatingRegistrant?.id ? 'Linked' : 'Not linked yet'}
          </Text>
          <Text style={styles.meta}>
            Current table: {detail.seatingRegistrant?.tableNumber === 0 || detail.seatingRegistrant?.tableNumber
              ? String(detail.seatingRegistrant.tableNumber)
              : '—'}
          </Text>
          <TextInput
            value={tableNumberDraft}
            onChangeText={setTableNumberDraft}
            keyboardType='number-pad'
            placeholder='Enter table number'
            placeholderTextColor={ui.colors.muted}
            style={[styles.input, { marginTop: 10 }]}
          />
          <View style={styles.actionsRow}>
            <AppButton
              title={savingKey === 'table' ? 'Saving...' : 'Save Table Number'}
              onPress={saveTableNumber}
              disabled={savingKey === 'table'}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Attendee Type</Text>
          <View style={styles.chips}>
            {Object.values(RegistrantType).map((type) => (
              <Pressable
                key={type}
                style={[styles.chip, attendeeTypeDraft === type && styles.chipActive]}
                onPress={() => setAttendeeTypeDraft(type)}
              >
                <Text style={[styles.chipText, attendeeTypeDraft === type && styles.chipTextActive]}>
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.actionsRow}>
            <AppButton
              title={savingKey === 'attendeeType' ? 'Saving...' : 'Save Attendee Type'}
              onPress={saveAttendeeType}
              disabled={savingKey === 'attendeeType'}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Registration Approval Workflow</Text>
          <Text style={styles.meta}>Current: {registrant.status || 'UNKNOWN'}</Text>
          <View style={styles.actionsRow}>
            <AppButton
              title='Approve'
              onPress={() => updateApproval(RegistrantStatus.APPROVED)}
              disabled={savingKey === 'approval'}
              style={styles.adminButton}
            />
            <AppButton
              title='Unapprove'
              variant='outline'
              onPress={() => updateApproval(RegistrantStatus.PENDING)}
              disabled={savingKey === 'approval'}
              style={styles.adminButton}
            />
          </View>
          <View style={styles.tempPasswordSection}>
            <Text style={[styles.sectionTitle, styles.tempPasswordHeader]}>Temporary Password</Text>
            <AppButton
              title={savingKey === 'reissue' ? 'Reissuing...' : 'Reissue Temp Password'}
              variant='muted'
              disabled={savingKey === 'reissue'}
              style={styles.adminButton}
              onPress={reissueTempPassword}
            />
          </View>
          {latestReissuedTempPassword ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.meta}>New temporary password: {latestReissuedTempPassword}</Text>
              <View style={{ marginTop: 8 }}>
                <AppButton
                  title='Copy temporary password'
                  variant='outline'
                  style={styles.adminButton}
                  onPress={async () => {
                    await Clipboard.setStringAsync(latestReissuedTempPassword);
                    Alert.alert('Copied', 'Temporary password copied to clipboard.');
                  }}
                />
              </View>
            </View>
          ) : null}
          {detail.latestTempCredential ? (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.meta}>Latest temporary password: {detail.latestTempCredential.tempPassword}</Text>
              <Text style={[styles.meta, { marginTop: 4 }]}>
                Created at: {detail.latestTempCredential.createdAt}
              </Text>
              <View style={{ marginTop: 8 }}>
                <AppButton
                  title='Copy latest temporary password'
                  variant='outline'
                  style={styles.adminButton}
                  onPress={async () => {
                    await Clipboard.setStringAsync(detail.latestTempCredential.tempPassword);
                    Alert.alert('Copied', 'Latest temporary password copied to clipboard.');
                  }}
                />
              </View>
            </View>
          ) : (
            <Text style={[styles.meta, { marginTop: 8 }]}>No temp credential on record.</Text>
          )}
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Add-On Requests</Text>
          <Text style={styles.subsectionTitle}>Pending</Text>
          {!pendingAddOns.length ? <Text style={styles.meta}>No pending requests.</Text> : null}
          {pendingAddOns.map((item: any) => (
            <View key={item.id} style={styles.addOnRow}>
              <Text style={styles.addOnTitle}>{detail.addOnsById[item.addOnId]?.title || item.addOnId}</Text>
              <View style={styles.actionsRow}>
                <AppButton
                  title='Approve'
                  onPress={() => updateAddOn(item.id, 'APPROVED')}
                  disabled={savingKey === `addon-${item.id}`}
                  style={styles.adminButton}
                />
                <AppButton
                  title='Remove'
                  variant='outline'
                  onPress={() => updateAddOn(item.id, 'REMOVED')}
                  disabled={savingKey === `addon-${item.id}`}
                  style={styles.adminButton}
                />
              </View>
            </View>
          ))}

          <Text style={[styles.subsectionTitle, { marginTop: 10 }]}>Approved</Text>
          {!approvedAddOns.length ? <Text style={styles.meta}>No approved requests.</Text> : null}
          {approvedAddOns.map((item: any) => (
            <View key={item.id} style={styles.addOnRow}>
              <Text style={styles.addOnTitle}>{detail.addOnsById[item.addOnId]?.title || item.addOnId}</Text>
              <Text style={styles.meta}>Approved</Text>
            </View>
          ))}
        </AppCard>

      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl },
  header: { marginBottom: ui.space.sm },
  name: { color: ui.colors.primary, fontWeight: '900', fontSize: 22 },
  meta: { color: ui.colors.muted, marginTop: 4 },
  error: { color: ui.colors.danger },
  muted: { color: ui.colors.muted },
  card: { marginBottom: ui.space.sm },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  adminButton: { borderRadius: 10 },
  subsectionTitle: { color: ui.colors.text, fontWeight: '700', marginBottom: 6 },
  tempPasswordSection: { marginTop: 18 },
  tempPasswordHeader: { marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: ui.colors.primary, borderColor: ui.colors.primary },
  chipText: { color: ui.colors.text, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  selectedCompanyName: {
    fontWeight: '800',
    color: ui.colors.text,
  },
  selectedCompanySpacer: {
    height: 8,
  },
  companySearchResults: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    maxHeight: 280,
    overflow: 'hidden',
  },
  companyResultRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: ui.colors.border,
  },
  companyResultRowActive: {
    backgroundColor: '#E8F0FF',
  },
  companyResultTitle: {
    color: ui.colors.text,
    fontWeight: '700',
  },
  companyResultTitleActive: {
    color: ui.colors.primary,
  },
  companyResultMeta: {
    marginTop: 2,
    fontSize: 12,
    color: ui.colors.muted,
  },
  companyResultMetaActive: {
    color: ui.colors.primary,
  },
  addOnRow: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  addOnTitle: { color: ui.colors.text, fontWeight: '700' },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  invoiceLink: {
    color: ui.colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

