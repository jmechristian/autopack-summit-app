import { APS_ID } from '../../../config/apsConfig';
import {
  createApsAddOn,
  createRegistrantAddOnRequest,
  deleteApsAddOn,
  deleteRegistrantAddOnRequest,
  updateApsAddOn,
  updateRegistrantAddOnRequest,
} from '../../../graphql/mutations';
import {
  apsAddOnsByEventId,
  getApsAddOn,
  registrantAddOnRequestsByAddOnId,
} from '../../../graphql/queries';
import { graphqlAuthClient } from '../../../utils/graphqlClient';
import {
  AdminRegistrantListItem,
  listAdminRegistrants,
} from '../registrants/adminRegistrantsService';

export type AdminAddOnRequestRow = {
  id: string;
  registrantId: string;
  status: string;
  preferencesRaw?: string | null;
  preferencesDisplay: string;
  registrantName: string;
  registrantEmail: string;
};

export type AdminAddOnListRow = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  limit: number | null;
  price: number | null;
  pendingCount: number;
  approvedCount: number;
};

export type AdminAddOnDetail = {
  id: string;
  title: string;
  description: string;
  subheadline: string | null;
  location: string;
  date: string;
  time: string;
  altLink: string | null;
  type: string | null;
  limit: number | null;
  price: number | null;
  preferenceSchema: string | null;
  pendingRequests: AdminAddOnRequestRow[];
  approvedRequests: AdminAddOnRequestRow[];
};

type AddOnRequestInput = {
  registrantId: string;
  addOnId: string;
  preferences?: string | null;
};

type AddOnUpsertInput = {
  title: string;
  description: string;
  subheadline?: string | null;
  location: string;
  date: string;
  time: string;
  altLink?: string | null;
  type?: string | null;
  limit?: string | number | null;
  price?: string | number | null;
  preferenceSchema?: string | null;
  eventId?: string;
};

function toNullableString(value?: string | null) {
  const next = String(value || '').trim();
  return next.length ? next : null;
}

function toRequiredString(value?: string | null, fieldLabel: string) {
  const next = String(value || '').trim();
  if (!next) throw new Error(`${fieldLabel} is required.`);
  return next;
}

function toNullableInt(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
}

function parsePreferencesDisplay(input?: string | null) {
  const raw = String(input || '').trim();
  if (!raw) return '—';
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}

function registrantMapById(items: AdminRegistrantListItem[]) {
  const map = new Map<string, { name: string; email: string }>();
  for (const item of items) {
    if (!item.id) continue;
    const name = `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed';
    map.set(item.id, { name, email: item.email || 'No email' });
  }
  return map;
}

async function listRequestsByAddOnId(addOnId: string) {
  let nextToken: string | null | undefined = null;
  const rows: Array<{
    id: string;
    registrantId: string;
    status: string;
    preferences?: string | null;
  }> = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: registrantAddOnRequestsByAddOnId,
      variables: { addOnId, limit: 300, nextToken },
    });
    const data = (resp as any)?.data?.registrantAddOnRequestsByAddOnId;
    const items = data?.items || [];
    rows.push(
      ...items
        .filter((item: any) => !!item?.id && !!item?.registrantId)
        .map((item: any) => ({
          id: String(item.id),
          registrantId: String(item.registrantId),
          status: String(item.status || 'PENDING'),
          preferences: item.preferences ?? null,
        })),
    );
    nextToken = data?.nextToken;
  } while (nextToken);
  return rows;
}

export async function listAdminAddOns(eventId: string = APS_ID): Promise<AdminAddOnListRow[]> {
  let nextToken: string | null | undefined = null;
  const addOns: any[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: apsAddOnsByEventId,
      variables: { eventId, limit: 200, nextToken },
    });
    const data = (resp as any)?.data?.apsAddOnsByEventId;
    addOns.push(...(data?.items || []));
    nextToken = data?.nextToken;
  } while (nextToken);

  const rows = await Promise.all(
    addOns
      .filter((item) => !!item?.id)
      .map(async (item) => {
        const requests = await listRequestsByAddOnId(String(item.id));
        const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
        const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
        return {
          id: String(item.id),
          title: String(item.title || 'Untitled Add-On'),
          date: String(item.date || ''),
          time: String(item.time || ''),
          location: String(item.location || ''),
          limit: typeof item.limit === 'number' ? item.limit : null,
          price: typeof item.price === 'number' ? item.price : null,
          pendingCount,
          approvedCount,
        } as AdminAddOnListRow;
      }),
  );

  return rows.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.title.localeCompare(b.title);
  });
}

export async function getAdminAddOnDetail(addOnId: string): Promise<AdminAddOnDetail> {
  const [addOnResp, requests, registrants] = await Promise.all([
    graphqlAuthClient.graphql({ query: getApsAddOn, variables: { id: addOnId } }),
    listRequestsByAddOnId(addOnId),
    listAdminRegistrants(),
  ]);
  const addOn = (addOnResp as any)?.data?.getApsAddOn;
  if (!addOn?.id) throw new Error('Add-on not found.');

  const registrantLookup = registrantMapById(registrants);
  const mappedRequests: AdminAddOnRequestRow[] = requests.map((request) => {
    const registrant = registrantLookup.get(request.registrantId);
    return {
      id: request.id,
      registrantId: request.registrantId,
      status: request.status,
      preferencesRaw: request.preferences ?? null,
      preferencesDisplay: parsePreferencesDisplay(request.preferences),
      registrantName: registrant?.name || 'Unknown registrant',
      registrantEmail: registrant?.email || 'No email',
    };
  });

  return {
    id: String(addOn.id),
    title: String(addOn.title || ''),
    description: String(addOn.description || ''),
    subheadline: toNullableString(addOn.subheadline),
    location: String(addOn.location || ''),
    date: String(addOn.date || ''),
    time: String(addOn.time || ''),
    altLink: toNullableString(addOn.altLink),
    type: toNullableString(addOn.type),
    limit: typeof addOn.limit === 'number' ? addOn.limit : null,
    price: typeof addOn.price === 'number' ? addOn.price : null,
    preferenceSchema: toNullableString(addOn.preferenceSchema),
    pendingRequests: mappedRequests.filter((r) => r.status === 'PENDING'),
    approvedRequests: mappedRequests.filter((r) => r.status === 'APPROVED'),
  };
}

export async function createAdminAddOn(input: AddOnUpsertInput): Promise<string> {
  const eventId = input.eventId || APS_ID;
  const resp = await graphqlAuthClient.graphql({
    query: createApsAddOn,
    variables: {
      input: {
        title: toRequiredString(input.title, 'Title'),
        description: toRequiredString(input.description, 'Description'),
        location: toRequiredString(input.location, 'Location'),
        date: toRequiredString(input.date, 'Date'),
        time: toRequiredString(input.time, 'Time'),
        eventId,
        subheadline: toNullableString(input.subheadline),
        altLink: toNullableString(input.altLink),
        type: toNullableString(input.type),
        limit: toNullableInt(input.limit),
        price: toNullableInt(input.price),
        preferenceSchema: toNullableString(input.preferenceSchema),
      },
    },
  });
  const id = (resp as any)?.data?.createApsAddOn?.id;
  if (!id) throw new Error('Unable to create add-on.');
  return String(id);
}

export async function updateAdminAddOn(input: AddOnUpsertInput & { id: string }) {
  await graphqlAuthClient.graphql({
    query: updateApsAddOn,
    variables: {
      input: {
        id: input.id,
        title: toRequiredString(input.title, 'Title'),
        description: toRequiredString(input.description, 'Description'),
        location: toRequiredString(input.location, 'Location'),
        date: toRequiredString(input.date, 'Date'),
        time: toRequiredString(input.time, 'Time'),
        subheadline: toNullableString(input.subheadline),
        altLink: toNullableString(input.altLink),
        type: toNullableString(input.type),
        limit: toNullableInt(input.limit),
        price: toNullableInt(input.price),
        preferenceSchema: toNullableString(input.preferenceSchema),
      },
    },
  });
}

export async function deleteAdminAddOn(addOnId: string) {
  // Remove requests first so admin behavior matches existing site expectations.
  const requests = await listRequestsByAddOnId(addOnId);
  await Promise.all(
    requests.map((request) =>
      graphqlAuthClient.graphql({
        query: deleteRegistrantAddOnRequest,
        variables: { input: { id: request.id } },
      }),
    ),
  );
  await graphqlAuthClient.graphql({
    query: deleteApsAddOn,
    variables: { input: { id: addOnId } },
  });
}

export async function createAdminAddOnRequest(input: AddOnRequestInput) {
  const existing = await graphqlAuthClient.graphql({
    query: registrantAddOnRequestsByAddOnId,
    variables: {
      addOnId: input.addOnId,
      filter: { registrantId: { eq: input.registrantId } },
      limit: 1,
    },
  });
  const existingItem = (existing as any)?.data?.registrantAddOnRequestsByAddOnId?.items?.find(Boolean);
  if (existingItem?.id) throw new Error('This registrant already has a request for this add-on.');

  await graphqlAuthClient.graphql({
    query: createRegistrantAddOnRequest,
    variables: {
      input: {
        addOnId: input.addOnId,
        registrantId: input.registrantId,
        status: 'PENDING',
        preferences: toNullableString(input.preferences) || null,
      },
    },
  });
}

export async function approveAdminAddOnRequest(requestId: string, preferences?: string | null) {
  await graphqlAuthClient.graphql({
    query: updateRegistrantAddOnRequest,
    variables: {
      input: {
        id: requestId,
        status: 'APPROVED',
        preferences: toNullableString(preferences) || null,
      },
    },
  });
}

export async function removeAdminAddOnRequest(requestId: string) {
  await graphqlAuthClient.graphql({
    query: deleteRegistrantAddOnRequest,
    variables: { input: { id: requestId } },
  });
}

export async function listAddOnRegistrantCandidates() {
  return listAdminRegistrants();
}
