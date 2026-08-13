import { Stack } from 'expo-router';
import { ContentWidthShell } from '../../../src/components/ContentWidthShell';
import { StackBackButton } from '../../../src/components/navigation/StackBackButton';

export default function AgendaLayout() {
  return (
    <ContentWidthShell>
    <Stack>
      <Stack.Screen name='index' options={{ title: 'Agenda' }} />
      <Stack.Screen
        name='[id]'
        options={{
          title: 'Session',
          headerBackVisible: false,
          headerLeft: () => <StackBackButton />,
        }}
      />
      <Stack.Screen
        name='presentation'
        options={{
          title: 'Presentation',
          headerBackVisible: false,
          headerLeft: () => <StackBackButton />,
        }}
      />
    </Stack>
    </ContentWidthShell>
  );
}
