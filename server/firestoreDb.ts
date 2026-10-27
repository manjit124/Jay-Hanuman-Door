/**
 * Permanent Authoritative Firestore Persistence Layer for Jai Hanuman Door
 * 
 * Provides:
 * 1. Persistent, Cloud Run-safe cloud database storage (never wiped by container restarts or redeployments)
 * 2. Bi-directional sync between Firestore and local in-memory cache
 * 3. Individual entity atomic document writes
 * 4. Persistent media object repository for uploaded images, owner photos & banners
 */

import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  setLogLevel,
  disableNetwork,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type Auth,
} from 'firebase/auth';
import type { DatabaseSchema } from './db.ts';

// Silence internal @firebase/firestore gRPC stream console.error spam when free-tier daily quota is reached
try {
  setLogLevel('silent');
} catch {}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let serverAuth: Auth | null = null;
let isInitialized = false;
let authPromise: Promise<boolean> | null = null;
let serverWriteQuotaExhaustedUntil = 0;
let hasLoggedQuotaNotice = false;

export function isServerFirestoreWriteQuotaExhausted(): boolean {
  return Date.now() < serverWriteQuotaExhaustedUntil;
}

function isQuotaExhaustedError(err: any): boolean {
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    code === '8' ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded')
  );
}

function handleServerQuotaExhausted(context: string): void {
  serverWriteQuotaExhaustedUntil = Date.now() + 60 * 60 * 1000; // 1 hour cooldown
  if (firestoreDb) {
    disableNetwork(firestoreDb).catch(() => {});
  }
  if (!hasLoggedQuotaNotice) {
    hasLoggedQuotaNotice = true;
    console.info(
      `ℹ️ [Firestore] Free daily write quota reached during ${context}. Pausing cloud writes and persisting all updates to local authoritative disk storage.`
    );
  }
}

export function getFirestoreInstance(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  try {
    setLogLevel('silent');
  } catch {}

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('⚠️ [Firestore] firebase-applet-config.json not found. Operating in local-only fallback.');
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!config.projectId) {
      console.warn('⚠️ [Firestore] No projectId in config.');
      return null;
    }

    const existing = getApps().find(a => a.name === 'jai-hanuman-persistent-store');
    if (!existing) {
      firebaseApp = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      }, 'jai-hanuman-persistent-store');
    } else {
      firebaseApp = existing;
    }

    const dbId = config.firestoreDatabaseId || '(default)';
    firestoreDb = getFirestore(firebaseApp, dbId);
    serverAuth = getAuth(firebaseApp);
    isInitialized = true;
    console.log(`✅ [Firestore] Connected to persistent database (Project: ${config.projectId}, DatabaseId: ${dbId})`);
    return firestoreDb;
  } catch (err: any) {
    console.warn('⚠️ [Firestore] Connection warning:', err.message);
    return null;
  }
}

/**
 * Ensures the server-side Firebase client SDK instance holds an authenticated
 * administrator session so Firestore security rules allow writes.
 */
export async function ensureServerFirebaseAuth(): Promise<boolean> {
  getFirestoreInstance();
  if (!firebaseApp) return false;
  if (!serverAuth) {
    serverAuth = getAuth(firebaseApp);
  }
  if (serverAuth.currentUser && serverAuth.currentUser.email) {
    const exp = (serverAuth.currentUser as any)?.stsTokenManager?.expirationTime;
    const isNearExpiry = exp ? Date.now() > exp - 5 * 60 * 1000 : false;
    if (!isNearExpiry) {
      try {
        await serverAuth.currentUser.getIdToken(false);
        return true;
      } catch {}
    }
  }

  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      const candidates = [
        { email: 'admin@jaihanumandoor.com', pass: 'JaiHanumanAdmin@2026' },
      ];
      for (const { email, pass } of candidates) {
        try {
          const cred = await signInWithEmailAndPassword(serverAuth!, email, pass);
          await cred.user.getIdToken(false);
          console.log(`✅ [Firestore Auth] Server authenticated as ${email} (UID: ${cred.user.uid.slice(0, 8)}...)`);
          return true;
        } catch (signInErr: any) {
          if (signInErr?.code === 'auth/user-not-found') {
            try {
              const created = await createUserWithEmailAndPassword(serverAuth!, email, pass);
              await created.user.getIdToken(false);
              console.log(`✅ [Firestore Auth] Server provisioned & authenticated as ${email}`);
              return true;
            } catch {}
          }
        }
      }
      return Boolean(serverAuth?.currentUser);
    } catch (err: any) {
      console.warn('⚠️ [Firestore Auth] Server auth warning:', err.message);
      return false;
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

/**
 * Loads authoritative database snapshot from Firestore.
 * Returns null if not found or on connection error.
 */
export async function fetchAuthoritativeFirestoreDb(): Promise<DatabaseSchema | null> {
  const db = getFirestoreInstance();
  if (!db) return null;

  try {
    const masterDocRef = doc(db, 'admin_store', 'master_production_data');
    const snapshot = await getDoc(masterDocRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data && data.dataJson) {
        let fullJson = String(data.dataJson);
        const chunkCount = Number(data.chunkCount) || 1;
        if (chunkCount > 1) {
          const chunkPromises: Promise<any>[] = [];
          for (let i = 1; i < chunkCount; i++) {
            chunkPromises.push(getDoc(doc(db, 'admin_store', `master_production_chunk_${i}`)));
          }
          const chunkSnaps = await Promise.all(chunkPromises);
          for (const cSnap of chunkSnaps) {
            if (cSnap.exists()) {
              const cData = cSnap.data();
              if (cData?.dataChunk) {
                fullJson += String(cData.dataChunk);
              }
            }
          }
        }
        const parsed = JSON.parse(fullJson) as DatabaseSchema;
        if (parsed && Array.isArray(parsed.doors) && parsed.doors.length > 0) {
          console.log(`🛡️ [Firestore] Successfully loaded authoritative database from cloud store (Version: ${parsed.version}, Doors: ${parsed.doors.length}, Chunks: ${chunkCount})`);
          return parsed;
        }
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [Firestore] Could not load from master_production_data:', err.message);
  }
  return null;
}

/**
 * Persists the authoritative database to Firestore.
 * Automatically chunks payloads exceeding 750KB across /admin_store/master_production_chunk_{i}
 * so Firestore's 1MB single-document limit is never exceeded.
 */
export async function saveAuthoritativeFirestoreDb(data: DatabaseSchema): Promise<boolean> {
  if (isServerFirestoreWriteQuotaExhausted()) return false;
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    await ensureServerFirebaseAuth();
    const masterDocRef = doc(db, 'admin_store', 'master_production_data');
    const sanitized = cleanUndefined(data);

    if (Array.isArray(sanitized.auditLogs) && sanitized.auditLogs.length > 25) {
      sanitized.auditLogs = sanitized.auditLogs.slice(0, 25);
    }

    const jsonStr = JSON.stringify(sanitized);
    const MAX_CHUNK_CHARS = 750000;
    const totalLength = jsonStr.length;
    const chunkCount = Math.max(1, Math.ceil(totalLength / MAX_CHUNK_CHARS));
    const firstChunk = chunkCount === 1 ? jsonStr : jsonStr.slice(0, MAX_CHUNK_CHARS);

    await setDoc(masterDocRef, {
      version: Number(data.version) || 1,
      lastModified: data.lastModified || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      doorsCount: data.doors?.length || 0,
      chunkCount,
      dataJson: firstChunk,
    }, { merge: true });

    if (chunkCount > 1) {
      const chunkPromises: Promise<any>[] = [];
      for (let i = 1; i < chunkCount; i++) {
        const slice = jsonStr.slice(i * MAX_CHUNK_CHARS, (i + 1) * MAX_CHUNK_CHARS);
        const chunkRef = doc(db, 'admin_store', `master_production_chunk_${i}`);
        chunkPromises.push(
          setDoc(chunkRef, {
            dataChunk: slice,
            chunkIndex: i,
            totalChunks: chunkCount,
            updatedAt: new Date().toISOString(),
          }, { merge: true })
        );
      }
      await Promise.all(chunkPromises);
    }

    return true;
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      handleServerQuotaExhausted('saveAuthoritativeFirestoreDb');
      return false;
    }
    console.warn('⚠️ [Firestore] Could not sync master database to cloud:', err.message);
    return false;
  }
}

function cleanUndefined(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(cleanUndefined);
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanUndefined(value);
    }
  }
  return cleaned;
}

/**
 * Saves a single entity atomically to Firestore
 */
export async function saveEntityToFirestore(
  collectionName: string,
  id: string,
  data: any
): Promise<boolean> {
  if (isServerFirestoreWriteQuotaExhausted()) return false;
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    await ensureServerFirebaseAuth();
    const cleanId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const entityRef = doc(db, collectionName, cleanId);
    const sanitizedData = cleanUndefined(data);
    await setDoc(entityRef, {
      ...sanitizedData,
      id: cleanId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      handleServerQuotaExhausted(`saveEntityToFirestore(${collectionName}/${id})`);
      return false;
    }
    console.warn(`⚠️ [Firestore] Failed to write entity to ${collectionName}/${id}:`, err.message);
    return false;
  }
}

/**
 * Deletes a single entity document from Firestore
 */
export async function deleteEntityFromFirestore(
  collectionName: string,
  id: string
): Promise<boolean> {
  if (isServerFirestoreWriteQuotaExhausted()) return false;
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    await ensureServerFirebaseAuth();
    const cleanId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const entityRef = doc(db, collectionName, cleanId);
    await deleteDoc(entityRef);
    return true;
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      handleServerQuotaExhausted(`deleteEntityFromFirestore(${collectionName}/${id})`);
      return false;
    }
    console.warn(`⚠️ [Firestore] Failed to delete entity ${collectionName}/${id}:`, err.message);
    return false;
  }
}

// Max single document base64 payload size (~500 KB binary = ~670 KB base64, safe under 1MB limit)
const MAX_SINGLE_DOC_SIZE = 500 * 1024;
// Chunk size for larger files (300 KB binary = ~400 KB base64 per chunk)
const CHUNK_SIZE = 300 * 1024;

/**
 * Saves uploaded media (image, video, banner, photo, 3D model) into persistent Firestore object collection.
 * Uses atomic chunking for large files/videos so documents NEVER exceed Firestore's 1MB limit.
 * Survives container restarts, cold starts, and new Cloud Run deployments.
 */
export async function saveMediaToFirestore(
  filename: string,
  mimeType: string,
  buffer: Buffer
): Promise<boolean> {
  if (isServerFirestoreWriteQuotaExhausted()) return false;
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    await ensureServerFirebaseAuth();
    const cleanFilename = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const mediaRef = doc(db, 'uploaded_media', cleanFilename);
    const totalSize = buffer.length;

    if (totalSize <= MAX_SINGLE_DOC_SIZE) {
      // Small/medium files: store directly in a single document for maximum retrieval speed
      const base64Data = buffer.toString('base64');
      await setDoc(mediaRef, {
        filename: cleanFilename,
        mimeType: mimeType || 'image/jpeg',
        base64: `data:${mimeType};base64,${base64Data}`,
        size: totalSize,
        chunkCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } else {
      // Large files / videos / 3D models: chunk into sub-documents
      const chunkCount = Math.ceil(totalSize / CHUNK_SIZE);
      
      // Save metadata header first
      await setDoc(mediaRef, {
        filename: cleanFilename,
        mimeType: mimeType || 'application/octet-stream',
        size: totalSize,
        chunkCount,
        chunkSize: CHUNK_SIZE,
        base64: null, // intentionally null for chunked files
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Save each chunk in parallel batches
      const chunkPromises: Promise<any>[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const slice = buffer.subarray(start, end);
        const chunkDocRef = doc(db, 'uploaded_media_chunks', `${cleanFilename}__c${i}`);
        chunkPromises.push(
          setDoc(chunkDocRef, {
            filename: cleanFilename,
            index: i,
            totalChunks: chunkCount,
            data: slice.toString('base64'),
          }, { merge: true })
        );
      }
      await Promise.all(chunkPromises);
    }

    console.log(`✅ [Firestore Media] Persisted media ${cleanFilename} (${totalSize} bytes, chunked: ${totalSize > MAX_SINGLE_DOC_SIZE}) to cloud store`);
    return true;
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      handleServerQuotaExhausted(`saveMediaToFirestore(${filename})`);
      return false;
    }
    console.warn(`⚠️ [Firestore Media] Could not sync media ${filename} to cloud:`, err.message);
    return false;
  }
}

/**
 * Retrieves uploaded media from Firestore when local ephemeral disk is empty (e.g. after Cloud Run container restart)
 */
export async function fetchMediaFromFirestore(
  filename: string
): Promise<{ mimeType: string; buffer: Buffer } | null> {
  const db = getFirestoreInstance();
  if (!db) return null;

  try {
    const cleanFilename = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const mediaRef = doc(db, 'uploaded_media', cleanFilename);
    const snap = await getDoc(mediaRef);

    if (snap.exists()) {
      const data = snap.data();
      if (!data) return null;

      const mimeType = data.mimeType || 'image/jpeg';

      // 1. Single-document fast path
      if (data.base64) {
        const rawBase64 = data.base64.includes(',') ? data.base64.split(',')[1] : data.base64;
        const buffer = Buffer.from(rawBase64, 'base64');
        return { mimeType, buffer };
      }

      // 2. Chunked file reassembly
      if (data.chunkCount && data.chunkCount > 0) {
        const chunkPromises: Promise<any>[] = [];
        for (let i = 0; i < data.chunkCount; i++) {
          const chunkDocRef = doc(db, 'uploaded_media_chunks', `${cleanFilename}__c${i}`);
          chunkPromises.push(getDoc(chunkDocRef));
        }

        const chunkSnaps = await Promise.all(chunkPromises);
        const buffers: Buffer[] = [];
        for (const cSnap of chunkSnaps) {
          if (!cSnap.exists()) {
            console.warn(`⚠️ [Firestore Media] Missing chunk for ${cleanFilename}`);
            return null;
          }
          const cData = cSnap.data();
          buffers.push(Buffer.from(cData.data, 'base64'));
        }

        const assembledBuffer = Buffer.concat(buffers);
        return { mimeType, buffer: assembledBuffer };
      }
    }
  } catch (err: any) {
    console.warn(`⚠️ [Firestore Media] Lookup failed for ${filename}:`, err.message);
  }
  return null;
}

/**
 * Deletes media and its chunks from Firestore
 */
export async function deleteMediaFromFirestore(filename: string): Promise<boolean> {
  if (isServerFirestoreWriteQuotaExhausted()) return false;
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    await ensureServerFirebaseAuth();
    const cleanFilename = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const mediaRef = doc(db, 'uploaded_media', cleanFilename);
    const snap = await getDoc(mediaRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data?.chunkCount && data.chunkCount > 1) {
        for (let i = 0; i < data.chunkCount; i++) {
          await deleteDoc(doc(db, 'uploaded_media_chunks', `${cleanFilename}__c${i}`)).catch(() => {});
        }
      }
      await deleteDoc(mediaRef);
    }
    return true;
  } catch (err: any) {
    if (isQuotaExhaustedError(err)) {
      handleServerQuotaExhausted(`deleteMediaFromFirestore(${filename})`);
      return false;
    }
    console.warn(`⚠️ [Firestore Media] Delete failed for ${filename}:`, err.message);
    return false;
  }
}

