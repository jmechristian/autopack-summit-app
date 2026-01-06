import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEngageStore } from '../../../src/store/engageStore';
import { IconCard } from '../../../src/ui/IconCard';
import { ui } from '../../../src/ui/tokens';

type EngageTile = {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  onPress: () => void;
};

export default function EngageHome() {
  const insets = useSafeAreaInsets();
  const unread = useEngageStore((s) => s.unread);

  const tiles: EngageTile[] = [
    {
      id: 'announcements',
      label: 'Announcements',
      icon: 'megaphone-outline',
      badge: unread.announcements,
      onPress: () => router.push('/(main)/engage/announcements'),
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: 'chatbubbles-outline',
      badge: unread.messages,
      onPress: () => router.push('/(main)/engage/messages'),
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: 'mail-unread-outline',
      badge: unread.requests,
      onPress: () => router.push('/(main)/engage/requests'),
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: 'briefcase-outline',
      onPress: () => router.push('/(main)/engage/leads'),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top * 0.65 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.body}>
        <View style={styles.toolsGrid}>
          {tiles.map((t) => (
            <View key={t.id} style={styles.toolsCell}>
              <IconCard
                icon={t.icon}
                label={t.label}
                badge={t.badge}
                iconBgColor='transparent'
                iconColor={ui.colors.primary}
                iconSize={50}
                onPress={t.onPress}
                style={styles.toolsCard}
              />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F1F8',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  toolsCell: {
    width: '48%',
  },
  toolsCard: {
    alignItems: 'center',
    minHeight: 132,
  },
});
