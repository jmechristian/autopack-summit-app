import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ui } from '../../ui/tokens';
import { resolveProfilePictureUri } from '../../utils/storageUtils';

function initialsFor(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts[1]?.[0] || parts[0]?.[1] || '';
  return (a + b).toUpperCase() || '?';
}

export function LeaderboardAvatar({
  name,
  picture,
  size = 40,
}: {
  name: string;
  picture?: string | null;
  size?: number;
}) {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!picture) {
      setUri(null);
      return;
    }
    resolveProfilePictureUri(picture)
      .then((next) => {
        if (active) setUri(next);
      })
      .catch(() => {
        if (active) setUri(null);
      });
    return () => {
      active = false;
    };
  }, [picture]);

  const radius = size / 2;
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initialsFor(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: ui.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '800',
  },
});
