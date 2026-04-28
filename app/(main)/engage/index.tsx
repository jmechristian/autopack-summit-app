import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { APS_ID } from '../../../src/config/apsConfig';
import { apsAppUserPassportStampsByUserProfileIdAndCreatedAt } from '../../../src/graphql/queries';
import { useCurrentUserProfile } from '../../../src/hooks/useApsStore';
import { useEngageStore } from '../../../src/store/engageStore';
import { ApcCertificateCard } from '../../../src/components/certificate/ApcCertificateCard';
import { IconCard } from '../../../src/ui/IconCard';
import { ui } from '../../../src/ui/tokens';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../../src/utils/graphqlClient';

type EngageTile = {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  onPress: () => void;
};

const passportExhibitorsByEvent = /* GraphQL */ `
  query EngagePassportExhibitorsByEvent($eventId: ID!, $limit: Int, $nextToken: String) {
    apsAppExhibitorProfilesByEventId(eventId: $eventId, limit: $limit, nextToken: $nextToken) {
      items {
        id
        __typename
      }
      nextToken
      __typename
    }
  }
`;

export default function EngageHome() {
  const unread = useEngageStore((s) => s.unread);
  const profile = useCurrentUserProfile();
  const profileId = profile?.id || null;
  const [passportLoading, setPassportLoading] = useState(true);
  const [passportTotal, setPassportTotal] = useState(0);
  const [passportCollected, setPassportCollected] = useState(0);

  const tiles: EngageTile[] = [
    {
      id: 'announcements',
      label: 'Announcements',
      icon: 'megaphone-outline',
      badge: unread.announcements,
      onPress: () => router.push('/(main)/engage/announcements'),
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: 'chatbubbles-outline',
      badge: unread.messages,
      onPress: () => router.push('/(main)/engage/messages'),
    },
    {
      id: 'requests',
      label: 'Requests',
      icon: 'mail-unread-outline',
      badge: unread.requests,
      onPress: () => router.push('/(main)/engage/requests'),
    },
    {
      id: 'exhibitors',
      label: 'Exhibitors',
      icon: 'business-outline',
      onPress: () => router.push('/(main)/engage/exhibitors'),
    },
    {
      id: 'speakers',
      label: 'Speakers',
      icon: 'mic-outline',
      onPress: () => router.push('/(main)/engage/speakers'),
    },
    {
      id: 'sponsors',
      label: 'Sponsors',
      icon: 'ribbon-outline',
      onPress: () => router.push('/(main)/engage/sponsors'),
    },
  ];

  const loadPassportProgress = useCallback(async () => {
    setPassportLoading(true);
    try {
      const exhibitorIds = new Set<string>();
      let exhibitorNextToken: string | null | undefined = null;
      do {
        const resp = await graphqlApiKeyClient.graphql({
          query: passportExhibitorsByEvent,
          variables: { eventId: APS_ID, limit: 200, nextToken: exhibitorNextToken },
        });
        const data = (resp as any).data as {
          apsAppExhibitorProfilesByEventId?: {
            items?: ({ id?: string | null } | null)[] | null;
            nextToken?: string | null;
          };
        };
        for (const item of data.apsAppExhibitorProfilesByEventId?.items || []) {
          if (item?.id) exhibitorIds.add(item.id);
        }
        exhibitorNextToken = data.apsAppExhibitorProfilesByEventId?.nextToken;
      } while (exhibitorNextToken);

      const stampIds = new Set<string>();
      if (profileId) {
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
              items?: ({ exhibitorId?: string | null; eventId?: string | null } | null)[] | null;
              nextToken?: string | null;
            };
          };
          for (const item of data.apsAppUserPassportStampsByUserProfileIdAndCreatedAt?.items || []) {
            if (item?.eventId === APS_ID && item.exhibitorId) stampIds.add(item.exhibitorId);
          }
          stampNextToken = data.apsAppUserPassportStampsByUserProfileIdAndCreatedAt?.nextToken;
        } while (stampNextToken);
      }

      setPassportTotal(exhibitorIds.size);
      setPassportCollected([...stampIds].filter((id) => exhibitorIds.has(id)).length);
    } catch (e) {
      console.warn('Engage passport progress failed:', e);
      setPassportTotal(0);
      setPassportCollected(0);
    } finally {
      setPassportLoading(false);
    }
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      loadPassportProgress();
    }, [loadPassportProgress]),
  );

  const passportPercent = useMemo(
    () => (passportTotal > 0 ? Math.round((passportCollected / passportTotal) * 100) : 0),
    [passportCollected, passportTotal],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: 10 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.body}>
        <Pressable
          style={styles.passportCard}
          onPress={() => router.push('/(main)/hub/passport' as any)}
        >
          <View style={styles.passportHeaderRow}>
            <View style={styles.passportIconWrap}>
              <Ionicons name='book-outline' size={20} color={ui.colors.primary} />
            </View>
            <View style={styles.passportTitleWrap}>
              <Text style={styles.passportEyebrow}>Passport Challenge</Text>
              <Text style={styles.passportTitle}>
                {passportLoading ? 'Loading progress...' : `${passportPercent}% Complete`}
              </Text>
            </View>
            <Ionicons name='chevron-forward' size={22} color='rgba(255,255,255,0.9)' />
          </View>
          {passportLoading ? (
            <ActivityIndicator color='#fff' style={styles.passportLoader} />
          ) : (
            <>
              <Text style={styles.passportSubtitle}>
                {passportCollected} of {passportTotal} exhibitor stamps collected
              </Text>
              <View style={styles.passportProgressTrack}>
                <View style={[styles.passportProgressFill, { width: `${passportPercent}%` }]} />
              </View>
            </>
          )}
        </Pressable>

        <View style={styles.toolsGrid}>
          {tiles.map((t) => (
            <View key={t.id} style={styles.toolsCell}>
              <IconCard
                icon={t.icon}
                label={t.label}
                badge={t.badge}
                iconBgColor='transparent'
                iconColor='#FFFFFF'
                iconSize={20}
                onPress={t.onPress}
                style={[
                  styles.toolsCard,
                  styles.toolsCardPrimary,
                ]}
                iconWrapStyle={styles.toolsIconWrap}
                labelStyle={styles.toolsCardLabel}
              />
            </View>
          ))}
        </View>

        <ApcCertificateCard
          progress={profile?.apcProgress}
          style={styles.certificateCard}
          onPrimaryPress={() => router.push('/(main)/profile')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6F1F8',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  certificateCard: {
    marginTop: 16,
  },
  passportCard: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: ui.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 10,
  },
  passportHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: ui.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportTitleWrap: { flex: 1 },
  passportEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  passportTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 2 },
  passportSubtitle: { color: 'rgba(255,255,255,0.9)', fontWeight: '700' },
  passportLoader: { alignSelf: 'flex-start', marginTop: 4 },
  passportProgressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  passportProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: ui.colors.secondary,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  toolsCell: {
    width: '48%',
  },
  toolsCard: {
    minHeight: 88,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 0,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolsCardPrimary: {
    backgroundColor: ui.colors.primary,
  },
  toolsIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  toolsCardLabel: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
    minHeight: 0,
    textAlign: 'left',
  },
});
