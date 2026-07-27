export const DEFAULT_ANNOUNCEMENT_DEEP_LINK = 'app://notifications';

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
