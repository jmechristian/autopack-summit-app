import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { autopackColors } from '../../theme';
import { ui } from '../../ui/tokens';
import {
  compareSessionsByStart,
  isSessionLive,
  isSessionPast,
  isSessionUpcoming,
} from '../../utils/sessionLive';

// 11:00 AM Eastern on Sept 30, 2026 == 15:00:00 UTC (first Wednesday session).
export const COUNTDOWN_TARGET_MS = new Date('2026-09-30T15:00:00Z').getTime();

export type HubCountdownSession = {
  id: string;
  title: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  embedUrl?: string | null;
};

function format(diffMs: number) {
  if (diffMs <= 0) return '00:00:00:00';
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  return [days, hours, minutes, seconds]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

function presentationUrl(embedUrl?: string | null) {
  const raw = (embedUrl || '').trim();
  return /^https?:\/\//i.test(raw) ? raw : '';
}

/** Session in progress, or the next one once the countdown has finished. */
export function selectCurrentSession<T extends HubCountdownSession>(sessions: T[], now: Date) {
  const sorted = [...sessions].sort(compareSessionsByStart);
  const live = sorted.find((session) => isSessionLive(session, now));
  if (live) return live;
  if (now.getTime() < COUNTDOWN_TARGET_MS) return null;
  return sorted.find((session) => !isSessionPast(session, now)) ?? null;
}

/** Sessions after the one on the countdown bar. */
export function selectUpcomingSessions<T extends HubCountdownSession>(sessions: T[], now: Date) {
  const currentId = selectCurrentSession(sessions, now)?.id;
  return sessions
    .filter((session) => isSessionUpcoming(session, now) && session.id !== currentId)
    .sort(compareSessionsByStart);
}

/**
 * Countdown until cocktail hour, then a live bar for the session in progress.
 * The one-second tick stays in this component so it never re-renders the rest
 * of Hub (important if/when the hero Rive is re-enabled).
 */
export function HubCountdownStrip({
  sessions,
}: {
  sessions: HubCountdownSession[];
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date(nowMs);
  const remaining = COUNTDOWN_TARGET_MS - nowMs;
  if (remaining > 0) {
    return (
      <View style={styles.strip}>
        <Text style={styles.timer}>{format(remaining)}</Text>
        <View style={styles.livePill}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
    );
  }

  const current = selectCurrentSession(sessions, now);
  const title = current?.title?.trim() || 'Live now';
  const url = current && isSessionLive(current, now) ? presentationUrl(current.embedUrl) : '';

  return (
    <View style={[styles.strip, styles.stripLive]}>
      <View style={styles.livePill}>
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      <Text style={styles.sessionTitle} numberOfLines={1}>
        {title}
      </Text>
      {url ? (
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={`Play ${title}`}
          hitSlop={8}
          onPress={() =>
            router.push({
              pathname: '/(main)/agenda/presentation',
              params: {
                url,
                title: title || 'Presentation',
                sessionId: current?.id,
                returnTo: '/(main)/hub',
              },
            })
          }
          style={styles.playBtn}
        >
          <Ionicons name='play' size={16} color='#fff' />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stripLive: {
    justifyContent: 'flex-start',
  },
  timer: {
    color: ui.colors.secondary,
    fontWeight: '800',
    fontSize: 20,
  },
  sessionTitle: {
    flex: 1,
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: autopackColors.apRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePill: {
    backgroundColor: autopackColors.apRed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  liveText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
});

export default HubCountdownStrip;
