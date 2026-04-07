import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { APS_ID } from '../config/apsConfig';
import { graphqlAuthClient } from '../utils/graphqlClient';
import { apsAppUserFavoriteContactsByUserProfileIdAndCreatedAt } from '../graphql/queries';

const createFavoriteContactMinimal = /* GraphQL */ `
  mutation CreateFavoriteContactMinimal($input: CreateApsAppUserFavoriteContactInput!) {
    createApsAppUserFavoriteContact(input: $input) {
      id
      __typename
    }
  }
`;

const deleteFavoriteContactMinimal = /* GraphQL */ `
  mutation DeleteFavoriteContactMinimal($input: DeleteApsAppUserFavoriteContactInput!) {
    deleteApsAppUserFavoriteContact(input: $input) {
      id
      __typename
    }
  }
`;

type CommunityStore = {
  /**
   * Favorites are stored by CONTACT profile id (ApsAppUserProfile.id).
   * In Community UI, star reflects favorite status only.
   */
  favoriteContactIds: Record<string, true>;

  /** Map contact profile id -> ApsAppUserFavoriteContact record id (used for deletes). */
  favoriteRecordIdByContactId: Record<string, string>;

  /** Tracks in-flight toggle operations per contactId to prevent double-taps. */
  pendingContactIds: Record<string, true>;

  loadFavorites: (currentUserProfileId: string) => Promise<void>;
  toggleFavorite: (params: { currentUserProfileId: string; contactId: string }) => Promise<void>;
  isFavorite: (contactId: string) => boolean;
  clearFavorites: () => void;
};

export const useCommunityStore = create<CommunityStore>()(
  persist(
    (set, get) => ({
      favoriteContactIds: {},
      favoriteRecordIdByContactId: {},
      pendingContactIds: {},

      loadFavorites: async (currentUserProfileId: string) => {
        if (!currentUserProfileId) return;

        const all: Array<{ id: string; contactProfileId: string }> = [];
        let nextToken: string | null | undefined = null;

        do {
          const resp = await graphqlAuthClient.graphql({
            query: apsAppUserFavoriteContactsByUserProfileIdAndCreatedAt,
            variables: { userProfileId: currentUserProfileId, limit: 1000, nextToken },
          });

          const data = resp.data as {
            apsAppUserFavoriteContactsByUserProfileIdAndCreatedAt?: {
              items?: Array<{ id: string; contactProfileId: string } | null>;
              nextToken?: string | null;
            };
          };

          const items =
            data.apsAppUserFavoriteContactsByUserProfileIdAndCreatedAt?.items || [];
          for (const item of items) {
            if (!item?.id || !item.contactProfileId) continue;
            all.push({ id: item.id, contactProfileId: item.contactProfileId });
          }
          nextToken =
            data.apsAppUserFavoriteContactsByUserProfileIdAndCreatedAt?.nextToken;
        } while (nextToken);

        const favs: Record<string, true> = {};
        const ids: Record<string, string> = {};
        for (const item of all) {
          ids[item.contactProfileId] = item.id;
          favs[item.contactProfileId] = true;
        }

        set({
          favoriteContactIds: favs,
          favoriteRecordIdByContactId: ids,
        });
      },

      toggleFavorite: async ({ currentUserProfileId, contactId }) => {
        if (!currentUserProfileId || !contactId) return;

        // prevent double-taps
        if (get().pendingContactIds[contactId]) return;
        set({ pendingContactIds: { ...get().pendingContactIds, [contactId]: true } });

        const existingRecordId = get().favoriteRecordIdByContactId[contactId];
        const isFavorite = !!existingRecordId;

        try {
          if (isFavorite) {
            // Optimistic UI: remove immediately
            const { [contactId]: _removed, ...restFavs } = get().favoriteContactIds;
            const { [contactId]: _removedId, ...restIds } = get().favoriteRecordIdByContactId;
            set({ favoriteContactIds: restFavs, favoriteRecordIdByContactId: restIds });

            await graphqlAuthClient.graphql({
              query: deleteFavoriteContactMinimal,
              variables: { input: { id: existingRecordId } },
            });
          } else {
            // Optimistic UI: add immediately
            set({ favoriteContactIds: { ...get().favoriteContactIds, [contactId]: true } });
            const favoriteKey = `e:${APS_ID}|u:${currentUserProfileId}|c:${contactId}`;

            const resp = await graphqlAuthClient.graphql({
              query: createFavoriteContactMinimal,
              variables: {
                input: {
                  userProfileId: currentUserProfileId,
                  contactProfileId: contactId,
                  eventId: APS_ID,
                  favoriteKey,
                },
              },
            });

            const data = resp.data as {
              createApsAppUserFavoriteContact?: { id?: string | null } | null;
            };

            const createdId = data.createApsAppUserFavoriteContact?.id;
            if (createdId) {
              set({
                favoriteRecordIdByContactId: {
                  ...get().favoriteRecordIdByContactId,
                  [contactId]: createdId,
                },
              });
            } else {
              // If the create succeeded but we didn't get an id back, re-sync.
              await get().loadFavorites(currentUserProfileId);
            }
          }
        } catch (e) {
          // Roll back by re-syncing from server for this user
          console.error('toggleFavorite failed, resyncing:', e);
          await get().loadFavorites(currentUserProfileId);
          throw e;
        } finally {
          const { [contactId]: _done, ...restPending } = get().pendingContactIds;
          set({ pendingContactIds: restPending });
        }
      },

      isFavorite: (contactId: string) => !!get().favoriteContactIds[contactId],

      clearFavorites: () =>
        set({
          favoriteContactIds: {},
          favoriteRecordIdByContactId: {},
          pendingContactIds: {},
        }),
    }),
    {
      name: 'aps-community-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);


