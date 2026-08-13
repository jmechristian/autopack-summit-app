/**
 * Web stub — push settings unavailable on desktop.
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  return 'denied';
}

export async function isPushRegisteredForUser(): Promise<boolean> {
  return false;
}

export async function getPushNotificationEnabledState(): Promise<{
  status: NotificationPermissionStatus;
  enabled: boolean;
}> {
  return { status: 'denied', enabled: false };
}

export async function openSystemNotificationSettings(): Promise<void> {
  // no-op on web
}

export async function enablePushNotifications(): Promise<{ ok: boolean; message?: string }> {
  return {
    ok: false,
    message: 'Push notifications are available in the iOS and Android apps.',
  };
}

export async function disablePushNotifications(): Promise<void> {
  // no-op
}

export function getNotificationStatusLabel(_status: NotificationPermissionStatus): string {
  return 'Unavailable on desktop';
}

export function getNotificationStatusDescription(_status: NotificationPermissionStatus): string {
  return 'Push notifications are available in the iOS and Android apps.';
}
