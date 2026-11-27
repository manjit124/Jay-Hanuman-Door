import type { WindowMeasurementUnit } from '../types.ts';

export interface OfficialFractionEntry {
  numerator: number;
  denominator: number;
  fractionLabel: string;
  decimalValue: number;
  formattedDecimal: string;
  decimalPlaces: 3 | 4;
}

/**
 * Official Exact Fraction-to-Decimal Conversion Table for the
 * Sliding Window Fabrication Calculator.
 *
 * Uses exact rational values (numerator / denominator) with fixed workshop
 * decimal places:
 * - Odd 16ths (1/16, 3/16, 5/16, 7/16, 9/16, 11/16, 13/16, 15/16) -> 4 digits
 * - 8ths / 4ths / Halves (1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8) -> 3 digits (preserving trailing zeros)
 */
export const OFFICIAL_INCH_FRACTION_TABLE: readonly OfficialFractionEntry[] = [
  { numerator: 1, denominator: 16, fractionLabel: '1/16', decimalValue: 1 / 16, formattedDecimal: '0.0625', decimalPlaces: 4 },
  { numerator: 1, denominator: 8, fractionLabel: '1/8', decimalValue: 1 / 8, formattedDecimal: '0.125', decimalPlaces: 3 },
  { numerator: 3, denominator: 16, fractionLabel: '3/16', decimalValue: 3 / 16, formattedDecimal: '0.1875', decimalPlaces: 4 },
  { numerator: 1, denominator: 4, fractionLabel: '1/4', decimalValue: 1 / 4, formattedDecimal: '0.250', decimalPlaces: 3 },
  { numerator: 5, denominator: 16, fractionLabel: '5/16', decimalValue: 5 / 16, formattedDecimal: '0.3125', decimalPlaces: 4 },
  { numerator: 3, denominator: 8, fractionLabel: '3/8', decimalValue: 3 / 8, formattedDecimal: '0.375', decimalPlaces: 3 },
  { numerator: 7, denominator: 16, fractionLabel: '7/16', decimalValue: 7 / 16, formattedDecimal: '0.4375', decimalPlaces: 4 },
  { numerator: 1, denominator: 2, fractionLabel: '1/2', decimalValue: 1 / 2, formattedDecimal: '0.500', decimalPlaces: 3 },
  { numerator: 9, denominator: 16, fractionLabel: '9/16', decimalValue: 9 / 16, formattedDecimal: '0.5625', decimalPlaces: 4 },
  { numerator: 5, denominator: 8, fractionLabel: '5/8', decimalValue: 5 / 8, formattedDecimal: '0.625', decimalPlaces: 3 },
  { numerator: 11, denominator: 16, fractionLabel: '11/16', decimalValue: 11 / 16, formattedDecimal: '0.6875', decimalPlaces: 4 },
  { numerator: 3, denominator: 4, fractionLabel: '3/4', decimalValue: 3 / 4, formattedDecimal: '0.750', decimalPlaces: 3 },
  { numerator: 13, denominator: 16, fractionLabel: '13/16', decimalValue: 13 / 16, formattedDecimal: '0.8125', decimalPlaces: 4 },
  { numerator: 7, denominator: 8, fractionLabel: '7/8', decimalValue: 7 / 8, formattedDecimal: '0.875', decimalPlaces: 3 },
  { numerator: 15, denominator: 16, fractionLabel: '15/16', decimalValue: 15 / 16, formattedDecimal: '0.9375', decimalPlaces: 4 },
] as const;

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': ' 1/2',
  '¼': ' 1/4',
  '¾': ' 3/4',
  '⅛': ' 1/8',
  '⅜': ' 3/8',
  '⅝': ' 5/8',
  '⅞': ' 7/8',
};

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Exact rational fraction/mixed-number/decimal parser.
 * Accepts:
 *   - Decimals & integers: "36", "36.5", "14.875", ".25", "0.0625"
 *   - Pure fractions: "1/16", "1/8", "1/4", "1/2", "3/4", "7/8", "15/16"
 *   - Mixed numbers: "14 7/8", "36 1/2", "42 3/8", "14-7/8", "14+7/8", "36 1/2\""
 *   - Unicode fractions: "36½", "14 ⅞"
 *
 * Returns exact rational numeric value (all 1/16th steps are exact in IEEE-754)
 * or null if input is empty or invalid.
 */
export function parseMeasurementInput(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }

  let s = String(raw).trim();
  if (!s) return null;

  // Normalize unicode fraction slashes and common inch/unit suffixes at the end
  s = s.replace(/⁄/g, '/');
  for (const [glyph, replacement] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(glyph)) {
      s = s.split(glyph).join(replacement);
    }
  }
  s = s
    .replace(/(?:″|''|"|\s*(?:inches|inch|in))$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!s) return null;

  // 1. Plain integer or decimal (e.g. "36", "36.5", "0.0625", ".25")
  const decimalMatch = /^([+-]?)\s*(\d+(?:\.\d+)?|\.\d+)$/.exec(s);
  if (decimalMatch) {
    const sign = decimalMatch[1] === '-' ? -1 : 1;
    const val = Number(decimalMatch[2]);
    return Number.isFinite(val) ? sign * val : null;
  }

  // 2. Pure fraction (e.g. "1/16", "7/8", "3/4")
  const fractionMatch = /^([+-]?)\s*(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (fractionMatch) {
    const sign = fractionMatch[1] === '-' ? -1 : 1;
    const num = parseInt(fractionMatch[2], 10);
    const den = parseInt(fractionMatch[3], 10);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
    return sign * (num / den);
  }

  // 3. Mixed number (e.g. "14 7/8", "36 1/2", "42 3/8", "14-7/8", "14+7/8")
  const mixedMatch = /^([+-]?)\s*(\d+)(?:\s+|[-+]\s*)(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (mixedMatch) {
    const sign = mixedMatch[1] === '-' ? -1 : 1;
    const whole = parseInt(mixedMatch[2], 10);
    const num = parseInt(mixedMatch[3], 10);
    const den = parseInt(mixedMatch[4], 10);
    if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den) || den <= 0) {
      return null;
    }
    return sign * (whole + num / den);
  }

  return null;
}

/**
 * Formats an inch numeric value into the official Sliding Window Calculator
 * decimal format, preserving exact digit counts and trailing zeros:
 *
 * - Exact integers -> no decimal places (e.g., 36 -> "36", 0 -> "0")
 * - Odd 16ths (1/16, 3/16, 5/16, 7/16, 9/16, 11/16, 13/16, 15/16) -> 4 digits
 *   (0.0625, 0.1875, 0.3125, 0.4375, 0.5625, 0.6875, 0.8125, 0.9375)
 * - 8ths / 4ths / Halves (1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8) -> 3 digits with trailing zeros
 *   (0.125, 0.250, 0.375, 0.500, 0.625, 0.750, 0.875, 14.875, 36.500, 42.375)
 * - Other fractional decimals -> 4 digits if 4th decimal place is non-zero, otherwise 3 digits.
 */
export function formatInchDecimal(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) < 1e-9) return '0';

  const sign = value < 0 ? '-' : '';
  const absVal = Math.abs(value);

  const sixteenths = absVal * 16;
  const nearestSixteenth = Math.round(sixteenths);

  if (Math.abs(sixteenths - nearestSixteenth) < 1e-6) {
    const rem = nearestSixteenth % 16;
    if (rem === 0) {
      return `${sign}${Math.round(nearestSixteenth / 16)}`;
    }
    const exactVal = nearestSixteenth / 16;
    if (rem % 2 === 1) {
      return `${sign}${exactVal.toFixed(4)}`;
    }
    return `${sign}${exactVal.toFixed(3)}`;
  }

  // Non-1/16th decimal (e.g., divide-by-3 or mm-to-inch): preserve 3 or 4 decimal places accurately
  const rounded4 = Math.round((absVal + Number.EPSILON) * 10000) / 10000;
  const scaled = Math.round(rounded4 * 10000);
  if (scaled % 10000 === 0) {
    return `${sign}${Math.round(rounded4)}`;
  }
  if (scaled % 10 === 0) {
    return `${sign}${rounded4.toFixed(3)}`;
  }
  return `${sign}${rounded4.toFixed(4)}`;
}

/**
 * Returns the exact reduced 16th-inch fraction representation when `value`
 * matches an exact 1/16th step (with non-zero fractional part), e.g.:
 *   0.0625 -> "1/16"
 *   0.5    -> "1/2"
 *   14.875 -> "14 7/8"
 *   36.5   -> "36 1/2"
 *   42.375 -> "42 3/8"
 *
 * Returns null for whole integers (e.g. 36) or non-16th decimals (e.g. 11.9167).
 */
export function formatInchFraction(value: number, includeQuote = false): string | null {
  if (!Number.isFinite(value)) return null;
  const absVal = Math.abs(value);
  const sixteenths = absVal * 16;
  const nearestSixteenth = Math.round(sixteenths);

  if (Math.abs(sixteenths - nearestSixteenth) >= 1e-6) {
    return null;
  }

  const whole = Math.floor(nearestSixteenth / 16);
  const rem = nearestSixteenth % 16;
  if (rem === 0) return null;

  const divisor = gcd(rem, 16);
  const num = rem / divisor;
  const den = 16 / divisor;
  const sign = value < 0 ? '-' : '';
  const suffix = includeQuote ? '"' : '';

  if (whole === 0) {
    return `${sign}${num}/${den}${suffix}`;
  }
  return `${sign}${whole} ${num}/${den}${suffix}`;
}

/**
 * Formats an inch value with its decimal representation and exact fraction equivalent
 * when applicable, e.g.:
 *   14.875 -> '14.875" (14 7/8")'
 *   36.5   -> '36.500" (36 1/2")'
 *   0.0625 -> '0.0625" (1/16")'
 *   36     -> '36"'
 */
export function formatInchWithFraction(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const dec = `${formatInchDecimal(value)}"`;
  const frac = formatInchFraction(value, true);
  return frac ? `${dec} (${frac})` : dec;
}

/**
 * Parses a fractional or decimal string and returns the exact formatted
 * inch decimal string (e.g., "1/4" -> "0.250", "14 7/8" -> "14.875", "36 1/2" -> "36.500").
 */
export function convertFractionToFormattedInchDecimal(raw: string | number): string | null {
  const numeric = parseMeasurementInput(raw);
  if (numeric === null) return null;
  return formatInchDecimal(numeric);
}

/**
 * Formats a rule/offset magnitude for display (e.g., in rules list or formula breakdown).
 */
export function formatRuleNumber(value: number, unit: WindowMeasurementUnit): string {
  if (!Number.isFinite(value)) return '—';
  if (unit === 'inch') return formatInchDecimal(value);
  if (unit === 'mm') {
    const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
    return String(rounded);
  }
  const rounded = Math.round((value + Number.EPSILON) * 10000) / 10000;
  return String(rounded);
}
