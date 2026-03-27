import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { APS_ID } from '../../../src/config/apsConfig';
import { apsAppExhibitorProfilesByCompanyId } from '../../../src/graphql/queries';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';
import { autopackColors } from '../../../src/theme';
import { graphqlApiKeyClient } from '../../../src/utils/graphqlClient';

export default function HubExhibitorProfileScreen() {
  const currentAppUser = useCurrentAppUser();
  const companyId = currentAppUser?.registrant?.companyId || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setProfileId(null);
      setError('Could not resolve your company mapping. Please refresh or contact support.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await graphqlApiKeyClient.graphql({
        query: apsAppExhibitorProfilesByCompanyId,
        variables: {
          companyId,
          filter: { eventId: { eq: APS_ID } },
          limit: 10,
        },
      });
      const data = resp.data as {
        apsAppExhibitorProfilesByCompanyId?: {
          items?: Array<{ id?: string | null; boothNumber?: string | null } | null> | null;
        };
      };
      const first = (data.apsAppExhibitorProfilesByCompanyId?.items || []).find((x) => !!x?.id);
      setProfileId(first?.id || null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load exhibitor profile');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!profileId || loading || error) return;
    router.replace({
      pathname: '/(main)/hub/exhibitors/[id]',
      params: { id: profileId },
    });
  }, [error, loading, profileId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Opening your exhibitor profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load exhibitor profile</Text>
        <Text style={styles.muted}>{error}</Text>
        <Pressable style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!profileId) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No exhibitor profile found</Text>
        <Text style={styles.muted}>Ask an admin to create your exhibitor profile, then come back here to complete it.</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator />
      <Text style={styles.muted}>Opening your exhibitor profile...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  muted: { color: '#6b7280', textAlign: 'center' },
  primaryBtn: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
