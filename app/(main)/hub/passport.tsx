import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { APS_ID } from '../../../src/config/apsConfig';
import {
  apsAppUserPassportStampsByUserProfileIdAndCreatedAt,
} from '../../../src/graphql/queries';
import { useCurrentUserProfile } from '../../../src/hooks/useApsStore';
import { autopackColors } from '../../../src/theme';
import { ui } from '../../../src/ui/tokens';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../../src/utils/graphqlClient';
import { RiveLoader } from '../../../src/components/RiveLoader';

type ExhibitorItem = {
  id: string;
  companyName: string;
  boothNumber?: string | null;
};

type PassportStamp = {
  id: string;
  exhibitorId: string;
  eventId: string;
  scannedAt?: string | null;
};

const exhibitorsByEventWithCompany = /* GraphQL */ `
  query PassportExhibitorsByEvent($eventId: ID!, $limit: Int, $nextToken: String) {
    apsAppExhibitorProfilesByEventId(eventId: $eventId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        boothNumber
        company {
          name
          __typename
        }
        __typename
      }
      nextToken
      __typename
    }
  }
`;

function clean(v?: string | null) {
  return (v || '').trim();
}

export default function PassportScreen() {
  const profile = useCurrentUserProfile();
  const profileId = profile?.id || null;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhibitors, setExhibitors] = useState<ExhibitorItem[]>([]);
  const [stamps, setStamps] = useState<PassportStamp[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const allExhibitors: ExhibitorItem[] = [];
      let exhibitorNextToken: string | null | undefined = null;
      do {
        const resp = await graphqlApiKeyClient.graphql({
          query: exhibitorsByEventWithCompany,
          variables: { eventId: APS_ID, limit: 200, nextToken: exhibitorNextToken },
        });
        const data = (resp as any).data as {
          apsAppExhibitorProfilesByEventId?: {
            items?: ({
              id?: string | null;
              boothNumber?: string | null;
              company?: { name?: string | null } | null;
            } | null)[] | null;
            nextToken?: string | null;
          };
        };
        for (const item of data.apsAppExhibitorProfilesByEventId?.items || []) {
          if (!item?.id) continue;
          allExhibitors.push({
            id: item.id,
            companyName: clean(item.company?.name) || 'Exhibitor',
            boothNumber: item.boothNumber || null,
          });
        }
        exhibitorNextToken = data.apsAppExhibitorProfilesByEventId?.nextToken;
      } while (exhibitorNextToken);

      allExhibitors.sort((a, b) =>
        clean(a.companyName).toLowerCase().localeCompare(clean(b.companyName).toLowerCase()),
      );
      setExhibitors(allExhibitors);

      if (!profileId) {
        setStamps([]);
        return;
      }

      const allStamps: PassportStamp[] = [];
      let stampNextToken: string | null | undefined = null;
      do {
        const resp = await graphqlAuthClient.graphql({
          query: apsAppUserPassportStampsByUserProfileIdAndCreatedAt,
          variables: {
            userProfileId: profileId,
            filter: { eventId: { eq: APS_ID } },
            limit: 200,
            nextToken: stampNextToken,
          },
        });
        const data = (resp as any).data as {
          apsAppUserPassportStampsByUserProfileIdAndCreatedAt?: {
            items?: ({
              id?: string | null;
              exhibitorId?: string | null;
              eventId?: string | null;
              scannedAt?: string | null;
            } | null)[] | null;
            nextToken?: string | null;
          };
        };
        for (const item of data.apsAppUserPassportStampsByUserProfileIdAndCreatedAt?.items || []) {
          if (!item?.id || !item.exhibitorId || item.eventId !== APS_ID) continue;
          allStamps.push({
            id: item.id,
            exhibitorId: item.exhibitorId,
            eventId: item.eventId,
            scannedAt: item.scannedAt || null,
          });
        }
        stampNextToken = data.apsAppUserPassportStampsByUserProfileIdAndCreatedAt?.nextToken;
      } while (stampNextToken);
      setStamps(allStamps);
    } catch (e: any) {
      console.error('Passport load failed:', e);
      setError(e?.message || 'Unable to load passport challenge.');
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const stampSet = useMemo(() => new Set(stamps.map((stamp) => stamp.exhibitorId)), [stamps]);
  const collectedCount = exhibitors.filter((item) => stampSet.has(item.id)).length;
  const totalCount = exhibitors.length;
  const completion = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  if (loading) {
    return <RiveLoader />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Passport Challenge</Text>
        <Text style={styles.title}>{completion}% Complete</Text>
        <Text style={styles.subtitle}>
          {collectedCount} of {totalCount} exhibitor stamps collected
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${completion}%` }]} />
        </View>
        <Pressable
          style={[styles.primaryBtn, !profileId && styles.primaryBtnDisabled]}
          disabled={!profileId}
          onPress={() => router.push('/(main)/hub/passport-scan' as any)}
        >
          <Ionicons name='scan-outline' size={18} color='#fff' />
          <Text style={styles.primaryBtnText}>Scan Passport QR</Text>
        </Pressable>
      </View>

      {!profileId && (
        <View style={styles.noticeCard}>
          <Ionicons name='person-circle-outline' size={20} color={ui.colors.danger} />
          <Text style={styles.noticeText}>Your app profile is required before stamps can be collected.</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.noticeCard}>
          <Ionicons name='warning-outline' size={20} color={ui.colors.danger} />
          <Text style={styles.noticeText}>{error}</Text>
        </View>
      )}

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Exhibitors</Text>
        {exhibitors.length === 0 ? (
          <Text style={styles.muted}>No exhibitors available yet.</Text>
        ) : (
          exhibitors.map((item) => {
            const collected = stampSet.has(item.id);
            return (
              <View key={item.id} style={styles.exhibitorRow}>
                <View style={[styles.statusIcon, collected ? styles.statusIconDone : styles.statusIconMissing]}>
                  <Ionicons name={collected ? 'checkmark' : 'close'} size={16} color={collected ? '#047857' : '#991b1b'} />
                </View>
                <View style={styles.exhibitorTextWrap}>
                  <Text style={styles.exhibitorName}>{item.companyName}</Text>
                  {!!item.boothNumber && <Text style={styles.muted}>Booth {item.boothNumber}</Text>}
                </View>
                <Pressable
                  style={[styles.scanIconBtn, collected && styles.scanIconBtnDisabled]}
                  disabled={collected || !profileId}
                  onPress={() =>
                    router.push({
                      pathname: '/(main)/hub/passport-scan',
                      params: { exhibitorId: item.id },
                    } as any)
                  }
                >
                  <Ionicons
                    name='scan-outline'
                    size={21}
                    color={collected || !profileId ? '#9ca3af' : autopackColors.apBlue}
                  />
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F1F8' },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  muted: { color: ui.colors.muted },
  heroCard: {
    borderRadius: 22,
    backgroundColor: ui.colors.primary,
    padding: 18,
    gap: 10,
  },
  eyebrow: { color: 'rgba(255,255,255,0.8)', fontWeight: '800', textTransform: 'uppercase', fontSize: 12 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: ui.colors.secondary },
  primaryBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  noticeCard: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.colors.border,
  },
  noticeText: { flex: 1, color: ui.colors.text, lineHeight: 19 },
  listCard: {
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 12,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ui.colors.border,
  },
  sectionTitle: { color: ui.colors.text, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  exhibitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eef2f7',
  },
  statusIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconDone: { backgroundColor: '#d1fae5' },
  statusIconMissing: { backgroundColor: '#fee2e2' },
  exhibitorTextWrap: { flex: 1 },
  exhibitorName: { color: ui.colors.text, fontWeight: '800', fontSize: 15 },
  scanIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  scanIconBtnDisabled: { backgroundColor: '#f3f4f6' },
});
