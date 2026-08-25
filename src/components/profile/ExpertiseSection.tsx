import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EXPERTISE_TAGS, normalizeExpertiseTags } from '../../constants/expertiseTags';
import { autopackColors } from '../../theme';
import { updateProfile } from '../../utils/profileMutations';
import * as APITypes from '../../API';

type ExpertiseSectionProps = {
  profile: APITypes.ApsAppUserProfile;
  onUpdate: () => Promise<void>;
};

export function ExpertiseSection({ profile, onUpdate }: ExpertiseSectionProps) {
  const selected = useMemo(
    () => normalizeExpertiseTags(profile.expertise),
    [profile.expertise],
  );
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);

  const available = useMemo(() => {
    const selectedSet = new Set(selected);
    const q = query.trim().toLowerCase();
    return EXPERTISE_TAGS.filter((tag) => {
      if (selectedSet.has(tag)) return false;
      if (!q) return true;
      return tag.toLowerCase().includes(q);
    });
  }, [query, selected]);

  const persist = async (next: string[]) => {
    setSaving(true);
    try {
      await updateProfile({
        id: profile.id,
        expertise: next,
      });
      await onUpdate();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update area of expertise',
      );
    } finally {
      setSaving(false);
    }
  };

  const addTag = async (tag: string) => {
    if (saving || selected.includes(tag)) return;
    setQuery('');
    await persist([...selected, tag]);
  };

  const removeTag = async (tag: string) => {
    if (saving) return;
    await persist(selected.filter((item) => item !== tag));
  };

  const showDropdown = focused && available.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name="ribbon-outline" size={14} color="#1d4ed8" />
          </View>
          <Text style={styles.sectionHeaderText}>Area of Expertise</Text>
        </View>
        {saving ? <ActivityIndicator size="small" color={autopackColors.apBlue} /> : null}
      </View>

      {selected.length === 0 ? (
        <Text style={styles.emptyText}>No areas of expertise yet — search and tap to add</Text>
      ) : (
        <View style={styles.chipWrap}>
          {selected.map((tag) => (
            <View key={tag} style={styles.chip}>
              <Text style={styles.chipText}>{tag}</Text>
              <Pressable
                hitSlop={8}
                disabled={saving}
                onPress={() => removeTag(tag)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${tag}`}
              >
                <Ionicons name="close" size={14} color="#1d4ed8" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay so a tap on a result still registers.
            setTimeout(() => setFocused(false), 150);
          }}
          placeholder="Search areas of expertise"
          placeholderTextColor="#9ca3af"
          autoCorrect={false}
          autoCapitalize="none"
          editable={!saving}
        />
      </View>

      {showDropdown ? (
        <ScrollView
          style={styles.dropdown}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {available.map((tag) => (
            <Pressable
              key={tag}
              style={styles.option}
              disabled={saving}
              onPress={() => addTag(tag)}
            >
              <Text style={styles.optionText}>{tag}</Text>
              <Ionicons name="add" size={16} color={autopackColors.apBlue} />
            </Pressable>
          ))}
        </ScrollView>
      ) : focused && available.length === 0 ? (
        <Text style={styles.noMatches}>No matching areas of expertise</Text>
      ) : null}

      <View style={styles.sectionDivider} />
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
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
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
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 2,
  },
  dropdown: {
    maxHeight: 280,
    marginHorizontal: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  optionText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  noMatches: {
    color: '#6b7280',
    fontSize: 13,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
    marginTop: 14,
  },
});
