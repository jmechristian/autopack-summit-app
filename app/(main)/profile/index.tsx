// app/(main)/profile/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rneui/themed';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCurrentAppUser,
  useCurrentUserProfile,
  useCurrentUserRegistrant,
} from '../../../src/hooks/useApsStore';
import { useApsStore } from '../../../src/store/apsStore';
import { autopackColors } from '../../../src/theme';
import { AffiliationsSection } from '../../../src/components/profile/AffiliationsSection';
import { EducationSection } from '../../../src/components/profile/EducationSection';
import { InterestsSection } from '../../../src/components/profile/InterestsSection';
import { ui } from '../../../src/ui/tokens';
import { signOut } from '../../../src/utils/authUtils';
import { updateProfile } from '../../../src/utils/profileMutations';
import {
  resolveProfilePictureUri,
  uploadProfilePicture,
  uploadResume,
} from '../../../src/utils/storageUtils';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const appUser = useCurrentAppUser();
  const profile = useCurrentUserProfile();
  const registrant = useCurrentUserRegistrant();
  const refreshProfile = useApsStore((state) => state.refreshProfile);
  const reset = useApsStore((state) => state.reset);

  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [bioFeedback, setBioFeedback] = useState<string | null>(null);
  const [resumeFeedback, setResumeFeedback] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Resolve profile picture from either URL or S3 key.
  React.useEffect(() => {
    let cancelled = false;
    const loadProfilePicture = async () => {
      if (!profile?.profilePicture) {
        setProfilePictureUrl(null);
        return;
      }

      const uri = await resolveProfilePictureUri(profile.profilePicture);
      if (!cancelled) {
        setProfilePictureUrl(uri);
      }
    };

    loadProfilePicture();
    return () => {
      cancelled = true;
    };
  }, [profile?.profilePicture]);

  React.useEffect(() => {
    setBioText(profile?.bio || '');
  }, [profile?.bio]);

  const formatRegistrantType = (attendeeType?: string | null) => {
    if (!attendeeType) return '';
    const normalized = attendeeType.trim();
    const upper = normalized.toUpperCase();

    if (upper === 'SOLUTIONPROVIDER') return 'Solution Provider';
    if (upper === 'TIER1') return 'Tier 1';

    return normalized
      .replace(/_/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const saveProfilePhoto = async (uri: string) => {
    setUploadingPicture(true);
    try {
      const imageKey = await uploadProfilePicture(uri);
      await updateProfile({
        id: profile!.id,
        profilePicture: imageKey,
      });
      await refreshProfile();
      Alert.alert('Success', 'Profile photo updated.');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to upload photo.'
      );
    } finally {
      setUploadingPicture(false);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow photo library access to upload a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      await saveProfilePhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow camera access to take a profile photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      await saveProfilePhoto(result.assets[0].uri);
    }
  };

  const handleProfilePictureUpload = () => {
    Alert.alert('Update Photo', 'Choose photo source', [
      { text: 'Take Photo', onPress: () => void takePhoto() },
      { text: 'Choose from Library', onPress: () => void pickFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSaveBio = async () => {
    setIsSavingBio(true);
    setBioFeedback(null);
    try {
      await updateProfile({
        id: profile!.id,
        bio: bioText.trim() || undefined,
      });
      await refreshProfile();
      setIsEditingBio(false);
      setBioFeedback('Saved');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save bio.'
      );
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleResumeUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;

      const fileSize = result.assets[0].size || 0;
      const maxSize = 10 * 1024 * 1024;
      if (fileSize > maxSize) {
        Alert.alert('File Too Large', 'Document must be less than 10MB.');
        return;
      }

      setUploadingResume(true);
      setResumeFeedback(null);

      const resumeUrl = await uploadResume(result.assets[0].uri);
      await updateProfile({
        id: profile!.id,
        resume: resumeUrl,
      });
      await refreshProfile();
      setResumeFeedback('Saved');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to upload resume.'
      );
    } finally {
      setUploadingResume(false);
    }
  };

  const handleResumeView = () => {
    if (profile?.resume) {
      Linking.openURL(profile.resume);
    }
  };

  const getQrCodeUrl = () => {
    if (!registrant?.qrCode) return null;
    if (registrant.qrCode.startsWith('http')) {
      return registrant.qrCode;
    }
    return registrant.qrCode;
  };

  if (!appUser || !profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size='large' color={autopackColors.apBlue} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const qrCodeUrl = getQrCodeUrl();
  const fullName =
    [profile.firstName?.trim(), profile.lastName?.trim()]
      .filter(Boolean)
      .join(' ')
      .trim() || 'User';
  const initials =
    `${(profile.firstName || '').trim().slice(0, 1)}${(profile.lastName || '')
      .trim()
      .slice(0, 1)}`.toUpperCase() || 'U';
  const jobTitle = profile.jobTitle || '';
  const company = profile.company || '';
  const roleCompanyLine = [jobTitle, company].filter(Boolean).join(', ');
  const registrantType = formatRegistrantType(registrant?.attendeeType || null);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <ImageBackground
        source={require('../../../assets/images/mobile-bg.png')}
        style={[styles.headerBg, { paddingTop: insets.top + 12 }]}
        imageStyle={styles.headerBgImage}
      >
        <View style={styles.headerOverlay} />
      </ImageBackground>

      <View style={styles.contentSection}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {profilePictureUrl ? (
              <ImageBackground
                source={{ uri: profilePictureUrl }}
                style={styles.avatarImage}
                imageStyle={styles.avatarImage}
              />
            ) : (
              <View style={[styles.avatarImage, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.avatarEditButton}
              onPress={handleProfilePictureUpload}
              disabled={uploadingPicture}
            >
              {uploadingPicture ? (
                <ActivityIndicator size='small' color='#374151' />
              ) : (
                <Ionicons name='add' size={16} color='#374151' />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.nameText}>{fullName}</Text>
          {!!roleCompanyLine && (
            <Text style={styles.roleCompanyText}>{roleCompanyLine}</Text>
          )}
          {!!registrantType && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{registrantType}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={[styles.actionTile, !qrCodeUrl && styles.actionTileDisabled]}
            onPress={() => setQrCodeVisible(true)}
            disabled={!qrCodeUrl}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name='qr-code' size={20} color='#fff' />
            </View>
            <Text style={styles.actionTileText}>Show QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionTile, styles.actionTileAlt]}
            onPress={() => router.push('/(main)/scan')}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name='scan-outline' size={20} color='#fff' />
            </View>
            <Text style={styles.actionTileText}>Scan Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionTile}
            onPress={() => router.push('/(main)/profile/contacts')}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name='person-add' size={20} color='#fff' />
            </View>
            <Text style={styles.actionTileText}>Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionTile, styles.actionTileAlt]}
            onPress={() => router.push('/(main)/profile/notes')}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name='document-text' size={20} color='#fff' />
            </View>
            <Text style={styles.actionTileText}>Notes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name='reader-outline' size={14} color='#1d4ed8' />
              </View>
              <Text style={styles.sectionHeaderText}>Bio</Text>
            </View>
            {!isEditingBio ? (
              <TouchableOpacity
                onPress={() => {
                  setIsEditingBio(true);
                  setBioFeedback(null);
                }}
              >
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.inlineActions}>
                <TouchableOpacity
                  onPress={() => {
                    setBioText(profile.bio || '');
                    setIsEditingBio(false);
                  }}
                >
                  <Text style={styles.cancelLink}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveBio} disabled={isSavingBio}>
                  <Text style={styles.editLink}>
                    {isSavingBio ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {isEditingBio ? (
            <TextInput
              style={styles.bioInput}
              value={bioText}
              onChangeText={setBioText}
              multiline
              numberOfLines={5}
              textAlignVertical='top'
              placeholder='Tell people about yourself'
              placeholderTextColor='#9ca3af'
            />
          ) : profile.bio?.trim() ? (
            <TextInput
              style={[styles.bioInput, styles.lockedBioInput]}
              value={profile.bio.trim()}
              editable={false}
              multiline
              textAlignVertical='top'
            />
          ) : (
            <Text style={styles.sectionBodyText}>
              {profile.bio?.trim() || 'No bio, edit to add'}
            </Text>
          )}
          {!!bioFeedback && <Text style={styles.savedText}>{bioFeedback}</Text>}
          <View style={styles.sectionDivider} />
        </View>

        <AffiliationsSection profile={profile} onUpdate={refreshProfile} />
        <EducationSection profile={profile} onUpdate={refreshProfile} />
        <InterestsSection profile={profile} onUpdate={refreshProfile} />

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name='document-text-outline' size={14} color='#1d4ed8' />
              </View>
              <Text style={styles.sectionHeaderText}>Resume</Text>
            </View>
            <TouchableOpacity onPress={handleResumeUpload} disabled={uploadingResume}>
              <Text style={styles.editLink}>
                {uploadingResume ? 'Saving...' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
          {!!profile.resume ? (
            <TouchableOpacity
              style={styles.resumeAction}
              onPress={handleResumeView}
            >
              <Ionicons name='open-outline' size={16} color={autopackColors.apBlue} />
              <Text style={styles.resumeActionText}>View uploaded resume</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.sectionBodyText}>No resume, edit to upload</Text>
          )}
          {!!resumeFeedback && (
            <Text style={styles.savedText}>{resumeFeedback}</Text>
          )}
          <View style={styles.sectionDivider} />
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            setIsSigningOut(true);
            reset();
            router.dismissAll();
            router.replace('/(auth)/login');
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
            } finally {
              setIsSigningOut(false);
            }
          }}
          disabled={isSigningOut}
        >
          <Ionicons name='log-out-outline' size={16} color='#4b5563' />
          <Text style={styles.logoutText}>
            {isSigningOut ? 'Signing out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>

      <Overlay
        isVisible={qrCodeVisible}
        onBackdropPress={() => setQrCodeVisible(false)}
        overlayStyle={styles.qrCodeOverlay}
      >
        <View style={styles.qrCodeContainer}>
          <Text style={styles.qrCodeTitle}>Your QR Code</Text>
          {qrCodeUrl && (
            <Image
              source={{ uri: qrCodeUrl }}
              style={styles.qrCodeImage}
              contentFit='contain'
            />
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setQrCodeVisible(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Overlay>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F1F8',
  },
  scrollContent: {
    paddingBottom: 56,
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  headerBg: {
    height: 174,
    justifyContent: 'flex-end',
  },
  headerBgImage: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerOverlay: {
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  contentSection: {
    marginTop: -28,
    paddingHorizontal: ui.space.lg,
    paddingTop: 10,
    gap: 24,
  },
  avatarImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
    overflow: 'hidden',
    backgroundColor: '#dbeafe',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1f2937',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrap: {
    marginTop: -58,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  avatarEditButton: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  roleCompanyText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 2,
  },
  typeBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 3,
  },
  typeBadgeText: {
    color: '#b45309',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionTile: {
    width: '48%',
    minHeight: 84,
    borderRadius: 12,
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionTileAlt: {
    backgroundColor: '#4b5563',
  },
  actionTileDisabled: {
    opacity: 0.5,
  },
  actionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTileText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    padding: 0,
  },
  sectionHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
    textTransform: 'capitalize',
  },
  editLink: {
    color: autopackColors.apBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  cancelLink: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionBodyText: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 4,
    paddingVertical: 18,
    textAlign: 'center',
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 110,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  lockedBioInput: {
    color: '#4b5563',
    backgroundColor: '#f9fafb',
  },
  savedText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  resumeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 18,
    justifyContent: 'center',
  },
  resumeActionText: {
    color: autopackColors.apBlue,
    fontWeight: '500',
    fontSize: 15,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
    marginTop: 14,
  },
  logoutButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 10,
    opacity: 0.85,
  },
  logoutText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  qrCodeOverlay: {
    width: '90%',
    maxWidth: 400,
    borderRadius: ui.radius.card,
    padding: 0,
  },
  qrCodeContainer: {
    padding: ui.space.xl,
    alignItems: 'center',
  },
  qrCodeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: ui.colors.text,
    marginBottom: 20,
  },
  qrCodeImage: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: autopackColors.apBlue,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
