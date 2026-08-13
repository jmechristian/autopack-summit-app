import { WebFeatureUnavailable } from '../../../src/components/WebFeatureUnavailable';

/** Web stub for hub/capture (same as scan). */
export default function CaptureScreenWeb() {
  return <WebFeatureUnavailable title='Scan unavailable' feature='QR scanning' />;
}
