const EVENT_TIME_ZONE = 'America/New_York';

type SessionLiveInput = {
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

function normalizeText(value?: string | null) {
  return (value || '').trim();
}

function normalizeDateKey(value?: string | null) {
  const raw = normalizeText(value);
  if (!raw) return '';
  return raw.includes('T') ? raw.slice(0, 10) : raw;
}

function tryParseAbsoluteDateTimeMs(value?: string | null) {
  const raw = normalizeText(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

function parseTimeParts(value?: string | null) {
  const raw = normalizeText(value);
  if (!raw) return null;

  const amPmMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (amPmMatch) {
    const rawHour = Number(amPmMatch[1]);
    const minute = Number(amPmMatch[2]);
    const second = Number(amPmMatch[3] || 0);
    const ampm = amPmMatch[4].toUpperCase();
    let hour = rawHour % 12;
    if (ampm === 'PM') hour += 12;
    return { hour, minute, second };
  }

  const hhmmMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmMatch) {
    return {
      hour: Number(hhmmMatch[1]),
      minute: Number(hhmmMatch[2]),
      second: Number(hhmmMatch[3] || 0),
    };
  }

  return null;
}

function minutesFromTimeParts(parts: { hour: number; minute: number }) {
  return parts.hour * 60 + parts.minute;
}

function getNowInEventTimeZone(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value || 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value || 0);
  const day = Number(parts.find((part) => part.type === 'day')?.value || 0);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  if (!year || !month || !day) return null;
  return {
    dateKey: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    minutes: hour * 60 + minute,
  };
}

function isLiveByEventLocalDateAndTime(session: SessionLiveInput, now: Date) {
  const sessionDateKey = normalizeDateKey(session.date);
  if (!sessionDateKey) return false;

  const startParts = parseTimeParts(session.startTime);
  const endParts = parseTimeParts(session.endTime);
  if (!startParts || !endParts) return false;

  const nowInEventZone = getNowInEventTimeZone(now);
  if (!nowInEventZone) return false;
  if (nowInEventZone.dateKey !== sessionDateKey) return false;

  const startMinutes = minutesFromTimeParts(startParts);
  const endMinutes = minutesFromTimeParts(endParts);
  if (endMinutes < startMinutes) return false;

  return nowInEventZone.minutes >= startMinutes && nowInEventZone.minutes <= endMinutes;
}

function eventLocalDateTimeToMs(
  dateKey: string,
  parts: { hour: number; minute: number; second: number },
) {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;

  const targetMinutes = parts.hour * 60 + parts.minute;
  const naiveUtc = Date.UTC(year, month - 1, day, parts.hour, parts.minute, parts.second);

  for (let offsetHours = -16; offsetHours <= 16; offsetHours++) {
    const candidate = naiveUtc - offsetHours * 60 * 60 * 1000;
    const zoned = getNowInEventTimeZone(new Date(candidate));
    if (!zoned) continue;
    if (zoned.dateKey === dateKey && zoned.minutes === targetMinutes) {
      return candidate;
    }
  }

  return null;
}

function getSessionBoundaryMs(session: SessionLiveInput, boundary: 'start' | 'end') {
  const startAbsoluteMs = tryParseAbsoluteDateTimeMs(session.startTime);
  const endAbsoluteMs = tryParseAbsoluteDateTimeMs(session.endTime);
  if (startAbsoluteMs != null && endAbsoluteMs != null) {
    return boundary === 'start' ? startAbsoluteMs : endAbsoluteMs;
  }

  const sessionDateKey = normalizeDateKey(session.date);
  if (!sessionDateKey) return null;

  const timeField = boundary === 'start' ? session.startTime : session.endTime;
  const parts = parseTimeParts(timeField);
  if (!parts) return null;

  return eventLocalDateTimeToMs(sessionDateKey, parts);
}

export function getSessionStartMs(session: SessionLiveInput) {
  return getSessionBoundaryMs(session, 'start');
}

export function getSessionEndMs(session: SessionLiveInput) {
  return getSessionBoundaryMs(session, 'end');
}

export function isSessionLive(session: SessionLiveInput, now: Date = new Date()) {
  const startAbsoluteMs = tryParseAbsoluteDateTimeMs(session.startTime);
  const endAbsoluteMs = tryParseAbsoluteDateTimeMs(session.endTime);
  if (startAbsoluteMs != null && endAbsoluteMs != null) {
    if (endAbsoluteMs < startAbsoluteMs) return false;
    const nowMs = now.getTime();
    return nowMs >= startAbsoluteMs && nowMs <= endAbsoluteMs;
  }

  return isLiveByEventLocalDateAndTime(session, now);
}

export function isSessionPast(session: SessionLiveInput, now: Date = new Date()) {
  const endMs = getSessionEndMs(session);
  if (endMs != null) return now.getTime() > endMs;

  const startMs = getSessionStartMs(session);
  if (startMs != null) return now.getTime() > startMs;

  return false;
}

export function isSessionUpcoming(session: SessionLiveInput, now: Date = new Date()) {
  if (isSessionLive(session, now) || isSessionPast(session, now)) return false;
  const startMs = getSessionStartMs(session);
  if (startMs == null) return false;
  return now.getTime() < startMs;
}

export function compareSessionsByStart(a: SessionLiveInput, b: SessionLiveInput) {
  const aStart = getSessionStartMs(a) ?? Number.POSITIVE_INFINITY;
  const bStart = getSessionStartMs(b) ?? Number.POSITIVE_INFINITY;
  return aStart - bStart;
}

