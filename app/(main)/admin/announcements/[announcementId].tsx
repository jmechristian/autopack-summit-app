import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AdminAnnouncementFormLayout } from '../../../../src/components/admin/announcements/AdminAnnouncementFormLayout';
import {
  AdminAnnouncementDetail,
  confirmImmediatePublish,
  deleteAdminAnnouncement,
  formatAnnouncementDateTime,
  getAdminAnnouncementDetail,
  publishAdminAnnouncementNow,
  splitScheduleFields,
  updateAdminAnnouncement,
  dateToScheduleFields,
  getDefaultScheduleDate,
} from '../../../../src/components/admin/announcements/adminAnnouncementsService';
import { AnnouncementDeepLinkField } from '../../../../src/components/admin/announcements/AnnouncementDeepLinkField';
import { AnnouncementScheduleField } from '../../../../src/components/admin/announcements/AnnouncementScheduleField';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

function formatActionError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  const message = String((error as any)?.message || error || '').trim();
  return message || fallback;
}

export default function AdminAnnouncementDetailScreen() {
  const { announcementId } = useLocalSearchParams<{ announcementId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminAnnouncementDetail | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const clearFormError = () => {
    if (formError) setFormError(null);
  };

  const load = useCallback(async () => {
    if (!announcementId) return;
    try {
      setLoading(true);
      setError(null);
      const next = await getAdminAnnouncementDetail(announcementId);
      setDetail(next);
      setTitle(next.title || '');
      setBody(next.body || '');
      setDeepLink(next.deepLink || '');
      const scheduled = splitScheduleFields(next.scheduledAt);
      setScheduleEnabled(next.status === 'scheduled' || next.status === 'ready');
      setScheduleDate(scheduled.date);
      setScheduleTime(scheduled.time);
    } catch (e: any) {
      setError(e?.message || 'Unable to load announcement.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const save = async () => {
    if (!detail) return;
    try {
      setSaving('save');
      setFormError(null);
      await updateAdminAnnouncement(detail.id, {
        title,
        body,
        deepLink,
        scheduleEnabled: detail.status === 'published' ? false : scheduleEnabled,
        scheduleDate,
        scheduleTime,
      });
      await load();
    } catch (e: any) {
      const message = formatActionError(e, 'Unable to update announcement.');
      setFormError(message);
      Alert.alert('Save failed', message);
    } finally {
      setSaving(null);
    }
  };

  const publishNow = () => {
    if (!detail) return;

    confirmImmediatePublish(async () => {
      try {
        setSaving('publish');
        setFormError(null);
        await publishAdminAnnouncementNow(detail.id);
        await load();
      } catch (e: any) {
        const message = formatActionError(e, 'Unable to publish announcement.');
        setFormError(message);
        Alert.alert('Publish failed', message);
      } finally {
        setSaving(null);
      }
    });
  };

  const remove = async () => {
    if (!detail) return;
    Alert.alert('Delete announcement', `Delete "${detail.title || 'this announcement'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving('delete');
            setFormError(null);
            await deleteAdminAnnouncement(detail.id);
            router.replace('/(main)/admin/announcements');
          } catch (e: any) {
            const message = formatActionError(e, 'Unable to delete announcement.');
            setFormError(message);
            Alert.alert('Delete failed', message);
          } finally {
            setSaving(null);
          }
        },
      },
    ]);
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

  if (loading && !detail) {
    return (
      <AppScreen style={styles.screen}>
        <Text style={styles.meta}>Loading announcement...</Text>
      </AppScreen>
    );
  }

  if (error && !detail) {
    return (
      <AppScreen style={styles.screen}>
        <Text style={styles.error}>{error}</Text>
      </AppScreen>
    );
  }

  if (!detail) {
    return (
      <AppScreen style={styles.screen}>
        <Text style={styles.meta}>Announcement not found.</Text>
      </AppScreen>
    );
  }

  const canEditSchedule = detail.status !== 'published';

  return (
    <AdminAnnouncementFormLayout error={formError} onClearError={() => setFormError(null)}>
      <AppCard style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Announcement</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{detail.statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.meta}>Created {formatAnnouncementDateTime(detail.createdAt)}</Text>
        {detail.publishedAt ? (
          <Text style={styles.meta}>Published {formatAnnouncementDateTime(detail.publishedAt)}</Text>
        ) : null}
        {detail.scheduledAt ? (
          <Text style={styles.meta}>
            Scheduled for {formatAnnouncementDateTime(detail.scheduledAt)}
          </Text>
        ) : null}
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>Edit</Text>
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

        {canEditSchedule ? (
          <>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Schedule for later</Text>
                <Text style={styles.switchHint}>
                  Turn off and use Publish now to send immediately.
                </Text>
              </View>
              <Switch value={scheduleEnabled} onValueChange={enableSchedule} />
            </View>
            {scheduleEnabled ? (
              <AnnouncementScheduleField
                scheduleDate={scheduleDate}
                scheduleTime={scheduleTime}
                allowPast={detail.status === 'ready'}
                onChange={(date, time) => {
                  setScheduleDate(date);
                  setScheduleTime(time);
                  clearFormError();
                }}
              />
            ) : (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Publish now will go live instantly and notify all users with push notifications
                  enabled.
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.helpText}>
            Published announcements can be edited, but scheduling changes are locked.
          </Text>
        )}

        <View style={styles.actions}>
          <AppButton
            title={saving === 'save' ? 'Saving...' : 'Save Changes'}
            onPress={save}
            disabled={!!saving}
            style={styles.adminButton}
          />
          {canEditSchedule ? (
            <AppButton
              title={saving === 'publish' ? 'Publishing...' : 'Publish Now'}
              onPress={publishNow}
              disabled={!!saving}
              style={[styles.adminButton, styles.publishButton]}
            />
          ) : null}
          <AppButton
            title={saving === 'delete' ? 'Deleting...' : 'Delete Announcement'}
            onPress={remove}
            disabled={!!saving}
            style={[styles.adminButton, styles.dangerButton]}
          />
        </View>
      </AppCard>
    </AdminAnnouncementFormLayout>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  card: { marginBottom: ui.space.md, paddingVertical: 14 },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusPill: {
    backgroundColor: ui.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { color: '#fff', fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  meta: { color: ui.colors.muted, marginTop: 4, lineHeight: 18 },
  helpText: { color: ui.colors.muted, lineHeight: 20, marginTop: 10 },
  error: { color: ui.colors.danger },
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
  actions: { marginTop: 14, gap: 10 },
  adminButton: { borderRadius: 10 },
  publishButton: { backgroundColor: '#c2410c' },
  dangerButton: { backgroundColor: ui.colors.danger },
});
