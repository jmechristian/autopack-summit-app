import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createAdminAddOn } from '../../../../src/components/admin/addons/adminAddOnsService';
import { SessionRichTextEditor } from '../../../../src/components/admin/agenda/SessionRichTextEditor';
import { AppButton } from '../../../../src/ui/AppButton';
import { AppCard } from '../../../../src/ui/AppCard';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

export default function AdminCreateAddOnScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subheadline, setSubheadline] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [altLink, setAltLink] = useState('');
  const [type, setType] = useState('');
  const [limit, setLimit] = useState('');
  const [price, setPrice] = useState('');
  const [preferenceSchema, setPreferenceSchema] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    try {
      setSaving(true);
      const addOnId = await createAdminAddOn({
        title,
        description,
        subheadline,
        location,
        date,
        time,
        altLink,
        type,
        limit,
        price,
        preferenceSchema,
      });
      router.replace({
        pathname: '/(main)/admin/add-ons/[addOnId]',
        params: { addOnId },
      });
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Unable to create add-on.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Create Add-on</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder='Title (required)' placeholderTextColor={ui.colors.muted} style={styles.input} />
          <SessionRichTextEditor value={description} onChange={setDescription} placeholder='Description HTML (required)' />
          <TextInput value={subheadline} onChangeText={setSubheadline} placeholder='Subheadline' placeholderTextColor={ui.colors.muted} style={styles.input} />
          <TextInput value={location} onChangeText={setLocation} placeholder='Location (required)' placeholderTextColor={ui.colors.muted} style={styles.input} />
          <TextInput value={date} onChangeText={setDate} placeholder='Date (required)' placeholderTextColor={ui.colors.muted} style={styles.input} />
          <TextInput value={time} onChangeText={setTime} placeholder='Time (required)' placeholderTextColor={ui.colors.muted} style={styles.input} />
          <TextInput value={altLink} onChangeText={setAltLink} placeholder='Alt link' placeholderTextColor={ui.colors.muted} style={styles.input} autoCapitalize='none' />
          <TextInput value={type} onChangeText={setType} placeholder='Type' placeholderTextColor={ui.colors.muted} style={styles.input} />
          <TextInput value={limit} onChangeText={setLimit} placeholder='Limit (number)' placeholderTextColor={ui.colors.muted} style={styles.input} keyboardType='number-pad' />
          <TextInput value={price} onChangeText={setPrice} placeholder='Price (number)' placeholderTextColor={ui.colors.muted} style={styles.input} keyboardType='number-pad' />
          <TextInput
            value={preferenceSchema}
            onChangeText={setPreferenceSchema}
            placeholder='Preference schema JSON'
            placeholderTextColor={ui.colors.muted}
            style={[styles.input, styles.multiline]}
            multiline
          />
          <View style={{ marginTop: 12 }}>
            <AppButton
              title={saving ? 'Creating...' : 'Create Add-on'}
              onPress={create}
              disabled={saving}
              style={styles.adminButton}
            />
          </View>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#E6F1F8' },
  content: { paddingBottom: ui.space.xl, paddingTop: 6 },
  card: { marginBottom: ui.space.md, paddingVertical: 14 },
  sectionTitle: { color: ui.colors.primary, fontWeight: '800', fontSize: 16, marginBottom: 10 },
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
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  adminButton: { borderRadius: 10 },
});
