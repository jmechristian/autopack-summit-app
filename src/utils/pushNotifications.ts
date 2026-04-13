import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getCurrentUser } from 'aws-amplify/auth';
import { graphqlAuthClient } from './graphqlClient';
import { apsPushTokensByUserIdAndUpdatedAt } from '../graphql/queries';
import { createApsPushToken, updateApsPushToken } from '../graphql/mutations';

type NavigateHandlers = {
  onAnnouncementId: (announcementId: string) => void;
  onDmThreadId?: (threadId: string) => void;
  onRequests?: () => void;
  onDeepLink?: (url: string) => void;
  shouldSuppressForegroundNotification?: (data: Record<string, any>) => boolean;
  /** Called when an announcement notification is received while app is running. Returns new total badge count. */
  onAnnouncementReceived?: () => number;
  /** Called for any notification received while app is running (good place to refresh counts). */
  onNotificationReceived?: (data: Record<string, any>) => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

function getExpoProjectId(): string | undefined {
  // Best-effort (works for EAS builds). For Expo Go it can be undefined and still work.
  const anyConstants = Constants as any;
  return (
    // Prefer native easConfig first so account/project migrations don't get blocked by stale app.json extras.
    anyConstants?.easConfig?.projectId ||
    anyConstants?.expoConfig?.extra?.eas?.projectId ||
    undefined
  );
}

function getExpoProjectIdDebug() {
  const anyConstants = Constants as any;
  const fromNative = anyConstants?.easConfig?.projectId;
  const fromExpoConfig = anyConstants?.expoConfig?.extra?.eas?.projectId;
  const selected = fromNative || fromExpoConfig || null;
  const source = fromNative
    ? 'Constants.easConfig.projectId'
    : fromExpoConfig
      ? 'Constants.expoConfig.extra.eas.projectId'
      : 'none';
  return { selected, source, fromNative: fromNative || null, fromExpoConfig: fromExpoConfig || null };
}

export async function registerAndUpsertPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const perm = await Notifications.getPermissionsAsync();
  let status = perm.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    console.log('Push permission not granted.');
    return null;
  }

  const projectId = getExpoProjectId();
  const projectDebug = getExpoProjectIdDebug();
  console.log('Push projectId resolution:', projectDebug);
  const tokenResp = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const expoToken = tokenResp.data;
  if (!expoToken) return null;

  const user = await getCurrentUser();
  const userId = user.userId; // Cognito sub

  // Upsert to ApsPushToken (User Pools auth).
  const existingResp = await graphqlAuthClient.graphql({
    query: apsPushTokensByUserIdAndUpdatedAt,
    variables: {
      userId,
      sortDirection: 'DESC',
      limit: 1,
    },
  });

  const existing = (existingResp.data as any)?.apsPushTokensByUserIdAndUpdatedAt?.items?.find(
    (x: any) => x?.id
  ) as { id?: string } | undefined;

  const payload = {
    token: expoToken,
    platform: Platform.OS,
    updatedAt: nowIso(),
  };

  if (existing?.id) {
    await graphqlAuthClient.graphql({
      query: updateApsPushToken,
      variables: { input: { id: existing.id, ...payload } },
    });
  } else {
    await graphqlAuthClient.graphql({
      query: createApsPushToken,
      variables: { input: { userId, ...payload } },
    });
  }

  return expoToken;
}

export function initPushNotificationHandlers(handlers: NavigateHandlers) {
  // Show notifications when the app is foregrounded (instead of dropping them silently).
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data: any = notification.request?.content?.data || {};
      const suppress = handlers.shouldSuppressForegroundNotification?.(data) || false;
      return {
        shouldShowAlert: !suppress,
        shouldPlaySound: false,
        shouldSetBadge: true,
      };
    },
  });

  const subReceived = Notifications.addNotificationReceivedListener((notif) => {
    const data: any = notif.request.content.data || {};
    const announcementId =
      data.announcementId ?? data.announcementID ?? data.announcement_id ?? data.id;

    if (handlers.onNotificationReceived) {
      try {
        handlers.onNotificationReceived(data);
      } catch {
        // ignore
      }
    }

    if (!announcementId) return;
    if (!handlers.onAnnouncementReceived) return;

    const next = handlers.onAnnouncementReceived();
    // Best-effort: set OS badge (iOS). Android support varies by launcher.
    Notifications.setBadgeCountAsync(next).catch(() => {});
  });

  const subResponse = Notifications.addNotificationResponseReceivedListener((resp) => {
    const data: any = resp.notification.request.content.data || {};
    const type = String(data.type || '').toLowerCase();

    const announcementId =
      data.announcementId ?? data.announcementID ?? data.announcement_id ?? data.id;
    const dmThreadId = data.threadId ?? data.threadID ?? data.thread_id;
    const deepLink = data.deepLink ?? data.deeplink ?? data.url;

    if (type === 'dm' && dmThreadId && handlers.onDmThreadId) {
      handlers.onDmThreadId(String(dmThreadId));
      return;
    }
    if ((type === 'request' || type === 'requestaccepted') && handlers.onRequests) {
      handlers.onRequests();
      return;
    }

    if (announcementId) {
      handlers.onAnnouncementId(String(announcementId));
      return;
    }

    if (deepLink && handlers.onDeepLink) {
      handlers.onDeepLink(String(deepLink));
    }
  });

  return () => {
    subReceived.remove();
    subResponse.remove();
  };
}

export async function handleLastNotificationResponse(handlers: NavigateHandlers) {
  try {
    const resp = await Notifications.getLastNotificationResponseAsync();
    if (!resp) return;
    const data: any = resp.notification.request.content.data || {};
    const type = String(data.type || '').toLowerCase();

    const announcementId =
      data.announcementId ?? data.announcementID ?? data.announcement_id ?? data.id;
    const dmThreadId = data.threadId ?? data.threadID ?? data.thread_id;
    const deepLink = data.deepLink ?? data.deeplink ?? data.url;

    if (type === 'dm' && dmThreadId && handlers.onDmThreadId) {
      handlers.onDmThreadId(String(dmThreadId));
      return;
    }
    if ((type === 'request' || type === 'requestaccepted') && handlers.onRequests) {
      handlers.onRequests();
      return;
    }

    if (announcementId) {
      handlers.onAnnouncementId(String(announcementId));
      return;
    }
    if (deepLink && handlers.onDeepLink) {
      handlers.onDeepLink(String(deepLink));
    }
  } catch {
    // ignore
  }
}


