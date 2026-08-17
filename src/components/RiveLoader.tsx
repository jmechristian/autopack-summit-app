import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { autopackColors } from '../theme';
import { RiveLoaderHost, useRiveLoaderAcquire } from './RiveLoaderHost';

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
   * When true (default), cover the whole window including stack headers and
   * the tab bar. Uses a root overlay / iOS FullWindowOverlay — never RN Modal,
   * which froze iOS with "presentation is in progress" during navigation.
   * Set false for inline use (launch splash).
   */
  overlay?: boolean;
  visible?: boolean;
  onReady?: () => void;
  testID?: string;
}

type PlaybackProps = {
  fit?: Fit;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  autoplay?: boolean;
  onReady?: () => void;
  testID?: string;
};

const RiveLayer = memo(function RiveLayer({
  fit,
  autoplay,
  onPlay,
  onError,
}: {
  fit: Fit;
  autoplay: boolean;
  onPlay: () => void;
  onError: () => void;
}) {
  return (
    <Rive
      source={RIVE_SOURCE}
      artboardName={ARTBOARD_NAME}
      stateMachineName={STATE_MACHINE_NAME}
      autoplay={autoplay}
      fit={fit}
      alignment={Alignment.Center}
      onPlay={onPlay}
      onError={onError}
      style={styles.rive}
    />
  );
});

function RiveLoaderPlayback({
  fit = Fit.Cover,
  backgroundColor = autopackColors.apDarkBlue,
  style,
  autoplay = true,
  onReady,
  testID,
}: PlaybackProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    if (useFallback) {
      onReady?.();
      return;
    }
    const t = setTimeout(() => {
      if (!hasPlayed) setUseFallback(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [hasPlayed, onReady, useFallback]);

  const handleError = useCallback(() => {
    setUseFallback(true);
  }, []);

  const handlePlay = useCallback(() => {
    setHasPlayed(true);
    onReady?.();
  }, [onReady]);

  return (
    <Animated.View
      entering={FadeIn.duration(FADE_DURATION)}
      exiting={FadeOut.duration(FADE_DURATION)}
      style={[styles.container, { backgroundColor }, style]}
      testID={testID}
    >
      {useFallback ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <RiveLayer
          fit={fit}
          autoplay={autoplay}
          onPlay={handlePlay}
          onError={handleError}
        />
      )}
    </Animated.View>
  );
}

export function RiveLoaderProvider({ children }: { children: React.ReactNode }) {
  return (
    <RiveLoaderHost overlay={<RiveLoaderPlayback />}>
      {children}
    </RiveLoaderHost>
  );
}

/**
 * Full-screen Rive loading view. Overlay path covers native chrome without a
 * Modal. Falls back to a spinner if Rive errors or never starts.
 */
export function RiveLoader({
  overlay = true,
  visible = true,
  ...playback
}: RiveLoaderProps) {
  const acquire = useRiveLoaderAcquire();

  useEffect(() => {
    if (!visible || !overlay || !acquire) return;
    return acquire();
  }, [acquire, overlay, visible]);

  if (!visible) return null;

  if (overlay && acquire) {
    return <View style={styles.placeholder} />;
  }

  return <RiveLoaderPlayback {...playback} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    backgroundColor: autopackColors.apDarkBlue,
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});

export default RiveLoader;
