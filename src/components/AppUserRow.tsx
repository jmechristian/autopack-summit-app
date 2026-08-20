import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { APS_ID } from '../config/apsConfig';
import { useEngageStore } from '../store/engageStore';
import { useCommunityStore } from '../store/communityStore';
import { autopackColors } from '../theme';
import { confirmAction, showAlert } from '../utils/alert';
import { isWeb } from '../utils/platform';
import { RequestIntroModal } from './requests/RequestIntroModal';

/** Fixed row height for SectionList getItemLayout / sticky-header stability. */
export const APP_USER_ROW_HEIGHT = 64;

type Props = {
  profileId: string;
  userId: string; // Cognito sub
  name: string;
  subtitle?: string;
  avatarUri?: string | null;
  initials?: string;
  isSelf: boolean;
  hasNote: boolean;
  // Contact (favorite/contact-list) state
  currentAppUserProfileId?: string | null;
  favorite: boolean;
  pendingFavorite: boolean;
  /** When true, chat opens a DM instead of the contact-request gate. */
  isAcceptedContact?: boolean;
  /** Base path for DM threads (keep chat in the current tab stack for back navigation). */
  threadBasePath?: string;
  /**
   * When provided (e.g. community list), skip per-row engage-store scans.
   * Pass null for "no pending request".
   */
  contactRequestState?: 'incoming' | 'sent' | null;
  // Navigation
  onPressProfile: (profileId: string) => void;
  style?: StyleProp<ViewStyle>;
};

function safeInitials(name: string) {
  const parts = (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts[1]?.[0] || parts[0]?.[1] || '';
  return (a + b).toUpperCase() || '??';
}

function AppUserRowComponent({
  profileId,
  userId,
  name,
  subtitle,
  avatarUri,
  initials,
  isSelf,
  hasNote,
  currentAppUserProfileId,
  favorite,
  pendingFavorite,
  isAcceptedContact = false,
  threadBasePath = '/(main)/engage/messages',
  contactRequestState: contactRequestStateProp,
  onPressProfile,
  style,
}: Props) {
  const [introModalVisible, setIntroModalVisible] = useState(false);
  const [sendingIntroRequest, setSendingIntroRequest] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const toggleFavorite = useCommunityStore((s) => s.toggleFavorite);

  const storePendingRequestState = useEngageStore((s) => {
    // Parent already computed request state (community list) — avoid N× array scans.
    if (contactRequestStateProp !== undefined) return null;
    if (!userId) return null;
    if (s.incomingRequests.some((r) => r.fromUserId === userId)) return 'incoming' as const;
    if (s.sentRequests.some((r) => r.toUserId === userId)) return 'sent' as const;
    return null;
  });
  const pendingRequestState =
    contactRequestStateProp !== undefined ? contactRequestStateProp : storePendingRequestState;
  const getOrCreateContactRequest = useEngageStore((s) => s.getOrCreateContactRequest);
  const cancelSentContactRequest = useEngageStore((s) => s.cancelSentContactRequest);
  const ensureDmThreadForAcceptedRequest = useEngageStore((s) => s.ensureDmThreadForAcceptedRequest);

  const showHourglass = !!pendingRequestState && !isAcceptedContact;

  const openThread = (threadId: string) => {
    router.push(`${threadBasePath}/${threadId}` as any);
  };

  const openAcceptedChat = async () => {
    if (openingChat) return;
    setOpeningChat(true);
    try {
      const { threadId } = await ensureDmThreadForAcceptedRequest({
        eventId: APS_ID,
        otherUserId: userId,
      });
      openThread(threadId);
    } catch (e: any) {
      showAlert('Unable to start chat', e?.message || 'Please try again.');
    } finally {
      setOpeningChat(false);
    }
  };

  const startRequestWithIntro = () => {
    // Intro modal already confirms the send. Native Alert.alert buttons are a
    // no-op on web, so skip the extra prompt there.
    if (isWeb) {
      setIntroModalVisible(true);
      return;
    }
    confirmAction({
      title: 'Send contact request?',
      message: `This will send a contact request to ${name}.`,
      confirmText: 'Continue',
      onConfirm: () => setIntroModalVisible(true),
    });
  };

  return (
    <View style={[styles.row, style]}>
      <Pressable style={styles.rowLeft} onPress={() => onPressProfile(profileId)}>
        <View style={styles.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImg} resizeMode='cover' />
          ) : (
            <Text style={styles.avatarText}>{initials || safeInitials(name)}</Text>
          )}
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle || ' '}
          </Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          hitSlop={10}
          disabled={pendingFavorite || isSelf || !currentAppUserProfileId || !profileId}
          onPress={async () => {
            if (!currentAppUserProfileId || !profileId) return;
            if (isSelf) return;
            try {
              await toggleFavorite({
                currentUserProfileId: currentAppUserProfileId,
                contactId: profileId,
              });
            } catch {
              showAlert('Favorite failed', 'Could not update favorite. Please try again.');
            }
          }}
          style={styles.iconBtn}
        >
          <Ionicons
            name={favorite ? 'star' : 'star-outline'}
            size={20}
            color={
              isSelf
                ? '#d1d5db'
                : favorite
                  ? autopackColors.apYellow
                  : pendingFavorite
                    ? '#9ca3af'
                    : '#6b7280'
            }
          />
        </Pressable>

        <Pressable
          hitSlop={10}
          disabled={isSelf || !userId || openingChat}
          onPress={async () => {
            if (isSelf || !userId) return;

            // Already connected (e.g. Contacts list) — skip the request gate and open DM.
            if (isAcceptedContact) {
              await openAcceptedChat();
              return;
            }

            if (pendingRequestState) {
              if (pendingRequestState === 'sent') {
                confirmAction({
                  title: 'Cancel request?',
                  message: 'Are you sure you want to cancel this request?',
                  confirmText: 'Yes, cancel',
                  cancelText: 'No',
                  destructive: true,
                  onConfirm: async () => {
                    try {
                      await cancelSentContactRequest({
                        eventId: APS_ID,
                        otherUserId: userId,
                      });
                      showAlert('Request canceled', 'Your request has been canceled.');
                    } catch (e: any) {
                      showAlert(
                        'Cancel failed',
                        e?.message || 'Unable to cancel request. Please try again.'
                      );
                    }
                  },
                });
                return;
              }
              router.push('/(main)/engage/requests');
              return;
            }

            startRequestWithIntro();
          }}
          style={styles.iconBtn}
        >
          <Ionicons
            name={showHourglass ? 'hourglass-outline' : 'chatbubble-outline'}
            size={20}
            color={
              isSelf ? '#d1d5db' : showHourglass || openingChat ? '#9ca3af' : '#6b7280'
            }
          />
        </Pressable>

        <Pressable hitSlop={10} onPress={() => onPressProfile(profileId)} style={styles.iconBtn}>
          <Ionicons
            name={hasNote ? 'document-text-outline' : 'eye-outline'}
            size={20}
            color={autopackColors.apBlue}
          />
        </Pressable>
      </View>
      <RequestIntroModal
        visible={introModalVisible}
        recipientName={name}
        loading={sendingIntroRequest}
        onCancel={() => setIntroModalVisible(false)}
        onSubmit={async (introMessage) => {
          setSendingIntroRequest(true);
          try {
            const { status } = await getOrCreateContactRequest({
              eventId: APS_ID,
              otherUserId: userId,
              introMessage,
            });
            setIntroModalVisible(false);
            if (status !== 'ACCEPTED') {
              showAlert('Request sent', `You sent a contact request and message to ${name}.`);
              return;
            }
            const { threadId } = await ensureDmThreadForAcceptedRequest({
              eventId: APS_ID,
              otherUserId: userId,
            });
            openThread(threadId);
          } catch (e: any) {
            const msg = (e?.message || '').toLowerCase();
            if (msg.includes('not accepted')) {
              showAlert('Waiting for acceptance', 'You can message once they accept your request.');
              return;
            }
            showAlert('Unable to start chat', e?.message || 'Please try again.');
          } finally {
            setSendingIntroRequest(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: APP_USER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 999 },
  avatarText: { fontWeight: '800', color: '#111827' },

  textWrap: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 13, color: '#6b7280', height: 16 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  iconBtn: { padding: 6, borderRadius: 10 },
});

export const AppUserRow = memo(AppUserRowComponent);

