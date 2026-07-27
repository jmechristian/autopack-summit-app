import * as APITypes from '../../../API';
import {
  createAPSSpeaker,
  deleteAPSSpeaker,
  deleteApsAppUserFavoriteSpeaker,
  deleteSessionSpeakers,
  updateAPSSpeaker,
  updateApsRegistrant,
  updateApsAppUserProfile,
} from '../../../graphql/mutations';
import {
  aPSSpeakersByEventId,
  aPSSpeakersByProfileIdAndEventId,
  apsAppUserFavoriteSpeakersBySpeakerIdAndCreatedAt,
  getAPSSpeaker,
  getApsAppUserProfile,
  sessionSpeakersByAPSSpeakerId,
} from '../../../graphql/queries';
import { getAppUserByRegistrantId } from '../../../graphql/customQueries';
import { graphqlAuthClient } from '../../../utils/graphqlClient';
import { APS_ID } from '../../../config/apsConfig';

export type AdminSpeakerSummary = {
  id: string;
  profileId: string;
  company?: string | null;
  fullName: string;
  email?: string | null;
  profilePicture?: string | null;
};

export type AdminSpeakerDetail = {
  id: string;
  profileId: string;
  eventId: string;
  presentationTitle?: string | null;
  presentationSummary?: string | null;
  profile: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    jobTitle?: string | null;
    attendeeType?: string | null;
    profilePicture?: string | null;
    bio?: string | null;
    linkedin?: string | null;
    website?: string | null;
    location?: string | null;
    speakerId?: string | null;
  };
};

function fullName(first?: string | null, last?: string | null) {
  return `${first || ''} ${last || ''}`.trim() || 'Unnamed Speaker';
}

export async function listAdminSpeakersSummaries(
  eventId: string = APS_ID,
): Promise<AdminSpeakerSummary[]> {
  let nextToken: string | null | undefined = null;
  const items: any[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: aPSSpeakersByEventId,
      variables: { eventId, limit: 200, nextToken },
    });
    const data = (resp as any)?.data?.aPSSpeakersByEventId;
    items.push(...(data?.items || []));
    nextToken = data?.nextToken;
  } while (nextToken);

  const summaries = await Promise.all(
    items
      .filter((item) => !!item?.id && !!item?.profileId)
      .map(async (item) => {
        const speakerResp = await graphqlAuthClient.graphql({
          query: getAPSSpeaker,
          variables: { id: item.id },
        });
        const speaker = (speakerResp as any)?.data?.getAPSSpeaker;
        const profile = speaker?.profile;
        if (!speaker?.id || !profile?.id) return null;
        return {
          id: String(speaker.id),
          profileId: String(profile.id),
          fullName: fullName(profile.firstName, profile.lastName),
          email: profile.email ?? null,
          company: profile.company ?? null,
          profilePicture: profile.profilePicture ?? null,
        } as AdminSpeakerSummary;
      }),
  );

  return summaries
    .filter((row): row is AdminSpeakerSummary => !!row)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getAdminSpeakerDetail(
  speakerId: string,
): Promise<AdminSpeakerDetail> {
  const speakerResp = await graphqlAuthClient.graphql({
    query: getAPSSpeaker,
    variables: { id: speakerId },
  });
  const speaker = (speakerResp as any)?.data?.getAPSSpeaker;
  if (!speaker?.id || !speaker?.profile?.id) {
    throw new Error('Speaker not found.');
  }

  return {
    id: String(speaker.id),
    profileId: String(speaker.profile.id),
    eventId: String(speaker.eventId || APS_ID),
    presentationTitle: speaker.presentationTitle ?? null,
    presentationSummary: speaker.presentationSummary ?? null,
    profile: {
      id: String(speaker.profile.id),
      firstName: speaker.profile.firstName ?? null,
      lastName: speaker.profile.lastName ?? null,
      email: speaker.profile.email ?? null,
      phone: speaker.profile.phone ?? null,
      company: speaker.profile.company ?? null,
      jobTitle: speaker.profile.jobTitle ?? null,
      attendeeType: speaker.profile.attendeeType ?? null,
      profilePicture: speaker.profile.profilePicture ?? null,
      bio: speaker.profile.bio ?? null,
      linkedin: speaker.profile.linkedin ?? null,
      website: speaker.profile.website ?? null,
      location: speaker.profile.location ?? null,
      speakerId: speaker.profile.speakerId ?? null,
    },
  };
}

export async function updateAdminSpeakerPresentation(input: {
  speakerId: string;
  presentationTitle?: string;
  presentationSummary?: string;
}) {
  await graphqlAuthClient.graphql({
    query: updateAPSSpeaker,
    variables: {
      input: {
        id: input.speakerId,
        presentationTitle: input.presentationTitle?.trim() || null,
        presentationSummary: input.presentationSummary?.trim() || null,
      },
    },
  });
}

export async function updateAdminSpeakerProfile(input: {
  profileId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  bio?: string;
  linkedin?: string;
  website?: string;
  location?: string;
  profilePicture?: string;
}) {
  await graphqlAuthClient.graphql({
    query: updateApsAppUserProfile,
    variables: {
      input: {
        id: input.profileId,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        company: input.company?.trim() || null,
        jobTitle: input.jobTitle?.trim() || null,
        bio: input.bio?.trim() || null,
        linkedin: input.linkedin?.trim() || null,
        website: input.website?.trim() || null,
        location: input.location?.trim() || null,
        profilePicture: input.profilePicture?.trim() || null,
      },
    },
  });
}

export async function createSpeakerFromRegistrant(
  registrantId: string,
  eventId: string = APS_ID,
): Promise<string> {
  const appUserResp = await graphqlAuthClient.graphql({
    query: getAppUserByRegistrantId,
    variables: { registrantId },
  });
  const appUser = (appUserResp as any)?.data?.apsAppUsersByRegistrantId?.items?.find(Boolean);
  const profile = appUser?.profile;
  if (!profile?.id) {
    throw new Error('Registrant profile not found. Ensure app user profile exists first.');
  }

  const existingResp = await graphqlAuthClient.graphql({
    query: aPSSpeakersByProfileIdAndEventId,
    variables: {
      profileId: profile.id,
      eventId: { eq: eventId },
      limit: 1,
    },
  });
  const existing = (existingResp as any)?.data?.aPSSpeakersByProfileIdAndEventId?.items?.find(Boolean);
  if (existing?.id) {
    await graphqlAuthClient.graphql({
      query: updateApsAppUserProfile,
      variables: {
        input: { id: profile.id, speakerId: existing.id, attendeeType: APITypes.RegistrantType.SPEAKER },
      },
    });
    if (appUser?.registrantId) {
      await graphqlAuthClient.graphql({
        query: updateApsRegistrant,
        variables: {
          input: { id: appUser.registrantId, attendeeType: APITypes.RegistrantType.SPEAKER },
        },
      });
    }
    return String(existing.id);
  }

  const createResp = await graphqlAuthClient.graphql({
    query: createAPSSpeaker,
    variables: {
      input: {
        profileId: profile.id,
        eventId,
        presentationTitle: `${fullName(profile.firstName, profile.lastName)} Session`,
      },
    },
  });
  const speakerId = (createResp as any)?.data?.createAPSSpeaker?.id;
  if (!speakerId) throw new Error('Unable to create speaker model.');

  await graphqlAuthClient.graphql({
    query: updateApsAppUserProfile,
    variables: {
      input: { id: profile.id, speakerId, attendeeType: APITypes.RegistrantType.SPEAKER },
    },
  });
  if (appUser?.registrantId) {
    await graphqlAuthClient.graphql({
      query: updateApsRegistrant,
      variables: {
        input: { id: appUser.registrantId, attendeeType: APITypes.RegistrantType.SPEAKER },
      },
    });
  }
  return String(speakerId);
}

async function listSessionSpeakerLinks(speakerId: string) {
  let nextToken: string | null | undefined = null;
  const items: { id: string }[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: sessionSpeakersByAPSSpeakerId,
      variables: { aPSSpeakerId: speakerId, limit: 200, nextToken },
    });
    const data = (resp as any)?.data?.sessionSpeakersByAPSSpeakerId;
    for (const item of data?.items || []) {
      if (item?.id) items.push({ id: String(item.id) });
    }
    nextToken = data?.nextToken;
  } while (nextToken);
  return items;
}

async function listSpeakerFavorites(speakerId: string) {
  let nextToken: string | null | undefined = null;
  const items: { id: string }[] = [];
  do {
    const resp = await graphqlAuthClient.graphql({
      query: apsAppUserFavoriteSpeakersBySpeakerIdAndCreatedAt,
      variables: { speakerId, limit: 200, nextToken },
    });
    const data = (resp as any)?.data?.apsAppUserFavoriteSpeakersBySpeakerIdAndCreatedAt;
    for (const item of data?.items || []) {
      if (item?.id) items.push({ id: String(item.id) });
    }
    nextToken = data?.nextToken;
  } while (nextToken);
  return items;
}

export async function removeAdminSpeaker(speakerId: string) {
  const detail = await getAdminSpeakerDetail(speakerId);
  const profileId = detail.profileId;

  const [sessionLinks, favorites] = await Promise.all([
    listSessionSpeakerLinks(speakerId),
    listSpeakerFavorites(speakerId),
  ]);

  await Promise.all([
    ...sessionLinks.map((link) =>
      graphqlAuthClient.graphql({
        query: deleteSessionSpeakers,
        variables: { input: { id: link.id } },
      }),
    ),
    ...favorites.map((favorite) =>
      graphqlAuthClient.graphql({
        query: deleteApsAppUserFavoriteSpeaker,
        variables: { input: { id: favorite.id } },
      }),
    ),
  ]);

  const profileResp = await graphqlAuthClient.graphql({
    query: getApsAppUserProfile,
    variables: { id: profileId },
  });
  const profile = (profileResp as any)?.data?.getApsAppUserProfile;
  const registrantId = profile?.user?.registrantId ? String(profile.user.registrantId) : null;
  const profileWasSpeaker = profile?.attendeeType === APITypes.RegistrantType.SPEAKER;

  await graphqlAuthClient.graphql({
    query: updateApsAppUserProfile,
    variables: {
      input: {
        id: profileId,
        speakerId: null,
        ...(profileWasSpeaker ? { attendeeType: null } : {}),
      },
    },
  });

  if (registrantId && profileWasSpeaker) {
    await graphqlAuthClient.graphql({
      query: updateApsRegistrant,
      variables: { input: { id: registrantId, attendeeType: null } },
    });
  }

  await graphqlAuthClient.graphql({
    query: deleteAPSSpeaker,
    variables: { input: { id: speakerId } },
  });
}
