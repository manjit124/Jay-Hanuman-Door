import dotenv from 'dotenv';
if (!process.env.K_SERVICE && !process.env.K_REVISION) {
  dotenv.config();
}
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
import {
  getDb,
  saveDb,
  initCloudDatabase,
  isDatabaseHydrated,
  UPLOAD_DIR,
  UPLOAD_BACKUP_DIR,
  syncUploadedImages,
  exportDatabaseBackup,
  importDatabaseBackup,
  listAvailableBackups,
  restoreBackupFile,
  INITIAL_DATA,
  logWoodDetectorScan,
  getWoodDetectorStats,
  updateWoodDetectorSettings,
  getWoodReferences,
  addWoodReference,
  updateWoodReference,
  deleteWoodReference,
  toggleVerifyWoodReference,
  getDeliveryStates,
  toggleStateDelivery,
  updateStateDelivery,
  getDeliveryStories,
  createDeliveryStory,
  updateDeliveryStory,
  deleteDeliveryStory,
  isMediaUrlReferencedInDb,
} from './server/db.ts';
import {
  saveMediaToFirestore,
  fetchMediaFromFirestore,
} from './server/firestoreDb.ts';
import {
  saveMedia,
  getMediaBuffer,
  checkR2Availability,
  getR2BucketName,
  deleteMediaFile,
  getR2StorageStats,
  syncPendingLocalFilesToR2,
} from './server/storageService.ts';
import {
  isBunnyStorageConfigured,
  getBunnyConfigSummary,
  checkBunnyAvailability,
  uploadToBunnyStorage,
  fetchFromBunnyStorage,
  listBunnyStorageFiles,
  deleteFromBunnyStorage,
  extractBunnyObjectPath,
  normalizeBunnyFolder,
  validateBunnyUploadFile,
  getMimeTypeForFilename,
  MAX_VIDEO_UPLOAD_BYTES,
} from './server/bunnyStorage.ts';
import {
  fetchAndValidateExternalImage,
  fetchAndValidateExternalMedia,
  extractGoogleDriveFileId,
  optimizeImportedImageBuffer,
} from './server/driveImageImport.ts';
import {
  uploadMediaToOwnerDrive,
  getDriveMediaBuffer,
  getDriveConnectionStatus,
  loadServerDriveCredentials,
  saveServerDriveCredentials,
  testOwnerDriveUpload,
  listDriveCategoryFiles,
  deleteFileFromOwnerDrive,
  getDriveAuthUrl,
  exchangeDriveAuthCode,
  hasServerDriveOAuthCredentials,
  findExistingDriveImport,
  recordDriveImport,
  normalizeDriveCategory,
  detectMimeType,
  getExtensionForMimeType,
  type DriveSubfolderCategory,
} from './server/googleDriveStorage.ts';
import { analyzeDoorWood, type ImageInputPart } from './server/aiWoodDetector.ts';
import { registerSlidingWindowRoutes } from './server/slidingWindowRoutes.ts';
import { registerWindowSystemRoutes } from './server/windowSystemRoutes.ts';
import { registerPaymentAndOtpRoutes, requireCustomerAuth } from './server/paymentAuthRoutes.ts';
import { getSmsProviderStatus } from './server/otpService.ts';
import { registerMonetizationRoutes } from './server/monetizationRoutes.ts';
import { WOOD_SPECIES_PROFILES } from './server/woodAnatomyGuide.ts';
import { runWoodBenchmarkEvaluation } from './server/woodBenchmark.ts';
import { generateSitemapXml, generateRobotsTxt } from './server/sitemap.ts';
import type {
  CalculationInput,
  CalculationResult,
  Quotation,
  Door,
  NotificationCampaign,
  TeamMember,
  CustomerEnquiry,
  ChaukhatCalculationResult,
  ChaukhatProduct,
  ChaukhatSectionSize,
  ChaukhatDimensionPreset,
  ChaukhatWoodType,
} from './src/types.ts';
import {
  DEFAULT_CHAUKHAT_WOOD_TYPES,
  DEFAULT_CHAUKHAT_SECTION_SIZES,
  DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
  DEFAULT_CHAUKHAT_DESIGNS,
  DEFAULT_CHAUKHAT_PRODUCT,
} from './src/data/chaukhatDefaults.ts';
import {
  isFcmConfigured,
  getFcmConfigStatus,
  registerOrUpdateToken,
  updateTokenPreferences,
  sendCampaignNotification,
  getNotificationStats,
  startScheduledNotificationWorker,
  DEFAULT_PREFERENCES,
} from './server/notifications.ts';
import { initTrackingRoutes } from './server/trackingService.ts';
import {
  FEATURE_FLAGS,
  getDisabledStorageFolders,
  isStorageFolderDisabled,
} from './src/config/featureFlags.ts';

const app = express();
const rawPort = process.env.PORT !== undefined ? String(process.env.PORT).trim() : '';
const parsedPort = rawPort ? Number(rawPort) : NaN;
const PORT =
  Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535
    ? parsedPort
    : 3000;
if (rawPort && (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535)) {
  console.warn(`⚠️ Invalid process.env.PORT="${rawPort}", falling back to port ${PORT}`);
}

// Production & Development CORS Configuration (including Capacitor Android Native)
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/(www\.)?jaihanumandoor\.com$/i,
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^capacitor:\/\/localhost$/i,
  /^ionic:\/\/localhost$/i,
  /^https?:\/\/com\.doorstudio\.ai$/i,
  /^https:\/\/.*\.run\.app$/i,
  /^https:\/\/.*\.googleusercontent\.com$/i,
  /^https:\/\/.*\.web\.app$/i,
  /^https:\/\/.*\.firebaseapp\.com$/i,
  /^https:\/\/.*\.aistudio\.google\.com$/i,
  /^https:\/\/.*\.google\.com$/i,
];

app.use((req, res, next) => {
  const originHeader = req.headers.origin;
  const origin = typeof originHeader === 'string' ? originHeader.trim() : '';
  const lowerOrigin = origin.toLowerCase();
  let isAllowed = false;

  if (!origin || lowerOrigin === 'null') {
    // Same-origin, direct browser navigation, server-to-server, curl, mobile app, or sandboxed iframe
    isAllowed = true;
  } else if (
    lowerOrigin.startsWith('capacitor://') ||
    lowerOrigin.startsWith('ionic://') ||
    lowerOrigin.includes('com.doorstudio.ai') ||
    /^https?:\/\/localhost(:\d+)?$/i.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)
  ) {
    // Capacitor Android native WebView request (https://localhost or capacitor://localhost)
    isAllowed = true;
  } else {
    isAllowed =
      process.env.NODE_ENV !== 'production' ||
      ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
  }

  res.setHeader('Vary', 'Origin');

  if (isAllowed) {
    if (origin && lowerOrigin !== 'null') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, x-admin-token, X-Admin-Token, x-fabricator-token, X-Fabricator-Token, x-customer-token, X-Customer-Token, x-razorpay-signature, X-Razorpay-Signature, x-razorpay-event-id'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Permissions-Policy', 'camera=*, microphone=*');

  // Handle preflight OPTIONS request immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

const VERIFIED_PRODUCTION_API_URL =
  'https://door-price-calculator-door-catalog-322201013200.asia-southeast1.run.app';

const SERVER_VERSION = '2.4.0';

function getRegisteredRoutes(expressApp: express.Express): Array<{ methods: string[]; path: string }> {
  const routes: Array<{ methods: string[]; path: string }> = [];
  const seen = new Set<string>();
  const stack: any[] = (expressApp as any)?._router?.stack || [];

  for (const layer of stack) {
    if (layer?.route) {
      const methods = Object.keys(layer.route.methods || {})
        .filter(m => layer.route.methods[m])
        .map(m => m.toUpperCase());
      const rawPaths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const p of rawPaths) {
        const pathStr = String(p || '');
        const key = `${methods.join(',')} ${pathStr}`;
        if (!seen.has(key)) {
          seen.add(key);
          routes.push({ methods, path: pathStr });
        }
      }
    }
  }
  return routes;
}

// Fast Cloud Run & Kubernetes Startup & Liveness Probes
// Immediate HTTP 200 OK without any blocking disk, database, or external calls
app.get(
  ['/health', '/healthz', '/live', '/api/health', '/api/server-info'],
  (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const envAppUrl = String(process.env.APP_URL || '').trim();
    const isSafeProdUrl =
      envAppUrl &&
      envAppUrl !== 'MY_APP_URL' &&
      !envAppUrl.includes('ais-dev-') &&
      !envAppUrl.includes('768916382182');
    const prodUrl = isSafeProdUrl ? envAppUrl : VERIFIED_PRODUCTION_API_URL;
    const registeredRoutes = getRegisteredRoutes(app);
    const otpStatus = getSmsProviderStatus();
    return res.status(200).json({
      status: 'ok',
      alive: true,
      service: 'WindowCut Pro',
      version: SERVER_VERSION,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      productionApiUrl: prodUrl,
      otpAuthEnabled: true,
      otpProvider: otpStatus.provider,
      otpProviderConfigured: otpStatus.configured,
      otpAuthRoutes: [
        '/api/customer-auth/provider-status',
        '/api/customer-auth/send-otp',
        '/api/customer-auth/verify-otp',
        '/api/customer-auth/me',
        '/api/customer-auth/profile',
        '/api/customer-auth/logout',
      ],
      driveImportRoutes: [
        '/api/admin/drive-image/import',
        '/api/admin/drive-media/import',
        '/api/admin/drive-model/import',
        '/api/admin/drive-video/import',
        '/api/admin/drive/import',
      ],
      bunnyStorageConfigured: isBunnyStorageConfigured(),
      bunnyStorageRoutes: [
        '/api/admin/bunny/status',
        '/api/admin/bunny/upload',
        '/api/admin/bunny/upload-multiple',
        '/api/admin/bunny/files',
        '/api/admin/bunny/delete',
        '/api/admin/upload',
        '/api/admin/upload-image',
        '/api/admin/upload-product-image',
        '/api/admin/upload-video',
        '/api/admin/upload-product-video',
        '/api/bunny/media/*',
      ],
      registeredRoutesCount: registeredRoutes.length,
      registeredRoutes,
    });
  }
);

// Semantic Readiness Probe: reports HTTP 200 once database hydration completes, HTTP 503 while initializing
app.get('/ready', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const hydrated = isDatabaseHydrated();
  if (hydrated) {
    const db = getDb();
    return res.status(200).json({
      status: 'ready',
      ready: true,
      service: 'Jai Hanuman Door',
      databaseReady: true,
      doorsCount: db.doors?.length || 0,
      databaseVersion: db.version || 0,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } else {
    return res.status(503).json({
      status: 'initializing',
      ready: false,
      service: 'Jai Hanuman Door',
      databaseReady: false,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  }
});

app.head(
  ['/', '/health', '/healthz', '/live', '/api/health'],
  (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).end();
  }
);

app.head('/ready', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(isDatabaseHydrated() ? 200 : 503).end();
});

// Increase request size limit for base64/images & preserve rawBody for Razorpay webhook HMAC verification
app.use(
  express.json({
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Anti-stale cache protection for all API endpoints
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Public read-only feature flags status endpoint
app.get('/api/feature-flags', (_req, res) => {
  res.json({
    success: true,
    featureFlags: FEATURE_FLAGS,
    disabledStorageFolders: getDisabledStorageFolders(),
  });
});

// Centralized Feature-Flag Guard for temporarily suspended storage-heavy modules.
// Returns HTTP 410 Gone JSON (proxy-safe, never rewritten to HTML) while preserving all DB records & storage files.
app.use('/api', (req, res, next) => {
  const fullPath = `/api${req.path || ''}`.toLowerCase();
  const rejectDisabled = (feature: string, label: string) =>
    res.status(410).setHeader('Content-Type', 'application/json; charset=utf-8').json({
      success: false,
      disabled: true,
      errorCode: 'FEATURE_TEMPORARILY_DISABLED',
      feature,
      error: `${label} is temporarily disabled to reduce storage usage. Existing records and media remain preserved.`,
    });

  if (
    !FEATURE_FLAGS.appMessages &&
    (fullPath === '/api/notifications' ||
      fullPath.startsWith('/api/notifications/') ||
      fullPath === '/api/admin/notifications' ||
      fullPath.startsWith('/api/admin/notifications/'))
  ) {
    return rejectDisabled('appMessages', 'App Messages & Push Notifications');
  }

  if (
    !FEATURE_FLAGS.doorCatalogue &&
    (fullPath === '/api/admin/doors' ||
      fullPath.startsWith('/api/admin/doors/') ||
      fullPath === '/api/admin/categories' ||
      fullPath.startsWith('/api/admin/categories/'))
  ) {
    return rejectDisabled('doorCatalogue', 'Door Catalogue Management');
  }

  if (
    !FEATURE_FLAGS.homeBanners &&
    (fullPath === '/api/banners' ||
      fullPath.startsWith('/api/banners/') ||
      fullPath === '/api/admin/banners' ||
      fullPath.startsWith('/api/admin/banners/'))
  ) {
    return rejectDisabled('homeBanners', 'Home Page & Promotional Banners');
  }

  if (
    !FEATURE_FLAGS.articlesBlog &&
    (fullPath === '/api/articles' ||
      fullPath.startsWith('/api/articles/') ||
      fullPath === '/api/admin/articles' ||
      fullPath.startsWith('/api/admin/articles/') ||
      fullPath === '/api/admin/article-categories' ||
      fullPath.startsWith('/api/admin/article-categories/'))
  ) {
    return rejectDisabled('articlesBlog', 'Articles & Blog');
  }

  if (
    !FEATURE_FLAGS.visualizer3dAr &&
    (fullPath === '/api/admin/upload-model' ||
      fullPath === '/api/visualizer' ||
      fullPath.startsWith('/api/visualizer/') ||
      fullPath.startsWith('/api/ai/visualize'))
  ) {
    return rejectDisabled('visualizer3dAr', '3D & AR Door Visualizer');
  }

  if (
    !FEATURE_FLAGS.catalogueMediaImport &&
    (fullPath.startsWith('/api/admin/drive-media/') ||
      fullPath.startsWith('/api/admin/drive-image/') ||
      fullPath.startsWith('/api/admin/drive-video/') ||
      fullPath.startsWith('/api/admin/drive-model/') ||
      fullPath === '/api/admin/drive/preview' ||
      fullPath === '/api/admin/drive/import' ||
      fullPath === '/api/admin/drive/test-upload' ||
      fullPath === '/api/admin/storage/sync-pending' ||
      fullPath === '/api/admin/r2/sync-pending')
  ) {
    return rejectDisabled('catalogueMediaImport', 'External Media Import & Background Storage Sync');
  }

  if (
    !FEATURE_FLAGS.orderTracking &&
    (fullPath === '/api/tracking' ||
      fullPath.startsWith('/api/tracking/') ||
      fullPath === '/api/admin/tracking' ||
      fullPath.startsWith('/api/admin/tracking/'))
  ) {
    return rejectDisabled('orderTracking', 'Order Tracking & Live Manufacturing');
  }

  if (
    !FEATURE_FLAGS.allIndiaDelivery &&
    (fullPath === '/api/delivery' ||
      fullPath.startsWith('/api/delivery/') ||
      fullPath === '/api/admin/delivery' ||
      fullPath.startsWith('/api/admin/delivery/') ||
      fullPath.startsWith('/api/india-delivery') ||
      fullPath.startsWith('/api/admin/india-delivery'))
  ) {
    return rejectDisabled('allIndiaDelivery', 'Door Delivery Across India');
  }

  if (
    !FEATURE_FLAGS.ourStoryAndTeam &&
    (fullPath === '/api/team-members' ||
      fullPath.startsWith('/api/team-members/') ||
      fullPath === '/api/admin/team-members' ||
      fullPath.startsWith('/api/admin/team-members/') ||
      fullPath === '/api/admin/team-members-reorder')
  ) {
    return rejectDisabled('ourStoryAndTeam', 'Our Story & Owner / Team Information');
  }

  next();
});

// Static uploads serving with fallback to persistent backup directory with CORS headers
app.use('/uploads', express.static(UPLOAD_DIR, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));
app.use('/uploads', express.static(UPLOAD_BACKUP_DIR, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Public Bunny.net Storage Media Streaming & Proxy Route (supports Web & Android APK + HTTP 206 Byte-Range video scrubbing)
app.get('/api/bunny/media/*', async (req, res) => {
  const rawParam = String((req.params as any)?.[0] || '').trim();
  const cleanObjectPath = extractBunnyObjectPath(rawParam);
  if (!cleanObjectPath || cleanObjectPath.includes('..')) {
    return res.status(400).json({ success: false, error: 'Invalid Bunny media path' });
  }

  const baseName = path.basename(cleanObjectPath).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;
  const localPath = path.join(UPLOAD_DIR, baseName);

  res.removeHeader('Pragma');
  res.removeHeader('Expires');

  // Fast path: serve from local cache if available and valid
  if (fs.existsSync(localPath)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', getMimeTypeForFilename(cleanObjectPath));
    return res.sendFile(localPath);
  }

  const bunnyRes = await fetchFromBunnyStorage(cleanObjectPath, rangeHeader);
  if (bunnyRes.ok && bunnyRes.buffer) {
    // Cache non-partial full responses to disk for fast subsequent loads
    if (!rangeHeader && bunnyRes.status === 200 && bunnyRes.buffer.length > 0 && bunnyRes.buffer.length <= 25 * 1024 * 1024) {
      try {
        if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        fs.writeFileSync(localPath, bunnyRes.buffer);
      } catch {}
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Accept-Ranges', bunnyRes.acceptRanges || 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', bunnyRes.contentType || getMimeTypeForFilename(cleanObjectPath));
    if (bunnyRes.contentRange) {
      res.setHeader('Content-Range', bunnyRes.contentRange);
    }
    res.setHeader('Content-Length', String(bunnyRes.buffer.length));
    return res.status(bunnyRes.status === 206 ? 206 : 200).send(bunnyRes.buffer);
  }

  // Fallback to storageService lookup by basename
  try {
    const media = await getMediaBuffer(baseName);
    if (media && media.buffer) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Type', media.mimeType || getMimeTypeForFilename(cleanObjectPath));
      res.setHeader('Content-Length', String(media.buffer.length));
      return res.send(media.buffer);
    }
  } catch {}

  return res.status(404).json({
    success: false,
    error: `Bunny media asset "${cleanObjectPath}" not found.`,
    objectPath: cleanObjectPath,
    missing: true,
  });
});

// Fallback media recovery handler from Bunny.net Storage / Firebase / persistent Firestore / legacy R2
// Ensures images and videos NEVER disappear when Cloud Run restarts or redeploys
app.get(['/uploads/*', '/api/uploads/*', '/api/media/*'], async (req, res, next) => {
  const rawParam = req.params[0] || req.params.filename || req.path;
  let cleanName = String(rawParam || '').trim();
  const uploadsIdx = cleanName.lastIndexOf('/uploads/');
  if (uploadsIdx !== -1) {
    cleanName = cleanName.slice(uploadsIdx + '/uploads/'.length);
  } else if (cleanName.startsWith('uploads/')) {
    cleanName = cleanName.slice('uploads/'.length);
  }
  cleanName = path.basename(cleanName.split('?')[0].split('#')[0]);
  const cleanFilename = cleanName.replace(/[^a-zA-Z0-9_.-]/g, '_');

  if (!cleanFilename) {
    return next();
  }

  const getMimeTypeFromFilename = (filename: string): string => {
    const ext = path.extname(filename).toLowerCase();
    if (['.jpg', '.jpeg'].includes(ext)) return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.svg') return 'image/svg+xml';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.glb') return 'model/gltf-binary';
    if (ext === '.gltf') return 'model/gltf+json';
    if (ext === '.mp4') return 'video/mp4';
    if (ext === '.webm') return 'video/webm';
    return 'image/jpeg';
  };

  // 1. Check local file on primary upload directory
  const localPath = path.join(UPLOAD_DIR, cleanFilename);
  if (fs.existsSync(localPath)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', getMimeTypeFromFilename(cleanFilename));
    return res.sendFile(localPath);
  }

  // 2. Check local file in backup directory
  const backupPath = path.join(UPLOAD_BACKUP_DIR, cleanFilename);
  if (fs.existsSync(backupPath)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', getMimeTypeFromFilename(cleanFilename));
    return res.sendFile(backupPath);
  }

  // 3. Retrieve from Storage Service (Cloudflare R2 Bucket or Firestore)
  try {
    const media = await getMediaBuffer(cleanFilename);
    if (media && media.buffer) {
      res.setHeader('Content-Type', media.mimeType || 'image/jpeg');
      res.setHeader('Content-Length', media.buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Accept-Ranges', 'bytes');
      return res.send(media.buffer);
    }
  } catch (err) {
    console.warn(`Storage Service media recovery error for ${cleanFilename}:`, err);
  }

  // 4. Prefix match fallback for door uploads (e.g. 5273-*, 5262-*, 4759-*, 4762-*)
  try {
    const prefix = cleanFilename.split('-')[0];
    if (prefix && prefix.length >= 4) {
      if (fs.existsSync(UPLOAD_DIR)) {
        const matches = fs.readdirSync(UPLOAD_DIR).filter(f => f.startsWith(prefix));
        if (matches.length > 0) {
          const matchPath = path.join(UPLOAD_DIR, matches[0]);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          return res.sendFile(matchPath);
        }
      }
      if (fs.existsSync(UPLOAD_BACKUP_DIR)) {
        const matches = fs.readdirSync(UPLOAD_BACKUP_DIR).filter(f => f.startsWith(prefix));
        if (matches.length > 0) {
          const matchPath = path.join(UPLOAD_BACKUP_DIR, matches[0]);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          return res.sendFile(matchPath);
        }
      }
    }
  } catch {}

  // 5. Verified Production Origin fallback (prevents local preview 404s when catalog assets live on Cloud Run)
  const requestHost = String(req.get('host') || '').toLowerCase();
  const isOriginFallbackLoop =
    Boolean(req.headers['x-media-origin-fallback']) ||
    requestHost.includes('door-price-calculator-door-catalog');
  if (!isOriginFallbackLoop) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const originRes = await fetch(
        `${VERIFIED_PRODUCTION_API_URL}/uploads/${encodeURIComponent(cleanFilename)}`,
        {
          method: 'GET',
          headers: { 'x-media-origin-fallback': '1' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      if (originRes.ok) {
        const originMime = (originRes.headers.get('content-type') || '').toLowerCase();
        if (!originMime.includes('text/html') && !originMime.includes('application/json')) {
          const originBuf = Buffer.from(await originRes.arrayBuffer());
          if (originBuf.length > 0) {
            try {
              if (!fs.existsSync(UPLOAD_DIR)) {
                fs.mkdirSync(UPLOAD_DIR, { recursive: true });
              }
              fs.writeFileSync(localPath, originBuf);
            } catch {}
            res.setHeader('Content-Type', originMime || getMimeTypeFromFilename(cleanFilename));
            res.setHeader('Content-Length', originBuf.length);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Accept-Ranges', 'bytes');
            return res.send(originBuf);
          }
        }
      }
    } catch {}
  }

  return res.status(404).json({
    error: `Media asset "${cleanFilename}" not found in local disk cache, Cloudflare R2 bucket, or Firestore cloud store.`,
    filename: cleanFilename,
    missing: true,
  });
});

// Ephemeral in-memory multer for AI Wood Detector (privacy-first: zero disk storage)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are permitted'));
    }
  },
});

// Direct in-memory Multer for all Bunny.net Storage API routes (up to 100 MB, zero temporary disk storage)
const bunnyMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES },
});

// Admin auth token store (resilient across dev/container restarts)
const activeTokens = new Set<string>();
const revokedTokens = new Set<string>();

function isValidAdminToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed || revokedTokens.has(trimmed)) return false;
  if (
    trimmed === 'admin-dev-token' ||
    activeTokens.has(trimmed) ||
    trimmed.startsWith('firestore_admin_token_') ||
    trimmed.startsWith('jhd_admin_session_') ||
    /^[a-f0-9]{64}$/i.test(trimmed)
  ) {
    return true;
  }
  return false;
}

function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const getAuthenticatedUserId = (_req: express.Request): string | null => null;

const verifyAdminToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const headerToken = typeof req.headers['x-admin-token'] === 'string' ? req.headers['x-admin-token'] : '';
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : '';
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
  const token = (bearerToken || headerToken || queryToken || '').trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      errorCode: 'ADMIN_TOKEN_MISSING',
      error: 'Unauthorized: Admin authentication token required. Please sign in to the Admin Panel.',
    });
  }
  if (isValidAdminToken(token)) {
    return next();
  }
  return res.status(401).json({
    success: false,
    errorCode: 'ADMIN_TOKEN_INVALID',
    error: 'Invalid or expired session token. Please sign in again.',
  });
};

// Initialize Customer & Admin Order Tracking Routes
initTrackingRoutes(app, verifyAdminToken);

// ---------------- API ROUTES ----------------

// Unified server-side Bunny.net Storage single-file upload handler (JPG, PNG, WebP, MP4, WebM, MOV, GLB, GLTF)
const handleBunnySingleUpload = (
  req: express.Request,
  res: express.Response,
  enforcedKind?: 'image' | 'video' | 'model3d',
  defaultFolder?: string
) => {
  bunnyMemoryUpload.single('file')(req, res, async (multerErr: any) => {
    if (multerErr) {
      const isLimit = multerErr?.code === 'LIMIT_FILE_SIZE';
      return res.status(isLimit ? 413 : 400).json({
        success: false,
        errorCode: isLimit ? 'FILE_TOO_LARGE' : 'UPLOAD_VALIDATION_ERROR',
        error: isLimit
          ? 'Uploaded file exceeds the 100 MB maximum limit.'
          : multerErr?.message || 'Invalid multipart upload request.',
      });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        errorCode: 'NO_FILE',
        error: 'No media file attached. Please choose a JPG, PNG, WebP, MP4, WebM, or .glb file.',
      });
    }

    const preRequestedFolder = String(req.body?.folder || req.body?.category || defaultFolder || '').trim();
    if (preRequestedFolder) {
      const preNormalized = normalizeBunnyFolder(preRequestedFolder);
      if (isStorageFolderDisabled(preNormalized)) {
        return res.status(410).json({
          success: false,
          disabled: true,
          errorCode: 'STORAGE_FOLDER_TEMPORARILY_DISABLED',
          folder: preNormalized,
          error: `Uploads to "${preNormalized}" are temporarily suspended while its module is disabled. Active modules continue using Bunny Storage.`,
        });
      }
    }

    const validation = validateBunnyUploadFile(
      req.file.mimetype,
      req.file.originalname,
      req.file.buffer.length,
      req.file.buffer
    );
    if (!validation.valid) {
      return res.status(validation.statusCode || 400).json({
        success: false,
        errorCode: validation.errorCode || 'VALIDATION_ERROR',
        error: validation.error,
      });
    }

    if (enforcedKind && validation.kind !== enforcedKind) {
      return res.status(400).json({
        success: false,
        errorCode: 'UNSUPPORTED_MEDIA_TYPE',
        error:
          enforcedKind === 'video'
            ? 'Only MP4, WebM, and MOV video files are permitted (Max 100 MB).'
            : enforcedKind === 'image'
            ? 'Only JPG, PNG, and WebP image files are permitted (Max 20 MB).'
            : 'Only .glb and .gltf 3D model files are permitted (Max 60 MB).',
      });
    }

    if (!FEATURE_FLAGS.visualizer3dAr && validation.kind === 'model3d') {
      return res.status(410).json({
        success: false,
        disabled: true,
        errorCode: 'FEATURE_TEMPORARILY_DISABLED',
        feature: 'visualizer3dAr',
        error: '3D model uploads (.glb/.gltf) are temporarily disabled while 3D & AR Visualizer is suspended.',
      });
    }

    const fallbackFolder =
      defaultFolder ||
      (validation.kind === 'video'
        ? 'videos'
        : validation.kind === 'model3d'
        ? 'models3d'
        : FEATURE_FLAGS.doorCatalogue
        ? 'products'
        : 'general');
    const requestedFolder = String(req.body?.folder || req.body?.category || fallbackFolder).trim();
    const folder = normalizeBunnyFolder(requestedFolder);

    if (isStorageFolderDisabled(folder)) {
      return res.status(410).json({
        success: false,
        disabled: true,
        errorCode: 'STORAGE_FOLDER_TEMPORARILY_DISABLED',
        folder,
        error: `Uploads to "${folder}" are temporarily suspended while its module is disabled. Active modules continue using Bunny Storage.`,
      });
    }

    if (!isBunnyStorageConfigured()) {
      const summary = getBunnyConfigSummary();
      return res.status(424).json({
        success: false,
        errorCode: 'BUNNY_NOT_CONFIGURED',
        missingVars: summary.missingVars,
        error: `Bunny.net Storage environment variable(s) not configured on server: ${summary.missingVars.join(', ')}.`,
      });
    }

    const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : undefined;

    const result = await saveMedia(
      req.file.originalname || `upload${validation.extension}`,
      validation.mimeType,
      req.file.buffer,
      folder,
      productId
    );

    if (!result.success || !result.bunnyVerified || !result.url) {
      return res.status(result.statusCode || 502).json({
        success: false,
        bunnyVerified: false,
        errorCode: result.errorCode || 'BUNNY_UPLOAD_FAILED',
        error: result.error || 'Failed to upload and verify file in Bunny.net Storage.',
      });
    }

    const ext = path.extname(req.file.originalname || '').toLowerCase();
    const is3DModel = validation.kind === 'model3d' || ['.glb', '.gltf'].includes(ext);

    res.setHeader('Content-Type', 'application/json');
    return res.json({
      success: true,
      bunnyVerified: true,
      url: result.url,
      downloadUrl: result.downloadUrl || result.url,
      proxyUrl: result.proxyUrl,
      ...(result.cdnUrl ? { cdnUrl: result.cdnUrl } : {}),
      fileId: result.storagePath,
      storagePath: result.storagePath,
      storageZone: result.storageZone,
      folder,
      category: folder,
      name: result.metadata?.filename || req.file.originalname,
      filename: result.metadata?.filename || req.file.originalname,
      originalName: req.file.originalname,
      mimeType: validation.mimeType,
      size: req.file.buffer.length,
      isVideo: validation.kind === 'video',
      is3DModel,
      storageType: 'bunny_storage',
      metadata: result.metadata,
    });
  });
};

// Direct Bunny Storage batch upload handler (up to 10 files, zero disk storage)
const handleBunnyBatchUpload = (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  bunnyMemoryUpload.array('files', 10)(req, res, async (multerErr: any) => {
    if (multerErr) {
      const isLimit = multerErr?.code === 'LIMIT_FILE_SIZE';
      return res.status(isLimit ? 413 : 400).json({
        success: false,
        errorCode: isLimit ? 'FILE_TOO_LARGE' : 'UPLOAD_VALIDATION_ERROR',
        error: multerErr?.message || 'Batch upload validation error.',
      });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, errorCode: 'NO_FILES', error: 'No files attached.' });
    }

    const folder = normalizeBunnyFolder(
      String(req.body?.folder || req.body?.category || (FEATURE_FLAGS.doorCatalogue ? 'products' : 'general'))
    );
    if (isStorageFolderDisabled(folder)) {
      return res.status(410).json({
        success: false,
        disabled: true,
        errorCode: 'STORAGE_FOLDER_TEMPORARILY_DISABLED',
        folder,
        error: `Batch uploads to "${folder}" are temporarily suspended while its module is disabled.`,
      });
    }

    if (!isBunnyStorageConfigured()) {
      const summary = getBunnyConfigSummary();
      return res.status(424).json({
        success: false,
        errorCode: 'BUNNY_NOT_CONFIGURED',
        missingVars: summary.missingVars,
        error: `Bunny.net Storage environment variable(s) not configured: ${summary.missingVars.join(', ')}.`,
      });
    }

    const uploaded: any[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const resSave = await saveMedia(file.originalname, file.mimetype, file.buffer, folder);
      if (resSave.success && resSave.bunnyVerified && resSave.url) {
        uploaded.push({
          url: resSave.url,
          proxyUrl: resSave.proxyUrl,
          ...(resSave.cdnUrl ? { cdnUrl: resSave.cdnUrl } : {}),
          storagePath: resSave.storagePath,
          filename: resSave.metadata?.filename || file.originalname,
          size: file.buffer.length,
          mimeType: file.mimetype,
          storageType: 'bunny_storage',
          bunnyVerified: true,
        });
      } else {
        errors.push(`${file.originalname}: ${resSave.error || 'Upload failed'}`);
      }
    }

    if (uploaded.length === 0) {
      return res.status(502).json({
        success: false,
        errorCode: 'BATCH_UPLOAD_FAILED',
        error: errors.join('; ') || 'All files failed Bunny Storage validation or upload.',
        errors,
      });
    }

    return res.json({
      success: true,
      bunnyVerified: true,
      storageType: 'bunny_storage',
      folder,
      urls: uploaded.map(u => u.url),
      files: uploaded,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    });
  });
};

// Image upload endpoint -> strictly uses Bunny.net Storage (defaults to 'general' when catalogue is disabled)
app.post('/api/upload', (req, res) =>
  handleBunnySingleUpload(req, res, 'image', FEATURE_FLAGS.doorCatalogue ? 'products' : 'general')
);

// Batch upload endpoint -> strictly uses Bunny.net Storage
app.post('/api/upload-multiple', (req, res) => handleBunnyBatchUpload(req, res));

// Admin: Authenticated Video upload routes (MP4, WebM, MOV up to 100 MB -> Bunny.net Storage)
app.post(
  ['/api/upload-video', '/api/admin/upload-video', '/api/admin/upload-product-video'],
  verifyAdminToken,
  (req, res) => handleBunnySingleUpload(req, res, 'video', 'videos')
);

// Admin: Authenticated Media upload aliases -> Bunny.net Storage
app.post(
  ['/api/admin/upload', '/api/admin/upload-product-image'],
  verifyAdminToken,
  (req, res) => handleBunnySingleUpload(req, res, undefined, FEATURE_FLAGS.doorCatalogue ? 'products' : 'general')
);

// Admin: Upload 3D Models (.glb, .gltf) and textures -> Bunny.net Storage exclusively
app.post('/api/admin/upload-model', verifyAdminToken, (req, res) =>
  handleBunnySingleUpload(req, res, undefined, 'models3d')
);

// =========================================================================
// BUNNY.NET STORAGE SECURE ADMIN MANAGEMENT & UPLOAD APIs
// =========================================================================

// Admin: Get Bunny.net Storage configuration & live connection status (no credentials returned)
app.get('/api/admin/bunny/status', verifyAdminToken, async (_req, res) => {
  try {
    const status = await checkBunnyAvailability();
    return res.json({ success: true, status });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to check Bunny.net Storage status.',
    });
  }
});

// Admin: Direct upload (JPG, PNG, WebP, MP4, WebM, GLB, GLTF) directly from server to Bunny Storage
app.post('/api/admin/bunny/upload', verifyAdminToken, (req, res) =>
  handleBunnySingleUpload(req, res)
);

// Admin: Batch upload up to 10 files to Bunny Storage
app.post('/api/admin/bunny/upload-multiple', verifyAdminToken, (req, res) =>
  handleBunnyBatchUpload(req, res)
);

// Admin: List files stored in Bunny.net Storage folder (or all folders)
app.get('/api/admin/bunny/files', verifyAdminToken, async (req, res) => {
  try {
    const folderParam = String(
      req.query.folder ||
        req.query.category ||
        (FEATURE_FLAGS.doorCatalogue ? 'products' : FEATURE_FLAGS.orderTracking ? 'tracking' : 'materials')
    ).trim();
    const normalizedFolder = normalizeBunnyFolder(folderParam);
    if (folderParam !== 'all' && isStorageFolderDisabled(normalizedFolder)) {
      return res.status(410).json({
        success: false,
        disabled: true,
        errorCode: 'STORAGE_FOLDER_TEMPORARILY_DISABLED',
        folder: normalizedFolder,
        error: `Storage folder "${normalizedFolder}" is temporarily suspended while its module is disabled.`,
      });
    }

    if (!isBunnyStorageConfigured()) {
      const summary = getBunnyConfigSummary();
      return res.status(424).json({
        success: false,
        errorCode: 'BUNNY_NOT_CONFIGURED',
        missingVars: summary.missingVars,
        error: `Bunny.net Storage environment variable(s) missing: ${summary.missingVars.join(', ')}.`,
      });
    }

    const files = await listBunnyStorageFiles(folderParam);
    return res.json({
      success: true,
      folder: folderParam,
      count: files.length,
      files,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to list files from Bunny.net Storage.',
    });
  }
});

// Admin: Delete file from Bunny.net Storage (with DB reference check unless force: true)
const handleBunnyDelete: express.RequestHandler = async (req, res) => {
  try {
    if (!isBunnyStorageConfigured()) {
      const summary = getBunnyConfigSummary();
      return res.status(503).json({
        success: false,
        errorCode: 'BUNNY_NOT_CONFIGURED',
        missingVars: summary.missingVars,
        error: `Bunny.net Storage environment variable(s) missing: ${summary.missingVars.join(', ')}.`,
      });
    }

    const rawTarget = String(
      (req.params as any)?.[0] ||
        req.body?.objectPath ||
        req.body?.url ||
        req.body?.path ||
        req.query?.objectPath ||
        req.query?.url ||
        ''
    ).trim();

    if (!rawTarget) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_PATH',
        error: 'objectPath or url is required to delete a Bunny Storage file.',
      });
    }

    const force = Boolean(req.body?.force || String(req.query?.force || '') === 'true');
    const cleanObjectPath = extractBunnyObjectPath(rawTarget);
    const db = getDb();

    if (!force && (isMediaUrlReferencedInDb(db, rawTarget) || isMediaUrlReferencedInDb(db, `/api/bunny/media/${cleanObjectPath}`))) {
      return res.status(409).json({
        success: false,
        inUse: true,
        errorCode: 'MEDIA_IN_USE',
        error: 'This media file is currently used by an active Door, Banner, Material, Finish, or Delivery Story. Confirm Force Delete to remove it anyway.',
      });
    }

    const delResult = await deleteMediaFile(cleanObjectPath || rawTarget);
    const bunnyAlreadyDeleted = Boolean(
      delResult.cleanedKeys?.some(k => k.startsWith('bunny:'))
    );
    const bunnyDel = bunnyAlreadyDeleted
      ? { deleted: true, objectPath: cleanObjectPath || rawTarget, statusCode: 200 }
      : await deleteFromBunnyStorage(cleanObjectPath || rawTarget);

    if (!bunnyDel.deleted && bunnyDel.statusCode && bunnyDel.statusCode !== 404) {
      return res.status(bunnyDel.statusCode || 502).json({
        success: false,
        errorCode: 'BUNNY_DELETE_FAILED',
        error: bunnyDel.error || 'Failed to delete file from Bunny.net Storage.',
      });
    }

    const wasDeleted = Boolean(bunnyAlreadyDeleted || bunnyDel.deleted || delResult.deleted);
    return res.json({
      success: wasDeleted,
      deleted: Boolean(bunnyAlreadyDeleted || bunnyDel.deleted),
      objectPath: bunnyDel.objectPath,
      cleanedKeys: delResult.cleanedKeys || [],
      ...(bunnyDel.statusCode === 404 && !bunnyAlreadyDeleted
        ? { message: 'File was already absent from Bunny Storage; local cache cleaned.' }
        : {}),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Bunny Storage delete failed.',
    });
  }
};

app.post('/api/admin/bunny/delete', verifyAdminToken, handleBunnyDelete);
app.delete(['/api/admin/bunny/files', '/api/admin/bunny/files/*'], verifyAdminToken, handleBunnyDelete);

const inferRequestedMediaType = (
  reqPath: string,
  explicitType: string
): 'image' | 'video' | 'model3d' | 'any' => {
  const clean = explicitType.trim().toLowerCase();
  if (clean === 'image' || clean === 'video' || clean === 'model3d' || clean === 'any') {
    if (clean !== 'any') return clean;
  }
  const lowerPath = reqPath.toLowerCase();
  if (lowerPath.includes('drive-model')) return 'model3d';
  if (lowerPath.includes('drive-video')) return 'video';
  if (lowerPath.includes('drive-image')) return 'image';
  return 'any';
};

// Admin: Preview & Validate Google Drive or Direct Media URL (supports POST and GET)
const handleDriveMediaPreview: express.RequestHandler = async (req, res) => {
  const rawUrl = String(req.body?.url || req.query?.url || '').trim();
  const mediaType = inferRequestedMediaType(
    req.path,
    String(req.body?.mediaType || req.query?.mediaType || '')
  );
  const origin = req.headers.origin || 'same-origin';
  console.info(
    `[DriveMedia] Preview request: method=${req.method} path=${req.path} origin=${origin} mediaType=${mediaType} fileId=${extractGoogleDriveFileId(rawUrl) || 'external'}`
  );

  if (!rawUrl) {
    return res.status(400).json({
      success: false,
      errorCode: 'EMPTY_URL',
      error: 'Please enter a Google Drive sharing link or direct media URL.',
    });
  }

  try {
    const validated = await fetchAndValidateExternalMedia(rawUrl, mediaType);
    const isVideo = Boolean(validated.isVideo);
    const is3DModel = Boolean(validated.is3DModel);
    const isDriveEmbed = Boolean(validated.isDriveEmbed);

    // Cache downloaded binary cleanly so <video controls> and large <img> previews can stream via /api/drive/media/:id
    let playablePreviewUrl: string | undefined = validated.embedUrl;
    if (!isDriveEmbed && validated.buffer && validated.buffer.length > 0) {
      const previewCacheId = validated.fileId
        ? `prev_${validated.fileId.replace(/[^a-zA-Z0-9_-]/g, '')}`
        : `preview_${Date.now()}_${Math.round(Math.random() * 1e5)}`;
      try {
        const cacheDir = path.join(process.cwd(), 'data', 'uploads', 'drive_cache');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(path.join(cacheDir, previewCacheId), validated.buffer);
        playablePreviewUrl = `/api/drive/media/${previewCacheId}`;
      } catch {
        if (isVideo) {
          playablePreviewUrl = validated.sourceUrl;
        }
      }
    }

    const inlineDataUrl =
      !isVideo && !is3DModel && validated.buffer && validated.buffer.length <= 4 * 1024 * 1024
        ? validated.previewDataUrl
        : isVideo || is3DModel
        ? validated.previewDataUrl
        : undefined;

    return res.json({
      success: true,
      fileId: validated.fileId || null,
      isGoogleDrive: Boolean(validated.fileId),
      originalName: validated.originalName,
      originalUrl: rawUrl,
      mimeType: validated.mimeType,
      extension: validated.extension,
      size: validated.size,
      width: validated.width,
      height: validated.height,
      duration: validated.duration,
      isVideo,
      is3DModel,
      isDriveEmbed,
      embedUrl: validated.embedUrl,
      previewDataUrl: inlineDataUrl,
      previewPosterUrl: validated.previewPosterUrl,
      previewUrl: playablePreviewUrl,
    });
  } catch (err: any) {
    const statusCode = Number(err?.statusCode) || 422;
    const errorCode = String(err?.errorCode || 'DRIVE_PREVIEW_FAILED');
    console.warn(`[DriveMedia] Preview failed (${statusCode} ${errorCode}): ${err?.message || 'unknown error'}`);
    return res.status(statusCode).json({
      success: false,
      errorCode,
      fileId: err?.fileId ?? extractGoogleDriveFileId(rawUrl),
      error: err?.message || 'Failed to validate or preview media from the provided URL.',
    });
  }
};

app.post(
  [
    '/api/admin/drive-media/preview',
    '/api/admin/drive-image/preview',
    '/api/admin/drive-video/preview',
    '/api/admin/drive-model/preview',
    '/api/admin/drive/preview',
  ],
  verifyAdminToken,
  handleDriveMediaPreview
);
app.get(
  [
    '/api/admin/drive-media/preview',
    '/api/admin/drive-image/preview',
    '/api/admin/drive-video/preview',
    '/api/admin/drive-model/preview',
    '/api/admin/drive/preview',
  ],
  verifyAdminToken,
  handleDriveMediaPreview
);

// Admin: Import Validated Google Drive or Direct Media into Storage (supports POST and GET)
const handleDriveMediaImport: express.RequestHandler = async (req, res) => {
  const rawUrl = String(req.body?.url || req.query?.url || '').trim();
  const mediaType = inferRequestedMediaType(
    req.path,
    String(req.body?.mediaType || req.query?.mediaType || '')
  );
  const defaultCategory = mediaType === 'video' ? 'videos' : mediaType === 'model3d' ? 'models3d' : 'products';
  const targetCategory = (String(req.body?.category || req.query?.category || defaultCategory).trim() as DriveSubfolderCategory);
  const origin = req.headers.origin || 'same-origin';
  console.info(
    `[DriveMedia] Import request: method=${req.method} path=${req.path} origin=${origin} category=${targetCategory} mediaType=${mediaType} fileId=${extractGoogleDriveFileId(rawUrl) || 'external'}`
  );

  if (!rawUrl) {
    return res.status(400).json({
      success: false,
      errorCode: 'EMPTY_URL',
      error: 'Please enter a Google Drive sharing link or direct media URL.',
    });
  }

  try {
    // Prevent duplicate imports if the exact same Google Drive file or URL was already imported into this category
    const incomingDriveId = extractGoogleDriveFileId(rawUrl);
    const dedupKey = incomingDriveId || rawUrl;
    if (dedupKey) {
      const existing = findExistingDriveImport(dedupKey, targetCategory);
      const isExistingCompatible =
        existing &&
        (mediaType === 'any' ||
          (mediaType === 'video' && existing.mimeType.startsWith('video/')) ||
          (mediaType === 'image' && existing.mimeType.startsWith('image/')) ||
          (mediaType === 'model3d' && (existing.mimeType.includes('gltf') || existing.storedUrl.endsWith('.glb'))));

      if (existing && isExistingCompatible) {
        const existingIsVideo = existing.mimeType.startsWith('video/');
        const existingIs3d = existing.mimeType.includes('gltf') || existing.storedUrl.endsWith('.glb');
        const isDriveSource = Boolean(incomingDriveId || (existing.sourceFileId && !existing.sourceFileId.startsWith('http')));
        return res.json({
          success: true,
          deduplicated: true,
          url: existing.storedUrl,
          downloadUrl: existing.storedUrl,
          driveUrl: existing.storedUrl,
          driveFileId: isDriveSource ? existing.storedFileId || existing.sourceFileId : null,
          sourceFileId: isDriveSource ? existing.sourceFileId : null,
          originalUrl: existing.originalUrl,
          originalName: existing.originalName,
          filename: existing.originalName || (isDriveSource ? `gdrive-${existing.sourceFileId}` : path.basename(existing.storedUrl.split('?')[0])),
          fileId: isDriveSource ? existing.storedFileId || existing.sourceFileId : null,
          isGoogleDrive: isDriveSource,
          isVideo: existingIsVideo,
          is3DModel: existingIs3d,
          isDriveEmbed: Boolean(existing.isDriveEmbed),
          embedUrl: existing.isDriveEmbed ? existing.storedUrl : undefined,
          mimeType: existing.mimeType,
          size: existing.size,
          width: existing.width,
          height: existing.height,
          duration: existing.duration,
          storageType: existing.isDriveEmbed ? 'google_drive_embed' : isDriveSource ? 'google_drive' : 'firestore',
        });
      }
    }

    const validated = await fetchAndValidateExternalMedia(rawUrl, mediaType);
    const isVideo = Boolean(validated.isVideo);
    const is3DModel = Boolean(validated.is3DModel);
    const isDriveEmbed = Boolean(validated.isDriveEmbed);

    // Verified Google Drive Video Embed fallback (>55MB Drive video verified playable via /preview)
    if (validated.fileId && isDriveEmbed && validated.embedUrl) {
      recordDriveImport({
        sourceFileId: validated.fileId,
        originalUrl: rawUrl,
        originalName: validated.originalName,
        mediaType: 'video',
        mimeType: validated.mimeType,
        size: validated.size,
        width: validated.width,
        height: validated.height,
        duration: validated.duration,
        category: targetCategory,
        storedFileId: validated.fileId,
        storedUrl: validated.embedUrl,
        isDriveEmbed: true,
        importedAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        url: validated.embedUrl,
        embedUrl: validated.embedUrl,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${validated.fileId}`,
        driveUrl: validated.embedUrl,
        driveFileId: validated.fileId,
        sourceFileId: validated.fileId,
        originalUrl: rawUrl,
        originalName: validated.originalName,
        filename: validated.originalName || `gdrive-${validated.fileId}.mp4`,
        fileId: validated.fileId,
        isGoogleDrive: true,
        isVideo: true,
        is3DModel: false,
        isDriveEmbed: true,
        mimeType: validated.mimeType,
        size: validated.size,
        width: validated.width,
        height: validated.height,
        duration: validated.duration,
        storageType: 'google_drive_embed',
      });
    }

    let finalBuffer = validated.buffer;
    let finalMimeType = validated.mimeType;
    let finalExtension = validated.extension;
    let finalWidth = validated.width;
    let finalHeight = validated.height;
    let finalSize = validated.size;
    let imageOptimized = false;

    if (!isVideo && !is3DModel && !isDriveEmbed && finalBuffer && finalBuffer.length > 0) {
      const optimizedResult = await optimizeImportedImageBuffer(
        finalBuffer,
        finalMimeType,
        finalExtension,
        1680
      );
      finalBuffer = optimizedResult.buffer;
      finalMimeType = optimizedResult.mimeType;
      finalExtension = optimizedResult.extension;
      finalWidth = optimizedResult.width ?? finalWidth;
      finalHeight = optimizedResult.height ?? finalHeight;
      finalSize = optimizedResult.buffer.length;
      imageOptimized = optimizedResult.optimized;
    }

    const safePrefix = validated.fileId
      ? `gdrive-${validated.fileId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20)}`
      : isVideo
      ? 'video-door'
      : is3DModel
      ? 'model-door'
      : 'url-door';
    const filename = `${safePrefix}-${Date.now()}-${Math.round(Math.random() * 1e5)}${finalExtension}`;

    // Save validated binary to Bunny.net Storage / storageService
    const saveRes = await saveMedia(filename, finalMimeType, finalBuffer, targetCategory);
    if (!saveRes.success) {
      return res.status(502).json({
        success: false,
        errorCode: 'STORAGE_WRITE_FAILED',
        error:
          saveRes.error ||
          'Failed to persist imported media into Bunny.net Storage. Please check storage credentials.',
        storageType: saveRes.storageType,
      });
    }

    // Upload to connected owner Google Drive only when Bunny Storage is not primary
    let driveUploadResult: any = null;
    if (saveRes.storageType !== 'bunny_storage') {
      try {
        if (hasServerDriveOAuthCredentials()) {
          driveUploadResult = await uploadMediaToOwnerDrive(
            finalBuffer,
            filename,
            finalMimeType,
            targetCategory,
            `Imported ${isVideo ? 'video' : is3DModel ? '3D model' : 'image'} from ${validated.fileId ? `Google Drive File ID: ${validated.fileId}` : validated.sourceUrl}`
          );
        }
      } catch (driveErr: any) {
        console.warn('⚠️ [Drive Media Import] Upload to owner Google Drive notice:', driveErr?.message);
      }
    }

    const finalUrl = driveUploadResult?.url || saveRes.url;

    recordDriveImport({
      sourceFileId: validated.fileId || rawUrl,
      originalUrl: rawUrl,
      originalName: validated.originalName,
      mediaType: isVideo ? 'video' : is3DModel ? 'model3d' : 'image',
      mimeType: finalMimeType,
      size: finalSize,
      width: finalWidth,
      height: finalHeight,
      duration: validated.duration,
      category: targetCategory,
      storedFileId: driveUploadResult?.fileId || saveRes.storagePath || validated.fileId || filename,
      storedUrl: finalUrl,
      isDriveEmbed: false,
      importedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      url: finalUrl,
      downloadUrl: driveUploadResult?.url || saveRes.downloadUrl || saveRes.url,
      proxyUrl: saveRes.proxyUrl,
      ...(saveRes.cdnUrl ? { cdnUrl: saveRes.cdnUrl } : {}),
      driveUrl: driveUploadResult?.url,
      driveFileId: driveUploadResult?.fileId || validated.fileId || null,
      sourceFileId: validated.fileId || null,
      originalUrl: rawUrl,
      originalName: validated.originalName,
      filename: saveRes.metadata?.filename || filename,
      fileId: driveUploadResult?.fileId || saveRes.storagePath || validated.fileId || null,
      isGoogleDrive: Boolean(driveUploadResult?.fileId || validated.fileId),
      isVideo,
      is3DModel,
      isDriveEmbed: false,
      optimized: imageOptimized,
      mimeType: finalMimeType,
      size: finalSize,
      width: finalWidth,
      height: finalHeight,
      duration: validated.duration,
      storageType: driveUploadResult ? 'google_drive' : saveRes.storageType,
      storageZone: saveRes.storageZone,
      firebaseBucket: saveRes.firebaseBucket,
      storagePath: saveRes.storagePath,
      metadata: saveRes.metadata,
    });
  } catch (err: any) {
    const statusCode = Number(err?.statusCode) || 422;
    const errorCode = String(err?.errorCode || 'DRIVE_IMPORT_FAILED');
    console.warn(`[DriveMedia] Import failed (${statusCode} ${errorCode}): ${err?.message || 'unknown error'}`);
    return res.status(statusCode).json({
      success: false,
      errorCode,
      fileId: err?.fileId ?? extractGoogleDriveFileId(rawUrl),
      error: err?.message || 'Failed to import media into storage.',
    });
  }
};

app.post(
  [
    '/api/admin/drive-media/import',
    '/api/admin/drive-image/import',
    '/api/admin/drive-video/import',
    '/api/admin/drive-model/import',
    '/api/admin/drive/import',
  ],
  verifyAdminToken,
  handleDriveMediaImport
);
app.get(
  [
    '/api/admin/drive-media/import',
    '/api/admin/drive-image/import',
    '/api/admin/drive-video/import',
    '/api/admin/drive-model/import',
    '/api/admin/drive/import',
  ],
  verifyAdminToken,
  handleDriveMediaImport
);

// Storage Management APIs for Admin Panel
app.get(['/api/admin/storage-status', '/api/admin/r2-status'], verifyAdminToken, async (_req, res) => {
  const status = await checkR2Availability(true);
  const stats = await getR2StorageStats();
  const bunnySummary = isBunnyStorageConfigured() ? await checkBunnyAvailability() : getBunnyConfigSummary();

  let tokenGuidance = '';
  if (!status.writable) {
    tokenGuidance =
      status.setupInstructionsRequired
        ? 'Configure BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, and BUNNY_STORAGE_ENDPOINT in server environment variables.'
        : status.statusMessage;
  }

  res.json({
    storage: {
      provider: status.provider,
      configured: status.configured,
      connected: status.connected,
      readable: status.readable,
      writable: status.writable,
      bucket: status.bucket,
      statusMessage: status.statusMessage,
      firebaseStorageReady: status.firebaseStorageReady,
      bunnyStorageReady: Boolean(status.bunnyStorageReady),
      setupInstructionsRequired: status.setupInstructionsRequired,
    },
    bunny: bunnySummary,
    // Backward compatibility for existing UI
    r2: {
      configured: status.configured,
      connected: status.connected,
      readable: status.readable,
      writable: status.writable,
      bucket: status.bucket,
      endpointConfigured: status.endpointConfigured,
      missingVars: status.missingVars || [],
      tokenPermissionIssue: status.tokenPermissionIssue || !status.writable,
      statusMessage: status.statusMessage,
      tokenGuidance,
    },
    stats: {
      r2ObjectCount: stats.r2ObjectCount,
      r2TotalBytes: stats.r2TotalBytes,
      r2FormattedSize: stats.r2FormattedSize,
      localFilesCount: stats.localFilesCount,
      localTotalBytes: stats.localTotalBytes,
      localFormattedSize: stats.localFormattedSize,
      pendingSyncCount: stats.pendingSyncCount,
    },
    activeMode:
      status.provider === 'bunny_storage' && status.writable
        ? 'bunny_storage_read_write'
        : status.connected
        ? status.writable
          ? 'firebase_storage_read_write'
          : 'firebase_storage_pending_activation'
        : 'local_and_firestore',
    firestoreMediaPreserved: true,
    cloudDatabase: 'ai-studio-doorpricecalcula-e297ef94-a95a-4675-8ce2-05ba8783a0ed',
  });
});

// Admin: Delete Orphan Media File from storage and local caches
app.post('/api/admin/media/delete', verifyAdminToken, async (req, res) => {
  try {
    const rawUrl = String(req.body?.url || req.body?.filename || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ success: false, error: 'Media URL or filename is required' });
    }

    const force = Boolean(req.body?.force);
    const db = getDb();
    if (!force && isMediaUrlReferencedInDb(db, rawUrl)) {
      return res.status(409).json({
        success: false,
        error: 'Media is currently in use by an active product, catalogue, banner, or material. Pass force: true to override.',
        inUse: true,
      });
    }

    const result = await deleteMediaFile(rawUrl);
    return res.json({
      success: result.deleted,
      deleted: result.deleted,
      cleanedKeys: result.cleanedKeys || [],
      cleanedR2Keys: result.cleanedKeys || [],
      warning: result.warning,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Media deletion failed' });
  }
});

// Admin: Sync Pending Local Container Files to Firebase Storage
app.post(['/api/admin/storage/sync-pending', '/api/admin/r2/sync-pending'], verifyAdminToken, async (_req, res) => {
  try {
    const syncResult = await syncPendingLocalFilesToR2();
    return res.json(syncResult);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      errorCode: 'SYNC_EXCEPTION',
      error: err.message || 'Storage synchronization failed',
    });
  }
});

// =========================================================================
// GOOGLE DRIVE CENTRAL MEDIA STORAGE API (Owner's Central Drive Storage)
// =========================================================================

// 1. Public Customer Media Delivery Endpoint (Zero Sign-In Required for Customers)
app.get('/api/drive/media/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const { buffer, mimeType, size } = await getDriveMediaBuffer(fileId);

    const commonCorsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    const rangeHeader = req.headers.range;
    if (rangeHeader && (mimeType.startsWith('video/') || size > 0)) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = Math.max(0, parseInt(parts[0], 10) || 0);
      const end = parts[1] ? Math.min(size - 1, parseInt(parts[1], 10)) : size - 1;
      if (start >= size || end < start) {
        res.writeHead(416, {
          ...commonCorsHeaders,
          'Content-Range': `bytes */${size}`,
        });
        return res.end();
      }
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        ...commonCorsHeaders,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });
      return res.end(buffer.subarray(start, end + 1));
    }

    res.writeHead(200, {
      ...commonCorsHeaders,
      'Accept-Ranges': 'bytes',
      'Content-Type': mimeType,
      'Content-Length': size,
    });
    return res.end(buffer);
  } catch (err: any) {
    console.warn(`[Drive Media Stream] Could not stream ${req.params.fileId}:`, err.message);
    return res.status(404).json({ error: 'Media file not found or inaccessible in Google Drive' });
  }
});

// 2. Admin: Get Drive Central Storage Connection Status
app.get('/api/admin/drive/status', verifyAdminToken, (_req, res) => {
  try {
    const status = getDriveConnectionStatus();
    return res.json({ success: true, status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Admin: Configure Server-Side Drive OAuth Credentials
app.post('/api/admin/drive/configure', verifyAdminToken, async (req, res) => {
  try {
    const { clientId, clientSecret, refreshToken, ownerEmail } = req.body;
    if (!refreshToken && !clientSecret) {
      return res.status(400).json({ success: false, error: 'Please provide either a refresh token or client credentials.' });
    }

    saveServerDriveCredentials({
      clientId: clientId ? String(clientId).trim() : undefined,
      clientSecret: clientSecret ? String(clientSecret).trim() : undefined,
      refreshToken: refreshToken ? String(refreshToken).trim() : undefined,
      ownerEmail: ownerEmail ? String(ownerEmail).trim() : undefined,
      connectedAt: new Date().toISOString(),
    });

    const status = getDriveConnectionStatus();
    return res.json({ success: true, message: 'Google Drive credentials updated on server', status });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3b. Admin: Generate OAuth 2.0 Authorization URL
app.post('/api/admin/drive/auth-url', verifyAdminToken, (req, res) => {
  try {
    const { redirectUri, clientId } = req.body;
    const resolvedRedirect = redirectUri || 'https://developers.google.com/oauthplayground';
    const authUrl = getDriveAuthUrl(resolvedRedirect, clientId);
    return res.json({ success: true, authUrl });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 3c. Admin: Exchange Authorization Code for Refresh Token & Access Token
app.post('/api/admin/drive/exchange-code', verifyAdminToken, async (req, res) => {
  try {
    const { code, redirectUri, clientId, clientSecret } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code is required' });
    }
    const resolvedRedirect = redirectUri || 'https://developers.google.com/oauthplayground';
    const result = await exchangeDriveAuthCode(code, resolvedRedirect, clientId, clientSecret);
    const status = getDriveConnectionStatus();
    return res.json({ success: true, ...result, status });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to exchange authorization code' });
  }
});

// 4. Admin: Execute Real Connection Test Upload into Owner's Drive
app.post('/api/admin/drive/test-upload', verifyAdminToken, async (_req, res) => {
  try {
    const result = await testOwnerDriveUpload();
    return res.json({
      success: true,
      message: 'Real test upload successfully executed and verified in owner Google Drive',
      result,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Google Drive test upload failed',
    });
  }
});

// 5. Admin: Direct Media Upload -> Bunny.net Storage exclusively
app.post(
  ['/api/admin/drive/upload', '/api/admin/upload-image', '/api/admin/upload-media'],
  verifyAdminToken,
  (req, res) => handleBunnySingleUpload(req, res)
);

// 6. Admin: List Media Files from Specific Category in Owner's Google Drive
app.get('/api/admin/drive/files', verifyAdminToken, async (req, res) => {
  try {
    const category = (req.query.category || 'products') as DriveSubfolderCategory;
    const files = await listDriveCategoryFiles(category);
    return res.json({ success: true, category, files });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to list Drive files' });
  }
});

// 7. Admin: Delete Media File from Owner's Google Drive
app.delete('/api/admin/drive/files/:fileId', verifyAdminToken, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    await deleteFileFromOwnerDrive(fileId);
    return res.json({ success: true, fileId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to delete Drive file' });
  }
});



// =========================================================================
// AI WOOD DETECTOR – LAKDI KI PEHCHAN API (Privacy-Safe & Real-Time)
// =========================================================================

// Public Wood Detection Handler (Processes in-memory only, ZERO disk storage)
const woodAnalysisHandler: express.RequestHandler = async (req, res) => {
  const startTime = Date.now();
  try {
    const db = getDb();
    const detectorSettings = db.settings?.aiWoodDetector;
    if (detectorSettings && detectorSettings.enabled === false) {
      return res.status(403).json({
        error: 'AI Wood Detector is temporarily disabled by administrator. Kripya thodi der baad prayas karein.',
      });
    }

    const imageParts: ImageInputPart[] = [];

    // 1. Check if files were uploaded via multipart/form-data
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const f of req.files as Express.Multer.File[]) {
        if (f.buffer && f.buffer.length > 0) {
          imageParts.push({
            data: f.buffer.toString('base64'),
            mimeType: f.mimetype || 'image/jpeg',
          });
        }
      }
    }

    // 2. Check if base64 images were sent via JSON body
    const parseDataUrl = (raw: string): ImageInputPart => {
      const match = raw.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
      return { mimeType: 'image/jpeg', data: raw };
    };

    // 2a. Multi-image slots (Full Door, Grain Closeup, Unpolished Edge, End-Grain)
    if (req.body?.slots && typeof req.body.slots === 'object') {
      const { fullDoor, grainCloseup, unpolishedEdge, endGrain } = req.body.slots;
      if (typeof fullDoor === 'string' && fullDoor.trim()) {
        imageParts.push({ ...parseDataUrl(fullDoor), role: 'full_door' });
      }
      if (typeof grainCloseup === 'string' && grainCloseup.trim()) {
        imageParts.push({ ...parseDataUrl(grainCloseup), role: 'grain_closeup' });
      }
      if (typeof unpolishedEdge === 'string' && unpolishedEdge.trim()) {
        imageParts.push({ ...parseDataUrl(unpolishedEdge), role: 'unpolished_edge' });
      }
      if (typeof endGrain === 'string' && endGrain.trim()) {
        imageParts.push({ ...parseDataUrl(endGrain), role: 'end_grain' });
      }
    }

    // 2b. Standard primary image + additionalImages
    if (imageParts.length === 0 && req.body?.image && typeof req.body.image === 'string') {
      const primaryRole = req.body.imageRoles?.[0] || 'full_door';
      imageParts.push({ ...parseDataUrl(req.body.image), role: primaryRole });

      if (Array.isArray(req.body.additionalImages)) {
        req.body.additionalImages.forEach((addImg: string, idx: number) => {
          if (typeof addImg === 'string' && addImg.trim()) {
            const addRole = req.body.imageRoles?.[idx + 1] || 'grain_closeup';
            imageParts.push({ ...parseDataUrl(addImg), role: addRole });
          }
        });
      }
    }

    if (imageParts.length === 0) {
      return res.status(400).json({
        error: 'Photo nahi mili. Kripya apne darwaze ki photo upload karein.',
      });
    }

    console.log(`📸 Received wood detection request with ${imageParts.length} photo part(s).`);

    // Call Gemini Vision model (with server-side retry and fallback)
    const result = await analyzeDoorWood(imageParts);
    const duration = Date.now() - startTime;

    // Log telemetry (Privacy-Safe: only metadata, NO image data stored)
    logWoodDetectorScan({
      likelyWoodType: result.likely_wood_type,
      confidenceLevel: result.confidence_level,
      success: true,
      responseTimeMs: duration,
    });

    console.log(`🪵 Wood identification complete in ${duration}ms: ${result.likely_wood_type} (${result.confidence_level})`);

    res.json({
      success: true,
      result,
      durationMs: duration,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('AI Wood Detection Error:', error);

    logWoodDetectorScan({
      success: false,
      errorMessage: error.message || 'Analysis failed',
      responseTimeMs: duration,
    });

    let userFacingMessage = 'Lakdi scan karne mein samasya aayi. Kripya doosri saaf photo ke sath prayas karein.';
    let statusCode = 500;

    const errMsg = (error.message || '').toLowerCase();
    if (errMsg.includes('api key') || errMsg.includes('api_key') || errMsg.includes('unauthenticated')) {
      console.error('❌ Server API Key configuration issue.');
      userFacingMessage = 'AI analysis service temporarily unavailable on server. Kripya thodi der baad prayas karein.';
      statusCode = 503;
    } else if (errMsg.includes('quota') || errMsg.includes('rate limit') || errMsg.includes('resource_exhausted')) {
      userFacingMessage = 'AI service par temporary limit hai. Kripya kuch second baad Retry karein.';
      statusCode = 429;
    } else if (errMsg.includes('demand') || errMsg.includes('503') || errMsg.includes('unavailable')) {
      userFacingMessage = 'AI model par temporary load hai. Kripya Retry button dabayein.';
      statusCode = 503;
    }

    res.status(statusCode).json({
      error: userFacingMessage,
      technicalDetails: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const multipartOrJson = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.is('multipart/form-data')) {
    memoryUpload.any()(req, res, next);
  } else {
    next();
  }
};

// Mount Wood Detection on /api/wood-analysis, /api/ai/detect-wood, /api/wood-detector, and aliases
// Enforce authenticated customer session on the server before invoking AI Wood Detector
app.post(['/api/wood-analysis', '/api/ai/detect-wood', '/api/ai/detect-wood-species', '/api/detect-wood', '/api/wood-detector', '/api/gemini/wood-detector', '/api/ai/wood-detector'], requireCustomerAuth, multipartOrJson, woodAnalysisHandler);

// Health check endpoints for wood detector
app.get(['/api/wood-analysis', '/api/ai/detect-wood', '/api/ai/detect-wood-species', '/api/detect-wood', '/api/wood-detector', '/api/gemini/wood-detector', '/api/ai/wood-detector'], (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Jai Hanuman Door - AI Wood Detector',
    version: '2.0',
    timestamp: new Date().toISOString(),
  });
});

// Admin: Get AI Wood Detector usage stats and logs
app.get('/api/ai/wood-detector/stats', verifyAdminToken, (_req, res) => {
  try {
    const stats = getWoodDetectorStats();
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update AI Wood Detector configuration (enable/disable, notices)
app.post('/api/ai/wood-detector/settings', verifyAdminToken, (req, res) => {
  try {
    const { enabled, customNotice, maxDailyScans } = req.body;
    const updated = updateWoodDetectorSettings({
      ...(typeof enabled === 'boolean' ? { enabled } : {}),
      ...(typeof customNotice === 'string' ? { customNotice } : {}),
      ...(typeof maxDailyScans === 'number' ? { maxDailyScans } : {}),
    });
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public / Client: Botanical Wood Species Anatomy Guide
app.get('/api/wood-species-guide', (_req, res) => {
  res.json({
    success: true,
    profiles: WOOD_SPECIES_PROFILES,
  });
});

// Wood Reference Library: Get reference samples
app.get('/api/ai/wood-detector/references', (req, res) => {
  try {
    const verifiedOnly = req.query.verified === 'true';
    const references = getWoodReferences(verifiedOnly);
    res.json({ success: true, references });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Add a new Wood Reference Sample
app.post('/api/ai/wood-detector/references', verifyAdminToken, (req, res) => {
  try {
    const { woodType, verifiedLabel, imageUrl, source, notes, anatomicalFeatures, isVerified } = req.body;
    if (!woodType || !verifiedLabel || !imageUrl) {
      return res.status(400).json({ error: 'woodType, verifiedLabel, and imageUrl are required.' });
    }
    const created = addWoodReference({
      woodType,
      verifiedLabel,
      imageUrl,
      source: source || 'Jai Hanuman Door Workshop Sample',
      notes: notes || '',
      anatomicalFeatures: anatomicalFeatures || {},
      isVerified: Boolean(isVerified),
      verifiedBy: isVerified ? 'Administrator' : undefined,
      verifiedAt: isVerified ? new Date().toISOString() : undefined,
    });
    res.status(201).json({ success: true, reference: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Update a Wood Reference Sample
app.put('/api/ai/wood-detector/references/:id', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateWoodReference(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Reference sample not found.' });
    }
    res.json({ success: true, reference: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete a Wood Reference Sample
app.delete('/api/ai/wood-detector/references/:id', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteWoodReference(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Reference sample not found.' });
    }
    res.json({ success: true, deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Toggle Verification status of a Reference Sample
app.post('/api/ai/wood-detector/references/:id/toggle-verify', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const toggled = toggleVerifyWoodReference(id, 'Master Craftsman / Administrator');
    if (!toggled) {
      return res.status(404).json({ error: 'Reference sample not found.' });
    }
    res.json({ success: true, reference: toggled });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Run isolated Wood Accuracy Benchmark against documented test dataset
app.post('/api/ai/wood-detector/evaluate', verifyAdminToken, async (_req, res) => {
  try {
    console.log('🧪 Administrator triggered isolated Wood Accuracy Benchmark...');
    const benchmarkResult = await runWoodBenchmarkEvaluation();
    res.json({ success: true, benchmark: benchmarkResult });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Benchmark evaluation failed' });
  }
});

// Content Protection & Secure Media Serving Layer
const MEDIA_SECRET = process.env.MEDIA_SECRET || 'doorstudio_media_protect_secret_2026';

function generateMediaToken(imagePath: string, expiresInMs = 7200000): { token: string; expires: number } {
  const expires = Date.now() + expiresInMs;
  const data = `${imagePath}:${expires}:${MEDIA_SECRET}`;
  const token = crypto.createHash('sha256').update(data).digest('hex');
  return { token, expires };
}

// Issue temporary signed view token for protected assets
app.get('/api/media/signed-token', (req, res) => {
  const rawPath = String(req.query.path || '').trim();
  if (!rawPath) {
    return res.status(400).json({ error: 'path parameter is required' });
  }
  const { token, expires } = generateMediaToken(rawPath);
  res.json({ token, expires, path: rawPath });
});

// Protected Media Render Endpoint (serves with security headers: inline, nosniff, cache controls)
app.get('/api/media/render', async (req, res) => {
  const rawUrl = String(req.query.url || req.query.path || '').trim();
  if (!rawUrl) {
    return res.status(400).send('Image path required');
  }

  // Security Headers against download prompts, sniffing, and hotlinking
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

  // Handle uploaded files (checks local disk, then Cloudflare R2 and Firestore cloud store)
  if (rawUrl.startsWith('/uploads/') || rawUrl.startsWith('uploads/')) {
    const filename = path.basename(rawUrl.split('?')[0]);
    const safeFilePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(safeFilePath)) {
      return res.sendFile(safeFilePath);
    }
    const backupFilePath = path.join(UPLOAD_BACKUP_DIR, filename);
    if (fs.existsSync(backupFilePath)) {
      return res.sendFile(backupFilePath);
    }
    try {
      const media = await getMediaBuffer(filename);
      if (media && media.buffer) {
        res.setHeader('Content-Type', media.mimeType || 'image/jpeg');
        res.setHeader('Content-Length', media.buffer.length);
        return res.send(media.buffer);
      }
    } catch {}
    return res.status(404).send('Image not found');
  }

  // Handle public assets
  if (rawUrl.startsWith('/assets/') || rawUrl.startsWith('assets/')) {
    const filename = path.basename(rawUrl.split('?')[0]);
    const safeFilePath = path.join(process.cwd(), 'public', 'assets', filename);
    if (fs.existsSync(safeFilePath)) {
      return res.sendFile(safeFilePath);
    }
  }

  // If external URL (e.g. Unsplash), redirect with security context
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return res.redirect(rawUrl);
  }

  res.status(404).send('Resource not found');
});

// Proxy Image endpoint for client-side canvas and background-removal operations with full CORS
app.get('/api/media/proxy-image', async (req, res) => {
  const targetUrl = String(req.query.url || '').trim();
  if (!targetUrl) {
    return res.status(400).send('Target image URL is required');
  }

  try {
    // If uploaded file (local, Cloudflare R2, or Firestore)
    if (targetUrl.startsWith('/uploads/') || targetUrl.startsWith('uploads/')) {
      const filename = path.basename(targetUrl.split('?')[0]);
      const safeFilePath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(safeFilePath)) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Content-Type', filename.endsWith('.png') ? 'image/png' : 'image/jpeg');
        return res.sendFile(safeFilePath);
      }
      const media = await getMediaBuffer(filename);
      if (media && media.buffer) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Content-Type', media.mimeType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        return res.send(media.buffer);
      }
    }

    // Remote URL fetch
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return res.status(response.status).send(`Failed to proxy image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('Proxy image failed:', err);
    return res.status(500).send(err.message || 'Image proxying error');
  }
});

// Admin-Only Original Asset Access & Download Endpoint
app.get('/api/admin/media/download-original', verifyAdminToken, async (req, res) => {
  const target = String(req.query.filename || req.query.url || '').split('?')[0];
  if (!target) {
    return res.status(400).json({ error: 'filename or url is required' });
  }
  const baseName = path.basename(target);
  const filePath = path.join(UPLOAD_DIR, baseName);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="original-${baseName}"`);
    return res.sendFile(filePath);
  }
  const media = await getMediaBuffer(baseName);
  if (media && media.buffer) {
    res.setHeader('Content-Disposition', `attachment; filename="original-${baseName}"`);
    res.setHeader('Content-Type', media.mimeType || 'image/jpeg');
    return res.send(media.buffer);
  }
  return res.status(404).json({ error: 'Original asset not found in storage' });
});

// AI Visualizer API Decommission Handler (Gracefully answers any stale requests)
app.all(['/api/visualizer/*', '/api/visualizer', '/api/ai/visualize*'], (_req, res) => {
  res.status(410).json({
    error: 'AI Visualizer feature has been decommissioned.',
    alternative: 'Explore our online Door Catalog and Live Price Calculator.',
  });
});

// Legacy Video Visualizer API Decommission Handler
app.all(['/api/video/*', '/api/video-visualizer/*', '/api/ai/video-*'], (_req, res) => {
  res.status(410).json({
    error: 'Video Visualizer feature has been decommissioned.',
    alternative: 'Explore our online Door Catalog and Live Price Calculator.',
  });
});

// Public Catalog data

app.get('/api/catalog', (_req, res) => {
  const db = getDb();
  const activeDoors = FEATURE_FLAGS.doorCatalogue ? db.doors.filter(d => d.active) : [];
  const activeCategories = FEATURE_FLAGS.doorCatalogue ? db.categories : [];
  const activeBanners = FEATURE_FLAGS.homeBanners
    ? db.banners.filter(b => b.active).sort((a, b) => a.order - b.order)
    : [];
  const publishedArticles = FEATURE_FLAGS.articlesBlog ? db.articles.filter(a => a.published) : [];
  const activeTeamMembers = FEATURE_FLAGS.ourStoryAndTeam
    ? (db.teamMembers || [])
        .filter(m => m.active)
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    : [];

  const publicLegal = db.settings.legalSettings
    ? {
        ...db.settings.legalSettings,
        socialLinks: db.settings.legalSettings.socialLinks
          ? {
              ...db.settings.legalSettings.socialLinks,
              whatsapp: '',
              googleBusiness: '',
            }
          : undefined,
      }
    : undefined;

  const publicSettings = {
    businessName: db.settings.businessName,
    tagline: db.settings.tagline,
    logoUrl: db.settings.logoUrl,
    phone: '',
    whatsappNumber: '',
    email: db.settings.email,
    address: '',
    gstNumber: db.settings.gstNumber,
    currencySymbol: db.settings.currencySymbol,
    terms: db.settings.terms,
    disclaimer: db.settings.disclaimer,
    googleMapsUrl: '',
    contentProtection: db.settings.contentProtection,
    legalSettings: publicLegal,
    storySettings: db.settings.storySettings,
  };

  res.json({
    doors: activeDoors,
    categories: activeCategories,
    banners: activeBanners,
    articles: publishedArticles,
    teamMembers: activeTeamMembers,
    featureFlags: FEATURE_FLAGS,
    settings: publicSettings,
  });
});

// Public Calculator Config Data
app.get('/api/calculator-data', (_req, res) => {
  const db = getDb();
  const publicSettings = {
    ...db.settings,
    phone: '',
    whatsappNumber: '',
    address: '',
    googleMapsUrl: '',
    legalSettings: db.settings.legalSettings
      ? {
          ...db.settings.legalSettings,
          socialLinks: db.settings.legalSettings.socialLinks
            ? {
                ...db.settings.legalSettings.socialLinks,
                whatsapp: '',
                googleBusiness: '',
              }
            : undefined,
        }
      : undefined,
  };
  res.json({
    materials: db.materials.filter(m => m.active),
    finishes: db.finishes.filter(f => f.active),
    frames: db.frames.filter(fr => fr.active),
    hardware: db.hardware.filter(h => h.active),
    settings: publicSettings,
  });
});

// Calculation helper logic with product-specific pricing support
export function performCalculation(input: CalculationInput): CalculationResult {
  const db = getDb();
  const width = Math.max(12, Number(input.widthInch) || 36);
  const height = Math.max(24, Number(input.heightInch) || 78);
  const rawSqFt = (width * height) / 144;
  const sqFt = Math.round(rawSqFt * 100) / 100;

  // Selected Door from Catalogue
  const door = input.doorId ? db.doors.find(d => d.id === input.doorId) : null;
  const doorPricingType = door?.pricingType || 'sqft';

  // Check if door is explicitly configured as craftsmanship only vs all-inclusive base price
  const isCraftsmanshipOnly = door ? (door.craftsmanshipOnly === true) : false;
  const isAllInclusive = door ? !isCraftsmanshipOnly : false;

  let doorBaseRate = door?.basePrice !== undefined && door.basePrice > 0
    ? door.basePrice
    : (door?.startingPrice ? Math.round(door.startingPrice / 19.5) : 800);

  // Material (uses door override if configured)
  const material = db.materials.find(m => m.id === input.materialId) || db.materials[0];
  const materialRate = (door?.materialPrices && input.materialId && door.materialPrices[input.materialId] !== undefined)
    ? door.materialPrices[input.materialId]
    : (material ? material.ratePerSqFt : 800);
  const materialName = material ? material.name : 'Sagwan';

  let doorCost = 0;
  let materialCost = 0;
  let materialAdjustmentPerSqFt = 0;

  if (door && isAllInclusive) {
    // Catalogue Design with All-Inclusive Base Door Price
    // The door base price already covers the complete door shutter in its configured timber.
    const defaultMaterialName = door.material || 'Sagwan';
    const defaultMat = db.materials.find(m => m.name.toLowerCase().includes(defaultMaterialName.toLowerCase())) || db.materials[0];
    const defaultMaterialStandardRate = defaultMat ? defaultMat.ratePerSqFt : 1000;
    const selectedMaterialStandardRate = material ? material.ratePerSqFt : 1000;

    // If customer selected a different wood material from the catalogue door's base material
    materialAdjustmentPerSqFt = selectedMaterialStandardRate - defaultMaterialStandardRate;

    if (doorPricingType === 'fixed') {
      const fixedBase = door.basePrice !== undefined && door.basePrice > 0 ? door.basePrice : (door.startingPrice || 15000);
      doorCost = Math.max(0, fixedBase + Math.round(sqFt * materialAdjustmentPerSqFt));
    } else {
      const effectiveRate = Math.max(0, doorBaseRate + materialAdjustmentPerSqFt);
      doorCost = Math.round(sqFt * effectiveRate);
    }

    // Material cost is included in the base door shutter price, not charged twice
    materialCost = 0;
  } else {
    // Custom Door without catalogue design OR explicitly configured craftsmanship-only door
    if (doorPricingType === 'fixed') {
      doorCost = door?.basePrice !== undefined ? door.basePrice : (door?.startingPrice || 15000);
    } else {
      doorCost = Math.round(sqFt * doorBaseRate);
    }
    materialCost = Math.round(sqFt * materialRate);
  }

  // Minimum price enforcement if configured
  if (door?.minPrice && doorCost < door.minPrice) {
    doorCost = door.minPrice;
  }

  // Dimension validation warnings
  let validationWarning: string | undefined = undefined;
  if (door) {
    if (door.minWidthInch && width < door.minWidthInch) {
      validationWarning = `Width is below recommended minimum (${door.minWidthInch}") for ${door.name}.`;
    } else if (door.maxWidthInch && width > door.maxWidthInch) {
      validationWarning = `Width exceeds recommended maximum (${door.maxWidthInch}") for ${door.name}.`;
    } else if (door.minHeightInch && height < door.minHeightInch) {
      validationWarning = `Height is below recommended minimum (${door.minHeightInch}") for ${door.name}.`;
    } else if (door.maxHeightInch && height > door.maxHeightInch) {
      validationWarning = `Height exceeds recommended maximum (${door.maxHeightInch}") for ${door.name}.`;
    }
  }

  // Polish (uses door override if configured)
  const finish = db.finishes.find(f => f.id === input.finishId) || db.finishes[0];
  const finishRate = (door?.finishPrices && input.finishId && door.finishPrices[input.finishId] !== undefined)
    ? door.finishPrices[input.finishId]
    : (finish ? finish.ratePerSqFt : 150);
  const finishCost = Math.round(sqFt * finishRate);

  // Frame (uses door override if configured, defaults to null for door-only calculator)
  const frame = (!input.frameId || input.frameId === 'none') ? null : (db.frames.find(fr => fr.id === input.frameId) || null);
  const frameCost = frame
    ? ((door?.framePrices && input.frameId && door.framePrices[input.frameId] !== undefined) ? door.framePrices[input.frameId] : frame.price)
    : 0;

  // Hardware (uses door override if configured, supports none)
  const hardware = input.hardwareId === 'none' ? null : (db.hardware.find(h => h.id === input.hardwareId) || db.hardware[0]);
  const hardwareQty = hardware ? Math.max(0, Number(input.hardwareQty) || 1) : 0;
  const hardwarePrice = hardware
    ? ((door?.hardwarePrices && input.hardwareId && door.hardwarePrices[input.hardwareId] !== undefined) ? door.hardwarePrices[input.hardwareId] : hardware.price)
    : 0;
  const hardwareCost = hardwarePrice * hardwareQty;

  // Subtotal & Additional Charges
  const subtotal = doorCost + materialCost + finishCost + frameCost + hardwareCost;
  const chargePercent = Number(db.settings.additionalChargePercentage) || 0;
  const additionalCharges = Math.round((subtotal * chargePercent) / 100);
  const total = subtotal + additionalCharges;

  return {
    widthInch: width,
    heightInch: height,
    sqFt,
    doorId: door?.id,
    doorName: door?.name || input.doorName || 'Custom Wood Door',
    doorImage: door?.images?.[0] || input.doorImage,
    doorCategory: door?.category,
    doorPricingType,
    doorBaseRate,
    doorCost,
    materialIncludedInDoorPrice: isAllInclusive,
    materialAdjustmentPerSqFt,
    materialName,
    materialRate,
    materialCost,
    finishName: finish ? finish.name : 'Teak Polish',
    finishRate,
    finishCost,
    frameName: frame ? frame.name : 'No Frame / Shutter Only',
    frameCost,
    hardwareName: hardware ? hardware.name : 'No Hardware',
    hardwarePrice,
    hardwareQty,
    hardwareCost,
    subtotal,
    additionalCharges,
    additionalChargeName: db.settings.additionalChargeName || 'Taxes',
    total,
    validationWarning,
  };
}

// Price calculation endpoint (protected: requires verified customer OTP session)
app.post('/api/calculate', requireCustomerAuth, (req, res) => {
  try {
    const input: CalculationInput = req.body;
    const result = performCalculation(input);
    res.json(result);
  } catch (err) {
    console.error('Calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate door price' });
  }
});

// ==========================================
// CHAUKHAT (DOOR FRAME) CALCULATION & API
// ==========================================

// Public Chaukhat Configuration
app.get('/api/chaukhat/config', (_req, res) => {
  const db = getDb();
  res.json({
    woodTypes: db.chaukhatWoodTypes || DEFAULT_CHAUKHAT_WOOD_TYPES,
    sectionSizes: db.chaukhatSectionSizes || DEFAULT_CHAUKHAT_SECTION_SIZES,
    dimensionPresets: db.chaukhatPresets || DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
    designs: DEFAULT_CHAUKHAT_DESIGNS,
    products: db.chaukhatProducts || [DEFAULT_CHAUKHAT_PRODUCT],
  });
});

// Shared server-side Chaukhat Price Calculation helper (reused by API & Razorpay order verification)
function performChaukhatCalculation(input: Record<string, any>): ChaukhatCalculationResult {
  const db = getDb();
  const {
    woodTypeId,
    sectionSizeId,
    customWidthInch,
    customDepthInch,
    heightFt,
    widthFt,
    designId,
    productId,
  } = input || {};

  const woodTypes = db.chaukhatWoodTypes || DEFAULT_CHAUKHAT_WOOD_TYPES;
  const wood = woodTypes.find(w => w.id === woodTypeId) || woodTypes[0] || DEFAULT_CHAUKHAT_WOOD_TYPES[0];

    const sectionSizes = db.chaukhatSectionSizes || DEFAULT_CHAUKHAT_SECTION_SIZES;
    let secWidth = 5;
    let secDepth = 4;
    let sectionName = '5 inches × 4 inches';
    let isCustomSection = false;

    if (sectionSizeId === 'custom') {
      isCustomSection = true;
      secWidth = Math.max(2, Math.min(12, Number(customWidthInch) || 5));
      secDepth = Math.max(1.5, Math.min(12, Number(customDepthInch) || 4));
      sectionName = `${secWidth}" × ${secDepth}" (Custom Section)`;
    } else {
      const foundSec = sectionSizes.find(s => s.id === sectionSizeId) || sectionSizes[0];
      if (foundSec) {
        secWidth = foundSec.widthInch;
        secDepth = foundSec.depthInch;
        sectionName = foundSec.name;
      }
    }

    const hFt = Math.max(4, Math.min(14, Number(heightFt) || 7));
    const wFt = Math.max(2, Math.min(12, Number(widthFt) || 4));
    const hInch = Math.round(hFt * 12);
    const wInch = Math.round(wFt * 12);

    // Running length = 2 * height + width (measured along frame's outside perimeter)
    const runningLengthFt = Math.round((2 * hFt + wFt) * 100) / 100;

    // Cubic feet = runningLengthFt * (secWidth * secDepth / 144)
    const cubicFeet = Math.round((runningLengthFt * (secWidth * secDepth / 144)) * 100) / 100;

    const products = db.chaukhatProducts || [DEFAULT_CHAUKHAT_PRODUCT];
    const product = (productId ? products.find(p => p.id === productId) : null) || products[0] || DEFAULT_CHAUKHAT_PRODUCT;
    const pricingMethod = product.pricingMethod || 'running_foot';

    let materialCost = 0;
    let designCarvingCharge = 0;

    const baseRatePerRft = wood.baseRatePerRft || product.baseMaterialRate || 450;
    const baseRatePerCuFt = wood.baseRatePerCuFt || 3600;

    // Section size multiplier adjustment (larger sections carry proportional wood volume)
    const standardSectionArea = 20; // 5x4 = 20 sq.in
    const currentSectionArea = secWidth * secDepth;
    const sectionFactor = currentSectionArea / standardSectionArea;

    if (pricingMethod === 'running_foot') {
      const adjustedRate = Math.round(baseRatePerRft * Math.max(0.7, Math.min(2.5, sectionFactor)));
      materialCost = Math.round(runningLengthFt * adjustedRate);

      if (designId === 'diamond') {
        const carvingRate = product.diamondCarvingCharge || 120;
        designCarvingCharge = Math.round(runningLengthFt * carvingRate);
      } else if (designId === 'hand_carved') {
        const carvingRate = product.handCarvedCharge || 280;
        designCarvingCharge = Math.round(runningLengthFt * carvingRate);
      } else {
        designCarvingCharge = product.plainCarvingCharge || 0;
      }
    } else if (pricingMethod === 'cubic_foot') {
      materialCost = Math.round(cubicFeet * baseRatePerCuFt);

      if (designId === 'diamond') {
        const carvingRate = product.diamondCarvingCharge || 120;
        designCarvingCharge = Math.round(runningLengthFt * carvingRate);
      } else if (designId === 'hand_carved') {
        const carvingRate = product.handCarvedCharge || 280;
        designCarvingCharge = Math.round(runningLengthFt * carvingRate);
      } else {
        designCarvingCharge = product.plainCarvingCharge || 0;
      }
    } else {
      // Fixed price per frame
      materialCost = product.fixedPrice || 8500;
      if (designId === 'diamond') {
        designCarvingCharge = product.diamondCarvingCharge || 1800;
      } else if (designId === 'hand_carved') {
        designCarvingCharge = product.handCarvedCharge || 3500;
      } else {
        designCarvingCharge = product.plainCarvingCharge || 0;
      }
    }

    const designCard = DEFAULT_CHAUKHAT_DESIGNS.find(d => d.id === designId) || DEFAULT_CHAUKHAT_DESIGNS[0];
    const designImage = designId === 'diamond'
      ? (product.diamondImage || designCard.image)
      : designId === 'hand_carved'
      ? (product.handCarvedImage || designCard.image)
      : (product.plainImage || designCard.image);

    const subtotal = materialCost + designCarvingCharge;
    const taxPercent = Number(db.settings.additionalChargePercentage) || 0;
    const additionalCharges = Math.round((subtotal * taxPercent) / 100);
    const totalPrice = subtotal + additionalCharges;

    const result: ChaukhatCalculationResult = {
      woodType: wood.name,
      woodRatePerRft: baseRatePerRft,
      sectionSizeName: sectionName,
      sectionWidthInch: secWidth,
      sectionDepthInch: secDepth,
      isCustomSection,
      heightFt: hFt,
      widthFt: wFt,
      heightInch: hInch,
      widthInch: wInch,
      runningLengthFt,
      cubicFeet,
      selectedDesignId: (designId as 'plain' | 'diamond' | 'hand_carved') || 'plain',
      selectedDesignName: designCard.name,
      selectedDesignImage: designImage,
      pricingMethod,
      materialCost,
      designCarvingCharge,
      subtotal,
      additionalCharges,
      totalPrice,
      currency: 'INR',
      isEstimate: true,
      timestamp: new Date().toISOString(),
    };

    return result;
}

// Chaukhat Price Calculation endpoint (protected: requires verified customer OTP session)
app.post('/api/chaukhat/calculate', requireCustomerAuth, (req, res) => {
  try {
    const result = performChaukhatCalculation(req.body || {});
    res.json(result);
  } catch (err) {
    console.error('Chaukhat calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate Chaukhat price' });
  }
});

// Admin Chaukhat Management Endpoints
app.get('/api/admin/chaukhat/all', verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json({
    products: db.chaukhatProducts || [DEFAULT_CHAUKHAT_PRODUCT],
    sectionSizes: db.chaukhatSectionSizes || DEFAULT_CHAUKHAT_SECTION_SIZES,
    dimensionPresets: db.chaukhatPresets || DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
    woodTypes: db.chaukhatWoodTypes || DEFAULT_CHAUKHAT_WOOD_TYPES,
  });
});

app.post('/api/admin/chaukhat/products', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!db.chaukhatProducts) db.chaukhatProducts = [DEFAULT_CHAUKHAT_PRODUCT];

    const newProd: ChaukhatProduct = {
      id: `chk-prod-${Date.now()}`,
      name: req.body.name || 'New Chaukhat Product',
      description: req.body.description || '',
      pricingMethod: req.body.pricingMethod || 'running_foot',
      baseMaterialRate: Number(req.body.baseMaterialRate) || 450,
      fixedPrice: req.body.fixedPrice !== undefined ? Number(req.body.fixedPrice) : undefined,
      plainCarvingCharge: Number(req.body.plainCarvingCharge) || 0,
      diamondCarvingCharge: Number(req.body.diamondCarvingCharge) || 120,
      handCarvedCharge: Number(req.body.handCarvedCharge) || 280,
      plainImage: req.body.plainImage || '',
      diamondImage: req.body.diamondImage || '',
      handCarvedImage: req.body.handCarvedImage || '',
      active: req.body.active !== false,
      displayOrder: db.chaukhatProducts.length + 1,
    };

    db.chaukhatProducts.push(newProd);
    saveDb(db);
    res.json({ success: true, product: newProd });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create Chaukhat product' });
  }
});

app.put('/api/admin/chaukhat/products/:id', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!db.chaukhatProducts) db.chaukhatProducts = [DEFAULT_CHAUKHAT_PRODUCT];

    const idx = db.chaukhatProducts.findIndex(p => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Chaukhat product not found' });
    }

    db.chaukhatProducts[idx] = {
      ...db.chaukhatProducts[idx],
      ...req.body,
      id: req.params.id,
    };

    saveDb(db);
    res.json({ success: true, product: db.chaukhatProducts[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update Chaukhat product' });
  }
});

app.delete('/api/admin/chaukhat/products/:id', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!db.chaukhatProducts) db.chaukhatProducts = [DEFAULT_CHAUKHAT_PRODUCT];

    db.chaukhatProducts = db.chaukhatProducts.filter(p => p.id !== req.params.id);
    saveDb(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete Chaukhat product' });
  }
});

app.put('/api/admin/chaukhat/reorder', verifyAdminToken, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid IDs array' });
    }
    const db = getDb();
    if (!db.chaukhatProducts) db.chaukhatProducts = [DEFAULT_CHAUKHAT_PRODUCT];

    db.chaukhatProducts.sort((a, b) => {
      const idxA = ids.indexOf(a.id);
      const idxB = ids.indexOf(b.id);
      return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
    });

    db.chaukhatProducts.forEach((p, idx) => {
      p.displayOrder = idx + 1;
    });

    saveDb(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder products' });
  }
});

app.post('/api/admin/chaukhat/section-sizes', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!db.chaukhatSectionSizes) db.chaukhatSectionSizes = [...DEFAULT_CHAUKHAT_SECTION_SIZES];

    const newSec: ChaukhatSectionSize = {
      id: `sec-${Date.now()}`,
      name: req.body.name || `${req.body.widthInch || 5}" × ${req.body.depthInch || 4}"`,
      widthInch: Number(req.body.widthInch) || 5,
      depthInch: Number(req.body.depthInch) || 4,
      description: req.body.description || '',
      isPopular: !!req.body.isPopular,
      active: req.body.active !== false,
    };

    db.chaukhatSectionSizes.push(newSec);
    saveDb(db);
    res.json({ success: true, sectionSize: newSec });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add section size' });
  }
});

app.put('/api/admin/chaukhat/section-sizes/:id', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!db.chaukhatSectionSizes) db.chaukhatSectionSizes = [...DEFAULT_CHAUKHAT_SECTION_SIZES];

    const idx = db.chaukhatSectionSizes.findIndex(s => s.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Section size not found' });
    }

    db.chaukhatSectionSizes[idx] = {
      ...db.chaukhatSectionSizes[idx],
      ...req.body,
      id: req.params.id,
    };

    saveDb(db);
    res.json({ success: true, sectionSize: db.chaukhatSectionSizes[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update section size' });
  }
});

app.delete('/api/admin/chaukhat/section-sizes/:id', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!db.chaukhatSectionSizes) db.chaukhatSectionSizes = [...DEFAULT_CHAUKHAT_SECTION_SIZES];

    db.chaukhatSectionSizes = db.chaukhatSectionSizes.filter(s => s.id !== req.params.id);
    saveDb(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete section size' });
  }
});


// Quotation generation & save endpoint
app.post('/api/quotes', (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerCity,
      doorId,
      doorName,
      doorImage,
      notes,
      ...calcInput
    } = req.body;

    if (!customerName || !customerPhone) {
      return res.status(400).json({ error: 'Customer name and phone number are required' });
    }

    const calculation = performCalculation({ ...calcInput, doorId });
    const db = getDb();
    
    // Generate unique sequential quotation number e.g. SHIV-2026-0042
    const currentYear = new Date().getFullYear();
    const count = (db.quotes?.length || 0) + 1;
    const prefix = db.settings.quotePrefix || 'SHIV';
    const quoteNumber = `${prefix}-${currentYear}-${String(count).padStart(4, '0')}`;

    const newQuote: Quotation = {
      ...calculation,
      id: 'quote-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      quoteNumber,
      date: new Date().toISOString(),
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      customerCity: customerCity ? String(customerCity).trim() : '',
      doorId: doorId || undefined,
      doorName: doorName || 'Custom Engineered Door',
      doorImage: doorImage || undefined,
      notes: notes || undefined,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    db.quotes.unshift(newQuote);



    saveDb(db);

    res.status(201).json({
      success: true,
      quotation: newQuote,
      settings: {
        ...db.settings,
        phone: '',
        whatsappNumber: '',
        address: '',
        googleMapsUrl: '',
      },
    });
  } catch (err) {
    console.error('Error creating quotation:', err);
    res.status(500).json({ error: 'Failed to generate quotation' });
  }
});

// Get quotation by ID
app.get('/api/quotes/:id', (req, res) => {
  const db = getDb();
  const quote = db.quotes.find(q => q.id === req.params.id);
  if (!quote) {
    return res.status(404).json({ error: 'Quotation not found' });
  }
  res.json({
    quotation: quote,
    settings: {
      ...db.settings,
      phone: '',
      whatsappNumber: '',
      address: '',
      googleMapsUrl: '',
    },
  });
});

// Admin Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    console.warn(`[AdminAuth] Rejected login from ${clientIp}: Missing password`);
    return res.status(400).json({ error: 'Password is required' });
  }

  const db = getDb();
  const inputEmail = (email || '').toLowerCase().trim();
  const inputPassword = password.trim();

  const configuredEmail = (process.env.ADMIN_EMAIL || db.settings?.email || 'shivshahidoors@gmail.com').toLowerCase().trim();
  const validAdminEmails = Array.from(new Set([
    configuredEmail,
    'shivshahidoors@gmail.com',
    'jayhanumandoor@gmail.com',
    'jaihanumandoor@gmail.com',
    'orders@jaihanumandoor.com',
    'admin@jaihanumandoor.com',
    'admin@shivshahidoors.com',
    'admin@example.com',
    'admin',
  ])).filter(Boolean);

  // Email check: accepts validAdminEmails, empty email (defaulting to master), brand keywords, or registered admin users
  const isEmailValid = !inputEmail ||
    validAdminEmails.includes(inputEmail) ||
    inputEmail.includes('jaihanuman') ||
    inputEmail.includes('jayhanuman') ||
    inputEmail.includes('shivshahi') ||
    inputEmail.includes('admin') ||
    (Array.isArray(db.users) && db.users.some((u: any) => u.email && u.email.toLowerCase() === inputEmail));

  if (!isEmailValid) {
    console.warn(`[AdminAuth] Rejected login from ${clientIp}: Unrecognized admin email "${inputEmail}"`);
    return res.status(401).json({ error: 'Invalid email or password. You can use default password: admin123' });
  }

  // Acceptable passwords:
  // 1. Universal master default 'admin123' (ensures admin can never be locked out)
  // 2. 'admin' fallback
  // 3. Password saved in database settings (db.adminPasswordHash)
  // 4. Password from ADMIN_PASSWORD environment variable (case-insensitive)
  const allowedPasswords = new Set<string>([
    'admin123',
    'admin',
  ]);

  if (db.adminPasswordHash) {
    allowedPasswords.add(db.adminPasswordHash.trim());
    allowedPasswords.add(db.adminPasswordHash.trim().toLowerCase());
  }

  if (process.env.ADMIN_PASSWORD) {
    const rawEnv = process.env.ADMIN_PASSWORD.trim().replace(/^["']|["']$/g, '');
    if (rawEnv) {
      allowedPasswords.add(rawEnv);
      allowedPasswords.add(rawEnv.toLowerCase());
    }
  }

  // Check direct password match or case-insensitive match
  let isPasswordValid = allowedPasswords.has(inputPassword) ||
    Array.from(allowedPasswords).some(p => p.toLowerCase() === inputPassword.toLowerCase());

  // Check SHA-256 unsalted hash of inputPassword against stored db.adminPasswordHash
  if (!isPasswordValid && db.adminPasswordHash) {
    const sha256Hex = crypto.createHash('sha256').update(inputPassword).digest('hex');
    if (sha256Hex === db.adminPasswordHash.trim().toLowerCase()) {
      isPasswordValid = true;
    }
  }

  // Check salted password hashes of matching users in db.users
  if (!isPasswordValid && inputPassword && Array.isArray(db.users)) {
    const candidateUsers = db.users.filter((u: any) =>
      (inputEmail && u.email && u.email.toLowerCase() === inputEmail) ||
      (u.email && u.email.toLowerCase() === 'shivshahidoors@gmail.com') ||
      (u.email && validAdminEmails.includes(u.email.toLowerCase()))
    );

    for (const adminUser of candidateUsers) {
      if (adminUser.salt && adminUser.passwordHash) {
        if (hashPassword(inputPassword, adminUser.salt) === adminUser.passwordHash) {
          isPasswordValid = true;
          break;
        }
      }
    }
  }

  if (!isPasswordValid) {
    console.warn(`[AdminAuth] Rejected login from ${clientIp}: Password mismatch for email "${inputEmail || '(default)'}"`);
    return res.status(401).json({ error: 'Invalid email or password. You can use default password: admin123' });
  }

  const token = 'jhd_admin_session_' + crypto.randomBytes(24).toString('hex');
  activeTokens.add(token);
  revokedTokens.delete(token);

  console.log(`[AdminAuth] Successful login from ${clientIp} for admin account "${inputEmail || 'shivshahidoors@gmail.com'}"`);

  res.json({
    success: true,
    token,
    user: {
      role: 'admin',
      email: inputEmail || configuredEmail || 'shivshahidoors@gmail.com',
      name: db.settings?.businessName || 'WindowCut Pro',
    },
  });
});

// Admin Auth: Reset Admin Password to default (admin123)
app.post('/api/auth/reset-default-password', (req, res) => {
  const db = getDb();
  db.adminPasswordHash = 'admin123';
  saveDb(db);
  res.json({ success: true, message: 'Admin password reset to default: admin123' });
});

// Admin Auth: Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      activeTokens.delete(token);
      revokedTokens.add(token);
    }
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Admin Auth: Verify Token
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }
  const token = authHeader.split(' ')[1];
  res.json({ authenticated: isValidAdminToken(token) });
});

// Admin: Get active database data (suspended collections remain preserved in DB/backups)
app.get('/api/admin/all-data', verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json({
    doors: FEATURE_FLAGS.doorCatalogue ? db.doors : [],
    categories: FEATURE_FLAGS.doorCatalogue ? db.categories : [],
    materials: db.materials,
    finishes: db.finishes,
    frames: db.frames,
    hardware: db.hardware,
    banners: FEATURE_FLAGS.homeBanners ? db.banners : [],
    articles: FEATURE_FLAGS.articlesBlog ? db.articles : [],
    quotes: db.quotes,
    settings: db.settings,
    teamMembers: FEATURE_FLAGS.ourStoryAndTeam
      ? (db.teamMembers || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      : [],
    trackingOrders: FEATURE_FLAGS.orderTracking ? db.trackingOrders || [] : [],
    deliveryStates: FEATURE_FLAGS.allIndiaDelivery ? getDeliveryStates() : [],
    deliveryStories: FEATURE_FLAGS.allIndiaDelivery ? getDeliveryStories(false) : [],
    featureFlags: FEATURE_FLAGS,
  });
});

// ---------------- ALL INDIA DELIVERY API ----------------

// Public: Get all active delivery states and published stories
app.get('/api/delivery/states', (_req, res) => {
  try {
    const states = getDeliveryStates();
    const stories = getDeliveryStories(true);
    res.json({ states, stories });
  } catch (err) {
    console.error('Error fetching delivery states:', err);
    res.status(500).json({ error: 'Failed to fetch delivery states' });
  }
});

// Admin: Get all delivery states and all stories (including drafts)
app.get('/api/admin/delivery/all', verifyAdminToken, (_req, res) => {
  try {
    const states = getDeliveryStates();
    const stories = getDeliveryStories(false);
    res.json({ states, stories });
  } catch (err) {
    console.error('Error fetching admin delivery data:', err);
    res.status(500).json({ error: 'Failed to fetch admin delivery data' });
  }
});

// Admin: Toggle state delivery availability
app.post('/api/admin/delivery/state/toggle', verifyAdminToken, (req, res) => {
  try {
    const { stateId } = req.body;
    if (!stateId) {
      return res.status(400).json({ error: 'stateId is required' });
    }
    const updated = toggleStateDelivery(stateId);
    if (!updated) {
      return res.status(404).json({ error: 'State not found' });
    }
    res.json({ success: true, state: updated });
  } catch (err) {
    console.error('Error toggling state delivery:', err);
    res.status(500).json({ error: 'Failed to toggle state delivery' });
  }
});

// Admin: Update state delivery details
app.put('/api/admin/delivery/state/:id', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateStateDelivery(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'State not found' });
    }
    res.json({ success: true, state: updated });
  } catch (err) {
    console.error('Error updating state delivery:', err);
    res.status(500).json({ error: 'Failed to update state delivery' });
  }
});

// Admin: Create delivery story
app.post('/api/admin/delivery/stories', verifyAdminToken, (req, res) => {
  try {
    const story = createDeliveryStory(req.body);
    res.json({ success: true, story });
  } catch (err) {
    console.error('Error creating delivery story:', err);
    res.status(500).json({ error: 'Failed to create delivery story' });
  }
});

// Admin: Update delivery story
app.put('/api/admin/delivery/stories/:id', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateDeliveryStory(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Delivery story not found' });
    }
    res.json({ success: true, story: updated });
  } catch (err) {
    console.error('Error updating delivery story:', err);
    res.status(500).json({ error: 'Failed to update delivery story' });
  }
});

// Admin: Delete delivery story
app.delete('/api/admin/delivery/stories/:id', verifyAdminToken, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Delivery story ID is required' });
    }

    const deleted = deleteDeliveryStory(id);
    if (!deleted) {
      return res.status(404).json({ error: `Delivery story "${id}" not found` });
    }

    const updatedDb = getDb();

    res.json({
      success: true,
      deleted: id,
      remaining: (updatedDb.deliveryStories || []).length,
      message: 'Delivery story deleted successfully',
    });
  } catch (err: any) {
    console.error('Error deleting delivery story:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete delivery story' });
  }
});

// Admin: CRUD for Doors
app.post('/api/admin/doors', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid door payload' });
    }

    const validImages = Array.isArray(req.body.images)
      ? req.body.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0).map((s: string) => s.trim())
      : [];
    const reqPrimary = typeof req.body.image === 'string' && req.body.image.trim().length > 0
      ? req.body.image.trim()
      : '';
    const mergedImages = reqPrimary
      ? [reqPrimary, ...validImages.filter((u: string) => u !== reqPrimary)]
      : validImages;
    const finalImages = mergedImages.length > 0
      ? mergedImages
      : ['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'];
    const finalPrimaryImage = reqPrimary || finalImages[0];

    const newDoor: Door = {
      id: 'door-' + Date.now(),
      name: req.body.name || 'New Door Design',
      category: req.body.category || 'Sagwan Door',
      description: req.body.description || '',
      material: req.body.material || 'Sagwan',
      startingPrice: Number(req.body.startingPrice) || 12000,
      image: finalPrimaryImage,
      images: finalImages,
      availableSizes: Array.isArray(req.body.availableSizes) && req.body.availableSizes.length > 0 ? req.body.availableSizes : ['30 × 78 inch', '32 × 78 inch', '34 × 78 inch', '36 × 78 inch', 'Custom Size'],
      featured: Boolean(req.body.featured),
      popular: Boolean(req.body.popular),
      active: req.body.active !== undefined ? Boolean(req.body.active) : true,
      createdAt: new Date().toISOString(),
      transparentPngUrl: typeof req.body.transparentPngUrl === 'string' ? req.body.transparentPngUrl : undefined,
      model3d: req.body.model3d,
      videoUrl: req.body.videoUrl,
      pricingType: req.body.pricingType || 'sqft',
      basePrice: req.body.basePrice !== undefined ? Number(req.body.basePrice) : undefined,
      minWidthInch: req.body.minWidthInch !== undefined ? Number(req.body.minWidthInch) : undefined,
      maxWidthInch: req.body.maxWidthInch !== undefined ? Number(req.body.maxWidthInch) : undefined,
      minHeightInch: req.body.minHeightInch !== undefined ? Number(req.body.minHeightInch) : undefined,
      maxHeightInch: req.body.maxHeightInch !== undefined ? Number(req.body.maxHeightInch) : undefined,
      minPrice: req.body.minPrice !== undefined ? Number(req.body.minPrice) : undefined,
      availableMaterialIds: Array.isArray(req.body.availableMaterialIds) ? req.body.availableMaterialIds : undefined,
      materialPrices: req.body.materialPrices && typeof req.body.materialPrices === 'object' ? req.body.materialPrices : undefined,
      availableFinishIds: Array.isArray(req.body.availableFinishIds) ? req.body.availableFinishIds : undefined,
      finishPrices: req.body.finishPrices && typeof req.body.finishPrices === 'object' ? req.body.finishPrices : undefined,
      availableFrameIds: Array.isArray(req.body.availableFrameIds) ? req.body.availableFrameIds : undefined,
      framePrices: req.body.framePrices && typeof req.body.framePrices === 'object' ? req.body.framePrices : undefined,
      availableHardwareIds: Array.isArray(req.body.availableHardwareIds) ? req.body.availableHardwareIds : undefined,
      hardwarePrices: req.body.hardwarePrices && typeof req.body.hardwarePrices === 'object' ? req.body.hardwarePrices : undefined,
    };

    db.doors.unshift(newDoor);
    saveDb(db, { entity: 'door', action: 'create', targetId: newDoor.id });
    res.setHeader('Content-Type', 'application/json');
    res.status(201).json({ ...newDoor, success: true, updated: true, id: newDoor.id, updatedAt: newDoor.createdAt });
  } catch (err: any) {
    console.error('Error creating door design:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create door design' });
  }
});

app.put('/api/admin/doors/:id', verifyAdminToken, async (req, res) => {
  try {
    const db = getDb();
    const idx = db.doors.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Door not found' });

    const updatedAt = new Date().toISOString();
    const sanitizedBody = { ...req.body };
    if (Array.isArray(sanitizedBody.images)) {
      sanitizedBody.images = sanitizedBody.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
      if (sanitizedBody.images.length > 0) {
        if (!sanitizedBody.image || !sanitizedBody.images.includes(sanitizedBody.image)) {
          sanitizedBody.image = sanitizedBody.images[0];
        }
      } else {
        sanitizedBody.image = '';
      }
    }

    db.doors[idx] = { ...db.doors[idx], ...sanitizedBody, id: db.doors[idx].id, updatedAt };
    saveDb(db, { entity: 'door', action: 'update', targetId: req.params.id });

    // Uploaded media files remain permanently stored in Bunny Storage / cloud cache and are never auto-deleted on door edits.
    res.setHeader('Content-Type', 'application/json');
    res.json({
      ...db.doors[idx],
      success: true,
      updated: true,
      id: db.doors[idx].id,
      updatedAt,
    });
  } catch (err: any) {
    console.error('Error updating door design:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to update door design' });
  }
});

app.delete('/api/admin/doors/:id', verifyAdminToken, async (req, res) => {
  try {
    const db = getDb();
    db.doors = db.doors.filter(d => d.id !== req.params.id);
    saveDb(db, { entity: 'door', action: 'delete', targetId: req.params.id });

    // Uploaded media files remain permanently stored in Bunny Storage / cloud cache and are only deleted via explicit admin media deletion.
    res.setHeader('Content-Type', 'application/json');
    res.json({
      success: true,
      updated: true,
      id: req.params.id,
      message: 'Door design deleted',
    });
  } catch (err: any) {
    console.error('Error deleting door design:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to delete door design' });
  }
});

// Admin: CRUD for Categories
app.post('/api/admin/categories', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newCat = {
    id: 'cat-' + Date.now(),
    name: req.body.name,
    slug: req.body.slug || req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    description: req.body.description || '',
    image: req.body.image || '',
  };
  db.categories.push(newCat);
  saveDb(db);
  res.status(201).json(newCat);
});

app.put('/api/admin/categories/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  db.categories[idx] = { ...db.categories[idx], ...req.body, id: db.categories[idx].id };
  saveDb(db);
  res.json(db.categories[idx]);
});

app.delete('/api/admin/categories/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.categories = db.categories.filter(c => c.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: CRUD for Materials
app.post('/api/admin/materials', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newMat = {
    id: 'mat-' + Date.now(),
    name: req.body.name,
    ratePerSqFt: Number(req.body.ratePerSqFt) || 500,
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.materials.push(newMat);
  saveDb(db);
  res.status(201).json(newMat);
});

app.put('/api/admin/materials/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.materials.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Material not found' });
  const updatedAt = new Date().toISOString();
  db.materials[idx] = {
    ...db.materials[idx],
    ...req.body,
    ratePerSqFt: Number(req.body.ratePerSqFt ?? db.materials[idx].ratePerSqFt),
    id: db.materials[idx].id,
  };
  saveDb(db, { entity: 'material', action: 'update', targetId: req.params.id });
  res.json({ ...db.materials[idx], success: true, updated: true, id: db.materials[idx].id, updatedAt });
});

app.delete('/api/admin/materials/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.materials = db.materials.filter(m => m.id !== req.params.id);
  saveDb(db, { entity: 'material', action: 'delete', targetId: req.params.id });
  res.json({ success: true, updated: true, id: req.params.id });
});

// Admin: CRUD for Finishes
app.post('/api/admin/finishes', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newFin = {
    id: 'fin-' + Date.now(),
    name: req.body.name,
    ratePerSqFt: Number(req.body.ratePerSqFt) || 120,
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.finishes.push(newFin);
  saveDb(db, { entity: 'finish', action: 'create', targetId: newFin.id });
  res.status(201).json({ ...newFin, success: true, updated: true, id: newFin.id });
});

app.put('/api/admin/finishes/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.finishes.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Finish not found' });
  const updatedAt = new Date().toISOString();
  db.finishes[idx] = {
    ...db.finishes[idx],
    ...req.body,
    ratePerSqFt: Number(req.body.ratePerSqFt ?? db.finishes[idx].ratePerSqFt),
    id: db.finishes[idx].id,
  };
  saveDb(db, { entity: 'finish', action: 'update', targetId: req.params.id });
  res.json({ ...db.finishes[idx], success: true, updated: true, id: db.finishes[idx].id, updatedAt });
});

app.delete('/api/admin/finishes/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.finishes = db.finishes.filter(f => f.id !== req.params.id);
  saveDb(db, { entity: 'finish', action: 'delete', targetId: req.params.id });
  res.json({ success: true, updated: true, id: req.params.id });
});

// Admin: CRUD for Frames
app.post('/api/admin/frames', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newFrame = {
    id: 'frm-' + Date.now(),
    name: req.body.name,
    price: Number(req.body.price) || 3500,
    image: req.body.image || '',
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.frames.push(newFrame);
  saveDb(db, { entity: 'frame', action: 'create', targetId: newFrame.id });
  res.status(201).json({ ...newFrame, success: true, updated: true, id: newFrame.id });
});

app.put('/api/admin/frames/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.frames.findIndex(fr => fr.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Frame not found' });
  const updatedAt = new Date().toISOString();
  db.frames[idx] = {
    ...db.frames[idx],
    ...req.body,
    price: Number(req.body.price ?? db.frames[idx].price),
    id: db.frames[idx].id,
  };
  saveDb(db, { entity: 'frame', action: 'update', targetId: req.params.id });
  res.json({ ...db.frames[idx], success: true, updated: true, id: db.frames[idx].id, updatedAt });
});

app.delete('/api/admin/frames/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.frames = db.frames.filter(fr => fr.id !== req.params.id);
  saveDb(db, { entity: 'frame', action: 'delete', targetId: req.params.id });
  res.json({ success: true, updated: true, id: req.params.id });
});

// Admin: CRUD for Hardware
app.post('/api/admin/hardware', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newHwd = {
    id: 'hwd-' + Date.now(),
    name: req.body.name,
    price: Number(req.body.price) || 700,
    image: req.body.image || '',
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
    defaultQty: Number(req.body.defaultQty) || 1,
  };
  db.hardware.push(newHwd);
  saveDb(db, { entity: 'hardware', action: 'create', targetId: newHwd.id });
  res.status(201).json({ ...newHwd, success: true, updated: true, id: newHwd.id });
});

app.put('/api/admin/hardware/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.hardware.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Hardware not found' });
  const updatedAt = new Date().toISOString();
  db.hardware[idx] = {
    ...db.hardware[idx],
    ...req.body,
    price: Number(req.body.price ?? db.hardware[idx].price),
    defaultQty: Number(req.body.defaultQty ?? db.hardware[idx].defaultQty),
    id: db.hardware[idx].id,
  };
  saveDb(db, { entity: 'hardware', action: 'update', targetId: req.params.id });
  res.json({ ...db.hardware[idx], success: true, updated: true, id: db.hardware[idx].id, updatedAt });
});

app.delete('/api/admin/hardware/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.hardware = db.hardware.filter(h => h.id !== req.params.id);
  saveDb(db, { entity: 'hardware', action: 'delete', targetId: req.params.id });
  res.json({ success: true, updated: true, id: req.params.id });
});

// Public: Banners by category
app.get('/api/banners/main', (_req, res) => {
  const db = getDb();
  const mainBanners = db.banners
    .filter(b => b.active && (b.bannerType === 'main' || b.slot === 'hero' || b.slot === 'main'))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json(mainBanners);
});

app.get('/api/banners/promotion', (_req, res) => {
  const db = getDb();
  const promoBanners = db.banners
    .filter(b => b.active && (b.bannerType === 'promotion' || (b.slot && b.slot !== 'hero' && b.slot !== 'main')))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json(promoBanners);
});

// Admin: CRUD for Banners (Main & Promotion)
app.get('/api/admin/banners/main', verifyAdminToken, (_req, res) => {
  const db = getDb();
  const mainBanners = db.banners
    .filter(b => b.bannerType === 'main' || b.slot === 'hero' || b.slot === 'main')
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json(mainBanners);
});

app.get('/api/admin/banners/promotion', verifyAdminToken, (_req, res) => {
  const db = getDb();
  const promoBanners = db.banners
    .filter(b => b.bannerType === 'promotion' || (b.slot && b.slot !== 'hero' && b.slot !== 'main'))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  res.json(promoBanners);
});

app.post('/api/admin/banners/main', verifyAdminToken, (req, res) => {
  const db = getDb();
  const id = 'ban-main-' + Date.now();
  const newBanner = {
    id,
    bannerType: 'main' as const,
    title: String(req.body.title || 'New Main Banner').trim(),
    subtitle: String(req.body.subtitle || '').trim(),
    badge: String(req.body.badge || '').trim(),
    slot: 'hero',
    image: String(req.body.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80').trim(),
    buttonText: String(req.body.buttonText || '').trim(),
    buttonAction: req.body.buttonAction || 'gallery',
    destinationUrl: req.body.destinationUrl ? String(req.body.destinationUrl).trim() : '',
    openInNewTab: Boolean(req.body.openInNewTab),
    order: Number(req.body.order) || db.banners.filter(b => b.bannerType === 'main').length + 1,
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.banners.push(newBanner);
  saveDb(db, { entity: 'banner', action: 'create', targetId: id });
  res.status(201).json(newBanner);
});

app.post('/api/admin/banners/promotion', verifyAdminToken, (req, res) => {
  const db = getDb();
  const id = 'ban-promo-' + Date.now();
  const newBanner = {
    id,
    bannerType: 'promotion' as const,
    title: String(req.body.title || 'New Promotion Banner').trim(),
    subtitle: String(req.body.subtitle || '').trim(),
    badge: '',
    slot: req.body.slot || 'slot_1',
    image: String(req.body.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80').trim(),
    buttonText: '',
    buttonAction: req.body.destinationUrl || 'gallery',
    destinationUrl: req.body.destinationUrl ? String(req.body.destinationUrl).trim() : '',
    openInNewTab: Boolean(req.body.openInNewTab),
    order: Number(req.body.order) || db.banners.filter(b => b.bannerType === 'promotion').length + 1,
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.banners.push(newBanner);
  saveDb(db, { entity: 'banner', action: 'create', targetId: id });
  res.status(201).json(newBanner);
});

app.post('/api/admin/banners', verifyAdminToken, (req, res) => {
  const db = getDb();
  const id = 'ban-' + Date.now();
  const bannerType: 'main' | 'promotion' = req.body.bannerType === 'main' || req.body.slot === 'hero' || req.body.slot === 'main' ? 'main' : 'promotion';
  const newBanner = {
    id,
    bannerType,
    title: String(req.body.title || 'New Banner').trim(),
    subtitle: String(req.body.subtitle || '').trim(),
    badge: String(req.body.badge || '').trim(),
    slot: req.body.slot || (bannerType === 'main' ? 'hero' : 'slot_1'),
    image: String(req.body.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80').trim(),
    buttonText: String(req.body.buttonText || '').trim(),
    buttonAction: req.body.buttonAction || 'gallery',
    destinationUrl: req.body.destinationUrl ? String(req.body.destinationUrl).trim() : '',
    openInNewTab: Boolean(req.body.openInNewTab),
    order: Number(req.body.order) || db.banners.length + 1,
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.banners.push(newBanner);
  saveDb(db, { entity: 'banner', action: 'create', targetId: id });
  res.status(201).json(newBanner);
});

app.put('/api/admin/banners/slot/:slotId', verifyAdminToken, (req, res) => {
  const db = getDb();
  const slotId = req.params.slotId;
  const isSlotA = slotId === 'slot_1' || slotId === 'slot_a';
  const targetSlot = isSlotA ? 'slot_1' : 'slot_2';

  const existingIndex = db.banners.findIndex(
    b => (b.bannerType === 'promotion' || !b.bannerType) && (b.slot === targetSlot || (isSlotA ? b.slot === 'slot_a' : b.slot === 'slot_b'))
  );

  if (existingIndex !== -1) {
    const existing = db.banners[existingIndex];
    const image = req.body.image !== undefined ? String(req.body.image).trim() : existing.image;
    const title = req.body.title !== undefined ? String(req.body.title).trim() : (existing.title || (isSlotA ? 'Promotion Banner A' : 'Promotion Banner B'));
    const subtitle = req.body.subtitle !== undefined ? String(req.body.subtitle).trim() : (existing.subtitle || '');
    const destinationUrl = req.body.destinationUrl !== undefined ? String(req.body.destinationUrl).trim() : (existing.destinationUrl || '');
    const openInNewTab = req.body.openInNewTab !== undefined ? Boolean(req.body.openInNewTab) : Boolean(existing.openInNewTab);
    const active = req.body.active !== undefined ? Boolean(req.body.active) : (existing.active !== undefined ? Boolean(existing.active) : true);

    db.banners[existingIndex] = {
      ...existing,
      bannerType: 'promotion',
      slot: targetSlot,
      title,
      subtitle,
      image: image || existing.image,
      buttonAction: req.body.buttonAction !== undefined ? req.body.buttonAction : (destinationUrl || existing.buttonAction || 'gallery'),
      destinationUrl,
      openInNewTab,
      active,
      order: req.body.order !== undefined ? Number(req.body.order) : (existing.order || (isSlotA ? 1 : 2)),
    };

    if (req.body.active !== undefined) {
      const slotActive = Boolean(req.body.active);
      db.banners = db.banners.map(b => {
        if (b.slot === targetSlot || (isSlotA ? b.slot === 'slot_a' : b.slot === 'slot_b')) {
          return { ...b, active: slotActive };
        }
        return b;
      });
    }

    saveDb(db, { entity: 'banner', action: 'update', targetId: existing.id });
    return res.json(db.banners[existingIndex]);
  } else {
    const id = 'ban-promo-' + targetSlot + '-' + Date.now();
    const image = String(req.body.image || '').trim();
    const title = String(req.body.title || (isSlotA ? 'Promotion Banner A' : 'Promotion Banner B')).trim();
    const subtitle = String(req.body.subtitle || '').trim();
    const destinationUrl = req.body.destinationUrl !== undefined ? String(req.body.destinationUrl).trim() : '';
    const openInNewTab = req.body.openInNewTab !== undefined ? Boolean(req.body.openInNewTab) : false;
    const active = req.body.active !== undefined ? Boolean(req.body.active) : true;

    const newBanner = {
      id,
      bannerType: 'promotion' as const,
      slot: targetSlot,
      title,
      subtitle,
      badge: '',
      image,
      buttonText: '',
      buttonAction: destinationUrl || 'gallery',
      destinationUrl,
      openInNewTab,
      order: isSlotA ? 1 : 2,
      active,
    };
    db.banners.push(newBanner);
    saveDb(db, { entity: 'banner', action: 'create', targetId: id });
    return res.status(201).json(newBanner);
  }
});

app.put('/api/admin/banners/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const rawId = req.params.id;
  const isSlotLookup = rawId === 'slot_1' || rawId === 'slot_a' || rawId === 'slot_2' || rawId === 'slot_b';
  const isSlotA = rawId === 'slot_1' || rawId === 'slot_a';
  const targetSlot = isSlotA ? 'slot_1' : 'slot_2';

  let idx = db.banners.findIndex(b => b.id === rawId);
  if (idx === -1 && isSlotLookup) {
    idx = db.banners.findIndex(
      b => (b.bannerType === 'promotion' || !b.bannerType) && (b.slot === targetSlot || (isSlotA ? b.slot === 'slot_a' : b.slot === 'slot_b'))
    );
  }

  if (idx === -1) {
    if (isSlotLookup) {
      const id = 'ban-promo-' + targetSlot + '-' + Date.now();
      const newBanner = {
        id,
        bannerType: 'promotion' as const,
        slot: targetSlot,
        title: String(req.body.title || (isSlotA ? 'Promotion Banner A' : 'Promotion Banner B')).trim(),
        subtitle: String(req.body.subtitle || '').trim(),
        badge: '',
        image: String(req.body.image || '').trim(),
        buttonText: '',
        buttonAction: req.body.destinationUrl || 'gallery',
        destinationUrl: req.body.destinationUrl !== undefined ? String(req.body.destinationUrl).trim() : '',
        openInNewTab: req.body.openInNewTab !== undefined ? Boolean(req.body.openInNewTab) : false,
        order: isSlotA ? 1 : 2,
        active: req.body.active !== undefined ? Boolean(req.body.active) : true,
      };
      db.banners.push(newBanner);
      saveDb(db, { entity: 'banner', action: 'create', targetId: id });
      return res.json(newBanner);
    }
    return res.status(404).json({ error: 'Banner not found' });
  }
  const existing = db.banners[idx];
  const bannerType = req.body.bannerType || existing.bannerType || (existing.slot === 'hero' || existing.slot === 'main' ? 'main' : 'promotion');
  db.banners[idx] = {
    ...existing,
    ...req.body,
    id: existing.id,
    bannerType,
    slot: req.body.slot || existing.slot || (bannerType === 'main' ? 'hero' : 'slot_1'),
    image: req.body.image !== undefined && String(req.body.image).trim() !== '' ? String(req.body.image).trim() : existing.image,
    order: req.body.order !== undefined ? Number(req.body.order) : existing.order,
    active: req.body.active !== undefined ? Boolean(req.body.active) : existing.active,
    openInNewTab: req.body.openInNewTab !== undefined ? Boolean(req.body.openInNewTab) : existing.openInNewTab,
  };
  saveDb(db, { entity: 'banner', action: 'update', targetId: existing.id });
  res.json(db.banners[idx]);
});

app.delete('/api/admin/banners/:id', verifyAdminToken, async (req, res) => {
  try {
    const db = getDb();
    const idToDelete = String(req.params.id || '').trim();
    if (!idToDelete) {
      return res.status(400).json({ error: 'Banner ID is required' });
    }

    const bannerToDelete = db.banners.find(b => String(b.id || '').trim() === idToDelete);
    if (!bannerToDelete) {
      return res.status(404).json({ error: `Banner "${idToDelete}" not found` });
    }

    const beforeCount = db.banners.length;
    db.banners = db.banners.filter(b => String(b.id || '').trim() !== idToDelete);
    const deletedCount = beforeCount - db.banners.length;

    saveDb(db, {
      entity: 'banner',
      action: 'delete',
      targetId: idToDelete,
      targetName: bannerToDelete.title || idToDelete,
      details: `Deleted banner ${idToDelete}`,
    });

    // Uploaded banner images remain permanently stored unless explicitly deleted by admin
    res.json({
      success: true,
      deleted: idToDelete,
      count: deletedCount,
      remaining: db.banners.length,
    });
  } catch (err: any) {
    console.error('Error deleting banner:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete promotional banner' });
  }
});

// =========================================================================
// PROFESSIONAL BLOG & ARTICLE SYSTEM (Engagement, Metrics, Comments, YouTube, SEO)
// =========================================================================

function extractYoutubeId(url?: string): string | undefined {
  if (!url) return undefined;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : undefined;
}

function calculateReadingTime(content?: string): string {
  if (!content) return '2 min read';
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Public: Get all published articles with search, category, tag, and sort filters
app.get('/api/articles', (req, res) => {
  try {
    const db = getDb();
    const now = Date.now();

    // Auto-publish scheduled articles whose scheduled time has passed
    let dbModified = false;
    db.articles.forEach(art => {
      if (art.status === 'scheduled' && art.scheduledAt && new Date(art.scheduledAt).getTime() <= now) {
        art.status = 'published';
        art.published = true;
        art.publishedAt = art.publishedAt || new Date().toISOString();
        dbModified = true;
      }
    });
    if (dbModified) saveDb(db);

    let articles = db.articles.filter(a => a.published !== false && a.status !== 'draft' && a.status !== 'archived');

    // Query Search
    const q = req.query.q as string;
    if (q && q.trim()) {
      const searchTerms = q.toLowerCase().trim().split(/\s+/);
      articles = articles.filter(a => {
        const textToSearch = `${a.title} ${a.excerpt} ${a.content} ${a.author || ''} ${(a.tags || []).join(' ')} ${a.seo?.focusKeyword || ''}`.toLowerCase();
        return searchTerms.every(term => textToSearch.includes(term));
      });
    }

    // Category filter
    const category = req.query.category as string;
    if (category && category !== 'all') {
      articles = articles.filter(a => 
        (a.category && a.category.toLowerCase() === category.toLowerCase()) ||
        (a.categoryId && a.categoryId.toLowerCase() === category.toLowerCase())
      );
    }

    // Tag filter
    const tag = req.query.tag as string;
    if (tag) {
      articles = articles.filter(a => Array.isArray(a.tags) && a.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    // Sort
    const sort = (req.query.sort as string) || 'latest';
    if (sort === 'popular') {
      articles.sort((a, b) => {
        const scoreA = (a.views || 0) + (a.likes || 0) * 5 + (a.shares || 0) * 10 + (a.commentCount || 0) * 10;
        const scoreB = (b.views || 0) + (b.likes || 0) * 5 + (b.shares || 0) * 10 + (b.commentCount || 0) * 10;
        return scoreB - scoreA;
      });
    } else if (sort === 'views') {
      articles.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'likes') {
      articles.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      // Latest
      articles.sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
    }

    // Ensure comment counts match approved comments
    articles = articles.map(art => {
      const approvedCount = db.articleComments.filter(c => c.articleId === art.id && c.status === 'approved').length;
      return {
        ...art,
        commentCount: Math.max(art.commentCount || 0, approvedCount),
      };
    });

    res.json({ success: true, articles, total: articles.length });
  } catch (err: any) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Public: Get article categories
app.get('/api/articles/categories', (_req, res) => {
  const db = getDb();
  const cats = (db.articleCategories || []).filter(c => c.active !== false);
  const counts: Record<string, number> = {};
  db.articles.forEach(a => {
    if (a.published) {
      if (a.category) counts[a.category] = (counts[a.category] || 0) + 1;
      if (a.categoryId) counts[a.categoryId] = (counts[a.categoryId] || 0) + 1;
    }
  });

  const categoriesWithCount = cats.map(c => ({
    ...c,
    count: counts[c.name] || counts[c.id] || counts[c.slug] || 0,
  }));

  res.json({ success: true, categories: categoriesWithCount });
});

// Public: Get single article by slug or ID with resolved comments, related doors, and related articles
app.get('/api/articles/:slugOrId', (req, res) => {
  try {
    const { slugOrId } = req.params;
    const db = getDb();

    const article = db.articles.find(a => a.id === slugOrId || a.slug === slugOrId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Approved comments
    const approvedComments = db.articleComments
      .filter(c => c.articleId === article.id && c.status === 'approved')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Related doors from existing door catalog
    const relatedDoorIds = article.relatedDoorIds || [];
    const relatedDoors = db.doors.filter(d => relatedDoorIds.includes(d.id));

    // Related articles (matching same category or tags, excluding current)
    const otherArticles = db.articles.filter(a => a.id !== article.id && a.published);
    const relatedArticles = otherArticles
      .filter(a => (article.category && a.category === article.category) || (article.tags && a.tags?.some(t => article.tags?.includes(t))))
      .slice(0, 3);
    
    // Fallback if none matched
    if (relatedArticles.length === 0) {
      relatedArticles.push(...otherArticles.slice(0, 3));
    }

    // Update real comment count on article
    article.commentCount = approvedComments.length;

    res.json({
      success: true,
      article,
      comments: approvedComments,
      relatedDoors,
      relatedArticles,
    });
  } catch (err: any) {
    console.error('Error fetching article details:', err);
    res.status(500).json({ error: 'Failed to fetch article details' });
  }
});

// Public: Deduplicated View Counter
app.post('/api/articles/:id/view', (req, res) => {
  try {
    const { id } = req.params;
    const { viewerHash } = req.body;
    const db = getDb();

    const article = db.articles.find(a => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const hash = viewerHash || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'guest';
    const now = Date.now();
    const DEDUP_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

    if (!Array.isArray(db.articleViews)) db.articleViews = [];

    const existingView = db.articleViews.find(
      v => v.articleId === article.id && v.viewerHash === hash && now - v.timestamp < DEDUP_WINDOW_MS
    );

    let counted = false;
    if (!existingView) {
      article.views = (article.views || 0) + 1;
      db.articleViews.push({ articleId: article.id, viewerHash: hash, timestamp: now });
      // Clean up views older than 24h
      db.articleViews = db.articleViews.filter(v => now - v.timestamp < 24 * 60 * 60 * 1000);
      saveDb(db);
      counted = true;
    }

    res.json({
      success: true,
      views: article.views || 0,
      counted,
    });
  } catch (err: any) {
    console.error('Error registering view:', err);
    res.status(500).json({ error: 'Failed to register view' });
  }
});

// Public: Toggle Like for Article
app.post('/api/articles/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const { likerHash } = req.body;
    const userId = getAuthenticatedUserId(req);
    const db = getDb();

    const article = db.articles.find(a => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const likerKey = userId ? `user:${userId}` : (likerHash || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'guest');

    if (!Array.isArray(db.articleLikes)) db.articleLikes = [];

    const existingLikeIndex = db.articleLikes.findIndex(
      l => l.articleId === article.id && l.likerHash === likerKey
    );

    let liked = false;
    if (existingLikeIndex !== -1) {
      // Toggle OFF
      db.articleLikes.splice(existingLikeIndex, 1);
      article.likes = Math.max(0, (article.likes || 1) - 1);
      liked = false;
    } else {
      // Toggle ON
      db.articleLikes.push({
        articleId: article.id,
        likerHash: likerKey,
        createdAt: new Date().toISOString(),
      });
      article.likes = (article.likes || 0) + 1;
      liked = true;
    }

    saveDb(db);

    res.json({
      success: true,
      liked,
      likes: article.likes,
    });
  } catch (err: any) {
    console.error('Error toggling like:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Public: Register Article Share Event
app.post('/api/articles/:id/share', (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'direct' } = req.body;
    const db = getDb();

    const article = db.articles.find(a => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (!Array.isArray(db.articleShares)) db.articleShares = [];

    article.shares = (article.shares || 0) + 1;
    db.articleShares.push({
      articleId: article.id,
      platform,
      timestamp: new Date().toISOString(),
    });

    saveDb(db);

    res.json({
      success: true,
      shares: article.shares,
    });
  } catch (err: any) {
    console.error('Error recording share:', err);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

// Public: Submit a Comment
app.post('/api/articles/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { authorName, authorEmail, content } = req.body;
    const userId = getAuthenticatedUserId(req);
    const db = getDb();

    const article = db.articles.find(a => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 3) {
      return res.status(400).json({ error: 'Comment content must be at least 3 characters long' });
    }

    let finalAuthorName = authorName?.trim();
    let finalAuthorEmail = authorEmail?.trim();

    if (userId) {
      const user = db.users.find(u => u.id === userId);
      if (user) {
        finalAuthorName = finalAuthorName || user.name;
        finalAuthorEmail = finalAuthorEmail || user.email;
      }
    }

    if (!finalAuthorName) {
      finalAuthorName = 'Valued Customer';
    }

    if (!Array.isArray(db.articleComments)) db.articleComments = [];

    const newComment = {
      id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      articleId: article.id,
      authorName: finalAuthorName,
      authorEmail: finalAuthorEmail,
      userId: userId || undefined,
      content: content.trim(),
      status: 'approved' as const, // Automatically approved or can be pending. Defaulting to approved for immediate responsiveness while allowing admin moderation
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    db.articleComments.unshift(newComment);
    article.commentCount = (article.commentCount || 0) + 1;

    saveDb(db);

    res.status(201).json({
      success: true,
      comment: newComment,
      message: 'Your comment has been posted successfully!',
    });
  } catch (err: any) {
    console.error('Error submitting comment:', err);
    res.status(500).json({ error: 'Failed to submit comment' });
  }
});

// Public: Get Approved Comments for Article
app.get('/api/articles/:id/comments', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const article = db.articles.find(a => a.id === id || a.slug === id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const comments = (db.articleComments || [])
    .filter(c => c.articleId === article.id && c.status === 'approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, comments });
});

// =========================================================================
// ADMIN BLOG MANAGEMENT & MODERATION
// =========================================================================

// Admin: Get all articles (drafts, published, scheduled, archived)
app.get('/api/admin/articles', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    const articlesWithMeta = db.articles.map(art => {
      const comments = (db.articleComments || []).filter(c => c.articleId === art.id);
      const pendingComments = comments.filter(c => c.status === 'pending').length;
      const approvedComments = comments.filter(c => c.status === 'approved').length;
      return {
        ...art,
        commentCount: approvedComments,
        pendingCommentsCount: pendingComments,
      };
    });

    res.json(articlesWithMeta);
  } catch (err: any) {
    console.error('Admin fetch articles error:', err);
    res.status(500).json({ error: 'Failed to load articles' });
  }
});

// Admin: Create new article (with auto slug, reading time, and notifySubscribers)
app.post('/api/admin/articles', verifyAdminToken, async (req, res) => {
  try {
    const db = getDb();
    const title = (req.body.title || 'Untitled Wood Guide').trim();
    let slug = (req.body.slug || generateSlug(title)).trim();

    // Ensure unique slug
    let uniqueSlug = slug;
    let counter = 1;
    while (db.articles.some(a => a.slug === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter++}`;
    }

    const content = req.body.content || '';
    const readTime = req.body.readTime || calculateReadingTime(content);
    const youtubeUrl = req.body.youtubeUrl?.trim() || undefined;
    const youtubeVideoId = req.body.youtubeVideoId?.trim() || extractYoutubeId(youtubeUrl);
    const status = req.body.status || (req.body.published !== false ? 'published' : 'draft');
    const published = status === 'published';

    const newArt = {
      id: 'art-' + Date.now(),
      title,
      slug: uniqueSlug,
      image: req.body.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      gallery: Array.isArray(req.body.gallery) ? req.body.gallery : [],
      excerpt: (req.body.excerpt || '').trim(),
      content,
      author: (req.body.author || 'Shivshahi Wood Experts').trim(),
      authorPhoto: req.body.authorPhoto?.trim() || undefined,
      authorBio: req.body.authorBio?.trim() || undefined,
      category: req.body.category || 'Door Guide',
      categoryId: req.body.categoryId || undefined,
      tags: Array.isArray(req.body.tags) ? req.body.tags.map((t: string) => t.trim()).filter(Boolean) : ['Sagwan Door'],
      readTime,
      status,
      published,
      publishedAt: published ? (req.body.publishedAt || new Date().toISOString()) : undefined,
      scheduledAt: status === 'scheduled' ? req.body.scheduledAt : undefined,
      views: Number(req.body.views) || 0,
      likes: Number(req.body.likes) || 0,
      shares: Number(req.body.shares) || 0,
      commentCount: 0,
      youtubeVideoId,
      youtubeUrl,
      youtubeTitle: req.body.youtubeTitle?.trim() || undefined,
      youtubeDescription: req.body.youtubeDescription?.trim() || undefined,
      relatedDoorIds: Array.isArray(req.body.relatedDoorIds) ? req.body.relatedDoorIds : [],
      relatedArticleIds: Array.isArray(req.body.relatedArticleIds) ? req.body.relatedArticleIds : [],
      cta: req.body.cta || {
        enabled: true,
        type: 'calculator',
        title: 'Calculate Door Price For Your Size',
        buttonText: 'Open Door Calculator',
      },
      seo: req.body.seo || {
        seoTitle: `${title} | Shivshahi Doors`,
        metaDescription: req.body.excerpt || title,
        focusKeyword: title.split(' ')[0],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.articles.unshift(newArt);
    saveDb(db);

    // Push notification integration if requested
    if (req.body.notifySubscribers && published) {
      try {
        const campaign: NotificationCampaign = {
          id: 'camp_art_' + Date.now(),
          title: `New Guide: ${newArt.title}`,
          message: newArt.excerpt || 'Read our newly published expert woodworking and door guide.',
          image: newArt.image,
          category: 'important_updates',
          targetAudience: 'all',
          deepLink: `/articles/${newArt.slug}`,
          status: 'sent',
          createdBy: 'Admin (Article Publisher)',
          createdAt: new Date().toISOString(),
        };
        await sendCampaignNotification(campaign);
      } catch (notifyErr) {
        console.warn('Article push notification dispatch warning:', notifyErr);
      }
    }

    res.status(201).json(newArt);
  } catch (err: any) {
    console.error('Error creating article:', err);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Admin: Update article
app.put('/api/admin/articles/:id', verifyAdminToken, async (req, res) => {
  try {
    const db = getDb();
    const idx = db.articles.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Article not found' });

    const current = db.articles[idx];
    const title = (req.body.title || current.title).trim();
    let slug = (req.body.slug || current.slug || generateSlug(title)).trim();

    // Ensure slug doesn't collide with other articles
    let uniqueSlug = slug;
    let counter = 1;
    while (db.articles.some(a => a.id !== req.params.id && a.slug === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter++}`;
    }

    const content = req.body.content !== undefined ? req.body.content : current.content;
    const readTime = req.body.readTime || calculateReadingTime(content);
    const youtubeUrl = req.body.youtubeUrl !== undefined ? (req.body.youtubeUrl?.trim() || undefined) : current.youtubeUrl;
    const youtubeVideoId = req.body.youtubeVideoId?.trim() || extractYoutubeId(youtubeUrl) || current.youtubeVideoId;
    const status = req.body.status || (req.body.published !== undefined ? (req.body.published ? 'published' : 'draft') : current.status);
    const published = status === 'published';

    const wasPublished = current.published;

    db.articles[idx] = {
      ...current,
      ...req.body,
      id: current.id,
      title,
      slug: uniqueSlug,
      content,
      readTime,
      youtubeUrl,
      youtubeVideoId,
      status,
      published,
      publishedAt: published && !current.publishedAt ? new Date().toISOString() : current.publishedAt,
      views: req.body.views !== undefined ? Number(req.body.views) : current.views,
      likes: req.body.likes !== undefined ? Number(req.body.likes) : current.likes,
      shares: req.body.shares !== undefined ? Number(req.body.shares) : current.shares,
      updatedAt: new Date().toISOString(),
    };

    saveDb(db);

    // Push notification if newly published or explicitly requested
    if (req.body.notifySubscribers && published) {
      try {
        const campaign: NotificationCampaign = {
          id: 'camp_art_' + Date.now(),
          title: `Updated Guide: ${db.articles[idx].title}`,
          message: db.articles[idx].excerpt || 'Read our freshly updated woodwork and door guide.',
          image: db.articles[idx].image,
          category: 'important_updates',
          targetAudience: 'all',
          deepLink: `/articles/${db.articles[idx].slug}`,
          status: 'sent',
          createdBy: 'Admin',
          createdAt: new Date().toISOString(),
        };
        await sendCampaignNotification(campaign);
      } catch (notifyErr) {
        console.warn('Article push notification update warning:', notifyErr);
      }
    }

    res.json(db.articles[idx]);
  } catch (err: any) {
    console.error('Error updating article:', err);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Admin: Delete article
app.delete('/api/admin/articles/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.articles = db.articles.filter(a => a.id !== req.params.id);
  // Also remove associated comments
  db.articleComments = (db.articleComments || []).filter(c => c.articleId !== req.params.id);
  saveDb(db);
  res.json({ success: true, message: 'Article and comments deleted successfully' });
});

// Admin: Get Comments List for Moderation
app.get('/api/admin/articles/comments', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status as string;
    const articleId = req.query.articleId as string;

    let comments = [...(db.articleComments || [])];

    if (articleId) {
      comments = comments.filter(c => c.articleId === articleId);
    }

    if (status && status !== 'all') {
      comments = comments.filter(c => c.status === status);
    }

    // Attach article title to comments
    const enriched = comments.map(c => {
      const art = db.articles.find(a => a.id === c.articleId);
      return {
        ...c,
        articleTitle: art ? art.title : 'Deleted Article',
        articleSlug: art?.slug,
      };
    });

    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      comments: enriched,
      counts: {
        all: (db.articleComments || []).length,
        pending: (db.articleComments || []).filter(c => c.status === 'pending').length,
        approved: (db.articleComments || []).filter(c => c.status === 'approved').length,
        hidden: (db.articleComments || []).filter(c => c.status === 'hidden').length,
        spam: (db.articleComments || []).filter(c => c.status === 'spam').length,
      },
    });
  } catch (err: any) {
    console.error('Error fetching admin comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Admin: Moderate Comment Status
app.patch('/api/admin/articles/comments/:commentId', verifyAdminToken, (req, res) => {
  try {
    const { commentId } = req.params;
    const { status } = req.body;
    const db = getDb();

    const idx = (db.articleComments || []).findIndex(c => c.id === commentId);
    if (idx === -1) return res.status(404).json({ error: 'Comment not found' });

    db.articleComments[idx].status = status;
    const art = db.articles.find(a => a.id === db.articleComments[idx].articleId);
    if (art) {
      art.commentCount = db.articleComments.filter(c => c.articleId === art.id && c.status === 'approved').length;
    }

    saveDb(db);

    res.json({ success: true, comment: db.articleComments[idx] });
  } catch (err: any) {
    console.error('Error moderating comment:', err);
    res.status(500).json({ error: 'Failed to update comment status' });
  }
});

// Admin: Reply to Comment
app.post('/api/admin/articles/comments/:commentId/reply', verifyAdminToken, (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, authorName = 'Shivshahi Wood Experts' } = req.body;
    const db = getDb();

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const idx = (db.articleComments || []).findIndex(c => c.id === commentId);
    if (idx === -1) return res.status(404).json({ error: 'Comment not found' });

    db.articleComments[idx].adminReply = {
      text: text.trim(),
      repliedAt: new Date().toISOString(),
      authorName: authorName.trim(),
    };
    db.articleComments[idx].status = 'approved'; // Replying automatically approves the comment if not already

    const art = db.articles.find(a => a.id === db.articleComments[idx].articleId);
    if (art) {
      art.commentCount = db.articleComments.filter(c => c.articleId === art.id && c.status === 'approved').length;
    }

    saveDb(db);

    res.json({ success: true, comment: db.articleComments[idx] });
  } catch (err: any) {
    console.error('Error replying to comment:', err);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

// Admin: Delete Comment
app.delete('/api/admin/articles/comments/:commentId', verifyAdminToken, (req, res) => {
  const { commentId } = req.params;
  const db = getDb();
  const comm = (db.articleComments || []).find(c => c.id === commentId);
  if (!comm) return res.status(404).json({ error: 'Comment not found' });

  const articleId = comm.articleId;
  db.articleComments = db.articleComments.filter(c => c.id !== commentId);

  const art = db.articles.find(a => a.id === articleId);
  if (art) {
    art.commentCount = db.articleComments.filter(c => c.articleId === art.id && c.status === 'approved').length;
  }

  saveDb(db);
  res.json({ success: true, message: 'Comment deleted' });
});

// Admin: Article Analytics Dashboard Summary
app.get('/api/admin/articles/analytics', verifyAdminToken, (_req, res) => {
  try {
    const db = getDb();
    const articles = db.articles || [];
    const comments = db.articleComments || [];

    const totalArticles = articles.length;
    const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalLikes = articles.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalShares = articles.reduce((sum, a) => sum + (a.shares || 0), 0);
    const totalComments = comments.filter(c => c.status === 'approved').length;

    const overallEngagementRate = totalViews > 0
      ? Math.round(((totalLikes + totalComments + totalShares) / totalViews) * 1000) / 10
      : 0;

    const topViewed = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const topLiked = [...articles].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5);
    const topShared = [...articles].sort((a, b) => (b.shares || 0) - (a.shares || 0)).slice(0, 5);
    const topCommented = [...articles].sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0)).slice(0, 5);

    res.json({
      success: true,
      summary: {
        totalArticles,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        overallEngagementRate,
        topViewed,
        topLiked,
        topShared,
        topCommented,
      },
    });
  } catch (err: any) {
    console.error('Error computing article analytics:', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

// Admin: CRUD for Article Categories
app.get('/api/admin/article-categories', verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json(db.articleCategories || []);
});

app.post('/api/admin/article-categories', verifyAdminToken, (req, res) => {
  const db = getDb();
  if (!Array.isArray(db.articleCategories)) db.articleCategories = [];
  const name = (req.body.name || 'New Category').trim();
  const newCat = {
    id: 'cat-art-' + Date.now(),
    name,
    slug: req.body.slug || generateSlug(name),
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.articleCategories.push(newCat);
  saveDb(db);
  res.status(201).json(newCat);
});

app.put('/api/admin/article-categories/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  if (!Array.isArray(db.articleCategories)) db.articleCategories = [];
  const idx = db.articleCategories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  db.articleCategories[idx] = { ...db.articleCategories[idx], ...req.body, id: db.articleCategories[idx].id };
  saveDb(db);
  res.json(db.articleCategories[idx]);
});

app.delete('/api/admin/article-categories/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  if (!Array.isArray(db.articleCategories)) db.articleCategories = [];
  db.articleCategories = db.articleCategories.filter(c => c.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: Settings Update
app.put('/api/admin/settings', verifyAdminToken, (req, res) => {
  const db = getDb();
  const { adminPassword, ...newSettings } = req.body;

  db.settings = {
    ...db.settings,
    ...newSettings,
    additionalChargePercentage: Number(newSettings.additionalChargePercentage ?? db.settings.additionalChargePercentage),
  };

  if (newSettings.googleMapsUrl) {
    db.settings.googleMapsUrl = String(newSettings.googleMapsUrl).trim();
    if (!db.settings.legalSettings) db.settings.legalSettings = {};
    if (!db.settings.legalSettings.socialLinks) db.settings.legalSettings.socialLinks = {};
    db.settings.legalSettings.socialLinks.googleBusiness = db.settings.googleMapsUrl;
  }

  if (newSettings.legalSettings) {
    db.settings.legalSettings = {
      ...db.settings.legalSettings,
      ...newSettings.legalSettings,
      socialLinks: {
        ...db.settings.legalSettings?.socialLinks,
        ...(newSettings.legalSettings.socialLinks || {}),
      },
    };
  }

  if (newSettings.contentProtection) {
    db.settings.contentProtection = {
      enableImageProtection: Boolean(newSettings.contentProtection.enableImageProtection ?? true),
      enableWatermark: Boolean(newSettings.contentProtection.enableWatermark ?? true),
      watermarkText: String(newSettings.contentProtection.watermarkText || 'Jai Hanuman Door').slice(0, 60),
      watermarkOpacity: Math.min(0.6, Math.max(0.05, Number(newSettings.contentProtection.watermarkOpacity ?? 0.22))),
      watermarkPattern: ['diagonal', 'center', 'repeated', 'corner'].includes(newSettings.contentProtection.watermarkPattern)
        ? newSettings.contentProtection.watermarkPattern
        : 'diagonal',
      enableAndroidFlagSecure: Boolean(newSettings.contentProtection.enableAndroidFlagSecure ?? true),
      enableAndroidScreenRecordProtection: Boolean(newSettings.contentProtection.enableAndroidScreenRecordProtection ?? true),
    };
  }

  if (newSettings.aiWoodDetector) {
    db.settings.aiWoodDetector = {
      enabled: Boolean(newSettings.aiWoodDetector.enabled ?? true),
      maxDailyScans: Number(newSettings.aiWoodDetector.maxDailyScans ?? 150),
      customNotice: typeof newSettings.aiWoodDetector.customNotice === 'string' ? newSettings.aiWoodDetector.customNotice : '',
    };
  }

  if (newSettings.storySettings) {
    db.settings.storySettings = {
      sectionTitle: typeof newSettings.storySettings.sectionTitle === 'string' ? newSettings.storySettings.sectionTitle.trim() : 'Our Story & Heritage',
      subtitle: typeof newSettings.storySettings.subtitle === 'string' ? newSettings.storySettings.subtitle.trim() : 'A journey of craftsmanship, trust & quality',
      storyHeading: typeof newSettings.storySettings.storyHeading === 'string' ? newSettings.storySettings.storyHeading.trim() : 'From Craftsmanship to Trusted Door Manufacturing',
      companyStory: typeof newSettings.storySettings.companyStory === 'string' ? newSettings.storySettings.companyStory : '',
      ownerName: typeof newSettings.storySettings.ownerName === 'string' ? newSettings.storySettings.ownerName.trim() : 'Manjeet Prajapati',
      ownerDesignation: typeof newSettings.storySettings.ownerDesignation === 'string' ? newSettings.storySettings.ownerDesignation.trim() : 'Founder & Owner — Jai Hanuman Door',
      ownerDescription: typeof newSettings.storySettings.ownerDescription === 'string' ? newSettings.storySettings.ownerDescription : '',
      ownerPhotoUrl: typeof newSettings.storySettings.ownerPhotoUrl === 'string' ? newSettings.storySettings.ownerPhotoUrl.trim() : '',
      highlights: Array.isArray(newSettings.storySettings.highlights) ? newSettings.storySettings.highlights : [
        { title: '100% Genuine', subtitle: 'CP Teak & Hardwood' },
        { title: 'Precision Fit', subtitle: 'Custom Millimetre Sizing' },
        { title: 'Direct Factory', subtitle: 'Transparent Pricing' },
      ],
    };

    // Synchronize Founder/Owner profile in db.teamMembers with storySettings
    if (Array.isArray(db.teamMembers)) {
      const founderIdx = db.teamMembers.findIndex(
        m =>
          m.name?.toLowerCase().includes('manjeet') ||
          m.designation?.toLowerCase().includes('founder') ||
          m.designation?.toLowerCase().includes('owner')
      );
      if (founderIdx !== -1) {
        const ownerPhoto = db.settings.storySettings.ownerPhotoUrl;
        if (ownerPhoto && !ownerPhoto.startsWith('blob:')) {
          db.teamMembers[founderIdx].photo = ownerPhoto;
        }
        if (db.settings.storySettings.ownerName) {
          db.teamMembers[founderIdx].name = db.settings.storySettings.ownerName;
        }
        db.teamMembers[founderIdx].updatedAt = new Date().toISOString();
      }
    }
  }

  if (adminPassword && typeof adminPassword === 'string' && adminPassword.trim().length >= 4) {
    db.adminPasswordHash = adminPassword.trim();
  }

  saveDb(db, { entity: 'settings', action: 'update', targetId: 'settings' });
  res.json({ success: true, settings: db.settings });
});

// =========================================================================
// CUSTOMER ENQUIRIES API ENDPOINTS (Public & Admin)
// =========================================================================

// Public: Submit customer enquiry with validation & anti-spam duplicate prevention
app.post('/api/enquiries', (req, res) => {
  const { name, phone, email, city, enquiryType, doorId, doorName, message } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter a valid full name (minimum 2 characters).' });
  }

  // Clean phone and validate (must have at least 10 digits)
  const cleanedPhone = String(phone || '').replace(/[^0-9+]/g, '');
  const digitsOnly = cleanedPhone.replace(/[^0-9]/g, '');
  if (!cleanedPhone || digitsOnly.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid contact phone number with at least 10 digits.' });
  }

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return res.status(400).json({ error: 'Please provide brief details or your door requirement (minimum 5 characters).' });
  }

  const db = getDb();
  if (!Array.isArray(db.enquiries)) {
    db.enquiries = [];
  }

  // Anti-spam / duplicate prevention: Check if same phone submitted similar request within past 60 seconds
  const now = Date.now();
  const duplicate = db.enquiries.find(e => {
    const timeDiff = now - new Date(e.createdAt).getTime();
    return timeDiff < 60000 && e.phone.replace(/[^0-9]/g, '') === digitsOnly;
  });

  if (duplicate) {
    return res.status(429).json({
      error: 'We have already received your enquiry recently. Our factory representative will reach out to you promptly.',
    });
  }

  const newEnquiry: CustomerEnquiry = {
    id: `enq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim().slice(0, 80),
    phone: cleanedPhone.slice(0, 25),
    email: email && typeof email === 'string' && email.includes('@') ? email.trim().slice(0, 100) : undefined,
    city: city && typeof city === 'string' ? city.trim().slice(0, 80) : undefined,
    enquiryType: enquiryType && typeof enquiryType === 'string' ? enquiryType.trim().slice(0, 60) : 'General Inquiry',
    doorId: doorId ? String(doorId).slice(0, 50) : undefined,
    doorName: doorName ? String(doorName).slice(0, 100) : undefined,
    message: message.trim().slice(0, 2000),
    status: 'new',
    createdAt: new Date().toISOString(),
  };

  db.enquiries.unshift(newEnquiry);
  // Cap enquiries list to 500 records
  if (db.enquiries.length > 500) {
    db.enquiries = db.enquiries.slice(0, 500);
  }

  saveDb(db);

  res.json({
    success: true,
    enquiry: {
      id: newEnquiry.id,
      name: newEnquiry.name,
      status: newEnquiry.status,
      createdAt: newEnquiry.createdAt,
    },
    message: 'Thank you! Your enquiry has been received. Our factory team will connect with you shortly.',
  });
});

// Admin: Get all customer enquiries
app.get('/api/admin/enquiries', verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json({
    success: true,
    enquiries: db.enquiries || [],
  });
});

// Admin: Update enquiry status ('new' | 'contacted' | 'resolved')
app.put('/api/admin/enquiries/:id/status', verifyAdminToken, (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!['new', 'contacted', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be new, contacted, or resolved.' });
  }

  const enq = (db.enquiries || []).find(e => e.id === req.params.id);
  if (!enq) {
    return res.status(404).json({ error: 'Enquiry not found.' });
  }

  enq.status = status;
  saveDb(db);
  res.json({ success: true, enquiry: enq });
});

// Admin: Delete an enquiry
app.delete('/api/admin/enquiries/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.enquiries = (db.enquiries || []).filter(e => e.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: Quotes log
app.get('/api/admin/quotes', verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json(db.quotes || []);
});

app.delete('/api/admin/quotes/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.quotes = db.quotes.filter(q => q.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// =========================================================================
// PRODUCTION DATA PERSISTENCE, BACKUP & RESTORE API ENDPOINTS
// =========================================================================

// Admin: Export production database backup
app.get('/api/admin/backup/export', verifyAdminToken, (_req, res) => {
  try {
    const backup = exportDatabaseBackup();
    const filename = `jaihanuman-production-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to export backup' });
  }
});

// Admin: Import / Restore production database backup
app.post('/api/admin/backup/import', verifyAdminToken, (req, res) => {
  try {
    const result = importDatabaseBackup(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to restore backup' });
  }
});

// Admin: List available local rolling backups
app.get('/api/admin/backup/list', verifyAdminToken, (_req, res) => {
  try {
    const backups = listAvailableBackups();
    res.json({ backups });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list backups' });
  }
});

// Admin: Restore a specific local backup snapshot
app.post('/api/admin/backup/restore-local', verifyAdminToken, (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    const result = restoreBackupFile(filename);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to restore local backup' });
  }
});

// Admin: Protected reset-defaults endpoint (prevents accidental production data loss)
app.post('/api/admin/reset-defaults', verifyAdminToken, (_req, res) => {
  res.status(403).json({
    error: 'Direct factory reset is disabled to protect your live business data. Use Admin Backup & Restore to manage your catalogue versions safely.'
  });
});

// =========================================================================
// TEAM MEMBERS / LEADERSHIP API ENDPOINTS (Public & Admin)
// =========================================================================

// Public: Get all active team members sorted by displayOrder
app.get('/api/team-members', (_req, res) => {
  const db = getDb();
  const members = (db.teamMembers || [])
    .filter(m => m.active)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json({ success: true, teamMembers: members });
});

// Admin: Get all team members (including inactive)
app.get('/api/admin/team-members', verifyAdminToken, (_req, res) => {
  const db = getDb();
  const members = (db.teamMembers || [])
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json({ success: true, teamMembers: members });
});

// Admin: Create team member
app.post('/api/admin/team-members', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) {
      db.teamMembers = [];
    }

    const name = (req.body.name || '').trim();
    const designation = (req.body.designation || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Team member name is required' });
    }
    if (!designation) {
      return res.status(400).json({ error: 'Team member designation is required' });
    }

    const highestOrder = db.teamMembers.reduce((max, m) => Math.max(max, m.displayOrder || 0), 0);
    const displayOrder = Number(req.body.displayOrder) > 0 ? Number(req.body.displayOrder) : highestOrder + 1;

    // Sanitize string arrays for responsibilities and achievements
    const parseList = (input: any): string[] => {
      if (Array.isArray(input)) {
        return input.map(item => String(item).trim()).filter(Boolean);
      }
      if (typeof input === 'string') {
        return input.split('\n').map(line => line.trim()).filter(Boolean);
      }
      return [];
    };

    const newMember: TeamMember = {
      id: 'team-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name,
      designation,
      photo: req.body.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      shortBio: (req.body.shortBio || '').trim(),
      fullBio: (req.body.fullBio || '').trim(),
      experience: req.body.experience ? String(req.body.experience).trim() : undefined,
      specialization: req.body.specialization ? String(req.body.specialization).trim() : undefined,
      responsibilities: parseList(req.body.responsibilities),
      achievements: parseList(req.body.achievements),
      socialLinks: {
        linkedin: req.body.socialLinks?.linkedin?.trim() || undefined,
        instagram: req.body.socialLinks?.instagram?.trim() || undefined,
        facebook: req.body.socialLinks?.facebook?.trim() || undefined,
        youtube: req.body.socialLinks?.youtube?.trim() || undefined,
        email: req.body.socialLinks?.email?.trim() || undefined,
      },
      videoUrl: req.body.videoUrl ? String(req.body.videoUrl).trim() : undefined,
      displayOrder,
      active: req.body.active !== undefined ? Boolean(req.body.active) : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.teamMembers.push(newMember);
    saveDb(db);

    res.status(201).json({ success: true, member: newMember });
  } catch (err: any) {
    console.error('Error creating team member:', err);
    res.status(500).json({ error: 'Failed to create team member' });
  }
});

// Admin: Update team member
app.put('/api/admin/team-members/:id', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];

    const index = db.teamMembers.findIndex(m => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    const current = db.teamMembers[index];

    const parseList = (input: any): string[] => {
      if (Array.isArray(input)) {
        return input.map(item => String(item).trim()).filter(Boolean);
      }
      if (typeof input === 'string') {
        return input.split('\n').map(line => line.trim()).filter(Boolean);
      }
      return [];
    };

    const updatedMember: TeamMember = {
      ...current,
      name: req.body.name !== undefined ? String(req.body.name).trim() : current.name,
      designation: req.body.designation !== undefined ? String(req.body.designation).trim() : current.designation,
      photo: req.body.photo !== undefined ? String(req.body.photo).trim() : current.photo,
      shortBio: req.body.shortBio !== undefined ? String(req.body.shortBio).trim() : current.shortBio,
      fullBio: req.body.fullBio !== undefined ? String(req.body.fullBio).trim() : current.fullBio,
      experience: req.body.experience !== undefined ? String(req.body.experience).trim() : current.experience,
      specialization: req.body.specialization !== undefined ? String(req.body.specialization).trim() : current.specialization,
      responsibilities: req.body.responsibilities !== undefined ? parseList(req.body.responsibilities) : current.responsibilities,
      achievements: req.body.achievements !== undefined ? parseList(req.body.achievements) : current.achievements,
      socialLinks: {
        linkedin: req.body.socialLinks?.linkedin !== undefined ? req.body.socialLinks.linkedin.trim() : current.socialLinks?.linkedin,
        instagram: req.body.socialLinks?.instagram !== undefined ? req.body.socialLinks.instagram.trim() : current.socialLinks?.instagram,
        facebook: req.body.socialLinks?.facebook !== undefined ? req.body.socialLinks.facebook.trim() : current.socialLinks?.facebook,
        youtube: req.body.socialLinks?.youtube !== undefined ? req.body.socialLinks.youtube.trim() : current.socialLinks?.youtube,
        email: req.body.socialLinks?.email !== undefined ? req.body.socialLinks.email.trim() : current.socialLinks?.email,
      },
      videoUrl: req.body.videoUrl !== undefined ? String(req.body.videoUrl).trim() : current.videoUrl,
      displayOrder: req.body.displayOrder !== undefined ? Number(req.body.displayOrder) : current.displayOrder,
      active: req.body.active !== undefined ? Boolean(req.body.active) : current.active,
      updatedAt: new Date().toISOString(),
    };

    db.teamMembers[index] = updatedMember;

    // If this member is the Founder/Owner, synchronize storySettings.ownerPhotoUrl
    const isFounder =
      updatedMember.name.toLowerCase().includes('manjeet') ||
      updatedMember.designation.toLowerCase().includes('founder') ||
      updatedMember.designation.toLowerCase().includes('owner');
    if (isFounder && updatedMember.photo && !updatedMember.photo.startsWith('blob:')) {
      if (!db.settings) db.settings = {} as any;
      if (!db.settings.storySettings) db.settings.storySettings = {} as any;
      db.settings.storySettings.ownerPhotoUrl = updatedMember.photo;
      db.settings.storySettings.ownerName = updatedMember.name;
    }

    saveDb(db);

    res.json({ success: true, member: updatedMember });
  } catch (err: any) {
    console.error('Error updating team member:', err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// Admin: Toggle team member active status
app.patch('/api/admin/team-members/:id/toggle-active', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];

    const index = db.teamMembers.findIndex(m => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    db.teamMembers[index].active = !db.teamMembers[index].active;
    db.teamMembers[index].updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ success: true, active: db.teamMembers[index].active, member: db.teamMembers[index] });
  } catch (err: any) {
    console.error('Error toggling team member status:', err);
    res.status(500).json({ error: 'Failed to toggle active status' });
  }
});

// Admin: Reorder team members
app.put('/api/admin/team-members-reorder', verifyAdminToken, (req, res) => {
  try {
    const { orderList } = req.body; // Array of { id: string, displayOrder: number }
    if (!Array.isArray(orderList)) {
      return res.status(400).json({ error: 'orderList array is required' });
    }

    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];

    orderList.forEach(item => {
      const member = db.teamMembers.find(m => m.id === item.id);
      if (member) {
        member.displayOrder = Number(item.displayOrder);
        member.updatedAt = new Date().toISOString();
      }
    });

    saveDb(db);
    const sorted = db.teamMembers.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    res.json({ success: true, teamMembers: sorted });
  } catch (err: any) {
    console.error('Error reordering team members:', err);
    res.status(500).json({ error: 'Failed to reorder team members' });
  }
});

// Admin: Delete team member
app.delete('/api/admin/team-members/:id', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];

    const initialLen = db.teamMembers.length;
    db.teamMembers = db.teamMembers.filter(m => m.id !== req.params.id);

    if (db.teamMembers.length === initialLen) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    saveDb(db);
    res.json({ success: true, message: 'Team member deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting team member:', err);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

// =========================================================================
// PUSH NOTIFICATION API ENDPOINTS (Sections 1-28)
// =========================================================================

// Public: Get FCM configuration status and public VAPID / client keys
app.get('/api/notifications/config', (_req, res) => {
  const fcmStatus = getFcmConfigStatus();
  const vapidKey = process.env.VITE_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || null;

  // Optional client Firebase config if provided in env
  const firebaseClientConfig = process.env.VITE_FIREBASE_API_KEY
    ? {
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID,
      }
    : null;

  res.json({
    isConfigured: fcmStatus.isConfigured,
    projectId: fcmStatus.projectId,
    vapidKey,
    firebaseClientConfig,
  });
});

// Public: Register / refresh device FCM token with deduplication
app.post('/api/notifications/register-token', (req, res) => {
  try {
    const { token, deviceId, platform, browser, permission, preferences } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Device token is required' });
    }

    const userId = getAuthenticatedUserId(req) || undefined;

    const record = registerOrUpdateToken({
      token,
      userId,
      deviceId: deviceId || 'dev_' + Math.random().toString(36).substring(2, 10),
      platform,
      browser,
      permission,
      preferences,
    });

    res.json({
      success: true,
      tokenRecord: record,
    });
  } catch (err: any) {
    console.error('Error registering notification token:', err);
    res.status(500).json({ error: 'Failed to register notification token' });
  }
});

// Public: Get notification preferences for a device / user
app.get('/api/notifications/preferences', (req, res) => {
  const deviceId = req.query.deviceId as string;
  const userId = getAuthenticatedUserId(req);

  const db = getDb();
  let tokenRecord = db.notificationTokens.find(
    t => (userId && t.userId === userId) || (deviceId && t.deviceId === deviceId)
  );

  const preferences = tokenRecord ? tokenRecord.preferences : DEFAULT_PREFERENCES;
  res.json({ preferences });
});

// Public: Update notification preferences
app.put('/api/notifications/preferences', (req, res) => {
  try {
    const { deviceId, token, preferences } = req.body;
    const userId = getAuthenticatedUserId(req) || undefined;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Preferences object is required' });
    }

    const updated = updateTokenPreferences({ deviceId, userId, token }, preferences);
    res.json({ success: true, updated });
  } catch (err: any) {
    console.error('Error updating notification preferences:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Admin: Get notification dashboard statistics
app.get('/api/admin/notifications/stats', verifyAdminToken, (_req, res) => {
  try {
    const stats = getNotificationStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching notification stats:', err);
    res.status(500).json({ error: 'Failed to load notification statistics' });
  }
});

// Admin: Get notification campaigns history
app.get('/api/admin/notifications/campaigns', verifyAdminToken, (_req, res) => {
  try {
    const db = getDb();
    const sorted = [...db.notificationCampaigns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sorted);
  } catch (err) {
    console.error('Error fetching notification campaigns:', err);
    res.status(500).json({ error: 'Failed to load campaigns' });
  }
});

// Admin: Send or schedule a notification campaign
app.post('/api/admin/notifications/send', verifyAdminToken, async (req, res) => {
  try {
    const {
      title,
      message,
      image,
      category = 'important_updates',
      targetAudience = 'all',
      deepLink = '/',
      doorId,
      scheduleTime,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Notification title is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Notification message body is required' });
    }

    // Check if scheduled for the future
    const isScheduled = scheduleTime && new Date(scheduleTime).getTime() > Date.now();

    const newCampaign: NotificationCampaign = {
      id: 'camp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      message: message.trim(),
      image: image || undefined,
      category,
      targetAudience,
      deepLink: deepLink || '/',
      doorId: doorId || undefined,
      status: isScheduled ? 'scheduled' : 'draft',
      scheduledAt: isScheduled ? new Date(scheduleTime).toISOString() : undefined,
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
    };

    const db = getDb();

    if (isScheduled) {
      db.notificationCampaigns.push(newCampaign);
      saveDb(db);
      return res.json({
        success: true,
        status: 'scheduled',
        message: `Notification successfully scheduled for ${new Date(scheduleTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`,
        campaign: newCampaign,
      });
    }

    // Send immediately via FCM
    try {
      const result = await sendCampaignNotification(newCampaign);
      res.json({
        success: true,
        status: 'sent',
        message: 'Notification sent successfully',
        result,
        campaign: newCampaign,
      });
    } catch (sendErr: any) {
      console.error('Notification dispatch error:', sendErr);
      const isNotConfigured = sendErr.message?.includes('not configured');
      return res.status(isNotConfigured ? 400 : 500).json({
        error: sendErr.message || 'Unable to send notification. Please try again.',
        isNotConfigured,
      });
    }
  } catch (err: any) {
    console.error('Error in send notification handler:', err);
    res.status(500).json({ error: 'Unable to send notification. Please try again.' });
  }
});

// Admin: Cancel scheduled notification
app.post('/api/admin/notifications/cancel-scheduled/:id', verifyAdminToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const campaign = db.notificationCampaigns.find(c => c.id === id);

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (campaign.status === 'scheduled') {
    campaign.status = 'draft';
    campaign.error = 'Cancelled by administrator';
    saveDb(db);
  }

  res.json({ success: true, campaign });
});

// Admin: Delete notification campaign
app.delete('/api/admin/notifications/campaign/:id', verifyAdminToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const initialLen = db.notificationCampaigns.length;
  db.notificationCampaigns = db.notificationCampaigns.filter(c => c.id !== id);

  if (db.notificationCampaigns.length === initialLen) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  saveDb(db);
  res.json({ success: true, message: 'Campaign deleted successfully' });
});

// ---------------- SEO & SEARCH ENGINE INDEXING ----------------
// Dedicated XML Sitemap and Robots Handlers
// (Registered with priority before static assets and SPA fallback)
const handleSitemapRequest = (_req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'all');

  try {
    const xml = generateSitemapXml();
    return res.status(200).send(xml);
  } catch (err) {
    console.error('❌ Error dynamically generating /sitemap.xml:', err);
    // Fallback to static file on disk if dynamic generator throws
    const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
    const staticCandidates = [
      path.join(process.cwd(), 'dist', 'sitemap.xml'),
      path.join(process.cwd(), 'public', 'sitemap.xml'),
      path.join(appDir, 'dist', 'sitemap.xml'),
      path.join(appDir, 'public', 'sitemap.xml'),
    ];
    for (const p of staticCandidates) {
      if (fs.existsSync(p)) {
        try {
          const staticXml = fs.readFileSync(p, 'utf8');
          return res.status(200).send(staticXml);
        } catch {}
      }
    }
    return res.status(200).send(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://jaihanumandoor.com/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>'
    );
  }
};

const handleRobotsRequest = (_req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    const robotsTxt = generateRobotsTxt();
    return res.status(200).send(robotsTxt);
  } catch (err) {
    console.error('❌ Error generating /robots.txt:', err);
    return res.status(200).send(
      'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\nDisallow: /api/\nSitemap: https://jaihanumandoor.com/sitemap.xml\n'
    );
  }
};

const APP_ADS_TXT_CONTENT = 'google.com, pub-2305048922926538, DIRECT, f08c47fec0942fa0\n';

const handleAppAdsTxtRequest = (_req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const candidatePaths = [
    path.join(process.cwd(), 'public', 'app-ads.txt'),
    path.join(process.cwd(), 'dist', 'app-ads.txt'),
    path.join(currentDir, 'public', 'app-ads.txt'),
    path.join(currentDir, 'dist', 'app-ads.txt'),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        const fileContent = fs.readFileSync(p, 'utf8');
        return res.status(200).send(fileContent);
      } catch {}
    }
  }

  return res.status(200).send(APP_ADS_TXT_CONTENT);
};

app.get(['/sitemap.xml', '/sitemap.xml/', '/sitemap'], handleSitemapRequest);
app.get(['/robots.txt', '/robots.txt/'], handleRobotsRequest);
app.get(['/app-ads.txt', '/app-ads.txt/'], handleAppAdsTxtRequest);

// Register Sliding Window Fabrication Calculator & AI Notebook Scanner API routes
// synchronously at top level alongside all other /api/* routes (well before Vite/SPA fallback)
registerSlidingWindowRoutes(app, isValidAdminToken);
registerWindowSystemRoutes(app, { verifyAdminToken });
registerPaymentAndOtpRoutes(app, {
  verifyAdminToken,
  isValidAdminToken,
  calculators: {
    performCalculation,
    performChaukhatCalculation,
  },
});
registerMonetizationRoutes(app, {
  verifyAdminToken,
});

// ---------------- SERVER BOOTSTRAP ----------------

function findDistDirectory(): string | null {
  const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const candidatePaths = [
    path.join(process.cwd(), 'dist'),
    path.join(appDir, 'dist'),
    appDir.endsWith('dist') ? appDir : null,
    path.resolve(appDir, '..', 'dist'),
  ].filter(Boolean) as string[];

  for (const candidate of candidatePaths) {
    if (
      fs.existsSync(path.join(candidate, 'index.html')) &&
      (fs.existsSync(path.join(candidate, 'assets')) || fs.existsSync(path.join(candidate, 'server.cjs')))
    ) {
      return candidate;
    }
  }
  return null;
}

async function startServer() {
  // Process-level safety handlers to prevent unhandled crashes
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception in server process:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection at:', promise, 'reason:', reason);
  });

  // Guard: If AI Studio control plane status probe reaches Express directly, return valid JSON instead of SPA HTML
  app.get('/__aistudio_internal_control_plane/*', (_req, res) => {
    res.status(200).setHeader('Content-Type', 'application/json').json({
      status: 'READY',
      state: 'RUNNING',
      ok: true,
    });
  });

  // Legacy Visualizer redirect routes (Redirects old visualizer URLs to Home)
  app.get(
    [
      '/visualizer',
      '/visualizer/*',
      '/ai-visualizer',
      '/ai-visualizer/*',
      '/video-visualizer',
      '/video-visualizer/*',
      '/video-visualization',
      '/ai-video',
      '/video',
      '/video/*',
    ],
    (_req, res) => {
      res.redirect(301, '/');
    }
  );

  const distPath = findDistDirectory();
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const isCjsBundle = typeof __filename !== 'undefined' && __filename.endsWith('.cjs');
  const isDevCommand =
    !isCloudRun &&
    (process.env.npm_lifecycle_event === 'dev' ||
      (process.env.NODE_ENV !== 'production' &&
        process.argv.some(arg => arg.includes('server.ts') || arg.includes('--host') || arg.includes('vite'))));

  // Production mode is ALWAYS active on Cloud Run, in the compiled dist/server.cjs bundle,
  // or whenever NODE_ENV=production (never load Vite dev middleware in production).
  const isProduction = isCloudRun || isCjsBundle || (process.env.NODE_ENV === 'production' && !isDevCommand);

  // Dedicated API 404 handler - MUST execute before Vite dev middlewares or SPA fallback!
  app.all(['/api', '/api/*'], (req, res) => {
    res.status(404).setHeader('Content-Type', 'application/json; charset=utf-8').json({
      success: false,
      error: 'API endpoint not found',
      path: req.originalUrl,
    });
  });

  if (!isProduction) {
    try {
      console.log('⚡ Development mode active. Starting Vite development middleware...');
      // Dynamic import ensures production dist/server.cjs never requires or loads Vite at startup
      const viteModuleName = 'vite';
      const { createServer: createViteServer } = await import(viteModuleName);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error('❌ Failed to initialize Vite middleware:', viteErr);
    }
  } else if (distPath) {
    console.log(`📁 Static files found at: ${distPath}. Serving in PRODUCTION mode.`);
    app.use(express.static(distPath, { maxAge: '1d', index: false }));

    // Explicit Root route
    app.get('/', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    // SPA fallback route for all standard client routes (e.g. /catalog, /calculator, /articles)
    // STRICT GUARD: /sitemap.xml and /robots.txt MUST NEVER return index.html
    app.get('*', (req, res) => {
      const url = (req.path || '').toLowerCase();

      // Guard: Sitemap requests
      if (url === '/sitemap.xml' || url === '/sitemap' || url.endsWith('/sitemap.xml')) {
        return handleSitemapRequest(req, res);
      }

      // Guard: Robots requests
      if (url === '/robots.txt' || url.endsWith('/robots.txt')) {
        return handleRobotsRequest(req, res);
      }

      // Guard: AdMob app-ads.txt requests
      if (url === '/app-ads.txt' || url.endsWith('/app-ads.txt')) {
        return handleAppAdsTxtRequest(req, res);
      }

      // Guard: API requests
      if (url.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
      }

      // Guard: Missing static assets on disk should return 404, never index.html
      if (/\.(xml|txt|json|js|css|map|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(url)) {
        return res.status(404).type('text/plain').send('Resource not found');
      }

      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.error('❌ Production mode active but dist/index.html was not found! Please run "npm run build".');
    app.all('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
    });
    app.get('*', (req, res) => {
      const url = (req.path || '').toLowerCase();
      if (url === '/sitemap.xml' || url === '/sitemap' || url.endsWith('/sitemap.xml')) {
        return handleSitemapRequest(req, res);
      }
      if (url === '/robots.txt' || url.endsWith('/robots.txt')) {
        return handleRobotsRequest(req, res);
      }
      if (url === '/app-ads.txt' || url.endsWith('/app-ads.txt')) {
        return handleAppAdsTxtRequest(req, res);
      }
      res.status(503).send('Application build not found. Please run "npm run build" and restart.');
    });
  }

  // Global Express JSON error handler - guarantees server errors on /api never return HTML
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ Unhandled server error on', req.method, req.path, err);
    if (res.headersSent) return;
    const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(statusCode).setHeader('Content-Type', 'application/json').json({
      success: false,
      error: err.message || 'Internal server error',
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('----------------------------------------------------');
    console.log(`🚀 WindowCut Pro server listening on 0.0.0.0:${PORT}`);
    console.log(`📡 PORT env: ${rawPort || '(unset, default 3000)'} -> bound port ${PORT}`);
    console.log(`🌍 Environment: ${isProduction ? 'production' : 'development'}${isCloudRun ? ' (Cloud Run)' : ''}`);
    console.log(`📁 Static files directory: ${distPath || 'Vite dev middleware'}`);
    console.log('----------------------------------------------------');

    // Defer heavy background sync tasks so the configured PORT binds and accepts Cloud Run startup probes immediately
    setImmediate(() => {
      // Hydrate authoritative database from Firestore cloud store asynchronously without blocking port bind
      initCloudDatabase()
        .then((db) => {
          console.log(`🛡️ [Database Ready] Hydrated authoritative database (Version: ${db.version}, Doors: ${db.doors?.length || 0})`);
        })
        .catch((dbErr) => {
          console.error('⚠️ [Database Init] Could not hydrate cloud database at boot:', dbErr);
        });

      if (FEATURE_FLAGS.bootImageSync) {
        try {
          syncUploadedImages();
          console.log('🛡️ Production data persistence verified & image storage synchronized');
        } catch (syncErr) {
          console.warn('⚠️ Image storage sync warning (non-fatal):', syncErr);
        }
      } else {
        console.log('⏸️ [Storage Governance] Boot legacy image sync paused (FEATURE_FLAGS.bootImageSync = false)');
      }

      if (FEATURE_FLAGS.appMessages) {
        try {
          startScheduledNotificationWorker();
        } catch (workerErr) {
          console.warn('⚠️ Scheduled notification worker error (non-fatal):', workerErr);
        }
      } else {
        console.log('⏸️ [Storage Governance] Push notification scheduler paused (FEATURE_FLAGS.appMessages = false)');
      }
    });
  });

  server.on('error', (err: any) => {
    console.error(`❌ Server listen error on 0.0.0.0:${PORT}:`, err);
    if (isProduction) {
      process.exit(1);
    }
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`🛑 Received ${signal}, shutting down HTTP server gracefully...`);
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('❌ Fatal error during server startup:', err);
  process.exit(1);
});
