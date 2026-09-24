import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { HUB_MODULE_CARD_MIN_HEIGHT } from '../hub/hubModuleCard';
import { autopackColors } from '../../theme';
import {
  POST_EVENT_SURVEY_ROUTE,
  POST_EVENT_SURVEY_SUCCESS_ROUTE,
} from '../../config/postEventSurvey';
import { useCurrentAppUser, useCurrentUserRegistrant } from '../../hooks/useApsStore';
import { getMyPostEventSurvey, getPostEventSurveyOpen } from '../../services/postEventSurvey';

export function PostEventSurveyCallout({ style }: { style?: StyleProp<ViewStyle> }) {
  const registrant = useCurrentUserRegistrant();
  const currentAppUser = useCurrentAppUser();
  const registrantId = registrant?.id || currentAppUser?.registrantId || null;
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        let isOpen = false;
        try {
          isOpen = await getPostEventSurveyOpen();
        } catch {
          isOpen = false;
        }

        let done = false;
        if (registrantId) {
          try {
            done = !!(await getMyPostEventSurvey(registrantId));
          } catch {
            done = false;
          }
        }

        if (cancelled) return;
        setOpen(isOpen);
        setCompleted(done);
      })();

      return () => {
        cancelled = true;
      };
    }, [registrantId]),
  );

  const title = completed ? "You're all set" : 'Post Event Survey';
  const subtitle = completed
    ? 'Tap to open your confirmation screen and present it at the registration desk for your Automotive Packaging Summit t-shirt. One per registrant.'
    : open
      ? 'How did we do? Complete your survey and present your confirmation screen at the registration desk to get your Automotive Packaging Summit t-shirt.'
      : 'Tell us how the show went. Complete it and present your confirmation screen at the registration desk for your Automotive Packaging Summit t-shirt.';

  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() =>
        router.push((completed ? POST_EVENT_SURVEY_SUCCESS_ROUTE : POST_EVENT_SURVEY_ROUTE) as any)
      }
      accessibilityRole="button"
      accessibilityLabel={
        completed
          ? 'Open your summit feedback confirmation'
          : open
            ? 'Open the Post Event Survey'
            : 'Post Event Survey, not open yet'
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons
            name={completed ? 'checkmark-circle' : open ? 'shirt-outline' : 'lock-closed'}
            size={20}
            color={autopackColors.apYellow}
          />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>Automotive Packaging Summit</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#fff" />
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: '#3D5A4C',
    minHeight: HUB_MODULE_CARD_MIN_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1 },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    lineHeight: 20,
  },
});
