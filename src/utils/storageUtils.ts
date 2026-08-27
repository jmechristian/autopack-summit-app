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
    const normalizedKey = normalizeAmplifyPublicKey(key);
    if (!normalizedKey) {
      throw new Error('Missing profile picture key');
    }
    return await getAmplifyPublicUrl(normalizedKey);
  } catch (error) {
    console.error('Error getting profile picture URL:', error);
    throw new Error('Failed to get profile picture URL.');
  }
}

function normalizeAmplifyPublicKey(input: string): string {
  let value = (input || '').trim();
  if (!value) return '';

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const path = parsed.pathname || '';
      // Amplify public assets are exposed under /public/<key>.
      const publicIndex = path.indexOf('/public/');
      if (publicIndex >= 0) {
        value = path.slice(publicIndex + '/public/'.length);
      } else {
        value = path.replace(/^\/+/, '');
      }
    } catch {
      return '';
    }
  }

  if (value.startsWith('s3://')) {
    const withoutScheme = value.slice('s3://'.length);
    const slashIndex = withoutScheme.indexOf('/');
    value = slashIndex >= 0 ? withoutScheme.slice(slashIndex + 1) : '';
  }

  value = value.replace(/^\/+/, '');
  if (value.startsWith('public/')) {
    value = value.slice('public/'.length);
  }

  return value;
}

async function getAmplifyPublicUrl(key: string, expiresIn = 3600): Promise<string> {
  const { getUrl } = await import('aws-amplify/storage');
  const urlResult = await getUrl({
    key,
    options: {
      accessLevel: 'public',
      expiresIn,
    },
  });
  return urlResult.url.toString();
}

/**
 * Resolve profile picture reference from DB to a loadable image URI.
 * Handles full URLs, signed URLs, and S3 object keys.
 */
export async function resolveProfilePictureUri(
  storedValue?: string | null
): Promise<string | null> {
  const value = (storedValue || '').trim();
  if (!value) return null;

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('file://') ||
    value.startsWith('content://')
  ) {
    return value;
  }

  try {
    return await getProfilePictureUrl(value);
  } catch (error) {
    console.warn('Unable to resolve profile picture URI from value:', value, error);
    return null;
  }
}

/**
 * Upload resume PDF to S3.
 * Stores the object key (not a signed URL) so the file stays readable.
 * @param fileUri - URI of the PDF file (from expo-document-picker)
 * @returns Promise<string> - S3 key (path) of uploaded PDF
 */
export async function uploadResume(fileUri: string): Promise<string> {
  try {
    const user = await getCurrentUser();
    const userId = user.userId;

    const response = await fetch(fileUri);
    const blob = await response.blob();

    if (blob.size > MAX_RESUME_SIZE) {
      throw new Error('Resume file size exceeds 10MB limit. Please choose a smaller file.');
    }

    const mime = String(blob.type || '').toLowerCase();
    const looksPdf =
      mime === 'application/pdf' ||
      mime === 'application/x-pdf' ||
      fileUri.toLowerCase().split('?')[0].endsWith('.pdf');
    if (!looksPdf) {
      throw new Error('Only PDF files are allowed for resumes.');
    }

    const timestamp = Date.now();
    const filename = `resumes/${userId}-${timestamp}.pdf`;

    await uploadData({
      key: filename,
      data: blob,
      options: {
        contentType: 'application/pdf',
        contentDisposition: 'inline',
        accessLevel: 'public',
      },
    }).result;

    return filename;
  } catch (error) {
    console.error('Error uploading resume:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to upload resume. Please try again.');
  }
}

/**
 * Resolve a stored resume key or expired signed URL to a fresh readable URL.
 */
export async function resolveResumeUri(storedValue?: string | null): Promise<string | null> {
  const value = (storedValue || '').trim();
  if (!value) return null;
  if (value.startsWith('file://') || value.startsWith('content://')) return value;

  const key = normalizeAmplifyPublicKey(value);
  if (!key) return null;

  try {
    return await getAmplifyPublicUrl(key);
  } catch (error) {
    console.warn('Unable to resolve resume URI from value:', value, error);
    return null;
  }
}

/**
 * Upload a feedback attachment image to S3.
 * @returns S3 key (path) to store on the feedback record
 */
export async function uploadFeedbackImage(fileUri: string): Promise<string> {
  try {
    const user = await getCurrentUser();
    const userId = user.userId;
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const extension = (fileUri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension)
      ? extension
      : 'jpg';
    const filename = `feedback/${userId}-${timestamp}-${rand}.${safeExt}`;

    const response = await fetch(fileUri);
    const blob = await response.blob();

    await uploadData({
      key: filename,
      data: blob,
      options: {
        contentType: blob.type || 'image/jpeg',
        accessLevel: 'public',
      },
    }).result;

    return filename;
  } catch (error) {
    console.error('Error uploading feedback image:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
}

const MAX_EXHIBITOR_HANDOUT_SIZE = 15 * 1024 * 1024; // 15MB

/**
 * Upload an exhibitor logo, photo, or handout to S3.
 * @returns S3 key (path) to store on the company/exhibitor record
 */
export async function uploadExhibitorAsset(params: {
  fileUri: string;
  companyId: string;
  kind: 'logo' | 'photo' | 'handout';
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<string> {
  try {
    const companyId = (params.companyId || '').trim();
    if (!companyId) throw new Error('Missing company id for upload.');

    const response = await fetch(params.fileUri);
    const blob = await response.blob();

    const fromName = (params.fileName || '').split('.').pop();
    const fromUri = (params.fileUri.split('.').pop() || '').split('?')[0];
    const extension = (fromName || fromUri || 'bin').toLowerCase();
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const filename = `exhibitors/${companyId}/${params.kind}/${timestamp}-${rand}.${extension}`;

    let contentType = params.mimeType || blob.type || undefined;
    if (params.kind === 'handout') {
      if (blob.size > MAX_EXHIBITOR_HANDOUT_SIZE) {
        throw new Error('Handout must be 15MB or smaller.');
      }
      contentType = contentType || 'application/pdf';
    } else {
      contentType = contentType || 'image/jpeg';
    }

    await uploadData({
      key: filename,
      data: blob,
      options: {
        contentType,
        accessLevel: 'public',
      },
    }).result;

    return filename;
  } catch (error) {
    console.error('Error uploading exhibitor asset:', error);
    if (error instanceof Error) throw error;
    throw new Error('Failed to upload file. Please try again.');
  }
}

