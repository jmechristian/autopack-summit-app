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
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { graphqlClient } from '../../utils/graphqlClient';
import { autopackColors } from '../../theme';
import { useEngageStore } from '../../store/engageStore';
import { AppUserRow } from '../AppUserRow';
import { apsAppUserContactsByUserId } from '../../graphql/queries';
import { useCommunityStore } from '../../store/communityStore';
import { getProfilePictureUrl } from '../../utils/storageUtils';
import { useNotesPresence } from '../../hooks/useNotesPresence';

// IMPORTANT:
// Generated `getApsAppUserProfile` includes `notes { ... }`, but notes are now USER_POOLS-only.
// When called via API_KEY, AppSync may return errors and profiles won't load -> empty contacts/leads UI.
const getApsAppUserProfileMinimal = /* GraphQL */ `
  query GetApsAppUserProfileMinimal($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      userId
      firstName
      lastName
      email
      company
      jobTitle
      profilePicture
      location
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

type Profile = {
  id: string;
  userId: string;
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
  userId: string;
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

type ContactsToolProps = {
  profileBasePath?: string;
};

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

export default function ContactsTool({ profileBasePath = '/(main)/community' }: ContactsToolProps) {
  const insets = useSafeAreaInsets();
  const currentAppUser = useCurrentAppUser();
  const { profileIdsWithNotes } = useNotesPresence();
  const loadIncomingRequests = useEngageStore((s) => s.loadIncomingRequests);
  const loadSentRequests = useEngageStore((s) => s.loadSentRequests);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [profilePictureUrls, setProfilePictureUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const favoriteContactIds = useCommunityStore((s) => s.favoriteContactIds) || {};
  const pendingContactIds = useCommunityStore((s) => s.pendingContactIds) || {};
  const loadFavorites = useCommunityStore((s) => s.loadFavorites);

  useEffect(() => {
    if (currentAppUser?.id) {
      loadFavorites(currentAppUser.id);
      // Keep request/hourglass state fresh for row UI.
      loadIncomingRequests().catch(() => {});
      loadSentRequests().catch(() => {});
    }
  }, [currentAppUser?.id, loadFavorites, loadIncomingRequests, loadSentRequests]);

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
        }
      }
    } catch (e: any) {
      console.error('Error loading contacts:', e);
      setError(e?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [currentAppUser?.id, profilesById]);

  const load = useCallback(async () => {
    setLoading(true);
    await loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const filteredProfiles = useMemo(() => {
    const items = contacts;
    const q = search.trim().toLowerCase();
    const base = items
      .map((item) => {
        const p = profilesById[item.contactId];
        if (!p) return null;
        return {
          profileId: item.contactId,
          userId: p.userId,
          contactItemId: item.id,
          favorite: item.favorite,
          firstName: p.firstName,
          lastName: p.lastName,
          company: p.company,
          jobTitle: p.jobTitle,
          profilePicture: p.profilePicture,
          location: p.location,
          email: p.email,
        } as ContactProfile;
      })
      .filter((x): x is ContactProfile => !!x);

    if (!q) return base;
    return base.filter((p) => {
      const fullName = getFullName(p).toLowerCase();
      const company = (p.company || '').toLowerCase();
      const title = (p.jobTitle || '').toLowerCase();
      return fullName.includes(q) || company.includes(q) || title.includes(q);
    });
  }, [contacts, profilesById, search]);

  const sections: ContactSection[] = useMemo(() => {
    const map = new Map<string, ContactProfile[]>();
    for (const p of filteredProfiles) {
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
  }, [filteredProfiles]);

  useEffect(() => {
    const loadUrls = async () => {
      const missing = Object.values(profilesById).filter((p) => p.profilePicture);
      if (!missing.length) return;
      const updates: Record<string, string | null> = {};
      await Promise.all(
        missing.map(async (p) => {
          if (!p.profilePicture) return;
          try {
            const url = await getProfilePictureUrl(p.profilePicture);
            updates[p.id] = url;
          } catch {
            updates[p.id] = null;
          }
        })
      );
      if (Object.keys(updates).length) {
        setProfilePictureUrls((prev) => ({ ...prev, ...updates }));
      }
    };
    loadUrls();
  }, [profilesById]);

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
        <Text style={styles.muted}>Loading contacts…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          onRefresh={refresh}
          refreshing={refreshing}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const avatarUrl = profilePictureUrls[item.profileId] || item.profilePicture || null;
            const isFavorite = !!favoriteContactIds[item.profileId];
            const isPending = !!pendingContactIds[item.profileId];
            const hasNotes = profileIdsWithNotes.has(item.profileId);
            const name = getFullName(item) || '(No name)';
            const subtitle = [item.jobTitle, item.company].filter(Boolean).join(' • ');
            const isSelf = !!currentAppUser?.profileId && currentAppUser.profileId === item.profileId;
            const initials = `${normalizeNamePart(item.firstName).slice(0, 1)}${normalizeNamePart(
              item.lastName,
            ).slice(0, 1)}`.toUpperCase();
            return (
              <AppUserRow
                profileId={item.profileId}
                userId={item.userId}
                name={name}
                subtitle={subtitle}
                avatarUri={avatarUrl}
                initials={initials}
                isSelf={isSelf}
                hasNote={hasNotes}
                currentAppUserId={currentAppUser?.id || null}
                favorite={isFavorite}
                pendingFavorite={isPending}
                onPressProfile={() =>
                  router.push({
                    pathname: `${profileBasePath}/[id]`,
                    params: { id: item.profileId },
                  })
                }
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>No contacts found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  muted: { color: '#6b7280' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },

  sectionHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  sectionHeaderText: { fontWeight: '800', color: '#111827' },

  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb', marginLeft: 16 },

  empty: { padding: 16 },

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
