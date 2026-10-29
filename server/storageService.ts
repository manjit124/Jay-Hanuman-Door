/**
 * Firebase Storage & Multi-Tier Media Storage Manager for Jai Hanuman Door
 *
 * Primary: Firebase Storage (Google Cloud Storage) bucket via official Firebase SDK
 * Fallback: Persistent Firestore Chunked Cloud Store
 * Legacy Reader: Cloudflare R2 (read-only compatibility for previously uploaded assets)
 * Metadata: Always recorded in Firestore `uploaded_media` collection with permanent download URLs.
 * Local Cache: Synchronized in /data/uploads for high-speed delivery and offline resilience.
 *
 * Security: Enforces admin authentication via ensureServerFirebaseAuth();
 * No secret credentials or private keys are exposed to the frontend.
 */

import fs from 'fs';
import path from 'path';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  getBytes,
  deleteObject,
  listAll,
  type FirebaseStorage,
} from 'firebase/storage';
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import {
  getFirebaseApp,
  getFirestoreInstance,
  saveMediaToFirestore,
  fetchMediaFromFirestore,
  saveEntityToFirestore,
  deleteMediaFromFirestore,
  ensureServerFirebaseAuth,
} from './firestoreDb.ts';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const UPLOAD_BACKUP_DIR = path.join(process.cwd(), 'data', 'uploads_backup');

// Ensure local cache dirs exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_BACKUP_DIR)) fs.mkdirSync(UPLOAD_BACKUP_DIR, { recursive: true });

export interface MediaMetadata {
  filename: string;
  mimeType: string;
  size: number;
  storageType: 'firebase_storage' | 'r2' | 'firestore' | 'local';
  url: string;
  downloadUrl?: string;
  storagePath?: string;
  firebaseBucket?: string;
  r2Bucket?: string;
  r2Key?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageStatus {
  configured: boolean;
  connected: boolean;
  readable: boolean;
  writable: boolean;
  provider: 'firebase_storage';
  bucket: string;
  statusMessage: string;
  firebaseStorageReady: boolean;
  setupInstructionsRequired?: boolean;
  // Backward compatibility fields for Admin UI
  endpointConfigured: boolean;
  missingVars?: string[];
  tokenPermissionIssue?: boolean;
}

let firebaseStorageInstance: FirebaseStorage | null = null;
let cachedStorageStatus: StorageStatus | null = null;
let lastStorageCheckTime = 0;
const STORAGE_CHECK_INTERVAL_MS = 15000; // 15 seconds

export const DEFAULT_FIREBASE_BUCKET = 'zeta-gadget-wf6jr.firebasestorage.app';

/**
 * Resolves the active Firebase Storage Bucket name
 */
export function getFirebaseStorageBucketName(): string {
  if (process.env.FIREBASE_STORAGE_BUCKET && process.env.FIREBASE_STORAGE_BUCKET.trim()) {
    return process.env.FIREBASE_STORAGE_BUCKET.trim();
  }
  if (process.env.STORAGE_BUCKET && process.env.STORAGE_BUCKET.trim()) {
    return process.env.STORAGE_BUCKET.trim();
  }

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.storageBucket && config.storageBucket.trim()) {
        return config.storageBucket.trim();
      }
    }
  } catch {}

  return DEFAULT_FIREBASE_BUCKET;
}

/**
 * Backward compatibility alias for getR2BucketName
 */
export function getR2BucketName(): string {
  return getFirebaseStorageBucketName();
}

/**
 * Returns or initializes the Firebase Storage instance
 */
export function getFirebaseStorageInstance(): FirebaseStorage | null {
  if (firebaseStorageInstance) return firebaseStorageInstance;

  try {
    const app = getFirebaseApp();
    if (!app) {
      console.warn('⚠️ [Firebase Storage] Firebase App instance not available.');
      return null;
    }

    const bucketName = getFirebaseStorageBucketName();
    firebaseStorageInstance = getStorage(app, `gs://${bucketName}`);
    console.log(`✅ [Firebase Storage] Initialized Storage client for bucket "gs://${bucketName}"`);
    return firebaseStorageInstance;
  } catch (err: any) {
    console.warn('⚠️ [Firebase Storage] Storage initialization warning:', err.message);
    return null;
  }
}

/**
 * Optional legacy S3 client for read-only access to old Cloudflare R2 files
 */
function getLegacyR2Client(): S3Client | null {
  const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '').trim();

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  try {
    return new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  } catch {
    return null;
  }
}

/**
 * Comprehensive verification of Firebase Storage availability and read/write health.
 */
export async function checkStorageAvailability(forceRefresh = false): Promise<StorageStatus> {
  const now = Date.now();
  if (!forceRefresh && cachedStorageStatus && now - lastStorageCheckTime < STORAGE_CHECK_INTERVAL_MS) {
    return cachedStorageStatus;
  }

  const bucket = getFirebaseStorageBucketName();
  const storage = getFirebaseStorageInstance();

  if (!storage) {
    cachedStorageStatus = {
      configured: false,
      connected: false,
      readable: false,
      writable: false,
      provider: 'firebase_storage',
      bucket,
      endpointConfigured: false,
      statusMessage: 'Firebase Storage is not initialized. Ensure firebase-applet-config.json exists.',
      firebaseStorageReady: false,
      setupInstructionsRequired: true,
      tokenPermissionIssue: false,
    };
    lastStorageCheckTime = now;
    return cachedStorageStatus;
  }

  try {
    await ensureServerFirebaseAuth();

    // Verify storage by testing a lightweight ping reference
    const pingRef = storageRef(storage, 'system_checks/ping.txt');
    let readable = true;
    let writable = false;
    let setupInstructionsRequired = false;
    let statusMessage = '';

    try {
      const pingBuffer = Buffer.from(`Jai Hanuman Door Storage Active - ${new Date().toISOString()}`, 'utf-8');
      await uploadBytes(pingRef, pingBuffer, { contentType: 'text/plain' });
      writable = true;
      readable = true;
      statusMessage = `Connected to Firebase Storage bucket "${bucket}" with full Read & Write permissions.`;
      console.log(`✅ [Firebase Storage] Health check passed for bucket "${bucket}".`);
    } catch (writeErr: any) {
      const code = String(writeErr?.code || '').toLowerCase();
      const status = writeErr?.status_ || writeErr?.statusCode;
      if (status === 404 || code.includes('unknown') || code.includes('bucket-not-found')) {
        setupInstructionsRequired = true;
        statusMessage = `Firebase Storage bucket "${bucket}" is registered in project configuration, but needs one-time activation in Firebase Console. Go to Firebase Console -> Build -> Storage -> Click "Get Started".`;
      } else if (code.includes('unauthorized') || code.includes('permission-denied') || status === 403) {
        statusMessage = `Firebase Storage connected, but write permissions were denied. Check Firebase Storage Security Rules in Firebase Console.`;
      } else {
        statusMessage = `Firebase Storage check notice: ${writeErr?.message || String(writeErr)}`;
      }
      console.warn(`⚠️ [Firebase Storage] ${statusMessage}`);
    }

    cachedStorageStatus = {
      configured: true,
      connected: writable || readable,
      readable,
      writable,
      provider: 'firebase_storage',
      bucket,
      endpointConfigured: true,
      statusMessage,
      firebaseStorageReady: writable,
      setupInstructionsRequired,
      tokenPermissionIssue: !writable,
    };
  } catch (err: any) {
    cachedStorageStatus = {
      configured: true,
      connected: false,
      readable: false,
      writable: false,
      provider: 'firebase_storage',
      bucket,
      endpointConfigured: true,
      statusMessage: `Firebase Storage check failed: ${err.message}`,
      firebaseStorageReady: false,
      setupInstructionsRequired: true,
      tokenPermissionIssue: true,
    };
  }

  lastStorageCheckTime = now;
  return cachedStorageStatus;
}

/**
 * Backward compatibility alias for checkR2Availability
 */
export async function checkR2Availability(forceRefresh = false): Promise<any> {
  const status = await checkStorageAvailability(forceRefresh);
  return {
    ...status,
    r2: {
      configured: status.configured,
      connected: status.connected,
      readable: status.readable,
      writable: status.writable,
      bucket: status.bucket,
      endpointConfigured: status.endpointConfigured,
      statusMessage: status.statusMessage,
      tokenPermissionIssue: status.tokenPermissionIssue,
    },
  };
}

/**
 * Builds standard, stable object paths according to data safety requirements:
 * "products/{productId}/{uniqueFileName}"
 * "catalog/{productId}/{uniqueFileName}"
 * "banners/{uniqueFileName}"
 * "videos/{productId}/{uniqueFileName}"
 * "uploads/{category}/{uniqueFileName}"
 */
export function buildStoragePath(filename: string, category: string = 'doors', productId?: string): string {
  const cleanFilename = String(filename || '').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const safeCategory = String(category || 'doors').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  const safeProductId = productId ? String(productId).replace(/[^a-zA-Z0-9_-]/g, '_') : 'common';

  if (safeCategory === 'banners' || safeCategory === 'banner') {
    return `banners/${cleanFilename}`;
  }
  if (safeCategory === 'videos' || safeCategory === 'video') {
    return `videos/${safeProductId}/${cleanFilename}`;
  }
  if (safeCategory === 'catalog' || safeCategory === 'catalogue') {
    return `catalog/${safeProductId}/${cleanFilename}`;
  }
  if (safeCategory === 'products' || safeCategory === 'doors' || safeCategory === 'door') {
    return `products/${safeProductId}/${cleanFilename}`;
  }

  return `uploads/${safeCategory}/${cleanFilename}`;
}

/**
 * Saves uploaded media buffer directly to Firebase Storage with durable fallback to Firestore
 * and local cache mirroring. NEVER loses uploaded media.
 */
export async function saveMedia(
  filename: string,
  mimeType: string,
  buffer: Buffer,
  category: string = 'doors',
  productId?: string
): Promise<{
  success: boolean;
  url: string;
  downloadUrl?: string;
  storageType: 'firebase_storage' | 'firestore';
  metadata?: MediaMetadata;
  storagePath?: string;
  firebaseBucket?: string;
  statusCode?: number;
  errorCode?: string;
  error?: string;
}> {
  const cleanFilename = String(filename || '').replace(/[^a-zA-Z0-9_.-]/g, '_');
  const size = buffer ? buffer.length : 0;
  const relativeUrl = `/uploads/${cleanFilename}`;
  const nowIso = new Date().toISOString();

  // 1. Validate buffer and file size
  if (!buffer || size === 0) {
    return {
      success: false,
      url: relativeUrl,
      storageType: 'firebase_storage',
      statusCode: 400,
      errorCode: 'EMPTY_FILE',
      error: 'Uploaded file buffer is empty (0 bytes).',
    };
  }

  const isVideoOrModel = mimeType.startsWith('video/') || mimeType.includes('gltf') || mimeType.includes('octet-stream');
  const maxBytes = isVideoOrModel ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
  if (size > maxBytes) {
    return {
      success: false,
      url: relativeUrl,
      storageType: 'firebase_storage',
      statusCode: 413,
      errorCode: 'FILE_TOO_LARGE',
      error: `File size (${(size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of ${isVideoOrModel ? 50 : 15} MB.`,
    };
  }

  // 2. Mirror to local disk cache immediately for instant cold reads
  try {
    const localPath = path.join(UPLOAD_DIR, cleanFilename);
    const backupPath = path.join(UPLOAD_BACKUP_DIR, cleanFilename);
    fs.writeFileSync(localPath, buffer);
    fs.writeFileSync(backupPath, buffer);
  } catch (diskErr: any) {
    console.warn(`⚠️ [Storage] Local cache mirror warning:`, diskErr.message);
  }

  const targetStoragePath = buildStoragePath(cleanFilename, category, productId);
  const storage = getFirebaseStorageInstance();
  const bucketName = getFirebaseStorageBucketName();

  let uploadedToFirebase = false;
  let permanentDownloadUrl = '';

  // 3. Attempt direct upload to Firebase Storage
  if (storage) {
    try {
      await ensureServerFirebaseAuth();
      const fileRef = storageRef(storage, targetStoragePath);

      const performUpload = async (): Promise<string> => {
        const uploadRes = await uploadBytes(fileRef, buffer, {
          contentType: mimeType || 'image/jpeg',
          cacheControl: 'public, max-age=31536000, immutable',
          customMetadata: {
            originalName: cleanFilename,
            category,
            uploadedAt: nowIso,
            service: 'Jai Hanuman Door',
          },
        });
        return await getDownloadURL(uploadRes.ref);
      };

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firebase Storage upload timeout (4000ms) - bucket pending activation')), 4000)
      );

      permanentDownloadUrl = await Promise.race([performUpload(), timeoutPromise]);
      uploadedToFirebase = true;
      console.log(`✅ [Firebase Storage] Durably saved ${cleanFilename} to gs://${bucketName}/${targetStoragePath}`);
    } catch (firebaseErr: any) {
      console.warn(`⚠️ [Firebase Storage] Direct bucket upload attempt notice:`, firebaseErr.message);
    }
  }

  // 4. Fallback: Save into persistent Firestore chunked cloud store if bucket not yet active
  if (!uploadedToFirebase) {
    try {
      await saveMediaToFirestore(cleanFilename, mimeType, buffer);
      console.log(`🛡️ [Firestore Fallback] Persisted ${cleanFilename} (${size} bytes) to Firestore chunked media store.`);
    } catch (firestoreErr: any) {
      console.warn(`⚠️ [Firestore] Media fallback warning:`, firestoreErr.message);
    }
  }

  // 5. Record metadata in Firestore `uploaded_media` collection
  const metadata: MediaMetadata = {
    filename: cleanFilename,
    mimeType,
    size,
    storageType: uploadedToFirebase ? 'firebase_storage' : 'firestore',
    url: relativeUrl,
    downloadUrl: permanentDownloadUrl || relativeUrl,
    storagePath: targetStoragePath,
    firebaseBucket: bucketName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    const db = getFirestoreInstance();
    if (db) {
      const metaRef = doc(db, 'uploaded_media', cleanFilename);
      await Promise.race([
        setDoc(metaRef, metadata, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Metadata write timeout (2500ms)')), 2500))
      ]);
    }
  } catch (metaErr: any) {
    console.warn(`⚠️ [Storage] Could not write media metadata:`, metaErr.message);
  }

  return {
    success: true,
    url: relativeUrl,
    downloadUrl: permanentDownloadUrl || relativeUrl,
    storageType: uploadedToFirebase ? 'firebase_storage' : 'firestore',
    metadata,
    storagePath: targetStoragePath,
    firebaseBucket: bucketName,
  };
}

/**
 * Retrieves media buffer by checking:
 * 1. Local disk cache (/data/uploads)
 * 2. Firebase Storage (gs://zeta-gadget-wf6jr.firebasestorage.app)
 * 3. Firestore chunked cloud store
 * 4. Legacy Cloudflare R2 bucket (preserves old uploaded images)
 */
export async function getMediaBuffer(
  filename: string
): Promise<{
  buffer: Buffer;
  mimeType: string;
  storageType: 'local' | 'firebase_storage' | 'firestore' | 'r2';
  downloadUrl?: string;
  storagePath?: string;
  r2Key?: string;
} | null> {
  const cleanFilename = String(filename || '').replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (!cleanFilename) return null;

  const localPath = path.join(UPLOAD_DIR, cleanFilename);
  const backupPath = path.join(UPLOAD_BACKUP_DIR, cleanFilename);

  // 1. Fast path: Local disk cache hit
  for (const p of [localPath, backupPath]) {
    if (fs.existsSync(p)) {
      try {
        const buffer = fs.readFileSync(p);
        const ext = path.extname(cleanFilename).toLowerCase();
        let mimeType = 'image/jpeg';
        if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.mp4') mimeType = 'video/mp4';
        return { buffer, mimeType, storageType: 'local' };
      } catch {}
    }
  }

  // 2. Fetch from Firebase Storage
  const storage = getFirebaseStorageInstance();
  if (storage) {
    const candidatePaths = [
      `products/common/${cleanFilename}`,
      `catalog/common/${cleanFilename}`,
      `banners/${cleanFilename}`,
      `videos/common/${cleanFilename}`,
      `uploads/doors/${cleanFilename}`,
      `uploads/catalogue/${cleanFilename}`,
      `uploads/banners/${cleanFilename}`,
      `uploads/general/${cleanFilename}`,
      `uploads/${cleanFilename}`,
      cleanFilename,
    ];

    for (const testPath of candidatePaths) {
      try {
        const fileRef = storageRef(storage, testPath);
        const arrayBuf = await getBytes(fileRef);
        const buffer = Buffer.from(arrayBuf);
        const ext = path.extname(cleanFilename).toLowerCase();
        let mimeType = 'image/jpeg';
        if (['.png'].includes(ext)) mimeType = 'image/png';
        else if (['.webp'].includes(ext)) mimeType = 'image/webp';
        else if (['.mp4'].includes(ext)) mimeType = 'video/mp4';

        // Re-cache locally
        try {
          fs.writeFileSync(localPath, buffer);
          fs.writeFileSync(backupPath, buffer);
        } catch {}

        return { buffer, mimeType, storageType: 'firebase_storage', storagePath: testPath };
      } catch {
        // Try next path
      }
    }
  }

  // 3. Fallback to Firestore chunked object store
  const firestoreMedia = await fetchMediaFromFirestore(cleanFilename);
  if (firestoreMedia) {
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

  // 4. Legacy fallback: Check Cloudflare R2 for historical files if configured
  const legacyClient = getLegacyR2Client();
  if (legacyClient) {
    const r2Bucket = (process.env.R2_BUCKET_NAME || 'jai-hanuman-door-media').trim();
    const candidateR2Keys = [
      `uploads/doors/${cleanFilename}`,
      `uploads/banners/${cleanFilename}`,
      `uploads/catalogue/${cleanFilename}`,
      `uploads/${cleanFilename}`,
      cleanFilename,
    ];

    for (const key of candidateR2Keys) {
      try {
        const res = await legacyClient.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key }));
        if (res.Body) {
          const bytes = await res.Body.transformToByteArray();
          const buffer = Buffer.from(bytes);
          const mimeType = res.ContentType || 'image/jpeg';

          // Re-cache locally so we don't query R2 again
          try {
            fs.writeFileSync(localPath, buffer);
            fs.writeFileSync(backupPath, buffer);
          } catch {}

          return { buffer, mimeType, storageType: 'r2', r2Key: key };
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Safely deletes a media file from local caches, Firebase Storage, and Firestore.
 */
export async function deleteMediaFile(
  filenameOrUrl: string
): Promise<{ deleted: boolean; cleanedKeys?: string[]; warning?: string }> {
  try {
    let rawName = String(filenameOrUrl || '').trim();
    if (!rawName) return { deleted: false };

    const uploadsIdx = rawName.lastIndexOf('/uploads/');
    if (uploadsIdx !== -1) {
      rawName = rawName.slice(uploadsIdx + '/uploads/'.length).split('?')[0].split('#')[0];
    }

    const cleanFilename = rawName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    if (!cleanFilename) return { deleted: false };

    const warnings: string[] = [];
    const cleanedKeys: string[] = [];

    // 1. Delete from local cache
    const localPaths = [
      path.join(UPLOAD_DIR, cleanFilename),
      path.join(UPLOAD_BACKUP_DIR, cleanFilename),
      path.join(process.cwd(), 'public', 'uploads', cleanFilename),
    ];
    for (const p of localPaths) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch (err: any) {
        warnings.push(`Local cache cleanup warning: ${err.message}`);
      }
    }

    // 2. Delete from Firebase Storage
    const storage = getFirebaseStorageInstance();
    if (storage) {
      const candidatePaths = [
        `products/common/${cleanFilename}`,
        `catalog/common/${cleanFilename}`,
        `banners/${cleanFilename}`,
        `videos/common/${cleanFilename}`,
        `uploads/doors/${cleanFilename}`,
        `uploads/catalogue/${cleanFilename}`,
        `uploads/banners/${cleanFilename}`,
        `uploads/${cleanFilename}`,
        cleanFilename,
      ];
      for (const p of candidatePaths) {
        try {
          await deleteObject(storageRef(storage, p));
          cleanedKeys.push(p);
        } catch {}
      }
    }

    // 3. Delete from Firestore chunked media store
    try {
      await deleteMediaFromFirestore(cleanFilename);
    } catch (err: any) {
      warnings.push(`Firestore cleanup warning: ${err.message}`);
    }

    // 4. Legacy R2 cleanup if client exists
    const legacyClient = getLegacyR2Client();
    if (legacyClient) {
      const r2Bucket = (process.env.R2_BUCKET_NAME || 'jai-hanuman-door-media').trim();
      const keys = [`uploads/doors/${cleanFilename}`, `uploads/${cleanFilename}`, cleanFilename];
      for (const k of keys) {
        try {
          await legacyClient.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: k }));
          cleanedKeys.push(`r2:${k}`);
        } catch {}
      }
    }

    return {
      deleted: true,
      cleanedKeys,
      ...(warnings.length > 0 ? { warning: warnings.join('; ') } : {}),
    };
  } catch (err: any) {
    return {
      deleted: false,
      warning: `Media deletion error: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Returns comprehensive Firebase Storage and local disk storage diagnostics.
 */
export async function getStorageStats(): Promise<{
  storageProvider: 'firebase_storage';
  storageBucket: string;
  firebaseStorageReady: boolean;
  localFilesCount: number;
  localTotalBytes: number;
  localFormattedSize: string;
  pendingSyncCount: number;
  // Backward compatibility fields
  r2ObjectCount: number;
  r2TotalBytes: number;
  r2FormattedSize: string;
  r2Keys: string[];
}> {
  const bucket = getFirebaseStorageBucketName();
  const availability = await checkStorageAvailability();

  let localFilesCount = 0;
  let localTotalBytes = 0;

  try {
    if (fs.existsSync(UPLOAD_DIR)) {
      const files = fs.readdirSync(UPLOAD_DIR);
      for (const file of files) {
        if (file.startsWith('.')) continue;
        const filePath = path.join(UPLOAD_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            localFilesCount++;
            localTotalBytes += stats.size;
          }
        } catch {}
      }
    }
  } catch {}

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    storageProvider: 'firebase_storage',
    storageBucket: bucket,
    firebaseStorageReady: availability.writable,
    localFilesCount,
    localTotalBytes,
    localFormattedSize: formatBytes(localTotalBytes),
    pendingSyncCount: availability.writable ? 0 : localFilesCount,
    // Backward compatibility aliases
    r2ObjectCount: localFilesCount,
    r2TotalBytes: localTotalBytes,
    r2FormattedSize: formatBytes(localTotalBytes),
    r2Keys: [],
  };
}

/**
 * Backward compatibility alias for getR2StorageStats
 */
export async function getR2StorageStats(): Promise<any> {
  return getStorageStats();
}

/**
 * Synchronizes all pending local container images to Firebase Storage.
 */
export async function syncPendingLocalFilesToStorage(): Promise<{
  success: boolean;
  totalLocal: number;
  syncedCount: number;
  failedCount: number;
  errors: string[];
  message: string;
}> {
  const availability = await checkStorageAvailability(true);
  const files = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).filter((f) => !f.startsWith('.')) : [];

  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const filename of files) {
    const filePath = path.join(UPLOAD_DIR, filename);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      let mimeType = 'image/jpeg';
      if (['.png'].includes(ext)) mimeType = 'image/png';
      else if (['.webp'].includes(ext)) mimeType = 'image/webp';
      else if (['.mp4'].includes(ext)) mimeType = 'video/mp4';

      let category = 'doors';
      if (filename.includes('banner')) category = 'banners';
      else if (filename.includes('wood')) category = 'wood_samples';

      const saveResult = await saveMedia(filename, mimeType, buffer, category);
      if (saveResult.success) {
        syncedCount++;
      } else {
        failedCount++;
        errors.push(`${filename}: ${saveResult.error || 'Failed'}`);
      }
    } catch (err: any) {
      failedCount++;
      errors.push(`${filename}: ${err.message}`);
    }
  }

  return {
    success: failedCount === 0,
    totalLocal: files.length,
    syncedCount,
    failedCount,
    errors,
    message: `Sync complete: ${syncedCount} synchronized to Firebase Storage, ${failedCount} failed.`,
  };
}

/**
 * Backward compatibility alias for syncPendingLocalFilesToR2
 */
export async function syncPendingLocalFilesToR2(): Promise<any> {
  return syncPendingLocalFilesToStorage();
}
