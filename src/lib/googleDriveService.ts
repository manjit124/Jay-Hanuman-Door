import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getClientAuth } from './firestoreClient.ts';

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
];

// In-memory access token cache (Strict security compliance: never store in localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;
let cachedDriveUser: User | null = null;
let isDriveSigningIn = false;

// Initialize auth state listener to clear token on sign-out
if (typeof window !== 'undefined') {
  const auth = getClientAuth();
  if (auth) {
    onAuthStateChanged(auth, (user) => {
      cachedDriveUser = user;
      if (!user) {
        inMemoryAccessToken = null;
      }
    });
  }
}

/**
 * Ensures a valid Google Drive OAuth Access Token in memory.
 * Prompts user with Google Sign-In popup if token is missing.
 */
export async function getDriveAccessToken(): Promise<{ token: string; user: User }> {
  if (inMemoryAccessToken && cachedDriveUser) {
    return { token: inMemoryAccessToken, user: cachedDriveUser };
  }

  const auth = getClientAuth();
  if (!auth) {
    throw new Error('Firebase Auth is not available. Please check network connection.');
  }

  if (isDriveSigningIn) {
    // Wait for in-flight request
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (inMemoryAccessToken && cachedDriveUser) {
      return { token: inMemoryAccessToken, user: cachedDriveUser };
    }
  }

  try {
    isDriveSigningIn = true;
    const provider = new GoogleAuthProvider();
    GOOGLE_DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth did not return a valid Drive access token.');
    }

    inMemoryAccessToken = credential.accessToken;
    cachedDriveUser = result.user;
    return { token: inMemoryAccessToken, user: result.user };
  } finally {
    isDriveSigningIn = false;
  }
}

export function isDriveConnected(): boolean {
  return Boolean(inMemoryAccessToken);
}

export function getCachedDriveUser(): User | null {
  return cachedDriveUser;
}

export function disconnectDrive(): void {
  inMemoryAccessToken = null;
}

/**
 * Finds or creates nested folders in Google Drive (e.g. "Jai Hanuman Door Media/products").
 */
export async function ensureDriveFolderPath(folderPath: string, accessToken: string): Promise<string> {
  const parts = folderPath.split('/').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return 'root';

  let parentId = 'root';
  for (const folderName of parts) {
    const parentClause = parentId === 'root' ? '' : ` and '${parentId}' in parents`;
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentClause}`);
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      throw new Error(`Failed to search Google Drive folder (${folderName}): ${errText}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      parentId = searchData.files[0].id;
    } else {
      // Create subfolder
      const bodyPayload: any = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: `Jai Hanuman Door folder: ${folderName}`,
      };
      if (parentId !== 'root') {
        bodyPayload.parents = [parentId];
      }

      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create Google Drive folder "${folderName}": ${errText}`);
      }

      const folderData = await createRes.json();
      parentId = folderData.id;
    }
  }

  return parentId;
}

export async function ensureDriveFolder(folderName: string, accessToken: string): Promise<string> {
  return ensureDriveFolderPath(folderName, accessToken);
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
  directUrl: string;
}

/**
 * Sets file permission to public ('anyone' reader) so uploaded media can render
 * directly in the application without requiring Google login.
 */
export async function makeDriveFilePublic(fileId: string, accessToken: string): Promise<void> {
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (err: any) {
    console.warn('[GoogleDrive] Could not set public permission on Drive file:', err.message);
  }
}

/**
 * Uploads a file (photo, video, PDF or JSON blob) to Google Drive using multipart upload.
 */
export async function uploadBlobToDrive(
  blob: Blob,
  filename: string,
  mimeType: string,
  folderName: string = 'Jai Hanuman Door Media/products',
  description?: string
): Promise<DriveUploadResult> {
  const { token } = await getDriveAccessToken();
  const folderId = await ensureDriveFolderPath(folderName, token);

  const metadata = {
    name: filename,
    mimeType: mimeType,
    parents: [folderId],
    description: description || `Uploaded to Jai Hanuman Door Media on ${new Date().toLocaleString()}`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const fileHeaderPart = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  const blobArrayBuffer = await blob.arrayBuffer();

  const multipartBody = new Blob(
    [
      metadataPart,
      fileHeaderPart,
      new Uint8Array(blobArrayBuffer),
      closeDelimiter,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errText}`);
  }

  const result = await uploadRes.json();

  // Make file publicly readable so images and videos display everywhere
  await makeDriveFilePublic(result.id, token);

  const isVideo = mimeType.startsWith('video/') || filename.toLowerCase().endsWith('.mp4');
  const directUrl = isVideo
    ? `https://drive.google.com/uc?export=view&id=${result.id}`
    : `https://lh3.googleusercontent.com/d/${result.id}`;

  return {
    fileId: result.id,
    name: result.name,
    webViewLink: result.webViewLink,
    webContentLink: result.webContentLink,
    directUrl,
  };
}

/**
 * Lists files stored in the Jai Hanuman Door Google Drive folder.
 */
export async function listDriveEstimates(folderName: string = 'Jai Hanuman Door Quotes'): Promise<any[]> {
  const { token } = await getDriveAccessToken();
  const folderId = await ensureDriveFolder(folderName, token);

  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,createdTime,size,webViewLink)&orderBy=createdTime desc`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to list Drive files: ${await res.text()}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Deletes a file from Google Drive with mandatory user confirmation dialog.
 */
export async function deleteDriveFile(fileId: string, fileName: string): Promise<boolean> {
  // STRICT USER CONFIRMATION REQUIRED BY WORKSPACE INTEGRATION POLICY
  const confirmed = window.confirm(
    `Are you sure you want to delete "${fileName}" from Google Drive? This cannot be undone.`
  );
  if (!confirmed) return false;

  const { token } = await getDriveAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to delete Drive file: ${await res.text()}`);
  }

  return true;
}
