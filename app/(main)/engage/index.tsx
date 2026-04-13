import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentUserProfile } from '../../../src/hooks/useApsStore';
import { useEngageStore } from '../../../src/store/engageStore';
import { ApcCertificateCard } from '../../../src/components/certificate/ApcCertificateCard';
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
  const profile = useCurrentUserProfile();

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
      id: 'exhibitors',
      label: 'Exhibitors',
      icon: 'business-outline',
      onPress: () => router.push('/(main)/engage/exhibitors'),
    },
    {
      id: 'speakers',
      label: 'Speakers',
      icon: 'mic-outline',
      onPress: () => router.push('/(main)/engage/speakers'),
    },
    {
      id: 'sponsors',
      label: 'Sponsors',
      icon: 'ribbon-outline',
      onPress: () => router.push('/(main)/engage/sponsors'),
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
                iconColor='#FFFFFF'
                iconSize={20}
                onPress={t.onPress}
                style={[
                  styles.toolsCard,
                  styles.toolsCardPrimary,
                ]}
                iconWrapStyle={styles.toolsIconWrap}
                labelStyle={styles.toolsCardLabel}
              />
            </View>
          ))}
        </View>

        <ApcCertificateCard
          progress={profile?.apcProgress}
          style={styles.certificateCard}
          onPrimaryPress={() => router.push('/(main)/profile')}
        />
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
  certificateCard: {
    marginTop: 16,
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
    minHeight: 88,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolsCardPrimary: {
    backgroundColor: ui.colors.primary,
  },
  toolsIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  toolsCardLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
    minHeight: 0,
    textAlign: 'left',
  },
});
