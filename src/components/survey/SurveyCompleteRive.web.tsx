import { Alignment, Fit, Layout, RuntimeLoader, useRive } from '@rive-app/react-canvas';
import { useEffect, useMemo, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';

const PUBLIC_RIVE = '/survey_complete.riv';
const PUBLIC_RIVE_WASM = '/rive.wasm';

function ensureWasmUrl() {
  if (typeof window === 'undefined') return;
  RuntimeLoader.setWasmUrl(PUBLIC_RIVE_WASM);
}

function Canvas() {
  const layout = useMemo(
    () => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    [],
  );
  const { RiveComponent } = useRive({
    src: PUBLIC_RIVE,
    stateMachines: 'State Machine 1',
    autoplay: true,
    layout,
  });

  return (
    <View style={styles.fill} pointerEvents="none">
      <RiveComponent style={{ width: '100%', height: '100%', display: 'block' }} />
    </View>
  );
}

export function SurveyCompleteRive() {
  const [mountRive, setMountRive] = useState(false);
  ensureWasmUrl();

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setMountRive(true);
    });
    return () => handle.cancel?.();
  }, []);

  if (!mountRive) return null;
  return <Canvas />;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
