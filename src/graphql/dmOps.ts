// Minimal DM ops for User Pools auth.
// We intentionally DO NOT select nested `sender { ... }` because `sender` resolves to ApsAppUser,
// which is currently API-key/public in this backend. Selecting it under userPools causes:
// "Not Authorized to access sender on type ApsDmMessage".

export const createApsDmMessageMinimal = /* GraphQL */ `
  mutation CreateApsDmMessageMinimal(
    $input: CreateApsDmMessageInput!
    $condition: ModelApsDmMessageConditionInput
  ) {
    createApsDmMessage(input: $input, condition: $condition) {
      id
      eventId
      threadId
      senderUserId
      owners
      type
      body
      createdAt
      updatedAt
      __typename
    }
  }
`;

export const onCreateApsDmMessageMinimal = /* GraphQL */ `
  subscription OnCreateApsDmMessageMinimal($filter: ModelSubscriptionApsDmMessageFilterInput) {
    onCreateApsDmMessage(filter: $filter) {
      id
      eventId
      threadId
      senderUserId
      owners
      type
      body
      createdAt
      updatedAt
      __typename
    }
  }
`;


