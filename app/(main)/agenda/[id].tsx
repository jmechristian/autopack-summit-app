import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { Ionicons } from '@expo/vector-icons';
import { APS_ID } from '../../../src/config/apsConfig';
import { autopackColors } from '../../../src/theme';
import { apsAppUserFavoriteSessionsByFavoriteKey } from '../../../src/graphql/queries';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../../src/utils/graphqlClient';
import {
  apsAppSessionsByAgendaIdWithRelations,
  getApsAppSessionWithRelations,
} from '../../../src/graphql/customQueries';
import { NotesSection } from '../../../src/components/notes/NotesSection';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';

type Speaker = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  title?: string | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    jobTitle?: string | null;
  } | null;
};

type Sponsor = {
  id: string;
  company?: { id: string; name?: string | null } | null;
};

type Session = {
  id: string;
  title?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  speakers?: Speaker[];
  sponsors?: Sponsor[];
};

const AGENDA_ID = '83afcde3-7ff3-464a-b116-69e244a39dfd';

function normalizeText(v?: string | null) {
  return (v || '').trim();
}

function htmlToPlainText(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function toSafeRenderableHtml(input?: string | null) {
  const raw = normalizeText(input);
  if (!raw) return '';

  const hasHtmlTags = /<\s*\/?\s*[a-z][^>]*>/i.test(raw);
  if (hasHtmlTags) {
    // Preserve author-provided formatting and line breaks.
    return raw.replace(/\r\n/g, '\n').replace(/\n/g, '<br />');
  }

  // Plain text fallback: escape and preserve line breaks.
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br />');
  return `<p>${escaped}</p>`;
}

function formatTime12HourEST(value?: string | null) {
  const raw = normalizeText(value);
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

const createFavoriteSession = /* GraphQL */ `
  mutation CreateFavoriteSession($input: CreateApsAppUserFavoriteSessionInput!) {
    createApsAppUserFavoriteSession(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteSession = /* GraphQL */ `
  mutation DeleteFavoriteSession($input: DeleteApsAppUserFavoriteSessionInput!) {
    deleteApsAppUserFavoriteSession(input: $input) {
      id
      __typename
    }
  }
`;

export default function AgendaDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentAppUser = useCurrentAppUser();
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [favoriteRecordId, setFavoriteRecordId] = useState<string | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const { width } = useWindowDimensions();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setError(null);
      setLoading(true);
      try {
        const resp = await graphqlApiKeyClient.graphql({
          query: getApsAppSessionWithRelations,
          variables: { id },
        });
        const data = resp.data as any;
        const it = data?.getApsAppSession;
        if (!it?.id) throw new Error('Session not found');
        let resolvedDescription: string | null = it.description ?? null;
        if (!normalizeText(resolvedDescription)) {
          // Fallback: some records return an empty description on get-by-id
          // while the agenda index query still has the value.
          let nextToken: string | null | undefined = null;
          do {
            const listResp = await graphqlApiKeyClient.graphql({
              query: apsAppSessionsByAgendaIdWithRelations,
              variables: { agendaId: AGENDA_ID, limit: 200, nextToken },
            });
            const listData = listResp.data as any;
            const conn = listData?.apsAppSessionsByAgendaId;
            const match = (conn?.items || []).find((x: any) => x?.id === it.id);
            if (match) {
              resolvedDescription = match?.description ?? null;
              break;
            }
            nextToken = conn?.nextToken;
          } while (nextToken);
        }
        const speakers: Speaker[] = (it.speakers?.items || [])
          .map((j: any) => j?.aPSSpeaker)
          .filter(Boolean);
        const sponsors: Sponsor[] = (it.sponsors?.items || [])
          .map((j: any) => j?.apsSponsor)
          .filter(Boolean);
        const normalized: Session = {
          id: it.id,
          title: it.title ?? null,
          date: it.date ?? null,
          startTime: it.startTime ?? null,
          endTime: it.endTime ?? null,
          location: it.location ?? null,
          description: resolvedDescription,
          speakers,
          sponsors,
        };
        if (!cancelled) setSession(normalized);
      } catch (e: any) {
        console.error('Error loading session:', e);
        if (!cancelled) setError(e?.message || 'Failed to load session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const title = useMemo(() => {
    if (!session) return '';
    return normalizeText(session.title) || 'Session';
  }, [session]);

  const timeLabel = useMemo(() => {
    if (!session) return '';
    const start = formatTime12HourEST(session.startTime);
    const end = formatTime12HourEST(session.endTime);
    if (start && end) return `${start} – ${end} EST`;
    if (start) return `${start} EST`;
    return 'TBD';
  }, [session]);

  const favoriteKey = currentProfileId && session?.id ? `s:${APS_ID}|u:${currentProfileId}|ss:${session.id}` : '';
  const descriptionText = useMemo(
    () => htmlToPlainText(normalizeText(session?.description)),
    [session?.description],
  );
  const descriptionHtml = useMemo(
    () => toSafeRenderableHtml(session?.description),
    [session?.description],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadFavoriteState() {
      if (!favoriteKey) {
        setFavoriteRecordId(null);
        return;
      }
      try {
        const resp = await graphqlAuthClient.graphql({
          query: apsAppUserFavoriteSessionsByFavoriteKey,
          variables: { favoriteKey, limit: 1 },
        });
        const data = resp.data as {
          apsAppUserFavoriteSessionsByFavoriteKey?: {
            items?: ({ id?: string | null } | null)[] | null;
          } | null;
        };
        const found = data.apsAppUserFavoriteSessionsByFavoriteKey?.items?.find((x) => !!x?.id);
        if (!cancelled) setFavoriteRecordId(found?.id || null);
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
    if (!session?.id || !currentProfileId || favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      if (favoriteRecordId) {
        await graphqlAuthClient.graphql({
          query: deleteFavoriteSession,
          variables: { input: { id: favoriteRecordId } },
        });
        setFavoriteRecordId(null);
      } else {
        const resp = await graphqlAuthClient.graphql({
          query: createFavoriteSession,
          variables: {
            input: {
              userProfileId: currentProfileId,
              sessionId: session.id,
              eventId: APS_ID,
              favoriteKey,
            },
          },
        });
        const data = resp.data as {
          createApsAppUserFavoriteSession?: { id?: string | null } | null;
        };
        setFavoriteRecordId(data.createApsAppUserFavoriteSession?.id || null);
      }
    } finally {
      setFavoriteBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={autopackColors.apBlue} />
        <Text style={styles.centerText}>Loading session…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn’t load session</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.time}>{timeLabel}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {!!currentProfileId && (
          <Pressable style={styles.favoriteBtn} onPress={toggleFavorite} disabled={favoriteBusy}>
            <Ionicons
              name={favoriteRecordId ? 'star' : 'star-outline'}
              size={20}
              color={favoriteRecordId ? '#f59e0b' : favoriteBusy ? '#9ca3af' : '#6b7280'}
            />
          </Pressable>
        )}
      </View>
      {!!normalizeText(session?.location) && (
        <Text style={styles.location}>{normalizeText(session?.location)}</Text>
      )}

      {!!descriptionText && (
        <>
          <View style={styles.divider} />
          <RenderHtml
            contentWidth={Math.max(1, width - 32)}
            source={{ html: descriptionHtml }}
            baseStyle={styles.description}
            tagsStyles={{
              p: { marginTop: 0, marginBottom: 12 },
              br: { marginBottom: 0 },
              ul: { marginTop: 0, marginBottom: 12, paddingLeft: 18 },
              ol: { marginTop: 0, marginBottom: 12, paddingLeft: 18 },
              li: { marginBottom: 6 },
              a: { color: autopackColors.apBlue, textDecorationLine: 'underline' },
              strong: { fontWeight: '700' },
              b: { fontWeight: '700' },
              em: { fontStyle: 'italic' },
              i: { fontStyle: 'italic' },
            }}
          />
        </>
      )}

      {!!(session?.speakers || []).length && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Speakers</Text>
          {(session?.speakers || []).map((s) => {
            const name = `${normalizeText(s.firstName || s.profile?.firstName)} ${normalizeText(
              s.lastName || s.profile?.lastName,
            )}`.trim();
            const subtitle = [
              normalizeText(s.title || s.profile?.jobTitle),
              normalizeText(s.company || s.profile?.company),
            ]
              .filter(Boolean)
              .join(' • ');
            return (
              <View key={s.id} style={styles.row}>
                <Text style={styles.rowTitle}>
                  {name ||
                    `${normalizeText(s.profile?.firstName)} ${normalizeText(s.profile?.lastName)}`.trim() ||
                    'Speaker'}
                </Text>
                {!!subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
              </View>
            );
          })}
        </>
      )}

      {!!(session?.sponsors || []).length && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Sponsors</Text>
          {(session?.sponsors || []).map((s) => {
            const name = normalizeText(s.company?.name || '');
            return (
              <View key={s.id} style={styles.row}>
                <Text style={styles.rowTitle}>{name || 'Sponsor'}</Text>
              </View>
            );
          })}
        </>
      )}

      {!!session?.id && !!currentAppUser?.id && (
        <>
          <View style={styles.divider} />
          <NotesSection sessionId={session.id} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, paddingTop: 14 },
  center: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  centerText: { marginTop: 10, color: '#4B5563' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  errorBody: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
  time: { color: autopackColors.apBlue, fontWeight: '800', fontSize: 13, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontSize: 22, fontWeight: '900', color: '#111827' },
  favoriteBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  location: { marginTop: 10, color: '#4B5563', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 14 },
  description: { color: '#374151', lineHeight: 20, fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 10 },
  row: { paddingVertical: 10 },
  rowTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  rowSubtitle: { marginTop: 4, color: '#6B7280' },
});
