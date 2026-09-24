export const getCertificateOfCompletion = /* GraphQL */ `
  query GetCertificateOfCompletion($id: ID!) {
    getAPS(id: $id) {
      id
      certificateOfCompletionOpen
      certificateOfCompletionUrl
      __typename
    }
  }
`;

export const setCertificateOfCompletion = /* GraphQL */ `
  mutation SetCertificateOfCompletion($input: UpdateAPSInput!) {
    updateAPS(input: $input) {
      id
      certificateOfCompletionOpen
      certificateOfCompletionUrl
      __typename
    }
  }
`;
