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
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { graphqlAuthClient, graphqlClient } from '../../utils/graphqlClient';
import { apsAppUserNotesByUserId } from '../../graphql/queries';
import { ui } from '../../ui/tokens';
import { AppScreen } from '../../ui/AppScreen';
import { autopackColors } from '../../theme';

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

export default function NotesTool() {
  const currentAppUser = useCurrentAppUser();
  const [tab, setTab] = useState<'sessions' | 'contacts'>('sessions');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [sessionsById, setSessionsById] = useState<Record<string, SessionMini>>({});
  const [profilesById, setProfilesById] = useState<Record<string, ProfileMini>>({});

  const load = useCallback(async () => {
    if (!currentAppUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await graphqlAuthClient.graphql({
        query: apsAppUserNotesByUserId,
        variables: { userId: currentAppUser.id, limit: 200 },
      });
      const data = resp.data as {
        apsAppUserNotesByUserId?: { items?: (NoteRow | null)[] };
      };
      const rows = (data.apsAppUserNotesByUserId?.items || []).filter(
        (x): x is NoteRow => !!x?.id
      );
      rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setNotes(rows);

      const sessionIds = rows.map((r) => r.sessionId).filter(Boolean) as string[];
      const profileIds = rows.map((r) => r.profileId).filter(Boolean) as string[];

      const uniqueSessions = Array.from(new Set(sessionIds)).filter((id) => !sessionsById[id]);
      const uniqueProfiles = Array.from(new Set(profileIds)).filter((id) => !profilesById[id]);

      if (uniqueSessions.length) {
        const sessionEntries = await Promise.all(
          uniqueSessions.map(async (id) => {
            try {
              const s = await graphqlClient.graphql({
                query: getSessionMinimal,
                variables: { id },
              });
              const session = (s.data as any)?.getApsAppSession as SessionMini | null;
              return session?.id ? ([session.id, session] as const) : null;
            } catch {
              return null;
            }
          })
        );
        const patch: Record<string, SessionMini> = {};
        for (const entry of sessionEntries) {
          if (!entry) continue;
          patch[entry[0]] = entry[1];
        }
        if (Object.keys(patch).length) {
          setSessionsById((prev) => ({ ...prev, ...patch }));
        }
      }

      if (uniqueProfiles.length) {
        const profileEntries = await Promise.all(
          uniqueProfiles.map(async (id) => {
            try {
              const p = await graphqlClient.graphql({
                query: getProfileMinimal,
                variables: { id },
              });
              const profile = (p.data as any)?.getApsAppUserProfile as ProfileMini | null;
              return profile?.id ? ([profile.id, profile] as const) : null;
            } catch {
              return null;
            }
          })
        );
        const patch: Record<string, ProfileMini> = {};
        for (const entry of profileEntries) {
          if (!entry) continue;
          patch[entry[0]] = entry[1];
        }
        if (Object.keys(patch).length) {
          setProfilesById((prev) => ({ ...prev, ...patch }));
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [currentAppUser?.id, profilesById, sessionsById]);

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
    const base = notes.filter((n) => (tab === 'sessions' ? !!n.sessionId : !!n.profileId));
    if (!q) return base;
    return base.filter((n) => {
      if (tab === 'sessions') {
        const s = sessionsById[n.sessionId || ''];
        const title = (s?.title || '').toLowerCase();
        return title.includes(q);
      }
      const p = profilesById[n.profileId || ''];
      const name = titleizeProfile(p).toLowerCase();
      const company = (p?.company || '').toLowerCase();
      return name.includes(q) || company.includes(q);
    });
  }, [notes, search, tab, sessionsById, profilesById]);

  const sections = useMemo(() => {
    if (tab === 'sessions') {
      return [
        {
          title: 'Session Notes',
          data: filtered,
        },
      ];
    }
    return [
      {
        title: 'Contact Notes',
        data: filtered,
      },
    ];
  }, [filtered, tab]);

  if (!currentAppUser?.id) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Sign in to view notes.</Text>
      </View>
    );
  }

  return (
    <AppScreen padded={false} style={styles.container}>
      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleBtn, tab === 'sessions' && styles.toggleBtnActive]}
          onPress={() => setTab('sessions')}
        >
          <Text style={[styles.toggleText, tab === 'sessions' && styles.toggleTextActive]}>
            Sessions
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, tab === 'contacts' && styles.toggleBtnActive]}
          onPress={() => setTab('contacts')}
        >
          <Text style={[styles.toggleText, tab === 'contacts' && styles.toggleTextActive]}>
            Contacts
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#6b7280" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes & sessions..."
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
        />
      </View>

      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={styles.noteCard}
            onPress={() => {
              if (item.sessionId) {
                router.push({ pathname: '/(main)/agenda/[id]', params: { id: item.sessionId } });
                return;
              }
              if (item.profileId) {
                router.push({
                  pathname: '/(main)/community/[id]',
                  params: { id: item.profileId, returnTo: '/(main)/profile/notes', returnLabel: 'Back to Notes' },
                });
              }
            }}
          >
            <Text style={styles.noteTitle}>
              {item.sessionId
                ? sessionsById[item.sessionId || '']?.title || 'Session'
                : titleizeProfile(profilesById[item.profileId || ''])}
            </Text>
            <Text style={styles.noteBody}>{item.note || 'Note'}</Text>
            <Text style={styles.noteMeta}>{formatWhen(item.createdAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.muted}>No notes yet.</Text> : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: ui.space.md,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: ui.colors.primary },
  toggleText: { fontWeight: '700', color: ui.colors.muted },
  toggleTextActive: { color: '#fff' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: ui.space.md,
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
  noteCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 12,
    marginBottom: ui.space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  noteTitle: { fontWeight: '700', color: ui.colors.primary },
  noteBody: { marginTop: 6, color: '#374151' },
  noteMeta: { marginTop: 8, color: ui.colors.muted, fontSize: 12 },
  muted: { color: ui.colors.muted, marginHorizontal: 12 },
  error: { color: ui.colors.danger, marginHorizontal: 12, marginBottom: ui.space.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: ui.space.lg },
});
