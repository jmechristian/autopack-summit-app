import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ui } from './tokens';

export function AppScreen(props: {
  children: React.ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.base, props.padded !== false && styles.padded, props.style]}>
      {props.children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: ui.colors.bg },
  padded: { padding: ui.space.lg },
});


