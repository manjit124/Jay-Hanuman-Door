import {
  ChaukhatWoodType,
  ChaukhatSectionSize,
  ChaukhatDimensionPreset,
  ChaukhatDesignCard,
  ChaukhatProduct,
} from '../types.ts';

export const DEFAULT_CHAUKHAT_WOOD_TYPES: ChaukhatWoodType[] = [
  {
    id: 'wood-sagwan',
    name: 'Sagwan / Teak Wood',
    baseRatePerRft: 450,
    baseRatePerCuFt: 3600,
    description: '100% Seasoned Central Province (CP) Teak Wood. High natural oil content, weather-resistant, zero shrinkage.',
    active: true,
  },
  {
    id: 'wood-sal',
    name: 'Sal Wood',
    baseRatePerRft: 320,
    baseRatePerCuFt: 2500,
    description: 'Naturally heavy and dense hardwood. Known for extraordinary load-bearing strength and lifelong termite immunity.',
    active: true,
  },
  {
    id: 'wood-malaysian-sal',
    name: 'Malaysian Sal',
    baseRatePerRft: 360,
    baseRatePerCuFt: 2850,
    description: 'Kiln-dried imported Sal timber with uniform grain, ideal for high humidity and all external door frames.',
    active: true,
  },
  {
    id: 'wood-sheesham',
    name: 'Indian Rosewood / Sheesham',
    baseRatePerRft: 420,
    baseRatePerCuFt: 3400,
    description: 'Dense timber with deep contrast grain patterns. Excellent rigidity for ornamental entrance frames.',
    active: true,
  },
];

export const DEFAULT_CHAUKHAT_SECTION_SIZES: ChaukhatSectionSize[] = [
  {
    id: 'sec-5x4',
    name: '5 inches × 4 inches',
    widthInch: 5,
    depthInch: 4,
    description: 'Heavy Grade — recommended for Grand Main Entrance doors with double rebate',
    isPopular: true,
    active: true,
  },
  {
    id: 'sec-5x3.5',
    name: '5 inches × 3.5 inches',
    widthInch: 5,
    depthInch: 3.5,
    description: 'Standard Heavy — ideal for heavy solid wood shutters and safety iron grills',
    isPopular: true,
    active: true,
  },
  {
    id: 'sec-4x2.5',
    name: '4 inches × 2.5 inches',
    widthInch: 4,
    depthInch: 2.5,
    description: 'Medium Grade — standard profile for bedroom, pooja room and interior passages',
    isPopular: true,
    active: true,
  },
  {
    id: 'sec-6x3',
    name: '6 inches × 3 inches',
    widthInch: 6,
    depthInch: 3,
    description: 'Architectural Wide — specialized for thick plaster walls and decorative architraves',
    isPopular: false,
    active: true,
  },
];

export const DEFAULT_CHAUKHAT_DIMENSION_PRESETS: ChaukhatDimensionPreset[] = [
  {
    id: 'preset-7x4',
    label: '7 ft × 4 ft',
    heightFt: 7,
    widthFt: 4,
    description: 'Standard Main Entrance (84" × 48")',
    active: true,
  },
  {
    id: 'preset-7x3.5',
    label: '7 ft × 3.5 ft',
    heightFt: 7,
    widthFt: 3.5,
    description: 'Standard Single Main Door (84" × 42")',
    active: true,
  },
  {
    id: 'preset-6.5x3',
    label: '6.5 ft × 3 ft',
    heightFt: 6.5,
    widthFt: 3,
    description: 'Standard Bedroom & Interior (78" × 36")',
    active: true,
  },
  {
    id: 'preset-6.5x2.5',
    label: '6.5 ft × 2.5 ft',
    heightFt: 6.5,
    widthFt: 2.5,
    description: 'Utility & Bathroom Opening (78" × 30")',
    active: true,
  },
];

export const DEFAULT_CHAUKHAT_DESIGNS: ChaukhatDesignCard[] = [
  {
    id: 'plain',
    name: 'Plain / Simple Chaukhat',
    tagline: 'Clean Modern Rebated Frame',
    description: 'Straight, plain seasoned wooden frame without decorative carving. Precision planed with square rebates for flush shutter fitment.',
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
    carvingChargePerRft: 0,
    active: true,
  },
  {
    id: 'diamond',
    name: 'Diamond Designer Chaukhat',
    tagline: 'Geometric Diamond Detailing',
    description: 'Features elegant geometric diamond-pattern detailing carved into the outer profile. Gives a refined contemporary accent to your entrance.',
    image: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=80',
    carvingChargePerRft: 120,
    active: true,
  },
  {
    id: 'hand_carved',
    name: 'Hand-Carved Designer Chaukhat',
    tagline: 'Traditional Ornamental Carving',
    description: 'Traditional handcrafted floral and ornamental relief hand-carved by master wood artisans. Adds regal grandeur to heritage and main doors.',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    carvingChargePerRft: 280,
    active: true,
  },
];

export const DEFAULT_CHAUKHAT_PRODUCT: ChaukhatProduct = {
  id: 'chaukhat-main',
  name: 'Jai Hanuman Heritage Chaukhat (Door Frame)',
  description: 'Custom handcrafted solid wood Chaukhat frame with kiln-seasoned timber, moisture-lock treatment, and heavy-duty rebates.',
  pricingMethod: 'running_foot',
  baseMaterialRate: 450, // per running foot for Sagwan
  plainCarvingCharge: 0,
  diamondCarvingCharge: 120,
  handCarvedCharge: 280,
  plainImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
  diamondImage: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=80',
  handCarvedImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
  active: true,
  displayOrder: 1,
};
