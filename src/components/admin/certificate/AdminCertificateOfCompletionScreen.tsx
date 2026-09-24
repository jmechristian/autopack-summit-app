import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import {
  getCertificateOfCompletion,
  isCertificateSchemaError,
  setCertificateOfCompletion,
} from '../../../services/certificateOfCompletion';
import { AppButton } from '../../../ui/AppButton';
import { AppCard } from '../../../ui/AppCard';
import { AppScreen } from '../../../ui/AppScreen';
import { ui } from '../../../ui/tokens';

export default function AdminCertificateOfCompletionScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const gate = await getCertificateOfCompletion();
      setOpen(gate.open);
      setUrl(gate.url);
    } catch (e) {
      setError(
        isCertificateSchemaError(e)
          ? 'The certificate switch is not on the backend yet. Run amplify push, then try again.'
          : (e as { message?: string })?.message || 'Unable to load the certificate lock.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const saveUrl = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await setCertificateOfCompletion({ url });
      setUrl(saved.url);
      setOpen(saved.open);
    } catch (e) {
      setError(
        isCertificateSchemaError(e)
          ? 'The certificate link is not on the backend yet. Run amplify push, then try again.'
          : (e as { message?: string })?.message || 'Unable to save the link.',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleOpen = () => {
    const next = !open;
    Alert.alert(
      next ? 'Unlock the certificate?' : 'Lock the certificate?',
      next
        ? 'Attendees will be able to open the certificate page from the hub.'
        : 'The card goes back to locked. Nobody is marked complete.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Unlock' : 'Lock',
          style: next ? 'default' : 'destructive',
          onPress: () => {
            void (async () => {
              setSaving(true);
              setError(null);
              try {
                const saved = await setCertificateOfCompletion({ open: next });
                setOpen(saved.open);
              } catch (e) {
                setError(
                  isCertificateSchemaError(e)
                    ? 'The unlock switch is not on the backend yet. Run amplify push, then try again.'
                    : (e as { message?: string })?.message || 'Unable to update the certificate lock.',
                );
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppCard style={styles.card}>
          <Text style={styles.title}>Certificate of Completion</Text>
          <Text style={styles.meta}>
            The hub card stays locked until you unlock it. Tapping it opens the external page. We
            do not track who finishes.
          </Text>
          <Text style={[styles.status, open ? styles.statusOpen : styles.statusLocked]}>
            {loading ? 'Loading…' : open ? 'Unlocked for attendees' : 'Locked'}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.label}>Certificate page</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder="https://"
            placeholderTextColor={ui.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <AppButton
            title={saving ? 'Saving…' : 'Save link'}
            onPress={() => void saveUrl()}
            disabled={saving || loading}
            variant="outline"
          />
          <AppButton
            title={saving ? 'Saving…' : open ? 'Lock certificate' : 'Unlock certificate'}
            onPress={toggleOpen}
            disabled={saving || loading}
            variant={open ? 'outline' : 'primary'}
          />
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: 28 },
  card: { gap: 10 },
  title: { fontSize: 22, fontWeight: '900', color: ui.colors.text },
  meta: { color: ui.colors.muted, lineHeight: 20 },
  status: { fontWeight: '800' },
  statusOpen: { color: '#047857' },
  statusLocked: { color: '#92400E' },
  error: { color: ui.colors.danger, lineHeight: 20 },
  label: { fontWeight: '800', color: ui.colors.text, marginTop: 6 },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: ui.colors.text,
  },
});
