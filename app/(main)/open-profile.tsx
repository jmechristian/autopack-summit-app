import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RiveLoader } from '../../src/components/RiveLoader';
import { resolveAttendeeQrPayload } from '../../src/services/attendeeQr';
import { connectFromAttendeeScan } from '../../src/services/qrConnect';
import { takePendingIncomingAppLink } from '../../src/utils/incomingAppLinks';
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
  const [done, setDone] = useState(false);

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
    takePendingIncomingAppLink();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!payload) {
      setError('That link is missing an attendee id.');
      return;
    }

    void resolveAttendeeQrPayload(payload)
      .then(async (resolved) => {
        if (cancelled) return;
        if (!resolved.ok) {
          setError(resolved.error);
          return;
        }

        let connectedViaScan = false;
        try {
          const handshake = await connectFromAttendeeScan({
            profileId: resolved.profileId,
            userId: resolved.userId,
          });
          if (cancelled) return;
          if (handshake.blocked) {
            setError('This connection is blocked.');
            return;
          }
          connectedViaScan = handshake.connected;
        } catch (e: any) {
          console.warn('QR contact handshake failed:', e);
        }

        if (cancelled) return;
        setDone(true);
        router.replace({
          pathname: '/(main)/community/[id]',
          params: {
            id: resolved.profileId,
            ...(connectedViaScan ? { connectedViaScan: '1' } : {}),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError('Unable to look up this QR code. Please try again.');
      });

    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (done) return null;

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

  return <RiveLoader overlay={false} />;
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
