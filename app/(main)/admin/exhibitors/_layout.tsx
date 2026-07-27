import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable, Text } from 'react-native';

export default function AdminExhibitorsLayout() {
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
        options={{ title: 'Exhibitors', headerBackVisible: false, headerLeft: adminBackButton }}
      />
      <Stack.Screen
        name='create'
        options={{ title: 'Create Exhibitor', headerBackVisible: false, headerLeft: adminBackButton }}
      />
      <Stack.Screen
        name='[exhibitorId]'
        options={{ title: 'Exhibitor Detail', headerBackVisible: false, headerLeft: adminBackButton }}
      />
    </Stack>
  );
}
