// app/(main)/hub.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { autopackColors } from '../../src/theme';

interface HubItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

const hubItems: HubItem[] = [
  { id: '1', icon: 'trophy', label: 'Leaderboard', color: '#ffffff' },
  { id: '2', icon: 'image', label: 'Photos', color: '#ffffff' },
  { id: '3', icon: 'chatbubbles', label: 'Session Q&A', color: '#ffffff' },
  { id: '4', icon: 'map', label: 'Floormap', color: '#ffffff' },
  { id: '5', icon: 'business', label: 'Exhibitors', color: '#ffffff' },
  { id: '6', icon: 'camera', label: 'Speakers', color: '#ffffff' },
  { id: '7', icon: 'bookmark', label: 'Attendees', color: '#ffffff' },
  { id: '8', icon: 'settings', label: 'Settings', color: '#ffffff' },
];

export default function HubScreen() {
  const insets = useSafeAreaInsets();

  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

  useEffect(() => {
    // Target: 8:00 AM Eastern (New York) on Sept 30, 2026
    // 8:00 AM ET on 2026-09-30 corresponds to 12:00:00 UTC.
    const target = new Date('2026-09-30T12:00:00Z').getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: '00',
          hours: '00',
          minutes: '00',
          seconds: '00',
        });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (60 * 60 * 24));
      const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      });
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleItemPress = (item: HubItem) => {
    // TODO: wire up navigation or actions
    console.log('Pressed:', item.label);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.inner}>
        {/* Countdown Card */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(150)}
          style={styles.countdownWrapper}
        >
          <View style={styles.countdownCard}>
            <View style={styles.countdownTextBlock}>
              <Text style={styles.countdownTitle}>Countdown to conference</Text>
              <Text style={styles.countdownSubtitle}>
                <Text style={styles.countdownSubtitleBold}>
                  Sept 30, 2026 — 8:00 AM ET
                </Text>
              </Text>
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeNumber}>{timeLeft.days}</Text>
                <Text style={styles.timeLabel}>Days</Text>
              </View>
              <View style={styles.timeBlock}>
                <Text style={styles.timeNumber}>{timeLeft.hours}</Text>
                <Text style={styles.timeLabel}>Hrs</Text>
              </View>
              <View style={styles.timeBlock}>
                <Text style={styles.timeNumber}>{timeLeft.minutes}</Text>
                <Text style={styles.timeLabel}>Min</Text>
              </View>
              <View style={styles.timeBlock}>
                <Text style={styles.timeNumber}>{timeLeft.seconds}</Text>
                <Text style={styles.timeLabel}>Sec</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Lead Capture Button */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(200)}
          style={styles.leadButtonWrapper}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.leadButton}
            onPress={() => {
              router.push('/(main)/scan');
            }}
          >
            <Ionicons
              name='qr-code-outline'
              size={24}
              color='#FFFFFF'
              style={styles.leadIcon}
            />
            <Text style={styles.leadText}>Lead Capture</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Access */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(250)}
          style={styles.quickAccessWrapper}
        >
          <View style={styles.quickHeaderRow}>
            <Text style={styles.quickHeaderText}>Quick Access</Text>
            <Ionicons name='add' size={24} color='#000' />
          </View>

          <View style={styles.grid}>
            {hubItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.85}
                style={styles.gridItem}
              >
                <View style={styles.gridIconWrapper}>
                  <Ionicons name={item.icon} size={30} color={item.color} />
                </View>
                <Text style={styles.gridLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F1F8',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  inner: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  countdownWrapper: {
    marginBottom: 24,
  },
  countdownCard: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  countdownTextBlock: {
    marginRight: 8,
  },
  countdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: autopackColors.apBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  countdownSubtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  countdownSubtitleBold: {
    fontWeight: '600',
    color: '#6B7280',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  timeBlock: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  timeNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  timeLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#6B7280',
    marginTop: 2,
  },
  leadButtonWrapper: {
    marginBottom: 24,
  },
  leadButton: {
    width: '100%',
    backgroundColor: autopackColors.apBlue,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  leadIcon: {
    marginRight: 8,
  },
  leadText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickAccessWrapper: {},
  quickHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gridIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: autopackColors.apBlue,
  },
  gridLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
