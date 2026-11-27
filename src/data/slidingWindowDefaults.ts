import type {
  FabricationProfile,
  FabricationRuleKey,
  FabricationRuleSetting,
  PanelArrangementRule,
  SlidingTrackType,
  WindowMeasurementUnit,
} from '../types.ts';

export const WINDOW_CONFIGURATION_OPTIONS: Record<SlidingTrackType, string[]> = {
  '2-track': [
    '2 Glass Panels',
    '2 Glass Panels (Equal Split)',
    '2 Glass Panels (Custom Split)',
    '3 Glass Panels (2-Track Overlap)',
  ],
  '3-track': [
    '2 Glass + 1 Mosquito Net',
    '2 Glass + 1 Mosquito Net (Custom Net Formula)',
    '3 Glass Panels (No Net)',
    '2 Glass + 2 Mosquito Net',
  ],
};

export const GLASS_THICKNESS_OPTIONS = [
  '4mm Clear / Toughened',
  '5mm Clear / Toughened',
  '6mm Toughened',
  '8mm Toughened',
  '10mm Toughened',
  '12mm Toughened',
  'DGU (Double Glazed)',
];

function createStandardRules(trackType: SlidingTrackType): Record<FabricationRuleKey, FabricationRuleSetting> {
  return {
    glassWidthDeduction: {
      key: 'glassWidthDeduction',
      name: trackType === '2-track' ? 'Track Width Deduction (Glass)' : 'Glass Panel Width Deduction',
      description: 'Deducted from overall Window Width before dividing across glass panels (Example: W - 6.250").',
      category: 'glass',
      value: 6.25,
      unit: 'inch',
      operator: '-',
      defaultValue: 6.25,
      defaultUnit: 'inch',
      defaultOperator: '-',
      appliesTo: 'all',
    },
    glassWidthAddition: {
      key: 'glassWidthAddition',
      name: 'Glass Width Addition (Overlap / Pocket)',
      description: 'Added to each glass panel base width for frame pocket seating (Example: Base + 0.625").',
      category: 'glass',
      value: 0.625,
      unit: 'inch',
      operator: '+',
      defaultValue: 0.625,
      defaultUnit: 'inch',
      defaultOperator: '+',
      appliesTo: 'all',
    },
    glassHeightDeduction: {
      key: 'glassHeightDeduction',
      name: 'Additional Glass Height Deduction',
      description: 'Applied after Handle / Interlock height deduction to compute final glass height (Example: Handle - 2.500").',
      category: 'glass',
      value: 2.5,
      unit: 'inch',
      operator: '-',
      defaultValue: 2.5,
      defaultUnit: 'inch',
      defaultOperator: '-',
      appliesTo: 'all',
    },
    mosquitoNetWidthDeduction: {
      key: 'mosquitoNetWidthDeduction',
      name: 'Mosquito Net Width Deduction',
      description: 'Independent width deduction for 3-track mosquito net shutter before division (editable separately from glass).',
      category: 'mosquito-net',
      value: 6.25,
      unit: 'inch',
      operator: '-',
      defaultValue: 6.25,
      defaultUnit: 'inch',
      defaultOperator: '-',
      appliesTo: '3-track',
    },
    mosquitoNetWidthAddition: {
      key: 'mosquitoNetWidthAddition',
      name: 'Mosquito Net Width Addition',
      description: 'Independent width addition for mosquito net mesh/shutter groove seating (editable separately from glass).',
      category: 'mosquito-net',
      value: 0.625,
      unit: 'inch',
      operator: '+',
      defaultValue: 0.625,
      defaultUnit: 'inch',
      defaultOperator: '+',
      appliesTo: '3-track',
    },
    mosquitoNetHeightDeduction: {
      key: 'mosquitoNetHeightDeduction',
      name: 'Mosquito Net Height Deduction',
      description: 'Independent additional height deduction for mosquito net panel after handle height (editable separately from glass).',
      category: 'mosquito-net',
      value: 2.5,
      unit: 'inch',
      operator: '-',
      defaultValue: 2.5,
      defaultUnit: 'inch',
      defaultOperator: '-',
      appliesTo: '3-track',
    },
    handleHeightDeduction: {
      key: 'handleHeightDeduction',
      name: 'Handle Height Deduction',
      description: 'Applied to overall Window Height to calculate Handle section cutting size (Example: H - 1.500").',
      category: 'handle',
      value: 1.5,
      unit: 'inch',
      operator: '-',
      defaultValue: 1.5,
      defaultUnit: 'inch',
      defaultOperator: '-',
      appliesTo: 'all',
    },
    interlockHeightDeduction: {
      key: 'interlockHeightDeduction',
      name: 'Interlock Height Deduction',
      description: 'Applied to overall Window Height to calculate Interlock section cutting size (editable independently of Handle).',
      category: 'interlock',
      value: 1.5,
      unit: 'inch',
      operator: '-',
      defaultValue: 1.5,
      defaultUnit: 'inch',
      defaultOperator: '-',
      appliesTo: 'all',
    },
    topTrackAdjustment: {
      key: 'topTrackAdjustment',
      name: 'Top Track Cutting Adjustment',
      description: 'Deduction or addition applied to overall Window Width for Top Track cutting size (Default: 0").',
      category: 'top-track',
      value: 0,
      unit: 'inch',
      operator: '-',
      defaultValue: 0,
      defaultUnit: 'inch',
      defaultOperator: '-',
      appliesTo: 'all',
    },
    bottomTrackAdjustment: {
      key: 'bottomTrackAdjustment',
      name: 'Bottom Track Cutting Adjustment',
      description: 'Deduction or addition applied to overall Window Width for Bottom Track cutting size (Default: 0").',
      category: 'bottom-track',
      value: 0,
      unit: 'inch',
      operator: '-',
      defaultValue: 0,
      defaultUnit: 'inch',
      defaultOperator: '-',
      appliesTo: 'all',
    },
    bearingWidthDeduction: {
      key: 'bearingWidthDeduction',
      name: 'Bearing Track Width Deduction (T.B.)',
      description: 'Deducted from overall Window Width before dividing by Bearing Divisor to compute Top & Bottom Bearing Measurement: (W - 6.250") / 2. Independent from Glass.',
      category: 'bearing',
      value: 6.25,
      unit: 'inch',
      operator: '-',
      defaultValue: 6.25,
      defaultUnit: 'inch',
      defaultOperator: '-',
      appliesTo: 'all',
    },
    topBearingAdjustment: {
      key: 'topBearingAdjustment',
      name: 'Top Track (T.B.) Bearing Adjustment',
      description: 'Independent +/- adjustment applied to Base Bearing Measurement for Top Track (T.B.) Bearing only (Default: +0"). Does not affect Glass or Bottom Bearing.',
      category: 'bearing',
      value: 0,
      unit: 'inch',
      operator: '+',
      defaultValue: 0,
      defaultUnit: 'inch',
      defaultOperator: '+',
      appliesTo: 'all',
    },
    bottomBearingAdjustment: {
      key: 'bottomBearingAdjustment',
      name: 'Bottom Track (T.B.) Bearing Adjustment',
      description: 'Independent +/- adjustment applied to Base Bearing Measurement for Bottom Track (T.B.) Bearing only (Default: +0"). Does not affect Glass or Top Bearing.',
      category: 'bearing',
      value: 0,
      unit: 'inch',
      operator: '+',
      defaultValue: 0,
      defaultUnit: 'inch',
      defaultOperator: '+',
      appliesTo: 'all',
    },
  };
}

export function createDefaultPanelArrangements(trackType: SlidingTrackType): PanelArrangementRule[] {
  const panels: PanelArrangementRule[] = [
    {
      id: 'glass-panel-1',
      label: 'Glass Panel 1',
      panelType: 'glass',
      widthDivisor: 2,
      extraWidthAdjustment: 0,
      extraWidthOperator: '+',
      extraHeightAdjustment: 0,
      extraHeightOperator: '-',
      adjustmentUnit: 'inch',
    },
    {
      id: 'glass-panel-2',
      label: 'Glass Panel 2',
      panelType: 'glass',
      widthDivisor: 2,
      extraWidthAdjustment: 0,
      extraWidthOperator: '+',
      extraHeightAdjustment: 0,
      extraHeightOperator: '-',
      adjustmentUnit: 'inch',
    },
  ];

  if (trackType === '3-track') {
    panels.push({
      id: 'mosquito-net-1',
      label: 'Mosquito Net Panel 1',
      panelType: 'mosquito_net',
      widthDivisor: 2,
      extraWidthAdjustment: 0,
      extraWidthOperator: '+',
      extraHeightAdjustment: 0,
      extraHeightOperator: '-',
      adjustmentUnit: 'inch',
    });
  }

  return panels;
}

export function createDefaultFabricationProfiles(ownerId: string): FabricationProfile[] {
  const now = new Date().toISOString();
  const safeOwner = ownerId || 'default';

  const twoTrackStandard: FabricationProfile = {
    id: `prof-2t-std-${safeOwner.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24)}`,
    ownerId: safeOwner,
    name: '2 Track Standard',
    description: 'Standard 2-track sliding window profile (2 Glass Panels, 6.250" track width deduction, 0.625" glass addition, 1.500" handle/interlock, 2.500" glass height deduction).',
    trackType: '2-track',
    isDefault: true,
    isSystemSeed: true,
    glassPanelCount: 2,
    mosquitoNetPanelCount: 0,
    glassWidthDivisor: 2,
    mosquitoNetWidthDivisor: 2,
    bearingDivisor: 2,
    rules: createStandardRules('2-track'),
    panelArrangements: createDefaultPanelArrangements('2-track'),
    createdAt: now,
    updatedAt: now,
  };

  const threeTrackStandard: FabricationProfile = {
    id: `prof-3t-std-${safeOwner.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24)}`,
    ownerId: safeOwner,
    name: '3 Track Standard',
    description: 'Standard 3-track sliding window profile (2 Glass Panels + 1 Mosquito Net Panel with separate editable rules for glass, mosquito net, and T.B. bearing).',
    trackType: '3-track',
    isDefault: true,
    isSystemSeed: true,
    glassPanelCount: 2,
    mosquitoNetPanelCount: 1,
    glassWidthDivisor: 2,
    mosquitoNetWidthDivisor: 2,
    bearingDivisor: 2,
    rules: createStandardRules('3-track'),
    panelArrangements: createDefaultPanelArrangements('3-track'),
    createdAt: now,
    updatedAt: now,
  };

  return [twoTrackStandard, threeTrackStandard];
}

export function getDefaultRuleResetValues(trackType: SlidingTrackType): Record<FabricationRuleKey, FabricationRuleSetting> {
  return createStandardRules(trackType);
}

export const UNIT_LABELS: Record<WindowMeasurementUnit, string> = {
  inch: 'in',
  feet: 'ft',
  mm: 'mm',
};
