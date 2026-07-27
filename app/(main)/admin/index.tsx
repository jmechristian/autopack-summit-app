import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppScreen } from '../../../src/ui/AppScreen';
import { IconCard } from '../../../src/ui/IconCard';
import { ui } from '../../../src/ui/tokens';

type AdminSection = {
  key:
    | 'registrants'
    | 'exhibitors'
    | 'sponsors'
    | 'speakers'
    | 'agenda-sessions'
    | 'add-ons'
    | 'passport'
    | 'seating-chart'
    | 'announcements';
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const sections: AdminSection[] = [
  { key: 'registrants', title: 'Registrants', icon: 'people-outline' },
  { key: 'exhibitors', title: 'Exhibitors', icon: 'business-outline' },
  { key: 'sponsors', title: 'Sponsors', icon: 'ribbon-outline' },
  { key: 'speakers', title: 'Speakers', icon: 'mic-outline' },
  { key: 'agenda-sessions', title: 'Agenda / Sessions', icon: 'calendar-outline' },
  { key: 'add-ons', title: 'Add-ons', icon: 'add-circle-outline' },
  { key: 'passport', title: 'Passport', icon: 'book-outline' },
  { key: 'seating-chart', title: 'Seating Chart', icon: 'grid-outline' },
  { key: 'announcements', title: 'Announcements', icon: 'megaphone-outline' },
];

export default function AdminHomeScreen() {
  return (
    <AppScreen style={styles.screen}>
      <View style={styles.grid}>
        {sections.map((section) => (
          <View
            key={section.key}
            style={styles.gridCell}
          >
            <IconCard
              icon={section.icon}
              label={section.title}
              iconBgColor='transparent'
              iconColor='#FFFFFF'
              iconSize={20}
              onPress={() => router.push(`/(main)/admin/${section.key}` as any)}
              style={[styles.iconCard, styles.iconCardPrimary]}
              iconWrapStyle={styles.iconWrap}
              labelStyle={styles.cardLabel}
            />
          </View>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#E6F1F8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  gridCell: {
    width: '48%',
  },
  iconCard: {
    minHeight: 88,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 0,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconCardPrimary: {
    backgroundColor: ui.colors.primary,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  cardLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
    minHeight: 0,
    textAlign: 'left',
  },
});

