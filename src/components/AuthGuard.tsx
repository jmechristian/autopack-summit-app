// src/components/AuthGuard.tsx
import React, { useEffect, useRef, useState } from 'react';
import { AppState, View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useApsStore } from '../store/apsStore';
import { signOut } from '../utils/authUtils';
import { autopackColors } from '../theme';
import {
  initPushNotificationHandlers,
  handleLastNotificationResponse,
  registerAndUpsertPushToken,
} from '../utils/pushNotifications';
import { useEngageStore } from '../store/engageStore';
import * as Notifications from 'expo-notifications';

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
  const refreshUnreadCounts = useEngageStore((s) => s.refreshUnreadCounts);
  const markAnnouncementsSeen = useEngageStore((s) => s.markAnnouncementsSeen);
  const startEngageRealtime = useEngageStore((s) => s.startRealtime);
  const stopEngageRealtime = useEngageStore((s) => s.stopRealtime);
  const setEngageActiveUser = useEngageStore((s) => s.setActiveUser);
  const resetEngageStore = useEngageStore((s) => s.resetAll);
  
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
    setEngageActiveUser(currentAppUser?.id || null);
    if (!currentAppUser?.id) {
      resetEngageStore();
      return;
    }
    if (pushInitRef.current) return;
    pushInitRef.current = true;

    const cleanup = initPushNotificationHandlers({
      onAnnouncementId: (id) => {
        // Consider this as "user saw it" since they're navigating directly to it.
        markAnnouncementsSeen();
        Notifications.setBadgeCountAsync(0).catch(() => {});
        router.push(`/(main)/engage/announcements/${id}`);
      },
      onAnnouncementReceived: () => {
        // Increment announcements unread locally and return the new total Engage badge count.
        const state = useEngageStore.getState();
        state.setUnread({ announcements: state.unread.announcements + 1 });
        return state.getEngageBadgeCount();
      },
      onNotificationReceived: () => {
        // For DM/request pushes, refresh counts immediately so Engage badge updates in real-time.
        refreshUnreadCounts()
          .then(() => {
            const total = useEngageStore.getState().getEngageBadgeCount();
            Notifications.setBadgeCountAsync(total).catch(() => {});
          })
          .catch(() => {});
      },
    });

    registerAndUpsertPushToken().catch((e) => {
      console.error('Push token registration failed:', e);
    });

    // If app was launched from a notification tap, route immediately.
    handleLastNotificationResponse({
      onAnnouncementId: (id) => {
        markAnnouncementsSeen();
        Notifications.setBadgeCountAsync(0).catch(() => {});
        router.push(`/(main)/engage/announcements/${id}`);
      },
    }).catch(() => {});

    return cleanup;
  }, [currentAppUser?.id, setEngageActiveUser, resetEngageStore, refreshUnreadCounts, markAnnouncementsSeen]);

  // On every successful validation, refresh unread counts once.
  useEffect(() => {
    if (!currentAppUser?.id) return;
    refreshUnreadCounts()
      .then(() => {
        const total = useEngageStore.getState().getEngageBadgeCount();
        Notifications.setBadgeCountAsync(total).catch(() => {});
      })
      .catch(() => {});
  }, [currentAppUser?.id]);

  // Start realtime subscriptions once user is validated; stop on unmount.
  useEffect(() => {
    if (!currentAppUser?.id) return;
    startEngageRealtime().catch(() => {});
    return () => {
      stopEngageRealtime();
    };
  }, [currentAppUser?.id, startEngageRealtime, stopEngageRealtime]);

  // When app returns to foreground, refresh unread counts (no tab switching needed).
  useEffect(() => {
    if (!currentAppUser?.id) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshUnreadCounts()
          .then(() => {
            const total = useEngageStore.getState().getEngageBadgeCount();
            Notifications.setBadgeCountAsync(total).catch(() => {});
          })
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, [currentAppUser?.id, refreshUnreadCounts]);
  
  const handleSignOut = async () => {
    setIsSigningOut(true);
    // Reset local store and navigate immediately to avoid being stuck
    reset();
    resetEngageStore();
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

