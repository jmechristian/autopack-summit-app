import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RegistrantType } from '../../../API';
import { ui } from '../../../ui/tokens';
import {
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  formatAudienceTypes,
} from './adminAnnouncementsService';

type AnnouncementAudienceFieldProps = {
  value: RegistrantType[];
  onChange: (value: RegistrantType[]) => void;
  previewCount?: number | null;
  previewLoading?: boolean;
};

export function AnnouncementAudienceField({
  value,
  onChange,
  previewCount,
  previewLoading,
}: AnnouncementAudienceFieldProps) {
  const selected = new Set(value);

  const toggle = (type: RegistrantType) => {
    if (selected.has(type)) {
      onChange(value.filter((item) => item !== type));
      return;
    }
    onChange([...value, type]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Audience</Text>
      <Text style={styles.helpText}>
        Leave all unchecked to notify everyone… Check one or more types to send only to those
        registrants for this event.
      </Text>

      <View style={styles.list}>
        {ANNOUNCEMENT_AUDIENCE_OPTIONS.map((option) => {
          const checked = selected.has(option.value);
          return (
            <Pressable
              key={option.value}
              style={[styles.row, checked && styles.rowChecked]}
              onPress={() => toggle(option.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={option.label}
            >
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={20}
                color={checked ? ui.colors.primary : ui.colors.muted}
              />
              <Text style={[styles.rowLabel, checked && styles.rowLabelChecked]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.summary}>
        {value.length
          ? `Sending to ${formatAudienceTypes(value)}`
          : 'Sending to all registration types'}
      </Text>
      {previewLoading ? (
        <Text style={styles.preview}>Counting matching app users…</Text>
      ) : previewCount != null ? (
        <Text style={styles.preview}>
          {previewCount} {previewCount === 1 ? 'registrant' : 'registrants'} with an app account match
          this audience.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  label: { color: ui.colors.text, fontWeight: '700', fontSize: 14 },
  helpText: { color: ui.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  list: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ui.colors.border,
  },
  rowChecked: {
    backgroundColor: '#F8FBFF',
  },
  rowLabel: {
    color: ui.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  rowLabelChecked: {
    color: ui.colors.primary,
  },
  summary: {
    marginTop: 8,
    color: ui.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  preview: {
    marginTop: 4,
    color: ui.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
});
