import { Stack } from 'expo-router';

export default function EngageLayout() {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ title: 'Engage' }} />
      <Stack.Screen name='announcements/index' options={{ title: 'Announcements' }} />
      <Stack.Screen name='announcements/[id]' options={{ title: 'Announcement' }} />
      <Stack.Screen name='messages/index' options={{ title: 'Messages' }} />
      <Stack.Screen name='messages/[threadId]' options={{ title: 'Chat' }} />
      <Stack.Screen name='requests/index' options={{ title: 'Requests' }} />
      <Stack.Screen name='leads/index' options={{ title: 'Leads' }} />
    </Stack>
  );
}


