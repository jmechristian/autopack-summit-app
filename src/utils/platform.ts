import { Platform } from 'react-native';

/** True when running under react-native-web / Expo web. */
export const isWeb = Platform.OS === 'web';

/**
 * Prefer this for feature gates (camera, push) so web never mounts native-only APIs.
 * Route-level differences should use `*.web.tsx` stubs when possible so Metro
 * does not pull native modules into the web bundle.
 */
export function platformUnavailableMessage(feature = 'This feature') {
  return `${feature} is available in the iOS and Android apps.`;
}
