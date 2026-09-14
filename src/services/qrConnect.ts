import { APS_ID } from '../config/apsConfig';
import { useApsStore } from '../store/apsStore';
import { useEngageStore } from '../store/engageStore';
import { graphqlApiKeyClient } from '../utils/graphqlClient';

const getProfileUserIdMinimal = /* GraphQL */ `
  query QrConnectGetProfileUserId($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      userId
      __typename
    }
  }
`;

export type QrConnectResult = {
  isSelf: boolean;
  connected: boolean;
  blocked: boolean;
};

async function lookupUserId(profileId: string): Promise<string | null> {
  try {
    const resp = await graphqlApiKeyClient.graphql({
      query: getProfileUserIdMinimal,
      variables: { id: profileId },
    });
    return ((resp.data as any)?.getApsAppUserProfile?.userId as string | null) || null;
  } catch {
    return null;
  }
}

/**
 * Treat scanning an attendee QR as an in-person handshake: create/accept the
 * contact request and unlock messaging. No-op for your own code.
 */
export async function connectFromAttendeeScan(params: {
  profileId: string;
  userId?: string | null;
}): Promise<QrConnectResult> {
  const me = useApsStore.getState().currentAppUser;
  const myProfileId = me?.profileId || me?.profile?.id || null;
  const myUserId = me?.id || null;
  const otherUserId = params.userId || (await lookupUserId(params.profileId)) || '';

  const isSelf =
    (!!myProfileId && myProfileId === params.profileId) ||
    (!!myUserId && !!otherUserId && myUserId === otherUserId);

  if (isSelf) {
    return { isSelf: true, connected: false, blocked: false };
  }
  if (!otherUserId) {
    return { isSelf: false, connected: false, blocked: false };
  }

  const result = await useEngageStore.getState().connectViaQrScan({
    eventId: APS_ID,
    otherUserId,
    otherProfileId: params.profileId,
  });

  return {
    isSelf: false,
    connected: result.status === 'ACCEPTED',
    blocked: result.status === 'BLOCKED',
  };
}
