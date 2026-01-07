import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCurrentAppUser } from '../../../../src/hooks/useApsStore';
import { graphqlClient } from '../../../../src/utils/graphqlClient';
import { apsAppUserLeadsByUserId } from '../../../../src/graphql/queries';
import { deleteApsAppUserLead } from '../../../../src/graphql/mutations';
import { AppScreen } from '../../../../src/ui/AppScreen';
import { ui } from '../../../../src/ui/tokens';

type LeadItem = { id: string; contactId: string; favorite?: boolean | null; createdAt?: string | null };
type Profile = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  location?: string | null;
  profilePicture?: string | null;
};

// IMPORTANT:
// Generated `getApsAppUserProfile` includes `notes { ... }`, but notes are now USER_POOLS-only.
// When called via API_KEY, AppSync may return errors and the client treats the request as failed.
// Use a minimal query that avoids the notes relationship.
const getApsAppUserProfileMinimal = /* GraphQL */ `
  query GetApsAppUserProfileMinimal($id: ID!) {
    getApsAppUserProfile(id: $id) {
      id
      firstName
      lastName
      company
      jobTitle
      location
      profilePicture
      __typename
    }
  }
`;

function nameOf(p: Profile | null | undefined) {
  if (!p) return '';
  return [p.firstName?.trim(), p.lastName?.trim()].filter(Boolean).join(' ');
}

export default function LeadsScreen() {
  const currentAppUser = useCurrentAppUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});

  const load = useCallback(async () => {
    if (!currentAppUser?.id) return;
    setError(null);
    setLoading(true);
    try {
      const all: LeadItem[] = [];
      let nextToken: string | null | undefined = null;
      do {
        const resp = await graphqlClient.graphql({
          query: apsAppUserLeadsByUserId,
          variables: { userId: currentAppUser.id, limit: 1000, nextToken },
        });
        const data = resp.data as {
          apsAppUserLeadsByUserId?: { items?: Array<LeadItem | null> | null; nextToken?: string | null };
        };
        const items = data.apsAppUserLeadsByUserId?.items || [];
        for (const item of items) {
          if (!item?.id || !item.contactId) continue;
          all.push(item);
        }
        nextToken = data.apsAppUserLeadsByUserId?.nextToken;
      } while (nextToken);

      // Deduplicate by contactId (keep the most recent by createdAt if present)
      const byContact = new Map<string, LeadItem>();
      for (const item of all) {
        const existing = byContact.get(item.contactId);
        if (!existing) {
          byContact.set(item.contactId, item);
          continue;
        }
        const a = existing.createdAt || '';
        const b = item.createdAt || '';
        if (b > a) byContact.set(item.contactId, item);
      }

      const deduped = Array.from(byContact.values());
      deduped.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setLeads(deduped);

      // Fetch missing profiles
      const missing = deduped.map((l) => l.contactId).filter((id) => !profilesById[id]);
      if (missing.length) {
        const entries = await Promise.all(
          missing.map(async (id) => {
            try {
              const resp = await graphqlClient.graphql({
                query: getApsAppUserProfileMinimal,
                variables: { id },
              });
              const data = resp.data as { getApsAppUserProfile?: Profile | null };
              const p = data.getApsAppUserProfile;
              return p?.id ? ([p.id, p] as const) : null;
            } catch {
              return null;
            }
          })
        );
        const patch: Record<string, Profile> = {};
        for (const e of entries) {
          if (!e) continue;
          patch[e[0]] = e[1];
        }
        if (Object.keys(patch).length) {
          setProfilesById((prev) => ({ ...prev, ...patch }));
        }
      }
    } catch (e: any) {
      console.error('Load leads failed:', e);
      setError(e?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [currentAppUser?.id, profilesById]);

  useEffect(() => {
    if (currentAppUser?.id) load();
  }, [currentAppUser?.id, load]);

  useFocusEffect(
    useCallback(() => {
      if (currentAppUser?.id) load();
    }, [currentAppUser?.id, load])
  );

  const rows = useMemo(() => leads.map((l) => ({ lead: l, profile: profilesById[l.contactId] })), [leads, profilesById]);

  if (!currentAppUser?.id) {
    return (
      <AppScreen>
        <Text style={{ color: ui.colors.muted }}>Sign in to view leads.</Text>
      </AppScreen>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading leads…</Text>
      </View>
    );
  }

  return (
    <AppScreen>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.title}>Couldn’t load leads</Text>
          <Text style={styles.muted}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.title}>No leads yet</Text>
          <Text style={styles.muted}>Scan an attendee and tap “Add lead”.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push('/(main)/scan')}>
            <Ionicons name="qr-code-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Scan QR</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: ui.space.md }}>
          {rows.map(({ lead, profile }) => {
            const name = nameOf(profile) || '(No name)';
            const subtitle = [profile?.jobTitle, profile?.company].filter(Boolean).join(' • ');
            return (
              <Pressable
                key={lead.id}
                style={styles.row}
                onPress={() =>
                  router.push({
                    pathname: '/(main)/community/[id]',
                    params: {
                      id: lead.contactId,
                      returnTo: '/(main)/engage/leads',
                      returnLabel: 'Back to Leads',
                    },
                  })
                }
              >
                <View style={styles.rowLeft}>
                  <Ionicons name="briefcase-outline" size={20} color={ui.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    {!!subtitle && (
                      <Text style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    )}
                  </View>
                </View>

                <Pressable
                  hitSlop={10}
                  onPress={async () => {
                    Alert.alert('Remove lead?', name, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await graphqlClient.graphql({
                              query: deleteApsAppUserLead,
                              variables: { input: { id: lead.id } },
                            });
                            await load();
                          } catch (e) {
                            console.error('Delete lead failed:', e);
                            Alert.alert('Remove failed', 'Please try again.');
                          }
                        },
                      },
                    ]);
                  }}
                  style={styles.trashBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={ui.colors.muted} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: ui.colors.text },
  muted: { color: ui.colors.muted, textAlign: 'center' },

  errorBox: { gap: 10 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: ui.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: { color: '#fff', fontWeight: '800' },

  empty: { gap: 10, alignItems: 'center' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ui.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },

  row: {
    backgroundColor: ui.colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.colors.border,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  name: { fontWeight: '800', color: ui.colors.text },
  subtitle: { marginTop: 2, color: ui.colors.muted },
  trashBtn: { padding: 6, borderRadius: 10 },
});


