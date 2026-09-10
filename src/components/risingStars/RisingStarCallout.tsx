import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { RISING_STAR_PROGRAM } from '../../config/risingStars';
import { autopackColors } from '../../theme';

export function RisingStarCallout({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() => router.push('/(main)/hub/rising-stars' as any)}
      accessibilityRole='button'
      accessibilityLabel='Open Rising Star award and nominate'
    >
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name='star' size={20} color={autopackColors.apYellow} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>{RISING_STAR_PROGRAM.eyebrow}</Text>
          <Text style={styles.title}>Nominate a Rising Star</Text>
        </View>
        <Ionicons name='chevron-forward' size={22} color='#fff' />
      </View>
      <Text style={styles.subtitle}>
        Celebrate young leaders in automotive packaging. See past honorees and submit a nomination.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: '#0C3B68',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1 },
  eyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '600',
    lineHeight: 20,
  },
});
