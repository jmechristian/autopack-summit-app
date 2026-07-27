import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  dateToScheduleFields,
  formatSchedulePickerDate,
  formatSchedulePickerSummary,
  formatSchedulePickerTime,
  getDefaultScheduleDate,
  scheduleFieldsToDate,
} from './adminAnnouncementsService';
import { ui } from '../../../ui/tokens';

type PickerMode = 'date' | 'time' | null;

type AnnouncementScheduleFieldProps = {
  scheduleDate: string;
  scheduleTime: string;
  onChange: (scheduleDate: string, scheduleTime: string) => void;
  allowPast?: boolean;
};

export function AnnouncementScheduleField({
  scheduleDate,
  scheduleTime,
  onChange,
  allowPast = false,
}: AnnouncementScheduleFieldProps) {
  const resolvedDate = useMemo(
    () => scheduleFieldsToDate(scheduleDate, scheduleTime) ?? getDefaultScheduleDate(),
    [scheduleDate, scheduleTime],
  );
  const [selectedDate, setSelectedDate] = useState(resolvedDate);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [draftDate, setDraftDate] = useState(resolvedDate);

  useEffect(() => {
    setSelectedDate(resolvedDate);
  }, [resolvedDate]);

  const summary = formatSchedulePickerSummary(scheduleDate, scheduleTime);
  const minimumDate = allowPast ? undefined : new Date();

  const openPicker = (mode: Exclude<PickerMode, null>) => {
    setDraftDate(selectedDate);
    setPickerMode(mode);
  };

  const closePicker = () => {
    setPickerMode(null);
  };

  const applyDraft = () => {
    setSelectedDate(draftDate);
    const fields = dateToScheduleFields(draftDate);
    onChange(fields.scheduleDate, fields.scheduleTime);
    closePicker();
  };

  const handlePickerChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        closePicker();
        return;
      }
      if (!nextDate) return;

      if (pickerMode === 'date') {
        const merged = new Date(selectedDate);
        merged.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
        setSelectedDate(merged);
        const fields = dateToScheduleFields(merged);
        onChange(fields.scheduleDate, fields.scheduleTime);
      } else if (pickerMode === 'time') {
        const merged = new Date(selectedDate);
        merged.setHours(nextDate.getHours(), nextDate.getMinutes(), 0, 0);
        setSelectedDate(merged);
        const fields = dateToScheduleFields(merged);
        onChange(fields.scheduleDate, fields.scheduleTime);
      }
      closePicker();
      return;
    }

    if (nextDate) {
      if (pickerMode === 'date') {
        const merged = new Date(draftDate);
        merged.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
        setDraftDate(merged);
        return;
      }
      if (pickerMode === 'time') {
        const merged = new Date(draftDate);
        merged.setHours(nextDate.getHours(), nextDate.getMinutes(), 0, 0);
        setDraftDate(merged);
      }
    }
  };

  return (
    <View style={styles.wrap}>
      {summary ? (
        <View style={styles.summaryCard}>
          <Ionicons name='calendar' size={18} color={ui.colors.primary} />
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.pickerButton}
          onPress={() => openPicker('date')}
        >
          <Text style={styles.pickerLabel}>Date</Text>
          <Text style={styles.pickerValue}>{formatSchedulePickerDate(selectedDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.pickerButton}
          onPress={() => openPicker('time')}
        >
          <Text style={styles.pickerLabel}>Time</Text>
          <Text style={styles.pickerValue}>{formatSchedulePickerTime(selectedDate)}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Times use your device timezone.</Text>

      {Platform.OS === 'ios' ? (
        <Modal
          visible={pickerMode !== null}
          transparent
          animationType='slide'
          onRequestClose={closePicker}
        >
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={closePicker} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Pressable onPress={closePicker} hitSlop={8}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalTitle}>
                  {pickerMode === 'date' ? 'Choose date' : 'Choose time'}
                </Text>
                <Pressable onPress={applyDraft} hitSlop={8}>
                  <Text style={styles.modalDone}>Done</Text>
                </Pressable>
              </View>
              <View style={styles.pickerHost}>
                {pickerMode ? (
                  <DateTimePicker
                    value={draftDate}
                    mode={pickerMode}
                    display='spinner'
                    onChange={handlePickerChange}
                    minimumDate={pickerMode === 'date' ? minimumDate : undefined}
                    themeVariant='light'
                    style={styles.iosPicker}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {pickerMode && Platform.OS === 'android' ? (
        <DateTimePicker
          value={selectedDate}
          mode={pickerMode}
          onChange={handlePickerChange}
          minimumDate={pickerMode === 'date' ? minimumDate : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    marginBottom: 10,
  },
  summaryText: {
    flex: 1,
    color: ui.colors.primary,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 72,
    justifyContent: 'center',
  },
  pickerLabel: {
    color: ui.colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  pickerValue: {
    color: ui.colors.text,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  hint: {
    marginTop: 8,
    color: ui.colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: ui.colors.border,
  },
  modalTitle: {
    color: ui.colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  modalCancel: {
    color: ui.colors.muted,
    fontWeight: '600',
    fontSize: 16,
    minWidth: 64,
  },
  modalDone: {
    color: ui.colors.primary,
    fontWeight: '800',
    fontSize: 16,
    minWidth: 64,
    textAlign: 'right',
  },
  pickerHost: {
    height: 216,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iosPicker: {
    height: 216,
    width: '100%',
  },
});
