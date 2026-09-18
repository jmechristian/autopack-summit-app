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
        breakdown
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

export const leaderboardStaffProfiles = /* GraphQL */ `
  query LeaderboardStaffProfiles(
    $filter: ModelApsAppUserProfileFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listApsAppUserProfiles(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        attendeeType
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const leaderboardStaffRegistrants = /* GraphQL */ `
  query LeaderboardStaffRegistrants(
    $apsID: ID!
    $filter: ModelApsRegistrantFilterInput
    $limit: Int
    $nextToken: String
  ) {
    apsRegistrantsByApsID(apsID: $apsID, filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        attendeeType
        appUserId
        appUser {
          id
          profileId
          profile {
            id
            __typename
          }
          __typename
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const leaderboardEventRegistrantTypes = /* GraphQL */ `
  query LeaderboardEventRegistrantTypes(
    $apsID: ID!
    $filter: ModelApsRegistrantFilterInput
    $limit: Int
    $nextToken: String
  ) {
    apsRegistrantsByApsID(apsID: $apsID, filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        attendeeType
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const leaderboardProfileIdByRegistrant = /* GraphQL */ `
  query LeaderboardProfileIdByRegistrant($registrantId: ID!) {
    apsAppUsersByRegistrantId(registrantId: $registrantId, limit: 1) {
      items {
        id
        profileId
        profile {
          id
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;
