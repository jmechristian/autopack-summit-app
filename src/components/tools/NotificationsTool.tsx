import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { getCurrentUser } from 'aws-amplify/auth';
import { type NotificationKind } from '../notifications/notificationThemes';
import { NotificationCard } from '../notifications/NotificationCard';
import { apsAppUserProfilesByUserId } from '../../graphql/queries';
import { useEngageStore } from '../../store/engageStore';
import { AppScreen } from '../../ui/AppScreen';
import { ui } from '../../ui/tokens';
import { graphqlApiKeyClient } from '../../utils/graphqlClient';
import { fetchOwnedContactRequestRows } from '../../utils/contactRequestQueries';

type NotificationRow = {
  id: string;
  kind: NotificationKind;
  body: string;
  subtitle?: string;
  timestamp: string;
  badgeCount?: number;
  targetId?: string;
};

type RequestHistoryItem = {
  id: string;
  requestId: string;
  message: string;
  timestamp: string;
};

function truncateText(value: string, maxLength = 120) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}…`;
}

function openNotification(row: NotificationRow) {
  if (!row.targetId) return;

  if (row.kind === 'announcement') {
    router.push(`/(main)/hub/announcements/${row.targetId}`);
    return;
  }

  if (row.kind === 'contact-request') {
    router.push(`/(main)/hub/requests/${row.targetId}`);
    return;
  }

  if (row.kind === 'message') {
    router.push(`/(main)/hub/messages/${row.targetId}`);
  }
}

export default function NotificationsTool() {
  const announcements = useEngageStore((s) => s.announcements);
  const inbox = useEngageStore((s) => s.inbox);
  const lastSeenAnnouncementAt = useEngageStore((s) => s.lastSeenAnnouncementAt);
  const loadingAnnouncements = useEngageStore((s) => s.loading.announcements);
  const loadingInbox = useEngageStore((s) => s.loading.inbox);
  const loadAnnouncements = useEngageStore((s) => s.loadAnnouncements);
  const loadInbox = useEngageStore((s) => s.loadInbox);
  const refreshAnnouncementUnread = useEngageStore((s) => s.refreshAnnouncementUnread);
  const markAnnouncementsSeen = useEngageStore((s) => s.markAnnouncementsSeen);

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
      const owned = await fetchOwnedContactRequestRows(mySub);

      const pendingRows = owned
        .filter((item) => item.id && item.status === 'PENDING' && item.requestedByUserId !== mySub)
        .map(async (item) => {
          const otherUserId =
            (item.owners || []).find((id) => id && id !== mySub) ||
            (item.userAId === mySub ? item.userBId : item.userAId) ||
            '';
          const otherLabel = otherUserId ? await resolveUserLabel(otherUserId) : 'Community Member';
          return {
            id: `request-pending-${item.id}`,
            requestId: String(item.id),
            message: `${otherLabel} sent you a contact request`,
            timestamp: item.createdAt || new Date().toISOString(),
          } satisfies RequestHistoryItem;
        });

      const acceptedRows = owned
        .filter((item) => item.id && item.status === 'ACCEPTED')
        .map(async (item) => {
          const requestedByMe = item.requestedByUserId === mySub;
          const otherUserId =
            (item.owners || []).find((id) => id && id !== mySub) ||
            (item.userAId === mySub ? item.userBId : item.userAId) ||
            '';
          const otherLabel = otherUserId ? await resolveUserLabel(otherUserId) : 'Community Member';
          return {
            id: `request-accepted-${item.id}`,
            requestId: String(item.id),
            message: requestedByMe
              ? `${otherLabel} accepted your contact request`
              : `You accepted ${otherLabel}'s contact request`,
            timestamp: item.acceptedAt || item.updatedAt || new Date().toISOString(),
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

  useFocusEffect(
    useCallback(() => {
      void markAnnouncementsSeen();
    }, [markAnnouncementsSeen]),
  );

  useEffect(() => {
    void Promise.all([loadAnnouncements(), loadInbox(), refreshAnnouncementUnread(), loadRequestHistory()]);
  }, [loadAnnouncements, loadInbox, loadRequestHistory, refreshAnnouncementUnread]);

  const notificationRows = useMemo(() => {
    const announcementRows: NotificationRow[] = announcements.map((announcement) => {
      const isUnread = !lastSeenAnnouncementAt || announcement.createdAt > lastSeenAnnouncementAt;
      const title = announcement.title?.trim() || 'Announcement';
      const preview = truncateText(announcement.body || '');
      return {
        id: `announcement-${announcement.id}`,
        kind: 'announcement',
        body: title,
        subtitle: preview || undefined,
        timestamp: announcement.createdAt,
        badgeCount: isUnread ? 1 : undefined,
        targetId: announcement.id,
      };
    });

    const requestRows: NotificationRow[] = requestHistory.map((request) => ({
      id: request.id,
      kind: 'contact-request',
      body: request.message,
      timestamp: request.timestamp,
      targetId: request.requestId,
    }));

    const unreadMessageRows: NotificationRow[] = inbox
      .filter((thread) => (thread.unreadCount || 0) > 0)
      .map((thread) => ({
        id: `message-${thread.threadId}`,
        kind: 'message',
        body: thread.title,
        subtitle: `${thread.unreadCount} unread message${thread.unreadCount === 1 ? '' : 's'}${
          thread.preview ? ` • ${truncateText(thread.preview, 80)}` : ''
        }`,
        timestamp: thread.lastMessageAt || new Date().toISOString(),
        badgeCount: thread.unreadCount || undefined,
        targetId: thread.threadId,
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
          <NotificationCard
            kind={item.kind}
            body={item.body}
            subtitle={item.subtitle}
            timestamp={item.timestamp}
            badgeCount={item.badgeCount}
            onPress={item.targetId ? () => openNotification(item) : undefined}
          />
        )}
        ListEmptyComponent={!loading ? <Text style={styles.muted}>No notifications yet.</Text> : null}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: ui.space.lg },
  muted: { color: ui.colors.muted },
});
