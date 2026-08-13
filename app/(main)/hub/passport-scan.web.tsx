import { WebFeatureUnavailable } from '../../../src/components/WebFeatureUnavailable';

/** Web stub — avoids bundling expo-camera into the web graph. */
export default function PassportScanScreenWeb() {
  return (
    <WebFeatureUnavailable
      title='Passport scan unavailable'
      feature='Passport QR scanning'
      backHref='/(main)/hub/passport'
    />
  );
}
