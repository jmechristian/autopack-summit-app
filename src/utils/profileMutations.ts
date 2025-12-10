// src/utils/profileMutations.ts
import { graphqlClient } from './graphqlClient';
import * as APITypes from '../API';
import {
  updateApsAppUserProfile,
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

/**
 * Update user profile
 */
export async function updateProfile(
  input: APITypes.UpdateApsAppUserProfileInput
): Promise<APITypes.ApsAppUserProfile> {
  try {
    const response = await graphqlClient.graphql({
      query: updateApsAppUserProfile,
      variables: { input },
    });

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
    const response = await graphqlClient.graphql({
      query: createProfileAffiliate,
      variables: { input },
    });

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
    const response = await graphqlClient.graphql({
      query: updateProfileAffiliate,
      variables: { input },
    });

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
    await graphqlClient.graphql({
      query: deleteProfileAffiliate,
      variables: {
        input: { id },
      },
    });
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
    const response = await graphqlClient.graphql({
      query: createProfileEducation,
      variables: { input },
    });

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
    const response = await graphqlClient.graphql({
      query: updateProfileEducation,
      variables: { input },
    });

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
    await graphqlClient.graphql({
      query: deleteProfileEducation,
      variables: {
        input: { id },
      },
    });
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
    const response = await graphqlClient.graphql({
      query: createProfileInterest,
      variables: { input },
    });

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
    const response = await graphqlClient.graphql({
      query: updateProfileInterest,
      variables: { input },
    });

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
    await graphqlClient.graphql({
      query: deleteProfileInterest,
      variables: {
        input: { id },
      },
    });
  } catch (error) {
    console.error('Error deleting interest:', error);
    throw error;
  }
}

