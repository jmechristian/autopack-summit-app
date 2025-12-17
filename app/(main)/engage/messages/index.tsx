import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useEngageStore } from '../../../../src/store/engageStore';
import { autopackColors } from '../../../../src/theme';

export default function MessagesInbox() {
  const inbox = useEngageStore((s) => s.inbox);
  const loading = useEngageStore((s) => s.loading.inbox);
  const error = useEngageStore((s) => s.error.inbox);
  const loadInbox = useEngageStore((s) => s.loadInbox);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  return (
    <View style={styles.container}>
      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={inbox}
        keyExtractor={(item) => item.threadId}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(main)/engage/messages/${item.threadId}`)}
            style={styles.row}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.preview} numberOfLines={1}>
              {item.preview}
            </Text>
            <Text style={styles.meta}>
              {item.unreadCount ? `${item.unreadCount} unread • ` : ''}
              {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : ''}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.muted}>No messages yet.</Text> : null
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
  preview: { marginTop: 6, color: '#374151' },
  meta: { marginTop: 8, color: '#6B7280', fontSize: 12 },
  muted: { color: '#6B7280' },
  error: { color: '#DC2626', marginBottom: 8 },
});


