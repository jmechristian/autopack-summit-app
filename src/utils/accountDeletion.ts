import { signOut } from './authUtils';
import { graphqlAuthClient } from './graphqlClient';

const deleteMyAccountMutation = /* GraphQL */ `
  mutation DeleteMyAccount {
    deleteMyAccount {
      success
      message
      __typename
    }
  }
`;

export async function deleteMyAccount(): Promise<string> {
  const resp = await graphqlAuthClient.graphql({
    query: deleteMyAccountMutation,
  });
  const result = (resp as any)?.data?.deleteMyAccount;
  if (!result?.success) {
    throw new Error(result?.message || 'Unable to delete your account right now.');
  }
  return String(result.message || 'Your account was deleted.');
}

export async function signOutAfterAccountDeletion(): Promise<void> {
  try {
    await signOut();
  } catch {
    // Cognito user may already be deleted server-side.
  }
}
