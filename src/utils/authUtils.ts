// src/utils/authUtils.ts
import { getCurrentUser, fetchUserAttributes, signOut as amplifySignOut } from 'aws-amplify/auth';

/**
 * Get the current authenticated user's email
 * @returns The user's email or null if not authenticated
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    
    // Fetch user attributes to get the email
    const attributes = await fetchUserAttributes();
    const email = attributes.email || attributes['custom:email'] || user.username;
    
    console.log('👤 User info:', {
      username: user.username,
      userId: user.userId,
      email: email,
      allAttributes: attributes,
    });
    
    // Return email if found, otherwise fall back to username (might be email in some cases)
    return email || user.username || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await amplifySignOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

