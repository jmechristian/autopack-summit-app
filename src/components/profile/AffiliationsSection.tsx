// src/components/profile/AffiliationsSection.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Button, Icon } from '@rneui/themed';
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
      'Delete Affiliate',
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
              Alert.alert('Error', 'Failed to delete affiliate');
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
        <Text style={styles.sectionTitle}>Affiliations</Text>
        <Button
          type="clear"
          icon={<Ionicons name="add-circle" size={24} color={autopackColors.apBlue} />}
          onPress={handleAdd}
          title="Add"
          titleStyle={styles.addButtonText}
        />
      </View>

      {affiliates.length === 0 ? (
        <Text style={styles.emptyText}>No affiliations added yet</Text>
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
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
});

