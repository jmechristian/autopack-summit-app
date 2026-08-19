import {
  apsContactRequestsByRequestedByUserIdAndCreatedAt,
  apsContactRequestsByStatusAndUpdatedAt,
} from '../graphql/queries';
import {
  apsContactRequestsByUserAIdAndCreatedAt,
  apsContactRequestsByUserBIdAndCreatedAt,
} from '../graphql/contactRequestOps';
import { graphqlAuthClient } from './graphqlClient';
import { drainIndexedList } from './paginateGraphql';

export type ContactRequestListRow = {
  id?: string | null;
  eventId?: string | null;
  requestKey?: string | null;
  owners?: string[] | null;
  requestedByUserId?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  userAId?: string | null;
  userBId?: string | null;
  introMessage?: string | null;
  introSentAt?: string | null;
  introDeliveredAt?: string | null;
  acceptedAt?: string | null;
};

const CACHE_TTL_MS = 4000;

let inFlight: Promise<ContactRequestListRow[]> | null = null;
let inFlightSub: string | null = null;
let cached: { mySub: string; rows: ContactRequestListRow[]; at: number } | null = null;

export function invalidateOwnedContactRequestCache() {
  cached = null;
}

export function otherUserIdFromRequest(row: ContactRequestListRow, mySub: string): string {
  return (
    (Array.isArray(row.owners) ? row.owners.find((x) => x && x !== mySub) : undefined) ||
    (row.userAId === mySub ? row.userBId : row.userAId) ||
    ''
  );
}

function mergeRows(...groups: ContactRequestListRow[][]): ContactRequestListRow[] {
  const merged = new Map<string, ContactRequestListRow>();
  for (const group of groups) {
    for (const row of group) {
      if (row.id) merged.set(row.id, row);
    }
  }
  return Array.from(merged.values());
}

function ownedBy(row: ContactRequestListRow, mySub: string): boolean {
  return Array.isArray(row.owners) && row.owners.includes(mySub);
}

async function fetchByStatus(status: string): Promise<ContactRequestListRow[]> {
  return drainIndexedList<ContactRequestListRow>({
    client: graphqlAuthClient,
    query: apsContactRequestsByStatusAndUpdatedAt,
    field: 'apsContactRequestsByStatusAndUpdatedAt',
    variables: { status, sortDirection: 'DESC' },
  });
}

async function fetchByRequester(mySub: string): Promise<ContactRequestListRow[]> {
  return drainIndexedList<ContactRequestListRow>({
    client: graphqlAuthClient,
    query: apsContactRequestsByRequestedByUserIdAndCreatedAt,
    field: 'apsContactRequestsByRequestedByUserIdAndCreatedAt',
    variables: { requestedByUserId: mySub, sortDirection: 'DESC' },
  });
}

async function fetchViaParticipantIndexes(mySub: string): Promise<ContactRequestListRow[] | null> {
  try {
    const [asA, asB] = await Promise.all([
      drainIndexedList<ContactRequestListRow>({
        client: graphqlAuthClient,
        query: apsContactRequestsByUserAIdAndCreatedAt,
        field: 'apsContactRequestsByUserAIdAndCreatedAt',
        variables: { userAId: mySub, sortDirection: 'DESC' },
      }),
      drainIndexedList<ContactRequestListRow>({
        client: graphqlAuthClient,
        query: apsContactRequestsByUserBIdAndCreatedAt,
        field: 'apsContactRequestsByUserBIdAndCreatedAt',
        variables: { userBId: mySub, sortDirection: 'DESC' },
      }),
    ]);
    return mergeRows(asA, asB);
  } catch {
    return null;
  }
}

async function loadOwnedContactRequestRows(mySub: string): Promise<ContactRequestListRow[]> {
  const viaParticipants = await fetchViaParticipantIndexes(mySub);
  if (viaParticipants) {
    return viaParticipants.filter((row) => ownedBy(row, mySub));
  }

  const [pending, accepted, byRequester] = await Promise.all([
    fetchByStatus('PENDING'),
    fetchByStatus('ACCEPTED'),
    fetchByRequester(mySub).catch(() => [] as ContactRequestListRow[]),
  ]);

  return mergeRows(pending, accepted, byRequester).filter((row) => ownedBy(row, mySub));
}

export async function fetchOwnedContactRequestRows(
  mySub: string,
  opts?: { force?: boolean }
): Promise<ContactRequestListRow[]> {
  if (!opts?.force && cached && cached.mySub === mySub && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.rows;
  }
  if (inFlight && inFlightSub === mySub) return inFlight;

  inFlightSub = mySub;
  inFlight = (async () => {
    const rows = await loadOwnedContactRequestRows(mySub);
    cached = { mySub, rows, at: Date.now() };
    return rows;
  })().finally(() => {
    inFlight = null;
    inFlightSub = null;
  });

  return inFlight;
}
