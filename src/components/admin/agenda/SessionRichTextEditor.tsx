import RenderHtml from 'react-native-render-html';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ui } from '../../../ui/tokens';

type SessionRichTextEditorProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

type SelectionRange = { start: number; end: number };

function wrapSelection(
  input: string,
  selection: SelectionRange,
  before: string,
  after: string,
): { next: string; selection: SelectionRange } {
  const start = Math.max(0, Math.min(selection.start, selection.end));
  const end = Math.max(0, Math.max(selection.start, selection.end));
  const selected = input.slice(start, end);
  const next = `${input.slice(0, start)}${before}${selected}${after}${input.slice(end)}`;
  const caret = start + before.length + selected.length + after.length;
  return { next, selection: { start: caret, end: caret } };
}

export function SessionRichTextEditor({
  value,
  onChange,
  placeholder = 'Description (supports simple HTML)',
}: SessionRichTextEditorProps) {
  const { width } = useWindowDimensions();
  const [selection, setSelection] = useState<SelectionRange>({ start: 0, end: 0 });

  const applyTag = (before: string, after: string) => {
    const { next, selection: nextSelection } = wrapSelection(value || '', selection, before, after);
    onChange(next);
    setSelection(nextSelection);
  };

  const applyParagraph = () => applyTag('<p>', '</p>');
  const applyBold = () => applyTag('<strong>', '</strong>');
  const applyUnderline = () => applyTag('<u>', '</u>');
  const applyLineBreak = () => applyTag('<br/>', '');

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={applyParagraph}>
          <Text style={styles.toolBtnText}>Paragraph</Text>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={applyBold}>
          <Text style={styles.toolBtnText}>Bold</Text>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={applyUnderline}>
          <Text style={styles.toolBtnText}>Underline</Text>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={applyLineBreak}>
          <Text style={styles.toolBtnText}>Line break</Text>
        </Pressable>
      </View>

      <TextInput
        value={value}
        onChangeText={onChange}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        selection={selection}
        placeholder={placeholder}
        placeholderTextColor={ui.colors.muted}
        style={styles.input}
        multiline
      />

      {!!value.trim() && (
        <View style={styles.previewWrap}>
          <Text style={styles.previewTitle}>Preview</Text>
          <RenderHtml
            contentWidth={Math.max(1, width - 64)}
            source={{ html: value }}
            baseStyle={styles.previewText}
            tagsStyles={{
              p: { marginTop: 0, marginBottom: 12 },
              br: { marginBottom: 0 },
              strong: { fontWeight: '700' },
              b: { fontWeight: '700' },
              u: { textDecorationLine: 'underline' },
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  toolBtn: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toolBtnText: { color: ui.colors.primary, fontWeight: '700', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    minHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: ui.colors.text,
    textAlignVertical: 'top',
  },
  previewWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 10,
  },
  previewTitle: { color: ui.colors.primary, fontWeight: '700', marginBottom: 6 },
  previewText: { color: ui.colors.text, lineHeight: 20 },
});
