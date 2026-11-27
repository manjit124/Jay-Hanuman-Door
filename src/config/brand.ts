/**
 * Official WindowCut Pro Brand Configuration
 * Single source of truth for logo asset, brand name, tagline, and theme tokens.
 */
export const BRAND_NAME = 'WindowCut Pro';
export const BRAND_SHORT_NAME = 'WindowCut Pro';
export const BRAND_TAGLINE = 'Sliding Window Fabrication Calculator';
export const BRAND_LOGO_URL =
  '/assets/aistudio/file_00000000987c8211861f7f4e3ee30de1_a307444c.png';

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
  'shivshahi',
  'door price calculator',
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
  if (
    !cleaned ||
    cleaned === '/assets/logo.png' ||
    cleaned.endsWith('/assets/logo.png') ||
    cleaned.includes('jaihanuman')
  ) {
    return BRAND_LOGO_URL;
  }
  return cleaned;
}
