import { StyleSheet, Text, View } from 'react-native';
import { ui } from '../../../src/ui/tokens';

export default function LeaderboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.muted}>Coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: ui.space.lg, backgroundColor: ui.colors.bg },
  title: { fontSize: 18, fontWeight: '700', color: ui.colors.text },
  muted: { marginTop: ui.space.sm, color: ui.colors.muted },
});
