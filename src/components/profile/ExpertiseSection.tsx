import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { normalizeExpertiseTags } from '../../constants/expertiseTags';
import { autopackColors } from '../../theme';
import { updateProfile } from '../../utils/profileMutations';
import * as APITypes from '../../API';
import { ExpertiseChips, ExpertisePickerModal } from './ExpertisePickerModal';

type ExpertiseSectionProps = {
  profile: APITypes.ApsAppUserProfile;
  onUpdate: () => Promise<void>;
  /** Sit inside the name/photo card instead of a full section. */
  embedded?: boolean;
};

function tapFeedback() {
  if (Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

export function ExpertiseSection({ profile, onUpdate, embedded = false }: ExpertiseSectionProps) {
  const saved = useMemo(
    () => normalizeExpertiseTags(profile.expertise),
    [profile.expertise],
  );
  const [selected, setSelected] = useState(saved);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const selectedRef = useRef(selected);
  const persistSeq = useRef(0);
  selectedRef.current = selected;

  useEffect(() => {
    if (saving) return;
    setSelected(saved);
  }, [saved, saving]);

  const persist = async (next: string[]) => {
    const seq = ++persistSeq.current;
    setSaving(true);
    try {
      await updateProfile({
        id: profile.id,
        expertise: next,
      });
      if (seq !== persistSeq.current) return;
      await onUpdate();
    } catch (error) {
      if (seq !== persistSeq.current) return;
      setSelected(saved);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update area of expertise',
      );
    } finally {
      if (seq === persistSeq.current) setSaving(false);
    }
  };

  const addTag = (tag: string) => {
    if (selectedRef.current.includes(tag)) return;
    tapFeedback();
    const next = [...selectedRef.current, tag];
    selectedRef.current = next;
    setSelected(next);
    void persist(next);
  };

  const removeTag = (tag: string) => {
    tapFeedback();
    const next = selectedRef.current.filter((item) => item !== tag);
    selectedRef.current = next;
    setSelected(next);
    void persist(next);
  };

  return (
    <View style={[styles.container, embedded && styles.embedded]}>
      {embedded ? (
        <View style={styles.embeddedHeader}>
          <Text style={styles.embeddedLabel}>Area of Expertise</Text>
          {saving ? <ActivityIndicator size="small" color={autopackColors.apBlue} /> : null}
        </View>
      ) : (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconWrap}>
              <Ionicons name="ribbon-outline" size={14} color="#1d4ed8" />
            </View>
            <Text style={styles.sectionHeaderText}>Area of Expertise</Text>
          </View>
          {saving ? <ActivityIndicator size="small" color={autopackColors.apBlue} /> : null}
        </View>
      )}

      {selected.length === 0 ? (
        <Text style={[styles.emptyText, embedded && styles.embeddedEmpty]}>
          {embedded
            ? 'Tap below to add areas of expertise'
            : 'No areas of expertise yet — tap below to add'}
        </Text>
      ) : (
        <ExpertiseChips tags={selected} onRemove={removeTag} />
      )}

      <Pressable
        style={styles.searchWrap}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Add area of expertise"
      >
        <Ionicons name="search" size={16} color="#6b7280" />
        <Text style={styles.searchPlaceholder}>Search areas of expertise</Text>
      </Pressable>

      <ExpertisePickerModal
        visible={open}
        selected={selected}
        onSelect={addTag}
        onClose={() => setOpen(false)}
        mode="add"
      />

      {embedded ? null : <View style={styles.sectionDivider} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    padding: 0,
    marginBottom: 2,
    borderWidth: 0,
  },
  embedded: {
    marginTop: 14,
    marginBottom: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  embeddedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  embeddedLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  embeddedEmpty: {
    paddingVertical: 8,
    textAlign: 'left',
    fontSize: 14,
  },
  sectionHeader: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 18,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#9ca3af',
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
    marginTop: 14,
  },
});
