import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useEngageStore } from '../../../../src/store/engageStore';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function RequestsScreen() {
  const incoming = useEngageStore((s) => s.incomingRequests);
  const loading = useEngageStore((s) => s.loading.requests);
  const error = useEngageStore((s) => s.error.requests);
  const loadIncomingRequests = useEngageStore((s) => s.loadIncomingRequests);
  const acceptRequest = useEngageStore((s) => s.acceptRequest);
  const declineRequest = useEngageStore((s) => s.declineRequest);

  useEffect(() => {
    loadIncomingRequests();
  }, [loadIncomingRequests]);

  return (
    <AppScreen>
      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={incoming}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <AppCard style={styles.row}>
            <Text style={styles.title}>{item.fromLabel}</Text>
            <Text style={styles.meta}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
            <View style={styles.actions}>
              <AppButton title='Accept' onPress={() => acceptRequest(item.id)} />
              <AppButton
                title='Decline'
                onPress={() => declineRequest(item.id)}
                variant='muted'
              />
            </View>
          </AppCard>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.muted}>No pending requests.</Text> : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: ui.space.sm },
  title: { fontSize: 16, fontWeight: '700', color: ui.colors.primary },
  meta: { marginTop: ui.space.xs, color: ui.colors.muted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: ui.space.sm, marginTop: ui.space.md },
  muted: { color: ui.colors.muted },
  error: { color: ui.colors.danger, marginBottom: ui.space.sm },
});


