import { useCallback, useEffect, useState } from 'react';
import { useCurrentAppUser } from './useApsStore';
import { graphqlAuthClient } from '../utils/graphqlClient';
import { apsAppUserNotesByUserId } from '../graphql/queries';

type NoteRow = {
  id: string;
  sessionId?: string | null;
  profileId?: string | null;
};

export function useNotesPresence() {
  const currentAppUser = useCurrentAppUser();
  const userId = currentAppUser?.id || null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionIdsWithNotes, setSessionIdsWithNotes] = useState<Set<string>>(new Set());
  const [profileIdsWithNotes, setProfileIdsWithNotes] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const sessionSet = new Set<string>();
      const profileSet = new Set<string>();

      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlAuthClient.graphql({
          query: apsAppUserNotesByUserId,
          variables: { userId, limit: 1000, nextToken },
        });
        const data = resp.data as any;
        const items = (data?.apsAppUserNotesByUserId?.items || []).filter(Boolean) as NoteRow[];
        for (const n of items) {
          if (n.sessionId) sessionSet.add(n.sessionId);
          if (n.profileId) profileSet.add(n.profileId);
        }
        nextToken = data?.apsAppUserNotesByUserId?.nextToken;
      } while (nextToken);

      setSessionIdsWithNotes(sessionSet);
      setProfileIdsWithNotes(profileSet);
    } catch (e: any) {
      console.error('Load note presence failed:', e);
      setError(e?.message || 'Failed to load notes');
      setSessionIdsWithNotes(new Set());
      setProfileIdsWithNotes(new Set());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    reload();
  }, [userId, reload]);

  return { loading, error, sessionIdsWithNotes, profileIdsWithNotes, reload };
}


