import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { APS_ID } from '../../config/apsConfig';
import { autopackColors } from '../../theme';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../utils/graphqlClient';
import { resolveProfilePictureUri } from '../../utils/storageUtils';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import {
  apsAppUserFavoriteSpeakersByUserProfileIdAndCreatedAt,
} from '../../graphql/queries';

type SpeakersToolProps = {
  detailBasePath: '/(main)/engage/speakers' | '/(main)/hub/speakers';
};

type SpeakerItem = {
  id: string; // APSSpeaker.id
  presentationTitle?: string | null;
  profileId?: string | null;
  name: string;
  subtitle?: string;
  profilePicture?: string | null;
  favoriteRecordId?: string;
};

const speakersByEventIdWithProfiles = /* GraphQL */ `
  query SpeakersByEventIdWithProfiles($eventId: ID!, $limit: Int, $nextToken: String) {
    aPSSpeakersByEventId(eventId: $eventId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        presentationTitle
        profileId
        eventId
        profile {
          id
          firstName
          lastName
          company
          jobTitle
          profilePicture
          __typename
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

const createFavoriteSpeaker = /* GraphQL */ `
  mutation CreateFavoriteSpeaker($input: CreateApsAppUserFavoriteSpeakerInput!) {
    createApsAppUserFavoriteSpeaker(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteSpeaker = /* GraphQL */ `
  mutation DeleteFavoriteSpeaker($input: DeleteApsAppUserFavoriteSpeakerInput!) {
    deleteApsAppUserFavoriteSpeaker(input: $input) {
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

function speakerSubtitle(jobTitle?: string | null, company?: string | null) {
  const parts = [clean(jobTitle), clean(company)].filter(Boolean);
  return parts.length ? parts.join(' • ') : undefined;
}

export default function SpeakersTool({ detailBasePath }: SpeakersToolProps) {
  const currentAppUser = useCurrentAppUser();
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const currentUserId = currentAppUser?.id || null;

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [favoriteRecordIdBySpeakerId, setFavoriteRecordIdBySpeakerId] = useState<Record<string, string>>({});
  const [busySpeakerIds, setBusySpeakerIds] = useState<Record<string, boolean>>({});

  const loadSpeakers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: SpeakerItem[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlApiKeyClient.graphql({
          query: speakersByEventIdWithProfiles,
          variables: { eventId: APS_ID, limit: 200, nextToken },
        });

        const data = resp.data as any;
        const batch: Array<any> = data?.aPSSpeakersByEventId?.items || [];
        for (const row of batch) {
          const speakerId = row?.id;
          if (!speakerId) continue;
          const profile = row?.profile;
          const name = personName(profile?.firstName, profile?.lastName) || 'Speaker';
          all.push({
            id: speakerId,
            presentationTitle: row?.presentationTitle || null,
            profileId: row?.profileId || profile?.id || null,
            name,
            subtitle: speakerSubtitle(profile?.jobTitle, profile?.company),
            profilePicture: profile?.profilePicture || null,
          });
        }
        nextToken = data?.aPSSpeakersByEventId?.nextToken;
      } while (nextToken);

      // Sort by speaker last name (best-effort)
      all.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      setSpeakers(all);
    } catch (e: any) {
      setError(e?.message || 'Failed to load speakers');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    if (!currentProfileId) {
      setFavoriteRecordIdBySpeakerId({});
      return;
    }
    try {
      const resp = await graphqlAuthClient.graphql({
        query: apsAppUserFavoriteSpeakersByUserProfileIdAndCreatedAt,
        variables: { userProfileId: currentProfileId, limit: 1000 },
      });
      const data = resp.data as any;
      const next: Record<string, string> = {};
      const items: Array<any> = data?.apsAppUserFavoriteSpeakersByUserProfileIdAndCreatedAt?.items || [];
      for (const item of items) {
        if (!item?.id || !item?.speakerId) continue;
        if (!next[item.speakerId]) next[item.speakerId] = item.id;
      }
      setFavoriteRecordIdBySpeakerId(next);
    } catch {
      setFavoriteRecordIdBySpeakerId({});
    }
  }, [currentProfileId]);

  useEffect(() => {
    loadSpeakers();
  }, [loadSpeakers]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      return () => {};
    }, [loadFavorites]),
  );

  const filtered = useMemo(() => {
    const q = clean(search).toLowerCase();
    if (!q) return speakers;
    return speakers.filter((s) => {
      const hay = `${s.name} ${s.subtitle || ''} ${s.presentationTitle || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [search, speakers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFavorites();
    } finally {
      setRefreshing(false);
    }
  }, [loadFavorites]);

  const toggleFavorite = useCallback(
    async (speakerId: string) => {
      if (!currentProfileId || !speakerId) return;
      if (busySpeakerIds[speakerId]) return;

      const existingId = favoriteRecordIdBySpeakerId[speakerId];
      setBusySpeakerIds((prev) => ({ ...prev, [speakerId]: true }));
      try {
        // optimistic UI
        if (existingId) {
          setFavoriteRecordIdBySpeakerId((prev) => {
            const copy = { ...prev };
            delete copy[speakerId];
            return copy;
          });
          await graphqlAuthClient.graphql({
            query: deleteFavoriteSpeaker,
            variables: { input: { id: existingId } },
          });
        } else {
          const favoriteKey = `sp:${APS_ID}|u:${currentProfileId}|x:${speakerId}`;
          const resp = await graphqlAuthClient.graphql({
            query: createFavoriteSpeaker,
            variables: {
              input: {
                userProfileId: currentProfileId,
                speakerId,
                eventId: APS_ID,
                favoriteKey,
              },
            },
          });
          const data = resp.data as any;
          const createdId = data?.createApsAppUserFavoriteSpeaker?.id || null;
          if (createdId) {
            setFavoriteRecordIdBySpeakerId((prev) => ({ ...prev, [speakerId]: createdId }));
          } else {
            // If backend didn't return id, re-sync from server.
            await loadFavorites();
          }
        }
      } catch {
        await loadFavorites();
      } finally {
        setBusySpeakerIds((prev) => {
          const copy = { ...prev };
          delete copy[speakerId];
          return copy;
        });
      }
    },
    [busySpeakerIds, currentProfileId, favoriteRecordIdBySpeakerId, loadFavorites],
  );

  const [pictureUris, setPictureUris] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    async function resolveMissing() {
      const missing = speakers
        .map((s) => ({ id: s.id, urlKey: s.profilePicture }))
        .filter((x) => x.urlKey && pictureUris[x.id] === undefined);
      if (!missing.length) return;
      const updates: Record<string, string | null> = {};
      await Promise.all(
        missing.map(async (m) => {
          try {
            updates[m.id] = await resolveProfilePictureUri(m.urlKey);
          } catch {
            updates[m.id] = null;
          }
        }),
      );
      if (!cancelled && Object.keys(updates).length) setPictureUris((prev) => ({ ...prev, ...updates }));
    }
    resolveMissing();
    return () => {
      cancelled = true;
    };
  }, [speakers, pictureUris]);

  const renderSpeakerCard = useCallback(
    ({ item }: { item: SpeakerItem }) => {
      const avatarUri = pictureUris[item.id] ?? null;
      const isFav = !!favoriteRecordIdBySpeakerId[item.id];
      const isPending = !!busySpeakerIds[item.id];
      const subtitle = item.subtitle || item.presentationTitle || undefined;

      return (
        <View style={styles.cardWrap}>
          <View style={styles.card}>
            <Pressable
              onPress={() => router.push(`${detailBasePath}/${item.id}`)}
              style={({ pressed }) => [styles.cardPress, pressed && styles.cardPressPressed]}
            >
              <View style={styles.avatarWrap}>
                {avatarUri ? (
                  <View style={styles.avatarImgWrap}>
                    {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
                    <ImagePlaceholder uri={avatarUri} />
                  </View>
                ) : (
                  <Text style={styles.avatarFallback}>{item.name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>

              <View style={styles.cardText}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {!!subtitle && (
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </Pressable>

            {!!currentUserId && (
              <Pressable
                onPress={() => toggleFavorite(item.id)}
                hitSlop={8}
                style={[styles.favoriteBtn, { opacity: isPending ? 0.7 : 1 }, { top: 10, right: 10 }]}
              >
                <Ionicons
                  name={isFav ? 'star' : 'star-outline'}
                  size={18}
                  color={isFav ? '#f59e0b' : '#6b7280'}
                />
              </Pressable>
            )}
          </View>
        </View>
      );
    },
    [busySpeakerIds, currentUserId, detailBasePath, favoriteRecordIdBySpeakerId, pictureUris, toggleFavorite],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading speakers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn’t load speakers</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <Ionicons name='search' size={18} color='#6b7280' />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder='Search speakers'
          placeholderTextColor='#9ca3af'
          style={styles.searchInput}
          autoCapitalize='none'
          autoCorrect={false}
          clearButtonMode='while-editing'
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderSpeakerCard}
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.muted}>{search.trim() ? 'No matches.' : 'No speakers found.'}</Text>
          </View>
        }
      />
    </View>
  );
}

// Tiny helper to avoid importing Image twice across conditional branches.
function ImagePlaceholder({ uri }: { uri: string }) {
  // Lazy import: React Native's Image is safe but unused unless needed.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Image } = require('react-native');
  return <Image source={{ uri }} style={styles.avatarImg} resizeMode='cover' />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: '#6b7280' },
  errorBox: { padding: 16 },
  errorTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  errorText: { color: '#6b7280' },

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

  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 12, gap: 12 },

  cardWrap: { flex: 1, marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    padding: 12,
    minHeight: 132,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPress: { paddingRight: 34 },
  cardPressPressed: { opacity: 0.92 },

  favoriteBtn: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarWrap: { marginBottom: 8 },
  avatarImgWrap: { width: 40, height: 40, borderRadius: 999, overflow: 'hidden' },
  avatarImg: { width: 40, height: 40, borderRadius: 999 },
  avatarFallback: { fontWeight: '900', color: '#111827', fontSize: 18 },

  cardText: { gap: 4 },
  name: { fontWeight: '900', color: '#111827', fontSize: 14 },
  subtitle: { color: '#6b7280', fontSize: 12 },

  empty: { padding: 18, alignItems: 'center' },
});

