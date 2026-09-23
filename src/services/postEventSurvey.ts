import { APS_ID } from '../config/apsConfig';
import {
  postEventSurveyKey,
  type PostEventSurveyIdentity,
  type PostEventSurveySessionRating,
} from '../config/postEventSurvey';
import {
  adminPostEventSurveysByEvent,
  apsPostEventSurveysBySurveyKey,
  createApsPostEventSurvey,
  deleteApsPostEventSurvey,
  getApsPostEventSurvey,
  getPostEventSurveyOpen as getPostEventSurveyOpenQuery,
  setPostEventSurveyOpen as setPostEventSurveyOpenMutation,
} from '../graphql/postEventSurveyOps';
import { graphqlApiKeyClient, graphqlAuthClient } from '../utils/graphqlClient';
import { drainIndexedList } from '../utils/paginateGraphql';

export type PostEventSurveyRecord = {
  id: string;
  registrantId: string;
  surveyKey: string;
  completedAt?: string | null;
};

export type SubmitPostEventSurveyInput = {
  userId: string;
  registrantId: string;
  identityType: PostEventSurveyIdentity;
  mostBeneficial?: string;
  leastBeneficial?: string;
  summitRating: number;
  gainedValue: boolean;
  gainedValueComments?: string;
  favoritePresentation?: string;
  sessionRatings: PostEventSurveySessionRating[];
  networkGrowthRating: number;
  improvementSuggestions?: string;
  recommendName?: string;
  recommendCompany?: string;
  recommendEmail?: string;
  recommendPhone?: string;
};

function graphqlMessage(error: unknown) {
  const message = String((error as { message?: string })?.message || error || '');
  const errors = (error as { errors?: { message?: string }[] })?.errors || [];
  return [message, ...errors.map((item) => item?.message || '')].join(' ');
}

export function isPostEventSurveySchemaError(error: unknown) {
  return /cannot query field|unknown type|undefined field|fieldundefined|no matching resolver|is not defined for input|input object type/i.test(
    graphqlMessage(error),
  );
}

export function isPostEventSurveyDuplicateError(error: unknown) {
  return /conditional|already exists|duplicate/i.test(graphqlMessage(error));
}

function asSurvey(raw: any): PostEventSurveyRecord | null {
  if (!raw?.id) return null;
  return {
    id: String(raw.id),
    registrantId: String(raw.registrantId || ''),
    surveyKey: String(raw.surveyKey || raw.id),
    completedAt: raw.completedAt || raw.createdAt || null,
  };
}

export async function getMyPostEventSurvey(
  registrantId: string,
  eventId = APS_ID,
): Promise<PostEventSurveyRecord | null> {
  const surveyKey = postEventSurveyKey(registrantId, eventId);

  try {
    const byId = await graphqlAuthClient.graphql({
      query: getApsPostEventSurvey,
      variables: { id: surveyKey },
    });
    const found = asSurvey((byId as any)?.data?.getApsPostEventSurvey);
    if (found) return found;
  } catch (error) {
    if (isPostEventSurveySchemaError(error)) throw error;
  }

  const byKey = await graphqlAuthClient.graphql({
    query: apsPostEventSurveysBySurveyKey,
    variables: { surveyKey, limit: 1 },
  });
  const items = (byKey as any)?.data?.apsPostEventSurveysBySurveyKey?.items || [];
  return asSurvey(items.find((item: any) => item?.id)) || null;
}

function cleanText(value?: string) {
  const trimmed = String(value || '').trim();
  return trimmed || null;
}

export async function submitPostEventSurvey(
  input: SubmitPostEventSurveyInput,
  eventId = APS_ID,
): Promise<PostEventSurveyRecord> {
  const surveyKey = postEventSurveyKey(input.registrantId, eventId);
  const completedAt = new Date().toISOString();
  const payload = {
    id: surveyKey,
    eventId,
    registrantId: input.registrantId,
    userId: input.userId,
    surveyKey,
    identityType: input.identityType,
    mostBeneficial: cleanText(input.mostBeneficial),
    leastBeneficial: cleanText(input.leastBeneficial),
    summitRating: input.summitRating,
    gainedValue: input.gainedValue,
    gainedValueComments: cleanText(input.gainedValueComments),
    favoritePresentation: cleanText(input.favoritePresentation),
    sessionRatings: JSON.stringify(input.sessionRatings),
    networkGrowthRating: input.networkGrowthRating,
    improvementSuggestions: cleanText(input.improvementSuggestions),
    recommendName: cleanText(input.recommendName),
    recommendCompany: cleanText(input.recommendCompany),
    recommendEmail: cleanText(input.recommendEmail),
    recommendPhone: cleanText(input.recommendPhone),
    completedAt,
  };

  try {
    const created = await graphqlAuthClient.graphql({
      query: createApsPostEventSurvey,
      variables: { input: payload },
    });
    const record = asSurvey((created as any)?.data?.createApsPostEventSurvey);
    if (record) return record;
  } catch (error) {
    if (isPostEventSurveySchemaError(error)) throw error;
    if (!isPostEventSurveyDuplicateError(error)) {
      const existing = await getMyPostEventSurvey(input.registrantId, eventId);
      if (existing) return existing;
      throw error;
    }
  }

  const existing = await getMyPostEventSurvey(input.registrantId, eventId);
  if (existing) return existing;
  throw new Error('Survey was recorded, but we could not load the confirmation.');
}

export async function getPostEventSurveyOpen(eventId = APS_ID): Promise<boolean> {
  try {
    const resp = await graphqlApiKeyClient.graphql({
      query: getPostEventSurveyOpenQuery,
      variables: { id: eventId },
    });
    return !!(resp as any)?.data?.getAPS?.postEventSurveyOpen;
  } catch (error) {
    if (isPostEventSurveySchemaError(error)) return false;
    throw error;
  }
}

export async function setPostEventSurveyOpen(open: boolean, eventId = APS_ID): Promise<boolean> {
  const resp = await graphqlAuthClient.graphql({
    query: setPostEventSurveyOpenMutation,
    variables: { input: { id: eventId, postEventSurveyOpen: open } },
  });
  return !!(resp as any)?.data?.updateAPS?.postEventSurveyOpen;
}

export type PostEventSurveyCompletion = {
  id: string;
  registrantId: string;
  completedAt?: string | null;
  identityType?: string | null;
  name: string;
  email?: string | null;
  company?: string | null;
  summitRating?: number | null;
  gainedValue?: boolean | null;
  gainedValueComments?: string | null;
  mostBeneficial?: string | null;
  leastBeneficial?: string | null;
  favoritePresentation?: string | null;
  networkGrowthRating?: number | null;
  improvementSuggestions?: string | null;
  recommendName?: string | null;
  recommendCompany?: string | null;
  recommendEmail?: string | null;
  recommendPhone?: string | null;
  sessionRatings: PostEventSurveySessionRating[];
};

function parseSessionRatings(raw: unknown): PostEventSurveySessionRating[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const id = String(item?.id || '').trim();
      const rating = Number(item?.rating);
      if (!id || !Number.isFinite(rating)) return [];
      return [{ id, rating }];
    });
  } catch {
    return [];
  }
}

function asCompletion(raw: any): PostEventSurveyCompletion | null {
  if (!raw?.id) return null;
  const first = String(raw?.registrant?.firstName || '').trim();
  const last = String(raw?.registrant?.lastName || '').trim();
  return {
    id: String(raw.id),
    registrantId: String(raw.registrantId || ''),
    completedAt: raw.completedAt || null,
    identityType: raw.identityType || null,
    name: `${first} ${last}`.trim() || 'Attendee',
    email: raw?.registrant?.email || null,
    company: raw?.registrant?.company?.name || null,
    summitRating: raw.summitRating ?? null,
    gainedValue: typeof raw.gainedValue === 'boolean' ? raw.gainedValue : null,
    gainedValueComments: raw.gainedValueComments || null,
    mostBeneficial: raw.mostBeneficial || null,
    leastBeneficial: raw.leastBeneficial || null,
    favoritePresentation: raw.favoritePresentation || null,
    networkGrowthRating: raw.networkGrowthRating ?? null,
    improvementSuggestions: raw.improvementSuggestions || null,
    recommendName: raw.recommendName || null,
    recommendCompany: raw.recommendCompany || null,
    recommendEmail: raw.recommendEmail || null,
    recommendPhone: raw.recommendPhone || null,
    sessionRatings: parseSessionRatings(raw.sessionRatings),
  };
}

export async function deletePostEventSurvey(id: string): Promise<void> {
  await graphqlAuthClient.graphql({
    query: deleteApsPostEventSurvey,
    variables: { input: { id } },
  });
}

export async function listPostEventSurveyCompletions(
  eventId = APS_ID,
): Promise<PostEventSurveyCompletion[]> {
  const rows = await drainIndexedList<any>({
    client: graphqlAuthClient,
    query: adminPostEventSurveysByEvent,
    field: 'apsPostEventSurveysByEventIdAndCreatedAt',
    variables: { eventId, sortDirection: 'DESC' },
  });
  return rows.map(asCompletion).filter((row): row is PostEventSurveyCompletion => !!row);
}
