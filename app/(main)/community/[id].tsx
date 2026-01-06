import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { autopackColors } from '../../../src/theme';
import { getCommunityProfileByProfileId } from '../../../src/graphql/customQueries';
import { graphqlClient } from '../../../src/utils/graphqlClient';
import { useCommunityStore } from '../../../src/store/communityStore';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';
import { useEngageStore } from '../../../src/store/engageStore';
import { APS_ID } from '../../../src/config/apsConfig';
import { createApsAppUserLead, deleteApsAppUserLead } from '../../../src/graphql/mutations';
import { apsAppUserLeadsByUserId } from '../../../src/graphql/queries';
import * as Contacts from 'expo-contacts';

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
  const params = useLocalSearchParams<{ id?: string; returnTo?: string; returnLabel?: string }>();
  const profileId = params.id;
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : null;
  const returnLabel = typeof params.returnLabel === 'string' ? params.returnLabel : null;

  const getOrCreateContactRequest = useEngageStore((s) => s.getOrCreateContactRequest);
  const ensureDmThreadForAcceptedRequest = useEngageStore(
    (s) => s.ensureDmThreadForAcceptedRequest
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addingLead, setAddingLead] = useState(false);
  const [addingPhoneContact, setAddingPhoneContact] = useState(false);
  const [leadRecordId, setLeadRecordId] = useState<string | null>(null);

  const toggleFavorite = useCommunityStore((s) => s.toggleFavorite);
  const favoriteContactIds = useCommunityStore((s) => s.favoriteContactIds);
  const pendingContactIds = useCommunityStore((s) => s.pendingContactIds);
  const loadFavorites = useCommunityStore((s) => s.loadFavorites);
  const contactRecordIdByContactId = useCommunityStore((s) => s.contactRecordIdByContactId);

  useEffect(() => {
    if (currentAppUser?.id) {
      loadFavorites(currentAppUser.id);
    }
  }, [currentAppUser?.id, loadFavorites]);

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
        const resp = await graphqlClient.graphql({
          query: getCommunityProfileByProfileId,
          variables: { id: profileId },
        });

        const data = resp.data as {
          getApsAppUserProfile?: Profile | null;
        };

        const p = data.getApsAppUserProfile || null;
        if (mounted) setProfile(p as Profile | null);
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
  const isInContacts = !!(contactId && contactRecordIdByContactId[contactId]);
  const isInLeads = !!leadRecordId;

  const refreshLeadStatus = useCallback(async () => {
    if (!currentAppUser?.id || !contactId || isSelf) {
      setLeadRecordId(null);
      return;
    }
    try {
      const resp = await graphqlClient.graphql({
        query: apsAppUserLeadsByUserId,
        variables: {
          userId: currentAppUser.id,
          limit: 1000,
          filter: { contactId: { eq: contactId } },
        },
      });
      const data = resp.data as {
        apsAppUserLeadsByUserId?: { items?: Array<{ id: string } | null> | null };
      };
      const ids = (data.apsAppUserLeadsByUserId?.items || [])
        .filter(Boolean)
        .map((i) => (i as { id: string }).id)
        .filter(Boolean);
      const id = ids[0] || null;
      setLeadRecordId(id);

      // Best-effort cleanup: if duplicates exist, delete extras.
      if (ids.length > 1) {
        for (const extraId of ids.slice(1)) {
          try {
            await graphqlClient.graphql({
              query: deleteApsAppUserLead,
              variables: { input: { id: extraId } },
            });
          } catch (e) {
            console.warn('Failed to delete duplicate lead:', extraId, e);
          }
        }
      }
    } catch (e) {
      console.error('Refresh lead status failed:', e);
      setLeadRecordId(null);
    }
  }, [currentAppUser?.id, contactId, isSelf]);

  // Initial + dependency-driven refresh
  useEffect(() => {
    refreshLeadStatus();
  }, [refreshLeadStatus]);

  // Also refresh when coming back to this screen (e.g., after navigation)
  useFocusEffect(
    useCallback(() => {
      refreshLeadStatus();
    }, [refreshLeadStatus])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading profile…</Text>
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <Pressable
        style={styles.backRow}
        onPress={() => {
          // Prefer popping the stack to avoid creating navigation loops / duplicate history.
          // If we were deep-linked from a different area (e.g., Engage > Leads), go back there.
          if (returnTo) {
            router.navigate(returnTo);
            return;
          }
          // Otherwise, if there is back history, pop. If not, fall back to Community index.
          if (router.canGoBack()) router.back();
          else router.navigate('/(main)/community');
        }}
      >
        <Ionicons name="chevron-back" size={20} color={autopackColors.apBlue} />
        <Text style={styles.backRowText}>{returnLabel || 'Back to Community'}</Text>
      </Pressable>

      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          {profile.profilePicture ? (
            <Image source={{ uri: profile.profilePicture }} style={styles.avatarImg} />
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
          {!!profile.location && <Text style={styles.muted}>{profile.location}</Text>}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            hitSlop={10}
            disabled={!currentAppUser?.id || !contactId || pending || isSelf}
            onPress={async () => {
              if (!currentAppUser?.id || !contactId) return;
              if (isSelf) return;
              try {
                await toggleFavorite({ currentUserId: currentAppUser.id, contactId });
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
            disabled={isSelf || !profile?.userId}
            onPress={async () => {
              if (isSelf || !profile?.userId) return;
              try {
                const { status } = await getOrCreateContactRequest({
                  eventId: APS_ID,
                  otherUserId: profile.userId,
                });

                if (status !== 'ACCEPTED') {
                  Alert.alert(
                    'Request sent',
                    'You can message once they accept your request.'
                  );
                  return;
                }

                const { threadId } = await ensureDmThreadForAcceptedRequest({
                  eventId: APS_ID,
                  otherUserId: profile.userId,
                });

                router.push(`/(main)/engage/messages/${threadId}`);
              } catch (e: any) {
                const msg = (e?.message || '').toLowerCase();
                if (msg.includes('not accepted')) {
                  Alert.alert(
                    'Waiting for acceptance',
                    'You can message once they accept your request.'
                  );
                  return;
                }
                console.error('Message request flow failed:', e);
                Alert.alert('Unable to start chat', e?.message || 'Please try again.');
              }
            }}
            style={styles.iconBtn}
          >
            <Ionicons
              name='chatbubble-outline'
              size={22}
              color={isSelf ? '#d1d5db' : '#6b7280'}
            />
          </Pressable>
        </View>
      </View>

      {!isSelf && (
        <View style={styles.actionsCard}>
          <Pressable
            disabled={!currentAppUser?.id || !contactId || pending}
            onPress={async () => {
              if (!currentAppUser?.id || !contactId) return;
              try {
                // Single source of truth: toggles “in contacts” by creating/deleting ApsAppUserContact
                await toggleFavorite({ currentUserId: currentAppUser.id, contactId });
                await loadFavorites(currentAppUser.id);
                Alert.alert(
                  isInContacts ? 'Removed' : 'Added',
                  isInContacts ? 'Removed from your contacts.' : 'Added to your contacts.'
                );
              } catch (e) {
                console.error('Toggle contact failed:', e);
                Alert.alert('Update failed', 'Please try again.');
              }
            }}
            style={[styles.actionBtn, pending && styles.actionBtnDisabled]}
          >
            <Ionicons name={isInContacts ? 'person-remove-outline' : 'person-add-outline'} size={18} color="#fff" />
            <Text style={styles.actionBtnText}>
              {pending ? 'Updating…' : isInContacts ? 'Remove from contacts' : 'Add to contacts'}
            </Text>
          </Pressable>

          <Pressable
            disabled={!currentAppUser?.id || !contactId || addingLead}
            onPress={async () => {
              if (!currentAppUser?.id || !contactId) return;
              setAddingLead(true);
              try {
                if (leadRecordId) {
                  await graphqlClient.graphql({
                    query: deleteApsAppUserLead,
                    variables: { input: { id: leadRecordId } },
                  });
                  await refreshLeadStatus();
                  Alert.alert('Removed', 'Removed from your leads.');
                  return;
                }

                const resp = await graphqlClient.graphql({
                  query: createApsAppUserLead,
                  // Deterministic id prevents duplicates for a given (userId, contactId)
                  variables: {
                    input: { id: `${currentAppUser.id}:${contactId}`, userId: currentAppUser.id, contactId, favorite: false },
                  },
                });
                const data = resp.data as { createApsAppUserLead?: { id?: string | null } | null };
                const createdId = data.createApsAppUserLead?.id || null;
                // If create response doesn't include an id (or eventual consistency),
                // re-query so UI matches backend state.
                if (createdId) {
                  setLeadRecordId(createdId);
                } else {
                  await refreshLeadStatus();
                }
                Alert.alert('Added', 'Lead saved in app.');
              } catch (e: any) {
                console.error('Add lead failed:', e);
                Alert.alert('Add lead failed', 'Please try again.');
              } finally {
                setAddingLead(false);
              }
            }}
            style={[styles.actionBtn, styles.actionBtnAlt, addingLead && styles.actionBtnDisabled]}
          >
            <Ionicons name={isInLeads ? 'trash-outline' : 'briefcase-outline'} size={18} color="#fff" />
            <Text style={styles.actionBtnText}>
              {addingLead ? 'Updating…' : isInLeads ? 'Remove lead' : 'Add lead'}
            </Text>
          </Pressable>

          <Pressable
            disabled={!contactId || addingPhoneContact}
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
            style={[styles.actionBtn, styles.actionBtnMuted, addingPhoneContact && styles.actionBtnDisabled]}
          >
            <Ionicons name="call-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>{addingPhoneContact ? 'Saving…' : 'Add to phone contacts'}</Text>
          </Pressable>
        </View>
      )}

      {!!profile.bio && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bio</Text>
          <Text style={styles.body}>{profile.bio}</Text>
        </View>
      )}

      {interests.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Interests</Text>
          <View style={styles.chips}>
            {interests.map((t: string) => (
              <View key={t} style={styles.chip}>
                <Text style={styles.chipText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {affiliates.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Affiliates</Text>
          {affiliates.map((t: string) => (
            <Text key={t} style={styles.body}>
              • {t}
            </Text>
          ))}
        </View>
      )}

      {education.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Education</Text>
          {education.map((t: string) => (
            <Text key={t} style={styles.body}>
              • {t}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  muted: { color: '#6b7280' },

  backRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backRowText: {
    color: autopackColors.apBlue,
    fontWeight: '800',
  },

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

  card: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  cardTitle: { fontWeight: '900', color: '#111827', marginBottom: 6 },
  body: { color: '#111827', lineHeight: 20 },

  actionsCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 10,
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
  actionBtnMuted: {
    backgroundColor: '#6b7280',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '800',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { color: '#111827', fontWeight: '600' },

  backBtn: {
    marginTop: 10,
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backText: { color: '#fff', fontWeight: '700' },
});


