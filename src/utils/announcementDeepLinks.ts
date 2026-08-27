export const DEFAULT_ANNOUNCEMENT_DEEP_LINK = 'app://notifications';

export const APP_ANNOUNCEMENT_SCREENS = [
  { id: 'notifications', label: 'Notifications', path: '' },
  { id: 'profile', label: 'Profile', path: '/(main)/profile' },
  { id: 'hub', label: 'Hub', path: '/(main)/hub' },
  { id: 'agenda', label: 'Agenda', path: '/(main)/agenda' },
  { id: 'engage', label: 'Engage', path: '/(main)/engage' },
  { id: 'community', label: 'Community', path: '/(main)/community' },
] as const;

export type AppAnnouncementScreenId = (typeof APP_ANNOUNCEMENT_SCREENS)[number]['id'];
export type AnnouncementDeepLinkMode = 'app' | 'session' | 'custom';

export function getAppAnnouncementScreenId(url?: string | null): AppAnnouncementScreenId | null {
  const trimmed = String(url || '').trim();
  if (!trimmed || isNotificationsDeepLink(trimmed)) return 'notifications';
  const match = APP_ANNOUNCEMENT_SCREENS.find((screen) => screen.path && screen.path === trimmed);
  return match?.id ?? null;
}

export function inferAnnouncementDeepLinkMode(url?: string | null): AnnouncementDeepLinkMode {
  const trimmed = String(url || '').trim();
  if (!trimmed || isNotificationsDeepLink(trimmed)) return 'app';
  if (extractSessionIdFromDeepLink(trimmed)) return 'session';
  if (getAppAnnouncementScreenId(trimmed)) return 'app';
  return 'custom';
}

export function buildSessionDeepLink(sessionId: string): string {
  return `/(main)/agenda/${sessionId}`;
}

export function extractSessionIdFromDeepLink(url?: string | null): string | null {
  const trimmed = String(url || '').trim();
  if (!trimmed) return null;

  const patterns = [
    /\/\(main\)\/agenda\/([^/?#]+)/i,
    /\/agenda\/([^/?#]+)/i,
    /agenda\/([^/?#]+)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
}

export function isNotificationsDeepLink(url?: string | null): boolean {
  const trimmed = String(url || '').trim().toLowerCase();
  if (!trimmed) return true;
  return (
    trimmed === DEFAULT_ANNOUNCEMENT_DEEP_LINK.toLowerCase() ||
    trimmed.includes('/hub/notifications') ||
    trimmed.includes('://notifications')
  );
}

export function resolveAnnouncementDeepLink(url: string): string | null {
  const trimmed = String(url || '').trim();
  if (!trimmed || isNotificationsDeepLink(trimmed)) return null;

  const sessionId = extractSessionIdFromDeepLink(trimmed);
  if (sessionId) return buildSessionDeepLink(sessionId);

  if (trimmed.startsWith('/(main)/')) return trimmed;

  return trimmed;
}

export type AnnouncementDeepLinkDestination = {
  route: string;
  kind: 'session' | 'in-app' | 'external';
  sessionId?: string;
};

export function getAnnouncementDeepLinkDestination(
  url?: string | null,
): AnnouncementDeepLinkDestination | null {
  const trimmed = String(url || '').trim();
  if (!trimmed || isNotificationsDeepLink(trimmed)) return null;

  const sessionId = extractSessionIdFromDeepLink(trimmed);
  if (sessionId) {
    return {
      route: buildSessionDeepLink(sessionId),
      kind: 'session',
      sessionId,
    };
  }

  const route = resolveAnnouncementDeepLink(trimmed);
  if (!route) return null;

  if (/^https?:\/\//i.test(route)) {
    return { route, kind: 'external' };
  }

  if (route.startsWith('/(main)/')) {
    return { route, kind: 'in-app' };
  }

  return { route, kind: 'external' };
}
