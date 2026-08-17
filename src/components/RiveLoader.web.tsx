import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { autopackColors } from '../theme';
import { RiveLoaderHost, useRiveLoaderAcquire } from './RiveLoaderHost';

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

function WebPlayback({
  backgroundColor = autopackColors.apDarkBlue,
  style,
  testID,
}: {
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View style={[styles.container, { backgroundColor }, style]} testID={testID}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}

export function RiveLoaderProvider({ children }: { children: React.ReactNode }) {
  return (
    <RiveLoaderHost overlay={<WebPlayback />}>
      {children}
    </RiveLoaderHost>
  );
}

/** Web fallback — rive-react-native is native-only. */
export function RiveLoader({
  backgroundColor = autopackColors.apDarkBlue,
  style,
  overlay = true,
  visible = true,
  onReady,
  testID,
}: RiveLoaderProps) {
  const acquire = useRiveLoaderAcquire();

  useEffect(() => {
    if (visible) onReady?.();
  }, [onReady, visible]);

  useEffect(() => {
    if (!visible || !overlay || !acquire) return;
    return acquire();
  }, [acquire, overlay, visible]);

  if (!visible) return null;

  if (overlay && acquire) {
    return <View style={styles.placeholder} />;
  }

  return (
    <WebPlayback backgroundColor={backgroundColor} style={style} testID={testID} />
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
  placeholder: {
    flex: 1,
    backgroundColor: autopackColors.apDarkBlue,
  },
});

export default RiveLoader;
