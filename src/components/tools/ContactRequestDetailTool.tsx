import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';
import { NOTIFICATION_THEMES } from '../notifications/notificationThemes';
import { APS_ID } from '../../config/apsConfig';
import { getApsContactRequest, apsAppUserProfilesByUserId } from '../../graphql/queries';
import { useEngageStore } from '../../store/engageStore';
import { AppButton } from '../../ui/AppButton';
import { AppCard } from '../../ui/AppCard';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';
import { formatLocalDateTime } from '../../utils/formatLocalDateTime';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../utils/graphqlClient';

const theme = NOTIFICATION_THEMES['contact-request'];

type RequestDetail = {
  id: string;
  status: string;
  requestedByUserId: string;
  otherUserId: string;
  otherLabel: string;
  otherProfileId: string | null;
  introMessage?: string | null;
  createdAt: string;
  acceptedAt?: string | null;
  direction: 'incoming' | 'outgoing';
};

type ContactRequestDetailToolProps = {
  threadBasePath?: string;
  communityBasePath?: string;
};

export default function ContactRequestDetailTool({
  threadBasePath = '/(main)/hub/messages',
  communityBasePath = '/(main)/hub/community',
}: ContactRequestDetailToolProps) {
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const requestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [acting, setActing] = useState<'accept' | 'decline' | 'chat' | null>(null);

  const acceptRequest = useEngageStore((s) => s.acceptRequest);
  const declineRequest = useEngageStore((s) => s.declineRequest);
  const ensureDmThreadForAcceptedRequest = useEngageStore((s) => s.ensureDmThreadForAcceptedRequest);

  const resolveUserSummary = useCallback(async (userId: string) => {
    try {
      const resp = await graphqlApiKeyClient.graphql({
        query: apsAppUserProfilesByUserId,
        variables: { userId, limit: 1 },
      });
      const data = resp.data as {
        apsAppUserProfilesByUserId?: {
          items?: {
            id?: string | null;
            firstName?: string | null;
            lastName?: string | null;
            email?: string | null;
          }[] | null;
        };
      };
      const match = (data.apsAppUserProfilesByUserId?.items || []).find((item) => !!item);
      const fullName = `${match?.firstName || ''} ${match?.lastName || ''}`.trim();
      if (fullName) return { label: fullName, profileId: match?.id || null };
      if (match?.email) return { label: match.email, profileId: match?.id || null };
    } catch {
      // fall through
    }
    return { label: 'Community Member', profileId: null };
  }, []);

  const load = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const me = await getCurrentUser();
      const mySub = me.userId;
      const resp = await graphqlAuthClient.graphql({
        query: getApsContactRequest,
        variables: { id: requestId },
      });
      const request = (resp.data as { getApsContactRequest?: any }).getApsContactRequest;
      if (!request?.id || !Array.isArray(request.owners) || !request.owners.includes(mySub)) {
        throw new Error('Request not found.');
      }

      const otherUserId =
        (request.owners as string[]).find((id) => id && id !== mySub) ||
        (request.requestedByUserId === mySub ? request.userBId : request.userAId) ||
        '';
      const summary = otherUserId
        ? await resolveUserSummary(otherUserId)
        : { label: 'Community Member', profileId: null };

      setDetail({
        id: request.id,
        status: request.status || 'PENDING',
        requestedByUserId: request.requestedByUserId || '',
        otherUserId,
        otherLabel: summary.label,
        otherProfileId: summary.profileId,
        introMessage: request.introMessage || null,
        createdAt: request.createdAt || new Date().toISOString(),
        acceptedAt: request.acceptedAt || null,
        direction: request.requestedByUserId === mySub ? 'outgoing' : 'incoming',
      });
    } catch (e: any) {
      setDetail(null);
      setError(e?.message || 'Unable to load request.');
    } finally {
      setLoading(false);
    }
  }, [requestId, resolveUserSummary]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !detail) {
    return (
      <AppScreen>
        <Text style={styles.muted}>Loading…</Text>
      </AppScreen>
    );
  }

  if (error && !detail) {
    return (
      <AppScreen>
        <Text style={styles.error}>{error}</Text>
      </AppScreen>
    );
  }

  if (!detail) {
    return (
      <AppScreen>
        <Text style={styles.muted}>Request not found.</Text>
      </AppScreen>
    );
  }

  const statusLabel =
    detail.status === 'ACCEPTED'
      ? 'Accepted'
      : detail.status === 'PENDING'
        ? 'Pending'
        : detail.status === 'DECLINED'
          ? 'Declined'
          : detail.status || 'Unknown';

  const statusColor =
    detail.status === 'ACCEPTED'
      ? '#15803d'
      : detail.status === 'PENDING'
        ? theme.iconColor
        : ui.colors.muted;

  const headline =
    detail.status === 'ACCEPTED'
      ? detail.direction === 'outgoing'
        ? `${detail.otherLabel} accepted your request`
        : `You accepted ${detail.otherLabel}'s request`
      : detail.direction === 'outgoing'
        ? `Request sent to ${detail.otherLabel}`
        : `${detail.otherLabel} wants to connect`;

  return (
    <AppScreen padded={false}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AppCard style={styles.card}>
          <View
            style={[
              styles.headerBar,
              {
                backgroundColor: theme.headerBg,
                borderBottomColor: theme.headerBorder,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: theme.iconBg }]}>
              <Ionicons name={theme.icon} size={16} color={theme.iconColor} />
            </View>
            <Text style={[styles.headerLabel, { color: theme.iconColor }]}>{theme.label}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{headline}</Text>
            <Text style={styles.personName}>{detail.otherLabel}</Text>

            <View style={styles.timestampBlock}>
              <View style={styles.timestampRow}>
                <Ionicons name='time-outline' size={14} color={ui.colors.muted} />
                <Text style={styles.metaLabel}>Requested</Text>
                <Text style={styles.metaValue}>{formatLocalDateTime(detail.createdAt)}</Text>
              </View>
              {!!detail.acceptedAt && (
                <View style={styles.timestampRow}>
                  <Ionicons name='checkmark-circle-outline' size={14} color={ui.colors.muted} />
                  <Text style={styles.metaLabel}>Accepted</Text>
                  <Text style={styles.metaValue}>{formatLocalDateTime(detail.acceptedAt)}</Text>
                </View>
              )}
            </View>

            {!!detail.introMessage && (
              <View style={styles.messageBlock}>
                <Text style={styles.messageLabel}>Intro message</Text>
                <Text style={styles.messageBody}>{detail.introMessage}</Text>
              </View>
            )}

            {detail.status === 'PENDING' && detail.direction === 'incoming' ? (
              <View style={styles.actions}>
                <AppButton
                  title={acting === 'accept' ? 'Accepting…' : 'Accept'}
                  disabled={acting !== null}
                  onPress={async () => {
                    setActing('accept');
                    try {
                      const acceptedRequest = await acceptRequest(detail.id);
                      const { threadId } = await ensureDmThreadForAcceptedRequest({
                        eventId: APS_ID,
                        otherUserId: acceptedRequest.otherUserId,
                      });
                      router.replace(`${threadBasePath}/${threadId}`);
                    } catch (e: any) {
                      Alert.alert('Accept failed', e?.message || 'Please try again.');
                      await load();
                    } finally {
                      setActing(null);
                    }
                  }}
                />
                <AppButton
                  title={acting === 'decline' ? 'Declining…' : 'Decline'}
                  variant='muted'
                  disabled={acting !== null}
                  onPress={async () => {
                    setActing('decline');
                    try {
                      await declineRequest(detail.id);
                      router.back();
                    } catch (e: any) {
                      Alert.alert('Decline failed', e?.message || 'Please try again.');
                    } finally {
                      setActing(null);
                    }
                  }}
                />
              </View>
            ) : null}

            {detail.status === 'ACCEPTED' ? (
              <View style={styles.secondaryActions}>
                {!!detail.otherProfileId && (
                  <Pressable
                    style={styles.linkButton}
                    onPress={() =>
                      router.push(`${communityBasePath}/${encodeURIComponent(detail.otherProfileId!)}`)
                    }
                  >
                    <Ionicons name='person-circle-outline' size={18} color={ui.colors.primary} />
                    <Text style={styles.linkButtonText}>View profile</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.linkButton}
                  disabled={acting === 'chat'}
                  onPress={async () => {
                    if (!detail.otherUserId) {
                      Alert.alert('Unavailable', 'Could not open chat for this request.');
                      return;
                    }
                    setActing('chat');
                    try {
                      const { threadId } = await ensureDmThreadForAcceptedRequest({
                        eventId: APS_ID,
                        otherUserId: detail.otherUserId,
                      });
                      router.push(`${threadBasePath}/${threadId}`);
                    } catch (e: any) {
                      Alert.alert('Unable to start chat', e?.message || 'Please try again.');
                    } finally {
                      setActing(null);
                    }
                  }}
                >
                  <Ionicons name='chatbubble-ellipses-outline' size={18} color={ui.colors.primary} />
                  <Text style={styles.linkButtonText}>
                    {acting === 'chat' ? 'Opening chat…' : 'Send message'}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {detail.status === 'PENDING' && detail.direction === 'outgoing' ? (
              <Text style={styles.pendingHint}>Waiting for {detail.otherLabel} to respond.</Text>
            ) : null}
          </View>
        </AppCard>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: ui.space.lg,
    paddingBottom: ui.space.xl,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  headerBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: ui.colors.text,
    lineHeight: 24,
  },
  personName: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: ui.colors.primary,
  },
  timestampBlock: {
    marginTop: 14,
    gap: 8,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaLabel: {
    color: ui.colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    color: ui.colors.text,
    fontSize: 12,
    flexShrink: 1,
  },
  messageBlock: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ui.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
    color: ui.colors.text,
  },
  actions: {
    marginTop: 20,
    gap: ui.space.sm,
  },
  secondaryActions: {
    marginTop: 20,
    gap: ui.space.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#fff',
  },
  linkButtonText: {
    color: ui.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  pendingHint: {
    marginTop: 18,
    color: ui.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  muted: { color: ui.colors.muted },
  error: { color: ui.colors.danger },
});
