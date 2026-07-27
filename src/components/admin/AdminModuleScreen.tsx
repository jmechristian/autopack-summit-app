import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';

type AdminModuleScreenProps = {
  title: string;
  description: string;
};

export default function AdminModuleScreen({ title, description }: AdminModuleScreenProps) {
  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>CRUD scaffold ready</Text>
        <Text style={styles.cardText}>List, create, edit, and delete flows will be implemented next.</Text>
      </View>

      <Pressable style={styles.backButton} onPress={() => router.push('/(main)/admin' as any)}>
        <Ionicons name='arrow-back' size={18} color='#fff' />
        <Text style={styles.backButtonText}>Back to Admin Home</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: ui.space.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: ui.colors.primary,
  },
  description: {
    marginTop: ui.space.xs,
    color: ui.colors.muted,
    fontSize: 14,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
    padding: ui.space.md,
    marginBottom: ui.space.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ui.colors.text,
  },
  cardText: {
    marginTop: ui.space.xs,
    color: ui.colors.muted,
  },
  backButton: {
    borderRadius: 10,
    backgroundColor: ui.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

