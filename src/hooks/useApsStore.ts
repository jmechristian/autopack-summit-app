// src/hooks/useApsStore.ts
// Custom hooks for accessing APS store data

import { useEffect } from 'react';
import { useApsStore } from '../store/apsStore';

/**
 * Hook to get the current user's app user (includes registrant and profile)
 */
export function useCurrentAppUser() {
  return useApsStore((state) => state.currentAppUser);
}

/**
 * Hook to get the current user's registrant (from app user)
 */
export function useCurrentUserRegistrant() {
  const appUser = useApsStore((state) => state.currentAppUser);
  return appUser?.registrant || null;
}

/**
 * Hook to get the current user's profile (from app user)
 */
export function useCurrentUserProfile() {
  const appUser = useApsStore((state) => state.currentAppUser);
  return appUser?.profile || null;
}

/**
 * Hook to get basic APS info, auto-loads if not loaded
 */
export function useApsBasicInfo() {
  const basicInfo = useApsStore((state) => state.basicInfo);
  const loading = useApsStore((state) => state.loading.basicInfo);
  const error = useApsStore((state) => state.error.basicInfo);
  const loadBasicInfo = useApsStore((state) => state.loadBasicInfo);
  
  useEffect(() => {
    if (!basicInfo && !loading) {
      loadBasicInfo();
    }
  }, [basicInfo, loading, loadBasicInfo]);
  
  return { basicInfo, loading, error };
}

/**
 * Hook to get agenda, auto-loads if not loaded
 */
export function useApsAgenda() {
  const agenda = useApsStore((state) => state.agenda);
  const loading = useApsStore((state) => state.loading.agenda);
  const error = useApsStore((state) => state.error.agenda);
  const loadAgenda = useApsStore((state) => state.loadAgenda);
  
  useEffect(() => {
    if (!agenda && !loading) {
      loadAgenda();
    }
  }, [agenda, loading, loadAgenda]);
  
  return { agenda, loading, error };
}

/**
 * Hook to get all registrants, auto-loads if not loaded
 */
export function useApsRegistrants() {
  const registrants = useApsStore((state) => state.registrants);
  const loading = useApsStore((state) => state.loading.registrants);
  const error = useApsStore((state) => state.error.registrants);
  const loadRegistrants = useApsStore((state) => state.loadRegistrants);
  
  useEffect(() => {
    if (registrants.length === 0 && !loading) {
      loadRegistrants();
    }
  }, [registrants.length, loading, loadRegistrants]);
  
  return { registrants, loading, error };
}

/**
 * Hook to get speakers, auto-loads if not loaded
 */
export function useApsSpeakers() {
  const speakers = useApsStore((state) => state.speakers);
  const loading = useApsStore((state) => state.loading.speakers);
  const error = useApsStore((state) => state.error.speakers);
  const loadSpeakers = useApsStore((state) => state.loadSpeakers);
  
  useEffect(() => {
    if (speakers.length === 0 && !loading) {
      loadSpeakers();
    }
  }, [speakers.length, loading, loadSpeakers]);
  
  return { speakers, loading, error };
}

/**
 * Hook to get exhibitors, auto-loads if not loaded
 */
export function useApsExhibitors() {
  const exhibitors = useApsStore((state) => state.exhibitors);
  const loading = useApsStore((state) => state.loading.exhibitors);
  const error = useApsStore((state) => state.error.exhibitors);
  const loadExhibitors = useApsStore((state) => state.loadExhibitors);
  
  useEffect(() => {
    if (exhibitors.length === 0 && !loading) {
      loadExhibitors();
    }
  }, [exhibitors.length, loading, loadExhibitors]);
  
  return { exhibitors, loading, error };
}

/**
 * Hook to get add-ons, auto-loads if not loaded
 */
export function useApsAddOns() {
  const addOns = useApsStore((state) => state.addOns);
  const loading = useApsStore((state) => state.loading.addOns);
  const error = useApsStore((state) => state.error.addOns);
  const loadAddOns = useApsStore((state) => state.loadAddOns);
  
  useEffect(() => {
    if (addOns.length === 0 && !loading) {
      loadAddOns();
    }
  }, [addOns.length, loading, loadAddOns]);
  
  return { addOns, loading, error };
}

