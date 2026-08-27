import { Ionicons } from '@expo/vector-icons';
import { Overlay } from '@rneui/themed';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { EXPERTISE_TAGS } from '../../constants/expertiseTags';
import { autopackColors } from '../../theme';

export function ExpertiseChips({
  tags,
  onRemove,
  maxVisible,
  onPressMore,
}: {
  tags: string[];
  onRemove?: (tag: string) => void;
  maxVisible?: number;
  onPressMore?: () => void;
}) {
  if (!tags.length) return null;
  const visible = maxVisible != null ? tags.slice(0, maxVisible) : tags;
  const extra = tags.length - visible.length;
  return (
    <View style={chipStyles.wrap}>
      {visible.map((tag) => (
        <View key={tag} style={chipStyles.chip}>
          <Text style={chipStyles.text}>{tag}</Text>
          {onRemove ? (
            <Pressable
              hitSlop={8}
              onPress={() => onRemove(tag)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${tag}`}
            >
              <Ionicons name="close" size={14} color="#1d4ed8" />
            </Pressable>
          ) : null}
        </View>
      ))}
      {extra > 0 ? (
        <Pressable
          style={chipStyles.chip}
          onPress={onPressMore}
          accessibilityRole="button"
          accessibilityLabel={`Show ${extra} more areas of expertise`}
        >
          <Text style={chipStyles.text}>+{extra} more</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ExpertisePickerModalProps = {
  visible: boolean;
  selected: string[];
  onSelect: (tag: string) => void;
  onClose: () => void;
  title?: string;
  /**
   * `add` hides already-selected tags (profile).
   * `filter` keeps them in the list with a checkmark so several can be toggled.
   */
  mode?: 'add' | 'filter';
};

export function ExpertisePickerModal({
  visible,
  selected,
  onSelect,
  onClose,
  title = 'Area of Expertise',
  mode = 'add',
}: ExpertisePickerModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const rows = useMemo(() => {
    const selectedSet = new Set(selected);
    const q = query.trim().toLowerCase();
    return EXPERTISE_TAGS.filter((tag) => {
      if (mode === 'add' && selectedSet.has(tag)) return false;
      if (!q) return true;
      return tag.toLowerCase().includes(q);
    });
  }, [mode, query, selected]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <Overlay
      isVisible={visible}
      onBackdropPress={onClose}
      overlayStyle={[styles.overlay, { height: Math.min(windowHeight * 0.75, 560) }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlayBody}
      >
        <View style={styles.overlayHeader}>
          <Text style={styles.overlayTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>

        {mode === 'filter' && selected.length ? (
          <ExpertiseChips tags={selected} onRemove={onSelect} />
        ) : null}

        <View style={styles.modalSearchWrap}>
          <Ionicons name="search" size={16} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search areas of expertise"
            placeholderTextColor="#9ca3af"
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />
        </View>

        {rows.length === 0 ? (
          <Text style={styles.noMatches}>No matching areas of expertise</Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(tag) => tag}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            style={styles.list}
            extraData={selected}
            renderItem={({ item: tag }) => {
              const isSelected = selectedSet.has(tag);
              return (
                <Pressable
                  style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                  android_ripple={{ color: '#bfdbfe' }}
                  onPress={() => onSelect(tag)}
                >
                  {({ pressed }) => (
                    <>
                      <Text
                        style={[
                          styles.optionText,
                          (pressed || isSelected) && styles.optionTextPressed,
                        ]}
                      >
                        {tag}
                      </Text>
                      <Ionicons
                        name={
                          isSelected || pressed ? 'checkmark-circle' : 'add-circle-outline'
                        }
                        size={22}
                        color={isSelected || pressed ? '#1d4ed8' : autopackColors.apBlue}
                      />
                    </>
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </Overlay>
  );
}

const chipStyles = StyleSheet.create({
  wrap: {
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
  text: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
  },
});

const styles = StyleSheet.create({
  overlay: {
    width: '90%',
    padding: 16,
    borderRadius: 16,
  },
  overlayBody: {
    flex: 1,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  doneText: {
    color: autopackColors.apBlue,
    fontSize: 15,
    fontWeight: '700',
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 2,
  },
  list: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  optionPressed: {
    backgroundColor: '#dbeafe',
    borderBottomColor: '#bfdbfe',
  },
  optionText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  optionTextPressed: {
    color: '#1d4ed8',
  },
  noMatches: {
    color: '#6b7280',
    fontSize: 13,
    paddingHorizontal: 4,
    paddingTop: 12,
  },
});
