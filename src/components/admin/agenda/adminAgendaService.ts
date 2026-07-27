import { APS_ID } from '../../../config/apsConfig';
import {
  createApsAgenda,
  createApsAppSession,
  deleteApsAppSession,
  updateAPS,
  updateApsAppSession,
} from '../../../graphql/mutations';
import {
  apsAgendaByEventId,
  apsAppSessionsByAgendaId,
  getApsAppSession,
} from '../../../graphql/queries';
import { graphqlAuthClient } from '../../../utils/graphqlClient';

export type AdminAgendaSession = {
  id: string;
  agendaId?: string | null;
  title?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
};

function parseTimeToMinutes(value?: string | null): number {
  const raw = String(value || '').trim();
  if (!raw) return Number.POSITIVE_INFINITY;

  const hhmm24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhmm24) {
    const h = Number(hhmm24[1]);
    const m = Number(hhmm24[2]);
    if (!Number.isNaN(h) && !Number.isNaN(m)) return h * 60 + m;
  }

  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    const suffix = twelveHour[3].toUpperCase();
    if (Number.isNaN(hour) || Number.isNaN(minute)) return Number.POSITIVE_INFINITY;
    const hour24 = suffix === 'PM' ? (hour % 12) + 12 : hour % 12;
    return hour24 * 60 + minute;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    const inEastern = parsed.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
    return parseTimeToMinutes(inEastern);
  }

  return Number.POSITIVE_INFINITY;
}

export function normalizeAgendaTimeInput(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const cleaned = raw.replace(/\b(EST|EDT|ET)\b/gi, '').trim();
  if (!cleaned) return null;

  const twelveHour = cleaned.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = twelveHour[2];
    const suffix = twelveHour[3].toUpperCase();
    if (!Number.isNaN(hour)) {
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute} ${suffix}`;
    }
  }

  const hhmm24 = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhmm24) {
    const hour24 = Number(hhmm24[1]);
    const minute = hhmm24[2];
    if (!Number.isNaN(hour24)) {
      const suffix = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 % 12 || 12;
      return `${hour12}:${minute} ${suffix}`;
    }
  }

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  return cleaned;
}

function sortSessions(rows: AdminAgendaSession[]) {
  return [...rows].sort((a, b) => {
    const aDate = String(a.date || '');
    const bDate = String(b.date || '');
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  });
}

export async function ensureAgendaForEvent(eventId: string = APS_ID): Promise<string> {
  const agendaResp = await graphqlAuthClient.graphql({
    query: apsAgendaByEventId,
    variables: { eventId, limit: 1 },
  });
  const existingAgenda = (agendaResp as any)?.data?.apsAgendaByEventId?.items?.find(Boolean);
  if (existingAgenda?.id) return String(existingAgenda.id);

  const createResp = await graphqlAuthClient.graphql({
    query: createApsAgenda,
    variables: { input: { eventId } },
  });
  const createdAgendaId = (createResp as any)?.data?.createApsAgenda?.id;
  if (!createdAgendaId) throw new Error('Unable to create agenda.');

  // Keep APS relation in sync for clients that rely on APS.agenda relation.
  try {
    await graphqlAuthClient.graphql({
      query: updateAPS,
      variables: { input: { id: eventId, aPSAgendaId: createdAgendaId } },
    });
  } catch {
    // Non-blocking: agenda model exists even if this relation update fails.
  }
  return String(createdAgendaId);
}

export async function listAdminAgendaSessions(eventId: string = APS_ID): Promise<{
  agendaId: string;
  sessions: AdminAgendaSession[];
}> {
  const agendaId = await ensureAgendaForEvent(eventId);
  let nextToken: string | null | undefined = null;
  const sessions: AdminAgendaSession[] = [];

  do {
    const sessionResp = await graphqlAuthClient.graphql({
      query: apsAppSessionsByAgendaId,
      variables: {
        agendaId,
        limit: 300,
        nextToken,
      },
    });
    const data = (sessionResp as any)?.data?.apsAppSessionsByAgendaId;
    const items = data?.items || [];
    sessions.push(
      ...items
        .filter((item: any) => !!item?.id)
        .map((item: any) => ({
          id: String(item.id),
          agendaId: item.agendaId ?? null,
          title: item.title ?? null,
          date: item.date ?? null,
          startTime: normalizeAgendaTimeInput(item.startTime),
          endTime: normalizeAgendaTimeInput(item.endTime),
          location: item.location ?? null,
          description: item.description ?? null,
        })),
    );
    nextToken = data?.nextToken;
  } while (nextToken);

  return { agendaId, sessions: sortSessions(sessions) };
}

export async function getAdminAgendaSession(sessionId: string): Promise<AdminAgendaSession> {
  const resp = await graphqlAuthClient.graphql({
    query: getApsAppSession,
    variables: { id: sessionId },
  });
  const session = (resp as any)?.data?.getApsAppSession;
  if (!session?.id) throw new Error('Session not found.');
  return {
    id: String(session.id),
    agendaId: session.agendaId ?? null,
    title: session.title ?? null,
    date: session.date ?? null,
    startTime: normalizeAgendaTimeInput(session.startTime),
    endTime: normalizeAgendaTimeInput(session.endTime),
    location: session.location ?? null,
    description: session.description ?? null,
  };
}

export async function createAdminAgendaSession(input: {
  eventId?: string;
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}): Promise<string> {
  const eventId = input.eventId || APS_ID;
  const agendaId = await ensureAgendaForEvent(eventId);
  const createResp = await graphqlAuthClient.graphql({
    query: createApsAppSession,
    variables: {
      input: {
        agendaId,
        title: input.title?.trim() || null,
        date: input.date?.trim() || null,
        startTime: normalizeAgendaTimeInput(input.startTime),
        endTime: normalizeAgendaTimeInput(input.endTime),
        location: input.location?.trim() || null,
        description: input.description?.trim() || null,
      },
    },
  });
  const createdId = (createResp as any)?.data?.createApsAppSession?.id;
  if (!createdId) throw new Error('Unable to create session.');
  return String(createdId);
}

export async function updateAdminAgendaSession(input: {
  id: string;
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
}) {
  await graphqlAuthClient.graphql({
    query: updateApsAppSession,
    variables: {
      input: {
        id: input.id,
        title: input.title?.trim() || null,
        date: input.date?.trim() || null,
        startTime: normalizeAgendaTimeInput(input.startTime),
        endTime: normalizeAgendaTimeInput(input.endTime),
        location: input.location?.trim() || null,
        description: input.description?.trim() || null,
      },
    },
  });
}

export async function deleteAdminAgendaSession(sessionId: string) {
  await graphqlAuthClient.graphql({
    query: deleteApsAppSession,
    variables: { input: { id: sessionId } },
  });
}
