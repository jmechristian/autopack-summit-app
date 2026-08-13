import React from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, { type AnimatedProps } from 'react-native-reanimated';
import { isWeb } from '../utils/platform';

type Props = AnimatedProps<ViewProps>;

/**
 * Drop-in for `Animated.View` with `entering` / `exiting`.
 * On web, Reanimated layout animations can leave nodes at `visibility: hidden`;
 * render a plain View and ignore those props instead.
 */
export function SafeEnteringView({ entering, exiting, ...rest }: Props) {
  if (isWeb) {
    return <View {...(rest as ViewProps)} />;
  }
  return <Animated.View entering={entering} exiting={exiting} {...rest} />;
}
