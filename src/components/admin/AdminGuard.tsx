import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { isCurrentUserAdmin } from '../../utils/adminAccess';
import { ui } from '../../ui/tokens';
import { RiveLoader } from '../RiveLoader';

type AdminGuardProps = {
  children: React.ReactNode;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkAccess = async () => {
      const canAccess = await isCurrentUserAdmin();
      if (!mounted) return;
      setAllowed(canAccess);
      setLoading(false);
      if (!canAccess) {
        router.replace('/(main)/hub');
      }
    };
    checkAccess();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <RiveLoader />;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#E6F1F8',
  },
  loadingText: {
    marginTop: 12,
    color: ui.colors.text,
    fontWeight: '600',
  },
});

