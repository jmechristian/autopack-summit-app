// app/(main)/profile/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rneui/themed';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
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
import { AppButton } from '../../../src/ui/AppButton';
import { IconCard } from '../../../src/ui/IconCard';
import { ui } from '../../../src/ui/tokens';
import { signOut } from '../../../src/utils/authUtils';
import { getProfilePictureUrl as getProfilePictureUrlFromStorage } from '../../../src/utils/storageUtils';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const appUser = useCurrentAppUser();
  const profile = useCurrentUserProfile();
  const registrant = useCurrentUserRegistrant();
  const reset = useApsStore((state) => state.reset);

  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Generate fresh signed URL from S3 key
  React.useEffect(() => {
    const loadProfilePicture = async () => {
      if (!profile?.profilePicture) {
        setProfilePictureUrl(null);
        return;
      }

      const storedValue = profile.profilePicture;

      // If it's already a full URL (legacy data), use it directly
      if (
        storedValue.startsWith('http://') ||
        storedValue.startsWith('https://')
      ) {
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Blue Header - Full Width */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 18, paddingBottom: insets.top * 0.65 },
        ]}
      >
        <View style={styles.headerContent}>
          {/* Profile Picture */}
          <View style={styles.avatarContainer}>
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
          </View>

          {/* Name in Yellow */}
          <Text style={styles.nameText}>{fullName}</Text>

          {/* Job Title in White */}
          {jobTitle ? (
            <Text style={styles.jobTitleText}>{jobTitle}</Text>
          ) : null}

          {/* Company in White */}
          {company ? <Text style={styles.companyText}>{company}</Text> : null}
        </View>
      </View>

      {/* Light Grey Content Section with Rounded Top */}
      <View style={styles.contentSection}>
        {/* White Card with Buttons */}
        <View style={styles.buttonCard}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setQrCodeVisible(true)}
            disabled={!qrCodeUrl}
          >
            <Ionicons name='qr-code' size={18} color='#fff' />
            <Text style={styles.actionBtnText}>Show QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnAlt]}
            onPress={() => router.push('/(main)/scan')}
          >
            <Ionicons name='briefcase-outline' size={18} color='#fff' />
            <Text style={styles.actionBtnText}>Collect Lead</Text>
          </TouchableOpacity>
        </View>

        {/* Icon Cards Grid */}
        <View style={styles.iconGrid}>
          <View style={styles.iconRow}>
            <View style={styles.iconCardWrapper}>
              <IconCard
                icon='person-add'
                label='Contacts'
                iconBgColor='transparent'
                iconColor={ui.colors.primary}
                iconSize={50}
                style={styles.iconCard}
                onPress={() => router.push('/(main)/profile/contacts')}
              />
            </View>
            <View style={styles.iconCardWrapper}>
              <IconCard
                icon='document-text'
                label='Notes'
                iconBgColor='transparent'
                iconColor={ui.colors.primary}
                iconSize={50}
                style={styles.iconCard}
                onPress={() => {
                  // Placeholder - no action yet
                }}
              />
            </View>
          </View>
          <View style={styles.iconRow}>
            <View style={styles.iconCardWrapper}>
              <IconCard
                icon='pencil'
                label='Edit Profile'
                iconBgColor='transparent'
                iconColor={ui.colors.primary}
                iconSize={50}
                style={styles.iconCard}
                onPress={() => router.push('/(main)/profile/edit')}
              />
            </View>
            <View style={styles.iconCardWrapper}>
              <IconCard
                icon='settings'
                label='Settings'
                iconBgColor='transparent'
                iconColor={ui.colors.primary}
                iconSize={50}
                style={styles.iconCard}
                onPress={() => {
                  // Placeholder - no action yet
                }}
              />
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              setIsSigningOut(true);
              // Reset local store and navigate immediately to avoid being stuck
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
            <Ionicons name='log-out-outline' size={20} color='#DC2626' />
            <Text style={styles.logoutButtonText}>
              {isSigningOut ? 'Signing out...' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>
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
              contentFit='contain'
            />
          )}
          <AppButton
            title='Close'
            onPress={() => setQrCodeVisible(false)}
            variant='primary'
          />
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
    paddingBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    backgroundColor: ui.colors.primary,
    paddingBottom: 0,
    marginHorizontal: 0,
  },
  contentSection: {
    backgroundColor: '#E6F1F8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 20,
    minHeight: '100%',
  },
  headerContent: {
    alignItems: 'center',
    paddingBottom: 10,
    width: '100%',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatarPlaceholder: {
    backgroundColor: ui.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: ui.colors.text,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '700',
    color: ui.colors.secondary,
    marginBottom: 5,
    fontFamily: 'Oswald-Bold',
    textTransform: 'uppercase',
    textAlign: 'center',
    maxWidth: '60%',
    flexWrap: 'wrap',
  },
  jobTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  companyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  buttonCard: {
    backgroundColor: '#fff',
    borderRadius: ui.radius.card,
    marginHorizontal: ui.space.lg,
    marginTop: 0,
    padding: ui.space.lg,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: autopackColors.apBlue,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  actionBtnAlt: {
    backgroundColor: '#111827',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  iconGrid: {
    paddingHorizontal: ui.space.lg,
    paddingTop: ui.space.xl,
    gap: ui.space.md,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: ui.space.md,
  },
  iconCardWrapper: {
    flex: 1,
  },
  iconCard: {
    marginBottom: 0,
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
  logoutSection: {
    paddingHorizontal: ui.space.lg,
    paddingTop: ui.space.xl,
    paddingBottom: ui.space.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 16,
  },
});
