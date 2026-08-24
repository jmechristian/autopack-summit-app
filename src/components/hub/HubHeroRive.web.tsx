import {
  Alignment,
  Fit,
  Layout,
  RuntimeLoader,
  useRive,
} from '@rive-app/react-canvas';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  InteractionManager,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { autopackColors } from '../../theme';

const PLACEHOLDER_IMAGE = require('../../../assets/images/hub-hero-placeholder.png');

/** Same-origin copy from /public (see scripts/sync-rive-web-assets.js). */
const PUBLIC_HUB_RIVE = '/hub_header.riv';
const PUBLIC_RIVE_WASM = '/rive.wasm';

let wasmUrlConfigured = false;
function ensureWasmUrl() {
  if (wasmUrlConfigured || typeof window === 'undefined') return;
  wasmUrlConfigured = true;
  // Avoid unpkg in production — EAS Hosting / CSP / offline CDN breaks Rive.
  RuntimeLoader.setWasmUrl(PUBLIC_RIVE_WASM);
  RuntimeLoader.awaitInstance().catch(() => {});
}

export interface HubHeroRiveProps {
  source?: number | string;
  artboardName?: string;
  stateMachineName?: string;
  backgroundColor?: string;
  aspectRatio?: number;
  fill?: boolean;
  center?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function resolveAssetUri(source: number | string): string | null {
  if (typeof source === 'string') {
    if (source.includes('hub_header')) return PUBLIC_HUB_RIVE;
    return toAbsoluteUrl(source);
  }
  try {
    const resolved = Image.resolveAssetSource(source as number);
    const uri = resolved?.uri;
    if (!uri) return PUBLIC_HUB_RIVE;
    if (uri.includes('hub_header')) return PUBLIC_HUB_RIVE;
    return toAbsoluteUrl(uri);
  } catch {
    return PUBLIC_HUB_RIVE;
  }
}

function toAbsoluteUrl(uri: string): string {
  if (
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('blob:') ||
    uri.startsWith('data:')
  ) {
    return uri;
  }
  if (typeof window === 'undefined') {
    return uri.startsWith('/') ? uri : `/${uri}`;
  }
  const path = uri.startsWith('/') ? uri : `/${uri}`;
  return `${window.location.origin}${path}`;
}

function RiveCanvas({
  src,
  artboardName,
  stateMachineName,
  onFailed,
}: {
  src: string;
  artboardName?: string;
  stateMachineName?: string;
  onFailed: () => void;
}) {
  const layout = useMemo(
    () => new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
    []
  );

  const { RiveComponent } = useRive({
    src,
    artboard: artboardName,
    stateMachines: stateMachineName,
    autoplay: true,
    layout,
    onLoadError: () => onFailed(),
  });

  return (
    <View style={styles.fill} pointerEvents='none'>
      <RiveComponent
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </View>
  );
}

/**
 * Web Hub hero — plays the same .riv via @rive-app/react-canvas
 * (rive-react-native is native-only).
 */
export function HubHeroRive({
  source,
  artboardName,
  stateMachineName,
  backgroundColor = autopackColors.apDarkBlue,
  aspectRatio = 1,
  fill = false,
  center,
  children,
  style,
  testID,
}: HubHeroRiveProps) {
  ensureWasmUrl();

  const [src, setSrc] = useState<string | null>(() =>
    source != null ? resolveAssetUri(source) : PUBLIC_HUB_RIVE
  );
  const [failed, setFailed] = useState(false);
  const [mountRive, setMountRive] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setMountRive(true);
    });
    return () => handle.cancel?.();
  }, []);

  useEffect(() => {
    setFailed(false);
    if (source == null) {
      setSrc(PUBLIC_HUB_RIVE);
      return;
    }
    setSrc(resolveAssetUri(source));
  }, [source]);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor },
        fill ? styles.wrapFill : { aspectRatio },
        style,
      ]}
      testID={testID}
    >
      {src && !failed && mountRive ? (
        <RiveCanvas
          src={src}
          artboardName={artboardName}
          stateMachineName={stateMachineName}
          onFailed={() => setFailed(true)}
        />
      ) : (
        <Image source={PLACEHOLDER_IMAGE} style={styles.fill} resizeMode='cover' />
      )}

      {center ? (
        <View style={styles.centerLayer} pointerEvents='box-none'>
          {center}
        </View>
      ) : null}

      {children ? (
        <View style={styles.overlay} pointerEvents='box-none'>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  wrapFill: {
    flex: 1,
    alignSelf: 'stretch',
    height: '100%',
    minHeight: 0,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  centerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
});

export default HubHeroRive;
