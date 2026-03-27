import { Ionicons } from '@expo/vector-icons';
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
import { autopackColors } from '../../theme';
import { graphqlApiKeyClient } from '../../utils/graphqlClient';
import { resolveProfilePictureUri } from '../../utils/storageUtils';

type ExhibitorsToolProps = {
  detailBasePath: '/(main)/engage/exhibitors' | '/(main)/hub/exhibitors';
};

type ExhibitorItem = {
  id: string;
  companyName: string;
  companyLogo?: string | null;
  boothNumber?: string | null;
};

type ExhibitorSection = { title: string; data: ExhibitorItem[] };

const exhibitorsByEventWithCompany = /* GraphQL */ `
  query ExhibitorsByEventWithCompany($eventId: ID!, $limit: Int, $nextToken: String) {
    apsAppExhibitorProfilesByEventId(eventId: $eventId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        boothNumber
        company {
          id
          name
          logo
          __typename
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

function normalize(v?: string | null) {
  return (v || '').trim();
}

function sectionKey(item: ExhibitorItem) {
  const source = normalize(item.companyName);
  const first = source ? source[0].toUpperCase() : '#';
  return /[A-Z]/.test(first) ? first : '#';
}

export default function ExhibitorsTool({ detailBasePath }: ExhibitorsToolProps) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ExhibitorItem[]>([]);
  const [logoUris, setLogoUris] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: ExhibitorItem[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlApiKeyClient.graphql({
          query: exhibitorsByEventWithCompany,
          variables: { eventId: APS_ID, limit: 200, nextToken },
        });
        const data = resp.data as {
          apsAppExhibitorProfilesByEventId?: {
            items?: ({
              id?: string | null;
              boothNumber?: string | null;
              company?: { name?: string | null; logo?: string | null } | null;
            } | null)[];
            nextToken?: string | null;
          };
        };

        const batch = data.apsAppExhibitorProfilesByEventId?.items || [];
        for (const row of batch) {
          const id = row?.id;
          if (!id) continue;
          all.push({
            id,
            companyName: normalize(row?.company?.name) || 'Exhibitor',
            companyLogo: row?.company?.logo || null,
            boothNumber: row?.boothNumber || null,
          });
        }
        nextToken = data.apsAppExhibitorProfilesByEventId?.nextToken;
      } while (nextToken);

      all.sort((a, b) =>
        normalize(a.companyName).toLowerCase().localeCompare(normalize(b.companyName).toLowerCase())
      );
      setItems(all);
    } catch (e: any) {
      console.error('Error loading exhibitors:', e);
      setError(e?.message || 'Failed to load exhibitors');
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
    const q = normalize(search).toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const name = normalize(item.companyName).toLowerCase();
      const booth = normalize(item.boothNumber).toLowerCase();
      return name.includes(q) || booth.includes(q);
    });
  }, [items, search]);

  const sections: ExhibitorSection[] = useMemo(() => {
    const map = new Map<string, ExhibitorItem[]>();
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
        })
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading exhibitors...</Text>
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
          placeholder='Search by company or booth'
          placeholderTextColor='#9ca3af'
          style={styles.searchInput}
          autoCapitalize='none'
          autoCorrect={false}
          clearButtonMode='while-editing'
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn’t load exhibitors</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
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
              <Text style={styles.muted}>{search.trim() ? 'No matches.' : 'No exhibitors found.'}</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const subtitle = item.boothNumber ? `Booth ${item.boothNumber}` : '';
            const logoUri = logoUris[item.id] || null;
            return (
              <Pressable
                style={styles.row}
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
                <Ionicons name='chevron-forward' size={18} color='#9ca3af' />
              </Pressable>
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
    minHeight: 70,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 42, height: 42 },
  logoFallback: { color: '#1f2937', fontWeight: '900', fontSize: 16 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '700', color: '#111827' },
  rowSubtitle: { color: '#6b7280', fontSize: 13 },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 66,
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
