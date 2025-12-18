import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useEngageStore } from '../../../src/store/engageStore';
import { AppBadge } from '../../../src/ui/AppBadge';
import { AppCard } from '../../../src/ui/AppCard';
import { AppScreen } from '../../../src/ui/AppScreen';
import { ui } from '../../../src/ui/tokens';

function Card(props: {
  title: string;
  subtitle: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <AppCard onPress={props.onPress} style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>{props.title}</Text>
        <AppBadge value={props.badge} />
      </View>
      <Text style={styles.cardSubtitle}>{props.subtitle}</Text>
    </AppCard>
  );
}

export default function EngageHome() {
  const unread = useEngageStore((s) => s.unread);
  return (
    <AppScreen style={{ gap: ui.space.md }}>
      <Card
        title='Announcements'
        subtitle='Admin announcements and updates'
        badge={unread.announcements}
        onPress={() => router.push('/(main)/engage/announcements')}
      />
      <Card
        title='Messages'
        subtitle='Direct messages with approved contacts'
        badge={unread.messages}
        onPress={() => router.push('/(main)/engage/messages')}
      />
      <Card
        title='Requests'
        subtitle='Approve or decline incoming message requests'
        badge={unread.requests}
        onPress={() => router.push('/(main)/engage/requests')}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { padding: ui.space.lg },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ui.colors.primary,
    marginBottom: 6,
  },
  cardSubtitle: {
    color: ui.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  // spacing between cards
  // (AppScreen uses padding; we do gap on wrapper by using marginBottom per card)
  // Keep it simple with a bottom margin on each card.
  // eslint-disable-next-line react-native/no-unused-styles
  _spacer: {},
});


