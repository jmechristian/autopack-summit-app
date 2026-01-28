// src/components/profile/EducationSection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { autopackColors } from '../../theme';
import { createEducation, updateEducation, deleteEducation } from '../../utils/profileMutations';
import { AddEducationModal } from './AddEducationModal';
import * as APITypes from '../../API';

interface EducationSectionProps {
  profile: APITypes.ApsAppUserProfile;
  onUpdate: () => Promise<void>;
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
              await onUpdate();
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
      await onUpdate();
    } catch (error) {
      throw error;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Education</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Ionicons name="add" size={20} color={autopackColors.apBlue} />
        </TouchableOpacity>
      </View>

      <View style={styles.headerDivider} />

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
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
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

