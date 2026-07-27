import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable, Text } from 'react-native';

export default function AdminAddOnsLayout() {
  const goToAdminHome = () => router.push('/(main)/admin');
  const adminBackButton = () => (
    <Pressable
      onPress={goToAdminHome}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
    >
      <Ionicons name='chevron-back' size={18} color='#0C3B68' />
      <Text style={{ color: '#0C3B68', fontWeight: '700' }}>Admin</Text>
    </Pressable>
  );

  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{ title: 'Add-ons', headerBackVisible: false, headerLeft: adminBackButton }}
      />
      <Stack.Screen
        name='create'
        options={{ title: 'Create Add-on', headerBackVisible: false, headerLeft: adminBackButton }}
      />
      <Stack.Screen
        name='[addOnId]'
        options={{ title: 'Add-on Detail', headerBackVisible: false, headerLeft: adminBackButton }}
      />
    </Stack>
  );
}
