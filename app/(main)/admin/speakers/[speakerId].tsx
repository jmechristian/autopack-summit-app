import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { uploadData } from 'aws-amplify/storage';
import {
  AdminSpeakerDetail,
  getAdminSpeakerDetail,
  removeAdminSpeaker,
  updateAdminSpeakerPresentation,
  updateAdminSpeakerProfile,
} from '../../../../src/components/admin/speakers/adminSpeakersService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';
import { resolveProfilePictureUri } from '../../../../src/utils/storageUtils';

export default function AdminSpeakerDetailScreen() {
  const { speakerId } = useLocalSearchParams<{ speakerId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState<AdminSpeakerDetail | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [headshotUri, setHeadshotUri] = useState<string | null>(null);

  const [presentationTitle, setPresentationTitle] = useState('');
  const [presentationSummary, setPresentationSummary] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [bio, setBio] = useState('');
  const [profilePictureKey, setProfilePictureKey] = useState('');

  const load = useCallback(async () => {
    if (!speakerId) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await getAdminSpeakerDetail(speakerId);
      setSpeaker(detail);
      setPresentationTitle(detail.presentationTitle || '');
      setPresentationSummary(detail.presentationSummary || '');
      setFirstName(detail.profile.firstName || '');
      setLastName(detail.profile.lastName || '');
      setEmail(detail.profile.email || '');
      setPhone(detail.profile.phone || '');
      setCompany(detail.profile.company || '');
      setJobTitle(detail.profile.jobTitle || '');
      setLocation(detail.profile.location || '');
      setWebsite(detail.profile.website || '');
      setLinkedin(detail.profile.linkedin || '');
      setBio(detail.profile.bio || '');
      setProfilePictureKey(detail.profile.profilePicture || '');
      const uri = await resolveProfilePictureUri(detail.profile.profilePicture || null);
      setHeadshotUri(uri);
    } catch (e: any) {
      setError(e?.message || 'Unable to load speaker detail.');
      setSpeaker(null);
    } finally {
      setLoading(false);
    }
  }, [speakerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const savePresentation = async () => {
    if (!speaker) return;
    try {
      setSaving('presentation');
      await updateAdminSpeakerPresentation({
        speakerId: speaker.id,
        presentationTitle,
        presentationSummary,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to save presentation fields.');
    } finally {
      setSaving(null);
    }
  };

  const saveProfile = async () => {
    if (!speaker) return;
    try {
      setSaving('profile');
      await updateAdminSpeakerProfile({
        profileId: speaker.profileId,
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        location,
        website,
        linkedin,
        bio,
        profilePicture: profilePictureKey,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to save profile fields.');
    } finally {
      setSaving(null);
    }
  };

  const removeSpeaker = async () => {
    if (!speaker) return;
    const name =
      `${speaker.profile.firstName || ''} ${speaker.profile.lastName || ''}`.trim() || 'this speaker';
    Alert.alert(
      'Remove speaker',
      `Remove ${name} from the speakers list? They will be detached from all sessions and favorites. Their registrant record will not be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemoving(true);
              await removeAdminSpeaker(speaker.id);
              router.replace('/(main)/admin/speakers');
            } catch (e: any) {
              Alert.alert('Remove failed', e?.message || 'Unable to remove speaker right now.');
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    );
  };

  const uploadHeadshot = async () => {
    if (!speaker) return;
    try {
      setSaving('headshot');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Photo library access is needed to upload a headshot.');
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
        aspect: [1, 1],
      });
      if (picked.canceled || !picked.assets?.length) return;
      const asset = picked.assets[0];
      if (!asset?.uri) return;

      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const extension = asset.fileName?.split('.').pop() || 'jpg';
      const key = `speaker-headshots/${speaker.profileId}-${Date.now()}.${extension}`;

      await uploadData({
        key,
        data: blob,
        options: {
          accessLevel: 'public',
          contentType: blob.type || asset.mimeType || 'image/jpeg',
        },
      }).result;

      await updateAdminSpeakerProfile({
        profileId: speaker.profileId,
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        location,
        website,
        linkedin,
        bio,
        profilePicture: key,
      });
      setProfilePictureKey(key);
      const freshUri = await resolveProfilePictureUri(key);
      setHeadshotUri(freshUri);
      await load();
      Alert.alert('Headshot updated', 'Speaker headshot was uploaded and replaced.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Unable to upload headshot right now.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Speaker Detail</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.meta}>Loading speaker detail...</Text> : null}
        </AppCard>

        {!loading && !speaker ? (
          <AppCard style={styles.card}>
            <Text style={styles.meta}>Speaker detail is unavailable.</Text>
          </AppCard>
        ) : null}

        {!loading && speaker ? (
          <AppCard style={styles.card}>
            <Text style={styles.rowTitle}>
              {`${speaker.profile.firstName || ''} ${speaker.profile.lastName || ''}`.trim() || 'Unnamed Speaker'}
            </Text>
            <Text style={styles.meta}>{speaker.profile.company || 'No company'}</Text>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Headshot</Text>
              <View style={styles.headshotWrap}>
                {headshotUri ? (
                  <Image source={{ uri: headshotUri }} style={styles.headshotImg} resizeMode='cover' />
                ) : (
                  <Text style={styles.headshotFallback}>
                    {(speaker.profile.firstName || 'S').slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ marginTop: 10 }}>
                <AppButton
                  title={saving === 'headshot' ? 'Uploading...' : 'Upload & Replace Headshot'}
                  onPress={uploadHeadshot}
                  disabled={saving === 'headshot'}
                  style={styles.adminButton}
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Presentation</Text>
              <TextInput
                value={presentationTitle}
                onChangeText={setPresentationTitle}
                placeholder='Presentation title'
                placeholderTextColor={ui.colors.muted}
                style={styles.input}
              />
              <TextInput
                value={presentationSummary}
                onChangeText={setPresentationSummary}
                placeholder='Presentation summary'
                placeholderTextColor={ui.colors.muted}
                style={[styles.input, styles.multilineInput]}
                multiline
              />
              <View style={{ marginTop: 10 }}>
                <AppButton
                  title={saving === 'presentation' ? 'Saving...' : 'Save Presentation'}
                  onPress={savePresentation}
                  disabled={saving === 'presentation'}
                  style={styles.adminButton}
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>Danger Zone</Text>
              <Text style={styles.meta}>
                Removes the speaker record and unlinks them from sessions and user favorites. The
                registrant and profile stay in the system.
              </Text>
              <View style={{ marginTop: 10 }}>
                <AppButton
                  title={removing ? 'Removing...' : 'Remove Speaker'}
                  variant='outline'
                  onPress={removeSpeaker}
                  disabled={!!saving || removing}
                  style={styles.adminButton}
                />
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.subsectionTitle}>App User Profile</Text>
              <TextInput value={firstName} onChangeText={setFirstName} placeholder='First name' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={lastName} onChangeText={setLastName} placeholder='Last name' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={email} onChangeText={setEmail} placeholder='Email' placeholderTextColor={ui.colors.muted} style={styles.input} autoCapitalize='none' />
              <TextInput value={phone} onChangeText={setPhone} placeholder='Phone' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={company} onChangeText={setCompany} placeholder='Company' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={jobTitle} onChangeText={setJobTitle} placeholder='Job title' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={location} onChangeText={setLocation} placeholder='Location' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={website} onChangeText={setWebsite} placeholder='Website' placeholderTextColor={ui.colors.muted} style={styles.input} autoCapitalize='none' />
              <TextInput value={linkedin} onChangeText={setLinkedin} placeholder='LinkedIn URL' placeholderTextColor={ui.colors.muted} style={styles.input} autoCapitalize='none' />
              <TextInput value={bio} onChangeText={setBio} placeholder='Bio' placeholderTextColor={ui.colors.muted} style={[styles.input, styles.multilineInput]} multiline />
              <View style={{ marginTop: 10 }}>
                <AppButton
                  title={saving === 'profile' ? 'Saving...' : 'Save Profile'}
                  onPress={saveProfile}
                  disabled={saving === 'profile'}
                  style={styles.adminButton}
                />
              </View>
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
  rowTitle: { color: ui.colors.primary, fontWeight: '900', fontSize: 18 },
  meta: { color: ui.colors.muted, marginTop: 6, lineHeight: 19 },
  error: { color: ui.colors.danger, marginTop: 10 },
  sectionBlock: { marginTop: 20 },
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
  multilineInput: { minHeight: 92, textAlignVertical: 'top' },
  headshotWrap: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headshotImg: { width: 132, height: 132 },
  headshotFallback: { color: ui.colors.muted, fontWeight: '900', fontSize: 44 },
  adminButton: { borderRadius: 10 },
});
