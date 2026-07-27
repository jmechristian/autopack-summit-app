import { fetchAuthSession } from 'aws-amplify/auth';

const ADMIN_GROUP = 'admin';

function normalizeGroups(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim().toLowerCase()];
  }
  return [];
}

export function hasAdminGroupFromSession(session: any): boolean {
  const accessTokenGroups = normalizeGroups(session?.tokens?.accessToken?.payload?.['cognito:groups']);
  const idTokenGroups = normalizeGroups(session?.tokens?.idToken?.payload?.['cognito:groups']);
  const groups = new Set<string>([...accessTokenGroups, ...idTokenGroups]);
  return groups.has(ADMIN_GROUP);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const session = await fetchAuthSession();
    return hasAdminGroupFromSession(session);
  } catch {
    return false;
  }
}

