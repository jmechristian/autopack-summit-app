import { Stack } from 'expo-router';
import { ContentWidthShell } from '../../../src/components/ContentWidthShell';

export default function CommunityLayout() {
  return (
    <ContentWidthShell>
      <Stack>
        <Stack.Screen name='index' options={{ title: 'Community' }} />
        <Stack.Screen name='[id]' options={{ title: 'Profile' }} />
      </Stack>
    </ContentWidthShell>
  );
}


