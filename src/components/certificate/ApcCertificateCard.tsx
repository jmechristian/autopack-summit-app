import React from 'react';
import { Image } from 'expo-image';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  progress?: number | null;
  onPrimaryPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const TOTAL_SEGMENTS = 10;

function normalizeProgress(progress?: number | null) {
  if (typeof progress !== 'number' || Number.isNaN(progress)) return 0;
  return Math.max(0, Math.min(100, progress));
}

export function ApcCertificateCard({ progress, onPrimaryPress, style }: Props) {
  const normalized = normalizeProgress(progress);
  const isComplete = normalized >= 100;
  const hasProgress = normalized > 0 && normalized < 100;
  const filledSegments = isComplete
    ? TOTAL_SEGMENTS
    : Math.max(0, Math.min(TOTAL_SEGMENTS, Math.round((normalized / 100) * TOTAL_SEGMENTS)));
  const ctaText = hasProgress ? 'Keep Going!' : 'Enroll Now!';

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <Image
          source={require('../../../assets/images/aps-black.svg')}
          style={styles.logo}
          contentFit='contain'
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
          <Text style={styles.completeTitle}>Completed!</Text>
          <Text style={styles.completeBody}>
            You&apos;re part of the top group of attendees who finished the Automotive Packaging
            Certificate
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.bodyText}>
            Build the skills you need to succeed in automotive packaging-100% online
          </Text>
          <Pressable onPress={onPrimaryPress} style={styles.ctaButton}>
            <Text style={styles.ctaText}>{ctaText}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#EEE7D1',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E6A800',
    paddingHorizontal: 14,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 146,
    height: 44,
  },
  percentPill: {
    minWidth: 66,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 5,
    backgroundColor: '#E6A800',
    borderRadius: 12,
    alignItems: 'center',
  },
  percentText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    lineHeight: 26,
    fontFamily: 'Oswald-Bold',
  },
  segmentsRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 10,
    borderRadius: 2,
  },
  segmentFilled: {
    backgroundColor: '#E6A800',
  },
  segmentEmpty: {
    backgroundColor: '#FFFFFF',
  },
  bodyText: {
    marginTop: 20,
    color: '#111111',
    fontSize: 14,
    lineHeight: 20,
  },
  ctaButton: {
    marginTop: 18,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#111111',
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Oswald-Bold',
    textTransform: 'uppercase',
    includeFontPadding: true,
    textAlignVertical: 'center',
  },
  completeWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  completeTitle: {
    color: '#111111',
    fontWeight: '900',
    fontSize: 33,
    lineHeight: 35,
    fontFamily: 'Oswald-Bold',
  },
  completeBody: {
    marginTop: 6,
    color: '#111111',
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'center',
  },
});
