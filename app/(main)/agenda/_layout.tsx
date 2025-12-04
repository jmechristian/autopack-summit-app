import { Stack } from 'expo-router';

export default function AgendaLayout() {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ title: 'Agenda' }} />
      <Stack.Screen name='[id]' options={{ title: 'Session' }} />
    </Stack>
  );
}
