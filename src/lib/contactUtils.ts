/**
 * Official Contact & Location Utilities for Jai Hanuman Door
 */

export const DEFAULT_WHATSAPP_NUMBER = '7887412884';
export const OFFICIAL_GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac';

/**
 * Normalizes any phone string into 12-digit Indian international digits for wa.me links
 * e.g. "7887412884" -> "917887412884"
 */
export function getCleanWhatsAppDigits(phone?: string): string {
  const raw = (phone || DEFAULT_WHATSAPP_NUMBER).replace(/[^0-9]/g, '');
  if (raw.length === 10) {
    return `91${raw}`;
  }
  if (raw.length === 11 && raw.startsWith('0')) {
    return `91${raw.slice(1)}`;
  }
  if (raw.length === 12 && raw.startsWith('91')) {
    return raw;
  }
  return raw || '917887412884';
}

/**
 * Formats WhatsApp number for clean customer-facing display
 * e.g. "+91 78874 12884"
 */
export function formatWhatsAppDisplay(phone?: string): string {
  const clean = (phone || DEFAULT_WHATSAPP_NUMBER).replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  return clean ? `+${clean}` : '+91 78874 12884';
}

/**
 * Builds standard WhatsApp wa.me link with pre-filled message support
 */
export function getWhatsAppUrl(phone?: string, message?: string): string {
  const cleanPhone = getCleanWhatsAppDigits(phone);
  const base = `https://wa.me/${cleanPhone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Returns the official shop location URL on Google Maps
 */
export function getGoogleMapsUrl(customUrl?: string): string {
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl.trim();
  }
  return OFFICIAL_GOOGLE_MAPS_URL;
}
