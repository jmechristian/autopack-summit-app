import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppUserRow } from '../../../src/components/AppUserRow';
import { listApsAppUserProfiles } from '../../../src/graphql/queries';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';
import { useNotesPresence } from '../../../src/hooks/useNotesPresence';
import { useCommunityStore } from '../../../src/store/communityStore';
import { useEngageStore } from '../../../src/store/engageStore';
import { autopackColors } from '../../../src/theme';
import { graphqlApiKeyClient } from '../../../src/utils/graphqlClient';
import { resolveProfilePictureUri } from '../../../src/utils/storageUtils';

type CommunityProfile = {
  profileId: string; // ApsAppUserProfile.id
  userId: string; // ApsAppUserProfile.userId (ApsAppUser.id)
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
  location?: string | null;
  email?: string | null;
};

type CommunitySection = { title: string; data: CommunityProfile[] };

function normalizeNamePart(v?: string | null) {
  return (v || '').trim();
}

function getFullName(p: CommunityProfile) {
  const first = normalizeNamePart(p.firstName);
  const last = normalizeNamePart(p.lastName);
  return [first, last].filter(Boolean).join(' ').trim();
}

function getSectionKey(p: CommunityProfile) {
  const last = normalizeNamePart(p.lastName);
  const letter = last ? last[0].toUpperCase() : '#';
  return /[A-Z]/.test(letter) ? letter : '#';
}

export default function CommunityIndex() {
  const currentAppUser = useCurrentAppUser();
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const { profileIdsWithNotes } = useNotesPresence();
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [profilePictureUris, setProfilePictureUris] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const favoriteContactIds = useCommunityStore((s) => s.favoriteContactIds);
  const pendingContactIds = useCommunityStore((s) => s.pendingContactIds);
  const loadFavorites = useCommunityStore((s) => s.loadFavorites);

  const loadIncomingRequests = useEngageStore((s) => s.loadIncomingRequests);
  const loadSentRequests = useEngageStore((s) => s.loadSentRequests);

  useEffect(() => {
    if (currentProfileId) {
      loadFavorites(currentProfileId);
      // Keep request/hourglass state fresh for row UI.
      loadIncomingRequests().catch(() => {});
      loadSentRequests().catch(() => {});
    }
  }, [
    currentProfileId,
    loadFavorites,
    loadIncomingRequests,
    loadSentRequests,
  ]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const all: CommunityProfile[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlApiKeyClient.graphql({
          query: listApsAppUserProfiles,
          variables: { limit: 1000, nextToken },
        });

        const data = resp.data as {
          listApsAppUserProfiles?: {
            items?: Array<{
              id?: string | null;
              userId?: string | null;
              firstName?: string | null;
              lastName?: string | null;
              company?: string | null;
              jobTitle?: string | null;
              profilePicture?: string | null;
              location?: string | null;
              email?: string | null;
            } | null>;
            nextToken?: string | null;
          };
        };

        const items = data.listApsAppUserProfiles?.items || [];
        for (const item of items) {
          if (!item?.id || !item?.userId) continue;
          all.push({
            userId: item.userId,
            profileId: item.id,
            firstName: item.firstName,
            lastName: item.lastName,
            company: item.company,
            jobTitle: item.jobTitle,
            profilePicture: item.profilePicture,
            location: item.location,
            email: item.email,
          });
        }
        nextToken = data.listApsAppUserProfiles?.nextToken;
      } while (nextToken);

      // Sort by last name, then first name
      all.sort((a, b) => {
        const aLast = normalizeNamePart(a.lastName).toLowerCase();
        const bLast = normalizeNamePart(b.lastName).toLowerCase();
        const byLast = aLast.localeCompare(bLast);
        if (byLast !== 0) return byLast;
        const aFirst = normalizeNamePart(a.firstName).toLowerCase();
        const bFirst = normalizeNamePart(b.firstName).toLowerCase();
        return aFirst.localeCompare(bFirst);
      });

      setProfiles(all);
    } catch (e: any) {
      console.error('Error loading community users:', e);
      setError(e?.message || 'Failed to load community');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = profiles.filter((p) => {
      // Never show the current user in Community list
      if (currentProfileId && p.profileId === currentProfileId)
        return false;
      if (currentAppUser?.id && p.userId === currentAppUser.id) return false;
      return true;
    });

    if (!q) return base;
    return base.filter((p) => {
      const fullName = getFullName(p).toLowerCase();
      const company = (p.company || '').toLowerCase();
      const title = (p.jobTitle || '').toLowerCase();
      return fullName.includes(q) || company.includes(q) || title.includes(q);
    });
  }, [profiles, search, currentProfileId, currentAppUser?.id]);

  const sections: CommunitySection[] = useMemo(() => {
    const map = new Map<string, CommunityProfile[]>();
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

  useEffect(() => {
    let cancelled = false;
    const unresolved = profiles.filter(
      (p) => p.profilePicture && profilePictureUris[p.profileId] === undefined
    );
    if (!unresolved.length) return;

    async function loadAvatarUris() {
      const updates: Record<string, string | null> = {};
      await Promise.all(
        unresolved.map(async (p) => {
          updates[p.profileId] = await resolveProfilePictureUri(p.profilePicture);
        })
      );
      if (!cancelled && Object.keys(updates).length) {
        setProfilePictureUris((prev) => ({ ...prev, ...updates }));
      }
    }

    loadAvatarUris();
    return () => {
      cancelled = true;
    };
  }, [profiles, profilePictureUris]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading community…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name='search' size={18} color='#6b7280' />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder='Search by name, company, or title'
          placeholderTextColor='#9ca3af'
          style={styles.searchInput}
          autoCapitalize='none'
          autoCorrect={false}
          clearButtonMode='while-editing'
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn’t load community</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.profileId}
          stickySectionHeadersEnabled
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>
                {search.trim() ? 'No matches.' : 'No community members found.'}
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
            const subtitle = [item.jobTitle, item.company]
              .filter(Boolean)
              .join(' • ');
            const fav = !!favoriteContactIds[item.profileId];
            const pending = !!pendingContactIds[item.profileId];
            const isSelf =
              !!currentProfileId &&
              currentProfileId === item.profileId;
            const hasNote = profileIdsWithNotes.has(item.profileId);

            return (
              <AppUserRow
                profileId={item.profileId}
                userId={item.userId}
                name={name}
                subtitle={subtitle}
                avatarUri={profilePictureUris[item.profileId] ?? null}
                initials={`${normalizeNamePart(item.firstName).slice(0, 1)}${normalizeNamePart(item.lastName).slice(0, 1)}`.toUpperCase()}
                isSelf={isSelf}
                hasNote={hasNote}
                currentAppUserProfileId={currentProfileId}
                favorite={fav}
                pendingFavorite={pending}
                onPressProfile={() =>
                  router.push({
                    pathname: '/(main)/community/[id]',
                    params: { id: item.profileId },
                  })
                }
              />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: '#6b7280' },

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

  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 12,
  },

  empty: { padding: 18 },

  errorBox: { padding: 16 },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
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
