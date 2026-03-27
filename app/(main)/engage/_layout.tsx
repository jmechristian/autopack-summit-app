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
      <Stack.Screen name='exhibitors/index' options={{ title: 'Exhibitors' }} />
      <Stack.Screen name='exhibitors/[id]' options={{ title: 'Exhibitor' }} />
      <Stack.Screen name='speakers/index' options={{ title: 'Speakers' }} />
      <Stack.Screen name='speakers/[id]' options={{ title: 'Speaker' }} />
      <Stack.Screen name='sponsors/index' options={{ title: 'Sponsors' }} />
      <Stack.Screen name='sponsors/[id]' options={{ title: 'Sponsor' }} />
    </Stack>
  );
}


