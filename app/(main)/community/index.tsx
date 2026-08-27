import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  InteractionManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { APP_USER_ROW_HEIGHT, AppUserRow } from '../../../src/components/AppUserRow';
import {
  ExpertiseChips,
  ExpertisePickerModal,
} from '../../../src/components/profile/ExpertisePickerModal';
import { RiveLoader } from '../../../src/components/RiveLoader';
import { normalizeExpertiseTags } from '../../../src/constants/expertiseTags';
import { listApsAppUserProfiles } from '../../../src/graphql/queries';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';
import { useNotesPresence } from '../../../src/hooks/useNotesPresence';
import { useCommunityStore } from '../../../src/store/communityStore';
import { useEngageStore } from '../../../src/store/engageStore';
import { autopackColors } from '../../../src/theme';
import { graphqlApiKeyClient } from '../../../src/utils/graphqlClient';
import { resolveProfilePictureUri } from '../../../src/utils/storageUtils';
import { useContentInset, useMainTabScrollPadding } from '../../../src/utils/layout';

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
  expertise: string[];
};

type CommunitySection = { title: string; data: CommunityProfile[] };

type FlatRow =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'user'; key: string; profile: CommunityProfile; showDivider: boolean };

/** Integer heights only — keep getItemLayout exact on Android. */
const SECTION_HEADER_HEIGHT = 32;
const DIVIDER_HEIGHT = 1;

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

function rowHeight(row: FlatRow) {
  if (row.kind === 'header') return SECTION_HEADER_HEIGHT;
  // Divider is painted inside the fixed row height (absolute), so layout stays constant.
  return APP_USER_ROW_HEIGHT;
}

export default function CommunityIndex() {
  const contentInset = useContentInset(16);
  const tabScrollPad = useMainTabScrollPadding();
  const currentAppUser = useCurrentAppUser();
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const { profileIdsWithNotes } = useNotesPresence();
  const [search, setSearch] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState<string[]>([]);
  const [expertisePickerOpen, setExpertisePickerOpen] = useState(false);
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [profilePictureUris, setProfilePictureUris] = useState<Record<string, string | null>>({});
  const avatarRequestedRef = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const favoriteContactIds = useCommunityStore((s) => s.favoriteContactIds);
  const pendingContactIds = useCommunityStore((s) => s.pendingContactIds);
  const loadFavorites = useCommunityStore((s) => s.loadFavorites);

  const loadIncomingRequests = useEngageStore((s) => s.loadIncomingRequests);
  const loadSentRequests = useEngageStore((s) => s.loadSentRequests);
  const incomingRequests = useEngageStore((s) => s.incomingRequests);
  const sentRequests = useEngageStore((s) => s.sentRequests);

  const contactRequestByUserId = useMemo(() => {
    const map = new Map<string, 'incoming' | 'sent'>();
    for (const r of incomingRequests) {
      if (r?.fromUserId) map.set(r.fromUserId, 'incoming');
    }
    for (const r of sentRequests) {
      if (r?.toUserId && !map.has(r.toUserId)) map.set(r.toUserId, 'sent');
    }
    return map;
  }, [incomingRequests, sentRequests]);

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
              expertise?: Array<string | null> | null;
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
            expertise: normalizeExpertiseTags(item.expertise),
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
    const tags = expertiseFilter;
    if (!q && !tags.length) return profiles;
    return profiles.filter((p) => {
      if (tags.length && !tags.some((tag) => p.expertise.includes(tag))) return false;
      if (!q) return true;
      const fullName = getFullName(p).toLowerCase();
      const company = (p.company || '').toLowerCase();
      const title = (p.jobTitle || '').toLowerCase();
      return fullName.includes(q) || company.includes(q) || title.includes(q);
    });
  }, [profiles, search, expertiseFilter]);

  const toggleExpertiseFilter = useCallback((tag: string) => {
    setExpertiseFilter((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  }, []);

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

  // FlatList avoids Android SectionList sticky/footer layout thrash. Letter rows are
  // normal items; iOS still pins them via stickyHeaderIndices.
  const flatRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = [];
    for (const section of sections) {
      rows.push({ kind: 'header', key: `h:${section.title}`, title: section.title });
      section.data.forEach((profile, index) => {
        rows.push({
          kind: 'user',
          key: profile.profileId,
          profile,
          showDivider: index < section.data.length - 1,
        });
      });
    }
    return rows;
  }, [sections]);

  const stickyHeaderIndices = useMemo(() => {
    if (Platform.OS !== 'ios') return undefined;
    const indices: number[] = [];
    flatRows.forEach((row, index) => {
      if (row.kind === 'header') indices.push(index);
    });
    return indices;
  }, [flatRows]);

  const flatLayout = useMemo(() => {
    const lengths: number[] = [];
    const offsets: number[] = [];
    let offset = 0;
    for (const row of flatRows) {
      const length = rowHeight(row);
      lengths.push(length);
      offsets.push(offset);
      offset += length;
    }
    return { lengths, offsets };
  }, [flatRows]);

  const getItemLayout = useCallback(
    (_data: ArrayLike<FlatRow> | null | undefined, index: number) => ({
      length: flatLayout.lengths[index] ?? APP_USER_ROW_HEIGHT,
      offset: flatLayout.offsets[index] ?? 0,
      index,
    }),
    [flatLayout]
  );

  // Resolve avatars once per profile id; flush after interactions so scroll doesn't jank.
  useEffect(() => {
    let cancelled = false;
    const unresolved = profiles.filter(
      (p) => p.profilePicture && !avatarRequestedRef.current.has(p.profileId)
    );
    if (!unresolved.length) return;

    for (const p of unresolved) {
      avatarRequestedRef.current.add(p.profileId);
    }

    async function loadAvatarUris() {
      const updates: Record<string, string | null> = {};
      // Small batches — Android image decode + setState mid-scroll was flickering the list.
      const chunkSize = Platform.OS === 'android' ? 8 : 24;
      for (let i = 0; i < unresolved.length; i += chunkSize) {
        if (cancelled) return;
        const chunk = unresolved.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (p) => {
            updates[p.profileId] = await resolveProfilePictureUri(p.profilePicture);
          })
        );
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve());
        });
        if (cancelled) return;
        setProfilePictureUris((prev) => ({ ...prev, ...updates }));
      }
    }

    loadAvatarUris();
    return () => {
      cancelled = true;
    };
  }, [profiles]);

  const onPressProfile = useCallback((profileId: string) => {
    router.push({
      pathname: '/(main)/community/[id]',
      params: { id: profileId },
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: FlatRow }) => {
      if (item.kind === 'header') {
        return (
          <View style={[styles.sectionHeader, { paddingHorizontal: contentInset }]}>
            <View style={styles.sectionHeaderRule} />
            <Text style={styles.sectionHeaderText}>{item.title}</Text>
          </View>
        );
      }

      const profile = item.profile;
      const name = getFullName(profile) || '(No name)';
      const subtitle = profile.company || '';
      const fav = !!favoriteContactIds[profile.profileId];
      const pending = !!pendingContactIds[profile.profileId];
      const isSelf = !!currentProfileId && currentProfileId === profile.profileId;
      const hasNote = profileIdsWithNotes.has(profile.profileId);

      return (
        <View style={styles.userCell}>
          <AppUserRow
            profileId={profile.profileId}
            userId={profile.userId}
            name={name}
            subtitle={subtitle}
            avatarUri={profilePictureUris[profile.profileId] ?? null}
            initials={`${normalizeNamePart(profile.firstName).slice(0, 1)}${normalizeNamePart(profile.lastName).slice(0, 1)}`.toUpperCase()}
            isSelf={isSelf}
            hasNote={hasNote}
            currentAppUserProfileId={currentProfileId}
            favorite={fav}
            pendingFavorite={pending}
            contactRequestState={contactRequestByUserId.get(profile.userId) ?? null}
            onPressProfile={onPressProfile}
            style={{ paddingHorizontal: contentInset }}
          />
          {item.showDivider ? <View style={styles.rowDivider} /> : null}
        </View>
      );
    },
    [
      favoriteContactIds,
      pendingContactIds,
      currentProfileId,
      profileIdsWithNotes,
      profilePictureUris,
      contactRequestByUserId,
      onPressProfile,
      contentInset,
    ]
  );

  const listExtraData = useMemo(
    () => ({
      favoriteContactIds,
      pendingContactIds,
      profilePictureUris,
      contactRequestByUserId,
      profileIdsWithNotes,
    }),
    [
      favoriteContactIds,
      pendingContactIds,
      profilePictureUris,
      contactRequestByUserId,
      profileIdsWithNotes,
    ]
  );

  if (loading) {
    return <RiveLoader />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.searchRow, { marginHorizontal: contentInset }]}>
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
        <Pressable
          onPress={() => setExpertisePickerOpen(true)}
          style={({ pressed }) => [
            styles.filterBtn,
            expertiseFilter.length ? styles.filterBtnActive : null,
            pressed && styles.filterBtnPressed,
          ]}
          accessibilityRole='button'
          accessibilityLabel='Filter by area of expertise'
        >
          <Ionicons
            name={expertiseFilter.length ? 'filter' : 'filter-outline'}
            size={22}
            color={expertiseFilter.length ? '#fff' : '#4b5563'}
          />
          {expertiseFilter.length ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{expertiseFilter.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {expertiseFilter.length ? (
        <View style={[styles.filterBar, { marginHorizontal: contentInset }]}>
          <ExpertiseChips
            tags={expertiseFilter}
            onRemove={toggleExpertiseFilter}
            maxVisible={3}
            onPressMore={() => setExpertisePickerOpen(true)}
          />
          <View style={styles.filterMeta}>
            <Text style={styles.filterMetaText}>
              {filtered.length} {filtered.length === 1 ? 'person' : 'people'} with matching expertise
            </Text>
            <Pressable
              onPress={() => setExpertiseFilter([])}
              hitSlop={8}
              accessibilityRole='button'
              accessibilityLabel='Clear expertise filter'
            >
              <Text style={styles.clearFilterText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ExpertisePickerModal
        visible={expertisePickerOpen}
        selected={expertiseFilter}
        onSelect={toggleExpertiseFilter}
        onClose={() => setExpertisePickerOpen(false)}
        mode='filter'
      />

      {error ? (
        <View style={[styles.errorBox, { paddingHorizontal: contentInset }]}>
          <Text style={styles.errorTitle}>Couldn’t load community</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={flatRows}
          keyExtractor={(item) => item.key}
          stickyHeaderIndices={stickyHeaderIndices}
          refreshing={refreshing}
          onRefresh={onRefresh}
          getItemLayout={getItemLayout}
          extraData={listExtraData}
          initialNumToRender={16}
          maxToRenderPerBatch={Platform.OS === 'android' ? 8 : 12}
          windowSize={Platform.OS === 'android' ? 5 : 7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={false}
          contentContainerStyle={{ paddingBottom: tabScrollPad }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>
                {search.trim() || expertiseFilter.length
                  ? 'No matches.'
                  : 'No community members found.'}
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', width: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: '#6b7280' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filterBtnActive: {
    backgroundColor: autopackColors.apBlue,
  },
  filterBtnPressed: {
    opacity: 0.85,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: autopackColors.apYellow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  filterBar: {
    marginBottom: 8,
  },
  filterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
    marginBottom: 4,
  },
  filterMetaText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  clearFilterText: {
    color: autopackColors.apBlue,
    fontSize: 13,
    fontWeight: '700',
  },

  sectionHeader: {
    height: SECTION_HEADER_HEIGHT,
    backgroundColor: '#fff',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sectionHeaderRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: DIVIDER_HEIGHT,
    backgroundColor: '#e5e7eb',
  },
  sectionHeaderText: { fontWeight: '800', color: '#111827' },

  userCell: {
    height: APP_USER_ROW_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  rowDivider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: DIVIDER_HEIGHT,
    backgroundColor: '#e5e7eb',
  },

  empty: { padding: 18 },

  errorBox: { paddingVertical: 16 },
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
