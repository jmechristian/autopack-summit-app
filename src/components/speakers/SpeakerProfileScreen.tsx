import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { APS_ID } from '../../config/apsConfig';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { autopackColors } from '../../theme';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../utils/graphqlClient';
import { resolveProfilePictureUri } from '../../utils/storageUtils';
import { apsAppUserFavoriteSpeakersByFavoriteKey } from '../../graphql/queries';

const getSpeakerById = /* GraphQL */ `
  query GetSpeakerById($id: ID!) {
    getAPSSpeaker(id: $id) {
      id
      presentationTitle
      presentationSummary
      eventId
      profile {
        id
        firstName
        lastName
        company
        jobTitle
        profilePicture
        bio
        linkedin
        twitter
        facebook
        instagram
        youtube
        website
        location
        resume
        __typename
      }
      sessions {
        items {
          id
          apsAppSession {
            id
            title
            date
            startTime
            endTime
            location
            __typename
          }
          __typename
        }
        nextToken
        __typename
      }
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

function clean(v?: unknown) {
  if (!v) return '';
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof v === 'string') return v.trim();
  // Fallback: coerce other primitives safely
  return String(v).trim();
}

function personName(first?: string | null, last?: string | null) {
  return [clean(first), clean(last)].filter(Boolean).join(' ').trim();
}

type SpeakerSession = {
  id: string;
  title?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
};

function formatTime12HourEST(value?: string | null) {
  const raw = clean(value);
  if (!raw) return '';
  if (/am|pm/i.test(raw)) return raw.toUpperCase();
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhmm) {
    const hour24 = Number(hhmm[1]);
    const minute = hhmm[2];
    if (!Number.isNaN(hour24)) {
      const suffix = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 % 12 || 12;
      return `${hour12}:${minute} ${suffix}`;
    }
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  return raw;
}

function getSessionSortKey(s: SpeakerSession) {
  const d = clean(s.date);
  const t = clean(s.startTime);
  if (d && t) {
    const candidate = new Date(`${d}T${t}`).getTime();
    if (!Number.isNaN(candidate)) return candidate;
  }
  if (d) {
    const dateOnly = new Date(d).getTime();
    if (!Number.isNaN(dateOnly)) return dateOnly;
  }
  return Number.POSITIVE_INFINITY;
}

function formatSessionMeta(s: SpeakerSession) {
  const start = formatTime12HourEST(s.startTime);
  const end = formatTime12HourEST(s.endTime);
  const time = start && end ? `${start} - ${end} EST` : start ? `${start} EST` : '';
  const location = clean(s.location);
  return [time, location].filter(Boolean).join(' • ');
}

export default function SpeakerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentAppUser = useCurrentAppUser();
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speaker, setSpeaker] = useState<any | null>(null);

  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);

  const favoriteKey = useMemo(() => {
    if (!currentProfileId || !id) return '';
    return `sp:${APS_ID}|u:${currentProfileId}|x:${id}`;
  }, [currentProfileId, id]);

  const [favoriteRecordId, setFavoriteRecordId] = useState<string | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setLoading(false);
        setError('Missing speaker id');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp = await graphqlApiKeyClient.graphql({
          query: getSpeakerById,
          variables: { id },
        });
        const data = resp.data as any;
        const it = data?.getAPSSpeaker;
        if (!it?.id) throw new Error('Speaker not found');
        if (!cancelled) setSpeaker(it);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load speaker');
          setSpeaker(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function loadPic() {
      const key = speaker?.profile?.profilePicture || null;
      if (!key) {
        setProfilePictureUri(null);
        return;
      }
      try {
        const url = await resolveProfilePictureUri(key);
        if (!cancelled) setProfilePictureUri(url);
      } catch {
        if (!cancelled) setProfilePictureUri(null);
      }
    }
    if (speaker) {
      loadPic();
    }
    return () => {
      cancelled = true;
    };
  }, [speaker]);

  useEffect(() => {
    let cancelled = false;
    async function loadFavoriteState() {
      if (!favoriteKey) {
        setFavoriteRecordId(null);
        return;
      }
      try {
        const resp = await graphqlAuthClient.graphql({
          query: apsAppUserFavoriteSpeakersByFavoriteKey,
          variables: { favoriteKey, limit: 1 },
        });
        const data = resp.data as any;
        const item = data?.apsAppUserFavoriteSpeakersByFavoriteKey?.items?.find((x: any) => !!x?.id);
        if (!cancelled) setFavoriteRecordId(item?.id || null);
      } catch {
        if (!cancelled) setFavoriteRecordId(null);
      }
    }
    loadFavoriteState();
    return () => {
      cancelled = true;
    };
  }, [favoriteKey]);

  async function toggleFavorite() {
    if (!id || !currentProfileId || favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      if (favoriteRecordId) {
        await graphqlAuthClient.graphql({
          query: deleteFavoriteSpeaker,
          variables: { input: { id: favoriteRecordId } },
        });
        setFavoriteRecordId(null);
      } else {
        const resp = await graphqlAuthClient.graphql({
          query: createFavoriteSpeaker,
          variables: {
            input: {
              userProfileId: currentProfileId,
              speakerId: id,
              eventId: APS_ID,
              favoriteKey,
            },
          },
        });
        const data = resp.data as any;
        const createdId = data?.createApsAppUserFavoriteSpeaker?.id || null;
        setFavoriteRecordId(createdId);
      }
    } catch {
      // Re-sync best-effort.
      setFavoriteRecordId(null);
    } finally {
      setFavoriteBusy(false);
    }
  }

  const sessions = useMemo<SpeakerSession[]>(() => {
    const items = (speaker?.sessions?.items || []) as any[];
    const byId = new Map<string, SpeakerSession>();
    for (const item of items) {
      const rawSession = item?.apsAppSession || item?.aPSAppSession || item?.session || null;
      if (!rawSession?.id) continue;
      if (!byId.has(rawSession.id)) {
        byId.set(rawSession.id, {
          id: rawSession.id,
          title: rawSession.title ?? null,
          date: rawSession.date ?? null,
          startTime: rawSession.startTime ?? null,
          endTime: rawSession.endTime ?? null,
          location: rawSession.location ?? null,
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => {
      const byTime = getSessionSortKey(a) - getSessionSortKey(b);
      if (byTime !== 0) return byTime;
      return clean(a.title).localeCompare(clean(b.title));
    });
  }, [speaker?.sessions?.items]);

  const isFavorite = !!favoriteRecordId;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading speaker...</Text>
      </View>
    );
  }

  if (error || !speaker) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load speaker</Text>
        <Text style={styles.muted}>{error || 'Speaker not found'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const name = personName(speaker?.profile?.firstName, speaker?.profile?.lastName) || 'Speaker';
  const subtitle = [clean(speaker?.profile?.jobTitle), clean(speaker?.profile?.company)].filter(Boolean).join(' • ');
  const website = clean(speaker?.profile?.website);
  const location = clean(speaker?.profile?.location);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          {profilePictureUri ? (
            <Image source={{ uri: profilePictureUri }} style={styles.avatarImg} resizeMode='cover' />
          ) : (
            <Text style={styles.avatarFallback}>{name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.speakerTitle}>{clean(speaker?.presentationTitle) || name}</Text>
          <Text style={styles.name}>{name}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View>
          <Pressable
            disabled={!currentProfileId || favoriteBusy}
            onPress={toggleFavorite}
            style={[styles.favoriteBtn, (!currentProfileId || favoriteBusy) && styles.favoriteBtnDisabled]}
          >
            <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={20} color={isFavorite ? '#f59e0b' : '#6b7280'} />
          </Pressable>
        </View>
      </View>

      {!!clean(speaker?.presentationSummary) && (
        <>
          <Text style={styles.sectionTitle}>About</Text>
          <RenderHtml
            contentWidth={1}
            source={{ html: clean(speaker?.presentationSummary) }}
            baseStyle={styles.richText}
          />
        </>
      )}

      {!!clean(speaker?.profile?.bio) && (
        <>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.body}>{speaker?.profile?.bio}</Text>
        </>
      )}

      {!!location && (
        <>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.body}>{location}</Text>
        </>
      )}

      {!!website && (
        <>
          <Text style={styles.sectionTitle}>Website</Text>
          <Text style={[styles.body, styles.linkText]}>{website}</Text>
        </>
      )}

      {!!sessions.length && (
        <>
          <Text style={styles.sectionTitle}>Sessions</Text>
          <View style={styles.sessionsList}>
            {sessions.map((session) => (
              <Pressable
                key={session.id}
                onPress={() =>
                  router.push({
                    pathname: '/(main)/agenda/[id]',
                    params: { id: session.id },
                  })
                }
                style={({ pressed }) => [styles.sessionRow, pressed && styles.sessionRowPressed]}
              >
                <View style={styles.sessionRowTextWrap}>
                  <Text style={styles.sessionRowTitle}>{clean(session.title) || 'Session'}</Text>
                  {!!formatSessionMeta(session) && (
                    <Text style={styles.sessionRowMeta}>{formatSessionMeta(session)}</Text>
                  )}
                </View>
                <Ionicons name='chevron-forward' size={16} color='#9CA3AF' />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  muted: { color: '#6b7280', textAlign: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  avatarWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: 56, height: 56 },
  avatarFallback: { fontWeight: '900', color: '#111827', fontSize: 18 },

  headerText: { flex: 1, gap: 3 },
  speakerTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  name: { fontWeight: '800', color: '#111827' },
  subtitle: { color: '#6b7280' },

  favoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBtnDisabled: { opacity: 0.6 },

  sectionTitle: { fontWeight: '900', color: '#111827', marginTop: 6, fontSize: 14 },
  richText: { color: '#111827' },
  body: { color: '#111827', lineHeight: 22 },
  linkText: { color: autopackColors.apBlue, fontWeight: '700' },
  sessionsList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  sessionRowPressed: { backgroundColor: '#F9FAFB' },
  sessionRowTextWrap: { flex: 1 },
  sessionRowTitle: { fontWeight: '800', color: '#111827' },
  sessionRowMeta: { marginTop: 3, color: '#6B7280', fontSize: 12 },

  backBtn: { marginTop: 10, backgroundColor: autopackColors.apBlue, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  backText: { color: '#fff', fontWeight: '700' },
});

