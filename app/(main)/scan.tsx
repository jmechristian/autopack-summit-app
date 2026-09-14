import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, usePathname } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking as RNLinking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resolveAttendeeQrPayload } from '../../src/services/attendeeQr';
import { connectFromAttendeeScan } from '../../src/services/qrConnect';
import { autopackColors } from '../../src/theme';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const pathname = usePathname();

  const canScan = useMemo(
    () => !!permission?.granted && !scanned && !processing,
    [permission?.granted, scanned, processing],
  );

  const onBarcodeScanned = useCallback(
    (result: { data?: string }) => {
      if (!canScan || inFlightRef.current) return;
      const data = result?.data || '';
      inFlightRef.current = true;
      setLastRaw(data);
      setLastError(null);
      setScanned(true);
      setProcessing(true);

      void (async () => {
        const resolved = await resolveAttendeeQrPayload(data);
        if (!resolved.ok) {
          setProcessing(false);
          setLastError(resolved.error);
          return;
        }

        let connectedViaScan = false;
        try {
          const handshake = await connectFromAttendeeScan({
            profileId: resolved.profileId,
            userId: resolved.userId,
          });
          if (handshake.blocked) {
            setProcessing(false);
            setLastError('This connection is blocked.');
            return;
          }
          connectedViaScan = handshake.connected;
        } catch (e: any) {
          console.warn('QR contact handshake failed:', e);
        }

        setProcessing(false);
        const fromCapture = pathname?.includes('capture');
        router.navigate({
          pathname: '/(main)/community/[id]',
          params: {
            id: resolved.profileId,
            returnTo: fromCapture ? '/(main)/hub/capture' : '/(main)/scan',
            returnLabel: fromCapture ? 'Back to Capture' : 'Back to Scan',
            ...(connectedViaScan ? { connectedViaScan: '1' } : {}),
          },
        });
      })().catch(() => {
        setProcessing(false);
        setLastError('Unable to look up this QR code. Please try again.');
      });
    },
    [canScan, pathname],
  );

  function resetScan() {
    inFlightRef.current = false;
    setScanned(false);
    setProcessing(false);
    setLastError(null);
    setLastRaw(null);
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera</Text>
        <Text style={styles.muted}>Checking permissions…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Apple 5.1.1(iv): pre-permission UI must use Continue/Next (not "Grant permission")
    // and must not offer Cancel that delays the system permission dialog.
    // If the user already denied, direct them to Settings instead.
    const previouslyDenied = permission.canAskAgain === false;
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.muted}>
          {previouslyDenied
            ? 'Camera access is turned off. Open Settings to enable it so you can scan QR codes.'
            : 'This feature uses the camera to scan attendee QR codes.'}
        </Text>
        {previouslyDenied ? (
          <Pressable style={styles.primaryBtn} onPress={() => void RNLinking.openSettings()}>
            <Text style={styles.primaryBtnText}>Open Settings</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>
        )}
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
        <Text style={styles.hintTitle}>
          {processing ? 'Connecting…' : 'Point your camera at an attendee QR code'}
        </Text>
        <Text style={styles.hintText}>We’ll add them as a contact and unlock messaging.</Text>
        {processing && <ActivityIndicator color="#fff" />}

        {!!lastError && <Text style={styles.errorText}>{lastError}</Text>}
        {!!lastError && __DEV__ && !!lastRaw && (
          <Text style={styles.debugText} numberOfLines={4}>
            Scanned: {lastRaw}
          </Text>
        )}

        {scanned && !processing && (
          <Pressable style={styles.primaryBtn} onPress={resetScan}>
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
});
