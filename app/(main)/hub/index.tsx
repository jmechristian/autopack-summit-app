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
import { useCurrentUserProfile } from '../../../src/hooks/useApsStore';
import { useEngageStore } from '../../../src/store/engageStore';
import { autopackColors } from '../../../src/theme';
import { apsAppSessionsByAgendaIdWithRelations } from '../../../src/graphql/customQueries';
import { AppBadge } from '../../../src/ui/AppBadge';
import { IconCard } from '../../../src/ui/IconCard';
import { ui } from '../../../src/ui/tokens';
import { graphqlClient } from '../../../src/utils/graphqlClient';
import { getProfilePictureUrl } from '../../../src/utils/storageUtils';

type QuickTool = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  comingSoon?: boolean;
};

const MAX_QUICK_TOOLS = 6;
const QUICK_TOOLS_STORAGE_KEY = 'hub.quickTools.v1';

const ALL_QUICK_TOOLS: QuickTool[] = [
  { id: 'contacts', icon: 'person', label: 'Contacts', route: '/(main)/hub/contacts' },
  { id: 'notes', icon: 'document-text', label: 'Notes', route: '/(main)/hub/notes' },
  { id: 'leads', icon: 'briefcase', label: 'Leads', route: '/(main)/hub/leads' },
  { id: 'requests', icon: 'git-pull-request', label: 'Requests', route: '/(main)/hub/requests' },
  { id: 'messages', icon: 'chatbubbles', label: 'Messages', route: '/(main)/hub/messages' },
  { id: 'announcements', icon: 'megaphone', label: 'Announcements', route: '/(main)/hub/announcements' },
  { id: 'qr', icon: 'qr-code', label: 'My QR Code', route: '/(main)/hub/qr' },
  { id: 'lead-capture', icon: 'scan', label: 'Capture Contact', route: '/(main)/hub/capture' },
  { id: 'leaderboard', icon: 'trophy', label: 'Leaderboard', comingSoon: true },
  { id: 'favorites', icon: 'star', label: 'Favorites', route: '/(main)/community' },
  { id: 'exhibitors', icon: 'business', label: 'Exhibitors', route: '/(main)/community' },
  { id: 'sponsors', icon: 'ribbon', label: 'Sponsors', comingSoon: true },
  { id: 'speakers', icon: 'mic', label: 'Speakers', route: '/(main)/community' },
  { id: 'passport', icon: 'book', label: 'Passport', comingSoon: true },
];

type NextSession = {
  id: string;
  title: string;
  subtitle: string;
  speakerName: string;
  speakerRole: string;
};

const AGENDA_ID = '83afcde3-7ff3-464a-b116-69e244a39dfd';

const MOCK_NEXT_SESSIONS: NextSession[] = [
  {
    id: 's1',
    title:
      'EV Battery Safety: Lithium Battery\nTransport & Storage Regulatory\nLandscape',
    subtitle: 'Ballroom Main Stage - 09:30 AM - 10:00 AM',
    speakerName: 'Mike Pagel',
    speakerRole: 'Senior Consultant HazMat Safety, HazMat Safety Consulting',
  },
  {
    id: 's2',
    title: 'Packaging Trends in 2026\nWhat’s Changing and Why',
    subtitle: 'Track B - 10:15 AM - 10:45 AM',
    speakerName: 'Taylor Nguyen',
    speakerRole: 'Director of Packaging Innovation',
  },
  {
    id: 's3',
    title: 'Materials & Sustainability\nPractical Steps for OEMs',
    subtitle: 'Track A - 11:00 AM - 11:30 AM',
    speakerName: 'Jordan Lee',
    speakerRole: 'Sustainability Lead',
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

export default function HubScreen() {
  const insets = useSafeAreaInsets();
  const profile = useCurrentUserProfile();
  const engageBadge = useEngageStore((s) => s.getEngageBadgeCount());
  const [sessionIndex, setSessionIndex] = useState(0);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [nextSessions, setNextSessions] = useState<NextSession[]>(MOCK_NEXT_SESSIONS);
  const scrollX = useRef(new RNAnimated.Value(0)).current;
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([
    'contacts',
    'notes',
    'leads',
    'requests',
    'messages',
    'announcements',
  ]);
  const [editingToolIds, setEditingToolIds] = useState<string[]>([]);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [toolsLoaded, setToolsLoaded] = useState(false);

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
            if (deduped.length) {
              setSelectedToolIds(deduped);
            }
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
          const resp = await graphqlClient.graphql({
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
          const subtitle = [location, time].filter(Boolean).join(' - ');

          const firstJoin = it?.speakers?.items?.find((x: any) => x?.aPSSpeaker)?.aPSSpeaker;
          const speakerName = `${normalizeText(firstJoin?.firstName)} ${normalizeText(
            firstJoin?.lastName,
          )}`.trim();
          const speakerRole = [
            normalizeText(firstJoin?.title),
            normalizeText(firstJoin?.company),
          ]
            .filter(Boolean)
            .join(', ');

          return {
            id: it.id,
            title,
            subtitle: subtitle || ' ',
            speakerName: speakerName || ' ',
            speakerRole: speakerRole || ' ',
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

  // Generate fresh signed URL from S3 key
  React.useEffect(() => {
    const loadAvatar = async () => {
      if (!profile?.profilePicture) {
        setAvatarUri(null);
        return;
      }

      const storedValue = profile.profilePicture;

      // If it's already a full URL (legacy data), use it directly
      if (
        storedValue.startsWith('http://') ||
        storedValue.startsWith('https://')
      ) {
        setAvatarUri(storedValue);
        return;
      }

      // Otherwise, it's an S3 key - generate a fresh signed URL
      try {
        const url = await getProfilePictureUrl(storedValue);
        setAvatarUri(url);
      } catch (error) {
        console.error('Error loading avatar URL:', error);
        setAvatarUri(null);
      }
    };

    loadAvatar();
  }, [profile?.profilePicture]);

  const heroImage = require('../../../assets/images/hub-back.png');
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

  const handleToolPress = (tool: QuickTool) => {
    if (tool.route) {
      router.push(tool.route);
      return;
    }
    Alert.alert('Coming soon', 'This tool is on the way.');
  };

  const openToolsModal = () => {
    setEditingToolIds(selectedToolIds);
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
    const defaults = ['contacts', 'notes', 'leads', 'requests', 'messages', 'announcements'];
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
          <Text style={styles.heroTitle}>Welcome to{'\n'}Greenville!</Text>
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Quick Tools</Text>
            <TouchableOpacity activeOpacity={0.85} onPress={openToolsModal}>
              <Ionicons name='settings-outline' size={22} color={ui.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.toolsGrid}>
            {selectedTools.map((t) => (
              <View key={t.id} style={styles.toolsCell}>
                <IconCard
                  icon={t.icon}
                  label={t.label}
                  iconBgColor='transparent'
                  iconColor={ui.colors.primary}
                  iconSize={50}
                  onPress={() => handleToolPress(t)}
                  style={styles.toolsCard}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Next Session carousel (dummy) */}
        <Animated.View entering={FadeInDown.duration(600).delay(220)}>
          <Text style={styles.sectionHeader}>Next Session</Text>
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
            style={{ marginTop: ui.space.sm, marginHorizontal: -20 }}
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
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      router.push({
                        pathname: '/(main)/agenda/[id]',
                        params: { id: s.id },
                      })
                    }
                    style={styles.sessionCard}
                  >
                    <Text style={styles.sessionTitle}>{s.title}</Text>
                    <Text style={styles.sessionSubtitle}>{s.subtitle}</Text>

                    <View style={styles.speakerRow}>
                      <View style={styles.speakerAvatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.speakerName}>{s.speakerName}</Text>
                        <Text style={styles.speakerRole}>{s.speakerRole}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
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
                {ALL_QUICK_TOOLS.map((tool) => {
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
                        color={isSelected ? '#fff' : ui.colors.primary}
                      />
                      <Text
                        style={[
                          styles.addChipLabel,
                          isSelected && styles.addChipLabelSelected,
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
    backgroundColor: '#E6F1F8',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  hero: { height: 260, width: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: autopackColors.apDarkBlue,
    opacity: 0.75,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: ui.colors.text,
  },
  quickToolsWrap: { marginTop: 8 },
  quickToolsHint: {
    marginTop: 4,
    color: ui.colors.muted,
    fontSize: 12,
  },

  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  toolsCell: { width: '48%' },
  toolsCard: { alignItems: 'center', minHeight: 132 },

  sessionCardWrap: { paddingVertical: 8 },
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
    maxHeight: '90%',
  },
  modalScroll: { maxHeight: '80%' },
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
  addChipDisabled: { opacity: 0.4 },
  addChipLabel: { color: ui.colors.text, fontWeight: '600' },
  addChipLabelSelected: { color: '#fff' },
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
