// src/utils/graphqlClient.ts
import { generateClient } from 'aws-amplify/api';
import type { GraphQLQuery } from '@aws-amplify/api';

// Lazy-loaded GraphQL client instance
// This ensures Amplify is configured before the client is created
let _graphqlClient: ReturnType<typeof generateClient> | null = null;

export function getGraphQLClient() {
  if (!_graphqlClient) {
    _graphqlClient = generateClient();
  }
  return _graphqlClient;
}

// Export for convenience (but prefer getGraphQLClient() for lazy loading)
export const graphqlClient = new Proxy({} as ReturnType<typeof generateClient>, {
  get(_target, prop) {
    return getGraphQLClient()[prop as keyof ReturnType<typeof generateClient>];
  },
});

// Helper type for GraphQL operations
export type GraphQLOperation<T> = GraphQLQuery<T>;

