export const risingStarsByKey = /* GraphQL */ `
  query RisingStarsByKey($risingStarKey: String!, $limit: Int, $nextToken: String) {
    apsAppUserProfilesByRisingStarKey(
      risingStarKey: $risingStarKey
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        userId
        firstName
        lastName
        company
        jobTitle
        profilePicture
        risingStarKey
        risingStarYear
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const listProfilesForRisingStarAdmin = /* GraphQL */ `
  query ListProfilesForRisingStarAdmin($limit: Int, $nextToken: String) {
    listApsAppUserProfiles(limit: $limit, nextToken: $nextToken) {
      items {
        id
        userId
        firstName
        lastName
        email
        company
        jobTitle
        profilePicture
        risingStarKey
        risingStarYear
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const getProfileRisingStarFields = /* GraphQL */ `
  query GetProfileRisingStarFields($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      risingStarKey
      risingStarYear
      __typename
    }
  }
`;

export const updateProfileRisingStar = /* GraphQL */ `
  mutation UpdateProfileRisingStar($input: UpdateApsAppUserProfileInput!) {
    updateApsAppUserProfile(input: $input) {
      id
      risingStarKey
      risingStarYear
      updatedAt
      __typename
    }
  }
`;
