import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  postEventSurveyIdentityLabel,
  postEventSurveySessionTitle,
} from '../../../config/postEventSurvey';
import {
  deletePostEventSurvey,
  getPostEventSurveyOpen,
  isPostEventSurveySchemaError,
  listPostEventSurveyCompletions,
  setPostEventSurveyOpen,
  type PostEventSurveyCompletion,
} from '../../../services/postEventSurvey';
import { AppButton } from '../../../ui/AppButton';
import { AppCard } from '../../../ui/AppCard';
import { AppScreen } from '../../../ui/AppScreen';
import { ui } from '../../../ui/tokens';
import { formatLocalDateTime } from '../../../utils/formatLocalDateTime';

function answer(value?: string | null) {
  const text = String(value || '').trim();
  return text || '—';
}

function CompletionRow(props: {
  row: PostEventSurveyCompletion;
  expanded: boolean;
  resetting: boolean;
  onToggle: () => void;
  onReset: () => void;
}) {
  const { row } = props;
  const identity = postEventSurveyIdentityLabel(row.identityType);
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <Pressable onPress={props.onToggle} style={styles.rowText} accessibilityRole="button">
          <Text style={styles.rowName}>{row.name}</Text>
          <Text style={styles.rowMeta}>
            {[row.company, row.email, identity].filter(Boolean).join(' · ') || 'No company on file'}
          </Text>
          <Text style={styles.rowTime}>
            {row.completedAt ? formatLocalDateTime(row.completedAt) : 'Completed'}
          </Text>
        </Pressable>
        <Pressable
          onPress={props.onReset}
          disabled={props.resetting}
          style={styles.resetBtn}
          accessibilityRole="button"
          accessibilityLabel={`Reset survey for ${row.name}`}
        >
          <Text style={styles.resetText}>{props.resetting ? 'Resetting…' : 'Reset'}</Text>
        </Pressable>
        <Pressable onPress={props.onToggle} accessibilityRole="button" accessibilityLabel="Show answers">
          <Ionicons name={props.expanded ? 'chevron-up' : 'chevron-down'} size={18} color={ui.colors.muted} />
        </Pressable>
      </View>
      {props.expanded ? (
        <View style={styles.answers}>
          <Text style={styles.answerLabel}>Summit stars</Text>
          <Text style={styles.answerValue}>{row.summitRating ?? '—'}</Text>
          <Text style={styles.answerLabel}>Most beneficial</Text>
          <Text style={styles.answerValue}>{answer(row.mostBeneficial)}</Text>
          <Text style={styles.answerLabel}>Least beneficial</Text>
          <Text style={styles.answerValue}>{answer(row.leastBeneficial)}</Text>
          <Text style={styles.answerLabel}>Gained value</Text>
          <Text style={styles.answerValue}>
            {row.gainedValue == null ? '—' : row.gainedValue ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.answerLabel}>Comments</Text>
          <Text style={styles.answerValue}>{answer(row.gainedValueComments)}</Text>
          <Text style={styles.answerLabel}>Favorite presentation</Text>
          <Text style={styles.answerValue}>{answer(row.favoritePresentation)}</Text>
          <Text style={styles.answerLabel}>Network growth</Text>
          <Text style={styles.answerValue}>{row.networkGrowthRating ?? '—'}</Text>
          {row.sessionRatings.length ? (
            <>
              <Text style={styles.answerLabel}>Session ratings</Text>
              {row.sessionRatings.map((session) => (
                <Text key={session.id} style={styles.answerValue}>
                  {session.rating} — {postEventSurveySessionTitle(session.id)}
                </Text>
              ))}
            </>
          ) : null}
          <Text style={styles.answerLabel}>How we could improve</Text>
          <Text style={styles.answerValue}>{answer(row.improvementSuggestions)}</Text>
          <Text style={styles.answerLabel}>Who to invite next year</Text>
          <Text style={styles.answerValue}>
            {[row.recommendName, row.recommendCompany, row.recommendEmail, row.recommendPhone]
              .map((part) => String(part || '').trim())
              .filter(Boolean)
              .join(' · ') || '—'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function AdminPostEventSurveyScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [rows, setRows] = useState<PostEventSurveyCompletion[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOpen(await getPostEventSurveyOpen());
    } catch (e) {
      setError(
        isPostEventSurveySchemaError(e)
          ? 'The unlock switch is not on the backend yet. Run amplify push, then try again.'
          : (e as { message?: string })?.message || 'Unable to load the survey lock.',
      );
    }
    try {
      setRows(await listPostEventSurveyCompletions());
    } catch (e) {
      setError(
        isPostEventSurveySchemaError(e)
          ? 'Survey responses are not on the backend yet. Run amplify push, then reopen this screen.'
          : (e as { message?: string })?.message || 'Unable to load survey completions.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.email, row.company, postEventSurveyIdentityLabel(row.identityType)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const resetCompletion = (row: PostEventSurveyCompletion) => {
    Alert.alert(
      'Reset this survey?',
      `${row.name} will be able to fill it out again. Their current answers will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setResettingId(row.id);
              setError(null);
              try {
                await deletePostEventSurvey(row.id);
                setRows((current) => current.filter((item) => item.id !== row.id));
                if (expandedId === row.id) setExpandedId(null);
              } catch (e) {
                setError((e as { message?: string })?.message || 'Unable to reset that survey.');
              } finally {
                setResettingId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const toggleOpen = () => {
    const next = !open;
    Alert.alert(
      next ? 'Unlock the survey?' : 'Lock the survey?',
      next
        ? 'Attendees will be able to open the post-event survey from the hub.'
        : 'Attendees who have not finished will see the survey as locked again. Completed confirmations stay available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Unlock' : 'Lock',
          style: next ? 'default' : 'destructive',
          onPress: () => {
            void (async () => {
              setSaving(true);
              setError(null);
              try {
                const saved = await setPostEventSurveyOpen(next);
                setOpen(saved);
              } catch (e) {
                setError(
                  isPostEventSurveySchemaError(e)
                    ? 'The unlock switch is not on the backend yet. Run amplify push, then try again.'
                    : (e as { message?: string })?.message || 'Unable to update the survey lock.',
                );
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.title}>Post-Event Survey</Text>
          <Text style={styles.meta}>
            The hub card stays locked until you unlock it. Each person can submit once, then their
            confirmation screen is what they show at the registration desk for a free t-shirt.
          </Text>
          <Text style={[styles.status, open ? styles.statusOpen : styles.statusLocked]}>
            {open ? 'Unlocked for attendees' : 'Locked'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton
            title={saving ? 'Saving…' : open ? 'Lock survey' : 'Unlock survey'}
            onPress={toggleOpen}
            disabled={saving || loading}
            variant={open ? 'outline' : 'primary'}
          />
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Completions ({rows.length})</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, company, or email"
            placeholderTextColor={ui.colors.muted}
            style={styles.search}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loading ? <ActivityIndicator color={ui.colors.primary} style={styles.loader} /> : null}
          {!loading && !filtered.length ? (
            <Text style={styles.meta}>{rows.length ? 'No matches.' : 'No one has submitted yet.'}</Text>
          ) : (
            filtered.map((row) => (
              <CompletionRow
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                resetting={resettingId === row.id}
                onToggle={() => setExpandedId((current) => (current === row.id ? null : row.id))}
                onReset={() => resetCompletion(row)}
              />
            ))
          )}
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: 28, gap: 12 },
  card: { gap: 10 },
  title: { fontSize: 22, fontWeight: '900', color: ui.colors.text },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: ui.colors.text },
  meta: { color: ui.colors.muted, lineHeight: 20 },
  status: { fontWeight: '800' },
  statusOpen: { color: '#047857' },
  statusLocked: { color: '#92400E' },
  error: { color: ui.colors.danger, lineHeight: 20 },
  search: {
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: ui.colors.text,
  },
  loader: { alignSelf: 'flex-start' },
  rowCard: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontWeight: '800', color: ui.colors.text, fontSize: 16 },
  rowMeta: { color: ui.colors.muted, lineHeight: 18 },
  rowTime: { color: ui.colors.text, fontWeight: '700', fontSize: 12, marginTop: 2 },
  resetBtn: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resetText: { color: '#b91c1c', fontWeight: '800', fontSize: 12 },
  answers: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ui.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  answerLabel: { marginTop: 8, fontSize: 12, fontWeight: '800', color: ui.colors.muted },
  answerValue: { color: ui.colors.text, lineHeight: 20 },
});
