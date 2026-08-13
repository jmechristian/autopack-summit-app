import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APS_ID } from '../../config/apsConfig';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { autopackColors } from '../../theme';
import { AppButton } from '../../ui/AppButton';
import { ui } from '../../ui/tokens';
import { graphqlAuthClient } from '../../utils/graphqlClient';
import { uploadFeedbackImage } from '../../utils/storageUtils';

const MAX_IMAGES = 6;
const MAX_MESSAGE = 2000;

const createFeedbackMinimal = /* GraphQL */ `
  mutation CreateApsAppFeedbackMinimal($input: CreateApsAppFeedbackInput!) {
    createApsAppFeedback(input: $input) {
      id
      owner
      userId
      eventId
      message
      imageKeys
      createdAt
      updatedAt
      __typename
    }
  }
`;

export default function FeedbackTool() {
  const insets = useSafeAreaInsets();
  const currentAppUser = useCurrentAppUser();
  const [message, setMessage] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickImages = async () => {
    const remaining = MAX_IMAGES - imageUris.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_IMAGES} images.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access in Settings to attach images to your feedback.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;
    const next = result.assets.map((a) => a.uri).filter(Boolean);
    setImageUris((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
  };

  const removeImage = (uri: string) => {
    setImageUris((prev) => prev.filter((u) => u !== uri));
  };

  const submit = async () => {
    const cleaned = message.trim();
    if (!cleaned) {
      Alert.alert('Add a message', 'Please describe your feedback before submitting.');
      return;
    }
    if (!currentAppUser?.id) {
      Alert.alert('Sign in required', 'Please sign in to send feedback.');
      return;
    }

    setSubmitting(true);
    try {
      const imageKeys: string[] = [];
      for (const uri of imageUris) {
        imageKeys.push(await uploadFeedbackImage(uri));
      }

      await graphqlAuthClient.graphql({
        query: createFeedbackMinimal,
        variables: {
          input: {
            userId: currentAppUser.id,
            eventId: APS_ID,
            message: cleaned.slice(0, MAX_MESSAGE),
            imageKeys: imageKeys.length ? imageKeys : null,
          },
        },
      });

      Alert.alert('Thanks!', 'Your feedback was submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.error('Feedback submit failed:', e);
      Alert.alert(
        'Could not send feedback',
        e?.message || 'Please try again. If this keeps happening, contact support.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          Tell us what’s working, what’s confusing, or what you’d like improved. Screenshots help a
          lot.
        </Text>

        <Text style={styles.label}>Your feedback</Text>
        <TextInput
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, MAX_MESSAGE))}
          placeholder="Share details, steps to reproduce, or ideas…"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          multiline
          textAlignVertical="top"
          editable={!submitting}
        />
        <Text style={styles.counter}>
          {message.trim().length}/{MAX_MESSAGE}
        </Text>

        <View style={styles.imagesHeader}>
          <Text style={styles.label}>Images (optional)</Text>
          <Text style={styles.muted}>
            {imageUris.length}/{MAX_IMAGES}
          </Text>
        </View>

        <View style={styles.imageRow}>
          {imageUris.map((uri) => (
            <View key={uri} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} />
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeImage(uri)}
                hitSlop={8}
                disabled={submitting}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}

          {imageUris.length < MAX_IMAGES ? (
            <Pressable style={styles.addTile} onPress={() => void pickImages()} disabled={submitting}>
              <Ionicons name="images-outline" size={22} color={autopackColors.apBlue} />
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          ) : null}
        </View>

        <AppButton
          title={submitting ? 'Sending…' : 'Submit feedback'}
          onPress={() => void submit()}
          disabled={submitting || !message.trim()}
          style={styles.submit}
        />
        {submitting ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={autopackColors.apBlue} />
            <Text style={styles.muted}>Uploading and sending…</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 8 },
  lead: { color: ui.colors.muted, lineHeight: 20, marginBottom: 8 },
  label: { fontWeight: '800', color: ui.colors.text, marginTop: 6 },
  muted: { color: ui.colors.muted, fontSize: 13 },
  input: {
    minHeight: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: ui.colors.text,
    backgroundColor: '#f9fafb',
  },
  counter: { alignSelf: 'flex-end', color: ui.colors.muted, fontSize: 12 },
  imagesHeader: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  thumbWrap: { width: 84, height: 84, borderRadius: 12, overflow: 'hidden' },
  thumb: { width: 84, height: 84 },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
  },
  addText: { color: autopackColors.apBlue, fontWeight: '700', fontSize: 12 },
  submit: { marginTop: 16 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
});
