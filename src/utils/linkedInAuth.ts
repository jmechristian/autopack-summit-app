// src/utils/linkedInAuth.ts
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LINKEDIN_CLIENT_ID = '777zbuyll96931';
const LINKEDIN_TOKEN_ENDPOINT = 'https://aps-app-admin.vercel.app/api/linkedin/token';
// Use HTTPS redirect URI for LinkedIn (they require it)
const REDIRECT_URI = 'https://aps-app-admin.vercel.app/api/linkedin/callback';
// Deep link that the app will intercept
const DEEP_LINK_URI = 'autopacksummitapp://redirect';

// LinkedIn API scopes
const SCOPES = ['openid', 'profile', 'email'];

// Storage keys
const CODE_VERIFIER_KEY = '@linkedin_oauth_code_verifier';
const OAUTH_CODE_KEY = '@linkedin_oauth_code';
const OAUTH_ERROR_KEY = '@linkedin_oauth_error';

// Global callback for OAuth completion
let oauthCompletionCallback: ((code: string | null, codeVerifier: string | null) => void) | null = null;

export interface LinkedInProfile {
  id: string;
  // Old LinkedIn API format
  firstName?: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
  lastName?: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
  // OpenID Connect userinfo format (simpler)
  localizedFirstName?: string;
  localizedLastName?: string;
  profilePicture?: string | {
    displayImage?: string;
  };
  headline?: string;
}

export interface LinkedInEmail {
  elements: Array<{
    'handle~': {
      emailAddress: string;
    };
  }>;
}

/**
 * Convert base64 to base64url format
 */
function base64ToBase64Url(base64: string): string {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE() {
  // Generate a random code verifier (43-128 characters, URL-safe)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let codeVerifier = '';
  for (let i = 0; i < 43; i++) {
    codeVerifier += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Hash the verifier to create the challenge
  // expo-crypto only supports HEX and BASE64, so we use BASE64 and convert to base64url
  const codeChallengeBase64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  
  // Convert base64 to base64url format
  const codeChallenge = base64ToBase64Url(codeChallengeBase64);

  return { codeVerifier, codeChallenge };
}

/**
 * Initiate LinkedIn OAuth flow (standard 3-legged OAuth, no PKCE)
 */
export async function initiateLinkedInAuth(): Promise<{
  code: string;
} | null> {
  console.log('🚀 STARTING LinkedIn OAuth flow (standard 3-legged)');
  try {
    // Generate state for CSRF protection
    const stateBase64 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Date.now().toString(),
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    const state = base64ToBase64Url(stateBase64);

    console.log('📝 Step 1: Building authorization URL (no PKCE)...');
    // Standard LinkedIn OAuth - no PKCE params
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${LINKEDIN_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `state=${state}&` +
      `scope=${encodeURIComponent(SCOPES.join(' '))}`;
    
    console.log('🔗 Authorization URL redirect_uri (raw):', REDIRECT_URI);
    console.log('🔗 Authorization URL redirect_uri (encoded):', encodeURIComponent(REDIRECT_URI));
    console.log('🔗 Authorization URL redirect_uri (length):', REDIRECT_URI.length);
    console.log('🔗 Full Authorization URL:', authUrl.substring(0, 200) + '...');
    console.log('📋 IMPORTANT: This redirect_uri must match EXACTLY in token exchange:', REDIRECT_URI);

    // Set up completion callback (no PKCE, just code)
    const completionPromise = new Promise<{ code: string } | null>((resolve) => {
      oauthCompletionCallback = (code: string | null, verifier: string | null) => {
        oauthCompletionCallback = null;
        if (code) {
          resolve({ code });
        } else {
          resolve(null);
        }
      };
    });

    // Check for initial deep link URL (in case app was opened via deep link)
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl && initialUrl.startsWith(DEEP_LINK_URI)) {
      const urlObj = new URL(initialUrl);
      const code = urlObj.searchParams.get('code');
      if (code) {
        return { code };
      }
    }

    // Set up deep link listener before opening browser
    const linkingPromise = new Promise<{ code: string | null; cancelled: boolean }>((resolve) => {
      let resolved = false;
      
      const subscription = Linking.addEventListener('url', (event) => {
        if (resolved) return;
        
        const url = event.url;
        console.log('Deep link received:', url);
        
        if (url.startsWith(DEEP_LINK_URI)) {
          resolved = true;
          subscription.remove();
          
          try {
            // Parse the deep link URL
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            const error = urlObj.searchParams.get('error');
            
            if (error) {
              console.log('OAuth error:', error);
              resolve({ code: null, cancelled: true });
            } else if (code) {
              // Close browser when we get the code via linking event (fire and forget)
              WebBrowser.dismissBrowser().catch((e) => {
                console.log('Browser already closed or error closing:', e);
              });
              resolve({ code, cancelled: false });
            } else {
              resolve({ code: null, cancelled: true });
            }
          } catch (parseError) {
            console.error('Error parsing deep link:', parseError);
            resolve({ code: null, cancelled: true });
          }
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          subscription.remove();
          resolve({ code: null, cancelled: true });
        }
      }, 5 * 60 * 1000);
    });

    // Also poll AsyncStorage for the code (fallback if callback doesn't work)
    // Start polling BEFORE opening browser so we catch it immediately
    const storagePollPromise = new Promise<{ code: string | null; cancelled: boolean }>(async (resolve) => {
      // Check immediately first (in case code was already stored)
      const initialCode = await AsyncStorage.getItem(OAUTH_CODE_KEY);
      const initialError = await AsyncStorage.getItem(OAUTH_ERROR_KEY);
      
      if (initialError) {
        await AsyncStorage.removeItem(OAUTH_ERROR_KEY);
        try {
          await WebBrowser.dismissBrowser();
        } catch (e) {}
        resolve({ code: null, cancelled: true });
        return;
      }
      
      if (initialCode) {
        await AsyncStorage.removeItem(OAUTH_CODE_KEY);
        console.log('✅ Retrieved OAuth code from AsyncStorage (immediate check)');
        try {
          await WebBrowser.dismissBrowser();
        } catch (e) {}
        resolve({ code: initialCode, cancelled: false });
        return;
      }
      
      let pollCount = 0;
      const maxPolls = 120; // Poll for up to 60 seconds (500ms intervals)
      
      const pollInterval = setInterval(async () => {
        pollCount++;
        const storedCode = await AsyncStorage.getItem(OAUTH_CODE_KEY);
        const storedError = await AsyncStorage.getItem(OAUTH_ERROR_KEY);
        
        if (storedError) {
          clearInterval(pollInterval);
          await AsyncStorage.removeItem(OAUTH_ERROR_KEY);
          // Close browser if still open
          try {
            await WebBrowser.dismissBrowser();
          } catch (e) {}
          resolve({ code: null, cancelled: true });
        } else if (storedCode) {
          clearInterval(pollInterval);
          await AsyncStorage.removeItem(OAUTH_CODE_KEY);
          console.log('✅ Retrieved OAuth code from AsyncStorage (polling, poll #' + pollCount + ')');
          // Close browser immediately when we get the code
          try {
            await WebBrowser.dismissBrowser();
            console.log('✅ Browser dismissed successfully');
          } catch (e) {
            console.log('⚠️ Browser already closed or error closing:', e);
          }
          resolve({ code: storedCode, cancelled: false });
        } else if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          // Close browser on timeout
          try {
            await WebBrowser.dismissBrowser();
          } catch (e) {}
          resolve({ code: null, cancelled: true });
        }
      }, 500);
    });

    // Open browser with auth URL
    // The callback will redirect to our HTTPS endpoint, which then redirects to the deep link
    const browserResult = await WebBrowser.openBrowserAsync(authUrl, {
      showInRecents: false,
    });

    // If user dismissed the browser immediately, cancel
    if (browserResult.type === 'cancel') {
      return null;
    }

    // Wait for either the linking event, completion callback, or storage poll
    const linkingResult = await Promise.race([
      linkingPromise.then(async (result) => {
        // Close browser when linking promise resolves
        try {
          await WebBrowser.dismissBrowser();
        } catch (e) {}
        return result;
      }),
      completionPromise.then(async (result) => {
        // Close browser when completion promise resolves
        try {
          await WebBrowser.dismissBrowser();
        } catch (e) {}
        return result ? { code: result.code, cancelled: false } : { code: null, cancelled: true };
      }),
      storagePollPromise, // This already closes the browser
    ]);

    // Try to close browser if it's still open (safe to call even if already closed)
    try {
      await WebBrowser.dismissBrowser();
    } catch (e) {
      // Browser might already be closed, ignore
    }

    // Clean up stored values
    await AsyncStorage.multiRemove([OAUTH_CODE_KEY, OAUTH_ERROR_KEY]);

    if (linkingResult.cancelled || !linkingResult.code) {
      return null; // User cancelled or error occurred
    }

    return {
      code: linkingResult.code,
    };
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    throw error;
  }
}

/**
 * Exchange authorization code for access token via backend (standard OAuth, no PKCE)
 */
export async function exchangeCodeForToken(
  code: string
): Promise<string> {
  try {
    const requestBody = {
      code,
      redirectUri: REDIRECT_URI,
    };
    
    console.log('🔄 Exchanging code for token (standard OAuth, no PKCE):');
    console.log('  Code length:', code.length);
    console.log('  Redirect URI being sent:', REDIRECT_URI);
    console.log('  Redirect URI length:', REDIRECT_URI.length);
    console.log('  ⚠️  CRITICAL: redirect_uri must match authorization request exactly!');
    
    const response = await fetch(LINKEDIN_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed - Status:', response.status);
      console.error('Token exchange failed - Response:', errorText);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText || 'Unknown error' };
      }
      
      throw new Error(error.error || error.message || 'Failed to exchange code for token');
    }

    const data = await response.json();
    console.log('🔑 Token response includes id_token:', !!data.id_token);
    if (data.id_token) {
      // Decode ID token (it's a JWT) to see what claims it contains
      try {
        const idTokenParts = data.id_token.split('.');
        if (idTokenParts.length === 3) {
          // Decode base64url (JWT uses base64url, not base64)
          const base64Url = idTokenParts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          console.log('\n🔑 ========== ID TOKEN PAYLOAD ==========');
          console.log(JSON.stringify(payload, null, 2));
          console.log('🔑 ======================================\n');
        }
      } catch (e) {
        console.warn('Could not decode ID token:', e);
      }
    }
    return data.access_token;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
}

/**
 * Fetch LinkedIn profile data using OpenID Connect userinfo endpoint
 * Also attempts to fetch positions and education if permissions allow
 */
export async function fetchLinkedInProfile(accessToken: string): Promise<{
  profile: LinkedInProfile;
  email: string | null;
  positions?: Array<{
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    fieldOfStudy?: string;
  }>;
}> {
  try {
    console.log('📡 Fetching LinkedIn profile from /v2/userinfo...');
    
    // Use OpenID Connect userinfo endpoint (includes email, name, picture)
    const userinfoResponse = await fetch(
      'https://api.linkedin.com/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log('📡 Userinfo response status:', userinfoResponse.status);

    if (!userinfoResponse.ok) {
      const errorText = await userinfoResponse.text();
      console.error('📡 Userinfo error response:', errorText);
      throw new Error(`Failed to fetch LinkedIn profile: ${userinfoResponse.status} ${errorText}`);
    }

    const userinfo = await userinfoResponse.json();
    console.log('\n📡 ========== LINKEDIN USERINFO RESPONSE ==========');
    console.log(JSON.stringify(userinfo, null, 2));
    console.log('📡 ================================================\n');

    // Map OpenID Connect userinfo to our LinkedInProfile format
    const profile: LinkedInProfile = {
      id: userinfo.sub,
      localizedFirstName: userinfo.given_name || '',
      localizedLastName: userinfo.family_name || '',
      headline: '', // Not available in userinfo
      profilePicture: userinfo.picture || undefined, // Direct URL string from OpenID Connect
    };

    const email = userinfo.email || null;

    // Try to fetch positions (work experience) - may fail if permissions not granted
    let positions: Array<{
      company: string;
      title: string;
      startDate?: string;
      endDate?: string;
    }> | undefined;
    
    try {
      console.log('📡 Attempting to fetch positions...');
      const positionsResponse = await fetch(
        'https://api.linkedin.com/v2/me?projection=(id,positions(company,title,timePeriod))',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (positionsResponse.ok) {
        const positionsData = await positionsResponse.json();
        console.log('\n📡 ========== LINKEDIN POSITIONS RESPONSE ==========');
        console.log(JSON.stringify(positionsData, null, 2));
        console.log('📡 ================================================\n');
        
        if (positionsData.positions?.elements) {
          positions = positionsData.positions.elements.map((pos: any) => ({
            company: pos.company?.name || '',
            title: pos.title || '',
            startDate: pos.timePeriod?.startDate ? 
              `${pos.timePeriod.startDate.year}-${String(pos.timePeriod.startDate.month || 1).padStart(2, '0')}` : undefined,
            endDate: pos.timePeriod?.endDate ? 
              `${pos.timePeriod.endDate.year}-${String(pos.timePeriod.endDate.month || 1).padStart(2, '0')}` : 
              pos.timePeriod?.endDate === null ? undefined : undefined,
          }));
          console.log('📡 Mapped positions:', JSON.stringify(positions, null, 2));
        }
      } else {
        const errorText = await positionsResponse.text();
        console.warn('\n⚠️ ========== POSITIONS REQUEST FAILED ==========');
        console.warn('Status:', positionsResponse.status);
        console.warn('Response:', errorText);
        console.warn('⚠️ ============================================\n');
      }
    } catch (positionsError) {
      console.warn('⚠️ Error fetching positions (may require additional permissions):', positionsError);
    }

    // Try to fetch education - may fail if permissions not granted
    let education: Array<{
      school: string;
      degree?: string;
      fieldOfStudy?: string;
    }> | undefined;
    
    try {
      console.log('📡 Attempting to fetch education...');
      const educationResponse = await fetch(
        'https://api.linkedin.com/v2/me?projection=(id,educations(schoolName,degreeName,fieldOfStudy,timePeriod))',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (educationResponse.ok) {
        const educationData = await educationResponse.json();
        console.log('\n📡 ========== LINKEDIN EDUCATION RESPONSE ==========');
        console.log(JSON.stringify(educationData, null, 2));
        console.log('📡 ================================================\n');
        
        if (educationData.educations?.elements) {
          education = educationData.educations.elements.map((edu: any) => ({
            school: edu.schoolName || '',
            degree: edu.degreeName || undefined,
            fieldOfStudy: edu.fieldOfStudy || undefined,
          }));
          console.log('📡 Mapped education:', JSON.stringify(education, null, 2));
        }
      } else {
        const errorText = await educationResponse.text();
        console.warn('\n⚠️ ========== EDUCATION REQUEST FAILED ==========');
        console.warn('Status:', educationResponse.status);
        console.warn('Response:', errorText);
        console.warn('⚠️ ============================================\n');
      }
    } catch (educationError) {
      console.warn('⚠️ Error fetching education (may require additional permissions):', educationError);
    }

    // Final summary
    console.log('\n✅ ========== LINKEDIN DATA SUMMARY ==========');
    console.log('Profile:', JSON.stringify(profile, null, 2));
    console.log('Email:', email);
    console.log('Positions count:', positions?.length || 0);
    if (positions && positions.length > 0) {
      console.log('Positions:', JSON.stringify(positions, null, 2));
    }
    console.log('Education count:', education?.length || 0);
    if (education && education.length > 0) {
      console.log('Education:', JSON.stringify(education, null, 2));
    }
    console.log('✅ ===========================================\n');

    return { profile, email, positions, education };
  } catch (error) {
    console.error('LinkedIn profile fetch error:', error);
    throw error;
  }
}

/**
 * Map LinkedIn profile to our profile format
 */
export function mapLinkedInToProfile(
  linkedInData: { 
    profile: LinkedInProfile; 
    email: string | null;
    positions?: Array<{
      company: string;
      title: string;
      startDate?: string;
      endDate?: string;
    }>;
    education?: Array<{
      school: string;
      degree?: string;
      fieldOfStudy?: string;
    }>;
  }
): {
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  bio?: string;
  positions?: Array<{
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
  }>;
  education?: Array<{
    school: string;
    degree?: string;
    fieldOfStudy?: string;
  }>;
} {
  const { profile, email, positions, education } = linkedInData;
  
  // OpenID Connect userinfo format uses localizedFirstName/localizedLastName directly
  // (we set these in fetchLinkedInProfile from given_name/family_name)
  const firstName = profile.localizedFirstName || undefined;
  const lastName = profile.localizedLastName || undefined;
  
  // Profile picture from OpenID Connect is a direct URL string
  const profilePicture = typeof profile.profilePicture === 'string' 
    ? profile.profilePicture 
    : profile.profilePicture?.displayImage || undefined;
  
  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: email || undefined,
    profilePicture: profilePicture || undefined,
    bio: profile.headline || undefined,
    positions: positions || undefined,
    education: education || undefined,
  };
}

/**
 * Handle OAuth redirect from deep link
 * This should be called from the redirect route
 */
export async function handleLinkedInRedirect(url: string): Promise<boolean> {
  try {
    if (!url.startsWith(DEEP_LINK_URI)) {
      return false;
    }

    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const error = urlObj.searchParams.get('error');

    if (error) {
      console.error('LinkedIn OAuth error:', error);
      await AsyncStorage.setItem(OAUTH_ERROR_KEY, error);
      if (oauthCompletionCallback) {
        oauthCompletionCallback(null, null); // Trigger cancellation
      }
      return false;
    }

    if (!code) {
      console.error('No code in redirect URL');
      if (oauthCompletionCallback) {
        oauthCompletionCallback(null, null); // Trigger cancellation
      }
      return false;
    }

    // Store code in AsyncStorage as backup (in case callback isn't set up yet)
    await AsyncStorage.setItem(OAUTH_CODE_KEY, code);
    console.log('✅ Stored OAuth code in AsyncStorage');

    // Trigger completion callback if it exists (no PKCE, just code)
    if (oauthCompletionCallback) {
      console.log('✅ Triggering OAuth completion callback');
      oauthCompletionCallback(code, null); // No codeVerifier needed
      return true;
    } else {
      console.log('⚠️ OAuth completion callback not set up yet, code stored in AsyncStorage');
      return true; // Still return true since we stored it
    }
  } catch (error) {
    console.error('Error handling LinkedIn redirect:', error);
    return false;
  }
}

