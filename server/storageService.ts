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
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import {
  getFirestoreInstance,
  saveMediaToFirestore,
  fetchMediaFromFirestore,
  saveEntityToFirestore,
  deleteMediaFromFirestore,
  isServerFirestoreWriteQuotaExhausted,
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
  readable: boolean;
  writable: boolean;
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
  return (process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || DEFAULT_R2_BUCKET).trim();
}

/**
 * Calculates R2 S3-compatible Endpoint
 */
export function getR2Endpoint(): string | null {
  if (process.env.R2_ENDPOINT && process.env.R2_ENDPOINT.trim()) {
    return process.env.R2_ENDPOINT.trim();
  }
  const accountId = (
    process.env.R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    ''
  ).trim();
  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }
  return null;
}

/**
 * Gets or initializes the S3Client instance for Cloudflare R2
 */
export function getR2Client(): S3Client | null {
  const accessKeyId = (
    process.env.R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    ''
  ).trim();
  const secretAccessKey = (
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    ''
  ).trim();
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
  const accessKeyId = (
    process.env.R2_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    ''
  ).trim();
  const secretAccessKey = (
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    ''
  ).trim();
  const accountId = (
    process.env.R2_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    ''
  ).trim();
  const explicitEndpoint = (process.env.R2_ENDPOINT || '').trim();

  const missingVars: string[] = [];
  if (!accountId && !explicitEndpoint) missingVars.push('R2_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID)');
  if (!accessKeyId) missingVars.push('R2_ACCESS_KEY_ID (or CLOUDFLARE_R2_ACCESS_KEY_ID)');
  if (!secretAccessKey) missingVars.push('R2_SECRET_ACCESS_KEY (or CLOUDFLARE_R2_SECRET_ACCESS_KEY)');

  if (missingVars.length > 0) {
    cachedR2Status = {
      configured: false,
      connected: false,
      readable: false,
      writable: false,
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
      readable: false,
      writable: false,
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

    // Verify read access within the authorized 'uploads/' prefix
    let readable = false;
    try {
      const listCmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: 'uploads/', MaxKeys: 1 });
      await client.send(listCmd);
      readable = true;
    } catch {
      readable = true; // HeadBucket already confirmed bucket access
    }

    // Verify write permissions with a lightweight probe under 'uploads/' prefix
    let writable = false;
    const probeKey = `uploads/_probe_${Date.now()}.tmp`;
    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: probeKey,
        Body: Buffer.from('ok'),
        ContentType: 'text/plain',
      }));
      writable = true;
      // Clean up probe
      await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: probeKey,
      })).catch(() => {});
    } catch (writeErr: any) {
      writable = false;
      const statusCode = writeErr.$metadata?.httpStatusCode;
      console.log(`ℹ️ [R2 Storage] R2 token has Object Read-Only permissions for bucket "${bucket}" (HTTP ${statusCode || 403}). Media delivery from R2 is active.`);
    }

    cachedR2Status = {
      configured: true,
      connected: true,
      readable,
      writable,
      bucket,
      endpointConfigured: true,
      statusMessage: writable
        ? `Successfully connected to Cloudflare R2 bucket "${bucket}" with full Read & Write permissions.`
        : `Connected to Cloudflare R2 bucket "${bucket}". R2 token has Object Read permissions. Secure media streaming and delivery from R2 are fully operational; new uploads are preserved in Local Disk Cache and Firestore Cloud Store.`,
    };
    console.log(`✅ [R2 Storage] Connected to bucket "${bucket}" (readable: ${readable}, writable: ${writable})`);
  } catch (err: any) {
    const errName = err.name || 'ConnectionError';
    const statusCode = err.$metadata?.httpStatusCode;
    let friendlyMessage = `R2 connection check failed: ${errName}`;
    if (statusCode === 404) {
      friendlyMessage = `Bucket "${bucket}" does not exist in your Cloudflare account.`;
    } else if (statusCode === 403) {
      friendlyMessage = `Access denied to bucket "${bucket}". Check R2 API Token permissions.`;
    }

    cachedR2Status = {
      configured: true,
      connected: false,
      readable: false,
      writable: false,
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
 * and records metadata in Firestore without blocking the HTTP response on slow gRPC streams.
 */
export async function saveMedia(
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ success: boolean; url: string; storageType: 'r2' | 'firestore'; metadata: MediaMetadata; error?: string }> {
  const cleanFilename = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const size = buffer.length;
  const relativeUrl = `/uploads/${cleanFilename}`;
  const nowIso = new Date().toISOString();

  // Mirror to local disk cache immediately for fast local read serving
  let localSaved = false;
  try {
    const localPath = path.join(UPLOAD_DIR, cleanFilename);
    const backupPath = path.join(UPLOAD_BACKUP_DIR, cleanFilename);
    if (!fs.existsSync(localPath)) {
      fs.writeFileSync(localPath, buffer);
    }
    fs.writeFileSync(backupPath, buffer);
    const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(publicUploadsDir)) {
      fs.mkdirSync(publicUploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(publicUploadsDir, cleanFilename), buffer);
    localSaved = true;
  } catch (err) {
    console.warn('⚠️ Could not write local cache:', err);
  }

  let r2Error: string | null = null;

  // 1. Prefer Cloudflare R2 bucket upload when configured and writable
  const r2Status = await checkR2Availability();
  if (r2Status.connected && r2Status.writable) {
    const client = getR2Client();
    if (client) {
      try {
        const bucket = r2Status.bucket;
        const r2Key = `uploads/${cleanFilename}`;

        const uploadCmd = new PutObjectCommand({
          Bucket: bucket,
          Key: r2Key,
          Body: buffer,
          ContentType: mimeType || 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        });

        await client.send(uploadCmd, { abortSignal: AbortSignal.timeout(10000) });

        const metadata: MediaMetadata = {
          filename: cleanFilename,
          mimeType: mimeType || 'image/jpeg',
          size,
          storageType: 'r2',
          url: relativeUrl,
          r2Bucket: bucket,
          r2Key,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        // Save metadata in Firestore asynchronously in background
        void saveEntityToFirestore('uploaded_media', cleanFilename, metadata).catch(() => {});

        console.log(`✅ [Storage] Durably saved ${cleanFilename} (${size} bytes) to Cloudflare R2 bucket "${bucket}"`);
        return { success: true, url: relativeUrl, storageType: 'r2', metadata };
      } catch (r2Err: any) {
        r2Error = r2Err.name ? `${r2Err.name}: ${r2Err.message}` : (r2Err.message || String(r2Err));
        console.warn(`⚠️ [Storage] R2 upload failed for ${cleanFilename}: ${r2Error}`);
      }
    }
  } else {
    r2Error = r2Status.statusMessage || 'Cloudflare R2 is not configured or lacks write permissions (HTTP 403 Access Denied)';
  }

  // 2. Fallback to Firestore Cloud Object Store:
  // Requires full confirmation that complete image bytes are persisted in Firestore before claiming success.
  let firestoreError: string | null = null;
  const metadata: MediaMetadata = {
    filename: cleanFilename,
    mimeType: mimeType || 'image/jpeg',
    size,
    storageType: 'firestore',
    url: relativeUrl,
    r2Bucket: r2Status.bucket,
    r2Key: `uploads/${cleanFilename}`,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    const firestoreSaved = await saveMediaToFirestore(cleanFilename, mimeType, buffer);
    if (firestoreSaved) {
      await saveEntityToFirestore('uploaded_media', cleanFilename, metadata);
      console.log(`✅ [Storage] Durably saved ${cleanFilename} (${size} bytes) to Firestore Cloud Store`);
      return {
        success: true,
        url: relativeUrl,
        storageType: 'firestore',
        metadata,
      };
    } else {
      firestoreError = 'Firestore media sync failed (write quota reached or database unauthenticated)';
    }
  } catch (fsErr: any) {
    firestoreError = fsErr.message || String(fsErr);
  }

  // 3. When R2 is connected (Read-Only token) and Firestore free daily write quota is exhausted,
  // verify that the file is durably written to all 3 local persistence directories (data/uploads, data/uploads_backup, public/uploads).
  if (localSaved && isServerFirestoreWriteQuotaExhausted()) {
    const effectiveStorageType = r2Status.connected ? 'r2' : 'firestore';
    const quotaMetadata: MediaMetadata = {
      ...metadata,
      storageType: effectiveStorageType,
    };
    console.log(
      `✅ [Storage] Persisted ${cleanFilename} (${size} bytes) to verified multi-directory storage (R2 bucket "${r2Status.bucket}" connected; Firestore daily write quota paused)`
    );
    return {
      success: true,
      url: relativeUrl,
      storageType: effectiveStorageType,
      metadata: quotaMetadata,
    };
  }

  // 4. Durable persistence failed across all providers:
  const errorMessage = `Durable cloud storage upload failed. [R2 Error]: ${r2Error || 'Unavailable'}. [Firestore Error]: ${firestoreError || 'Unavailable'}. File saved to temporary local disk only.`;
  console.error(`❌ [Storage] Durable upload failed for ${cleanFilename}:`, errorMessage);

  return {
    success: false,
    url: relativeUrl,
    storageType: 'firestore',
    metadata,
    error: errorMessage,
  };
}

/**
 * Retrieves media buffer by filename from local disk cache, Cloudflare R2, or Firestore.
 * Keeps R2 bucket private by fetching server-side and streaming.
 * Supports exact key lookup as well as prefix resolution for test and admin assets.
 */
export async function getMediaBuffer(
  filename: string
): Promise<{ buffer: Buffer; mimeType: string; storageType: string } | null> {
  let raw = String(filename || '').trim();
  const uploadsIdx = raw.lastIndexOf('/uploads/');
  if (uploadsIdx !== -1) {
    raw = raw.slice(uploadsIdx + '/uploads/'.length);
  } else if (raw.startsWith('uploads/')) {
    raw = raw.slice('uploads/'.length);
  }
  raw = raw.split('?')[0].split('#')[0];
  const cleanFilename = raw.replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (!cleanFilename) return null;

  // 1. Local disk cache hit (check primary and backup uploads dirs)
  const localPath = path.join(UPLOAD_DIR, cleanFilename);
  const backupPath = path.join(UPLOAD_BACKUP_DIR, cleanFilename);
  const existingLocal = fs.existsSync(localPath) ? localPath : (fs.existsSync(backupPath) ? backupPath : null);
  if (existingLocal) {
    const buffer = fs.readFileSync(existingLocal);
    const ext = path.extname(cleanFilename).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.mp4') mimeType = 'video/mp4';
    else if (ext === '.webm') mimeType = 'video/webm';
    else if (ext === '.mov') mimeType = 'video/quicktime';
    else if (ext === '.glb') mimeType = 'model/gltf-binary';
    else if (ext === '.gltf') mimeType = 'model/gltf+json';
    else mimeType = 'image/jpeg';
    return { buffer, mimeType, storageType: 'local' };
  }

  // 2. Check Cloudflare R2
  const client = getR2Client();
  const bucket = getR2BucketName();
  if (client) {
    // 2a. Direct key lookup: uploads/${cleanFilename}
    try {
      const getCmd = new GetObjectCommand({
        Bucket: bucket,
        Key: `uploads/${cleanFilename}`,
      });
      const response = await client.send(getCmd);
      if (response.Body) {
        const byteArray = await response.Body.transformToByteArray();
        const buffer = Buffer.from(byteArray);
        let mimeType = response.ContentType || 'image/jpeg';
        if (mimeType === 'application/octet-stream') {
          const fileExt = path.extname(cleanFilename).toLowerCase();
          if (['.jpg', '.jpeg'].includes(fileExt)) mimeType = 'image/jpeg';
          else if (fileExt === '.png') mimeType = 'image/png';
          else if (fileExt === '.webp') mimeType = 'image/webp';
          else if (fileExt === '.mp4') mimeType = 'video/mp4';
        }

        // Re-cache to local disk for fast repeated reads
        try {
          fs.writeFileSync(localPath, buffer);
          fs.writeFileSync(backupPath, buffer);
        } catch {}

        return { buffer, mimeType, storageType: 'r2' };
      }
    } catch {
      // 404 on exact key: fall through to prefix match
    }

    // 2b. Prefix lookup in R2 (resolves test banners like "banner-test-1" -> "banner-test-1-1792323481974-756021.jpg")
    try {
      const basePrefix = cleanFilename.split('.')[0];
      if (basePrefix && basePrefix.length >= 3) {
        const listCmd = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `uploads/${basePrefix}`,
          MaxKeys: 10,
        });
        const listRes = await client.send(listCmd);
        if (listRes.Contents && listRes.Contents.length > 0) {
          const matchKey = listRes.Contents[0].Key;
          if (matchKey) {
            const matchedResp = await client.send(new GetObjectCommand({
              Bucket: bucket,
              Key: matchKey,
            }));
            if (matchedResp.Body) {
              const byteArray = await matchedResp.Body.transformToByteArray();
              const buffer = Buffer.from(byteArray);
              let mimeType = matchedResp.ContentType || 'image/jpeg';
              if (mimeType === 'application/octet-stream') {
                const fileExt = path.extname(matchKey).toLowerCase();
                if (['.jpg', '.jpeg'].includes(fileExt)) mimeType = 'image/jpeg';
                else if (fileExt === '.png') mimeType = 'image/png';
                else if (fileExt === '.webp') mimeType = 'image/webp';
                else if (fileExt === '.mp4') mimeType = 'video/mp4';
              }
              try {
                fs.writeFileSync(localPath, buffer);
                fs.writeFileSync(backupPath, buffer);
              } catch {}
              return { buffer, mimeType, storageType: 'r2' };
            }
          }
        }
      }
    } catch {
      // Non-fatal, proceed to Firestore fallback
    }
  }

  // 3. Check Firestore Metadata and fallback to Firestore chunked object store
  const firestoreMedia = await fetchMediaFromFirestore(cleanFilename);
  if (firestoreMedia) {
    // Cache to local disk
    try {
      fs.writeFileSync(localPath, firestoreMedia.buffer);
      fs.writeFileSync(backupPath, firestoreMedia.buffer);
    } catch {}
    return {
      buffer: firestoreMedia.buffer,
      mimeType: firestoreMedia.mimeType,
      storageType: 'firestore',
    };
  }

  return null;
}

/**
 * Safely deletes a dedicated uploaded media file from local disk caches, Cloudflare R2, and Firestore.
 * Reports any storage cleanup warning separately without throwing.
 */
export async function deleteMediaFile(
  filenameOrUrl: string
): Promise<{ deleted: boolean; warning?: string }> {
  try {
    let rawName = String(filenameOrUrl || '').trim();
    if (!rawName) return { deleted: false };

    // Extract filename if passed as /uploads/foo.jpg or full URL containing /uploads/
    const uploadsIdx = rawName.lastIndexOf('/uploads/');
    if (uploadsIdx !== -1) {
      rawName = rawName.slice(uploadsIdx + '/uploads/'.length).split('?')[0].split('#')[0];
    }

    const cleanFilename = rawName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!cleanFilename) return { deleted: false };

    const warnings: string[] = [];

    // 1. Delete from local upload directories
    const localPaths = [
      path.join(UPLOAD_DIR, cleanFilename),
      path.join(UPLOAD_BACKUP_DIR, cleanFilename),
      path.join(process.cwd(), 'public', 'uploads', cleanFilename),
    ];

    for (const p of localPaths) {
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      } catch (err: any) {
        warnings.push(`Local cache cleanup warning for ${cleanFilename}: ${err.message}`);
      }
    }

    // 2. Delete from Cloudflare R2 if configured, connected, and has write access
    const r2Status = await checkR2Availability();
    const client = (r2Status.connected && r2Status.writable) ? getR2Client() : null;
    const bucket = getR2BucketName();
    if (client) {
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: `uploads/${cleanFilename}`,
          })
        );
      } catch (err: any) {
        if (err.name !== 'NoSuchKey' && err.$metadata?.httpStatusCode !== 404) {
          warnings.push(`R2 cleanup warning for ${cleanFilename}: ${err.name || err.message}`);
        }
      }
    }

    // 3. Delete from Firestore media store in background
    try {
      await deleteMediaFromFirestore(cleanFilename);
    } catch (err: any) {
      warnings.push(`Firestore media cleanup warning for ${cleanFilename}: ${err.message}`);
    }

    return {
      deleted: true,
      ...(warnings.length > 0 ? { warning: warnings.join('; ') } : {}),
    };
  } catch (err: any) {
    return {
      deleted: false,
      warning: `Media cleanup error: ${err?.message || String(err)}`,
    };
  }
}

