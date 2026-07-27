import * as APITypes from '../../../API';
import {
  createApsAppExhibitorProfile,
  deleteApsAppExhibitorProfile,
  updateApsAppExhibitorProfile,
} from '../../../graphql/mutations';
import { apsRegistrantsByApsID } from '../../../graphql/queries';
import { getAPSWithExhibitors } from '../../../graphql/customQueries';
import { graphqlAuthClient } from '../../../utils/graphqlClient';
import { APS_ID } from '../../../config/apsConfig';
import { listAdminCompanies } from '../registrants/adminRegistrantsService';

export const ADMIN_EXHIBITOR_EVENT_ID = 'd00b35f5-c45b-42eb-b306-fa3dfeee0251';

const adminCreateExhibitorMutation = /* GraphQL */ `
  mutation AdminCreateExhibitor($input: AdminCreateExhibitorInput!) {
    adminCreateExhibitor(input: $input) {
      id
      companyId
      eventId
      boothNumber
      passportQrPayload
      qrCode
    }
  }
`;

function describeGraphQlError(error: any): string {
  const message = String(error?.message || '').trim();
  const errors = error?.errors;
  if (Array.isArray(errors) && errors.length) {
    const compact = errors
      .map((entry: any) => String(entry?.message || entry?.errorType || 'Unknown GraphQL error'))
      .join(' | ');
    return compact || message || 'Unknown GraphQL error';
  }
  return message || 'Unknown GraphQL error';
}

export type AdminApprovedRegistrant = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  attendeeType?: string | null;
  status?: string | null;
};

export type AdminExhibitorCompany = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  type?: string | null;
  description?: string | null;
};

export type AdminExhibitorRow = {
  id: string;
  companyId: string;
  eventId: string;
  boothNumber?: string | null;
  company: AdminExhibitorCompany;
  approvedRegistrants: AdminApprovedRegistrant[];
};

export type AdminExhibitorSummary = {
  id: string;
  companyId: string;
  companyName: string;
  companyEmail?: string | null;
  boothNumber?: string | null;
  registrantSearchText: string[];
};

export async function listAdminExhibitors(): Promise<AdminExhibitorRow[]> {
  const [exhibitorsResp, approvedRegistrants] = await Promise.all([
    graphqlAuthClient.graphql({
      query: getAPSWithExhibitors,
      variables: { id: ADMIN_EXHIBITOR_EVENT_ID, eventId: ADMIN_EXHIBITOR_EVENT_ID },
    }),
    listApprovedRegistrantsByCompany(),
  ]);

  const exhibitorItems =
    (exhibitorsResp as any)?.data?.apsAppExhibitorProfilesByEventId?.items || [];

  const rows: AdminExhibitorRow[] = exhibitorItems
    .filter((item: any) => !!item?.id && !!item?.company?.id)
    .map((item: any) => {
      const companyId = String(item.company.id);
      return {
        id: String(item.id),
        companyId,
        eventId: String(item.eventId || ADMIN_EXHIBITOR_EVENT_ID),
        boothNumber: item.boothNumber ?? null,
        company: {
          id: companyId,
          name: String(item.company.name || 'Unnamed Company'),
          email: item.company.email ?? null,
          phone: item.company.phone ?? null,
          website: item.company.website ?? null,
          type: item.company.type ?? null,
          description: item.company.description ?? null,
        },
        approvedRegistrants: approvedRegistrants.get(companyId) || [],
      };
    });

  return rows.sort((a, b) => a.company.name.localeCompare(b.company.name));
}

export async function listAdminExhibitorSummaries(): Promise<AdminExhibitorSummary[]> {
  const rows = await listAdminExhibitors();
  return rows.map((row) => ({
    id: row.id,
    companyId: row.companyId,
    companyName: row.company.name,
    companyEmail: row.company.email ?? null,
    boothNumber: row.boothNumber ?? null,
    registrantSearchText: row.approvedRegistrants.flatMap((registrant) => {
      const fullName = `${registrant.firstName || ''} ${registrant.lastName || ''}`.trim();
      return [fullName, registrant.email || ''].filter(Boolean);
    }),
  }));
}

export async function getAdminExhibitorDetail(exhibitorId: string): Promise<AdminExhibitorRow> {
  const rows = await listAdminExhibitors();
  const row = rows.find((item) => item.id === exhibitorId);
  if (!row) throw new Error('Exhibitor not found.');
  return row;
}

async function listApprovedRegistrantsByCompany() {
  let nextToken: string | null | undefined = null;
  const byCompany = new Map<string, AdminApprovedRegistrant[]>();

  do {
    const resp = await graphqlAuthClient.graphql({
      query: apsRegistrantsByApsID,
      variables: {
        apsID: APS_ID,
        limit: 300,
        nextToken,
        filter: {
          status: { eq: APITypes.RegistrantStatus.APPROVED },
        },
      },
    });
    const data = (resp as any)?.data?.apsRegistrantsByApsID;
    const items = (data?.items || []) as any[];
    for (const item of items) {
      if (!item?.id || !item?.companyId) continue;
      const companyId = String(item.companyId);
      const rows = byCompany.get(companyId) || [];
      rows.push({
        id: String(item.id),
        firstName: item.firstName ?? null,
        lastName: item.lastName ?? null,
        email: item.email ?? null,
        attendeeType: item.attendeeType ?? null,
        status: item.status ?? null,
      });
      byCompany.set(companyId, rows);
    }
    nextToken = data?.nextToken;
  } while (nextToken);

  for (const [companyId, rows] of byCompany.entries()) {
    rows.sort((a, b) => {
      const aName = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
      const bName = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
      return aName.localeCompare(bName);
    });
    byCompany.set(companyId, rows);
  }

  return byCompany;
}

export async function updateAdminExhibitorBoothNumber(exhibitorId: string, boothNumber: string) {
  await graphqlAuthClient.graphql({
    query: updateApsAppExhibitorProfile,
    variables: {
      input: {
        id: exhibitorId,
        boothNumber: boothNumber.trim() || null,
      },
    },
  });
}

export async function createAdminExhibitor(input: {
  companyId: string;
  boothNumber?: string;
  eventId?: string;
}) {
  const eventId = input.eventId || ADMIN_EXHIBITOR_EVENT_ID;
  try {
    const adminResp = await graphqlAuthClient.graphql({
      query: adminCreateExhibitorMutation,
      variables: {
        input: {
          companyId: input.companyId,
          eventId,
          boothNumber: input.boothNumber?.trim() || undefined,
        },
      },
    });
    const adminCreated = (adminResp as any)?.data?.adminCreateExhibitor;
    if (adminCreated?.id) return adminCreated.id as string;
    throw new Error('Admin exhibitor create mutation returned no id.');
  } catch (error: any) {
    const msg = describeGraphQlError(error);
    const isSchemaNotReady =
      msg.includes('Cannot query field "adminCreateExhibitor"') ||
      msg.includes('Unknown type "AdminCreateExhibitorInput"') ||
      msg.includes('Unsupported invocation');
    if (!isSchemaNotReady) {
      throw new Error(`Unable to create exhibitor with QR. ${msg || 'Unknown admin mutation error.'}`);
    }
  }

  const fallbackResp = await graphqlAuthClient.graphql({
    query: createApsAppExhibitorProfile,
    variables: {
      input: {
        companyId: input.companyId,
        eventId,
        boothNumber: input.boothNumber?.trim() || null,
      },
    },
  });
  const fallbackCreated = (fallbackResp as any)?.data?.createApsAppExhibitorProfile;
  if (!fallbackCreated?.id) throw new Error('Unable to create exhibitor profile.');
  return fallbackCreated.id as string;
}

export async function deleteAdminExhibitor(exhibitorId: string) {
  await graphqlAuthClient.graphql({
    query: deleteApsAppExhibitorProfile,
    variables: { input: { id: exhibitorId } },
  });
}

export async function listAdminExhibitorCompanies() {
  return listAdminCompanies();
}

