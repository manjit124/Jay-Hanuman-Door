import type {
  FabricationProfile,
  WindowCuttingMeasurementRow,
  WindowMaterialSummaryItem,
  WindowMeasurementUnit,
  WindowProfileSeriesConfig,
  WindowSystemCalculationInput,
  WindowSystemCalculationResult,
  WindowSystemDefinition,
} from '../types.ts';
import { createDefaultFabricationProfiles } from '../data/slidingWindowDefaults.ts';
import {
  calculateSlidingWindowFabrication,
  roundPrecision,
  toInches,
} from './slidingWindowEngine.ts';
import {
  formatInchDecimal,
  formatInchFraction,
} from './slidingWindowMeasurements.ts';

const MM_PER_INCH = 25.4;

function buildLinearRow(params: {
  id: string;
  name: string;
  category: WindowCuttingMeasurementRow['category'];
  sectionSpec?: string;
  lengthInch: number;
  piecesPerWindow: number;
  quantity: number;
  formulaSummary: string;
  notes?: string;
}): WindowCuttingMeasurementRow {
  const len = roundPrecision(params.lengthInch, 4);
  return {
    id: params.id,
    name: params.name,
    category: params.category,
    sectionSpec: params.sectionSpec,
    lengthInch: len,
    lengthDecimalFormatted: `${formatInchDecimal(len)}"`,
    lengthFractionFormatted: formatInchFraction(len, true),
    lengthMm: roundPrecision(len * MM_PER_INCH, 1),
    isTwoDimensional: false,
    piecesPerWindow: params.piecesPerWindow,
    totalPieces: params.piecesPerWindow * params.quantity,
    formulaSummary: params.formulaSummary,
    notes: params.notes,
  };
}

function buildPanelRow(params: {
  id: string;
  name: string;
  category: 'glass' | 'mosquito_net';
  sectionSpec?: string;
  widthInch: number;
  heightInch: number;
  piecesPerWindow: number;
  quantity: number;
  formulaSummary: string;
  notes?: string;
}): WindowCuttingMeasurementRow {
  const w = roundPrecision(params.widthInch, 4);
  const h = roundPrecision(params.heightInch, 4);
  return {
    id: params.id,
    name: params.name,
    category: params.category,
    sectionSpec: params.sectionSpec,
    lengthInch: w,
    lengthDecimalFormatted: `${formatInchDecimal(w)}" × ${formatInchDecimal(h)}"`,
    lengthFractionFormatted:
      formatInchFraction(w, true) || formatInchFraction(h, true)
        ? `${formatInchFraction(w, true) || `${formatInchDecimal(w)}"`} × ${formatInchFraction(h, true) || `${formatInchDecimal(h)}"`}`
        : null,
    lengthMm: roundPrecision(w * MM_PER_INCH, 1),
    isTwoDimensional: true,
    widthInch: w,
    widthDecimalFormatted: `${formatInchDecimal(w)}"`,
    widthFractionFormatted: formatInchFraction(w, true),
    widthMm: roundPrecision(w * MM_PER_INCH, 1),
    heightInch: h,
    heightDecimalFormatted: `${formatInchDecimal(h)}"`,
    heightFractionFormatted: formatInchFraction(h, true),
    heightMm: roundPrecision(h * MM_PER_INCH, 1),
    piecesPerWindow: params.piecesPerWindow,
    totalPieces: params.piecesPerWindow * params.quantity,
    formulaSummary: params.formulaSummary,
    notes: params.notes,
  };
}

function buildMaterialSummary(
  aluminiumSections: WindowCuttingMeasurementRow[],
  glassCutting: WindowCuttingMeasurementRow[],
  mosquitoNetCutting: WindowCuttingMeasurementRow[]
): WindowMaterialSummaryItem[] {
  const summary: WindowMaterialSummaryItem[] = [];

  for (const row of aluminiumSections) {
    const runningIn = roundPrecision(row.lengthInch * row.totalPieces, 3);
    summary.push({
      id: `sum-${row.id}`,
      name: row.name,
      category: row.category,
      sectionSpec: row.sectionSpec,
      cutSizeDisplay: row.lengthFractionFormatted
        ? `${row.lengthDecimalFormatted} (${row.lengthFractionFormatted})`
        : row.lengthDecimalFormatted,
      totalPieces: row.totalPieces,
      totalRunningInches: runningIn,
      totalRunningFeet: roundPrecision(runningIn / 12, 2),
    });
  }

  for (const row of [...glassCutting, ...mosquitoNetCutting]) {
    const w = row.widthInch || 0;
    const h = row.heightInch || 0;
    const sqFt = roundPrecision(((w * h) / 144) * row.totalPieces, 2);
    summary.push({
      id: `sum-${row.id}`,
      name: row.name,
      category: row.category,
      sectionSpec: row.sectionSpec,
      cutSizeDisplay: `${row.widthDecimalFormatted} × ${row.heightDecimalFormatted}`,
      totalPieces: row.totalPieces,
      totalAreaSqFt: sqFt,
    });
  }

  return summary;
}

function makeBaseInputSnapshot(
  input: WindowSystemCalculationInput
): WindowSystemCalculationResult['input'] {
  const unit: WindowMeasurementUnit = input.unit || 'inch';
  const widthInch = Number.isFinite(input.width) ? roundPrecision(toInches(input.width, unit), 4) : 0;
  const heightInch = Number.isFinite(input.height) ? roundPrecision(toInches(input.height, unit), 4) : 0;
  return {
    windowLabel: (input.windowLabel || 'W-1').trim() || 'W-1',
    width: Number(input.width) || 0,
    height: Number(input.height) || 0,
    unit,
    widthInch,
    heightInch,
    widthDecimalFormatted: `${formatInchDecimal(widthInch)}"`,
    widthFractionFormatted: formatInchFraction(widthInch, true),
    heightDecimalFormatted: `${formatInchDecimal(heightInch)}"`,
    heightFractionFormatted: formatInchFraction(heightInch, true),
    widthMm: roundPrecision(widthInch * MM_PER_INCH, 1),
    heightMm: roundPrecision(heightInch * MM_PER_INCH, 1),
    quantity: Math.max(1, Math.floor(Number(input.quantity) || 1)),
    trackCount: Math.max(1, Math.floor(Number(input.trackCount) || 2)),
    shutterCount: Math.max(1, Math.floor(Number(input.shutterCount) || 2)),
    includeMosquitoNet: Boolean(input.includeMosquitoNet),
    glassThickness: input.glassThickness || '5mm Clear / Toughened',
  };
}

function hasAnyNumericValue(val: number | null | undefined): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Unified Configurable Indian Aluminium Window Cutting Calculation Engine.
 *
 * STRICT GUARANTEES:
 * 1. For 2-Track and 3-Track Sliding Windows (`usesLegacySlidingEngine`), delegates
 *    100% unchanged to the existing verified `calculateSlidingWindowFabrication` engine.
 * 2. For 4-Track, 18/50, Dhumal, and all other window systems, NEVER fabricates or
 *    guesses cutting deductions. If the selected profile series is not configured by Admin
 *    and the user has not explicitly supplied custom deductions, returns
 *    `status: 'setup_required'` with zero assumed numbers.
 */
export function calculateWindowSystemCutting(
  system: WindowSystemDefinition,
  input: WindowSystemCalculationInput
): WindowSystemCalculationResult {
  const calculatedAt = new Date().toISOString();
  const inputSnap = makeBaseInputSnapshot(input);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isFinite(input.width) || input.width <= 0) {
    errors.push('Window Width must be greater than 0.');
  }
  if (!Number.isFinite(input.height) || input.height <= 0) {
    errors.push('Window Height must be greater than 0.');
  }
  if (!Number.isFinite(inputSnap.quantity) || inputSnap.quantity < 1) {
    errors.push('Window Quantity must be at least 1.');
  }

  const selectedSeries: WindowProfileSeriesConfig | undefined =
    system.profileSeries.find((p) => p.id === input.profileSeriesId) || system.profileSeries[0];

  if (errors.length > 0) {
    return {
      status: 'invalid',
      errors,
      warnings,
      systemId: system.id,
      systemName: system.name,
      categoryId: system.categoryId,
      profileSeriesName: selectedSeries?.name || 'Default Series',
      formulaSource: 'unconfigured',
      input: inputSnap,
      aluminiumSections: [],
      glassCutting: [],
      mosquitoNetCutting: [],
      materialSummary: [],
      calculatedAt,
    };
  }

  // =========================================================================
  // PATH 1: EXISTING VERIFIED 2-TRACK & 3-TRACK SLIDING WINDOW ENGINE (UNCHANGED)
  // =========================================================================
  if (
    (system.usesLegacySlidingEngine === '2-track' || system.usesLegacySlidingEngine === '3-track') &&
    !input.customDeductions?.enabled
  ) {
    const trackType = system.usesLegacySlidingEngine;
    const defaultProfiles = createDefaultFabricationProfiles('windowcut-default');
    const fallbackLegacyProfile =
      defaultProfiles.find((p) => p.trackType === trackType) || defaultProfiles[0];

    const activeLegacyProfile: FabricationProfile =
      input.legacyProfile && input.legacyProfile.trackType === trackType
        ? input.legacyProfile
        : fallbackLegacyProfile;

    // Respect shutter count cleanly if user picked 3 shutters on verified 2-track/3-track
    const effectiveProfile: FabricationProfile =
      inputSnap.shutterCount !== activeLegacyProfile.glassPanelCount
        ? {
            ...activeLegacyProfile,
            glassPanelCount: inputSnap.shutterCount,
            glassWidthDivisor: inputSnap.shutterCount,
            panelArrangements: [
              ...Array.from({ length: inputSnap.shutterCount }, (_, idx) => ({
                id: `glass-panel-${idx + 1}`,
                label: `Glass Panel ${idx + 1}`,
                panelType: 'glass' as const,
                widthDivisor: inputSnap.shutterCount,
                extraWidthAdjustment: 0,
                extraWidthOperator: '+' as const,
                extraHeightAdjustment: 0,
                extraHeightOperator: '-' as const,
                adjustmentUnit: 'inch' as const,
              })),
              ...(inputSnap.includeMosquitoNet
                ? [
                    {
                      id: 'mosquito-net-1',
                      label: 'Mosquito Net Panel 1',
                      panelType: 'mosquito_net' as const,
                      widthDivisor: activeLegacyProfile.mosquitoNetWidthDivisor || 2,
                      extraWidthAdjustment: 0,
                      extraWidthOperator: '+' as const,
                      extraHeightAdjustment: 0,
                      extraHeightOperator: '-' as const,
                      adjustmentUnit: 'inch' as const,
                    },
                  ]
                : []),
            ],
          }
        : activeLegacyProfile;

    const legacyResult = calculateSlidingWindowFabrication(
      {
        id: 'ws-calc-1',
        windowNumber: inputSnap.windowLabel,
        width: input.width,
        height: input.height,
        unit: input.unit,
        trackType,
        configuration:
          trackType === '3-track' && inputSnap.includeMosquitoNet
            ? `${inputSnap.shutterCount} Glass + 1 Mosquito Net`
            : `${inputSnap.shutterCount} Glass Panels`,
        glassThickness: inputSnap.glassThickness,
        mosquitoNetRequired: trackType === '3-track' ? inputSnap.includeMosquitoNet : false,
        profileId: effectiveProfile.id,
      },
      effectiveProfile
    );

    if (!legacyResult.isValid) {
      return {
        status: 'invalid',
        errors: legacyResult.errors,
        warnings: legacyResult.warnings,
        systemId: system.id,
        systemName: system.name,
        categoryId: system.categoryId,
        profileSeriesName: effectiveProfile.name,
        formulaSource: 'verified_legacy_sliding',
        input: inputSnap,
        aluminiumSections: [],
        glassCutting: [],
        mosquitoNetCutting: [],
        materialSummary: [],
        calculatedAt,
      };
    }

    const qty = inputSnap.quantity;
    const totalShutters = inputSnap.shutterCount + (legacyResult.mosquitoNetPanels.length > 0 ? 1 : 0);

    const aluminiumSections: WindowCuttingMeasurementRow[] = [
      buildLinearRow({
        id: 'top-track',
        name: 'Top Track',
        category: 'top_track',
        sectionSpec: `${trackType.toUpperCase()} Top Track`,
        lengthInch: legacyResult.fabrication.topTrackInch,
        piecesPerWindow: 1,
        quantity: qty,
        formulaSummary: `Window Width (${inputSnap.widthDecimalFormatted})`,
      }),
      buildLinearRow({
        id: 'bottom-track',
        name: 'Bottom Track',
        category: 'bottom_track',
        sectionSpec: `${trackType.toUpperCase()} Bottom Track`,
        lengthInch: legacyResult.fabrication.bottomTrackInch,
        piecesPerWindow: 1,
        quantity: qty,
        formulaSummary: `Window Width (${inputSnap.widthDecimalFormatted})`,
      }),
      buildLinearRow({
        id: 'side-frame',
        name: 'Side Frame (Outer Vertical)',
        category: 'side_frame',
        sectionSpec: `${trackType.toUpperCase()} Side Frame`,
        lengthInch: inputSnap.heightInch,
        piecesPerWindow: 2,
        quantity: qty,
        formulaSummary: `Window Height (${inputSnap.heightDecimalFormatted}) × 2 sides`,
      }),
      buildLinearRow({
        id: 'handle-section',
        name: 'Handle Section',
        category: 'handle',
        sectionSpec: 'Shutter Vertical Handle',
        lengthInch: legacyResult.fabrication.handleInch,
        piecesPerWindow: totalShutters,
        quantity: qty,
        formulaSummary: `Height (${inputSnap.heightDecimalFormatted}) - ${formatInchDecimal(effectiveProfile.rules.handleHeightDeduction.value)}"`,
      }),
      buildLinearRow({
        id: 'interlock-section',
        name: 'Interlock Section',
        category: 'interlock',
        sectionSpec: 'Shutter Vertical Interlock',
        lengthInch: legacyResult.fabrication.interlockInch,
        piecesPerWindow: totalShutters,
        quantity: qty,
        formulaSummary: `Height (${inputSnap.heightDecimalFormatted}) - ${formatInchDecimal(effectiveProfile.rules.interlockHeightDeduction.value)}"`,
      }),
      buildLinearRow({
        id: 'top-bearing',
        name: 'Top Track (T.B.) Bearing Section',
        category: 'bearing',
        sectionSpec: 'Shutter Top Bearing Rail',
        lengthInch: legacyResult.fabrication.topBearingInch,
        piecesPerWindow: totalShutters,
        quantity: qty,
        formulaSummary: `(W - ${formatInchDecimal(effectiveProfile.rules.bearingWidthDeduction.value)}") / ${effectiveProfile.bearingDivisor || 2}`,
      }),
      buildLinearRow({
        id: 'bottom-bearing',
        name: 'Bottom Track (T.B.) Bearing Section',
        category: 'bearing',
        sectionSpec: 'Shutter Bottom Bearing Rail',
        lengthInch: legacyResult.fabrication.bottomBearingInch,
        piecesPerWindow: totalShutters,
        quantity: qty,
        formulaSummary: `(W - ${formatInchDecimal(effectiveProfile.rules.bearingWidthDeduction.value)}") / ${effectiveProfile.bearingDivisor || 2}`,
      }),
    ];

    const glassCutting: WindowCuttingMeasurementRow[] = legacyResult.glassPanels.map((panel, idx) =>
      buildPanelRow({
        id: `glass-${idx + 1}`,
        name: panel.label,
        category: 'glass',
        sectionSpec: inputSnap.glassThickness,
        widthInch: panel.widthInch,
        heightInch: panel.heightInch,
        piecesPerWindow: 1,
        quantity: qty,
        formulaSummary: `Verified ${trackType} glass formula`,
      })
    );

    const mosquitoNetCutting: WindowCuttingMeasurementRow[] = legacyResult.mosquitoNetPanels.map(
      (panel, idx) =>
        buildPanelRow({
          id: `mosquito-net-${idx + 1}`,
          name: `${panel.label} (Mosquito Net Frame & Mesh)`,
          category: 'mosquito_net',
          sectionSpec: '3-Track Mosquito Mesh Shutter',
          widthInch: panel.widthInch,
          heightInch: panel.heightInch,
          piecesPerWindow: 1,
          quantity: qty,
          formulaSummary: 'Verified 3-track mosquito net formula',
        })
    );

    return {
      status: 'calculated',
      errors: [],
      warnings: legacyResult.warnings,
      systemId: system.id,
      systemName: system.name,
      categoryId: system.categoryId,
      profileSeriesName: effectiveProfile.name,
      formulaSource: 'verified_legacy_sliding',
      input: inputSnap,
      aluminiumSections,
      glassCutting,
      mosquitoNetCutting,
      materialSummary: buildMaterialSummary(aluminiumSections, glassCutting, mosquitoNetCutting),
      calculatedAt,
    };
  }

  // =========================================================================
  // PATH 2: CONFIGURABLE ENGINE FOR 4-TRACK, 18/50, DHUMAL & SPECIAL SYSTEMS
  // =========================================================================
  const useCustom = Boolean(input.customDeductions?.enabled);
  const seriesConfigured = Boolean(system.formulaConfigured && selectedSeries?.isConfigured);

  if (!useCustom && !seriesConfigured) {
    return {
      status: 'setup_required',
      setupMessage: `Cutting rules for ${system.name} are not configured yet. WindowCut Pro never uses assumed or fabricated deductions. Configure exact section deductions in Admin Panel → Window Systems & Formulas, or enter your workshop's custom deductions below.`,
      errors: [],
      warnings,
      systemId: system.id,
      systemName: system.name,
      categoryId: system.categoryId,
      profileSeriesName: selectedSeries?.name || 'Setup Required',
      formulaSource: 'unconfigured',
      input: inputSnap,
      aluminiumSections: [],
      glassCutting: [],
      mosquitoNetCutting: [],
      materialSummary: [],
      calculatedAt,
    };
  }

  const c = input.customDeductions;
  const s = selectedSeries;
  const W = inputSnap.widthInch;
  const H = inputSnap.heightInch;
  const qty = inputSnap.quantity;
  const shutters = inputSnap.shutterCount;

  const getRulePair = (
    customDed: number | undefined,
    customAdd: number | undefined,
    seriesDed: number | null | undefined,
    seriesAdd: number | null | undefined
  ): { present: boolean; ded: number; add: number } => {
    if (useCustom && c) {
      return {
        present: true,
        ded: Number.isFinite(customDed) ? Number(customDed) : 0,
        add: Number.isFinite(customAdd) ? Number(customAdd) : 0,
      };
    }
    if (hasAnyNumericValue(seriesDed) || hasAnyNumericValue(seriesAdd)) {
      return {
        present: true,
        ded: hasAnyNumericValue(seriesDed) ? seriesDed : 0,
        add: hasAnyNumericValue(seriesAdd) ? seriesAdd : 0,
      };
    }
    return { present: false, ded: 0, add: 0 };
  };

  const aluminiumSections: WindowCuttingMeasurementRow[] = [];
  const glassCutting: WindowCuttingMeasurementRow[] = [];
  const mosquitoNetCutting: WindowCuttingMeasurementRow[] = [];

  const fmtAdj = (ded: number, add: number): string => {
    const parts: string[] = [];
    if (ded !== 0) parts.push(`- ${formatInchDecimal(ded)}"`);
    if (add !== 0) parts.push(`+ ${formatInchDecimal(add)}"`);
    return parts.length > 0 ? ` ${parts.join(' ')}` : '';
  };

  // 1. Top Track / Top Outer Frame
  const topRule = getRulePair(
    c?.topTrackDeductionInch,
    c?.topTrackAdditionInch,
    s?.topTrackDeductionInch,
    s?.topTrackAdditionInch
  );
  if (topRule.present) {
    const len = roundPrecision(W - topRule.ded + topRule.add, 4);
    if (len <= 0) errors.push(`Top Track / Frame cut size is non-positive (${formatInchDecimal(len)}").`);
    aluminiumSections.push(
      buildLinearRow({
        id: 'top-track',
        name: system.supportsTracks ? 'Top Track' : 'Top Outer Frame',
        category: 'top_track',
        sectionSpec: s?.sectionDimensions || undefined,
        lengthInch: len,
        piecesPerWindow: 1,
        quantity: qty,
        formulaSummary: `W (${inputSnap.widthDecimalFormatted})${fmtAdj(topRule.ded, topRule.add)}`,
      })
    );
  }

  // 2. Bottom Track / Bottom Outer Frame
  const botRule = getRulePair(
    c?.bottomTrackDeductionInch,
    c?.bottomTrackAdditionInch,
    s?.bottomTrackDeductionInch,
    s?.bottomTrackAdditionInch
  );
  if (botRule.present) {
    const len = roundPrecision(W - botRule.ded + botRule.add, 4);
    if (len <= 0) errors.push(`Bottom Track / Frame cut size is non-positive (${formatInchDecimal(len)}").`);
    aluminiumSections.push(
      buildLinearRow({
        id: 'bottom-track',
        name: system.supportsTracks ? 'Bottom Track' : 'Bottom Outer Frame',
        category: 'bottom_track',
        sectionSpec: s?.sectionDimensions || undefined,
        lengthInch: len,
        piecesPerWindow: 1,
        quantity: qty,
        formulaSummary: `W (${inputSnap.widthDecimalFormatted})${fmtAdj(botRule.ded, botRule.add)}`,
      })
    );
  }

  // 3. Side Frame
  const sideRule = getRulePair(
    c?.sideFrameDeductionInch,
    c?.sideFrameAdditionInch,
    s?.sideFrameDeductionInch,
    s?.sideFrameAdditionInch
  );
  if (sideRule.present) {
    const len = roundPrecision(H - sideRule.ded + sideRule.add, 4);
    if (len <= 0) errors.push(`Side Frame cut size is non-positive (${formatInchDecimal(len)}").`);
    aluminiumSections.push(
      buildLinearRow({
        id: 'side-frame',
        name: 'Side Frame',
        category: 'side_frame',
        sectionSpec: s?.sectionDimensions || undefined,
        lengthInch: len,
        piecesPerWindow: 2,
        quantity: qty,
        formulaSummary: `H (${inputSnap.heightDecimalFormatted})${fmtAdj(sideRule.ded, sideRule.add)}`,
      })
    );
  }

  // 4. Handle Section
  const handleRule = getRulePair(
    c?.handleDeductionInch,
    c?.handleAdditionInch,
    s?.handleDeductionInch,
    s?.handleAdditionInch
  );
  let handleHeightInch = H;
  if (handleRule.present) {
    const len = roundPrecision(H - handleRule.ded + handleRule.add, 4);
    handleHeightInch = len;
    if (len <= 0) errors.push(`Handle Section cut size is non-positive (${formatInchDecimal(len)}").`);
    aluminiumSections.push(
      buildLinearRow({
        id: 'handle-section',
        name: 'Handle Section',
        category: 'handle',
        sectionSpec: s?.code || undefined,
        lengthInch: len,
        piecesPerWindow: shutters + (inputSnap.includeMosquitoNet && system.supportsTracks ? 1 : 0),
        quantity: qty,
        formulaSummary: `H (${inputSnap.heightDecimalFormatted})${fmtAdj(handleRule.ded, handleRule.add)}`,
      })
    );
  }

  // 5. Interlock Section
  const interlockRule = getRulePair(
    c?.interlockDeductionInch,
    c?.interlockAdditionInch,
    s?.interlockDeductionInch,
    s?.interlockAdditionInch
  );
  if (interlockRule.present) {
    const len = roundPrecision(H - interlockRule.ded + interlockRule.add, 4);
    if (len <= 0) errors.push(`Interlock Section cut size is non-positive (${formatInchDecimal(len)}").`);
    aluminiumSections.push(
      buildLinearRow({
        id: 'interlock-section',
        name: 'Interlock Section',
        category: 'interlock',
        sectionSpec: s?.code || undefined,
        lengthInch: len,
        piecesPerWindow: shutters + (inputSnap.includeMosquitoNet && system.supportsTracks ? 1 : 0),
        quantity: qty,
        formulaSummary: `H (${inputSnap.heightDecimalFormatted})${fmtAdj(interlockRule.ded, interlockRule.add)}`,
      })
    );
  }

  // 6. Additional Admin-Configured Aluminium Section Rules
  if (s && Array.isArray(s.additionalSections)) {
    for (const rule of s.additionalSections) {
      if (rule.requiresMosquitoNet && !inputSnap.includeMosquitoNet) continue;

      let baseVal = W;
      let baseLabel = `W (${inputSnap.widthDecimalFormatted})`;
      if (rule.baseDimension === 'height') {
        baseVal = H;
        baseLabel = `H (${inputSnap.heightDecimalFormatted})`;
      } else if (rule.baseDimension === 'height_minus_handle') {
        baseVal = handleHeightInch;
        baseLabel = `Handle H (${formatInchDecimal(handleHeightInch)}")`;
      }

      const divisor = rule.useShutterCountAsDivisor
        ? shutters
        : Math.max(1, Number(rule.divisor) || 1);
      const ded = Number.isFinite(rule.minusDeductionInch) ? rule.minusDeductionInch : 0;
      const add = Number.isFinite(rule.plusAdditionInch) ? rule.plusAdditionInch : 0;

      const computed = roundPrecision((baseVal - ded) / divisor + add, 4);
      if (computed <= 0) {
        errors.push(`${rule.name} produced a non-positive cutting size (${formatInchDecimal(computed)}").`);
      }

      const pcsPerWin =
        Math.max(1, Math.floor(Number(rule.piecesPerWindow) || 1)) *
        (rule.multiplyPiecesByShutters ? shutters : 1);

      const expr =
        divisor > 1
          ? `(${baseLabel}${ded ? ` - ${formatInchDecimal(ded)}"` : ''}) / ${divisor}${add ? ` + ${formatInchDecimal(add)}"` : ''}`
          : `${baseLabel}${fmtAdj(ded, add)}`;

      aluminiumSections.push(
        buildLinearRow({
          id: `custom-sec-${rule.id}`,
          name: rule.name,
          category: rule.category || 'other',
          sectionSpec: rule.sectionDimensionSpec || rule.sectionCode || undefined,
          lengthInch: computed,
          piecesPerWindow: pcsPerWin,
          quantity: qty,
          formulaSummary: expr,
          notes: rule.notes,
        })
      );
    }
  }

  // 7. Glass Width & Glass Height
  const glassW = getRulePair(
    c?.glassWidthDeductionInch,
    c?.glassWidthAdditionInch,
    s?.glassWidthDeductionInch,
    s?.glassWidthAdditionInch
  );
  const glassH = getRulePair(
    c?.glassHeightDeductionInch,
    c?.glassHeightAdditionInch,
    s?.glassHeightDeductionInch,
    s?.glassHeightAdditionInch
  );
  if (glassW.present || glassH.present) {
    const gw = roundPrecision((W - glassW.ded) / shutters + glassW.add, 4);
    const gh = roundPrecision(H - glassH.ded + glassH.add, 4);
    if (gw <= 0 || gh <= 0) {
      errors.push(`Glass cutting size is non-positive (${formatInchDecimal(gw)}" × ${formatInchDecimal(gh)}").`);
    }
    glassCutting.push(
      buildPanelRow({
        id: 'glass-shutter',
        name: shutters > 1 ? `Glass Panel (${shutters} Shutters)` : 'Glass Panel',
        category: 'glass',
        sectionSpec: inputSnap.glassThickness,
        widthInch: gw,
        heightInch: gh,
        piecesPerWindow: shutters,
        quantity: qty,
        formulaSummary: `W: (W - ${formatInchDecimal(glassW.ded)}") / ${shutters}${glassW.add ? ` + ${formatInchDecimal(glassW.add)}"` : ''} · H: H - ${formatInchDecimal(glassH.ded)}"${glassH.add ? ` + ${formatInchDecimal(glassH.add)}"` : ''}`,
      })
    );
  }

  // 8. Mosquito Net Frame / Mesh
  if (inputSnap.includeMosquitoNet) {
    const netW = getRulePair(
      c?.mosquitoNetWidthDeductionInch,
      c?.mosquitoNetWidthAdditionInch,
      s?.mosquitoNetWidthDeductionInch,
      s?.mosquitoNetWidthAdditionInch
    );
    const netH = getRulePair(
      c?.mosquitoNetHeightDeductionInch,
      c?.mosquitoNetHeightAdditionInch,
      s?.mosquitoNetHeightDeductionInch,
      s?.mosquitoNetHeightAdditionInch
    );
    if (netW.present || netH.present) {
      const netDivisor = system.supportsTracks ? Math.max(1, shutters) : 1;
      const mw = roundPrecision((W - netW.ded) / netDivisor + netW.add, 4);
      const mh = roundPrecision(H - netH.ded + netH.add, 4);
      if (mw <= 0 || mh <= 0) {
        errors.push(`Mosquito Net cutting size is non-positive (${formatInchDecimal(mw)}" × ${formatInchDecimal(mh)}").`);
      }
      mosquitoNetCutting.push(
        buildPanelRow({
          id: 'mosquito-net-frame',
          name: 'Mosquito Net Frame & Mesh',
          category: 'mosquito_net',
          sectionSpec: 'Mosquito Net Shutter',
          widthInch: mw,
          heightInch: mh,
          piecesPerWindow: 1,
          quantity: qty,
          formulaSummary: `W: (W - ${formatInchDecimal(netW.ded)}") / ${netDivisor}${netW.add ? ` + ${formatInchDecimal(netW.add)}"` : ''} · H: H - ${formatInchDecimal(netH.ded)}"${netH.add ? ` + ${formatInchDecimal(netH.add)}"` : ''}`,
        })
      );
    } else {
      warnings.push('Mosquito Net is enabled, but mosquito net deductions are not configured on this profile series.');
    }
  }

  if (aluminiumSections.length === 0 && glassCutting.length === 0 && mosquitoNetCutting.length === 0) {
    return {
      status: 'setup_required',
      setupMessage: `Profile series "${selectedSeries?.name || 'Default'}" has no active section deduction rules configured yet.`,
      errors: [],
      warnings,
      systemId: system.id,
      systemName: system.name,
      categoryId: system.categoryId,
      profileSeriesName: selectedSeries?.name || 'Unconfigured Series',
      formulaSource: 'unconfigured',
      input: inputSnap,
      aluminiumSections: [],
      glassCutting: [],
      mosquitoNetCutting: [],
      materialSummary: [],
      calculatedAt,
    };
  }

  if (errors.length > 0) {
    return {
      status: 'invalid',
      errors,
      warnings,
      systemId: system.id,
      systemName: system.name,
      categoryId: system.categoryId,
      profileSeriesName: useCustom ? 'Custom Workshop Deductions' : selectedSeries?.name || 'Configured Series',
      formulaSource: useCustom ? 'user_custom_deductions' : 'admin_configured',
      input: inputSnap,
      aluminiumSections: [],
      glassCutting: [],
      mosquitoNetCutting: [],
      materialSummary: [],
      calculatedAt,
    };
  }

  return {
    status: 'calculated',
    errors: [],
    warnings,
    systemId: system.id,
    systemName: system.name,
    categoryId: system.categoryId,
    profileSeriesName: useCustom ? 'Custom Workshop Deductions' : selectedSeries?.name || 'Configured Series',
    formulaSource: useCustom ? 'user_custom_deductions' : 'admin_configured',
    input: inputSnap,
    aluminiumSections,
    glassCutting,
    mosquitoNetCutting,
    materialSummary: buildMaterialSummary(aluminiumSections, glassCutting, mosquitoNetCutting),
    calculatedAt,
  };
}
