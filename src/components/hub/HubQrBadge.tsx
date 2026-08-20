import React, { useEffect } from 'react';
import { Image } from 'expo-image';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeEnteringView } from '../SafeEnteringView';
import { isWeb } from '../../utils/platform';

/**
 * The name label hangs below the code, which pulls the group's midpoint above
 * the code's own midpoint. Shift down so the code lands inside the ring.
 */
const CENTER_NUDGE = 32;
const FADE_IN_DURATION_MS = 180;

export interface HubQrBadgeProps {
  /** Registrant QR code URL. */
  qrUri?: string | null;
  /** Attendee name rendered under the code, e.g. "Apple Tester". */
  name?: string;
  /** Pixel width for the QR tile. Defaults to 42% of the hero. */
  tileWidth?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function QrPlaceholder({ tileWidth }: { tileWidth?: number }) {
  const pulse = useSharedValue(0.45);
  const tileSizeStyle = tileWidth ? { width: tileWidth } : undefined;

  useEffect(() => {
    if (isWeb) return;
    pulse.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isWeb ? 0.65 : pulse.value,
  }));

  if (isWeb) {
    return (
      <View style={[styles.tile, styles.placeholderTile, tileSizeStyle, { opacity: 0.65 }]}>
        <Ionicons name="qr-code-outline" size={36} color="rgba(255,255,255,0.7)" />
        <Text style={styles.placeholderText}>Loading</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.tile, styles.placeholderTile, tileSizeStyle, animatedStyle]}>
      <Ionicons name="qr-code-outline" size={36} color="rgba(255,255,255,0.7)" />
      <Text style={styles.placeholderText}>Loading</Text>
    </Animated.View>
  );
}

/**
 * Registrant QR code sized to sit inside the hub hero's ring.
 * Shows a subtle pulsing placeholder until the QR URL is ready, then fades in.
 * Name fades in independently when available.
 */
export function HubQrBadge({ qrUri, name, tileWidth, style, testID }: HubQrBadgeProps) {
  const tileSizeStyle = tileWidth ? { width: tileWidth } : undefined;
  return (
    <View style={[styles.wrap, style]} testID={testID}>
      {qrUri ? (
        <SafeEnteringView
          key={qrUri}
          entering={FadeIn.duration(FADE_IN_DURATION_MS)}
          exiting={FadeOut.duration(120)}
          style={[styles.tile, tileSizeStyle]}
        >
          <Image
            source={{ uri: qrUri }}
            style={styles.qr}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
        </SafeEnteringView>
      ) : (
        <QrPlaceholder tileWidth={tileWidth} />
      )}

      {name ? (
        <SafeEnteringView entering={FadeIn.duration(FADE_IN_DURATION_MS)}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </SafeEnteringView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    gap: 10,
    transform: [{ translateY: CENTER_NUDGE }],
  },
  tile: {
    // Fraction of the hero width. The ring's inner square caps this around 45%.
    width: '42%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  placeholderTile: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOpacity: 0,
    elevation: 0,
    padding: 12,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  qr: {
    flex: 1,
    width: '100%',
  },
  name: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
});

export default HubQrBadge;
