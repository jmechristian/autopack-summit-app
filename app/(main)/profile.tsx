// app/(main)/profile.tsx
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
import { useCurrentAppUser, useCurrentUserProfile, useCurrentUserRegistrant } from '../../src/hooks/useApsStore';
import { EditablePersonalInfo } from '../../src/components/profile/EditablePersonalInfo';
import { AffiliationsSection } from '../../src/components/profile/AffiliationsSection';
import { EducationSection } from '../../src/components/profile/EducationSection';
import { InterestsSection } from '../../src/components/profile/InterestsSection';
import { uploadProfilePicture, uploadResume } from '../../src/utils/storageUtils';
import { updateProfile, createAffiliate, createEducation } from '../../src/utils/profileMutations';
import { useApsStore } from '../../src/store/apsStore';
import { autopackColors } from '../../src/theme';
import * as APITypes from '../../src/API';
import {
  initiateLinkedInAuth,
  exchangeCodeForToken,
  fetchLinkedInProfile,
  mapLinkedInToProfile,
} from '../../src/utils/linkedInAuth';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const appUser = useCurrentAppUser();
  const profile = useCurrentUserProfile();
  const registrant = useCurrentUserRegistrant();
  const refreshProfile = useApsStore((state) => state.refreshProfile);
  
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [importingLinkedIn, setImportingLinkedIn] = useState(false);

  const handleProfilePictureUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingPicture(true);
        try {
          const imageUrl = await uploadProfilePicture(result.assets[0].uri);
          await updateProfile({
            id: profile!.id,
            profilePicture: imageUrl,
          });
          await refreshProfile();
          Alert.alert('Success', 'Profile picture updated successfully');
        } catch (error) {
          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to upload profile picture');
        } finally {
          setUploadingPicture(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open image picker');
    }
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
          Alert.alert('File Too Large', 'Resume must be less than 10MB');
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
          Alert.alert('Success', 'Resume uploaded successfully');
        } catch (error) {
          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to upload resume');
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

  const getProfilePictureUrl = () => {
    if (!profile?.profilePicture) return null;
    // If it's already a full URL, return it
    if (profile.profilePicture.startsWith('http')) {
      return profile.profilePicture;
    }
    // Otherwise, construct S3 URL (adjust based on your S3 bucket configuration)
    return profile.profilePicture;
  };

  const getQrCodeUrl = () => {
    if (!registrant?.qrCode) return null;
    if (registrant.qrCode.startsWith('http')) {
      return registrant.qrCode;
    }
    return registrant.qrCode;
  };

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

  const profilePictureUrl = getProfilePictureUrl();
  const qrCodeUrl = getQrCodeUrl();
  const resumeUrl = getResumeUrl();

  return (
    <ScrollView
      // Profile is shown under a navigation header, so adding safe-area top padding
      // makes the screen look double-spaced.
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
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleProfilePictureUpload}
          disabled={uploadingPicture}
        >
          {uploadingPicture ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>
                {profilePictureUrl ? 'Change Photo' : 'Upload Photo'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* QR Code Button */}
      {qrCodeUrl && (
        <View style={styles.qrCodeSection}>
          <Button
            title="Show QR Code"
            icon={<Ionicons name="qr-code" size={20} color="#fff" />}
            onPress={() => setQrCodeVisible(true)}
            buttonStyle={styles.qrCodeButton}
          />
        </View>
      )}

      {/* LinkedIn Import Button */}
      <View style={styles.linkedInSection}>
        <Button
          title="Import from LinkedIn"
          icon={<Ionicons name="logo-linkedin" size={20} color="#fff" />}
          onPress={handleLinkedInImport}
          buttonStyle={styles.linkedInButton}
          loading={importingLinkedIn}
          disabled={importingLinkedIn}
        />
      </View>

      {/* Personal Info Section */}
      <EditablePersonalInfo profile={profile} onUpdate={refreshProfile} />

      {/* Affiliations Section */}
      <AffiliationsSection profile={profile} onUpdate={refreshProfile} />

      {/* Education Section */}
      <EducationSection profile={profile} onUpdate={refreshProfile} />

      {/* Interests Section */}
      <InterestsSection profile={profile} onUpdate={refreshProfile} />

      {/* Resume Section */}
      <View style={styles.resumeSection}>
        <Text style={styles.sectionTitle}>Resume</Text>
        {resumeUrl ? (
          <View style={styles.resumeActions}>
            <Button
              title="View Resume"
              icon={<Ionicons name="document-text" size={20} color="#fff" />}
              onPress={handleResumeView}
              buttonStyle={styles.resumeButton}
            />
            <Button
              title="Upload New"
              type="outline"
              icon={<Ionicons name="cloud-upload" size={20} color={autopackColors.apBlue} />}
              onPress={handleResumeUpload}
              buttonStyle={styles.resumeButtonOutline}
              titleStyle={styles.resumeButtonOutlineText}
              loading={uploadingResume}
            />
          </View>
        ) : (
          <Button
            title="Upload Resume (PDF, max 10MB)"
            icon={<Ionicons name="cloud-upload" size={20} color="#fff" />}
            onPress={handleResumeUpload}
            buttonStyle={styles.resumeButton}
            loading={uploadingResume}
          />
        )}
      </View>

      {/* QR Code Modal */}
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
              contentFit="contain"
            />
          )}
          <Button
            title="Close"
            onPress={() => setQrCodeVisible(false)}
            buttonStyle={styles.closeButton}
          />
        </View>
      </Overlay>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    marginBottom: 16,
  },
  avatar: {
    marginBottom: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  qrCodeSection: {
    marginBottom: 16,
  },
  qrCodeButton: {
    backgroundColor: autopackColors.apBlue,
    borderRadius: 999,
  },
  linkedInSection: {
    marginBottom: 16,
  },
  linkedInButton: {
    backgroundColor: '#0077B5', // LinkedIn brand color
    borderRadius: 999,
  },
  resumeSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  resumeActions: {
    gap: 12,
  },
  resumeButton: {
    backgroundColor: autopackColors.apBlue,
    borderRadius: 999,
  },
  resumeButtonOutline: {
    borderColor: autopackColors.apBlue,
    borderWidth: 1,
    borderRadius: 999,
  },
  resumeButtonOutlineText: {
    color: autopackColors.apBlue,
  },
  qrCodeOverlay: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 14,
    padding: 0,
  },
  qrCodeContainer: {
    padding: 24,
    alignItems: 'center',
  },
  qrCodeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: '#111827',
  },
  qrCodeImage: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: autopackColors.apBlue,
    borderRadius: 999,
    paddingHorizontal: 32,
  },
});
