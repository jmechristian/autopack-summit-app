import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { autopackColors } from '../theme';

const RIVE_SOURCE = require('../../assets/aps_splash_1.riv');
const ARTBOARD_NAME = 'iPhone 16 Pro Max - 1';
const STATE_MACHINE_NAME = 'State Machine 1';
const FADE_DURATION = 350;

export interface RiveLoaderProps {
  fit?: Fit;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  autoplay?: boolean;
  /**
   * Kept for API compatibility. Overlay no longer uses RN Modal — presenting a
   * Modal during navigation (e.g. splash → Hub) freezes iOS with
   * "presentation is in progress". Full-screen cover uses window dimensions
   * + absolute fill instead.
   */
  overlay?: boolean;
  visible?: boolean;
  onReady?: () => void;
  testID?: string;
}

/**
 * Full-screen Rive loading view (inline, never a Modal).
 * Falls back to a spinner if Rive errors or never starts.
 */
export function RiveLoader({
  fit = Fit.Cover,
  backgroundColor = autopackColors.apDarkBlue,
  style,
  autoplay = true,
  overlay = false,
  visible = true,
  onReady,
  testID,
}: RiveLoaderProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (!visible) return;
    if (useFallback) {
      onReady?.();
      return;
    }
    const t = setTimeout(() => {
      if (!hasPlayed) setUseFallback(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [hasPlayed, onReady, useFallback, visible]);

  const handleError = useCallback(() => {
    setUseFallback(true);
  }, []);

  const handlePlay = useCallback(() => {
    setHasPlayed(true);
    onReady?.();
  }, [onReady]);

  if (!visible) return null;

  const content = useFallback ? (
    <ActivityIndicator size="large" color="#fff" />
  ) : (
    <Rive
      source={RIVE_SOURCE}
      artboardName={ARTBOARD_NAME}
      stateMachineName={STATE_MACHINE_NAME}
      autoplay={autoplay}
      fit={fit}
      alignment={Alignment.Center}
      onPlay={handlePlay}
      onError={handleError}
      style={styles.rive}
    />
  );

  return (
    <Animated.View
      entering={FadeIn.duration(FADE_DURATION)}
      exiting={FadeOut.duration(FADE_DURATION)}
      style={[
        styles.container,
        { backgroundColor, width, height },
        overlay && styles.overlay,
        style,
      ]}
      testID={testID}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Cover the screen from a nested parent without RN Modal. */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});

export default RiveLoader;
