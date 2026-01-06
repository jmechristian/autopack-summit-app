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
import { AppBadge } from './AppBadge';

export function IconCard(props: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  iconColor?: string;
  iconBgColor?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  badge?: number | null;
}) {
  const Wrapper: any = props.onPress ? Pressable : View;
  const iconSize = props.iconSize ?? 34;
  return (
    <Wrapper onPress={props.onPress} style={[styles.card, props.style]}>
      <View style={styles.badgeWrap}>
        <AppBadge value={props.badge} />
      </View>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: props.iconBgColor || ui.colors.primary },
        ]}
      >
        <Ionicons
          name={props.icon}
          size={iconSize}
          color={props.iconColor || '#FFFFFF'}
        />
      </View>
      <Text style={styles.label} numberOfLines={2} ellipsizeMode='tail'>
        {props.label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ui.colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.colors.text,
    textAlign: 'center',
    lineHeight: 18,
    minHeight: 36, // reserve 2 lines so tile heights don't jump when labels wrap
  },
});


