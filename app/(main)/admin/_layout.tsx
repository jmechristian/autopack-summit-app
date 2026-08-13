import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { AdminGuard } from '../../../src/components/admin/AdminGuard';
import { ContentWidthShell } from '../../../src/components/ContentWidthShell';

export default function AdminLayout() {
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
    <AdminGuard>
      <ContentWidthShell>
        <Stack>
          <Stack.Screen name='index' options={{ title: 'Admin' }} />
          <Stack.Screen name='registrants' options={{ headerShown: false, title: 'Registrants' }} />
          <Stack.Screen
            name='exhibitors'
            options={{ headerShown: false, title: 'Exhibitors' }}
          />
          <Stack.Screen
            name='sponsors'
            options={{ headerShown: false, title: 'Sponsors' }}
          />
          <Stack.Screen
            name='speakers'
            options={{ headerShown: false, title: 'Speakers' }}
          />
          <Stack.Screen
            name='agenda-sessions'
            options={{ headerShown: false, title: 'Agenda / Sessions' }}
          />
          <Stack.Screen
            name='add-ons'
            options={{ headerShown: false, title: 'Add-ons' }}
          />
          <Stack.Screen
            name='passport'
            options={{ title: 'Passport', headerBackVisible: false, headerLeft: adminBackButton }}
          />
          <Stack.Screen
            name='seating-chart'
            options={{ title: 'Seating Chart', headerBackVisible: false, headerLeft: adminBackButton }}
          />
          <Stack.Screen
            name='announcements'
            options={{ headerShown: false, title: 'Announcements' }}
          />
        </Stack>
      </ContentWidthShell>
    </AdminGuard>
  );
}
