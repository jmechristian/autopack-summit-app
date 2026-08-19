export const GRAPHQL_PAGE_SIZE = 1000;
export const GRAPHQL_MAX_PAGES = 200;

type GraphqlConnection<T> = {
  items?: Array<T | null> | null;
  nextToken?: string | null;
};

export async function drainGraphqlConnection<T>(
  fetchPage: (nextToken?: string | null) => Promise<GraphqlConnection<T> | null | undefined>
): Promise<T[]> {
  const items: T[] = [];
  const seen = new Set<string>();
  let nextToken: string | null | undefined = null;
  let previousToken: string | null = null;
  let pages = 0;

  do {
    const page = await fetchPage(nextToken);
    for (const item of page?.items || []) {
      if (item == null) continue;
      const id =
        typeof item === 'object' && item && 'id' in item ? String((item as { id?: unknown }).id || '') : '';
      if (id) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      items.push(item);
    }
    previousToken = nextToken || null;
    nextToken = page?.nextToken || null;
    pages += 1;
    if (nextToken && nextToken === previousToken) break;
  } while (nextToken && pages < GRAPHQL_MAX_PAGES);

  if (nextToken) {
    console.warn(`GraphQL list truncated after ${GRAPHQL_MAX_PAGES} pages`);
  }

  return items;
}

export async function drainIndexedList<T>(params: {
  client: any;
  query: unknown;
  field: string;
  variables?: Record<string, unknown>;
  pageSize?: number;
}): Promise<T[]> {
  const pageSize = params.pageSize ?? GRAPHQL_PAGE_SIZE;
  return drainGraphqlConnection<T>(async (nextToken) => {
    const resp = await params.client.graphql({
      query: params.query,
      variables: {
        ...(params.variables || {}),
        limit: pageSize,
        ...(nextToken ? { nextToken } : {}),
      },
    });
    const conn = resp.data?.[params.field] as GraphqlConnection<T> | undefined;
    if (!conn) throw new Error(`Missing GraphQL connection field: ${params.field}`);
    return conn;
  });
}
