import { Linking, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { getCurrentUser } from 'aws-amplify/auth';
import { apsPushTokensByUserIdAndUpdatedAt } from '../graphql/queries';
import { deleteApsPushToken } from '../graphql/mutations';
import { graphqlAuthClient } from './graphqlClient';
import { registerAndUpsertPushToken } from './pushNotifications';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status === 'granted') return 'granted';
  if (perm.status === 'denied') return 'denied';
  return 'undetermined';
}

export async function isPushRegisteredForUser(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    const resp = await graphqlAuthClient.graphql({
      query: apsPushTokensByUserIdAndUpdatedAt,
      variables: {
        userId: user.userId,
        sortDirection: 'DESC',
        limit: 1,
      },
    });
    const items = (resp.data as any)?.apsPushTokensByUserIdAndUpdatedAt?.items || [];
    return items.some((item: { id?: string | null }) => !!item?.id);
  } catch {
    return false;
  }
}

export async function getPushNotificationEnabledState(): Promise<{
  status: NotificationPermissionStatus;
  enabled: boolean;
}> {
  const status = await getNotificationPermissionStatus();
  if (status !== 'granted') {
    return { status, enabled: false };
  }
  const registered = await isPushRegisteredForUser();
  return { status, enabled: registered };
}

export async function openSystemNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function enablePushNotifications(): Promise<{ ok: boolean; message?: string }> {
  if (!Device.isDevice) {
    return {
      ok: false,
      message: 'Push notifications require a physical device.',
    };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status === 'denied') {
    return {
      ok: false,
      message: 'Notifications are blocked. Open Settings to allow them.',
    };
  }

  if (status !== 'granted') {
    return {
      ok: false,
      message: 'Notification permission was not granted.',
    };
  }

  const token = await registerAndUpsertPushToken();
  if (!token) {
    return {
      ok: false,
      message: 'Unable to register for push notifications.',
    };
  }

  return { ok: true };
}

export async function disablePushNotifications(): Promise<void> {
  try {
    const user = await getCurrentUser();
    const resp = await graphqlAuthClient.graphql({
      query: apsPushTokensByUserIdAndUpdatedAt,
      variables: {
        userId: user.userId,
        sortDirection: 'DESC',
        limit: 50,
      },
    });

    const items =
      ((resp.data as any)?.apsPushTokensByUserIdAndUpdatedAt?.items || []).filter(
        (item: { id?: string | null }) => !!item?.id,
      ) as { id: string }[];

    await Promise.all(
      items.map((item) =>
        graphqlAuthClient.graphql({
          query: deleteApsPushToken,
          variables: { input: { id: item.id } },
        }),
      ),
    );
  } catch {
    // Best-effort: user may still have OS permission enabled.
  }

  await Notifications.setBadgeCountAsync(0).catch(() => {});
}

export function getNotificationStatusLabel(status: NotificationPermissionStatus): string {
  if (status === 'granted') return 'Allowed';
  if (status === 'denied') return 'Blocked in device settings';
  return 'Not set';
}

export function getNotificationStatusDescription(status: NotificationPermissionStatus): string {
  if (status === 'granted') {
    return 'You will receive push notifications for announcements, messages, and contact requests.';
  }
  if (status === 'denied') {
    return 'Notifications are turned off on this device. Open Settings to allow them again.';
  }
  return 'Allow notifications to stay updated on announcements, messages, and contact requests.';
}
