// src/utils/linkedInAuth.ts
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const LINKEDIN_CLIENT_ID = '777zbuyll96931';
const LINKEDIN_TOKEN_ENDPOINT = 'https://aps-app-admin.vercel.app/api/linkedin/token';
// Use HTTPS redirect URI for LinkedIn (they require it)
const REDIRECT_URI = 'https://aps-app-admin.vercel.app/api/linkedin/callback';
// Deep link that the app will intercept
const DEEP_LINK_URI = 'autopacksummitapp://redirect';

// LinkedIn API scopes
const SCOPES = ['openid', 'profile', 'email'];

export interface LinkedInProfile {
  id: string;
  firstName: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
  lastName: {
    localized: { [key: string]: string };
    preferredLocale: { country: string; language: string };
  };
  profilePicture?: {
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
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE() {
  // Generate a random code verifier (43-128 characters, URL-safe)
  // Create a long random string and encode it
  const randomBytes = [];
  for (let i = 0; i < 32; i++) {
    randomBytes.push(Math.floor(Math.random() * 256));
  }
  
  // Convert to base64url format manually
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let codeVerifier = '';
  for (let i = 0; i < 43; i++) {
    codeVerifier += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Hash the verifier to create the challenge
  const codeChallenge = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64URL }
  );

  return { codeVerifier, codeChallenge };
}

/**
 * Initiate LinkedIn OAuth flow
 */
export async function initiateLinkedInAuth(): Promise<{
  code: string;
  codeVerifier: string;
} | null> {
  try {
    const { codeVerifier, codeChallenge } = await generatePKCE();
    const state = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Date.now().toString(),
      { encoding: Crypto.CryptoEncoding.BASE64URL }
    );

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${LINKEDIN_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `state=${state}&` +
      `scope=${encodeURIComponent(SCOPES.join(' '))}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`;

    // Use AuthSession to open browser and handle redirect
    // The callback URL will redirect to the deep link, which AuthSession will intercept
    const result = await AuthSession.startAsync({
      authUrl,
      returnUrl: DEEP_LINK_URI,
    });

    if (result.type === 'success' && result.params?.code) {
      return {
        code: result.params.code as string,
        codeVerifier,
      };
    }

    if (result.type === 'dismiss') {
      return null; // User cancelled
    }

    console.error('LinkedIn auth failed:', result);
    return null;
  } catch (error) {
    console.error('LinkedIn auth error:', error);
    throw error;
  }
}

/**
 * Exchange authorization code for access token via backend
 */
export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string
): Promise<string> {
  try {
    const response = await fetch(LINKEDIN_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirectUri: REDIRECT_URI,
        codeVerifier,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to exchange code for token');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
}

/**
 * Fetch LinkedIn profile data
 */
export async function fetchLinkedInProfile(accessToken: string): Promise<{
  profile: LinkedInProfile;
  email: string | null;
}> {
  try {
    // Fetch profile
    const profileResponse = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,headline,profilePicture(displayImage~:playableStreams))',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch LinkedIn profile');
    }

    const profile: LinkedInProfile = await profileResponse.json();

    // Fetch email
    let email: string | null = null;
    try {
      const emailResponse = await fetch(
        'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (emailResponse.ok) {
        const emailData: LinkedInEmail = await emailResponse.json();
        email = emailData.elements?.[0]?.['handle~']?.emailAddress || null;
      }
    } catch (emailError) {
      console.warn('Failed to fetch email, continuing without it:', emailError);
    }

    return { profile, email };
  } catch (error) {
    console.error('LinkedIn profile fetch error:', error);
    throw error;
  }
}

/**
 * Map LinkedIn profile to our profile format
 */
export function mapLinkedInToProfile(
  linkedInData: { profile: LinkedInProfile; email: string | null }
): {
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  bio?: string;
} {
  const { profile, email } = linkedInData;
  
  const firstName = profile.firstName?.localized?.[Object.keys(profile.firstName.localized)[0]] || 
                   profile.firstName?.localized?.[`${profile.firstName.preferredLocale?.language}_${profile.firstName.preferredLocale?.country}`];
  const lastName = profile.lastName?.localized?.[Object.keys(profile.lastName.localized)[0]] || 
                  profile.lastName?.localized?.[`${profile.lastName.preferredLocale?.language}_${profile.lastName.preferredLocale?.country}`];
  
  return {
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: email || undefined,
    profilePicture: profile.profilePicture?.displayImage || undefined,
    bio: profile.headline || undefined,
  };
}

