/**
 * Local/foreground notification helpers.
 * Web stub avoids importing expo-notifications.
 */

export async function scheduleLocalNotification(_params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  // no-op on web
}
