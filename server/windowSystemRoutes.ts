import crypto from 'crypto';
import type express from 'express';
import { getDb, saveDb } from './db.ts';
import { requireCustomerAuth } from './paymentAuthRoutes.ts';
import {
  WINDOW_SYSTEM_CATEGORIES,
  createDefaultIndianWindowSystems,
} from '../src/data/indianWindowSystemsDefaults.ts';
import type {
  SavedWindowSystemCalculation,
  WindowCuttingPreset,
  WindowIllustrationType,
  WindowProfileSeriesConfig,
  WindowRuleBaseDimension,
  WindowSectionCategory,
  WindowSectionFormulaRule,
  WindowSystemCategoryId,
  WindowSystemDefinition,
} from '../src/types.ts';

const VALID_CATEGORIES = new Set<WindowSystemCategoryId>(['sliding', 'indian_aluminium', 'special']);

const VALID_ILLUSTRATIONS = new Set<WindowIllustrationType>([
  '2-track',
  '3-track',
  '4-track',
  '18-50',
  'heavy-sliding',
  'dhumal',
  'indian-standard',
  'aluminium-section',
  'local-fabrication',
  'custom-profile',
  'fixed-glass',
  'openable',
  'combination',
  'ventilator',
  'mosquito-net',
]);

const VALID_SECTION_CATEGORIES = new Set<WindowSectionCategory>([
  'top_track',
  'bottom_track',
  'side_frame',
  'interlock',
  'handle',
  'shutter_rail',
  'glass',
  'mosquito_net',
  'bearing',
  'other',
]);

const VALID_BASE_DIMENSIONS = new Set<WindowRuleBaseDimension>([
  'width',
  'height',
  'width_divided_by_shutters',
  'height_minus_handle',
]);

function sanitizeText(val: unknown, maxLen = 160, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  return val.trim().slice(0, maxLen);
}

function sanitizeNullableNumber(val: unknown, min = -100, max = 500): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n * 10000) / 10000));
}

function sanitizeNumber(val: unknown, fallback = 0, min = 0, max = 500): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n * 10000) / 10000));
}

function sanitizeIntList(val: unknown, fallback: number[], min = 1, max = 12): number[] {
  if (!Array.isArray(val)) return fallback;
  const cleaned = Array.from(
    new Set(
      val
        .map((v) => Math.floor(Number(v)))
        .filter((v) => Number.isFinite(v) && v >= min && v <= max)
    )
  ).sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeSlug(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `window-system-${Date.now()}`;
}

function sanitizeSectionRule(raw: any, idx: number): WindowSectionFormulaRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const name = sanitizeText(raw.name, 90);
  if (!name) return null;

  const category: WindowSectionCategory = VALID_SECTION_CATEGORIES.has(raw.category)
    ? raw.category
    : 'other';
  const baseDimension: WindowRuleBaseDimension = VALID_BASE_DIMENSIONS.has(raw.baseDimension)
    ? raw.baseDimension
    : 'width';

  return {
    id: sanitizeText(raw.id, 64) || `sec-${crypto.randomBytes(4).toString('hex')}-${idx}`,
    name,
    sectionCode: sanitizeText(raw.sectionCode, 40) || undefined,
    sectionDimensionSpec: sanitizeText(raw.sectionDimensionSpec, 80) || undefined,
    category,
    baseDimension,
    divisor: Math.max(1, Math.min(12, sanitizeNumber(raw.divisor, 1, 1, 12))),
    useShutterCountAsDivisor: Boolean(raw.useShutterCountAsDivisor),
    minusDeductionInch: sanitizeNumber(raw.minusDeductionInch, 0, 0, 200),
    plusAdditionInch: sanitizeNumber(raw.plusAdditionInch, 0, 0, 200),
    piecesPerWindow: Math.max(1, Math.min(50, Math.floor(sanitizeNumber(raw.piecesPerWindow, 1, 1, 50)))),
    multiplyPiecesByShutters: Boolean(raw.multiplyPiecesByShutters),
    requiresMosquitoNet: Boolean(raw.requiresMosquitoNet),
    notes: sanitizeText(raw.notes, 200) || undefined,
  };
}

function hasAnyConfiguredRuleInSeries(series: WindowProfileSeriesConfig): boolean {
  const numericFields: Array<number | null | undefined> = [
    series.topTrackDeductionInch,
    series.topTrackAdditionInch,
    series.bottomTrackDeductionInch,
    series.bottomTrackAdditionInch,
    series.sideFrameDeductionInch,
    series.sideFrameAdditionInch,
    series.interlockDeductionInch,
    series.interlockAdditionInch,
    series.handleDeductionInch,
    series.handleAdditionInch,
    series.glassWidthDeductionInch,
    series.glassWidthAdditionInch,
    series.glassHeightDeductionInch,
    series.glassHeightAdditionInch,
    series.mosquitoNetWidthDeductionInch,
    series.mosquitoNetWidthAdditionInch,
    series.mosquitoNetHeightDeductionInch,
    series.mosquitoNetHeightAdditionInch,
  ];
  const hasCoreRule = numericFields.some((v) => typeof v === 'number' && Number.isFinite(v));
  const hasAdditional = Array.isArray(series.additionalSections) && series.additionalSections.length > 0;
  return hasCoreRule || hasAdditional;
}

function sanitizeProfileSeries(
  rawList: unknown,
  isLegacySliding: boolean
): WindowProfileSeriesConfig[] {
  const now = new Date().toISOString();
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return [
      {
        id: `ps-${crypto.randomBytes(4).toString('hex')}`,
        name: isLegacySliding ? 'Standard Verified Series' : 'Default Profile Series (Setup Required)',
        code: isLegacySliding ? 'STD' : 'CUSTOM',
        sectionDimensions: '',
        isConfigured: isLegacySliding,
        additionalSections: [],
        updatedAt: now,
      },
    ];
  }

  return rawList.slice(0, 25).map((raw: any, idx: number) => {
    const additionalSections = Array.isArray(raw?.additionalSections)
      ? raw.additionalSections
          .slice(0, 40)
          .map((r: any, rIdx: number) => sanitizeSectionRule(r, rIdx))
          .filter((r: WindowSectionFormulaRule | null): r is WindowSectionFormulaRule => r !== null)
      : [];

    const series: WindowProfileSeriesConfig = {
      id: sanitizeText(raw?.id, 64) || `ps-${crypto.randomBytes(4).toString('hex')}-${idx}`,
      name: sanitizeText(raw?.name, 100) || `Profile Series ${idx + 1}`,
      code: sanitizeText(raw?.code, 32) || `SER-${idx + 1}`,
      sectionDimensions: sanitizeText(raw?.sectionDimensions, 140),
      isConfigured: false,
      topTrackDeductionInch: sanitizeNullableNumber(raw?.topTrackDeductionInch, 0, 200),
      topTrackAdditionInch: sanitizeNullableNumber(raw?.topTrackAdditionInch, 0, 200),
      bottomTrackDeductionInch: sanitizeNullableNumber(raw?.bottomTrackDeductionInch, 0, 200),
      bottomTrackAdditionInch: sanitizeNullableNumber(raw?.bottomTrackAdditionInch, 0, 200),
      sideFrameDeductionInch: sanitizeNullableNumber(raw?.sideFrameDeductionInch, 0, 200),
      sideFrameAdditionInch: sanitizeNullableNumber(raw?.sideFrameAdditionInch, 0, 200),
      interlockDeductionInch: sanitizeNullableNumber(raw?.interlockDeductionInch, 0, 200),
      interlockAdditionInch: sanitizeNullableNumber(raw?.interlockAdditionInch, 0, 200),
      handleDeductionInch: sanitizeNullableNumber(raw?.handleDeductionInch, 0, 200),
      handleAdditionInch: sanitizeNullableNumber(raw?.handleAdditionInch, 0, 200),
      glassWidthDeductionInch: sanitizeNullableNumber(raw?.glassWidthDeductionInch, 0, 200),
      glassWidthAdditionInch: sanitizeNullableNumber(raw?.glassWidthAdditionInch, 0, 200),
      glassHeightDeductionInch: sanitizeNullableNumber(raw?.glassHeightDeductionInch, 0, 200),
      glassHeightAdditionInch: sanitizeNullableNumber(raw?.glassHeightAdditionInch, 0, 200),
      mosquitoNetWidthDeductionInch: sanitizeNullableNumber(raw?.mosquitoNetWidthDeductionInch, 0, 200),
      mosquitoNetWidthAdditionInch: sanitizeNullableNumber(raw?.mosquitoNetWidthAdditionInch, 0, 200),
      mosquitoNetHeightDeductionInch: sanitizeNullableNumber(raw?.mosquitoNetHeightDeductionInch, 0, 200),
      mosquitoNetHeightAdditionInch: sanitizeNullableNumber(raw?.mosquitoNetHeightAdditionInch, 0, 200),
      additionalSections,
      updatedAt: now,
    };

    // Only allow isConfigured=true if legacy sliding OR actual numeric rules exist
    series.isConfigured = isLegacySliding
      ? true
      : Boolean(raw?.isConfigured) && hasAnyConfiguredRuleInSeries(series);

    return series;
  });
}

function sanitizePresets(rawList: unknown, fallbackSeriesId: string): WindowCuttingPreset[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .slice(0, 30)
    .filter((p: any) => p && typeof p === 'object' && sanitizeText(p.name, 90).length > 0)
    .map((p: any, idx: number) => ({
      id: sanitizeText(p.id, 64) || `preset-${crypto.randomBytes(4).toString('hex')}-${idx}`,
      name: sanitizeText(p.name, 90),
      profileSeriesId: sanitizeText(p.profileSeriesId, 64) || fallbackSeriesId,
      trackCount: Math.max(1, Math.min(8, Math.floor(sanitizeNumber(p.trackCount, 2, 1, 8)))),
      shutterCount: Math.max(1, Math.min(12, Math.floor(sanitizeNumber(p.shutterCount, 2, 1, 12)))),
      includeMosquitoNet: Boolean(p.includeMosquitoNet),
      notes: sanitizeText(p.notes, 200) || undefined,
    }));
}

function ensureWindowSystemsInDb(): WindowSystemDefinition[] {
  const db = getDb();
  if (!Array.isArray(db.windowSystems) || db.windowSystems.length === 0) {
    db.windowSystems = createDefaultIndianWindowSystems();
    saveDb(db);
  }
  return db.windowSystems;
}

export function registerWindowSystemRoutes(
  app: express.Express,
  deps: {
    verifyAdminToken: express.RequestHandler;
  }
): void {
  const { verifyAdminToken } = deps;

  // =========================================================================
  // PUBLIC CUSTOMER ROUTES
  // =========================================================================

  // List enabled Indian Aluminium Window Systems & categories
  app.get('/api/window-systems', (_req, res) => {
    try {
      const systems = ensureWindowSystemsInDb()
        .filter((s) => s.enabled !== false)
        .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

      return res.json({
        success: true,
        categories: WINDOW_SYSTEM_CATEGORIES,
        systems,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to load window systems.',
      });
    }
  });

  // =========================================================================
  // AUTHENTICATED CUSTOMER SAVED CUTTING LISTS
  // =========================================================================

  app.get('/api/window-systems/saved', requireCustomerAuth, (req, res) => {
    try {
      const authCustomer = (req as any).authCustomer;
      const db = getDb();
      const all = Array.isArray(db.savedWindowSystemCalcs) ? db.savedWindowSystemCalcs : [];
      const mine = all
        .filter((item) => item.customerId === authCustomer.id)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

      return res.json({
        success: true,
        savedCalculations: mine,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to load saved cutting lists.',
      });
    }
  });

  app.post('/api/window-systems/saved', requireCustomerAuth, (req, res) => {
    try {
      const authCustomer = (req as any).authCustomer;
      const body = req.body || {};
      const result = body.result;

      if (!result || typeof result !== 'object' || result.status !== 'calculated') {
        return res.status(400).json({
          success: false,
          error: 'Only valid calculated cutting lists can be saved.',
        });
      }

      if (JSON.stringify(result).length > 60_000) {
        return res.status(400).json({
          success: false,
          error: 'Cutting list payload exceeds maximum allowed size.',
        });
      }

      const systemId = sanitizeText(result.systemId, 80);
      const systemName = sanitizeText(result.systemName, 120);
      if (!systemId || !systemName) {
        return res.status(400).json({
          success: false,
          error: 'Window system details are required.',
        });
      }

      const now = new Date().toISOString();
      const record: SavedWindowSystemCalculation = {
        id: `wsc-${crypto.randomBytes(6).toString('hex')}`,
        customerId: authCustomer.id,
        projectName: sanitizeText(body.projectName, 120) || `${systemName} Cutting List`,
        customerName: sanitizeText(body.customerName, 120) || authCustomer.name || 'Workshop Client',
        systemId,
        systemName,
        categoryId: VALID_CATEGORIES.has(result.categoryId) ? result.categoryId : 'sliding',
        result,
        createdAt: now,
        updatedAt: now,
      };

      const db = getDb();
      if (!Array.isArray(db.savedWindowSystemCalcs)) {
        db.savedWindowSystemCalcs = [];
      }
      db.savedWindowSystemCalcs.unshift(record);
      // Keep max 200 records per customer to prevent unbounded growth
      const customerRecords = db.savedWindowSystemCalcs.filter((r) => r.customerId === authCustomer.id);
      if (customerRecords.length > 200) {
        const dropIds = new Set(customerRecords.slice(200).map((r) => r.id));
        db.savedWindowSystemCalcs = db.savedWindowSystemCalcs.filter((r) => !dropIds.has(r.id));
      }
      saveDb(db);

      return res.status(201).json({
        success: true,
        savedCalculation: record,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to save cutting list.',
      });
    }
  });

  app.delete('/api/window-systems/saved/:id', requireCustomerAuth, (req, res) => {
    try {
      const authCustomer = (req as any).authCustomer;
      const targetId = sanitizeText(req.params.id, 80);
      const db = getDb();
      const list = Array.isArray(db.savedWindowSystemCalcs) ? db.savedWindowSystemCalcs : [];
      const existing = list.find((r) => r.id === targetId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Saved cutting list not found.' });
      }
      if (existing.customerId !== authCustomer.id) {
        return res.status(403).json({ success: false, error: 'Not authorized to delete this record.' });
      }
      db.savedWindowSystemCalcs = list.filter((r) => r.id !== targetId);
      saveDb(db);
      return res.json({ success: true, deletedId: targetId });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to delete saved cutting list.',
      });
    }
  });

  // =========================================================================
  // ADMIN PANEL ROUTES (PROTECTED BY verifyAdminToken)
  // =========================================================================

  app.get('/api/admin/window-systems', verifyAdminToken, (_req, res) => {
    try {
      const systems = ensureWindowSystemsInDb()
        .slice()
        .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

      return res.json({
        success: true,
        categories: WINDOW_SYSTEM_CATEGORIES,
        systems,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to load admin window systems.',
      });
    }
  });

  app.post('/api/admin/window-systems', verifyAdminToken, (req, res) => {
    try {
      const body = req.body || {};
      const name = sanitizeText(body.name, 100);
      if (!name) {
        return res.status(400).json({ success: false, error: 'Window system name is required.' });
      }

      const categoryId: WindowSystemCategoryId = VALID_CATEGORIES.has(body.categoryId)
        ? body.categoryId
        : 'indian_aluminium';

      const illustrationType: WindowIllustrationType = VALID_ILLUSTRATIONS.has(body.illustrationType)
        ? body.illustrationType
        : 'custom-profile';

      const db = getDb();
      const existingList = ensureWindowSystemsInDb();
      const now = new Date().toISOString();

      const allowedTrackCounts = sanitizeIntList(body.allowedTrackCounts, [2, 3], 1, 8);
      const allowedShutterCounts = sanitizeIntList(body.allowedShutterCounts, [2, 3, 4], 1, 12);
      const profileSeries = sanitizeProfileSeries(body.profileSeries, false);
      const formulaConfigured = profileSeries.some((p) => p.isConfigured);
      const presets = sanitizePresets(body.presets, profileSeries[0].id);

      const newSystem: WindowSystemDefinition = {
        id: `ws-${crypto.randomBytes(5).toString('hex')}`,
        slug: sanitizeSlug(body.slug || name),
        name,
        categoryId,
        shortDescription:
          sanitizeText(body.shortDescription, 220) ||
          `Configurable ${name} aluminium fabrication cutting calculator.`,
        illustrationType,
        enabled: body.enabled !== false,
        isSystemDefault: false,
        supportsTracks: body.supportsTracks !== false,
        defaultTrackCount: allowedTrackCounts.includes(Number(body.defaultTrackCount))
          ? Number(body.defaultTrackCount)
          : allowedTrackCounts[0],
        allowedTrackCounts,
        defaultShutterCount: allowedShutterCounts.includes(Number(body.defaultShutterCount))
          ? Number(body.defaultShutterCount)
          : allowedShutterCounts[0],
        allowedShutterCounts,
        supportsMosquitoNet: Boolean(body.supportsMosquitoNet),
        defaultMosquitoNet: Boolean(body.supportsMosquitoNet && body.defaultMosquitoNet),
        formulaConfigured,
        profileSeries,
        presets,
        sortOrder: existingList.length + 1,
        createdAt: now,
        updatedAt: now,
      };

      db.windowSystems = [...existingList, newSystem];
      saveDb(db);

      return res.status(201).json({
        success: true,
        system: newSystem,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to create window system.',
      });
    }
  });

  app.put('/api/admin/window-systems/:id', verifyAdminToken, (req, res) => {
    try {
      const targetId = sanitizeText(req.params.id, 80);
      const body = req.body || {};
      const db = getDb();
      const list = ensureWindowSystemsInDb();
      const idx = list.findIndex((s) => s.id === targetId);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Window system not found.' });
      }

      const current = list[idx];
      const isLegacySliding =
        current.usesLegacySlidingEngine === '2-track' || current.usesLegacySlidingEngine === '3-track';

      const name = sanitizeText(body.name, 100) || current.name;
      const categoryId: WindowSystemCategoryId = VALID_CATEGORIES.has(body.categoryId)
        ? body.categoryId
        : current.categoryId;
      const illustrationType: WindowIllustrationType = VALID_ILLUSTRATIONS.has(body.illustrationType)
        ? body.illustrationType
        : current.illustrationType;

      const allowedTrackCounts =
        body.allowedTrackCounts !== undefined
          ? sanitizeIntList(body.allowedTrackCounts, current.allowedTrackCounts, 1, 8)
          : current.allowedTrackCounts;

      const allowedShutterCounts =
        body.allowedShutterCounts !== undefined
          ? sanitizeIntList(body.allowedShutterCounts, current.allowedShutterCounts, 1, 12)
          : current.allowedShutterCounts;

      const profileSeries =
        body.profileSeries !== undefined
          ? sanitizeProfileSeries(body.profileSeries, isLegacySliding)
          : current.profileSeries;

      const presets =
        body.presets !== undefined
          ? sanitizePresets(body.presets, profileSeries[0]?.id || 'ps-default')
          : current.presets;

      const formulaConfigured = isLegacySliding
        ? true
        : profileSeries.some((p) => p.isConfigured);

      const updated: WindowSystemDefinition = {
        ...current,
        name,
        slug: body.slug ? sanitizeSlug(body.slug) : current.slug,
        categoryId,
        shortDescription:
          body.shortDescription !== undefined
            ? sanitizeText(body.shortDescription, 220) || current.shortDescription
            : current.shortDescription,
        illustrationType,
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : current.enabled,
        supportsTracks:
          body.supportsTracks !== undefined ? Boolean(body.supportsTracks) : current.supportsTracks,
        allowedTrackCounts,
        defaultTrackCount: allowedTrackCounts.includes(Number(body.defaultTrackCount))
          ? Number(body.defaultTrackCount)
          : allowedTrackCounts.includes(current.defaultTrackCount)
            ? current.defaultTrackCount
            : allowedTrackCounts[0],
        allowedShutterCounts,
        defaultShutterCount: allowedShutterCounts.includes(Number(body.defaultShutterCount))
          ? Number(body.defaultShutterCount)
          : allowedShutterCounts.includes(current.defaultShutterCount)
            ? current.defaultShutterCount
            : allowedShutterCounts[0],
        supportsMosquitoNet:
          body.supportsMosquitoNet !== undefined
            ? Boolean(body.supportsMosquitoNet)
            : current.supportsMosquitoNet,
        defaultMosquitoNet:
          body.defaultMosquitoNet !== undefined
            ? Boolean(body.defaultMosquitoNet)
            : current.defaultMosquitoNet,
        formulaConfigured,
        profileSeries,
        presets,
        sortOrder:
          body.sortOrder !== undefined
            ? Math.max(1, Math.min(999, Math.floor(sanitizeNumber(body.sortOrder, current.sortOrder, 1, 999))))
            : current.sortOrder,
        updatedAt: new Date().toISOString(),
      };

      const nextList = [...list];
      nextList[idx] = updated;
      db.windowSystems = nextList;
      saveDb(db);

      return res.json({
        success: true,
        system: updated,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to update window system.',
      });
    }
  });

  app.delete('/api/admin/window-systems/:id', verifyAdminToken, (req, res) => {
    try {
      const targetId = sanitizeText(req.params.id, 80);
      const db = getDb();
      const list = ensureWindowSystemsInDb();
      const target = list.find((s) => s.id === targetId);
      if (!target) {
        return res.status(404).json({ success: false, error: 'Window system not found.' });
      }
      if (target.usesLegacySlidingEngine) {
        return res.status(400).json({
          success: false,
          error: 'Core verified 2-Track and 3-Track systems cannot be deleted. You can disable them instead.',
        });
      }

      db.windowSystems = list.filter((s) => s.id !== targetId);
      saveDb(db);

      return res.json({
        success: true,
        deletedId: targetId,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to delete window system.',
      });
    }
  });
}
