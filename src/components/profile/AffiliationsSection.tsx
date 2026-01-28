// src/components/profile/AffiliationsSection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { autopackColors } from '../../theme';
import { createAffiliate, updateAffiliate, deleteAffiliate } from '../../utils/profileMutations';
import { AddAffiliateModal } from './AddAffiliateModal';
import * as APITypes from '../../API';

interface AffiliationsSectionProps {
  profile: APITypes.ApsAppUserProfile;
  onUpdate: () => Promise<void>;
}

export function AffiliationsSection({ profile, onUpdate }: AffiliationsSectionProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<APITypes.ProfileAffiliate | null>(null);

  const affiliates = profile.affiliates?.items?.filter((a) => a !== null) as APITypes.ProfileAffiliate[] || [];

  const handleAdd = () => {
    setEditingAffiliate(null);
    setModalVisible(true);
  };

  const handleEdit = (affiliate: APITypes.ProfileAffiliate) => {
    setEditingAffiliate(affiliate);
    setModalVisible(true);
  };

  const handleDelete = (affiliate: APITypes.ProfileAffiliate) => {
    Alert.alert(
      'Delete Experience',
      `Are you sure you want to delete "${affiliate.affiliate}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAffiliate(affiliate.id);
              await onUpdate();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete experience');
            }
          },
        },
      ]
    );
  };

  const handleSave = async (data: Omit<APITypes.CreateProfileAffiliateInput, 'profileId'>) => {
    try {
      if (editingAffiliate) {
        await updateAffiliate({
          id: editingAffiliate.id,
          ...data,
        });
      } else {
        await createAffiliate({
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
        <Text style={styles.sectionTitle}>Experience</Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Ionicons name="add" size={20} color={autopackColors.apBlue} />
        </TouchableOpacity>
      </View>

      <View style={styles.headerDivider} />

      {affiliates.length === 0 ? (
        <Text style={styles.emptyText}>No experience added yet</Text>
      ) : (
        affiliates.map((affiliate) => (
          <View key={affiliate.id} style={styles.item}>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{affiliate.affiliate || 'Untitled'}</Text>
              {affiliate.role && <Text style={styles.itemSubtitle}>{affiliate.role}</Text>}
              {(affiliate.startDate || affiliate.endDate) && (
                <Text style={styles.itemDate}>
                  {affiliate.startDate || '?'} - {affiliate.endDate || 'Present'}
                </Text>
              )}
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity onPress={() => handleEdit(affiliate)} style={styles.actionButton}>
                <Ionicons name="pencil" size={20} color={autopackColors.apBlue} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(affiliate)} style={styles.actionButton}>
                <Ionicons name="trash" size={20} color="#E43A00" />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <AddAffiliateModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingAffiliate(null);
        }}
        onSave={handleSave}
        editingAffiliate={editingAffiliate}
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
  itemDate: {
    fontSize: 12,
    color: '#9ca3af',
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

