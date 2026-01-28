// app/(main)/profile/edit.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Avatar, Button, Overlay } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useCurrentAppUser, useCurrentUserProfile } from '../../../src/hooks/useApsStore';
import { EditablePersonalInfo } from '../../../src/components/profile/EditablePersonalInfo';
import { AffiliationsSection } from '../../../src/components/profile/AffiliationsSection';
import { EducationSection } from '../../../src/components/profile/EducationSection';
import { InterestsSection } from '../../../src/components/profile/InterestsSection';
import { uploadProfilePicture, uploadResume, getProfilePictureUrl as getProfilePictureUrlFromStorage } from '../../../src/utils/storageUtils';
import { updateProfile, createAffiliate, createEducation } from '../../../src/utils/profileMutations';
import { useApsStore } from '../../../src/store/apsStore';
import { autopackColors } from '../../../src/theme';
import {
  initiateLinkedInAuth,
  exchangeCodeForToken,
  fetchLinkedInProfile,
  mapLinkedInToProfile,
} from '../../../src/utils/linkedInAuth';

export default function ProfileEdit() {
  const insets = useSafeAreaInsets();
  const appUser = useCurrentAppUser();
  const profile = useCurrentUserProfile();
  const refreshProfile = useApsStore((state) => state.refreshProfile);
  
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [importingLinkedIn, setImportingLinkedIn] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

  const saveProfilePhoto = async (uri: string) => {
    setUploadingPicture(true);
    try {
      const imageUrl = await uploadProfilePicture(uri);
      await updateProfile({
        id: profile!.id,
        profilePicture: imageUrl,
      });
      await refreshProfile();
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to upload profile picture'
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
        'Please grant camera roll permissions to upload a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await saveProfilePhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await saveProfilePhoto(result.assets[0].uri);
    }
  };

  const handleProfilePictureUpload = () => {
    Alert.alert('Update Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => void takePhoto() },
      { text: 'Choose from Library', onPress: () => void pickFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleResumeUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const fileSize = result.assets[0].size || 0;
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (fileSize > maxSize) {
        Alert.alert('File Too Large', 'Document must be less than 10MB');
          return;
        }

        setUploadingResume(true);
        try {
          const resumeUrl = await uploadResume(result.assets[0].uri);
          await updateProfile({
            id: profile!.id,
            resume: resumeUrl,
          });
          await refreshProfile();
          Alert.alert('Success', 'Document uploaded successfully');
        } catch (error) {
          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to upload document');
        } finally {
          setUploadingResume(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open document picker');
    }
  };

  const handleResumeView = () => {
    if (profile?.resume) {
      Linking.openURL(profile.resume);
    }
  };

  const handleLinkedInImport = async () => {
    try {
      setImportingLinkedIn(true);

      // Step 1: Initiate OAuth flow
      const authResult = await initiateLinkedInAuth();
      if (!authResult) {
        Alert.alert('Cancelled', 'LinkedIn import was cancelled');
        return;
      }

      // Step 2: Exchange code for token (standard OAuth, no PKCE)
      const accessToken = await exchangeCodeForToken(authResult.code);

      // Step 3: Fetch LinkedIn profile data
      const linkedInData = await fetchLinkedInProfile(accessToken);

      // Step 4: Map to our profile format
      const profileData = mapLinkedInToProfile(linkedInData);
      
      console.log('\n📋 ========== MAPPED PROFILE DATA ==========');
      console.log(JSON.stringify(profileData, null, 2));
      console.log('📋 =========================================\n');

      // Step 5: Update profile
      const updateData: any = {
        id: profile!.id,
      };

      if (profileData.firstName) updateData.firstName = profileData.firstName;
      if (profileData.lastName) updateData.lastName = profileData.lastName;
      if (profileData.email) updateData.email = profileData.email;
      if (profileData.bio) updateData.bio = profileData.bio;

      await updateProfile(updateData);

      // Step 6: If profile picture URL exists, download and upload it
      if (profileData.profilePicture) {
        try {
          // For now, just save the LinkedIn profile picture URL directly
          // In production, you might want to download and re-upload to S3 for consistency
          await updateProfile({
            id: profile!.id,
            profilePicture: profileData.profilePicture,
          });
        } catch (imageError) {
          console.warn('Failed to import profile picture:', imageError);
          // Continue without profile picture
        }
      }

      // Step 7: Import positions as affiliations
      if (profileData.positions && profileData.positions.length > 0) {
        try {
          for (const position of profileData.positions) {
            await createAffiliate({
              profileId: profile!.id,
              affiliate: position.company,
              role: position.title,
              startDate: position.startDate || undefined,
              endDate: position.endDate || undefined,
            });
          }
          console.log(`✅ Imported ${profileData.positions.length} positions as affiliations`);
        } catch (affiliateError) {
          console.warn('Failed to import some affiliations:', affiliateError);
          // Continue - some may have been created
        }
      }

      // Step 8: Import education
      if (profileData.education && profileData.education.length > 0) {
        try {
          for (const edu of profileData.education) {
            await createEducation({
              profileId: profile!.id,
              school: edu.school,
              degree: edu.degree || undefined,
              fieldOfStudy: edu.fieldOfStudy || undefined,
            });
          }
          console.log(`✅ Imported ${profileData.education.length} education entries`);
        } catch (educationError) {
          console.warn('Failed to import some education entries:', educationError);
          // Continue - some may have been created
        }
      }

      // Step 9: Refresh profile
      await refreshProfile();

      Alert.alert('Success', 'Profile imported from LinkedIn successfully');
    } catch (error) {
      console.error('LinkedIn import error:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to import from LinkedIn'
      );
    } finally {
      setImportingLinkedIn(false);
    }
  };

  // Generate fresh signed URL from S3 key
  React.useEffect(() => {
    const loadProfilePicture = async () => {
      if (!profile?.profilePicture) {
        setProfilePictureUrl(null);
        return;
      }

      const storedValue = profile.profilePicture;
      
      // If it's already a full URL (legacy data), use it directly
      if (storedValue.startsWith('http://') || storedValue.startsWith('https://')) {
        setProfilePictureUrl(storedValue);
        return;
      }

      // Otherwise, it's an S3 key - generate a fresh signed URL
      try {
        const url = await getProfilePictureUrlFromStorage(storedValue);
        setProfilePictureUrl(url);
      } catch (error) {
        console.error('Error loading profile picture URL:', error);
        setProfilePictureUrl(null);
      }
    };

    loadProfilePicture();
  }, [profile?.profilePicture]);

  const getResumeUrl = () => {
    if (!profile?.resume) return null;
    if (profile.resume.startsWith('http')) {
      return profile.resume;
    }
    return profile.resume;
  };

  if (!appUser || !profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={autopackColors.apBlue} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const resumeUrl = getResumeUrl();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Profile Picture Section */}
      <View style={styles.profilePictureSection}>
        <Avatar
          rounded
          size="xlarge"
          source={profilePictureUrl ? { uri: profilePictureUrl } : undefined}
          title={
            !profilePictureUrl
              ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase() || 'U'
              : undefined
          }
          containerStyle={[
            styles.avatar,
            !profilePictureUrl && { backgroundColor: autopackColors.apBlue },
          ]}
        />
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.actionBtnAlt,
              uploadingPicture && styles.actionBtnDisabled,
            ]}
            onPress={handleProfilePictureUpload}
            disabled={uploadingPicture}
          >
            {uploadingPicture ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, importingLinkedIn && styles.actionBtnDisabled]}
            onPress={handleLinkedInImport}
            disabled={importingLinkedIn}
          >
            {importingLinkedIn ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-linkedin" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Import</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Personal Info Section */}
      <EditablePersonalInfo profile={profile} onUpdate={refreshProfile} />

      {/* Experience Section */}
      <AffiliationsSection profile={profile} onUpdate={refreshProfile} />

      {/* Education Section */}
      <EducationSection profile={profile} onUpdate={refreshProfile} />

      {/* Interests Section */}
      <InterestsSection profile={profile} onUpdate={refreshProfile} />

      {/* Document Section */}
      <View style={styles.resumeSection}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Career Document</Text>
        </View>
        <View style={styles.headerDivider} />
        {resumeUrl ? (
          <View style={styles.resumeActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAlt]} onPress={handleResumeView}>
              <Ionicons name="document-text" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>View Document</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, uploadingResume && styles.actionBtnDisabled]}
              onPress={handleResumeUpload}
              disabled={uploadingResume}
            >
              {uploadingResume ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Upload New</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, uploadingResume && styles.actionBtnDisabled]}
            onPress={handleResumeUpload}
            disabled={uploadingResume}
          >
            {uploadingResume ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Upload Document (PDF, max 10MB)</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  profilePictureSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  avatar: {
    marginBottom: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: autopackColors.apBlue,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 12,
  },
  actionBtnAlt: {
    backgroundColor: '#111827',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  resumeSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
    marginBottom: 10,
  },
  resumeActions: {
    gap: 10,
  },
});

