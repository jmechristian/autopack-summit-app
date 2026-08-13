import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { autopackColors } from '../theme';

export type Fit = string;

export interface RiveLoaderProps {
  fit?: Fit;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  autoplay?: boolean;
  overlay?: boolean;
  visible?: boolean;
  onReady?: () => void;
  testID?: string;
}

/** Web fallback — rive-react-native is native-only. */
export function RiveLoader({
  backgroundColor = autopackColors.apDarkBlue,
  style,
  overlay = false,
  visible = true,
  onReady,
  testID,
}: RiveLoaderProps) {
  useEffect(() => {
    if (visible) onReady?.();
  }, [onReady, visible]);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        overlay && styles.overlay,
        style,
      ]}
      testID={testID}
    >
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});

export default RiveLoader;
