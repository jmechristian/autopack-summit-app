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
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name="heart-outline" size={14} color="#1d4ed8" />
          </View>
          <Text style={styles.sectionHeaderText}>Interest</Text>
        </View>
        <TouchableOpacity onPress={handleAdd}>
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      </View>

      {interests.length === 0 ? (
        <Text style={styles.emptyText}>No interest, edit to add</Text>
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
  editLink: {
    color: autopackColors.apBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 18,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: '#111827',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#d1d5db',
    marginTop: 14,
  },
});

