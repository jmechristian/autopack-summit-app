// src/components/AuthGuard.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { getCurrentUser } from 'aws-amplify/auth';
import { useApsStore } from '../store/apsStore';
import { signOut } from '../utils/authUtils';
import { RiveLoader } from './RiveLoader';
import {
  initPushNotificationHandlers,
  handleLastNotificationResponse,
  registerAndUpsertPushToken,
  setAppBadgeCount,
} from '../utils/pushNotifications';
import { useEngageStore } from '../store/engageStore';
import { resolveAnnouncementDeepLink } from '../utils/announcementDeepLinks';
import { isWeb } from '../utils/platform';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const pushInitForUserRef = useRef<string | null>(null);
  const currentAppUser = useApsStore((state) => state.currentAppUser);
  const validateUserRegistrant = useApsStore((state) => state.validateUserRegistrant);
  const loadBasicInfo = useApsStore((state) => state.loadBasicInfo);
  const reset = useApsStore((state) => state.reset);
  const refreshUnreadCounts = useEngageStore((s) => s.refreshUnreadCounts);
  const markAnnouncementsSeen = useEngageStore((s) => s.markAnnouncementsSeen);
  const startEngageRealtime = useEngageStore((s) => s.startRealtime);
  const stopEngageRealtime = useEngageStore((s) => s.stopRealtime);
  const setEngageActiveUser = useEngageStore((s) => s.setActiveUser);
  const resetEngageStore = useEngageStore((s) => s.resetAll);
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const routeToRequests = useCallback((requestId?: string) => {
    // Build a predictable back stack when opened from a push tap:
    // Engage home -> Requests.
    router.push('/(main)/engage');
    if (requestId) {
      router.push({ pathname: '/(main)/engage/requests', params: { requestId } } as any);
      return;
    }
    router.push('/(main)/engage/requests');
  }, []);

  const routeAnnouncementDeepLink = useCallback(
    (url: string) => {
      markAnnouncementsSeen();
      setAppBadgeCount(0);
      const route = resolveAnnouncementDeepLink(url);
      if (route) {
        router.push(route as any);
        return;
      }
      router.push('/(main)/hub/notifications');
    },
    [markAnnouncementsSeen],
  );

  useEffect(() => {
    let mounted = true;
    getCurrentUser()
      .then((u) => {
        if (mounted) setAuthUserId(u.userId || null);
      })
      .catch(() => {
        if (mounted) setAuthUserId(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const runValidation = useCallback(async (maxAttempts = 2) => {
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const timeoutMs = 20000;
        const timedOut = { value: false };
        const timeoutPromise = new Promise<boolean>((resolve) =>
          setTimeout(() => {
            timedOut.value = true;
            resolve(false);
          }, timeoutMs)
        );
        const isValid = await Promise.race([validateUserRegistrant(), timeoutPromise]);
        if (timedOut.value) {
          // Prevent indefinite spinner if store loading flag remains true after a stalled call.
          useApsStore.setState((state) => ({
            loading: { ...state.loading, currentAppUser: false },
          }));
        }
        if (isValid) {
          await loadBasicInfo();
          return true;
        }
        const state = useApsStore.getState();
        if (state.authError) {
          break;
        }
        if (attempt < maxAttempts) await wait(800);
      }
      return false;
    } catch (error) {
      console.warn('Registrant validation failed:', error);
      return false;
    }
  }, [validateUserRegistrant, loadBasicInfo]);
  
  useEffect(() => {
    let cancelled = false;
    const validate = async () => {
      const ok = await runValidation(2);
      if (cancelled) return;
      if (ok) return;

      const err = useApsStore.getState().authError || '';
      // Half-cleared sessions (logout race) land here — bounce to login.
      if (
        err.includes('No authenticated user') ||
        err.includes('User email not found')
      ) {
        try {
          await signOut();
        } catch {
          // ignore
        }
        reset();
        resetEngageStore();
        router.replace('/(auth)/login');
      }
    };

    void validate();
    return () => {
      cancelled = true;
    };
  }, [runValidation, reset, resetEngageStore]);

  // Push notifications: once the user is validated, register token + set up tap handling.
  useEffect(() => {
    const userId = authUserId;
    setEngageActiveUser(userId);
    if (!userId) {
      pushInitForUserRef.current = null;
      resetEngageStore();
      return;
    }
    if (pushInitForUserRef.current === userId) return;
    pushInitForUserRef.current = userId;

    const cleanup = initPushNotificationHandlers({
      shouldSuppressForegroundNotification: (data) => {
        const type = String(data?.type || '').toLowerCase();
        const senderUserId = String(data?.senderUserId || '');
        return type === 'dm' && !!senderUserId && senderUserId === userId;
      },
      onAnnouncementId: () => {
        markAnnouncementsSeen();
        setAppBadgeCount(0);
        router.push('/(main)/hub/notifications');
      },
      onDeepLink: routeAnnouncementDeepLink,
      onDmThreadId: (threadId) => {
        router.push(`/(main)/engage/messages/${threadId}`);
      },
      onRequests: (requestId) => {
        routeToRequests(requestId);
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
            setAppBadgeCount(total);
          })
          .catch(() => {});
      },
    });

    if (!isWeb) {
      registerAndUpsertPushToken().catch((e) => {
        console.error('Push token registration failed:', e);
      });
    }

    // If app was launched from a notification tap, route immediately.
    handleLastNotificationResponse({
      onAnnouncementId: () => {
        markAnnouncementsSeen();
        setAppBadgeCount(0);
        router.push('/(main)/hub/notifications');
      },
      onDeepLink: routeAnnouncementDeepLink,
      onDmThreadId: (threadId) => {
        router.push(`/(main)/engage/messages/${threadId}`);
      },
      onRequests: (requestId) => {
        routeToRequests(requestId);
      },
    }).catch(() => {});

    return cleanup;
  }, [authUserId, setEngageActiveUser, resetEngageStore, refreshUnreadCounts, markAnnouncementsSeen, routeToRequests, routeAnnouncementDeepLink]);

  // On every successful validation, refresh unread counts once.
  useEffect(() => {
    if (!currentAppUser?.id) return;
    refreshUnreadCounts()
      .then(() => {
        const total = useEngageStore.getState().getEngageBadgeCount();
        setAppBadgeCount(total);
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
            setAppBadgeCount(total);
          })
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, [currentAppUser?.id, refreshUnreadCounts]);
  
  const handleSignOut = async () => {
    setIsSigningOut(true);
    pushInitForUserRef.current = null;
    try {
      // Cognito must clear before login mounts — otherwise session restore → Hub.
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    reset();
    resetEngageStore();
    router.replace('/(auth)/login');
    setIsSigningOut(false);
  };
  
  // Only block UI during explicit sign-out.
  if (isSigningOut) {
    return <RiveLoader />;
  }

  // User is validated, render children
  return <>{children}</>;
}

