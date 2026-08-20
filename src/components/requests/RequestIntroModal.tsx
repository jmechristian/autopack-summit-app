import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppButton } from '../../ui/AppButton';
import { ui } from '../../ui/tokens';

type RequestIntroModalProps = {
  visible: boolean;
  recipientName: string;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (introMessage: string) => Promise<void> | void;
};

const MAX_INTRO_LENGTH = 280;

export function RequestIntroModal({
  visible,
  recipientName,
  loading = false,
  onCancel,
  onSubmit,
}: RequestIntroModalProps) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!visible) {
      setMessage('');
    }
  }, [visible]);

  const card = (
    <View style={styles.card}>
      <Text style={styles.title}>Add an intro message</Text>
      <Text style={styles.subtitle}>
        This will send a contact request and message to {recipientName || 'this user'}.
      </Text>

      <TextInput
        style={styles.input}
        multiline
        value={message}
        onChangeText={(value) => setMessage(value.slice(0, MAX_INTRO_LENGTH))}
        placeholder='Say hello and share why you want to connect...'
        placeholderTextColor={ui.colors.muted}
        textAlignVertical='top'
        editable={!loading}
        autoFocus={Platform.OS !== 'web'}
      />
      <Text style={styles.counter}>
        {message.length}/{MAX_INTRO_LENGTH}
      </Text>

      <View style={styles.actions}>
        <AppButton title='Cancel' onPress={onCancel} variant='muted' disabled={loading} />
        <AppButton
          title={loading ? 'Sending…' : 'Send request'}
          onPress={() => onSubmit(message.trim())}
          disabled={loading || !message.trim()}
        />
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType='fade' transparent onRequestClose={onCancel}>
      {Platform.OS === 'web' ? (
        <View style={styles.webRoot}>
          <Pressable style={styles.scrim} onPress={onCancel} />
          {card}
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable style={styles.scrim} onPress={onCancel} />
          {card}
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  webRoot: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 10000,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    zIndex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: ui.colors.text,
  },
  subtitle: {
    marginTop: 6,
    color: ui.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    marginTop: 12,
    minHeight: 110,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: ui.colors.text,
    fontSize: 15,
  },
  counter: {
    marginTop: 6,
    fontSize: 12,
    color: ui.colors.muted,
    textAlign: 'right',
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: ui.space.sm,
    justifyContent: 'flex-end',
  },
});
