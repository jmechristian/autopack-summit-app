import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';
import { graphqlAuthClient, graphqlClient } from '../../../src/utils/graphqlClient';
import { apsAppUserNotesByUserId } from '../../../src/graphql/queries';
import { ui } from '../../../src/ui/tokens';
import { AppScreen } from '../../../src/ui/AppScreen';
import { autopackColors } from '../../../src/theme';

type NoteRow = {
  id: string;
  note?: string | null;
  sessionId?: string | null;
  profileId?: string | null;
  createdAt: string;
};

type SessionMini = {
  id: string;
  title?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

type ProfileMini = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
};

const getSessionMinimal = /* GraphQL */ `
  query GetApsAppSessionMinimal($id: ID!) {
    getApsAppSession(id: $id) {
      id
      title
      date
      startTime
      endTime
      __typename
    }
  }
`;

const getProfileMinimal = /* GraphQL */ `
  query GetApsAppUserProfileMinimal($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      firstName
      lastName
      company
      jobTitle
      __typename
    }
  }
`;

function formatWhen(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

function titleizeProfile(p?: ProfileMini | null) {
  if (!p) return 'Contact';
  const name = [p.firstName?.trim(), p.lastName?.trim()].filter(Boolean).join(' ').trim();
  return name || 'Contact';
}

function subtitleProfile(p?: ProfileMini | null) {
  if (!p) return '';
  return [p.jobTitle, p.company].filter(Boolean).join(' • ');
}

function titleizeSession(s?: SessionMini | null) {
  return (s?.title || '').trim() || 'Session';
}

function subtitleSession(s?: SessionMini | null) {
  if (!s) return '';
  const start = (s.startTime || '').trim();
  const end = (s.endTime || '').trim();
  const time = start && end ? `${start} – ${end}` : start || '';
  const date = (s.date || '').trim();
  return [date, time].filter(Boolean).join(' • ');
}

type SectionItem =
  | { kind: 'session'; note: NoteRow; session?: SessionMini | null }
  | { kind: 'contact'; note: NoteRow; profile?: ProfileMini | null };

type NotesSection = { title: string; data: SectionItem[] };

export default function ProfileNotesScreen() {
  const currentAppUser = useCurrentAppUser();
  const userId = currentAppUser?.id || null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [sessionsById, setSessionsById] = useState<Record<string, SessionMini | null>>({});
  const [profilesById, setProfilesById] = useState<Record<string, ProfileMini | null>>({});
  const [mode, setMode] = useState<'sessions' | 'contacts'>('sessions');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    setLoading(true);
    try {
      const all: NoteRow[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlAuthClient.graphql({
          query: apsAppUserNotesByUserId,
          variables: { userId, limit: 1000, nextToken },
        });
        const data = resp.data as any;
        const items = (data?.apsAppUserNotesByUserId?.items || []).filter(Boolean) as NoteRow[];
        all.push(...items);
        nextToken = data?.apsAppUserNotesByUserId?.nextToken;
      } while (nextToken);

      all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setNotes(all);

      // Hydrate titles for session/contact notes (API key models).
      const sessionIds = Array.from(new Set(all.map((n) => n.sessionId).filter(Boolean))) as string[];
      const profileIds = Array.from(new Set(all.map((n) => n.profileId).filter(Boolean))) as string[];

      const missingSessions = sessionIds.filter((id) => !(id in sessionsById));
      const missingProfiles = profileIds.filter((id) => !(id in profilesById));

      if (missingSessions.length) {
        const entries = await Promise.all(
          missingSessions.map(async (id) => {
            try {
              const resp = await graphqlClient.graphql({ query: getSessionMinimal, variables: { id } });
              const data = resp.data as { getApsAppSession?: SessionMini | null };
              return [id, data.getApsAppSession || null] as const;
            } catch {
              return [id, null] as const;
            }
          })
        );
        const patch: Record<string, SessionMini | null> = {};
        for (const [id, s] of entries) patch[id] = s;
        setSessionsById((prev) => ({ ...prev, ...patch }));
      }

      if (missingProfiles.length) {
        const entries = await Promise.all(
          missingProfiles.map(async (id) => {
            try {
              const resp = await graphqlClient.graphql({ query: getProfileMinimal, variables: { id } });
              const data = resp.data as { getApsAppUserProfile?: ProfileMini | null };
              return [id, data.getApsAppUserProfile || null] as const;
            } catch {
              return [id, null] as const;
            }
          })
        );
        const patch: Record<string, ProfileMini | null> = {};
        for (const [id, p] of entries) patch[id] = p;
        setProfilesById((prev) => ({ ...prev, ...patch }));
      }
    } catch (e: any) {
      console.error('Load all notes failed:', e);
      setError(e?.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [userId, sessionsById, profilesById]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const sections: NotesSection[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items: SectionItem[] = [];

    for (const n of notes) {
      if (mode === 'sessions') {
        if (!n.sessionId) continue;
        const row: SectionItem = { kind: 'session', note: n, session: sessionsById[n.sessionId] };
        if (!q) {
          items.push(row);
          continue;
        }
        const haystack = [
          (n.note || '').toString(),
          titleizeSession(row.session),
          subtitleSession(row.session),
        ]
          .join(' ')
          .toLowerCase();
        if (haystack.includes(q)) items.push(row);
        continue;
      }

      // contacts
      if (!n.profileId) continue;
      const row: SectionItem = { kind: 'contact', note: n, profile: profilesById[n.profileId] };
      if (!q) {
        items.push(row);
        continue;
      }
      const haystack = [
        (n.note || '').toString(),
        titleizeProfile(row.profile),
        subtitleProfile(row.profile),
      ]
        .join(' ')
        .toLowerCase();
      if (haystack.includes(q)) items.push(row);
    }

    return [
      {
        title: mode === 'sessions' ? 'Session Notes' : 'Contact Notes',
        data: items,
      },
    ];
  }, [notes, sessionsById, profilesById, mode, search]);

  if (!userId) {
    return (
      <AppScreen>
        <Text style={styles.muted}>Sign in to view notes.</Text>
      </AppScreen>
    );
  }

  if (loading) {
    return (
      <AppScreen>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading notes…</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen padded={false}>
      <View style={styles.topBar}>
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleButton, mode === 'sessions' && styles.toggleButtonActive]}
            onPress={() => setMode('sessions')}
          >
            <Text style={[styles.toggleText, mode === 'sessions' && styles.toggleTextActive]}>
              Sessions
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, mode === 'contacts' && styles.toggleButtonActive]}
            onPress={() => setMode('contacts')}
          >
            <Text style={[styles.toggleText, mode === 'contacts' && styles.toggleTextActive]}>
              Contacts
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={mode === 'sessions' ? 'Search notes & sessions…' : 'Search notes & contacts…'}
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn’t load notes</Text>
          <Text style={styles.muted}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.note.id}
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.muted}>
                {search.trim()
                  ? 'No matches.'
                  : mode === 'sessions'
                    ? 'No session notes yet.'
                    : 'No contact notes yet.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const when = formatWhen(item.note.createdAt);
            const body = (item.note.note || '').toString().trim();

            const title =
              item.kind === 'session' ? titleizeSession(item.session) : titleizeProfile(item.profile);
            const subtitle =
              item.kind === 'session'
                ? subtitleSession(item.session)
                : subtitleProfile(item.profile);

            const icon = item.kind === 'session' ? 'calendar-outline' : 'person-outline';

            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
                onPress={() => {
                  if (item.kind === 'session' && item.note.sessionId) {
                    router.push({ pathname: '/(main)/agenda/[id]', params: { id: item.note.sessionId } });
                    return;
                  }
                  if (item.kind === 'contact' && item.note.profileId) {
                    router.push({
                      pathname: '/(main)/community/[id]',
                      params: {
                        id: item.note.profileId,
                        returnTo: '/(main)/profile/notes',
                        returnLabel: 'Back to Notes',
                      },
                    });
                  }
                }}
              >
                <View style={styles.rowLeft}>
                  <Ionicons name={icon as any} size={18} color={ui.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    {!!subtitle && (
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    )}
                    {!!body && (
                      <Text style={styles.rowBody} numberOfLines={3}>
                        {body}
                      </Text>
                    )}
                    {!!when && <Text style={styles.rowMeta}>{when}</Text>}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={ui.colors.muted} />
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: ui.space.sm }} />}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { color: ui.colors.muted },

  topBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
    backgroundColor: ui.colors.bg,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleTextActive: {
    color: autopackColors.apBlue,
    fontWeight: '800',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },

  listContent: { padding: 16 },
  sectionHeader: {
    backgroundColor: ui.colors.bg,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  sectionHeaderText: { fontWeight: '900', color: ui.colors.text },

  row: {
    backgroundColor: ui.colors.surface,
    borderRadius: ui.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  rowTitle: { fontWeight: '900', color: ui.colors.text },
  rowSubtitle: { marginTop: 2, color: ui.colors.muted, fontWeight: '600' },
  rowBody: { marginTop: 8, color: ui.colors.text, lineHeight: 20 },
  rowMeta: { marginTop: 8, color: ui.colors.muted, fontSize: 12, fontWeight: '600' },

  empty: { paddingVertical: 20, alignItems: 'center' },

  errorBox: { padding: 16, gap: 10 },
  errorTitle: { fontSize: 16, fontWeight: '900', color: ui.colors.text },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: ui.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: { color: '#fff', fontWeight: '800' },
});


