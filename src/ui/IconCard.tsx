import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { ui } from './tokens';

export function IconCard(props: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  iconColor?: string;
  iconBgColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const Wrapper: any = props.onPress ? Pressable : View;
  return (
    <Wrapper onPress={props.onPress} style={[styles.card, props.style]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: props.iconBgColor || ui.colors.primary },
        ]}
      >
        <Ionicons
          name={props.icon}
          size={30}
          color={props.iconColor || '#FFFFFF'}
        />
      </View>
      <Text style={styles.label}>{props.label}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ui.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.colors.text,
  },
});


