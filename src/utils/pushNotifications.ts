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
  onDeepLink?: (url: string) => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

function getExpoProjectId(): string | undefined {
  // Best-effort (works for EAS builds). For Expo Go it can be undefined and still work.
  const anyConstants = Constants as any;
  return (
    anyConstants?.expoConfig?.extra?.eas?.projectId ||
    anyConstants?.easConfig?.projectId ||
    undefined
  );
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
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const subResponse = Notifications.addNotificationResponseReceivedListener((resp) => {
    const data: any = resp.notification.request.content.data || {};

    const announcementId =
      data.announcementId ?? data.announcementID ?? data.announcement_id ?? data.id;
    const deepLink = data.deepLink ?? data.deeplink ?? data.url;

    if (announcementId) {
      handlers.onAnnouncementId(String(announcementId));
      return;
    }

    if (deepLink && handlers.onDeepLink) {
      handlers.onDeepLink(String(deepLink));
    }
  });

  return () => {
    subResponse.remove();
  };
}


