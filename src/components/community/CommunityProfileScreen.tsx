import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APS_ID } from '../../config/apsConfig';
import {
  profileAffiliatesByProfileId,
  profileEducationsByProfileId,
  profileInterestsByProfileId,
} from '../../graphql/queries';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { useCommunityStore } from '../../store/communityStore';
import { useEngageStore } from '../../store/engageStore';
import { autopackColors } from '../../theme';
import { graphqlApiKeyClient } from '../../utils/graphqlClient';
import { resolveProfilePictureUri } from '../../utils/storageUtils';
import { NotesSection } from '../notes/NotesSection';

// IMPORTANT:
// Generated `getApsAppUserProfile` can include fields that now depend on USER_POOLS-only models (notes),
// which can break API_KEY callers. This screen uses a custom query, but keep it minimal/safe as well.
const getApsAppUserProfileMinimal = /* GraphQL */ `
  query GetApsAppUserProfileMinimal($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      userId
      firstName
      lastName
      email
      phone
      company
      jobTitle
      profilePicture
      bio
      linkedin
      twitter
      facebook
      instagram
      youtube
      website
      location
      resume
      __typename
    }
  }
`;

type Profile = {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
  bio?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  website?: string[] | null;
  location?: string | null;
  resume?: string | null;
  affiliates?: { items?: Array<any> | null } | null;
  education?: { items?: Array<any> | null } | null;
  interests?: { items?: Array<any> | null } | null;
};

function nameOf(p: Profile | null) {
  if (!p) return '';
  return [p.firstName?.trim(), p.lastName?.trim()].filter(Boolean).join(' ');
}

export default function CommunityProfileScreen() {
  const insets = useSafeAreaInsets();
  const currentAppUser = useCurrentAppUser();
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const profileIdRaw = params.id;
  const profileId = useMemo(() => {
    const first = Array.isArray(profileIdRaw) ? profileIdRaw[0] : profileIdRaw;
    if (!first) return '';
    try {
      return decodeURIComponent(first).trim();
    } catch {
      return first.trim();
    }
  }, [profileIdRaw]);

  const getOrCreateContactRequest = useEngageStore((s) => s.getOrCreateContactRequest);
  const ensureDmThreadForAcceptedRequest = useEngageStore(
    (s) => s.ensureDmThreadForAcceptedRequest
  );
  const loadIncomingRequests = useEngageStore((s) => s.loadIncomingRequests);
  const loadSentRequests = useEngageStore((s) => s.loadSentRequests);
  const fetchPendingRequestState = useEngageStore((s) => s.fetchPendingRequestState);
  const fetchContactRequestStatus = useEngageStore((s) => s.fetchContactRequestStatus);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [pendingRequestStateRemote, setPendingRequestStateRemote] = useState<
    'incoming' | 'sent' | null
  >(null);
  const [contactRequestStatusRemote, setContactRequestStatusRemote] = useState<string | null>(null);
  const [addingPhoneContact, setAddingPhoneContact] = useState(false);
  const [requestActionBusy, setRequestActionBusy] = useState(false);

  const otherUserId = profile?.userId || null;
  const pendingRequestState = useEngageStore((s) =>
    otherUserId ? s.getPendingRequestState(otherUserId) : null
  );
  const effectivePendingRequestState = pendingRequestState || pendingRequestStateRemote;

  const toggleFavorite = useCommunityStore((s) => s.toggleFavorite);
  const favoriteContactIds = useCommunityStore((s) => s.favoriteContactIds);
  const pendingContactIds = useCommunityStore((s) => s.pendingContactIds);
  const loadFavorites = useCommunityStore((s) => s.loadFavorites);

  useEffect(() => {
    if (currentProfileId) {
      loadFavorites(currentProfileId);
      loadIncomingRequests().catch(() => {});
      loadSentRequests().catch(() => {});
    }
  }, [currentProfileId, loadFavorites, loadIncomingRequests, loadSentRequests]);

  // Robust: check backend status for this pair when profile loads / screen focuses.
  const refreshRequestState = useCallback(async () => {
    if (!otherUserId) {
      setPendingRequestStateRemote(null);
      setContactRequestStatusRemote(null);
      return;
    }
    const [state, status] = await Promise.all([
      fetchPendingRequestState({ eventId: APS_ID, otherUserId }).catch(() => null),
      fetchContactRequestStatus({ eventId: APS_ID, otherUserId }).catch(() => null),
    ]);
    setPendingRequestStateRemote(state);
    setContactRequestStatusRemote(status);
  }, [fetchContactRequestStatus, fetchPendingRequestState, otherUserId]);

  useEffect(() => {
    void refreshRequestState();
  }, [refreshRequestState]);

  useFocusEffect(
    useCallback(() => {
      void refreshRequestState();
      return () => {};
    }, [refreshRequestState])
  );

  useEffect(() => {
    let cancelled = false;
    async function loadAvatarUri() {
      const uri = await resolveProfilePictureUri(profile?.profilePicture || null);
      if (!cancelled) setAvatarUri(uri);
    }
    loadAvatarUri();
    return () => {
      cancelled = true;
    };
  }, [profile?.profilePicture]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!profileId) {
        setError('Missing profile id');
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);
      try {
        // Use API key flow with minimal-safe profile query.
        const resp = await graphqlApiKeyClient.graphql({
          query: getApsAppUserProfileMinimal,
          variables: { id: profileId },
        });
        const data = resp.data as {
          getApsAppUserProfile?: Profile | null;
        };

        const p = data.getApsAppUserProfile || null;
        if (!p?.id) {
          if (mounted) setProfile(null);
          return;
        }

        // Hydrate related collections by profileId to preserve current UI sections.
        const [affResp, eduResp, intResp] = await Promise.all([
          graphqlApiKeyClient.graphql({
            query: profileAffiliatesByProfileId,
            variables: { profileId: p.id, limit: 100 },
          }),
          graphqlApiKeyClient.graphql({
            query: profileEducationsByProfileId,
            variables: { profileId: p.id, limit: 100 },
          }),
          graphqlApiKeyClient.graphql({
            query: profileInterestsByProfileId,
            variables: { profileId: p.id, limit: 100 },
          }),
        ]);

        const affData = affResp.data as {
          profileAffiliatesByProfileId?: { items?: Array<any | null> | null };
        };
        const eduData = eduResp.data as {
          profileEducationsByProfileId?: { items?: Array<any | null> | null };
        };
        const intData = intResp.data as {
          profileInterestsByProfileId?: { items?: Array<any | null> | null };
        };

        const hydrated: Profile = {
          ...p,
          affiliates: { items: (affData.profileAffiliatesByProfileId?.items || []).filter(Boolean) },
          education: { items: (eduData.profileEducationsByProfileId?.items || []).filter(Boolean) },
          interests: { items: (intData.profileInterestsByProfileId?.items || []).filter(Boolean) },
        };

        if (mounted) setProfile(hydrated);
      } catch (e: any) {
        console.error('Error loading community profile:', e);
        if (mounted) setError(e?.message || 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [profileId]);

  const displayName = useMemo(() => nameOf(profile) || 'Profile', [profile]);
  const contactId = profile?.id;
  const fav = !!(contactId && favoriteContactIds[contactId]);
  const pending = !!(contactId && pendingContactIds[contactId]);
  const isSelf = !!contactId && !!currentAppUser?.profileId && currentAppUser.profileId === contactId;
  const isRequestAccepted = contactRequestStatusRemote === 'ACCEPTED';
  const isRequestPending =
    contactRequestStatusRemote === 'PENDING' || !!effectivePendingRequestState;
  const requestTileLabel = isRequestAccepted
    ? 'Accepted'
    : isRequestPending
      ? 'Pending'
      : 'Send Request';
  const requestTileIcon = isRequestAccepted
    ? 'checkmark-done-outline'
    : isRequestPending
      ? 'hourglass-outline'
      : 'person-add-outline';

  const handleRequestFlow = useCallback(
    async (openChatWhenAccepted: boolean) => {
      if (isSelf || !profile?.userId) return;

      if (isRequestAccepted) {
        if (!openChatWhenAccepted) return;
        try {
          const { threadId } = await ensureDmThreadForAcceptedRequest({
            eventId: APS_ID,
            otherUserId: profile.userId,
          });
          router.push(`/(main)/engage/messages/${threadId}`);
        } catch (e: any) {
          console.error('Message thread start failed:', e);
          Alert.alert('Unable to start chat', e?.message || 'Please try again.');
        }
        return;
      }

      if (isRequestPending) {
        router.push('/(main)/engage/requests');
        return;
      }

      setRequestActionBusy(true);
      try {
        const { status } = await getOrCreateContactRequest({
          eventId: APS_ID,
          otherUserId: profile.userId,
        });
        setContactRequestStatusRemote(status || null);

        await Promise.allSettled([loadIncomingRequests(), loadSentRequests()]);
        const latestPending = await fetchPendingRequestState({
          eventId: APS_ID,
          otherUserId: profile.userId,
        }).catch(() => null);
        setPendingRequestStateRemote(latestPending);

        if (status === 'ACCEPTED' && openChatWhenAccepted) {
          const { threadId } = await ensureDmThreadForAcceptedRequest({
            eventId: APS_ID,
            otherUserId: profile.userId,
          });
          router.push(`/(main)/engage/messages/${threadId}`);
          return;
        }

        if (status === 'ACCEPTED') {
          Alert.alert('Accepted', 'Your contact request is accepted.');
          return;
        }

        Alert.alert('Request sent', 'You can message once they accept your request.');
      } catch (e: any) {
        const msg = (e?.message || '').toLowerCase();
        if (msg.includes('not accepted')) {
          Alert.alert(
            'Waiting for acceptance',
            'You can message once they accept your request.'
          );
          return;
        }
        console.error('Contact request flow failed:', e);
        Alert.alert('Unable to continue', e?.message || 'Please try again.');
      } finally {
        setRequestActionBusy(false);
      }
    },
    [
      ensureDmThreadForAcceptedRequest,
      fetchPendingRequestState,
      getOrCreateContactRequest,
      isRequestAccepted,
      isRequestPending,
      isSelf,
      loadIncomingRequests,
      loadSentRequests,
      profile?.userId,
    ]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load profile</Text>
        <Text style={styles.muted}>{error || 'Profile not found.'}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const interests =
    (profile.interests?.items || [])
      .filter(Boolean)
      .map((i: any) => i.interest)
      .filter(Boolean) || [];

  const affiliates =
    (profile.affiliates?.items || [])
      .filter(Boolean)
      .map((a: any) => [a.affiliate, a.role].filter(Boolean).join(' — '))
      .filter(Boolean) || [];

  const education =
    (profile.education?.items || [])
      .filter(Boolean)
      .map((e: any) => [e.school, e.degree, e.fieldOfStudy].filter(Boolean).join(' • '))
      .filter(Boolean) || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {(profile.firstName || '').trim().slice(0, 1).toUpperCase()}
              {(profile.lastName || '').trim().slice(0, 1).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{displayName}</Text>
          {!!profile.jobTitle && <Text style={styles.muted}>{profile.jobTitle}</Text>}
          {!!profile.company && <Text style={styles.muted}>{profile.company}</Text>}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            hitSlop={10}
            disabled={!currentProfileId || !contactId || pending || isSelf}
            onPress={async () => {
              if (!currentProfileId || !contactId) return;
              if (isSelf) return;
              try {
                await toggleFavorite({
                  currentUserProfileId: currentProfileId,
                  contactId,
                });
              } catch {
                // keep it lightweight; store will re-sync on failure
              }
            }}
            style={styles.iconBtn}
          >
            <Ionicons
              name={fav ? 'star' : 'star-outline'}
              size={22}
              color={
                isSelf ? '#d1d5db' : fav ? autopackColors.apYellow : pending ? '#9ca3af' : '#6b7280'
              }
            />
          </Pressable>
          <Pressable
            hitSlop={10}
            disabled={isSelf || !profile?.userId || requestActionBusy}
            onPress={async () => {
              await handleRequestFlow(true);
            }}
            style={styles.iconBtn}
          >
            <Ionicons
              name={isRequestPending ? 'hourglass-outline' : 'chatbubble-outline'}
              size={22}
              color={
                isSelf || requestActionBusy
                  ? '#d1d5db'
                  : isRequestPending
                    ? '#9ca3af'
                    : '#6b7280'
              }
            />
          </Pressable>
        </View>
      </View>

      {!isSelf && (
        <View style={styles.actionGrid}>
          <Pressable
            disabled={!profile?.userId || requestActionBusy}
            onPress={async () => {
              await handleRequestFlow(false);
            }}
            style={[styles.actionTile, requestActionBusy && styles.actionTileDisabled]}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons
                name={requestTileIcon as any}
                size={20}
                color="#fff"
              />
            </View>
            <Text style={styles.actionTileText}>
              {requestActionBusy ? 'Updating…' : requestTileLabel}
            </Text>
          </Pressable>

          <Pressable
            disabled={!contactId || addingPhoneContact || !isRequestAccepted}
            onPress={async () => {
              if (!profile) return;
              setAddingPhoneContact(true);
              try {
                const { status } = await Contacts.requestPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission required', 'Please allow Contacts access to save to your phone.');
                  return;
                }

                const first = (profile.firstName || '').trim();
                const last = (profile.lastName || '').trim();
                const hasName = !!(first || last);
                const fallbackName = hasName
                  ? ''
                  : (profile.email || '').split('@')[0]?.trim() || 'APS Contact';

                await Contacts.addContactAsync({
                  // Ensure iOS treats this as a person contact and displays a name (not just company)
                  contactType: Contacts.ContactTypes.Person,
                  firstName: hasName ? (first || undefined) : fallbackName,
                  lastName: hasName ? (last || undefined) : undefined,
                  company: profile.company || undefined,
                  jobTitle: profile.jobTitle || undefined,
                  emails: profile.email ? [{ email: profile.email, label: 'work' }] : undefined,
                  phoneNumbers: profile.phone ? [{ number: profile.phone, label: 'mobile' }] : undefined,
                  urlAddresses:
                    Array.isArray(profile.website) && profile.website.length
                      ? profile.website
                          .filter(Boolean)
                          .map((url) => ({ url, label: 'website' }))
                      : undefined,
                });
                Alert.alert('Saved', 'Added to your phone contacts.');
              } catch (e: any) {
                console.error('Add to phone contacts failed:', e);
                Alert.alert('Save failed', 'Could not add to phone contacts.');
              } finally {
                setAddingPhoneContact(false);
              }
            }}
            style={[
              styles.actionTile,
              styles.actionTileAlt,
              (addingPhoneContact || !isRequestAccepted) && styles.actionTileDisabled,
            ]}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="call-outline" size={20} color="#fff" />
            </View>
            <Text style={styles.actionTileText}>
              {addingPhoneContact
                ? 'Saving…'
                : isRequestAccepted
                  ? 'Add to phone contacts'
                  : 'Accepted to unlock'}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.sectionCard, styles.firstSectionCard]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="reader-outline" size={14} color="#1d4ed8" />
            </View>
            <Text style={styles.sectionHeaderText}>Bio</Text>
          </View>
        </View>
        <Text style={styles.sectionBodyText}>
          {profile.bio?.trim() || 'No bio provided.'}
        </Text>
        <View style={styles.sectionDivider} />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="briefcase-outline" size={14} color="#1d4ed8" />
            </View>
            <Text style={styles.sectionHeaderText}>Experience</Text>
          </View>
        </View>
        {affiliates.length ? (
          affiliates.map((t: string) => (
            <Text key={t} style={styles.sectionListItem}>
              • {t}
            </Text>
          ))
        ) : (
          <Text style={styles.sectionBodyText}>No experience provided.</Text>
        )}
        <View style={styles.sectionDivider} />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="school-outline" size={14} color="#1d4ed8" />
            </View>
            <Text style={styles.sectionHeaderText}>Education</Text>
          </View>
        </View>
        {education.length ? (
          education.map((t: string) => (
            <Text key={t} style={styles.sectionListItem}>
              • {t}
            </Text>
          ))
        ) : (
          <Text style={styles.sectionBodyText}>No education provided.</Text>
        )}
        <View style={styles.sectionDivider} />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="heart-outline" size={14} color="#1d4ed8" />
            </View>
            <Text style={styles.sectionHeaderText}>Interests</Text>
          </View>
        </View>
        {interests.length ? (
          interests.map((t: string) => (
            <Text key={t} style={styles.sectionListItem}>
              • {t}
            </Text>
          ))
        ) : (
          <Text style={styles.sectionBodyText}>No interests provided.</Text>
        )}
        <View style={styles.sectionDivider} />
      </View>

      <NotesSection profileId={profile.id} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  muted: { color: '#6b7280' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 56, height: 56, borderRadius: 999 },
  avatarText: { fontWeight: '900', color: '#111827', fontSize: 18 },
  name: { fontSize: 18, fontWeight: '900', color: '#111827' },

  headerActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 6, borderRadius: 10 },

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
    opacity: 0.6,
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
  firstSectionCard: {
    marginTop: 4,
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
  },
  sectionBodyText: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  sectionListItem: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
    marginTop: 14,
  },

  backBtn: {
    marginTop: 10,
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backText: { color: '#fff', fontWeight: '700' },
});
