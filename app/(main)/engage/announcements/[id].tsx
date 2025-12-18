import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEngageStore } from '../../../../src/store/engageStore';
import { autopackColors } from '../../../../src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AnnouncementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const announcement = useEngageStore((s) => (id ? s.announcementById[id] : undefined));
  const loading = useEngageStore((s) => s.loading.announcementDetail);
  const error = useEngageStore((s) => s.error.announcementDetail);
  const loadAnnouncement = useEngageStore((s) => s.loadAnnouncementById);

  useEffect(() => {
    if (id) loadAnnouncement(id);
  }, [id, loadAnnouncement]);

  if (loading && !announcement) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (error && !announcement) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!announcement) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <Text style={styles.muted}>Announcement not found.</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <Text style={styles.title}>{announcement.title || 'Announcement'}</Text>
      <Text style={styles.meta}>{new Date(announcement.createdAt).toLocaleString()}</Text>
      <Text style={styles.body}>{announcement.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', color: autopackColors.apBlue },
  meta: { marginTop: 8, color: '#6B7280', fontSize: 12 },
  body: { marginTop: 14, color: '#111827', fontSize: 16, lineHeight: 24 },
  muted: { color: '#6B7280' },
  error: { color: '#DC2626' },
});


