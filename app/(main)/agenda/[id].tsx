import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { autopackColors } from '../../../src/theme';
import { graphqlClient } from '../../../src/utils/graphqlClient';
import { getApsAppSessionWithRelations } from '../../../src/graphql/customQueries';

type Speaker = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  title?: string | null;
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

function normalizeText(v?: string | null) {
  return (v || '').trim();
}

export default function AgendaDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setError(null);
      setLoading(true);
      try {
        const resp = await graphqlClient.graphql({
          query: getApsAppSessionWithRelations,
          variables: { id },
        });
        const data = resp.data as any;
        const it = data?.getApsAppSession;
        if (!it?.id) throw new Error('Session not found');
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
          description: it.description ?? null,
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
    const start = normalizeText(session.startTime);
    const end = normalizeText(session.endTime);
    if (start && end) return `${start} – ${end}`;
    return start || '';
  }, [session]);

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
      <Text style={styles.title}>{title}</Text>
      {!!normalizeText(session?.location) && (
        <Text style={styles.location}>{normalizeText(session?.location)}</Text>
      )}

      {!!normalizeText(session?.description) && (
        <>
          <View style={styles.divider} />
          <RenderHtml
            contentWidth={Math.max(1, width - 32)}
            source={{ html: normalizeText(session?.description) }}
            baseStyle={styles.description}
            tagsStyles={{
              p: { marginTop: 0, marginBottom: 12 },
              ul: { marginTop: 0, marginBottom: 12, paddingLeft: 18 },
              ol: { marginTop: 0, marginBottom: 12, paddingLeft: 18 },
              li: { marginBottom: 6 },
              a: { color: autopackColors.apBlue, textDecorationLine: 'underline' },
              strong: { fontWeight: 'bold' },
              b: { fontWeight: 'bold' },
              em: { fontStyle: 'italic' },
            }}
          />
        </>
      )}

      {!!(session?.speakers || []).length && (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Speakers</Text>
          {(session?.speakers || []).map((s) => {
            const name = `${normalizeText(s.firstName)} ${normalizeText(s.lastName)}`.trim();
            const subtitle = [normalizeText(s.title), normalizeText(s.company)].filter(Boolean).join(' • ');
            return (
              <View key={s.id} style={styles.row}>
                <Text style={styles.rowTitle}>{name || 'Speaker'}</Text>
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
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  location: { marginTop: 10, color: '#4B5563', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 14 },
  description: { color: '#374151', lineHeight: 20, fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 10 },
  row: { paddingVertical: 10 },
  rowTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  rowSubtitle: { marginTop: 4, color: '#6B7280' },
});
