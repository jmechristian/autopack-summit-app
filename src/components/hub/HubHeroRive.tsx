import React, { memo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Rive, { Alignment, Fit } from 'rive-react-native';
import { autopackColors } from '../../theme';

type RiveLayerProps = {
  source: number | string;
  artboardName?: string;
  stateMachineName?: string;
};

/**
 * Stable native layer. Avoid putting changing callbacks/style objects on <Rive>
 * — iOS didSetProps → reloadView() on resource/artboard/stateMachine changes
 * can hang the main thread.
 */
const RiveLayer = memo(function RiveLayer({
  source,
  artboardName,
  stateMachineName,
}: RiveLayerProps) {
  return (
    <Rive
      source={source as any}
      artboardName={artboardName}
      stateMachineName={stateMachineName}
      autoplay
      fit={Fit.Cover}
      alignment={Alignment.Center}
      style={styles.fill}
    />
  );
});

export interface HubHeroRiveProps {
  source?: number | string;
  artboardName?: string;
  stateMachineName?: string;
  backgroundColor?: string;
  /** Defaults to 1 (square). Pass another ratio for tablet columns. */
  aspectRatio?: number;
  /** Fill the parent instead of locking a square — used to match Quick Tools height. */
  fill?: boolean;
  center?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Hub hero. Mounts the Rive file immediately so Hub data fetching can
 * run in parallel — do not gate the Hub screen on this animation.
 */
export function HubHeroRive({
  source,
  artboardName,
  stateMachineName,
  backgroundColor = autopackColors.apDarkBlue,
  aspectRatio = 1,
  fill = false,
  center,
  children,
  style,
  testID,
}: HubHeroRiveProps) {
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor },
        fill ? styles.wrapFill : { aspectRatio },
        style,
      ]}
      testID={testID}
    >
      {source ? (
        <RiveLayer
          source={source}
          artboardName={artboardName}
          stateMachineName={stateMachineName}
        />
      ) : null}

      {center ? (
        <View style={styles.centerLayer} pointerEvents="box-none">
          {center}
        </View>
      ) : null}

      {children ? (
        <View style={styles.overlay} pointerEvents="box-none">
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
  },
  wrapFill: {
    flex: 1,
    alignSelf: 'stretch',
    height: '100%',
    minHeight: 0,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  centerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
});

export default HubHeroRive;
