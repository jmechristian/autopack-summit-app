import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { APS_ID } from '../config/apsConfig';
import { useEngageStore } from '../store/engageStore';
import { useCommunityStore } from '../store/communityStore';
import { autopackColors } from '../theme';

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
  currentAppUserId?: string | null;
  favorite: boolean;
  pendingFavorite: boolean;
  // Navigation
  onPressProfile: () => void;
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

export function AppUserRow({
  profileId,
  userId,
  name,
  subtitle,
  avatarUri,
  initials,
  isSelf,
  hasNote,
  currentAppUserId,
  favorite,
  pendingFavorite,
  onPressProfile,
}: Props) {
  const toggleFavorite = useCommunityStore((s) => s.toggleFavorite);

  const pendingRequestState = useEngageStore((s) => {
    if (!userId) return null;
    if (s.incomingRequests.some((r) => r.fromUserId === userId)) return 'incoming' as const;
    if (s.sentRequests.some((r) => r.toUserId === userId)) return 'sent' as const;
    return null;
  });
  const getOrCreateContactRequest = useEngageStore((s) => s.getOrCreateContactRequest);
  const ensureDmThreadForAcceptedRequest = useEngageStore((s) => s.ensureDmThreadForAcceptedRequest);

  const showHourglass = !!pendingRequestState;

  return (
    <View style={styles.row}>
      <Pressable style={styles.rowLeft} onPress={onPressProfile}>
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
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          hitSlop={10}
          disabled={pendingFavorite || isSelf || !currentAppUserId || !profileId}
          onPress={async () => {
            if (!currentAppUserId || !profileId) return;
            if (isSelf) return;
            try {
              await toggleFavorite({ currentUserId: currentAppUserId, contactId: profileId });
            } catch {
              Alert.alert('Favorite failed', 'Could not update favorite. Please try again.');
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
          disabled={isSelf || !userId}
          onPress={async () => {
            if (isSelf || !userId) return;

            if (pendingRequestState) {
              router.push('/(main)/engage/requests');
              return;
            }

            try {
              const { status } = await getOrCreateContactRequest({
                eventId: APS_ID,
                otherUserId: userId,
              });

              if (status !== 'ACCEPTED') {
                Alert.alert('Request sent', 'You can message once they accept your request.');
                return;
              }

              const { threadId } = await ensureDmThreadForAcceptedRequest({
                eventId: APS_ID,
                otherUserId: userId,
              });

              router.push(`/(main)/engage/messages/${threadId}`);
            } catch (e: any) {
              const msg = (e?.message || '').toLowerCase();
              if (msg.includes('not accepted')) {
                Alert.alert('Waiting for acceptance', 'You can message once they accept your request.');
                return;
              }
              Alert.alert('Unable to start chat', e?.message || 'Please try again.');
            }
          }}
          style={styles.iconBtn}
        >
          <Ionicons
            name={showHourglass ? 'hourglass-outline' : 'chatbubble-outline'}
            size={20}
            color={isSelf ? '#d1d5db' : showHourglass ? '#9ca3af' : '#6b7280'}
          />
        </Pressable>

        <Pressable hitSlop={10} onPress={onPressProfile} style={styles.iconBtn}>
          <Ionicons
            name={hasNote ? 'document-text-outline' : 'eye-outline'}
            size={20}
            color={autopackColors.apBlue}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 999 },
  avatarText: { fontWeight: '800', color: '#111827' },

  textWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 13, color: '#6b7280' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  iconBtn: { padding: 6, borderRadius: 10 },
});

