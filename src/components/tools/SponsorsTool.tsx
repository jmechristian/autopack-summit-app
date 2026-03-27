import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { APS_ID } from '../../config/apsConfig';
import { apsAppExhibitorProfilesByCompanyId } from '../../graphql/queries';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { apsAppUserFavoriteSponsorsByUserProfileIdAndCreatedAt } from '../../graphql/queries';
import { autopackColors } from '../../theme';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../utils/graphqlClient';
import { resolveProfilePictureUri } from '../../utils/storageUtils';

type SponsorsToolProps = {
  detailBasePath: '/(main)/engage/sponsors' | '/(main)/hub/sponsors';
};

type SponsorItem = {
  id: string;
  companyName: string;
  companyId?: string | null;
  companyLogo?: string | null;
  type?: string | null;
  boothNumber?: string | null;
};

type SponsorSection = { title: string; data: SponsorItem[] };

const sponsorsByEventWithCompany = /* GraphQL */ `
  query SponsorsByEventWithCompany($eventId: ID!, $limit: Int, $nextToken: String) {
    apsSponsorsByEventId(eventId: $eventId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        type
        company {
          id
          name
          logo
          __typename
        }
        profile {
          boothNumber
          __typename
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

const createFavoriteSponsor = /* GraphQL */ `
  mutation CreateFavoriteSponsor($input: CreateApsAppUserFavoriteSponsorInput!) {
    createApsAppUserFavoriteSponsor(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteSponsor = /* GraphQL */ `
  mutation DeleteFavoriteSponsor($input: DeleteApsAppUserFavoriteSponsorInput!) {
    deleteApsAppUserFavoriteSponsor(input: $input) {
      id
      __typename
    }
  }
`;

function normalize(v?: string | null) {
  return (v || '').trim();
}

function sectionKey(item: SponsorItem) {
  const source = normalize(item.companyName);
  const first = source ? source[0].toUpperCase() : '#';
  return /[A-Z]/.test(first) ? first : '#';
}

export default function SponsorsTool({ detailBasePath }: SponsorsToolProps) {
  const currentAppUser = useCurrentAppUser();
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SponsorItem[]>([]);
  const [logoUris, setLogoUris] = useState<Record<string, string | null>>({});

  const [favoriteRecordIdBySponsorId, setFavoriteRecordIdBySponsorId] = useState<Record<string, string>>({});
  const [busyBySponsorId, setBusyBySponsorId] = useState<Record<string, boolean>>({});

  const loadSponsors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: SponsorItem[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlApiKeyClient.graphql({
          query: sponsorsByEventWithCompany,
          variables: { eventId: APS_ID, limit: 200, nextToken },
        });
        const data = resp.data as any;
        const batch: Array<any> = data?.apsSponsorsByEventId?.items || [];
        for (const row of batch) {
          if (!row?.id) continue;
          all.push({
            id: row.id,
            companyName: normalize(row?.company?.name) || 'Sponsor',
            companyId: row?.company?.id || null,
            companyLogo: row?.company?.logo || null,
            type: row?.type || null,
            boothNumber: row?.profile?.boothNumber || null,
          });
        }
        nextToken = data?.apsSponsorsByEventId?.nextToken;
      } while (nextToken);

      // For booth sponsors, we sometimes need an extra lookup to the exhibitor profile
      // to obtain `boothNumber` (and prove the exhibitor profile exists for the company).
      const boothCompanyIds = Array.from(
        new Set(
          all
            .filter((x) => x.type === 'BOOTH' && x.companyId && !x.boothNumber)
            .map((x) => x.companyId as string),
        ),
      );

      if (boothCompanyIds.length) {
        const boothNumberByCompanyId = new Map<string, string | null>();
        await Promise.all(
          boothCompanyIds.map(async (companyId) => {
            try {
              const resp = await graphqlApiKeyClient.graphql({
                query: apsAppExhibitorProfilesByCompanyId,
                variables: {
                  companyId,
                  filter: { eventId: { eq: APS_ID } },
                  limit: 1,
                },
              });
              const data = resp.data as any;
              const first = data?.apsAppExhibitorProfilesByCompanyId?.items?.find((x: any) => !!x?.id);
              boothNumberByCompanyId.set(companyId, first?.boothNumber || null);
            } catch {
              boothNumberByCompanyId.set(companyId, null);
            }
          }),
        );

        for (const sponsor of all) {
          if (sponsor.type !== 'BOOTH' || !sponsor.companyId) continue;
          if (sponsor.boothNumber) continue;
          sponsor.boothNumber = boothNumberByCompanyId.get(sponsor.companyId) || null;
        }
      }

      all.sort((a, b) => normalize(a.companyName).toLowerCase().localeCompare(normalize(b.companyName).toLowerCase()));
      setItems(all);
    } catch (e: any) {
      setError(e?.message || 'Failed to load sponsors');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    if (!currentProfileId) {
      setFavoriteRecordIdBySponsorId({});
      return;
    }
    try {
      const resp = await graphqlAuthClient.graphql({
        query: apsAppUserFavoriteSponsorsByUserProfileIdAndCreatedAt,
        variables: { userProfileId: currentProfileId, limit: 1000 },
      });
      const data = resp.data as any;
      const map: Record<string, string> = {};
      for (const row of data?.apsAppUserFavoriteSponsorsByUserProfileIdAndCreatedAt?.items || []) {
        if (!row?.id || !row?.sponsorId) continue;
        if (!map[row.sponsorId]) map[row.sponsorId] = row.id;
      }
      setFavoriteRecordIdBySponsorId(map);
    } catch {
      setFavoriteRecordIdBySponsorId({});
    }
  }, [currentProfileId]);

  useEffect(() => {
    loadSponsors();
  }, [loadSponsors]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      return () => {};
    }, [loadFavorites]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadSponsors(), loadFavorites()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadFavorites, loadSponsors]);

  const filtered = useMemo(() => {
    const q = normalize(search).toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const name = normalize(item.companyName).toLowerCase();
      const type = normalize(item.type).toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [items, search]);

  const sections: SponsorSection[] = useMemo(() => {
    const map = new Map<string, SponsorItem[]>();
    for (const item of filtered) {
      const key = sectionKey(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
    return keys.map((key) => ({ title: key, data: map.get(key)! }));
  }, [filtered]);

  useEffect(() => {
    let cancelled = false;
    const unresolved = items.filter((item) => item.companyLogo && logoUris[item.id] === undefined);
    if (!unresolved.length) return;

    async function loadLogoUris() {
      const updates: Record<string, string | null> = {};
      await Promise.all(
        unresolved.map(async (item) => {
          updates[item.id] = await resolveProfilePictureUri(item.companyLogo);
        }),
      );
      if (!cancelled && Object.keys(updates).length) {
        setLogoUris((prev) => ({ ...prev, ...updates }));
      }
    }

    loadLogoUris();
    return () => {
      cancelled = true;
    };
  }, [items, logoUris]);

  const toggleFavorite = useCallback(
    async (sponsorId: string) => {
      if (!currentProfileId || busyBySponsorId[sponsorId]) return;
      const existingId = favoriteRecordIdBySponsorId[sponsorId];
      setBusyBySponsorId((prev) => ({ ...prev, [sponsorId]: true }));
      try {
        if (existingId) {
          setFavoriteRecordIdBySponsorId((prev) => {
            const copy = { ...prev };
            delete copy[sponsorId];
            return copy;
          });
          await graphqlAuthClient.graphql({
            query: deleteFavoriteSponsor,
            variables: { input: { id: existingId } },
          });
        } else {
          const favoriteKey = `so:${APS_ID}|u:${currentProfileId}|x:${sponsorId}`;
          const resp = await graphqlAuthClient.graphql({
            query: createFavoriteSponsor,
            variables: {
              input: {
                userProfileId: currentProfileId,
                sponsorId,
                eventId: APS_ID,
                favoriteKey,
              },
            },
          });
          const data = resp.data as any;
          const createdId = data?.createApsAppUserFavoriteSponsor?.id || null;
          if (createdId) {
            setFavoriteRecordIdBySponsorId((prev) => ({ ...prev, [sponsorId]: createdId }));
          } else {
            await loadFavorites();
          }
        }
      } catch {
        await loadFavorites();
      } finally {
        setBusyBySponsorId((prev) => {
          const copy = { ...prev };
          delete copy[sponsorId];
          return copy;
        });
      }
    },
    [busyBySponsorId, currentProfileId, favoriteRecordIdBySponsorId, loadFavorites],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading sponsors...</Text>
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
          placeholder='Search by sponsor or type'
          placeholderTextColor='#9ca3af'
          style={styles.searchInput}
          autoCapitalize='none'
          autoCorrect={false}
          clearButtonMode='while-editing'
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn’t load sponsors</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={loadSponsors}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>{search.trim() ? 'No matches.' : 'No sponsors found.'}</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isBooth = item.type === 'BOOTH';
            const subtitle =
              isBooth && item.boothNumber
                ? `Booth ${item.boothNumber}`
                : normalize(item.type);
            const logoUri = logoUris[item.id] || null;
            const isFavorite = !!favoriteRecordIdBySponsorId[item.id];
            const pending = !!busyBySponsorId[item.id];
            return (
              <View style={styles.row}>
                <Pressable
                  style={styles.rowMainPress}
                  onPress={() =>
                    router.push({
                      pathname: `${detailBasePath}/[id]`,
                      params: { id: item.id },
                    })
                  }
                >
                  <View style={styles.logoWrap}>
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode='contain' />
                    ) : (
                      <Text style={styles.logoFallback}>{normalize(item.companyName).slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{item.companyName}</Text>
                    {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
                  </View>
                </Pressable>
                <Pressable onPress={() => toggleFavorite(item.id)} style={styles.iconBtn} disabled={pending || !currentProfileId}>
                  <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={18} color={isFavorite ? '#f59e0b' : '#6b7280'} />
                </Pressable>
                <Ionicons name='chevron-forward' size={18} color='#9ca3af' />
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
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowMainPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  logoImg: { width: 48, height: 48 },
  logoFallback: { fontWeight: '900', color: '#111827', fontSize: 18 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: '#111827', fontWeight: '800' },
  rowSubtitle: { color: '#6b7280', fontSize: 13 },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb', marginLeft: 12 },
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

