import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';
import { graphqlClient } from '../../../src/utils/graphqlClient';
import { autopackColors } from '../../../src/theme';
import {
  apsAppUserContactsByUserId,
  apsAppUserLeadsByUserId,
} from '../../../src/graphql/queries';
import { useCommunityStore } from '../../../src/store/communityStore';
import { getProfilePictureUrl } from '../../../src/utils/storageUtils';
import { useNotesPresence } from '../../../src/hooks/useNotesPresence';

// IMPORTANT:
// Generated `getApsAppUserProfile` includes `notes { ... }`, but notes are now USER_POOLS-only.
// When called via API_KEY, AppSync may return errors and profiles won't load -> empty contacts/leads UI.
const getApsAppUserProfileMinimal = /* GraphQL */ `
  query GetApsAppUserProfileMinimal($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      firstName
      lastName
      email
      company
      jobTitle
      location
      profilePicture
      __typename
    }
  }
`;

type ContactItem = {
  id: string;
  contactId: string;
  favorite?: boolean | null;
  createdAt?: string | null;
};

type LeadItem = {
  id: string;
  contactId: string;
  favorite?: boolean | null;
  createdAt?: string | null;
};

type Profile = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
  location?: string | null;
  email?: string | null;
};

type ContactProfile = {
  profileId: string;
  contactItemId: string;
  favorite?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
  location?: string | null;
  email?: string | null;
};

type ContactSection = { title: string; data: ContactProfile[] };

function normalizeNamePart(v?: string | null) {
  return (v || '').trim();
}

function getFullName(p: ContactProfile) {
  const first = normalizeNamePart(p.firstName);
  const last = normalizeNamePart(p.lastName);
  return [first, last].filter(Boolean).join(' ').trim();
}

function getSectionKey(p: ContactProfile) {
  const last = normalizeNamePart(p.lastName);
  const letter = last ? last[0].toUpperCase() : '#';
  return /[A-Z]/.test(letter) ? letter : '#';
}

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const currentAppUser = useCurrentAppUser();
  const { profileIdsWithNotes } = useNotesPresence();
  const [mode, setMode] = useState<'contacts' | 'leads'>('contacts');
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [profilePictureUrls, setProfilePictureUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFavorite = useCommunityStore((s) => s.toggleFavorite);
  const favoriteContactIds = useCommunityStore((s) => s.favoriteContactIds);
  const pendingContactIds = useCommunityStore((s) => s.pendingContactIds);
  const loadFavorites = useCommunityStore((s) => s.loadFavorites);

  useEffect(() => {
    if (currentAppUser?.id) {
      loadFavorites(currentAppUser.id);
    }
  }, [currentAppUser?.id, loadFavorites]);

  const loadContacts = useCallback(async () => {
    if (!currentAppUser?.id) return;
    setError(null);
    try {
      const all: ContactItem[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlClient.graphql({
          query: apsAppUserContactsByUserId,
          variables: { userId: currentAppUser.id, limit: 1000, nextToken },
        });
        const data = resp.data as {
          apsAppUserContactsByUserId?: {
            items?: Array<ContactItem | null> | null;
            nextToken?: string | null;
          };
        };
        const items = data.apsAppUserContactsByUserId?.items || [];
        for (const item of items) {
          if (!item?.id || !item.contactId) continue;
          all.push(item);
        }
        nextToken = data.apsAppUserContactsByUserId?.nextToken;
      } while (nextToken);

      // Deduplicate by contactId
      const byContact = new Map<string, ContactItem>();
      for (const item of all) {
        const existing = byContact.get(item.contactId);
        if (!existing) {
          byContact.set(item.contactId, item);
          continue;
        }
        const a = existing.createdAt || '';
        const b = item.createdAt || '';
        if (b > a) byContact.set(item.contactId, item);
      }

      const deduped = Array.from(byContact.values());
      setContacts(deduped);

      // Fetch missing profiles
      const missing = deduped.map((c) => c.contactId).filter((id) => !profilesById[id]);
      if (missing.length) {
        const entries = await Promise.all(
          missing.map(async (id) => {
            try {
              const resp = await graphqlClient.graphql({
                query: getApsAppUserProfileMinimal,
                variables: { id },
              });
              const data = resp.data as { getApsAppUserProfile?: Profile | null };
              const p = data.getApsAppUserProfile;
              return p?.id ? ([p.id, p] as const) : null;
            } catch {
              return null;
            }
          })
        );
        const patch: Record<string, Profile> = {};
        for (const e of entries) {
          if (!e) continue;
          patch[e[0]] = e[1];
        }
        if (Object.keys(patch).length) {
          setProfilesById((prev) => ({ ...prev, ...patch }));
          
          // Generate profile picture URLs
          const urlPromises = Object.entries(patch).map(async ([id, profile]) => {
            if (!profile.profilePicture) return [id, null] as const;
            const storedValue = profile.profilePicture;
            if (storedValue.startsWith('http://') || storedValue.startsWith('https://')) {
              return [id, storedValue] as const;
            }
            try {
              const url = await getProfilePictureUrl(storedValue);
              return [id, url] as const;
            } catch {
              return [id, null] as const;
            }
          });
          const urlEntries = await Promise.all(urlPromises);
          const urlPatch: Record<string, string | null> = {};
          for (const [id, url] of urlEntries) {
            urlPatch[id] = url;
          }
          if (Object.keys(urlPatch).length) {
            setProfilePictureUrls((prev) => ({ ...prev, ...urlPatch }));
          }
        }
      }
    } catch (e: any) {
      console.error('Load contacts failed:', e);
      setError(e?.message || 'Failed to load contacts');
    }
  }, [currentAppUser?.id, profilesById]);

  const loadLeads = useCallback(async () => {
    if (!currentAppUser?.id) return;
    setError(null);
    try {
      const all: LeadItem[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlClient.graphql({
          query: apsAppUserLeadsByUserId,
          variables: { userId: currentAppUser.id, limit: 1000, nextToken },
        });
        const data = resp.data as {
          apsAppUserLeadsByUserId?: {
            items?: Array<LeadItem | null> | null;
            nextToken?: string | null;
          };
        };
        const items = data.apsAppUserLeadsByUserId?.items || [];
        for (const item of items) {
          if (!item?.id || !item.contactId) continue;
          all.push(item);
        }
        nextToken = data.apsAppUserLeadsByUserId?.nextToken;
      } while (nextToken);

      // Deduplicate by contactId
      const byContact = new Map<string, LeadItem>();
      for (const item of all) {
        const existing = byContact.get(item.contactId);
        if (!existing) {
          byContact.set(item.contactId, item);
          continue;
        }
        const a = existing.createdAt || '';
        const b = item.createdAt || '';
        if (b > a) byContact.set(item.contactId, item);
      }

      const deduped = Array.from(byContact.values());
      setLeads(deduped);

      // Fetch missing profiles
      const missing = deduped.map((l) => l.contactId).filter((id) => !profilesById[id]);
      if (missing.length) {
        const entries = await Promise.all(
          missing.map(async (id) => {
            try {
              const resp = await graphqlClient.graphql({
                query: getApsAppUserProfileMinimal,
                variables: { id },
              });
              const data = resp.data as { getApsAppUserProfile?: Profile | null };
              const p = data.getApsAppUserProfile;
              return p?.id ? ([p.id, p] as const) : null;
            } catch {
              return null;
            }
          })
        );
        const patch: Record<string, Profile> = {};
        for (const e of entries) {
          if (!e) continue;
          patch[e[0]] = e[1];
        }
        if (Object.keys(patch).length) {
          setProfilesById((prev) => ({ ...prev, ...patch }));
          
          // Generate profile picture URLs
          const urlPromises = Object.entries(patch).map(async ([id, profile]) => {
            if (!profile.profilePicture) return [id, null] as const;
            const storedValue = profile.profilePicture;
            if (storedValue.startsWith('http://') || storedValue.startsWith('https://')) {
              return [id, storedValue] as const;
            }
            try {
              const url = await getProfilePictureUrl(storedValue);
              return [id, url] as const;
            } catch {
              return [id, null] as const;
            }
          });
          const urlEntries = await Promise.all(urlPromises);
          const urlPatch: Record<string, string | null> = {};
          for (const [id, url] of urlEntries) {
            urlPatch[id] = url;
          }
          if (Object.keys(urlPatch).length) {
            setProfilePictureUrls((prev) => ({ ...prev, ...urlPatch }));
          }
        }
      }
    } catch (e: any) {
      console.error('Load leads failed:', e);
      setError(e?.message || 'Failed to load leads');
    }
  }, [currentAppUser?.id, profilesById]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'contacts') {
        await loadContacts();
      } else {
        await loadLeads();
      }
    } finally {
      setLoading(false);
    }
  }, [mode, loadContacts, loadLeads]);

  useEffect(() => {
    if (currentAppUser?.id) {
      load();
    }
  }, [currentAppUser?.id, mode, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const items = useMemo(() => {
    const source = mode === 'contacts' ? contacts : leads;
    return source.map((item) => {
      const profile = profilesById[item.contactId];
      if (!profile) return null;
      return {
        profileId: profile.id,
        contactItemId: item.id,
        favorite: item.favorite,
        firstName: profile.firstName,
        lastName: profile.lastName,
        company: profile.company,
        jobTitle: profile.jobTitle,
        profilePicture: profile.profilePicture,
        location: profile.location,
        email: profile.email,
      } as ContactProfile;
    }).filter((item): item is ContactProfile => item !== null);
  }, [mode, contacts, leads, profilesById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const fullName = getFullName(p).toLowerCase();
      const company = (p.company || '').toLowerCase();
      const title = (p.jobTitle || '').toLowerCase();
      return fullName.includes(q) || company.includes(q) || title.includes(q);
    });
  }, [items, search]);

  const sections: ContactSection[] = useMemo(() => {
    const map = new Map<string, ContactProfile[]>();
    for (const p of filtered) {
      const key = getSectionKey(p);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }

    const titles = Array.from(map.keys()).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return titles.map((title) => ({ title, data: map.get(title)! }));
  }, [filtered]);

  if (!currentAppUser?.id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Sign in to view contacts.</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading {mode}…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Back Button and Toggle */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={autopackColors.apBlue} />
        </Pressable>
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleButton, mode === 'contacts' && styles.toggleButtonActive]}
            onPress={() => setMode('contacts')}
          >
            <Text style={[styles.toggleText, mode === 'contacts' && styles.toggleTextActive]}>
              Contacts
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, mode === 'leads' && styles.toggleButtonActive]}
            onPress={() => setMode('leads')}
          >
            <Text style={[styles.toggleText, mode === 'leads' && styles.toggleTextActive]}>
              Leads
            </Text>
          </Pressable>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#6b7280" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, company, or title"
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn't load {mode}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.contactItemId}
          stickySectionHeadersEnabled
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>
                {search.trim() ? 'No matches.' : `No ${mode} found.`}
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const name = getFullName(item) || '(No name)';
            const subtitle = [item.jobTitle, item.company].filter(Boolean).join(' • ');
            const fav = !!favoriteContactIds[item.profileId];
            const pending = !!pendingContactIds[item.profileId];
            const hasNote = profileIdsWithNotes.has(item.profileId);
            const isSelf =
              !!item.profileId &&
              !!currentAppUser?.profileId &&
              currentAppUser.profileId === item.profileId;

            return (
              <View style={styles.row}>
                <Pressable
                  style={styles.rowLeft}
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/community/[id]',
                      params: {
                        id: item.profileId,
                        returnTo: '/(main)/profile/contacts',
                        returnLabel: 'Back to Contacts',
                      },
                    })
                  }
                >
                  <View style={styles.avatar}>
                    {profilePictureUrls[item.profileId] ? (
                      <Image
                        source={{ uri: profilePictureUrls[item.profileId]! }}
                        style={styles.avatarImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {normalizeNamePart(item.firstName).slice(0, 1).toUpperCase()}
                        {normalizeNamePart(item.lastName).slice(0, 1).toUpperCase()}
                      </Text>
                    )}
                  </View>

                  <View style={styles.textWrap}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    {!!subtitle && (
                      <Text style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    )}
                  </View>
                </Pressable>

                <View style={styles.actions}>
                  <Pressable
                    hitSlop={10}
                    disabled={pending || isSelf || !currentAppUser?.id}
                    onPress={async () => {
                      if (!currentAppUser?.id) return;
                      if (isSelf) return;
                      try {
                        await toggleFavorite({
                          currentUserId: currentAppUser.id,
                          contactId: item.profileId,
                        });
                      } catch {
                        Alert.alert('Favorite failed', 'Could not update favorite. Please try again.');
                      }
                    }}
                    style={styles.iconBtn}
                  >
                    <Ionicons
                      name={fav ? 'star' : 'star-outline'}
                      size={20}
                      color={
                        isSelf
                          ? '#d1d5db'
                          : fav
                            ? autopackColors.apYellow
                            : pending
                              ? '#9ca3af'
                              : '#6b7280'
                      }
                    />
                  </Pressable>

                  <Pressable
                    hitSlop={10}
                    onPress={() => Alert.alert('Chat', 'Chat is coming soon.')}
                    style={styles.iconBtn}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#6b7280" />
                  </Pressable>

                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      router.push({
                        pathname: '/(main)/community/[id]',
                        params: {
                          id: item.profileId,
                          returnTo: '/(main)/profile/contacts',
                          returnLabel: 'Back to Contacts',
                        },
                      })
                    }
                    style={styles.iconBtn}
                  >
                    <Ionicons
                      name={hasNote ? 'document-text-outline' : 'eye-outline'}
                      size={20}
                      color={autopackColors.apBlue}
                    />
                  </Pressable>
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  muted: { color: '#6b7280' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: autopackColors.apBlue,
    fontWeight: '700',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },

  sectionHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  sectionHeaderText: { fontWeight: '800', color: '#111827' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 999 },
  avatarText: { fontWeight: '800', color: '#111827' },

  textWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 13, color: '#6b7280' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  iconBtn: { padding: 6, borderRadius: 10 },

  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb', marginLeft: 12 },

  empty: { padding: 18 },

  errorBox: { padding: 16 },
  errorTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  errorText: { color: '#6b7280', marginBottom: 12 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});

