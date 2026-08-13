import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { autopackColors } from '../../theme';
import { ui } from '../../ui/tokens';

// 8:00 AM Eastern on Sept 30, 2026 == 12:00:00 UTC.
const TARGET_MS = new Date('2026-09-30T12:00:00Z').getTime();

function format(diffMs: number) {
  if (diffMs <= 0) return '00:00:00:00';
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  return [days, hours, minutes, seconds]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

/**
 * Live countdown in its own component so the one-second tick never re-renders
 * the rest of Hub (important if/when the hero Rive is re-enabled).
 */
export function HubCountdownStrip() {
  const [label, setLabel] = useState(() => format(TARGET_MS - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setLabel(format(TARGET_MS - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.strip}>
      <Text style={styles.timer}>{label}</Text>
      <View style={styles.livePill}>
        <Text style={styles.liveText}>LIVE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timer: {
    color: ui.colors.secondary,
    fontWeight: '800',
    fontSize: 20,
  },
  livePill: {
    backgroundColor: autopackColors.apRed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  liveText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
});

export default HubCountdownStrip;
