import { APS_ID } from '../config/apsConfig';
import {
  getCertificateOfCompletion as getCertificateQuery,
  setCertificateOfCompletion as setCertificateMutation,
} from '../graphql/certificateOfCompletionOps';
import { graphqlApiKeyClient, graphqlAuthClient } from '../utils/graphqlClient';

export type CertificateOfCompletionGate = {
  open: boolean;
  url: string;
};

function graphqlMessage(error: unknown) {
  const message = String((error as { message?: string })?.message || error || '');
  const errors = (error as { errors?: { message?: string }[] })?.errors || [];
  return [message, ...errors.map((item) => item?.message || '')].join(' ');
}

export function isCertificateSchemaError(error: unknown) {
  return /cannot query field|unknown type|undefined field|fieldundefined|no matching resolver|is not defined for input|input object type/i.test(
    graphqlMessage(error),
  );
}

function asGate(raw: any): CertificateOfCompletionGate {
  return {
    open: !!raw?.certificateOfCompletionOpen,
    url: String(raw?.certificateOfCompletionUrl || '').trim(),
  };
}

export async function getCertificateOfCompletion(
  eventId = APS_ID,
): Promise<CertificateOfCompletionGate> {
  try {
    const resp = await graphqlApiKeyClient.graphql({
      query: getCertificateQuery,
      variables: { id: eventId },
    });
    return asGate((resp as any)?.data?.getAPS);
  } catch (error) {
    if (isCertificateSchemaError(error)) return { open: false, url: '' };
    throw error;
  }
}

export async function setCertificateOfCompletion(
  input: { open?: boolean; url?: string },
  eventId = APS_ID,
): Promise<CertificateOfCompletionGate> {
  const payload: Record<string, unknown> = { id: eventId };
  if (typeof input.open === 'boolean') payload.certificateOfCompletionOpen = input.open;
  if (typeof input.url === 'string') payload.certificateOfCompletionUrl = input.url.trim() || null;
  const resp = await graphqlAuthClient.graphql({
    query: setCertificateMutation,
    variables: { input: payload },
  });
  return asGate((resp as any)?.data?.updateAPS);
}
