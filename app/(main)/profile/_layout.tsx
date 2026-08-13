import { Stack } from 'expo-router';
import { ContentWidthShell } from '../../../src/components/ContentWidthShell';

export default function ProfileLayout() {
  return (
    <ContentWidthShell>
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false }} />
      <Stack.Screen
        name='notes'
        options={{
          title: 'My Notes',
          headerShown: true,
          headerBackTitle: 'Profile',
        }}
      />
      <Stack.Screen
        name='settings'
        options={{
          title: 'Settings',
          headerShown: true,
          headerBackTitle: 'Profile',
        }}
      />
      <Stack.Screen 
        name='edit' 
        options={{ 
          title: 'Edit Profile',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name='contacts' 
        options={{ 
          title: 'Contacts',
          headerShown: true,
          headerBackTitle: 'Profile',
        }} 
      />
      <Stack.Screen
        name='messages/[threadId]'
        options={{ title: 'Chat' }}
      />
      <Stack.Screen
        name='community/[id]'
        options={{ title: 'Profile', headerBackTitle: 'Profile' }}
      />
    </Stack>
    </ContentWidthShell>
  );
}

