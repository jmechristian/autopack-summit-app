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
import { graphqlApiKeyClient } from '../../utils/graphqlClient';
import { autopackColors } from '../../theme';
import { useEngageStore } from '../../store/engageStore';
import { AppUserRow } from '../AppUserRow';
import {
  apsAppUserContactsByUserId,
  apsAppUserProfilesByUserId,
} from '../../graphql/queries';
import { useCommunityStore } from '../../store/communityStore';
import { resolveProfilePictureUri } from '../../utils/storageUtils';
import { useNotesPresence } from '../../hooks/useNotesPresence';

// IMPORTANT:
// Generated `getApsAppUserProfile` includes `notes { ... }`, but notes are now USER_POOLS-only.
// When called via API_KEY, AppSync may return errors and profiles won't load -> empty contacts UI.
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
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const { profileIdsWithNotes } = useNotesPresence();
  const loadIncomingRequests = useEngageStore((s) => s.loadIncomingRequests);
  const loadSentRequests = useEngageStore((s) => s.loadSentRequests);
  const incomingRequests = useEngageStore((s) => s.incomingRequests);
  const sentRequests = useEngageStore((s) => s.sentRequests);
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
    if (currentProfileId) {
      loadFavorites(currentProfileId);
      // Keep request/hourglass state fresh for row UI.
      loadIncomingRequests().catch(() => {});
      loadSentRequests().catch(() => {});
    }
  }, [currentProfileId, loadFavorites, loadIncomingRequests, loadSentRequests]);

  const loadContacts = useCallback(async () => {
    if (!currentAppUser?.id) return;
    setError(null);
    try {
      const all: ContactItem[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlApiKeyClient.graphql({
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
              const resp = await graphqlApiKeyClient.graphql({
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

  const pendingProfiles = useMemo(() => {
    const pendingByUserId = new Map<string, true>();
    for (const req of incomingRequests) {
      if (req.fromUserId) pendingByUserId.set(req.fromUserId, true);
    }
    for (const req of sentRequests) {
      if (req.toUserId) pendingByUserId.set(req.toUserId, true);
    }

    const byUserId = new Map<string, Profile>();
    for (const p of Object.values(profilesById)) {
      if (p.userId) byUserId.set(p.userId, p);
    }

    const contactUserIds = new Set(
      contacts
        .map((c) => profilesById[c.contactId]?.userId)
        .filter((x): x is string => !!x)
    );

    const rows: ContactProfile[] = [];
    for (const userId of pendingByUserId.keys()) {
      if (currentAppUser?.id && userId === currentAppUser.id) continue;
      if (contactUserIds.has(userId)) continue;
      const p = byUserId.get(userId);
      if (!p?.id) continue;
      rows.push({
        profileId: p.id,
        userId: p.userId,
        contactItemId: `pending:${userId}`,
        favorite: false,
        firstName: p.firstName,
        lastName: p.lastName,
        company: p.company,
        jobTitle: p.jobTitle,
        profilePicture: p.profilePicture,
        location: p.location,
        email: p.email,
      });
    }

    const q = search.trim().toLowerCase();
    const sorted = rows.sort((a, b) =>
      getFullName(a).toLowerCase().localeCompare(getFullName(b).toLowerCase())
    );
    if (!q) return sorted;
    return sorted.filter((p) => {
      const fullName = getFullName(p).toLowerCase();
      const company = (p.company || '').toLowerCase();
      const title = (p.jobTitle || '').toLowerCase();
      return fullName.includes(q) || company.includes(q) || title.includes(q);
    });
  }, [incomingRequests, sentRequests, profilesById, contacts, currentAppUser?.id, search]);

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

    const alphaSections = titles.map((title) => ({ title, data: map.get(title)! }));
    if (!pendingProfiles.length) return alphaSections;
    return [{ title: 'Pending Requests', data: pendingProfiles }, ...alphaSections];
  }, [filteredProfiles, pendingProfiles]);

  useEffect(() => {
    const pendingUserIds = Array.from(
      new Set([
        ...incomingRequests.map((r) => r.fromUserId).filter(Boolean),
        ...sentRequests.map((r) => r.toUserId).filter(Boolean),
      ])
    ) as string[];
    const knownUserIds = new Set(
      Object.values(profilesById)
        .map((p) => p.userId)
        .filter(Boolean)
    );
    const missingUserIds = pendingUserIds.filter((uid) => !knownUserIds.has(uid));
    if (!missingUserIds.length) return;

    let cancelled = false;
    async function loadPendingProfiles() {
      const entries = await Promise.all(
        missingUserIds.map(async (userId) => {
          try {
            const resp = await graphqlApiKeyClient.graphql({
              query: apsAppUserProfilesByUserId,
              variables: { userId, limit: 1 },
            });
            const data = resp.data as {
              apsAppUserProfilesByUserId?: { items?: Array<Profile | null> | null };
            };
            const p = (data.apsAppUserProfilesByUserId?.items || []).find(
              (x) => !!x?.id && !!x?.userId
            );
            return p?.id ? ([p.id, p] as const) : null;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;
      const patch: Record<string, Profile> = {};
      for (const entry of entries) {
        if (!entry) continue;
        patch[entry[0]] = entry[1];
      }
      if (Object.keys(patch).length) {
        setProfilesById((prev) => ({ ...prev, ...patch }));
      }
    }

    loadPendingProfiles();
    return () => {
      cancelled = true;
    };
  }, [incomingRequests, sentRequests, profilesById]);

  useEffect(() => {
    const loadUrls = async () => {
      const missing = Object.values(profilesById).filter(
        (p) => p.profilePicture && profilePictureUrls[p.id] === undefined
      );
      if (!missing.length) return;
      const updates: Record<string, string | null> = {};
      await Promise.all(
        missing.map(async (p) => {
          updates[p.id] = await resolveProfilePictureUri(p.profilePicture);
        })
      );
      if (Object.keys(updates).length) {
        setProfilePictureUrls((prev) => ({ ...prev, ...updates }));
      }
    };
    loadUrls();
  }, [profilesById, profilePictureUrls]);

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
          <Text style={styles.errorTitle}>Could not load contacts</Text>
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
            <View
              style={[
                styles.sectionHeader,
                section.title === 'Pending Requests' && styles.pendingSectionHeader,
              ]}
            >
              <Text
                style={[
                  styles.sectionHeaderText,
                  section.title === 'Pending Requests' && styles.pendingSectionHeaderText,
                ]}
              >
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const avatarUrl = profilePictureUrls[item.profileId] ?? null;
            const isFavorite = !!favoriteContactIds[item.profileId];
            const isPending = !!pendingContactIds[item.profileId];
            const hasNotes = profileIdsWithNotes.has(item.profileId);
            const name = getFullName(item) || '(No name)';
            const subtitle = [item.jobTitle, item.company].filter(Boolean).join(' • ');
            const isSelf = !!currentProfileId && currentProfileId === item.profileId;
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
                currentAppUserProfileId={currentProfileId}
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
  pendingSectionHeader: {
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 6,
  },
  pendingSectionHeaderText: { color: '#b45309' },

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
