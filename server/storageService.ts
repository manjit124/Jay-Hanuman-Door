/**
 * Cloudflare R2 & Firestore Multi-Tier Media Storage Manager
 *
 * Primary: Cloudflare R2 Bucket ("jai-hanuman-door-media") via S3-compatible API
 * Fallback: Persistent Firestore Chunked Cloud Store
 * Metadata: Always stored in Firestore `uploaded_media` collection with explicit storage references.
 *
 * Security: Private bucket access; media is delivered securely via server streaming endpoints.
 * No secrets or keys are ever exposed to the frontend or in logs.
 */

import fs from 'fs';
import path from 'path';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  getFirestoreInstance,
  saveMediaToFirestore,
  fetchMediaFromFirestore,
  saveEntityToFirestore,
} from './firestoreDb.ts';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const UPLOAD_BACKUP_DIR = path.join(process.cwd(), 'data', 'uploads_backup');

// Ensure local cache dirs exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_BACKUP_DIR)) fs.mkdirSync(UPLOAD_BACKUP_DIR, { recursive: true });

export interface MediaMetadata {
  filename: string;
  mimeType: string;
  size: number;
  storageType: 'r2' | 'gcs' | 'firestore' | 'local';
  url: string;
  r2Bucket?: string;
  r2Key?: string;
  gcsBucket?: string;
  gcsPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface R2Status {
  configured: boolean;
  connected: boolean;
  bucket: string;
  endpointConfigured: boolean;
  missingVars?: string[];
  statusMessage: string;
}

let s3Client: S3Client | null = null;
let cachedR2Status: R2Status | null = null;
let lastR2CheckTime = 0;
const R2_CHECK_INTERVAL_MS = 30000; // 30 seconds

export const DEFAULT_R2_BUCKET = 'jai-hanuman-door-media';

/**
 * Returns R2 bucket name from environment or default
 */
export function getR2BucketName(): string {
  return (process.env.R2_BUCKET_NAME || DEFAULT_R2_BUCKET).trim();
}

/**
 * Calculates R2 S3-compatible Endpoint
 */
export function getR2Endpoint(): string | null {
  if (process.env.R2_ENDPOINT && process.env.R2_ENDPOINT.trim()) {
    return process.env.R2_ENDPOINT.trim();
  }
  const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }
  return null;
}

/**
 * Gets or initializes the S3Client instance for Cloudflare R2
 */
export function getR2Client(): S3Client | null {
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  const endpoint = getR2Endpoint();

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    return null;
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

/**
 * Checks Cloudflare R2 availability without revealing secrets
 */
export async function checkR2Availability(forceRecheck = false): Promise<R2Status> {
  const now = Date.now();
  if (!forceRecheck && cachedR2Status && now - lastR2CheckTime < R2_CHECK_INTERVAL_MS) {
    return cachedR2Status;
  }

  const bucket = getR2BucketName();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();
  const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const explicitEndpoint = (process.env.R2_ENDPOINT || '').trim();

  const missingVars: string[] = [];
  if (!accountId && !explicitEndpoint) missingVars.push('R2_ACCOUNT_ID (or R2_ENDPOINT)');
  if (!accessKeyId) missingVars.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missingVars.push('R2_SECRET_ACCESS_KEY');

  if (missingVars.length > 0) {
    cachedR2Status = {
      configured: false,
      connected: false,
      bucket,
      endpointConfigured: !!(accountId || explicitEndpoint),
      missingVars,
      statusMessage: `R2 not configured. Missing environment variables: ${missingVars.join(', ')}`,
    };
    lastR2CheckTime = now;
    return cachedR2Status;
  }

  const client = getR2Client();
  if (!client) {
    cachedR2Status = {
      configured: false,
      connected: false,
      bucket,
      endpointConfigured: false,
      missingVars: ['Failed to initialize R2 S3 Client'],
      statusMessage: 'Failed to construct R2 S3 client with current environment settings.',
    };
    lastR2CheckTime = now;
    return cachedR2Status;
  }

  try {
    const cmd = new HeadBucketCommand({ Bucket: bucket });
    await client.send(cmd);

    // Verify write permissions with a lightweight probe
    const probeKey = `_probe_${Date.now()}.tmp`;
    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: probeKey,
        Body: Buffer.from('ok'),
        ContentType: 'text/plain',
      }));
      // Clean up probe
      await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: probeKey,
      })).catch(() => {});
    } catch (writeErr: any) {
      const statusCode = writeErr.$metadata?.httpStatusCode;
      let writeMsg = `Connected to bucket "${bucket}", but write access failed (${writeErr.name || 'Error'}).`;
      if (statusCode === 403 || writeErr.name === 'AccessDenied') {
        writeMsg = `Access Denied (HTTP 403): R2 API Token lacks write permissions. Please edit or recreate the API token in Cloudflare Dashboard with "Object Read & Write" permissions for bucket "${bucket}".`;
      }
      cachedR2Status = {
        configured: true,
        connected: false,
        bucket,
        endpointConfigured: true,
        statusMessage: writeMsg,
      };
      console.warn(`⚠️ [R2 Storage] ${writeMsg}`);
      lastR2CheckTime = now;
      return cachedR2Status;
    }

    cachedR2Status = {
      configured: true,
      connected: true,
      bucket,
      endpointConfigured: true,
      statusMessage: `Successfully connected to Cloudflare R2 bucket "${bucket}" with full Read & Write permissions.`,
    };
    console.log(`✅ [R2 Storage] Connected and verified read/write access to bucket "${bucket}"`);
  } catch (err: any) {
    const errName = err.name || 'ConnectionError';
    const statusCode = err.$metadata?.httpStatusCode;
    let friendlyMessage = `R2 connection check failed: ${errName}`;
    if (statusCode === 404) {
      friendlyMessage = `Bucket "${bucket}" does not exist in your Cloudflare account.`;
    } else if (statusCode === 403) {
      friendlyMessage = `Access denied to bucket "${bucket}". Check R2 API Token permissions (Object Read & Write).`;
    }

    cachedR2Status = {
      configured: true,
      connected: false,
      bucket,
      endpointConfigured: true,
      statusMessage: friendlyMessage,
    };
    console.warn(`⚠️ [R2 Storage] Check warning: ${friendlyMessage}`);
  }

  lastR2CheckTime = now;
  return cachedR2Status;
}

/**
 * Saves uploaded media buffer into primary storage (Cloudflare R2) or fallback (Firestore Cloud Object Store)
 * and records metadata in Firestore.
 */
export async function saveMedia(
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ success: boolean; url: string; storageType: 'r2' | 'firestore'; metadata: MediaMetadata; error?: string }> {
  const cleanFilename = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const size = buffer.length;
  const relativeUrl = `/uploads/${cleanFilename}`;

  // Mirror to local disk cache immediately for sub-millisecond local serving
  try {
    const localPath = path.join(UPLOAD_DIR, cleanFilename);
    const backupPath = path.join(UPLOAD_BACKUP_DIR, cleanFilename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(backupPath, buffer);
  } catch (err) {
    console.warn('⚠️ Could not write local cache:', err);
  }

  // 1. Try Cloudflare R2 bucket upload
  const r2Status = await checkR2Availability();
  if (r2Status.connected) {
    const client = getR2Client();
    if (client) {
      try {
        const bucket = r2Status.bucket;
        const r2Key = `uploads/${cleanFilename}`;

        const uploadCmd = new PutObjectCommand({
          Bucket: bucket,
          Key: r2Key,
          Body: buffer,
          ContentType: mimeType || 'application/octet-stream',
          CacheControl: 'public, max-age=31536000, immutable',
        });

        await client.send(uploadCmd);

        const metadata: MediaMetadata = {
          filename: cleanFilename,
          mimeType: mimeType || 'application/octet-stream',
          size,
          storageType: 'r2',
          url: relativeUrl,
          r2Bucket: bucket,
          r2Key,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Save metadata in Firestore
        await saveEntityToFirestore('uploaded_media', cleanFilename, metadata);

        console.log(`✅ [Storage] Saved ${cleanFilename} (${size} bytes) to Cloudflare R2 bucket "${bucket}"`);
        return { success: true, url: relativeUrl, storageType: 'r2', metadata };
      } catch (r2Err: any) {
        console.warn(`⚠️ [Storage] R2 upload failed for ${cleanFilename}, falling back to Firestore:`, r2Err.name || r2Err.message);
      }
    }
  }

  // 2. Fallback to Firestore Chunked Cloud Store
  const firestoreSaved = await saveMediaToFirestore(cleanFilename, mimeType, buffer);

  const metadata: MediaMetadata = {
    filename: cleanFilename,
    mimeType: mimeType || 'application/octet-stream',
    size,
    storageType: 'firestore',
    url: relativeUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save metadata in Firestore
  await saveEntityToFirestore('uploaded_media', cleanFilename, metadata);

  return {
    success: firestoreSaved,
    url: relativeUrl,
    storageType: 'firestore',
    metadata,
  };
}

/**
 * Retrieves media buffer by filename from local disk cache, Cloudflare R2, or Firestore.
 * Keeps R2 bucket private by fetching server-side and streaming.
 */
export async function getMediaBuffer(
  filename: string
): Promise<{ buffer: Buffer; mimeType: string; storageType: string } | null> {
  const cleanFilename = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');

  // 1. Local disk cache hit
  const localPath = path.join(UPLOAD_DIR, cleanFilename);
  if (fs.existsSync(localPath)) {
    const buffer = fs.readFileSync(localPath);
    const ext = path.extname(cleanFilename).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.mp4') mimeType = 'video/mp4';
    else if (ext === '.webm') mimeType = 'video/webm';
    else if (ext === '.mov') mimeType = 'video/quicktime';
    return { buffer, mimeType, storageType: 'local' };
  }

  // 2. Check Cloudflare R2 if configured
  const client = getR2Client();
  const bucket = getR2BucketName();
  if (client) {
    try {
      const getCmd = new GetObjectCommand({
        Bucket: bucket,
        Key: `uploads/${cleanFilename}`,
      });
      const response = await client.send(getCmd);
      if (response.Body) {
        const byteArray = await response.Body.transformToByteArray();
        const buffer = Buffer.from(byteArray);
        const mimeType = response.ContentType || 'application/octet-stream';

        // Re-cache to local disk for fast repeated reads
        try {
          fs.writeFileSync(localPath, buffer);
        } catch {}

        return { buffer, mimeType, storageType: 'r2' };
      }
    } catch (err: any) {
      // 404 on R2 is normal if file was stored in Firestore before R2 was configured
      if (err.name !== 'NoSuchKey' && err.$metadata?.httpStatusCode !== 404) {
        console.warn(`⚠️ [R2 Storage] Lookup warning for ${cleanFilename}:`, err.name || err.message);
      }
    }
  }

  // 3. Check Firestore Metadata and fallback to Firestore chunked object store
  const firestoreMedia = await fetchMediaFromFirestore(cleanFilename);
  if (firestoreMedia) {
    // Cache to local disk
    try {
      fs.writeFileSync(localPath, firestoreMedia.buffer);
    } catch {}
    return {
      buffer: firestoreMedia.buffer,
      mimeType: firestoreMedia.mimeType,
      storageType: 'firestore',
    };
  }

  return null;
}
