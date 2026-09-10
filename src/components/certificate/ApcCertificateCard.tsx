import React, { useState } from 'react';
import { Image } from 'expo-image';
import {
  Linking,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type Props = {
  progress?: number | null;
  style?: StyleProp<ViewStyle>;
};

const APC_URL = 'https://packagingschool.com/certifications/get-to-know-apc';
const APC_PROMO_IMAGE =
  'https://packschool.s3.us-east-1.amazonaws.com/APS_ACP_prep_mark_your_calendar.webp';

function hasPurchased(progress?: number | null) {
  return typeof progress === 'number' && !Number.isNaN(progress) && progress > 0;
}

export function ApcCertificateCard({ progress, style }: Props) {
  const [aspectRatio, setAspectRatio] = useState(1);

  if (hasPurchased(progress)) return null;

  return (
    <Pressable
      style={[styles.card, style]}
      onPress={() => void Linking.openURL(APC_URL)}
      accessibilityRole='link'
      accessibilityLabel='Automotive Packaging Certificate one-day deal. Opens Packaging School APC page.'
    >
      <Image
        source={{ uri: APC_PROMO_IMAGE }}
        style={[styles.image, { aspectRatio }]}
        contentFit='cover'
        onLoad={(event) => {
          const width = event.source?.width;
          const height = event.source?.height;
          if (width && height) setAspectRatio(width / height);
        }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111111',
  },
  image: {
    width: '100%',
  },
});

export default ApcCertificateCard;
