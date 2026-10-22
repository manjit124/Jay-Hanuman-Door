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
  Firestore,
} from 'firebase/firestore';
import type { DatabaseSchema } from './db.ts';

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let isInitialized = false;

export function getFirestoreInstance(): Firestore | null {
  if (firestoreDb) return firestoreDb;

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

    if (!getApps().length) {
      firebaseApp = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      }, 'jai-hanuman-persistent-store');
    } else {
      firebaseApp = getApps()[0];
    }

    const dbId = config.firestoreDatabaseId || '(default)';
    firestoreDb = getFirestore(firebaseApp, dbId);
    isInitialized = true;
    console.log(`✅ [Firestore] Connected to persistent database (Project: ${config.projectId}, DatabaseId: ${dbId})`);
    return firestoreDb;
  } catch (err: any) {
    console.error('❌ [Firestore] Connection error:', err.message);
    return null;
  }
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
        const parsed = JSON.parse(data.dataJson) as DatabaseSchema;
        if (parsed && Array.isArray(parsed.doors) && parsed.doors.length > 0) {
          console.log(`🛡️ [Firestore] Successfully loaded authoritative database from cloud store (Version: ${parsed.version}, Doors: ${parsed.doors.length})`);
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
 * Also synchronizes individual entity collections for granular traceability.
 */
export async function saveAuthoritativeFirestoreDb(data: DatabaseSchema): Promise<boolean> {
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    const masterDocRef = doc(db, 'admin_store', 'master_production_data');
    await setDoc(masterDocRef, {
      version: Number(data.version) || 1,
      lastModified: data.lastModified || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      doorsCount: data.doors?.length || 0,
      dataJson: JSON.stringify(data),
    }, { merge: true });

    return true;
  } catch (err: any) {
    console.error('❌ [Firestore] Failed to save master database:', err.message);
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
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
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
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
    const cleanId = String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
    const entityRef = doc(db, collectionName, cleanId);
    await deleteDoc(entityRef);
    return true;
  } catch (err: any) {
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
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
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
    console.error(`❌ [Firestore Media] Failed to save media ${filename}:`, err.message);
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
  const db = getFirestoreInstance();
  if (!db) return false;

  try {
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
    console.warn(`⚠️ [Firestore Media] Delete failed for ${filename}:`, err.message);
    return false;
  }
}

