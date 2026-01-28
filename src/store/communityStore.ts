import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { graphqlAuthClient, graphqlClient } from '../utils/graphqlClient';
import { apsAppUserContactsByUserId } from '../graphql/queries';
import { createApsAppUserContact, deleteApsAppUserContact } from '../graphql/mutations';

type CommunityStore = {
  /**
   * Contacts are stored by CONTACT profile id (ApsAppUserProfile.id).
   * In the Community UI, the “star” indicates whether this profile is in your contacts.
   */
  favoriteContactIds: Record<string, true>;

  /** Map contact profile id -> ApsAppUserContact record id (used for deletes). */
  contactRecordIdByContactId: Record<string, string>;

  /** Tracks in-flight toggle operations per contactId to prevent double-taps. */
  pendingContactIds: Record<string, true>;

  loadFavorites: (currentUserId: string) => Promise<void>;
  toggleFavorite: (params: { currentUserId: string; contactId: string }) => Promise<void>;
  isFavorite: (contactId: string) => boolean;
  clearFavorites: () => void;
};

export const useCommunityStore = create<CommunityStore>()(
  persist(
    (set, get) => ({
      favoriteContactIds: {},
      contactRecordIdByContactId: {},
      pendingContactIds: {},

      loadFavorites: async (currentUserId: string) => {
        if (!currentUserId) return;

        const all: Array<{ id: string; contactId: string; favorite?: boolean | null }> = [];
        let nextToken: string | null | undefined = null;

        do {
          const resp = await graphqlClient.graphql({
            query: apsAppUserContactsByUserId,
            variables: { userId: currentUserId, limit: 1000, nextToken },
          });

          const data = resp.data as {
            apsAppUserContactsByUserId?: {
              items?: Array<{ id: string; contactId: string; favorite?: boolean | null } | null>;
              nextToken?: string | null;
            };
          };

          const items = data.apsAppUserContactsByUserId?.items || [];
          for (const item of items) {
            if (!item?.id || !item.contactId) continue;
            all.push({ id: item.id, contactId: item.contactId, favorite: item.favorite });
          }
          nextToken = data.apsAppUserContactsByUserId?.nextToken;
        } while (nextToken);

        const favs: Record<string, true> = {};
        const ids: Record<string, string> = {};
        for (const item of all) {
          ids[item.contactId] = item.id;
          // Treat any existing ApsAppUserContact record as “in contacts” for UI.
          favs[item.contactId] = true;
        }

        set({
          favoriteContactIds: favs,
          contactRecordIdByContactId: ids,
        });
      },

      toggleFavorite: async ({ currentUserId, contactId }) => {
        if (!currentUserId || !contactId) return;

        // prevent double-taps
        if (get().pendingContactIds[contactId]) return;
        set({ pendingContactIds: { ...get().pendingContactIds, [contactId]: true } });

        const existingRecordId = get().contactRecordIdByContactId[contactId];
        const inContacts = !!existingRecordId;

        try {
          if (inContacts) {
            // Optimistic UI: remove immediately
            const { [contactId]: _removed, ...restFavs } = get().favoriteContactIds;
            const { [contactId]: _removedId, ...restIds } = get().contactRecordIdByContactId;
            set({ favoriteContactIds: restFavs, contactRecordIdByContactId: restIds });

            await graphqlAuthClient.graphql({
              query: deleteApsAppUserContact,
              variables: { input: { id: existingRecordId } },
            });
          } else {
            // Optimistic UI: add immediately
            set({ favoriteContactIds: { ...get().favoriteContactIds, [contactId]: true } });

            const resp = await graphqlAuthClient.graphql({
              query: createApsAppUserContact,
              variables: { input: { userId: currentUserId, contactId, favorite: true } },
            });

            const data = resp.data as {
              createApsAppUserContact?: { id?: string | null } | null;
            };

            const createdId = data.createApsAppUserContact?.id;
            if (createdId) {
              set({
                contactRecordIdByContactId: {
                  ...get().contactRecordIdByContactId,
                  [contactId]: createdId,
                },
              });
            } else {
              // If the create succeeded but we didn't get an id back, re-sync.
              await get().loadFavorites(currentUserId);
            }
          }
        } catch (e) {
          // Roll back by re-syncing from server for this user
          console.error('toggleFavorite failed, resyncing:', e);
          await get().loadFavorites(currentUserId);
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
          contactRecordIdByContactId: {},
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


