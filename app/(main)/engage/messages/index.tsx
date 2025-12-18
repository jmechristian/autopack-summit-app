import { useEffect } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useEngageStore } from '../../../../src/store/engageStore';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function MessagesInbox() {
  const inbox = useEngageStore((s) => s.inbox);
  const loading = useEngageStore((s) => s.loading.inbox);
  const error = useEngageStore((s) => s.error.inbox);
  const loadInbox = useEngageStore((s) => s.loadInbox);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  return (
    <AppScreen>
      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={inbox}
        keyExtractor={(item) => item.threadId}
        renderItem={({ item }) => (
          <AppCard
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
          </AppCard>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.muted}>No messages yet.</Text> : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: ui.space.sm },
  title: { fontSize: 16, fontWeight: '700', color: ui.colors.primary },
  preview: { marginTop: ui.space.xs, color: '#374151' },
  meta: { marginTop: ui.space.sm, color: ui.colors.muted, fontSize: 12 },
  muted: { color: ui.colors.muted },
  error: { color: ui.colors.danger, marginBottom: ui.space.sm },
});


