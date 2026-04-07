// Minimal GraphQL operations for ApsUserEngageState.
// This is intentionally hand-written so the mobile app can compile immediately.

export const getApsUserEngageState = `
  query GetApsUserEngageStateManual($id: ID!) {
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

export const createApsUserEngageState = `
  mutation CreateApsUserEngageStateManual($input: CreateApsUserEngageStateInput!) {
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

export const updateApsUserEngageState = `
  mutation UpdateApsUserEngageStateManual($input: UpdateApsUserEngageStateInput!) {
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


