import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminAddOnDetail,
  approveAdminAddOnRequest,
  createAdminAddOnRequest,
  deleteAdminAddOn,
  getAdminAddOnDetail,
  listAddOnRegistrantCandidates,
  removeAdminAddOnRequest,
  updateAdminAddOn,
} from '../../../../src/components/admin/addons/adminAddOnsService';
import { AdminRegistrantListItem } from '../../../../src/components/admin/registrants/adminRegistrantsService';
import { SessionRichTextEditor } from '../../../../src/components/admin/agenda/SessionRichTextEditor';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AdminAddOnDetailScreen() {
  const { addOnId } = useLocalSearchParams<{ addOnId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminAddOnDetail | null>(null);
  const [registrants, setRegistrants] = useState<AdminRegistrantListItem[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [altLink, setAltLink] = useState('');
  const [type, setType] = useState('');
  const [limit, setLimit] = useState('');
  const [price, setPrice] = useState('');
  const [preferenceSchema, setPreferenceSchema] = useState('');
  const [registrantSearch, setRegistrantSearch] = useState('');
  const [requestPreferences, setRequestPreferences] = useState('');

  const load = useCallback(async () => {
    if (!addOnId) return;
    try {
      setLoading(true);
      setError(null);
      const [addOnDetail, registrantRows] = await Promise.all([
        getAdminAddOnDetail(addOnId),
        listAddOnRegistrantCandidates(),
      ]);
      setDetail(addOnDetail);
      setRegistrants(registrantRows);
      setTitle(addOnDetail.title || '');
      setDescription(addOnDetail.description || '');
      setSubheadline(addOnDetail.subheadline || '');
      setLocation(addOnDetail.location || '');
      setDate(addOnDetail.date || '');
      setTime(addOnDetail.time || '');
      setAltLink(addOnDetail.altLink || '');
      setType(addOnDetail.type || '');
      setLimit(addOnDetail.limit === null ? '' : String(addOnDetail.limit));
      setPrice(addOnDetail.price === null ? '' : String(addOnDetail.price));
      setPreferenceSchema(addOnDetail.preferenceSchema || '');
    } catch (e: any) {
      setError(e?.message || 'Unable to load add-on detail.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [addOnId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const registrantResults = useMemo(() => {
    const q = registrantSearch.trim().toLowerCase();
    if (!q) return [] as AdminRegistrantListItem[];
    return registrants
      .filter((r) => {
        const name = `${r.firstName || ''} ${r.lastName || ''}`.trim().toLowerCase();
        const email = String(r.email || '').toLowerCase();
        const company = String(r.companyName || '').toLowerCase();
        return name.includes(q) || email.includes(q) || company.includes(q);
      })
      .slice(0, 50);
  }, [registrantSearch, registrants]);

  const saveAddOn = async () => {
    if (!detail) return;
    try {
      setSavingId('save');
      await updateAdminAddOn({
        id: detail.id,
        title,
        description,
        subheadline,
        location,
        date,
        time,
        altLink,
        type,
        limit,
        price,
        preferenceSchema,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to update add-on.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteAddOn = async () => {
    if (!detail) return;
    Alert.alert('Delete add-on', `Delete "${detail.title}" and its requests?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSavingId('delete-addon');
            await deleteAdminAddOn(detail.id);
            router.replace('/(main)/admin/add-ons');
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message || 'Unable to delete add-on.');
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  };

  const addRegistrantRequest = async (registrantId: string) => {
    if (!detail) return;
    try {
      setSavingId(`add-${registrantId}`);
      await createAdminAddOnRequest({
        addOnId: detail.id,
        registrantId,
        preferences: requestPreferences || null,
      });
      setRegistrantSearch('');
      setRequestPreferences('');
      await load();
    } catch (e: any) {
      Alert.alert('Request failed', e?.message || 'Unable to create request.');
    } finally {
      setSavingId(null);
    }
  };

  const approveRequest = async (requestId: string, existingPrefs?: string | null) => {
    try {
      setSavingId(`approve-${requestId}`);
      await approveAdminAddOnRequest(requestId, existingPrefs || null);
      await load();
    } catch (e: any) {
      Alert.alert('Approve failed', e?.message || 'Unable to approve request.');
    } finally {
      setSavingId(null);
    }
  };

  const removeRequest = async (requestId: string) => {
    try {
      setSavingId(`remove-${requestId}`);
      await removeAdminAddOnRequest(requestId);
      await load();
    } catch (e: any) {
      Alert.alert('Remove failed', e?.message || 'Unable to remove request.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Add-on Detail</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.meta}>Loading add-on...</Text> : null}
        </AppCard>

        {!loading && detail ? (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>Details</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder='Title (required)' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <SessionRichTextEditor value={description} onChange={setDescription} placeholder='Description HTML (required)' />
              <TextInput value={subheadline} onChangeText={setSubheadline} placeholder='Subheadline' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={location} onChangeText={setLocation} placeholder='Location (required)' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={date} onChangeText={setDate} placeholder='Date (required)' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={time} onChangeText={setTime} placeholder='Time (required)' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={altLink} onChangeText={setAltLink} placeholder='Alt link' placeholderTextColor={ui.colors.muted} style={styles.input} autoCapitalize='none' />
              <TextInput value={type} onChangeText={setType} placeholder='Type' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={limit} onChangeText={setLimit} placeholder='Limit (number)' placeholderTextColor={ui.colors.muted} style={styles.input} keyboardType='number-pad' />
              <TextInput value={price} onChangeText={setPrice} placeholder='Price (number)' placeholderTextColor={ui.colors.muted} style={styles.input} keyboardType='number-pad' />
              <TextInput value={preferenceSchema} onChangeText={setPreferenceSchema} placeholder='Preference schema JSON' placeholderTextColor={ui.colors.muted} style={[styles.input, styles.multiline]} multiline />
              <View style={styles.actionsRow}>
                <AppButton
                  title={savingId === 'save' ? 'Saving...' : 'Save Add-on'}
                  onPress={saveAddOn}
                  disabled={savingId === 'save'}
                  style={styles.adminButton}
                />
                <AppButton
                  title={savingId === 'delete-addon' ? 'Deleting...' : 'Delete Add-on'}
                  onPress={deleteAddOn}
                  disabled={savingId === 'delete-addon'}
                  variant='outline'
                  style={styles.adminButton}
                />
              </View>
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>Add Registrant Request</Text>
              <TextInput
                value={registrantSearch}
                onChangeText={setRegistrantSearch}
                placeholder='Search registrants by name, email, or company'
                placeholderTextColor={ui.colors.muted}
                style={styles.input}
                autoCapitalize='none'
              />
              <TextInput
                value={requestPreferences}
                onChangeText={setRequestPreferences}
                placeholder='Request preferences JSON (optional)'
                placeholderTextColor={ui.colors.muted}
                style={[styles.input, styles.multiline]}
                multiline
              />
              {registrantSearch.trim().length > 0 ? (
                <View style={styles.searchResults}>
                  {registrantResults.map((registrant) => {
                    const name = `${registrant.firstName || ''} ${registrant.lastName || ''}`.trim() || 'Unnamed';
                    return (
                      <View key={registrant.id} style={styles.requestRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.requestName}>{name}</Text>
                          <Text style={styles.requestMeta}>
                            {[registrant.email || 'No email', registrant.companyName || 'No company'].join(' • ')}
                          </Text>
                        </View>
                        <AppButton
                          title={savingId === `add-${registrant.id}` ? 'Adding...' : 'Add Pending'}
                          disabled={savingId === `add-${registrant.id}`}
                          onPress={() => addRegistrantRequest(registrant.id)}
                          style={styles.adminButton}
                        />
                      </View>
                    );
                  })}
                  {!registrantResults.length ? (
                    <Text style={styles.meta}>No registrants matched your search.</Text>
                  ) : null}
                </View>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>Pending Requests ({detail.pendingRequests.length})</Text>
              {!detail.pendingRequests.length ? (
                <Text style={styles.meta}>No pending requests.</Text>
              ) : (
                detail.pendingRequests.map((request) => (
                  <View key={request.id} style={styles.requestRowBlock}>
                    <Text style={styles.requestName}>{request.registrantName}</Text>
                    <Text style={styles.requestMeta}>{request.registrantEmail}</Text>
                    <Text style={styles.requestMeta}>Preferences: {request.preferencesDisplay}</Text>
                    <View style={styles.actionsRow}>
                      <AppButton
                        title={savingId === `approve-${request.id}` ? 'Approving...' : 'Approve'}
                        onPress={() => approveRequest(request.id, request.preferencesRaw)}
                        disabled={savingId === `approve-${request.id}`}
                        style={styles.adminButton}
                      />
                      <AppButton
                        title={savingId === `remove-${request.id}` ? 'Removing...' : 'Remove'}
                        onPress={() => removeRequest(request.id)}
                        disabled={savingId === `remove-${request.id}`}
                        variant='outline'
                        style={styles.adminButton}
                      />
                    </View>
                  </View>
                ))
              )}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>Approved Requests ({detail.approvedRequests.length})</Text>
              {!detail.approvedRequests.length ? (
                <Text style={styles.meta}>No approved requests.</Text>
              ) : (
                detail.approvedRequests.map((request) => (
                  <View key={request.id} style={styles.requestRowBlock}>
                    <Text style={styles.requestName}>{request.registrantName}</Text>
                    <Text style={styles.requestMeta}>{request.registrantEmail}</Text>
                    <Text style={styles.requestMeta}>Preferences: {request.preferencesDisplay}</Text>
                    <View style={styles.actionsRow}>
                      <AppButton
                        title={savingId === `remove-${request.id}` ? 'Removing...' : 'Remove'}
                        onPress={() => removeRequest(request.id)}
                        disabled={savingId === `remove-${request.id}`}
                        variant='outline'
                        style={styles.adminButton}
                      />
                    </View>
                  </View>
                ))
              )}
            </AppCard>
          </>
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
  meta: { color: ui.colors.muted, marginTop: 6, lineHeight: 19 },
  error: { color: ui.colors.danger, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: ui.colors.text,
    marginTop: 8,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  actionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminButton: { borderRadius: 10 },
  searchResults: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 8,
    gap: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    padding: 8,
  },
  requestRowBlock: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 10,
  },
  requestName: { color: ui.colors.text, fontWeight: '700' },
  requestMeta: { color: ui.colors.muted, marginTop: 3, fontSize: 12 },
});
