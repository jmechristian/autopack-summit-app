// src/store/apsStore.ts
import { create } from 'zustand';
import { graphqlClient } from '../utils/graphqlClient';
import { getCurrentUserEmail, signOut } from '../utils/authUtils';
import { APS_ID } from '../config/apsConfig';
import * as APITypes from '../API';
import {
  getAPSBasic,
  getRegistrantByEmail,
  getAppUserByRegistrantId,
  getAPSWithAgenda,
  getAPSWithRegistrants,
  getAPSWithSpeakers,
  getAPSWithExhibitors,
  getAPSWithAddOns,
} from '../graphql/customQueries';
import {
  apsAppUserProfilesByUserId,
  profileAffiliatesByProfileId,
  profileEducationsByProfileId,
  profileInterestsByProfileId,
} from '../graphql/queries';

// Types
type APSBasic = {
  id: string;
  year: string;
  codes?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApsRegistrant = APITypes.ApsRegistrant;
type ApsAppUser = APITypes.ApsAppUser;
type ApsAppUserProfile = APITypes.ApsAppUserProfile;
type APSSpeaker = APITypes.APSSpeaker;
type ApsAppExhibitorProfile = APITypes.ApsAppExhibitorProfile;
type ApsAddOn = APITypes.ApsAddOn;

interface ApsAgendaItem {
  id: string;
  session?: string | null;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  sessionQuestions?: {
    items: Array<{
      id: string;
      question?: string | null;
      userId: string;
      createdAt?: string;
    }>;
  };
}

interface ApsAgenda {
  id: string;
  eventId: string;
  items?: {
    items: ApsAgendaItem[];
    nextToken?: string | null;
  };
}

interface ApsStore {
  // State
  apsId: string;
  currentAppUser: ApsAppUser | null; // Changed from currentUserRegistrant to currentAppUser
  basicInfo: APSBasic | null;
  agenda: ApsAgenda | null;
  registrants: ApsRegistrant[];
  speakers: APSSpeaker[];
  exhibitors: ApsAppExhibitorProfile[];
  addOns: ApsAddOn[];
  
  // Loading states
  loading: {
    basicInfo: boolean;
    currentAppUser: boolean; // Changed from currentUserRegistrant
    agenda: boolean;
    registrants: boolean;
    speakers: boolean;
    exhibitors: boolean;
    addOns: boolean;
  };
  
  // Error states
  error: {
    basicInfo: string | null;
    currentAppUser: string | null; // Changed from currentUserRegistrant
    agenda: string | null;
    registrants: string | null;
    speakers: string | null;
    exhibitors: string | null;
    addOns: string | null;
  };
  
  authError: string | null;
  
  // Actions
  validateUserRegistrant: (email?: string) => Promise<boolean>;
  loadBasicInfo: () => Promise<void>;
  loadAgenda: () => Promise<void>;
  loadRegistrants: () => Promise<void>;
  loadSpeakers: () => Promise<void>;
  loadExhibitors: () => Promise<void>;
  loadAddOns: () => Promise<void>;
  reset: () => void;
  refreshProfile: () => Promise<void>;
}

const initialState = {
  apsId: APS_ID,
  currentAppUser: null,
  basicInfo: null,
  agenda: null,
  registrants: [],
  speakers: [],
  exhibitors: [],
  addOns: [],
  loading: {
    basicInfo: false,
    currentAppUser: false,
    agenda: false,
    registrants: false,
    speakers: false,
    exhibitors: false,
    addOns: false,
  },
  error: {
    basicInfo: null,
    currentAppUser: null,
    agenda: null,
    registrants: null,
    speakers: null,
    exhibitors: null,
    addOns: null,
  },
  authError: null,
};

export const useApsStore = create<ApsStore>((set, get) => ({
  ...initialState,

  // Helper: hydrate profile relations (affiliates/education/interests)
  // so they are present immediately without requiring a save to appear.
  // Returns a profile with hydrated relations.
  async hydrateProfileRelations(profile: APITypes.ApsAppUserProfile | null) {
    if (!profile?.id) return profile;
    const profileId = profile.id;

    try {
      const [affResp, eduResp, intResp] = await Promise.all([
        graphqlClient.graphql({
          query: profileAffiliatesByProfileId,
          variables: { profileId, limit: 100 },
        }),
        graphqlClient.graphql({
          query: profileEducationsByProfileId,
          variables: { profileId, limit: 100 },
        }),
        graphqlClient.graphql({
          query: profileInterestsByProfileId,
          variables: { profileId, limit: 100 },
        }),
      ]);

      const affiliatesData = affResp.data as {
        profileAffiliatesByProfileId?: { items?: Array<APITypes.ProfileAffiliate | null> };
      };
      const educationData = eduResp.data as {
        profileEducationsByProfileId?: { items?: Array<APITypes.ProfileEducation | null> };
      };
      const interestsData = intResp.data as {
        profileInterestsByProfileId?: { items?: Array<APITypes.ProfileInterest | null> };
      };

      const affiliates =
        affiliatesData.profileAffiliatesByProfileId?.items?.filter((a) => a !== null) || [];
      const education =
        educationData.profileEducationsByProfileId?.items?.filter((e) => e !== null) || [];
      const interests =
        interestsData.profileInterestsByProfileId?.items?.filter((i) => i !== null) || [];

      return {
        ...profile,
        affiliates: { items: affiliates as APITypes.ProfileAffiliate[] },
        education: { items: education as APITypes.ProfileEducation[] },
        interests: { items: interests as APITypes.ProfileInterest[] },
      };
    } catch (error) {
      console.error('Error hydrating profile relations:', error);
      return profile;
    }
  },
  
  validateUserRegistrant: async (email?: string) => {
    const userEmail = email || (await getCurrentUserEmail());
    
    console.log('🔍 Starting validation - raw email from auth:', userEmail);
    
    if (!userEmail) {
      console.error('❌ No user email found');
      set({ 
        authError: 'No authenticated user found',
        error: { ...get().error, currentAppUser: 'No authenticated user found' }
      });
      return false;
    }
    
    // Check if email looks like a UUID (Cognito user ID)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userEmail);
    if (isUUID) {
      console.error('❌ Email is a UUID, not an actual email. Auth attributes may not be set correctly.');
      set({ 
        authError: 'User email not found in authentication. Please contact support.',
        error: { ...get().error, currentAppUser: 'User email not found in authentication' }
      });
      return false;
    }
    
    // Normalize email: trim and lowercase for comparison
    const normalizedEmail = userEmail.trim().toLowerCase();
    const apsId = get().apsId;
    
    console.log('🔍 Validating app user by registrant email:', {
      userEmail: normalizedEmail,
      apsId,
    });
    
    set({ 
      loading: { ...get().loading, currentAppUser: true },
      error: { ...get().error, currentAppUser: null },
      authError: null,
    });
    
    try {
      // Step 1: Get registrant by email
      console.log('📤 Step 1: Getting registrant by email:', {
        apsID: apsId,
        email: normalizedEmail,
      });
      
      const registrantResponse = await graphqlClient.graphql({
        query: getRegistrantByEmail,
        variables: {
          apsID: apsId,
          email: normalizedEmail,
        },
      });
      
      console.log('📡 Registrant Response:', JSON.stringify(registrantResponse.data, null, 2));
      
      if (registrantResponse.errors) {
        console.error('❌ GraphQL Errors:', JSON.stringify(registrantResponse.errors, null, 2));
      }
      
      const registrantData = registrantResponse.data as {
        apsRegistrantsByApsID?: {
          items: ApsRegistrant[];
        };
      };
      
      const registrants = registrantData.apsRegistrantsByApsID?.items || [];
      
      console.log('📋 Found registrants:', registrants.length);
      
      if (registrants.length === 0) {
        // Try case-insensitive search by fetching all registrants and filtering
        console.log('⚠️ No exact match found, trying case-insensitive search...');
        
        // Fetch all registrants for this APS and filter client-side
        const allRegistrantsResponse = await graphqlClient.graphql({
          query: getAPSWithRegistrants,
          variables: { id: apsId, limit: 1000 },
        });
        
        const allData = allRegistrantsResponse.data as {
          getAPS?: {
            Registrants?: {
              items: ApsRegistrant[];
            };
          };
        };
        
        const allRegistrants = allData.getAPS?.Registrants?.items || [];
        console.log('📋 Total registrants in APS:', allRegistrants.length);
        
        // Case-insensitive email match
        const matchedRegistrant = allRegistrants.find(
          (r) => r.email?.trim().toLowerCase() === normalizedEmail
        );
        
        if (matchedRegistrant) {
          console.log('✅ Found case-insensitive match:', matchedRegistrant.email);
          // Step 2: Get app user by registrant ID
          const appUserResponse = await graphqlClient.graphql({
            query: getAppUserByRegistrantId,
            variables: {
              registrantId: matchedRegistrant.id,
            },
          });
          
          const appUserData = appUserResponse.data as {
            apsAppUsersByRegistrantId?: {
              items: ApsAppUser[];
            };
          };
          
          const appUsers = appUserData.apsAppUsersByRegistrantId?.items || [];
          
          if (appUsers.length > 0) {
            let appUser = appUsers[0];
            
            // If profile is null, try to fetch it separately
            if (!appUser.profile) {
              console.log('⚠️ Profile is null in response, fetching profile separately by userId...');
              try {
                const profileResponse = await graphqlClient.graphql({
                  query: apsAppUserProfilesByUserId,
                  variables: { userId: appUser.id, limit: 1 },
                });

                const profileData = profileResponse.data as {
                  apsAppUserProfilesByUserId?: {
                    items: Array<APITypes.ApsAppUserProfile | null>;
                  };
                };

                const profiles = profileData.apsAppUserProfilesByUserId?.items?.filter((p) => p !== null) as APITypes.ApsAppUserProfile[] || [];
                
                if (profiles.length > 0) {
                  console.log('✅ Found profile via separate query');
                  // Attach profile to appUser
                  appUser = { ...appUser, profile: profiles[0] };
                } else {
                  console.log('❌ Profile not found even with separate query');
                }
              } catch (error) {
                console.error('Error fetching profile separately:', error);
              }
            }
            
            console.log('✅ Found app user with profile:', appUser.profile ? 'Yes' : 'No');
            // Hydrate relations so affiliates/education/interests are present immediately
            appUser = {
              ...appUser,
              profile: await get().hydrateProfileRelations(appUser.profile || null),
            };
            set({
              currentAppUser: appUser,
              loading: { ...get().loading, currentAppUser: false },
              error: { ...get().error, currentAppUser: null },
              authError: null,
            });
            return true;
          } else {
            console.log('⚠️ Registrant found but no app user exists');
            set({
              currentAppUser: null,
              loading: { ...get().loading, currentAppUser: false },
              error: { ...get().error, currentAppUser: 'No app user found for this registrant' },
              authError: 'No app user found for this registrant. Please contact support.',
            });
            return false;
          }
        }
        
        console.log('❌ No registrant found after case-insensitive search');
        set({
          currentAppUser: null,
          loading: { ...get().loading, currentAppUser: false },
          error: { ...get().error, currentAppUser: 'No registration found for this email' },
          authError: 'No registration found for this email. Please contact support or try logging in with a different account.',
        });
        return false;
      }
      
      // Step 2: Get app user by registrant ID
      const registrant = registrants[0];
      console.log('📤 Step 2: Getting app user by registrant ID:', registrant.id);
      
      const appUserResponse = await graphqlClient.graphql({
        query: getAppUserByRegistrantId,
        variables: {
          registrantId: registrant.id,
        },
      });
      
      console.log('📡 App User Response:', JSON.stringify(appUserResponse.data, null, 2));
      
      if (appUserResponse.errors) {
        console.error('❌ GraphQL Errors:', JSON.stringify(appUserResponse.errors, null, 2));
      }
      
      const appUserData = appUserResponse.data as {
        apsAppUsersByRegistrantId?: {
          items: ApsAppUser[];
        };
      };
      
      const appUsers = appUserData.apsAppUsersByRegistrantId?.items || [];
      
      if (appUsers.length === 0) {
        console.log('⚠️ Registrant found but no app user exists');
        set({
          currentAppUser: null,
          loading: { ...get().loading, currentAppUser: false },
          error: { ...get().error, currentAppUser: 'No app user found for this registrant' },
          authError: 'No app user found for this registrant. Please contact support.',
        });
        return false;
      }
      
      let appUser = appUsers[0];
      console.log('✅ Found app user:', {
        id: appUser.id,
        registrantId: appUser.registrantId,
        hasProfile: !!appUser.profile,
        profileId: appUser.profile?.id,
        profileUserId: appUser.profile?.userId,
        apsAppUserProfileId: (appUser as any).apsAppUserProfileId,
      });
      
      // If profile is null, try to fetch it separately using userId
      if (!appUser.profile) {
        console.log('⚠️ Profile is null in response, fetching profile separately by userId...');
        try {
          const profileResponse = await graphqlClient.graphql({
            query: apsAppUserProfilesByUserId,
            variables: { userId: appUser.id, limit: 1 },
          });

          const profileData = profileResponse.data as {
            apsAppUserProfilesByUserId?: {
              items: Array<APITypes.ApsAppUserProfile | null>;
            };
          };

          const profiles = profileData.apsAppUserProfilesByUserId?.items?.filter((p) => p !== null) as APITypes.ApsAppUserProfile[] || [];
          
          if (profiles.length > 0) {
            console.log('✅ Found profile via separate query');
            // Attach profile to appUser
            appUser = { ...appUser, profile: profiles[0] };
          } else {
            console.log('❌ Profile not found even with separate query');
          }
        } catch (error) {
          console.error('Error fetching profile separately:', error);
        }
      }
      // Hydrate relations so affiliates/education/interests are present immediately
      appUser = {
        ...appUser,
        profile: await get().hydrateProfileRelations(appUser.profile || null),
      };
      set({
        currentAppUser: appUser,
        loading: { ...get().loading, currentAppUser: false },
        error: { ...get().error, currentAppUser: null },
        authError: null,
      });
      
      return true;
    } catch (error: any) {
      console.error('❌ Error validating user registrant:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      set({
        currentAppUser: null,
        loading: { ...get().loading, currentAppUser: false },
        error: { ...get().error, currentAppUser: error.message || 'Failed to validate registration' },
        authError: 'Failed to validate registration. Please try again.',
      });
      return false;
    }
  },
  
  loadBasicInfo: async () => {
    if (get().basicInfo) return; // Already loaded
    
    set({ loading: { ...get().loading, basicInfo: true }, error: { ...get().error, basicInfo: null } });
    
    try {
      const response = await graphqlClient.graphql({
        query: getAPSBasic,
        variables: { id: get().apsId },
      });
      
      const data = response.data as { getAPS?: APSBasic };
      
      if (data.getAPS) {
        set({
          basicInfo: data.getAPS,
          loading: { ...get().loading, basicInfo: false },
          error: { ...get().error, basicInfo: null },
        });
      } else {
        throw new Error('APS not found');
      }
    } catch (error: any) {
      console.error('Error loading basic APS info:', error);
      set({
        loading: { ...get().loading, basicInfo: false },
        error: { ...get().error, basicInfo: error.message || 'Failed to load APS info' },
      });
    }
  },
  
  loadAgenda: async () => {
    if (get().agenda) return; // Already loaded
    
    set({ loading: { ...get().loading, agenda: true }, error: { ...get().error, agenda: null } });
    
    try {
      const response = await graphqlClient.graphql({
        query: getAPSWithAgenda,
        variables: { id: get().apsId },
      });
      
      const data = response.data as { getAPS?: { agenda?: ApsAgenda } };
      
      if (data.getAPS?.agenda) {
        set({
          agenda: data.getAPS.agenda,
          loading: { ...get().loading, agenda: false },
          error: { ...get().error, agenda: null },
        });
      } else {
        throw new Error('Agenda not found');
      }
    } catch (error: any) {
      console.error('Error loading agenda:', error);
      set({
        loading: { ...get().loading, agenda: false },
        error: { ...get().error, agenda: error.message || 'Failed to load agenda' },
      });
    }
  },
  
  loadRegistrants: async () => {
    if (get().registrants.length > 0) return; // Already loaded
    
    set({ loading: { ...get().loading, registrants: true }, error: { ...get().error, registrants: null } });
    
    try {
      const response = await graphqlClient.graphql({
        query: getAPSWithRegistrants,
        variables: { id: get().apsId, limit: 1000 },
      });
      
      const data = response.data as { getAPS?: { Registrants?: { items: ApsRegistrant[] } } };
      
      if (data.getAPS?.Registrants?.items) {
        set({
          registrants: data.getAPS.Registrants.items,
          loading: { ...get().loading, registrants: false },
          error: { ...get().error, registrants: null },
        });
      } else {
        set({
          registrants: [],
          loading: { ...get().loading, registrants: false },
          error: { ...get().error, registrants: null },
        });
      }
    } catch (error: any) {
      console.error('Error loading registrants:', error);
      set({
        loading: { ...get().loading, registrants: false },
        error: { ...get().error, registrants: error.message || 'Failed to load registrants' },
      });
    }
  },
  
  loadSpeakers: async () => {
    if (get().speakers.length > 0) return; // Already loaded
    
    if (!get().basicInfo) {
      await get().loadBasicInfo();
    }
    
    set({ loading: { ...get().loading, speakers: true }, error: { ...get().error, speakers: null } });
    
    try {
      const response = await graphqlClient.graphql({
        query: getAPSWithSpeakers,
        variables: { id: get().apsId, eventId: get().apsId },
      });
      
      const data = response.data as { aPSSpeakersByEventId?: { items: APSSpeaker[] } };
      
      if (data.aPSSpeakersByEventId?.items) {
        set({
          speakers: data.aPSSpeakersByEventId.items,
          loading: { ...get().loading, speakers: false },
          error: { ...get().error, speakers: null },
        });
      } else {
        set({
          speakers: [],
          loading: { ...get().loading, speakers: false },
          error: { ...get().error, speakers: null },
        });
      }
    } catch (error: any) {
      console.error('Error loading speakers:', error);
      set({
        loading: { ...get().loading, speakers: false },
        error: { ...get().error, speakers: error.message || 'Failed to load speakers' },
      });
    }
  },
  
  loadExhibitors: async () => {
    if (get().exhibitors.length > 0) return; // Already loaded
    
    if (!get().basicInfo) {
      await get().loadBasicInfo();
    }
    
    set({ loading: { ...get().loading, exhibitors: true }, error: { ...get().error, exhibitors: null } });
    
    try {
      const response = await graphqlClient.graphql({
        query: getAPSWithExhibitors,
        variables: { id: get().apsId, eventId: get().apsId },
      });
      
      const data = response.data as { apsAppExhibitorProfilesByEventId?: { items: ApsAppExhibitorProfile[] } };
      
      if (data.apsAppExhibitorProfilesByEventId?.items) {
        set({
          exhibitors: data.apsAppExhibitorProfilesByEventId.items,
          loading: { ...get().loading, exhibitors: false },
          error: { ...get().error, exhibitors: null },
        });
      } else {
        set({
          exhibitors: [],
          loading: { ...get().loading, exhibitors: false },
          error: { ...get().error, exhibitors: null },
        });
      }
    } catch (error: any) {
      console.error('Error loading exhibitors:', error);
      set({
        loading: { ...get().loading, exhibitors: false },
        error: { ...get().error, exhibitors: error.message || 'Failed to load exhibitors' },
      });
    }
  },
  
  loadAddOns: async () => {
    if (get().addOns.length > 0) return; // Already loaded
    
    if (!get().basicInfo) {
      await get().loadBasicInfo();
    }
    
    set({ loading: { ...get().loading, addOns: true }, error: { ...get().error, addOns: null } });
    
    try {
      const response = await graphqlClient.graphql({
        query: getAPSWithAddOns,
        variables: { id: get().apsId, eventId: get().apsId },
      });
      
      const data = response.data as { apsAddOnsByEventId?: { items: ApsAddOn[] } };
      
      if (data.apsAddOnsByEventId?.items) {
        set({
          addOns: data.apsAddOnsByEventId.items,
          loading: { ...get().loading, addOns: false },
          error: { ...get().error, addOns: null },
        });
      } else {
        set({
          addOns: [],
          loading: { ...get().loading, addOns: false },
          error: { ...get().error, addOns: null },
        });
      }
    } catch (error: any) {
      console.error('Error loading add-ons:', error);
      set({
        loading: { ...get().loading, addOns: false },
        error: { ...get().error, addOns: error.message || 'Failed to load add-ons' },
      });
    }
  },
  
  reset: () => {
    set(initialState);
  },
  
  refreshProfile: async () => {
    const current = get().currentAppUser;
    if (!current?.registrantId) {
      console.log('⚠️ Cannot refresh profile: no current app user or registrantId');
      return;
    }

    try {
      const appUserResponse = await graphqlClient.graphql({
        query: getAppUserByRegistrantId,
        variables: {
          registrantId: current.registrantId,
        },
      });

      const appUserData = appUserResponse.data as {
        apsAppUsersByRegistrantId?: {
          items: ApsAppUser[];
        };
      };

      let refreshed = appUserData.apsAppUsersByRegistrantId?.items?.[0] || null;

      if (refreshed && !refreshed.profile) {
        console.log('⚠️ Refresh: profile missing, fetching separately by userId...');
        try {
          const profileResponse = await graphqlClient.graphql({
            query: apsAppUserProfilesByUserId,
            variables: { userId: refreshed.id, limit: 1 },
          });

          const profileData = profileResponse.data as {
            apsAppUserProfilesByUserId?: {
              items: Array<APITypes.ApsAppUserProfile | null>;
            };
          };

          const profiles =
            profileData.apsAppUserProfilesByUserId?.items?.filter((p) => p !== null) as
              | APITypes.ApsAppUserProfile[]
              | undefined;

          if (profiles && profiles.length > 0) {
            refreshed = { ...refreshed, profile: profiles[0] };
          } else {
            console.log('❌ Refresh: profile not found even with separate query');
          }
        } catch (error) {
          console.error('Error fetching profile during refresh:', error);
        }
      }

      // Ensure profile relations are hydrated
      if (refreshed?.profile) {
        refreshed = {
          ...refreshed,
          profile: await get().hydrateProfileRelations(refreshed.profile),
        };
      }

      if (refreshed) {
        set({
          currentAppUser: refreshed,
          loading: { ...get().loading, currentAppUser: false },
          error: { ...get().error, currentAppUser: null },
        });
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  },
}));

