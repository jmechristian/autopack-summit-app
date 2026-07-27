import * as APITypes from '../../../API';
import { APS_ID } from '../../../config/apsConfig';
import {
  createApsSeatingChartRegistrant,
  adminCreateRegistrant,
  createAPSSpeaker,
  createAPSCompany,
  createAPSCompanyEvents,
  createApsRegistrant,
  updateApsSeatingChartRegistrant,
  updateApsAppUserProfile,
  updateApsRegistrant,
  updateRegistrantAddOnRequest,
} from '../../../graphql/mutations';
import {
  apsAddOnsByEventId,
  apsAppUserProfilesByUserId,
  apsRegistrantsByApsID,
  apsSeatingChartRegistrantsByRegistrantID,
  apsTempCredentialsByRegistrantIdAndCreatedAt,
  aPSCompanyEventsByAPSCompanyId,
  aPSSpeakersByProfileIdAndEventId,
  getApsRegistrant,
  listAPSCompanies,
  profileAffiliatesByProfileId,
  profileEducationsByProfileId,
  profileInterestsByProfileId,
  registrantAddOnRequestsByRegistrantId,
} from '../../../graphql/queries';
import { getAppUserByRegistrantId } from '../../../graphql/customQueries';
import { graphqlAuthClient } from '../../../utils/graphqlClient';

// Set this to your known seating chart id.
export const ADMIN_SEATING_CHART_ID = 'dd6032fa-7bf0-40a3-a70b-6235ccb93fe5';

export type AdminRegistrantListItem = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  attendeeType?: string | null;
  status?: string | null;
};

export type AdminCompanyOption = {
  id: string;
  name: string;
  email?: string | null;
  type?: string | null;
};

export type AdminRegistrantCreateInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyId?: string | null;
  jobTitle?: string;
  attendeeType: APITypes.RegistrantType;
  status: APITypes.RegistrantStatus;
};

const adminReissueRegistrantTempPasswordMutation = /* GraphQL */ `
  mutation AdminReissueRegistrantTempPassword(
    $input: AdminReissueRegistrantTempPasswordInput!
  ) {
    adminReissueRegistrantTempPassword(input: $input) {
      registrantId
      email
      tempPassword
    }
  }
`;

type DetailBundle = {
  registrant: any;
  appUser: any;
  profile: any;
  addOnRequests: any[];
  addOnsById: Record<string, any>;
  latestTempCredential: {
    registrantId: string;
    email: string;
    tempPassword: string;
    createdAt: string;
  } | null;
  seatingRegistrant: {
    id: string;
    tableNumber: number | null;
    category?: string | null;
    role?: string | null;
    notes?: string | null;
    seatingChartID: string;
    registrantID: string;
  } | null;
  companies: AdminCompanyOption[];
};

const adminGetLatestRegistrantTempCredentialQuery = /* GraphQL */ `
  query AdminGetLatestRegistrantTempCredential($registrantId: ID!) {
    adminGetLatestRegistrantTempCredential(registrantId: $registrantId) {
      registrantId
      email
      tempPassword
      createdAt
    }
  }
`;

async function hydrateProfileRelations(profile: any) {
  if (!profile?.id) return profile;
  const [affRespRaw, eduRespRaw, intRespRaw] = await Promise.all([
    graphqlAuthClient.graphql({
      query: profileAffiliatesByProfileId,
      variables: { profileId: profile.id, limit: 100 },
    }),
    graphqlAuthClient.graphql({
      query: profileEducationsByProfileId,
      variables: { profileId: profile.id, limit: 100 },
    }),
    graphqlAuthClient.graphql({
      query: profileInterestsByProfileId,
      variables: { profileId: profile.id, limit: 100 },
    }),
  ]);
  const affItems = (affRespRaw as any)?.data?.profileAffiliatesByProfileId?.items || [];
  const eduItems = (eduRespRaw as any)?.data?.profileEducationsByProfileId?.items || [];
  const intItems = (intRespRaw as any)?.data?.profileInterestsByProfileId?.items || [];
  return {
    ...profile,
    affiliates: { items: affItems.filter(Boolean) },
    education: { items: eduItems.filter(Boolean) },
    interests: { items: intItems.filter(Boolean) },
  };
}

export async function listAdminRegistrants(): Promise<AdminRegistrantListItem[]> {
  let nextToken: string | null | undefined = null;
  const all: AdminRegistrantListItem[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: apsRegistrantsByApsID,
      variables: { apsID: APS_ID, limit: 200, nextToken },
    });
    const data = (resp as any)?.data?.apsRegistrantsByApsID;
    const items = (data?.items || []) as any[];
    all.push(
      ...items.map((item) => ({
        id: item.id,
        firstName: item.firstName,
        lastName: item.lastName,
        email: item.email,
        phone: item.phone,
        companyId: item.companyId,
        companyName: item.company?.name || null,
        attendeeType: item.attendeeType,
        status: item.status,
      })),
    );
    nextToken = data?.nextToken;
  } while (nextToken);

  // Some index queries do not hydrate company relation consistently.
  // Populate company names via company lookup as a reliable fallback.
  const missingCompanyNames = all.some((row) => row.companyId && !row.companyName);
  if (missingCompanyNames) {
    try {
      const companies = await listAdminCompanies();
      const companyNameById = new Map(companies.map((company) => [company.id, company.name]));
      for (const row of all) {
        if (row.companyId && !row.companyName) {
          row.companyName = companyNameById.get(row.companyId) || null;
        }
      }
    } catch {
      // Keep list resilient even if company lookup fails.
    }
  }

  return all.sort((a, b) => {
    const aName = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
    const bName = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
    return aName.localeCompare(bName);
  });
}

export async function listAdminCompanies(): Promise<AdminCompanyOption[]> {
  let nextToken: string | null | undefined = null;
  const companies: AdminCompanyOption[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: listAPSCompanies,
      variables: { limit: 200, nextToken },
    });
    const data = (resp as any)?.data?.listAPSCompanies;
    const items = (data?.items || []) as any[];
    companies.push(
      ...items
        .filter((item) => !!item?.id && !!item?.name)
        .map((item) => ({
          id: item.id,
          name: item.name,
          email: item.email || null,
          type: item.type || null,
        })),
    );
    nextToken = data?.nextToken;
  } while (nextToken);
  return companies.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createAdminCompanyAndAttach(input: {
  name: string;
  email?: string;
  type?: APITypes.CompanyType;
}) {
  const createResp = await graphqlAuthClient.graphql({
    query: createAPSCompany,
    variables: {
      input: {
        name: input.name.trim(),
        email: input.email?.trim() || undefined,
        type: input.type || undefined,
      },
    },
  });
  const companyId = (createResp as any)?.data?.createAPSCompany?.id;
  if (!companyId) throw new Error('Unable to create company.');

  const existingResp = await graphqlAuthClient.graphql({
    query: aPSCompanyEventsByAPSCompanyId,
    variables: { aPSCompanyId: companyId, filter: { aPSId: { eq: APS_ID } }, limit: 1 },
  });
  const existing = (existingResp as any)?.data?.aPSCompanyEventsByAPSCompanyId?.items || [];
  if (!existing.length) {
    await graphqlAuthClient.graphql({
      query: createAPSCompanyEvents,
      variables: { input: { aPSCompanyId: companyId, aPSId: APS_ID } },
    });
  }

  return companyId as string;
}

export async function createAdminRegistrant(input: AdminRegistrantCreateInput) {
  try {
    const adminResp = await graphqlAuthClient.graphql({
      query: adminCreateRegistrant,
      variables: {
        input: {
          apsID: APS_ID,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone?.trim() || undefined,
          companyId: input.companyId || undefined,
          jobTitle: input.jobTitle?.trim() || undefined,
          attendeeType: input.attendeeType,
          status: input.status,
        },
      },
    });
    const created = (adminResp as any)?.data?.adminCreateRegistrant;
    if (created?.id) {
      if (input.attendeeType === APITypes.RegistrantType.SPEAKER) {
        await ensureSpeakerModelForRegistrant(String(created.id), input);
      }
      return {
        id: created.id as string,
        email: String(created.email || ''),
        companyId: (created.companyId as string | null) || null,
        tempPassword: (created.tempPassword as string | null) || null,
      };
    }
  } catch (error: any) {
    const msg = String(error?.message || '');
    const isSchemaNotReady =
      msg.includes('Cannot query field "adminCreateRegistrant"') ||
      msg.includes('Unknown type "AdminCreateRegistrantInput"') ||
      msg.includes('Unsupported invocation');
    if (!isSchemaNotReady) throw error;
  }

  const fallbackResp = await graphqlAuthClient.graphql({
    query: createApsRegistrant,
    variables: {
      input: {
        apsID: APS_ID,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() || undefined,
        companyId: input.companyId || undefined,
        jobTitle: input.jobTitle?.trim() || undefined,
        attendeeType: input.attendeeType,
        status: input.status,
      },
    },
  });

  const registrant = (fallbackResp as any)?.data?.createApsRegistrant;
  if (!registrant?.id) throw new Error('Registrant was not created.');
  if (input.attendeeType === APITypes.RegistrantType.SPEAKER) {
    await ensureSpeakerModelForRegistrant(String(registrant.id), input);
  }
  return {
    id: registrant.id as string,
    email: String(registrant.email || ''),
    companyId: (registrant.companyId as string | null) || null,
    tempPassword: null as string | null,
  };
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureSpeakerModelForRegistrant(
  registrantId: string,
  input: Pick<AdminRegistrantCreateInput, 'firstName' | 'lastName'>,
) {
  let profile: any = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const appUserResp = await graphqlAuthClient.graphql({
      query: getAppUserByRegistrantId,
      variables: { registrantId },
    });
    const appUser = (appUserResp as any)?.data?.apsAppUsersByRegistrantId?.items?.find(Boolean);
    profile = appUser?.profile || null;
    if (profile?.id) break;
    await delay(350);
  }

  if (!profile?.id) {
    throw new Error(
      'Registrant was created as speaker, but app user profile was not found to create speaker model.',
    );
  }

  const existingResp = await graphqlAuthClient.graphql({
    query: aPSSpeakersByProfileIdAndEventId,
    variables: {
      profileId: profile.id,
      eventId: { eq: APS_ID },
      limit: 1,
    },
  });
  const existing = (existingResp as any)?.data?.aPSSpeakersByProfileIdAndEventId?.items?.find(Boolean);
  if (existing?.id) return;

  const presentationTitle =
    `${input.firstName?.trim() || ''} ${input.lastName?.trim() || ''}`.trim() || 'Speaker Session';
  const createSpeakerResp = await graphqlAuthClient.graphql({
    query: createAPSSpeaker,
    variables: {
      input: {
        profileId: profile.id,
        eventId: APS_ID,
        presentationTitle: `${presentationTitle} Session`,
      },
    },
  });
  const speakerId = (createSpeakerResp as any)?.data?.createAPSSpeaker?.id;
  if (!speakerId) {
    throw new Error('Registrant was created as speaker, but speaker model creation failed.');
  }
  await graphqlAuthClient.graphql({
    query: updateApsAppUserProfile,
    variables: { input: { id: profile.id, speakerId } },
  });
}

export async function getAdminRegistrantDetail(registrantId: string): Promise<DetailBundle> {
  const [registrantResp, appUserResp, addOnReqResp, tempCredResp, companiesResp, addOnsResp, seatingByRegistrantResp] =
    await Promise.all([
    graphqlAuthClient.graphql({ query: getApsRegistrant, variables: { id: registrantId } }),
    graphqlAuthClient.graphql({ query: getAppUserByRegistrantId, variables: { registrantId } }),
    graphqlAuthClient.graphql({ query: registrantAddOnRequestsByRegistrantId, variables: { registrantId, limit: 300 } }),
    graphqlAuthClient.graphql({
      query: apsTempCredentialsByRegistrantIdAndCreatedAt,
      variables: { registrantId, sortDirection: 'DESC', limit: 1 },
    }),
    listAdminCompanies(),
    graphqlAuthClient.graphql({ query: apsAddOnsByEventId, variables: { eventId: APS_ID, limit: 300 } }),
    graphqlAuthClient.graphql({
      query: apsSeatingChartRegistrantsByRegistrantID,
      variables: { registrantID: registrantId, limit: 1 },
    }),
    ]);

  const registrant = (registrantResp as any)?.data?.getApsRegistrant || null;
  const appUser = (appUserResp as any)?.data?.apsAppUsersByRegistrantId?.items?.[0] || null;
  let profile = appUser?.profile || null;
  if (!profile && appUser?.id) {
    const profileResp = await graphqlAuthClient.graphql({
      query: apsAppUserProfilesByUserId,
      variables: { userId: appUser.id, limit: 1 },
    });
    profile = (profileResp as any)?.data?.apsAppUserProfilesByUserId?.items?.find(Boolean) || null;
  }
  if (profile) {
    profile = await hydrateProfileRelations(profile);
  }

  const addOnRequests = (addOnReqResp as any)?.data?.registrantAddOnRequestsByRegistrantId?.items || [];
  const addOnItems = (addOnsResp as any)?.data?.apsAddOnsByEventId?.items || [];
  const addOnsById = addOnItems.reduce((acc: Record<string, any>, item: any) => {
    if (item?.id) acc[item.id] = item;
    return acc;
  }, {});
  const latestEncryptedTempCredential =
    (tempCredResp as any)?.data?.apsTempCredentialsByRegistrantIdAndCreatedAt?.items?.[0] || null;
  let latestTempCredential: DetailBundle['latestTempCredential'] = null;
  try {
    const latestTempResp = await graphqlAuthClient.graphql({
      query: adminGetLatestRegistrantTempCredentialQuery,
      variables: { registrantId },
    });
    const latest = (latestTempResp as any)?.data?.adminGetLatestRegistrantTempCredential || null;
    if (latest?.tempPassword) {
      latestTempCredential = {
        registrantId: String(latest.registrantId || registrantId),
        email: String(latest.email || ''),
        tempPassword: String(latest.tempPassword),
        createdAt: String(latest.createdAt || latestEncryptedTempCredential?.createdAt || ''),
      };
    }
  } catch {
    // Keep the detail screen resilient if backend schema/lambda isn't deployed yet.
  }
  const seatingRegistrantFromIndex =
    (seatingByRegistrantResp as any)?.data?.apsSeatingChartRegistrantsByRegistrantID?.items?.find(Boolean) || null;
  const seatingRegistrant = registrant?.seatingChartRegistrant || seatingRegistrantFromIndex || null;

  return {
    registrant,
    appUser,
    profile,
    addOnRequests,
    addOnsById,
    latestTempCredential,
    seatingRegistrant,
    companies: companiesResp as unknown as AdminCompanyOption[],
  };
}

export async function updateRegistrantEmailAndProfile(
  registrantId: string,
  email: string,
  profileId?: string | null,
) {
  await graphqlAuthClient.graphql({
    query: updateApsRegistrant,
    variables: { input: { id: registrantId, email: email.trim().toLowerCase() } },
  });
  if (profileId) {
    await graphqlAuthClient.graphql({
      query: updateApsAppUserProfile,
      variables: { input: { id: profileId, email: email.trim().toLowerCase() } },
    });
  }
}

export async function updateRegistrantCompanyAndProfile(params: {
  registrantId: string;
  companyId?: string | null;
  profileId?: string | null;
  companyName?: string | null;
}) {
  await graphqlAuthClient.graphql({
    query: updateApsRegistrant,
    variables: { input: { id: params.registrantId, companyId: params.companyId || null } },
  });
  if (params.profileId) {
    await graphqlAuthClient.graphql({
      query: updateApsAppUserProfile,
      variables: { input: { id: params.profileId, company: params.companyName || '' } },
    });
  }
}

export async function updateRegistrantApprovalStatus(
  registrantId: string,
  status: APITypes.RegistrantStatus,
) {
  await graphqlAuthClient.graphql({
    query: updateApsRegistrant,
    variables: {
      input: {
        id: registrantId,
        status,
        approvedAt: status === APITypes.RegistrantStatus.APPROVED ? new Date().toISOString() : null,
      },
    },
  });
}

export async function updateAdminRegistrantProfile(params: {
  profileId: string;
  registrantId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  attendeeType?: APITypes.RegistrantType;
  location?: string;
  bio?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
  profilePicture?: string;
}) {
  await graphqlAuthClient.graphql({
    query: updateApsAppUserProfile,
    variables: {
      input: {
        id: params.profileId,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
        jobTitle: params.jobTitle,
        attendeeType: params.attendeeType,
        location: params.location,
        bio: params.bio,
        linkedin: params.linkedin,
        twitter: params.twitter,
        facebook: params.facebook,
        instagram: params.instagram,
        youtube: params.youtube,
        website: params.website,
        profilePicture: params.profilePicture,
      },
    },
  });
  if (params.attendeeType) {
    await graphqlAuthClient.graphql({
      query: updateApsRegistrant,
      variables: { input: { id: params.registrantId, attendeeType: params.attendeeType } },
    });
  }
}

export async function updateRegistrantAttendeeType(params: {
  registrantId: string;
  attendeeType: APITypes.RegistrantType;
  profileId?: string | null;
}) {
  await graphqlAuthClient.graphql({
    query: updateApsRegistrant,
    variables: { input: { id: params.registrantId, attendeeType: params.attendeeType } },
  });
  if (params.profileId) {
    await graphqlAuthClient.graphql({
      query: updateApsAppUserProfile,
      variables: { input: { id: params.profileId, attendeeType: params.attendeeType } },
    });
  }
}

export async function updateAdminAddOnRequestStatus(requestId: string, status: string) {
  await graphqlAuthClient.graphql({
    query: updateRegistrantAddOnRequest,
    variables: {
      input: {
        id: requestId,
        status,
      },
    },
  });
}

export async function upsertRegistrantTableNumber(input: {
  registrantId: string;
  seatingRegistrantId?: string | null;
  tableNumber: number | null;
  category?: string | null;
  role?: string | null;
  notes?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
}) {
  if (input.seatingRegistrantId) {
    await graphqlAuthClient.graphql({
      query: updateApsSeatingChartRegistrant,
      variables: {
        input: {
          id: input.seatingRegistrantId,
          tableNumber: input.tableNumber,
          category: input.category ?? undefined,
          role: input.role ?? undefined,
          notes: input.notes ?? undefined,
        },
      },
    });
    return;
  }

  if (
    !ADMIN_SEATING_CHART_ID ||
    ADMIN_SEATING_CHART_ID === 'REPLACE_WITH_SEATING_CHART_ID'
  ) {
    throw new Error('Set ADMIN_SEATING_CHART_ID in adminRegistrantsService.ts before saving table assignments.');
  }

  const seatingChartID = ADMIN_SEATING_CHART_ID;
  await graphqlAuthClient.graphql({
    query: createApsSeatingChartRegistrant,
    variables: {
      input: {
        seatingChartID,
        registrantID: input.registrantId,
        tableNumber: input.tableNumber,
        category: input.category ?? undefined,
        role: input.role ?? undefined,
        notes: input.notes ?? undefined,
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
        company: input.company ?? undefined,
        email: input.email ?? undefined,
      },
    },
  });
}

export async function reissueAdminRegistrantTempPassword(input: {
  registrantId: string;
  email?: string;
}) {
  const resp = await graphqlAuthClient.graphql({
    query: adminReissueRegistrantTempPasswordMutation,
    variables: { input },
  });
  const out = (resp as any)?.data?.adminReissueRegistrantTempPassword;
  if (!out?.registrantId || !out?.tempPassword) {
    throw new Error('No temporary password returned.');
  }
  return {
    registrantId: String(out.registrantId),
    email: String(out.email || ''),
    tempPassword: String(out.tempPassword),
  };
}

