export function graphqlErrorText(error: unknown): string {
  const err = error as { message?: string; errors?: Array<{ message?: string } | null> | null };
  const nested = (err.errors || []).map((item) => item?.message || '');
  return [err.message || '', ...nested].join(' ');
}

export function isUnknownFieldError(error: unknown, field: string): boolean {
  const text = graphqlErrorText(error).toLowerCase();
  const fieldName = field.toLowerCase();
  if (!text.includes(fieldName)) return false;
  return (
    text.includes('cannot query field') ||
    text.includes('is not defined') ||
    text.includes('unknown field') ||
    text.includes('undefined field') ||
    text.includes('not defined on type') ||
    text.includes('not defined on input')
  );
}

export function queryWithoutSpeakerOrder(query: string) {
  return query.replace(/^[ \t]*speakerOrder[ \t]*\n?/gm, '');
}

export async function graphqlWithSpeakerOrderFallback<T>(
  run: (query: string) => Promise<T>,
  query: string,
): Promise<T> {
  const runOrRetry = async (document: string, allowRetry: boolean): Promise<T> => {
    try {
      const result = await run(document);
      if (allowRetry && isUnknownFieldError(result, 'speakerOrder')) {
        return runOrRetry(queryWithoutSpeakerOrder(query), false);
      }
      return result;
    } catch (error) {
      if (!allowRetry || !isUnknownFieldError(error, 'speakerOrder')) throw error;
      return runOrRetry(queryWithoutSpeakerOrder(query), false);
    }
  };

  return runOrRetry(query, true);
}

export function orderByIds<T>(
  items: T[],
  getId: (item: T) => string | null | undefined,
  order?: Array<string | null> | null,
): T[] {
  if (!items.length) return items;
  const normalizedOrder = (order || []).map((id) => (id || '').trim()).filter(Boolean);
  if (!normalizedOrder.length) return items;

  const rank = new Map(normalizedOrder.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const aId = getId(a) || '';
    const bId = getId(b) || '';
    const aRank = aId ? rank.get(aId) : undefined;
    const bRank = bId ? rank.get(bId) : undefined;
    if (aRank == null && bRank == null) return 0;
    if (aRank == null) return 1;
    if (bRank == null) return -1;
    return aRank - bRank;
  });
}

export function orderIds(ids: string[], order?: Array<string | null> | null): string[] {
  return orderByIds(ids, (id) => id, order);
}
