import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { APS_ID } from '../../config/apsConfig';
import { apsAppUserFavoriteSponsorsByFavoriteKey } from '../../graphql/queries';
import { apsAppExhibitorProfilesByCompanyId } from '../../graphql/queries';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { autopackColors } from '../../theme';
import { graphqlApiKeyClient, graphqlAuthClient } from '../../utils/graphqlClient';
import { resolveProfilePictureUri } from '../../utils/storageUtils';

const getSponsorById = /* GraphQL */ `
  query GetSponsorById($id: ID!) {
    getApsSponsor(id: $id) {
      id
      type
      eventId
      company {
        id
        name
        description
        website
        phone
        address
        city
        state
        zip
        country
        logo
        __typename
      }
      profile {
        id
        boothNumber
        video
        videoCaption
        views
        visits
        likes
        __typename
      }
      __typename
    }
  }
`;

const createFavoriteSponsor = /* GraphQL */ `
  mutation CreateFavoriteSponsor($input: CreateApsAppUserFavoriteSponsorInput!) {
    createApsAppUserFavoriteSponsor(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteSponsor = /* GraphQL */ `
  mutation DeleteFavoriteSponsor($input: DeleteApsAppUserFavoriteSponsorInput!) {
    deleteApsAppUserFavoriteSponsor(input: $input) {
      id
      __typename
    }
  }
`;

function clean(v?: unknown) {
  if (!v) return '';
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).join(', ');
  }
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

export default function SponsorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentAppUser = useCurrentAppUser();
  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sponsor, setSponsor] = useState<any | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const [favoriteRecordId, setFavoriteRecordId] = useState<string | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [boothNumber, setBoothNumber] = useState<string | null>(null);

  const favoriteKey = useMemo(() => {
    if (!currentProfileId || !id) return '';
    return `so:${APS_ID}|u:${currentProfileId}|x:${id}`;
  }, [currentProfileId, id]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setError('Missing sponsor id');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp = await graphqlApiKeyClient.graphql({
          query: getSponsorById,
          variables: { id },
        });
        const data = resp.data as any;
        const it = data?.getApsSponsor;
        if (!it?.id) throw new Error('Sponsor not found');
        if (!cancelled) setSponsor(it);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load sponsor');
          setSponsor(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function loadBoothNumberFromExhibitorProfile() {
      if (!sponsor) {
        setBoothNumber(null);
        return;
      }
      const sponsorType = sponsor?.type;
      const companyId = sponsor?.company?.id;
      if (sponsorType !== 'BOOTH' || !companyId) {
        setBoothNumber(null);
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
        const data = resp.data as any;
        const first = data?.apsAppExhibitorProfilesByCompanyId?.items?.find((x: any) => !!x?.id);
        if (!cancelled) setBoothNumber(first?.boothNumber || null);
      } catch {
        if (!cancelled) setBoothNumber(null);
      }
    }

    loadBoothNumberFromExhibitorProfile();
    return () => {
      cancelled = true;
    };
  }, [sponsor]);

  useEffect(() => {
    let cancelled = false;
    async function loadLogo() {
      const key = sponsor?.company?.logo || null;
      if (!key) {
        setLogoUri(null);
        return;
      }
      const uri = await resolveProfilePictureUri(key);
      if (!cancelled) setLogoUri(uri);
    }
    if (sponsor) loadLogo();
    return () => {
      cancelled = true;
    };
  }, [sponsor]);

  useEffect(() => {
    let cancelled = false;
    async function loadFavorite() {
      if (!favoriteKey) {
        setFavoriteRecordId(null);
        return;
      }
      try {
        const resp = await graphqlAuthClient.graphql({
          query: apsAppUserFavoriteSponsorsByFavoriteKey,
          variables: { favoriteKey, limit: 1 },
        });
        const data = resp.data as any;
        const item = data?.apsAppUserFavoriteSponsorsByFavoriteKey?.items?.find((x: any) => !!x?.id);
        if (!cancelled) setFavoriteRecordId(item?.id || null);
      } catch {
        if (!cancelled) setFavoriteRecordId(null);
      }
    }
    loadFavorite();
    return () => {
      cancelled = true;
    };
  }, [favoriteKey]);

  async function toggleFavorite() {
    if (!id || !currentProfileId || favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      if (favoriteRecordId) {
        await graphqlAuthClient.graphql({
          query: deleteFavoriteSponsor,
          variables: { input: { id: favoriteRecordId } },
        });
        setFavoriteRecordId(null);
      } else {
        const resp = await graphqlAuthClient.graphql({
          query: createFavoriteSponsor,
          variables: {
            input: {
              userProfileId: currentProfileId,
              sponsorId: id,
              eventId: APS_ID,
              favoriteKey,
            },
          },
        });
        const data = resp.data as any;
        setFavoriteRecordId(data?.createApsAppUserFavoriteSponsor?.id || null);
      }
    } finally {
      setFavoriteBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading sponsor...</Text>
      </View>
    );
  }

  if (error || !sponsor) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load sponsor</Text>
        <Text style={styles.muted}>{error || 'Sponsor not found.'}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const companyName = clean(sponsor?.company?.name) || 'Sponsor';
  const companyType = clean(sponsor?.type);
  const website = clean(sponsor?.company?.website);
  const phone = clean(sponsor?.company?.phone);
  const location = [clean(sponsor?.company?.city), clean(sponsor?.company?.state), clean(sponsor?.company?.country)]
    .filter(Boolean)
    .join(', ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.logoWrap}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode='contain' />
          ) : (
            <Text style={styles.logoFallback}>{companyName.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{companyName}</Text>
          {companyType === 'BOOTH' ? (
            !!boothNumber && <Text style={styles.muted}>{`Booth ${boothNumber}`}</Text>
          ) : (
            !!companyType && <Text style={styles.muted}>{companyType}</Text>
          )}
        </View>
        <Pressable style={styles.favoriteBtn} disabled={!currentProfileId || favoriteBusy} onPress={toggleFavorite}>
          <Ionicons name={favoriteRecordId ? 'star' : 'star-outline'} size={20} color={favoriteRecordId ? '#f59e0b' : '#6b7280'} />
        </Pressable>
      </View>

      {!!clean(sponsor?.company?.description) && (
        <>
          <Text style={styles.sectionTitle}>About</Text>
          <RenderHtml contentWidth={1} source={{ html: clean(sponsor?.company?.description) }} baseStyle={styles.body} />
        </>
      )}

      {(!!phone || !!website || !!location) && (
        <>
          <Text style={styles.sectionTitle}>Contact</Text>
          {!!phone && <Text style={styles.body}>{phone}</Text>}
          {!!website && <Text style={[styles.body, styles.linkText]}>{website}</Text>}
          {!!location && <Text style={styles.body}>{location}</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  title: { fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center' },
  muted: { color: '#6b7280' },
  body: { color: '#111827', lineHeight: 22 },
  linkText: { color: autopackColors.apBlue, fontWeight: '700' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  logoWrap: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: 56, height: 56 },
  logoFallback: { fontWeight: '900', color: '#111827', fontSize: 18 },
  headerText: { flex: 1, gap: 3 },
  name: { fontSize: 18, fontWeight: '900', color: '#111827' },
  favoriteBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  sectionTitle: { fontWeight: '900', color: '#111827', marginTop: 6, fontSize: 14 },
  backBtn: { marginTop: 10, backgroundColor: autopackColors.apBlue, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  backText: { color: '#fff', fontWeight: '700' },
});

