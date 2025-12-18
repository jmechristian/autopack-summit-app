import { create } from 'zustand';
import { getCurrentUser } from 'aws-amplify/auth';
import * as Notifications from 'expo-notifications';
import type * as APITypes from '../API';
import { APS_ID } from '../config/apsConfig';
import { graphqlAuthClient, graphqlClient } from '../utils/graphqlClient';
import {
  createApsUserEngageState,
  getApsUserEngageState,
  updateApsUserEngageState,
} from '../graphql/engageState';
import { onCreateApsContactRequest, onUpdateApsContactRequest } from '../graphql/subscriptions';
import { createApsDmMessageMinimal, onCreateApsDmMessageMinimal } from '../graphql/dmOps';
import {
  apsAdminAnnouncementsByEventIdAndCreatedAt,
  getApsAdminAnnouncement,
  apsContactRequestsByRequestKey,
  apsContactRequestsByStatusAndUpdatedAt,
  getApsDmThread,
  apsDmParticipantStatesByUserIdAndLastMessageAt,
  apsDmParticipantStatesByThreadIdAndUserId,
  apsDmMessagesByThreadIdAndCreatedAt,
  apsDmThreadsByDmKey,
  apsAppUserProfilesByUserId,
} from '../graphql/queries';
import {
  createApsContactRequest,
  updateApsContactRequest,
  createApsDmThread,
  createApsDmParticipantState,
  updateApsDmParticipantState,
  updateApsDmThread,
} from '../graphql/mutations';

type Announcement = {
  id: string;
  eventId: string;
  title?: string | null;
  body: string;
  deepLink?: string | null;
  createdAt: string;
  updatedAt: string;
};

type InboxItem = {
  threadId: string;
  title: string;
  preview: string;
  unreadCount?: number | null;
  lastMessageAt?: string | null;
};

type ChatMessage = {
  id: string;
  threadId: string;
  body: string;
  createdAt: string;
  isMine: boolean;
};

type IncomingRequestItem = {
  id: string;
  requestKey: string;
  fromUserId: string;
  fromLabel: string;
  createdAt: string;
};

type EngageStore = {
  loading: {
    announcements: boolean;
    announcementDetail: boolean;
    requests: boolean;
    inbox: boolean;
    messages: boolean;
    engageState: boolean;
  };
  error: {
    announcements: string | null;
    announcementDetail: string | null;
    requests: string | null;
    inbox: string | null;
    messages: string | null;
    engageState: string | null;
  };

  // Unread counters (in-app + used to compute badges)
  unread: {
    announcements: number;
    messages: number;
    requests: number;
  };
  setUnread: (partial: Partial<EngageStore['unread']>) => void;
  getEngageBadgeCount: () => number;

  // Announcements read-state
  lastSeenAnnouncementAt: string | null;
  refreshAnnouncementUnread: () => Promise<void>;
  markAnnouncementsSeen: () => Promise<void>;

  // Convenience refresh for badges
  refreshUnreadCounts: () => Promise<void>;

  // Realtime (in-app) updates
  startRealtime: () => Promise<void>;
  stopRealtime: () => void;

  announcements: Announcement[];
  announcementById: Record<string, Announcement>;

  incomingRequests: IncomingRequestItem[];

  inbox: InboxItem[];
  messagesByThreadId: Record<string, ChatMessage[]>;

  // Actions
  loadAnnouncements: () => Promise<void>;
  loadAnnouncementById: (id: string) => Promise<void>;

  loadIncomingRequests: () => Promise<void>;
  acceptRequest: (id: string) => Promise<void>;
  declineRequest: (id: string) => Promise<void>;

  // DM
  loadInbox: () => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  sendMessage: (params: { threadId: string; body: string }) => Promise<void>;
  markRead: (threadId: string) => Promise<void>;

  // Gate helpers (used by Community screens)
  getOrCreateContactRequest: (params: {
    eventId: string;
    otherUserId: string; // Cognito sub
  }) => Promise<{ status: string; requestId: string; requestKey: string }>;
  ensureDmThreadForAcceptedRequest: (params: {
    eventId: string;
    otherUserId: string;
  }) => Promise<{ threadId: string }>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

function requestKeyFor(eventId: string, a: string, b: string): string {
  return `e:${eventId}|u:${a}|u:${b}`;
}

function dmKeyFor(a: string, b: string): string {
  return `u:${a}|u:${b}`;
}

async function getMySub(): Promise<string> {
  const user = await getCurrentUser();
  return user.userId;
}

async function profileLabel(userId: string): Promise<string> {
  try {
    const resp = await graphqlClient.graphql({
      query: apsAppUserProfilesByUserId,
      variables: { userId, limit: 1 },
    });
    const data = resp.data as {
      apsAppUserProfilesByUserId?: { items?: Array<APITypes.ApsAppUserProfile | null> };
    };
    const p = data.apsAppUserProfilesByUserId?.items?.find((x) => x?.id);
    if (p?.firstName || p?.lastName) return `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
    return p?.email || userId;
  } catch {
    return userId;
  }
}

// Module-level subscription cleanup (avoid storing non-serializable objects in Zustand state)
let _stopRealtime: (() => void) | null = null;

export const useEngageStore = create<EngageStore>((set, get) => ({
  loading: {
    announcements: false,
    announcementDetail: false,
    requests: false,
    inbox: false,
    messages: false,
    engageState: false,
  },
  error: {
    announcements: null,
    announcementDetail: null,
    requests: null,
    inbox: null,
    messages: null,
    engageState: null,
  },

  unread: { announcements: 0, messages: 0, requests: 0 },
  setUnread: (partial) => set({ unread: { ...get().unread, ...partial } }),
  getEngageBadgeCount: () => {
    const u = get().unread;
    return (u.announcements || 0) + (u.messages || 0) + (u.requests || 0);
  },

  lastSeenAnnouncementAt: null,

  async refreshUnreadCounts() {
    await Promise.allSettled([get().loadInbox(), get().loadIncomingRequests(), get().loadAnnouncements()]);
    await get().refreshAnnouncementUnread();
  },

  async startRealtime() {
    if (_stopRealtime) return; // already started
    const mySub = await getMySub();

    // DM messages (owner auth should restrict to relevant messages)
    const dmSub = (graphqlAuthClient.graphql({
      query: onCreateApsDmMessageMinimal,
    }) as any).subscribe({
      next: (evt: any) => {
        const msg = evt?.data?.onCreateApsDmMessage;
        if (!msg?.id || !msg?.threadId) return;

        const isMine = msg.senderUserId === mySub;
        const threadId = String(msg.threadId);
        const createdAt = String(msg.createdAt || nowIso());
        const body = String(msg.body || '');

        // Update message list if thread is open/loaded
        const existingThreadMsgs = get().messagesByThreadId[threadId];
        if (existingThreadMsgs) {
          const already = existingThreadMsgs.some((m) => m.id === msg.id);
          if (!already) {
            set({
              messagesByThreadId: {
                ...get().messagesByThreadId,
                [threadId]: [
                  ...existingThreadMsgs,
                  { id: msg.id, threadId, body, createdAt, isMine },
                ],
              },
            });
          }
        }

        // Update inbox preview/lastMessageAt, and unread counts if it's not mine
        const inbox = get().inbox || [];
        const idx = inbox.findIndex((i) => i.threadId === threadId);
        if (idx >= 0) {
          const nextInbox = inbox.slice();
          const prev = nextInbox[idx];
          nextInbox[idx] = {
            ...prev,
            preview: body,
            lastMessageAt: createdAt,
            unreadCount: isMine ? prev.unreadCount : (prev.unreadCount || 0) + 1,
          };
          set({ inbox: nextInbox });
        } else {
          // If it's a brand new thread for this device session, just refresh inbox
          void get().loadInbox();
        }

        if (!isMine) {
          get().setUnread({ messages: get().unread.messages + 1 });
          Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
        }
      },
      error: (e: any) => console.error('DM subscription error:', e),
    });

    // Contact request create/update
    const requestCreateSub = (graphqlAuthClient.graphql({
      query: onCreateApsContactRequest,
    }) as any).subscribe({
      next: (evt: any) => {
        const r = evt?.data?.onCreateApsContactRequest;
        if (!r?.id) return;
        if (r.status !== 'PENDING') return;
        if (!Array.isArray(r.owners) || !r.owners.includes(mySub)) return;
        if (r.requestedByUserId === mySub) return; // outgoing

        const existing = get().incomingRequests.some((x) => x.id === r.id);
        if (existing) return;

        const fromUserId =
          r.requestedByUserId || (r.userAId === mySub ? r.userBId : r.userAId) || '';

        // Add immediately, then resolve label async.
        const createdAt = String(r.createdAt || nowIso());
        const item = {
          id: String(r.id),
          requestKey: String(r.requestKey || ''),
          fromUserId: String(fromUserId),
          fromLabel: String(fromUserId),
          createdAt,
        };
        set({ incomingRequests: [item, ...get().incomingRequests] });
        get().setUnread({ requests: get().incomingRequests.length + 1 });
        Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
        void profileLabel(item.fromUserId).then((label) => {
          const list = get().incomingRequests;
          const ix = list.findIndex((x) => x.id === item.id);
          if (ix < 0) return;
          const next = list.slice();
          next[ix] = { ...next[ix], fromLabel: label };
          set({ incomingRequests: next });
        });
      },
      error: (e: any) => console.error('Request create subscription error:', e),
    });

    const requestUpdateSub = (graphqlAuthClient.graphql({
      query: onUpdateApsContactRequest,
    }) as any).subscribe({
      next: (evt: any) => {
        const r = evt?.data?.onUpdateApsContactRequest;
        if (!r?.id) return;
        const list = get().incomingRequests;
        const ix = list.findIndex((x) => x.id === r.id);

        // If it was in our incoming list and is no longer pending, remove it.
        if (ix >= 0 && r.status !== 'PENDING') {
          const next = list.slice();
          next.splice(ix, 1);
          set({ incomingRequests: next });
          get().setUnread({ requests: next.length });
          Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
          return;
        }

        // If it became pending and is incoming, add it.
        if (
          ix < 0 &&
          r.status === 'PENDING' &&
          Array.isArray(r.owners) &&
          r.owners.includes(mySub) &&
          r.requestedByUserId !== mySub
        ) {
          const fromUserId =
            r.requestedByUserId || (r.userAId === mySub ? r.userBId : r.userAId) || '';
          const createdAt = String(r.createdAt || nowIso());
          const item = {
            id: String(r.id),
            requestKey: String(r.requestKey || ''),
            fromUserId: String(fromUserId),
            fromLabel: String(fromUserId),
            createdAt,
          };
          set({ incomingRequests: [item, ...get().incomingRequests] });
          get().setUnread({ requests: get().incomingRequests.length + 1 });
          Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
          void profileLabel(item.fromUserId).then((label) => {
            const cur = get().incomingRequests;
            const j = cur.findIndex((x) => x.id === item.id);
            if (j < 0) return;
            const next = cur.slice();
            next[j] = { ...next[j], fromLabel: label };
            set({ incomingRequests: next });
          });
        }
      },
      error: (e: any) => console.error('Request update subscription error:', e),
    });

    _stopRealtime = () => {
      try { dmSub?.unsubscribe?.(); } catch {}
      try { requestCreateSub?.unsubscribe?.(); } catch {}
      try { requestUpdateSub?.unsubscribe?.(); } catch {}
      _stopRealtime = null;
    };
  },

  stopRealtime() {
    if (_stopRealtime) _stopRealtime();
  },

  announcements: [],
  announcementById: {},

  incomingRequests: [],

  inbox: [],
  messagesByThreadId: {},

  async loadAnnouncements() {
    set({
      loading: { ...get().loading, announcements: true },
      error: { ...get().error, announcements: null },
    });
    try {
      const resp = await graphqlAuthClient.graphql({
        query: apsAdminAnnouncementsByEventIdAndCreatedAt,
        variables: {
          eventId: APS_ID,
          sortDirection: 'DESC',
          limit: 50,
        },
      });
      const data = resp.data as {
        apsAdminAnnouncementsByEventIdAndCreatedAt?: { items?: Array<Announcement | null> };
      };
      const items = (data.apsAdminAnnouncementsByEventIdAndCreatedAt?.items || [])
        .filter((x): x is Announcement => !!x?.id)
        .map((x) => x);
      const byId: Record<string, Announcement> = { ...get().announcementById };
      for (const a of items) byId[a.id] = a;
      set({
        announcements: items,
        announcementById: byId,
        loading: { ...get().loading, announcements: false },
      });
      // refresh unread based on newly loaded list
      void get().refreshAnnouncementUnread();
    } catch (e: any) {
      set({
        loading: { ...get().loading, announcements: false },
        error: { ...get().error, announcements: e?.message || 'Failed to load announcements' },
      });
    }
  },

  async loadAnnouncementById(id: string) {
    if (get().announcementById[id]) return;
    set({
      loading: { ...get().loading, announcementDetail: true },
      error: { ...get().error, announcementDetail: null },
    });
    try {
      const resp = await graphqlAuthClient.graphql({
        query: getApsAdminAnnouncement,
        variables: { id },
      });
      const data = resp.data as { getApsAdminAnnouncement?: Announcement | null };
      if (!data.getApsAdminAnnouncement?.id) throw new Error('Announcement not found');
      set({
        announcementById: { ...get().announcementById, [id]: data.getApsAdminAnnouncement },
        loading: { ...get().loading, announcementDetail: false },
      });
    } catch (e: any) {
      set({
        loading: { ...get().loading, announcementDetail: false },
        error: { ...get().error, announcementDetail: e?.message || 'Failed to load announcement' },
      });
    }
  },

  async loadIncomingRequests() {
    set({
      loading: { ...get().loading, requests: true },
      error: { ...get().error, requests: null },
    });
    try {
      const mySub = await getMySub();
      const resp = await graphqlAuthClient.graphql({
        query: apsContactRequestsByStatusAndUpdatedAt,
        variables: {
          status: 'PENDING',
          sortDirection: 'DESC',
          limit: 100,
        },
      });
      const data = resp.data as {
        apsContactRequestsByStatusAndUpdatedAt?: {
          items?: Array<{
            id?: string | null;
            requestKey?: string | null;
            owners?: string[] | null;
            requestedByUserId?: string | null;
            createdAt?: string | null;
            userAId?: string | null;
            userBId?: string | null;
          } | null>;
        };
      };

      const raw = data.apsContactRequestsByStatusAndUpdatedAt?.items || [];
      const incoming = raw
        .filter((r) => r?.id && r?.owners?.includes(mySub) && r?.requestedByUserId !== mySub)
        .map((r) => {
          const fromUserId =
            r?.requestedByUserId || (r?.userAId === mySub ? r?.userBId : r?.userAId) || '';
          return {
            id: r!.id as string,
            requestKey: (r?.requestKey || '') as string,
            fromUserId,
            fromLabel: fromUserId,
            createdAt: (r?.createdAt || nowIso()) as string,
          } satisfies IncomingRequestItem;
        });

      // Resolve labels via public profile lookup (API key models).
      const labeled = await Promise.all(
        incoming.map(async (r) => ({ ...r, fromLabel: await profileLabel(r.fromUserId) }))
      );

      set({
        incomingRequests: labeled,
        loading: { ...get().loading, requests: false },
      });
      get().setUnread({ requests: labeled.length });
      Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
    } catch (e: any) {
      set({
        loading: { ...get().loading, requests: false },
        error: { ...get().error, requests: e?.message || 'Failed to load requests' },
      });
    }
  },

  async acceptRequest(id: string) {
    await graphqlAuthClient.graphql({
      query: updateApsContactRequest,
      variables: { input: { id, status: 'ACCEPTED', acceptedAt: nowIso() } },
    });
    await get().loadIncomingRequests();
    Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
  },

  async declineRequest(id: string) {
    await graphqlAuthClient.graphql({
      query: updateApsContactRequest,
      variables: { input: { id, status: 'DECLINED', declinedAt: nowIso() } },
    });
    await get().loadIncomingRequests();
    Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
  },

  async getOrCreateContactRequest({ eventId, otherUserId }) {
    const mySub = await getMySub();
    const [a, b] = sortPair(mySub, otherUserId);
    const requestKey = requestKeyFor(eventId, a, b);

    const resp = await graphqlAuthClient.graphql({
      query: apsContactRequestsByRequestKey,
      variables: { requestKey, limit: 1 },
    });
    const data = resp.data as {
      apsContactRequestsByRequestKey?: {
        items?: Array<{ id?: string | null; status?: string | null } | null>;
      };
    };
    const existing = data.apsContactRequestsByRequestKey?.items?.find((x) => x?.id);
    if (existing?.id) {
      return { status: existing.status || 'PENDING', requestId: existing.id, requestKey };
    }

    const createResp = await graphqlAuthClient.graphql({
      query: createApsContactRequest,
      variables: {
        input: {
          eventId,
          requestKey,
          userAId: a,
          userBId: b,
          owners: [a, b],
          requestedByUserId: mySub,
          status: 'PENDING',
        },
      },
    });
    const created = (createResp.data as any)?.createApsContactRequest as { id?: string; status?: string };
    if (!created?.id) throw new Error('Failed to create request');
    return { status: created.status || 'PENDING', requestId: created.id, requestKey };
  },

  async ensureDmThreadForAcceptedRequest({ eventId, otherUserId }) {
    const { status } = await get().getOrCreateContactRequest({ eventId, otherUserId });
    if (status !== 'ACCEPTED') {
      throw new Error('Request not accepted');
    }

    const mySub = await getMySub();
    const [a, b] = sortPair(mySub, otherUserId);
    const dmKey = dmKeyFor(a, b);

    const existingResp = await graphqlAuthClient.graphql({
      query: apsDmThreadsByDmKey,
      variables: {
        dmKey,
        limit: 1,
        filter: { eventId: { eq: eventId } },
      },
    });
    const existingData = existingResp.data as {
      apsDmThreadsByDmKey?: { items?: Array<{ id?: string | null } | null> };
    };
    const existing = existingData.apsDmThreadsByDmKey?.items?.find((x) => x?.id);
    if (existing?.id) return { threadId: existing.id };

    const createThreadResp = await graphqlAuthClient.graphql({
      query: createApsDmThread,
      variables: {
        input: {
          eventId,
          dmKey,
          userAId: a,
          userBId: b,
          owners: [a, b],
        },
      },
    });
    const createdThread = (createThreadResp.data as any)?.createApsDmThread as { id?: string };
    if (!createdThread?.id) throw new Error('Failed to create thread');

    // Ensure participant states exist for both users.
    await Promise.all(
      [a, b].map(async (userId) => {
        try {
          await graphqlAuthClient.graphql({
            query: createApsDmParticipantState,
            variables: {
              input: {
                eventId,
                threadId: createdThread.id!,
                userId,
                lastReadAt: userId === mySub ? nowIso() : undefined,
                unreadCount: 0,
                lastMessageAt: null,
              },
            },
          });
        } catch {
          // Ignore if already exists (or race) — inbox will still work.
        }
      })
    );

    return { threadId: createdThread.id };
  },

  async loadInbox() {
    set({
      loading: { ...get().loading, inbox: true },
      error: { ...get().error, inbox: null },
    });
    try {
      const mySub = await getMySub();
      const resp = await graphqlAuthClient.graphql({
        query: apsDmParticipantStatesByUserIdAndLastMessageAt,
        variables: {
          userId: mySub,
          sortDirection: 'DESC',
          limit: 50,
        },
      });
      const data = resp.data as {
        apsDmParticipantStatesByUserIdAndLastMessageAt?: {
          items?: Array<{
            id?: string | null;
            threadId: string;
            unreadCount?: number | null;
            lastMessageAt?: string | null;
          } | null>;
        };
      };
      const states =
        data.apsDmParticipantStatesByUserIdAndLastMessageAt?.items?.filter(
          (
            x
          ): x is {
            id?: string | null;
            threadId: string;
            unreadCount?: number | null;
            lastMessageAt?: string | null;
          } => !!x?.threadId
        ) || [];

      const items: InboxItem[] = await Promise.all(
        states.map(async (s) => {
          let title = 'Conversation';
          let preview = '';
          let lastMessageAt = s.lastMessageAt || null;
          try {
            const threadResp = await graphqlAuthClient.graphql({
              query: getApsDmThread,
              variables: { id: s.threadId },
            });
            const thread = (threadResp.data as any)?.getApsDmThread as
              | { userAId?: string; userBId?: string; lastMessageAt?: string | null; lastMessagePreview?: string | null }
              | null;
            if (thread?.lastMessagePreview) preview = thread.lastMessagePreview;
            if (thread?.lastMessageAt) lastMessageAt = thread.lastMessageAt;
            const otherId = thread?.userAId === mySub ? thread?.userBId : thread?.userAId;
            if (otherId) title = await profileLabel(otherId);
          } catch {
            // ignore enrichment failures
          }
          return {
            threadId: s.threadId,
            title,
            preview,
            unreadCount: s.unreadCount,
            lastMessageAt: lastMessageAt || undefined,
          };
        })
      );

      set({
        inbox: items,
        loading: { ...get().loading, inbox: false },
      });

      // unread messages badge is the sum of participantState.unreadCount
      const unreadMessages = states.reduce((acc, s) => acc + (s.unreadCount || 0), 0);
      get().setUnread({ messages: unreadMessages });
      Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
    } catch (e: any) {
      set({
        loading: { ...get().loading, inbox: false },
        error: { ...get().error, inbox: e?.message || 'Failed to load inbox' },
      });
    }
  },

  async loadMessages(threadId: string) {
    set({
      loading: { ...get().loading, messages: true },
      error: { ...get().error, messages: null },
    });
    try {
      const mySub = await getMySub();
      const resp = await graphqlAuthClient.graphql({
        query: apsDmMessagesByThreadIdAndCreatedAt,
        variables: {
          threadId,
          sortDirection: 'DESC',
          limit: 100,
        },
      });
      const data = resp.data as {
        apsDmMessagesByThreadIdAndCreatedAt?: {
          items?: Array<{
            id?: string | null;
            threadId?: string | null;
            senderUserId?: string | null;
            body?: string | null;
            createdAt?: string | null;
          } | null>;
        };
      };
      const items =
        data.apsDmMessagesByThreadIdAndCreatedAt?.items?.filter((m) => m?.id && m?.createdAt) || [];
      const mapped: ChatMessage[] = items.map((m) => ({
        id: m!.id as string,
        threadId,
        body: (m?.body || '') as string,
        createdAt: (m?.createdAt || nowIso()) as string,
        isMine: m?.senderUserId === mySub,
      }));
      set({
        messagesByThreadId: { ...get().messagesByThreadId, [threadId]: mapped },
        loading: { ...get().loading, messages: false },
      });
    } catch (e: any) {
      set({
        loading: { ...get().loading, messages: false },
        error: { ...get().error, messages: e?.message || 'Failed to load messages' },
      });
    }
  },

  async sendMessage({ threadId, body }) {
    const mySub = await getMySub();

    // Fetch thread so we can set owners correctly.
    const threadResp = await graphqlAuthClient.graphql({
      query: getApsDmThread,
      variables: { id: threadId },
    });
    const thread = (threadResp.data as any)?.getApsDmThread as
      | { userAId?: string; userBId?: string; owners?: string[] }
      | null;
    const userAId = thread?.userAId;
    const userBId = thread?.userBId;
    const owners = thread?.owners || (userAId && userBId ? [userAId, userBId] : null);
    if (!owners?.length) throw new Error('Unable to send message (missing owners)');

    await graphqlAuthClient.graphql({
      query: createApsDmMessageMinimal,
      variables: {
        input: {
          eventId: APS_ID,
          threadId,
          senderUserId: mySub,
          owners,
          type: 'text',
          body,
        },
      },
    });

    // Update thread preview (best effort)
    try {
      await graphqlAuthClient.graphql({
        query: updateApsDmThread,
        variables: { input: { id: threadId, lastMessageAt: nowIso(), lastMessagePreview: body } },
      });
    } catch {
      // ignore
    }

    // Update participant states (best effort): mark sender read, bump recipient unread.
    if (userAId && userBId) {
      const otherSub = userAId === mySub ? userBId : userAId;
      const ts = nowIso();
      try {
        // Sender
        const senderStateResp = await graphqlAuthClient.graphql({
          query: apsDmParticipantStatesByThreadIdAndUserId,
          variables: { threadId, userId: { eq: mySub }, limit: 1 },
        });
        const senderState = (senderStateResp.data as any)?.apsDmParticipantStatesByThreadIdAndUserId
          ?.items?.find((x: any) => x?.id);
        if (senderState?.id) {
          await graphqlAuthClient.graphql({
            query: updateApsDmParticipantState,
            variables: {
              input: {
                id: senderState.id,
                lastReadAt: ts,
                unreadCount: 0,
                lastMessageAt: ts,
              },
            },
          });
        }

        // Recipient
        const recipStateResp = await graphqlAuthClient.graphql({
          query: apsDmParticipantStatesByThreadIdAndUserId,
          variables: { threadId, userId: { eq: otherSub }, limit: 1 },
        });
        const recipState = (recipStateResp.data as any)?.apsDmParticipantStatesByThreadIdAndUserId
          ?.items?.find((x: any) => x?.id);
        const currentUnread = recipState?.unreadCount || 0;
        if (recipState?.id) {
          await graphqlAuthClient.graphql({
            query: updateApsDmParticipantState,
            variables: {
              input: {
                id: recipState.id,
                unreadCount: currentUnread + 1,
                lastMessageAt: ts,
              },
            },
          });
        }
      } catch {
        // ignore
      }
    }

    await get().loadMessages(threadId);
    await get().loadInbox();
  },

  async markRead(threadId: string) {
    try {
      const mySub = await getMySub();
      const resp = await graphqlAuthClient.graphql({
        query: apsDmParticipantStatesByThreadIdAndUserId,
        variables: { threadId, userId: { eq: mySub }, limit: 1 },
      });
      const state = (resp.data as any)?.apsDmParticipantStatesByThreadIdAndUserId?.items?.find(
        (x: any) => x?.id
      );
      if (!state?.id) return;
      await graphqlAuthClient.graphql({
        query: updateApsDmParticipantState,
        variables: { input: { id: state.id, lastReadAt: nowIso(), unreadCount: 0 } },
      });
      await get().loadInbox();
      Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
    } catch {
      // ignore
    }
  },

  async refreshAnnouncementUnread() {
    set({
      loading: { ...get().loading, engageState: true },
      error: { ...get().error, engageState: null },
    });
    try {
      const mySub = await getMySub();
      const stateId = `e:${APS_ID}|u:${mySub}`;
      const resp = await graphqlAuthClient.graphql({
        query: getApsUserEngageState,
        variables: { id: stateId },
      });
      const state = (resp.data as any)?.getApsUserEngageState as
        | { lastSeenAnnouncementAt?: string | null }
        | null;
      const lastSeen = state?.lastSeenAnnouncementAt || null;
      set({
        lastSeenAnnouncementAt: lastSeen,
        loading: { ...get().loading, engageState: false },
      });

      const announcements = get().announcements || [];
      const unread = lastSeen
        ? announcements.filter((a) => a.createdAt > lastSeen).length
        : announcements.length;
      get().setUnread({ announcements: unread });
      Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
    } catch (e: any) {
      set({
        loading: { ...get().loading, engageState: false },
        error: { ...get().error, engageState: e?.message || 'Failed to load engage state' },
      });
      // If state can’t be read yet (schema not pushed), don’t block UI; keep current count.
    }
  },

  async markAnnouncementsSeen() {
    try {
      const mySub = await getMySub();
      const stateId = `e:${APS_ID}|u:${mySub}`;
      const ts = nowIso();

      // Robust upsert: check existence first, then update or create.
      const existingResp = (await graphqlAuthClient.graphql({
        query: getApsUserEngageState,
        variables: { id: stateId },
      })) as any;
      const existing = existingResp?.data?.getApsUserEngageState;

      if (existing?.id) {
        const updateResp = (await graphqlAuthClient.graphql({
          query: updateApsUserEngageState,
          variables: { input: { id: stateId, lastSeenAnnouncementAt: ts } },
        })) as any;
        const updated = updateResp?.data?.updateApsUserEngageState;
        if (!updated?.id) throw new Error('Failed to update engage state');
      } else {
        const createResp = (await graphqlAuthClient.graphql({
          query: createApsUserEngageState,
          variables: {
            input: { id: stateId, eventId: APS_ID, userId: mySub, lastSeenAnnouncementAt: ts },
          },
        })) as any;
        const created = createResp?.data?.createApsUserEngageState;
        if (!created?.id) throw new Error('Failed to create engage state');
      }

      set({ lastSeenAnnouncementAt: ts });
      get().setUnread({ announcements: 0 });
      Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
    } catch {
      // ignore (e.g. schema not deployed yet)
      set({ lastSeenAnnouncementAt: nowIso() });
      get().setUnread({ announcements: 0 });
      Notifications.setBadgeCountAsync(get().getEngageBadgeCount()).catch(() => {});
    }
  },
}));


