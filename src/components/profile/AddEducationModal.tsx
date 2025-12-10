// src/components/profile/AddEducationModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button, Input, Overlay } from '@rneui/themed';
import { autopackColors } from '../../theme';
import * as APITypes from '../../API';

interface AddEducationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (education: Omit<APITypes.CreateProfileEducationInput, 'profileId'>) => Promise<void>;
  editingEducation?: APITypes.ProfileEducation | null;
}

export function AddEducationModal({
  visible,
  onClose,
  onSave,
  editingEducation,
}: AddEducationModalProps) {
  const [school, setSchool] = useState('');
  const [degree, setDegree] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingEducation) {
      setSchool(editingEducation.school || '');
      setDegree(editingEducation.degree || '');
      setFieldOfStudy(editingEducation.fieldOfStudy || '');
    } else {
      setSchool('');
      setDegree('');
      setFieldOfStudy('');
    }
  }, [editingEducation, visible]);

  const handleSave = async () => {
    if (!school.trim()) {
      Alert.alert('Validation Error', 'School name is required');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        school: school.trim(),
        degree: degree.trim() || undefined,
        fieldOfStudy: fieldOfStudy.trim() || undefined,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save education');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay isVisible={visible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>
          {editingEducation ? 'Edit Education' : 'Add Education'}
        </Text>

        <Input
          label="School *"
          value={school}
          onChangeText={setSchool}
          placeholder="e.g., University Name"
          autoCapitalize="words"
        />

        <Input
          label="Degree"
          value={degree}
          onChangeText={setDegree}
          placeholder="e.g., Bachelor of Science"
          autoCapitalize="words"
        />

        <Input
          label="Field of Study"
          value={fieldOfStudy}
          onChangeText={setFieldOfStudy}
          placeholder="e.g., Computer Science"
          autoCapitalize="words"
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            onPress={onClose}
            buttonStyle={[styles.button, styles.cancelButton]}
            titleStyle={styles.cancelButtonText}
          />
          <Button
            title="Save"
            onPress={handleSave}
            loading={loading}
            buttonStyle={[styles.button, styles.saveButton]}
          />
        </View>
      </View>
    </Overlay>
  );
}

const styles = StyleSheet.create({
  overlay: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 0,
  },
  container: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: autopackColors.apBlue,
  },
  saveButton: {
    backgroundColor: autopackColors.apBlue,
  },
});

