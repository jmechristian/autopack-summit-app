// app/(main)/hub/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentAppUser, useCurrentUserProfile } from '../../../src/hooks/useApsStore';
import { useEngageStore } from '../../../src/store/engageStore';
import { autopackColors } from '../../../src/theme';
import { APS_ID } from '../../../src/config/apsConfig';
import { apsAppSessionsByAgendaIdWithRelations } from '../../../src/graphql/customQueries';
import {
  apsAppExhibitorProfilesByCompanyId,
  apsAppUserPassportStampsByUserProfileIdAndCreatedAt,
} from '../../../src/graphql/queries';
import { AppBadge } from '../../../src/ui/AppBadge';
import { IconCard } from '../../../src/ui/IconCard';
import { ui } from '../../../src/ui/tokens';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../../src/utils/graphqlClient';
import { drainIndexedList } from '../../../src/utils/paginateGraphql';
import { resolveProfilePictureUri } from '../../../src/utils/storageUtils';
import { isCurrentUserAdmin } from '../../../src/utils/adminAccess';
import {
  breakpoints,
  hubWideColumnWidths,
  isHubWideLayout,
  toolGridCellWidth,
  toolGridColumns,
  useContentFrame,
  useMainTabScrollPadding,
} from '../../../src/utils/layout';
import {
  compareSessionsByStart,
  isSessionLive,
  isSessionUpcoming,
} from '../../../src/utils/sessionLive';
import { AgendaSessionCard } from '../../../src/components/agenda/AgendaSessionCard';
import { ApcCertificateCard } from '../../../src/components/certificate/ApcCertificateCard';
import { SafeEnteringView } from '../../../src/components/SafeEnteringView';
import { HubHeroRive } from '../../../src/components/hub/HubHeroRive';
import { HubCountdownStrip } from '../../../src/components/hub/HubCountdownStrip';
import { HubHelpMenu } from '../../../src/components/hub/HubHelpMenu';
import { HubQrBadge } from '../../../src/components/hub/HubQrBadge';
import { HubSponsorBlock } from '../../../src/components/hub/HubSponsorBlock';

const HUB_HERO_RIVE = require('../../../assets/hub_header.riv');

type QuickTool = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  comingSoon?: boolean;
};

const MAX_QUICK_TOOLS = 8;
const QUICK_TOOLS_STORAGE_KEY = 'hub.quickTools.v3';
// Default pinned quick tools (max 8)
const DEFAULT_TOOL_IDS = [
  'contacts',
  'requests',
  'messages',
  'announcements',
  'sponsors',
  'speakers',
  'exhibitors',
  'lead-capture',
];
const EXHIBITOR_DEFAULT_TOOL_IDS = [
  'exhibitor-profile',
  'contacts',
  'requests',
  'messages',
  'announcements',
  'sponsors',
  'speakers',
  'lead-capture',
];

const ALL_QUICK_TOOLS: QuickTool[] = [
  { id: 'contacts', icon: 'person', label: 'Contacts', route: '/(main)/hub/contacts' },
  { id: 'notes', icon: 'document-text', label: 'Notes', route: '/(main)/hub/notes' },
  { id: 'requests', icon: 'git-pull-request', label: 'Requests', route: '/(main)/hub/requests' },
  { id: 'messages', icon: 'chatbubbles', label: 'Messages', route: '/(main)/hub/messages' },
  { id: 'announcements', icon: 'megaphone', label: 'Announcements', route: '/(main)/hub/announcements' },
  { id: 'qr', icon: 'qr-code', label: 'My QR Code', route: '/(main)/hub/qr' },
  { id: 'exhibitor-profile', icon: 'construct', label: 'Exhibitor Profile', route: '/(main)/hub/exhibitor-profile' },
  { id: 'lead-capture', icon: 'scan', label: 'Capture Contact', route: '/(main)/hub/capture' },
  { id: 'leaderboard', icon: 'trophy', label: 'Leaderboard', comingSoon: true },
  { id: 'favorites', icon: 'star', label: 'Favorites', route: '/(main)/hub/favorites' },
  { id: 'exhibitors', icon: 'business', label: 'Exhibitors', route: '/(main)/hub/exhibitors' },
  { id: 'sponsors', icon: 'ribbon', label: 'Sponsors', route: '/(main)/hub/sponsors' },
  { id: 'speakers', icon: 'mic', label: 'Speakers', route: '/(main)/hub/speakers' },
];

type NextSession = {
  id: string;
  title: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  embedUrl?: string | null;
  timeLabel: string;
  location: string;
  descriptionText: string;
  speakerNames: string[];
  sponsorNames: string[];
};

const AGENDA_ID = '83afcde3-7ff3-464a-b116-69e244a39dfd';
const passportExhibitorsByEvent = /* GraphQL */ `
  query HubPassportExhibitorsByEvent($eventId: ID!, $limit: Int, $nextToken: String) {
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

function normalizeText(v?: string | null) {
  return (v || '').trim();
}

function formatTimeRange(start?: string | null, end?: string | null) {
  const s = normalizeText(start);
  const e = normalizeText(end);
  if (s && e) return `${s} - ${e}`;
  return s || '';
}

function formatSessionDateLabel(date?: string | null) {
  const raw = normalizeText(date);
  if (!raw) return '';
  const parsed = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function resolvePresentationUrl(embedUrl?: string | null) {
  const raw = normalizeText(embedUrl);
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : '';
}

function selectHubSessions(sessions: NextSession[], now: Date) {
  const liveSessions = sessions
    .filter((session) => isSessionLive(session, now))
    .sort(compareSessionsByStart);

  if (liveSessions.length) {
    return { sessions: liveSessions, headerLabel: 'Live Now' as const };
  }

  const upcomingSessions = sessions
    .filter((session) => isSessionUpcoming(session, now))
    .sort(compareSessionsByStart);

  if (!upcomingSessions.length) {
    return { sessions: [], headerLabel: 'Coming Up' as const };
  }

  // Skip the first two agenda items (e.g. registration / welcome) and start at the 3rd.
  return { sessions: upcomingSessions.slice(2), headerLabel: 'Coming Up' as const };
}

function htmlToPlainText(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export default function HubScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { frame, inset: contentInset, frameWidth } = useContentFrame(20);
  const tabScrollPad = useMainTabScrollPadding();
  const hubWide = isHubWideLayout(screenW);
  const heroChromeScale = screenW >= breakpoints.lg ? 2 : screenW >= breakpoints.md ? 1 : 0;
  const heroAvatarSize = heroChromeScale === 2 ? 52 : heroChromeScale === 1 ? 44 : 34;
  const heroIconSize = heroChromeScale === 2 ? 30 : heroChromeScale === 1 ? 26 : 22;
  const heroIconBtnSize = heroChromeScale === 2 ? 52 : heroChromeScale === 1 ? 46 : 38;
  const wideCols = hubWideColumnWidths({ screenWidth: frameWidth, contentInset });
  const toolsColumns = hubWide ? 2 : toolGridColumns(screenW);
  const toolsContainerW = hubWide ? wideCols.stack : frameWidth - contentInset * 2;
  const toolsCellWidth = toolGridCellWidth({
    containerWidth: toolsContainerW,
    columns: toolsColumns,
  });
  const profile = useCurrentUserProfile();
  const currentAppUser = useCurrentAppUser();
  const companyId = currentAppUser?.registrant?.companyId || null;
  const engageBadge = useEngageStore((s) => s.getEngageBadgeCount());
  const [heroBox, setHeroBox] = useState({ width: 0, height: 0 });
  const [toolsHeight, setToolsHeight] = useState(0);
  const hubQrTileWidth = useMemo(() => {
    if (!hubWide || heroBox.width < 8 || heroBox.height < 8) return undefined;
    const basis = Math.min(heroBox.width, heroBox.height);
    return Math.round(basis * 0.42);
  }, [heroBox.height, heroBox.width, hubWide]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarReady, setAvatarReady] = useState(false);
  const [allSessions, setAllSessions] = useState<NextSession[]>([]);
  const scrollX = useRef(new RNAnimated.Value(0)).current;
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(DEFAULT_TOOL_IDS);
  const [editingToolIds, setEditingToolIds] = useState<string[]>([]);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [toolsLoaded, setToolsLoaded] = useState(false);
  const [hasExhibitorProfile, setHasExhibitorProfile] = useState<boolean | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [passportLoading, setPassportLoading] = useState(true);
  const [passportTotal, setPassportTotal] = useState(0);
  const [passportCollected, setPassportCollected] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const now = useMemo(() => new Date(nowMs), [nowMs]);
  const { sessions: nextSessions, headerLabel: nextSessionHeaderLabel } = useMemo(
    () => selectHubSessions(allSessions, now),
    [allSessions, now],
  );

  useEffect(() => {
    setSessionIndex(0);
  }, [nextSessions.length, nextSessionHeaderLabel]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const loadTools = async () => {
      try {
        const stored = await AsyncStorage.getItem(QUICK_TOOLS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const map = new Map(ALL_QUICK_TOOLS.map((t) => [t.id, t]));
            const deduped: string[] = [];
            for (const id of parsed) {
              if (typeof id !== 'string') continue;
              if (!map.has(id)) continue;
              if (deduped.includes(id)) continue;
              deduped.push(id);
              if (deduped.length >= MAX_QUICK_TOOLS) break;
            }
            if (deduped.length) setSelectedToolIds(deduped);
          }
        }
      } catch (e) {
        console.warn('Hub: unable to load quick tools selection', e);
      } finally {
        setToolsLoaded(true);
      }
    };
    loadTools();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkExhibitorAccess() {
      if (!companyId) {
        if (!cancelled) setHasExhibitorProfile(false);
        return;
      }
      try {
        const resp = await graphqlApiKeyClient.graphql({
          query: apsAppExhibitorProfilesByCompanyId,
          variables: {
            companyId,
            filter: { eventId: { eq: APS_ID } },
            limit: 1,
          },
        });
        const data = resp.data as {
          apsAppExhibitorProfilesByCompanyId?: {
            items?: Array<{ id?: string | null } | null> | null;
          } | null;
        };
        const found = !!(data.apsAppExhibitorProfilesByCompanyId?.items || []).find((x) => !!x?.id);
        if (!cancelled) setHasExhibitorProfile(found);
      } catch {
        if (!cancelled) setHasExhibitorProfile(false);
      }
    }

    checkExhibitorAccess();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!toolsLoaded || hasExhibitorProfile !== true) return;
    if (selectedToolIds.includes('exhibitor-profile')) return;
    const next = ['exhibitor-profile', ...selectedToolIds.filter((id) => id !== 'exhibitor-profile')].slice(
      0,
      MAX_QUICK_TOOLS,
    );
    setSelectedToolIds(next);
    setEditingToolIds(next);
    AsyncStorage.setItem(QUICK_TOOLS_STORAGE_KEY, JSON.stringify(next)).catch((e) => {
      console.warn('Hub: unable to save quick tools selection', e);
    });
  }, [hasExhibitorProfile, selectedToolIds, toolsLoaded]);

  useEffect(() => {
    let mounted = true;
    const loadAdminAccess = async () => {
      const allowed = await isCurrentUserAdmin();
      if (!mounted) return;
      setIsAdminUser(allowed);
    };
    loadAdminAccess();
    return () => {
      mounted = false;
    };
  }, []);

  const loadPassportProgress = useCallback(async () => {
    setPassportLoading(true);
    try {
      const profileId = profile?.id || null;
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
        const stampRows = await drainIndexedList<{
          exhibitorId?: string | null;
          eventId?: string | null;
        }>({
          client: graphqlAuthClient,
          query: apsAppUserPassportStampsByUserProfileIdAndCreatedAt,
          field: 'apsAppUserPassportStampsByUserProfileIdAndCreatedAt',
          variables: { userProfileId: profileId },
        });
        for (const item of stampRows) {
          if (item.eventId === APS_ID && item.exhibitorId) stampIds.add(item.exhibitorId);
        }
      }

      setPassportTotal(exhibitorIds.size);
      setPassportCollected([...stampIds].filter((id) => exhibitorIds.has(id)).length);
    } catch (e) {
      console.warn('Hub passport progress failed:', e);
      setPassportTotal(0);
      setPassportCollected(0);
    } finally {
      setPassportLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadPassportProgress();
  }, [loadPassportProgress]);

  useEffect(() => {
    let cancelled = false;
    async function loadNextSessions() {
      try {
        const all: any[] = [];
        let nextToken: string | null | undefined = null;
        do {
          const resp = await graphqlApiKeyClient.graphql({
            query: apsAppSessionsByAgendaIdWithRelations,
            variables: { agendaId: AGENDA_ID, limit: 200, nextToken },
          });
          const data = resp.data as any;
          const conn = data?.apsAppSessionsByAgendaId;
          const items: Array<any> = conn?.items || [];
          for (const it of items) {
            if (it?.id) all.push(it);
          }
          nextToken = conn?.nextToken;
        } while (nextToken);

        // Sort by date+startTime best-effort (same approach as agenda screen, but lightweight)
        all.sort((a, b) => {
          const aKey = new Date(`${normalizeText(a?.date)}T${normalizeText(a?.startTime)}`).getTime();
          const bKey = new Date(`${normalizeText(b?.date)}T${normalizeText(b?.startTime)}`).getTime();
          const aSafe = Number.isNaN(aKey) ? Number.POSITIVE_INFINITY : aKey;
          const bSafe = Number.isNaN(bKey) ? Number.POSITIVE_INFINITY : bKey;
          return aSafe - bSafe;
        });

        const mapped: NextSession[] = all.map((it) => {
          const title = normalizeText(it?.title) || 'Session';
          const location = normalizeText(it?.location);
          const time = formatTimeRange(it?.startTime, it?.endTime);
          const speakerNames = (it?.speakers?.items || [])
            .map((x: any) => x?.aPSSpeaker)
            .filter(Boolean)
            .map((sp: any) =>
              `${normalizeText(sp?.firstName || sp?.profile?.firstName)} ${normalizeText(
                sp?.lastName || sp?.profile?.lastName,
              )}`.trim(),
            )
            .filter(Boolean);
          const sponsorNames = (it?.sponsors?.items || [])
            .map((x: any) => x?.apsSponsor?.company?.name)
            .map((name: any) => normalizeText(name))
            .filter(Boolean);
          const descriptionText = htmlToPlainText(normalizeText(it?.description));

          return {
            id: it.id,
            title,
            date: it?.date ?? null,
            startTime: it?.startTime ?? null,
            endTime: it?.endTime ?? null,
            embedUrl: it?.embedUrl ?? null,
            timeLabel: time || 'TBD',
            location: location || '',
            descriptionText,
            speakerNames,
            sponsorNames,
          };
        });

        if (!cancelled) {
          setAllSessions(mapped);
        }
      } catch (e) {
        // Keep hub resilient: fall back to mock if anything goes wrong
        console.warn('Hub: failed to load next sessions, using fallback.');
      }
    }
    loadNextSessions();
    return () => {
      cancelled = true;
    };
  }, []);

  const passportPercent = useMemo(
    () => (passportTotal > 0 ? Math.round((passportCollected / passportTotal) * 100) : 0),
    [passportCollected, passportTotal],
  );
  const comingUpPageW =
    pagerWidth > 0 ? pagerWidth : hubWide ? wideCols.hero : Math.max(1, screenW - contentInset * 2);
  const progressTranslateX = useMemo(() => {
    const trackW = 120;
    const dotW = 16;
    const maxTranslate = trackW - dotW;
    const count = nextSessions.length;
    // On web SSR, window width can be 0 → negative page width; Animated requires
    // a monotonically non-decreasing inputRange.
    const pageW = Math.max(1, comingUpPageW || 1);
    const maxScroll = Math.max(1, pageW * Math.max(1, count - 1));
    return scrollX.interpolate({
      inputRange: [0, maxScroll],
      outputRange: [0, maxTranslate],
      extrapolate: 'clamp',
    });
  }, [comingUpPageW, nextSessions.length, scrollX]);

  const fullName = [profile?.firstName?.trim(), profile?.lastName?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();
  const qrCodeUrl = currentAppUser?.registrant?.qrCode || null;
  const initials = `${(profile?.firstName || '').trim().slice(0, 1)}${(
    profile?.lastName || ''
  )
    .trim()
    .slice(0, 1)}`.toUpperCase();
  // Resolve profile picture from either URL or S3 key.
  // Stay hidden until resolution finishes so we never flash initials/"U".
  React.useEffect(() => {
    let cancelled = false;
    setAvatarReady(false);

    const loadAvatar = async () => {
      if (!profile?.id) {
        if (!cancelled) {
          setAvatarUri(null);
          setAvatarReady(false);
        }
        return;
      }

      if (!profile.profilePicture) {
        if (!cancelled) {
          setAvatarUri(null);
          setAvatarReady(true);
        }
        return;
      }

      const url = await resolveProfilePictureUri(profile.profilePicture);
      if (!cancelled) {
        setAvatarUri(url);
        setAvatarReady(true);
      }
    };

    loadAvatar();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.profilePicture]);

  const bottomInset = Math.max(insets.bottom, 16);

  const toolMap = useMemo(() => new Map(ALL_QUICK_TOOLS.map((t) => [t.id, t])), []);

  const selectedTools = useMemo(
    () =>
      selectedToolIds
        .map((id) => toolMap.get(id))
        .filter((t): t is QuickTool => Boolean(t))
        .slice(0, MAX_QUICK_TOOLS),
    [selectedToolIds, toolMap],
  );

  const maxReached = editingToolIds.length >= MAX_QUICK_TOOLS;
  const toolIndexById = useMemo(
    () => new Map(ALL_QUICK_TOOLS.map((t, index) => [t.id, index])),
    [],
  );
  const orderedAvailableTools = useMemo(() => {
    // Make currently selected tools appear first in the "Available tools" list,
    // so they are visible and tappable even when max is reached.
    const selectedSet = new Set(editingToolIds);
    return [...ALL_QUICK_TOOLS].sort((a, b) => {
      const aSel = selectedSet.has(a.id);
      const bSel = selectedSet.has(b.id);
      if (aSel !== bSel) return aSel ? -1 : 1;
      return (toolIndexById.get(a.id) ?? 0) - (toolIndexById.get(b.id) ?? 0);
    });
  }, [editingToolIds, toolIndexById]);

  const handleToolPress = (tool: QuickTool) => {
    if (tool.route) {
      router.push(tool.route as any);
      return;
    }
    Alert.alert('Coming soon', 'This tool is on the way.');
  };

  const openToolsModal = () => {
    const next = [...selectedToolIds].filter((id, idx, arr) => arr.indexOf(id) === idx).slice(0, MAX_QUICK_TOOLS);
    setSelectedToolIds(next);
    setEditingToolIds(next);
    setToolsModalVisible(true);
  };

  const persistTools = async (rawList: string[]) => {
    const cleaned = rawList
      .filter((id) => toolMap.has(id))
      .filter((id, idx, arr) => arr.indexOf(id) === idx)
      .slice(0, MAX_QUICK_TOOLS);

    setEditingToolIds(cleaned);
    setSelectedToolIds(cleaned);
    try {
      await AsyncStorage.setItem(QUICK_TOOLS_STORAGE_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.warn('Hub: unable to save quick tools selection', e);
    }
  };

  const toggleToolInEdit = (id: string) => {
    setEditingToolIds((prev) => {
      let next = prev;
      if (prev.includes(id)) {
        next = prev.filter((t) => t !== id);
      } else if (prev.length < MAX_QUICK_TOOLS) {
        next = [...prev, id];
      }
      persistTools(next);
      return next;
    });
  };

  const moveTool = (id: string, direction: number) => {
    setEditingToolIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[nextIdx];
      copy[nextIdx] = temp;
      persistTools(copy);
      return copy;
    });
  };

  const resetTools = () => {
    const defaults = hasExhibitorProfile ? EXHIBITOR_DEFAULT_TOOL_IDS : DEFAULT_TOOL_IDS;
    persistTools(defaults);
  };

  const heroBlock = (
    <HubHeroRive
      source={HUB_HERO_RIVE}
      fill={hubWide}
      center={
        <HubQrBadge
          qrUri={qrCodeUrl}
          name={fullName}
          tileWidth={hubQrTileWidth}
        />
      }
      style={hubWide ? styles.heroWide : undefined}
    >
      <View
        style={[
          styles.heroTopRow,
          { paddingTop: hubWide ? 12 : insets.top + 4 },
        ]}
      >
        <View style={styles.heroLeft}>
          {avatarReady ? (
            <SafeEnteringView entering={FadeIn.duration(150)}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(main)/profile')}
                style={[
                  styles.avatar,
                  { width: heroAvatarSize, height: heroAvatarSize },
                ]}
                accessibilityRole='button'
                accessibilityLabel='Open your profile'
              >
                {avatarUri ? (
                  <ImageBackground
                    source={{ uri: avatarUri }}
                    style={{
                      width: heroAvatarSize,
                      height: heroAvatarSize,
                      borderRadius: 999,
                    }}
                    imageStyle={{
                      width: heroAvatarSize,
                      height: heroAvatarSize,
                      borderRadius: 999,
                    }}
                  />
                ) : initials ? (
                  <Text
                    style={[
                      styles.avatarText,
                      heroChromeScale > 0 && { fontSize: heroChromeScale === 2 ? 18 : 15 },
                    ]}
                  >
                    {initials}
                  </Text>
                ) : null}
              </TouchableOpacity>
            </SafeEnteringView>
          ) : null}
        </View>

        <View style={styles.heroActions}>
          {isAdminUser ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(main)/admin')}
              style={[
                styles.iconButton,
                { width: heroIconBtnSize, height: heroIconBtnSize },
              ]}
            >
              <Ionicons name='settings-outline' size={heroIconSize} color='#fff' />
            </TouchableOpacity>
          ) : null}
          <HubHelpMenu
            iconButtonStyle={[
              styles.iconButton,
              { width: heroIconBtnSize, height: heroIconBtnSize },
            ]}
            iconSize={heroIconSize}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/hub/notifications')}
            style={[
              styles.iconButton,
              { width: heroIconBtnSize, height: heroIconBtnSize },
            ]}
          >
            <Ionicons name='notifications-outline' size={heroIconSize} color='#fff' />
            <View style={styles.bellBadge}>
              <AppBadge value={engageBadge} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </HubHeroRive>
  );

  const quickToolsBlock = (
    <SafeEnteringView
      style={hubWide ? styles.quickToolsWrapWide : undefined}
      entering={FadeInDown.duration(600).delay(150)}
    >
      <View style={styles.quickToolsHeaderRow}>
        <Text style={styles.quickToolsHeaderText}>Quick Tools</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={openToolsModal}>
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.toolsGrid}>
        {selectedTools.map((t) => (
          <View key={t.id} style={{ width: toolsCellWidth }}>
            <IconCard
              icon={t.icon}
              label={t.label}
              iconBgColor='transparent'
              iconColor='#FFFFFF'
              iconSize={20}
              onPress={() => handleToolPress(t)}
              style={[styles.toolsCard, styles.toolsCardPrimary]}
              iconWrapStyle={styles.toolsIconWrap}
              labelStyle={styles.toolsCardLabel}
            />
          </View>
        ))}
      </View>
    </SafeEnteringView>
  );

  const comingUpBlock =
    nextSessions.length > 0 ? (
      <SafeEnteringView
        entering={FadeInDown.duration(600).delay(160)}
      >
        <View
          style={[
            styles.comingUpModule,
            nextSessionHeaderLabel === 'Live Now' && styles.comingUpModuleLive,
          ]}
        >
          <View
            style={[
              styles.comingUpHeader,
              nextSessionHeaderLabel === 'Live Now' && styles.comingUpHeaderLive,
            ]}
          >
            <View style={styles.comingUpHeaderLeft}>
              <View
                style={[
                  styles.comingUpIconWrap,
                  nextSessionHeaderLabel === 'Live Now' && styles.comingUpIconWrapLive,
                ]}
              >
                <Ionicons
                  name={nextSessionHeaderLabel === 'Live Now' ? 'radio' : 'calendar'}
                  size={16}
                  color="#fff"
                />
              </View>
              <View>
                <Text style={styles.comingUpEyebrow}>ON THE AGENDA</Text>
                <Text style={styles.comingUpHeaderText}>{nextSessionHeaderLabel}</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.comingUpAgendaBtn}
              onPress={() => router.push('/(main)/agenda')}
              accessibilityRole="button"
              accessibilityLabel="Open full agenda"
            >
              <Text style={styles.comingUpAgendaBtnText}>Agenda</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <RNAnimated.ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onLayout={(e) => {
              const w = Math.round(e.nativeEvent.layout.width);
              setPagerWidth((prev) => (prev === w ? prev : w));
            }}
            onScroll={RNAnimated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              const w = e.nativeEvent.layoutMeasurement.width;
              const x = e.nativeEvent.contentOffset.x;
              const i = Math.round(x / w);
              setSessionIndex(i);
            }}
          >
            {nextSessions.map((s) => {
              const live = isSessionLive(s, now);
              const presentationUrl = resolvePresentationUrl(s.embedUrl);
              const dateLabel = formatSessionDateLabel(s.date);
              const timeLabel = dateLabel ? `${dateLabel} · ${s.timeLabel}` : s.timeLabel;

              return (
                <View
                  key={s.id}
                  style={{ width: comingUpPageW }}
                >
                  <View style={styles.sessionCardWrap}>
                    <AgendaSessionCard
                      timeLabel={timeLabel}
                      title={s.title}
                      isLive={live}
                      location={s.location}
                      descriptionText={s.descriptionText}
                      speakerNames={s.speakerNames}
                      sponsorNames={s.sponsorNames}
                      descriptionNumberOfLines={5}
                      metaNumberOfLines={1}
                      showViewSessionButton
                      cardStyle={styles.nextSessionCard}
                      showPresentationButton={live && !!presentationUrl}
                      onPressPresentation={() => {
                        router.push({
                          pathname: '/(main)/agenda/presentation',
                          params: {
                            url: presentationUrl,
                            title: s.title || 'Presentation',
                            sessionId: s.id,
                            returnTo: '/(main)/hub',
                          },
                        });
                      }}
                      onPress={() =>
                        router.push({
                          pathname: '/(main)/agenda/[id]',
                          params: { id: s.id, returnTo: '/(main)/hub' },
                        })
                      }
                    />
                  </View>
                </View>
              );
            })}
          </RNAnimated.ScrollView>

          {nextSessions.length > 1 && (
            <View style={styles.progressWrap} pointerEvents="none">
              <View style={styles.progressTrack}>
                <View style={styles.progressDotsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <View key={i} style={styles.progressDotBg} />
                  ))}
                </View>
                <RNAnimated.View
                  style={[
                    styles.progressActiveDot,
                    { transform: [{ translateX: progressTranslateX }] },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {Math.min(nextSessions.length, sessionIndex + 1)} / {nextSessions.length}
              </Text>
            </View>
          )}
        </View>
      </SafeEnteringView>
    ) : null;

  const sideStackBlock = (
    <>
      <SafeEnteringView entering={FadeInDown.duration(600).delay(180)}>
        <HubSponsorBlock />
      </SafeEnteringView>

      <Pressable style={styles.passportCard} onPress={() => router.push('/(main)/hub/passport' as any)}>
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

      <SafeEnteringView entering={FadeInDown.duration(600).delay(280)}>
        <ApcCertificateCard progress={profile?.apcProgress} />
      </SafeEnteringView>

      <SafeEnteringView entering={FadeInDown.duration(600).delay(340)}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.feedbackCallout}
          onPress={() => router.push('/(main)/hub/feedback')}
          accessibilityRole="button"
          accessibilityLabel="Send app feedback"
        >
          <View style={styles.feedbackCalloutIcon}>
            <Ionicons name="chatbox-ellipses-outline" size={18} color={autopackColors.apBlue} />
          </View>
          <View style={styles.feedbackCalloutTextWrap}>
            <Text style={styles.feedbackCalloutTitle}>Got feedback?</Text>
            <Text style={styles.feedbackCalloutBody}>
              Tell us what’s working or what we should improve.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </SafeEnteringView>
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: tabScrollPad }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.frame, frame]}>
      {hubWide ? (
        <View
          style={[
            styles.wideShell,
            {
              paddingTop: insets.top + 24,
              paddingHorizontal: contentInset,
              gap: wideCols.gap,
            },
          ]}
        >
          <View style={[styles.wideRow, { gap: wideCols.gap }]}>
            <View
              style={[
                styles.wideHeroMatch,
                { width: wideCols.hero },
                toolsHeight > 0 ? { height: toolsHeight } : null,
              ]}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setHeroBox((prev) =>
                  prev.width === width && prev.height === height ? prev : { width, height }
                );
              }}
            >
              {heroBlock}
            </View>
            <View
              style={{ width: wideCols.stack }}
              onLayout={(e) => {
                const h = Math.round(e.nativeEvent.layout.height);
                setToolsHeight((prev) => (prev === h ? prev : h));
              }}
            >
              {quickToolsBlock}
            </View>
          </View>
          <View style={[styles.wideRow, { gap: wideCols.gap }]}>
            <View style={[styles.wideHeroCol, { width: wideCols.hero }]}>
              <View style={styles.countdownInStack}>
                <HubCountdownStrip />
              </View>
              {comingUpBlock}
            </View>
            <View style={[styles.wideStack, { width: wideCols.stack }]}>{sideStackBlock}</View>
          </View>
        </View>
      ) : (
        <>
          {heroBlock}
          <HubCountdownStrip />
          <View style={[styles.body, { paddingHorizontal: contentInset }]}>
            {quickToolsBlock}
            {comingUpBlock}
            {sideStackBlock}
          </View>
        </>
      )}
      </View>

      <Modal
        visible={toolsModalVisible}
        animationType='slide'
        transparent
        onRequestClose={() => setToolsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalScrim} onPress={() => setToolsModalVisible(false)} />
          <View style={[styles.modalCard, { height: screenH * 0.9, paddingBottom: bottomInset }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Customize quick tools</Text>
                <Text style={styles.modalHint}>
                  Pick up to {MAX_QUICK_TOOLS} items. Use arrows to reorder.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setToolsModalVisible(false)}>
                <Ionicons name='close' size={24} color={ui.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={[
                styles.modalScrollContent,
                { paddingBottom: bottomInset + 32 },
              ]}
              nestedScrollEnabled
              alwaysBounceVertical
              bounces
              scrollEventThrottle={16}
              keyboardShouldPersistTaps='handled'
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.selectedList}>
                {editingToolIds.length === 0 ? (
                  <Text style={styles.mutedText}>No tools selected yet.</Text>
                ) : (
                  editingToolIds.map((id, index) => {
                    const tool = toolMap.get(id);
                    if (!tool) return null;
                    return (
                      <View key={id} style={styles.selectedRow}>
                        <View style={styles.selectedRowLeft}>
                          <Ionicons name={tool.icon} size={18} color={ui.colors.primary} />
                          <Text style={styles.selectedRowLabel}>{tool.label}</Text>
                          {tool.comingSoon ? (
                            <Text style={styles.comingSoonPill}>Soon</Text>
                          ) : null}
                        </View>
                        <View style={styles.selectedRowActions}>
                          <TouchableOpacity
                            onPress={() => moveTool(id, -1)}
                            disabled={index === 0}
                            style={[
                              styles.reorderButton,
                              index === 0 && styles.reorderButtonDisabled,
                            ]}
                          >
                            <Ionicons name='chevron-up' size={18} color={ui.colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => moveTool(id, 1)}
                            disabled={index === editingToolIds.length - 1}
                            style={[
                              styles.reorderButton,
                              index === editingToolIds.length - 1 && styles.reorderButtonDisabled,
                            ]}
                          >
                            <Ionicons name='chevron-down' size={18} color={ui.colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => toggleToolInEdit(id)}
                            style={styles.removeButton}
                          >
                            <Ionicons name='close' size={16} color='#DC2626' />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <Text style={styles.modalSubheader}>Available tools</Text>
              <View style={styles.addChipsWrap}>
                {orderedAvailableTools.map((tool) => {
                  const isSelected = editingToolIds.includes(tool.id);
                  const disabled = !isSelected && maxReached;
                  return (
                    <TouchableOpacity
                      key={tool.id}
                      style={[
                        styles.addChip,
                        isSelected && styles.addChipSelected,
                        disabled && styles.addChipDisabled,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => toggleToolInEdit(tool.id)}
                      disabled={disabled}
                    >
                      <Ionicons
                        name={tool.icon}
                        size={16}
                        color={isSelected ? '#fff' : disabled ? ui.colors.muted : ui.colors.primary}
                      />
                      <Text
                        style={[
                          styles.addChipLabel,
                          isSelected && styles.addChipLabelSelected,
                          disabled && styles.addChipLabelDisabled,
                        ]}
                      >
                        {tool.label}
                      </Text>
                      {tool.comingSoon ? (
                        <Text style={styles.chipSoon}>Soon</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {maxReached && (
                <Text style={styles.limitText}>You can pin up to {MAX_QUICK_TOOLS} tools.</Text>
              )}

              <View style={styles.modalFooterInline}>
                <TouchableOpacity style={styles.secondaryButton} onPress={resetTools}>
                  <Text style={styles.secondaryButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: '#E6F1F8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingTitle: {
    marginTop: 12,
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#E6F1F8',
  },
  scrollContent: {
    width: '100%',
    alignItems: 'center',
  },
  frame: {
    width: '100%',
  },

  wideShell: {
    width: '100%',
  },
  wideRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  wideHeroMatch: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    borderRadius: 16,
  },
  wideHeroCol: {
    gap: 12,
    flexShrink: 0,
  },
  wideStack: {
    gap: 12,
    paddingBottom: 8,
    flexShrink: 0,
  },
  comingUpFill: {
    flex: 1,
    minHeight: 0,
  },
  comingUpModuleFill: {
    flex: 1,
    minHeight: 0,
  },
  comingUpPagerFill: {
    flex: 1,
    minHeight: 0,
  },
  comingUpPagerContentFill: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  comingUpPageFill: {
    alignSelf: 'stretch',
  },
  sessionCardWrapFill: {
    flex: 1,
  },
  countdownInStack: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroWide: {
    borderRadius: 16,
  },
  quickToolsWrapWide: {
    marginTop: 0,
    marginBottom: 0,
  },

  heroTopRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: ui.colors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: ui.colors.secondary,
    overflow: 'hidden',
  },
  avatarImg: { width: 34, height: 34, borderRadius: 999 },
  avatarText: { fontWeight: '700', color: ui.colors.text },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: { position: 'absolute', top: -2, right: -2 },

  body: { paddingVertical: 16, gap: 12 },
  editLink: {
    color: autopackColors.apBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  quickToolsHeaderRow: {
    marginBottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickToolsHeaderText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  passportCard: {
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
  feedbackCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#dbeafe',
  },
  feedbackCalloutIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackCalloutTextWrap: { flex: 1, gap: 2 },
  feedbackCalloutTitle: { fontWeight: '800', color: ui.colors.text, fontSize: 15 },
  feedbackCalloutBody: { color: ui.colors.muted, fontSize: 13, lineHeight: 18 },
  quickToolsHint: {
    marginTop: 4,
    color: ui.colors.muted,
    fontSize: 12,
  },

  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  toolsCard: {
    minHeight: 84,
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

  comingUpModule: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: autopackColors.apBlue,
  },
  comingUpModuleLive: {
    borderColor: '#DC2626',
  },
  comingUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: autopackColors.apDarkBlue,
  },
  comingUpHeaderLive: {
    backgroundColor: '#B91C1C',
  },
  comingUpHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  comingUpIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingUpIconWrapLive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  comingUpEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  comingUpHeaderText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 1,
  },
  comingUpAgendaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  comingUpAgendaBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sessionCardWrap: { paddingVertical: 0 },
  nextSessionCard: {
    marginBottom: 0,
    overflow: 'hidden',
    borderWidth: 0,
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  nextSessionCardFill: {
    flex: 1,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.colors.border,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ui.colors.primary,
    lineHeight: 20,
  },
  sessionSubtitle: { marginTop: 8, color: ui.colors.muted, fontSize: 12 },
  speakerRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  speakerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: ui.colors.border,
  },
  speakerName: { fontWeight: '700', color: ui.colors.text },
  speakerRole: { color: ui.colors.muted, fontSize: 12 },
  progressWrap: {
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 20,
    gap: 8,
  },
  progressTrack: {
    width: 120,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
  },
  progressDotsRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDotBg: {
    width: 4,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  progressActiveDot: {
    width: 16,
    height: 10,
    borderRadius: 999,
    backgroundColor: ui.colors.secondary,
  },
  progressLabel: { fontSize: 12, color: ui.colors.muted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalScroll: { flex: 1, minHeight: 0 },
  modalScrollContent: { paddingBottom: 32, flexGrow: 1 },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ui.colors.text,
  },
  modalHint: { color: ui.colors.muted, fontSize: 13, marginTop: 2 },
  selectedList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: ui.colors.border,
  },
  selectedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedRowLabel: { fontWeight: '600', color: ui.colors.text },
  selectedRowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reorderButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ui.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonDisabled: { opacity: 0.35 },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    color: ui.colors.muted,
    fontSize: 11,
    overflow: 'hidden',
  },
  mutedText: { color: ui.colors.muted },
  modalSubheader: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '700',
    color: ui.colors.text,
  },
  addChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ui.colors.border,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  addChipSelected: {
    backgroundColor: ui.colors.primary,
    borderColor: ui.colors.primary,
  },
  addChipDisabled: {
    // Keep chips clearly visible when user can't add more.
    opacity: 1,
    backgroundColor: '#F1F5F9',
  },
  addChipLabel: { color: ui.colors.text, fontWeight: '600' },
  addChipLabelSelected: { color: '#fff' },
  addChipLabelDisabled: { color: ui.colors.muted },
  chipSoon: { color: ui.colors.muted, fontSize: 11 },
  limitText: { marginTop: 8, color: ui.colors.muted, fontSize: 12 },
  modalFooterInline: {
    marginTop: 14,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: ui.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  secondaryButtonText: { color: ui.colors.text, fontWeight: '700' },
});
