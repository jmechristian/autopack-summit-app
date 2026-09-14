import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RiveLoader } from '../../src/components/RiveLoader';
import { resolveAttendeeQrPayload } from '../../src/services/attendeeQr';
import { autopackColors } from '../../src/theme';
import { ui } from '../../src/ui/tokens';

function firstParam(value?: string | string[]) {
  return (Array.isArray(value) ? value[0] : value) || '';
}

export default function OpenProfileScreen() {
  const params = useLocalSearchParams<{
    registrantId?: string | string[];
    profileId?: string | string[];
    email?: string | string[];
    id?: string | string[];
  }>();
  const [error, setError] = useState<string | null>(null);

  const payload = useMemo(() => {
    const profileId = firstParam(params.profileId);
    const registrantId = firstParam(params.registrantId);
    const email = firstParam(params.email);
    const id = firstParam(params.id);
    if (profileId) return `autopacksummitapp://community/${profileId}`;
    if (registrantId) return `autopacksummitapp://r/${registrantId}`;
    if (email) return `autopacksummitapp://open-profile?email=${encodeURIComponent(email)}`;
    if (id) return id;
    return '';
  }, [params.email, params.id, params.profileId, params.registrantId]);

  useEffect(() => {
    let cancelled = false;
    if (!payload) {
      setError('That link is missing an attendee id.');
      return;
    }

    void resolveAttendeeQrPayload(payload).then((resolved) => {
      if (cancelled) return;
      if (!resolved.ok) {
        setError(resolved.error);
        return;
      }
      router.replace({
        pathname: '/(main)/community/[id]',
        params: { id: resolved.profileId },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t open profile</Text>
        <Text style={styles.muted}>{error}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.replace('/(main)/hub')}>
          <Text style={styles.primaryBtnText}>Back to Hub</Text>
        </Pressable>
      </View>
    );
  }

  return <RiveLoader />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
    backgroundColor: ui.colors.bg,
  },
  title: { fontSize: 20, fontWeight: '900', color: ui.colors.text, textAlign: 'center' },
  muted: { color: ui.colors.muted, textAlign: 'center', lineHeight: 21 },
  primaryBtn: {
    marginTop: 10,
    backgroundColor: autopackColors.apBlue,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
});
