// src/components/AuthGuard.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useApsStore } from '../store/apsStore';
import { signOut } from '../utils/authUtils';
import { autopackColors } from '../theme';
import {
  initPushNotificationHandlers,
  registerAndUpsertPushToken,
} from '../utils/pushNotifications';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pushInitRef = useRef(false);
  const currentAppUser = useApsStore((state) => state.currentAppUser);
  const loading = useApsStore((state) => state.loading.currentAppUser);
  const authError = useApsStore((state) => state.authError);
  const validateUserRegistrant = useApsStore((state) => state.validateUserRegistrant);
  const loadBasicInfo = useApsStore((state) => state.loadBasicInfo);
  const reset = useApsStore((state) => state.reset);
  
  useEffect(() => {
    const validate = async () => {
      setIsValidating(true);
      const isValid = await validateUserRegistrant();
      
      if (isValid) {
        // Load basic APS info after successful validation
        await loadBasicInfo();
      }
      
      setIsValidating(false);
    };
    
    validate();
  }, [validateUserRegistrant, loadBasicInfo]);

  // Push notifications: once the user is validated, register token + set up tap handling.
  useEffect(() => {
    if (!currentAppUser?.id) return;
    if (pushInitRef.current) return;
    pushInitRef.current = true;

    const cleanup = initPushNotificationHandlers({
      onAnnouncementId: (id) => {
        router.push(`/(main)/engage/announcements/${id}`);
      },
    });

    registerAndUpsertPushToken().catch((e) => {
      console.error('Push token registration failed:', e);
    });

    return cleanup;
  }, [currentAppUser?.id]);
  
  const handleSignOut = async () => {
    setIsSigningOut(true);
    // Reset local store and navigate immediately to avoid being stuck
    reset();
    router.dismissAll();
    router.replace('/(auth)/login');
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };
  
  // Show loading state while validating or signing out
  if (isValidating || loading || isSigningOut) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={autopackColors.primary} />
        <Text style={styles.loadingText}>
          {isSigningOut ? 'Signing out...' : 'Validating registration...'}
        </Text>
      </View>
    );
  }
  
  // Show error if validation failed
  if (authError || !currentAppUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Registration Not Found</Text>
        <Text style={styles.errorMessage}>
          {authError || 'No registration found for this email. Please contact support or try logging in with a different account.'}
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={handleSignOut}
            disabled={isSigningOut}
          >
            <Text style={styles.buttonText}>Return to Login</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={async () => {
              setIsValidating(true);
              const isValid = await validateUserRegistrant();
              if (isValid) {
                await loadBasicInfo();
                setIsValidating(false);
                return;
              }
              // Still invalid -> sign out and go to login
              await handleSignOut();
              setIsValidating(false);
            }}
            disabled={isSigningOut}
          >
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // User is validated, render children
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: autopackColors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: autopackColors.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: autopackColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

