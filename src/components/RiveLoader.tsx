import React from 'react';
import { Modal, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { autopackColors } from '../theme';

const RIVE_SOURCE = require('../../assets/aps_splash_1.riv');
const ARTBOARD_NAME = 'iPhone 16 Pro Max - 1';
const STATE_MACHINE_NAME = 'State Machine 1';
const FADE_DURATION = 350;

export interface RiveLoaderProps {
  /** How the animation is scaled inside its container. Defaults to Cover (fills the screen). */
  fit?: Fit;
  /** Background shown behind/around the animation. Defaults to the brand dark blue. */
  backgroundColor?: string;
  /** Extra styles for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Whether the animation plays automatically. Defaults to true. */
  autoplay?: boolean;
  /**
   * When true (default) the loader renders inside a Modal so it covers everything
   * above it, including the bottom tab bar, stack headers and the status bar.
   * Set false to render inline within the current view (e.g. the launch splash).
   */
  overlay?: boolean;
  /** Controls Modal visibility when `overlay` is true. Defaults to true. */
  visible?: boolean;
  /** Fired when the Rive animation actually starts playing (first frame). */
  onReady?: () => void;
  testID?: string;
}

/**
 * Full-screen Rive animation used for the app splash and as the global loading
 * screen. The `State Machine 1` timeline loops, so it can run for 2s as a splash
 * or indefinitely while data loads. It fades in and out for a smooth transition.
 */
export function RiveLoader({
  fit = Fit.Cover,
  backgroundColor = autopackColors.apDarkBlue,
  style,
  autoplay = true,
  overlay = true,
  visible = true,
  onReady,
  testID,
}: RiveLoaderProps) {
  const animation = (
    <Rive
      source={RIVE_SOURCE}
      artboardName={ARTBOARD_NAME}
      stateMachineName={STATE_MACHINE_NAME}
      autoplay={autoplay}
      fit={fit}
      alignment={Alignment.Center}
      onPlay={onReady}
      style={styles.rive}
    />
  );

  // Modal handles both true full-screen coverage and the fade in/out animation.
  if (overlay) {
    return (
      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType='fade'
        onRequestClose={() => {}}
        testID={testID}
      >
        <View style={[styles.container, { backgroundColor }, style]}>{animation}</View>
      </Modal>
    );
  }

  // Inline usage (e.g. root splash): reanimated drives the fade in/out.
  return (
    <Animated.View
      entering={FadeIn.duration(FADE_DURATION)}
      exiting={FadeOut.duration(FADE_DURATION)}
      style={[styles.container, { backgroundColor }, style]}
      testID={testID}
    >
      {animation}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rive: {
    width: '100%',
    height: '100%',
  },
});

export default RiveLoader;
