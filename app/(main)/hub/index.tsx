// app/(main)/hub/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated as RNAnimated,
  Dimensions,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCurrentAppUser, useCurrentUserProfile } from '../../../src/hooks/useApsStore';
import { useEngageStore } from '../../../src/store/engageStore';
import { autopackColors } from '../../../src/theme';
import { APS_ID } from '../../../src/config/apsConfig';
import { apsAppSessionsByAgendaIdWithRelations } from '../../../src/graphql/customQueries';
import { apsAppExhibitorProfilesByCompanyId } from '../../../src/graphql/queries';
import { AppBadge } from '../../../src/ui/AppBadge';
import { IconCard } from '../../../src/ui/IconCard';
import { ui } from '../../../src/ui/tokens';
import { graphqlApiKeyClient } from '../../../src/utils/graphqlClient';
import { resolveProfilePictureUri } from '../../../src/utils/storageUtils';
import { AgendaSessionCard } from '../../../src/components/agenda/AgendaSessionCard';

type QuickTool = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  comingSoon?: boolean;
};

const MAX_QUICK_TOOLS = 6;
const QUICK_TOOLS_STORAGE_KEY = 'hub.quickTools.v1';
const WINDOW_HEIGHT = Dimensions.get('window').height;
// Default pinned quick tools (max 6)
const DEFAULT_TOOL_IDS = ['contacts', 'notes', 'requests', 'messages', 'announcements', 'favorites'];
const EXHIBITOR_DEFAULT_TOOL_IDS = ['exhibitor-profile', 'contacts', 'notes', 'requests', 'messages', 'favorites'];

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
  { id: 'passport', icon: 'book', label: 'Passport', comingSoon: true },
];

type NextSession = {
  id: string;
  title: string;
  timeLabel: string;
  location: string;
  descriptionText: string;
  speakerNames: string[];
  sponsorNames: string[];
};

const AGENDA_ID = '83afcde3-7ff3-464a-b116-69e244a39dfd';

const MOCK_NEXT_SESSIONS: NextSession[] = [
  {
    id: 's1',
    title:
      'EV Battery Safety: Lithium Battery\nTransport & Storage Regulatory\nLandscape',
    timeLabel: '9:30 AM - 10:00 AM',
    location: 'Ballroom Main Stage',
    descriptionText: '',
    speakerNames: ['Mike Pagel'],
    sponsorNames: [],
  },
  {
    id: 's2',
    title: 'Packaging Trends in 2026\nWhat’s Changing and Why',
    timeLabel: '10:15 AM - 10:45 AM',
    location: 'Track B',
    descriptionText: '',
    speakerNames: ['Taylor Nguyen'],
    sponsorNames: [],
  },
  {
    id: 's3',
    title: 'Materials & Sustainability\nPractical Steps for OEMs',
    timeLabel: '11:00 AM - 11:30 AM',
    location: 'Track A',
    descriptionText: '',
    speakerNames: ['Jordan Lee'],
    sponsorNames: [],
  },
];

function normalizeText(v?: string | null) {
  return (v || '').trim();
}

function formatTimeRange(start?: string | null, end?: string | null) {
  const s = normalizeText(start);
  const e = normalizeText(end);
  if (s && e) return `${s} - ${e}`;
  return s || '';
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
  const profile = useCurrentUserProfile();
  const currentAppUser = useCurrentAppUser();
  const companyId = currentAppUser?.registrant?.companyId || null;
  const engageBadge = useEngageStore((s) => s.getEngageBadgeCount());
  const [sessionIndex, setSessionIndex] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [nextSessions, setNextSessions] = useState<NextSession[]>(MOCK_NEXT_SESSIONS);
  const scrollX = useRef(new RNAnimated.Value(0)).current;
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(DEFAULT_TOOL_IDS);
  const [editingToolIds, setEditingToolIds] = useState<string[]>([]);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [toolsLoaded, setToolsLoaded] = useState(false);
  const [hasExhibitorProfile, setHasExhibitorProfile] = useState<boolean | null>(null);

  const [timeLeft, setTimeLeft] = useState({
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
  });

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
    // Target: 8:00 AM Eastern (New York) on Sept 30, 2026
    // 8:00 AM ET on 2026-09-30 corresponds to 12:00:00 UTC.
    const target = new Date('2026-09-30T12:00:00Z').getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: '00',
          hours: '00',
          minutes: '00',
          seconds: '00',
        });
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (60 * 60 * 24));
      const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({
        days: String(days).padStart(2, '0'),
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      });
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, []);

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
            timeLabel: time || 'TBD',
            location: location || '',
            descriptionText,
            speakerNames,
            sponsorNames,
          };
        });

        if (!cancelled && mapped.length) {
          setNextSessions(mapped);
          setSessionIndex(0);
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

  const screenW = Dimensions.get('window').width;
  const progressTranslateX = useMemo(() => {
    const trackW = 120;
    const dotW = 16;
    const maxTranslate = trackW - dotW;
    const count = nextSessions.length;
    const maxScroll = screenW * Math.max(1, count - 1);
    return scrollX.interpolate({
      inputRange: [0, maxScroll],
      outputRange: [0, maxTranslate],
      extrapolate: 'clamp',
    });
  }, [nextSessions.length, screenW, scrollX]);

  const fullName = [profile?.firstName?.trim(), profile?.lastName?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();
  const initials = `${(profile?.firstName || '').trim().slice(0, 1)}${(
    profile?.lastName || ''
  )
    .trim()
    .slice(0, 1)}`.toUpperCase();
  const countdownCompact = `${timeLeft.days}:${timeLeft.hours}:${timeLeft.minutes}:${timeLeft.seconds}`;

  // Resolve profile picture from either URL or S3 key.
  React.useEffect(() => {
    let cancelled = false;
    const loadAvatar = async () => {
      if (!profile?.profilePicture) {
        setAvatarUri(null);
        return;
      }

      const url = await resolveProfilePictureUri(profile.profilePicture);
      if (!cancelled) {
        setAvatarUri(url);
      }
    };

    loadAvatar();
    return () => {
      cancelled = true;
    };
  }, [profile?.profilePicture]);

  const heroImage = require('../../../assets/images/mobile-bg.png');
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
      router.push(tool.route);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <ImageBackground
        source={heroImage}
        style={styles.hero}
        resizeMode='cover'
      >
        <View style={styles.heroOverlay} />

        <View style={[styles.heroTopRow, { paddingTop: insets.top + 12 }]}>
          <View style={styles.heroLeft}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <ImageBackground
                  source={{ uri: avatarUri }}
                  style={styles.avatarImg}
                  imageStyle={styles.avatarImg}
                />
              ) : (
                <Text style={styles.avatarText}>{initials || 'U'}</Text>
              )}
            </View>
            <Text style={styles.greeting}>
              Hi, {fullName || 'First LastName'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(main)/engage')}
            style={styles.bellButton}
          >
            <Ionicons name='notifications-outline' size={22} color='#fff' />
            <View style={styles.bellBadge}>
              <AppBadge value={engageBadge} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>Countdown to Greenville!</Text>
        </View>
      </ImageBackground>

      {/* Countdown strip */}
      <View style={styles.countdownStrip}>
        <Text style={styles.countdownStripText}>{countdownCompact}</Text>
        <View style={styles.livePill}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Quick Tools */}
        <Animated.View
          style={styles.quickToolsWrap}
          entering={FadeInDown.duration(600).delay(150)}
        >
          <View style={styles.sectionHeaderBanner}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name='grid-outline' size={14} color='#1d4ed8' />
              </View>
              <Text style={styles.sectionHeaderText}>Quick Tools</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={openToolsModal}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toolsGrid}>
            {selectedTools.map((t, index) => (
              <View key={t.id} style={styles.toolsCell}>
                <IconCard
                  icon={t.icon}
                  label={t.label}
                  iconBgColor='transparent'
                  iconColor='#FFFFFF'
                  iconSize={20}
                  onPress={() => handleToolPress(t)}
                  style={[
                    styles.toolsCard,
                    index % 2 === 0 ? styles.toolsCardPrimary : styles.toolsCardAlt,
                  ]}
                  iconWrapStyle={styles.toolsIconWrap}
                  labelStyle={styles.toolsCardLabel}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Next Session carousel (dummy) */}
        <Animated.View entering={FadeInDown.duration(600).delay(220)}>
          <View style={[styles.sectionHeaderBanner, styles.nextSessionHeaderBanner]}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconWrap, styles.nextSessionIconWrap]}>
                <Ionicons name='calendar-outline' size={14} color='#c2410c' />
              </View>
              <Text style={styles.sectionHeaderText}>Next Session</Text>
            </View>
          </View>
          <RNAnimated.ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={RNAnimated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true },
            )}
            scrollEventThrottle={16}
            // This ScrollView lives inside a padded container (body).
            // Use negative margin to avoid double-left padding so cards align with headers.
            style={{ marginTop: 0, marginHorizontal: -20 }}
            onMomentumScrollEnd={(e) => {
              const w = e.nativeEvent.layoutMeasurement.width;
              const x = e.nativeEvent.contentOffset.x;
              const i = Math.round(x / w);
              setSessionIndex(i);
            }}
          >
            {nextSessions.map((s) => (
              <View
                key={s.id}
                style={{ width: Dimensions.get('window').width }}
              >
                <View
                  style={[styles.sessionCardWrap, { paddingHorizontal: 20 }]}
                >
                  <AgendaSessionCard
                    timeLabel={s.timeLabel}
                    title={s.title}
                    location={s.location}
                    descriptionText={s.descriptionText}
                    speakerNames={s.speakerNames}
                    sponsorNames={s.sponsorNames}
                    descriptionNumberOfLines={3}
                    metaNumberOfLines={1}
                    cardStyle={styles.nextSessionCard}
                    onPress={() =>
                      router.push({
                        pathname: '/(main)/agenda/[id]',
                        params: { id: s.id },
                      })
                    }
                  />
                </View>
              </View>
            ))}
          </RNAnimated.ScrollView>

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
        </Animated.View>
      </View>

      <Modal
        visible={toolsModalVisible}
        animationType='slide'
        transparent
        onRequestClose={() => setToolsModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setToolsModalVisible(false)}>
          <Pressable style={[styles.modalCard, { paddingBottom: bottomInset }]} onPress={() => {}}>
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
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  hero: { height: 266, width: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: autopackColors.apDarkBlue,
    opacity: 0.6,
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
  greeting: { color: '#fff', fontWeight: '700' },
  bellButton: { padding: 8 },
  bellBadge: { position: 'absolute', top: 0, right: 0 },
  heroTextWrap: { paddingHorizontal: 20, marginTop: 28 },
  heroTitle: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 46,
    textTransform: 'uppercase',
    fontFamily: 'Oswald-Bold',
    textAlign: 'center',
    maxWidth: '80%',
    flexWrap: 'wrap',
    marginHorizontal: 'auto',
    paddingTop: 2,
  },

  countdownStrip: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  countdownStripText: {
    color: ui.colors.secondary,
    fontWeight: '800',
    fontSize: 20,
  },
  livePill: {
    backgroundColor: autopackColors.apRed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  liveText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },

  body: { paddingHorizontal: 20, paddingVertical: 16 },
  sectionHeaderBanner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextSessionHeaderBanner: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextSessionIconWrap: {
    backgroundColor: '#ffedd5',
  },
  sectionHeaderText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 16,
  },
  editLink: {
    color: autopackColors.apBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  quickToolsWrap: { marginTop: 8, marginBottom: 32 },
  quickToolsHint: {
    marginTop: 4,
    color: ui.colors.muted,
    fontSize: 12,
  },

  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  toolsCell: { width: '48%' },
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
  toolsCardAlt: {
    backgroundColor: '#4b5563',
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

  sessionCardWrap: { paddingVertical: 8 },
  nextSessionCard: {
    height: 244,
    marginBottom: 0,
    overflow: 'hidden',
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
  progressWrap: { alignItems: 'center', marginTop: 12, gap: 8 },
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
  modalCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: WINDOW_HEIGHT * 0.9,
  },
  modalScroll: { maxHeight: WINDOW_HEIGHT * 0.75 },
  modalScrollContent: { paddingBottom: 32 },
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
