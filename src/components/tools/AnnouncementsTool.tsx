import { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { NotificationCard } from '../notifications/NotificationCard';
import { useEngageStore } from '../../store/engageStore';
import * as Notifications from 'expo-notifications';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';

type AnnouncementsToolProps = {
  detailBasePath?: string;
};

function truncateText(value: string, maxLength = 120) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}…`;
}

export default function AnnouncementsTool({
  detailBasePath = '/(main)/engage/announcements',
}: AnnouncementsToolProps) {
  const announcements = useEngageStore((s) => s.announcements);
  const lastSeenAnnouncementAt = useEngageStore((s) => s.lastSeenAnnouncementAt);
  const loading = useEngageStore((s) => s.loading.announcements);
  const error = useEngageStore((s) => s.error.announcements);
  const loadAnnouncements = useEngageStore((s) => s.loadAnnouncements);
  const markAnnouncementsSeen = useEngageStore((s) => s.markAnnouncementsSeen);

  useEffect(() => {
    loadAnnouncements();
    markAnnouncementsSeen();
    Notifications.setBadgeCountAsync(0).catch(() => {});
  }, [loadAnnouncements, markAnnouncementsSeen]);

  const rows = useMemo(
    () =>
      announcements.map((announcement) => {
        const isUnread =
          !lastSeenAnnouncementAt || announcement.createdAt > lastSeenAnnouncementAt;
        const preview = truncateText(announcement.body || '');

        return {
          id: announcement.id,
          title: announcement.title?.trim() || 'Announcement',
          preview: preview || undefined,
          timestamp: announcement.createdAt,
          badgeCount: isUnread ? 1 : undefined,
        };
      }),
    [announcements, lastSeenAnnouncementAt],
  );

  return (
    <AppScreen>
      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <NotificationCard
            kind='announcement'
            body={item.title}
            subtitle={item.preview}
            timestamp={item.timestamp}
            badgeCount={item.badgeCount}
            onPress={() => router.push(`${detailBasePath}/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.muted}>No announcements yet.</Text> : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: ui.space.lg },
  muted: { color: ui.colors.muted },
  error: { color: ui.colors.danger, marginBottom: ui.space.sm },
});
