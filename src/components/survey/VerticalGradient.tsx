import { StyleSheet, View } from 'react-native';

const styles = StyleSheet.create({
  fill: { flexDirection: 'column' },
});

function channel(hex: string, index: number) {
  return parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

function mix(from: string, to: string, t: number) {
  const rgb = [0, 1, 2].map((index) =>
    Math.round(channel(from, index) + (channel(to, index) - channel(from, index)) * t),
  );
  return `rgb(${rgb.join(',')})`;
}

export function VerticalGradient({
  from = '#041E36',
  to = '#1A8FD4',
  steps = 28,
}: {
  from?: string;
  to?: string;
  steps?: number;
}) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.fill]} pointerEvents="none">
      {Array.from({ length: steps }, (_, index) => (
        <View
          key={index}
          style={{ flex: 1, backgroundColor: mix(from, to, index / (steps - 1)) }}
        />
      ))}
    </View>
  );
}
