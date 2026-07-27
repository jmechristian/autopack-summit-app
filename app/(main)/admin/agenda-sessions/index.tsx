import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminAgendaSession,
  listAdminAgendaSessions,
  normalizeAgendaTimeInput,
} from '../../../../src/components/admin/agenda/adminAgendaService';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AdminAgendaSessionsListScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agendaId, setAgendaId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AdminAgendaSession[]>([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAdminAgendaSessions();
      setAgendaId(data.agendaId);
      setSessions(data.sessions);
    } catch (e: any) {
      setError(e?.message || 'Unable to load agenda sessions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => {
      const title = String(session.title || '').toLowerCase();
      const date = String(session.date || '').toLowerCase();
      const location = String(session.location || '').toLowerCase();
      const description = String(session.description || '').toLowerCase();
      return title.includes(q) || date.includes(q) || location.includes(q) || description.includes(q);
    });
  }, [search, sessions]);

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Agenda / Sessions</Text>
          <Text style={styles.meta}>Agenda ID: {agendaId || 'Resolving...'}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.createButtonWrap}>
            <AppButton
              title='New Session'
              onPress={() => router.push('/(main)/admin/agenda-sessions/create')}
              style={styles.adminButton}
            />
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.titleRow}>
            <Ionicons name='search-outline' size={18} color={ui.colors.primary} />
            <Text style={styles.sectionTitle}>Search Sessions ({sessions.length})</Text>
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search by title, date, location, or description'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
        </AppCard>

        {loading ? <Text style={styles.meta}>Loading sessions...</Text> : null}

        {!loading && !filtered.length ? (
          <AppCard style={styles.card}>
            <Text style={styles.meta}>No sessions matched your search.</Text>
          </AppCard>
        ) : null}

        {!loading &&
          filtered.map((session) => {
            const start = normalizeAgendaTimeInput(session.startTime);
            const end = normalizeAgendaTimeInput(session.endTime);
            const timeWindow =
              start && end ? `${start} - ${end} ET` : start ? `${start} ET` : 'No time';
            return (
              <Pressable
                key={session.id}
                onPress={() =>
                  router.push({
                    pathname: '/(main)/admin/agenda-sessions/[sessionId]',
                    params: { sessionId: session.id },
                  })
                }
              >
                <AppCard style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionTitle}>{session.title || 'Untitled Session'}</Text>
                    <Text style={styles.meta}>
                      {[session.date || 'No date', timeWindow, session.location || 'No location'].join(' • ')}
                    </Text>
                  </View>
                  <Ionicons name='chevron-forward' size={18} color={ui.colors.muted} />
                </AppCard>
              </Pressable>
            );
          })}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl, paddingTop: 6 },
  card: { marginBottom: ui.space.md, paddingVertical: 14 },
  rowCard: {
    marginBottom: ui.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  sessionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16 },
  meta: { color: ui.colors.muted, marginTop: 4, lineHeight: 18 },
  error: { color: ui.colors.danger, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: ui.colors.text,
  },
  createButtonWrap: { marginTop: 12 },
  adminButton: { borderRadius: 10 },
});
