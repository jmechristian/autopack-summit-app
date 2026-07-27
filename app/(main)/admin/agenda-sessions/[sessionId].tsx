import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  deleteAdminAgendaSession,
  getAdminAgendaSession,
  normalizeAgendaTimeInput,
  updateAdminAgendaSession,
} from '../../../../src/components/admin/agenda/adminAgendaService';
import { SessionRichTextEditor } from '../../../../src/components/admin/agenda/SessionRichTextEditor';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AdminSessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const session = await getAdminAgendaSession(sessionId);
      setTitle(session.title || '');
      setDate(session.date || '');
      setStartTime(session.startTime || '');
      setEndTime(session.endTime || '');
      setLocation(session.location || '');
      setDescription(session.description || '');
    } catch (e: any) {
      setError(e?.message || 'Unable to load session.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    if (!sessionId) return;
    try {
      setSaving(true);
      await updateAdminAgendaSession({
        id: sessionId,
        title,
        date,
        startTime,
        endTime,
        location,
        description,
      });
      await load();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Unable to update session.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!sessionId) return;
    Alert.alert('Delete session', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteAdminAgendaSession(sessionId);
            router.replace('/(main)/admin/agenda-sessions');
          } catch (e: any) {
            Alert.alert('Delete failed', e?.message || 'Unable to delete session.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Session Detail</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <Text style={styles.meta}>Loading session...</Text> : null}

          {!loading ? (
            <>
              <TextInput value={title} onChangeText={setTitle} placeholder='Title' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <TextInput value={date} onChangeText={setDate} placeholder='Date (YYYY-MM-DD)' placeholderTextColor={ui.colors.muted} style={styles.input} autoCapitalize='none' />
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                onEndEditing={() => setStartTime(normalizeAgendaTimeInput(startTime) || '')}
                placeholder='Start time (e.g., 2:00 PM ET)'
                placeholderTextColor={ui.colors.muted}
                style={styles.input}
              />
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                onEndEditing={() => setEndTime(normalizeAgendaTimeInput(endTime) || '')}
                placeholder='End time (e.g., 3:00 PM ET)'
                placeholderTextColor={ui.colors.muted}
                style={styles.input}
              />
              <TextInput value={location} onChangeText={setLocation} placeholder='Location' placeholderTextColor={ui.colors.muted} style={styles.input} />
              <SessionRichTextEditor
                value={description}
                onChange={setDescription}
                placeholder='Description HTML (paragraphs, bold, underline)'
              />
              <View style={styles.actionsRow}>
                <AppButton
                  title={saving ? 'Saving...' : 'Save Session'}
                  onPress={save}
                  disabled={saving}
                  style={styles.adminButton}
                />
                <AppButton
                  title={deleting ? 'Deleting...' : 'Delete Session'}
                  variant='outline'
                  onPress={remove}
                  disabled={deleting}
                  style={styles.adminButton}
                />
              </View>
            </>
          ) : null}
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl, paddingTop: 6 },
  card: { marginBottom: ui.space.md, paddingVertical: 14 },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  meta: { color: ui.colors.muted, marginTop: 6, lineHeight: 19 },
  error: { color: ui.colors.danger, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: ui.colors.text,
    marginTop: 8,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminButton: { borderRadius: 10 },
});
