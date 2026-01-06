// src/utils/storageUtils.ts
import { uploadData } from 'aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';

const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const STORAGE_BUCKET = 'apsapp';

/**
 * Upload profile picture to S3
 * @param fileUri - URI of the image file (from expo-image-picker)
 * @returns Promise<string> - S3 key (path) of uploaded image (store this, not the URL)
 */
export async function uploadProfilePicture(fileUri: string): Promise<string> {
  try {
    const user = await getCurrentUser();
    const userId = user.userId;
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = fileUri.split('.').pop() || 'jpg';
    const filename = `profile-pictures/${userId}-${timestamp}.${extension}`;
    
    // Read file as blob
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // Upload to S3
    const result = await uploadData({
      key: filename,
      data: blob,
      options: {
        contentType: blob.type || 'image/jpeg',
        accessLevel: 'public',
      },
    }).result;
    
    // Return just the key (path), not the signed URL
    // This way we can generate fresh signed URLs when needed
    return filename;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw new Error('Failed to upload profile picture. Please try again.');
  }
}

/**
 * Get a fresh signed URL for a profile picture from its S3 key
 * @param key - S3 key (path) of the image
 * @returns Promise<string> - Fresh signed URL
 */
export async function getProfilePictureUrl(key: string): Promise<string> {
  try {
    const { getUrl } = await import('aws-amplify/storage');
    const urlResult = await getUrl({
      key: key,
      options: {
        accessLevel: 'public',
        expiresIn: 3600, // 1 hour expiration
      },
    });
    return urlResult.url.toString();
  } catch (error) {
    console.error('Error getting profile picture URL:', error);
    throw new Error('Failed to get profile picture URL.');
  }
}

/**
 * Upload resume PDF to S3
 * @param fileUri - URI of the PDF file (from expo-document-picker)
 * @returns Promise<string> - Public URL of uploaded PDF
 */
export async function uploadResume(fileUri: string): Promise<string> {
  try {
    const user = await getCurrentUser();
    const userId = user.userId;
    
    // Read file to check size
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // Validate file size (10MB limit)
    if (blob.size > MAX_RESUME_SIZE) {
      throw new Error('Resume file size exceeds 10MB limit. Please choose a smaller file.');
    }
    
    // Validate file type
    if (blob.type !== 'application/pdf') {
      throw new Error('Only PDF files are allowed for resumes.');
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `resumes/${userId}-${timestamp}.pdf`;
    
    // Upload to S3
    const result = await uploadData({
      key: filename,
      data: blob,
      options: {
        contentType: 'application/pdf',
        accessLevel: 'public',
      },
    }).result;
    
    // Get the public URL
    const { getUrl } = await import('aws-amplify/storage');
    const urlResult = await getUrl({
      key: filename,
      options: {
        accessLevel: 'public',
      },
    });
    
    return urlResult.url.toString();
  } catch (error) {
    console.error('Error uploading resume:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload resume. Please try again.');
  }
}

