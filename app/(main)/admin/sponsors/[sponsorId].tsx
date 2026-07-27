import * as APITypes from '../../../../src/API';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { uploadData } from 'aws-amplify/storage';
import {
  AdminSponsorRow,
  getAdminSponsorDetail,
  updateAdminSponsorCompanyDetails,
  updateAdminSponsorType,
} from '../../../../src/components/admin/sponsors/adminSponsorsService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';
import { resolveProfilePictureUri } from '../../../../src/utils/storageUtils';

export default function AdminSponsorDetailScreen() {
  const { sponsorId } = useLocalSearchParams<{ sponsorId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<AdminSponsorRow | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingCompanyId, setUploadingCompanyId] = useState<string | null>(null);
  const [typeDraft, setTypeDraft] = useState<APITypes.SponsorType.BOOTH | APITypes.SponsorType.TABLE>(
    APITypes.SponsorType.BOOTH,
  );
  const [companyNameDraft, setCompanyNameDraft] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sponsorId) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await getAdminSponsorDetail(sponsorId);
      setRow(detail);
      setTypeDraft(
        detail.type === APITypes.SponsorType.BOOTH
          ? APITypes.SponsorType.BOOTH
          : APITypes.SponsorType.TABLE,
      );
      setCompanyNameDraft(detail.company.name || '');
      const resolved = await resolveProfilePictureUri(detail.company.logo || null);
      setLogoUri(resolved);
    } catch (e: any) {
      setError(e?.message || 'Unable to load sponsor detail.');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [sponsorId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const registrantCount = useMemo(() => row?.registrants.length || 0, [row?.registrants.length]);
  const contactCount = useMemo(() => row?.contacts.length || 0, [row?.contacts.length]);

  const saveSponsorType = async () => {
    if (!row) return;
    try {
      setSavingId('type');
      await updateAdminSponsorType(row.id, typeDraft);
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to update sponsor type.');
    } finally {
      setSavingId(null);
    }
  };

  const saveCompany = async () => {
    if (!row) return;
    if (!companyNameDraft.trim()) {
      Alert.alert('Company name required', 'Please provide a company name.');
      return;
    }
    try {
      setSavingId('company');
      await updateAdminSponsorCompanyDetails({
        companyId: row.companyId,
        name: companyNameDraft,
        logo: row.company.logo || undefined,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to update company.');
    } finally {
      setSavingId(null);
    }
  };

  const uploadAndReplaceLogo = async () => {
    if (!row) return;
    try {
      setUploadingCompanyId(row.companyId);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Photo library access is needed to upload a logo.');
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      if (!asset?.uri) return;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const extension = asset.fileName?.split('.').pop() || 'jpg';
      const key = `company-logos/${row.companyId}-${Date.now()}.${extension}`;

      await uploadData({
        key,
        data: blob,
        options: {
          accessLevel: 'public',
          contentType: blob.type || asset.mimeType || 'image/jpeg',
        },
      }).result;

      await updateAdminSponsorCompanyDetails({
        companyId: row.companyId,
        name: companyNameDraft.trim() || row.company.name,
        logo: key,
      });
      const freshUri = await resolveProfilePictureUri(key);
      setLogoUri(freshUri);
      await load();
      Alert.alert('Logo updated', 'Company logo was uploaded and replaced.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Unable to upload logo right now.');
    } finally {
      setUploadingCompanyId(null);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Sponsor Detail</Text>
          <Text style={styles.meta}>Contacts shown: {contactCount}</Text>
          <Text style={styles.meta}>Registrants shown: {registrantCount}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.meta}>Loading sponsor detail...</Text> : null}
        </AppCard>

        {!loading && !row ? (
          <AppCard style={styles.card}>
            <Text style={styles.meta}>Sponsor detail is unavailable.</Text>
          </AppCard>
        ) : null}

        {!loading && row ? (
          <AppCard style={styles.card}>
            <Text style={styles.companyName}>{row.company.name}</Text>
            <Text style={styles.meta}>Company ID: {row.company.id}</Text>
            <Text style={styles.meta}>Email: {row.company.email || '—'}</Text>
            <Text style={styles.meta}>Phone: {row.company.phone || '—'}</Text>
            <Text style={styles.meta}>Website: {row.company.website || '—'}</Text>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Company Details</Text>
              <TextInput
                value={companyNameDraft}
                onChangeText={setCompanyNameDraft}
                placeholder='Company name'
                placeholderTextColor={ui.colors.muted}
                style={styles.input}
              />
              <View style={{ marginTop: 10 }}>
                <AppButton
                  title={savingId === 'company' ? 'Saving...' : 'Save Company'}
                  onPress={saveCompany}
                  disabled={savingId === 'company'}
                  style={styles.adminButton}
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Company Logo</Text>
              <View style={styles.logoWrap}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoImage} resizeMode='contain' />
                ) : (
                  <Text style={styles.logoFallback}>{(row.company.name || 'S').slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ marginTop: 10 }}>
                <AppButton
                  title={uploadingCompanyId === row.companyId ? 'Uploading...' : 'Upload & Replace Logo'}
                  onPress={uploadAndReplaceLogo}
                  disabled={uploadingCompanyId === row.companyId}
                  style={styles.adminButton}
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Sponsor Type</Text>
              <View style={styles.typeRow}>
                <AppButton
                  title='Booth'
                  variant={typeDraft === APITypes.SponsorType.BOOTH ? 'primary' : 'outline'}
                  onPress={() => setTypeDraft(APITypes.SponsorType.BOOTH)}
                  style={styles.adminButton}
                />
                <AppButton
                  title='Table'
                  variant={typeDraft === APITypes.SponsorType.TABLE ? 'primary' : 'outline'}
                  onPress={() => setTypeDraft(APITypes.SponsorType.TABLE)}
                  style={styles.adminButton}
                />
                <AppButton
                  title={savingId === 'type' ? 'Saving...' : 'Save Type'}
                  onPress={saveSponsorType}
                  disabled={savingId === 'type'}
                  style={styles.adminButton}
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Sponsor Contact</Text>
              {!row.contacts.length ? (
                <Text style={styles.meta}>No company contact found.</Text>
              ) : (
                row.contacts.map((contact) => (
                  <View key={contact.id} style={styles.boxRow}>
                    <Text style={styles.boxTitle}>
                      {contact.name || 'Unnamed Contact'}
                      {contact.title ? ` (${contact.title})` : ''}
                    </Text>
                    <Text style={styles.boxMeta}>{contact.email}</Text>
                    <Text style={styles.boxMeta}>{contact.phone || 'No phone'}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Company Registrants</Text>
              {!row.registrants.length ? (
                <Text style={styles.meta}>No registrants found for this company.</Text>
              ) : (
                row.registrants.map((registrant) => {
                  const fullName =
                    `${registrant.firstName || ''} ${registrant.lastName || ''}`.trim() || 'Unnamed';
                  return (
                    <View key={registrant.id} style={styles.boxRow}>
                      <Text style={styles.boxTitle}>{fullName}</Text>
                      <Text style={styles.boxMeta}>
                        {registrant.email || 'No email'} • {registrant.attendeeType || 'No type'}
                      </Text>
                      <Text style={styles.boxMeta}>Status: {registrant.status || '—'}</Text>
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
  typeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  adminButton: { borderRadius: 10 },
  boxRow: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
  },
  boxTitle: { color: ui.colors.text, fontWeight: '700' },
  boxMeta: { color: ui.colors.muted, marginTop: 4, fontSize: 12 },
  logoWrap: {
    width: '100%',
    height: 180,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoFallback: { color: ui.colors.muted, fontSize: 44, fontWeight: '900' },
});
