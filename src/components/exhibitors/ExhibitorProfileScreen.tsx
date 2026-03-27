import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { APS_ID } from '../../config/apsConfig';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { autopackColors } from '../../theme';
import { graphqlAuthClient, graphqlApiKeyClient } from '../../utils/graphqlClient';
import { resolveProfilePictureUri } from '../../utils/storageUtils';

type ExhibitorProfile = {
  id: string;
  eventId: string;
  boothNumber?: string | null;
  video?: string | null;
  videoCaption?: string | null;
  views?: number | null;
  visits?: number | null;
  likes?: number | null;
  company?: {
    id?: string | null;
    name?: string | null;
    description?: string | null;
    website?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
    logo?: string | null;
  } | null;
  promotions?: { id: string; promotion?: string | null; link?: string | null }[];
  deals?: { id: string; deal?: string | null; link?: string | null }[];
  handouts?: { id: string; handout?: string | null }[];
  photos?: { id: string; photo?: string | null; caption?: string | null }[];
};

const updateExhibitorProfile = /* GraphQL */ `
  mutation UpdateApsAppExhibitorProfile($input: UpdateApsAppExhibitorProfileInput!) {
    updateApsAppExhibitorProfile(input: $input) {
      id
      __typename
    }
  }
`;

const updateCompany = /* GraphQL */ `
  mutation UpdateAPSCompany($input: UpdateAPSCompanyInput!) {
    updateAPSCompany(input: $input) {
      id
      __typename
    }
  }
`;

const createPromotion = /* GraphQL */ `
  mutation CreateApsAppExhibitorPromotion($input: CreateApsAppExhibitorPromotionInput!) {
    createApsAppExhibitorPromotion(input: $input) {
      id
      __typename
    }
  }
`;

const deletePromotion = /* GraphQL */ `
  mutation DeleteApsAppExhibitorPromotion($input: DeleteApsAppExhibitorPromotionInput!) {
    deleteApsAppExhibitorPromotion(input: $input) {
      id
      __typename
    }
  }
`;

const createDeal = /* GraphQL */ `
  mutation CreateApsAppExhibitorDeal($input: CreateApsAppExhibitorDealInput!) {
    createApsAppExhibitorDeal(input: $input) {
      id
      __typename
    }
  }
`;

const deleteDeal = /* GraphQL */ `
  mutation DeleteApsAppExhibitorDeal($input: DeleteApsAppExhibitorDealInput!) {
    deleteApsAppExhibitorDeal(input: $input) {
      id
      __typename
    }
  }
`;

const createHandout = /* GraphQL */ `
  mutation CreateApsAppExhibitorHandout($input: CreateApsAppExhibitorHandoutInput!) {
    createApsAppExhibitorHandout(input: $input) {
      id
      __typename
    }
  }
`;

const deleteHandout = /* GraphQL */ `
  mutation DeleteApsAppExhibitorHandout($input: DeleteApsAppExhibitorHandoutInput!) {
    deleteApsAppExhibitorHandout(input: $input) {
      id
      __typename
    }
  }
`;

const createPhoto = /* GraphQL */ `
  mutation CreateApsAppExhibitorPhoto($input: CreateApsAppExhibitorPhotoInput!) {
    createApsAppExhibitorPhoto(input: $input) {
      id
      __typename
    }
  }
`;

const deletePhoto = /* GraphQL */ `
  mutation DeleteApsAppExhibitorPhoto($input: DeleteApsAppExhibitorPhotoInput!) {
    deleteApsAppExhibitorPhoto(input: $input) {
      id
      __typename
    }
  }
`;

const favoritesByFavoriteKey = /* GraphQL */ `
  query FavoritesByFavoriteKey($favoriteKey: String!, $limit: Int) {
    apsAppUserFavoriteExhibitorsByFavoriteKey(favoriteKey: $favoriteKey, limit: $limit) {
      items {
        id
        __typename
      }
      nextToken
      __typename
    }
  }
`;

const createFavoriteExhibitor = /* GraphQL */ `
  mutation CreateFavoriteExhibitor($input: CreateApsAppUserFavoriteExhibitorInput!) {
    createApsAppUserFavoriteExhibitor(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteExhibitor = /* GraphQL */ `
  mutation DeleteFavoriteExhibitor($input: DeleteApsAppUserFavoriteExhibitorInput!) {
    deleteApsAppUserFavoriteExhibitor(input: $input) {
      id
      __typename
    }
  }
`;

const getExhibitorProfileById = /* GraphQL */ `
  query GetExhibitorProfileById($id: ID!) {
    getApsAppExhibitorProfile(id: $id) {
      id
      eventId
      boothNumber
      video
      videoCaption
      views
      visits
      likes
      company {
        id
        name
        description
        website
        phone
        email
        address
        city
        state
        zip
        country
        logo
        __typename
      }
      promotions {
        items {
          id
          promotion
          link
          __typename
        }
        __typename
      }
      deals {
        items {
          id
          deal
          link
          __typename
        }
        __typename
      }
      handouts {
        items {
          id
          handout
          __typename
        }
        __typename
      }
      photos {
        items {
          id
          photo
          caption
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;

function clean(v?: string | null) {
  return (v || '').trim();
}

function normalizeUrl(raw?: string | null) {
  const value = clean(raw);
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

type PairRow = { id: string; text: string; link: string };
type SingleRow = { id: string; text: string };

function makeRowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ExhibitorProfileScreen() {
  const currentAppUser = useCurrentAppUser();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ExhibitorProfile | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [photoUris, setPhotoUris] = useState<Record<string, string | null>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteRecordId, setFavoriteRecordId] = useState<string | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [form, setForm] = useState({
    video: '',
    videoCaption: '',
    companyDescription: '',
    companyWebsite: '',
    companyPhone: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyZip: '',
    companyCountry: '',
    companyLogo: '',
    promotions: [] as PairRow[],
    deals: [] as PairRow[],
    handouts: [] as SingleRow[],
    photos: [] as PairRow[],
  });

  const exhibitorIdRaw = params.id;
  const exhibitorId = useMemo(() => {
    const first = Array.isArray(exhibitorIdRaw) ? exhibitorIdRaw[0] : exhibitorIdRaw;
    if (!first) return '';
    try {
      return decodeURIComponent(first).trim();
    } catch {
      return first.trim();
    }
  }, [exhibitorIdRaw]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!exhibitorId) {
        setError('Missing exhibitor id');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const resp = await graphqlApiKeyClient.graphql({
          query: getExhibitorProfileById,
          variables: { id: exhibitorId },
        });
        const data = resp.data as {
          getApsAppExhibitorProfile?: {
            id?: string | null;
            eventId?: string | null;
            boothNumber?: string | null;
            video?: string | null;
            videoCaption?: string | null;
            views?: number | null;
            visits?: number | null;
            likes?: number | null;
            company?: ExhibitorProfile['company'];
            promotions?: {
              items?: ({ id?: string | null; promotion?: string | null; link?: string | null } | null)[] | null;
            };
            deals?: {
              items?: ({ id?: string | null; deal?: string | null; link?: string | null } | null)[] | null;
            };
            handouts?: {
              items?: ({ id?: string | null; handout?: string | null } | null)[] | null;
            };
            photos?: {
              items?: ({ id?: string | null; photo?: string | null; caption?: string | null } | null)[] | null;
            };
          } | null;
        };

        const raw = data.getApsAppExhibitorProfile;
        if (!raw?.id) {
          if (mounted) setProfile(null);
          return;
        }

        const normalized: ExhibitorProfile = {
          id: raw.id,
          eventId: raw.eventId || '',
          boothNumber: raw.boothNumber || null,
          video: raw.video || null,
          videoCaption: raw.videoCaption || null,
          views: raw.views ?? null,
          visits: raw.visits ?? null,
          likes: raw.likes ?? null,
          company: raw.company || null,
          promotions: (raw.promotions?.items || [])
            .filter((x): x is { id?: string | null; promotion?: string | null; link?: string | null } => !!x)
            .filter((x) => !!x.id)
            .map((x) => ({ id: x.id!, promotion: x.promotion || null, link: x.link || null })),
          deals: (raw.deals?.items || [])
            .filter((x): x is { id?: string | null; deal?: string | null; link?: string | null } => !!x)
            .filter((x) => !!x.id)
            .map((x) => ({ id: x.id!, deal: x.deal || null, link: x.link || null })),
          handouts: (raw.handouts?.items || [])
            .filter((x): x is { id?: string | null; handout?: string | null } => !!x)
            .filter((x) => !!x.id)
            .map((x) => ({ id: x.id!, handout: x.handout || null })),
          photos: (raw.photos?.items || [])
            .filter((x): x is { id?: string | null; photo?: string | null; caption?: string | null } => !!x)
            .filter((x) => !!x.id)
            .map((x) => ({ id: x.id!, photo: x.photo || null, caption: x.caption || null })),
        };
        if (mounted) setProfile(normalized);
        if (mounted) setLikesCount(normalized.likes ?? 0);
        if (mounted) {
          setForm({
            video: clean(normalized.video),
            videoCaption: clean(normalized.videoCaption),
            companyDescription: clean(normalized.company?.description),
            companyWebsite: clean(normalized.company?.website),
            companyPhone: clean(normalized.company?.phone),
            companyAddress: clean(normalized.company?.address),
            companyCity: clean(normalized.company?.city),
            companyState: clean(normalized.company?.state),
            companyZip: clean(normalized.company?.zip),
            companyCountry: clean(normalized.company?.country),
            companyLogo: clean(normalized.company?.logo),
            promotions: (normalized.promotions || []).map((x) => ({
              id: makeRowId(),
              text: clean(x.promotion),
              link: clean(x.link),
            })),
            deals: (normalized.deals || []).map((x) => ({
              id: makeRowId(),
              text: clean(x.deal),
              link: clean(x.link),
            })),
            handouts: (normalized.handouts || []).map((x) => ({
              id: makeRowId(),
              text: clean(x.handout),
            })),
            photos: (normalized.photos || []).map((x) => ({
              id: makeRowId(),
              text: clean(x.photo),
              link: clean(x.caption),
            })),
          });
        }
      } catch (e: any) {
        console.error('Error loading exhibitor profile:', e);
        if (mounted) setError(e?.message || 'Failed to load exhibitor');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [exhibitorId, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadLogo() {
      const uri = await resolveProfilePictureUri(profile?.company?.logo || null);
      if (!cancelled) setLogoUri(uri);
    }
    loadLogo();
    return () => {
      cancelled = true;
    };
  }, [profile?.company?.logo]);

  useEffect(() => {
    let cancelled = false;
    const unresolved = (profile?.photos || []).filter((photo) => photo.photo && photoUris[photo.id] === undefined);
    if (!unresolved.length) return;
    async function loadPhotoUris() {
      const updates: Record<string, string | null> = {};
      await Promise.all(
        unresolved.map(async (photo) => {
          updates[photo.id] = await resolveProfilePictureUri(photo.photo);
        })
      );
      if (!cancelled && Object.keys(updates).length) {
        setPhotoUris((prev) => ({ ...prev, ...updates }));
      }
    }
    loadPhotoUris();
    return () => {
      cancelled = true;
    };
  }, [profile?.photos, photoUris]);

  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const favoriteKey =
    currentProfileId && profile?.id ? `e:${profile.eventId || APS_ID}|u:${currentProfileId}|x:${profile.id}` : '';

  useEffect(() => {
    let cancelled = false;
    async function loadFavoriteState() {
      if (!favoriteKey) {
        setIsFavorite(false);
        setFavoriteRecordId(null);
        return;
      }
      try {
        const resp = await graphqlAuthClient.graphql({
          query: favoritesByFavoriteKey,
          variables: { favoriteKey, limit: 1 },
        });
        const data = resp.data as {
          apsAppUserFavoriteExhibitorsByFavoriteKey?: {
            items?: ({ id?: string | null } | null)[] | null;
          };
        };
        const item = data.apsAppUserFavoriteExhibitorsByFavoriteKey?.items?.find((x) => !!x?.id);
        if (!cancelled) {
          setIsFavorite(!!item?.id);
          setFavoriteRecordId(item?.id || null);
        }
      } catch {
        if (!cancelled) {
          setIsFavorite(false);
          setFavoriteRecordId(null);
        }
      }
    }
    loadFavoriteState();
    return () => {
      cancelled = true;
    };
  }, [favoriteKey, reloadKey]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading exhibitor...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Couldn’t load exhibitor</Text>
        <Text style={styles.muted}>{error || 'Exhibitor not found.'}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const website = normalizeUrl(profile.company?.website);
  const isApprovedRegistrant = String(currentAppUser?.registrant?.status || '').toUpperCase() === 'APPROVED';
  const isCompanyEmployee =
    !!currentAppUser?.registrant?.companyId &&
    !!profile.company?.id &&
    currentAppUser.registrant.companyId === profile.company.id &&
    isApprovedRegistrant;
  const canEdit = isCompanyEmployee;

  async function toggleFavorite() {
    if (!profile?.id || !currentProfileId || !favoriteKey || favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      if (isFavorite && favoriteRecordId) {
        await graphqlAuthClient.graphql({
          query: deleteFavoriteExhibitor,
          variables: { input: { id: favoriteRecordId } },
        });
        const nextLikes = Math.max(0, likesCount - 1);
        setLikesCount(nextLikes);
        setIsFavorite(false);
        setFavoriteRecordId(null);
        await graphqlAuthClient.graphql({
          query: updateExhibitorProfile,
          variables: { input: { id: profile.id, likes: nextLikes } },
        });
      } else {
        const resp = await graphqlAuthClient.graphql({
          query: createFavoriteExhibitor,
          variables: {
            input: {
              userProfileId: currentProfileId,
              exhibitorId: profile.id,
              eventId: profile.eventId || APS_ID,
              favoriteKey,
            },
          },
        });
        const data = resp.data as {
          createApsAppUserFavoriteExhibitor?: { id?: string | null } | null;
        };
        const createdId = data.createApsAppUserFavoriteExhibitor?.id || null;
        const nextLikes = likesCount + 1;
        setLikesCount(nextLikes);
        setIsFavorite(true);
        setFavoriteRecordId(createdId);
        await graphqlAuthClient.graphql({
          query: updateExhibitorProfile,
          variables: { input: { id: profile.id, likes: nextLikes } },
        });
      }
    } catch (e: any) {
      Alert.alert('Unable to update favorite', e?.message || 'Please try again.');
    } finally {
      setFavoriteBusy(false);
    }
  }

  function addPairRow(field: 'promotions' | 'deals' | 'photos') {
    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], { id: makeRowId(), text: '', link: '' }],
    }));
  }

  function addSingleRow(field: 'handouts') {
    setForm((prev) => ({
      ...prev,
      [field]: [...prev[field], { id: makeRowId(), text: '' }],
    }));
  }

  function updatePairRow(
    field: 'promotions' | 'deals' | 'photos',
    rowId: string,
    patch: Partial<PairRow>
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    }));
  }

  function updateSingleRow(field: 'handouts', rowId: string, text: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].map((row) => (row.id === rowId ? { ...row, text } : row)),
    }));
  }

  function removePairRow(field: 'promotions' | 'deals' | 'photos', rowId: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((row) => row.id !== rowId),
    }));
  }

  function removeSingleRow(field: 'handouts', rowId: string) {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((row) => row.id !== rowId),
    }));
  }

  async function saveEdits() {
    if (!profile?.id || !profile.company?.id) return;
    setSaving(true);
    try {
      await graphqlAuthClient.graphql({
        query: updateExhibitorProfile,
        variables: {
          input: {
            id: profile.id,
            video: form.video || null,
            videoCaption: form.videoCaption || null,
          },
        },
      });

      await graphqlAuthClient.graphql({
        query: updateCompany,
        variables: {
          input: {
            id: profile.company.id,
            description: form.companyDescription || null,
            website: form.companyWebsite || null,
            phone: form.companyPhone || null,
            address: form.companyAddress || null,
            city: form.companyCity || null,
            state: form.companyState || null,
            zip: form.companyZip || null,
            country: form.companyCountry || null,
            logo: form.companyLogo || null,
          },
        },
      });

      await Promise.all(
        (profile.promotions || []).map((item) =>
          graphqlAuthClient.graphql({ query: deletePromotion, variables: { input: { id: item.id } } })
        )
      );
      const promotionsToCreate = form.promotions
        .map((row) => ({ text: clean(row.text), link: clean(row.link) }))
        .filter((row) => !!row.text);
      await Promise.all(
        promotionsToCreate.map((item) =>
          graphqlAuthClient.graphql({
            query: createPromotion,
            variables: {
              input: {
                exhibitorId: profile.id,
                eventId: profile.eventId,
                promotion: item.text,
                link: item.link || null,
              },
            },
          })
        )
      );

      await Promise.all(
        (profile.deals || []).map((item) =>
          graphqlAuthClient.graphql({ query: deleteDeal, variables: { input: { id: item.id } } })
        )
      );
      const dealsToCreate = form.deals
        .map((row) => ({ text: clean(row.text), link: clean(row.link) }))
        .filter((row) => !!row.text);
      await Promise.all(
        dealsToCreate.map((item) =>
          graphqlAuthClient.graphql({
            query: createDeal,
            variables: {
              input: {
                exhibitorId: profile.id,
                eventId: profile.eventId,
                deal: item.text,
                link: item.link || null,
              },
            },
          })
        )
      );

      await Promise.all(
        (profile.handouts || []).map((item) =>
          graphqlAuthClient.graphql({ query: deleteHandout, variables: { input: { id: item.id } } })
        )
      );
      const handoutsToCreate = form.handouts.map((row) => clean(row.text)).filter(Boolean);
      await Promise.all(
        handoutsToCreate.map((item) =>
          graphqlAuthClient.graphql({
            query: createHandout,
            variables: {
              input: {
                exhibitorId: profile.id,
                eventId: profile.eventId,
                handout: item,
              },
            },
          })
        )
      );

      await Promise.all(
        (profile.photos || []).map((item) =>
          graphqlAuthClient.graphql({ query: deletePhoto, variables: { input: { id: item.id } } })
        )
      );
      const photosToCreate = form.photos
        .map((row) => ({ text: clean(row.text), link: clean(row.link) }))
        .filter((row) => !!row.text);
      await Promise.all(
        photosToCreate.map((item) =>
          graphqlAuthClient.graphql({
            query: createPhoto,
            variables: {
              input: {
                exhibitorId: profile.id,
                eventId: profile.eventId,
                photo: item.text,
                caption: item.link || null,
                approved: true,
              },
            },
          })
        )
      );

      Alert.alert('Saved', 'Exhibitor profile updated.');
      setReloadKey((v) => v + 1);
    } catch (e: any) {
      console.error('Failed saving exhibitor profile changes:', e);
      Alert.alert('Update failed', e?.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.logoWrap}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoImg} resizeMode='contain' />
          ) : (
            <Text style={styles.logoFallback}>
              {clean(profile.company?.name).slice(0, 1).toUpperCase() || 'E'}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{clean(profile.company?.name) || 'Exhibitor'}</Text>
          {!!profile.boothNumber && <Text style={styles.muted}>Booth {profile.boothNumber}</Text>}
        </View>
      </View>

      {isCompanyEmployee && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.views ?? 0}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.visits ?? 0}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{likesCount}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
        </View>
      )}

      {!isCompanyEmployee && (
        <Pressable
          style={[
            styles.favoritePill,
            (!currentProfileId || favoriteBusy) && styles.favoritePillDisabled,
          ]}
          disabled={!currentProfileId || favoriteBusy}
          onPress={toggleFavorite}
        >
          <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={18} color={isFavorite ? '#f59e0b' : '#6b7280'} />
          <Text style={styles.favoritePillText}>
            {!currentProfileId
              ? 'Profile required'
              : favoriteBusy
                ? 'Updating...'
                : isFavorite
                  ? 'Favorited'
                  : 'Add to favorites'}
          </Text>
        </Pressable>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact</Text>
        {!!profile.company?.phone && (
          <Pressable onPress={() => Linking.openURL(`tel:${profile.company?.phone}`)} style={styles.linkRow}>
            <Ionicons name='call-outline' size={16} color={autopackColors.apBlue} />
            <Text style={styles.linkText}>{profile.company?.phone}</Text>
          </Pressable>
        )}
        {!!profile.company?.email && (
          <Pressable onPress={() => Linking.openURL(`mailto:${profile.company?.email}`)} style={styles.linkRow}>
            <Ionicons name='mail-outline' size={16} color={autopackColors.apBlue} />
            <Text style={styles.linkText}>{profile.company?.email}</Text>
          </Pressable>
        )}
        {!!website && (
          <Pressable onPress={() => Linking.openURL(website)} style={styles.linkRow}>
            <Ionicons name='globe-outline' size={16} color={autopackColors.apBlue} />
            <Text style={styles.linkText}>{profile.company?.website}</Text>
          </Pressable>
        )}
      </View>

      {!!profile.company?.description && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.body}>{profile.company.description}</Text>
        </View>
      )}

      {canEdit && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Edit Exhibitor + Company</Text>
          <Text style={styles.fieldLabel}>Company Description</Text>
          <TextInput
            value={form.companyDescription}
            onChangeText={(v) => setForm((p) => ({ ...p, companyDescription: v }))}
            style={[styles.input, styles.multiInput]}
            multiline
          />
          <Text style={styles.fieldLabel}>Website</Text>
          <TextInput value={form.companyWebsite} onChangeText={(v) => setForm((p) => ({ ...p, companyWebsite: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput value={form.companyPhone} onChangeText={(v) => setForm((p) => ({ ...p, companyPhone: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>Address</Text>
          <TextInput value={form.companyAddress} onChangeText={(v) => setForm((p) => ({ ...p, companyAddress: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>City</Text>
          <TextInput value={form.companyCity} onChangeText={(v) => setForm((p) => ({ ...p, companyCity: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>State</Text>
          <TextInput value={form.companyState} onChangeText={(v) => setForm((p) => ({ ...p, companyState: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>Zip</Text>
          <TextInput value={form.companyZip} onChangeText={(v) => setForm((p) => ({ ...p, companyZip: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>Country</Text>
          <TextInput value={form.companyCountry} onChangeText={(v) => setForm((p) => ({ ...p, companyCountry: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>Logo Key/URL</Text>
          <TextInput value={form.companyLogo} onChangeText={(v) => setForm((p) => ({ ...p, companyLogo: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>Video URL</Text>
          <TextInput value={form.video} onChangeText={(v) => setForm((p) => ({ ...p, video: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>Video Caption</Text>
          <TextInput value={form.videoCaption} onChangeText={(v) => setForm((p) => ({ ...p, videoCaption: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>Promotions</Text>
          {form.promotions.map((row, idx) => (
            <View key={row.id} style={styles.rowEditor}>
              <TextInput
                value={row.text}
                onChangeText={(v) => updatePairRow('promotions', row.id, { text: v })}
                placeholder={`Promotion ${idx + 1}`}
                style={[styles.input, styles.rowEditorMain]}
              />
              <TextInput
                value={row.link}
                onChangeText={(v) => updatePairRow('promotions', row.id, { link: v })}
                placeholder='Optional link'
                style={[styles.input, styles.rowEditorSecondary]}
              />
              <Pressable style={styles.rowRemoveBtn} onPress={() => removePairRow('promotions', row.id)}>
                <Ionicons name='trash-outline' size={16} color='#dc2626' />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.rowAddBtn} onPress={() => addPairRow('promotions')}>
            <Ionicons name='add' size={16} color={autopackColors.apBlue} />
            <Text style={styles.rowAddText}>Add promotion</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Deals</Text>
          {form.deals.map((row, idx) => (
            <View key={row.id} style={styles.rowEditor}>
              <TextInput
                value={row.text}
                onChangeText={(v) => updatePairRow('deals', row.id, { text: v })}
                placeholder={`Deal ${idx + 1}`}
                style={[styles.input, styles.rowEditorMain]}
              />
              <TextInput
                value={row.link}
                onChangeText={(v) => updatePairRow('deals', row.id, { link: v })}
                placeholder='Optional link'
                style={[styles.input, styles.rowEditorSecondary]}
              />
              <Pressable style={styles.rowRemoveBtn} onPress={() => removePairRow('deals', row.id)}>
                <Ionicons name='trash-outline' size={16} color='#dc2626' />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.rowAddBtn} onPress={() => addPairRow('deals')}>
            <Ionicons name='add' size={16} color={autopackColors.apBlue} />
            <Text style={styles.rowAddText}>Add deal</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Handouts</Text>
          {form.handouts.map((row, idx) => (
            <View key={row.id} style={styles.rowEditor}>
              <TextInput
                value={row.text}
                onChangeText={(v) => updateSingleRow('handouts', row.id, v)}
                placeholder={`Handout ${idx + 1}`}
                style={[styles.input, styles.rowEditorMain]}
              />
              <Pressable style={styles.rowRemoveBtn} onPress={() => removeSingleRow('handouts', row.id)}>
                <Ionicons name='trash-outline' size={16} color='#dc2626' />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.rowAddBtn} onPress={() => addSingleRow('handouts')}>
            <Ionicons name='add' size={16} color={autopackColors.apBlue} />
            <Text style={styles.rowAddText}>Add handout</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Photos</Text>
          {form.photos.map((row, idx) => (
            <View key={row.id} style={styles.rowEditor}>
              <TextInput
                value={row.text}
                onChangeText={(v) => updatePairRow('photos', row.id, { text: v })}
                placeholder={`Photo URL/S3 key ${idx + 1}`}
                style={[styles.input, styles.rowEditorMain]}
              />
              <TextInput
                value={row.link}
                onChangeText={(v) => updatePairRow('photos', row.id, { link: v })}
                placeholder='Optional caption'
                style={[styles.input, styles.rowEditorSecondary]}
              />
              <Pressable style={styles.rowRemoveBtn} onPress={() => removePairRow('photos', row.id)}>
                <Ionicons name='trash-outline' size={16} color='#dc2626' />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.rowAddBtn} onPress={() => addPairRow('photos')}>
            <Ionicons name='add' size={16} color={autopackColors.apBlue} />
            <Text style={styles.rowAddText}>Add photo</Text>
          </Pressable>
          <Pressable disabled={saving} style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveEdits}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
        </View>
      )}

      {!!profile.video && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Video</Text>
          <Pressable onPress={() => Linking.openURL(profile.video!)} style={styles.linkRow}>
            <Ionicons name='play-circle-outline' size={16} color={autopackColors.apBlue} />
            <Text style={styles.linkText}>{profile.videoCaption || profile.video}</Text>
          </Pressable>
        </View>
      )}

      {(profile.promotions || []).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Promotions</Text>
          {(profile.promotions || []).map((item) => (
            <View key={item.id} style={styles.listItem}>
              <Text style={styles.body}>{item.promotion || 'Promotion'}</Text>
              {!!item.link && (
                <Pressable onPress={() => Linking.openURL(item.link!)} style={styles.linkRow}>
                  <Ionicons name='open-outline' size={14} color={autopackColors.apBlue} />
                  <Text style={styles.linkText}>Open</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {(profile.deals || []).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deals</Text>
          {(profile.deals || []).map((item) => (
            <View key={item.id} style={styles.listItem}>
              <Text style={styles.body}>{item.deal || 'Deal'}</Text>
              {!!item.link && (
                <Pressable onPress={() => Linking.openURL(item.link!)} style={styles.linkRow}>
                  <Ionicons name='open-outline' size={14} color={autopackColors.apBlue} />
                  <Text style={styles.linkText}>Open</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {(profile.handouts || []).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Handouts</Text>
          {(profile.handouts || []).map((item) => (
            <Text key={item.id} style={styles.body}>
              • {item.handout || 'Handout'}
            </Text>
          ))}
        </View>
      )}

      {(profile.photos || []).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photos</Text>
          <View style={styles.photoGrid}>
            {(profile.photos || []).map((photo) => {
              const uri = photoUris[photo.id];
              if (!uri) return null;
              return <Image key={photo.id} source={{ uri }} style={styles.photo} />;
            })}
          </View>
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
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 56, height: 56 },
  logoFallback: { fontWeight: '900', color: '#111827', fontSize: 18 },
  name: { fontSize: 18, fontWeight: '900', color: '#111827' },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statValue: { fontWeight: '900', color: '#111827', fontSize: 16 },
  statLabel: { color: '#6b7280', fontSize: 12 },
  favoritePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  favoritePillDisabled: { opacity: 0.6 },
  favoritePillText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  infoPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  infoPillText: { color: '#374151', fontSize: 12 },

  card: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 6,
  },
  cardTitle: { fontWeight: '900', color: '#111827', marginBottom: 2 },
  body: { color: '#111827', lineHeight: 20 },
  listItem: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f3f4f6',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  linkText: { color: autopackColors.apBlue, fontWeight: '600' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 92, height: 92, borderRadius: 10, backgroundColor: '#f3f4f6' },
  fieldLabel: { marginTop: 8, color: '#374151', fontWeight: '700', fontSize: 12 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111827',
    backgroundColor: '#fff',
  },
  multiInput: { minHeight: 72, textAlignVertical: 'top' },
  rowEditor: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rowEditorMain: { flex: 1 },
  rowEditorSecondary: { flex: 1 },
  rowRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAddBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  rowAddText: { color: autopackColors.apBlue, fontWeight: '700', fontSize: 12 },
  saveBtn: {
    marginTop: 12,
    backgroundColor: autopackColors.apBlue,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '800' },

  backBtn: {
    marginTop: 10,
    backgroundColor: autopackColors.apBlue,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backText: { color: '#fff', fontWeight: '700' },
});
