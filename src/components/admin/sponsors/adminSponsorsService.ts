import * as APITypes from '../../../API';
import { updateApsSponsor, updateAPSCompany } from '../../../graphql/mutations';
import {
  apsRegistrantsByCompanyId,
  apsSponsorsByEventId,
  aPSCompanyContactsByCompanyIdAndCreatedAt,
  getApsSponsor,
  getAPSCompany,
} from '../../../graphql/queries';
import { graphqlAuthClient } from '../../../utils/graphqlClient';
import { APS_ID } from '../../../config/apsConfig';

export type AdminSponsorContact = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  title?: string | null;
  createdAt?: string | null;
};

export type AdminSponsorRegistrant = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  attendeeType?: string | null;
  status?: string | null;
};

export type AdminSponsorCompany = {
  id: string;
  name: string;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  type?: string | null;
};

export type AdminSponsorRow = {
  id: string;
  companyId: string;
  eventId: string;
  type?: APITypes.SponsorType | null;
  company: AdminSponsorCompany;
  contacts: AdminSponsorContact[];
  registrants: AdminSponsorRegistrant[];
};

export type AdminSponsorSummary = {
  id: string;
  companyId: string;
  companyName: string;
  companyEmail?: string | null;
  companyLogo?: string | null;
  registrantSearchText: string[];
};

async function listSponsorsForEvent(eventId: string) {
  let nextToken: string | null | undefined = null;
  const items: any[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: apsSponsorsByEventId,
      variables: {
        eventId,
        limit: 200,
        nextToken,
      },
    });
    const data = (resp as any)?.data?.apsSponsorsByEventId;
    items.push(...(data?.items || []));
    nextToken = data?.nextToken;
  } while (nextToken);
  return items;
}

async function listCompanyContacts(companyId: string): Promise<AdminSponsorContact[]> {
  let nextToken: string | null | undefined = null;
  const contacts: AdminSponsorContact[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: aPSCompanyContactsByCompanyIdAndCreatedAt,
      variables: {
        companyId,
        sortDirection: APITypes.ModelSortDirection.DESC,
        limit: 200,
        nextToken,
      },
    });
    const data = (resp as any)?.data?.aPSCompanyContactsByCompanyIdAndCreatedAt;
    const items = data?.items || [];
    for (const item of items) {
      if (!item?.id || !item?.email) continue;
      contacts.push({
        id: String(item.id),
        name: item.name ?? null,
        email: String(item.email),
        phone: item.phone ?? null,
        title: item.title ?? null,
        createdAt: item.createdAt ?? null,
      });
    }
    nextToken = data?.nextToken;
  } while (nextToken);
  return contacts;
}

async function listCompanyRegistrants(companyId: string): Promise<AdminSponsorRegistrant[]> {
  let nextToken: string | null | undefined = null;
  const rows: AdminSponsorRegistrant[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: apsRegistrantsByCompanyId,
      variables: {
        companyId,
        limit: 300,
        nextToken,
      },
    });
    const data = (resp as any)?.data?.apsRegistrantsByCompanyId;
    const items = data?.items || [];
    for (const item of items) {
      if (!item?.id) continue;
      rows.push({
        id: String(item.id),
        firstName: item.firstName ?? null,
        lastName: item.lastName ?? null,
        email: item.email ?? null,
        attendeeType: item.attendeeType ?? null,
        status: item.status ?? null,
      });
    }
    nextToken = data?.nextToken;
  } while (nextToken);

  return rows.sort((a, b) => {
    const aName = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
    const bName = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
    return aName.localeCompare(bName);
  });
}

export async function listAdminSponsors(eventId: string = APS_ID): Promise<AdminSponsorRow[]> {
  const sponsors = await listSponsorsForEvent(eventId);
  const uniqueCompanyIds = Array.from(
    new Set(
      sponsors
        .map((item: any) => item?.companyId)
        .filter((value: any): value is string => !!value)
        .map((value: string) => String(value)),
    ),
  );

  const companyBundles = await Promise.all(
    uniqueCompanyIds.map(async (companyId) => {
      const [companyResp, contacts, registrants] = await Promise.all([
        graphqlAuthClient.graphql({
          query: getAPSCompany,
          variables: { id: companyId },
        }),
        listCompanyContacts(companyId),
        listCompanyRegistrants(companyId),
      ]);
      const company = (companyResp as any)?.data?.getAPSCompany;
      if (!company?.id) return null;
      return {
        companyId,
        company: {
          id: String(company.id),
          name: String(company.name || 'Unnamed Company'),
          logo: company.logo ?? null,
          email: company.email ?? null,
          phone: company.phone ?? null,
          website: company.website ?? null,
          type: company.type ?? null,
        } as AdminSponsorCompany,
        contacts,
        registrants,
      };
    }),
  );

  const bundleByCompanyId = new Map(
    companyBundles
      .filter((bundle): bundle is NonNullable<typeof bundle> => !!bundle)
      .map((bundle) => [bundle.companyId, bundle]),
  );

  return sponsors
    .filter((item: any) => !!item?.id && !!item?.companyId)
    .map((item: any) => {
      const companyId = String(item.companyId);
      const bundle = bundleByCompanyId.get(companyId);
      if (!bundle) return null;
      return {
        id: String(item.id),
        companyId,
        eventId: String(item.eventId || eventId),
        type: (item.type as APITypes.SponsorType | null) ?? null,
        company: bundle.company,
        contacts: bundle.contacts,
        registrants: bundle.registrants,
      } as AdminSponsorRow;
    })
    .filter((row): row is AdminSponsorRow => !!row)
    .sort((a, b) => a.company.name.localeCompare(b.company.name));
}

export async function listAdminSponsorSummaries(
  eventId: string = APS_ID,
): Promise<AdminSponsorSummary[]> {
  const sponsors = await listSponsorsForEvent(eventId);
  const uniqueCompanyIds = Array.from(
    new Set(
      sponsors
        .map((item: any) => item?.companyId)
        .filter((value: any): value is string => !!value)
        .map((value: string) => String(value)),
    ),
  );

  const companies = await Promise.all(
    uniqueCompanyIds.map(async (companyId) => {
      const [companyResp, registrants] = await Promise.all([
        graphqlAuthClient.graphql({
          query: getAPSCompany,
          variables: { id: companyId },
        }),
        listCompanyRegistrants(companyId),
      ]);
      const company = (companyResp as any)?.data?.getAPSCompany;
      if (!company?.id) return null;
      return {
        id: String(company.id),
        name: String(company.name || 'Unnamed Company'),
        email: company.email ?? null,
        logo: company.logo ?? null,
        registrants,
      };
    }),
  );

  const companyById = new Map(
    companies
      .filter((company): company is NonNullable<typeof company> => !!company)
      .map((company) => [company.id, company]),
  );

  return sponsors
    .filter((item: any) => !!item?.id && !!item?.companyId)
    .map((item: any) => {
      const companyId = String(item.companyId);
      const company = companyById.get(companyId);
      if (!company) return null;
      return {
        id: String(item.id),
        companyId,
        companyName: company.name,
        companyEmail: company.email ?? null,
        companyLogo: company.logo ?? null,
        registrantSearchText: company.registrants.flatMap((registrant) => {
          const fullName = `${registrant.firstName || ''} ${registrant.lastName || ''}`.trim();
          return [fullName, registrant.email || ''].filter(Boolean);
        }),
      } as AdminSponsorSummary;
    })
    .filter((row): row is AdminSponsorSummary => !!row)
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
}

export async function getAdminSponsorDetail(
  sponsorId: string,
): Promise<AdminSponsorRow> {
  const sponsorResp = await graphqlAuthClient.graphql({
    query: getApsSponsor,
    variables: { id: sponsorId },
  });
  const sponsor = (sponsorResp as any)?.data?.getApsSponsor;
  if (!sponsor?.id || !sponsor?.companyId) {
    throw new Error('Sponsor not found.');
  }

  const companyId = String(sponsor.companyId);
  const [companyResp, contacts, registrants] = await Promise.all([
    graphqlAuthClient.graphql({
      query: getAPSCompany,
      variables: { id: companyId },
    }),
    listCompanyContacts(companyId),
    listCompanyRegistrants(companyId),
  ]);
  const company = (companyResp as any)?.data?.getAPSCompany;
  if (!company?.id) {
    throw new Error('Sponsor company not found.');
  }

  return {
    id: String(sponsor.id),
    companyId,
    eventId: String(sponsor.eventId || APS_ID),
    type: (sponsor.type as APITypes.SponsorType | null) ?? null,
    company: {
      id: String(company.id),
      name: String(company.name || 'Unnamed Company'),
      logo: company.logo ?? null,
      email: company.email ?? null,
      phone: company.phone ?? null,
      website: company.website ?? null,
      type: company.type ?? null,
    },
    contacts,
    registrants,
  };
}

export async function updateAdminSponsorType(
  sponsorId: string,
  type: APITypes.SponsorType.BOOTH | APITypes.SponsorType.TABLE,
) {
  await graphqlAuthClient.graphql({
    query: updateApsSponsor,
    variables: {
      input: {
        id: sponsorId,
        type,
      },
    },
  });
}

export async function updateAdminSponsorCompanyDetails(input: {
  companyId: string;
  name: string;
  logo?: string;
}) {
  const name = input.name.trim();
  if (!name) throw new Error('Company name is required.');

  await graphqlAuthClient.graphql({
    query: updateAPSCompany,
    variables: {
      input: {
        id: input.companyId,
        name,
        logo: input.logo?.trim() || null,
      },
    },
  });
}
