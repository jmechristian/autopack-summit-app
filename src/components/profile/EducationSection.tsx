// src/components/profile/EducationSection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Button } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';
import { autopackColors } from '../../theme';
import { createEducation, updateEducation, deleteEducation } from '../../utils/profileMutations';
import { AddEducationModal } from './AddEducationModal';
import * as APITypes from '../../API';

interface EducationSectionProps {
  profile: APITypes.ApsAppUserProfile;
  onUpdate: () => void;
}

export function EducationSection({ profile, onUpdate }: EducationSectionProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEducation, setEditingEducation] = useState<APITypes.ProfileEducation | null>(null);

  const education = profile.education?.items?.filter((e) => e !== null) as APITypes.ProfileEducation[] || [];

  const handleAdd = () => {
    setEditingEducation(null);
    setModalVisible(true);
  };

  const handleEdit = (edu: APITypes.ProfileEducation) => {
    setEditingEducation(edu);
    setModalVisible(true);
  };

  const handleDelete = (edu: APITypes.ProfileEducation) => {
    Alert.alert(
      'Delete Education',
      `Are you sure you want to delete "${edu.school}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEducation(edu.id);
              onUpdate();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete education');
            }
          },
        },
      ]
    );
  };

  const handleSave = async (data: Omit<APITypes.CreateProfileEducationInput, 'profileId'>) => {
    try {
      if (editingEducation) {
        await updateEducation({
          id: editingEducation.id,
          ...data,
        });
      } else {
        await createEducation({
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
        <Text style={styles.sectionTitle}>Education</Text>
        <Button
          type="clear"
          icon={<Ionicons name="add-circle" size={24} color={autopackColors.apBlue} />}
          onPress={handleAdd}
          title="Add"
          titleStyle={styles.addButtonText}
        />
      </View>

      {education.length === 0 ? (
        <Text style={styles.emptyText}>No education entries added yet</Text>
      ) : (
        education.map((edu) => (
          <View key={edu.id} style={styles.item}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{edu.school || 'Untitled'}</Text>
              {edu.degree && <Text style={styles.itemSubtitle}>{edu.degree}</Text>}
              {edu.fieldOfStudy && <Text style={styles.itemSubtitle}>{edu.fieldOfStudy}</Text>}
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => handleEdit(edu)} style={styles.actionButton}>
                <Ionicons name="pencil" size={20} color={autopackColors.apBlue} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(edu)} style={styles.actionButton}>
                <Ionicons name="trash" size={20} color="#E43A00" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <AddEducationModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingEducation(null);
        }}
        onSave={handleSave}
        editingEducation={editingEducation}
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
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
});

