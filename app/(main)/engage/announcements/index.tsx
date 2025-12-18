import { useEffect } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useEngageStore } from '../../../../src/store/engageStore';
import * as Notifications from 'expo-notifications';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AnnouncementsScreen() {
  const announcements = useEngageStore((s) => s.announcements);
  const loading = useEngageStore((s) => s.loading.announcements);
  const error = useEngageStore((s) => s.error.announcements);
  const loadAnnouncements = useEngageStore((s) => s.loadAnnouncements);
  const markAnnouncementsSeen = useEngageStore((s) => s.markAnnouncementsSeen);

  useEffect(() => {
    loadAnnouncements();
    markAnnouncementsSeen();
    Notifications.setBadgeCountAsync(0).catch(() => {});
  }, [loadAnnouncements]);

  return (
    <AppScreen>
      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => (
          <AppCard
            onPress={() => router.push(`/(main)/engage/announcements/${item.id}`)}
            style={styles.row}
          >
            <Text style={styles.title}>{item.title || 'Announcement'}</Text>
            <Text style={styles.preview} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
          </AppCard>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.muted}>No announcements yet.</Text>
          ) : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: ui.space.sm },
  title: { fontSize: 16, fontWeight: '700', color: ui.colors.primary },
  preview: { marginTop: ui.space.xs, color: '#374151', lineHeight: 20 },
  meta: { marginTop: ui.space.sm, color: ui.colors.muted, fontSize: 12 },
  muted: { color: ui.colors.muted },
  error: { color: ui.colors.danger, marginBottom: ui.space.sm },
});


