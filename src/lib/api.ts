import {
  Door,
  Category,
  DoorMaterial,
  PolishFinish,
  ChaukhatFrame,
  HardwareItem,
  HomeBanner,
  Article,
  Quotation,
  BusinessSettings,
  CalculationInput,
  CalculationResult,
  UserCalculationRecord,
  NotificationCampaign,
  NotificationPreferences,
  NotificationStats,
  NotificationTokenRecord,
  TeamMember,
  ArticleComment,
  ArticleCategory,
  ArticleAnalyticsSummary,
  CustomerEnquiry,
  AIWoodAnalysisResult,
  AIWoodDetectorStats,
  AIWoodDetectorSettings,
  WoodReferenceSample,
  WoodAccuracyBenchmarkResult,
  TrackingOrder,
  PublicTrackingView,
  TrackingStageId,
  StageStatus,
  TrackingMediaItem,
  TrackingDeliveryInfo,
  IndiaDeliveryState,
  DeliveryStory,
  ChaukhatWoodType,
  ChaukhatSectionSize,
  ChaukhatDimensionPreset,
  ChaukhatDesignCard,
  ChaukhatProduct,
  ChaukhatCalculationResult,
  CombinedQuotation,
} from '../types.ts';
import {
  DEFAULT_INDIA_STATES,
  DEFAULT_DELIVERY_STORIES,
} from '../data/indiaDeliveryData.ts';
import {
  DEFAULT_DOORS,
  DEFAULT_CATEGORIES,
  DEFAULT_BANNERS,
  DEFAULT_ARTICLES,
} from '../data/defaultCatalogData.ts';
import {
  verifyAdminCredentialsViaFirestore,
  fetchDirectFirestoreData,
  saveDoorDirectFirestore,
  updateDoorDirectFirestore,
  deleteDoorDirectFirestore,
  updateSettingsDirectFirestore,
  saveMaterialDirectFirestore,
  updateMaterialDirectFirestore,
  deleteMaterialDirectFirestore,
  saveFinishDirectFirestore,
  updateFinishDirectFirestore,
  deleteFinishDirectFirestore,
  saveFrameDirectFirestore,
  updateFrameDirectFirestore,
  deleteFrameDirectFirestore,
  saveHardwareDirectFirestore,
  updateHardwareDirectFirestore,
  deleteHardwareDirectFirestore,
  saveBannerDirectFirestore,
  updateBannerDirectFirestore,
  deleteBannerDirectFirestore,
  saveArticleDirectFirestore,
  updateArticleDirectFirestore,
  deleteArticleDirectFirestore,
  saveTeamMemberDirectFirestore,
  updateTeamMemberDirectFirestore,
  toggleTeamMemberDirectFirestore,
  reorderTeamMembersDirectFirestore,
  deleteTeamMemberDirectFirestore,
  toggleStateDeliveryDirectFirestore,
  updateStateDeliveryDirectFirestore,
  createDeliveryStoryDirectFirestore,
  updateDeliveryStoryDirectFirestore,
  deleteDeliveryStoryDirectFirestore,
  saveChaukhatProductDirectFirestore,
  deleteChaukhatProductDirectFirestore,
  reorderChaukhatProductsDirectFirestore,
  saveChaukhatSectionSizeDirectFirestore,
  deleteChaukhatSectionSizeDirectFirestore,
  cleanUndefined,
  isClientAdminAuthorized,
  ensureFirebaseAuthSession,
  adminLogoutViaFirebase,
} from './firestoreClient.ts';

const ADMIN_TOKEN_KEY = 'shivshahi_admin_token';
const CUSTOM_API_URL_KEY = 'jai_custom_api_base_url';
const CACHED_PROD_URL_KEY = 'jai_cached_production_api_base_url';
const GUEST_FAVORITES_KEY = 'shivshahi_guest_favorites';
const GUEST_CALCULATIONS_KEY = 'shivshahi_guest_calculations';
const CATALOG_CACHE_KEY = 'shivshahi_cached_catalog_v2';
const CALCULATOR_CACHE_KEY = 'shivshahi_cached_calculator_v2';

export const DEFAULT_MATERIALS: DoorMaterial[] = [
  {
    id: 'mat-1',
    name: 'Sagwan',
    ratePerSqFt: 800,
    image: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=600&q=80',
    description: 'Premium grade Central Province (CP) Teak Wood with natural oil & high moisture resistance',
    active: true,
  },
  {
    id: 'mat-2',
    name: 'Sal Wood',
    ratePerSqFt: 650,
    image: 'https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=600&q=80',
    description: 'Heavy, durable Indian hardwood renowned for extreme load-bearing strength',
    active: true,
  },
  {
    id: 'mat-3',
    name: 'Pine',
    ratePerSqFt: 450,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
    description: 'Treated pine timber with light grain texture, kiln-dried for dimensional stability',
    active: true,
  },
  {
    id: 'mat-4',
    name: 'Plywood',
    ratePerSqFt: 350,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    description: 'Boiling Waterproof (BWP) marine grade core with hardwood internal framing',
    active: true,
  },
  {
    id: 'mat-5',
    name: 'Teak Veneer Flush Door',
    ratePerSqFt: 550,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
    description: 'Solid core flush door with 4mm natural Burma teak wood veneer on both sides',
    active: true,
  },
];

export const DEFAULT_FINISHES: PolishFinish[] = [
  {
    id: 'fin-1',
    name: 'Normal Polish',
    ratePerSqFt: 110,
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
    description: 'Standard hand-rubbed spirit French polish for natural wood luster',
    active: true,
  },
  {
    id: 'fin-2',
    name: 'Teak Polish',
    ratePerSqFt: 150,
    image: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=600&q=80',
    description: 'Deep teak oil stain with double protective sealant coat',
    active: true,
  },
  {
    id: 'fin-3',
    name: 'PU Polish (Polyurethane)',
    ratePerSqFt: 250,
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80',
    description: 'Ultra-durable polyurethane Italian finish with anti-scratch UV shield',
    active: true,
  },
  {
    id: 'fin-4',
    name: 'Melamine Polish',
    ratePerSqFt: 180,
    image: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=600&q=80',
    description: 'Heat & water resistant non-yellowing clear protective coat',
    active: true,
  },
  {
    id: 'fin-5',
    name: 'Unpolished / Raw',
    ratePerSqFt: 0,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
    description: 'Natural seasoned raw timber ready for on-site painter finishing',
    active: true,
  },
];

export const DEFAULT_FRAMES: ChaukhatFrame[] = [
  {
    id: 'frm-0',
    name: 'No Frame (Shutter Only)',
    price: 0,
    description: 'Only door shutter without wooden chaukhat frame',
    active: true,
  },
  {
    id: 'frm-1',
    name: 'Normal Frame',
    price: 3500,
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
    description: 'Standard 4×2.5 inch section plain timber Chaukhat with clean rebate',
    active: true,
  },
  {
    id: 'frm-2',
    name: 'Designer Frame',
    price: 11025,
    image: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=80',
    description: '5×3 inch section with stepped moldings, beading, and corner grooving',
    active: true,
  },
  {
    id: 'frm-3',
    name: 'Hand Carving Frame',
    price: 11637,
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    description: 'Heavy 5×3.5 inch pure Sagwan Chaukhat with intricate hand-carved floral border',
    active: true,
  },
];

export const DEFAULT_HARDWARE: HardwareItem[] = [
  {
    id: 'hwd-1',
    name: 'Aldrop Single',
    price: 700,
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
    description: 'Stainless steel 10-inch single aldrop bolt set with tower bolt and latch',
    active: true,
    defaultQty: 1,
  },
  {
    id: 'hwd-2',
    name: 'Heavy Aldrop',
    price: 1300,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80',
    description: 'Heavy-gauge forged brass / SS 12-inch security aldrop kit with heavy duty staples',
    active: true,
    defaultQty: 1,
  },
  {
    id: 'hwd-3',
    name: 'Antique Heavy',
    price: 1700,
    image: 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=1200&q=80',
    description: 'Antique brass finished royal heavy aldrop with lion crest handles & decorative rosette plates',
    active: true,
    defaultQty: 1,
  },
  {
    id: 'hwd-4',
    name: 'Premium Mortise Handle Lock Set',
    price: 2400,
    image: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=1200&q=80',
    description: 'High-security computer key double throw brass mortise lock with designer handles',
    active: true,
    defaultQty: 1,
  },
  {
    id: 'hwd-0',
    name: 'No Hardware Included',
    price: 0,
    description: 'Client supplies or fits own hardware',
    active: true,
    defaultQty: 0,
  },
];

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'Jai Hanuman Door',
  tagline: 'Premium Handcrafted Wooden Doors & Custom Architectural Joinery',
  logoUrl: '/assets/logo.png',
  phone: '7887412884',
  whatsappNumber: '7887412884',
  email: 'shivshahidoors@gmail.com',
  address: 'Plot No. 12, MIDC Industrial Area, Latur, Maharashtra 413531',
  gstNumber: '27AABCU9603R1ZM',
  currencySymbol: '₹',
  quotePrefix: 'JHD',
  additionalChargePercentage: 0,
  additionalChargeName: 'Taxes',
  terms: [
    'Quotation is valid for 15 days from the date of issue.',
    'Delivery lead time: 10 to 18 working days from confirmed order & advance.',
    'Timber is seasoned and moisture-tested prior to manufacturing.',
  ],
  disclaimer: 'Price shown is an estimated factory price and may vary according to final wood grade, carving details, customized size and hardware fittings.',
};

/**
 * Retrieves user-configured custom API server URL from localStorage.
 * Automatically discards dead placeholder domains (jaihanumandoor.com) or mismatched ephemeral container origins.
 */
export function getCustomApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem(CUSTOM_API_URL_KEY);
      if (custom && custom.trim()) {
        const clean = custom.trim().replace(/\/$/, '');
        // Discard non-existent domain or mismatched ephemeral container URLs when running in web browser
        if (clean.includes('jaihanumandoor.com')) {
          localStorage.removeItem(CUSTOM_API_URL_KEY);
          return '';
        }
        if (!isCapacitorOrNative() && window.location.origin) {
          if (
            (clean.includes('.run.app') && clean !== window.location.origin) ||
            ((clean.includes('localhost') || clean.includes('127.0.0.1')) &&
              window.location.hostname !== 'localhost' &&
              window.location.hostname !== '127.0.0.1')
          ) {
            localStorage.removeItem(CUSTOM_API_URL_KEY);
            return '';
          }
        }
        return clean;
      }
    } catch {}
  }
  return '';
}

/**
 * Persists or clears custom API server URL in localStorage.
 */
export function setCustomApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    try {
      const clean = (url || '').trim().replace(/\/$/, '');
      if (clean && !clean.includes('jaihanumandoor.com')) {
        localStorage.setItem(CUSTOM_API_URL_KEY, clean);
      } else {
        localStorage.removeItem(CUSTOM_API_URL_KEY);
      }
    } catch {}
  }
}

/**
 * Retrieves dynamically synced production API server URL from localStorage.
 * Automatically populated when app loads master data from Firestore settings.
 */
export function getCachedProductionApiUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHED_PROD_URL_KEY);
      if (cached && cached.trim()) {
        const clean = cached.trim().replace(/\/$/, '');
        if (clean.includes('jaihanumandoor.com')) {
          localStorage.removeItem(CACHED_PROD_URL_KEY);
          return '';
        }
        return clean;
      }
    } catch {}
  }
  return '';
}

/**
 * Persists dynamically discovered production API server URL from Firestore settings.
 */
export function setCachedProductionApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    try {
      const clean = (url || '').trim().replace(/\/$/, '');
      if (clean && !clean.includes('jaihanumandoor.com')) {
        localStorage.setItem(CACHED_PROD_URL_KEY, clean);
      } else {
        localStorage.removeItem(CACHED_PROD_URL_KEY);
      }
    } catch {}
  }
}

/**
 * Detects whether the app is running in native Capacitor (Android WebView)
 * or local WebView schema where relative API routes will otherwise hit bundled index.html.
 */
export function isCapacitorOrNative(): boolean {
  if (typeof window === 'undefined') return false;
  const isCap = !!(window as any).Capacitor?.isNativePlatform?.() || !!(window as any).Capacitor;
  const isLocalhostScheme = window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '' || window.location.port === '80' || window.location.port === '443'));
  return isCap || isLocalhostScheme;
}

/**
 * Returns the resolved API base URL.
 * In standard web browser execution (non-native), ALWAYS prefers relative same-origin routing ('')
 * so API requests hit the Express backend on the exact same origin without CORS or stale URL failures.
 */
export function getApiBaseUrl(): string {
  // In standard web browser execution (non-native), ALWAYS use relative same-origin routing ('')
  // so all API requests route directly to the Express backend on the current origin.
  if (typeof window !== 'undefined' && !isCapacitorOrNative()) {
    return '';
  }

  const custom = getCustomApiBaseUrl();
  if (custom) return custom;

  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_APP_URL;
  if (typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('jaihanumandoor.com')) {
    return envUrl.trim().replace(/\/$/, '');
  }

  const cachedProd = getCachedProductionApiUrl();
  if (cachedProd) return cachedProd;

  if (isCapacitorOrNative()) {
    return 'https://ais-pre-um3h2mohb2itzx3vvljosl-768916382182.asia-southeast1.run.app';
  }

  return '';
}

export interface SafeJsonResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  isHtml?: boolean;
  status: number;
}

/**
 * Safely parses an HTTP response, strictly validating Content-Type and HTTP status
 * BEFORE attempting JSON deserialization. Prevents "Unexpected token '<'" exceptions
 * when the server or a reverse proxy returns HTML error pages or SPA fallback documents.
 */
export async function parseSafeJsonResponse<T = any>(
  res: Response,
  actionName = 'Operation'
): Promise<SafeJsonResponse<T>> {
  const status = res.status;
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    let previewText = '';
    try {
      previewText = await res.text();
    } catch {}

    const isHtml = previewText.trim().startsWith('<') || contentType.toLowerCase().includes('text/html');
    const cleanError = isHtml
      ? `Server returned an HTML document (${status}) instead of valid JSON for ${actionName}. The backend route may be missing, waking up, or intercepted by SPA routing.`
      : `Server returned non-JSON response (${contentType || 'unknown'}, status ${status}) for ${actionName}.`;

    return {
      success: false,
      error: cleanError,
      isHtml,
      status,
    };
  }

  try {
    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data?.error || data?.message || `${actionName} failed with HTTP status ${status}`;
      return {
        success: false,
        error: errorMsg,
        data,
        status,
      };
    }

    return {
      success: true,
      data: data as T,
      status,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to parse JSON response for ${actionName}: ${err.message || 'Malformed JSON'}`,
      status,
    };
  }
}

function updateLocalCatalogDoor(savedDoor: Door): void {
  try {
    const cached = localStorage.getItem(CATALOG_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.doors)) {
        const idx = parsed.doors.findIndex((d: Door) => d.id === savedDoor.id);
        if (idx !== -1) {
          parsed.doors[idx] = savedDoor;
        } else {
          parsed.doors.unshift(savedDoor);
        }
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(parsed));
      }
    }
  } catch {}
}

function removeLocalCatalogDoor(doorId: string): void {
  try {
    const cached = localStorage.getItem(CATALOG_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.doors)) {
        parsed.doors = parsed.doors.filter((d: Door) => d.id !== doorId);
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(parsed));
      }
    }
  } catch {}
}

/**
 * Resolves a relative path to a fully qualified API URL when needed.
 */
export function resolveApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Resolves a product or banner image URL with base server URL or fallback.
 */
/**
 * Resolves a product or banner image URL with base server URL or fallback.
 * Automatically extracts and normalizes /uploads/ paths from stale dev URLs or private R2 URLs
 * to ensure images always load reliably via the same-origin backend proxy.
 */
export function resolveImageUrl(path: string | undefined | null, fallback?: string): string {
  const defaultFallback = fallback || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80';
  if (!path || !path.trim()) return defaultFallback;

  const trimmed = path.trim();

  // Data URLs and Blob URLs are used as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If path contains /uploads/ (regardless of whether it was stored with an obsolete dev container URL,
  // a local test host, or private Cloudflare R2 bucket URL):
  const uploadsIdx = trimmed.lastIndexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const filename = trimmed.slice(uploadsIdx + '/uploads/'.length).split('?')[0].split('#')[0];
    if (filename) {
      if (typeof window !== 'undefined' && !isCapacitorOrNative()) {
        return '/uploads/' + filename;
      }
      const base = getApiBaseUrl();
      return base ? base + '/uploads/' + filename : '/uploads/' + filename;
    }
  }

  // Handle prefix like uploads/filename.ext
  if (trimmed.startsWith('uploads/')) {
    const filename = trimmed.slice('uploads/'.length).split('?')[0].split('#')[0];
    if (filename) {
      if (typeof window !== 'undefined' && !isCapacitorOrNative()) {
        return '/uploads/' + filename;
      }
      const base = getApiBaseUrl();
      return base ? base + '/uploads/' + filename : '/uploads/' + filename;
    }
  }

  // Handle Cloudflare R2 direct URLs (private bucket access is disabled, so route via backend proxy)
  if (trimmed.includes('r2.cloudflarestorage.com') || trimmed.includes('jai-hanuman-door-media')) {
    const filename = trimmed.split('/').pop()?.split('?')[0].split('#')[0];
    if (filename) {
      if (typeof window !== 'undefined' && !isCapacitorOrNative()) {
        return '/uploads/' + filename;
      }
      const base = getApiBaseUrl();
      return base ? base + '/uploads/' + filename : '/uploads/' + filename;
    }
  }

  // If it's a dead ais-dev- container URL with another path, strip the domain
  if (trimmed.includes('ais-dev-')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname || defaultFallback;
    } catch {
      return defaultFallback;
    }
  }

  // Legitimate external image URLs (e.g. Unsplash, external CDN)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Relative path
  const cleanPath = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  if (typeof window !== 'undefined' && !isCapacitorOrNative()) {
    return cleanPath;
  }
  const base = getApiBaseUrl();
  return base ? base + cleanPath : cleanPath;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoffMs = 350
): Promise<Response> {
  const fullUrl = resolveApiUrl(url);

  let lastError: any = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const signal = options.signal || controller.signal;

    try {
      const response = await fetch(fullUrl, {
        ...options,
        signal,
      });
      clearTimeout(timeoutId);

      // Retry on 502/503/504 (transient server/proxy gateway errors)
      if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < retries - 1) {
        await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error(`Network request failed for ${url}`);
}

/**
 * Helper for API fetches that ensures URLs are resolved correctly on all platforms,
 * includes same-origin credentials, and automatically falls back to relative same-origin
 * routing if a custom/cached base URL fails at the network layer.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const cleanRelative = url.startsWith('/') ? url : `/${url}`;
  const fullUrl = resolveApiUrl(url);
  const isSameOrigin = fullUrl.startsWith('/');
  const fetchOpts: RequestInit = {
    ...(isSameOrigin ? { credentials: 'same-origin' } : {}),
    ...options,
  };

  try {
    return await fetch(fullUrl, fetchOpts);
  } catch (err: any) {
    // If a custom or external base URL was prepended and threw Failed to fetch,
    // clear any stale custom base URL and retry against same-origin relative path
    if (fullUrl !== cleanRelative && typeof window !== 'undefined' && !isCapacitorOrNative()) {
      try {
        localStorage.removeItem(CUSTOM_API_URL_KEY);
      } catch {}
      return await fetch(cleanRelative, {
        credentials: 'same-origin',
        ...options,
      });
    }
    throw err;
  }
}

export function getAdminToken(): string | null {
  try {
    const existing = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (existing && existing.trim()) {
      return existing.trim();
    }
    if (isClientAdminAuthorized()) {
      const minted = `firestore_admin_token_${Date.now()}`;
      localStorage.setItem(ADMIN_TOKEN_KEY, minted);
      return minted;
    }
  } catch {}
  return null;
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getAdminAuthHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}`, 'x-admin-token': token } : {};
}

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}`, 'x-admin-token': token } : {}),
  };
}

// Guest Favorites (LocalStorage)
export function getGuestFavorites(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setGuestFavorites(ids: string[]): void {
  try {
    localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function toggleGuestFavorite(doorId: string): string[] {
  const current = getGuestFavorites();
  const exists = current.includes(doorId);
  const updated = exists ? current.filter(id => id !== doorId) : [...current, doorId];
  setGuestFavorites(updated);
  return updated;
}

// Guest Calculation History (LocalStorage)
export function getGuestCalculations(): UserCalculationRecord[] {
  try {
    const raw = localStorage.getItem(GUEST_CALCULATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestCalculation(data: {
  input: CalculationInput;
  result: CalculationResult;
  doorId?: string;
  doorName?: string;
  doorImage?: string;
  notes?: string;
  quotationId?: string;
}): { calculation: UserCalculationRecord; history: UserCalculationRecord[] } {
  const current = getGuestCalculations();
  const newRecord: UserCalculationRecord = {
    id: 'calc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    userId: 'guest',
    doorId: data.doorId,
    doorName: data.doorName || 'Custom Engineered Door',
    doorImage: data.doorImage,
    date: new Date().toISOString(),
    input: data.input,
    result: data.result,
    notes: data.notes,
    quotationId: data.quotationId,
  };
  const updated = [newRecord, ...current].slice(0, 50);
  try {
    localStorage.setItem(GUEST_CALCULATIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return { calculation: newRecord, history: updated };
}

export function deleteGuestCalculation(id: string): UserCalculationRecord[] {
  const current = getGuestCalculations();
  const updated = current.filter(c => c.id !== id);
  try {
    localStorage.setItem(GUEST_CALCULATIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function clearGuestCalculations(): void {
  try {
    localStorage.removeItem(GUEST_CALCULATIONS_KEY);
  } catch {
    // ignore
  }
}

// ---------------- Public Endpoints ----------------

export function invalidateLocalCatalogAndCalculatorCache(): void {
  try {
    localStorage.removeItem(CATALOG_CACHE_KEY);
    localStorage.removeItem(CALCULATOR_CACHE_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function fetchCatalog(): Promise<{
  doors: Door[];
  categories: Category[];
  banners: HomeBanner[];
  articles: Article[];
  teamMembers?: TeamMember[];
  settings: BusinessSettings;
}> {
  // 1. Try server HTTP API endpoint
  try {
    const res = await fetchWithRetry('/api/catalog', {}, 2, 300);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && Array.isArray(data.doors) && data.doors.length > 0) {
        try {
          localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data));
          if (data.settings?.productionApiUrl) {
            setCachedProductionApiUrl(data.settings.productionApiUrl);
          }
        } catch {}
        return data;
      }
    }
  } catch (err: any) {
    console.warn('Network request for catalog failed, trying direct Firestore cloud store...', err.message || err);
  }

  // 2. Authoritative direct Firestore database fetch (Prioritized before local cache so Android APK always gets fresh admin updates)
  try {
    const fsData = await fetchDirectFirestoreData();
    if (fsData && Array.isArray(fsData.doors) && fsData.doors.length > 0) {
      const activeBanners = Array.isArray(fsData.banners)
        ? fsData.banners.filter((b: any) => b.active !== false)
        : DEFAULT_BANNERS;
      const activeTeamMembers = Array.isArray(fsData.teamMembers)
        ? fsData.teamMembers
            .filter((m: any) => m.active !== false)
            .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
        : [];
      const catalogData = {
        doors: fsData.doors,
        categories: Array.isArray(fsData.categories) && fsData.categories.length > 0 ? fsData.categories : DEFAULT_CATEGORIES,
        banners: activeBanners,
        articles: Array.isArray(fsData.articles) && fsData.articles.length > 0 ? fsData.articles : DEFAULT_ARTICLES,
        teamMembers: activeTeamMembers,
        settings: fsData.settings || DEFAULT_SETTINGS,
      };
      try {
        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalogData));
        if (fsData.settings?.productionApiUrl) {
          setCachedProductionApiUrl(fsData.settings.productionApiUrl);
        }
      } catch {}
      console.info('Restored catalog data directly from Firestore cloud store.');
      return catalogData;
    }
  } catch (fsErr: any) {
    console.warn('Direct Firestore catalog fallback error:', fsErr.message);
  }

  // 3. Check local client cache (Offline fallback)
  try {
    const cached = localStorage.getItem(CATALOG_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.doors) && parsed.doors.length > 0) {
        console.info('Restored catalog data from client cache.');
        return parsed;
      }
    }
  } catch {}

  // 4. Guaranteed offline fallback dataset (Ensures zero blank screens)
  console.info('Using built-in master catalog fallback.');
  return {
    doors: DEFAULT_DOORS,
    categories: DEFAULT_CATEGORIES,
    banners: DEFAULT_BANNERS,
    articles: DEFAULT_ARTICLES,
    teamMembers: [],
    settings: DEFAULT_SETTINGS,
  };
}

export async function fetchCalculatorData(): Promise<{
  materials: DoorMaterial[];
  finishes: PolishFinish[];
  frames: ChaukhatFrame[];
  hardware: HardwareItem[];
  settings: BusinessSettings;
}> {
  // 1. Try server HTTP API endpoint
  try {
    const res = await fetchWithRetry('/api/calculator-data', {}, 2, 300);
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      const result = {
        materials: Array.isArray(data.materials) && data.materials.length > 0 ? data.materials : DEFAULT_MATERIALS,
        finishes: Array.isArray(data.finishes) && data.finishes.length > 0 ? data.finishes : DEFAULT_FINISHES,
        frames: Array.isArray(data.frames) && data.frames.length > 0 ? data.frames : DEFAULT_FRAMES,
        hardware: Array.isArray(data.hardware) && data.hardware.length > 0 ? data.hardware : DEFAULT_HARDWARE,
        settings: data.settings || DEFAULT_SETTINGS,
      };
      try {
        localStorage.setItem(CALCULATOR_CACHE_KEY, JSON.stringify(result));
      } catch {}
      return result;
    }
  } catch (err: any) {
    console.warn('Network request for calculator data failed, checking Firestore and cache...', err.message || err);
  }

  // 2. Authoritative direct Firestore database fetch (Prioritized before local cache so Android APK always gets fresh rates)
  try {
    const fsData = await fetchDirectFirestoreData();
    if (fsData) {
      const result = {
        materials: Array.isArray(fsData.materials) && fsData.materials.length > 0 ? fsData.materials.filter((m: any) => m.active !== false) : DEFAULT_MATERIALS,
        finishes: Array.isArray(fsData.finishes) && fsData.finishes.length > 0 ? fsData.finishes.filter((f: any) => f.active !== false) : DEFAULT_FINISHES,
        frames: Array.isArray(fsData.frames) && fsData.frames.length > 0 ? fsData.frames.filter((fr: any) => fr.active !== false) : DEFAULT_FRAMES,
        hardware: Array.isArray(fsData.hardware) && fsData.hardware.length > 0 ? fsData.hardware.filter((h: any) => h.active !== false) : DEFAULT_HARDWARE,
        settings: fsData.settings || DEFAULT_SETTINGS,
      };
      try {
        localStorage.setItem(CALCULATOR_CACHE_KEY, JSON.stringify(result));
      } catch {}
      return result;
    }
  } catch (fsErr: any) {
    console.warn('Direct Firestore calculator data error:', fsErr.message);
  }

  // 3. Check local client cache (Offline fallback)
  try {
    const cached = localStorage.getItem(CALCULATOR_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.materials) && parsed.materials.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // 4. Guaranteed offline fallback master rates
  return {
    materials: DEFAULT_MATERIALS,
    finishes: DEFAULT_FINISHES,
    frames: DEFAULT_FRAMES,
    hardware: DEFAULT_HARDWARE,
    settings: DEFAULT_SETTINGS,
  };
}

export async function calculatePrice(input: CalculationInput): Promise<CalculationResult> {
  const res = await fetchWithRetry('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }, 2, 300);
  if (!res.ok) throw new Error('Calculation failed');
  return res.json();
}

export async function createQuotation(data: {
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  doorId?: string;
  doorName?: string;
  doorImage?: string;
  notes?: string;
  widthInch: number;
  heightInch: number;
  materialId: string;
  finishId: string;
  frameId: string;
  hardwareId: string;
  hardwareQty: number;
}): Promise<{ quotation: Quotation; settings: BusinessSettings }> {
  const res = await fetchWithRetry('/api/quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }, 2, 400);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create quotation' }));
    throw new Error(err.error || 'Failed to create quotation');
  }
  return res.json();
}

// ---------------- Customer Favorites & Calculations (Client Storage) ----------------

export async function toggleUserFavorite(doorId: string): Promise<{
  favoriteDoorIds: string[];
  isFavorite: boolean;
}> {
  const updated = toggleGuestFavorite(doorId);
  return {
    favoriteDoorIds: updated,
    isFavorite: updated.includes(doorId),
  };
}

export async function fetchUserFavorites(): Promise<Door[]> {
  const guestIds = getGuestFavorites();
  if (guestIds.length === 0) return [];
  const catalog = await fetchCatalog();
  return catalog.doors.filter(d => guestIds.includes(d.id));
}

export async function saveUserCalculation(data: {
  input: CalculationInput;
  result: CalculationResult;
  doorId?: string;
  doorName?: string;
  doorImage?: string;
  notes?: string;
  quotationId?: string;
}): Promise<{ calculation: UserCalculationRecord; history: UserCalculationRecord[] }> {
  return saveGuestCalculation(data);
}

export async function fetchUserCalculations(): Promise<UserCalculationRecord[]> {
  return getGuestCalculations();
}

export async function deleteUserCalculation(id: string): Promise<UserCalculationRecord[]> {
  return deleteGuestCalculation(id);
}

export async function clearUserCalculations(): Promise<void> {
  clearGuestCalculations();
}


export interface ImageUploadOptions {
  /** Maximum width or height in pixels (default: 1680 for door/product photos, 1920 for banners) */
  maxDimension?: number;
  /** JPEG/WebP compression quality between 0.1 and 1.0 (default: 0.82 to preserve wood grain and carving detail) */
  quality?: number;
  /** Force preservation of alpha transparency (default: auto-detected for PNG/WebP cutouts) */
  preserveTransparency?: boolean;
  /** Skip recompression if file is already <= this size in bytes and within maxDimension (default: 320 KB) */
  skipThresholdBytes?: number;
  /** Optional progress callback (0 to 100) */
  onProgress?: (percent: number, stage?: 'optimizing' | 'uploading') => void;
}

export interface ImageOptimizationResult {
  file: File;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  skipped: boolean;
  durationMs: number;
}

export interface UploadedImageResponse {
  url: string;
  originalSize?: number;
  optimizedSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
}

/**
 * Checks if a canvas contains any semi-transparent or transparent pixels by sampling a grid.
 */
function canvasHasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const sampleW = Math.min(width, 64);
    const sampleH = Math.min(height, 64);
    const stepX = Math.max(1, Math.floor(width / sampleW));
    const stepY = Math.max(1, Math.floor(height / sampleH));
    const imgData = ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const alphaIndex = (y * width + x) * 4 + 3;
        if (imgData[alphaIndex] < 250) {
          return true;
        }
      }
    }
  } catch {
    // If tainted or unavailable, assume transparent to be safe
    return true;
  }
  return false;
}

/**
 * Decodes an image file efficiently in the browser using native createImageBitmap (respecting EXIF orientation)
 * with a fast object-URL fallback. Avoids slow FileReader.readAsDataURL base64 allocation on multi-megabyte files.
 */
async function decodeImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof window !== 'undefined' && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          try {
            bitmap.close();
          } catch {}
        },
      };
    } catch {
      // Fall through to HTMLImageElement + objectURL
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to decode image file. Please select a valid JPG, PNG, or WebP photo.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Compresses and resizes an image in the browser before upload while preserving aspect ratio,
 * orientation, wood grain detail, and PNG cutout transparency.
 */
export async function optimizeImageForUpload(
  file: File,
  options: ImageUploadOptions = {}
): Promise<ImageOptimizationResult> {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const maxDimension = options.maxDimension ?? 1680;
  const quality = options.quality ?? 0.82;
  const skipThresholdBytes = options.skipThresholdBytes ?? 320 * 1024;

  // Never attempt canvas compression on non-image files or SVG vector graphics
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    !file.type.startsWith('image/') ||
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif'
  ) {
    return {
      file,
      originalSize: file.size,
      optimizedSize: file.size,
      width: 0,
      height: 0,
      skipped: true,
      durationMs: 0,
    };
  }

  const decoded = await decodeImageSource(file);
  try {
    const origWidth = decoded.width;
    const origHeight = decoded.height;
    const needsResize = origWidth > maxDimension || origHeight > maxDimension;

    const isStandardWebImage =
      file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/webp' || file.type === 'image/png';

    // Skip recompression when the image is already compact and within target dimensions
    if (!needsResize && file.size <= skipThresholdBytes && isStandardWebImage) {
      const elapsed = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime);
      return {
        file,
        originalSize: file.size,
        optimizedSize: file.size,
        width: origWidth,
        height: origHeight,
        skipped: true,
        durationMs: elapsed,
      };
    }

    let targetWidth = origWidth;
    let targetHeight = origHeight;
    if (needsResize) {
      if (origWidth >= origHeight) {
        targetWidth = maxDimension;
        targetHeight = Math.max(1, Math.round((origHeight * maxDimension) / origWidth));
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.max(1, Math.round((origWidth * maxDimension) / origHeight));
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        file,
        originalSize: file.size,
        optimizedSize: file.size,
        width: origWidth,
        height: origHeight,
        skipped: true,
        durationMs: 0,
      };
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);

    const isPngOrWebp =
      file.type === 'image/png' ||
      file.type === 'image/webp' ||
      file.name?.toLowerCase().endsWith('.png') ||
      file.name?.toLowerCase().endsWith('.webp');

    let keepAlpha = Boolean(options.preserveTransparency);
    if (!keepAlpha && isPngOrWebp) {
      keepAlpha = canvasHasTransparency(ctx, targetWidth, targetHeight);
    }

    const outputMime = keepAlpha ? 'image/png' : 'image/jpeg';
    const outputExt = keepAlpha ? '.png' : '.jpg';

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(b => resolve(b), outputMime, keepAlpha ? undefined : quality);
    });

    if (!blob) {
      return {
        file,
        originalSize: file.size,
        optimizedSize: file.size,
        width: origWidth,
        height: origHeight,
        skipped: true,
        durationMs: 0,
      };
    }

    // If recompression did not reduce size and no resize occurred, keep the original file untouched
    if (!needsResize && blob.size >= file.size) {
      const elapsed = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime);
      return {
        file,
        originalSize: file.size,
        optimizedSize: file.size,
        width: origWidth,
        height: origHeight,
        skipped: true,
        durationMs: elapsed,
      };
    }

    const baseName = (file.name || 'door-photo').replace(/\.[^/.]+$/, '');
    const optimizedFile = new File([blob], `${baseName}${outputExt}`, {
      type: outputMime,
      lastModified: Date.now(),
    });

    const elapsed = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime);
    return {
      file: optimizedFile,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
      width: targetWidth,
      height: targetHeight,
      skipped: false,
      durationMs: elapsed,
    };
  } finally {
    decoded.cleanup();
  }
}

/**
 * Compresses an image file on the client using HTML5 Canvas to a web-optimized permanent data URL.
 * Used as an offline/serverless fallback for standalone Android APK builds when the HTTP upload endpoint is unreachable.
 */
export async function compressImageToDataUrl(file: File, maxDimension = 1000, quality = 0.80): Promise<string> {
  const optimized = await optimizeImageForUpload(file, {
    maxDimension,
    quality,
    skipThresholdBytes: 180 * 1024,
  });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to encode optimized image as Data URL'));
    reader.readAsDataURL(optimized.file);
  });
}

/**
 * Uploads a binary File via XMLHttpRequest with real upload progress events and a strict timeout.
 */
function uploadFileWithProgress(
  endpoint: string,
  fileToUpload: File,
  onProgress?: (percent: number) => void,
  timeoutMs = 60000
): Promise<{ ok: boolean; status: number; data?: any; error?: string; isHtml?: boolean }> {
  return new Promise((resolve, reject) => {
    const fullUrl = resolveApiUrl(endpoint);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', fullUrl, true);
    xhr.timeout = timeoutMs;

    const token = getAdminToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('x-admin-token', token);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const pct = Math.min(98, Math.max(10, Math.round((event.loaded / event.total) * 100)));
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      const status = xhr.status;
      const contentType = (xhr.getResponseHeader('content-type') || '').toLowerCase();
      const responseText = xhr.responseText || '';
      const isHtml = responseText.trim().startsWith('<') || contentType.includes('text/html');

      if (isHtml || !contentType.includes('application/json')) {
        resolve({
          ok: false,
          status,
          isHtml,
          error: isHtml
            ? `Upload server returned HTML (${status}) instead of JSON`
            : `Upload server returned non-JSON (${status})`,
        });
        return;
      }

      try {
        const parsed = JSON.parse(responseText);
        if (status >= 200 && status < 300 && parsed && parsed.url) {
          resolve({ ok: true, status, data: parsed });
        } else {
          resolve({
            ok: false,
            status,
            error: parsed?.error || `Upload failed with HTTP ${status}`,
          });
        }
      } catch (err: any) {
        resolve({
          ok: false,
          status,
          error: `Malformed JSON response from upload server: ${err.message}`,
        });
      }
    };

    xhr.onerror = () => {
      reject(new Error(`Network error during upload to ${fullUrl} (HTTP ${xhr.status || 0}). Please check backend server status and network connectivity.`));
    };

    xhr.ontimeout = () => {
      reject(new Error(`Upload timed out after ${Math.round(timeoutMs / 1000)} seconds`));
    };

    const formData = new FormData();
    // Resolve safe filename with proper extension if fileToUpload.name is missing, empty, or 'blob' on Android WebView
    let safeName = (fileToUpload.name && fileToUpload.name !== 'blob' && fileToUpload.name.trim())
      ? fileToUpload.name.trim()
      : '';
    if (!safeName) {
      const ext = fileToUpload.type?.includes('png')
        ? '.png'
        : fileToUpload.type?.includes('webp')
        ? '.webp'
        : fileToUpload.type?.includes('video') || fileToUpload.type?.includes('mp4')
        ? '.mp4'
        : '.jpg';
      safeName = `android_upload_${Date.now()}${ext}`;
    }
    formData.append('file', fileToUpload, safeName);
    xhr.send(formData);
  });
}

const uploadSessionCache = new Map<string, UploadedImageResponse>();

export async function uploadImage(
  file: File,
  options: ImageUploadOptions = {}
): Promise<UploadedImageResponse> {
  if (!file) {
    throw new Error('No image file provided for upload.');
  }

  const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
  if (uploadSessionCache.has(cacheKey)) {
    options.onProgress?.(100, 'uploading');
    console.info(`[AdminUpload] Returning cached upload for ${file.name}`);
    return uploadSessionCache.get(cacheKey)!;
  }

  const totalStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
  options.onProgress?.(5, 'optimizing');

  // 1. Optimize & resize image in browser BEFORE uploading over the network
  let optimization: ImageOptimizationResult;
  try {
    optimization = await optimizeImageForUpload(file, {
      maxDimension: options.maxDimension ?? 1680,
      quality: options.quality ?? 0.82,
      preserveTransparency: options.preserveTransparency,
      skipThresholdBytes: options.skipThresholdBytes ?? 320 * 1024,
    });
  } catch (optErr: any) {
    console.warn('[AdminUpload] Browser image optimization fallback:', optErr.message);
    optimization = {
      file,
      originalSize: file.size,
      optimizedSize: file.size,
      width: 0,
      height: 0,
      skipped: true,
      durationMs: 0,
    };
  }

  options.onProgress?.(20, 'uploading');

  // 2. Upload the OPTIMIZED binary file directly to /api/upload with progress & timeout
  try {
    const uploadRes = await uploadFileWithProgress(
      '/api/upload',
      optimization.file,
      (pct) => options.onProgress?.(pct, 'uploading'),
      20000
    );

    if (uploadRes.ok && uploadRes.data?.url) {
      const serverUrl = String(uploadRes.data.url).trim();
      const totalDurationMs = Math.round(
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - totalStart
      );
      options.onProgress?.(100, 'uploading');

      console.info(
        `[AdminUpload] Photo uploaded in ${totalDurationMs}ms | Original: ${(optimization.originalSize / 1024).toFixed(1)}KB -> Optimized: ${(optimization.optimizedSize / 1024).toFixed(1)}KB (${optimization.width}x${optimization.height}) | URL: ${serverUrl}`
      );

      // If running inside native Capacitor APK and server returned a relative path, resolve with base URL
      if (isCapacitorOrNative() && serverUrl.startsWith('/')) {
        return {
          url: resolveImageUrl(serverUrl),
          originalSize: optimization.originalSize,
          optimizedSize: optimization.optimizedSize,
          width: optimization.width,
          height: optimization.height,
          durationMs: totalDurationMs,
        };
      }

      return {
        url: serverUrl,
        originalSize: optimization.originalSize,
        optimizedSize: optimization.optimizedSize,
        width: optimization.width,
        height: optimization.height,
        durationMs: totalDurationMs,
      };
    } else {
      // Server responded with an explicit error (e.g. durable storage failed or permissions error)
      throw new Error(uploadRes.error || uploadRes.data?.error || 'Durable upload to cloud storage failed');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('Network error')) {
      throw err;
    }
    console.warn('[AdminUpload] Direct server upload unreachable, using client offline fallback:', err.message);
  }

  // 3. Resilient Fallback (only when backend server is unreachable, e.g., standalone offline Android APK)
  try {
    const fallbackDataUrl = await compressImageToDataUrl(
      optimization.file,
      Math.min(options.maxDimension ?? 1000, 1000),
      0.80
    );
    const totalDurationMs = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - totalStart
    );
    options.onProgress?.(100, 'uploading');
    return {
      url: fallbackDataUrl,
      originalSize: optimization.originalSize,
      optimizedSize: optimization.optimizedSize,
      width: optimization.width,
      height: optimization.height,
      durationMs: totalDurationMs,
    };
  } catch (fallbackErr: any) {
    throw new Error(fallbackErr.message || 'Failed to process and upload image.');
  }
}

export interface DriveImagePreviewResult {
  success: boolean;
  fileId: string | null;
  isGoogleDrive: boolean;
  mimeType: string;
  extension: string;
  size: number;
  width: number;
  height: number;
  previewDataUrl: string;
  errorCode?: string;
}

export interface DriveImageImportResult {
  success: boolean;
  url: string;
  filename: string;
  fileId: string | null;
  isGoogleDrive: boolean;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  storageType: string;
  downloadUrl?: string;
  storagePath?: string;
  firebaseBucket?: string;
  r2Bucket?: string;
  r2Key?: string;
  errorCode?: string;
}

async function callDriveImageEndpoint<T extends { success: boolean; error?: string; errorCode?: string }>(
  endpointPath: '/api/admin/drive-image/preview' | '/api/admin/drive-image/import',
  cleanUrl: string,
  actionLabel: string
): Promise<T> {
  const token = getAdminToken() || 'admin-dev-token';
  let lastNetworkError = '';

  // 1. Primary attempt: POST with JSON body
  try {
    const postRes = await apiFetch(endpointPath, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        Authorization: `Bearer ${token}`,
        'x-admin-token': token,
      },
      body: JSON.stringify({ url: cleanUrl }),
    });

    const parsedPost = await parseSafeJsonResponse<T>(postRes, actionLabel);
    if (parsedPost.success && parsedPost.data && parsedPost.data.success) {
      return parsedPost.data;
    }

    // If the backend returned a structured JSON error (e.g. 400, 401, 422, 502), surface it immediately with status & code
    if (!parsedPost.isHtml && parsedPost.status !== 405 && parsedPost.status !== 302) {
      const codePrefix = (parsedPost.data as any)?.errorCode
        ? `[HTTP ${parsedPost.status} • ${(parsedPost.data as any).errorCode}] `
        : `[HTTP ${parsedPost.status}] `;
      throw new Error(
        `${codePrefix}${parsedPost.error || (parsedPost.data as any)?.error || `${actionLabel} failed.`}`
      );
    }
    lastNetworkError = parsedPost.error || `HTTP ${parsedPost.status}`;
  } catch (err: any) {
    const msg = String(err?.message || '');
    // Re-throw structured backend errors immediately
    if (msg.startsWith('[HTTP ')) {
      throw err;
    }
    lastNetworkError = msg || 'Network connection error';
  }

  // 2. Fallback attempt: GET with query parameters (bypasses proxy POST/preflight blocks)
  try {
    const query = new URLSearchParams({ url: cleanUrl, token });
    const getRes = await apiFetch(`${endpointPath}?${query.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'x-admin-token': token,
      },
    });

    const parsedGet = await parseSafeJsonResponse<T>(getRes, actionLabel);
    if (parsedGet.success && parsedGet.data && parsedGet.data.success) {
      return parsedGet.data;
    }

    const codePrefix = (parsedGet.data as any)?.errorCode
      ? `[HTTP ${parsedGet.status} • ${(parsedGet.data as any).errorCode}] `
      : `[HTTP ${parsedGet.status}] `;
    throw new Error(
      `${codePrefix}${parsedGet.error || (parsedGet.data as any)?.error || `${actionLabel} failed.`}`
    );
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.startsWith('[HTTP ')) {
      throw err;
    }
    const targetUrl = resolveApiUrl(endpointPath);
    throw new Error(
      `[NETWORK_ERROR] Could not reach backend route "${targetUrl}" (${msg || lastNetworkError}). Please ensure the backend server is running and accessible on the current origin, or use "Upload Image" to upload the photo from your device.`
    );
  }
}

export async function previewDriveOrExternalImage(url: string): Promise<DriveImagePreviewResult> {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) {
    throw new Error('[EMPTY_URL] Please paste a Google Drive sharing link or direct HTTPS image URL.');
  }

  return callDriveImageEndpoint<DriveImagePreviewResult>(
    '/api/admin/drive-image/preview',
    cleanUrl,
    'Preview Google Drive / Image URL'
  );
}

export async function importDriveOrExternalImageToStorage(url: string): Promise<DriveImageImportResult> {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl) {
    throw new Error('[EMPTY_URL] Please paste a Google Drive sharing link or direct HTTPS image URL.');
  }

  const imported = await callDriveImageEndpoint<DriveImageImportResult>(
    '/api/admin/drive-image/import',
    cleanUrl,
    'Import Image to Firebase Storage'
  );

  return {
    ...imported,
    url: resolveImageUrl(imported.url),
  };
}

export const importDriveOrExternalImageToR2 = importDriveOrExternalImageToStorage;

export async function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; filename?: string; size?: number }> {
  if (!file) {
    throw new Error('No video file provided for upload.');
  }

  try {
    const uploadRes = await uploadFileWithProgress(
      '/api/upload-video',
      file,
      onProgress,
      180000 // 3 minutes timeout for video files
    );

    if (uploadRes.ok && uploadRes.data && uploadRes.data.url) {
      return {
        url: resolveImageUrl(uploadRes.data.url),
        filename: uploadRes.data.filename || file.name,
        size: uploadRes.data.size || file.size,
      };
    } else {
      throw new Error(uploadRes.error || uploadRes.data?.error || 'Video upload failed on server.');
    }
  } catch (err: any) {
    console.warn('[AdminUpload] Video progress upload failed, trying standard fetch fallback:', err.message);
  }

  // Fallback via apiFetch
  const formData = new FormData();
  let safeName = (file.name && file.name !== 'blob' && file.name.trim()) ? file.name.trim() : `android_video_${Date.now()}.mp4`;
  formData.append('file', file, safeName);

  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }

  const res = await apiFetch('/api/upload-video', {
    method: 'POST',
    headers,
    body: formData,
  });

  const parsed = await parseSafeJsonResponse<{ url: string; filename?: string; size?: number }>(res, 'Product video upload');
  if (!parsed.success || !parsed.data) {
    throw new Error(parsed.error || 'Product video upload failed');
  }
  return {
    ...parsed.data,
    url: resolveImageUrl(parsed.data.url),
  };
}

export async function upload3DModel(file: File): Promise<{
  url: string;
  filename: string;
  originalName: string;
  size: number;
  is3DModel: boolean;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await apiFetch('/api/admin/upload-model', {
    method: 'POST',
    headers,
    body: formData,
  });

  const parsed = await parseSafeJsonResponse<{
    url: string;
    filename: string;
    originalName: string;
    size: number;
    is3DModel: boolean;
  }>(res, '3D Model / Texture upload');
  if (!parsed.success || !parsed.data) {
    throw new Error(parsed.error || '3D Model / Texture upload failed');
  }
  return parsed.data;
}

export async function updateDoor3DConfig(
  doorId: string,
  model3d: import('../types.ts').DoorModel3DConfig
): Promise<Door> {
  return updateDoor(doorId, { model3d });
}

// ---------------- Admin Endpoints ----------------

export interface AdminLoginResponse {
  success: boolean;
  error?: string;
  source?: 'server' | 'firestore';
}

export async function adminLogin(
  emailOrPassword: string,
  password?: string
): Promise<AdminLoginResponse> {
  const email = password !== undefined ? emailOrPassword : 'shivshahidoors@gmail.com';
  const pass = password !== undefined ? password : emailOrPassword;
  const payload = { email, password: pass };

  let serverResponseFailed = false;
  let serverErrorMessage = '';

  // 1. Attempt primary backend HTTP endpoint
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.token) {
        setAdminToken(data.token);
        await ensureFirebaseAuthSession(email, pass);
        return { success: true, source: 'server' };
      }
      if (res.status === 401 || res.status === 400) {
        return { success: false, error: data.error || 'Invalid email or password.' };
      }
      serverErrorMessage = data.error || `Server returned HTTP ${res.status}`;
    } else {
      // Non-JSON response (e.g. 302 HTML redirect from Cloud Run / AI Studio preview proxy)
      serverResponseFailed = true;
      serverErrorMessage = `Authentication server returned non-JSON response (HTTP ${res.status})`;
    }
  } catch (err: any) {
    serverResponseFailed = true;
    serverErrorMessage = err.message || 'Server connection failed';
  }

  // 2. Resilient Fallback: Authoritative direct Firestore database verification
  // Crucial for installed Android APKs where external preview URL is cookie-protected
  try {
    const firestoreResult = await verifyAdminCredentialsViaFirestore(email, pass);
    if (firestoreResult.success) {
      setAdminToken('firestore_admin_token_' + Date.now());
      return { success: true, source: 'firestore' };
    }
    // If Firestore was contacted and rejected the credentials (wrong password)
    if (firestoreResult.error && !firestoreResult.error.toLowerCase().includes('unable to reach')) {
      return { success: false, error: firestoreResult.error };
    }
  } catch (fsErr: any) {
    console.warn('[AdminLogin] Direct Firestore fallback error:', fsErr.message);
  }

  // If both server and cloud store could not be reached, inform the user clearly
  if (serverResponseFailed) {
    return {
      success: false,
      error: 'Authentication server is currently unavailable. Please verify your internet connection.',
    };
  }

  return {
    success: false,
    error: serverErrorMessage || 'Invalid email or password. You can use default password: admin123',
  };
}

export async function resetAdminDefaultPassword(): Promise<boolean> {
  try {
    const res = await apiFetch('/api/auth/reset-default-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  const token = getAdminToken();
  if (token) {
    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // ignore network errors on logout
    }
  }
  await adminLogoutViaFirebase();
  clearAdminToken();
}

export async function checkAdminAuth(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const res = await apiFetch('/api/auth/verify', {
      headers: authHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated) {
        ensureFirebaseAuthSession().catch(() => {});
        return true;
      }
      return false;
    }
  } catch {
    // If server unreachable, check if local token is valid
  }
  const isTokenValid = Boolean(token && token.length > 10);
  if (isTokenValid) {
    ensureFirebaseAuthSession().catch(() => {});
  }
  return isTokenValid;
}

export async function fetchAdminAllData(): Promise<{
  doors: Door[];
  categories: Category[];
  materials: DoorMaterial[];
  finishes: PolishFinish[];
  frames: ChaukhatFrame[];
  hardware: HardwareItem[];
  banners: HomeBanner[];
  articles: Article[];
  quotes: Quotation[];
  settings: BusinessSettings;
  teamMembers?: TeamMember[];
  deliveryStates?: IndiaDeliveryState[];
  deliveryStories?: DeliveryStory[];
}> {
  try {
    const res = await apiFetch('/api/admin/all-data', {
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse<any>(res, 'Fetch Admin All Data');
    if (parsed.success && parsed.data && Array.isArray(parsed.data.doors)) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server /api/admin/all-data unreachable, trying cloud database fallback...', err.message);
  }

  // Fallback: If token exists and server is unreachable, load directly from Firestore
  const token = getAdminToken();
  if (token) {
    try {
      const cloudData = await fetchDirectFirestoreData();
      if (cloudData && Array.isArray(cloudData.doors)) {
        return {
          doors: cloudData.doors || [],
          categories: cloudData.categories || [],
          materials: cloudData.materials || [],
          finishes: cloudData.finishes || [],
          frames: cloudData.frames || [],
          hardware: cloudData.hardware || [],
          banners: cloudData.banners || [],
          articles: cloudData.articles || [],
          quotes: cloudData.quotes || [],
          settings: cloudData.settings || {},
          teamMembers: cloudData.teamMembers || [],
          deliveryStates: cloudData.deliveryStates || DEFAULT_INDIA_STATES,
          deliveryStories: cloudData.deliveryStories || DEFAULT_DELIVERY_STORIES,
        };
      }
    } catch (fsErr: any) {
      console.warn('[AdminAPI] Firestore fallback error:', fsErr.message);
    }
  }

  throw new Error('Unauthorized or failed to connect to admin data store.');
}

// ---------------- ALL INDIA DELIVERY API METHODS ----------------

/**
 * Public: Fetch active delivery states and published delivery stories.
 * Falls back to local default datasets if offline or backend is initializing.
 */
export async function fetchPublicDeliveryData(): Promise<{
  states: IndiaDeliveryState[];
  stories: DeliveryStory[];
}> {
  try {
    const res = await apiFetch('/api/delivery/states');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return {
        states: Array.isArray(data.states) && data.states.length > 0 ? data.states : DEFAULT_INDIA_STATES,
        stories: Array.isArray(data.stories) ? data.stories : DEFAULT_DELIVERY_STORIES,
      };
    }
  } catch (err) {
    console.warn('Could not fetch delivery states from server, trying direct Firestore:', err);
  }

  try {
    const fsData = await fetchDirectFirestoreData();
    if (fsData) {
      return {
        states: Array.isArray(fsData.deliveryStates) && fsData.deliveryStates.length > 0 ? fsData.deliveryStates : DEFAULT_INDIA_STATES,
        stories: Array.isArray(fsData.deliveryStories) ? fsData.deliveryStories.filter((s: any) => s.active !== false) : DEFAULT_DELIVERY_STORIES,
      };
    }
  } catch {}

  return {
    states: DEFAULT_INDIA_STATES,
    stories: DEFAULT_DELIVERY_STORIES,
  };
}

export async function adminToggleStateDelivery(stateId: string): Promise<IndiaDeliveryState> {
  try {
    const res = await apiFetch('/api/admin/delivery/state/toggle', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ stateId }),
    });
    const parsed = await parseSafeJsonResponse<{ state: IndiaDeliveryState }>(res, 'Toggle State Delivery');
    if (parsed.success && parsed.data?.state) {
      return parsed.data.state;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server adminToggleStateDelivery failed, using Firestore fallback:', err.message);
  }
  return await toggleStateDeliveryDirectFirestore(stateId);
}

export async function adminUpdateStateDelivery(
  stateId: string,
  updates: Partial<IndiaDeliveryState>
): Promise<IndiaDeliveryState> {
  try {
    const res = await apiFetch(`/api/admin/delivery/state/${stateId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
    const parsed = await parseSafeJsonResponse<{ state: IndiaDeliveryState }>(res, 'Update State Delivery');
    if (parsed.success && parsed.data?.state) {
      return parsed.data.state;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server adminUpdateStateDelivery failed, using Firestore fallback:', err.message);
  }
  return await updateStateDeliveryDirectFirestore(stateId, updates);
}

export async function adminCreateDeliveryStory(
  story: Omit<DeliveryStory, 'id' | 'createdAt'>
): Promise<DeliveryStory> {
  try {
    const res = await apiFetch('/api/admin/delivery/stories', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(story),
    });
    const parsed = await parseSafeJsonResponse<{ story: DeliveryStory }>(res, 'Create Delivery Story');
    if (parsed.success && parsed.data?.story) {
      return parsed.data.story;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server adminCreateDeliveryStory failed, using Firestore fallback:', err.message);
  }
  return await createDeliveryStoryDirectFirestore(story);
}

export async function adminUpdateDeliveryStory(
  id: string,
  updates: Partial<DeliveryStory>
): Promise<DeliveryStory> {
  try {
    const res = await apiFetch(`/api/admin/delivery/stories/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
    const parsed = await parseSafeJsonResponse<{ story: DeliveryStory }>(res, 'Update Delivery Story');
    if (parsed.success && parsed.data?.story) {
      return parsed.data.story;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server adminUpdateDeliveryStory failed, using Firestore fallback:', err.message);
  }
  return await updateDeliveryStoryDirectFirestore(id, updates);
}

export async function adminDeleteDeliveryStory(
  id: string
): Promise<{ deleted: string; cleanupWarning?: string }> {
  if (!isClientAdminAuthorized()) {
    throw new Error('Unauthorized: Administrator authorization required to delete delivery stories.');
  }
  const targetId = String(id || '').trim();
  if (!targetId) {
    throw new Error('Delivery story ID is required for deletion.');
  }

  invalidateLocalCatalogAndCalculatorCache();
  let serverSuccess = false;
  let serverError: string | null = null;
  let cleanupWarning: string | undefined;

  try {
    const res = await apiFetch(`/api/admin/delivery/stories/${encodeURIComponent(targetId)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse<any>(res, 'Delete Delivery Story');
    if (parsed.success) {
      serverSuccess = true;
      if (parsed.data?.cleanupWarning) {
        cleanupWarning = String(parsed.data.cleanupWarning);
      }
    } else {
      serverError = parsed.error || `HTTP ${res.status}`;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server adminDeleteDeliveryStory failed:', err.message);
    serverError = err.message || 'Server request failed';
  }

  // Always keep client Firestore & local override synchronized
  let firestoreSuccess = false;
  try {
    firestoreSuccess = await deleteDeliveryStoryDirectFirestore(targetId);
  } catch (fsErr: any) {
    if (!serverSuccess) {
      throw new Error(fsErr?.message || serverError || 'Failed to delete delivery story.');
    }
  }

  if (!serverSuccess && !firestoreSuccess) {
    throw new Error(serverError || `Failed to delete delivery story "${targetId}" from database.`);
  }

  return { deleted: targetId, ...(cleanupWarning ? { cleanupWarning } : {}) };
}

// Door CRUD
export async function createDoor(door: Partial<Door>): Promise<Door> {
  if (!isClientAdminAuthorized()) {
    throw new Error('Unauthorized: Administrator authorization required to add new door designs.');
  }

  let serverError: string | null = null;
  let serverReturnedHtml = false;
  const sanitizedDoor = cleanUndefined(door);

  // 1. Attempt backend API endpoint
  try {
    const res = await apiFetch('/api/admin/doors', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(sanitizedDoor),
    });

    const parsed = await parseSafeJsonResponse<Door>(res, 'Create Door Design');
    if (parsed.success && parsed.data) {
      updateLocalCatalogDoor(parsed.data);
      return parsed.data;
    }

    serverError = parsed.error || 'Server error';
    serverReturnedHtml = !!parsed.isHtml;
  } catch (err: any) {
    console.warn('[AdminAPI] Server createDoor request failed, utilizing Cloud Firestore:', err.message);
    serverError = err.message || 'Network request failed';
  }

  // 2. Resilient Fallback: Authoritative Cloud Firestore database persistence
  try {
    console.info('[AdminAPI] Saving door design directly to persistent Cloud Firestore...');
    const saved = await saveDoorDirectFirestore(sanitizedDoor);
    if (saved) {
      updateLocalCatalogDoor(saved);
      return saved;
    }
  } catch (fsErr: any) {
    console.error('[AdminAPI] Direct Firestore save error:', fsErr.message);
    throw new Error(fsErr.message || serverError || 'Failed to save door design');
  }

  if (serverReturnedHtml) {
    throw new Error('Server returned HTML response instead of JSON. Cloud persistence fallback failed.');
  }

  throw new Error(serverError || 'Failed to create door design');
}

export async function updateDoor(id: string, door: Partial<Door>): Promise<Door> {
  if (!isClientAdminAuthorized()) {
    throw new Error('Unauthorized: Administrator authorization required to modify door designs.');
  }

  let serverError: string | null = null;
  let serverReturnedHtml = false;
  const sanitizedDoor = cleanUndefined(door);

  // 1. Attempt backend API endpoint
  try {
    const res = await apiFetch(`/api/admin/doors/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(sanitizedDoor),
    });

    const parsed = await parseSafeJsonResponse<Door>(res, 'Update Door Design');
    if (parsed.success && parsed.data) {
      updateLocalCatalogDoor(parsed.data);
      return parsed.data;
    }

    serverError = parsed.error || 'Server error';
    serverReturnedHtml = !!parsed.isHtml;
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateDoor request failed, utilizing Cloud Firestore:', err.message);
    serverError = err.message || 'Network request failed';
  }

  // 2. Resilient Fallback: Authoritative Cloud Firestore database persistence
  try {
    console.info('[AdminAPI] Updating door design directly in persistent Cloud Firestore...');
    const updated = await updateDoorDirectFirestore(id, sanitizedDoor);
    if (updated) {
      updateLocalCatalogDoor(updated);
      return updated;
    }
  } catch (fsErr: any) {
    console.error('[AdminAPI] Direct Firestore update error:', fsErr.message);
    throw new Error(fsErr.message || serverError || 'Failed to update door design');
  }

  if (serverReturnedHtml) {
    throw new Error('Server returned HTML response instead of JSON. Cloud persistence fallback failed.');
  }

  throw new Error(serverError || 'Failed to update door design');
}

export async function deleteDoor(id: string): Promise<void> {
  if (!isClientAdminAuthorized()) {
    throw new Error('Unauthorized: Administrator authorization required to delete door designs.');
  }

  let serverSuccess = false;
  try {
    const res = await apiFetch(`/api/admin/doors/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse(res, 'Delete Door Design');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteDoor request failed:', err.message);
  }

  if (!serverSuccess) {
    try {
      await deleteDoorDirectFirestore(id);
    } catch (fsErr: any) {
      console.warn('[AdminAPI] Direct Firestore delete warning:', fsErr?.message || fsErr);
      throw new Error(fsErr?.message || 'Failed to delete door design from Cloud Firestore');
    }
  }

  removeLocalCatalogDoor(id);
}

// Material CRUD
export async function createMaterial(data: Partial<DoorMaterial>): Promise<DoorMaterial> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch('/api/admin/materials', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<DoorMaterial>(res, 'Create Material');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server createMaterial failed:', err.message);
  }

  // Direct Firestore fallback
  return await saveMaterialDirectFirestore(data);
}

export async function updateMaterial(id: string, data: Partial<DoorMaterial>): Promise<DoorMaterial> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch(`/api/admin/materials/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<DoorMaterial>(res, 'Update Material');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateMaterial failed:', err.message);
  }

  // Direct Firestore fallback
  return await updateMaterialDirectFirestore(id, data);
}

export async function deleteMaterial(id: string): Promise<void> {
  invalidateLocalCatalogAndCalculatorCache();
  let serverSuccess = false;
  try {
    const res = await apiFetch(`/api/admin/materials/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse(res, 'Delete Material');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteMaterial failed:', err.message);
  }
  if (!serverSuccess) {
    await deleteMaterialDirectFirestore(id);
  }
}

// Finish CRUD
export async function createFinish(data: Partial<PolishFinish>): Promise<PolishFinish> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch('/api/admin/finishes', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<PolishFinish>(res, 'Create Finish');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server createFinish failed, using Firestore fallback:', err.message);
  }
  return await saveFinishDirectFirestore(data);
}

export async function updateFinish(id: string, data: Partial<PolishFinish>): Promise<PolishFinish> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch(`/api/admin/finishes/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<PolishFinish>(res, 'Update Finish');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateFinish failed, using Firestore fallback:', err.message);
  }
  return await updateFinishDirectFirestore(id, data);
}

export async function deleteFinish(id: string): Promise<void> {
  invalidateLocalCatalogAndCalculatorCache();
  let serverSuccess = false;
  try {
    const res = await apiFetch(`/api/admin/finishes/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse(res, 'Delete Finish');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteFinish failed:', err.message);
  }
  if (!serverSuccess) {
    await deleteFinishDirectFirestore(id);
  }
}

// Frame CRUD
export async function createFrame(data: Partial<ChaukhatFrame>): Promise<ChaukhatFrame> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch('/api/admin/frames', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<ChaukhatFrame>(res, 'Create Frame');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server createFrame failed, using Firestore fallback:', err.message);
  }
  return await saveFrameDirectFirestore(data);
}

export async function updateFrame(id: string, data: Partial<ChaukhatFrame>): Promise<ChaukhatFrame> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch(`/api/admin/frames/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<ChaukhatFrame>(res, 'Update Frame');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateFrame failed, using Firestore fallback:', err.message);
  }
  return await updateFrameDirectFirestore(id, data);
}

export async function deleteFrame(id: string): Promise<void> {
  invalidateLocalCatalogAndCalculatorCache();
  let serverSuccess = false;
  try {
    const res = await apiFetch(`/api/admin/frames/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse(res, 'Delete Frame');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteFrame failed:', err.message);
  }
  if (!serverSuccess) {
    await deleteFrameDirectFirestore(id);
  }
}

// Hardware CRUD
export async function createHardware(data: Partial<HardwareItem>): Promise<HardwareItem> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch('/api/admin/hardware', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<HardwareItem>(res, 'Create Hardware');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server createHardware failed, using Firestore fallback:', err.message);
  }
  return await saveHardwareDirectFirestore(data);
}

export async function updateHardware(id: string, data: Partial<HardwareItem>): Promise<HardwareItem> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch(`/api/admin/hardware/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<HardwareItem>(res, 'Update Hardware');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateHardware failed, using Firestore fallback:', err.message);
  }
  return await updateHardwareDirectFirestore(id, data);
}

export async function deleteHardware(id: string): Promise<void> {
  let serverSuccess = false;
  try {
    const res = await apiFetch(`/api/admin/hardware/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse(res, 'Delete Hardware');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteHardware failed:', err.message);
  }
  if (!serverSuccess) {
    await deleteHardwareDirectFirestore(id);
  }
}

// Banner CRUD
export async function createBanner(data: Partial<HomeBanner>): Promise<HomeBanner> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch('/api/admin/banners', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<HomeBanner>(res, 'Create Banner');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server createBanner failed, using Firestore fallback:', err.message);
  }
  return await saveBannerDirectFirestore(data);
}

export async function updateBanner(id: string, data: Partial<HomeBanner>): Promise<HomeBanner> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch(`/api/admin/banners/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<HomeBanner>(res, 'Update Banner');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateBanner failed, using Firestore fallback:', err.message);
  }
  return await updateBannerDirectFirestore(id, data);
}

export async function deleteBanner(
  id: string
): Promise<{ deleted: string; cleanupWarning?: string }> {
  if (!isClientAdminAuthorized()) {
    throw new Error('Unauthorized: Administrator authorization required to delete banners.');
  }
  const targetId = String(id || '').trim();
  if (!targetId) {
    throw new Error('Banner ID is required for deletion.');
  }

  invalidateLocalCatalogAndCalculatorCache();
  let serverSuccess = false;
  let serverError: string | null = null;
  let cleanupWarning: string | undefined;

  try {
    const res = await apiFetch(`/api/admin/banners/${encodeURIComponent(targetId)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse<any>(res, 'Delete Banner');
    if (parsed.success) {
      serverSuccess = true;
      if (parsed.data?.cleanupWarning) {
        cleanupWarning = String(parsed.data.cleanupWarning);
      }
    } else {
      serverError = parsed.error || `HTTP ${res.status}`;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteBanner failed:', err.message);
    serverError = err.message || 'Server request failed';
  }

  // Always keep client Firestore & local override synchronized
  let firestoreSuccess = false;
  try {
    firestoreSuccess = await deleteBannerDirectFirestore(targetId);
  } catch (fsErr: any) {
    if (!serverSuccess) {
      throw new Error(fsErr?.message || serverError || 'Failed to delete banner.');
    }
  }

  if (!serverSuccess && !firestoreSuccess) {
    throw new Error(serverError || `Failed to delete banner "${targetId}" from database.`);
  }

  return { deleted: targetId, ...(cleanupWarning ? { cleanupWarning } : {}) };
}

export async function createMainBanner(data: Partial<HomeBanner>): Promise<HomeBanner> {
  return createBanner({ ...data, bannerType: 'main', slot: 'hero' });
}

export async function createPromotionBanner(data: Partial<HomeBanner>): Promise<HomeBanner> {
  return createBanner({ ...data, bannerType: 'promotion' });
}

export async function updateSlotBanner(slotId: 'slot_1' | 'slot_2' | string, data: Partial<HomeBanner>): Promise<HomeBanner> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch(`/api/admin/banners/slot/${encodeURIComponent(slotId)}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<HomeBanner>(res, 'Update Slot Banner');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateSlotBanner failed, using Firestore fallback:', err.message);
  }
  return await updateBannerDirectFirestore(slotId, data);
}

export async function fetchMainBanners(): Promise<HomeBanner[]> {
  const token = getAdminToken();
  const endpoint = token ? '/api/admin/banners/main' : '/api/banners/main';
  try {
    const res = await apiFetch(endpoint, token ? { headers: authHeaders() } : undefined);
    const parsed = await parseSafeJsonResponse<HomeBanner[]>(res, 'Fetch Main Banners');
    if (parsed.success && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch {}

  try {
    const fsData = await fetchDirectFirestoreData();
    if (fsData && Array.isArray(fsData.banners)) {
      return fsData.banners
        .filter((b: HomeBanner) => (token ? true : b.active !== false) && (b.bannerType === 'main' || b.slot === 'hero' || b.slot === 'main'))
        .sort((a: HomeBanner, b: HomeBanner) => (a.order || 0) - (b.order || 0));
    }
  } catch {}
  return [];
}

export async function fetchPromotionBanners(): Promise<HomeBanner[]> {
  const token = getAdminToken();
  const endpoint = token ? '/api/admin/banners/promotion' : '/api/banners/promotion';
  try {
    const res = await apiFetch(endpoint, token ? { headers: authHeaders() } : undefined);
    const parsed = await parseSafeJsonResponse<HomeBanner[]>(res, 'Fetch Promotion Banners');
    if (parsed.success && Array.isArray(parsed.data)) {
      return parsed.data;
    }
  } catch {}

  try {
    const fsData = await fetchDirectFirestoreData();
    if (fsData && Array.isArray(fsData.banners)) {
      return fsData.banners
        .filter((b: HomeBanner) => (token ? true : b.active !== false) && (b.bannerType === 'promotion' || (b.slot && b.slot !== 'hero' && b.slot !== 'main')))
        .sort((a: HomeBanner, b: HomeBanner) => (a.order || 0) - (b.order || 0));
    }
  } catch {}
  return [];
}

// Article CRUD
export async function createArticle(data: Partial<Article>): Promise<Article> {
  try {
    const res = await apiFetch('/api/admin/articles', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<Article>(res, 'Create Article');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server createArticle failed, using Firestore fallback:', err.message);
  }
  return await saveArticleDirectFirestore(data);
}

export async function updateArticle(id: string, data: Partial<Article>): Promise<Article> {
  try {
    const res = await apiFetch(`/api/admin/articles/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<Article>(res, 'Update Article');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateArticle failed, using Firestore fallback:', err.message);
  }
  return await updateArticleDirectFirestore(id, data);
}

export async function deleteArticle(id: string): Promise<void> {
  let serverSuccess = false;
  try {
    const res = await apiFetch(`/api/admin/articles/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse(res, 'Delete Article');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteArticle failed:', err.message);
  }
  if (!serverSuccess) {
    await deleteArticleDirectFirestore(id);
  }
}

// ---------------- Blog & Article Endpoints ----------------

// Fetch full articles with search, category, tag, sort
export async function fetchArticles(params?: {
  q?: string;
  category?: string;
  tag?: string;
  sort?: 'latest' | 'popular' | 'views' | 'likes';
}): Promise<{ articles: Article[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.category) query.set('category', params.category);
  if (params?.tag) query.set('tag', params.tag);
  if (params?.sort) query.set('sort', params.sort);

  const res = await apiFetch(`/api/articles?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch articles');
  return res.json();
}

export async function fetchArticleCategories(): Promise<ArticleCategory[]> {
  const res = await apiFetch('/api/articles/categories');
  if (!res.ok) throw new Error('Failed to fetch article categories');
  const json = await res.json();
  return json.categories || [];
}

export async function fetchArticleDetails(slugOrId: string): Promise<{
  article: Article;
  comments: ArticleComment[];
  relatedDoors: Door[];
  relatedArticles: Article[];
}> {
  const res = await apiFetch(`/api/articles/${encodeURIComponent(slugOrId)}`);
  if (!res.ok) throw new Error('Failed to fetch article details');
  return res.json();
}

export async function registerArticleView(id: string, viewerHash?: string): Promise<{ views: number; counted: boolean }> {
  const res = await apiFetch(`/api/articles/${id}/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ viewerHash }),
  });
  if (!res.ok) return { views: 0, counted: false };
  return res.json();
}

export async function toggleArticleLike(id: string, likerHash?: string): Promise<{ liked: boolean; likes: number }> {
  const res = await apiFetch(`/api/articles/${id}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ likerHash }),
  });
  if (!res.ok) throw new Error('Failed to toggle like');
  return res.json();
}

export async function registerArticleShare(id: string, platform?: string): Promise<{ shares: number }> {
  const res = await apiFetch(`/api/articles/${id}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform }),
  });
  if (!res.ok) return { shares: 0 };
  return res.json();
}

export async function submitArticleComment(
  id: string,
  data: { authorName?: string; authorEmail?: string; content: string }
): Promise<{ success: boolean; comment: ArticleComment; message: string }> {
  const res = await apiFetch(`/api/articles/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to submit comment');
  return json;
}

export async function fetchArticleComments(id: string): Promise<ArticleComment[]> {
  const res = await apiFetch(`/api/articles/${id}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  const json = await res.json();
  return json.comments || [];
}

// User Bookmarks (Article Favorites)
const GUEST_SAVED_ARTICLES_KEY = 'shivshahi_guest_saved_articles';

export function getGuestSavedArticles(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_SAVED_ARTICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleGuestSavedArticle(articleId: string): string[] {
  const current = getGuestSavedArticles();
  const exists = current.includes(articleId);
  const updated = exists ? current.filter(id => id !== articleId) : [...current, articleId];
  try {
    localStorage.setItem(GUEST_SAVED_ARTICLES_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export async function toggleUserArticleBookmark(articleId: string): Promise<{ isFavorite: boolean; favoriteArticleIds: string[] }> {
  const updated = toggleGuestSavedArticle(articleId);
  return { isFavorite: updated.includes(articleId), favoriteArticleIds: updated };
}

export async function fetchUserSavedArticles(): Promise<{ favoriteArticles: Article[]; favoriteArticleIds: string[] }> {
  const ids = getGuestSavedArticles();
  return { favoriteArticles: [], favoriteArticleIds: ids };
}

// Admin Article Management
export async function fetchAdminArticles(): Promise<Article[]> {
  const res = await apiFetch('/api/admin/articles', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load articles');
  return res.json();
}

export async function fetchAdminArticleComments(params?: {
  status?: string;
  articleId?: string;
}): Promise<{
  comments: (ArticleComment & { articleTitle?: string; articleSlug?: string })[];
  counts: { all: number; pending: number; approved: number; hidden: number; spam: number };
}> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.articleId) query.set('articleId', params.articleId);

  const res = await apiFetch(`/api/admin/articles/comments?${query.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load comments');
  return res.json();
}

export async function moderateArticleComment(commentId: string, status: string): Promise<ArticleComment> {
  const res = await apiFetch(`/api/admin/articles/comments/${commentId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update comment status');
  return json.comment;
}

export async function replyToArticleComment(
  commentId: string,
  text: string,
  authorName?: string
): Promise<ArticleComment> {
  const res = await apiFetch(`/api/admin/articles/comments/${commentId}/reply`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text, authorName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to reply to comment');
  return json.comment;
}

export async function deleteArticleComment(commentId: string): Promise<void> {
  const res = await apiFetch(`/api/admin/articles/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete comment');
}

export async function fetchArticleAnalytics(): Promise<ArticleAnalyticsSummary> {
  const res = await apiFetch('/api/admin/articles/analytics', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  const json = await res.json();
  return json.summary;
}

export async function fetchAdminArticleCategories(): Promise<ArticleCategory[]> {
  const res = await apiFetch('/api/admin/article-categories', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function createArticleCategory(data: Partial<ArticleCategory>): Promise<ArticleCategory> {
  const res = await apiFetch('/api/admin/article-categories', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create category');
  return res.json();
}

export async function updateArticleCategory(id: string, data: Partial<ArticleCategory>): Promise<ArticleCategory> {
  const res = await apiFetch(`/api/admin/article-categories/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update category');
  return res.json();
}

export async function deleteArticleCategory(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/article-categories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete category');
}

// Settings
export async function updateSettings(data: Partial<BusinessSettings> & { adminPassword?: string }): Promise<BusinessSettings> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<{ settings: BusinessSettings }>(res, 'Update Business Settings');
    if (parsed.success && parsed.data?.settings) {
      return parsed.data.settings;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateSettings failed:', err.message);
  }

  // Direct Firestore fallback
  return await updateSettingsDirectFirestore(data);
}

// Quotes
export async function fetchQuotes(): Promise<Quotation[]> {
  const res = await apiFetch('/api/admin/quotes', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch quotes');
  return res.json();
}

export async function deleteQuote(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/quotes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete quote');
}

// ---------------- Database Backup & Restore Endpoints ----------------

export interface BackupSummary {
  filename: string;
  timestamp: string;
  sizeBytes: number;
  doorCount: number;
  articleCount: number;
  teamCount: number;
}

export async function exportDatabaseBackup(): Promise<Blob> {
  const res = await apiFetch('/api/admin/backup/export', {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to export backup');
  }
  return res.blob();
}

export async function importDatabaseBackup(backupData: any): Promise<{ success: boolean; message: string; doorCount: number }> {
  const res = await apiFetch('/api/admin/backup/import', {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(backupData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to restore backup');
  }
  return res.json();
}

export async function fetchBackupsList(): Promise<BackupSummary[]> {
  const res = await apiFetch('/api/admin/backup/list', {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch backups list');
  }
  const data = await res.json();
  return data.backups || [];
}

export async function restoreLocalBackup(filename: string): Promise<{ success: boolean; message: string; doorCount: number }> {
  const res = await apiFetch('/api/admin/backup/restore-local', {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to restore snapshot');
  }
  return res.json();
}

// Protected reset defaults (deprecated - protected on server)
export async function resetDatabase(): Promise<void> {
  const res = await apiFetch('/api/admin/reset-defaults', {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Direct factory reset is disabled in production to protect data');
  }
}

// ---------------- Push Notification Endpoints ----------------

export async function fetchNotificationConfig(): Promise<{
  isConfigured: boolean;
  projectId?: string;
  vapidKey: string | null;
  firebaseClientConfig: any | null;
}> {
  const res = await apiFetch('/api/notifications/config');
  if (!res.ok) throw new Error('Failed to fetch notification config');
  return res.json();
}

export async function registerDeviceToken(data: {
  token: string;
  deviceId: string;
  platform?: 'web' | 'android' | 'ios' | 'pwa';
  browser?: string;
  permission?: 'granted' | 'denied' | 'default';
  preferences?: Partial<NotificationPreferences>;
}): Promise<{ success: boolean; tokenRecord: NotificationTokenRecord }> {
  const res = await apiFetch('/api/notifications/register-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to register notification token');
  }
  return res.json();
}

export async function fetchNotificationPreferences(deviceId?: string): Promise<{
  preferences: NotificationPreferences;
}> {
  const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
  const res = await apiFetch(`/api/notifications/preferences${query}`);
  if (!res.ok) throw new Error('Failed to fetch notification preferences');
  return res.json();
}

export async function updateNotificationPreferences(data: {
  deviceId?: string;
  token?: string;
  preferences: Partial<NotificationPreferences>;
}): Promise<{ success: boolean }> {
  const res = await apiFetch('/api/notifications/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update notification preferences');
  return res.json();
}

// Admin Notification Endpoints
export async function fetchAdminNotificationStats(): Promise<NotificationStats> {
  const res = await apiFetch('/api/admin/notifications/stats', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load notification statistics');
  return res.json();
}

export async function fetchAdminNotificationCampaigns(): Promise<NotificationCampaign[]> {
  const res = await apiFetch('/api/admin/notifications/campaigns', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load notification campaigns');
  return res.json();
}

export async function sendAdminNotification(data: {
  title: string;
  message: string;
  image?: string;
  category?: string;
  targetAudience?: string;
  deepLink?: string;
  doorId?: string;
  scheduleTime?: string;
}): Promise<{
  success: boolean;
  status: 'sent' | 'scheduled';
  message: string;
  result?: any;
  campaign: NotificationCampaign;
}> {
  const res = await apiFetch('/api/admin/notifications/send', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const resJson = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resJson.error || 'Unable to send notification. Please try again.');
  }
  return resJson;
}

export async function cancelAdminScheduledNotification(id: string): Promise<{ success: boolean; campaign: NotificationCampaign }> {
  const res = await apiFetch(`/api/admin/notifications/cancel-scheduled/${id}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to cancel scheduled notification');
  return res.json();
}

export async function deleteAdminNotificationCampaign(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/notifications/campaign/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete notification campaign');
}

// ---------------- Team Management Endpoints ----------------

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  try {
    const res = await apiFetch('/api/team-members');
    const parsed = await parseSafeJsonResponse<{ teamMembers: TeamMember[] }>(res, 'Fetch Team Members');
    if (parsed.success && Array.isArray(parsed.data?.teamMembers)) {
      return parsed.data.teamMembers;
    }
  } catch {}

  try {
    const fsData = await fetchDirectFirestoreData();
    if (fsData && Array.isArray(fsData.teamMembers)) {
      return fsData.teamMembers
        .filter((m: TeamMember) => m.active !== false)
        .sort((a: TeamMember, b: TeamMember) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
  } catch {}
  return [];
}

export async function fetchAdminTeamMembers(): Promise<TeamMember[]> {
  try {
    const res = await apiFetch('/api/admin/team-members', {
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse<{ teamMembers: TeamMember[] }>(res, 'Fetch Admin Team Members');
    if (parsed.success && Array.isArray(parsed.data?.teamMembers)) {
      return parsed.data.teamMembers;
    }
  } catch {}

  const fsData = await fetchDirectFirestoreData();
  if (fsData && Array.isArray(fsData.teamMembers)) {
    return [...fsData.teamMembers].sort((a: TeamMember, b: TeamMember) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }
  return [];
}

export async function createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch('/api/admin/team-members', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<{ member: TeamMember }>(res, 'Create Team Member');
    if (parsed.success && parsed.data?.member) {
      return parsed.data.member;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server createTeamMember failed, using Firestore fallback:', err.message);
  }
  return await saveTeamMemberDirectFirestore(data);
}

export async function updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch(`/api/admin/team-members/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const parsed = await parseSafeJsonResponse<{ member: TeamMember }>(res, 'Update Team Member');
    if (parsed.success && parsed.data?.member) {
      return parsed.data.member;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server updateTeamMember failed, using Firestore fallback:', err.message);
  }
  return await updateTeamMemberDirectFirestore(id, data);
}

export async function toggleTeamMemberActive(id: string): Promise<{ success: boolean; active: boolean; member: TeamMember }> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch(`/api/admin/team-members/${id}/toggle-active`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse<{ success: boolean; active: boolean; member: TeamMember }>(res, 'Toggle Team Member Active');
    if (parsed.success && parsed.data?.member) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server toggleTeamMemberActive failed, using Firestore fallback:', err.message);
  }
  return await toggleTeamMemberDirectFirestore(id);
}

export async function reorderTeamMembers(orderList: { id: string; displayOrder: number }[]): Promise<TeamMember[]> {
  invalidateLocalCatalogAndCalculatorCache();
  try {
    const res = await apiFetch('/api/admin/team-members-reorder', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ orderList }),
    });
    const parsed = await parseSafeJsonResponse<{ teamMembers: TeamMember[] }>(res, 'Reorder Team Members');
    if (parsed.success && Array.isArray(parsed.data?.teamMembers)) {
      return parsed.data.teamMembers;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server reorderTeamMembers failed, using Firestore fallback:', err.message);
  }
  return await reorderTeamMembersDirectFirestore(orderList);
}

export async function deleteTeamMember(id: string): Promise<void> {
  invalidateLocalCatalogAndCalculatorCache();
  let serverSuccess = false;
  try {
    const res = await apiFetch(`/api/admin/team-members/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse(res, 'Delete Team Member');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteTeamMember failed:', err.message);
  }
  if (!serverSuccess) {
    await deleteTeamMemberDirectFirestore(id);
  }
}

// ---------------- Customer Enquiries & Contact Us Endpoints ----------------

export async function submitCustomerEnquiry(data: {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  enquiryType?: string;
  doorId?: string;
  doorName?: string;
  message: string;
}): Promise<{ success: boolean; enquiry: { id: string; name: string }; message: string }> {
  const res = await apiFetch('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit enquiry. Please try again.');
  }
  return res.json();
}

export async function fetchAdminEnquiries(): Promise<CustomerEnquiry[]> {
  const res = await apiFetch('/api/admin/enquiries', {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch customer enquiries');
  }
  const json = await res.json();
  return json.enquiries || [];
}

export async function updateAdminEnquiryStatus(
  id: string,
  status: 'new' | 'contacted' | 'resolved'
): Promise<CustomerEnquiry> {
  const res = await apiFetch(`/api/admin/enquiries/${id}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update enquiry status');
  }
  const json = await res.json();
  return json.enquiry;
}

export async function deleteAdminEnquiry(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/enquiries/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete enquiry');
  }
}

// =========================================================================
// AI WOOD DETECTOR API CLIENT
// =========================================================================

/**
 * Sends one or more door photos to server-side Gemini AI for wood identification.
 * Supports multi-image analysis: Full Door, Grain Close-up, Unpolished Edge, and End-Grain.
 * Privacy safe: Image is processed in memory and never stored on disk.
 * Supports primary same-origin /api/wood-analysis with /api/ai/detect-wood fallback.
 */
export async function detectWoodFromImage(
  data:
    | {
        image?: string;
        additionalImages?: string[];
        slots?: {
          fullDoor?: string;
          grainCloseup?: string;
          unpolishedEdge?: string;
          endGrain?: string;
        };
        imageRoles?: string[];
      }
    | FormData,
  signal?: AbortSignal
): Promise<AIWoodAnalysisResult> {
  const endpoints = [
    resolveApiUrl('/api/wood-analysis'),
    resolveApiUrl('/api/ai/detect-wood'),
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s safety timeout

    // Combine caller signal with timeout controller
    const combinedSignal = signal || controller.signal;

    try {
      let response: Response;

      if (data instanceof FormData) {
        response = await fetch(endpoint, {
          method: 'POST',
          body: data,
          signal: combinedSignal,
        });
      } else {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: combinedSignal,
        });
      }

      clearTimeout(timeoutId);

      // If this endpoint returned 404, try the next endpoint in the fallback list
      if (response.status === 404 && endpoint !== endpoints[endpoints.length - 1]) {
        console.warn(`Route ${endpoint} returned 404, trying next endpoint...`);
        continue;
      }

      // Check for non-JSON or HTML redirect responses (e.g. Cloud Run preview cookie proxy or 302)
      const contentType = response.headers.get('content-type') || '';
      if (response.status === 302 || response.redirected || (contentType.includes('text/html') && !response.ok)) {
        throw new Error(
          'Production API URL configuration required. Dev proxy is cookie-protected. Kripya Settings se apna Production Cloud Run URL check karein ya WhatsApp par sampark karein.'
        );
      }

      if (!response.ok) {
        let errMessage = 'Lakdi pehchanne mein samasya aayi. Kripya punah prayas karein.';
        try {
          if (contentType.includes('application/json')) {
            const errJson = await response.json();
            errMessage = errJson.error || errJson.message || errMessage;
          } else if (response.status === 413) {
            errMessage = 'Photo size bohot bada hai. Kripya compressed ya normal camera photo use karein.';
          } else if (response.status === 502 || response.status === 504) {
            errMessage = 'Server par temporary load hai. Kripya kuch second baad Retry karein.';
          }
        } catch {
          // ignore parsing error
        }
        throw new Error(errMessage);
      }

      if (!contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Kripya production API URL check karein.');
      }

      const json = await response.json();
      if (!json.success || !json.result) {
        throw new Error(json.error || 'Asafal response: Lakdi ka vishleshan poora nahi ho saka.');
      }

      return json.result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      // If aborted or timeout
      if (err.name === 'AbortError') {
        throw new Error('Analysis request timed out. Kripya dobara Retry karein.');
      }

      // If network failure (e.g. Failed to fetch), try next endpoint or report clearly
      console.warn(`Fetch error for ${endpoint}:`, err.message || err);
    }
  }

  // If both endpoints failed
  const originalMessage = lastError?.message || '';
  if (originalMessage.toLowerCase().includes('failed to fetch') || originalMessage.toLowerCase().includes('networkerror')) {
    throw new Error(
      'Server se connect nahi ho saka (Network / Server Unreachable). Kripya apna internet connection check karein, ya Settings se Production Server URL set karein.'
    );
  }

  throw lastError || new Error('Lakdi pehchanne mein samasya aayi. Kripya punah prayas karein.');
}

/**
 * Fetch AI Wood Detector usage stats and activity logs (Admin only)
 */
export async function fetchWoodDetectorStats(): Promise<AIWoodDetectorStats> {
  const res = await apiFetch('/api/ai/wood-detector/stats', {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch AI Wood Detector stats');
  }
  const json = await res.json();
  return json.stats;
}

/**
 * Update AI Wood Detector configuration (Admin only)
 */
export async function updateWoodDetectorConfig(
  settings: Partial<AIWoodDetectorSettings>
): Promise<AIWoodDetectorSettings> {
  const res = await apiFetch('/api/ai/wood-detector/settings', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update AI Wood Detector settings');
  }
  const json = await res.json();
  return json.settings;
}

/**
 * Fetch botanical timber comparison guide profiles
 */
export async function fetchWoodSpeciesGuide(): Promise<Record<string, any>> {
  const res = await apiFetch('/api/wood-species-guide');
  if (!res.ok) {
    throw new Error('Failed to load wood species guide');
  }
  const json = await res.json();
  return json.profiles || {};
}

/**
 * Fetch verified wood reference library samples
 */
export async function fetchWoodReferences(verifiedOnly: boolean = false): Promise<WoodReferenceSample[]> {
  const res = await apiFetch(`/api/ai/wood-detector/references?verified=${verifiedOnly ? 'true' : 'false'}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch wood references');
  }
  const json = await res.json();
  return json.references || [];
}

/**
 * Add a new Wood Reference Sample (Admin only)
 */
export async function createWoodReference(
  sample: Omit<WoodReferenceSample, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WoodReferenceSample> {
  const res = await apiFetch('/api/ai/wood-detector/references', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(sample),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add wood reference sample');
  }
  const json = await res.json();
  return json.reference;
}

/**
 * Update a Wood Reference Sample (Admin only)
 */
export async function updateWoodReferenceAPI(
  id: string,
  updates: Partial<WoodReferenceSample>
): Promise<WoodReferenceSample> {
  const res = await apiFetch(`/api/ai/wood-detector/references/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update reference sample');
  }
  const json = await res.json();
  return json.reference;
}

/**
 * Delete a Wood Reference Sample (Admin only)
 */
export async function deleteWoodReferenceAPI(id: string): Promise<boolean> {
  const res = await apiFetch(`/api/ai/wood-detector/references/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete reference sample');
  }
  const json = await res.json();
  return Boolean(json.deleted);
}

/**
 * Toggle verification status of a sample (Admin only)
 */
export async function toggleVerifyWoodReferenceAPI(id: string): Promise<WoodReferenceSample> {
  const res = await apiFetch(`/api/ai/wood-detector/references/${id}/toggle-verify`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to toggle reference verification status');
  }
  const json = await res.json();
  return json.reference;
}

/**
 * Run isolated Wood Accuracy Benchmark test against documented specimens (Admin only)
 */
export async function runWoodBenchmarkAPI(): Promise<WoodAccuracyBenchmarkResult> {
  const res = await apiFetch('/api/ai/wood-detector/evaluate', {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Benchmark evaluation failed');
  }
  const json = await res.json();
  return json.benchmark;
}

// ============================================================================
// Order Tracking & Manufacturing Progress Client APIs
// ============================================================================

/**
 * Public: Fetch customer order tracking view by Tracking ID
 * No authentication required
 */
export async function fetchPublicTracking(trackingId: string): Promise<PublicTrackingView> {
  const cleanId = encodeURIComponent((trackingId || '').trim());
  const res = await apiFetch(`/api/tracking/${cleanId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to find tracking details. Please check your Tracking ID.');
  }
  const json = await res.json();
  return json.tracking;
}

/**
 * Admin: List and filter all tracking orders
 */
export async function fetchAdminTrackingOrders(filters?: {
  search?: string;
  status?: string;
  stage?: string;
}): Promise<TrackingOrder[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.stage) params.set('stage', filters.stage);

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/api/admin/tracking-orders${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch tracking orders');
  }
  const json = await res.json();
  return json.orders || [];
}

/**
 * Admin: Get single full tracking order by internal id or trackingId
 */
export async function fetchAdminTrackingOrder(id: string): Promise<TrackingOrder> {
  const res = await apiFetch(`/api/admin/tracking-orders/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch tracking order details');
  }
  const json = await res.json();
  return json.order;
}

/**
 * Admin: Create a new trackable order
 */
export async function createAdminTrackingOrder(data: Partial<TrackingOrder>): Promise<TrackingOrder> {
  const res = await apiFetch('/api/admin/tracking-orders', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create tracking order');
  }
  const json = await res.json();
  return json.order;
}

/**
 * Admin: Update general tracking order details
 */
export async function updateAdminTrackingOrder(
  id: string,
  data: Partial<TrackingOrder>
): Promise<TrackingOrder> {
  const res = await apiFetch(`/api/admin/tracking-orders/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update tracking order');
  }
  const json = await res.json();
  return json.order;
}

/**
 * Admin: Update status, notes, or advance stage
 */
export async function updateAdminTrackingStage(
  orderId: string,
  stageData: {
    stageId: TrackingStageId;
    status: StageStatus;
    customerNote?: string;
    adminNote?: string;
    notApplicableReason?: string;
    moveNext?: boolean;
  }
): Promise<TrackingOrder> {
  const res = await apiFetch(`/api/admin/tracking-orders/${encodeURIComponent(orderId)}/stage`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(stageData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update stage progress');
  }
  const json = await res.json();
  return json.order;
}

/**
 * Admin: Upload stage photo or video
 */
export async function uploadAdminTrackingMedia(
  orderId: string,
  file: File,
  meta: {
    stageId: TrackingStageId;
    caption?: string;
    isCustomerVisible?: boolean;
  }
): Promise<{ media: TrackingMediaItem; order: TrackingOrder }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('stageId', meta.stageId);
  if (meta.caption) formData.append('caption', meta.caption);
  if (meta.isCustomerVisible !== undefined) {
    formData.append('isCustomerVisible', String(meta.isCustomerVisible));
  }

  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await apiFetch(`/api/admin/tracking-orders/${encodeURIComponent(orderId)}/media`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload stage media');
  }
  const json = await res.json();
  return { media: json.media, order: json.order };
}

/**
 * Admin: Delete stage media
 */
export async function deleteAdminTrackingMedia(orderId: string, mediaId: string): Promise<TrackingOrder> {
  const res = await apiFetch(
    `/api/admin/tracking-orders/${encodeURIComponent(orderId)}/media/${encodeURIComponent(mediaId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete media');
  }
  const json = await res.json();
  return json.order;
}

/**
 * Admin: Update delivery partner and dispatch info
 */
export async function updateAdminTrackingDelivery(
  orderId: string,
  deliveryData: Partial<TrackingDeliveryInfo>
): Promise<TrackingOrder> {
  const res = await apiFetch(`/api/admin/tracking-orders/${encodeURIComponent(orderId)}/delivery`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(deliveryData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update delivery information');
  }
  const json = await res.json();
  return json.order;
}

/**
 * Admin: Mark order as Delivered
 */
export async function deliverAdminTrackingOrder(orderId: string, deliveryNotes?: string): Promise<TrackingOrder> {
  const res = await apiFetch(`/api/admin/tracking-orders/${encodeURIComponent(orderId)}/deliver`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ deliveryNotes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to mark order as delivered');
  }
  const json = await res.json();
  return json.order;
}

/**
 * Admin: Cancel an order with required reason
 */
export async function cancelAdminTrackingOrder(orderId: string, reason: string): Promise<TrackingOrder> {
  const res = await apiFetch(`/api/admin/tracking-orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to cancel order');
  }
  const json = await res.json();
  return json.order;
}

/**
 * Admin: Delete an order permanently
 */
export async function deleteAdminTrackingOrder(orderId: string): Promise<void> {
  const res = await apiFetch(`/api/admin/tracking-orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete order');
  }
}

// ==========================================
// CHAUKHAT & FRAME MANAGEMENT API
// ==========================================

export interface ChaukhatConfigResponse {
  woodTypes: ChaukhatWoodType[];
  sectionSizes: ChaukhatSectionSize[];
  dimensionPresets: ChaukhatDimensionPreset[];
  designs: ChaukhatDesignCard[];
  products: ChaukhatProduct[];
}

export async function fetchChaukhatConfig(): Promise<ChaukhatConfigResponse> {
  try {
    const res = await apiFetch('/api/chaukhat/config');
    const parsed = await parseSafeJsonResponse<ChaukhatConfigResponse>(res, 'Fetch Chaukhat Config');
    if (parsed.success && parsed.data && Array.isArray(parsed.data.products)) {
      return parsed.data;
    }
  } catch (err) {
    console.warn('Could not fetch Chaukhat config from server, trying Firestore:', err);
  }

  const defaults = await import('../data/chaukhatDefaults.ts');
  try {
    const fsData = await fetchDirectFirestoreData();
    if (fsData) {
      return {
        woodTypes: Array.isArray(fsData.chaukhatWoodTypes) && fsData.chaukhatWoodTypes.length > 0 ? fsData.chaukhatWoodTypes : defaults.DEFAULT_CHAUKHAT_WOOD_TYPES,
        sectionSizes: Array.isArray(fsData.chaukhatSectionSizes) && fsData.chaukhatSectionSizes.length > 0 ? fsData.chaukhatSectionSizes : defaults.DEFAULT_CHAUKHAT_SECTION_SIZES,
        dimensionPresets: Array.isArray(fsData.chaukhatDimensionPresets) && fsData.chaukhatDimensionPresets.length > 0 ? fsData.chaukhatDimensionPresets : defaults.DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
        designs: Array.isArray(fsData.chaukhatDesigns) && fsData.chaukhatDesigns.length > 0 ? fsData.chaukhatDesigns : defaults.DEFAULT_CHAUKHAT_DESIGNS,
        products: Array.isArray(fsData.chaukhatProducts) && fsData.chaukhatProducts.length > 0
          ? fsData.chaukhatProducts.filter((p: any) => p.active !== false).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
          : [defaults.DEFAULT_CHAUKHAT_PRODUCT],
      };
    }
  } catch {}

  return {
    woodTypes: defaults.DEFAULT_CHAUKHAT_WOOD_TYPES,
    sectionSizes: defaults.DEFAULT_CHAUKHAT_SECTION_SIZES,
    dimensionPresets: defaults.DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
    designs: defaults.DEFAULT_CHAUKHAT_DESIGNS,
    products: [defaults.DEFAULT_CHAUKHAT_PRODUCT],
  };
}

export async function calculateChaukhatApi(data: {
  woodTypeId: string;
  sectionSizeId: string;
  customWidthInch?: number;
  customDepthInch?: number;
  heightFt: number;
  widthFt: number;
  designId: 'plain' | 'diamond' | 'hand_carved';
  productId?: string;
}): Promise<ChaukhatCalculationResult> {
  const res = await apiFetch('/api/chaukhat/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to calculate Chaukhat price');
  }
  return await res.json();
}

export async function fetchAdminChaukhatAll(): Promise<{
  products: ChaukhatProduct[];
  sectionSizes: ChaukhatSectionSize[];
  dimensionPresets: ChaukhatDimensionPreset[];
  woodTypes: ChaukhatWoodType[];
}> {
  try {
    const res = await apiFetch('/api/admin/chaukhat/all', {
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse<{
      products: ChaukhatProduct[];
      sectionSizes: ChaukhatSectionSize[];
      dimensionPresets: ChaukhatDimensionPreset[];
      woodTypes: ChaukhatWoodType[];
    }>(res, 'Fetch Admin Chaukhat All');
    if (parsed.success && parsed.data) {
      return parsed.data;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server fetchAdminChaukhatAll failed, using Firestore fallback:', err.message);
  }

  const defaults = await import('../data/chaukhatDefaults.ts');
  const fsData = await fetchDirectFirestoreData();
  return {
    products: Array.isArray(fsData?.chaukhatProducts) && fsData.chaukhatProducts.length > 0 ? fsData.chaukhatProducts : [defaults.DEFAULT_CHAUKHAT_PRODUCT],
    sectionSizes: Array.isArray(fsData?.chaukhatSectionSizes) && fsData.chaukhatSectionSizes.length > 0 ? fsData.chaukhatSectionSizes : defaults.DEFAULT_CHAUKHAT_SECTION_SIZES,
    dimensionPresets: Array.isArray(fsData?.chaukhatDimensionPresets) && fsData.chaukhatDimensionPresets.length > 0 ? fsData.chaukhatDimensionPresets : defaults.DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
    woodTypes: Array.isArray(fsData?.chaukhatWoodTypes) && fsData.chaukhatWoodTypes.length > 0 ? fsData.chaukhatWoodTypes : defaults.DEFAULT_CHAUKHAT_WOOD_TYPES,
  };
}

export async function saveAdminChaukhatProduct(product: Partial<ChaukhatProduct>): Promise<ChaukhatProduct> {
  try {
    const method = product.id ? 'PUT' : 'POST';
    const url = product.id
      ? `/api/admin/chaukhat/products/${encodeURIComponent(product.id)}`
      : '/api/admin/chaukhat/products';

    const res = await apiFetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(product),
    });
    const parsed = await parseSafeJsonResponse<{ product: ChaukhatProduct }>(res, 'Save Chaukhat Product');
    if (parsed.success && parsed.data?.product) {
      return parsed.data.product;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server saveAdminChaukhatProduct failed, using Firestore fallback:', err.message);
  }
  return await saveChaukhatProductDirectFirestore(product);
}

export async function deleteAdminChaukhatProduct(id: string): Promise<void> {
  let serverSuccess = false;
  try {
    const res = await apiFetch(`/api/admin/chaukhat/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse(res, 'Delete Chaukhat Product');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteAdminChaukhatProduct failed:', err.message);
  }
  if (!serverSuccess) {
    await deleteChaukhatProductDirectFirestore(id);
  }
}

export async function saveAdminChaukhatSectionSize(section: Partial<ChaukhatSectionSize>): Promise<ChaukhatSectionSize> {
  try {
    const method = section.id ? 'PUT' : 'POST';
    const url = section.id
      ? `/api/admin/chaukhat/section-sizes/${encodeURIComponent(section.id)}`
      : '/api/admin/chaukhat/section-sizes';

    const res = await apiFetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(section),
    });
    const parsed = await parseSafeJsonResponse<{ sectionSize: ChaukhatSectionSize }>(res, 'Save Section Size');
    if (parsed.success && parsed.data?.sectionSize) {
      return parsed.data.sectionSize;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server saveAdminChaukhatSectionSize failed, using Firestore fallback:', err.message);
  }
  return await saveChaukhatSectionSizeDirectFirestore(section);
}

export async function deleteAdminChaukhatSectionSize(id: string): Promise<void> {
  let serverSuccess = false;
  try {
    const res = await apiFetch(`/api/admin/chaukhat/section-sizes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const parsed = await parseSafeJsonResponse(res, 'Delete Section Size');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server deleteAdminChaukhatSectionSize failed:', err.message);
  }
  if (!serverSuccess) {
    await deleteChaukhatSectionSizeDirectFirestore(id);
  }
}

export async function reorderAdminChaukhatProducts(ids: string[]): Promise<void> {
  let serverSuccess = false;
  try {
    const res = await apiFetch('/api/admin/chaukhat/reorder', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ ids }),
    });
    const parsed = await parseSafeJsonResponse(res, 'Reorder Chaukhat Products');
    if (parsed.success) {
      serverSuccess = true;
    }
  } catch (err: any) {
    console.warn('[AdminAPI] Server reorderAdminChaukhatProducts failed:', err.message);
  }
  if (!serverSuccess) {
    await reorderChaukhatProductsDirectFirestore(ids);
  }
}

export interface StorageStatusResponse {
  storage?: {
    provider: 'firebase_storage';
    configured: boolean;
    connected: boolean;
    readable: boolean;
    writable: boolean;
    bucket: string;
    statusMessage: string;
    firebaseStorageReady: boolean;
    setupInstructionsRequired?: boolean;
  };
  r2: {
    configured: boolean;
    connected: boolean;
    readable: boolean;
    writable: boolean;
    bucket: string;
    endpointConfigured: boolean;
    missingVars: string[];
    tokenPermissionIssue?: boolean;
    statusMessage: string;
    tokenGuidance?: string;
  };
  stats?: {
    r2ObjectCount: number;
    r2TotalBytes: number;
    r2FormattedSize: string;
    localFilesCount: number;
    localTotalBytes: number;
    localFormattedSize: string;
    pendingSyncCount: number;
  };
  activeMode: string;
  firestoreMediaPreserved: boolean;
}

export async function fetchStorageStatus(): Promise<StorageStatusResponse | null> {
  try {
    const res = await apiFetch('/api/admin/storage-status', {
      headers: authHeaders(),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn('[StorageAPI] Failed to fetch storage status:', err.message);
  }
  return null;
}

export async function triggerStorageSyncPending(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const res = await apiFetch('/api/admin/storage/sync-pending', {
      method: 'POST',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.error || 'Sync request failed', error: data.error };
    }
    return { success: data.success, message: data.message || 'Sync completed successfully' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error triggering sync', error: err.message };
  }
}

export const triggerR2SyncPending = triggerStorageSyncPending;

export async function deleteMediaAsset(url: string, force = false): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch('/api/admin/media/delete', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ url, force }),
    });
    const data = await res.json();
    return { success: data.success || data.deleted, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}







