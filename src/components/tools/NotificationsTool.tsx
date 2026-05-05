import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';
import { apsAppUserProfilesByUserId, apsContactRequestsByStatusAndUpdatedAt } from '../../graphql/queries';
import { useEngageStore } from '../../store/engageStore';
import { AppCard } from '../../ui/AppCard';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../utils/graphqlClient';

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  badgeCount?: number;
};

type RequestHistoryItem = {
  id: string;
  message: string;
  timestamp: string;
};

export default function NotificationsTool() {
  const announcements = useEngageStore((s) => s.announcements);
  const inbox = useEngageStore((s) => s.inbox);
  const lastSeenAnnouncementAt = useEngageStore((s) => s.lastSeenAnnouncementAt);
  const loadingAnnouncements = useEngageStore((s) => s.loading.announcements);
  const loadingInbox = useEngageStore((s) => s.loading.inbox);
  const loadAnnouncements = useEngageStore((s) => s.loadAnnouncements);
  const loadInbox = useEngageStore((s) => s.loadInbox);
  const refreshAnnouncementUnread = useEngageStore((s) => s.refreshAnnouncementUnread);

  const [requestHistory, setRequestHistory] = useState<RequestHistoryItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const resolveUserLabel = useCallback(async (userId: string) => {
    try {
      const resp = await graphqlApiKeyClient.graphql({
        query: apsAppUserProfilesByUserId,
        variables: { userId, limit: 1 },
      });
      const data = resp.data as {
        apsAppUserProfilesByUserId?: {
          items?: { firstName?: string | null; lastName?: string | null; email?: string | null }[] | null;
        };
      };
      const profile = (data.apsAppUserProfilesByUserId?.items || []).find((item) => !!item);
      const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
      if (name) return name;
      if (profile?.email) return profile.email;
    } catch {
      // fall through
    }
    return 'Community Member';
  }, []);

  const loadRequestHistory = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const me = await getCurrentUser();
      const mySub = me.userId;

      const [pendingResp, acceptedResp] = await Promise.all([
        graphqlAuthClient.graphql({
          query: apsContactRequestsByStatusAndUpdatedAt,
          variables: { status: 'PENDING', sortDirection: 'DESC', limit: 200 },
        }),
        graphqlAuthClient.graphql({
          query: apsContactRequestsByStatusAndUpdatedAt,
          variables: { status: 'ACCEPTED', sortDirection: 'DESC', limit: 200 },
        }),
      ]);

      const pendingData = pendingResp.data as {
        apsContactRequestsByStatusAndUpdatedAt?: {
          items?: {
            id?: string | null;
            owners?: string[] | null;
            requestedByUserId?: string | null;
            createdAt?: string | null;
          }[] | null;
        };
      };

      const acceptedData = acceptedResp.data as {
        apsContactRequestsByStatusAndUpdatedAt?: {
          items?: {
            id?: string | null;
            owners?: string[] | null;
            requestedByUserId?: string | null;
            acceptedAt?: string | null;
            updatedAt?: string | null;
          }[] | null;
        };
      };

      const pendingRows = (pendingData.apsContactRequestsByStatusAndUpdatedAt?.items || [])
        .filter((item) => !!item?.id && Array.isArray(item.owners) && item.owners.includes(mySub))
        .filter((item) => item?.requestedByUserId !== mySub)
        .map(async (item) => {
          const otherUserId = (item?.owners || []).find((id) => id && id !== mySub) || '';
          const otherLabel = otherUserId ? await resolveUserLabel(otherUserId) : 'Community Member';
          return {
            id: `request-pending-${item?.id}`,
            message: `${otherLabel} sent you a contact request`,
            timestamp: item?.createdAt || new Date().toISOString(),
          } satisfies RequestHistoryItem;
        });

      const acceptedRows = (acceptedData.apsContactRequestsByStatusAndUpdatedAt?.items || [])
        .filter((item) => !!item?.id && Array.isArray(item.owners) && item.owners.includes(mySub))
        .map(async (item) => {
          const requestedByMe = item?.requestedByUserId === mySub;
          const otherUserId = (item?.owners || []).find((id) => id && id !== mySub) || '';
          const otherLabel = otherUserId ? await resolveUserLabel(otherUserId) : 'Community Member';
          return {
            id: `request-accepted-${item?.id}`,
            message: requestedByMe
              ? `${otherLabel} accepted your contact request`
              : `You accepted ${otherLabel}'s contact request`,
            timestamp: item?.acceptedAt || item?.updatedAt || new Date().toISOString(),
          } satisfies RequestHistoryItem;
        });

      const rows = await Promise.all([...pendingRows, ...acceptedRows]);
      setRequestHistory(rows);
    } catch {
      setRequestHistory([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [resolveUserLabel]);

  useEffect(() => {
    void Promise.all([loadAnnouncements(), loadInbox(), refreshAnnouncementUnread(), loadRequestHistory()]);
  }, [loadAnnouncements, loadInbox, loadRequestHistory, refreshAnnouncementUnread]);

  const notificationRows = useMemo(() => {
    const announcementRows: NotificationRow[] = announcements.map((announcement) => {
      const isUnread = !lastSeenAnnouncementAt || announcement.createdAt > lastSeenAnnouncementAt;
      return {
        id: `announcement-${announcement.id}`,
        title: announcement.title || 'Announcement',
        body: 'New announcement',
        timestamp: announcement.createdAt,
        badgeCount: isUnread ? 1 : undefined,
      };
    });

    const requestRows: NotificationRow[] = requestHistory.map((request) => ({
      id: request.id,
      title: 'Contact request',
      body: request.message,
      timestamp: request.timestamp,
    }));

    const unreadMessageRows: NotificationRow[] = inbox
      .filter((thread) => (thread.unreadCount || 0) > 0)
      .map((thread) => ({
        id: `message-${thread.threadId}`,
        title: 'Unread messages',
        body: `${thread.title}: ${thread.unreadCount} unread message${thread.unreadCount === 1 ? '' : 's'}`,
        timestamp: thread.lastMessageAt || new Date().toISOString(),
        badgeCount: thread.unreadCount || undefined,
      }));

    return [...unreadMessageRows, ...requestRows, ...announcementRows].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [announcements, inbox, lastSeenAnnouncementAt, requestHistory]);

  const loading = loadingAnnouncements || loadingInbox || loadingRequests;

  return (
    <AppScreen>
      {loading ? <Text style={styles.muted}>Loading…</Text> : null}

      <FlatList
        data={notificationRows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AppCard style={styles.row}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{item.title}</Text>
              {!!item.badgeCount && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badgeCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{new Date(item.timestamp).toLocaleString()}</Text>
          </AppCard>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.muted}>No notifications yet.</Text> : null}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: ui.space.lg },
  row: { marginBottom: ui.space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: ui.colors.primary, flex: 1 },
  body: { marginTop: ui.space.xs, color: '#374151', lineHeight: 20 },
  meta: { marginTop: ui.space.sm, color: ui.colors.muted, fontSize: 12 },
  badge: {
    backgroundColor: ui.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  muted: { color: ui.colors.muted },
});
