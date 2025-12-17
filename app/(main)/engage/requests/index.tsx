import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEngageStore } from '../../../../src/store/engageStore';
import { autopackColors } from '../../../../src/theme';

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
    <View style={styles.container}>
      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={incoming}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.title}>{item.fromLabel}</Text>
            <Text style={styles.meta}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.button, styles.accept]}
                onPress={() => acceptRequest(item.id)}
              >
                <Text style={styles.buttonText}>Accept</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.decline]}
                onPress={() => declineRequest(item.id)}
              >
                <Text style={styles.buttonText}>Decline</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.muted}>No pending requests.</Text> : null
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
  meta: { marginTop: 6, color: '#6B7280', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  accept: { backgroundColor: autopackColors.apBlue },
  decline: { backgroundColor: '#6B7280' },
  buttonText: { color: '#fff', fontWeight: '700' },
  muted: { color: '#6B7280' },
  error: { color: '#DC2626', marginBottom: 8 },
});


