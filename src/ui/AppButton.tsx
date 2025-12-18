import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { ui } from './tokens';

type Variant = 'primary' | 'secondary' | 'muted' | 'outline';

export function AppButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
}) {
  const variant = props.variant || 'primary';
  const disabled = !!props.disabled;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={disabled}
      style={[
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        props.style,
      ]}
    >
      <Text style={[styles.textBase, variantTextStyles[variant]]}>{props.title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: ui.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBase: { fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.6 },
});

const variantStyles: Record<Variant, any> = {
  primary: { backgroundColor: ui.colors.primary },
  secondary: { backgroundColor: ui.colors.secondary },
  muted: { backgroundColor: ui.colors.muted },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: ui.colors.primary },
};

const variantTextStyles: Record<Variant, any> = {
  primary: { color: '#fff' },
  secondary: { color: '#111827' },
  muted: { color: '#fff' },
  outline: { color: ui.colors.primary },
};


