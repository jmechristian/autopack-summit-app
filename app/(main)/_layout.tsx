import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthGuard } from '../../src/components/AuthGuard';
import { autopackColors } from '../../src/theme';
import { useEngageStore } from '../../src/store/engageStore';

export default function MainTabs() {
  const engageBadgeCount = useEngageStore((s) => s.getEngageBadgeCount());
  const goToTabRoot = (path: '/(main)/hub' | '/(main)/agenda' | '/(main)/engage' | '/(main)/community' | '/(main)/profile') => ({
    tabPress: () => {
      router.replace(path);
    },
  });
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerShown: false, // use stack headers per-section
          tabBarActiveTintColor: autopackColors.apBlue,
          tabBarInactiveTintColor: '#999999',
        }}
      >
      <Tabs.Screen
        name='hub'
        listeners={goToTabRoot('/(main)/hub')}
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
        listeners={goToTabRoot('/(main)/agenda')}
        options={{
          title: 'Agenda',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name='calendar' color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name='engage'
        listeners={goToTabRoot('/(main)/engage')}
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
        listeners={goToTabRoot('/(main)/community')}
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
          headerShown: true,
          title: 'Scan',
        }}
      />

      <Tabs.Screen
        name='admin'
        options={{
          href: null,
          headerShown: false,
          title: 'Admin',
        }}
      />

      <Tabs.Screen
        name='profile'
        listeners={goToTabRoot('/(main)/profile')}
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
