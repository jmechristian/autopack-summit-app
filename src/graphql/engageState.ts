// Minimal GraphQL operations for ApsUserEngageState.
// This is intentionally hand-written so the mobile app can compile immediately;
// after `amplify push` + `amplify codegen`, you can switch to generated ops if desired.

export const getApsUserEngageState = /* GraphQL */ `
  query GetApsUserEngageState($id: ID!) {
    getApsUserEngageState(id: $id) {
      id
      eventId
      userId
      lastSeenAnnouncementAt
      createdAt
      updatedAt
      __typename
    }
  }
`;

export const createApsUserEngageState = /* GraphQL */ `
  mutation CreateApsUserEngageState($input: CreateApsUserEngageStateInput!) {
    createApsUserEngageState(input: $input) {
      id
      eventId
      userId
      lastSeenAnnouncementAt
      createdAt
      updatedAt
      __typename
    }
  }
`;

export const updateApsUserEngageState = /* GraphQL */ `
  mutation UpdateApsUserEngageState($input: UpdateApsUserEngageStateInput!) {
    updateApsUserEngageState(input: $input) {
      id
      eventId
      userId
      lastSeenAnnouncementAt
      createdAt
      updatedAt
      __typename
    }
  }
`;


