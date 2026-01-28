import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
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
        name='community/[id]'
        options={{ title: 'Profile', headerBackTitle: 'Profile' }}
      />
    </Stack>
  );
}

