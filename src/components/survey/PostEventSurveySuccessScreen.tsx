import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { POST_EVENT_SURVEY_ROUTE } from '../../config/postEventSurvey';
import { useCurrentAppUser, useCurrentUserRegistrant } from '../../hooks/useApsStore';
import { getMyPostEventSurvey } from '../../services/postEventSurvey';
import { useApsStore } from '../../store/apsStore';
import { autopackColors } from '../../theme';
import { AppButton } from '../../ui/AppButton';
import { ui } from '../../ui/tokens';
import { VerticalGradient } from './VerticalGradient';

export default function PostEventSurveySuccessScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const animationSize = Math.min(260, Math.max(180, width - 96));
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
      let stay = false;
      try {
        const existing = await getMyPostEventSurvey(registrantId);
        if (cancelled) return;
        stay = !!existing;
        if (!existing) router.replace(POST_EVENT_SURVEY_ROUTE as any);
      } catch {
        if (!cancelled) router.replace(POST_EVENT_SURVEY_ROUTE as any);
      } finally {
        if (!cancelled && stay) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [justSubmitted, registrantId, userLoading]);

  if (checking) {
    return (
      <View style={styles.centered}>
        <VerticalGradient />
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24, paddingTop: 28 }]}>
      <VerticalGradient from="#041E36" to="#0E6EAB" />
      <View
        style={[styles.animationSquare, { width: animationSize, height: animationSize }]}
        accessibilityLabel="Celebration animation"
      >
        <Ionicons name="sparkles" size={48} color={autopackColors.apYellow} />
      </View>
      <Text style={styles.kicker}>That's a wrap</Text>
      <Text style={styles.title}>Thanks for telling us</Text>
      <Text style={styles.body}>
        This is the good stuff. Your thoughts help shape next year's Automotive Packaging Summit.
      </Text>
      <Text style={styles.directions}>
        Show this screen at the registration desk and they'll hand you a free t-shirt.
      </Text>
      <AppButton
        title="Back to the hub"
        onPress={() => router.replace('/(main)/hub')}
        variant="secondary"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041E36',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: '#041E36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationSquare: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(228,168,0,0.85)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  kicker: {
    color: autopackColors.apYellow,
    fontFamily: ui.fonts.oswaldSemiBold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  title: { ...ui.text.h1, color: '#fff', fontSize: 32, marginTop: 4, marginBottom: 12, textAlign: 'center' },
  body: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 10,
  },
  directions: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 6,
  },
  button: { marginTop: 20, alignSelf: 'stretch' },
});
