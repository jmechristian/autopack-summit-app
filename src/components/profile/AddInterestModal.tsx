// src/components/profile/AddInterestModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button, Input, Overlay } from '@rneui/themed';
import { autopackColors } from '../../theme';
import * as APITypes from '../../API';

interface AddInterestModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (interest: Omit<APITypes.CreateProfileInterestInput, 'profileId'>) => Promise<void>;
  editingInterest?: APITypes.ProfileInterest | null;
}

export function AddInterestModal({
  visible,
  onClose,
  onSave,
  editingInterest,
}: AddInterestModalProps) {
  const [interest, setInterest] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingInterest) {
      setInterest(editingInterest.interest || '');
    } else {
      setInterest('');
    }
  }, [editingInterest, visible]);

  const handleSave = async () => {
    if (!interest.trim()) {
      Alert.alert('Validation Error', 'Interest is required');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        interest: interest.trim(),
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save interest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay isVisible={visible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>
          {editingInterest ? 'Edit Interest' : 'Add Interest'}
        </Text>

        <Input
          label="Interest *"
          value={interest}
          onChangeText={setInterest}
          placeholder="e.g., Photography, Hiking, Reading"
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

