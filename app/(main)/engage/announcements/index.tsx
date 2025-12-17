import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useEngageStore } from '../../../../src/store/engageStore';
import { autopackColors } from '../../../../src/theme';

export default function AnnouncementsScreen() {
  const announcements = useEngageStore((s) => s.announcements);
  const loading = useEngageStore((s) => s.loading.announcements);
  const error = useEngageStore((s) => s.error.announcements);
  const loadAnnouncements = useEngageStore((s) => s.loadAnnouncements);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <View style={styles.container}>
      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(main)/engage/announcements/${item.id}`)}
            style={styles.row}
          >
            <Text style={styles.title}>{item.title || 'Announcement'}</Text>
            <Text style={styles.preview} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.muted}>No announcements yet.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  row: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  title: { fontSize: 16, fontWeight: '700', color: autopackColors.apBlue },
  preview: { marginTop: 6, color: '#374151', lineHeight: 20 },
  meta: { marginTop: 8, color: '#6B7280', fontSize: 12 },
  muted: { color: '#6B7280' },
  error: { color: '#DC2626', marginBottom: 8 },
});


