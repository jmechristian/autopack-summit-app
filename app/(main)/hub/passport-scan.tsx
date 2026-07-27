import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { APS_ID } from '../../../src/config/apsConfig';
import { RiveLoader } from '../../../src/components/RiveLoader';
import {
  apsAppExhibitorProfilesByPassportQrPayload,
  apsAppUserPassportStampsByStampKey,
} from '../../../src/graphql/queries';
import { useCurrentUserProfile } from '../../../src/hooks/useApsStore';
import { autopackColors } from '../../../src/theme';
import { ui } from '../../../src/ui/tokens';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../../src/utils/graphqlClient';

type ScanState = 'scanning' | 'processing' | 'success' | 'failure';

type ScanResult = {
  title: string;
  message: string;
  exhibitorName?: string | null;
};

type ExhibitorLookup = {
  id: string;
  eventId: string;
  company?: { name?: string | null } | null;
};

const createPassportStamp = /* GraphQL */ `
  mutation CreatePassportStamp($input: CreateApsAppUserPassportStampInput!) {
    createApsAppUserPassportStamp(input: $input) {
      id
      stampKey
      __typename
    }
  }
`;

function clean(v?: string | null) {
  return (v || '').trim();
}

function isDuplicateError(error: unknown) {
  const message = String((error as any)?.message || '');
  return /conditional|already exists|duplicate/i.test(message);
}

export default function PassportScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const profile = useCurrentUserProfile();
  const params = useLocalSearchParams<{ exhibitorId?: string | string[] }>();
  const expectedExhibitorId = Array.isArray(params.exhibitorId) ? params.exhibitorId[0] : params.exhibitorId;
  const profileId = profile?.id || null;
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const scanInFlightRef = useRef(false);

  const canScan = useMemo(
    () => !!permission?.granted && scanState === 'scanning',
    [permission?.granted, scanState],
  );

  const completeScan = useCallback(
    async (payload: string) => {
      const fullPayload = clean(payload);
      setLastRaw(fullPayload);
      if (!fullPayload) {
        setScanState('failure');
        setResult({ title: 'Scan failed', message: 'That QR code did not contain a passport payload.' });
        return;
      }

      if (!profileId) {
        setScanState('failure');
        setResult({ title: 'Profile required', message: 'Your app profile is required before stamps can be collected.' });
        return;
      }

      setScanState('processing');
      try {
        const lookupResp = await graphqlApiKeyClient.graphql({
          query: apsAppExhibitorProfilesByPassportQrPayload,
          variables: { passportQrPayload: fullPayload, limit: 1 },
        });
        const lookupData = (lookupResp as any).data as {
          apsAppExhibitorProfilesByPassportQrPayload?: {
            items?: ({
              id?: string | null;
              eventId?: string | null;
              company?: { name?: string | null } | null;
            } | null)[] | null;
          };
        };
        const exhibitor = (lookupData.apsAppExhibitorProfilesByPassportQrPayload?.items || []).find(
          (item): item is ExhibitorLookup => !!item?.id && !!item.eventId,
        );

        if (!exhibitor) {
          setScanState('failure');
          setResult({
            title: 'QR not recognized',
            message: 'This code is not a valid AutoPack Summit passport QR code.',
          });
          return;
        }

        if (exhibitor.eventId !== APS_ID) {
          setScanState('failure');
          setResult({
            title: 'Wrong event',
            message: 'This passport QR code belongs to a different event.',
            exhibitorName: clean(exhibitor.company?.name) || null,
          });
          return;
        }

        const stampKey = `${APS_ID}#${profileId}#${exhibitor.id}`;
        const existingResp = await graphqlAuthClient.graphql({
          query: apsAppUserPassportStampsByStampKey,
          variables: { stampKey, limit: 1 },
        });
        const existingData = (existingResp as any).data as {
          apsAppUserPassportStampsByStampKey?: { items?: ({ id?: string | null } | null)[] | null };
        };
        const existing = existingData.apsAppUserPassportStampsByStampKey?.items?.find((item) => !!item?.id);
        const exhibitorName = clean(exhibitor.company?.name) || 'Exhibitor';

        if (!existing) {
          try {
            await graphqlAuthClient.graphql({
              query: createPassportStamp,
              variables: {
                input: {
                  id: stampKey,
                  userProfileId: profileId,
                  exhibitorId: exhibitor.id,
                  eventId: APS_ID,
                  stampKey,
                  scannedAt: new Date().toISOString(),
                },
              },
            });
          } catch (e) {
            if (!isDuplicateError(e)) {
              const verifyResp = await graphqlAuthClient.graphql({
                query: apsAppUserPassportStampsByStampKey,
                variables: { stampKey, limit: 1 },
              });
              const verifyData = (verifyResp as any).data as {
                apsAppUserPassportStampsByStampKey?: { items?: ({ id?: string | null } | null)[] | null };
              };
              const createdDespiteError = verifyData.apsAppUserPassportStampsByStampKey?.items?.some(
                (item) => !!item?.id,
              );
              if (!createdDespiteError) throw e;
            }
          }
        }

        setScanState('success');
        setResult({
          title: existing ? 'Stamp already collected' : 'Stamp collected',
          message: expectedExhibitorId && expectedExhibitorId !== exhibitor.id
            ? 'That QR code belongs to a different exhibitor, but your valid passport stamp was collected.'
            : 'Nice work. Your passport has been updated.',
          exhibitorName,
        });
      } catch (e: any) {
        console.error('Passport scan failed:', e);
        setScanState('failure');
        setResult({
          title: 'Scan failed',
          message: e?.message || 'Unable to collect this stamp. Please try again.',
        });
      }
    },
    [expectedExhibitorId, profileId],
  );

  const onBarcodeScanned = useCallback(
    (scan: { data?: string }) => {
      if (!canScan || scanInFlightRef.current) return;
      scanInFlightRef.current = true;
      completeScan(scan?.data || '');
    },
    [canScan, completeScan],
  );

  function resetScan() {
    setResult(null);
    setLastRaw(null);
    scanInFlightRef.current = false;
    setScanState('scanning');
  }

  if (!permission) {
    return <RiveLoader />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera permission required</Text>
        <Text style={styles.muted}>Enable camera access to scan exhibitor passport QR codes.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant permission</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (scanState === 'success' || scanState === 'failure') {
    const success = scanState === 'success';
    return (
      <View style={styles.resultContainer}>
        <View style={[styles.resultIcon, success ? styles.resultIconSuccess : styles.resultIconFailure]}>
          <Ionicons name={success ? 'checkmark' : 'close'} size={42} color={success ? '#047857' : '#991b1b'} />
        </View>
        <Text style={styles.resultTitle}>{result?.title || (success ? 'Success' : 'Scan failed')}</Text>
        {!!result?.exhibitorName && <Text style={styles.exhibitorName}>{result.exhibitorName}</Text>}
        <Text style={styles.resultMessage}>{result?.message}</Text>
        {!!lastRaw && __DEV__ && !success && (
          <Text style={styles.debugText} numberOfLines={4}>
            Scanned: {lastRaw}
          </Text>
        )}
        {!success && (
          <Pressable style={styles.primaryBtn} onPress={resetScan}>
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </Pressable>
        )}
        <Pressable style={success ? styles.primaryBtn : styles.secondaryBtn} onPress={() => router.replace('/(main)/hub/passport' as any)}>
          <Text style={success ? styles.primaryBtnText : styles.secondaryBtnText}>Back to Passport</Text>
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
          <Ionicons name='close' size={22} color='#fff' />
        </Pressable>
        <Text style={styles.topTitle}>Scan Passport QR</Text>
        <View style={{ width: 34 }} />
      </View>
      <View style={styles.hintWrap}>
        <Text style={styles.hintTitle}>
          {scanState === 'processing' ? 'Collecting stamp...' : 'Point your camera at an exhibitor passport QR'}
        </Text>
        <Text style={styles.hintText}>We will validate the booth code and add the stamp to your passport.</Text>
        {scanState === 'processing' && <ActivityIndicator color='#fff' />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, gap: 10, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '900', color: ui.colors.text, textAlign: 'center' },
  muted: { color: ui.colors.muted, textAlign: 'center' },
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
  primaryBtn: {
    marginTop: 6,
    backgroundColor: autopackColors.apBlue,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  secondaryBtn: {
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: ui.colors.text, fontWeight: '900' },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    gap: 12,
    backgroundColor: '#fff',
  },
  resultIcon: {
    width: 86,
    height: 86,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconSuccess: { backgroundColor: '#d1fae5' },
  resultIconFailure: { backgroundColor: '#fee2e2' },
  resultTitle: { fontSize: 24, fontWeight: '900', color: ui.colors.text, textAlign: 'center' },
  exhibitorName: { color: autopackColors.apBlue, fontWeight: '900', fontSize: 18, textAlign: 'center' },
  resultMessage: { color: ui.colors.muted, textAlign: 'center', lineHeight: 21 },
  debugText: { color: ui.colors.muted, fontSize: 12, lineHeight: 16, textAlign: 'center' },
});
