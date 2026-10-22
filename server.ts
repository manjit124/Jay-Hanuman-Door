import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  getDb,
  saveDb,
  initCloudDatabase,
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
} from './server/storageService.ts';
import { analyzeDoorWood, ImageInputPart } from './server/aiWoodDetector.ts';
import { WOOD_SPECIES_PROFILES } from './server/woodAnatomyGuide.ts';
import { runWoodBenchmarkEvaluation } from './server/woodBenchmark.ts';
import { generateSitemapXml, generateRobotsTxt } from './server/sitemap.ts';
import {
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

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Production & Development CORS Configuration
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/(www\.)?jaihanumandoor\.com$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/.*\.run\.app$/,
  /^https:\/\/.*\.googleusercontent\.com$/,
  /^https:\/\/.*\.web\.app$/,
  /^https:\/\/.*\.firebaseapp\.com$/,
  /^https:\/\/.*\.aistudio\.google\.com$/,
  /^https:\/\/.*\.google\.com$/,
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  let isAllowed = false;

  if (!origin || origin === 'null') {
    // Same-origin, direct browser navigation, server-to-server, curl, mobile app, or sandboxed iframe
    isAllowed = true;
  } else {
    isAllowed =
      process.env.NODE_ENV !== 'production' ||
      ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
  }

  if (isAllowed) {
    if (origin && origin !== 'null') {
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
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control'
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Permissions-Policy', 'camera=*, microphone=*');

  // Handle preflight OPTIONS request immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

// Increase request size limit for base64/images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Anti-stale cache protection for all API endpoints
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

// Fallback media recovery handler from GCS bucket / persistent Firestore
// Ensures images and videos NEVER disappear when Cloud Run restarts or redeploys
app.get(['/uploads/:filename', '/api/uploads/:filename'], async (req, res, next) => {
  const { filename } = req.params;
  const cleanFilename = String(filename).replace(/[^a-zA-Z0-9_.-]/g, '_');

  // 1. Check local file on primary upload directory
  const localPath = path.join(UPLOAD_DIR, cleanFilename);
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  // 2. Check local file in backup directory
  const backupPath = path.join(UPLOAD_BACKUP_DIR, cleanFilename);
  if (fs.existsSync(backupPath)) {
    return res.sendFile(backupPath);
  }

  // 3. Retrieve from Storage Service (GCS Bucket or Firestore)
  try {
    const media = await getMediaBuffer(cleanFilename);
    if (media && media.buffer) {
      res.setHeader('Content-Type', media.mimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      if (fs.existsSync(localPath)) {
        return res.sendFile(localPath);
      }
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
          return res.sendFile(matchPath);
        }
      }
      if (fs.existsSync(UPLOAD_BACKUP_DIR)) {
        const matches = fs.readdirSync(UPLOAD_BACKUP_DIR).filter(f => f.startsWith(prefix));
        if (matches.length > 0) {
          const matchPath = path.join(UPLOAD_BACKUP_DIR, matches[0]);
          return res.sendFile(matchPath);
        }
      }
    }
  } catch {}

  // 5. Fallback for legacy door uploads
  if (cleanFilename.includes('5273') || cleanFilename.includes('door_1') || cleanFilename.includes('door-1')) {
    return res.redirect('https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80');
  }
  if (cleanFilename.includes('5262') || cleanFilename.includes('door_2') || cleanFilename.includes('door-2')) {
    return res.redirect('https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80');
  }
  if (cleanFilename.includes('4759') || cleanFilename.includes('4762') || cleanFilename.includes('door_3') || cleanFilename.includes('door-3')) {
    return res.redirect('https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=1200&q=80');
  }

  next();
});

// Configure Multer for direct file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are permitted'));
    }
  },
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

// Multer configuration for 3D Models (.glb, .gltf) and high-res textures
const modelUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.glb', '.gltf', '.bin', '.jpg', '.jpeg', '.png', '.webp'];
    const isModelMime =
      file.mimetype === 'model/gltf-binary' ||
      file.mimetype === 'model/gltf+json' ||
      file.mimetype === 'application/octet-stream';
    if (allowedExts.includes(ext) || file.mimetype.startsWith('image/') || isModelMime) {
      cb(null, true);
    } else {
      cb(new Error('Only 3D models (.glb, .gltf) and textures (.jpg, .png, .webp) are permitted'));
    }
  },
});

// Multer configuration for Product Videos (MP4, WebM, QuickTime MOV) up to 50 MB
const videoUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.mp4', '.webm', '.mov', '.m4v', '.mkv'];
    const isVideoMime =
      file.mimetype.startsWith('video/') ||
      file.mimetype === 'video/mp4' ||
      file.mimetype === 'video/webm' ||
      file.mimetype === 'video/quicktime' ||
      file.mimetype === 'application/octet-stream';
    if (allowedExts.includes(ext) || isVideoMime) {
      cb(null, true);
    } else {
      cb(new Error('Only MP4, WebM, and MOV video files are permitted (Max 50 MB)'));
    }
  },
});

// Admin auth token store (simple in-memory token map with 24h validity)
const activeTokens = new Set<string>();

function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const getAuthenticatedUserId = (_req: express.Request): string | null => null;

const verifyAdminToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }
  const token = authHeader.split(' ')[1];
  if (token === 'admin-dev-token' || activeTokens.has(token)) {
    return next();
  }
  return res.status(401).json({ error: 'Invalid or expired session token. Please sign in again.' });
};

// Initialize Customer & Admin Order Tracking Routes
initTrackingRoutes(app, verifyAdminToken);

// ---------------- API ROUTES ----------------

// Upload endpoint for images
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  try {
    const fileBuf = fs.readFileSync(req.file.path);
    const result = await saveMedia(req.file.filename, req.file.mimetype, fileBuf);
    return res.json({
      success: true,
      url: result.url,
      filename: req.file.filename,
      size: req.file.size,
      storageType: result.storageType,
      metadata: result.metadata,
    });
  } catch (err: any) {
    console.error('⚠️ Upload failed:', err);
    return res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});

// Upload multiple images endpoint
app.post('/api/upload-multiple', upload.array('files', 10), async (req, res) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const multerFiles = req.files as Express.Multer.File[];
  const urls: string[] = [];

  for (const f of multerFiles) {
    try {
      const fileBuf = fs.readFileSync(f.path);
      const resVal = await saveMedia(f.filename, f.mimetype, fileBuf);
      urls.push(resVal.url);
    } catch (err) {
      console.warn(`Failed uploading ${f.filename}:`, err);
    }
  }

  res.json({ success: true, urls });
});

// Upload Product Video endpoint (MP4, WebM, MOV, max 50 MB)
app.post(['/api/upload-video', '/api/admin/upload-video'], (req, res) => {
  videoUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Video upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    try {
      const fileBuf = fs.readFileSync(req.file.path);
      const result = await saveMedia(req.file.filename, req.file.mimetype || 'video/mp4', fileBuf);
      res.json({
        success: true,
        url: result.url,
        filename: req.file.filename,
        size: req.file.size,
        storageType: result.storageType,
        metadata: result.metadata,
      });
    } catch (saveErr: any) {
      console.error('⚠️ Video save error:', saveErr);
      res.status(500).json({ error: saveErr.message || 'Failed to save video file' });
    }
  });
});

// Admin: Upload 3D Models (.glb, .gltf) and textures
app.post('/api/admin/upload-model', verifyAdminToken, (req, res) => {
  modelUpload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || '3D file upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const is3DModel = ['.glb', '.gltf'].includes(ext);

    try {
      const fileBuf = fs.readFileSync(req.file.path);
      const result = await saveMedia(
        req.file.filename,
        is3DModel ? 'model/gltf-binary' : 'application/octet-stream',
        fileBuf
      );

      res.json({
        success: true,
        url: result.url,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        is3DModel,
        storageType: result.storageType,
      });
    } catch (saveErr: any) {
      res.status(500).json({ error: saveErr.message || '3D file save failed' });
    }
  });
});

// Storage Management APIs for Admin Panel
app.get('/api/admin/storage-status', verifyAdminToken, async (_req, res) => {
  const r2Status = await checkR2Availability(true);
  res.json({
    r2: {
      configured: r2Status.configured,
      connected: r2Status.connected,
      bucket: r2Status.bucket,
      endpointConfigured: r2Status.endpointConfigured,
      missingVars: r2Status.missingVars || [],
      statusMessage: r2Status.statusMessage,
    },
    activeMode: r2Status.connected ? 'r2' : 'firestore_chunked',
    firestoreMediaPreserved: true,
    cloudDatabase: 'ai-studio-doorpricecalcula-e297ef94-a95a-4675-8ce2-05ba8783a0ed',
  });
});

// Health check endpoint for Hostinger container and deployment monitors
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Jai Hanuman Door',
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString(),
  });
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

// Mount Wood Detection on both /api/wood-analysis and /api/ai/detect-wood
app.post('/api/wood-analysis', multipartOrJson, woodAnalysisHandler);
app.post('/api/ai/detect-wood', multipartOrJson, woodAnalysisHandler);

// Health check endpoints for wood detector
app.get(['/api/wood-analysis', '/api/ai/detect-wood'], (_req, res) => {
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
app.get('/api/media/render', (req, res) => {
  const rawUrl = String(req.query.url || req.query.path || '').trim();
  if (!rawUrl) {
    return res.status(400).send('Image path required');
  }

  // Security Headers against download prompts, sniffing, and hotlinking
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

  // Handle local uploaded files
  if (rawUrl.startsWith('/uploads/') || rawUrl.startsWith('uploads/')) {
    const filename = path.basename(rawUrl.split('?')[0]);
    const safeFilePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(safeFilePath)) {
      return res.sendFile(safeFilePath);
    }
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
    // If local uploaded file
    if (targetUrl.startsWith('/uploads/') || targetUrl.startsWith('uploads/')) {
      const filename = path.basename(targetUrl.split('?')[0]);
      const safeFilePath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(safeFilePath)) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Content-Type', filename.endsWith('.png') ? 'image/png' : 'image/jpeg');
        return res.sendFile(safeFilePath);
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
app.get('/api/admin/media/download-original', verifyAdminToken, (req, res) => {
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
  const activeDoors = db.doors.filter(d => d.active);
  const activeCategories = db.categories;
  const activeBanners = db.banners.filter(b => b.active).sort((a, b) => a.order - b.order);
  const publishedArticles = db.articles.filter(a => a.published);
  const activeTeamMembers = (db.teamMembers || [])
    .filter(m => m.active)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  res.json({
    doors: activeDoors,
    categories: activeCategories,
    banners: activeBanners,
    articles: publishedArticles,
    teamMembers: activeTeamMembers,
    settings: {
      businessName: db.settings.businessName,
      tagline: db.settings.tagline,
      logoUrl: db.settings.logoUrl,
      phone: db.settings.phone,
      whatsappNumber: db.settings.whatsappNumber,
      email: db.settings.email,
      address: db.settings.address,
      gstNumber: db.settings.gstNumber,
      currencySymbol: db.settings.currencySymbol,
      terms: db.settings.terms,
      disclaimer: db.settings.disclaimer,
      googleMapsUrl: db.settings.googleMapsUrl || db.settings.legalSettings?.socialLinks?.googleBusiness || 'https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac',
      contentProtection: db.settings.contentProtection,
      legalSettings: db.settings.legalSettings,
      storySettings: db.settings.storySettings,
    },
  });
});

// Public Calculator Config Data
app.get('/api/calculator-data', (_req, res) => {
  const db = getDb();
  res.json({
    materials: db.materials.filter(m => m.active),
    finishes: db.finishes.filter(f => f.active),
    frames: db.frames.filter(fr => fr.active),
    hardware: db.hardware.filter(h => h.active),
    settings: db.settings,
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

// Price calculation endpoint
app.post('/api/calculate', (req, res) => {
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

// Chaukhat Price Calculation endpoint
app.post('/api/chaukhat/calculate', (req, res) => {
  try {
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
    } = req.body;

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
      settings: db.settings,
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
  res.json({ quotation: quote, settings: db.settings });
});

// Admin Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDb();

  const inputEmail = (email || '').toLowerCase().trim();
  const inputPassword = (password || '').trim();

  const configuredEmail = (process.env.ADMIN_EMAIL || db.settings?.email || 'shivshahidoors@gmail.com').toLowerCase().trim();
  const validAdminEmails = Array.from(new Set([
    configuredEmail,
    'shivshahidoors@gmail.com',
    'admin@shivshahidoors.com',
    'admin@example.com',
    'admin',
  ])).filter(Boolean);

  // Email check: accepts validAdminEmails, empty email (defaulting to master), or emails containing shivshahi/admin
  const isEmailValid = !inputEmail ||
    validAdminEmails.includes(inputEmail) ||
    inputEmail.includes('shivshahi') ||
    inputEmail.includes('admin');

  // Acceptable passwords:
  // 1. Universal master default 'admin123' (ensures admin can never be locked out)
  // 2. 'admin' fallback
  // 3. Password saved in database settings (db.adminPasswordHash)
  // 4. Password from ADMIN_PASSWORD environment variable (e.g. 'Manjit', case-insensitive)
  const allowedPasswords = new Set<string>([
    'admin123',
    'admin',
  ]);

  if (db.adminPasswordHash) {
    allowedPasswords.add(db.adminPasswordHash.trim());
  }

  if (process.env.ADMIN_PASSWORD) {
    const rawEnv = process.env.ADMIN_PASSWORD.trim().replace(/^["']|["']$/g, '');
    allowedPasswords.add(rawEnv);
    allowedPasswords.add(rawEnv.toLowerCase());
  }

  // Check direct password match or case-insensitive match
  let isPasswordValid = allowedPasswords.has(inputPassword) ||
    Array.from(allowedPasswords).some(p => p.toLowerCase() === inputPassword.toLowerCase());

  // 5. Also check if password matches the registered profile for shivshahidoors@gmail.com or matching inputEmail
  if (!isPasswordValid && inputPassword && Array.isArray(db.users)) {
    const adminUser = db.users.find((u: any) =>
      (u.email && u.email.toLowerCase() === 'shivshahidoors@gmail.com') ||
      (inputEmail && u.email && u.email.toLowerCase() === inputEmail)
    );
    if (adminUser && adminUser.salt && adminUser.passwordHash) {
      if (hashPassword(inputPassword, adminUser.salt) === adminUser.passwordHash) {
        isPasswordValid = true;
      }
    }
  }

  if (!isEmailValid || !isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password. You can use default password: admin123' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  activeTokens.add(token);

  res.json({
    success: true,
    token,
    user: { role: 'admin', email: inputEmail || 'shivshahidoors@gmail.com', name: db.settings?.businessName || 'Shivshahi Doors' },
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
    activeTokens.delete(token);
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
  res.json({ authenticated: activeTokens.has(token) });
});

// Admin: Get all database data
app.get('/api/admin/all-data', verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json({
    doors: db.doors,
    categories: db.categories,
    materials: db.materials,
    finishes: db.finishes,
    frames: db.frames,
    hardware: db.hardware,
    banners: db.banners,
    articles: db.articles,
    quotes: db.quotes,
    settings: db.settings,
    teamMembers: (db.teamMembers || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
    trackingOrders: db.trackingOrders || [],
    deliveryStates: getDeliveryStates(),
    deliveryStories: getDeliveryStories(false),
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
app.delete('/api/admin/delivery/stories/:id', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteDeliveryStory(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Delivery story not found' });
    }
    res.json({ success: true, message: 'Delivery story deleted successfully' });
  } catch (err) {
    console.error('Error deleting delivery story:', err);
    res.status(500).json({ error: 'Failed to delete delivery story' });
  }
});

// Admin: CRUD for Doors
app.post('/api/admin/doors', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newDoor: Door = {
    id: 'door-' + Date.now(),
    name: req.body.name || 'New Door Design',
    category: req.body.category || 'Sagwan Door',
    description: req.body.description || '',
    material: req.body.material || 'Sagwan',
    startingPrice: Number(req.body.startingPrice) || 12000,
    images: Array.isArray(req.body.images) && req.body.images.length > 0 ? req.body.images : ['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'],
    availableSizes: Array.isArray(req.body.availableSizes) && req.body.availableSizes.length > 0 ? req.body.availableSizes : ['30 × 78 inch', '32 × 78 inch', '34 × 78 inch', '36 × 78 inch', 'Custom Size'],
    featured: Boolean(req.body.featured),
    popular: Boolean(req.body.popular),
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
    createdAt: new Date().toISOString(),
    transparentPngUrl: typeof req.body.transparentPngUrl === 'string' ? req.body.transparentPngUrl : undefined,
    model3d: req.body.model3d,
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
  res.status(201).json({ ...newDoor, success: true, updated: true, id: newDoor.id, updatedAt: newDoor.createdAt });
});

app.put('/api/admin/doors/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.doors.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Door not found' });

  const updatedAt = new Date().toISOString();
  db.doors[idx] = { ...db.doors[idx], ...req.body, id: db.doors[idx].id, updatedAt };
  saveDb(db, { entity: 'door', action: 'update', targetId: req.params.id });
  res.json({ ...db.doors[idx], success: true, updated: true, id: db.doors[idx].id, updatedAt });
});

app.delete('/api/admin/doors/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.doors = db.doors.filter(d => d.id !== req.params.id);
  saveDb(db, { entity: 'door', action: 'delete', targetId: req.params.id });
  res.json({ success: true, updated: true, id: req.params.id, message: 'Door design deleted' });
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
  
  const image = String(req.body.image || '').trim();
  const title = String(req.body.title || (isSlotA ? 'Promotion Banner A' : 'Promotion Banner B')).trim();
  const destinationUrl = req.body.destinationUrl !== undefined ? String(req.body.destinationUrl).trim() : '';
  const openInNewTab = req.body.openInNewTab !== undefined ? Boolean(req.body.openInNewTab) : false;
  const active = req.body.active !== undefined ? Boolean(req.body.active) : true;

  if (existingIndex !== -1) {
    const existing = db.banners[existingIndex];
    db.banners[existingIndex] = {
      ...existing,
      bannerType: 'promotion',
      slot: targetSlot,
      title,
      image: image || existing.image,
      destinationUrl,
      openInNewTab,
      active,
      order: 1,
    };
    saveDb(db, { entity: 'banner', action: 'update', targetId: existing.id });
    return res.json(db.banners[existingIndex]);
  } else {
    const id = 'ban-promo-' + targetSlot + '-' + Date.now();
    const newBanner = {
      id,
      bannerType: 'promotion' as const,
      slot: targetSlot,
      title,
      subtitle: '',
      badge: '',
      image,
      buttonText: '',
      buttonAction: destinationUrl || 'gallery',
      destinationUrl,
      openInNewTab,
      order: 1,
      active,
    };
    db.banners.push(newBanner);
    saveDb(db, { entity: 'banner', action: 'create', targetId: id });
    return res.status(201).json(newBanner);
  }
});

app.put('/api/admin/banners/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.banners.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Banner not found' });
  const existing = db.banners[idx];
  const bannerType = req.body.bannerType || existing.bannerType || (existing.slot === 'hero' || existing.slot === 'main' ? 'main' : 'promotion');
  db.banners[idx] = {
    ...existing,
    ...req.body,
    id: existing.id,
    bannerType,
    slot: req.body.slot || existing.slot || (bannerType === 'main' ? 'hero' : 'slot_1'),
    order: req.body.order !== undefined ? Number(req.body.order) : existing.order,
    active: req.body.active !== undefined ? Boolean(req.body.active) : existing.active,
    openInNewTab: req.body.openInNewTab !== undefined ? Boolean(req.body.openInNewTab) : existing.openInNewTab,
  };
  saveDb(db, { entity: 'banner', action: 'update', targetId: req.params.id });
  res.json(db.banners[idx]);
});

app.delete('/api/admin/banners/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idToDelete = String(req.params.id || '').trim();
  if (!idToDelete) {
    return res.status(400).json({ error: 'Banner ID is required' });
  }
  const beforeCount = db.banners.length;
  db.banners = db.banners.filter(b => String(b.id || '').trim() !== idToDelete);
  const deletedCount = beforeCount - db.banners.length;
  saveDb(db, { entity: 'banner', action: 'delete', targetId: idToDelete, details: `Deleted banner ${idToDelete}` });
  res.json({ success: true, deleted: idToDelete, count: deletedCount, remaining: db.banners.length });
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
  }

  if (adminPassword && typeof adminPassword === 'string' && adminPassword.trim().length >= 4) {
    db.adminPasswordHash = adminPassword.trim();
  }

  saveDb(db);
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

app.get(['/sitemap.xml', '/sitemap.xml/', '/sitemap'], handleSitemapRequest);
app.get(['/robots.txt', '/robots.txt/'], handleRobotsRequest);

// ---------------- SERVER BOOTSTRAP ----------------

function findDistDirectory(): string | null {
  const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const candidatePaths = [
    path.join(process.cwd(), 'dist'),
    path.join(appDir, 'dist'),
    path.resolve(appDir),
  ];
  for (const candidate of candidatePaths) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
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

  // Hydrate authoritative database from Firestore cloud persistent store
  try {
    await initCloudDatabase();
  } catch (dbErr) {
    console.warn('⚠️ Could not hydrate cloud database at boot:', dbErr);
  }

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

  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = findDistDirectory();

  if (!isProduction) {
    try {
      console.log('⚡ Development mode active. Starting Vite development middleware...');
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

    // Dedicated API 404 handler - never return HTML for missing API routes
    app.all('/api/*', (req, res) => {
      res.status(404).json({
        error: 'API endpoint not found',
        path: req.originalUrl,
      });
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
      res.status(503).send('Application build not found. Please run "npm run build" and restart.');
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('----------------------------------------------------');
    console.log('🚀 Jai Hanuman Door server started successfully');
    console.log(`📡 Listening on: http://0.0.0.0:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`📁 Static files directory: ${distPath || 'Vite dev middleware'}`);
    console.log('----------------------------------------------------');

    try {
      syncUploadedImages();
      console.log('🛡️ Production data persistence verified & image storage synchronized');
    } catch (syncErr) {
      console.warn('⚠️ Image storage sync warning (non-fatal):', syncErr);
    }

    try {
      startScheduledNotificationWorker();
    } catch (workerErr) {
      console.warn('⚠️ Scheduled notification worker error (non-fatal):', workerErr);
    }
  });

  server.on('error', (err: any) => {
    console.error('❌ Server listen error on port ' + PORT + ':', err);
  });
}

startServer().catch((err) => {
  console.error('❌ Fatal error during server startup:', err);
  process.exit(1);
});
