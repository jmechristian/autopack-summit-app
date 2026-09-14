import * as Linking from 'expo-linking';

export type AttendeeQrKind = 'profile' | 'registrant' | 'email' | 'passport' | 'unknown';

export type ParsedAttendeeQr = {
  kind: AttendeeQrKind;
  profileId?: string;
  registrantId?: string;
  email?: string;
};

const ID_RE = /[0-9a-zA-Z-]{20,}/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_SCHEMES = new Set(['autopacksummitapp', 'aps']);

function clean(value?: string | null) {
  return String(value || '').trim();
}

function firstId(value?: string | null) {
  const trimmed = clean(value);
  const match = trimmed.match(ID_RE);
  return match?.[0] || null;
}

function firstEmail(value?: string | null) {
  const trimmed = clean(value)
    .replace(/^mailto:/i, '')
    .replace(/^<|>$/g, '')
    .replace(/^"|"$/g, '');
  return EMAIL_RE.test(trimmed) ? trimmed : null;
}

function uniqueEmails(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const email = firstEmail(value);
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

function unfoldVCard(raw: string) {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\\n/g, '\n');
  const lines: string[] = [];
  for (const line of normalized.split('\n')) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
      continue;
    }
    lines.push(line);
  }
  return lines;
}

function vCardPropName(keyPart: string) {
  const name = keyPart.split(';')[0] || '';
  return name.replace(/^item\d+\./i, '').trim().toUpperCase();
}

function parseVCardProps(raw: string) {
  const props: Record<string, string[]> = {};
  for (const line of unfoldVCard(raw)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const name = vCardPropName(line.slice(0, idx));
    const value = line.slice(idx + 1).trim();
    if (!name || !value) continue;
    if (!props[name]) props[name] = [];
    props[name].push(value);
  }
  return props;
}

function parseVCard(raw: string): ParsedAttendeeQr {
  const props = parseVCardProps(raw);
  const profileId =
    firstId(props['X-APS-PROFILEID']?.[0]) ||
    firstId(props['X-APS-PROFILE-ID']?.[0]);
  if (profileId) return { kind: 'profile', profileId };

  const registrantId =
    firstId(props['X-APS-REGISTRANTID']?.[0]) ||
    firstId(props['X-APS-REGISTRANT-ID']?.[0]);
  if (registrantId) return { kind: 'registrant', registrantId };

  for (const urlValue of props.URL || []) {
    const parsed = parseAsUrl(urlValue);
    if (parsed) return parsed;
  }

  const emails = uniqueEmails([...(props.EMAIL || []), ...(props.URL || [])]);
  if (emails[0]) return { kind: 'email', email: emails[0] };

  const uid = firstId(props.UID?.[0]?.replace(/^urn:uuid:/i, ''));
  if (uid) return { kind: 'registrant', registrantId: uid };

  return { kind: 'unknown' };
}

function parseMeCard(raw: string): ParsedAttendeeQr {
  const body = raw.replace(/^MECARD:/i, '');
  const fields: Record<string, string> = {};
  for (const part of body.split(';')) {
    const idx = part.indexOf(':');
    if (idx <= 0) continue;
    fields[part.slice(0, idx).trim().toUpperCase()] = part.slice(idx + 1).trim();
  }
  const email = firstEmail(fields.EMAIL);
  if (email) return { kind: 'email', email };
  return { kind: 'unknown' };
}

function idsFromPath(path: string) {
  const cleaned = `/${clean(path).replace(/^\/+/, '')}`;
  const patterns: Array<{ kind: 'profile' | 'registrant'; re: RegExp }> = [
    { kind: 'profile', re: /\/(?:main\/)?community\/([^/?#]+)/i },
    { kind: 'registrant', re: /\/(?:app\/)?c\/([^/?#]+)/i },
    { kind: 'registrant', re: /\/r\/([^/?#]+)/i },
    { kind: 'registrant', re: /\/registrants\/([^/?#]+)/i },
    { kind: 'profile', re: /\/profile\/([^/?#]+)/i },
  ];
  for (const pattern of patterns) {
    const match = cleaned.match(pattern.re);
    const id = firstId(match?.[1] ? decodeURIComponent(match[1]) : null);
    if (id) return { kind: pattern.kind, id };
  }
  return null;
}

function fromQueryParams(q?: Record<string, unknown> | null): ParsedAttendeeQr | null {
  if (!q) return null;
  const read = (key: string) => {
    const value = q[key];
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    return null;
  };
  const profileId = firstId(read('profileId') || read('id'));
  if (profileId && (read('profileId') || /profile/i.test(String(read('type') || '')))) {
    return { kind: 'profile', profileId };
  }
  const registrantId = firstId(read('registrantId') || read('r'));
  if (registrantId) return { kind: 'registrant', registrantId };
  const email = firstEmail(read('email'));
  if (email) return { kind: 'email', email };
  if (profileId) return { kind: 'profile', profileId };
  return null;
}

function parseAsUrl(raw: string): ParsedAttendeeQr | null {
  try {
    const url = new URL(raw);
    const queryParsed = fromQueryParams(Object.fromEntries(url.searchParams.entries()));
    if (queryParsed) return queryParsed;

    const pathParsed = idsFromPath(`${url.hostname}/${url.pathname}`);
    if (pathParsed?.kind === 'profile') return { kind: 'profile', profileId: pathParsed.id };
    if (pathParsed?.kind === 'registrant') return { kind: 'registrant', registrantId: pathParsed.id };

    if (url.hostname.toLowerCase() === 'profile') {
      const id = firstId(url.pathname);
      if (id) return { kind: 'profile', profileId: id };
    }
    if (url.hostname.toLowerCase() === 'community') {
      const id = firstId(url.pathname);
      if (id) return { kind: 'profile', profileId: id };
    }
    if (url.hostname.toLowerCase() === 'r' || url.hostname.toLowerCase() === 'c') {
      const id = firstId(url.pathname);
      if (id) return { kind: 'registrant', registrantId: id };
    }
    return null;
  } catch {
    return null;
  }
}

export function attendeeWebLink(registrantId: string) {
  return `https://autopacksummit.com/app/c/${encodeURIComponent(registrantId)}`;
}

export function attendeeAppLink(registrantId: string) {
  return `autopacksummitapp://open-profile?registrantId=${encodeURIComponent(registrantId)}`;
}

export function isPassportQrPayload(raw: string) {
  return /^aps-passport:/i.test(clean(raw));
}

export function isAttendeeDeepLink(raw?: string | null) {
  return !!openProfileRouteFromLink(raw);
}

export function openProfileRouteFromLink(raw?: string | null) {
  const parsed = parseAttendeeQrPayload(String(raw || ''));
  if (parsed.kind === 'registrant' && parsed.registrantId) {
    return {
      pathname: '/(main)/open-profile' as const,
      params: { registrantId: parsed.registrantId },
    };
  }
  if (parsed.kind === 'profile' && parsed.profileId) {
    return {
      pathname: '/(main)/open-profile' as const,
      params: { profileId: parsed.profileId },
    };
  }
  if (parsed.kind === 'email' && parsed.email) {
    return {
      pathname: '/(main)/open-profile' as const,
      params: { email: parsed.email },
    };
  }
  return null;
}

export function parseAttendeeQrPayload(payload: string): ParsedAttendeeQr {
  const raw = clean(payload);
  if (!raw) return { kind: 'unknown' };
  if (isPassportQrPayload(raw)) return { kind: 'passport' };

  if (/BEGIN:VCARD/i.test(raw)) return parseVCard(raw);
  if (/^MECARD:/i.test(raw)) return parseMeCard(raw);

  const registrantPayload = raw.match(/^aps:([^:]+):registrant:([0-9a-zA-Z-]+)$/i);
  if (registrantPayload?.[2]) return { kind: 'registrant', registrantId: registrantPayload[2] };

  const apsProfile = raw.match(/^aps:\/\/profile\/([0-9a-zA-Z-]+)(?:\/.*)?$/i);
  if (apsProfile?.[1]) return { kind: 'profile', profileId: apsProfile[1] };

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const obj = JSON.parse(raw) as {
        profileId?: string;
        registrantId?: string;
        email?: string;
      };
      if (firstId(obj.profileId)) return { kind: 'profile', profileId: firstId(obj.profileId)! };
      if (firstId(obj.registrantId)) return { kind: 'registrant', registrantId: firstId(obj.registrantId)! };
      if (firstEmail(obj.email)) return { kind: 'email', email: firstEmail(obj.email)! };
    } catch {
      // ignore invalid json
    }
  }

  if (ID_RE.test(raw) && !raw.includes('://') && !raw.includes('@') && !raw.includes('\n')) {
    const id = firstId(raw);
    if (id && id === raw) return { kind: 'profile', profileId: id };
  }

  const fromUrl = parseAsUrl(raw);
  if (fromUrl) return fromUrl;

  try {
    const parsed = Linking.parse(raw);
    const queryParsed = fromQueryParams(parsed?.queryParams as Record<string, unknown> | undefined);
    if (queryParsed) return queryParsed;
    const host = String(parsed?.hostname || '');
    const path = String(parsed?.path || '');
    const pathParsed = idsFromPath(`${host}/${path}`);
    if (pathParsed?.kind === 'profile') return { kind: 'profile', profileId: pathParsed.id };
    if (pathParsed?.kind === 'registrant') return { kind: 'registrant', registrantId: pathParsed.id };
    if (APP_SCHEMES.has(String(parsed?.scheme || '').toLowerCase()) && host.toLowerCase() === 'profile') {
      const id = firstId(path);
      if (id) return { kind: 'profile', profileId: id };
    }
  } catch {
    // ignore
  }

  return { kind: 'unknown' };
}
