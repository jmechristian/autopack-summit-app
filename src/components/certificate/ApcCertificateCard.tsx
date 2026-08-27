import React from 'react';
import { Image } from 'expo-image';
import {
  Linking,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { autopackColors } from '../../theme';

type Props = {
  progress?: number | null;
  /** Optional override; defaults to Packaging School APC page. */
  onPrimaryPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const TOTAL_SEGMENTS = 10;
const APC_URL = 'https://packagingschool.com/certifications/get-to-know-apc';

function normalizeProgress(progress?: number | null) {
  if (typeof progress !== 'number' || Number.isNaN(progress)) return 0;
  return Math.max(0, Math.min(100, progress));
}

/**
 * APC progress callout — clear brand presence without dominating Hub.
 */
export function ApcCertificateCard({ progress, onPrimaryPress, style }: Props) {
  const normalized = normalizeProgress(progress);
  const isComplete = normalized >= 100;
  const hasProgress = normalized > 0 && normalized < 100;
  const filledSegments = isComplete
    ? TOTAL_SEGMENTS
    : Math.max(0, Math.min(TOTAL_SEGMENTS, Math.round((normalized / 100) * TOTAL_SEGMENTS)));
  const ctaText = hasProgress ? 'Keep Going' : 'Enroll Now';

  function handlePress() {
    if (onPrimaryPress) {
      onPrimaryPress();
      return;
    }
    void Linking.openURL(APC_URL);
  }

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Image
          source={require('../../../assets/images/aps-black.svg')}
          style={styles.logo}
          contentFit="contain"
        />
        <View style={styles.percentPill}>
          <Text style={styles.percentText}>{Math.round(normalized)}%</Text>
        </View>
      </View>

      <View style={styles.segmentsRow}>
        {Array.from({ length: TOTAL_SEGMENTS }).map((_, index) => (
          <View
            key={index}
            style={[styles.segment, index < filledSegments ? styles.segmentFilled : styles.segmentEmpty]}
          />
        ))}
      </View>

      {isComplete ? (
        <View style={styles.completeWrap}>
          <Text style={styles.completeTitle}>Completed</Text>
          <Text style={styles.completeBody}>
            You&apos;re part of the top group of attendees who finished the Automotive Packaging
            Certificate.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.bodyText}>
            Build the skills you need to succeed in automotive packaging — 100% online.
          </Text>
          <Pressable
            onPress={handlePress}
            style={styles.ctaButton}
            accessibilityRole="link"
            accessibilityLabel={`${ctaText}. Opens Packaging School APC page.`}
          >
            <Text style={styles.ctaText}>{ctaText}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF9EB',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: autopackColors.apYellow,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 128,
    height: 38,
  },
  percentPill: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: autopackColors.apYellow,
    borderRadius: 999,
    alignItems: 'center',
  },
  percentText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
  },
  segmentsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 3,
  },
  segment: {
    flex: 1,
    height: 7,
    borderRadius: 2,
  },
  segmentFilled: {
    backgroundColor: autopackColors.apYellow,
  },
  segmentEmpty: {
    backgroundColor: '#FFFFFF',
  },
  bodyText: {
    marginTop: 12,
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
  },
  ctaButton: {
    marginTop: 12,
    backgroundColor: autopackColors.apYellow,
    borderRadius: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  ctaText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 14,
  },
  completeWrap: {
    marginTop: 12,
  },
  completeTitle: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  completeBody: {
    marginTop: 4,
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ApcCertificateCard;
