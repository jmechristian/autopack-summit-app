import { APS_ID } from '../config/apsConfig';
import {
  postEventSurveyKey,
  type PostEventSurveyIdentity,
  type PostEventSurveySessionRating,
} from '../config/postEventSurvey';
import {
  apsPostEventSurveysBySurveyKey,
  createApsPostEventSurvey,
  getApsPostEventSurvey,
} from '../graphql/postEventSurveyOps';
import { graphqlAuthClient } from '../utils/graphqlClient';

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
  return /cannot query field|unknown type|undefined field|no matching resolver/i.test(
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
