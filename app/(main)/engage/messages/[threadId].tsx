import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEngageStore } from '../../../../src/store/engageStore';
import { autopackColors } from '../../../../src/theme';

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const [text, setText] = useState('');

  const messages = useEngageStore((s) => (threadId ? s.messagesByThreadId[threadId] : []));
  const loading = useEngageStore((s) => s.loading.messages);
  const error = useEngageStore((s) => s.error.messages);
  const loadMessages = useEngageStore((s) => s.loadMessages);
  const sendMessage = useEngageStore((s) => s.sendMessage);
  const markRead = useEngageStore((s) => s.markRead);

  useEffect(() => {
    if (!threadId) return;
    loadMessages(threadId);
    markRead(threadId);
  }, [threadId, loadMessages, markRead]);

  const data = useMemo(() => {
    // Show oldest at bottom (chat style).
    return [...(messages || [])].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={data}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, item.isMine ? styles.textMine : styles.textTheirs]}>
              {item.body}
            </Text>
            <Text style={styles.bubbleMeta}>
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder='Message…'
          style={styles.input}
          editable={!loading}
        />
        <Pressable
          style={[styles.send, (!text.trim() || loading) && styles.sendDisabled]}
          disabled={!text.trim() || loading}
          onPress={async () => {
            if (!threadId) return;
            const body = text.trim();
            setText('');
            await sendMessage({ threadId, body });
          }}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 12 },
  error: { color: '#DC2626', marginTop: 8 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: autopackColors.apBlue, borderColor: autopackColors.apBlue },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#F9FAFB' },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  textMine: { color: '#fff' },
  textTheirs: { color: '#111827' },
  bubbleMeta: { marginTop: 6, fontSize: 10, color: '#D1D5DB' },
  composer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  send: {
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
});


