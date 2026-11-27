/**
 * Contact Formatting Utilities for WindowCut Pro
 * Note: Personal owner phone numbers and business location URLs are intentionally
 * omitted from customer-facing defaults.
 */

export const DEFAULT_WHATSAPP_NUMBER = '';
export const OFFICIAL_GOOGLE_MAPS_URL = '';

/**
 * Normalizes a phone string into 12-digit Indian international digits when provided.
 * Returns empty string if no phone is supplied.
 */
export function getCleanWhatsAppDigits(phone?: string): string {
  const raw = (phone || '').replace(/[^0-9]/g, '');
  if (!raw) return '';
  if (raw.length === 10) {
    return `91${raw}`;
  }
  if (raw.length === 11 && raw.startsWith('0')) {
    return `91${raw.slice(1)}`;
  }
  if (raw.length === 12 && raw.startsWith('91')) {
    return raw;
  }
  return raw;
}

/**
 * Formats a phone/WhatsApp number for display when provided.
 * Returns empty string if no number is configured.
 */
export function formatWhatsAppDisplay(phone?: string): string {
  const clean = (phone || '').replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  return `+${clean}`;
}

/**
 * Builds standard WhatsApp wa.me share link.
 * When no recipient phone is passed, opens WhatsApp share picker so users choose their own contact.
 */
export function getWhatsAppUrl(phone?: string, message?: string): string {
  const cleanPhone = getCleanWhatsAppDigits(phone);
  const base = cleanPhone ? `https://wa.me/${cleanPhone}` : 'https://wa.me/';
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Builds standard tel: URL only when an explicit phone number is provided.
 */
export function getPhoneTelUrl(phone?: string): string {
  const digits = (phone || '').replace(/[^0-9+]/g, '');
  return digits ? `tel:${digits}` : '';
}

/**
 * Returns a sanitized Google Maps URL only if explicitly supplied.
 */
export function getGoogleMapsUrl(customUrl?: string): string {
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl.trim();
  }
  return '';
}
