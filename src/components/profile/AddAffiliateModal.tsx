// src/components/profile/AddAffiliateModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button, Input, Overlay } from '@rneui/themed';
import { autopackColors } from '../../theme';
import * as APITypes from '../../API';

interface AddAffiliateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (affiliate: Omit<APITypes.CreateProfileAffiliateInput, 'profileId'>) => Promise<void>;
  editingAffiliate?: APITypes.ProfileAffiliate | null;
}

export function AddAffiliateModal({
  visible,
  onClose,
  onSave,
  editingAffiliate,
}: AddAffiliateModalProps) {
  const [affiliate, setAffiliate] = useState('');
  const [role, setRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingAffiliate) {
      setAffiliate(editingAffiliate.affiliate || '');
      setRole(editingAffiliate.role || '');
      setStartDate(editingAffiliate.startDate || '');
      setEndDate(editingAffiliate.endDate || '');
    } else {
      // Reset form for new affiliate
      setAffiliate('');
      setRole('');
      setStartDate('');
      setEndDate('');
    }
  }, [editingAffiliate, visible]);

  const handleSave = async () => {
    if (!affiliate.trim()) {
      Alert.alert('Validation Error', 'Company or organization is required');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        affiliate: affiliate.trim(),
        role: role.trim() || undefined,
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save experience');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay isVisible={visible} onBackdropPress={onClose} overlayStyle={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>
          {editingAffiliate ? 'Edit Experience' : 'Add Experience'}
        </Text>

        <Input
          label="Company / Organization *"
          value={affiliate}
          onChangeText={setAffiliate}
          placeholder="e.g., Acme Corp"
          autoCapitalize="words"
        />

        <Input
          label="Role / Title"
          value={role}
          onChangeText={setRole}
          placeholder="e.g., Director of Engineering"
          autoCapitalize="words"
        />

        <Input
          label="Start Date"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="e.g., 2020-01"
        />

        <Input
          label="End Date"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="e.g., 2023-12 (leave blank if current)"
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

