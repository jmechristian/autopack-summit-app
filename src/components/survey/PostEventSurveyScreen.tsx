import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  POST_EVENT_SURVEY_IDENTITIES,
  POST_EVENT_SURVEY_SESSIONS,
  POST_EVENT_SURVEY_SUCCESS_ROUTE,
  identityFromAttendeeType,
  type PostEventSurveyIdentity,
  type PostEventSurveySessionId,
} from '../../config/postEventSurvey';
import { useCurrentAppUser, useCurrentUserRegistrant } from '../../hooks/useApsStore';
import {
  getMyPostEventSurvey,
  isPostEventSurveySchemaError,
  submitPostEventSurvey,
} from '../../services/postEventSurvey';
import { useApsStore } from '../../store/apsStore';
import { autopackColors } from '../../theme';
import { AppButton } from '../../ui/AppButton';
import { ui } from '../../ui/tokens';

const MAX_TEXT = 2000;

type SessionRatings = Partial<Record<PostEventSurveySessionId, number>>;

function clip(value: string) {
  return value.slice(0, MAX_TEXT);
}

function RatingPills(props: {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <View>
      <View style={styles.pillRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = props.value === n;
          return (
            <Pressable
              key={n}
              onPress={() => props.onChange(n)}
              disabled={props.disabled}
              style={[styles.pill, selected && styles.pillSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${n}`}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      {props.lowLabel || props.highLabel ? (
        <View style={styles.pillCaptions}>
          <Text style={styles.caption}>{props.lowLabel}</Text>
          <Text style={styles.caption}>{props.highLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StarRating(props: {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (props.value || 0) >= n;
        return (
          <Pressable
            key={n}
            onPress={() => props.onChange(n)}
            disabled={props.disabled}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
          >
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={32}
              color={filled ? autopackColors.apYellow : '#d1d5db'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function PostEventSurveyScreen() {
  const insets = useSafeAreaInsets();
  const currentAppUser = useCurrentAppUser();
  const registrant = useCurrentUserRegistrant();
  const userLoading = useApsStore((state) => state.loading.currentAppUser);
  const registrantId = registrant?.id || currentAppUser?.registrantId || null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [identityType, setIdentityType] = useState<PostEventSurveyIdentity | null>(
    identityFromAttendeeType(registrant?.attendeeType),
  );
  const [mostBeneficial, setMostBeneficial] = useState('');
  const [leastBeneficial, setLeastBeneficial] = useState('');
  const [summitRating, setSummitRating] = useState<number | null>(null);
  const [gainedValue, setGainedValue] = useState<boolean | null>(null);
  const [gainedValueComments, setGainedValueComments] = useState('');
  const [favoritePresentation, setFavoritePresentation] = useState('');
  const [sessionRatings, setSessionRatings] = useState<SessionRatings>({});
  const [networkGrowthRating, setNetworkGrowthRating] = useState<number | null>(null);
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [recommendName, setRecommendName] = useState('');
  const [recommendCompany, setRecommendCompany] = useState('');
  const [recommendEmail, setRecommendEmail] = useState('');
  const [recommendPhone, setRecommendPhone] = useState('');

  const disabled = submitting || loading;

  const goToSuccess = () => {
    router.replace({
      pathname: POST_EVENT_SURVEY_SUCCESS_ROUTE,
      params: { submitted: '1' },
    } as any);
  };

  useEffect(() => {
    if (identityType) return;
    const mapped = identityFromAttendeeType(registrant?.attendeeType);
    if (mapped) setIdentityType(mapped);
  }, [identityType, registrant?.attendeeType]);

  useEffect(() => {
    let cancelled = false;
    if (userLoading && !registrantId) return;
    if (!registrantId) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const existing = await getMyPostEventSurvey(registrantId);
        if (cancelled) return;
        if (existing) {
          goToSuccess();
          return;
        }
        setLoadError(null);
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        if (isPostEventSurveySchemaError(error)) {
          setLoadError(
            'The survey is not live on the backend yet. Deploy the latest schema, then try again.',
          );
        } else {
          setLoadError('We could not check whether you already submitted. Pull to retry.');
        }
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [registrantId, userLoading]);

  const sessionRatingList = useMemo(
    () =>
      POST_EVENT_SURVEY_SESSIONS.flatMap((session) => {
        const rating = sessionRatings[session.id];
        return rating ? [{ id: session.id, rating }] : [];
      }),
    [sessionRatings],
  );

  const submit = async () => {
    if (!currentAppUser?.id || !registrantId) {
      Alert.alert('Sign in required', 'Please sign in to submit the survey.');
      return;
    }
    if (!identityType) {
      Alert.alert('Almost there', 'Please identify yourself before submitting.');
      return;
    }
    if (!summitRating) {
      Alert.alert('Almost there', 'Please rate the summit before submitting.');
      return;
    }
    if (gainedValue == null) {
      Alert.alert(
        'Almost there',
        'Please tell us whether you gained valuable information or connections.',
      );
      return;
    }
    if (!networkGrowthRating) {
      Alert.alert('Almost there', 'Please rate how much you were able to grow your network.');
      return;
    }

    setSubmitting(true);
    try {
      await submitPostEventSurvey({
        userId: currentAppUser.id,
        registrantId,
        identityType,
        mostBeneficial,
        leastBeneficial,
        summitRating,
        gainedValue,
        gainedValueComments,
        favoritePresentation,
        sessionRatings: sessionRatingList,
        networkGrowthRating,
        improvementSuggestions,
        recommendName,
        recommendCompany,
        recommendEmail,
        recommendPhone,
      });
      goToSuccess();
    } catch (error) {
      console.error('Post-event survey submit failed:', error);
      if (isPostEventSurveySchemaError(error)) {
        Alert.alert(
          'Survey not available yet',
          'The survey data model still needs to be deployed. Please try again after the backend update.',
        );
      } else {
        Alert.alert(
          'Could not submit',
          (error as { message?: string })?.message ||
            'Please try again. If this keeps happening, contact support.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={autopackColors.apBlue} />
        <Text style={styles.muted}>Checking your survey…</Text>
      </View>
    );
  }

  if (!registrantId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Registration needed</Text>
        <Text style={styles.lead}>We could not match this app account to a registrant.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>2026 Post-Event Survey</Text>
        <Text style={styles.title}>How was the summit?</Text>
        <Text style={styles.lead}>
          This is optional, but you can only submit it once. After you send it, we will lock your
          answers and show a confirmation screen.
        </Text>

        {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

        <Text style={styles.label}>Identify yourself as (check one)</Text>
        <View style={styles.choiceList}>
          {POST_EVENT_SURVEY_IDENTITIES.map((option) => {
            const selected = identityType === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.choiceRow, selected && styles.choiceRowSelected]}
                onPress={() => setIdentityType(option.value)}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? ui.colors.primary : ui.colors.muted}
                />
                <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>What was the most and least beneficial part of the summit?</Text>
        <Text style={styles.fieldHint}>Best</Text>
        <TextInput
          value={mostBeneficial}
          onChangeText={(t) => setMostBeneficial(clip(t))}
          placeholder="What helped the most?"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          multiline
          textAlignVertical="top"
          editable={!disabled}
        />
        <Text style={styles.fieldHint}>Worst</Text>
        <TextInput
          value={leastBeneficial}
          onChangeText={(t) => setLeastBeneficial(clip(t))}
          placeholder="What was least useful?"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          multiline
          textAlignVertical="top"
          editable={!disabled}
        />

        <Text style={styles.label}>How many stars would you rate the summit?</Text>
        <StarRating value={summitRating} onChange={setSummitRating} disabled={disabled} />

        <Text style={styles.label}>
          Do you feel that you have gained valuable information or connections as a result of this
          summit?
        </Text>
        <View style={styles.yesNoRow}>
          {[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ].map((option) => {
            const selected = gainedValue === option.value;
            return (
              <Pressable
                key={option.label}
                style={[styles.yesNoChip, selected && styles.yesNoChipSelected]}
                onPress={() => setGainedValue(option.value)}
                disabled={disabled}
              >
                <Text style={[styles.yesNoText, selected && styles.yesNoTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.fieldHint}>Comments</Text>
        <TextInput
          value={gainedValueComments}
          onChangeText={(t) => setGainedValueComments(clip(t))}
          placeholder="Anything you want to add?"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.inputTall]}
          multiline
          textAlignVertical="top"
          editable={!disabled}
        />

        <Text style={styles.label}>What was your favorite presentation, case study, or panel?</Text>
        <TextInput
          value={favoritePresentation}
          onChangeText={(t) => setFavoritePresentation(clip(t))}
          placeholder="Title, speaker, or session name"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          multiline
          textAlignVertical="top"
          editable={!disabled}
        />

        <Text style={styles.label}>Rate the sessions</Text>
        <Text style={styles.lead}>Optional. Skip any session you did not attend.</Text>
        {POST_EVENT_SURVEY_SESSIONS.map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>{session.title}</Text>
            <RatingPills
              value={sessionRatings[session.id] ?? null}
              onChange={(rating) =>
                setSessionRatings((prev) => ({ ...prev, [session.id]: rating }))
              }
              disabled={disabled}
              lowLabel="Worst"
              highLabel="Best"
            />
          </View>
        ))}

        <Text style={styles.label}>Were you able to grow your network?</Text>
        <RatingPills
          value={networkGrowthRating}
          onChange={setNetworkGrowthRating}
          disabled={disabled}
          lowLabel="Least"
          highLabel="Most"
        />

        <Text style={styles.label}>Is there anything we could have done to make the Summit better for you?</Text>
        <TextInput
          value={improvementSuggestions}
          onChangeText={(t) => setImprovementSuggestions(clip(t))}
          placeholder="Ideas, logistics, programming, anything else"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.inputTall]}
          multiline
          textAlignVertical="top"
          editable={!disabled}
        />

        <Text style={styles.label}>
          Who would you like to see attending or presenting next year?
        </Text>
        <TextInput
          value={recommendName}
          onChangeText={setRecommendName}
          placeholder="Name"
          placeholderTextColor="#9ca3af"
          style={styles.singleInput}
          editable={!disabled}
        />
        <TextInput
          value={recommendCompany}
          onChangeText={setRecommendCompany}
          placeholder="Company"
          placeholderTextColor="#9ca3af"
          style={styles.singleInput}
          editable={!disabled}
        />
        <TextInput
          value={recommendEmail}
          onChangeText={setRecommendEmail}
          placeholder="Email"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.singleInput}
          editable={!disabled}
        />
        <TextInput
          value={recommendPhone}
          onChangeText={setRecommendPhone}
          placeholder="Phone number"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          style={styles.singleInput}
          editable={!disabled}
        />

        <AppButton
          title={submitting ? 'Submitting…' : 'Submit survey'}
          onPress={() => void submit()}
          disabled={disabled}
          style={styles.submit}
        />
        {submitting ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={autopackColors.apBlue} />
            <Text style={styles.muted}>Saving your response…</Text>
          </View>
        ) : (
          <Text style={styles.footnote}>You can only complete this once.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 8 },
  centered: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  kicker: {
    color: autopackColors.apBlue,
    fontFamily: ui.fonts.oswaldSemiBold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  title: { ...ui.text.h1, marginTop: 2 },
  emptyTitle: { ...ui.text.h2, textAlign: 'center' },
  lead: { color: ui.colors.muted, lineHeight: 20, marginBottom: 6 },
  error: { color: ui.colors.danger, lineHeight: 20, marginBottom: 8 },
  label: { fontWeight: '800', color: ui.colors.text, marginTop: 12 },
  fieldHint: { color: ui.colors.muted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  muted: { color: ui.colors.muted, fontSize: 13 },
  footnote: { color: ui.colors.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
  choiceList: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ui.colors.border,
  },
  choiceRowSelected: { backgroundColor: '#F8FBFF' },
  choiceLabel: { color: ui.colors.text, fontSize: 15, fontWeight: '600', flex: 1 },
  choiceLabelSelected: { color: ui.colors.primary },
  input: {
    minHeight: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: ui.colors.text,
    backgroundColor: '#f9fafb',
  },
  inputTall: { minHeight: 110 },
  singleInput: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: ui.colors.text,
    backgroundColor: '#f9fafb',
  },
  starRow: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
  yesNoRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  yesNoChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  yesNoChipSelected: {
    borderColor: ui.colors.primary,
    backgroundColor: '#F8FBFF',
  },
  yesNoText: { fontWeight: '800', color: ui.colors.text },
  yesNoTextSelected: { color: ui.colors.primary },
  sessionCard: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    marginTop: 8,
    gap: 8,
  },
  sessionTitle: { color: ui.colors.text, fontWeight: '700', lineHeight: 20 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pillSelected: {
    backgroundColor: autopackColors.apBlue,
    borderColor: autopackColors.apBlue,
  },
  pillText: { fontWeight: '800', color: ui.colors.text },
  pillTextSelected: { color: '#fff' },
  pillCaptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  caption: { color: ui.colors.muted, fontSize: 12, fontWeight: '700' },
  submit: { marginTop: 18 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
});
