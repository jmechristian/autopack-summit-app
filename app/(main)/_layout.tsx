import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { autopackColors } from '../../src/theme';

export default function MainTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: autopackColors.apBlue,
        tabBarInactiveTintColor: '#999999',
      }}
    >
      <Tabs.Screen
        name='hub'
        options={{
          title: 'Hub',
          headerShown: false, // no header on main home tab
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='home' color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name='agenda'
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='calendar' color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name='engage'
        options={{
          title: 'Engage',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='chatbubbles' color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name='community'
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='people' color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='person' color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
