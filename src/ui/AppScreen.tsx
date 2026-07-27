import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { ui } from './tokens';

export function AppScreen(props: {
  children: React.ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView
      style={[styles.base, props.padded !== false && styles.padded, props.style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {props.children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: ui.colors.bg },
  padded: { padding: ui.space.lg },
});


