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
import {
  apsAppUserContactsByUserId,
  apsAppUserFavoriteContactsByUserProfileIdAndCreatedAt,
  apsAppUserFavoriteExhibitorsByUserProfileIdAndCreatedAt,
  apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt,
  apsAppUserFavoriteSpeakersByUserProfileIdAndCreatedAt,
  apsAppUserFavoriteSponsorsByUserProfileIdAndCreatedAt,
  apsAppExhibitorProfilesByCompanyId,
} from '../../graphql/queries';
import { APS_ID } from '../../config/apsConfig';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { autopackColors } from '../../theme';
import {
  graphqlApiKeyClient,
  graphqlAuthClient,
} from '../../utils/graphqlClient';

type FavoriteKind = 'exhibitor' | 'speaker' | 'sponsor' | 'session' | 'contact';

type FavoriteRow = {
  id: string;
  kind: FavoriteKind;
  title: string;
  subtitle?: string;
  navPath?: string;
  favoriteRecordId?: string;
  legacyContactRecordId?: string;
  isEmpty?: boolean;
};

type FavoriteSection = { title: string; data: FavoriteRow[] };
type FavoriteTheme = {
  headerBg: string;
  headerBorder: string;
  iconBg: string;
  iconColor: string;
};

const getExhibitorMinimal = /* GraphQL */ `
  query GetExhibitorMinimal($id: ID!) {
    getApsAppExhibitorProfile(id: $id) {
      id
      boothNumber
      company {
        id
        name
      }
    }
  }
`;

const getSpeakerMinimal = /* GraphQL */ `
  query GetSpeakerMinimal($id: ID!) {
    getAPSSpeaker(id: $id) {
      id
      presentationTitle
      profile {
        id
        firstName
        lastName
        company
        jobTitle
      }
    }
  }
`;

const getSponsorMinimal = /* GraphQL */ `
  query GetSponsorMinimal($id: ID!) {
    getApsSponsor(id: $id) {
      id
      type
      profile {
        id
        boothNumber
      }
      company {
        id
        name
      }
    }
  }
`;

const getSessionMinimal = /* GraphQL */ `
  query GetSessionMinimal($id: ID!) {
    getApsAppSession(id: $id) {
      id
      title
      date
      startTime
      location
    }
  }
`;

const getContactMinimal = /* GraphQL */ `
  query GetContactMinimal($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      firstName
      lastName
      company
      jobTitle
    }
  }
`;

const deleteFavoriteExhibitor = /* GraphQL */ `
  mutation DeleteApsAppUserFavoriteExhibitor(
    $input: DeleteApsAppUserFavoriteExhibitorInput!
  ) {
    deleteApsAppUserFavoriteExhibitor(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteSpeaker = /* GraphQL */ `
  mutation DeleteApsAppUserFavoriteSpeaker(
    $input: DeleteApsAppUserFavoriteSpeakerInput!
  ) {
    deleteApsAppUserFavoriteSpeaker(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteSponsor = /* GraphQL */ `
  mutation DeleteApsAppUserFavoriteSponsor(
    $input: DeleteApsAppUserFavoriteSponsorInput!
  ) {
    deleteApsAppUserFavoriteSponsor(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteSession = /* GraphQL */ `
  mutation DeleteApsAppUserFavoriteSession(
    $input: DeleteApsAppUserFavoriteSessionInput!
  ) {
    deleteApsAppUserFavoriteSession(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteContact = /* GraphQL */ `
  mutation DeleteApsAppUserFavoriteContact(
    $input: DeleteApsAppUserFavoriteContactInput!
  ) {
    deleteApsAppUserFavoriteContact(input: $input) {
      id
      __typename
    }
  }
`;

const deleteLegacyContact = /* GraphQL */ `
  mutation DeleteApsAppUserContact($input: DeleteApsAppUserContactInput!) {
    deleteApsAppUserContact(input: $input) {
      id
      __typename
    }
  }
`;

function clean(v?: string | null) {
  return (v || '').trim();
}

function personName(first?: string | null, last?: string | null) {
  return [clean(first), clean(last)].filter(Boolean).join(' ').trim();
}

function kindTitle(kind: FavoriteKind) {
  switch (kind) {
    case 'exhibitor':
      return 'Exhibitors';
    case 'speaker':
      return 'Speakers';
    case 'sponsor':
      return 'Sponsors';
    case 'session':
      return 'Sessions';
    case 'contact':
      return 'Contacts';
  }
}

function kindOrder(kind: FavoriteKind) {
  switch (kind) {
    case 'exhibitor':
      return 0;
    case 'speaker':
      return 1;
    case 'sponsor':
      return 2;
    case 'session':
      return 3;
    case 'contact':
      return 4;
  }
}

function kindIcon(kind: FavoriteKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case 'exhibitor':
      return 'business-outline';
    case 'speaker':
      return 'mic-outline';
    case 'sponsor':
      return 'ribbon-outline';
    case 'session':
      return 'calendar-outline';
    case 'contact':
      return 'people-outline';
  }
}

function kindTheme(kind: FavoriteKind): FavoriteTheme {
  switch (kind) {
    case 'exhibitor':
      return { headerBg: '#ecfeff', headerBorder: '#a5f3fc', iconBg: '#cffafe', iconColor: '#0e7490' };
    case 'speaker':
      return { headerBg: '#f5f3ff', headerBorder: '#ddd6fe', iconBg: '#ede9fe', iconColor: '#6d28d9' };
    case 'sponsor':
      return { headerBg: '#fff7ed', headerBorder: '#fed7aa', iconBg: '#ffedd5', iconColor: '#c2410c' };
    case 'session':
      return { headerBg: '#eff6ff', headerBorder: '#bfdbfe', iconBg: '#dbeafe', iconColor: '#1d4ed8' };
    case 'contact':
      return { headerBg: '#ecfdf5', headerBorder: '#bbf7d0', iconBg: '#dcfce7', iconColor: '#15803d' };
  }
}

export default function FavoritesTool() {
  const currentAppUser = useCurrentAppUser();
  const currentProfileId =
    currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const currentUserId = currentAppUser?.id || null;

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FavoriteRow[]>([]);

  const load = useCallback(async () => {
    if (!currentProfileId) {
      setRows([]);
      setError('Missing profile id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [exResp, spResp, soResp, seResp, coResp, legacyContactsResp] =
        await Promise.all([
          graphqlAuthClient.graphql({
            query: apsAppUserFavoriteExhibitorsByUserProfileIdAndCreatedAt,
            variables: { userProfileId: currentProfileId, limit: 500 },
          }),
          graphqlAuthClient.graphql({
            query: apsAppUserFavoriteSpeakersByUserProfileIdAndCreatedAt,
            variables: { userProfileId: currentProfileId, limit: 500 },
          }),
          graphqlAuthClient.graphql({
            query: apsAppUserFavoriteSponsorsByUserProfileIdAndCreatedAt,
            variables: { userProfileId: currentProfileId, limit: 500 },
          }),
          graphqlAuthClient.graphql({
            query: apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt,
            variables: { userProfileId: currentProfileId, limit: 500 },
          }),
          graphqlAuthClient.graphql({
            query: apsAppUserFavoriteContactsByUserProfileIdAndCreatedAt,
            variables: { userProfileId: currentProfileId, limit: 500 },
          }),
          currentUserId
            ? graphqlApiKeyClient.graphql({
                query: apsAppUserContactsByUserId,
                variables: { userId: currentUserId, limit: 500 },
              })
            : Promise.resolve({ data: null as any }),
        ]);

      const exhibitorFavItems = (
        ((exResp.data as any)
          ?.apsAppUserFavoriteExhibitorsByUserProfileIdAndCreatedAt?.items ||
          []) as any[]
      ).filter(Boolean);
      const speakerFavItems = (
        ((spResp.data as any)
          ?.apsAppUserFavoriteSpeakersByUserProfileIdAndCreatedAt?.items ||
          []) as any[]
      ).filter(Boolean);
      const sponsorFavItems = (
        ((soResp.data as any)
          ?.apsAppUserFavoriteSponsorsByUserProfileIdAndCreatedAt?.items ||
          []) as any[]
      ).filter(Boolean);
      const sessionFavItems = (
        ((seResp.data as any)
          ?.apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt?.items ||
          []) as any[]
      ).filter(Boolean);
      const contactFavItems = (
        ((coResp.data as any)
          ?.apsAppUserFavoriteContactsByUserProfileIdAndCreatedAt?.items ||
          []) as any[]
      ).filter(Boolean);
      const legacyContactItems = (
        ((legacyContactsResp.data as any)?.apsAppUserContactsByUserId?.items ||
          []) as any[]
      ).filter(Boolean);

      const exhibitorFavoriteRecordByEntityId = new Map<string, string>();
      const speakerFavoriteRecordByEntityId = new Map<string, string>();
      const sponsorFavoriteRecordByEntityId = new Map<string, string>();
      const sessionFavoriteRecordByEntityId = new Map<string, string>();
      const contactFavoriteRecordByEntityId = new Map<string, string>();
      const legacyContactRecordByEntityId = new Map<string, string>();

      for (const item of exhibitorFavItems) {
        if (
          item?.id &&
          item?.exhibitorId &&
          !exhibitorFavoriteRecordByEntityId.has(item.exhibitorId)
        ) {
          exhibitorFavoriteRecordByEntityId.set(item.exhibitorId, item.id);
        }
      }
      for (const item of speakerFavItems) {
        if (
          item?.id &&
          item?.speakerId &&
          !speakerFavoriteRecordByEntityId.has(item.speakerId)
        ) {
          speakerFavoriteRecordByEntityId.set(item.speakerId, item.id);
        }
      }
      for (const item of sponsorFavItems) {
        if (
          item?.id &&
          item?.sponsorId &&
          !sponsorFavoriteRecordByEntityId.has(item.sponsorId)
        ) {
          sponsorFavoriteRecordByEntityId.set(item.sponsorId, item.id);
        }
      }
      for (const item of sessionFavItems) {
        if (
          item?.id &&
          item?.sessionId &&
          !sessionFavoriteRecordByEntityId.has(item.sessionId)
        ) {
          sessionFavoriteRecordByEntityId.set(item.sessionId, item.id);
        }
      }
      for (const item of contactFavItems) {
        if (
          item?.id &&
          item?.contactProfileId &&
          !contactFavoriteRecordByEntityId.has(item.contactProfileId)
        ) {
          contactFavoriteRecordByEntityId.set(item.contactProfileId, item.id);
        }
      }
      for (const item of legacyContactItems) {
        if (
          item?.id &&
          item?.contactId &&
          !legacyContactRecordByEntityId.has(item.contactId)
        ) {
          legacyContactRecordByEntityId.set(item.contactId, item.id);
        }
      }

      const exhibitorIds = [
        ...new Set(
          exhibitorFavItems.map((x) => x?.exhibitorId).filter(Boolean),
        ),
      ] as string[];
      const speakerIds = [
        ...new Set(speakerFavItems.map((x) => x?.speakerId).filter(Boolean)),
      ] as string[];
      const sponsorIds = [
        ...new Set(sponsorFavItems.map((x) => x?.sponsorId).filter(Boolean)),
      ] as string[];
      const sessionIds = [
        ...new Set(sessionFavItems.map((x) => x?.sessionId).filter(Boolean)),
      ] as string[];
      const contactIds = [
        ...new Set(
          [...contactFavItems, ...legacyContactItems]
            .map((x) => x?.contactProfileId || x?.contactId)
            .filter(Boolean),
        ),
      ] as string[];

      const [exRows, spRows, soRows, seRows, coRows] = await Promise.all([
        Promise.all(
          exhibitorIds.map(async (id) => {
            try {
              const resp = await graphqlApiKeyClient.graphql({
                query: getExhibitorMinimal,
                variables: { id },
              });
              const item = (resp.data as any)?.getApsAppExhibitorProfile;
              if (!item?.id) return null;
              return {
                id: `exhibitor-${item.id}`,
                kind: 'exhibitor' as const,
                title: clean(item?.company?.name) || 'Exhibitor',
                subtitle: item?.boothNumber
                  ? `Booth ${item.boothNumber}`
                  : undefined,
                navPath: `/(main)/hub/exhibitors/${item.id}`,
                favoriteRecordId: exhibitorFavoriteRecordByEntityId.get(
                  item.id,
                ),
              };
            } catch {
              return null;
            }
          }),
        ),
        Promise.all(
          speakerIds.map(async (id) => {
            try {
              const resp = await graphqlApiKeyClient.graphql({
                query: getSpeakerMinimal,
                variables: { id },
              });
              const item = (resp.data as any)?.getAPSSpeaker;
              if (!item?.id) return null;
              const title =
                personName(item?.profile?.firstName, item?.profile?.lastName) ||
                clean(item?.presentationTitle) ||
                'Speaker';
              const subtitle = [
                clean(item?.profile?.jobTitle),
                clean(item?.profile?.company),
              ]
                .filter(Boolean)
                .join(' • ');
              return {
                id: `speaker-${item.id}`,
                kind: 'speaker' as const,
                title,
                subtitle: subtitle || undefined,
                navPath: `/(main)/hub/speakers/${item.id}`,
                favoriteRecordId: speakerFavoriteRecordByEntityId.get(item.id),
              };
            } catch {
              return null;
            }
          }),
        ),
        Promise.all(
          sponsorIds.map(async (id) => {
            try {
              const resp = await graphqlApiKeyClient.graphql({
                query: getSponsorMinimal,
                variables: { id },
              });
              const item = (resp.data as any)?.getApsSponsor;
              if (!item?.id) return null;
              let boothNumber: string | null = item?.profile?.boothNumber || null;
              if (item?.type === 'BOOTH' && !boothNumber && item?.company?.id) {
                try {
                  const boothResp = await graphqlApiKeyClient.graphql({
                    query: apsAppExhibitorProfilesByCompanyId,
                    variables: {
                      companyId: item.company.id,
                      filter: { eventId: { eq: APS_ID } },
                      limit: 1,
                    },
                  });
                  const boothData = boothResp.data as any;
                  boothNumber =
                    boothData?.apsAppExhibitorProfilesByCompanyId?.items?.find((x: any) => !!x?.id)
                      ?.boothNumber || null;
                } catch {
                  boothNumber = null;
                }
              }
              return {
                id: `sponsor-${item.id}`,
                kind: 'sponsor' as const,
                title: clean(item?.company?.name) || 'Sponsor',
                subtitle:
                  item?.type === 'BOOTH' && boothNumber
                    ? `Booth ${boothNumber}`
                    : clean(item?.type) || undefined,
                navPath: `/(main)/hub/sponsors/${item.id}`,
                favoriteRecordId: sponsorFavoriteRecordByEntityId.get(item.id),
              };
            } catch {
              return null;
            }
          }),
        ),
        Promise.all(
          sessionIds.map(async (id) => {
            try {
              const resp = await graphqlApiKeyClient.graphql({
                query: getSessionMinimal,
                variables: { id },
              });
              const item = (resp.data as any)?.getApsAppSession;
              if (!item?.id) return null;
              const subtitle = [
                clean(item?.date),
                clean(item?.startTime),
                clean(item?.location),
              ]
                .filter(Boolean)
                .join(' • ');
              return {
                id: `session-${item.id}`,
                kind: 'session' as const,
                title: clean(item?.title) || 'Session',
                subtitle: subtitle || undefined,
                navPath: `/(main)/agenda/${item.id}`,
                favoriteRecordId: sessionFavoriteRecordByEntityId.get(item.id),
              };
            } catch {
              return null;
            }
          }),
        ),
        Promise.all(
          contactIds.map(async (id) => {
            try {
              const resp = await graphqlApiKeyClient.graphql({
                query: getContactMinimal,
                variables: { id },
              });
              const item = (resp.data as any)?.getApsAppUserProfile;
              if (!item?.id) return null;
              const title =
                personName(item?.firstName, item?.lastName) || 'Contact';
              const subtitle = [clean(item?.jobTitle), clean(item?.company)]
                .filter(Boolean)
                .join(' • ');
              return {
                id: `contact-${item.id}`,
                kind: 'contact' as const,
                title,
                subtitle: subtitle || undefined,
                navPath: `/(main)/hub/community/${item.id}`,
                favoriteRecordId: contactFavoriteRecordByEntityId.get(item.id),
                legacyContactRecordId: legacyContactRecordByEntityId.get(
                  item.id,
                ),
              };
            } catch {
              return null;
            }
          }),
        ),
      ]);

      const combined = [
        ...exRows,
        ...spRows,
        ...soRows,
        ...seRows,
        ...coRows,
      ].filter((x): x is FavoriteRow => !!x);
      combined.sort((a, b) => {
        const byKind = kindOrder(a.kind) - kindOrder(b.kind);
        if (byKind !== 0) return byKind;
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      });
      setRows(combined);
    } catch (e: any) {
      setError(e?.message || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [currentProfileId]);

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
    const q = clean(search).toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay =
        `${row.title} ${row.subtitle || ''} ${kindTitle(row.kind)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  const sections = useMemo(() => {
    const allKinds: FavoriteKind[] = [
      'exhibitor',
      'speaker',
      'sponsor',
      'session',
      'contact',
    ];
    const map = new Map<FavoriteKind, FavoriteRow[]>(
      allKinds.map((k) => [k, [] as FavoriteRow[]]),
    );
    for (const row of filtered) {
      if (!map.has(row.kind)) map.set(row.kind, []);
      map.get(row.kind)!.push(row);
    }
    return allKinds.map((kind) => {
      const data = map.get(kind) || [];
      if (data.length) return { title: kindTitle(kind), data };
      return {
        title: kindTitle(kind),
        data: [
          {
            id: `${kind}-empty`,
            kind,
            title: clean(search)
              ? 'No matches in this category.'
              : 'None selected yet.',
            isEmpty: true,
          },
        ],
      };
    }) as FavoriteSection[];
  }, [filtered]);

  async function removeFavorite(item: FavoriteRow) {
    if (item.isEmpty || removingId) return;
    setRemovingId(item.id);
    try {
      if (item.kind === 'exhibitor' && item.favoriteRecordId) {
        await graphqlAuthClient.graphql({
          query: deleteFavoriteExhibitor,
          variables: { input: { id: item.favoriteRecordId } },
        });
      } else if (item.kind === 'speaker' && item.favoriteRecordId) {
        await graphqlAuthClient.graphql({
          query: deleteFavoriteSpeaker,
          variables: { input: { id: item.favoriteRecordId } },
        });
      } else if (item.kind === 'sponsor' && item.favoriteRecordId) {
        await graphqlAuthClient.graphql({
          query: deleteFavoriteSponsor,
          variables: { input: { id: item.favoriteRecordId } },
        });
      } else if (item.kind === 'session' && item.favoriteRecordId) {
        await graphqlAuthClient.graphql({
          query: deleteFavoriteSession,
          variables: { input: { id: item.favoriteRecordId } },
        });
      } else if (item.kind === 'contact') {
        if (item.favoriteRecordId) {
          await graphqlAuthClient.graphql({
            query: deleteFavoriteContact,
            variables: { input: { id: item.favoriteRecordId } },
          });
        }
        if (item.legacyContactRecordId) {
          await graphqlAuthClient.graphql({
            query: deleteLegacyContact,
            variables: { input: { id: item.legacyContactRecordId } },
          });
        }
      }
      setRows((prev) => prev.filter((r) => r.id !== item.id));
    } catch (e: any) {
      setError(e?.message || 'Failed removing favorite');
    } finally {
      setRemovingId(null);
    }
  }

  function addRouteForKind(kind: FavoriteKind) {
    switch (kind) {
      case 'exhibitor':
        return '/(main)/hub/exhibitors';
      case 'speaker':
        return '/(main)/hub/speakers';
      case 'sponsor':
        return '/(main)/hub/sponsors';
      case 'session':
        return '/(main)/agenda';
      case 'contact':
        return '/(main)/community';
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading favorites...</Text>
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
          placeholder='Search favorites'
          placeholderTextColor='#9ca3af'
          style={styles.searchInput}
          autoCapitalize='none'
          autoCorrect={false}
          clearButtonMode='while-editing'
        />
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn’t load favorites</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderSectionHeader={({ section }) => {
            const sectionKind = section.data[0]?.kind || 'contact';
            const theme = kindTheme(sectionKind);
            return (
              <View
                style={[
                  styles.sectionHeader,
                  { backgroundColor: theme.headerBg, borderColor: theme.headerBorder },
                ]}
              >
                <View style={styles.sectionHeaderLeft}>
                  <View
                    style={[styles.sectionIconWrap, { backgroundColor: theme.iconBg }]}
                  >
                    <Ionicons
                      name={kindIcon(sectionKind)}
                      size={14}
                      color={theme.iconColor}
                    />
                  </View>
                  <Text style={styles.sectionHeaderText}>{section.title}</Text>
                </View>
                <Pressable onPress={() => router.push(addRouteForKind(sectionKind) as any)}>
                  <Text style={styles.addLink}>Add</Text>
                </Pressable>
              </View>
            );
          }}
          renderItem={({ item }) =>
            item.isEmpty ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyRowText}>{item.title}</Text>
              </View>
            ) : (
              <View style={styles.row}>
                <Pressable
                  style={styles.rowBody}
                  onPress={() => {
                    if (!item.navPath) return;
                    router.push(item.navPath as any);
                  }}
                >
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  {!!item.subtitle && (
                    <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                  )}
                </Pressable>
                {!!item.navPath && (
                  <Pressable
                    onPress={() => router.push(item.navPath as any)}
                    style={styles.rowIconBtn}
                  >
                    <Ionicons
                      name='chevron-forward'
                      size={18}
                      color='#9ca3af'
                    />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => removeFavorite(item)}
                  disabled={removingId === item.id}
                  style={styles.rowIconBtn}
                >
                  <Ionicons
                    name={removingId === item.id ? 'hourglass-outline' : 'star'}
                    size={17}
                    color={removingId === item.id ? '#9ca3af' : '#f59e0b'}
                  />
                </Pressable>
              </View>
            )
          }
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>
                {clean(search) ? 'No matches.' : 'No favorites yet.'}
              </Text>
            </View>
          }
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { fontWeight: '800', color: '#111827' },
  addLink: { color: autopackColors.apBlue, fontWeight: '700', fontSize: 12 },
  row: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: '#111827', fontWeight: '700' },
  rowSubtitle: { color: '#6b7280', fontSize: 13 },
  rowIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 12,
  },
  empty: { padding: 18 },
  emptyRow: { paddingHorizontal: 12, paddingVertical: 10 },
  emptyRowText: { color: '#6b7280' },
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
