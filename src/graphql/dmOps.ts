// Minimal DM ops for User Pools auth.
// Keep selections flat to avoid nested auth issues on related user objects.

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

export const sendModeratedDmMessage = `
  mutation SendModeratedDmMessageManual($input: SendModeratedDmMessageInput!) {
    sendModeratedDmMessage(input: $input) {
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


