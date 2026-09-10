import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { risingStarLabel } from '../../config/risingStars';
import { autopackColors } from '../../theme';

export function RisingStarBadge({
  year,
  compact = false,
}: {
  year?: number | null;
  compact?: boolean;
}) {
  if (!year) return null;
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Ionicons name='star' size={compact ? 11 : 13} color={autopackColors.apYellow} />
      <Text style={[styles.text, compact && styles.textCompact]}>{risingStarLabel(year)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  text: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  textCompact: {
    fontSize: 11,
  },
});
