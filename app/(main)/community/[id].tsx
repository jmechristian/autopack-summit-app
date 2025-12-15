import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { autopackColors } from '../../../src/theme';
import { getCommunityProfileByUserId } from '../../../src/graphql/customQueries';
import { graphqlClient } from '../../../src/utils/graphqlClient';
import { useCommunityStore } from '../../../src/store/communityStore';
import { useCurrentAppUser } from '../../../src/hooks/useApsStore';

type Profile = {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  profilePicture?: string | null;
  bio?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  website?: string | null;
  location?: string | null;
  resume?: string | null;
  affiliates?: { items?: Array<any> | null } | null;
  education?: { items?: Array<any> | null } | null;
  interests?: { items?: Array<any> | null } | null;
};

function nameOf(p: Profile | null) {
  if (!p) return '';
  return [p.firstName?.trim(), p.lastName?.trim()].filter(Boolean).join(' ');
}

export default function CommunityProfileScreen() {
  const currentAppUser = useCurrentAppUser();
  const params = useLocalSearchParams<{ id?: string }>();
  const userId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const toggleFavorite = useCommunityStore((s) => s.toggleFavorite);
  const favoriteContactIds = useCommunityStore((s) => s.favoriteContactIds);
  const pendingContactIds = useCommunityStore((s) => s.pendingContactIds);
  const loadFavorites = useCommunityStore((s) => s.loadFavorites);

  useEffect(() => {
    if (currentAppUser?.id) {
      loadFavorites(currentAppUser.id);
    }
  }, [currentAppUser?.id, loadFavorites]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!userId) {
        setError('Missing user id');
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);
      try {
        const resp = await graphqlClient.graphql({
          query: getCommunityProfileByUserId,
          variables: { userId },
        });

        const data = resp.data as {
          apsAppUserProfilesByUserId?: {
            items?: Array<Profile | null>;
          };
        };

        const p = data.apsAppUserProfilesByUserId?.items?.find(Boolean) || null;
        if (mounted) setProfile(p as Profile | null);
      } catch (e: any) {
        console.error('Error loading community profile:', e);
        if (mounted) setError(e?.message || 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const displayName = useMemo(() => nameOf(profile) || 'Profile', [profile]);
  const contactId = profile?.id;
  const fav = !!(contactId && favoriteContactIds[contactId]);
  const pending = !!(contactId && pendingContactIds[contactId]);
  const isSelf = !!contactId && !!currentAppUser?.profileId && currentAppUser.profileId === contactId;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load profile</Text>
        <Text style={styles.muted}>{error || 'Profile not found.'}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const interests =
    (profile.interests?.items || [])
      .filter(Boolean)
      .map((i: any) => i.interest)
      .filter(Boolean) || [];

  const affiliates =
    (profile.affiliates?.items || [])
      .filter(Boolean)
      .map((a: any) => [a.affiliate, a.role].filter(Boolean).join(' — '))
      .filter(Boolean) || [];

  const education =
    (profile.education?.items || [])
      .filter(Boolean)
      .map((e: any) => [e.school, e.degree, e.fieldOfStudy].filter(Boolean).join(' • '))
      .filter(Boolean) || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          {profile.profilePicture ? (
            <Image source={{ uri: profile.profilePicture }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {(profile.firstName || '').trim().slice(0, 1).toUpperCase()}
              {(profile.lastName || '').trim().slice(0, 1).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{displayName}</Text>
          {!!profile.jobTitle && <Text style={styles.muted}>{profile.jobTitle}</Text>}
          {!!profile.company && <Text style={styles.muted}>{profile.company}</Text>}
          {!!profile.location && <Text style={styles.muted}>{profile.location}</Text>}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            hitSlop={10}
            disabled={!currentAppUser?.id || !contactId || pending || isSelf}
            onPress={async () => {
              if (!currentAppUser?.id || !contactId) return;
              if (isSelf) return;
              try {
                await toggleFavorite({ currentUserId: currentAppUser.id, contactId });
              } catch {
                // keep it lightweight; store will re-sync on failure
              }
            }}
            style={styles.iconBtn}
          >
            <Ionicons
              name={fav ? 'star' : 'star-outline'}
              size={22}
              color={
                isSelf ? '#d1d5db' : fav ? autopackColors.apYellow : pending ? '#9ca3af' : '#6b7280'
              }
            />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => {}} style={styles.iconBtn}>
            <Ionicons name='chatbubble-outline' size={22} color='#6b7280' />
          </Pressable>
        </View>
      </View>

      {!!profile.bio && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bio</Text>
          <Text style={styles.body}>{profile.bio}</Text>
        </View>
      )}

      {interests.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Interests</Text>
          <View style={styles.chips}>
            {interests.map((t: string) => (
              <View key={t} style={styles.chip}>
                <Text style={styles.chipText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {affiliates.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Affiliates</Text>
          {affiliates.map((t: string) => (
            <Text key={t} style={styles.body}>
              • {t}
            </Text>
          ))}
        </View>
      )}

      {education.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Education</Text>
          {education.map((t: string) => (
            <Text key={t} style={styles.body}>
              • {t}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  muted: { color: '#6b7280' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f9fafb',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 56, height: 56, borderRadius: 999 },
  avatarText: { fontWeight: '900', color: '#111827', fontSize: 18 },
  name: { fontSize: 18, fontWeight: '900', color: '#111827' },

  headerActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 6, borderRadius: 10 },

  card: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  cardTitle: { fontWeight: '900', color: '#111827', marginBottom: 6 },
  body: { color: '#111827', lineHeight: 20 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { color: '#111827', fontWeight: '600' },

  backBtn: {
    marginTop: 10,
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backText: { color: '#fff', fontWeight: '700' },
});


