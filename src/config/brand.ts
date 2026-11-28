/**
 * Official WindowCut Pro Brand Configuration
 * Single source of truth for logo asset, brand name, tagline, and theme tokens.
 */
export const BRAND_NAME = 'WindowCut Pro';
export const BRAND_SHORT_NAME = 'WindowCut Pro';
export const BRAND_TAGLINE = 'Sliding Window Fabrication Calculator';
export const BRAND_ASSET_VERSION = '20261128';
export const BRAND_LOGO_RAW_PATH =
  '/assets/aistudio/file_00000000987c8211861f7f4e3ee30de1_a307444c.png';
export const BRAND_LOGO_URL = `${BRAND_LOGO_RAW_PATH}?v=${BRAND_ASSET_VERSION}`;

export const BRAND_COLORS = {
  primaryBlue: '#0B5ED7',
  primaryBlueHover: '#084BB3',
  primaryBlueDark: '#0A2540',
  primaryBlueLight: '#EFF6FF',
  accentOrange: '#F97316',
  accentOrangeHover: '#EA580C',
  accentOrangeLight: '#FFF7ED',
  surfaceLight: '#F8FAFC',
  borderSubtle: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
} as const;

export const LEGACY_BRAND_PATTERNS = [
  'jai hanuman',
  'jaihanuman',
  'shivshahi',
  'door price calculator',
  'doorstudio',
];

export function resolveBrandName(raw?: string | null): string {
  const cleaned = String(raw || '').trim();
  if (!cleaned) return BRAND_NAME;
  const lower = cleaned.toLowerCase();
  if (LEGACY_BRAND_PATTERNS.some(p => lower.includes(p))) {
    return BRAND_NAME;
  }
  return cleaned;
}

export function resolveBrandTagline(raw?: string | null): string {
  const cleaned = String(raw || '').trim();
  if (!cleaned) return BRAND_TAGLINE;
  const lower = cleaned.toLowerCase();
  if (
    lower.includes('sagwan') ||
    lower.includes('teak') ||
    lower.includes('handcrafted') ||
    lower.includes('wooden door') ||
    lower.includes('door price')
  ) {
    return BRAND_TAGLINE;
  }
  return cleaned;
}

export function resolveBrandLogoUrl(raw?: string | null): string {
  const cleaned = String(raw || '').trim();
  if (!cleaned) {
    return BRAND_LOGO_URL;
  }
  const lower = cleaned.toLowerCase();
  const withoutQuery = lower.split('?')[0];
  if (
    withoutQuery === BRAND_LOGO_RAW_PATH.toLowerCase() ||
    withoutQuery.endsWith(BRAND_LOGO_RAW_PATH.toLowerCase()) ||
    withoutQuery === '/assets/logo.png' ||
    withoutQuery.endsWith('/assets/logo.png') ||
    withoutQuery === '/assets/logo-192.png' ||
    withoutQuery === '/assets/logo-512.png' ||
    withoutQuery === '/favicon.png' ||
    withoutQuery === '/assets/app-icon.svg' ||
    lower.includes('jaihanuman') ||
    lower.includes('jai-hanuman') ||
    lower.includes('shivshahi') ||
    lower.includes('doorstudio')
  ) {
    return BRAND_LOGO_URL;
  }
  return cleaned;
}
