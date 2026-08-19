import { APS_ID } from '../../../config/apsConfig';
import { apsAppUserPassportStampsByEventIdAndCreatedAt } from '../../../graphql/queries';
import { getAppUserByRegistrantId } from '../../../graphql/customQueries';
import { graphqlAuthClient, graphqlApiKeyClient } from '../../../utils/graphqlClient';
import { drainIndexedList } from '../../../utils/paginateGraphql';
import { listAdminRegistrants } from '../registrants/adminRegistrantsService';

const exhibitorsByEventWithCompany = /* GraphQL */ `
  query AdminPassportExhibitorsByEvent($eventId: ID!, $limit: Int, $nextToken: String) {
    apsAppExhibitorProfilesByEventId(eventId: $eventId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        boothNumber
        company {
          name
        }
      }
      nextToken
    }
  }
`;

export type AdminPassportRegistrantRow = {
  registrantId: string;
  profileId?: string | null;
  name: string;
  email: string;
  company: string;
  attendeeType: string;
  status: string;
  completedCount: number;
  percentComplete: number;
  lastScannedAt?: string | null;
  eligible: boolean;
};

export type AdminPassportExhibitorRow = {
  exhibitorId: string;
  companyName: string;
  boothNumber: string;
  stampCount: number;
};

export type AdminPassportMetrics = {
  totalRegistrants: number;
  eligibleRegistrants: number;
  totalExhibitors: number;
  totalStamps: number;
  totalPossibleStamps: number;
  averageCompletionPercent: number;
  completedRegistrants: number;
};

export type AdminPassportTrackerData = {
  metrics: AdminPassportMetrics;
  registrantRows: AdminPassportRegistrantRow[];
  exhibitorRows: AdminPassportExhibitorRow[];
};

type Stamp = {
  id: string;
  userProfileId: string;
  exhibitorId: string;
  scannedAt?: string | null;
};

function sortByNameAsc<T extends { name?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

async function listProfileIdsByRegistrantId(registrantIds: string[]) {
  const byRegistrantId = new Map<string, string>();
  await Promise.all(
    registrantIds.map(async (registrantId) => {
      try {
        const resp = await graphqlAuthClient.graphql({
          query: getAppUserByRegistrantId,
          variables: { registrantId },
        });
        const appUser = (resp as any)?.data?.apsAppUsersByRegistrantId?.items?.find(Boolean);
        const profileId = appUser?.profile?.id;
        if (profileId) byRegistrantId.set(registrantId, String(profileId));
      } catch {
        // keep resilient; missing profile just means ineligible
      }
    }),
  );
  return byRegistrantId;
}

async function listExhibitors(eventId: string) {
  try {
    const items = await drainIndexedList<{
      id?: string | null;
      boothNumber?: string | null;
      company?: { name?: string | null } | null;
    }>({
      client: graphqlApiKeyClient,
      query: exhibitorsByEventWithCompany,
      field: 'apsAppExhibitorProfilesByEventId',
      variables: { eventId },
    });
    return items
      .filter((item) => !!item?.id)
      .map((item) => ({
        exhibitorId: String(item.id),
        companyName: String(item?.company?.name || 'Unnamed Company'),
        boothNumber: String(item?.boothNumber || '—'),
      }));
  } catch {
    return [] as Array<{ exhibitorId: string; companyName: string; boothNumber: string }>;
  }
}

async function listStamps(eventId: string) {
  const items = await drainIndexedList<Stamp & { userProfileId?: string; exhibitorId?: string; scannedAt?: string | null }>({
    client: graphqlAuthClient,
    query: apsAppUserPassportStampsByEventIdAndCreatedAt,
    field: 'apsAppUserPassportStampsByEventIdAndCreatedAt',
    variables: { eventId },
  });
  const stamps: Stamp[] = [];
  for (const item of items) {
    if (!item?.id || !item?.userProfileId || !item?.exhibitorId) continue;
    stamps.push({
      id: String(item.id),
      userProfileId: String(item.userProfileId),
      exhibitorId: String(item.exhibitorId),
      scannedAt: item.scannedAt ?? null,
    });
  }
  return stamps;
}

export async function getAdminPassportTrackerData(
  eventId: string = APS_ID,
): Promise<AdminPassportTrackerData> {
  const [registrants, exhibitors, stamps] = await Promise.all([
    listAdminRegistrants(),
    listExhibitors(eventId),
    listStamps(eventId),
  ]);
  const profileIdByRegistrantId = await listProfileIdsByRegistrantId(
    registrants.map((registrant) => String(registrant.id)),
  );

  const exhibitorIds = new Set(exhibitors.map((row) => row.exhibitorId));
  const filteredStamps = stamps.filter((stamp) => exhibitorIds.has(stamp.exhibitorId));

  const stampsByProfileId = new Map<string, Stamp[]>();
  for (const stamp of filteredStamps) {
    const rows = stampsByProfileId.get(stamp.userProfileId) || [];
    rows.push(stamp);
    stampsByProfileId.set(stamp.userProfileId, rows);
  }

  const exhibitorStampCount = new Map<string, number>();
  for (const stamp of filteredStamps) {
    exhibitorStampCount.set(stamp.exhibitorId, (exhibitorStampCount.get(stamp.exhibitorId) || 0) + 1);
  }

  const totalExhibitors = exhibitors.length;
  let eligibleRegistrants = 0;
  let totalUniqueStamps = 0;
  let completedRegistrants = 0;

  const registrantRows = sortByNameAsc(
    registrants.map((registrant) => {
      const registrantId = String(registrant.id);
      const profileId = profileIdByRegistrantId.get(registrantId) || null;
      const eligible = !!profileId;
      const stampsForProfile = profileId ? stampsByProfileId.get(profileId) || [] : [];
      const uniqueExhibitorIds = new Set(stampsForProfile.map((stamp) => stamp.exhibitorId));
      const completedCount = uniqueExhibitorIds.size;
      const percentComplete =
        totalExhibitors > 0 ? Math.min(100, (completedCount / totalExhibitors) * 100) : 0;
      const lastScannedAt =
        stampsForProfile
          .map((stamp) => stamp.scannedAt || '')
          .filter(Boolean)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
      const name =
        `${registrant.firstName || ''} ${registrant.lastName || ''}`.trim() || 'Unnamed';

      if (eligible) {
        eligibleRegistrants += 1;
        totalUniqueStamps += completedCount;
        if (totalExhibitors > 0 && completedCount >= totalExhibitors) completedRegistrants += 1;
      }

      return {
        registrantId,
        profileId,
        name,
        email: registrant.email || 'No email',
        company: registrant.companyName || 'No company',
        attendeeType: registrant.attendeeType || '—',
        status: registrant.status || '—',
        completedCount,
        percentComplete,
        lastScannedAt,
        eligible,
      } as AdminPassportRegistrantRow;
    }),
  ).sort((a, b) => {
    if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
    return a.name.localeCompare(b.name);
  });

  const exhibitorRows = exhibitors
    .map((exhibitor) => ({
      exhibitorId: exhibitor.exhibitorId,
      companyName: exhibitor.companyName,
      boothNumber: exhibitor.boothNumber,
      stampCount: exhibitorStampCount.get(exhibitor.exhibitorId) || 0,
    }))
    .sort((a, b) => {
      if (b.stampCount !== a.stampCount) return b.stampCount - a.stampCount;
      return a.companyName.localeCompare(b.companyName);
    });

  const totalPossibleStamps = eligibleRegistrants * totalExhibitors;
  const averageCompletionPercent =
    totalPossibleStamps > 0 ? (totalUniqueStamps / totalPossibleStamps) * 100 : 0;

  return {
    metrics: {
      totalRegistrants: registrants.length,
      eligibleRegistrants,
      totalExhibitors,
      totalStamps: totalUniqueStamps,
      totalPossibleStamps,
      averageCompletionPercent,
      completedRegistrants,
    },
    registrantRows,
    exhibitorRows,
  };
}
