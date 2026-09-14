import * as Linking from 'expo-linking';
import { isAttendeeDeepLink } from './attendeeQr';
import { isWeb } from './platform';

type IncomingLinkHandler = (url: string) => void;

let handler: IncomingLinkHandler | null = null;
let pendingUrl: string | null = null;
let started = false;
let subscription: { remove: () => void } | null = null;

function ignoreUrl(url?: string | null) {
  const raw = String(url || '').trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  if (lower.startsWith('exp://')) return true;
  if (lower.includes('/redirect')) return true;
  if (lower.includes('linkedin')) return true;
  return !isAttendeeDeepLink(raw);
}

export function captureIncomingAppLink(url?: string | null) {
  if (ignoreUrl(url)) return;
  const next = String(url).trim();
  if (handler) {
    handler(next);
    return;
  }
  pendingUrl = next;
}

export function peekPendingIncomingAppLink() {
  return pendingUrl;
}

export function takePendingIncomingAppLink() {
  const url = pendingUrl;
  pendingUrl = null;
  return url;
}

export function setIncomingAppLinkHandler(next: IncomingLinkHandler | null) {
  handler = next;
  if (handler && pendingUrl) {
    const url = pendingUrl;
    pendingUrl = null;
    handler(url);
  }
}

export function startIncomingAppLinkListener() {
  if (isWeb || started) return () => {};
  started = true;

  void Linking.getInitialURL()
    .then((url) => captureIncomingAppLink(url))
    .catch(() => {});

  subscription = Linking.addEventListener('url', (event) => {
    captureIncomingAppLink(event?.url);
  });

  return () => {
    subscription?.remove();
    subscription = null;
    started = false;
  };
}
