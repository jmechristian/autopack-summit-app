import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { AuthGuard } from '../../src/components/AuthGuard';
import { autopackColors } from '../../src/theme';
import { useEngageStore } from '../../src/store/engageStore';

export default function MainTabs() {
  const engageBadgeCount = useEngageStore((s) => s.getEngageBadgeCount());
  return (
    <AuthGuard>
      <Tabs
      screenOptions={{
        headerShown: true, // still fine as a default
        tabBarActiveTintColor: autopackColors.apBlue,
        tabBarInactiveTintColor: '#999999',
      }}
    >
      <Tabs.Screen
        name='hub'
        options={{
          title: 'Hub',
          headerShown: false, // no header on Hub
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='home' color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name='agenda'
        options={{
          title: 'Agenda',
          headerShown: false, // 👈 turn OFF header from the tab
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='calendar' color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name='engage'
        options={{
          title: 'Engage',
          headerShown: false,
          tabBarBadge: engageBadgeCount > 0 ? engageBadgeCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#DC2626', color: '#fff' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='chatbubbles' color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name='community'
        options={{
          title: 'Community',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='people' color={color} size={size} />
          ),
        }}
      />

      {/* Hidden routes (not shown in tab bar) */}
      <Tabs.Screen
        name='scan'
        options={{
          href: null,
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name='profile'
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='person' color={color} size={size} />
          ),
        }}
      />
    </Tabs>
    </AuthGuard>
  );
}
