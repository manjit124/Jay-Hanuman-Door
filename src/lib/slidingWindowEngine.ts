import type {
  CalculatedPanelDimension,
  CalculationFormulaStep,
  FabricationProfile,
  FabricationRuleKey,
  FabricationRuleSetting,
  PanelArrangementRule,
  RuleOperator,
  SlidingWindowCalculationResult,
  SlidingWindowInput,
  WindowMeasurementUnit,
} from '../types.ts';

import {
  OFFICIAL_INCH_FRACTION_TABLE,
  convertFractionToFormattedInchDecimal,
  formatInchDecimal,
  formatInchFraction,
  formatInchWithFraction,
  formatRuleNumber,
  parseMeasurementInput,
} from './slidingWindowMeasurements.ts';

export {
  OFFICIAL_INCH_FRACTION_TABLE,
  convertFractionToFormattedInchDecimal,
  formatInchDecimal,
  formatInchFraction,
  formatInchWithFraction,
  formatRuleNumber,
  parseMeasurementInput,
};

const INCH_PER_FOOT = 12;
const MM_PER_INCH = 25.4;

/**
 * Round to 4 decimal places to eliminate IEEE-754 floating-point artifacts
 * while preserving full fabrication precision (e.g. 0.0625", 14.875", 36.500").
 */
export function roundPrecision(value: number, decimals = 4): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatMeasurement(value: number, unit: WindowMeasurementUnit): string {
  if (!Number.isFinite(value)) return '—';
  if (unit === 'inch') {
    return `${formatInchDecimal(value)}"`;
  }
  const rounded = unit === 'mm' ? roundPrecision(value, 1) : roundPrecision(value, 3);
  const suffix = unit === 'feet' ? ' ft' : ' mm';
  return `${rounded}${suffix}`;
}

export function formatMeasurementWithFraction(value: number, unit: WindowMeasurementUnit): string {
  if (!Number.isFinite(value)) return '—';
  if (unit === 'inch') {
    return formatInchWithFraction(value);
  }
  return formatMeasurement(value, unit);
}

export function toInches(value: number, unit: WindowMeasurementUnit): number {
  if (!Number.isFinite(value)) return NaN;
  if (unit === 'feet') return value * INCH_PER_FOOT;
  if (unit === 'mm') return value / MM_PER_INCH;
  return value;
}

export function fromInches(inches: number, targetUnit: WindowMeasurementUnit): number {
  if (!Number.isFinite(inches)) return NaN;
  if (targetUnit === 'feet') return roundPrecision(inches / INCH_PER_FOOT, 4);
  if (targetUnit === 'mm') return roundPrecision(inches * MM_PER_INCH, 2);
  return roundPrecision(inches, 4);
}

function applySignedRule(baseInches: number, rule: FabricationRuleSetting): {
  resultInch: number;
  deltaInch: number;
  signedExpr: string;
} {
  const magnitudeInch = toInches(Math.abs(rule.value), rule.unit);
  const deltaInch = rule.operator === '+' ? magnitudeInch : -magnitudeInch;
  const resultInch = roundPrecision(baseInches + deltaInch, 4);
  const signSymbol = rule.operator === '+' ? '+' : '-';
  const formattedRuleMag = formatRuleNumber(Math.abs(rule.value), rule.unit);
  const signedExpr =
    rule.unit === 'inch'
      ? `${signSymbol} ${formattedRuleMag}"`
      : `${signSymbol} ${formattedRuleMag} ${rule.unit}`;
  return { resultInch, deltaInch, signedExpr };
}

function applyPanelAdjustment(
  baseInches: number,
  amount: number,
  operator: RuleOperator,
  unit: WindowMeasurementUnit
): { resultInch: number; applied: boolean; expr: string } {
  if (!Number.isFinite(amount) || amount === 0) {
    return { resultInch: roundPrecision(baseInches, 4), applied: false, expr: '' };
  }
  const magnitudeInch = toInches(Math.abs(amount), unit);
  const delta = operator === '+' ? magnitudeInch : -magnitudeInch;
  const formattedAmt = formatRuleNumber(Math.abs(amount), unit);
  return {
    resultInch: roundPrecision(baseInches + delta, 4),
    applied: true,
    expr: unit === 'inch' ? `${operator} ${formattedAmt}"` : `${operator} ${formattedAmt} ${unit}`,
  };
}

function validateRulePresence(
  profile: FabricationProfile,
  requiredKeys: FabricationRuleKey[]
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!profile || !profile.rules) {
    errors.push('Selected fabrication profile is missing rule definitions. Configure or select a valid profile.');
    return { errors, warnings };
  }

  for (const key of requiredKeys) {
    const rule = profile.rules[key];
    if (!rule) {
      errors.push(`Missing required profile rule: "${key}". Please configure this rule in Fabrication Settings.`);
      continue;
    }
    if (typeof rule.value !== 'number' || !Number.isFinite(rule.value) || rule.value < 0) {
      errors.push(`Invalid value for "${rule.name || key}". Enter a valid non-negative number in Fabrication Settings.`);
    }
    if (rule.operator !== '+' && rule.operator !== '-') {
      errors.push(`Missing plus/minus operator for "${rule.name || key}".`);
    }
    if (rule.unit !== 'inch' && rule.unit !== 'feet' && rule.unit !== 'mm') {
      errors.push(`Missing measurement unit for "${rule.name || key}".`);
    }
  }

  if (!Number.isFinite(profile.glassWidthDivisor) || profile.glassWidthDivisor <= 0) {
    errors.push('Glass panel width divisor must be greater than 0 in the active profile.');
  }

  if (
    profile.trackType === '3-track' &&
    (!Number.isFinite(profile.mosquitoNetWidthDivisor) || profile.mosquitoNetWidthDivisor <= 0)
  ) {
    errors.push('Mosquito net width divisor must be greater than 0 in the active 3-track profile.');
  }

  if (
    profile.bearingDivisor !== undefined &&
    (!Number.isFinite(profile.bearingDivisor) || profile.bearingDivisor <= 0)
  ) {
    errors.push('Bearing width divisor must be greater than 0 in the active profile.');
  }

  return { errors, warnings };
}

function makeStep(
  label: string,
  formula: string,
  valueInch: number,
  displayUnit: WindowMeasurementUnit
): CalculationFormulaStep {
  return {
    label,
    formula,
    valueInch: roundPrecision(valueInch, 4),
    valueDisplay: fromInches(valueInch, displayUnit),
    unit: displayUnit,
  };
}

/**
 * Independent, Pure Sliding Window Fabrication Calculation Engine.
 *
 * Strictly driven by the passed FabricationProfile — zero hardcoded deduction
 * or addition constants exist inside this engine.
 *
 * If any required profile rule is missing, invalid, or produces a non-positive
 * cutting size, returns `isValid: false` with detailed errors/warnings and never
 * fabricates unverified dimensions.
 */
export function calculateSlidingWindowFabrication(
  input: SlidingWindowInput,
  profile: FabricationProfile | null | undefined
): SlidingWindowCalculationResult {
  const displayUnit: WindowMeasurementUnit = input.unit || 'inch';
  const calculatedAt = new Date().toISOString();

  const buildInvalidResult = (errors: string[], warnings: string[] = []): SlidingWindowCalculationResult => ({
    windowId: input.id,
    windowNumber: input.windowNumber || 'W-1',
    isValid: false,
    errors,
    warnings,
    displayUnit,
    original: {
      width: Number(input.width) || 0,
      height: Number(input.height) || 0,
      unit: displayUnit,
      widthInch: Number.isFinite(Number(input.width)) ? roundPrecision(toInches(Number(input.width), displayUnit), 4) : 0,
      heightInch: Number.isFinite(Number(input.height)) ? roundPrecision(toInches(Number(input.height), displayUnit), 4) : 0,
      widthMm: Number.isFinite(Number(input.width)) ? roundPrecision(toInches(Number(input.width), displayUnit) * MM_PER_INCH, 2) : 0,
      heightMm: Number.isFinite(Number(input.height)) ? roundPrecision(toInches(Number(input.height), displayUnit) * MM_PER_INCH, 2) : 0,
      trackType: input.trackType,
      configuration: input.configuration,
      glassThickness: input.glassThickness,
      mosquitoNetRequired: Boolean(input.mosquitoNetRequired),
    },
    profileUsed: {
      id: profile?.id || '',
      name: profile?.name || 'Missing Profile',
      trackType: profile?.trackType || input.trackType,
    },
    fabrication: {
      topTrackInch: 0,
      topTrackDisplay: 0,
      topTrackMm: 0,
      bottomTrackInch: 0,
      bottomTrackDisplay: 0,
      bottomTrackMm: 0,
      handleInch: 0,
      handleDisplay: 0,
      handleMm: 0,
      interlockInch: 0,
      interlockDisplay: 0,
      interlockMm: 0,
      bearingRemainingInch: 0,
      bearingRemainingDisplay: 0,
      bearingRemainingMm: 0,
      topBearingInch: 0,
      topBearingDisplay: 0,
      topBearingMm: 0,
      bottomBearingInch: 0,
      bottomBearingDisplay: 0,
      bottomBearingMm: 0,
    },
    glassPanels: [],
    mosquitoNetPanels: [],
    breakdown: [],
    calculatedAt,
  });

  // 1. Validate Window Inputs
  const inputErrors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isFinite(input.width) || input.width <= 0) {
    inputErrors.push('Window Width must be a positive number greater than 0.');
  }
  if (!Number.isFinite(input.height) || input.height <= 0) {
    inputErrors.push('Window Height must be a positive number greater than 0.');
  }
  if (!profile) {
    inputErrors.push('No fabrication profile selected. Please choose or create a profile in Fabrication Settings.');
  }

  if (inputErrors.length > 0 || !profile) {
    return buildInvalidResult(inputErrors, warnings);
  }

  if (profile.trackType !== input.trackType) {
    warnings.push(
      `Window is set to "${input.trackType}" while profile "${profile.name}" is configured for "${profile.trackType}". Verify track rules before cutting.`
    );
  }

  const requiresMosquitoNet = Boolean(input.mosquitoNetRequired);
  if (input.trackType === '2-track' && requiresMosquitoNet) {
    warnings.push(
      'Mosquito Net is enabled on a 2-Track window. Confirm your aluminium section supports a mosquito net track or switch to 3-Track.'
    );
  }

  // 2. Validate Required Profile Rules (Never invent defaults if missing)
  const requiredRules: FabricationRuleKey[] = [
    'glassWidthDeduction',
    'glassWidthAddition',
    'glassHeightDeduction',
    'handleHeightDeduction',
    'interlockHeightDeduction',
    'topTrackAdjustment',
    'bottomTrackAdjustment',
    'bearingWidthDeduction',
    'topBearingAdjustment',
    'bottomBearingAdjustment',
  ];
  if (requiresMosquitoNet) {
    requiredRules.push(
      'mosquitoNetWidthDeduction',
      'mosquitoNetWidthAddition',
      'mosquitoNetHeightDeduction'
    );
  }

  const ruleCheck = validateRulePresence(profile, requiredRules);
  if (ruleCheck.errors.length > 0) {
    return buildInvalidResult(ruleCheck.errors, [...warnings, ...ruleCheck.warnings]);
  }
  warnings.push(...ruleCheck.warnings);

  const widthInch = roundPrecision(toInches(input.width, displayUnit), 4);
  const heightInch = roundPrecision(toInches(input.height, displayUnit), 4);
  const widthMm = roundPrecision(widthInch * MM_PER_INCH, 2);
  const heightMm = roundPrecision(heightInch * MM_PER_INCH, 2);

  const r = profile.rules;
  const breakdown: CalculationFormulaStep[] = [];

  const fmtIn = (v: number) => `${formatInchDecimal(v)}"`;

  // 3. Top Track & Bottom Track Cutting Sizes
  const topTrackCalc = applySignedRule(widthInch, r.topTrackAdjustment);
  const bottomTrackCalc = applySignedRule(widthInch, r.bottomTrackAdjustment);

  breakdown.push(
    makeStep(
      'Top Track Cutting Size',
      `${fmtIn(widthInch)} ${topTrackCalc.signedExpr} = ${fmtIn(topTrackCalc.resultInch)}`,
      topTrackCalc.resultInch,
      displayUnit
    ),
    makeStep(
      'Bottom Track Cutting Size',
      `${fmtIn(widthInch)} ${bottomTrackCalc.signedExpr} = ${fmtIn(bottomTrackCalc.resultInch)}`,
      bottomTrackCalc.resultInch,
      displayUnit
    )
  );

  // 4. Handle & Interlock Cutting Sizes (independently calculated)
  const handleCalc = applySignedRule(heightInch, r.handleHeightDeduction);
  const interlockCalc = applySignedRule(heightInch, r.interlockHeightDeduction);

  breakdown.push(
    makeStep(
      'Handle Cutting Size',
      `${fmtIn(heightInch)} ${handleCalc.signedExpr} = ${fmtIn(handleCalc.resultInch)}`,
      handleCalc.resultInch,
      displayUnit
    ),
    makeStep(
      'Interlock Cutting Size',
      `${fmtIn(heightInch)} ${interlockCalc.signedExpr} = ${fmtIn(interlockCalc.resultInch)}`,
      interlockCalc.resultInch,
      displayUnit
    )
  );

  // 4B. Bearing Measurement – Top Track (T.B.) & Bottom Track (T.B.)
  // Independent from Glass Width — never automatically added to Glass cutting dimensions.
  const bearingRemainingCalc = applySignedRule(widthInch, r.bearingWidthDeduction);
  const bearingDivisor =
    Number.isFinite(profile.bearingDivisor) && (profile.bearingDivisor ?? 0) > 0
      ? Number(profile.bearingDivisor)
      : 2;
  const baseBearingInch = roundPrecision(bearingRemainingCalc.resultInch / bearingDivisor, 4);
  const topBearingCalc = applySignedRule(baseBearingInch, r.topBearingAdjustment);
  const bottomBearingCalc = applySignedRule(baseBearingInch, r.bottomBearingAdjustment);

  const hasTopAdj = Math.abs(r.topBearingAdjustment.value) > 0;
  const hasBottomAdj = Math.abs(r.bottomBearingAdjustment.value) > 0;

  breakdown.push(
    makeStep(
      'Bearing Remaining Width (T.B. Base)',
      `${fmtIn(widthInch)} ${bearingRemainingCalc.signedExpr} = ${fmtIn(bearingRemainingCalc.resultInch)}`,
      bearingRemainingCalc.resultInch,
      displayUnit
    ),
    makeStep(
      'Top Track (T.B.) Bearing Measurement',
      hasTopAdj
        ? `(${fmtIn(bearingRemainingCalc.resultInch)} / ${bearingDivisor}) ${topBearingCalc.signedExpr} = ${fmtIn(topBearingCalc.resultInch)}`
        : `${fmtIn(bearingRemainingCalc.resultInch)} / ${bearingDivisor} = ${fmtIn(topBearingCalc.resultInch)}`,
      topBearingCalc.resultInch,
      displayUnit
    ),
    makeStep(
      'Bottom Track (T.B.) Bearing Measurement',
      hasBottomAdj
        ? `(${fmtIn(bearingRemainingCalc.resultInch)} / ${bearingDivisor}) ${bottomBearingCalc.signedExpr} = ${fmtIn(bottomBearingCalc.resultInch)}`
        : `${fmtIn(bearingRemainingCalc.resultInch)} / ${bearingDivisor} = ${fmtIn(bottomBearingCalc.resultInch)}`,
      bottomBearingCalc.resultInch,
      displayUnit
    )
  );

  // 5. Common Glass Width & Height Base Calculation
  const glassRemainingWidthCalc = applySignedRule(widthInch, r.glassWidthDeduction);
  const glassBaseHeightCalc = applySignedRule(handleCalc.resultInch, r.glassHeightDeduction);

  breakdown.push(
    makeStep(
      'Remaining Glass Track Width',
      `${fmtIn(widthInch)} ${glassRemainingWidthCalc.signedExpr} = ${fmtIn(glassRemainingWidthCalc.resultInch)}`,
      glassRemainingWidthCalc.resultInch,
      displayUnit
    )
  );

  // 6. Determine Panel Arrangements from Profile
  const definedGlassArrangements: PanelArrangementRule[] = (profile.panelArrangements || []).filter(
    p => p.panelType === 'glass'
  );
  const targetGlassCount = Math.max(1, Number(profile.glassPanelCount) || definedGlassArrangements.length || 2);
  const glassArrangements: PanelArrangementRule[] =
    definedGlassArrangements.length > 0
      ? definedGlassArrangements
      : Array.from({ length: targetGlassCount }, (_, idx) => ({
          id: `glass-panel-${idx + 1}`,
          label: `Glass Panel ${idx + 1}`,
          panelType: 'glass' as const,
          widthDivisor: profile.glassWidthDivisor,
          extraWidthAdjustment: 0,
          extraWidthOperator: '+' as const,
          extraHeightAdjustment: 0,
          extraHeightOperator: '-' as const,
          adjustmentUnit: 'inch' as const,
        }));

  const glassPanels: CalculatedPanelDimension[] = [];
  const calcErrors: string[] = [];

  for (const panel of glassArrangements) {
    const divisor = Number.isFinite(panel.widthDivisor) && panel.widthDivisor > 0
      ? panel.widthDivisor
      : profile.glassWidthDivisor;

    const panelSteps: CalculationFormulaStep[] = [];
    const basePanelWidthInch = roundPrecision(glassRemainingWidthCalc.resultInch / divisor, 4);
    panelSteps.push(
      makeStep(
        `${panel.label} Base Width`,
        `${fmtIn(glassRemainingWidthCalc.resultInch)} / ${divisor} = ${fmtIn(basePanelWidthInch)}`,
        basePanelWidthInch,
        displayUnit
      )
    );

    const afterGlassAdd = applySignedRule(basePanelWidthInch, r.glassWidthAddition);
    panelSteps.push(
      makeStep(
        `${panel.label} After Glass Width Addition`,
        `${fmtIn(basePanelWidthInch)} ${afterGlassAdd.signedExpr} = ${fmtIn(afterGlassAdd.resultInch)}`,
        afterGlassAdd.resultInch,
        displayUnit
      )
    );

    const panelWidthOverride = applyPanelAdjustment(
      afterGlassAdd.resultInch,
      panel.extraWidthAdjustment,
      panel.extraWidthOperator,
      panel.adjustmentUnit || 'inch'
    );
    if (panelWidthOverride.applied) {
      panelSteps.push(
        makeStep(
          `${panel.label} Individual Width Override`,
          `${fmtIn(afterGlassAdd.resultInch)} ${panelWidthOverride.expr} = ${fmtIn(panelWidthOverride.resultInch)}`,
          panelWidthOverride.resultInch,
          displayUnit
        )
      );
    }

    const panelHeightBaseStep = makeStep(
      `${panel.label} Height`,
      `${fmtIn(handleCalc.resultInch)} (Handle) ${glassBaseHeightCalc.signedExpr} = ${fmtIn(glassBaseHeightCalc.resultInch)}`,
      glassBaseHeightCalc.resultInch,
      displayUnit
    );
    panelSteps.push(panelHeightBaseStep);

    const panelHeightOverride = applyPanelAdjustment(
      glassBaseHeightCalc.resultInch,
      panel.extraHeightAdjustment,
      panel.extraHeightOperator,
      panel.adjustmentUnit || 'inch'
    );
    if (panelHeightOverride.applied) {
      panelSteps.push(
        makeStep(
          `${panel.label} Individual Height Override`,
          `${fmtIn(glassBaseHeightCalc.resultInch)} ${panelHeightOverride.expr} = ${fmtIn(panelHeightOverride.resultInch)}`,
          panelHeightOverride.resultInch,
          displayUnit
        )
      );
    }

    if (panelWidthOverride.resultInch <= 0 || panelHeightOverride.resultInch <= 0) {
      calcErrors.push(
        `${panel.label} produced a non-positive cutting size (${fmtIn(panelWidthOverride.resultInch)} × ${fmtIn(panelHeightOverride.resultInch)}). Check window dimensions or profile deductions.`
      );
    }

    glassPanels.push({
      id: panel.id,
      label: panel.label,
      panelType: 'glass',
      widthInch: panelWidthOverride.resultInch,
      heightInch: panelHeightOverride.resultInch,
      widthDisplay: fromInches(panelWidthOverride.resultInch, displayUnit),
      heightDisplay: fromInches(panelHeightOverride.resultInch, displayUnit),
      widthMm: roundPrecision(panelWidthOverride.resultInch * MM_PER_INCH, 2),
      heightMm: roundPrecision(panelHeightOverride.resultInch * MM_PER_INCH, 2),
      displayUnit,
      breakdown: panelSteps,
    });
  }

  // Add glass summary steps to global breakdown
  if (glassPanels.length > 0) {
    const firstGlass = glassPanels[0];
    const firstDivisor = glassArrangements[0].widthDivisor || profile.glassWidthDivisor;
    const firstBaseWidthInch = roundPrecision(glassRemainingWidthCalc.resultInch / firstDivisor, 4);
    const glassAddFormatted = formatRuleNumber(Math.abs(r.glassWidthAddition.value), r.glassWidthAddition.unit);
    const glassAddExpr =
      r.glassWidthAddition.unit === 'inch'
        ? `${r.glassWidthAddition.operator} ${glassAddFormatted}"`
        : `${r.glassWidthAddition.operator} ${glassAddFormatted} ${r.glassWidthAddition.unit}`;
    breakdown.push(
      makeStep(
        'Glass Base Panel Width',
        `${fmtIn(glassRemainingWidthCalc.resultInch)} / ${firstDivisor} = ${fmtIn(firstBaseWidthInch)}`,
        firstBaseWidthInch,
        displayUnit
      ),
      makeStep(
        'Final Glass Panel 1 Width',
        `${fmtIn(firstBaseWidthInch)} ${glassAddExpr} = ${fmtIn(firstGlass.widthInch)}`,
        firstGlass.widthInch,
        displayUnit
      ),
      makeStep(
        'Final Glass Panel 1 Height',
        `${fmtIn(handleCalc.resultInch)} ${glassBaseHeightCalc.signedExpr} = ${fmtIn(firstGlass.heightInch)}`,
        firstGlass.heightInch,
        displayUnit
      )
    );
  }

  // 7. Mosquito Net Panel Calculations (100% independent rules — never assumed equal to glass)
  const mosquitoNetPanels: CalculatedPanelDimension[] = [];
  if (requiresMosquitoNet) {
    const netRemainingWidthCalc = applySignedRule(widthInch, r.mosquitoNetWidthDeduction);
    const netBaseHeightCalc = applySignedRule(handleCalc.resultInch, r.mosquitoNetHeightDeduction);

    breakdown.push(
      makeStep(
        'Mosquito Net Remaining Width',
        `${fmtIn(widthInch)} ${netRemainingWidthCalc.signedExpr} = ${fmtIn(netRemainingWidthCalc.resultInch)}`,
        netRemainingWidthCalc.resultInch,
        displayUnit
      )
    );

    const definedNetArrangements: PanelArrangementRule[] = (profile.panelArrangements || []).filter(
      p => p.panelType === 'mosquito_net'
    );
    const targetNetCount = Math.max(1, Number(profile.mosquitoNetPanelCount) || definedNetArrangements.length || 1);
    const netArrangements: PanelArrangementRule[] =
      definedNetArrangements.length > 0
        ? definedNetArrangements
        : Array.from({ length: targetNetCount }, (_, idx) => ({
            id: `mosquito-net-${idx + 1}`,
            label: targetNetCount === 1 ? 'Mosquito Net Panel' : `Mosquito Net Panel ${idx + 1}`,
            panelType: 'mosquito_net' as const,
            widthDivisor: profile.mosquitoNetWidthDivisor || 2,
            extraWidthAdjustment: 0,
            extraWidthOperator: '+' as const,
            extraHeightAdjustment: 0,
            extraHeightOperator: '-' as const,
            adjustmentUnit: 'inch' as const,
          }));

    for (const netPanel of netArrangements) {
      const divisor = Number.isFinite(netPanel.widthDivisor) && netPanel.widthDivisor > 0
        ? netPanel.widthDivisor
        : profile.mosquitoNetWidthDivisor || 2;

      const netSteps: CalculationFormulaStep[] = [];
      const baseNetWidthInch = roundPrecision(netRemainingWidthCalc.resultInch / divisor, 4);
      netSteps.push(
        makeStep(
          `${netPanel.label} Base Width`,
          `${fmtIn(netRemainingWidthCalc.resultInch)} / ${divisor} = ${fmtIn(baseNetWidthInch)}`,
          baseNetWidthInch,
          displayUnit
        )
      );

      const afterNetAdd = applySignedRule(baseNetWidthInch, r.mosquitoNetWidthAddition);
      netSteps.push(
        makeStep(
          `${netPanel.label} After Net Width Addition`,
          `${fmtIn(baseNetWidthInch)} ${afterNetAdd.signedExpr} = ${fmtIn(afterNetAdd.resultInch)}`,
          afterNetAdd.resultInch,
          displayUnit
        )
      );

      const netWidthOverride = applyPanelAdjustment(
        afterNetAdd.resultInch,
        netPanel.extraWidthAdjustment,
        netPanel.extraWidthOperator,
        netPanel.adjustmentUnit || 'inch'
      );
      if (netWidthOverride.applied) {
        netSteps.push(
          makeStep(
            `${netPanel.label} Individual Width Override`,
            `${fmtIn(afterNetAdd.resultInch)} ${netWidthOverride.expr} = ${fmtIn(netWidthOverride.resultInch)}`,
            netWidthOverride.resultInch,
            displayUnit
          )
        );
      }

      netSteps.push(
        makeStep(
          `${netPanel.label} Height`,
          `${fmtIn(handleCalc.resultInch)} (Handle) ${netBaseHeightCalc.signedExpr} = ${fmtIn(netBaseHeightCalc.resultInch)}`,
          netBaseHeightCalc.resultInch,
          displayUnit
        )
      );

      const netHeightOverride = applyPanelAdjustment(
        netBaseHeightCalc.resultInch,
        netPanel.extraHeightAdjustment,
        netPanel.extraHeightOperator,
        netPanel.adjustmentUnit || 'inch'
      );
      if (netHeightOverride.applied) {
        netSteps.push(
          makeStep(
            `${netPanel.label} Individual Height Override`,
            `${fmtIn(netBaseHeightCalc.resultInch)} ${netHeightOverride.expr} = ${fmtIn(netHeightOverride.resultInch)}`,
            netHeightOverride.resultInch,
            displayUnit
          )
        );
      }

      if (netWidthOverride.resultInch <= 0 || netHeightOverride.resultInch <= 0) {
        calcErrors.push(
          `${netPanel.label} produced a non-positive cutting size (${fmtIn(netWidthOverride.resultInch)} × ${fmtIn(netHeightOverride.resultInch)}). Check window dimensions or mosquito net deductions.`
        );
      }

      mosquitoNetPanels.push({
        id: netPanel.id,
        label: netPanel.label,
        panelType: 'mosquito_net',
        widthInch: netWidthOverride.resultInch,
        heightInch: netHeightOverride.resultInch,
        widthDisplay: fromInches(netWidthOverride.resultInch, displayUnit),
        heightDisplay: fromInches(netHeightOverride.resultInch, displayUnit),
        widthMm: roundPrecision(netWidthOverride.resultInch * MM_PER_INCH, 2),
        heightMm: roundPrecision(netHeightOverride.resultInch * MM_PER_INCH, 2),
        displayUnit,
        breakdown: netSteps,
      });
    }

    if (mosquitoNetPanels.length > 0) {
      const firstNet = mosquitoNetPanels[0];
      breakdown.push(
        makeStep(
          'Final Mosquito Net Width',
          `${fmtIn(firstNet.widthInch)} (${firstNet.widthMm} mm)`,
          firstNet.widthInch,
          displayUnit
        ),
        makeStep(
          'Final Mosquito Net Height',
          `${fmtIn(handleCalc.resultInch)} ${netBaseHeightCalc.signedExpr} = ${fmtIn(firstNet.heightInch)}`,
          firstNet.heightInch,
          displayUnit
        )
      );
    }
  }

  // 8. Validate Track, Handle & Bearing Positivity
  if (topTrackCalc.resultInch <= 0) {
    calcErrors.push(`Top Track cutting size is non-positive (${fmtIn(topTrackCalc.resultInch)}).`);
  }
  if (bottomTrackCalc.resultInch <= 0) {
    calcErrors.push(`Bottom Track cutting size is non-positive (${fmtIn(bottomTrackCalc.resultInch)}).`);
  }
  if (handleCalc.resultInch <= 0) {
    calcErrors.push(`Handle cutting size is non-positive (${fmtIn(handleCalc.resultInch)}).`);
  }
  if (interlockCalc.resultInch <= 0) {
    calcErrors.push(`Interlock cutting size is non-positive (${fmtIn(interlockCalc.resultInch)}).`);
  }
  if (topBearingCalc.resultInch <= 0) {
    calcErrors.push(`Top Track (T.B.) bearing measurement is non-positive (${fmtIn(topBearingCalc.resultInch)}).`);
  }
  if (bottomBearingCalc.resultInch <= 0) {
    calcErrors.push(`Bottom Track (T.B.) bearing measurement is non-positive (${fmtIn(bottomBearingCalc.resultInch)}).`);
  }

  if (calcErrors.length > 0) {
    return buildInvalidResult(calcErrors, warnings);
  }

  return {
    windowId: input.id,
    windowNumber: input.windowNumber || 'W-1',
    isValid: true,
    errors: [],
    warnings,
    displayUnit,
    original: {
      width: input.width,
      height: input.height,
      unit: displayUnit,
      widthInch,
      heightInch,
      widthMm,
      heightMm,
      trackType: input.trackType,
      configuration: input.configuration,
      glassThickness: input.glassThickness,
      mosquitoNetRequired: requiresMosquitoNet,
    },
    profileUsed: {
      id: profile.id,
      name: profile.name,
      trackType: profile.trackType,
    },
    fabrication: {
      topTrackInch: topTrackCalc.resultInch,
      topTrackDisplay: fromInches(topTrackCalc.resultInch, displayUnit),
      topTrackMm: roundPrecision(topTrackCalc.resultInch * MM_PER_INCH, 2),
      bottomTrackInch: bottomTrackCalc.resultInch,
      bottomTrackDisplay: fromInches(bottomTrackCalc.resultInch, displayUnit),
      bottomTrackMm: roundPrecision(bottomTrackCalc.resultInch * MM_PER_INCH, 2),
      handleInch: handleCalc.resultInch,
      handleDisplay: fromInches(handleCalc.resultInch, displayUnit),
      handleMm: roundPrecision(handleCalc.resultInch * MM_PER_INCH, 2),
      interlockInch: interlockCalc.resultInch,
      interlockDisplay: fromInches(interlockCalc.resultInch, displayUnit),
      interlockMm: roundPrecision(interlockCalc.resultInch * MM_PER_INCH, 2),
      bearingRemainingInch: bearingRemainingCalc.resultInch,
      bearingRemainingDisplay: fromInches(bearingRemainingCalc.resultInch, displayUnit),
      bearingRemainingMm: roundPrecision(bearingRemainingCalc.resultInch * MM_PER_INCH, 2),
      topBearingInch: topBearingCalc.resultInch,
      topBearingDisplay: fromInches(topBearingCalc.resultInch, displayUnit),
      topBearingMm: roundPrecision(topBearingCalc.resultInch * MM_PER_INCH, 2),
      bottomBearingInch: bottomBearingCalc.resultInch,
      bottomBearingDisplay: fromInches(bottomBearingCalc.resultInch, displayUnit),
      bottomBearingMm: roundPrecision(bottomBearingCalc.resultInch * MM_PER_INCH, 2),
    },
    glassPanels,
    mosquitoNetPanels,
    breakdown,
    calculatedAt,
  };
}
