import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

type Acquire = () => () => void;

const RiveLoaderOverlayContext = createContext<Acquire | null>(null);

export function useRiveLoaderAcquire() {
  return useContext(RiveLoaderOverlayContext);
}

type Props = {
  children: React.ReactNode;
  overlay: React.ReactNode;
};

/**
 * Renders the Rive loader above native stack headers and the tab bar.
 * Uses FullWindowOverlay on iOS (a new window — not a UIKit modal, which
 * froze navigation with "presentation is in progress"). Android/web use a
 * root sibling layer so the same call sites work without remounting Rive
 * extra times.
 */
export function RiveLoaderHost({ children, overlay }: Props) {
  const [count, setCount] = useState(0);
  const { width, height } = useWindowDimensions();

  const acquire = useCallback(() => {
    setCount((n) => n + 1);
    return () => setCount((n) => Math.max(0, n - 1));
  }, []);

  const show = count > 0;
  const surface = (
    <View style={[styles.surface, { width, height }]} pointerEvents="auto">
      {overlay}
    </View>
  );

  return (
    <RiveLoaderOverlayContext.Provider value={acquire}>
      <View style={styles.root}>
        {children}
        {show ? (
          Platform.OS === 'ios' ? (
            <FullWindowOverlay>{surface}</FullWindowOverlay>
          ) : (
            <View style={styles.layer} pointerEvents="auto">
              {surface}
            </View>
          )
        ) : null}
      </View>
    </RiveLoaderOverlayContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  surface: {
    flex: 1,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
});
