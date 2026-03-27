import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { autopackColors } from '../../../src/theme';
import { APS_ID } from '../../../src/config/apsConfig';
import { apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt } from '../../../src/graphql/queries';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../../src/utils/graphqlClient';
import { apsAppSessionsByAgendaIdWithRelations } from '../../../src/graphql/customQueries';
import { useNotesPresence } from '../../../src/hooks/useNotesPresence';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';

const AGENDA_ID = '83afcde3-7ff3-464a-b116-69e244a39dfd';

type Speaker = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  title?: string | null;
  headshot?: string | null;
  profile?: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    jobTitle?: string | null;
    profilePicture?: string | null;
  } | null;
};

type Sponsor = {
  id: string;
  company?: { id: string; name?: string | null; logo?: string | null } | null;
};

type AgendaSession = {
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

function normalizeText(v?: string | null) {
  return (v || '').trim();
}

function getSessionTitle(s: AgendaSession) {
  return normalizeText(s.title) || 'Untitled session';
}

function normalizeDateKey(value?: string | null) {
  const raw = normalizeText(value);
  if (!raw) return '';
  return raw.includes('T') ? raw.slice(0, 10) : raw;
}

function formatDayLabel(dateKey: string) {
  if (!dateKey) return 'Day';
  const asDate = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(asDate.getTime())) return dateKey;
  return asDate.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime12HourEST(value?: string | null) {
  const raw = normalizeText(value);
  if (!raw) return '';

  // Already 12-hour text
  if (/am|pm/i.test(raw)) {
    return raw.toUpperCase();
  }

  // HH:mm[:ss] style
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

  // ISO-ish fallback
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

function getSessionTimeLabel(s: AgendaSession) {
  const start = formatTime12HourEST(s.startTime);
  const end = formatTime12HourEST(s.endTime);
  if (start && end) return `${start} – ${end} EST`;
  if (start) return `${start} EST`;
  return 'TBD';
}

function tryParseSortableDate(dateStr?: string | null, timeStr?: string | null) {
  const d = normalizeText(dateStr);
  const t = normalizeText(timeStr);
  // ISO date + 24h time
  if (d && t) {
    const isoCandidate = `${d}T${t}`;
    const asDate = new Date(isoCandidate);
    if (!Number.isNaN(asDate.getTime())) return asDate.getTime();
  }
  // Try date only
  if (d) {
    const asDate = new Date(d);
    if (!Number.isNaN(asDate.getTime())) return asDate.getTime();
  }
  return null;
}

function getSortKey(s: AgendaSession) {
  const ts = tryParseSortableDate(s.date, s.startTime) ?? null;
  return ts ?? Number.POSITIVE_INFINITY;
}

function formatPeopleList(names: string[]) {
  const compact = names.map((n) => n.trim()).filter(Boolean);
  if (!compact.length) return '';
  return compact.join(', ');
}

function getSpeakerName(s: Speaker) {
  const first = normalizeText(s.firstName || s.profile?.firstName);
  const last = normalizeText(s.lastName || s.profile?.lastName);
  return `${first} ${last}`.trim();
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

const createFavoriteSession = /* GraphQL */ `
  mutation CreateFavoriteSession($input: CreateApsAppUserFavoriteSessionInput!) {
    createApsAppUserFavoriteSession(input: $input) {
      id
      sessionId
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

export default function AgendaList() {
  const currentAppUser = useCurrentAppUser();
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const { sessionIdsWithNotes } = useNotesPresence();
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<AgendaSession[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [favoriteRecordIdBySessionId, setFavoriteRecordIdBySessionId] = useState<Record<string, string>>({});
  const [favoritePendingBySessionId, setFavoritePendingBySessionId] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const all: AgendaSession[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlApiKeyClient.graphql({
          query: apsAppSessionsByAgendaIdWithRelations,
          variables: { agendaId: AGENDA_ID, limit: 200, nextToken },
        });

        const data = resp.data as any;
        const conn = data?.apsAppSessionsByAgendaId;
        const items: Array<any> = conn?.items || [];
        for (const it of items) {
          if (!it?.id) continue;
          const speakers: Speaker[] = (it.speakers?.items || [])
            .map((j: any) => j?.aPSSpeaker)
            .filter(Boolean);
          const sponsors: Sponsor[] = (it.sponsors?.items || [])
            .map((j: any) => j?.apsSponsor)
            .filter(Boolean);
          all.push({
            id: it.id,
            title: it.title ?? null,
            date: it.date ?? null,
            startTime: it.startTime ?? null,
            endTime: it.endTime ?? null,
            location: it.location ?? null,
            description: it.description ?? null,
            speakers,
            sponsors,
          });
        }
        nextToken = conn?.nextToken;
      } while (nextToken);

      all.sort((a, b) => {
        const byTime = getSortKey(a) - getSortKey(b);
        if (byTime !== 0) return byTime;
        return getSessionTitle(a).localeCompare(getSessionTitle(b));
      });

      setSessions(all);
    } catch (e: any) {
      console.error('Error loading agenda:', e);
      setError(e?.message || 'Failed to load agenda');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadFavoriteSessions = useCallback(async () => {
    if (!currentProfileId) {
      setFavoriteRecordIdBySessionId({});
      return;
    }
    try {
      const resp = await graphqlAuthClient.graphql({
        query: apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt,
        variables: { userProfileId: currentProfileId, limit: 1000 },
      });
      const data = resp.data as {
        apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt?: {
          items?: Array<{ id?: string | null; sessionId?: string | null } | null> | null;
        } | null;
      };
      const next: Record<string, string> = {};
      for (const item of data.apsAppUserFavoriteSessionsByUserProfileIdAndCreatedAt?.items || []) {
        if (!item?.id || !item.sessionId) continue;
        if (!next[item.sessionId]) next[item.sessionId] = item.id;
      }
      setFavoriteRecordIdBySessionId(next);
    } catch {
      setFavoriteRecordIdBySessionId({});
    }
  }, [currentProfileId]);

  useEffect(() => {
    loadFavoriteSessions();
  }, [loadFavoriteSessions]);

  useFocusEffect(
    useCallback(() => {
      loadFavoriteSessions();
      return () => {};
    }, [loadFavoriteSessions])
  );

  const toggleFavoriteSession = useCallback(
    async (sessionId: string) => {
      if (!sessionId || !currentProfileId || favoritePendingBySessionId[sessionId]) return;
      const existingId = favoriteRecordIdBySessionId[sessionId];
      setFavoritePendingBySessionId((prev) => ({ ...prev, [sessionId]: true }));
      if (existingId) {
        setFavoriteRecordIdBySessionId((prev) => {
          const copy = { ...prev };
          delete copy[sessionId];
          return copy;
        });
      } else {
        setFavoriteRecordIdBySessionId((prev) => ({ ...prev, [sessionId]: '__pending__' }));
      }
      try {
        if (existingId) {
          await graphqlAuthClient.graphql({
            query: deleteFavoriteSession,
            variables: { input: { id: existingId } },
          });
        } else {
          const favoriteKey = `s:${APS_ID}|u:${currentProfileId}|ss:${sessionId}`;
          const resp = await graphqlAuthClient.graphql({
            query: createFavoriteSession,
            variables: {
              input: {
                userProfileId: currentProfileId,
                sessionId,
                eventId: APS_ID,
                favoriteKey,
              },
            },
          });
          const data = resp.data as {
            createApsAppUserFavoriteSession?: { id?: string | null } | null;
          };
          const createdId = data.createApsAppUserFavoriteSession?.id || '';
          setFavoriteRecordIdBySessionId((prev) => {
            if (!createdId) {
              const copy = { ...prev };
              delete copy[sessionId];
              return copy;
            }
            return { ...prev, [sessionId]: createdId };
          });
        }
      } catch {
        setFavoriteRecordIdBySessionId((prev) => {
          const copy = { ...prev };
          if (existingId) copy[sessionId] = existingId;
          else delete copy[sessionId];
          return copy;
        });
      } finally {
        setFavoritePendingBySessionId((prev) => {
          const copy = { ...prev };
          delete copy[sessionId];
          return copy;
        });
      }
    },
    [currentProfileId, favoritePendingBySessionId, favoriteRecordIdBySessionId]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const dayOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        sessions
          .map((s) => normalizeDateKey(s.date))
          .filter(Boolean),
      ),
    );
    unique.sort((a, b) => {
      const aTs = new Date(`${a}T00:00:00`).getTime();
      const bTs = new Date(`${b}T00:00:00`).getTime();
      if (!Number.isNaN(aTs) && !Number.isNaN(bTs)) return aTs - bTs;
      return a.localeCompare(b);
    });
    return unique;
  }, [sessions]);

  useEffect(() => {
    if (!dayOptions.length) {
      setSelectedDay('');
      return;
    }
    if (!selectedDay || !dayOptions.includes(selectedDay)) {
      setSelectedDay(dayOptions[0]);
    }
  }, [dayOptions, selectedDay]);

  const filtered = useMemo(() => {
    const byDay = selectedDay
      ? sessions.filter((s) => normalizeDateKey(s.date) === selectedDay)
      : sessions;

    const q = search.trim().toLowerCase();
    if (!q) return byDay;
    return byDay.filter((s) => {
      const title = getSessionTitle(s).toLowerCase();
      const location = normalizeText(s.location).toLowerCase();
      const desc = normalizeText(s.description).toLowerCase();
      const speakerNames = (s.speakers || [])
        .map((sp) => getSpeakerName(sp))
        .join(' ')
        .toLowerCase();
      const sponsorNames = (s.sponsors || [])
        .map((sp) => normalizeText(sp.company?.name || ''))
        .join(' ')
        .toLowerCase();
      return (
        title.includes(q) ||
        location.includes(q) ||
        desc.includes(q) ||
        speakerNames.includes(q) ||
        sponsorNames.includes(q)
      );
    });
  }, [search, selectedDay, sessions]);

  const renderItem = useCallback(({ item }: { item: AgendaSession }) => {
    const time = getSessionTimeLabel(item);
    const title = getSessionTitle(item);
    const location = normalizeText(item.location);
    const descriptionText = htmlToPlainText(normalizeText(item.description));
    const speakers = (item.speakers || []).map((s) => getSpeakerName(s));
    const sponsors = (item.sponsors || []).map((s) => normalizeText(s.company?.name || ''));
    const hasNote = !!currentAppUser?.id && sessionIdsWithNotes.has(item.id);
    const isFavorite = !!favoriteRecordIdBySessionId[item.id];
    const isFavoritePending = !!favoritePendingBySessionId[item.id];
    const isExpanded = !!expandedById[item.id];
    const shouldShowToggle = descriptionText.length > 260;

    return (
      <View style={styles.card}>
        <View style={styles.topRightActions}>
          {hasNote && (
            <View pointerEvents="none" style={styles.noteIcon}>
              <Ionicons name="document-text-outline" size={18} color={autopackColors.apBlue} />
            </View>
          )}
          {!!currentProfileId && (
            <Pressable
              style={styles.favoriteIconBtn}
              hitSlop={8}
              onPress={() => {
                toggleFavoriteSession(item.id);
              }}
            >
              <Ionicons
                name={isFavorite ? 'star' : 'star-outline'}
                size={18}
                color={isFavorite ? '#f59e0b' : isFavoritePending ? '#9ca3af' : '#6b7280'}
              />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(main)/agenda/[id]',
              params: { id: item.id },
            })
          }
          style={({ pressed }) => [styles.cardBodyPressable, pressed && styles.cardPressed]}
        >
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.title}>{title}</Text>

          {!!location && <Text style={styles.location}>{location}</Text>}

          <View style={styles.divider} />

          {!!descriptionText && (
            <>
              <Text style={styles.description} numberOfLines={isExpanded ? undefined : 6}>
                {descriptionText}
              </Text>
              {shouldShowToggle && (
                <Pressable
                  onPress={() =>
                    setExpandedById((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                  }
                  hitSlop={8}
                  style={styles.readMoreBtn}
                >
                  <Text style={styles.readMoreText}>
                    {isExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </Pressable>
              )}
            </>
          )}

          {!!speakers.length && (
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>Speakers: </Text>
              {formatPeopleList(speakers)}
            </Text>
          )}

          {!!sponsors.length && (
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>Sponsors: </Text>
              {formatPeopleList(sponsors)}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }, [
    expandedById,
    sessionIdsWithNotes,
    currentAppUser?.id,
    currentProfileId,
    favoriteRecordIdBySessionId,
    favoritePendingBySessionId,
    toggleFavoriteSession,
  ]);

  const keyExtractor = useCallback((item: AgendaSession) => item.id, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={autopackColors.apBlue} />
        <Text style={styles.centerText}>Loading agenda…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn’t load agenda</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search sessions, speakers, sponsors…"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {!!search && (
          <Pressable onPress={() => setSearch('')} hitSlop={8} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {!!dayOptions.length && (
        <View style={styles.dayToggleWrap}>
          {dayOptions.map((day, idx) => {
            const active = day === selectedDay;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[styles.dayChip, active && styles.dayChipActive]}
              >
                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                  {`Day ${idx + 1}`}
                </Text>
                <Text style={[styles.dayChipSubText, active && styles.dayChipSubTextActive]}>
                  {formatDayLabel(day)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No sessions found</Text>
            <Text style={styles.emptyBody}>
              {search.trim() ? 'Try a different search.' : 'Try another day.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { padding: 16, paddingTop: 12 },
  center: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  centerText: { marginTop: 10, color: '#4B5563' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  errorBody: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
  retryBtn: {
    marginTop: 14,
    backgroundColor: autopackColors.apBlue,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, color: '#111827' },
  clearBtn: { marginLeft: 8 },
  dayToggleWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 8,
  },
  dayChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: autopackColors.apBlue,
    borderColor: autopackColors.apBlue,
  },
  dayChipText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 13,
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  dayChipSubText: {
    marginTop: 2,
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '600',
  },
  dayChipSubTextActive: {
    color: '#DBEAFE',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardBodyPressable: {
    padding: 14,
    paddingRight: 52,
  },
  cardPressed: { opacity: 0.92 },
  noteIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  topRightActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    zIndex: 20,
    elevation: 20,
  },
  favoriteIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    zIndex: 25,
    elevation: 25,
  },
  time: { color: autopackColors.apBlue, fontWeight: '800', fontSize: 13, marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  location: { marginTop: 6, color: '#4B5563', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  description: { color: '#374151', lineHeight: 20 },
  readMoreBtn: { alignSelf: 'flex-start', marginTop: 8 },
  readMoreText: { color: autopackColors.apBlue, fontWeight: '700' },
  metaLine: { marginTop: 10, color: '#374151', lineHeight: 20 },
  metaLabel: { fontWeight: '800', color: '#111827' },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptyBody: { marginTop: 6, color: '#6B7280' },
});
