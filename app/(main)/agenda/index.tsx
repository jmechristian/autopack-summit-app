import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { autopackColors } from '../../../src/theme';
import { graphqlClient } from '../../../src/utils/graphqlClient';
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

function getSessionTimeLabel(s: AgendaSession) {
  const start = normalizeText(s.startTime);
  const end = normalizeText(s.endTime);
  if (start && end) return `${start} – ${end}`;
  return start || 'TBD';
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

export default function AgendaList() {
  const currentAppUser = useCurrentAppUser();
  const { sessionIdsWithNotes } = useNotesPresence();
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<AgendaSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const all: AgendaSession[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlClient.graphql({
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
    if (!q) return sessions;
    return sessions.filter((s) => {
      const title = getSessionTitle(s).toLowerCase();
      const location = normalizeText(s.location).toLowerCase();
      const desc = normalizeText(s.description).toLowerCase();
      const speakerNames = (s.speakers || [])
        .map((sp) => `${normalizeText(sp.firstName)} ${normalizeText(sp.lastName)}`.trim())
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
  }, [search, sessions]);

  const renderItem = useCallback(({ item }: { item: AgendaSession }) => {
    const time = getSessionTimeLabel(item);
    const title = getSessionTitle(item);
    const location = normalizeText(item.location);
    const descriptionHtml = normalizeText(item.description);
    const speakers = (item.speakers || []).map((s) =>
      `${normalizeText(s.firstName)} ${normalizeText(s.lastName)}`.trim(),
    );
    const sponsors = (item.sponsors || []).map((s) => normalizeText(s.company?.name || ''));
    const hasNote = !!currentAppUser?.id && sessionIdsWithNotes.has(item.id);

    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(main)/agenda/[id]',
            params: { id: item.id },
          })
        }
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {hasNote && (
          <View pointerEvents="none" style={styles.noteIcon}>
            <Ionicons name="document-text-outline" size={18} color={autopackColors.apBlue} />
          </View>
        )}
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.title}>{title}</Text>

        {!!location && <Text style={styles.location}>{location}</Text>}

        <View style={styles.divider} />

        {!!descriptionHtml && (
          <RenderHtml
            contentWidth={Math.max(1, width - 32 - 28)}
            source={{ html: descriptionHtml }}
            baseStyle={styles.description}
            tagsStyles={{
              p: { marginTop: 0, marginBottom: 10 },
              ul: { marginTop: 0, marginBottom: 10, paddingLeft: 18 },
              ol: { marginTop: 0, marginBottom: 10, paddingLeft: 18 },
              li: { marginBottom: 6 },
              a: { color: autopackColors.apBlue, textDecorationLine: 'underline' },
              strong: { fontWeight: 'bold' },
              b: { fontWeight: 'bold' },
              em: { fontStyle: 'italic' },
            }}
          />
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
    );
  }, [width, sessionIdsWithNotes, currentAppUser?.id]);

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

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No sessions found</Text>
            <Text style={styles.emptyBody}>Try a different search.</Text>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardPressed: { opacity: 0.92 },
  noteIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  time: { color: autopackColors.apBlue, fontWeight: '800', fontSize: 13, marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  location: { marginTop: 6, color: '#4B5563', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  description: { color: '#374151', lineHeight: 20 },
  metaLine: { marginTop: 10, color: '#374151', lineHeight: 20 },
  metaLabel: { fontWeight: '800', color: '#111827' },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptyBody: { marginTop: 6, color: '#6B7280' },
});
