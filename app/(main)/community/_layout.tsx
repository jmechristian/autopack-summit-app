import { Stack } from 'expo-router';

export default function CommunityLayout() {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ title: 'Community' }} />
      {/* Hide the native header here; we render our own back row so it can return to the correct origin (Leads/Scan/Community). */}
      <Stack.Screen name='[id]' options={{ title: 'Profile', headerShown: false }} />
    </Stack>
  );
}


