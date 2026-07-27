import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationEnabledState,
  getNotificationStatusDescription,
  getNotificationStatusLabel,
  openSystemNotificationSettings,
  type NotificationPermissionStatus,
} from '../../utils/notificationSettings';
import { deleteMyAccount, signOutAfterAccountDeletion } from '../../utils/accountDeletion';
import { useApsStore } from '../../store/apsStore';
import { useEngageStore } from '../../store/engageStore';
import { AppCard } from '../../ui/AppCard';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';

export default function SettingsTool() {
  const [status, setStatus] = useState<NotificationPermissionStatus>('undetermined');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const resetApsStore = useApsStore((state) => state.reset);
  const resetEngageStore = useEngageStore((state) => state.resetAll);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getPushNotificationEnabledState();
      setStatus(next.status);
      setEnabled(next.enabled);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshStatus();
    }, [refreshStatus]),
  );

  useFocusEffect(
    useCallback(() => {
      const sub = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') {
          void refreshStatus();
        }
      });
      return () => sub.remove();
    }, [refreshStatus]),
  );

  const handleToggle = async (nextEnabled: boolean) => {
    if (working) return;

    if (nextEnabled) {
      setWorking(true);
      try {
        const result = await enablePushNotifications();
        const next = await getPushNotificationEnabledState();
        setStatus(next.status);
        setEnabled(next.enabled);
        if (!result.ok) {
          Alert.alert(
            'Notifications not enabled',
            result.message || 'Unable to enable notifications.',
            next.status === 'denied'
              ? [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open Settings', onPress: () => void openSystemNotificationSettings() },
                ]
              : [{ text: 'OK' }],
          );
        }
      } finally {
        setWorking(false);
      }
      return;
    }

    Alert.alert(
      'Turn off notifications?',
      'You will stop receiving push notifications from AutoPack Summit in this app. You can also disable alerts in your device Settings.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => void refreshStatus() },
        {
          text: 'Turn Off',
          style: 'destructive',
          onPress: async () => {
            setWorking(true);
            try {
              await disablePushNotifications();
              await refreshStatus();
            } finally {
              setWorking(false);
            }
          },
        },
      ],
    );
  };

  const statusDescription =
    enabled || status === 'granted'
      ? getNotificationStatusDescription(status)
      : status === 'denied'
        ? getNotificationStatusDescription(status)
        : 'Notifications are turned off for this app. Turn them on to receive announcements, messages, and contact requests.';

  const statusLabel = enabled
    ? 'Allowed'
    : status === 'denied'
      ? getNotificationStatusLabel(status)
      : 'Off';

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your login, app profile, favorites, messages state, and push settings. Your event registration record is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'This cannot be undone',
              'Are you sure you want to permanently delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Account',
                  style: 'destructive',
                  onPress: () => void runDeleteAccount(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  const runDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      await disablePushNotifications().catch(() => {});
      const message = await deleteMyAccount();
      resetEngageStore();
      resetApsStore();
      await signOutAfterAccountDeletion();
      Alert.alert('Account deleted', message, [
        {
          text: 'OK',
          onPress: () => router.replace('/(auth)/login'),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Delete failed', e?.message || 'Unable to delete your account right now.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, styles.notificationsIconWrap]}>
              <Ionicons name='notifications-outline' size={16} color='#c2410c' />
            </View>
            <Text style={styles.sectionTitle}>Push Notifications</Text>
          </View>

          <Text style={styles.description}>{statusDescription}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.settingLabel}>Allow notifications</Text>
              <Text style={styles.settingMeta}>{statusLabel}</Text>
            </View>
            {loading || working ? (
              <ActivityIndicator color={ui.colors.primary} />
            ) : (
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={enabled ? ui.colors.primary : '#f9fafb'}
              />
            )}
          </View>

          {status === 'denied' ? (
            <Pressable
              style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsButtonPressed]}
              onPress={() => void openSystemNotificationSettings()}
            >
              <Ionicons name='settings-outline' size={18} color={ui.colors.primary} />
              <Text style={styles.settingsButtonText}>Open {Platform.OS === 'ios' ? 'iOS' : 'Device'} Settings</Text>
              <Ionicons name='chevron-forward' size={16} color={ui.colors.muted} />
            </Pressable>
          ) : null}
        </AppCard>

        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, styles.dangerIconWrap]}>
              <Ionicons name='warning-outline' size={16} color='#b91c1c' />
            </View>
            <Text style={styles.dangerTitle}>Danger Zone</Text>
          </View>

          <Text style={styles.description}>
            Permanently delete your AutoPack Summit app account. This removes your login, profile,
            favorites, notes, contacts, and notification tokens. Your event registration record
            remains on file.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.dangerButton,
              (deletingAccount || working) && styles.dangerButtonDisabled,
              pressed && !deletingAccount && !working && styles.dangerButtonPressed,
            ]}
            onPress={confirmDeleteAccount}
            disabled={deletingAccount || working}
          >
            {deletingAccount ? (
              <ActivityIndicator color='#b91c1c' />
            ) : (
              <Text style={styles.dangerButtonText}>Delete Account</Text>
            )}
          </Pressable>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl },
  card: { paddingVertical: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsIconWrap: {
    backgroundColor: '#ffedd5',
  },
  dangerIconWrap: {
    backgroundColor: '#fee2e2',
  },
  sectionTitle: {
    color: ui.colors.primary,
    fontWeight: '800',
    fontSize: 18,
  },
  dangerTitle: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 18,
  },
  description: {
    color: ui.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
  },
  settingCopy: {
    flex: 1,
    gap: 4,
  },
  settingLabel: {
    color: ui.colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  settingMeta: {
    color: ui.colors.muted,
    fontSize: 12,
  },
  settingsButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
  },
  settingsButtonPressed: {
    opacity: 0.92,
  },
  settingsButtonText: {
    flex: 1,
    color: ui.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  dangerButton: {
    marginTop: 4,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dangerButtonPressed: {
    opacity: 0.92,
    backgroundColor: '#fef2f2',
  },
  dangerButtonDisabled: {
    opacity: 0.6,
  },
  dangerButtonText: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 15,
  },
});
