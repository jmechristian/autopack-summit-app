import { Stack } from 'expo-router';

export default function HubLayout() {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false, title: 'Hub' }} />
      <Stack.Screen name='contacts' options={{ title: 'Contacts' }} />
      <Stack.Screen name='notes' options={{ title: 'My Notes' }} />
      <Stack.Screen name='messages' options={{ title: 'Messages' }} />
      <Stack.Screen name='requests' options={{ title: 'Requests' }} />
      <Stack.Screen name='announcements' options={{ title: 'Announcements' }} />
      <Stack.Screen name='leads' options={{ title: 'Leads' }} />
      <Stack.Screen name='qr' options={{ title: 'My QR Code' }} />
      <Stack.Screen name='capture' options={{ title: 'Capture Contact' }} />
      <Stack.Screen name='leaderboard' options={{ title: 'Leaderboard' }} />
      <Stack.Screen name='messages/[threadId]' options={{ title: 'Chat' }} />
      <Stack.Screen name='announcements/[id]' options={{ title: 'Announcement' }} />
      <Stack.Screen name='community/[id]' options={{ title: 'Profile' }} />
    </Stack>
  );
}
