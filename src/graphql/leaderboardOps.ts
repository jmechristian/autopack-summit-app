export const getApsAppLeaderboardEntry = /* GraphQL */ `
  query GetApsAppLeaderboardEntry($id: ID!) {
    getApsAppLeaderboardEntry(id: $id) {
      id
      owner
      eventId
      userProfileId
      displayName
      company
      jobTitle
      profilePicture
      points
      breakdown
      createdAt
      updatedAt
      __typename
    }
  }
`;

export const apsAppLeaderboardEntriesByEventIdAndUpdatedAt = /* GraphQL */ `
  query ApsAppLeaderboardEntriesByEventPublic(
    $eventId: ID!
    $limit: Int
    $nextToken: String
  ) {
    apsAppLeaderboardEntriesByEventIdAndUpdatedAt(
      eventId: $eventId
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        userProfileId
        displayName
        company
        jobTitle
        profilePicture
        points
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const createApsAppLeaderboardEntry = /* GraphQL */ `
  mutation CreateApsAppLeaderboardEntry($input: CreateApsAppLeaderboardEntryInput!) {
    createApsAppLeaderboardEntry(input: $input) {
      id
      owner
      eventId
      userProfileId
      displayName
      company
      jobTitle
      profilePicture
      points
      breakdown
      createdAt
      updatedAt
      __typename
    }
  }
`;

export const updateApsAppLeaderboardEntry = /* GraphQL */ `
  mutation UpdateApsAppLeaderboardEntry($input: UpdateApsAppLeaderboardEntryInput!) {
    updateApsAppLeaderboardEntry(input: $input) {
      id
      owner
      eventId
      userProfileId
      displayName
      company
      jobTitle
      profilePicture
      points
      breakdown
      createdAt
      updatedAt
      __typename
    }
  }
`;
