import { WebFeatureUnavailable } from '../../src/components/WebFeatureUnavailable';

/** Web stub — avoids bundling expo-camera into the web graph. */
export default function ScanScreenWeb() {
  return <WebFeatureUnavailable title='Scan unavailable' feature='QR scanning' />;
}
