import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { APS_ID } from '../../config/apsConfig';
import { useCurrentAppUser } from '../../hooks/useApsStore';
import { autopackColors } from '../../theme';
import { graphqlAuthClient, graphqlApiKeyClient } from '../../utils/graphqlClient';
import {
  resolveProfilePictureUri,
  uploadExhibitorAsset,
} from '../../utils/storageUtils';
import { isAllowedVideoUrl, parseVideoEmbed } from '../../utils/videoEmbed';
import { RiveLoader } from '../RiveLoader';
import { ExhibitorVideoEmbed } from './ExhibitorVideoEmbed';
import { PhotoGalleryModal } from './PhotoGalleryModal';

const MAX_HANDOUTS = 1;
const MAX_PHOTOS = 12;

type ExhibitorProfile = {
  id: string;
  eventId: string;
  boothNumber?: string | null;
  video?: string | null;
  videoCaption?: string | null;
  views?: number | null;
  visits?: number | null;
  likes?: number | null;
  qrCode?: string | null;
  passportQrPayload?: string | null;
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

const viewsByViewKey = /* GraphQL */ `
  query ViewsByViewKey($viewKey: String!, $limit: Int) {
    apsAppUserExhibitorViewsByViewKey(viewKey: $viewKey, limit: $limit) {
      items {
        id
        __typename
      }
      nextToken
      __typename
    }
  }
`;

const createExhibitorView = /* GraphQL */ `
  mutation CreateExhibitorView($input: CreateApsAppUserExhibitorViewInput!) {
    createApsAppUserExhibitorView(input: $input) {
      id
      __typename
    }
  }
`;

function isDuplicateGraphError(error: unknown) {
  const message = String((error as any)?.errors?.[0]?.message || (error as any)?.message || '');
  return /conditional|already exists|duplicate/i.test(message);
}

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
      qrCode
      passportQrPayload
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
  const [viewsCount, setViewsCount] = useState(0);
  const [qrPreviewVisible, setQrPreviewVisible] = useState(false);
  const [gallery, setGallery] = useState<{ uris: string[]; index: number } | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHandout, setUploadingHandout] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [formLogoPreview, setFormLogoPreview] = useState<string | null>(null);
  const [formPhotoPreviews, setFormPhotoPreviews] = useState<Record<string, string | null>>({});
  const [handoutUrlDraft, setHandoutUrlDraft] = useState('');
  const [acceptedPromotionIds, setAcceptedPromotionIds] = useState<Record<string, true>>({});
  const companyEmailInputRef = useRef<TextInput>(null);
  const [form, setForm] = useState({
    video: '',
    videoCaption: '',
    companyDescription: '',
    companyWebsite: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyZip: '',
    companyCountry: '',
    companyLogo: '',
    promotions: [] as PairRow[],
    handouts: [] as SingleRow[],
    photos: [] as SingleRow[],
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
            qrCode?: string | null;
            passportQrPayload?: string | null;
            company?: ExhibitorProfile['company'];
            promotions?: {
              items?: ({ id?: string | null; promotion?: string | null; link?: string | null } | null)[] | null;
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
          qrCode: raw.qrCode || null,
          passportQrPayload: raw.passportQrPayload || null,
          company: raw.company || null,
          promotions: (raw.promotions?.items || [])
            .filter((x): x is { id?: string | null; promotion?: string | null; link?: string | null } => !!x)
            .filter((x) => !!x.id)
            .map((x) => ({ id: x.id!, promotion: x.promotion || null, link: x.link || null })),
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
        if (mounted) setViewsCount(normalized.views ?? 0);
        if (mounted) {
          setForm({
            video: clean(normalized.video),
            videoCaption: clean(normalized.videoCaption),
            companyDescription: clean(normalized.company?.description),
            companyWebsite: clean(normalized.company?.website),
            companyEmail: clean(normalized.company?.email),
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
            handouts: (normalized.handouts || [])
              .map((x) => ({
                id: makeRowId(),
                text: clean(x.handout),
              }))
              .slice(0, MAX_HANDOUTS),
            photos: (normalized.photos || [])
              .map((x) => ({
                id: makeRowId(),
                text: clean(x.photo),
              }))
              .slice(0, MAX_PHOTOS),
          });
          setHandoutUrlDraft('');
          setAcceptedPromotionIds({});
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
    async function loadFormLogoPreview() {
      const uri = await resolveProfilePictureUri(form.companyLogo || null);
      if (!cancelled) setFormLogoPreview(uri);
    }
    loadFormLogoPreview();
    return () => {
      cancelled = true;
    };
  }, [form.companyLogo]);

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

  useEffect(() => {
    let cancelled = false;
    const unresolved = form.photos.filter((row) => row.text && formPhotoPreviews[row.id] === undefined);
    if (!unresolved.length) return;
    async function loadFormPhotoPreviews() {
      const updates: Record<string, string | null> = {};
      await Promise.all(
        unresolved.map(async (row) => {
          updates[row.id] = await resolveProfilePictureUri(row.text);
        })
      );
      if (!cancelled && Object.keys(updates).length) {
        setFormPhotoPreviews((prev) => ({ ...prev, ...updates }));
      }
    }
    loadFormPhotoPreviews();
    return () => {
      cancelled = true;
    };
  }, [form.photos, formPhotoPreviews]);

  const currentProfileId = currentAppUser?.profileId || currentAppUser?.profile?.id || null;
  const favoriteKey =
    currentProfileId && profile?.id ? `e:${profile.eventId || APS_ID}|u:${currentProfileId}|x:${profile.id}` : '';
  const viewKey =
    currentProfileId && profile?.id ? `v:${profile.eventId || APS_ID}|u:${currentProfileId}|x:${profile.id}` : '';

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

  // Count one unique view per logged-in user (skip the exhibitor's own company staff).
  useEffect(() => {
    let cancelled = false;
    async function recordUniqueView() {
      if (!profile?.id || !currentProfileId || !viewKey) return;

      const isApprovedRegistrant =
        String(currentAppUser?.registrant?.status || '').toUpperCase() === 'APPROVED';
      const isOwnCompany =
        !!currentAppUser?.registrant?.companyId &&
        !!profile.company?.id &&
        currentAppUser.registrant.companyId === profile.company.id &&
        isApprovedRegistrant;
      if (isOwnCompany) return;

      try {
        const existingResp = await graphqlAuthClient.graphql({
          query: viewsByViewKey,
          variables: { viewKey, limit: 1 },
        });
        const existingData = existingResp.data as {
          apsAppUserExhibitorViewsByViewKey?: {
            items?: ({ id?: string | null } | null)[] | null;
          };
        };
        const alreadyViewed = existingData.apsAppUserExhibitorViewsByViewKey?.items?.some((x) => !!x?.id);
        if (alreadyViewed || cancelled) return;

        try {
          await graphqlAuthClient.graphql({
            query: createExhibitorView,
            variables: {
              input: {
                id: viewKey,
                userProfileId: currentProfileId,
                exhibitorId: profile.id,
                eventId: profile.eventId || APS_ID,
                viewKey,
              },
            },
          });
        } catch (e) {
          if (isDuplicateGraphError(e)) return;
          throw e;
        }
        if (cancelled) return;

        const nextViews = (profile.views ?? viewsCount ?? 0) + 1;
        await graphqlApiKeyClient.graphql({
          query: updateExhibitorProfile,
          variables: { input: { id: profile.id, views: nextViews } },
        });
        if (!cancelled) {
          setViewsCount(nextViews);
          setProfile((prev) => (prev ? { ...prev, views: nextViews } : prev));
        }
      } catch {
        // Silent — view tracking should never block the profile screen.
      }
    }
    void recordUniqueView();
    return () => {
      cancelled = true;
    };
    // Intentionally keyed to identity + exhibitor, not viewsCount (avoid re-entry).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewKey,
    profile?.id,
    profile?.company?.id,
    currentProfileId,
    currentAppUser?.registrant?.companyId,
    currentAppUser?.registrant?.status,
  ]);

  if (loading) {
    return <RiveLoader />;
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
  const previewVideoUrl = canEdit ? form.video : profile.video;
  const previewVideoCaption = canEdit ? form.videoCaption : profile.videoCaption;
  const hasPreviewVideo = !!parseVideoEmbed(previewVideoUrl);
  const previewPhotoUris = (profile.photos || [])
    .map((photo) => photoUris[photo.id])
    .filter((uri): uri is string => !!uri);
  const editPhotoUris = form.photos
    .map((row) => formPhotoPreviews[row.id])
    .filter((uri): uri is string => !!uri);

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
        await graphqlApiKeyClient.graphql({
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
        await graphqlApiKeyClient.graphql({
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

  function addPromotionRow() {
    setForm((prev) => ({
      ...prev,
      promotions: [...prev.promotions, { id: makeRowId(), text: '', link: '' }],
    }));
  }

  function updatePromotionRow(rowId: string, patch: Partial<Omit<PairRow, 'id'>>) {
    setAcceptedPromotionIds((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    setForm((prev) => ({
      ...prev,
      promotions: prev.promotions.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    }));
  }

  function acceptPromotionRow(rowId: string) {
    // Visual affordance only — real persistence is Save Changes.
    setAcceptedPromotionIds((prev) => ({ ...prev, [rowId]: true }));
  }

  function removePromotionRow(rowId: string) {
    setAcceptedPromotionIds((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    setForm((prev) => ({
      ...prev,
      promotions: prev.promotions.filter((row) => row.id !== rowId),
    }));
  }

  function removeHandout() {
    setForm((prev) => ({ ...prev, handouts: [] }));
    setHandoutUrlDraft('');
  }

  function removePhotoRow(rowId: string) {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((row) => row.id !== rowId),
    }));
    setFormPhotoPreviews((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  }

  async function ensureMediaLibraryPermission() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access in Settings to upload images.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  }

  async function uploadLogo() {
    if (!profile?.company?.id || uploadingLogo) return;
    const ok = await ensureMediaLibraryPermission();
    if (!ok) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.9,
      aspect: [1, 1],
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;

    setUploadingLogo(true);
    try {
      const asset = picked.assets[0];
      const key = await uploadExhibitorAsset({
        fileUri: asset.uri,
        companyId: profile.company.id,
        kind: 'logo',
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      setForm((prev) => ({ ...prev, companyLogo: key }));
      const preview = await resolveProfilePictureUri(key);
      setFormLogoPreview(preview);
      setLogoUri(preview);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload logo.');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function uploadHandoutFile() {
    if (!profile?.company?.id || uploadingHandout) return;
    if (form.handouts.length >= MAX_HANDOUTS) {
      Alert.alert('Limit reached', `You can add up to ${MAX_HANDOUTS} handout.`);
      return;
    }
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;

    setUploadingHandout(true);
    try {
      const asset = picked.assets[0];
      const key = await uploadExhibitorAsset({
        fileUri: asset.uri,
        companyId: profile.company.id,
        kind: 'handout',
        mimeType: asset.mimeType,
        fileName: asset.name,
      });
      setForm((prev) => ({
        ...prev,
        handouts: [{ id: makeRowId(), text: key }],
      }));
      setHandoutUrlDraft('');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload handout.');
    } finally {
      setUploadingHandout(false);
    }
  }

  function applyHandoutUrl() {
    if (form.handouts.length >= MAX_HANDOUTS) {
      Alert.alert('Limit reached', `You can add up to ${MAX_HANDOUTS} handout.`);
      return;
    }
    const url = normalizeUrl(handoutUrlDraft);
    if (!url) {
      Alert.alert('Add a URL', 'Paste a handout link first.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      handouts: [{ id: makeRowId(), text: url }],
    }));
    setHandoutUrlDraft('');
  }

  async function uploadPhotos() {
    if (!profile?.company?.id || uploadingPhotos) return;
    const remaining = MAX_PHOTOS - form.photos.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const ok = await ensureMediaLibraryPermission();
    if (!ok) return;

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets?.length) return;

    setUploadingPhotos(true);
    try {
      const created: SingleRow[] = [];
      const previews: Record<string, string | null> = {};
      for (const asset of picked.assets.slice(0, remaining)) {
        if (!asset.uri) continue;
        const key = await uploadExhibitorAsset({
          fileUri: asset.uri,
          companyId: profile.company.id,
          kind: 'photo',
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        });
        const id = makeRowId();
        created.push({ id, text: key });
        previews[id] = await resolveProfilePictureUri(key);
      }
      if (!created.length) return;
      setForm((prev) => ({
        ...prev,
        photos: [...prev.photos, ...created].slice(0, MAX_PHOTOS),
      }));
      setFormPhotoPreviews((prev) => ({ ...prev, ...previews }));
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload photos.');
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function saveEdits() {
    if (!profile?.id || !profile.company?.id) return;
    const video = clean(form.video);
    if (video && !isAllowedVideoUrl(video)) {
      Alert.alert(
        'Video URL',
        'Only YouTube or Vimeo links are allowed. Paste a YouTube or Vimeo video URL.'
      );
      return;
    }
    const companyEmail = clean(form.companyEmail);
    if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
      Alert.alert('Company email', 'Enter a valid email address (e.g. name@company.com).');
      return;
    }
    setSaving(true);
    try {
      // Exhibitor/company updates use API key auth. Amplify's API-key update resolver
      // allows those fields but rejects null values (`nullAllowedFields` is empty),
      // so only send defined non-empty scalars.
      const profileInput: Record<string, string> = { id: profile.id };
      const videoCaption = clean(form.videoCaption);
      if (video) profileInput.video = video;
      if (videoCaption) profileInput.videoCaption = videoCaption;
      if (video || videoCaption) {
        await graphqlApiKeyClient.graphql({
          query: updateExhibitorProfile,
          variables: { input: profileInput },
        });
      }

      const companyInput: Record<string, string> = { id: profile.company.id };
      const companyFields: Array<[string, string]> = [
        ['description', clean(form.companyDescription)],
        ['website', clean(form.companyWebsite)],
        ['email', companyEmail],
        ['phone', clean(form.companyPhone)],
        ['address', clean(form.companyAddress)],
        ['city', clean(form.companyCity)],
        ['state', clean(form.companyState)],
        ['zip', clean(form.companyZip)],
        ['country', clean(form.companyCountry)],
        ['logo', clean(form.companyLogo)],
      ];
      for (const [key, value] of companyFields) {
        if (value) companyInput[key] = value;
      }
      if (Object.keys(companyInput).length > 1) {
        await graphqlApiKeyClient.graphql({
          query: updateCompany,
          variables: { input: companyInput },
        });
      }

      await Promise.all(
        (profile.promotions || []).map((item) =>
          graphqlApiKeyClient.graphql({ query: deletePromotion, variables: { input: { id: item.id } } })
        )
      );
      const promotionsToCreate = form.promotions
        .map((row) => ({ text: clean(row.text), link: clean(row.link) }))
        .filter((row) => !!row.text);
      await Promise.all(
        promotionsToCreate.map((item) => {
          const input: Record<string, string> = {
            exhibitorId: profile.id,
            eventId: profile.eventId,
            promotion: item.text,
          };
          if (item.link) input.link = item.link;
          return graphqlApiKeyClient.graphql({
            query: createPromotion,
            variables: { input },
          });
        })
      );

      await Promise.all(
        (profile.handouts || []).map((item) =>
          graphqlApiKeyClient.graphql({ query: deleteHandout, variables: { input: { id: item.id } } })
        )
      );
      const handoutsToCreate = form.handouts
        .map((row) => clean(row.text))
        .filter(Boolean)
        .slice(0, MAX_HANDOUTS);
      await Promise.all(
        handoutsToCreate.map((item) =>
          graphqlApiKeyClient.graphql({
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
          graphqlApiKeyClient.graphql({ query: deletePhoto, variables: { input: { id: item.id } } })
        )
      );
      const photosToCreate = form.photos
        .map((row) => clean(row.text))
        .filter(Boolean)
        .slice(0, MAX_PHOTOS);
      await Promise.all(
        photosToCreate.map((photo) =>
          graphqlApiKeyClient.graphql({
            query: createPhoto,
            variables: {
              input: {
                exhibitorId: profile.id,
                eventId: profile.eventId,
                photo,
                caption: null,
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
      const graphMessage =
        e?.errors?.[0]?.message ||
        e?.message ||
        'Could not save changes.';
      Alert.alert('Update failed', graphMessage);
    } finally {
      setSaving(false);
    }
  }

  async function shareQrCode() {
    if (!profile?.qrCode) return;
    try {
      await Share.share({
        title: `${clean(profile.company?.name) || 'Exhibitor'} passport QR code`,
        message: profile.qrCode,
        url: profile.qrCode,
      });
    } catch (e: any) {
      Alert.alert('Unable to share QR code', e?.message || 'Please try again.');
    }
  }

  async function openHandout(value?: string | null) {
    const raw = clean(value);
    if (!raw) return;
    try {
      if (/^https?:\/\//i.test(raw)) {
        await Linking.openURL(raw);
        return;
      }
      const uri = await resolveProfilePictureUri(raw);
      if (!uri) throw new Error('Handout file unavailable.');
      await Linking.openURL(uri);
    } catch (e: any) {
      Alert.alert('Unable to open handout', e?.message || 'Please try again.');
    }
  }

  async function openQrCode() {
    if (!profile?.qrCode) return;
    try {
      await Linking.openURL(profile.qrCode);
    } catch (e: any) {
      Alert.alert('Unable to open QR code', e?.message || 'Please try again.');
    }
  }

  return (
    <>
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
          <Pressable
            style={[
              styles.favoriteHeaderBtn,
              (!currentProfileId || favoriteBusy) && styles.favoritePillDisabled,
            ]}
            disabled={!currentProfileId || favoriteBusy}
            onPress={toggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={22}
              color={isFavorite ? '#f59e0b' : '#6b7280'}
            />
          </Pressable>
        </View>

        {isCompanyEmployee && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{viewsCount}</Text>
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

        {canEdit ? (
          <Text style={styles.previewLabel}>Public preview</Text>
        ) : null}

        {(!!profile.company?.phone || !!profile.company?.email || !!website) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            {!!profile.company?.phone && (
              <Pressable onPress={() => Linking.openURL(`tel:${profile.company?.phone}`)} style={styles.linkRow}>
                <Ionicons name="call-outline" size={16} color={autopackColors.apBlue} />
                <Text style={styles.linkText}>{profile.company?.phone}</Text>
              </Pressable>
            )}
            {!!profile.company?.email && (
              <Pressable onPress={() => Linking.openURL(`mailto:${profile.company?.email}`)} style={styles.linkRow}>
                <Ionicons name="mail-outline" size={16} color={autopackColors.apBlue} />
                <Text style={styles.linkText}>{profile.company?.email}</Text>
              </Pressable>
            )}
            {!!website && (
              <Pressable onPress={() => Linking.openURL(website)} style={styles.linkRow}>
                <Ionicons name="globe-outline" size={16} color={autopackColors.apBlue} />
                <Text style={styles.linkText}>{profile.company?.website}</Text>
              </Pressable>
            )}
          </View>
        )}

        {!!profile.company?.description && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <Text style={styles.body}>{profile.company.description}</Text>
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
                    <Ionicons name="open-outline" size={14} color={autopackColors.apBlue} />
                    <Text style={styles.linkText}>Open</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {hasPreviewVideo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Video</Text>
            <ExhibitorVideoEmbed url={previewVideoUrl} caption={previewVideoCaption} />
          </View>
        )}

        {(profile.handouts || []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Handouts</Text>
            {(profile.handouts || []).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => void openHandout(item.handout)}
                style={styles.linkRow}
              >
                <Ionicons name="document-text-outline" size={16} color={autopackColors.apBlue} />
                <Text style={styles.linkText} numberOfLines={1}>
                  Open handout
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {previewPhotoUris.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <View style={styles.photoGrid}>
              {previewPhotoUris.map((uri, index) => (
                <Pressable
                  key={`${uri}-${index}`}
                  onPress={() => setGallery({ uris: previewPhotoUris, index })}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`Open photo ${index + 1}`}
                >
                  <Image source={{ uri }} style={styles.photo} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {canEdit && !!profile.qrCode && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Passport QR Code</Text>
            <Text style={styles.muted}>
              Display this code at your booth so attendees can collect their passport stamp.
            </Text>
            <Pressable style={styles.qrPreviewCard} onPress={() => setQrPreviewVisible(true)}>
              <Image source={{ uri: profile.qrCode }} style={styles.qrImage} resizeMode="contain" />
            </Pressable>
            <View style={styles.qrActions}>
              <Pressable style={styles.qrActionBtn} onPress={() => setQrPreviewVisible(true)}>
                <Ionicons name="expand-outline" size={16} color={autopackColors.apBlue} />
                <Text style={styles.qrActionText}>Display</Text>
              </Pressable>
              <Pressable style={styles.qrActionBtn} onPress={shareQrCode}>
                <Ionicons name="share-outline" size={16} color={autopackColors.apBlue} />
                <Text style={styles.qrActionText}>Share</Text>
              </Pressable>
              <Pressable style={styles.qrActionBtn} onPress={openQrCode}>
                <Ionicons name="download-outline" size={16} color={autopackColors.apBlue} />
                <Text style={styles.qrActionText}>Download</Text>
              </Pressable>
            </View>
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
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            ref={companyEmailInputRef}
            value={form.companyEmail}
            onChangeText={(v) => setForm((p) => ({ ...p, companyEmail: v }))}
            onFocus={() => {
              // Values often look like "@company.com" — put the caret before "@"
              // so exhibitors can type the local part immediately.
              const at = form.companyEmail.indexOf('@');
              if (at < 0) return;
              const selection = { start: at, end: at };
              requestAnimationFrame(() => {
                companyEmailInputRef.current?.setNativeProps({ selection });
              });
            }}
            placeholder="name@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
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

          <Text style={styles.fieldLabel}>Logo</Text>
          <View style={styles.uploadRow}>
            <View style={styles.logoUploadPreview}>
              {formLogoPreview || logoUri ? (
                <Image
                  source={{ uri: formLogoPreview || logoUri || undefined }}
                  style={styles.logoUploadImg}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons name="image-outline" size={22} color="#9ca3af" />
              )}
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Pressable
                style={[styles.uploadBtn, uploadingLogo && styles.saveBtnDisabled]}
                disabled={uploadingLogo}
                onPress={() => void uploadLogo()}
              >
                {uploadingLogo ? (
                  <ActivityIndicator color={autopackColors.apBlue} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color={autopackColors.apBlue} />
                    <Text style={styles.uploadBtnText}>{form.companyLogo ? 'Replace logo' : 'Upload logo'}</Text>
                  </>
                )}
              </Pressable>
              {!!form.companyLogo ? (
                <Pressable
                  onPress={() => {
                    setForm((p) => ({ ...p, companyLogo: '' }));
                    setFormLogoPreview(null);
                  }}
                >
                  <Text style={styles.removeLink}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Text style={styles.fieldLabel}>Video URL</Text>
          <Text style={styles.fieldHint}>YouTube or Vimeo only — paste a link.</Text>
          <TextInput
            value={form.video}
            onChangeText={(v) => setForm((p) => ({ ...p, video: v }))}
            placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          {!!form.video.trim() && !isAllowedVideoUrl(form.video) ? (
            <Text style={styles.fieldError}>
              Enter a valid YouTube or Vimeo URL.
            </Text>
          ) : null}
          <Text style={styles.fieldLabel}>Video Caption</Text>
          <TextInput value={form.videoCaption} onChangeText={(v) => setForm((p) => ({ ...p, videoCaption: v }))} style={styles.input} />
          <Text style={styles.fieldLabel}>Promotions</Text>
          <Text style={styles.fieldHint}>Show specials, booth offers, or limited-time incentives.</Text>
          {form.promotions.map((row) => {
            const accepted = !!acceptedPromotionIds[row.id];
            return (
              <View key={row.id} style={styles.promotionEditor}>
                <TextInput
                  value={row.text}
                  onChangeText={(v) => updatePromotionRow(row.id, { text: v })}
                  placeholder="e.g. 20% off orders placed at the show"
                  style={styles.input}
                />
                <TextInput
                  value={row.link}
                  onChangeText={(v) => updatePromotionRow(row.id, { link: v })}
                  placeholder="Optional link (https://...)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
                <View style={styles.promotionActions}>
                  <Pressable
                    style={[styles.promotionAcceptBtn, accepted && styles.promotionAcceptBtnOn]}
                    onPress={() => acceptPromotionRow(row.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Accept promotion"
                  >
                    <Ionicons
                      name={accepted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={20}
                      color={accepted ? '#059669' : '#9ca3af'}
                    />
                  </Pressable>
                  <Pressable style={styles.promotionRemoveBtn} onPress={() => removePromotionRow(row.id)}>
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                    <Text style={styles.removeLink}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          <Pressable style={styles.rowAddBtn} onPress={addPromotionRow}>
            <Ionicons name="add" size={16} color={autopackColors.apBlue} />
            <Text style={styles.rowAddText}>Add promotion</Text>
          </Pressable>

          <Text style={styles.fieldLabel}>Handouts</Text>
          <Text style={styles.fieldHint}>Limit 1 — upload a file or paste a URL.</Text>
          {form.handouts.length > 0 ? (
            <View style={styles.assetRow}>
              <Ionicons name="document-text-outline" size={18} color={autopackColors.apBlue} />
              <Text style={styles.assetRowText} numberOfLines={1}>
                {/^https?:\/\//i.test(form.handouts[0].text)
                  ? form.handouts[0].text
                  : 'Uploaded handout'}
              </Text>
              <Pressable style={styles.rowRemoveBtn} onPress={removeHandout}>
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <Pressable
                style={[styles.uploadBtn, uploadingHandout && styles.saveBtnDisabled]}
                disabled={uploadingHandout}
                onPress={() => void uploadHandoutFile()}
              >
                {uploadingHandout ? (
                  <ActivityIndicator color={autopackColors.apBlue} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color={autopackColors.apBlue} />
                    <Text style={styles.uploadBtnText}>Upload handout</Text>
                  </>
                )}
              </Pressable>
              <View style={styles.rowEditor}>
                <TextInput
                  value={handoutUrlDraft}
                  onChangeText={setHandoutUrlDraft}
                  placeholder="https://..."
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, styles.rowEditorMain]}
                />
                <Pressable style={styles.rowAddBtn} onPress={applyHandoutUrl}>
                  <Text style={styles.rowAddText}>Use URL</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={styles.fieldLabel}>Photos</Text>
          <Text style={styles.fieldHint}>Limit {MAX_PHOTOS} — upload only.</Text>
          <View style={styles.photoGrid}>
            {form.photos.map((row) => {
              const uri = formPhotoPreviews[row.id];
              const galleryIndex = form.photos
                .filter((r) => !!formPhotoPreviews[r.id])
                .findIndex((r) => r.id === row.id);
              return (
                <View key={row.id} style={styles.photoEditTile}>
                  {uri ? (
                    <Pressable
                      onPress={() => {
                        if (galleryIndex >= 0) setGallery({ uris: editPhotoUris, index: galleryIndex });
                      }}
                      accessibilityRole="imagebutton"
                      accessibilityLabel="Open photo"
                    >
                      <Image source={{ uri }} style={styles.photoEditImg} />
                    </Pressable>
                  ) : (
                    <View style={styles.photoEditFallback}>
                      <ActivityIndicator color="#9ca3af" />
                    </View>
                  )}
                  <Pressable style={styles.photoRemoveBtn} onPress={() => removePhotoRow(row.id)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              );
            })}
            {form.photos.length < MAX_PHOTOS ? (
              <Pressable
                style={[styles.photoAddTile, uploadingPhotos && styles.saveBtnDisabled]}
                disabled={uploadingPhotos}
                onPress={() => void uploadPhotos()}
              >
                {uploadingPhotos ? (
                  <ActivityIndicator color={autopackColors.apBlue} />
                ) : (
                  <>
                    <Ionicons name="add" size={22} color={autopackColors.apBlue} />
                    <Text style={styles.photoAddText}>
                      {form.photos.length}/{MAX_PHOTOS}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
          <Pressable disabled={saving} style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveEdits}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
        </View>
      )}
      </ScrollView>

      {canEdit && !!profile.qrCode && (
        <Modal visible={qrPreviewVisible} animationType='fade' transparent onRequestClose={() => setQrPreviewVisible(false)}>
          <View style={styles.qrModalBackdrop}>
            <View style={styles.qrModalCard}>
              <Text style={styles.qrModalTitle}>{clean(profile.company?.name) || 'Exhibitor'} Passport QR</Text>
              <Image source={{ uri: profile.qrCode }} style={styles.qrModalImage} resizeMode='contain' />
              <Pressable style={styles.saveBtn} onPress={openQrCode}>
                <Text style={styles.saveBtnText}>Open / Download Image</Text>
              </Pressable>
              <Pressable style={styles.secondaryModalBtn} onPress={() => setQrPreviewVisible(false)}>
                <Text style={styles.secondaryModalBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      <PhotoGalleryModal
        visible={!!gallery}
        uris={gallery?.uris || []}
        initialIndex={gallery?.index || 0}
        onClose={() => setGallery(null)}
      />
    </>
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
  favoriteHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  favoritePillDisabled: { opacity: 0.6 },
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
  previewLabel: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
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
  qrPreviewCard: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    padding: 12,
  },
  qrImage: { width: '100%', height: '100%' },
  qrActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  qrActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  qrActionText: { color: autopackColors.apBlue, fontWeight: '800', fontSize: 12 },
  qrModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  qrModalTitle: { color: '#111827', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  qrModalImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  secondaryModalBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
  },
  secondaryModalBtnText: { color: '#111827', fontWeight: '800' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 92, height: 92, borderRadius: 10, backgroundColor: '#f3f4f6' },
  fieldLabel: { marginTop: 8, color: '#374151', fontWeight: '700', fontSize: 12 },
  fieldHint: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  fieldError: { color: '#b91c1c', fontSize: 12, marginTop: 4 },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  logoUploadPreview: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoUploadImg: { width: 64, height: 64 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
  },
  uploadBtnText: { color: autopackColors.apBlue, fontWeight: '700', fontSize: 12 },
  removeLink: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
  assetRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  assetRowText: { flex: 1, color: '#111827', fontSize: 12 },
  photoEditTile: {
    width: 92,
    height: 92,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  photoEditImg: { width: '100%', height: '100%' },
  photoEditFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(17,24,39,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddTile: {
    width: 92,
    height: 92,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddText: { color: autopackColors.apBlue, fontWeight: '700', fontSize: 11 },
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
  promotionEditor: {
    marginTop: 8,
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  promotionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  promotionAcceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionAcceptBtnOn: {
    backgroundColor: '#ecfdf5',
  },
  promotionRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  rowEditor: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rowEditorMain: { flex: 1 },
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
