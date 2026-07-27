import { Alert } from 'react-native';
import { APS_ID } from '../../../config/apsConfig';
import { graphqlAuthClient } from '../../../utils/graphqlClient';

export type AdminAnnouncementStatus = 'published' | 'scheduled' | 'ready';

export type AdminAnnouncementListRow = {
  id: string;
  title: string;
  bodyPreview: string;
  status: AdminAnnouncementStatus;
  statusLabel: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  displayAt: string;
};

export type AdminAnnouncementDetail = {
  id: string;
  eventId: string;
  title: string;
  body: string;
  deepLink: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: AdminAnnouncementStatus;
  statusLabel: string;
};

type AnnouncementRecord = {
  id: string;
  eventId: string;
  title?: string | null;
  body: string;
  deepLink?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

const announcementFields = `
  id
  eventId
  title
  body
  deepLink
  scheduledAt
  publishedAt
  createdAt
  updatedAt
`;

const listAdminAnnouncementsQuery = /* GraphQL */ `
  query ListAdminAnnouncements(
    $eventId: ID!
    $sortDirection: ModelSortDirection
    $limit: Int
    $nextToken: String
  ) {
    apsAdminAnnouncementsByEventIdAndCreatedAt(
      eventId: $eventId
      sortDirection: $sortDirection
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        ${announcementFields}
      }
      nextToken
    }
  }
`;

const getAdminAnnouncementQuery = /* GraphQL */ `
  query GetAdminAnnouncement($id: ID!) {
    getApsAdminAnnouncement(id: $id) {
      ${announcementFields}
    }
  }
`;

const createAdminAnnouncementMutation = /* GraphQL */ `
  mutation CreateAdminAnnouncement($input: CreateApsAdminAnnouncementInput!) {
    createApsAdminAnnouncement(input: $input) {
      ${announcementFields}
    }
  }
`;

const updateAdminAnnouncementMutation = /* GraphQL */ `
  mutation UpdateAdminAnnouncement($input: UpdateApsAdminAnnouncementInput!) {
    updateApsAdminAnnouncement(input: $input) {
      ${announcementFields}
    }
  }
`;

const deleteAdminAnnouncementMutation = /* GraphQL */ `
  mutation DeleteAdminAnnouncement($input: DeleteApsAdminAnnouncementInput!) {
    deleteApsAdminAnnouncement(input: $input) {
      id
    }
  }
`;

export const adminPublishDueAnnouncementsMutation = /* GraphQL */ `
  mutation AdminPublishDueAnnouncements($eventId: ID!) {
    adminPublishDueAnnouncements(eventId: $eventId) {
      publishedCount
      publishedIds
    }
  }
`;

const dueAnnouncementsQuery = /* GraphQL */ `
  query DueAnnouncements(
    $eventId: ID!
    $scheduledAt: ModelStringKeyConditionInput
    $filter: ModelApsAdminAnnouncementFilterInput
    $limit: Int
    $nextToken: String
  ) {
    apsAdminAnnouncementsByEventIdAndScheduledAt(
      eventId: $eventId
      scheduledAt: $scheduledAt
      filter: $filter
      sortDirection: ASC
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        scheduledAt
        publishedAt
      }
      nextToken
    }
  }
`;

function compactInput<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null && value !== undefined),
  ) as T;
}

function describeGraphQlError(error: any): string {
  const responseErrors = error?.errors || error?.data?.errors;
  if (Array.isArray(responseErrors) && responseErrors.length) {
    return responseErrors
      .map((entry: any) => {
        const message = String(entry?.message || '').trim();
        const errorType = String(entry?.errorType || '').trim();
        if (message && errorType) return `${message} (${errorType})`;
        return message || errorType || 'Unknown GraphQL error';
      })
      .join('\n');
  }

  const nestedErrors = error?.cause?.errors;
  if (Array.isArray(nestedErrors) && nestedErrors.length) {
    return nestedErrors
      .map((entry: any) => String(entry?.message || entry?.errorType || 'Unknown GraphQL error'))
      .join('\n');
  }

  const message = String(error?.message || '').trim();
  if (message && message !== '[object Object]') return message;
  return 'Unknown GraphQL error';
}

async function runAnnouncementGraphql<T>(operation: () => Promise<T>): Promise<T> {
  try {
    const response = await operation();
    const errors = (response as any)?.errors;
    if (Array.isArray(errors) && errors.length) {
      throw new Error(describeGraphQlError({ errors }));
    }
    return response;
  } catch (error) {
    throw new Error(describeGraphQlError(error));
  }
}

function toRequiredString(value: string | null | undefined, label: string) {
  const next = String(value || '').trim();
  if (!next) throw new Error(`${label} is required.`);
  return next;
}

function toNullableString(value?: string | null) {
  const next = String(value || '').trim();
  return next.length ? next : null;
}

function parseScheduleInput(date: string, time: string, allowPast = false) {
  const datePart = String(date || '').trim();
  const timePart = String(time || '').trim();
  if (!datePart && !timePart) return null;
  if (!datePart || !timePart) {
    throw new Error('Schedule requires both date and time.');
  }

  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('Schedule date must use YYYY-MM-DD format.');
  }

  const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!timeMatch) {
    throw new Error('Schedule time must use HH:MM or h:mm AM/PM format.');
  }

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const meridiem = (timeMatch[3] || '').toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (!meridiem && (hours < 0 || hours > 23)) {
    throw new Error('Schedule time hour must be between 0 and 23.');
  }
  if (minutes < 0 || minutes > 59) {
    throw new Error('Schedule time minutes must be between 0 and 59.');
  }

  const scheduled = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    hours,
    minutes,
    0,
    0,
  );
  if (Number.isNaN(scheduled.getTime())) {
    throw new Error('Unable to parse scheduled date/time.');
  }
  if (!allowPast && scheduled.getTime() <= Date.now()) {
    throw new Error('Scheduled time must be in the future.');
  }
  return scheduled.toISOString();
}

export function getDefaultScheduleDate(): Date {
  const next = new Date();
  next.setSeconds(0, 0);
  next.setMinutes(0);
  next.setHours(next.getHours() + 1);
  return next;
}

export function dateToScheduleFields(date: Date): { scheduleDate: string; scheduleTime: string } {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return {
    scheduleDate: `${yyyy}-${mm}-${dd}`,
    scheduleTime: `${hours12}:${minutes} ${meridiem}`,
  };
}

export function scheduleFieldsToDate(date: string, time: string): Date | null {
  try {
    const iso = parseScheduleInput(date, time, true);
    if (!iso) return null;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export function formatSchedulePickerDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatSchedulePickerTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatSchedulePickerSummary(date: string, time: string): string | null {
  const parsed = scheduleFieldsToDate(date, time);
  if (!parsed) return null;
  return `${formatSchedulePickerDate(parsed)} at ${formatSchedulePickerTime(parsed)}`;
}

export function formatAnnouncementDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function formatAnnouncementListMeta(row: AdminAnnouncementListRow) {
  if (row.status === 'scheduled') {
    return `Scheduled for ${formatAnnouncementDateTime(row.scheduledAt)}`;
  }
  if (row.status === 'ready') {
    return `Due since ${formatAnnouncementDateTime(row.scheduledAt)}`;
  }
  return `Published ${formatAnnouncementDateTime(row.publishedAt || row.displayAt)}`;
}

export function splitScheduleFields(scheduledAt?: string | null) {
  if (!scheduledAt) return { date: '', time: '' };
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hours12}:${minutes} ${meridiem}`,
  };
}

export function getAnnouncementStatus(record: {
  scheduledAt?: string | null;
  publishedAt?: string | null;
}): { status: AdminAnnouncementStatus; statusLabel: string } {
  const now = Date.now();
  const publishedAt = record.publishedAt ? Date.parse(record.publishedAt) : null;
  const scheduledAt = record.scheduledAt ? Date.parse(record.scheduledAt) : null;

  if (publishedAt != null && !Number.isNaN(publishedAt)) {
    return { status: 'published', statusLabel: 'Published' };
  }
  if (scheduledAt != null && !Number.isNaN(scheduledAt)) {
    if (scheduledAt > now) {
      return { status: 'scheduled', statusLabel: 'Scheduled' };
    }
    return { status: 'ready', statusLabel: 'Ready to publish' };
  }
  return { status: 'published', statusLabel: 'Published' };
}

function mapListRow(record: AnnouncementRecord): AdminAnnouncementListRow {
  const { status, statusLabel } = getAnnouncementStatus(record);
  const bodyPreview = String(record.body || '').trim();
  return {
    id: record.id,
    title: String(record.title || '').trim() || 'Untitled announcement',
    bodyPreview: bodyPreview.length > 140 ? `${bodyPreview.slice(0, 140)}…` : bodyPreview,
    status,
    statusLabel,
    scheduledAt: record.scheduledAt || null,
    publishedAt: record.publishedAt || null,
    createdAt: record.createdAt,
    displayAt: record.publishedAt || record.scheduledAt || record.createdAt,
  };
}

function mapDetail(record: AnnouncementRecord): AdminAnnouncementDetail {
  const { status, statusLabel } = getAnnouncementStatus(record);
  return {
    id: record.id,
    eventId: record.eventId,
    title: String(record.title || '').trim(),
    body: String(record.body || ''),
    deepLink: toNullableString(record.deepLink),
    scheduledAt: record.scheduledAt || null,
    publishedAt: record.publishedAt || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status,
    statusLabel,
  };
}

async function listAnnouncementRecords(eventId: string = APS_ID) {
  let nextToken: string | null | undefined = null;
  const rows: AnnouncementRecord[] = [];
  do {
    const resp = await runAnnouncementGraphql(() =>
      graphqlAuthClient.graphql({
        query: listAdminAnnouncementsQuery,
        variables: {
          eventId,
          sortDirection: 'DESC',
          limit: 200,
          nextToken,
        },
      }),
    );
    const data = (resp as any)?.data?.apsAdminAnnouncementsByEventIdAndCreatedAt;
    rows.push(
      ...(data?.items || []).filter((item: AnnouncementRecord | null) => !!item?.id),
    );
    nextToken = data?.nextToken;
  } while (nextToken);
  return rows;
}

async function publishDueAdminAnnouncementsDirect(eventId: string = APS_ID) {
  const nowIso = new Date().toISOString();
  const due: { id: string }[] = [];
  let nextToken: string | null | undefined = null;

  do {
    const resp = await runAnnouncementGraphql(() =>
      graphqlAuthClient.graphql({
        query: dueAnnouncementsQuery,
        variables: {
          eventId,
          scheduledAt: { le: nowIso },
          limit: 100,
          nextToken,
        },
      }),
    );
    const data = (resp as any)?.data?.apsAdminAnnouncementsByEventIdAndScheduledAt;
    due.push(
      ...(data?.items || []).filter(
        (item: { id?: string | null; publishedAt?: string | null }) =>
          !!item?.id && !item?.publishedAt,
      ),
    );
    nextToken = data?.nextToken;
  } while (nextToken);

  const publishedIds: string[] = [];
  for (const item of due) {
    await runAnnouncementGraphql(() =>
      graphqlAuthClient.graphql({
        query: updateAdminAnnouncementMutation,
        variables: {
          input: {
            id: item.id,
            publishedAt: nowIso,
          },
        },
      }),
    );
    publishedIds.push(item.id);
  }

  return {
    publishedCount: publishedIds.length,
    publishedIds,
  };
}

export async function publishDueAdminAnnouncements(eventId: string = APS_ID) {
  try {
    const resp = await runAnnouncementGraphql(() =>
      graphqlAuthClient.graphql({
        query: adminPublishDueAnnouncementsMutation,
        variables: { eventId },
      }),
    );
    return (resp as any)?.data?.adminPublishDueAnnouncements as {
      publishedCount: number;
      publishedIds: string[];
    };
  } catch {
    return publishDueAdminAnnouncementsDirect(eventId);
  }
}

export async function listAdminAnnouncements(eventId: string = APS_ID) {
  const rows = await listAnnouncementRecords(eventId);
  return rows.map(mapListRow);
}

export async function getAdminAnnouncementDetail(id: string) {
  const resp = await runAnnouncementGraphql(() =>
    graphqlAuthClient.graphql({
      query: getAdminAnnouncementQuery,
      variables: { id },
    }),
  );
  const record = (resp as any)?.data?.getApsAdminAnnouncement as AnnouncementRecord | null;
  if (!record?.id) throw new Error('Announcement not found.');
  return mapDetail(record);
}

type AnnouncementUpsertInput = {
  title?: string | null;
  body?: string | null;
  deepLink?: string | null;
  scheduleEnabled?: boolean;
  scheduleDate?: string;
  scheduleTime?: string;
};

function buildAnnouncementWriteInput(
  input: AnnouncementUpsertInput,
  mode: 'create' | 'update',
) {
  const body = toRequiredString(input.body, 'Body');
  const title = toNullableString(input.title);
  const deepLink = toNullableString(input.deepLink);
  const now = new Date().toISOString();
  const scheduleEnabled = !!input.scheduleEnabled;
  const scheduledAt = scheduleEnabled
    ? parseScheduleInput(
        input.scheduleDate || '',
        input.scheduleTime || '',
        mode === 'update',
      )
    : null;

  if (scheduleEnabled) {
    return compactInput({
      title,
      body,
      deepLink,
      scheduledAt,
    });
  }

  return compactInput({
    title,
    body,
    deepLink,
    publishedAt: now,
  });
}

export async function createAdminAnnouncement(input: AnnouncementUpsertInput) {
  const payload = buildAnnouncementWriteInput(input, 'create');
  const resp = await runAnnouncementGraphql(() =>
    graphqlAuthClient.graphql({
      query: createAdminAnnouncementMutation,
      variables: {
        input: compactInput({
          eventId: APS_ID,
          ...payload,
        }),
      },
    }),
  );
  const created = (resp as any)?.data?.createApsAdminAnnouncement as AnnouncementRecord | null;
  if (!created?.id) {
    throw new Error('Create succeeded but no announcement id was returned.');
  }
  return created.id;
}

export async function updateAdminAnnouncement(id: string, input: AnnouncementUpsertInput) {
  const existing = await getAdminAnnouncementDetail(id);
  if (existing.status === 'published') {
    const resp = await runAnnouncementGraphql(() =>
      graphqlAuthClient.graphql({
        query: updateAdminAnnouncementMutation,
        variables: {
          input: compactInput({
            id,
            title: toNullableString(input.title),
            body: toRequiredString(input.body, 'Body'),
            deepLink: toNullableString(input.deepLink),
          }),
        },
      }),
    );
    const updated = (resp as any)?.data?.updateApsAdminAnnouncement as AnnouncementRecord | null;
    if (!updated?.id) throw new Error('Update succeeded but no announcement was returned.');
    return;
  }

  const payload = buildAnnouncementWriteInput(input, 'update');
  const resp = await runAnnouncementGraphql(() =>
    graphqlAuthClient.graphql({
      query: updateAdminAnnouncementMutation,
      variables: {
        input: compactInput({
          id,
          ...payload,
        }),
      },
    }),
  );
  const updated = (resp as any)?.data?.updateApsAdminAnnouncement as AnnouncementRecord | null;
  if (!updated?.id) throw new Error('Update succeeded but no announcement was returned.');
}

export async function publishAdminAnnouncementNow(id: string) {
  const now = new Date().toISOString();
  const resp = await runAnnouncementGraphql(() =>
    graphqlAuthClient.graphql({
      query: updateAdminAnnouncementMutation,
      variables: {
        input: {
          id,
          publishedAt: now,
        },
      },
    }),
  );
  const updated = (resp as any)?.data?.updateApsAdminAnnouncement as AnnouncementRecord | null;
  if (!updated?.id) throw new Error('Publish succeeded but no announcement was returned.');
}

export async function deleteAdminAnnouncement(id: string) {
  await runAnnouncementGraphql(() =>
    graphqlAuthClient.graphql({
      query: deleteAdminAnnouncementMutation,
      variables: { input: { id } },
    }),
  );
}

export function isAnnouncementVisibleToAttendees(record: {
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt?: string | null;
}) {
  return getAnnouncementStatus(record).status === 'published';
}

export function getAnnouncementDisplayAt(record: {
  publishedAt?: string | null;
  scheduledAt?: string | null;
  createdAt?: string | null;
}) {
  return record.publishedAt || record.scheduledAt || record.createdAt || null;
}

export function confirmImmediatePublish(onConfirm: () => void | Promise<void>) {
  Alert.alert(
    'Publish immediately?',
    'This will publish the announcement right away and send a push notification to all users with notifications enabled. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish Now',
        style: 'destructive',
        onPress: () => {
          void onConfirm();
        },
      },
    ],
  );
}
