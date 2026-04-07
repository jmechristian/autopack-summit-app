// src/utils/profileMutations.ts
import { graphqlApiKeyClient, graphqlAuthClient } from './graphqlClient';
import * as APITypes from '../API';
import {
  createProfileAffiliate,
  updateProfileAffiliate,
  deleteProfileAffiliate,
  createProfileEducation,
  updateProfileEducation,
  deleteProfileEducation,
  createProfileInterest,
  updateProfileInterest,
  deleteProfileInterest,
} from '../graphql/mutations';

// Use a minimal selection set to avoid auth errors on unrelated nested fields
// included by Amplify-generated mutation documents.
const updateApsAppUserProfileSafe = /* GraphQL */ `
  mutation UpdateApsAppUserProfileSafe(
    $input: UpdateApsAppUserProfileInput!
  ) {
    updateApsAppUserProfile(input: $input) {
      id
      updatedAt
    }
  }
`;

function isUnauthorizedError(error: any): boolean {
  const message = String(error?.message || '');
  if (message.toLowerCase().includes('not authorized')) return true;

  const firstError = error?.errors?.[0] || error?.cause?.errors?.[0];
  const errorType = String(firstError?.errorType || '');
  const gqlMessage = String(firstError?.message || '');
  return (
    errorType.toLowerCase() === 'unauthorized' ||
    gqlMessage.toLowerCase().includes('not authorized')
  );
}

function responseHasUnauthorizedErrors(response: any): boolean {
  const errors = response?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return false;
  return errors.some((err: any) => {
    const errorType = String(err?.errorType || '').toLowerCase();
    const message = String(err?.message || '').toLowerCase();
    return errorType === 'unauthorized' || message.includes('not authorized');
  });
}

function responseHasAnyErrors(response: any): boolean {
  return Array.isArray(response?.errors) && response.errors.length > 0;
}

async function runMutationWithAuthFallback(
  query: string,
  variables: Record<string, any>,
  options?: { preferApiKey?: boolean }
) {
  const clients = options?.preferApiKey
    ? [graphqlApiKeyClient, graphqlAuthClient]
    : [graphqlAuthClient, graphqlApiKeyClient];

  let lastUnauthorizedError: any = null;

  for (const client of clients) {
    try {
      const response = await client.graphql({ query, variables });
      if (responseHasUnauthorizedErrors(response)) {
        lastUnauthorizedError = response;
        continue;
      }
      if (responseHasAnyErrors(response)) {
        throw response;
      }
      return response;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        lastUnauthorizedError = error;
        continue;
      }
      throw error;
    }
  }

  throw (
    lastUnauthorizedError || new Error('Mutation failed due to authorization')
  );
}

/**
 * Update user profile
 */
export async function updateProfile(
  input: APITypes.UpdateApsAppUserProfileInput
): Promise<APITypes.ApsAppUserProfile> {
  try {
    const response = await runMutationWithAuthFallback(
      updateApsAppUserProfileSafe,
      { input },
      { preferApiKey: true }
    );

    const data = response.data as {
      updateApsAppUserProfile?: APITypes.ApsAppUserProfile;
    };

    if (!data.updateApsAppUserProfile) {
      throw new Error('Failed to update profile');
    }

    return data.updateApsAppUserProfile;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}

/**
 * Create a new affiliate
 */
export async function createAffiliate(
  input: APITypes.CreateProfileAffiliateInput
): Promise<APITypes.ProfileAffiliate> {
  try {
    const response = await runMutationWithAuthFallback(createProfileAffiliate, {
      input,
    }, { preferApiKey: true });
 

    const data = response.data as {
      createProfileAffiliate?: APITypes.ProfileAffiliate;
    };

    if (!data.createProfileAffiliate) {
      throw new Error('Failed to create affiliate');
    }

    return data.createProfileAffiliate;
  } catch (error) {
    console.error('Error creating affiliate:', error);
    throw error;
  }
}

/**
 * Update an existing affiliate
 */
export async function updateAffiliate(
  input: APITypes.UpdateProfileAffiliateInput
): Promise<APITypes.ProfileAffiliate> {
  try {
    const response = await runMutationWithAuthFallback(updateProfileAffiliate, {
      input,
    }, { preferApiKey: true });

    const data = response.data as {
      updateProfileAffiliate?: APITypes.ProfileAffiliate;
    };

    if (!data.updateProfileAffiliate) {
      throw new Error('Failed to update affiliate');
    }

    return data.updateProfileAffiliate;
  } catch (error) {
    console.error('Error updating affiliate:', error);
    throw error;
  }
}

/**
 * Delete an affiliate
 */
export async function deleteAffiliate(id: string): Promise<void> {
  try {
    await runMutationWithAuthFallback(deleteProfileAffiliate, {
      input: { id },
    }, { preferApiKey: true });
  } catch (error) {
    console.error('Error deleting affiliate:', error);
    throw error;
  }
}

/**
 * Create a new education entry
 */
export async function createEducation(
  input: APITypes.CreateProfileEducationInput
): Promise<APITypes.ProfileEducation> {
  try {
    const response = await runMutationWithAuthFallback(createProfileEducation, {
      input,
    }, { preferApiKey: true });

    const data = response.data as {
      createProfileEducation?: APITypes.ProfileEducation;
    };

    if (!data.createProfileEducation) {
      throw new Error('Failed to create education');
    }

    return data.createProfileEducation;
  } catch (error) {
    console.error('Error creating education:', error);
    throw error;
  }
}

/**
 * Update an existing education entry
 */
export async function updateEducation(
  input: APITypes.UpdateProfileEducationInput
): Promise<APITypes.ProfileEducation> {
  try {
    const response = await runMutationWithAuthFallback(updateProfileEducation, {
      input,
    }, { preferApiKey: true });

    const data = response.data as {
      updateProfileEducation?: APITypes.ProfileEducation;
    };

    if (!data.updateProfileEducation) {
      throw new Error('Failed to update education');
    }

    return data.updateProfileEducation;
  } catch (error) {
    console.error('Error updating education:', error);
    throw error;
  }
}

/**
 * Delete an education entry
 */
export async function deleteEducation(id: string): Promise<void> {
  try {
    await runMutationWithAuthFallback(deleteProfileEducation, {
      input: { id },
    }, { preferApiKey: true });
  } catch (error) {
    console.error('Error deleting education:', error);
    throw error;
  }
}

/**
 * Create a new interest
 */
export async function createInterest(
  input: APITypes.CreateProfileInterestInput
): Promise<APITypes.ProfileInterest> {
  try {
    const response = await runMutationWithAuthFallback(createProfileInterest, {
      input,
    }, { preferApiKey: true });

    const data = response.data as {
      createProfileInterest?: APITypes.ProfileInterest;
    };

    if (!data.createProfileInterest) {
      throw new Error('Failed to create interest');
    }

    return data.createProfileInterest;
  } catch (error) {
    console.error('Error creating interest:', error);
    throw error;
  }
}

/**
 * Update an existing interest
 */
export async function updateInterest(
  input: APITypes.UpdateProfileInterestInput
): Promise<APITypes.ProfileInterest> {
  try {
    const response = await runMutationWithAuthFallback(updateProfileInterest, {
      input,
    }, { preferApiKey: true });

    const data = response.data as {
      updateProfileInterest?: APITypes.ProfileInterest;
    };

    if (!data.updateProfileInterest) {
      throw new Error('Failed to update interest');
    }

    return data.updateProfileInterest;
  } catch (error) {
    console.error('Error updating interest:', error);
    throw error;
  }
}

/**
 * Delete an interest
 */
export async function deleteInterest(id: string): Promise<void> {
  try {
    await runMutationWithAuthFallback(deleteProfileInterest, {
      input: { id },
    }, { preferApiKey: true });
  } catch (error) {
    console.error('Error deleting interest:', error);
    throw error;
  }
}

