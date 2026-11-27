import { GoogleGenAI, Type } from '@google/genai';
import type {
  NotebookExtractedRow,
  NotebookScanConfidence,
  WindowMeasurementUnit,
} from '../src/types.ts';
import { parseMeasurementInput } from '../src/lib/slidingWindowMeasurements.ts';

const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-4-hydrogen',
];

export class NotebookScannerError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(message: string, statusCode = 500, errorCode = 'NOTEBOOK_SCAN_FAILED') {
    super(message);
    this.name = 'NotebookScannerError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export interface RawAiWindowItem {
  windowNumber?: string | null;
  rawText?: string | null;
  width?: number | null;
  height?: number | null;
  unit?: string | null;
  unitExplicit?: boolean | null;
  confidence?: string | null;
  crossedOutOrOverwritten?: boolean | null;
  ambiguousDigits?: boolean | null;
  ambiguousOrientation?: boolean | null;
  notes?: string | null;
  flags?: string[] | null;
}

export interface RawAiNotebookPayload {
  detectedProjectName?: string | null;
  detectedCustomerName?: string | null;
  pageSummary?: string | null;
  pageWarnings?: string[] | null;
  windows?: RawAiWindowItem[] | null;
}

export interface AnalyzedNotebookPageResult {
  detectedProjectName?: string;
  detectedCustomerName?: string;
  summary: string;
  warnings: string[];
  rows: NotebookExtractedRow[];
  modelUsed: string;
}

const NOTEBOOK_SCAN_SYSTEM_INSTRUCTION = `You are a precision Indian Aluminium Sliding Window Fabrication OCR assistant for WindowCut Pro.
Your ONLY job is to carefully transcribe handwritten site measurement notebook photographs into structured JSON without EVER guessing or inventing unreadable digits.

SUPPORTED LANGUAGES & CARPENTER NOTATIONS:
- English, Hindi (Devanagari like खिड़की, साइज, इंच, फीट, चौड़ाई, ऊंचाई, कमरा, हॉल, किचन), and Hinglish (e.g., "Hall W1", "Kitchen", "Room 1", "Balkani", "Khidki 1").
- Common Indian workshop/carpenter notations:
  * "W1 = 36 x 48", "W-2 : 42 × 48", "1) 36*48", "No.3 - 48 by 36"
  * Inch symbols: 36", 36 in, 36 inch, 36 इंच, 36.5"
  * Feet symbols: 4', 4 ft, 4 feet, 4.5 ft, 4'6" (convert 4'6" to 54 inch OR 4.5 feet ONLY if clearly written as feet+inches, and note the exact original rawText), 4 × 3.5 Feet
  * Millimeter symbols: 1200 x 1500 mm, 915 x 1220 MM
  * Decimal measurements: 36.5, 42.25, 48.75, 3.5, 4.25
  * Exact fractional inch conversions (use these exact decimal equivalents ONLY when clearly written as a fraction): 1/16=0.0625, 1/8=0.125, 3/16=0.1875, 1/4=0.250, 5/16=0.3125, 3/8=0.375, 7/16=0.4375, 1/2=0.500, 9/16=0.5625, 5/8=0.625, 11/16=0.6875, 3/4=0.750, 13/16=0.8125, 7/8=0.875, 15/16=0.9375 (e.g. 14 7/8 -> 14.875, 36 1/2 -> 36.500, 42 3/8 -> 42.375). If Indian carpenter sutar vs dash notation is ambiguous (e.g., 36-4), flag it for Review.

CRITICAL ACCURACY & SAFETY RULES:
1. NEVER GUESS UNCLEAR DIGITS. If a width or height digit is smudged, cut off, blurry, or illegible, set width or height to null and set confidence to "Unclear".
2. WATCH FOR LOOK-ALIKE HANDWRITTEN DIGITS: carefully distinguish 36 vs 38, 48 vs 43, 1 vs 7, 3 vs 5, 6 vs 0, 4 vs 9. If a digit could plausibly be read two ways, set confidence to "Review", set ambiguousDigits=true, and explain in flags (e.g., "Check digit: 36 vs 38").
3. CROSSED-OUT OR OVERWRITTEN VALUES: If a number is scribbled over, struck through, or corrected on top of another digit, set crossedOutOrOverwritten=true, confidence="Review" (or "Unclear" if unreadable), and explain in flags. Ignore fully crossed-out deleted rows unless they were replaced inline, in which case flag them.
4. WIDTH x HEIGHT INTERPRETATION: Interpret "A × B" as Width = A, Height = B when standard W×H notation or headers ("W", "H", "Chaudai", "Unchai") support it. If a single number appears without a pair, leave the missing dimension as null and set confidence="Unclear".
5. UNIT SAFETY: Do NOT silently convert ambiguous units.
   - If feet is written ("ft", "feet", "'", "फीट") -> unit = "feet", unitExplicit = true.
   - If mm is written ("mm", "एमएम") -> unit = "mm", unitExplicit = true.
   - If inches is written ('"', "in", "inch", "इंच") -> unit = "inch", unitExplicit = true.
   - If NO unit is written on the row or page header: use "inch" for typical inch-range numbers (e.g. 18 to 140), "mm" for >= 400, and "feet" ONLY if clearly small feet decimals like 3.5 x 4, and set unitExplicit = false so the user verifies it.
6. MULTI-WINDOW PAGES: Extract EVERY visible window entry on the page in top-to-bottom order (whether 1 row or 20+ rows). Preserve exact window labels if written (e.g. "W1", "Hall-1", "K1"); if no window number is written, leave windowNumber empty so the system assigns sequential labels.
7. METADATA: Extract Customer Name (e.g. "Mr. Sharma", "Client: Ramesh Ji", "Party: ...") and Project/Site Name (e.g. "Green Park Site", "2nd Floor", "Flat 302") ONLY if actually written on the page. Otherwise return empty strings.
8. ALWAYS preserve the exact handwritten string in rawText for side-by-side human verification.`;

const NOTEBOOK_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detectedProjectName: {
      type: Type.STRING,
      description: 'Project or site name if explicitly written on the notebook page, else empty string.',
    },
    detectedCustomerName: {
      type: Type.STRING,
      description: 'Customer or party name if explicitly written on the notebook page, else empty string.',
    },
    pageSummary: {
      type: Type.STRING,
      description: 'One concise sentence summarizing what was found on this notebook page.',
    },
    pageWarnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Page-level quality warnings (blur, shadow, cut-off margin, mixed units, crossed-out notes).',
    },
    windows: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          windowNumber: {
            type: Type.STRING,
            description: 'Window label written on page (e.g. W1, W2, Hall-1) or empty string if unnumbered.',
          },
          rawText: {
            type: Type.STRING,
            description: 'Exact original handwritten text as seen on the page for this row.',
          },
          width: {
            type: Type.NUMBER,
            nullable: true,
            description: 'Parsed numeric Width value, or null if missing/unreadable. Never guess.',
          },
          height: {
            type: Type.NUMBER,
            nullable: true,
            description: 'Parsed numeric Height value, or null if missing/unreadable. Never guess.',
          },
          unit: {
            type: Type.STRING,
            description: 'One of "inch", "feet", or "mm".',
          },
          unitExplicit: {
            type: Type.BOOLEAN,
            description: 'True only if the unit was explicitly written on this row or page header.',
          },
          confidence: {
            type: Type.STRING,
            description: 'One of "High", "Review", or "Unclear".',
          },
          crossedOutOrOverwritten: {
            type: Type.BOOLEAN,
            description: 'True if any digit on this row was overwritten, scratched, or corrected.',
          },
          ambiguousDigits: {
            type: Type.BOOLEAN,
            description: 'True if handwriting has look-alike digits (e.g. 36 vs 38, 48 vs 43).',
          },
          ambiguousOrientation: {
            type: Type.BOOLEAN,
            description: 'True if it is uncertain which number is Width vs Height.',
          },
          notes: {
            type: Type.STRING,
            description: 'Optional room name or note written next to the window (e.g. Kitchen, 3 Track, Net).',
          },
          flags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Specific human-verification warnings for this row.',
          },
        },
        required: ['rawText', 'unit', 'confidence'],
      },
    },
  },
  required: ['pageSummary', 'windows'],
};

function normalizeUnit(rawUnit: unknown, fallback: WindowMeasurementUnit = 'inch'): WindowMeasurementUnit {
  if (typeof rawUnit !== 'string') return fallback;
  const u = rawUnit.trim().toLowerCase();
  if (u === 'feet' || u === 'ft' || u === 'foot' || u === "'" || u.includes('फीट') || u.includes('फुट')) {
    return 'feet';
  }
  if (u === 'mm' || u === 'millimeter' || u === 'millimeters' || u === 'millimetre' || u.includes('एमएम')) {
    return 'mm';
  }
  if (u === 'inch' || u === 'inches' || u === 'in' || u === '"' || u.includes('इंच')) {
    return 'inch';
  }
  return fallback;
}

function normalizeConfidence(raw: unknown): NotebookScanConfidence {
  if (typeof raw !== 'string') return 'Review';
  const c = raw.trim().toLowerCase();
  if (c === 'high') return 'High';
  if (c === 'unclear' || c === 'low') return 'Unclear';
  return 'Review';
}

function sanitizePositiveNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const parsed =
    typeof val === 'number' || typeof val === 'string'
      ? parseMeasurementInput(val)
      : Number(val);
  if (parsed === null || !Number.isFinite(parsed) || parsed <= 0) return null;
  // Round to max 4 decimal places to preserve exact 16th-inch decimals (.0625, .1875, .3125, .4375, .5625, .6875, .8125, .9375)
  return Math.round(parsed * 10000) / 10000;
}

function hasExplicitUnitToken(rawText: string, unit: WindowMeasurementUnit): boolean {
  const lower = rawText.toLowerCase();
  if (unit === 'inch') {
    return /("|''|\binch(es)?\b|\bin\b|इंच)/i.test(lower);
  }
  if (unit === 'feet') {
    return /('|\bfeet\b|\bfoot\b|\bft\b|फीट|फुट)/i.test(lower);
  }
  if (unit === 'mm') {
    return /(\bmm\b|millimet|एमएम)/i.test(lower);
  }
  return false;
}

/**
 * Deterministic safety post-processor for AI notebook extractions.
 * Guarantees that unclear, missing, overwritten, or unit-ambiguous rows are
 * NEVER silently trusted as High confidence and always carry clear user flags.
 */
export function normalizeAndValidateExtractedRows(
  rawWindows: RawAiWindowItem[],
  options: {
    pageId: string;
    pageNumber: number;
    existingWindowCount?: number;
    defaultUnit?: WindowMeasurementUnit;
  }
): NotebookExtractedRow[] {
  const startCount = options.existingWindowCount ?? 0;
  const fallbackUnit = options.defaultUnit || 'inch';
  const pageLabel = `Page ${options.pageNumber}`;

  const safeList = Array.isArray(rawWindows) ? rawWindows.slice(0, 60) : [];

  return safeList.map((item, idx) => {
    const rawText = typeof item?.rawText === 'string' ? item.rawText.trim().slice(0, 180) : '';
    const windowNumber =
      typeof item?.windowNumber === 'string' && item.windowNumber.trim()
        ? item.windowNumber.trim().slice(0, 40)
        : `W${startCount + idx + 1}`;

    const width = sanitizePositiveNumber(item?.width);
    const height = sanitizePositiveNumber(item?.height);
    const unit = normalizeUnit(item?.unit, fallbackUnit);
    const unitExplicit =
      typeof item?.unitExplicit === 'boolean'
        ? item.unitExplicit
        : hasExplicitUnitToken(rawText, unit);

    let confidence: NotebookScanConfidence = normalizeConfidence(item?.confidence);
    const flags: string[] = [];
    if (Array.isArray(item?.flags)) {
      for (const f of item.flags) {
        if (typeof f === 'string' && f.trim()) {
          const cleanFlag = f.trim().slice(0, 160);
          if (!flags.includes(cleanFlag)) flags.push(cleanFlag);
        }
      }
    }

    let unitAmbiguous = !unitExplicit;

    // Rule 1: Missing or non-positive width or height MUST be Unclear
    if (width === null || height === null) {
      confidence = 'Unclear';
      const missingMsg =
        width === null && height === null
          ? 'Both Width and Height are unclear — enter manually from photo.'
          : width === null
          ? 'Width is missing or unreadable — verify from notebook photo.'
          : 'Height is missing or unreadable — verify from notebook photo.';
      if (!flags.some(f => f.toLowerCase().includes('missing') || f.toLowerCase().includes('unreadable'))) {
        flags.push(missingMsg);
      }
    }

    // Rule 2: Crossed-out / overwritten markings cannot remain High confidence
    if (item?.crossedOutOrOverwritten) {
      if (confidence === 'High') confidence = 'Review';
      if (!flags.some(f => f.toLowerCase().includes('overwritten') || f.toLowerCase().includes('crossed'))) {
        flags.push('Crossed-out or overwritten writing detected — confirm final value.');
      }
    }

    // Rule 3: Ambiguous look-alike digits cannot remain High confidence
    if (item?.ambiguousDigits) {
      if (confidence === 'High') confidence = 'Review';
      if (!flags.some(f => f.toLowerCase().includes('digit'))) {
        flags.push('Handwritten digit may be ambiguous (e.g. 36 vs 38 / 48 vs 43) — verify carefully.');
      }
    }

    // Rule 4: Ambiguous Width vs Height orientation
    if (item?.ambiguousOrientation) {
      if (confidence === 'High') confidence = 'Review';
      if (!flags.some(f => f.toLowerCase().includes('width') && f.toLowerCase().includes('height'))) {
        flags.push('Verify Width × Height order against original notebook.');
      }
    }

    // Rule 5: Feet vs Inches plausibility check when unit is not explicitly marked
    if (width !== null && height !== null) {
      if (unit === 'inch' && !unitExplicit && (width <= 12 || height <= 12)) {
        unitAmbiguous = true;
        if (confidence === 'High') confidence = 'Review';
        flags.push('Small value without unit mark — confirm whether Feet or Inches.');
      }
      if (unit === 'feet' && !unitExplicit && (width > 18 || height > 18)) {
        unitAmbiguous = true;
        if (confidence === 'High') confidence = 'Review';
        flags.push('Large value marked as Feet without explicit unit — confirm whether Inches.');
      }
      if (unit === 'inch' && (width >= 300 || height >= 300)) {
        unitAmbiguous = true;
        if (confidence === 'High') confidence = 'Review';
        flags.push('Value >= 300 marked as Inches — confirm whether Millimeters (MM).');
      }
      if (unit === 'mm' && (width < 200 || height < 200)) {
        unitAmbiguous = true;
        if (confidence === 'High') confidence = 'Review';
        flags.push('Small value marked as MM — confirm whether Inches or Feet.');
      }
    }

    // Rule 6: Any row with flags cannot remain High confidence
    if (flags.length > 0 && confidence === 'High') {
      confidence = 'Review';
    }

    const rowId = `nb-row-${options.pageId}-${idx + 1}`;
    const notes = typeof item?.notes === 'string' && item.notes.trim() ? item.notes.trim().slice(0, 140) : undefined;

    return {
      id: rowId,
      pageId: options.pageId,
      pageLabel,
      windowNumber,
      rawText: rawText || `${windowNumber}: ${width ?? '?'} × ${height ?? '?'}`,
      width,
      height,
      unit,
      unitAmbiguous,
      confidence,
      flags,
      notes,
      // Human verification gate: only High-confidence complete rows start pre-checked; Review/Unclear MUST be verified by user
      confirmed: confidence === 'High' && width !== null && height !== null,
      originalAiSnapshot: {
        windowNumber,
        rawText: rawText || `${windowNumber}: ${width ?? '?'} × ${height ?? '?'}`,
        width,
        height,
        unit,
        confidence,
      },
    };
  });
}

function getGeminiApiKey(): string | null {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  return key.length > 0 ? key : null;
}

function normalizeMimeTypeForGemini(mimeType: string, fileName?: string): string {
  const lowerMime = (mimeType || '').toLowerCase().trim();
  if (lowerMime === 'image/jpg') return 'image/jpeg';
  if (
    lowerMime === 'image/jpeg' ||
    lowerMime === 'image/png' ||
    lowerMime === 'image/webp' ||
    lowerMime === 'image/heic' ||
    lowerMime === 'image/heif'
  ) {
    return lowerMime;
  }
  const lowerName = (fileName || '').toLowerCase();
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.webp')) return 'image/webp';
  if (lowerName.endsWith('.heic')) return 'image/heic';
  if (lowerName.endsWith('.heif')) return 'image/heif';
  return 'image/jpeg';
}

export async function analyzeNotebookPhoto(
  imageBuffer: Buffer,
  mimeType: string,
  options: {
    pageId: string;
    pageNumber: number;
    fileName?: string;
    existingWindowCount?: number;
    defaultUnit?: WindowMeasurementUnit;
  }
): Promise<AnalyzedNotebookPageResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    // Use HTTP 500 (not 503) so reverse proxies with error_page 503 = /warmup.html never replace JSON with HTML
    throw new NotebookScannerError(
      'AI Notebook Scanner requires GEMINI_API_KEY to be configured on the server.',
      500,
      'GEMINI_API_KEY_MISSING'
    );
  }

  if (!imageBuffer || imageBuffer.length === 0) {
    throw new NotebookScannerError('Uploaded notebook photograph is empty.', 400, 'EMPTY_IMAGE');
  }

  const normalizedMime = normalizeMimeTypeForGemini(mimeType, options.fileName);
  const base64Image = imageBuffer.toString('base64');

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const userPrompt = `Analyze this handwritten sliding window measurement notebook photograph (Page ${options.pageNumber}).
Extract EVERY window measurement row visible on the page, along with Customer Name and Project Name if written.
Default workshop unit if unmarked and in typical inch range (15-150) is "${options.defaultUnit || 'inch'}", but mark unitExplicit=false whenever the unit is not actually written on the page.
Never guess blurry, smudged, or cut-off digits — return null and confidence="Unclear" for unreadable numbers.
Return valid JSON matching the schema.`;

  const modelsToTry = CANDIDATE_MODELS;
  let lastError: unknown = null;
  let responseText: string | undefined;
  let modelUsed = PRIMARY_MODEL;

  for (const model of modelsToTry) {
    const maxAttempts = model === PRIMARY_MODEL ? 2 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const generatePromise = ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: normalizedMime,
                    data: base64Image,
                  },
                },
                { text: userPrompt },
              ],
            },
          ],
          config: {
            systemInstruction: NOTEBOOK_SCAN_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: NOTEBOOK_RESPONSE_SCHEMA,
          },
        });

        const timeoutMs = model === 'gemini-3.1-flash-lite' ? 35000 : 45000;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`Model ${model} timed out after ${Math.round(timeoutMs / 1000)}s`));
          }, timeoutMs);
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);
        if (timer) clearTimeout(timer);

        const extractedText = typeof response?.text === 'string' ? response.text.trim() : '';
        if (extractedText) {
          responseText = extractedText;
          modelUsed = model;
          break;
        }
        lastError = new Error(`Model ${model} returned an empty response.`);
      } catch (err: any) {
        if (timer) clearTimeout(timer);
        lastError = err;
        const status = Number(err?.status || err?.statusCode || 0);
        const msg = String(err?.message || '');
        const lowerMsg = msg.toLowerCase();

        // If authentication / invalid key, fail fast with HTTP 500 JSON (never 502/503/504/403)
        if (status === 401 || status === 403) {
          throw new NotebookScannerError(
            'Gemini API authentication failed. Check server GEMINI_API_KEY configuration.',
            500,
            'GEMINI_AUTH_ERROR'
          );
        }

        // If Gemini reports the uploaded image bytes themselves cannot be decoded, fail fast with HTTP 400 JSON
        if (
          status === 400 &&
          (lowerMsg.includes('unable to process input image') ||
            lowerMsg.includes('invalid image') ||
            lowerMsg.includes('could not decode'))
        ) {
          throw new NotebookScannerError(
            'The uploaded notebook photo could not be decoded. Please take a new JPG or PNG photo and try again.',
            400,
            'INVALID_IMAGE_CONTENT'
          );
        }

        const isTransient = status === 503 || status === 429 || msg.includes('UNAVAILABLE') || msg.includes('503');
        if (isTransient && attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 900));
          continue;
        }
        break;
      }
    }
    if (responseText) break;
  }

  if (!responseText) {
    const errAny = lastError as any;
    const rawStatus = Number(errAny?.status || errAny?.statusCode || 0);
    const detail = lastError instanceof Error ? lastError.message : 'Unknown Gemini Vision error';
    const lowerDetail = detail.toLowerCase();

    // IMPORTANT: Never emit HTTP 502, 503, 504, or 403 from this API because the Cloud Run /
    // AI Studio nginx reverse proxy intercepts those status codes (error_page 502 503 504 = /warmup.html)
    // and replaces our JSON body with an HTTP 200 text/html page. Use 400/408/422/429/500 instead.
    if (
      rawStatus === 400 ||
      lowerDetail.includes('unable to process input image') ||
      lowerDetail.includes('invalid image')
    ) {
      throw new NotebookScannerError(
        'The uploaded notebook photo could not be decoded. Please upload a clear JPG, PNG, or WebP photo.',
        400,
        'INVALID_IMAGE_CONTENT'
      );
    }
    if (rawStatus === 429 || lowerDetail.includes('rate limit') || lowerDetail.includes('resource_exhausted') || lowerDetail.includes('quota')) {
      throw new NotebookScannerError(
        'AI Notebook Scanner is temporarily rate-limited. Please wait a few seconds and try scanning again.',
        429,
        'GEMINI_RATE_LIMIT'
      );
    }
    if (lowerDetail.includes('timed out') || lowerDetail.includes('timeout')) {
      throw new NotebookScannerError(
        'AI notebook photo analysis timed out. Please try again with a clearer or slightly smaller photo.',
        408,
        'GEMINI_TIMEOUT'
      );
    }
    if (rawStatus === 503 || lowerDetail.includes('unavailable') || lowerDetail.includes('high demand')) {
      throw new NotebookScannerError(
        'Gemini Vision AI is temporarily experiencing high demand. Please retry in a few seconds.',
        500,
        'GEMINI_UNAVAILABLE'
      );
    }

    throw new NotebookScannerError(
      `Could not analyze notebook photo with Gemini AI. Please retry with a clear photo.`,
      422,
      'GEMINI_ANALYSIS_FAILED'
    );
  }

  let parsed: RawAiNotebookPayload;
  try {
    // Strip markdown code fences if a fallback model wrapped JSON
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new NotebookScannerError(
      'AI returned an unreadable response format for this notebook photo. Please rescan with clearer lighting.',
      422,
      'GEMINI_INVALID_JSON'
    );
  }

  const rows = normalizeAndValidateExtractedRows(parsed.windows || [], {
    pageId: options.pageId,
    pageNumber: options.pageNumber,
    existingWindowCount: options.existingWindowCount,
    defaultUnit: options.defaultUnit,
  });

  const warnings: string[] = [];
  if (Array.isArray(parsed.pageWarnings)) {
    for (const w of parsed.pageWarnings) {
      if (typeof w === 'string' && w.trim()) {
        warnings.push(w.trim().slice(0, 200));
      }
    }
  }
  if (rows.length === 0) {
    warnings.push('No window measurements could be clearly read from this photo. You can rescan or add windows manually.');
  }

  const detectedProjectName =
    typeof parsed.detectedProjectName === 'string' && parsed.detectedProjectName.trim()
      ? parsed.detectedProjectName.trim().slice(0, 120)
      : undefined;
  const detectedCustomerName =
    typeof parsed.detectedCustomerName === 'string' && parsed.detectedCustomerName.trim()
      ? parsed.detectedCustomerName.trim().slice(0, 120)
      : undefined;
  const summary =
    typeof parsed.pageSummary === 'string' && parsed.pageSummary.trim()
      ? parsed.pageSummary.trim().slice(0, 260)
      : `Detected ${rows.length} window measurement${rows.length === 1 ? '' : 's'} on Page ${options.pageNumber}.`;

  return {
    detectedProjectName,
    detectedCustomerName,
    summary,
    warnings,
    rows,
    modelUsed,
  };
}
