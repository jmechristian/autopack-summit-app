import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { autopackColors } from '../../src/theme';
import * as Linking from 'expo-linking';

function extractProfileId(payload: string): string | null {
  const raw = (payload || '').trim();
  if (!raw) return null;

  // Accept APS custom scheme path format:
  // aps://profile/<profileId>
  // aps://profile/<profileId>/...
  // aps://profile?id=<profileId>
  {
    const m = raw.match(/^aps:\/\/profile\/([0-9a-fA-F-]{20,})(?:\/.*)?$/i);
    if (m?.[1]) return m[1];
  }

  // Accept raw UUID as a fallback
  if (/^[0-9a-fA-F-]{20,}$/.test(raw) && !raw.includes('://')) return raw;

  // Accept JSON payloads
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw) as { profileId?: string };
      if (obj?.profileId) return obj.profileId;
    } catch {
      // ignore
    }
  }

  // Accept vCard payloads (optional custom field)
  // Example line: X-APS-PROFILEID:<uuid>
  if (/BEGIN:VCARD/i.test(raw)) {
    const m = raw.match(/X-APS-PROFILEID\s*:\s*([0-9a-fA-F-]{20,})/i);
    if (m?.[1]) return m[1];
  }

  // Prefer expo-linking parsing (handles custom schemes reliably)
  try {
    const parsed = Linking.parse(raw);
    const q = parsed?.queryParams as Record<string, unknown> | undefined;
    const profileId = typeof q?.profileId === 'string' ? q.profileId : null;
    if (profileId) return profileId;

    // If the QR is aps://profile/<id>, expo-linking will typically parse:
    // { scheme: 'aps', hostname: 'profile', path: '<id>' }
    const maybeHost = typeof (parsed as any)?.hostname === 'string' ? ((parsed as any).hostname as string) : '';
    const maybePath = typeof (parsed as any)?.path === 'string' ? ((parsed as any).path as string) : '';
    if (maybeHost.toLowerCase() === 'profile') {
      const idFromPath = maybePath.split('/').filter(Boolean)[0];
      if (idFromPath && /^[0-9a-fA-F-]{20,}$/.test(idFromPath)) return idFromPath;
    }
  } catch {
    // ignore
  }

  try {
    const url = new URL(raw);
    const profileId = url.searchParams.get('profileId');
    return profileId || null;
  } catch {
    return null;
  }
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastRaw, setLastRaw] = useState<string | null>(null);

  const canScan = useMemo(() => !!permission?.granted && !scanned, [permission?.granted, scanned]);

  const onBarcodeScanned = useCallback(
    (result: { data?: string }) => {
      if (!canScan) return;
      const data = result?.data || '';
      setLastRaw(data);
      const profileId = extractProfileId(data);
      if (!profileId) {
        setLastError('Not a valid APS QR code.');
        setScanned(true);
        return;
      }
      setLastError(null);
      setScanned(true);
      // Use navigate to switch tabs without building up weird history stacks.
      router.navigate({
        pathname: '/(main)/community/[id]',
        params: { id: profileId, returnTo: '/(main)/scan', returnLabel: 'Back to Scan' },
      });
    },
    [canScan]
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera</Text>
        <Text style={styles.muted}>Checking permissions…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera permission required</Text>
        <Text style={styles.muted}>Enable camera access to scan QR codes.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant permission</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={onBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.topTitle}>Scan QR</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.hintWrap}>
        <Text style={styles.hintTitle}>Point your camera at an attendee QR code</Text>
        <Text style={styles.hintText}>We’ll open their profile so you can add them as a contact or lead.</Text>

        {!!lastError && <Text style={styles.errorText}>{lastError}</Text>}
        {!!lastError && __DEV__ && !!lastRaw && (
          <Text style={styles.debugText} numberOfLines={4}>
            Scanned: {lastRaw}
          </Text>
        )}

        {scanned && (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => {
              setScanned(false);
              setLastError(null);
              setLastRaw(null);
            }}
          >
            <Text style={styles.primaryBtnText}>Scan again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, gap: 10 },
  title: { fontSize: 18, fontWeight: '900', color: '#111827' },
  muted: { color: '#6b7280', textAlign: 'center' },

  topBar: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  hintWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 20,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    gap: 8,
  },
  hintTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  hintText: { color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  errorText: { color: '#fecaca', fontWeight: '800' },
  debugText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 16 },

  primaryBtn: {
    marginTop: 6,
    backgroundColor: autopackColors.apBlue,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },

  secondaryBtn: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#111827', fontWeight: '900' },
});


