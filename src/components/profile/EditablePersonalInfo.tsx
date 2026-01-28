// src/components/profile/EditablePersonalInfo.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button, Input } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { autopackColors } from '../../theme';
import { updateProfile } from '../../utils/profileMutations';
import * as APITypes from '../../API';

interface EditablePersonalInfoProps {
  profile: APITypes.ApsAppUserProfile;
  onUpdate: () => Promise<void>;
}

export function EditablePersonalInfo({ profile, onUpdate }: EditablePersonalInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    email: profile.email || '',
    phone: profile.phone || '',
    company: profile.company || '',
    jobTitle: profile.jobTitle || '',
    bio: profile.bio || '',
  });

  useEffect(() => {
    setFormData({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      company: profile.company || '',
      jobTitle: profile.jobTitle || '',
      bio: profile.bio || '',
    });
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({
        id: profile.id,
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        company: formData.company.trim() || undefined,
        jobTitle: formData.jobTitle.trim() || undefined,
        bio: formData.bio.trim() || undefined,
      });
      setIsEditing(false);
      await onUpdate();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      company: profile.company || '',
      jobTitle: profile.jobTitle || '',
      bio: profile.bio || '',
    });
    setIsEditing(false);
  };

  const renderField = (label: string, value: string, key: keyof typeof formData) => {
    if (isEditing) {
      const isBio = key === 'bio';
      return (
        <Input
          key={key}
          label={label}
          value={formData[key]}
          onChangeText={(text) => setFormData({ ...formData, [key]: text })}
          containerStyle={styles.inputContainer}
          multiline={isBio}
          numberOfLines={isBio ? 6 : 1}
          inputStyle={isBio ? styles.textAreaInput : undefined}
          textAlignVertical={isBio ? 'top' : 'center'}
        />
      );
    }
    return (
      <View key={key} style={styles.fieldRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value || 'Not provided'}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Personal Info</Text>
        {!isEditing ? (
          <Button
            type="clear"
            icon={<Ionicons name="pencil" size={20} color={autopackColors.apBlue} />}
            onPress={() => setIsEditing(true)}
            title=""
          />
        ) : (
          <View style={styles.editActions}>
            <Button
              type="clear"
              title="Cancel"
              onPress={handleCancel}
              titleStyle={styles.cancelButtonText}
            />
            <Button
              title="Save"
              onPress={handleSave}
              loading={loading}
              buttonStyle={styles.saveButton}
            />
          </View>
        )}
      </View>

      <View style={styles.headerDivider} />

      <View style={styles.content}>
        {renderField('First Name', formData.firstName, 'firstName')}
        {renderField('Last Name', formData.lastName, 'lastName')}
        {renderField('Email', formData.email, 'email')}
        {renderField('Phone', formData.phone, 'phone')}
        {renderField('Company', formData.company, 'company')}
        {renderField('Job Title', formData.jobTitle, 'jobTitle')}
        {renderField('Bio', formData.bio, 'bio')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
    marginBottom: 10,
  },
  editButtonText: {
    color: autopackColors.apBlue,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButtonText: {
    color: '#6b7280',
  },
  saveButton: {
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
  },
  fieldRow: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#111827',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  textAreaInput: {
    minHeight: 120,
    paddingTop: 12,
  },
});

