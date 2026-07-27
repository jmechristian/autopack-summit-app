import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  createAdminAgendaSession,
  normalizeAgendaTimeInput,
} from '../../../../src/components/admin/agenda/adminAgendaService';
import { SessionRichTextEditor } from '../../../../src/components/admin/agenda/SessionRichTextEditor';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AdminCreateSessionScreen() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const createSession = async () => {
    try {
      setSaving(true);
      const sessionId = await createAdminAgendaSession({
        title,
        date,
        startTime,
        endTime,
        location,
        description,
      });
      router.replace({
        pathname: '/(main)/admin/agenda-sessions/[sessionId]',
        params: { sessionId },
      });
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Unable to create session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Create Session</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder='Title'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
          />
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder='Date (YYYY-MM-DD)'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
            autoCapitalize='none'
          />
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
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder='Location'
            placeholderTextColor={ui.colors.muted}
            style={styles.input}
          />
          <SessionRichTextEditor
            value={description}
            onChange={setDescription}
            placeholder='Description HTML (paragraphs, bold, underline)'
          />
          <View style={{ marginTop: 12 }}>
            <AppButton
              title={saving ? 'Creating...' : 'Create Session'}
              onPress={createSession}
              disabled={saving}
              style={styles.adminButton}
            />
          </View>
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
  adminButton: { borderRadius: 10 },
});
