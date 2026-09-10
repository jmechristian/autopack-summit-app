import { RISING_STAR_KEY } from '../config/risingStars';
import {
  getProfileRisingStarFields,
  listProfilesForRisingStarAdmin as listProfilesForRisingStarAdminQuery,
  risingStarsByKey,
  updateProfileRisingStar,
} from '../graphql/risingStarOps';
import { graphqlApiKeyClient, graphqlAuthClient } from '../utils/graphqlClient';
import { drainIndexedList } from '../utils/paginateGraphql';

export type RisingStarProfile = {
  id: string;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
  risingStarYear: number;
};

function asYear(value?: number | null) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1990 && year <= 2100 ? year : null;
}

function toStar(row: {
  id?: string | null;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
  risingStarYear?: number | null;
}): RisingStarProfile | null {
  if (!row.id) return null;
  const risingStarYear = asYear(row.risingStarYear);
  if (!risingStarYear) return null;
  return {
    id: row.id,
    userId: row.userId || null,
    firstName: row.firstName || null,
    lastName: row.lastName || null,
    email: row.email || null,
    company: row.company || null,
    jobTitle: row.jobTitle || null,
    profilePicture: row.profilePicture || null,
    risingStarYear,
  };
}

function displayName(star: Pick<RisingStarProfile, 'firstName' | 'lastName'>) {
  const name = `${star.firstName || ''} ${star.lastName || ''}`.trim();
  return name || 'Attendee';
}

export function risingStarDisplayName(star: Pick<RisingStarProfile, 'firstName' | 'lastName'>) {
  return displayName(star);
}

export function sortRisingStars(rows: RisingStarProfile[]) {
  return [...rows].sort((a, b) => {
    if (b.risingStarYear !== a.risingStarYear) return b.risingStarYear - a.risingStarYear;
    return displayName(a).localeCompare(displayName(b));
  });
}

export async function listRisingStars(): Promise<RisingStarProfile[]> {
  try {
    const rows = await drainIndexedList<{
      id?: string | null;
      userId?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      company?: string | null;
      jobTitle?: string | null;
      profilePicture?: string | null;
      risingStarYear?: number | null;
    }>({
      client: graphqlApiKeyClient,
      query: risingStarsByKey,
      field: 'apsAppUserProfilesByRisingStarKey',
      variables: { risingStarKey: RISING_STAR_KEY },
    });
    return sortRisingStars(rows.map(toStar).filter((row): row is RisingStarProfile => !!row));
  } catch (error) {
    console.warn('Rising stars list failed:', error);
    return [];
  }
}

export async function getProfileRisingStarYear(profileId?: string | null): Promise<number | null> {
  if (!profileId) return null;
  try {
    const resp = await graphqlApiKeyClient.graphql({
      query: getProfileRisingStarFields,
      variables: { id: profileId },
    });
    const data = (resp as any).data as {
      getApsAppUserProfile?: { risingStarYear?: number | null; risingStarKey?: string | null } | null;
    };
    const row = data.getApsAppUserProfile;
    if (row?.risingStarKey !== RISING_STAR_KEY) return null;
    return asYear(row.risingStarYear);
  } catch {
    return null;
  }
}

export async function listProfilesForRisingStarAdmin(): Promise<
  Array<{
    id: string;
    userId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    company?: string | null;
    jobTitle?: string | null;
    profilePicture?: string | null;
    risingStarYear: number | null;
  }>
> {
  const rows = await drainIndexedList<{
    id?: string | null;
    userId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    company?: string | null;
    jobTitle?: string | null;
    profilePicture?: string | null;
    risingStarKey?: string | null;
    risingStarYear?: number | null;
  }>({
    client: graphqlAuthClient,
    query: listProfilesForRisingStarAdminQuery,
    field: 'listApsAppUserProfiles',
    pageSize: 200,
  });
  return rows
    .filter((row): row is typeof row & { id: string } => !!row.id)
    .map((row) => ({
      id: row.id,
      userId: row.userId || null,
      firstName: row.firstName || null,
      lastName: row.lastName || null,
      email: row.email || null,
      company: row.company || null,
      jobTitle: row.jobTitle || null,
      profilePicture: row.profilePicture || null,
      risingStarYear: row.risingStarKey === RISING_STAR_KEY ? asYear(row.risingStarYear) : null,
    }))
    .sort((a, b) => displayName(a).localeCompare(displayName(b)));
}

export async function setProfileRisingStar(profileId: string, year: number) {
  const parsed = asYear(year);
  if (!parsed) throw new Error('Enter a valid award year.');
  await graphqlAuthClient.graphql({
    query: updateProfileRisingStar,
    variables: {
      input: {
        id: profileId,
        risingStarKey: RISING_STAR_KEY,
        risingStarYear: parsed,
      },
    },
  });
}

export async function clearProfileRisingStar(profileId: string) {
  await graphqlAuthClient.graphql({
    query: updateProfileRisingStar,
    variables: {
      input: {
        id: profileId,
        risingStarKey: null,
        risingStarYear: null,
      },
    },
  });
}

export function groupRisingStarsByYear(rows: RisingStarProfile[]) {
  const groups = new Map<number, RisingStarProfile[]>();
  for (const row of sortRisingStars(rows)) {
    const list = groups.get(row.risingStarYear) || [];
    list.push(row);
    groups.set(row.risingStarYear, list);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}
