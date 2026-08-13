import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { autopackColors } from '../../theme';

type AgendaSessionCardProps = {
  timeLabel: string;
  title: string;
  isLive?: boolean;
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
  showPresentationButton?: boolean;
  onPressPresentation?: () => void;
  /** Text link + chevron under the description (e.g. Hub Coming Up). */
  showViewSessionButton?: boolean;
};

function formatPeopleList(names: string[]) {
  return names.map((n) => n.trim()).filter(Boolean).join(', ');
}

export function AgendaSessionCard({
  timeLabel,
  title,
  isLive = false,
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
  showPresentationButton = false,
  onPressPresentation,
  showViewSessionButton = false,
}: AgendaSessionCardProps) {
  const descriptionLines =
    typeof descriptionNumberOfLines === 'number'
      ? descriptionNumberOfLines
      : isExpanded
        ? undefined
        : 6;
  const hasTopRightMeta = showNoteIcon || showFavorite;
  const needsWideRightInset = isLive || showNoteIcon || showFavorite;
  const needsExtraWideRightInset = isLive && (showNoteIcon || showFavorite);

  return (
    <View style={[styles.card, cardStyle]}>
      <View style={[styles.topRightActions, isLive && hasTopRightMeta && styles.topRightActionsLiveStack]}>
        {isLive && (
          <View pointerEvents='none' style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        {isLive && hasTopRightMeta ? (
          <View style={styles.topRightMetaRow}>
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
        ) : (
          <>
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
          </>
        )}
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cardBodyPressable,
          needsWideRightInset && styles.cardBodyPressableWide,
          needsExtraWideRightInset && styles.cardBodyPressableExtraWide,
          pressed && styles.cardPressed,
        ]}
      >
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

        {showViewSessionButton && (
          <Pressable onPress={onPress} hitSlop={8} style={styles.viewSessionBtn}>
            <Text style={styles.viewSessionText}>View session</Text>
            <Ionicons name='chevron-forward' size={16} color={autopackColors.apBlue} />
          </Pressable>
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

      {showPresentationButton && !!onPressPresentation && (
        <Pressable style={styles.presentationBtn} onPress={onPressPresentation}>
          <Ionicons name='tv-outline' size={16} color='#FFFFFF' />
          <Text style={styles.presentationBtnText}>View Presentation</Text>
        </Pressable>
      )}
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
    paddingRight: 14,
  },
  cardBodyPressableWide: { paddingRight: 80 },
  cardBodyPressableExtraWide: { paddingRight: 150 },
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
  topRightActionsLiveStack: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  topRightMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#DC2626',
  },
  liveText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  location: { marginTop: 6, color: '#4B5563', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  description: { color: '#374151', lineHeight: 20 },
  readMoreBtn: { alignSelf: 'flex-start', marginTop: 8 },
  readMoreText: { color: autopackColors.apBlue, fontWeight: '700' },
  viewSessionBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewSessionText: {
    color: autopackColors.apBlue,
    fontWeight: '800',
    fontSize: 14,
  },
  metaLine: { marginTop: 10, color: '#374151', lineHeight: 20 },
  metaLabel: { fontWeight: '800', color: '#111827' },
  presentationBtn: {
    marginHorizontal: 14,
    marginBottom: 14,
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: autopackColors.apBlue,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presentationBtnText: { color: '#FFFFFF', fontWeight: '800' },
});
