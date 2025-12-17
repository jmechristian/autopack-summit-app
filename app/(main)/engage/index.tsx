import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { autopackColors } from '../../../src/theme';

function Card(props: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={styles.card}>
      <Text style={styles.cardTitle}>{props.title}</Text>
      <Text style={styles.cardSubtitle}>{props.subtitle}</Text>
    </Pressable>
  );
}

export default function EngageHome() {
  return (
    <View style={styles.container}>
      <Card
        title='Announcements'
        subtitle='Admin announcements and updates'
        onPress={() => router.push('/(main)/engage/announcements')}
      />
      <Card
        title='Messages'
        subtitle='Direct messages with approved contacts'
        onPress={() => router.push('/(main)/engage/messages')}
      />
      <Card
        title='Requests'
        subtitle='Approve or decline incoming message requests'
        onPress={() => router.push('/(main)/engage/requests')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: autopackColors.apBlue,
    marginBottom: 6,
  },
  cardSubtitle: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },
});


