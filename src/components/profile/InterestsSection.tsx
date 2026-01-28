// src/components/profile/InterestsSection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { autopackColors } from '../../theme';
import { createInterest, updateInterest, deleteInterest } from '../../utils/profileMutations';
import { AddInterestModal } from './AddInterestModal';
import * as APITypes from '../../API';

interface InterestsSectionProps {
  profile: APITypes.ApsAppUserProfile;
  onUpdate: () => Promise<void>;
}

export function InterestsSection({ profile, onUpdate }: InterestsSectionProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInterest, setEditingInterest] = useState<APITypes.ProfileInterest | null>(null);

  const interests = profile.interests?.items?.filter((i) => i !== null) as APITypes.ProfileInterest[] || [];

  const handleAdd = () => {
    setEditingInterest(null);
    setModalVisible(true);
  };

  const handleEdit = (interest: APITypes.ProfileInterest) => {
    setEditingInterest(interest);
    setModalVisible(true);
  };

  const handleDelete = (interest: APITypes.ProfileInterest) => {
    Alert.alert(
      'Delete Interest',
      `Are you sure you want to delete "${interest.interest}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteInterest(interest.id);
              await onUpdate();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete interest');
            }
          },
        },
      ]
    );
  };

  const handleSave = async (data: Omit<APITypes.CreateProfileInterestInput, 'profileId'>) => {
    try {
      if (editingInterest) {
        await updateInterest({
          id: editingInterest.id,
          ...data,
        });
      } else {
        await createInterest({
          profileId: profile.id,
          ...data,
        });
      }
      await onUpdate();
    } catch (error) {
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Ionicons name="add" size={20} color={autopackColors.apBlue} />
        </TouchableOpacity>
      </View>

      <View style={styles.headerDivider} />

      {interests.length === 0 ? (
        <Text style={styles.emptyText}>No interests added yet</Text>
      ) : (
        interests.map((interest) => (
          <View key={interest.id} style={styles.item}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{interest.interest || 'Untitled'}</Text>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => handleEdit(interest)} style={styles.actionButton}>
                <Ionicons name="pencil" size={20} color={autopackColors.apBlue} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(interest)} style={styles.actionButton}>
                <Ionicons name="trash" size={20} color="#E43A00" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <AddInterestModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingInterest(null);
        }}
        onSave={handleSave}
        editingInterest={editingInterest}
      />
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
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
    marginBottom: 10,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    padding: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  addButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  actionButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
});

