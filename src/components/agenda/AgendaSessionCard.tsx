import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { autopackColors } from '../../theme';

type AgendaSessionCardProps = {
  timeLabel: string;
  title: string;
  location?: string;
  descriptionText?: string;
  speakerNames?: string[];
  sponsorNames?: string[];
  onPress: () => void;
  isExpanded?: boolean;
  showExpandToggle?: boolean;
  onToggleExpand?: () => void;
  showNoteIcon?: boolean;
  showFavorite?: boolean;
  isFavorite?: boolean;
  isFavoritePending?: boolean;
  onToggleFavorite?: () => void;
  descriptionNumberOfLines?: number;
  metaNumberOfLines?: number;
  cardStyle?: StyleProp<ViewStyle>;
};

function formatPeopleList(names: string[]) {
  return names.map((n) => n.trim()).filter(Boolean).join(', ');
}

export function AgendaSessionCard({
  timeLabel,
  title,
  location,
  descriptionText,
  speakerNames = [],
  sponsorNames = [],
  onPress,
  isExpanded = false,
  showExpandToggle = false,
  onToggleExpand,
  showNoteIcon = false,
  showFavorite = false,
  isFavorite = false,
  isFavoritePending = false,
  onToggleFavorite,
  descriptionNumberOfLines,
  metaNumberOfLines,
  cardStyle,
}: AgendaSessionCardProps) {
  const descriptionLines =
    typeof descriptionNumberOfLines === 'number'
      ? descriptionNumberOfLines
      : isExpanded
        ? undefined
        : 6;

  return (
    <View style={[styles.card, cardStyle]}>
      <View style={styles.topRightActions}>
        {showNoteIcon && (
          <View pointerEvents='none' style={styles.noteIcon}>
            <Ionicons name='document-text-outline' size={18} color={autopackColors.apBlue} />
          </View>
        )}
        {showFavorite && (
          <Pressable style={styles.favoriteIconBtn} hitSlop={8} onPress={onToggleFavorite}>
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={18}
              color={isFavorite ? '#f59e0b' : isFavoritePending ? '#9ca3af' : '#6b7280'}
            />
          </Pressable>
        )}
      </View>

      <Pressable onPress={onPress} style={({ pressed }) => [styles.cardBodyPressable, pressed && styles.cardPressed]}>
        <Text style={styles.time}>{timeLabel}</Text>
        <Text style={styles.title}>{title}</Text>

        {!!location && <Text style={styles.location}>{location}</Text>}

        <View style={styles.divider} />

        {!!descriptionText && (
          <>
            <Text style={styles.description} numberOfLines={descriptionLines}>
              {descriptionText}
            </Text>
            {showExpandToggle && !!onToggleExpand && (
              <Pressable onPress={onToggleExpand} hitSlop={8} style={styles.readMoreBtn}>
                <Text style={styles.readMoreText}>{isExpanded ? 'Show less' : 'Read more'}</Text>
              </Pressable>
            )}
          </>
        )}

        {!!speakerNames.length && (
          <Text style={styles.metaLine} numberOfLines={metaNumberOfLines}>
            <Text style={styles.metaLabel}>Speakers: </Text>
            {formatPeopleList(speakerNames)}
          </Text>
        )}

        {!!sponsorNames.length && (
          <Text style={styles.metaLine} numberOfLines={metaNumberOfLines}>
            <Text style={styles.metaLabel}>Sponsors: </Text>
            {formatPeopleList(sponsorNames)}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardBodyPressable: {
    padding: 14,
    paddingRight: 52,
  },
  cardPressed: { opacity: 0.92 },
  noteIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  topRightActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    zIndex: 20,
    elevation: 20,
  },
  favoriteIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    zIndex: 25,
    elevation: 25,
  },
  time: { color: autopackColors.apBlue, fontWeight: '800', fontSize: 13, marginBottom: 6 },
  title: { fontSize: 17, fontWeight: '800', color: '#111827' },
  location: { marginTop: 6, color: '#4B5563', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  description: { color: '#374151', lineHeight: 20 },
  readMoreBtn: { alignSelf: 'flex-start', marginTop: 8 },
  readMoreText: { color: autopackColors.apBlue, fontWeight: '700' },
  metaLine: { marginTop: 10, color: '#374151', lineHeight: 20 },
  metaLabel: { fontWeight: '800', color: '#111827' },
});
