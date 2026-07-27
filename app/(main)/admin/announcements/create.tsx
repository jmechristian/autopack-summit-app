import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AdminAnnouncementFormLayout } from '../../../../src/components/admin/announcements/AdminAnnouncementFormLayout';
import {
  confirmImmediatePublish,
  createAdminAnnouncement,
  dateToScheduleFields,
  getDefaultScheduleDate,
} from '../../../../src/components/admin/announcements/adminAnnouncementsService';
import { AnnouncementDeepLinkField } from '../../../../src/components/admin/announcements/AnnouncementDeepLinkField';
import { AnnouncementScheduleField } from '../../../../src/components/admin/announcements/AnnouncementScheduleField';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { ui } from '../../../../src/ui/tokens';

export default function AdminCreateAnnouncementScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const clearFormError = () => {
    if (formError) setFormError(null);
  };

  const runCreate = async () => {
    try {
      setSaving(true);
      setFormError(null);
      await createAdminAnnouncement({
        title,
        body,
        deepLink,
        scheduleEnabled,
        scheduleDate,
        scheduleTime,
      });
      router.replace('/(main)/admin/announcements');
    } catch (e: any) {
      const message =
        e instanceof Error
          ? e.message
          : String(e?.message || e || 'Unable to create announcement.');
      setFormError(message);
      Alert.alert('Create failed', message);
    } finally {
      setSaving(false);
    }
  };

  const create = () => {
    if (scheduleEnabled) {
      void runCreate();
      return;
    }

    confirmImmediatePublish(runCreate);
  };

  const enableSchedule = (enabled: boolean) => {
    setScheduleEnabled(enabled);
    if (enabled && !scheduleDate && !scheduleTime) {
      const defaults = dateToScheduleFields(getDefaultScheduleDate());
      setScheduleDate(defaults.scheduleDate);
      setScheduleTime(defaults.scheduleTime);
    }
    clearFormError();
  };

  return (
    <AdminAnnouncementFormLayout error={formError} onClearError={() => setFormError(null)}>
      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>Create Announcement</Text>
        <Text style={styles.helpText}>
          Published announcements send a push notification to all users with notifications enabled.
        </Text>
        <TextInput
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            clearFormError();
          }}
          placeholder='Title (optional)'
          placeholderTextColor={ui.colors.muted}
          style={styles.input}
        />
        <TextInput
          value={body}
          onChangeText={(value) => {
            setBody(value);
            clearFormError();
          }}
          placeholder='Message body (required)'
          placeholderTextColor={ui.colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlignVertical='top'
        />
        <AnnouncementDeepLinkField
          value={deepLink}
          onChange={(value) => {
            setDeepLink(value);
            clearFormError();
          }}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Schedule for later</Text>
            <Text style={styles.switchHint}>
              {scheduleEnabled
                ? 'The announcement will stay hidden until the scheduled time.'
                : 'Publish now sends immediately with a push notification.'}
            </Text>
          </View>
          <Switch value={scheduleEnabled} onValueChange={enableSchedule} />
        </View>

        {!scheduleEnabled ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Publish now will go live instantly and notify all users with push notifications enabled.
            </Text>
          </View>
        ) : null}

        {scheduleEnabled ? (
          <AnnouncementScheduleField
            scheduleDate={scheduleDate}
            scheduleTime={scheduleTime}
            onChange={(date, time) => {
              setScheduleDate(date);
              setScheduleTime(time);
              clearFormError();
            }}
          />
        ) : null}

        <View style={{ marginTop: 12 }}>
          <AppButton
            title={
              saving
                ? 'Saving...'
                : scheduleEnabled
                  ? 'Schedule Announcement'
                  : 'Publish Now'
            }
            onPress={create}
            disabled={saving}
            style={scheduleEnabled ? styles.adminButton : [styles.adminButton, styles.publishButton]}
          />
        </View>
      </AppCard>
    </AdminAnnouncementFormLayout>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: ui.space.md, paddingVertical: 14 },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  helpText: { color: ui.colors.muted, lineHeight: 20, marginBottom: 8 },
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
  multiline: { minHeight: 120 },
  switchRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: { color: ui.colors.text, fontWeight: '700' },
  switchHint: { color: ui.colors.muted, marginTop: 2, fontSize: 12, lineHeight: 16 },
  warningBox: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#ffedd5',
  },
  warningText: {
    color: '#9a3412',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  adminButton: { borderRadius: 10 },
  publishButton: { backgroundColor: '#c2410c' },
});
