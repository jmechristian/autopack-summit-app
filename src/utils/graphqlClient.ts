// src/utils/graphqlClient.ts
import { generateClient } from 'aws-amplify/api';
import type { GraphQLQuery } from '@aws-amplify/api';

/**
 * IMPORTANT:
 * - Most existing app models in this backend are still `@auth(rules: [{ allow: public }])`,
 *   which is typically satisfied via API Key.
 * - Newer models (DM, announcements, push tokens) are Cognito User Pools-only.
 *
 * To avoid regressions when AppSync's *default* auth mode is switched to User Pools, we
 * explicitly create an API Key client for legacy/public models, and also expose a
 * User Pools client for protected models (used in step 2).
 */

type GraphQLAuthMode = 'apiKey' | 'userPool';

// Lazy-loaded GraphQL client instances (ensures Amplify is configured before creation)
let _apiKeyClient: ReturnType<typeof generateClient> | null = null;
let _userPoolClient: ReturnType<typeof generateClient> | null = null;

export function getGraphQLClient(authMode: GraphQLAuthMode = 'userPool') {
  if (authMode === 'userPool') {
    if (!_userPoolClient) {
      _userPoolClient = generateClient({ authMode: 'userPool' });
    }
    return _userPoolClient;
  }

  if (!_apiKeyClient) {
    _apiKeyClient = generateClient({ authMode: 'apiKey' });
  }
  return _apiKeyClient;
}

// Export for convenience (but prefer getGraphQLClient() for lazy loading)
// Default: USER POOLS (Cognito).
export const graphqlClient = new Proxy({} as ReturnType<typeof generateClient>, {
  get(_target, prop) {
    return getGraphQLClient('userPool')[prop as keyof ReturnType<typeof generateClient>];
  },
});

// Explicit alias for Cognito User Pools (kept for readability/legacy call sites).
export const graphqlAuthClient = new Proxy({} as ReturnType<typeof generateClient>, {
  get(_target, prop) {
    return getGraphQLClient('userPool')[prop as keyof ReturnType<typeof generateClient>];
  },
});

// Optional: explicit API Key client for any remaining legacy/public-only operations.
// Prefer USER POOLS everywhere unless you intentionally need API key auth.
export const graphqlApiKeyClient = new Proxy({} as ReturnType<typeof generateClient>, {
  get(_target, prop) {
    return getGraphQLClient('apiKey')[prop as keyof ReturnType<typeof generateClient>];
  },
});

// Helper type for GraphQL operations
export type GraphQLOperation<T> = GraphQLQuery<T>;

