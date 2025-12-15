import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        await getCurrentUser();
        // Session exists -> go straight to the app
        router.replace('/(main)/hub');
      } catch {
        // No session -> go to auth flow
        router.replace('/(auth)/splash');
      } finally {
        if (mounted) setChecking(false);
      }
    }

    boot();
    return () => {
      mounted = false;
    };
  }, []);

  if (!checking) return null;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <ActivityIndicator />
      <Text style={{ marginTop: 10, color: '#6b7280' }}>Loading…</Text>
    </View>
  );
}
