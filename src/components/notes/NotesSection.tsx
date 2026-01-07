import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ui } from '../../ui/tokens';
import { AppCard } from '../../ui/AppCard';
import { AppButton } from '../../ui/AppButton';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { graphqlAuthClient } from '../../utils/graphqlClient';
import {
  apsAppUserNotesByProfileId,
  apsAppUserNotesBySessionId,
} from '../../graphql/queries';
import {
  createApsAppUserNote,
  updateApsAppUserNote,
  deleteApsAppUserNote,
} from '../../graphql/mutations';

type NoteItem = {
  id: string;
  userId: string;
  note?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

// Use minimal selection sets for mutations.
// The generated mutations include nested relationship fields (session/profile/company/etc).
// When calling via USER_POOLS, those related models are often API_KEY-only, which causes
// AppSync to return errors even though the note mutation succeeds.
const createNoteMinimal = /* GraphQL */ `
  mutation CreateApsAppUserNoteMinimal($input: CreateApsAppUserNoteInput!) {
    createApsAppUserNote(input: $input) {
      id
      owner
      userId
      note
      sessionId
      exhibitorId
      registrantId
      profileId
      companyId
      createdAt
      updatedAt
      __typename
    }
  }
`;

const updateNoteMinimal = /* GraphQL */ `
  mutation UpdateApsAppUserNoteMinimal($input: UpdateApsAppUserNoteInput!) {
    updateApsAppUserNote(input: $input) {
      id
      owner
      userId
      note
      sessionId
      exhibitorId
      registrantId
      profileId
      companyId
      createdAt
      updatedAt
      __typename
    }
  }
`;

const deleteNoteMinimal = /* GraphQL */ `
  mutation DeleteApsAppUserNoteMinimal($input: DeleteApsAppUserNoteInput!) {
    deleteApsAppUserNote(input: $input) {
      id
      owner
      userId
      note
      sessionId
      exhibitorId
      registrantId
      profileId
      companyId
      createdAt
      updatedAt
      __typename
    }
  }
`;

function formatWhen(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export function NotesSection(props: { profileId?: string | null; sessionId?: string | null }) {
  const currentAppUser = useCurrentAppUser();
  const userId = currentAppUser?.id || null;

  const target = useMemo(() => {
    if (props.profileId) return { kind: 'profile' as const, id: props.profileId };
    if (props.sessionId) return { kind: 'session' as const, id: props.sessionId };
    return null;
  }, [props.profileId, props.sessionId]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const canUse = !!userId && !!target?.id;

  const load = useCallback(async () => {
    if (!canUse || !target || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const query = target.kind === 'profile' ? apsAppUserNotesByProfileId : apsAppUserNotesBySessionId;
      const variables =
        target.kind === 'profile'
          ? {
              profileId: target.id,
              limit: 100,
              filter: { userId: { eq: userId } },
            }
          : {
              sessionId: target.id,
              limit: 100,
              filter: { userId: { eq: userId } },
            };

      const resp = await graphqlAuthClient.graphql({ query, variables });
      const data = resp.data as any;
      const connection =
        target.kind === 'profile'
          ? data?.apsAppUserNotesByProfileId
          : data?.apsAppUserNotesBySessionId;
      const items = (connection?.items || [])
        .filter(Boolean)
        .sort((a: NoteItem, b: NoteItem) => (b.createdAt || '').localeCompare(a.createdAt || '')) as NoteItem[];
      setNotes(items);
    } catch (e: any) {
      console.error('Load notes failed:', e);
      setError(e?.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [canUse, target, userId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const onCreate = useCallback(async () => {
    if (!canUse || !target || !userId) return;
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    try {
      const input: any = {
        userId,
        note: body,
      };
      if (target.kind === 'profile') input.profileId = target.id;
      if (target.kind === 'session') input.sessionId = target.id;

      await graphqlAuthClient.graphql({
        query: createNoteMinimal,
        variables: { input },
      });
      setDraft('');
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      console.error('Create note failed:', e);
      Alert.alert('Note failed', e?.message || 'Could not save note. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [canUse, target, userId, draft]);

  const onStartEdit = useCallback((n: NoteItem) => {
    setEditingId(n.id);
    setEditDraft((n.note || '').toString());
  }, []);

  const onCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft('');
  }, []);

  const onSaveEdit = useCallback(async () => {
    if (!editingId || !userId) return;
    const body = editDraft.trim();
    setSaving(true);
    try {
      await graphqlAuthClient.graphql({
        query: updateNoteMinimal,
        variables: { input: { id: editingId, note: body, userId } },
      });
      setEditingId(null);
      setEditDraft('');
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      console.error('Update note failed:', e);
      Alert.alert('Update failed', e?.message || 'Could not update note.');
    } finally {
      setSaving(false);
    }
  }, [editingId, editDraft, userId]);

  const onDelete = useCallback(
    (noteId: string) => {
      Alert.alert('Delete note?', 'This can’t be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await graphqlAuthClient.graphql({
                query: deleteNoteMinimal,
                variables: { input: { id: noteId } },
              });
              if (editingId === noteId) onCancelEdit();
              setRefreshKey((k) => k + 1);
            } catch (e: any) {
              console.error('Delete note failed:', e);
              Alert.alert('Delete failed', e?.message || 'Could not delete note.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]);
    },
    [editingId, onCancelEdit]
  );

  if (!target) return null;

  return (
    <AppCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notes</Text>
        {(loading || saving) && <ActivityIndicator size="small" />}
      </View>

      {!userId ? (
        <Text style={styles.muted}>Sign in to add notes.</Text>
      ) : (
        <>
          <Text style={styles.label}>Add a note</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type your note…"
            placeholderTextColor="#9ca3af"
            multiline
            style={styles.input}
            editable={!saving}
          />
          <View style={styles.actionsRow}>
            <AppButton
              title={saving ? 'Saving…' : 'Save note'}
              onPress={onCreate}
              disabled={saving || !draft.trim()}
            />
            {!!draft.trim() && (
              <AppButton
                title="Clear"
                variant="outline"
                onPress={() => setDraft('')}
                disabled={saving}
              />
            )}
          </View>
        </>
      )}

      <View style={styles.divider} />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Couldn’t load notes</Text>
          <Text style={styles.muted}>{error}</Text>
          <View style={{ height: ui.space.sm }} />
          <AppButton title="Retry" onPress={load} disabled={loading || saving} />
        </View>
      ) : notes.length === 0 ? (
        <Text style={styles.muted}>No notes yet.</Text>
      ) : (
        <View style={{ gap: ui.space.md }}>
          {notes.map((n) => {
            const isEditing = editingId === n.id;
            return (
              <View key={n.id} style={styles.noteRow}>
                <View style={styles.noteMetaRow}>
                  <Text style={styles.noteMetaText}>{formatWhen(n.createdAt) || ' '}</Text>
                  {!isEditing && (
                    <View style={styles.noteMetaActions}>
                      <Pressable onPress={() => onStartEdit(n)} disabled={saving} hitSlop={10}>
                        <Text style={styles.link}>Edit</Text>
                      </Pressable>
                      <Text style={styles.metaSep}>•</Text>
                      <Pressable onPress={() => onDelete(n.id)} disabled={saving} hitSlop={10}>
                        <Text style={styles.dangerLink}>Delete</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {isEditing ? (
                  <>
                    <TextInput
                      value={editDraft}
                      onChangeText={setEditDraft}
                      multiline
                      style={[styles.input, { marginTop: 0 }]}
                      editable={!saving}
                    />
                    <View style={styles.actionsRow}>
                      <AppButton
                        title={saving ? 'Saving…' : 'Save'}
                        onPress={onSaveEdit}
                        disabled={saving || !editDraft.trim()}
                      />
                      <AppButton
                        title="Cancel"
                        variant="outline"
                        onPress={onCancelEdit}
                        disabled={saving}
                      />
                    </View>
                  </>
                ) : (
                  <Text style={styles.noteBody}>{(n.note || '').toString()}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: ui.space.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: ui.colors.text,
  },
  label: {
    marginTop: ui.space.xs,
    fontWeight: '800',
    color: ui.colors.text,
  },
  muted: { color: ui.colors.muted },
  input: {
    marginTop: ui.space.xs,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: ui.colors.text,
    backgroundColor: ui.colors.surface,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: ui.space.sm,
    marginTop: ui.space.sm,
  },
  divider: {
    height: 1,
    backgroundColor: ui.colors.border,
    marginVertical: ui.space.sm,
  },
  errorBox: {
    gap: ui.space.xs,
  },
  errorTitle: { fontWeight: '900', color: ui.colors.text },
  noteRow: {
    padding: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: ui.radius.card,
    backgroundColor: ui.colors.surface,
  },
  noteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ui.space.xs,
  },
  noteMetaText: {
    color: ui.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  noteMetaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ui.space.xs,
  },
  metaSep: { color: ui.colors.muted, fontSize: 12 },
  link: { color: ui.colors.primary, fontWeight: '800' },
  dangerLink: { color: ui.colors.danger, fontWeight: '800' },
  noteBody: { color: ui.colors.text, lineHeight: 20 },
});


