import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { ui } from './tokens';

export function AppCard(props: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  if (props.onPress) {
    return (
      <Pressable onPress={props.onPress} style={[styles.card, props.style]}>
        {props.children}
      </Pressable>
    );
  }

  return <View style={[styles.card, props.style]}>{props.children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: ui.radius.card,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: ui.colors.surface,
    padding: 14,
  },
});


