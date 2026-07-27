import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AdminAgendaSession,
  listAdminAgendaSessions,
  normalizeAgendaTimeInput,
} from '../agenda/adminAgendaService';
import { AppButton } from '../../../ui/AppButton';
import { ui } from '../../../ui/tokens';
import {
  buildSessionDeepLink,
  extractSessionIdFromDeepLink,
  isNotificationsDeepLink,
} from '../../../utils/announcementDeepLinks';

type AnnouncementDeepLinkFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

function formatSessionMeta(session: AdminAgendaSession) {
  const start = normalizeAgendaTimeInput(session.startTime);
  const end = normalizeAgendaTimeInput(session.endTime);
  const timeWindow = start && end ? `${start} - ${end} ET` : start ? `${start} ET` : 'No time';
  return [session.date || 'No date', timeWindow, session.location || 'No location'].join(' • ');
}

export function AnnouncementDeepLinkField({ value, onChange }: AnnouncementDeepLinkFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AdminAgendaSession[]>([]);
  const [search, setSearch] = useState('');

  const selectedSessionId = extractSessionIdFromDeepLink(value);
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [selectedSessionId, sessions],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listAdminAgendaSessions();
        if (!cancelled) setSessions(data.sessions);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to load sessions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => {
      const title = String(session.title || '').toLowerCase();
      const date = String(session.date || '').toLowerCase();
      const location = String(session.location || '').toLowerCase();
      return title.includes(q) || date.includes(q) || location.includes(q);
    });
  }, [search, sessions]);

  const handleSelectSession = (session: AdminAgendaSession) => {
    onChange(buildSessionDeepLink(session.id));
    setShowPicker(false);
    setSearch('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Tap destination</Text>
      <Text style={styles.helpText}>
        Choose a session to open when someone taps the push notification. Leave unset to open
        Notifications.
      </Text>

      <View style={styles.selectionCard}>
        {selectedSession ? (
          <>
            <View style={styles.selectionHeader}>
              <Ionicons name='calendar-outline' size={18} color={ui.colors.primary} />
              <Text style={styles.selectionTitle}>{selectedSession.title || 'Untitled Session'}</Text>
            </View>
            <Text style={styles.selectionMeta}>{formatSessionMeta(selectedSession)}</Text>
            <Text style={styles.linkPreview}>{buildSessionDeepLink(selectedSession.id)}</Text>
          </>
        ) : (
          <Text style={styles.selectionEmpty}>Opens Notifications when tapped</Text>
        )}

        <View style={styles.actionsRow}>
          <AppButton
            title={selectedSession ? 'Change Session' : 'Choose Session'}
            onPress={() => setShowPicker(true)}
            style={styles.actionButton}
          />
          {selectedSession || (!isNotificationsDeepLink(value) && value.trim()) ? (
            <Pressable
              style={styles.clearButton}
              onPress={() => {
                onChange('');
                setShowAdvanced(false);
              }}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable style={styles.advancedToggle} onPress={() => setShowAdvanced((current) => !current)}>
        <Text style={styles.advancedToggleText}>
          {showAdvanced ? 'Hide custom link' : 'Use custom link instead'}
        </Text>
      </Pressable>

      {showAdvanced ? (
        <TextInput
          value={isNotificationsDeepLink(value) ? '' : value}
          onChangeText={onChange}
          placeholder='Custom deep link (optional)'
          placeholderTextColor={ui.colors.muted}
          style={styles.input}
          autoCapitalize='none'
          autoCorrect={false}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={showPicker} animationType='slide' onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Session</Text>
            <Pressable onPress={() => setShowPicker(false)} hitSlop={8}>
              <Ionicons name='close' size={24} color={ui.colors.primary} />
            </Pressable>
          </View>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search sessions'
            placeholderTextColor={ui.colors.muted}
            style={styles.searchInput}
            autoCapitalize='none'
          />

          {loading ? <Text style={styles.modalMeta}>Loading sessions...</Text> : null}

          <FlatList
            data={filteredSessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalList}
            keyboardShouldPersistTaps='handled'
            renderItem={({ item }) => {
              const selected = item.id === selectedSessionId;
              return (
                <Pressable
                  style={[styles.sessionRow, selected && styles.sessionRowSelected]}
                  onPress={() => handleSelectSession(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionTitle}>{item.title || 'Untitled Session'}</Text>
                    <Text style={styles.sessionMeta}>{formatSessionMeta(item)}</Text>
                  </View>
                  {selected ? (
                    <Ionicons name='checkmark-circle' size={20} color={ui.colors.primary} />
                  ) : (
                    <Ionicons name='chevron-forward' size={18} color={ui.colors.muted} />
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              !loading ? <Text style={styles.modalMeta}>No sessions matched your search.</Text> : null
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  label: { color: ui.colors.text, fontWeight: '700', fontSize: 14 },
  helpText: { color: ui.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  selectionCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 14,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionTitle: {
    flex: 1,
    color: ui.colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  selectionMeta: {
    marginTop: 6,
    color: ui.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  linkPreview: {
    marginTop: 8,
    color: '#374151',
    fontSize: 11,
  },
  selectionEmpty: {
    color: ui.colors.muted,
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearButtonText: {
    color: ui.colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  advancedToggle: {
    marginTop: 10,
  },
  advancedToggleText: {
    color: ui.colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
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
  error: { color: ui.colors.danger, marginTop: 8, fontSize: 12 },
  modalContainer: {
    flex: 1,
    backgroundColor: '#E6F1F8',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: ui.colors.primary,
    fontWeight: '800',
    fontSize: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    color: ui.colors.text,
    marginBottom: 12,
  },
  modalList: {
    paddingBottom: 32,
  },
  modalMeta: {
    color: ui.colors.muted,
    paddingVertical: 12,
  },
  sessionRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionRowSelected: {
    borderColor: ui.colors.primary,
    backgroundColor: '#F8FBFF',
  },
  sessionTitle: {
    color: ui.colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  sessionMeta: {
    marginTop: 4,
    color: ui.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
