import crypto from 'crypto';
import type express from 'express';
import multer from 'multer';
import { getDb, saveDb } from './db.ts';
import { requireCustomerAuth } from './paymentAuthRoutes.ts';
import type {
  FabricationProfile,
  FabricationRuleKey,
  FabricationRuleSetting,
  NotebookExtractedRow,
  NotebookPhotoPageRecord,
  NotebookScanConfidence,
  NotebookScanProjectRecord,
  PanelArrangementRule,
  SlidingTrackType,
  SlidingWindowCalculationResult,
  SlidingWindowInput,
  SlidingWindowProject,
  SlidingWindowUserSettings,
  WindowMeasurementUnit,
} from '../src/types.ts';
import {
  createDefaultFabricationProfiles,
  createDefaultPanelArrangements,
  getDefaultRuleResetValues,
} from '../src/data/slidingWindowDefaults.ts';
import { calculateSlidingWindowFabrication } from '../src/lib/slidingWindowEngine.ts';
import { analyzeNotebookPhoto, NotebookScannerError } from './aiNotebookScanner.ts';
import { isBunnyStorageConfigured, uploadToBunnyStorage } from './bunnyStorage.ts';

const ALLOWED_NOTEBOOK_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function detectImageMimeFromBuffer(buf: Buffer): string | null {
  if (!buf || buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  // HEIC / HEIF: ISO BMFF ftyp box
  if (buf.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.slice(8, 12).toString('ascii').toLowerCase();
    if (brand.startsWith('hei') || brand.startsWith('mif') || brand.startsWith('hevx')) {
      return 'image/heic';
    }
  }
  return null;
}

function isSupportedNotebookImage(mimeType: string, fileName?: string, buf?: Buffer): boolean {
  const m = (mimeType || '').toLowerCase().trim();
  if (ALLOWED_NOTEBOOK_MIMES.has(m)) return true;
  if (buf && detectImageMimeFromBuffer(buf)) return true;
  // Mobile Safari / iOS sometimes sends application/octet-stream or empty mime for HEIC/camera photos
  const lowerName = (fileName || '').toLowerCase();
  return (
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif')
  );
}

const notebookPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB max per notebook photo
  },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase().trim();
    // Allow generic octet-stream through to magic-byte inspection in handleScan (some mobile camera webviews send empty/octet-stream)
    if (
      isSupportedNotebookImage(mime, file.originalname) ||
      !mime ||
      mime === 'application/octet-stream'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported photo format. Please upload JPG, JPEG, PNG, WebP, or HEIC.'));
    }
  },
});

function sanitizeConfidence(val: unknown): NotebookScanConfidence {
  if (val === 'High' || val === 'Review' || val === 'Unclear') return val;
  return 'Review';
}

function sanitizePhotoUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/api/media/') ||
    trimmed.startsWith('/api/bunny/media/')
  ) {
    return trimmed.slice(0, 1200);
  }
  if (trimmed.startsWith('data:image/') && trimmed.length <= 2_800_000) {
    return trimmed;
  }
  return '';
}

function sanitizeNotebookScanPayload(raw: any): NotebookScanProjectRecord | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const rawPages = Array.isArray(raw.pages) ? raw.pages.slice(0, 20) : [];
  const rawRows = Array.isArray(raw.extractedRows) ? raw.extractedRows.slice(0, 250) : [];
  if (rawPages.length === 0 && rawRows.length === 0) return undefined;

  const pages: NotebookPhotoPageRecord[] = rawPages
    .filter((p: any) => p && typeof p === 'object')
    .map((p: any, idx: number) => ({
      id: typeof p.id === 'string' && p.id.trim() ? p.id.trim().slice(0, 80) : `page-${idx + 1}`,
      pageNumber: Number.isFinite(Number(p.pageNumber)) && Number(p.pageNumber) > 0 ? Number(p.pageNumber) : idx + 1,
      fileName: typeof p.fileName === 'string' && p.fileName.trim() ? p.fileName.trim().slice(0, 140) : `notebook-page-${idx + 1}.jpg`,
      mimeType: typeof p.mimeType === 'string' && p.mimeType.trim() ? p.mimeType.trim().slice(0, 60) : 'image/jpeg',
      photoUrl: sanitizePhotoUrl(p.photoUrl),
      storageType: p.storageType === 'bunny_storage' ? 'bunny_storage' : 'inline_preview',
      uploadedAt: typeof p.uploadedAt === 'string' && p.uploadedAt ? p.uploadedAt : new Date().toISOString(),
      detectedProjectName:
        typeof p.detectedProjectName === 'string' && p.detectedProjectName.trim()
          ? p.detectedProjectName.trim().slice(0, 120)
          : undefined,
      detectedCustomerName:
        typeof p.detectedCustomerName === 'string' && p.detectedCustomerName.trim()
          ? p.detectedCustomerName.trim().slice(0, 120)
          : undefined,
      rawAiSummary:
        typeof p.rawAiSummary === 'string' && p.rawAiSummary.trim()
          ? p.rawAiSummary.trim().slice(0, 280)
          : undefined,
      warnings: Array.isArray(p.warnings)
        ? p.warnings.filter((w: unknown): w is string => typeof w === 'string' && w.trim().length > 0).slice(0, 12)
        : [],
    }));

  const extractedRows: NotebookExtractedRow[] = rawRows
    .filter((r: any) => r && typeof r === 'object')
    .map((r: any, idx: number) => {
      const snap = r.originalAiSnapshot && typeof r.originalAiSnapshot === 'object' ? r.originalAiSnapshot : r;
      const numOrNull = (v: unknown): number | null => {
        if (v === null || v === undefined || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? Math.round(n * 10000) / 10000 : null;
      };
      return {
        id: typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 80) : `nb-row-${idx + 1}`,
        pageId: typeof r.pageId === 'string' && r.pageId.trim() ? r.pageId.trim().slice(0, 80) : pages[0]?.id || 'page-1',
        pageLabel: typeof r.pageLabel === 'string' && r.pageLabel.trim() ? r.pageLabel.trim().slice(0, 40) : 'Page 1',
        windowNumber:
          typeof r.windowNumber === 'string' && r.windowNumber.trim() ? r.windowNumber.trim().slice(0, 40) : `W${idx + 1}`,
        rawText: typeof r.rawText === 'string' ? r.rawText.trim().slice(0, 180) : '',
        width: numOrNull(r.width),
        height: numOrNull(r.height),
        unit: isValidUnit(r.unit) ? r.unit : 'inch',
        unitAmbiguous: Boolean(r.unitAmbiguous),
        confidence: sanitizeConfidence(r.confidence),
        flags: Array.isArray(r.flags)
          ? r.flags.filter((f: unknown): f is string => typeof f === 'string' && f.trim().length > 0).slice(0, 8)
          : [],
        notes: typeof r.notes === 'string' && r.notes.trim() ? r.notes.trim().slice(0, 160) : undefined,
        confirmed: Boolean(r.confirmed),
        originalAiSnapshot: {
          windowNumber:
            typeof snap.windowNumber === 'string' && snap.windowNumber.trim()
              ? snap.windowNumber.trim().slice(0, 40)
              : `W${idx + 1}`,
          rawText: typeof snap.rawText === 'string' ? snap.rawText.trim().slice(0, 180) : '',
          width: numOrNull(snap.width),
          height: numOrNull(snap.height),
          unit: isValidUnit(snap.unit) ? snap.unit : 'inch',
          confidence: sanitizeConfidence(snap.confidence),
        },
      };
    });

  return {
    pages,
    extractedRows,
    verifiedByUser: Boolean(raw.verifiedByUser),
    verifiedAt: typeof raw.verifiedAt === 'string' && raw.verifiedAt ? raw.verifiedAt : new Date().toISOString(),
    modelUsed: typeof raw.modelUsed === 'string' && raw.modelUsed.trim() ? raw.modelUsed.trim().slice(0, 80) : 'gemini-4-hydrogen',
  };
}

// Server-side HMAC signing secret (process.env.SESSION_SECRET with cryptographic runtime fallback)
const SIGNING_SECRET =
  (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex'));

export interface SlidingWindowIdentity {
  ownerId: string;
  role: 'admin' | 'user' | 'guest';
  email?: string;
  name: string;
}

function signTokenPayload(payload: { ownerId: string; role: 'user' | 'guest'; email?: string; name: string; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SIGNING_SECRET).update(encoded).digest('base64url');
  return `jhd_fab_${encoded}.${sig}`;
}

function verifySignedFabricatorToken(token: string): SlidingWindowIdentity | null {
  if (!token || !token.startsWith('jhd_fab_')) return null;
  const raw = token.slice('jhd_fab_'.length);
  const dotIdx = raw.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const encoded = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', SIGNING_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.ownerId !== 'string' || !parsed.ownerId) return null;
    if (typeof parsed.exp === 'number' && Date.now() > parsed.exp) return null;
    return {
      ownerId: parsed.ownerId,
      role: parsed.role === 'user' ? 'user' : 'guest',
      email: typeof parsed.email === 'string' ? parsed.email : undefined,
      name: typeof parsed.name === 'string' && parsed.name ? parsed.name : 'Fabricator Workspace',
    };
  } catch {
    return null;
  }
}

function hashUserPasswordScrypt(password: string, salt: string): string {
  return 'scrypt$' + crypto.scryptSync(password, salt, 32).toString('hex');
}

function verifyUserPassword(password: string, salt: string, storedHash: string): boolean {
  if (!password || !salt || !storedHash) return false;
  if (storedHash.startsWith('scrypt$')) {
    const derived = hashUserPasswordScrypt(password, salt);
    const a = Buffer.from(derived);
    const b = Buffer.from(storedHash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  // Legacy SHA-256 compatibility for pre-existing users in db.users
  const sha = crypto.createHash('sha256').update(password + salt).digest('hex');
  const a = Buffer.from(sha);
  const b = Buffer.from(storedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isValidUnit(unit: any): unit is WindowMeasurementUnit {
  return unit === 'inch' || unit === 'feet' || unit === 'mm';
}

function isValidTrackType(track: any): track is SlidingTrackType {
  return track === '2-track' || track === '3-track';
}

function sanitizeRulesInput(
  rawRules: any,
  trackType: SlidingTrackType
): Record<FabricationRuleKey, FabricationRuleSetting> {
  const defaults = getDefaultRuleResetValues(trackType);
  const result = { ...defaults };

  if (rawRules && typeof rawRules === 'object') {
    for (const key of Object.keys(defaults) as FabricationRuleKey[]) {
      const incoming = rawRules[key];
      if (!incoming || typeof incoming !== 'object') continue;
      const numericVal = Number(incoming.value);
      result[key] = {
        ...defaults[key],
        name: typeof incoming.name === 'string' && incoming.name.trim() ? incoming.name.trim().slice(0, 120) : defaults[key].name,
        description:
          typeof incoming.description === 'string' && incoming.description.trim()
            ? incoming.description.trim().slice(0, 260)
            : defaults[key].description,
        value: Number.isFinite(numericVal) && numericVal >= 0 ? numericVal : defaults[key].value,
        unit: isValidUnit(incoming.unit) ? incoming.unit : defaults[key].unit,
        operator: incoming.operator === '+' || incoming.operator === '-' ? incoming.operator : defaults[key].operator,
      };
    }
  }
  return result;
}

function sanitizePanelArrangements(rawPanels: any, trackType: SlidingTrackType): PanelArrangementRule[] {
  if (!Array.isArray(rawPanels) || rawPanels.length === 0) {
    return createDefaultPanelArrangements(trackType);
  }
  const cleaned: PanelArrangementRule[] = [];
  for (let i = 0; i < Math.min(rawPanels.length, 12); i++) {
    const p = rawPanels[i];
    if (!p || typeof p !== 'object') continue;
    const panelType = p.panelType === 'mosquito_net' ? 'mosquito_net' : 'glass';
    const divisor = Number(p.widthDivisor);
    const extraW = Number(p.extraWidthAdjustment);
    const extraH = Number(p.extraHeightAdjustment);
    cleaned.push({
      id: typeof p.id === 'string' && p.id.trim() ? p.id.trim().slice(0, 64) : `panel-${i + 1}`,
      label: typeof p.label === 'string' && p.label.trim() ? p.label.trim().slice(0, 80) : `Panel ${i + 1}`,
      panelType,
      widthDivisor: Number.isFinite(divisor) && divisor > 0 ? divisor : 2,
      extraWidthAdjustment: Number.isFinite(extraW) && extraW >= 0 ? extraW : 0,
      extraWidthOperator: p.extraWidthOperator === '-' ? '-' : '+',
      extraHeightAdjustment: Number.isFinite(extraH) && extraH >= 0 ? extraH : 0,
      extraHeightOperator: p.extraHeightOperator === '+' ? '+' : '-',
      adjustmentUnit: isValidUnit(p.adjustmentUnit) ? p.adjustmentUnit : 'inch',
    });
  }
  return cleaned.length > 0 ? cleaned : createDefaultPanelArrangements(trackType);
}

function ensureOwnerProfilesAndSettings(ownerId: string): {
  profiles: FabricationProfile[];
  settings: SlidingWindowUserSettings;
} {
  const db = getDb();
  if (!Array.isArray(db.slidingWindowProfiles)) db.slidingWindowProfiles = [];
  if (!Array.isArray(db.slidingWindowProjects)) db.slidingWindowProjects = [];
  if (!Array.isArray(db.slidingWindowUserSettings)) db.slidingWindowUserSettings = [];

  let changed = false;
  let ownerProfiles = db.slidingWindowProfiles.filter(p => p.ownerId === ownerId);

  if (ownerProfiles.length === 0) {
    const seeded = createDefaultFabricationProfiles(ownerId);
    db.slidingWindowProfiles.push(...seeded);
    ownerProfiles = seeded;
    changed = true;
  } else {
    // Backfill newly introduced bearing rules onto pre-existing profiles without overwriting custom rules
    ownerProfiles.forEach(prof => {
      const defaults = getDefaultRuleResetValues(prof.trackType);
      (['bearingWidthDeduction', 'topBearingAdjustment', 'bottomBearingAdjustment'] as FabricationRuleKey[]).forEach(
        bKey => {
          if (!prof.rules[bKey]) {
            prof.rules[bKey] = { ...defaults[bKey] };
            changed = true;
          }
        }
      );
      if (!Number.isFinite(prof.bearingDivisor) || (prof.bearingDivisor ?? 0) <= 0) {
        prof.bearingDivisor = 2;
        changed = true;
      }
    });
  }

  let ownerSettings = db.slidingWindowUserSettings.find(s => s.ownerId === ownerId);
  if (!ownerSettings) {
    const def2 = ownerProfiles.find(p => p.trackType === '2-track' && p.isDefault) || ownerProfiles.find(p => p.trackType === '2-track');
    const def3 = ownerProfiles.find(p => p.trackType === '3-track' && p.isDefault) || ownerProfiles.find(p => p.trackType === '3-track');
    ownerSettings = {
      ownerId,
      defaultUnit: 'inch',
      default2TrackProfileId: def2?.id,
      default3TrackProfileId: def3?.id,
      defaultGlassThickness: '5mm Clear / Toughened',
      showMmReference: true,
      updatedAt: new Date().toISOString(),
    };
    db.slidingWindowUserSettings.push(ownerSettings);
    changed = true;
  }

  if (changed) {
    saveDb(db, {
      entity: 'sliding_window_workspace',
      action: 'create',
      targetId: ownerId,
      details: `Initialized default sliding window fabrication profiles for ${ownerId}`,
    });
  }

  return { profiles: ownerProfiles, settings: ownerSettings };
}

export function registerSlidingWindowRoutes(
  app: express.Application,
  isValidAdminToken: (token?: string | null) => boolean
): void {
  // Enforce JSON Content-Type and anti-cache headers for every Sliding Window API response
  app.use('/api/sliding-window', (_req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
  });

  const resolveIdentity = (req: express.Request): SlidingWindowIdentity | null => {
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const fabHeader = typeof req.headers['x-fabricator-token'] === 'string' ? req.headers['x-fabricator-token'].trim() : '';
    const adminHeader = typeof req.headers['x-admin-token'] === 'string' ? req.headers['x-admin-token'].trim() : '';

    // 1. Check signed Fabricator Workspace token first (supports distinct fabricator users even if admin token exists)
    const fabCandidate = fabHeader || (bearer.startsWith('jhd_fab_') ? bearer : '');
    if (fabCandidate) {
      const verified = verifySignedFabricatorToken(fabCandidate);
      if (verified) return verified;
    }

    // 2. Check Admin Bearer token
    const adminCandidate = adminHeader || bearer;
    if (adminCandidate && isValidAdminToken(adminCandidate)) {
      return {
        ownerId: 'admin:master',
        role: 'admin',
        email: 'shivshahidoors@gmail.com',
        name: 'WindowCut Pro Admin',
      };
    }

    return null;
  };

  const requireIdentity = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const identity = resolveIdentity(req);
    if (!identity) {
      return res.status(401).json({
        success: false,
        errorCode: 'FABRICATOR_AUTH_REQUIRED',
        error: 'Authentication required for Sliding Window Fabrication workspace.',
      });
    }
    (req as any).slidingIdentity = identity;
    return next();
  };

  // --------------------------------------------------------------------------
  // AUTH: Guest Workspace Session, Fabricator Register, and Fabricator Login
  // --------------------------------------------------------------------------

  app.post('/api/sliding-window/auth/guest', (_req, res) => {
    const ownerId = `guest:${crypto.randomUUID()}`;
    const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    const token = signTokenPayload({ ownerId, role: 'guest', name: 'Workshop Session', exp });
    const { profiles, settings } = ensureOwnerProfilesAndSettings(ownerId);
    res.json({
      success: true,
      token,
      identity: { ownerId, role: 'guest', name: 'Workshop Session' },
      profiles,
      settings,
    });
  });

  app.post('/api/sliding-window/auth/register', (req, res) => {
    try {
      const { name, email, password, phone } = req.body || {};
      const cleanName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase().slice(0, 120) : '';
      const cleanPass = typeof password === 'string' ? password : '';

      if (!cleanName || cleanName.length < 2) {
        return res.status(400).json({ success: false, error: 'Please enter your name (at least 2 characters).' });
      }
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      }
      if (cleanPass.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }

      const db = getDb();
      if (!Array.isArray(db.users)) db.users = [];
      const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists. Please sign in instead.',
        });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashUserPasswordScrypt(cleanPass, salt);
      const userId = `fab-user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const now = new Date().toISOString();

      db.users.push({
        id: userId,
        name: cleanName,
        email: cleanEmail,
        phone: typeof phone === 'string' ? phone.trim().slice(0, 24) : '',
        passwordHash,
        salt,
        favoriteDoorIds: [],
        calculationHistory: [],
        createdAt: now,
        updatedAt: now,
      });

      const ownerId = `user:${userId}`;
      saveDb(db, {
        entity: 'fabricator_user',
        action: 'create',
        targetId: userId,
        targetName: cleanEmail,
        details: 'Registered fabricator workspace account',
      });

      const { profiles, settings } = ensureOwnerProfilesAndSettings(ownerId);
      const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const token = signTokenPayload({ ownerId, role: 'user', email: cleanEmail, name: cleanName, exp });

      return res.status(201).json({
        success: true,
        token,
        identity: { ownerId, role: 'user', email: cleanEmail, name: cleanName },
        profiles,
        settings,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Registration failed.' });
    }
  });

  app.post('/api/sliding-window/auth/login', (req, res) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const cleanPass = typeof password === 'string' ? password : '';

      if (!cleanEmail || !cleanPass) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      const db = getDb();
      const user = (db.users || []).find(u => u.email.toLowerCase() === cleanEmail);
      if (!user || !verifyUserPassword(cleanPass, user.salt, user.passwordHash)) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      const ownerId = `user:${user.id}`;
      const { profiles, settings } = ensureOwnerProfilesAndSettings(ownerId);
      const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
      const token = signTokenPayload({
        ownerId,
        role: 'user',
        email: user.email,
        name: user.name,
        exp,
      });

      return res.json({
        success: true,
        token,
        identity: { ownerId, role: 'user', email: user.email, name: user.name },
        profiles,
        settings,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Sign in failed.' });
    }
  });

  // --------------------------------------------------------------------------
  // WORKSPACE HYDRATION (Strictly isolated by identity.ownerId)
  // --------------------------------------------------------------------------

  app.get('/api/sliding-window/workspace', requireIdentity, (req, res) => {
    const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
    const { profiles, settings } = ensureOwnerProfilesAndSettings(identity.ownerId);
    const db = getDb();
    const projects = (db.slidingWindowProjects || [])
      .filter(p => p.ownerId === identity.ownerId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({
      success: true,
      identity,
      profiles,
      settings,
      projects,
    });
  });

  // --------------------------------------------------------------------------
  // PROFILE CRUD (Save New, Edit, Rename, Duplicate, Delete, Set Default, Reset)
  // --------------------------------------------------------------------------

  app.post('/api/sliding-window/profiles', requireIdentity, (req, res) => {
    try {
      const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
      const body = req.body || {};
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 90) : '';
      if (!name) {
        return res.status(400).json({ success: false, error: 'Profile name is required.' });
      }
      const trackType: SlidingTrackType = isValidTrackType(body.trackType) ? body.trackType : '2-track';
      const db = getDb();
      if (!Array.isArray(db.slidingWindowProfiles)) db.slidingWindowProfiles = [];

      const now = new Date().toISOString();
      const makeDefault = Boolean(body.isDefault);
      if (makeDefault) {
        db.slidingWindowProfiles.forEach(p => {
          if (p.ownerId === identity.ownerId && p.trackType === trackType) {
            p.isDefault = false;
          }
        });
      }

      const glassDiv = Number(body.glassWidthDivisor);
      const netDiv = Number(body.mosquitoNetWidthDivisor);
      const bearingDiv = Number(body.bearingDivisor);
      const panelArrangements = sanitizePanelArrangements(body.panelArrangements, trackType);
      const glassPanelCount = Math.max(
        1,
        Number(body.glassPanelCount) || panelArrangements.filter(p => p.panelType === 'glass').length || 2
      );
      const mosquitoNetPanelCount =
        trackType === '3-track'
          ? Math.max(
              0,
              Number(body.mosquitoNetPanelCount ?? panelArrangements.filter(p => p.panelType === 'mosquito_net').length)
            )
          : 0;

      const profile: FabricationProfile = {
        id: `prof-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        ownerId: identity.ownerId,
        name,
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 300) : '',
        trackType,
        isDefault: makeDefault,
        glassPanelCount,
        mosquitoNetPanelCount,
        glassWidthDivisor: Number.isFinite(glassDiv) && glassDiv > 0 ? glassDiv : 2,
        mosquitoNetWidthDivisor: Number.isFinite(netDiv) && netDiv > 0 ? netDiv : 2,
        bearingDivisor: Number.isFinite(bearingDiv) && bearingDiv > 0 ? bearingDiv : 2,
        rules: sanitizeRulesInput(body.rules, trackType),
        panelArrangements,
        createdAt: now,
        updatedAt: now,
      };

      db.slidingWindowProfiles.push(profile);

      if (makeDefault && Array.isArray(db.slidingWindowUserSettings)) {
        const userSettings = db.slidingWindowUserSettings.find(s => s.ownerId === identity.ownerId);
        if (userSettings) {
          if (trackType === '2-track') userSettings.default2TrackProfileId = profile.id;
          else userSettings.default3TrackProfileId = profile.id;
          userSettings.updatedAt = now;
        }
      }

      saveDb(db, {
        entity: 'sliding_window_profile',
        action: 'create',
        targetId: profile.id,
        targetName: profile.name,
        details: `Created ${trackType} profile for ${identity.ownerId}`,
      });

      return res.status(201).json({ success: true, profile });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to create fabrication profile.' });
    }
  });

  app.put('/api/sliding-window/profiles/:id', requireIdentity, (req, res) => {
    try {
      const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
      const db = getDb();
      const idx = (db.slidingWindowProfiles || []).findIndex(
        p => p.id === req.params.id && p.ownerId === identity.ownerId
      );
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Fabrication profile not found in your workspace.' });
      }

      const existing = db.slidingWindowProfiles![idx];
      const body = req.body || {};
      const trackType: SlidingTrackType = isValidTrackType(body.trackType) ? body.trackType : existing.trackType;
      const now = new Date().toISOString();

      const updated: FabricationProfile = {
        ...existing,
        ownerId: identity.ownerId, // Never allow ownerId reassignment
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 90) : existing.name,
        description:
          typeof body.description === 'string' ? body.description.trim().slice(0, 300) : existing.description,
        trackType,
        glassPanelCount:
          Number.isFinite(Number(body.glassPanelCount)) && Number(body.glassPanelCount) >= 1
            ? Math.min(8, Math.round(Number(body.glassPanelCount)))
            : existing.glassPanelCount,
        mosquitoNetPanelCount:
          Number.isFinite(Number(body.mosquitoNetPanelCount)) && Number(body.mosquitoNetPanelCount) >= 0
            ? Math.min(4, Math.round(Number(body.mosquitoNetPanelCount)))
            : existing.mosquitoNetPanelCount,
        glassWidthDivisor:
          Number.isFinite(Number(body.glassWidthDivisor)) && Number(body.glassWidthDivisor) > 0
            ? Number(body.glassWidthDivisor)
            : existing.glassWidthDivisor,
        mosquitoNetWidthDivisor:
          Number.isFinite(Number(body.mosquitoNetWidthDivisor)) && Number(body.mosquitoNetWidthDivisor) > 0
            ? Number(body.mosquitoNetWidthDivisor)
            : existing.mosquitoNetWidthDivisor,
        bearingDivisor:
          Number.isFinite(Number(body.bearingDivisor)) && Number(body.bearingDivisor) > 0
            ? Number(body.bearingDivisor)
            : existing.bearingDivisor || 2,
        rules: body.rules ? sanitizeRulesInput(body.rules, trackType) : existing.rules,
        panelArrangements: body.panelArrangements
          ? sanitizePanelArrangements(body.panelArrangements, trackType)
          : existing.panelArrangements,
        updatedAt: now,
      };

      db.slidingWindowProfiles![idx] = updated;
      saveDb(db, {
        entity: 'sliding_window_profile',
        action: 'update',
        targetId: updated.id,
        targetName: updated.name,
        details: `Updated profile "${updated.name}"`,
      });

      return res.json({ success: true, profile: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to update fabrication profile.' });
    }
  });

  app.post('/api/sliding-window/profiles/:id/duplicate', requireIdentity, (req, res) => {
    const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
    const db = getDb();
    const source = (db.slidingWindowProfiles || []).find(
      p => p.id === req.params.id && p.ownerId === identity.ownerId
    );
    if (!source) {
      return res.status(404).json({ success: false, error: 'Profile not found in your workspace.' });
    }

    const customName =
      typeof req.body?.name === 'string' && req.body.name.trim()
        ? req.body.name.trim().slice(0, 90)
        : `${source.name} (Copy)`;
    const now = new Date().toISOString();
    const duplicated: FabricationProfile = {
      ...JSON.parse(JSON.stringify(source)),
      id: `prof-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      ownerId: identity.ownerId,
      name: customName,
      isDefault: false,
      isSystemSeed: false,
      createdAt: now,
      updatedAt: now,
    };

    db.slidingWindowProfiles!.push(duplicated);
    saveDb(db, {
      entity: 'sliding_window_profile',
      action: 'create',
      targetId: duplicated.id,
      targetName: duplicated.name,
      details: `Duplicated profile from "${source.name}"`,
    });

    return res.status(201).json({ success: true, profile: duplicated });
  });

  app.post('/api/sliding-window/profiles/:id/set-default', requireIdentity, (req, res) => {
    const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
    const db = getDb();
    const target = (db.slidingWindowProfiles || []).find(
      p => p.id === req.params.id && p.ownerId === identity.ownerId
    );
    if (!target) {
      return res.status(404).json({ success: false, error: 'Profile not found in your workspace.' });
    }

    const now = new Date().toISOString();
    db.slidingWindowProfiles!.forEach(p => {
      if (p.ownerId === identity.ownerId && p.trackType === target.trackType) {
        p.isDefault = p.id === target.id;
        p.updatedAt = now;
      }
    });

    const userSettings = (db.slidingWindowUserSettings || []).find(s => s.ownerId === identity.ownerId);
    if (userSettings) {
      if (target.trackType === '2-track') userSettings.default2TrackProfileId = target.id;
      else userSettings.default3TrackProfileId = target.id;
      userSettings.updatedAt = now;
    }

    saveDb(db, {
      entity: 'sliding_window_profile',
      action: 'update',
      targetId: target.id,
      targetName: target.name,
      details: `Set "${target.name}" as default ${target.trackType} profile`,
    });

    const ownerProfiles = db.slidingWindowProfiles!.filter(p => p.ownerId === identity.ownerId);
    return res.json({ success: true, profile: target, profiles: ownerProfiles });
  });

  app.post('/api/sliding-window/profiles/:id/reset', requireIdentity, (req, res) => {
    const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
    const db = getDb();
    const idx = (db.slidingWindowProfiles || []).findIndex(
      p => p.id === req.params.id && p.ownerId === identity.ownerId
    );
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Profile not found in your workspace.' });
    }

    const existing = db.slidingWindowProfiles![idx];
    const now = new Date().toISOString();
    const resetProfile: FabricationProfile = {
      ...existing,
      glassPanelCount: 2,
      mosquitoNetPanelCount: existing.trackType === '3-track' ? 1 : 0,
      glassWidthDivisor: 2,
      mosquitoNetWidthDivisor: 2,
      bearingDivisor: 2,
      rules: getDefaultRuleResetValues(existing.trackType),
      panelArrangements: createDefaultPanelArrangements(existing.trackType),
      updatedAt: now,
    };

    db.slidingWindowProfiles![idx] = resetProfile;
    saveDb(db, {
      entity: 'sliding_window_profile',
      action: 'update',
      targetId: resetProfile.id,
      targetName: resetProfile.name,
      details: `Reset "${resetProfile.name}" rules to standard defaults`,
    });

    return res.json({ success: true, profile: resetProfile });
  });

  app.delete('/api/sliding-window/profiles/:id', requireIdentity, (req, res) => {
    const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
    const db = getDb();
    const target = (db.slidingWindowProfiles || []).find(
      p => p.id === req.params.id && p.ownerId === identity.ownerId
    );
    if (!target) {
      return res.status(404).json({ success: false, error: 'Profile not found in your workspace.' });
    }

    const sameTrackProfiles = (db.slidingWindowProfiles || []).filter(
      p => p.ownerId === identity.ownerId && p.trackType === target.trackType
    );
    if (sameTrackProfiles.length <= 1) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete the only remaining ${target.trackType} profile. Create another profile first.`,
      });
    }

    db.slidingWindowProfiles = db.slidingWindowProfiles!.filter(
      p => !(p.id === target.id && p.ownerId === identity.ownerId)
    );

    if (target.isDefault) {
      const replacement = db.slidingWindowProfiles.find(
        p => p.ownerId === identity.ownerId && p.trackType === target.trackType
      );
      if (replacement) {
        replacement.isDefault = true;
      }
    }

    saveDb(db, {
      entity: 'sliding_window_profile',
      action: 'delete',
      targetId: target.id,
      targetName: target.name,
      details: `Deleted fabrication profile "${target.name}"`,
    });

    const remaining = db.slidingWindowProfiles.filter(p => p.ownerId === identity.ownerId);
    return res.json({ success: true, profiles: remaining });
  });

  // --------------------------------------------------------------------------
  // USER SETTINGS
  // --------------------------------------------------------------------------

  app.put('/api/sliding-window/settings', requireIdentity, (req, res) => {
    const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
    const { settings } = ensureOwnerProfilesAndSettings(identity.ownerId);
    const db = getDb();
    const body = req.body || {};

    const idx = db.slidingWindowUserSettings!.findIndex(s => s.ownerId === identity.ownerId);
    const updated: SlidingWindowUserSettings = {
      ...settings,
      ownerId: identity.ownerId,
      defaultUnit: isValidUnit(body.defaultUnit) ? body.defaultUnit : settings.defaultUnit,
      default2TrackProfileId:
        typeof body.default2TrackProfileId === 'string'
          ? body.default2TrackProfileId
          : settings.default2TrackProfileId,
      default3TrackProfileId:
        typeof body.default3TrackProfileId === 'string'
          ? body.default3TrackProfileId
          : settings.default3TrackProfileId,
      defaultGlassThickness:
        typeof body.defaultGlassThickness === 'string' && body.defaultGlassThickness.trim()
          ? body.defaultGlassThickness.trim().slice(0, 60)
          : settings.defaultGlassThickness,
      showMmReference:
        typeof body.showMmReference === 'boolean' ? body.showMmReference : settings.showMmReference,
      updatedAt: new Date().toISOString(),
    };

    if (idx !== -1) db.slidingWindowUserSettings![idx] = updated;
    else db.slidingWindowUserSettings!.push(updated);

    saveDb(db, {
      entity: 'sliding_window_settings',
      action: 'update',
      targetId: identity.ownerId,
      details: 'Updated sliding window user preferences',
    });

    return res.json({ success: true, settings: updated });
  });

  // --------------------------------------------------------------------------
  // SERVER-SIDE CALCULATION ENDPOINT (Protected: Verified Customer Auth Required)
  // --------------------------------------------------------------------------

  app.post('/api/sliding-window/calculate', requireCustomerAuth, requireIdentity, (req, res) => {
    const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
    const { profiles } = ensureOwnerProfilesAndSettings(identity.ownerId);
    const windowsInput: SlidingWindowInput[] = Array.isArray(req.body?.windows)
      ? req.body.windows
      : req.body?.window
      ? [req.body.window]
      : [];

    if (windowsInput.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one window input is required.' });
    }

    const results: SlidingWindowCalculationResult[] = windowsInput.map(win => {
      const profile =
        profiles.find(p => p.id === win.profileId) ||
        profiles.find(p => p.trackType === win.trackType && p.isDefault) ||
        profiles.find(p => p.trackType === win.trackType);
      return calculateSlidingWindowFabrication(win, profile);
    });

    return res.json({ success: true, results });
  });

  // --------------------------------------------------------------------------
  // AI NOTEBOOK PHOTO SIZE SCANNER (Protected: Verified Customer Auth Required)
  // --------------------------------------------------------------------------

  app.get('/api/sliding-window/scan-notebook', (_req, res) => {
    return res.status(405).json({
      success: false,
      errorCode: 'METHOD_NOT_ALLOWED',
      error: 'Use POST /api/sliding-window/scan-notebook with a notebook photo to run AI extraction.',
    });
  });

  app.post('/api/sliding-window/scan-notebook', requireCustomerAuth, requireIdentity, (req, res) => {
    const handleScan = async (
      imageBuffer: Buffer,
      mimeType: string,
      fileName: string,
      pageNumberRaw: unknown,
      existingWindowCountRaw: unknown,
      defaultUnitRaw: unknown
    ) => {
      try {
        if (!imageBuffer || imageBuffer.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Please capture or upload a notebook photograph before scanning.',
          });
        }
        if (imageBuffer.length > 15 * 1024 * 1024) {
          return res.status(413).json({
            success: false,
            errorCode: 'IMAGE_TOO_LARGE',
            error: 'Notebook photo is too large (max 15 MB). Please take a closer photo or choose a smaller image.',
          });
        }
        const sniffedMime = detectImageMimeFromBuffer(imageBuffer);
        const resolvedMime = sniffedMime || mimeType || 'image/jpeg';
        if (!isSupportedNotebookImage(resolvedMime, fileName, imageBuffer)) {
          return res.status(400).json({
            success: false,
            error: 'Unsupported image format. Use JPG, JPEG, PNG, WebP, or HEIC.',
          });
        }

        const pageNumber = Math.max(1, Math.min(50, Number(pageNumberRaw) || 1));
        const existingWindowCount = Math.max(0, Math.min(250, Number(existingWindowCountRaw) || 0));
        const defaultUnit: WindowMeasurementUnit = isValidUnit(defaultUnitRaw) ? defaultUnitRaw : 'inch';
        const pageId = `nb-page-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

        // 1. Run Gemini Vision handwritten size extraction (real AI — never fabricated)
        const analysis = await analyzeNotebookPhoto(imageBuffer, resolvedMime, {
          pageId,
          pageNumber,
          fileName,
          existingWindowCount,
          defaultUnit,
        });

        // 2. Persist original notebook photograph (Bunny Storage when configured, safe inline preview fallback otherwise)
        let photoUrl = '';
        let storageType: 'bunny_storage' | 'inline_preview' = 'inline_preview';

        if (isBunnyStorageConfigured()) {
          try {
            const uploaded = await uploadToBunnyStorage(imageBuffer, {
              filename: fileName || `notebook-page-${pageNumber}.jpg`,
              mimeType: resolvedMime,
              category: 'notebook-scans',
            });
            if (uploaded.success && (uploaded.proxyUrl || uploaded.url)) {
              photoUrl = uploaded.proxyUrl || uploaded.url || '';
              storageType = 'bunny_storage';
            }
          } catch (uploadErr) {
            console.warn('[NotebookScanner] Bunny upload failed, using inline preview fallback:', uploadErr);
          }
        }

        if (!photoUrl) {
          const safeMime = resolvedMime && resolvedMime.startsWith('image/') ? resolvedMime : 'image/jpeg';
          if (imageBuffer.length <= 350_000) {
            photoUrl = `data:${safeMime};base64,${imageBuffer.toString('base64')}`;
          } else {
            // Keep JSON response fast & compact over mobile/Cloud Run proxies; client already holds compact local preview
            photoUrl = '';
          }
          storageType = 'inline_preview';
        }

        const page: NotebookPhotoPageRecord = {
          id: pageId,
          pageNumber,
          fileName: fileName || `notebook-page-${pageNumber}.jpg`,
          mimeType: resolvedMime,
          photoUrl,
          storageType,
          uploadedAt: new Date().toISOString(),
          detectedProjectName: analysis.detectedProjectName,
          detectedCustomerName: analysis.detectedCustomerName,
          rawAiSummary: analysis.summary,
          warnings: analysis.warnings,
        };

        return res.status(200).json({
          success: true,
          data: {
            windows: analysis.rows,
            page,
            detectedProjectName: analysis.detectedProjectName,
            detectedCustomerName: analysis.detectedCustomerName,
            summary: analysis.summary,
            warnings: analysis.warnings,
            modelUsed: analysis.modelUsed,
          },
          page,
          rows: analysis.rows,
          detectedProjectName: analysis.detectedProjectName,
          detectedCustomerName: analysis.detectedCustomerName,
          summary: analysis.summary,
          warnings: analysis.warnings,
          modelUsed: analysis.modelUsed,
        });
      } catch (err: any) {
        if (res.headersSent) return;
        if (err instanceof NotebookScannerError) {
          // Guard against proxy-intercepted status codes (403/502/503/504) which AI Studio's nginx
          // rewrites to /warmup.html or /forbidden.html (HTML instead of JSON).
          const rawCode = err.statusCode;
          const proxySafeStatus =
            rawCode === 403 || rawCode === 502 || rawCode === 503 || rawCode === 504
              ? rawCode === 504
                ? 408
                : 500
              : rawCode;
          return res.status(proxySafeStatus).json({
            success: false,
            errorCode: err.errorCode,
            error: err.message,
          });
        }
        return res.status(500).json({
          success: false,
          error: err?.message || 'Failed to scan notebook photograph.',
        });
      }
    };

    try {
      const contentType = (req.headers['content-type'] || '').toLowerCase();
      if (contentType.includes('multipart/form-data')) {
        notebookPhotoUpload.single('photo')(req, res, (uploadErr: any) => {
          if (uploadErr) {
            const isSizeLimit =
              uploadErr?.code === 'LIMIT_FILE_SIZE' ||
              String(uploadErr?.message || '').toLowerCase().includes('file too large');
            return res.status(isSizeLimit ? 413 : 400).json({
              success: false,
              errorCode: isSizeLimit ? 'IMAGE_TOO_LARGE' : 'INVALID_IMAGE_UPLOAD',
              error: isSizeLimit
                ? 'Notebook photo exceeds the 15 MB upload limit. Please use a smaller photo.'
                : uploadErr?.message || 'Invalid photo upload.',
            });
          }
          const file = (req as any).file as Express.Multer.File | undefined;
          if (!file || !file.buffer) {
            return res.status(400).json({
              success: false,
              error: 'No photo file received. Please take or upload a notebook image.',
            });
          }
          void handleScan(
            file.buffer,
            file.mimetype || 'image/jpeg',
            file.originalname || 'notebook-page.jpg',
            req.body?.pageNumber,
            req.body?.existingWindowCount,
            req.body?.defaultUnit
          );
        });
        return;
      }

      // Also accept JSON base64 payload { imageBase64, mimeType, fileName, ... }
      const body = req.body || {};
      if (typeof body.imageBase64 === 'string' && body.imageBase64.trim()) {
        const rawB64 = body.imageBase64.trim();
        const dataUrlMatch = rawB64.match(/^data:([^;]+);base64,(.+)$/i);
        const mimeType =
          (typeof body.mimeType === 'string' && body.mimeType.trim()) ||
          (dataUrlMatch ? dataUrlMatch[1] : 'image/jpeg');
        const base64Body = dataUrlMatch ? dataUrlMatch[2] : rawB64;
        const buf = Buffer.from(base64Body, 'base64');
        void handleScan(
          buf,
          mimeType,
          typeof body.fileName === 'string' ? body.fileName : 'notebook-page.jpg',
          body.pageNumber,
          body.existingWindowCount,
          body.defaultUnit
        );
        return;
      }

      return res.status(400).json({
        success: false,
        error: 'Upload a notebook photo using multipart/form-data ("photo") or JSON ("imageBase64").',
      });
    } catch (syncErr: any) {
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: syncErr?.message || 'Unexpected error while processing notebook photo upload.',
        });
      }
    }
  });

  // --------------------------------------------------------------------------
  // PROJECTS CRUD (Immutable Snapshots & Strict Owner Isolation)
  // --------------------------------------------------------------------------

  app.get('/api/sliding-window/projects', requireIdentity, (req, res) => {
    const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
    const db = getDb();
    const projects = (db.slidingWindowProjects || [])
      .filter(p => p.ownerId === identity.ownerId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return res.json({ success: true, projects });
  });

  app.post('/api/sliding-window/projects', requireCustomerAuth, requireIdentity, (req, res) => {
    try {
      const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
      const { profiles } = ensureOwnerProfilesAndSettings(identity.ownerId);
      const body = req.body || {};

      const projectName =
        typeof body.projectName === 'string' && body.projectName.trim()
          ? body.projectName.trim().slice(0, 120)
          : 'Untitled Window Project';
      const customerName =
        typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 120) : '';
      const rawWindows: SlidingWindowInput[] = Array.isArray(body.windows) ? body.windows : [];

      if (rawWindows.length === 0) {
        return res.status(400).json({ success: false, error: 'Add at least one window before saving a project.' });
      }
      if (rawWindows.length > 250) {
        return res.status(400).json({ success: false, error: 'Maximum 250 windows per project.' });
      }

      const profileSnapshots: Record<string, FabricationProfile> = {};
      const results: SlidingWindowCalculationResult[] = rawWindows.map((win, idx) => {
        const sanitizedWin: SlidingWindowInput = {
          id: typeof win.id === 'string' && win.id ? win.id : `win-${idx + 1}`,
          windowNumber:
            typeof win.windowNumber === 'string' && win.windowNumber.trim()
              ? win.windowNumber.trim().slice(0, 40)
              : `W-${idx + 1}`,
          width: Number(win.width),
          height: Number(win.height),
          unit: isValidUnit(win.unit) ? win.unit : 'inch',
          trackType: isValidTrackType(win.trackType) ? win.trackType : '2-track',
          configuration:
            typeof win.configuration === 'string' && win.configuration.trim()
              ? win.configuration.trim().slice(0, 100)
              : '2 Glass Panels',
          glassThickness:
            typeof win.glassThickness === 'string' && win.glassThickness.trim()
              ? win.glassThickness.trim().slice(0, 60)
              : '5mm Clear / Toughened',
          mosquitoNetRequired: Boolean(win.mosquitoNetRequired),
          profileId: typeof win.profileId === 'string' ? win.profileId : undefined,
          notes: typeof win.notes === 'string' ? win.notes.trim().slice(0, 200) : undefined,
        };

        const matchedProfile =
          profiles.find(p => p.id === sanitizedWin.profileId) ||
          profiles.find(p => p.trackType === sanitizedWin.trackType && p.isDefault) ||
          profiles.find(p => p.trackType === sanitizedWin.trackType);

        if (matchedProfile && !profileSnapshots[matchedProfile.id]) {
          // Deep copy snapshot so future profile edits NEVER alter saved project records
          profileSnapshots[matchedProfile.id] = JSON.parse(JSON.stringify(matchedProfile));
        }

        return calculateSlidingWindowFabrication(sanitizedWin, matchedProfile);
      });

      const now = new Date().toISOString();
      const db = getDb();
      if (!Array.isArray(db.slidingWindowProjects)) db.slidingWindowProjects = [];

      const sanitizedNotebookScan = sanitizeNotebookScanPayload(body.notebookScan);

      const project: SlidingWindowProject = {
        id: `swp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        ownerId: identity.ownerId,
        projectName,
        customerName,
        defaultUnit: isValidUnit(body.defaultUnit) ? body.defaultUnit : 'inch',
        windows: rawWindows,
        results,
        profileSnapshots,
        ...(sanitizedNotebookScan ? { notebookScan: sanitizedNotebookScan } : {}),
        createdAt: now,
        updatedAt: now,
      };

      db.slidingWindowProjects.unshift(project);
      saveDb(db, {
        entity: 'sliding_window_project',
        action: 'create',
        targetId: project.id,
        targetName: project.projectName,
        details: `Saved ${rawWindows.length} window calculations${
          sanitizedNotebookScan ? ` (with ${sanitizedNotebookScan.pages.length} scanned notebook page(s))` : ''
        } for ${identity.ownerId}`,
      });

      return res.status(201).json({ success: true, project });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to save window project.' });
    }
  });

  app.delete('/api/sliding-window/projects/:id', requireIdentity, (req, res) => {
    const identity: SlidingWindowIdentity = (req as any).slidingIdentity;
    const db = getDb();
    const existing = (db.slidingWindowProjects || []).find(
      p => p.id === req.params.id && p.ownerId === identity.ownerId
    );
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Project not found in your workspace.' });
    }

    db.slidingWindowProjects = db.slidingWindowProjects!.filter(
      p => !(p.id === req.params.id && p.ownerId === identity.ownerId)
    );
    saveDb(db, {
      entity: 'sliding_window_project',
      action: 'delete',
      targetId: existing.id,
      targetName: existing.projectName,
      details: `Deleted window project "${existing.projectName}"`,
    });

    return res.json({ success: true, deletedId: existing.id });
  });
}
