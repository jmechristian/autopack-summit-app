import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEngageStore } from '../../store/engageStore';
import { APS_ID } from '../../config/apsConfig';
import { apsAppUserProfilesByUserId } from '../../graphql/queries';
import { AppButton } from '../../ui/AppButton';
import { AppCard } from '../../ui/AppCard';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';
import { confirmAction, showAlert } from '../../utils/alert';
import { graphqlApiKeyClient } from '../../utils/graphqlClient';
import { fetchOwnedContactRequestRows } from '../../utils/contactRequestQueries';

type RequestsToolProps = {
  threadBasePath?: string;
  communityBasePath?: string;
};

export default function RequestsTool({
  threadBasePath = '/(main)/engage/messages',
  communityBasePath = '/(main)/hub/community',
}: RequestsToolProps) {
  const params = useLocalSearchParams<{ requestId?: string | string[] }>();
  const focusedRequestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  const [tab, setTab] = useState<'received' | 'sent' | 'accepted'>('received');
  const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(null);
  const [openingChatUserId, setOpeningChatUserId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<
    {
      id: string;
      otherUserId: string;
      otherProfileId: string | null;
      userLabel: string;
      acceptedAt: string;
      direction: 'sent' | 'received';
    }[]
  >([]);

  const incoming = useEngageStore((s) => s.incomingRequests);
  const sent = useEngageStore((s) => s.sentRequests);
  const loading = useEngageStore((s) => s.loading.requests);
  const error = useEngageStore((s) => s.error.requests);
  const loadIncomingRequests = useEngageStore((s) => s.loadIncomingRequests);
  const loadSentRequests = useEngageStore((s) => s.loadSentRequests);
  const acceptRequest = useEngageStore((s) => s.acceptRequest);
  const declineRequest = useEngageStore((s) => s.declineRequest);
  const cancelSentContactRequest = useEngageStore((s) => s.cancelSentContactRequest);
  const ensureDmThreadForAcceptedRequest = useEngageStore((s) => s.ensureDmThreadForAcceptedRequest);

  const resolveUserSummary = useCallback(async (userId: string) => {
    try {
      const resp = await graphqlApiKeyClient.graphql({
        query: apsAppUserProfilesByUserId,
        variables: { userId, limit: 1 },
      });
      const data = resp.data as {
        apsAppUserProfilesByUserId?: {
          items?: { id?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null }[] | null;
        };
      };
      const match = (data.apsAppUserProfilesByUserId?.items || []).find((item) => !!item);
      const fullName = `${match?.firstName || ''} ${match?.lastName || ''}`.trim();
      if (fullName) return { label: fullName, profileId: match?.id || null };
      if (match?.email) return { label: match.email, profileId: match?.id || null };
    } catch {
      // fall through to default label
    }
    return { label: 'Community Member', profileId: null };
  }, []);

  const loadAcceptedRequests = useCallback(async () => {
    try {
      const me = await getCurrentUser();
      const mySub = me.userId;
      const rows = await fetchOwnedContactRequestRows(mySub);
      const acceptedItems = rows
        .filter((item) => item.id && item.status === 'ACCEPTED')
        .map((item) => {
          const requestedByMe = item.requestedByUserId === mySub;
          const otherUserId =
            (item.owners || []).find((id) => id && id !== mySub) ||
            (item.userAId === mySub ? item.userBId : item.userAId) ||
            '';
          return {
            id: String(item.id),
            otherUserId,
            acceptedAt: item.acceptedAt || item.updatedAt || new Date().toISOString(),
            direction: requestedByMe ? ('sent' as const) : ('received' as const),
          };
        });

      const withLabels = await Promise.all(
        acceptedItems.map(async (item) => {
          const summary = item.otherUserId
            ? await resolveUserSummary(item.otherUserId)
            : { label: 'Community Member', profileId: null };
          return {
            id: item.id,
            otherUserId: item.otherUserId,
            otherProfileId: summary.profileId,
            acceptedAt: item.acceptedAt,
            direction: item.direction,
            userLabel: summary.label,
          };
        })
      );
      setAccepted(withLabels);
    } catch {
      setAccepted([]);
    }
  }, [resolveUserSummary]);

  useEffect(() => {
    loadIncomingRequests();
    loadSentRequests();
    void loadAcceptedRequests();
  }, [loadAcceptedRequests, loadIncomingRequests, loadSentRequests]);

  useEffect(() => {
    if (focusedRequestId) setTab('received');
  }, [focusedRequestId]);

  const rows = tab === 'received' ? incoming : tab === 'sent' ? sent : accepted;

  return (
    <AppScreen>
      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleBtn, tab === 'received' && styles.toggleBtnActive]}
          onPress={() => setTab('received')}
        >
          <Text style={[styles.toggleText, tab === 'received' && styles.toggleTextActive]}>
            Received
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, tab === 'sent' && styles.toggleBtnActive]}
          onPress={() => setTab('sent')}
        >
          <Text style={[styles.toggleText, tab === 'sent' && styles.toggleTextActive]}>
            Sent
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, tab === 'accepted' && styles.toggleBtnActive]}
          onPress={() => setTab('accepted')}
        >
          <Text style={[styles.toggleText, tab === 'accepted' && styles.toggleTextActive]}>
            Accepted
          </Text>
        </Pressable>
      </View>

      {loading ? <Text style={styles.muted}>Loading…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => (r as any).id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AppCard style={[styles.row, focusedRequestId === (item as any).id && styles.focusedRow]}>
            {tab === 'received' ? (
              <>
                <Text style={styles.title}>{(item as any).fromLabel}</Text>
                <Text style={styles.meta}>
                  {new Date((item as any).createdAt).toLocaleString()}
                </Text>
                {!!(item as any).introMessage && (
                  <Text style={styles.introMessage}>{(item as any).introMessage}</Text>
                )}
                <View style={styles.actions}>
                  <AppButton
                    title='Accept'
                    onPress={async () => {
                      const acceptedRequest = await acceptRequest(item.id);
                      const { threadId } = await ensureDmThreadForAcceptedRequest({
                        eventId: APS_ID,
                        otherUserId: acceptedRequest.otherUserId,
                      });
                      await loadAcceptedRequests();
                      router.push(`${threadBasePath}/${threadId}`);
                    }}
                  />
                  <AppButton
                    title='Decline'
                    onPress={async () => {
                      await declineRequest(item.id);
                      await loadAcceptedRequests();
                    }}
                    variant='muted'
                  />
                </View>
              </>
            ) : tab === 'sent' ? (
              <>
                <Text style={styles.title}>{(item as any).toLabel}</Text>
                <Text style={styles.meta}>
                  Pending • {new Date((item as any).createdAt).toLocaleString()}
                </Text>
                <View style={styles.actions}>
                  <AppButton
                    title={cancelingRequestId === item.id ? 'Canceling…' : 'Cancel request'}
                    onPress={() => {
                      const sentItem = item as any;
                      confirmAction({
                        title: 'Cancel request?',
                        message: 'Are you sure you want to cancel this request?',
                        confirmText: 'Yes, cancel',
                        cancelText: 'No',
                        destructive: true,
                        onConfirm: async () => {
                          setCancelingRequestId(item.id);
                          try {
                            await cancelSentContactRequest({
                              eventId: APS_ID,
                              otherUserId: sentItem.toUserId,
                            });
                            await loadAcceptedRequests();
                          } catch (e: any) {
                            showAlert(
                              'Cancel failed',
                              e?.message || 'Unable to cancel request. Please try again.'
                            );
                          } finally {
                            setCancelingRequestId(null);
                          }
                        },
                      });
                    }}
                    variant='muted'
                    disabled={cancelingRequestId === item.id}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>{(item as any).userLabel}</Text>
                <Text style={styles.meta}>
                  {(item as any).direction === 'sent' ? 'Sent request accepted' : 'Accepted by you'} •{' '}
                  {new Date((item as any).acceptedAt).toLocaleString()}
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.iconActionButton}
                    onPress={() => {
                      const acceptedItem = item as any;
                      if (!acceptedItem.otherProfileId) {
                        showAlert('Unavailable', 'Could not open this profile.');
                        return;
                      }
                      router.push(`${communityBasePath}/${encodeURIComponent(acceptedItem.otherProfileId)}`);
                    }}
                  >
                    <Ionicons name='person-circle-outline' size={20} color={ui.colors.primary} />
                  </Pressable>
                  <Pressable
                    style={styles.iconActionButton}
                    onPress={async () => {
                      const acceptedItem = item as any;
                      if (!acceptedItem.otherUserId) {
                        showAlert('Unavailable', 'Could not determine this user for chat.');
                        return;
                      }
                      setOpeningChatUserId(acceptedItem.otherUserId);
                      try {
                        const { threadId } = await ensureDmThreadForAcceptedRequest({
                          eventId: APS_ID,
                          otherUserId: acceptedItem.otherUserId,
                        });
                        router.push(`${threadBasePath}/${threadId}`);
                      } catch (e: any) {
                        showAlert('Unable to start chat', e?.message || 'Please try again.');
                      } finally {
                        setOpeningChatUserId(null);
                      }
                    }}
                    disabled={openingChatUserId === (item as any).otherUserId}
                  >
                    <Ionicons
                      name='chatbubble-ellipses-outline'
                      size={20}
                      color={openingChatUserId === (item as any).otherUserId ? ui.colors.muted : ui.colors.primary}
                    />
                  </Pressable>
                </View>
              </>
            )}
          </AppCard>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.muted}>
              {tab === 'received'
                ? 'No pending received requests.'
                : tab === 'sent'
                  ? 'No pending sent requests.'
                  : 'No accepted requests yet.'}
            </Text>
          ) : null
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: ui.space.lg },
  toggle: {
    flexDirection: 'row',
    backgroundColor: ui.colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: ui.space.md,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: ui.colors.primary },
  toggleText: { fontWeight: '700', color: ui.colors.muted },
  toggleTextActive: { color: '#fff' },
  row: { marginBottom: ui.space.sm },
  title: { fontSize: 16, fontWeight: '700', color: ui.colors.primary },
  meta: { marginTop: ui.space.xs, color: ui.colors.muted, fontSize: 12 },
  introMessage: { marginTop: ui.space.sm, color: ui.colors.text, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: ui.space.sm, marginTop: ui.space.md },
  focusedRow: { borderWidth: 1, borderColor: ui.colors.primary, backgroundColor: '#F8FBFF' },
  iconActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ui.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  muted: { color: ui.colors.muted },
  error: { color: ui.colors.danger, marginBottom: ui.space.sm },
});
