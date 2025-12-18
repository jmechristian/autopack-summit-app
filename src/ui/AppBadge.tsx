import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ui } from './tokens';

export function AppBadge(props: { value?: number | null }) {
  const v = props.value || 0;
  if (v <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: ui.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 12 },
});


