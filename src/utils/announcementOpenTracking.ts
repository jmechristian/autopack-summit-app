import { getCurrentUser } from 'aws-amplify/auth';
import { APS_ID } from '../config/apsConfig';
import { graphqlAuthClient } from './graphqlClient';

const CREATE_ANNOUNCEMENT_OPEN = /* GraphQL */ `
  mutation CreateApsAnnouncementOpen($input: CreateApsAnnouncementOpenInput!) {
    createApsAnnouncementOpen(input: $input) {
      id
    }
  }
`;

export async function recordAnnouncementOpen(params: {
  announcementId?: string | null;
  source: 'push' | 'in-app';
}): Promise<void> {
  const announcementId = String(params.announcementId || '').trim();
  if (!announcementId) return;

  try {
    const user = await getCurrentUser();
    const userId = user.userId;
    if (!userId) return;

    await graphqlAuthClient.graphql({
      query: CREATE_ANNOUNCEMENT_OPEN,
      variables: {
        input: {
          id: `o:${announcementId}|u:${userId}`,
          announcementId,
          eventId: APS_ID,
          userId,
          source: params.source,
        },
      },
    });
  } catch {
    // Schema may not be live yet, or this user already opened it.
  }
}
