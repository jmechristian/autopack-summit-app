import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NOTIFICATION_THEMES } from '../notifications/notificationThemes';
import { getApsAppSession } from '../../graphql/queries';
import { useEngageStore } from '../../store/engageStore';
import { AppCard } from '../../ui/AppCard';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';
import {
  getAnnouncementDeepLinkDestination,
  type AnnouncementDeepLinkDestination,
} from '../../utils/announcementDeepLinks';
import { formatLocalDateTime } from '../../utils/formatLocalDateTime';
import { graphqlApiKeyClient } from '../../utils/graphqlClient';
import { recordAnnouncementOpen } from '../../utils/announcementOpenTracking';

const theme = NOTIFICATION_THEMES.announcement;

function getDefaultLinkLabel(destination: AnnouncementDeepLinkDestination) {
  if (destination.kind === 'session') return 'View session';
  if (destination.kind === 'in-app') return 'Open linked page';
  return 'Open link';
}

function getLinkIcon(destination: AnnouncementDeepLinkDestination): keyof typeof Ionicons.glyphMap {
  if (destination.kind === 'session') return 'calendar-outline';
  if (destination.kind === 'external') return 'open-outline';
  return 'arrow-forward-circle-outline';
}

export default function AnnouncementDetailTool() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const announcement = useEngageStore((s) => (id ? s.announcementById[id] : undefined));
  const loading = useEngageStore((s) => s.loading.announcementDetail);
  const error = useEngageStore((s) => s.error.announcementDetail);
  const loadAnnouncement = useEngageStore((s) => s.loadAnnouncementById);

  const destination = useMemo(
    () => getAnnouncementDeepLinkDestination(announcement?.deepLink),
    [announcement?.deepLink],
  );

  const [linkTitle, setLinkTitle] = useState<string | null>(null);
  const [linkMeta, setLinkMeta] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      void loadAnnouncement(id);
      void recordAnnouncementOpen({ announcementId: id, source: 'in-app' });
    }
  }, [id, loadAnnouncement]);

  useEffect(() => {
    if (!destination) {
      setLinkTitle(null);
      setLinkMeta(null);
      return;
    }

    setLinkTitle(getDefaultLinkLabel(destination));
    setLinkMeta(null);

    if (destination.kind !== 'session' || !destination.sessionId) return;

    let cancelled = false;
    void (async () => {
      try {
        const resp = await graphqlApiKeyClient.graphql({
          query: getApsAppSession,
          variables: { id: destination.sessionId },
        });
        const session = (resp.data as { getApsAppSession?: {
          title?: string | null;
          date?: string | null;
          startTime?: string | null;
          location?: string | null;
        } | null })?.getApsAppSession;

        if (cancelled || !session) return;

        const title = session.title?.trim();
        if (title) setLinkTitle(title);

        const metaParts = [session.date, session.startTime, session.location]
          .map((part) => String(part || '').trim())
          .filter(Boolean);
        if (metaParts.length) setLinkMeta(metaParts.join(' • '));
      } catch {
        // keep default label
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [destination]);

  const openDestination = () => {
    if (!destination) return;

    if (destination.kind === 'external') {
      void Linking.openURL(destination.route);
      return;
    }

    router.push(destination.route as any);
  };

  if (loading && !announcement) {
    return (
      <AppScreen>
        <Text style={styles.muted}>Loading…</Text>
      </AppScreen>
    );
  }

  if (error && !announcement) {
    return (
      <AppScreen>
        <Text style={styles.error}>{error}</Text>
      </AppScreen>
    );
  }

  if (!announcement) {
    return (
      <AppScreen>
        <Text style={styles.muted}>Announcement not found.</Text>
      </AppScreen>
    );
  }

  const displayAt = formatLocalDateTime(announcement.createdAt);

  return (
    <AppScreen padded={false}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppCard style={styles.card}>
          <View
            style={[
              styles.headerBar,
              {
                backgroundColor: theme.headerBg,
                borderBottomColor: theme.headerBorder,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
              <Ionicons name={theme.icon} size={16} color={theme.iconColor} />
            </View>
            <Text style={[styles.headerLabel, { color: theme.iconColor }]}>{theme.label}</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{announcement.title || 'Announcement'}</Text>

            {!!displayAt && (
              <View style={styles.timestampRow}>
                <Ionicons name='time-outline' size={14} color={ui.colors.muted} />
                <Text style={styles.meta}>{displayAt}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <Text style={styles.body}>{announcement.body}</Text>

            {destination ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.linkSectionLabel}>Linked destination</Text>
                <Pressable
                  style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
                  onPress={openDestination}
                >
                  <View style={[styles.linkIconWrap, { backgroundColor: theme.iconBg }]}>
                    <Ionicons name={getLinkIcon(destination)} size={18} color={theme.iconColor} />
                  </View>
                  <View style={styles.linkTextWrap}>
                    <Text style={styles.linkTitle}>{linkTitle || getDefaultLinkLabel(destination)}</Text>
                    {!!linkMeta && <Text style={styles.linkMeta}>{linkMeta}</Text>}
                    {destination.kind === 'session' && (
                      <Text style={styles.linkHint}>Tap to open this session</Text>
                    )}
                  </View>
                  <Ionicons name='chevron-forward' size={18} color={theme.iconColor} />
                </Pressable>
              </>
            ) : null}
          </View>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: ui.space.lg,
    paddingBottom: ui.space.xl,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  headerBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: ui.colors.text,
    lineHeight: 26,
  },
  timestampRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    color: ui.colors.muted,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: ui.colors.border,
    marginVertical: 14,
  },
  body: {
    color: ui.colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  linkSectionLabel: {
    color: ui.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.headerBorder,
    backgroundColor: theme.headerBg,
  },
  linkButtonPressed: {
    opacity: 0.92,
  },
  linkIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTextWrap: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    color: ui.colors.primary,
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 20,
  },
  linkMeta: {
    color: '#374151',
    fontSize: 12,
    lineHeight: 17,
  },
  linkHint: {
    color: ui.colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  muted: { color: ui.colors.muted },
  error: { color: ui.colors.danger },
});
