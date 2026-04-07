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
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name="school-outline" size={14} color="#1d4ed8" />
          </View>
          <Text style={styles.sectionHeaderText}>Education</Text>
        </View>
        <TouchableOpacity onPress={handleAdd}>
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      </View>

      {education.length === 0 ? (
        <Text style={styles.emptyText}>No education, edit to add</Text>
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
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    lineHeight: 19,
    color: '#6b7280',
    marginBottom: 2,
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

