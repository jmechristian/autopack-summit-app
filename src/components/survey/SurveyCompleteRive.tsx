import { memo, useEffect, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import Rive, { Alignment, Fit } from 'rive-react-native';

const SOURCE = require('../../../assets/survey_complete.riv');

const RiveLayer = memo(function RiveLayer() {
  return (
    <Rive
      source={SOURCE}
      stateMachineName="State Machine 1"
      autoplay
      fit={Fit.Contain}
      alignment={Alignment.Center}
      style={styles.fill}
    />
  );
});

export function SurveyCompleteRive() {
  const [mountRive, setMountRive] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setMountRive(true);
    });
    return () => handle.cancel?.();
  }, []);

  if (!mountRive) return null;

  return (
    <View style={styles.fill} pointerEvents="none">
      <RiveLayer />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
