export const apsContactRequestsByUserAIdAndCreatedAt = /* GraphQL */ `
  query ApsContactRequestsByUserAIdAndCreatedAt(
    $userAId: ID!
    $sortDirection: ModelSortDirection
    $limit: Int
    $nextToken: String
  ) {
    apsContactRequestsByUserAIdAndCreatedAt(
      userAId: $userAId
      sortDirection: $sortDirection
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        eventId
        requestKey
        userAId
        userBId
        owners
        requestedByUserId
        status
        introMessage
        introSentAt
        introDeliveredAt
        acceptedAt
        declinedAt
        blockedAt
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export const apsContactRequestsByUserBIdAndCreatedAt = /* GraphQL */ `
  query ApsContactRequestsByUserBIdAndCreatedAt(
    $userBId: ID!
    $sortDirection: ModelSortDirection
    $limit: Int
    $nextToken: String
  ) {
    apsContactRequestsByUserBIdAndCreatedAt(
      userBId: $userBId
      sortDirection: $sortDirection
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        eventId
        requestKey
        userAId
        userBId
        owners
        requestedByUserId
        status
        introMessage
        introSentAt
        introDeliveredAt
        acceptedAt
        declinedAt
        blockedAt
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
