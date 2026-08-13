/**
 * Web stub — never import expo-notifications on web.
 * Native implementation lives in pushNotifications.ts.
 */

type NavigateHandlers = {
  onAnnouncementId: (announcementId: string) => void;
  onDmThreadId?: (threadId: string) => void;
  onRequests?: (requestId?: string) => void;
  onDeepLink?: (url: string) => void;
  shouldSuppressForegroundNotification?: (data: Record<string, any>) => boolean;
  onAnnouncementReceived?: () => number;
  onNotificationReceived?: (data: Record<string, any>) => void;
};

export async function registerAndUpsertPushToken(): Promise<string | null> {
  return null;
}

export function initPushNotificationHandlers(_handlers: NavigateHandlers) {
  return () => {};
}

export async function handleLastNotificationResponse(_handlers: NavigateHandlers) {
  // no-op
}

export function setAppBadgeCount(_count: number) {
  // no-op
}
