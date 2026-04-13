import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEngageStore } from '../../../../src/store/engageStore';
import { autopackColors } from '../../../../src/theme';

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [inputHeight, setInputHeight] = useState(64);
  const [pending, setPending] = useState<Array<{ id: string; body: string; createdAt: string }>>([]);
  const listRef = useRef<FlatList<any> | null>(null);

  const messages = useEngageStore((s) => (threadId ? s.messagesByThreadId[threadId] : []));
  const loading = useEngageStore((s) => s.loading.messages);
  const error = useEngageStore((s) => s.error.messages);
  const loadMessages = useEngageStore((s) => s.loadMessages);
  const sendMessage = useEngageStore((s) => s.sendMessage);
  const markRead = useEngageStore((s) => s.markRead);
  const startRealtime = useEngageStore((s) => s.startRealtime);
  const setActiveThread = useEngageStore((s) => s.setActiveThread);

  useEffect(() => {
    if (!threadId) return;
    void startRealtime().catch(() => {});
  }, [threadId, startRealtime]);

  useEffect(() => {
    setActiveThread(threadId || null);
    return () => setActiveThread(null);
  }, [threadId, setActiveThread]);

  useEffect(() => {
    if (!threadId) return;
    loadMessages(threadId);
    markRead(threadId);
  }, [threadId, loadMessages, markRead]);

  useEffect(() => {
    if (!threadId) return;
    markRead(threadId);
  }, [threadId, messages?.length, markRead]);

  const data = useMemo(() => {
    // Merge server messages with local pending bubbles for snappier send UX.
    // If the real server message has landed, hide the matching pending bubble
    // to avoid a temporary duplicate during transition.
    const server = (messages || []).map((m) => ({ ...m, pending: false as const }));
    const localPending = pending
      .filter((m) => {
        const pendingAt = new Date(m.createdAt).getTime();
        return !server.some((s) => {
          if (!s.isMine) return false;
          if ((s.body || '').trim() !== (m.body || '').trim()) return false;
          const serverAt = new Date(s.createdAt).getTime();
          return Math.abs(serverAt - pendingAt) <= 15000;
        });
      })
      .map((m) => ({
        id: m.id,
        threadId: threadId || '',
        body: m.body,
        createdAt: m.createdAt,
        isMine: true,
        pending: true as const,
      }));
    return [...server, ...localPending].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }, [messages, pending, threadId]);

  useEffect(() => {
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 40);
    return () => clearTimeout(t);
  }, [data.length]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 72, android: 0 })}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 10 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, item.isMine ? styles.textMine : styles.textTheirs]}>
              {item.body}
            </Text>
            <Text style={styles.bubbleMeta}>
              {item.pending ? 'Sending...' : ''}
              {item.pending ? ' ' : ''}
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />

      <View style={[styles.composer, { paddingBottom: Math.max(10, insets.bottom) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder='Message…'
          placeholderTextColor="#9CA3AF"
          style={[styles.input, { height: inputHeight }]}
          editable={!loading}
          multiline
          textAlignVertical="top"
          scrollEnabled
          blurOnSubmit={false}
          onContentSizeChange={(e) => {
            const next = Math.max(64, Math.min(220, Math.ceil(e.nativeEvent.contentSize.height) + 16));
            setInputHeight(next);
          }}
        />
        <Pressable
          style={[styles.send, (!text.trim() || loading || isSending) && styles.sendDisabled]}
          disabled={!text.trim() || loading || isSending}
          onPress={async () => {
            if (!threadId) return;
            const body = text.trim();
            const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            setText('');
            setPending((prev) => [...prev, { id: localId, body, createdAt: new Date().toISOString() }]);
            setIsSending(true);
            try {
              await sendMessage({ threadId, body });
            } finally {
              setIsSending(false);
              setPending((prev) => prev.filter((m) => m.id !== localId));
            }
          }}
        >
          {isSending ? (
            <View style={styles.sendBusy}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.sendText}>Sending</Text>
            </View>
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 8 },
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
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 64,
    maxHeight: 220,
    fontSize: 16,
    lineHeight: 22,
    backgroundColor: '#FFFFFF',
  },
  send: {
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700' },
  sendBusy: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});


