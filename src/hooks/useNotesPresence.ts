import { useCallback, useEffect, useState } from 'react';
import { useCurrentAppUser } from './useApsStore';
import { graphqlAuthClient } from '../utils/graphqlClient';
import { drainIndexedList } from '../utils/paginateGraphql';
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

      const items = await drainIndexedList<NoteRow>({
        client: graphqlAuthClient,
        query: apsAppUserNotesByUserId,
        field: 'apsAppUserNotesByUserId',
        variables: { userId },
      });
      for (const n of items) {
        if (n.sessionId) sessionSet.add(n.sessionId);
        if (n.profileId) profileSet.add(n.profileId);
      }

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


