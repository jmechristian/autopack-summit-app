const EVENT_TIME_ZONE = 'America/New_York';

function normalizeText(value?: string | null) {
  return (value || '').trim();
}

/** Naive HH:mm (and ISO) session times as 12-hour Eastern wall-clock. */
export function formatAgendaTime12HourEST(value?: string | null) {
  const raw = normalizeText(value);
  if (!raw) return '';

  if (/am|pm/i.test(raw)) {
    return raw.toUpperCase();
  }

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhmm) {
    const hour24 = Number(hhmm[1]);
    const minute = hhmm[2];
    if (!Number.isNaN(hour24)) {
      const suffix = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 % 12 || 12;
      return `${hour12}:${minute} ${suffix}`;
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('en-US', {
      timeZone: EVENT_TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return raw;
}

export function formatAgendaTimeRange(start?: string | null, end?: string | null) {
  const startLabel = formatAgendaTime12HourEST(start);
  const endLabel = formatAgendaTime12HourEST(end);
  if (startLabel && endLabel) return `${startLabel} – ${endLabel} EST`;
  if (startLabel) return `${startLabel} EST`;
  return '';
}

export function formatAgendaDateLabel(date?: string | null) {
  const raw = normalizeText(date);
  if (!raw) return '';
  const dateKey = raw.includes('T') ? raw.slice(0, 10) : raw;
  const parsed = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('en-US', {
    timeZone: EVENT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
