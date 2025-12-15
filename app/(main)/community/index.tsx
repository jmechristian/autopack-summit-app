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
import { graphqlClient } from '../../../src/utils/graphqlClient';
import { autopackColors } from '../../../src/theme';
import { listApsAppUsersWithProfiles } from '../../../src/graphql/customQueries';
import { useCommunityStore } from '../../../src/store/communityStore';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';

type CommunityProfile = {
  userId: string;
  profileId: string;
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
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
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

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const all: CommunityProfile[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlClient.graphql({
          query: listApsAppUsersWithProfiles,
          variables: { limit: 1000, nextToken },
        });

        const data = resp.data as {
          listApsAppUsers?: {
            items?: Array<{
              id: string;
              profile?: {
                id: string;
                userId?: string | null;
                firstName?: string | null;
                lastName?: string | null;
                company?: string | null;
                jobTitle?: string | null;
                profilePicture?: string | null;
                location?: string | null;
                email?: string | null;
              } | null;
            } | null>;
            nextToken?: string | null;
          };
        };

        const items = data.listApsAppUsers?.items || [];
        for (const item of items) {
          if (!item?.profile?.id) continue;
          const p = item.profile;
          all.push({
            userId: p.userId || item.id,
            profileId: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            company: p.company,
            jobTitle: p.jobTitle,
            profilePicture: p.profilePicture,
            location: p.location,
            email: p.email,
          });
        }
        nextToken = data.listApsAppUsers?.nextToken;
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
    if (!q) return profiles;
    return profiles.filter((p) => {
      const fullName = getFullName(p).toLowerCase();
      const company = (p.company || '').toLowerCase();
      const title = (p.jobTitle || '').toLowerCase();
      return fullName.includes(q) || company.includes(q) || title.includes(q);
    });
  }, [profiles, search]);

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
          keyExtractor={(item) => `${item.userId}:${item.profileId}`}
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
            const subtitle = [item.jobTitle, item.company].filter(Boolean).join(' • ');
            const fav = !!favoriteContactIds[item.profileId];
            const pending = !!pendingContactIds[item.profileId];
            const isSelf = !!currentAppUser?.profileId && currentAppUser.profileId === item.profileId;

            return (
              <View style={styles.row}>
                <Pressable
                  style={styles.rowLeft}
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/community/[id]',
                      params: { id: item.userId },
                    })
                  }
                >
                  <View style={styles.avatar}>
                    {item.profilePicture ? (
                      <Image
                        source={{ uri: item.profilePicture }}
                        style={styles.avatarImg}
                        resizeMode='cover'
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
                    <Ionicons name='chatbubble-outline' size={20} color='#6b7280' />
                  </Pressable>

                  <Pressable
                    hitSlop={10}
                    onPress={() =>
                      router.push({
                        pathname: '/(main)/community/[id]',
                        params: { id: item.userId },
                      })
                    }
                    style={styles.iconBtn}
                  >
                    <Ionicons name='eye-outline' size={20} color={autopackColors.apBlue} />
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


