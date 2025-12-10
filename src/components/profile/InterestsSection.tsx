// src/components/profile/InterestsSection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Button } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { autopackColors } from '../../theme';
import { createInterest, updateInterest, deleteInterest } from '../../utils/profileMutations';
import { AddInterestModal } from './AddInterestModal';
import * as APITypes from '../../API';

interface InterestsSectionProps {
  profile: APITypes.ApsAppUserProfile;
  onUpdate: () => void;
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
              onUpdate();
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
      onUpdate();
    } catch (error) {
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Interests</Text>
        <Button
          type="clear"
          icon={<Ionicons name="add-circle" size={24} color={autopackColors.apBlue} />}
          onPress={handleAdd}
          title="Add"
          titleStyle={styles.addButtonText}
        />
      </View>

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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  addButtonText: {
    color: autopackColors.apBlue,
    fontSize: 16,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
});

