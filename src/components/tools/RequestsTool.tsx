import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEngageStore } from '../../store/engageStore';
import { AppButton } from '../../ui/AppButton';
import { AppCard } from '../../ui/AppCard';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';

export default function RequestsTool() {
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  const incoming = useEngageStore((s) => s.incomingRequests);
  const sent = useEngageStore((s) => s.sentRequests);
  const loading = useEngageStore((s) => s.loading.requests);
  const error = useEngageStore((s) => s.error.requests);
  const loadIncomingRequests = useEngageStore((s) => s.loadIncomingRequests);
  const loadSentRequests = useEngageStore((s) => s.loadSentRequests);
  const acceptRequest = useEngageStore((s) => s.acceptRequest);
  const declineRequest = useEngageStore((s) => s.declineRequest);

  useEffect(() => {
    loadIncomingRequests();
    loadSentRequests();
  }, [loadIncomingRequests, loadSentRequests]);

  return (
    <AppScreen>
      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleBtn, tab === 'received' && styles.toggleBtnActive]}
          onPress={() => setTab('received')}
        >
          <Text style={[styles.toggleText, tab === 'received' && styles.toggleTextActive]}>
            Received
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, tab === 'sent' && styles.toggleBtnActive]}
          onPress={() => setTab('sent')}
        >
          <Text style={[styles.toggleText, tab === 'sent' && styles.toggleTextActive]}>
            Sent
          </Text>
        </Pressable>
      </View>

      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={tab === 'received' ? incoming : sent}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AppCard style={styles.row}>
            {tab === 'received' ? (
              <>
                <Text style={styles.title}>{(item as any).fromLabel}</Text>
                <Text style={styles.meta}>
                  {new Date((item as any).createdAt).toLocaleString()}
                </Text>
                <View style={styles.actions}>
                  <AppButton title='Accept' onPress={() => acceptRequest(item.id)} />
                  <AppButton
                    title='Decline'
                    onPress={() => declineRequest(item.id)}
                    variant='muted'
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>{(item as any).toLabel}</Text>
                <Text style={styles.meta}>
                  Pending • {new Date((item as any).createdAt).toLocaleString()}
                </Text>
              </>
            )}
          </AppCard>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.muted}>
              {tab === 'received' ? 'No pending received requests.' : 'No pending sent requests.'}
            </Text>
          ) : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: ui.space.lg },
  toggle: {
    flexDirection: 'row',
    backgroundColor: ui.colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: ui.space.md,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: ui.colors.primary },
  toggleText: { fontWeight: '700', color: ui.colors.muted },
  toggleTextActive: { color: '#fff' },
  row: { marginBottom: ui.space.sm },
  title: { fontSize: 16, fontWeight: '700', color: ui.colors.primary },
  meta: { marginTop: ui.space.xs, color: ui.colors.muted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: ui.space.sm, marginTop: ui.space.md },
  muted: { color: ui.colors.muted },
  error: { color: ui.colors.danger, marginBottom: ui.space.sm },
});
