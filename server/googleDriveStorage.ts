/**
 * Server-Side Google Drive Central Media Storage for Jai Hanuman Door
 *
 * Requirements:
 * 1. Owner's Drive is the central storage for admin uploads (products, catalog, banners, delivery, videos).
 * 2. Customers never sign in to Google to view images or stream videos (served via /api/drive/media/:fileId with local caching).
 * 3. Files organized in 'Jai Hanuman Door Media' with 5 dedicated subfolders.
 * 4. Secrets (client_secret, refresh_token) kept strictly server-side in /server/data/google_drive_credentials.json.
 * 5. Scope: 'https://www.googleapis.com/auth/drive.file' (least-privilege, allows full read/write/delete in app-created media folders).
 */

import fs from 'fs';
import path from 'path';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const CREDENTIALS_FILE = path.join(process.cwd(), 'server', 'data', 'google_drive_credentials.json');
const DRIVE_CACHE_DIR = path.join(process.cwd(), 'data', 'uploads', 'drive_cache');

if (!fs.existsSync(DRIVE_CACHE_DIR)) {
  fs.mkdirSync(DRIVE_CACHE_DIR, { recursive: true });
}

export type DriveSubfolderCategory = 'products' | 'catalog' | 'banners' | 'delivery' | 'videos';

export interface StoredDriveCredentials {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  tokenExpiry?: number;
  ownerEmail?: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
  rootFolderId?: string;
  subfolders?: {
    products?: string;
    catalog?: string;
    banners?: string;
    delivery?: string;
    videos?: string;
  };
}

export interface DriveFileItem {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  category: DriveSubfolderCategory;
  url: string; // /api/drive/media/:fileId
  webViewLink?: string;
  createdAt: string;
}

let inMemoryCredentials: StoredDriveCredentials = {};

/**
 * Loads credentials from server/data/google_drive_credentials.json
 */
export function loadServerDriveCredentials(): StoredDriveCredentials {
  if (Object.keys(inMemoryCredentials).length > 0) {
    return inMemoryCredentials;
  }

  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      inMemoryCredentials = JSON.parse(raw);
    }
  } catch (err: any) {
    console.warn('⚠️ [DriveStorage] Could not read credentials file:', err.message);
  }

  // Fallback to environment variables if not set in file
  if (!inMemoryCredentials.clientId && process.env.GOOGLE_DRIVE_CLIENT_ID) {
    inMemoryCredentials.clientId = process.env.GOOGLE_DRIVE_CLIENT_ID.trim();
  }
  if (!inMemoryCredentials.clientSecret && process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
    inMemoryCredentials.clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET.trim();
  }
  if (!inMemoryCredentials.refreshToken && process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
    inMemoryCredentials.refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN.trim();
  }

  // Fallback clientId from firebase-applet-config.json
  if (!inMemoryCredentials.clientId) {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (conf.oAuthClientId) inMemoryCredentials.clientId = conf.oAuthClientId;
      }
    } catch {}
  }

  return inMemoryCredentials;
}

/**
 * Persists updated credentials securely to server/data/google_drive_credentials.json
 */
export function saveServerDriveCredentials(creds: Partial<StoredDriveCredentials>): StoredDriveCredentials {
  const current = loadServerDriveCredentials();
  inMemoryCredentials = {
    ...current,
    ...creds,
  };

  try {
    const dir = path.dirname(CREDENTIALS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(inMemoryCredentials, null, 2), {
      mode: 0o600, // Read/write only by server process
    });
    console.log('🔒 [DriveStorage] Credentials updated securely in server/data/google_drive_credentials.json');
  } catch (err: any) {
    console.error('❌ [DriveStorage] Failed to save credentials file:', err.message);
  }

  return inMemoryCredentials;
}

/**
 * Returns a sanitized status object safe to send to the Admin frontend
 * (Never exposes refreshToken or clientSecret).
 */
export function getDriveConnectionStatus(): {
  configured: boolean;
  connected: boolean;
  ownerEmail?: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
  rootFolderId?: string;
  hasRefreshToken: boolean;
  hasClientSecret: boolean;
  scope: string;
} {
  const creds = loadServerDriveCredentials();
  const hasRefreshToken = Boolean(creds.refreshToken);
  const hasClientSecret = Boolean(creds.clientSecret);
  const connected = Boolean(creds.lastVerifiedAt && (hasRefreshToken || creds.accessToken));

  return {
    configured: Boolean(creds.clientId && (creds.refreshToken || creds.clientSecret)),
    connected,
    ownerEmail: creds.ownerEmail || 'shivshahidoors@gmail.com',
    connectedAt: creds.connectedAt,
    lastVerifiedAt: creds.lastVerifiedAt,
    rootFolderId: creds.rootFolderId,
    hasRefreshToken,
    hasClientSecret,
    scope: DRIVE_SCOPE,
  };
}

/**
 * Obtains a fresh access token from Google OAuth token endpoint using the stored refresh_token.
 */
export async function getValidAccessToken(): Promise<string> {
  const creds = loadServerDriveCredentials();

  // If existing access token is valid for at least another 3 minutes, reuse it
  if (creds.accessToken && creds.tokenExpiry && creds.tokenExpiry > Date.now() + 180000) {
    return creds.accessToken;
  }

  // If no refresh token, check if manual access token is present
  if (!creds.refreshToken) {
    if (creds.accessToken && creds.tokenExpiry && creds.tokenExpiry > Date.now()) {
      return creds.accessToken;
    }
    throw new Error('Google Drive is not connected: Missing refresh token. Please authorize Google Drive in the Admin Panel.');
  }

  if (!creds.clientId || !creds.clientSecret) {
    throw new Error('Google Drive credentials incomplete: Missing Client ID or Client Secret on server.');
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to refresh Google Drive access token (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const newAccessToken = data.access_token;
  const expiresInMs = (data.expires_in || 3600) * 1000;
  const newExpiry = Date.now() + expiresInMs;

  saveServerDriveCredentials({
    accessToken: newAccessToken,
    tokenExpiry: newExpiry,
    lastVerifiedAt: new Date().toISOString(),
  });

  return newAccessToken;
}

/**
 * Generates an OAuth 2.0 Authorization URL for the owner to consent to Google Drive storage.
 */
export function getDriveAuthUrl(redirectUri: string, customClientId?: string): string {
  const creds = loadServerDriveCredentials();
  const clientId = customClientId || creds.clientId;
  if (!clientId) {
    throw new Error('Missing Google OAuth Client ID. Please provide Client ID first.');
  }

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: DRIVE_SCOPE,
    include_granted_scopes: 'true',
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

/**
 * Exchanges a one-time OAuth 2.0 authorization code for tokens (access_token + refresh_token)
 * and permanently saves them to server/data/google_drive_credentials.json.
 */
export async function exchangeDriveAuthCode(
  code: string,
  redirectUri: string,
  customClientId?: string,
  customClientSecret?: string
): Promise<{ success: boolean; ownerEmail?: string; message: string }> {
  const creds = loadServerDriveCredentials();
  const clientId = customClientId || creds.clientId;
  const clientSecret = customClientSecret || creds.clientSecret;

  if (!clientId || !clientSecret) {
    throw new Error('Both Client ID and Client Secret are required to exchange authorization code.');
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const params = new URLSearchParams({
    code: code.trim(),
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
    redirect_uri: redirectUri.trim(),
    grant_type: 'authorization_code',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to exchange authorization code with Google (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token || creds.refreshToken;
  const expiresInMs = (data.expires_in || 3600) * 1000;
  const tokenExpiry = Date.now() + expiresInMs;

  if (!refreshToken) {
    console.warn('⚠️ [DriveStorage] No refresh_token returned by Google. User may have already authorized without prompt=consent.');
  }

  saveServerDriveCredentials({
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    accessToken,
    tokenExpiry,
    ...(refreshToken ? { refreshToken: refreshToken.trim() } : {}),
    connectedAt: new Date().toISOString(),
    lastVerifiedAt: new Date().toISOString(),
  });

  return {
    success: true,
    ownerEmail: creds.ownerEmail || 'shivshahidoors@gmail.com',
    message: refreshToken
      ? 'Successfully authorized Google Drive! Refresh token securely saved.'
      : 'Access token saved (Note: Google did not return a new refresh token; existing token preserved).',
  };
}

/**
 * Ensures the root 'Jai Hanuman Door Media' folder and subfolder exist in the owner's Google Drive.
 */
export async function ensureDriveSubfolder(category: DriveSubfolderCategory): Promise<string> {
  const token = await getValidAccessToken();
  const creds = loadServerDriveCredentials();

  // Check cached subfolder ID
  if (creds.subfolders && creds.subfolders[category]) {
    return creds.subfolders[category]!;
  }

  // 1. Ensure Root Folder: 'Jai Hanuman Door Media'
  let rootId = creds.rootFolderId;
  if (!rootId) {
    const rootQuery = encodeURIComponent("name = 'Jai Hanuman Door Media' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const rootSearchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${rootQuery}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (rootSearchRes.ok) {
      const rootSearchData = await rootSearchRes.json();
      if (rootSearchData.files && rootSearchData.files.length > 0) {
        rootId = rootSearchData.files[0].id;
      }
    }

    if (!rootId) {
      const createRootRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Jai Hanuman Door Media',
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Official central media storage for Jai Hanuman Door factory products, catalog, banners, delivery and videos.',
        }),
      });

      if (!createRootRes.ok) {
        throw new Error(`Failed to create root Drive folder: ${await createRootRes.text()}`);
      }

      const createRootData = await createRootRes.json();
      rootId = createRootData.id;
    }

    saveServerDriveCredentials({ rootFolderId: rootId });
  }

  // 2. Ensure Category Subfolder inside Root
  const subfolderQuery = encodeURIComponent(`name = '${category}' and '${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const subSearchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${subfolderQuery}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let subfolderId: string | null = null;
  if (subSearchRes.ok) {
    const subSearchData = await subSearchRes.json();
    if (subSearchData.files && subSearchData.files.length > 0) {
      subfolderId = subSearchData.files[0].id;
    }
  }

  if (!subfolderId) {
    const createSubRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: category,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootId],
        description: `Jai Hanuman Door ${category} media assets`,
      }),
    });

    if (!createSubRes.ok) {
      throw new Error(`Failed to create Drive subfolder '${category}': ${await createSubRes.text()}`);
    }

    const createSubData = await createSubRes.json();
    subfolderId = createSubData.id;
  }

  const updatedSubfolders = {
    ...(creds.subfolders || {}),
    [category]: subfolderId,
  };
  saveServerDriveCredentials({ subfolders: updatedSubfolders });

  return subfolderId!;
}

/**
 * Uploads a file directly into the owner's Google Drive in the specified category subfolder.
 */
export async function uploadMediaToOwnerDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  category: DriveSubfolderCategory = 'products',
  description?: string
): Promise<{
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
  url: string; // /api/drive/media/:fileId
  webViewLink?: string;
  category: DriveSubfolderCategory;
}> {
  const token = await getValidAccessToken();
  const subfolderId = await ensureDriveSubfolder(category);

  const cleanName = path.basename(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const metadata = {
    name: cleanName,
    mimeType: mimeType || 'image/jpeg',
    parents: [subfolderId],
    description: description || `Jai Hanuman Door ${category} upload - ${new Date().toISOString()}`,
  };

  const boundary = '-------jhd314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const fileHeaderPart = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  const payload = Buffer.concat([
    Buffer.from(metadataPart, 'utf8'),
    Buffer.from(fileHeaderPart, 'utf8'),
    buffer,
    Buffer.from(closeDelimiter, 'utf8'),
  ]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(payload.length),
      },
      body: payload,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errText}`);
  }

  const result = await uploadRes.json();
  const fileId = result.id;

  // Make file readable via link
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (permErr: any) {
    console.warn('⚠️ [DriveStorage] Link sharing permission note (server proxy still delivers file):', permErr.message);
  }

  // Pre-cache on server disk so subsequent customer requests never hit Drive rate limits
  try {
    const cachePath = path.join(DRIVE_CACHE_DIR, fileId);
    fs.writeFileSync(cachePath, buffer);
  } catch {}

  saveServerDriveCredentials({ lastVerifiedAt: new Date().toISOString() });

  return {
    fileId,
    name: result.name || cleanName,
    size: buffer.length,
    mimeType: result.mimeType || mimeType,
    url: `/api/drive/media/${fileId}`,
    webViewLink: result.webViewLink,
    category,
  };
}

/**
 * Fetches binary buffer from local cache or downloads from owner's Google Drive.
 * Protects against Google Drive download quotas by caching locally.
 */
export async function getDriveMediaBuffer(fileId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  size: number;
}> {
  const cleanId = String(fileId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanId) {
    throw new Error('Invalid Google Drive file ID');
  }

  const cachePath = path.join(DRIVE_CACHE_DIR, cleanId);

  // 1. Check local server cache (High-speed delivery, zero quota usage)
  if (fs.existsSync(cachePath)) {
    const buffer = fs.readFileSync(cachePath);
    return {
      buffer,
      mimeType: detectMimeType(buffer),
      size: buffer.length,
    };
  }

  // 2. Download from Google Drive using Owner's OAuth token
  const token = await getValidAccessToken();
  const fetchUrl = `https://www.googleapis.com/drive/v3/files/${cleanId}?alt=media`;

  const driveRes = await fetch(fetchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!driveRes.ok) {
    const errText = await driveRes.text();
    throw new Error(`Drive download failed (${driveRes.status}): ${errText}`);
  }

  const arrayBuf = await driveRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const mimeType = driveRes.headers.get('content-type') || detectMimeType(buffer);

  // Save to local cache
  try {
    fs.writeFileSync(cachePath, buffer);
  } catch {}

  return {
    buffer,
    mimeType,
    size: buffer.length,
  };
}

/**
 * Lists files in a specific category subfolder in the owner's Google Drive.
 */
export async function listDriveCategoryFiles(category: DriveSubfolderCategory): Promise<DriveFileItem[]> {
  const token = await getValidAccessToken();
  const subfolderId = await ensureDriveSubfolder(category);

  const query = encodeURIComponent(`'${subfolderId}' in parents and trashed = false`);
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,webViewLink,createdTime)&orderBy=createdTime desc&pageSize=50`;

  const res = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to list Drive files (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const files = data.files || [];

  return files.map((f: any) => ({
    fileId: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: parseInt(f.size || '0', 10),
    category,
    url: `/api/drive/media/${f.id}`,
    webViewLink: f.webViewLink,
    createdAt: f.createdTime,
  }));
}

/**
 * Deletes a file from the owner's Google Drive and clears local cache.
 */
export async function deleteFileFromOwnerDrive(fileId: string): Promise<boolean> {
  const cleanId = String(fileId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleanId) return false;

  const token = await getValidAccessToken();
  const delUrl = `https://www.googleapis.com/drive/v3/files/${cleanId}`;

  const res = await fetch(delUrl, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  // Clear local cache file
  const cachePath = path.join(DRIVE_CACHE_DIR, cleanId);
  if (fs.existsSync(cachePath)) {
    try {
      fs.unlinkSync(cachePath);
    } catch {}
  }

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Drive delete failed (${res.status}): ${errText}`);
  }

  return true;
}

/**
 * Performs a small 1-pixel test upload into 'Jai Hanuman Door Media/products/'
 * to verify live read/write capability without leaving clutter.
 */
export async function testOwnerDriveUpload(): Promise<{
  success: boolean;
  fileId: string;
  name: string;
  webViewLink?: string;
  verifiedAt: string;
}> {
  // 1x1 transparent PNG buffer
  const testPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  const filename = `jhd_test_verify_${Date.now()}.png`;

  const uploadResult = await uploadMediaToOwnerDrive(
    testPng,
    filename,
    'image/png',
    'products',
    'Automated connection verification test from Jai Hanuman Door Admin'
  );

  // Verify file is readable
  await getDriveMediaBuffer(uploadResult.fileId);

  // Clean up test file so folder remains pristine
  try {
    await deleteFileFromOwnerDrive(uploadResult.fileId);
  } catch {}

  const nowIso = new Date().toISOString();
  saveServerDriveCredentials({
    lastVerifiedAt: nowIso,
  });

  return {
    success: true,
    fileId: uploadResult.fileId,
    name: uploadResult.name,
    webViewLink: uploadResult.webViewLink,
    verifiedAt: nowIso,
  };
}

function detectMimeType(buffer: Buffer): string {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (buffer.length > 12 && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  if (buffer.length > 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    return 'video/mp4';
  }
  return 'application/octet-stream';
}
