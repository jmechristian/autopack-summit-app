import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useEngageStore } from '../../store/engageStore';
import { AppCard } from '../../ui/AppCard';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';

type MessagesToolProps = {
  threadBasePath?: string;
};

function initialsFor(value: string) {
  const parts = (value || '').trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts[1]?.[0] || parts[0]?.[1] || '';
  return (a + b).toUpperCase() || '??';
}

export default function MessagesTool({
  threadBasePath = '/(main)/engage/messages',
}: MessagesToolProps) {
  const [search, setSearch] = useState('');
  const inbox = useEngageStore((s) => s.inbox);
  const loading = useEngageStore((s) => s.loading.inbox);
  const error = useEngageStore((s) => s.error.inbox);
  const loadInbox = useEngageStore((s) => s.loadInbox);

  const filteredInbox = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inbox;
    return inbox.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const preview = (item.preview || '').toLowerCase();
      return title.includes(q) || preview.includes(q);
    });
  }, [inbox, search]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  return (
    <AppScreen>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#6b7280" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search messages..."
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filteredInbox}
        keyExtractor={(item) => item.threadId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AppCard
            onPress={() => router.push(`${threadBasePath}/${item.threadId}`)}
            style={styles.row}
          >
            <View style={styles.rowContent}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFor(item.title)}</Text>
              </View>
              <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!!item.unreadCount && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.preview}
                </Text>
                <Text style={styles.meta}>
                  {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleString() : ''}
                </Text>
              </View>
            </View>
          </AppCard>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.muted}>
              {search.trim() ? 'No messages found.' : 'No messages yet.'}
            </Text>
          ) : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: ui.space.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  searchInput: { flex: 1, fontSize: 16, color: '#111827' },
  listContent: { paddingBottom: ui.space.lg },
  row: { marginBottom: ui.space.sm, paddingVertical: 10 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: '#111827' },
  textWrap: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    backgroundColor: ui.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: ui.colors.primary, flex: 1 },
  preview: { marginTop: 4, color: '#374151' },
  meta: { marginTop: 4, color: ui.colors.muted, fontSize: 12 },
  muted: { color: ui.colors.muted },
  error: { color: ui.colors.danger, marginBottom: ui.space.sm },
});
