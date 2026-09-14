import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { POST_EVENT_SURVEY_ROUTE } from '../../config/postEventSurvey';
import { useCurrentAppUser, useCurrentUserRegistrant } from '../../hooks/useApsStore';
import { getMyPostEventSurvey } from '../../services/postEventSurvey';
import { useApsStore } from '../../store/apsStore';
import { autopackColors } from '../../theme';
import { AppButton } from '../../ui/AppButton';
import { ui } from '../../ui/tokens';

export default function PostEventSurveySuccessScreen() {
  const insets = useSafeAreaInsets();
  const currentAppUser = useCurrentAppUser();
  const registrant = useCurrentUserRegistrant();
  const userLoading = useApsStore((state) => state.loading.currentAppUser);
  const registrantId = registrant?.id || currentAppUser?.registrantId || null;
  const params = useLocalSearchParams<{ submitted?: string | string[] }>();
  const justSubmitted = String(Array.isArray(params.submitted) ? params.submitted[0] : params.submitted || '') === '1';
  const [checking, setChecking] = useState(!justSubmitted);

  useEffect(() => {
    let cancelled = false;
    if (justSubmitted) {
      setChecking(false);
      return;
    }
    if (userLoading) return;
    if (!registrantId) {
      setChecking(false);
      router.replace(POST_EVENT_SURVEY_ROUTE as any);
      return;
    }

    void (async () => {
      try {
        const existing = await getMyPostEventSurvey(registrantId);
        if (cancelled) return;
        if (!existing) {
          router.replace(POST_EVENT_SURVEY_ROUTE as any);
          return;
        }
      } catch {
        // Stay on the confirmation if the check fails after a successful submit.
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [justSubmitted, registrantId, userLoading]);

  if (checking) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={autopackColors.apBlue} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark-circle" size={64} color={autopackColors.apBlue} />
      </View>
      <Text style={styles.kicker}>Survey received</Text>
      <Text style={styles.title}>Thank you</Text>
      <Text style={styles.body}>
        Your 2026 post-event survey is on file for this registration. You will not be able to submit
        it again.
      </Text>
      <Text style={styles.body}>
        Show this confirmation at the shirt table to pick up your gift.
      </Text>
      <AppButton
        title="Back to Hub"
        onPress={() => router.replace('/(main)/hub')}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 36,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: { marginBottom: 12 },
  kicker: {
    color: autopackColors.apBlue,
    fontFamily: ui.fonts.oswaldSemiBold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  title: { ...ui.text.h1, fontSize: 32, marginTop: 4, marginBottom: 12 },
  body: {
    color: ui.colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  button: { marginTop: 20, alignSelf: 'stretch' },
});
