import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { usePointsToastStore } from '../../store/pointsToastStore';
import { ui } from '../../ui/tokens';

const VISIBLE_MS = 2800;

export function PointsToastHost() {
  const toast = usePointsToastStore((s) => s.current);
  const dismiss = usePointsToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    const timer = setTimeout(() => dismiss(), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [dismiss, toast]);

  if (!toast) return null;

  const subtitle =
    toast.labels.length === 0
      ? 'Summit score up'
      : toast.labels.length === 1
        ? toast.labels[0]
        : `${toast.labels[0]} · ${toast.labels[1]}`;

  const card = (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.springify().damping(16)}
      exiting={FadeOutUp.duration(220)}
    >
      <Pressable
        style={styles.card}
        onPress={() => {
          dismiss();
          router.push('/(main)/hub/points' as any);
        }}
        accessibilityRole='button'
        accessibilityLabel={`Gained ${toast.delta} points`}
      >
        <View style={styles.iconWrap}>
          <Ionicons name='trophy' size={18} color='#fff' />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>+{toast.delta} pts</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );

  const layer = (
    <View
      pointerEvents='box-none'
      style={[styles.layer, { paddingTop: Math.max(insets.top, 12) + 8 }]}
    >
      {card}
    </View>
  );

  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{layer}</FullWindowOverlay>;
  }
  return layer;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    zIndex: 20000,
    elevation: 20000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 360,
    width: '92%',
    borderRadius: 16,
    backgroundColor: ui.colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: ui.fonts.oswaldBold,
  },
  subtitle: {
    marginTop: 1,
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 13,
  },
});
