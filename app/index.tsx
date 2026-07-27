import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { RiveLoader } from '../src/components/RiveLoader';

// Minimum time the splash animation stays visible (one full loop) once it starts
// playing, so it never just "flashes" before we navigate away.
const MIN_SPLASH_DURATION = 2000;
// Fallback in case the Rive `onReady`/onPlay callback never fires.
const READY_FALLBACK = 800;

export default function Index() {
  const [authDone, setAuthDone] = useState(false);
  const destinationRef = useRef<string>('/(auth)/login');
  const animationStartedAt = useRef<number | null>(null);

  const markStarted = useCallback(() => {
    if (animationStartedAt.current == null) {
      animationStartedAt.current = Date.now();
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then(() => {
        destinationRef.current = '/(main)/hub';
      })
      .catch(() => {
        destinationRef.current = '/(auth)/login';
      })
      .finally(() => {
        if (mounted) setAuthDone(true);
      });

    // If onReady never fires, still start the visible-duration clock.
    const fallback = setTimeout(markStarted, READY_FALLBACK);

    return () => {
      mounted = false;
      clearTimeout(fallback);
    };
  }, [markStarted]);

  useEffect(() => {
    if (!authDone) return;

    let cancelled = false;
    const start = animationStartedAt.current ?? Date.now();
    const remaining = Math.max(0, MIN_SPLASH_DURATION - (Date.now() - start));

    const timer = setTimeout(() => {
      if (!cancelled) router.replace(destinationRef.current as any);
    }, remaining);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authDone]);

  return <RiveLoader overlay={false} onReady={markStarted} />;
}
