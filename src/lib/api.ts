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

const ADMIN_TOKEN_KEY = 'shivshahi_admin_token';
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
 * Returns the resolved API base URL.
 * Automatically handles Capacitor native Android environment by routing to the active deployed cloud backend.
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_APP_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }
  // If running inside Capacitor native Android environment, route API calls to the deployed Cloud Run backend
  if (typeof window !== 'undefined') {
    const isCapacitorNative = Boolean(
      (window as any).Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && Boolean((window as any).Capacitor))
    );
    if (isCapacitorNative) {
      return 'https://ais-pre-um3h2mohb2itzx3vvljosl-768916382182.asia-southeast1.run.app';
    }
  }
  return '';
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
 * Resilient fetch wrapper with automatic timeout and retries with backoff.
 * Prevents "Failed to fetch" on container wakeups or momentary network drops.
 */
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
 * Helper for single-shot API fetches that ensures URLs are resolved correctly on all platforms.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const fullUrl = resolveApiUrl(url);
  return fetch(fullUrl, options);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export async function fetchCatalog(): Promise<{
  doors: Door[];
  categories: Category[];
  banners: HomeBanner[];
  articles: Article[];
  teamMembers?: TeamMember[];
  settings: BusinessSettings;
}> {
  try {
    const res = await fetchWithRetry('/api/catalog', {}, 3, 350);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch catalog`);
    const data = await res.json();
    try {
      localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage errors
    }
    return data;
  } catch (err: any) {
    console.warn('Network request for catalog failed, checking client cache...', err.message || err);
    try {
      const cached = localStorage.getItem(CATALOG_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.doors) && parsed.doors.length > 0) {
          console.info('Restored catalog data from client cache.');
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    throw err;
  }
}

export async function fetchCalculatorData(): Promise<{
  materials: DoorMaterial[];
  finishes: PolishFinish[];
  frames: ChaukhatFrame[];
  hardware: HardwareItem[];
  settings: BusinessSettings;
}> {
  try {
    const res = await fetchWithRetry('/api/calculator-data', {}, 3, 350);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch calculator data`);
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
    } catch {
      // ignore storage errors
    }
    return result;
  } catch (err: any) {
    console.warn('Network request for calculator data failed, checking client cache...', err.message || err);
    try {
      const cached = localStorage.getItem(CALCULATOR_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.materials) && parsed.materials.length > 0) {
          console.info('Restored calculator data from client cache.');
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    // Return built-in master dataset so calculator works instantly offline/cold-start
    return {
      materials: DEFAULT_MATERIALS,
      finishes: DEFAULT_FINISHES,
      frames: DEFAULT_FRAMES,
      hardware: DEFAULT_HARDWARE,
      settings: DEFAULT_SETTINGS,
    };
  }
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


export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Image upload failed');
  }
  return res.json();
}

export async function uploadVideo(file: File): Promise<{ url: string; filename?: string; size?: number }> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await apiFetch('/api/upload-video', {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Video upload failed' }));
    throw new Error(err.error || 'Product video upload failed');
  }
  return res.json();
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || '3D Model / Texture upload failed');
  }
  return res.json();
}

export async function updateDoor3DConfig(
  doorId: string,
  model3d: import('../types.ts').DoorModel3DConfig
): Promise<Door> {
  return updateDoor(doorId, { model3d });
}

// ---------------- Admin Endpoints ----------------

export async function adminLogin(emailOrPassword: string, password?: string): Promise<boolean> {
  const payload = password !== undefined
    ? { email: emailOrPassword, password }
    : { email: 'shivshahidoors@gmail.com', password: emailOrPassword };

  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    if (data.token) {
      setAdminToken(data.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
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
  clearAdminToken();
}

export async function checkAdminAuth(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const res = await apiFetch('/api/auth/verify', {
      headers: authHeaders(),
    });
    const data = await res.json();
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
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
  const res = await apiFetch('/api/admin/all-data', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Unauthorized or failed to fetch admin data');
  return res.json();
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
    if (res.ok) {
      const data = await res.json();
      return {
        states: Array.isArray(data.states) && data.states.length > 0 ? data.states : DEFAULT_INDIA_STATES,
        stories: Array.isArray(data.stories) ? data.stories : DEFAULT_DELIVERY_STORIES,
      };
    }
  } catch (err) {
    console.warn('Could not fetch delivery states from server, using local fallback:', err);
  }
  return {
    states: DEFAULT_INDIA_STATES,
    stories: DEFAULT_DELIVERY_STORIES,
  };
}

export async function adminToggleStateDelivery(stateId: string): Promise<IndiaDeliveryState> {
  const res = await apiFetch('/api/admin/delivery/state/toggle', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ stateId }),
  });
  if (!res.ok) throw new Error('Failed to toggle state delivery status');
  const data = await res.json();
  return data.state;
}

export async function adminUpdateStateDelivery(
  stateId: string,
  updates: Partial<IndiaDeliveryState>
): Promise<IndiaDeliveryState> {
  const res = await apiFetch(`/api/admin/delivery/state/${stateId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update state delivery details');
  const data = await res.json();
  return data.state;
}

export async function adminCreateDeliveryStory(
  story: Omit<DeliveryStory, 'id' | 'createdAt'>
): Promise<DeliveryStory> {
  const res = await apiFetch('/api/admin/delivery/stories', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(story),
  });
  if (!res.ok) throw new Error('Failed to create delivery story');
  const data = await res.json();
  return data.story;
}

export async function adminUpdateDeliveryStory(
  id: string,
  updates: Partial<DeliveryStory>
): Promise<DeliveryStory> {
  const res = await apiFetch(`/api/admin/delivery/stories/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update delivery story');
  const data = await res.json();
  return data.story;
}

export async function adminDeleteDeliveryStory(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/delivery/stories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete delivery story');
}

// Door CRUD
export async function createDoor(door: Partial<Door>): Promise<Door> {
  const res = await apiFetch('/api/admin/doors', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(door),
  });
  if (!res.ok) throw new Error('Failed to create door');
  return res.json();
}

export async function updateDoor(id: string, door: Partial<Door>): Promise<Door> {
  const res = await apiFetch(`/api/admin/doors/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(door),
  });
  if (!res.ok) throw new Error('Failed to update door');
  return res.json();
}

export async function deleteDoor(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/doors/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete door');
}

// Material CRUD
export async function createMaterial(data: Partial<DoorMaterial>): Promise<DoorMaterial> {
  const res = await apiFetch('/api/admin/materials', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create material');
  return res.json();
}

export async function updateMaterial(id: string, data: Partial<DoorMaterial>): Promise<DoorMaterial> {
  const res = await apiFetch(`/api/admin/materials/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update material');
  return res.json();
}

export async function deleteMaterial(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/materials/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete material');
}

// Finish CRUD
export async function createFinish(data: Partial<PolishFinish>): Promise<PolishFinish> {
  const res = await apiFetch('/api/admin/finishes', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create finish');
  return res.json();
}

export async function updateFinish(id: string, data: Partial<PolishFinish>): Promise<PolishFinish> {
  const res = await apiFetch(`/api/admin/finishes/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update finish');
  return res.json();
}

export async function deleteFinish(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/finishes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete finish');
}

// Frame CRUD
export async function createFrame(data: Partial<ChaukhatFrame>): Promise<ChaukhatFrame> {
  const res = await apiFetch('/api/admin/frames', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create frame');
  return res.json();
}

export async function updateFrame(id: string, data: Partial<ChaukhatFrame>): Promise<ChaukhatFrame> {
  const res = await apiFetch(`/api/admin/frames/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update frame');
  return res.json();
}

export async function deleteFrame(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/frames/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete frame');
}

// Hardware CRUD
export async function createHardware(data: Partial<HardwareItem>): Promise<HardwareItem> {
  const res = await apiFetch('/api/admin/hardware', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create hardware item');
  return res.json();
}

export async function updateHardware(id: string, data: Partial<HardwareItem>): Promise<HardwareItem> {
  const res = await apiFetch(`/api/admin/hardware/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update hardware');
  return res.json();
}

export async function deleteHardware(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/hardware/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete hardware');
}

// Banner CRUD
export async function createBanner(data: Partial<HomeBanner>): Promise<HomeBanner> {
  const res = await apiFetch('/api/admin/banners', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create banner');
  return res.json();
}

export async function updateBanner(id: string, data: Partial<HomeBanner>): Promise<HomeBanner> {
  const res = await apiFetch(`/api/admin/banners/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update banner');
  return res.json();
}

export async function deleteBanner(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/banners/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete banner');
}

export async function createMainBanner(data: Partial<HomeBanner>): Promise<HomeBanner> {
  const res = await apiFetch('/api/admin/banners/main', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...data, bannerType: 'main' }),
  });
  if (!res.ok) throw new Error('Failed to create main banner');
  return res.json();
}

export async function createPromotionBanner(data: Partial<HomeBanner>): Promise<HomeBanner> {
  const res = await apiFetch('/api/admin/banners/promotion', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...data, bannerType: 'promotion' }),
  });
  if (!res.ok) throw new Error('Failed to create promotion banner');
  return res.json();
}

export async function updateSlotBanner(slotId: 'slot_1' | 'slot_2' | string, data: Partial<HomeBanner>): Promise<HomeBanner> {
  const res = await apiFetch(`/api/admin/banners/slot/${slotId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update slot banner');
  return res.json();
}

export async function fetchMainBanners(): Promise<HomeBanner[]> {
  const res = await apiFetch('/api/banners/main');
  if (!res.ok) throw new Error('Failed to fetch main banners');
  return res.json();
}

export async function fetchPromotionBanners(): Promise<HomeBanner[]> {
  const res = await apiFetch('/api/banners/promotion');
  if (!res.ok) throw new Error('Failed to fetch promotion banners');
  return res.json();
}


// Article CRUD
export async function createArticle(data: Partial<Article>): Promise<Article> {
  const res = await apiFetch('/api/admin/articles', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create article');
  return res.json();
}

export async function updateArticle(id: string, data: Partial<Article>): Promise<Article> {
  const res = await apiFetch(`/api/admin/articles/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update article');
  return res.json();
}

export async function deleteArticle(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/articles/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete article');
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
  const res = await apiFetch('/api/admin/settings', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  const resData = await res.json();
  return resData.settings;
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
  const res = await apiFetch('/api/team-members');
  if (!res.ok) throw new Error('Failed to fetch team members');
  const data = await res.json();
  return data.teamMembers || [];
}

export async function fetchAdminTeamMembers(): Promise<TeamMember[]> {
  const res = await apiFetch('/api/admin/team-members', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch team members');
  const data = await res.json();
  return data.teamMembers || [];
}

export async function createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
  const res = await apiFetch('/api/admin/team-members', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create team member');
  }
  const json = await res.json();
  return json.member;
}

export async function updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
  const res = await apiFetch(`/api/admin/team-members/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update team member');
  }
  const json = await res.json();
  return json.member;
}

export async function toggleTeamMemberActive(id: string): Promise<{ success: boolean; active: boolean; member: TeamMember }> {
  const res = await apiFetch(`/api/admin/team-members/${id}/toggle-active`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to toggle team member active status');
  }
  return res.json();
}

export async function reorderTeamMembers(orderList: { id: string; displayOrder: number }[]): Promise<TeamMember[]> {
  const res = await apiFetch('/api/admin/team-members-reorder', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ orderList }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reorder team members');
  }
  const json = await res.json();
  return json.teamMembers || [];
}

export async function deleteTeamMember(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/team-members/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete team member');
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

      if (!response.ok) {
        let errMessage = 'Lakdi pehchanne mein samasya aayi. Kripya punah prayas karein.';
        try {
          const contentType = response.headers.get('content-type') || '';
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
      'Server se connect nahi ho saka (Network / Server Unreachable). Kripya apna internet connection check karein aur Retry dabayein.'
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
    if (!res.ok) throw new Error('Failed to fetch Chaukhat configuration');
    return await res.json();
  } catch (err) {
    console.warn('Using client defaults for Chaukhat configuration', err);
    const defaults = await import('../data/chaukhatDefaults.ts');
    return {
      woodTypes: defaults.DEFAULT_CHAUKHAT_WOOD_TYPES,
      sectionSizes: defaults.DEFAULT_CHAUKHAT_SECTION_SIZES,
      dimensionPresets: defaults.DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
      designs: defaults.DEFAULT_CHAUKHAT_DESIGNS,
      products: [defaults.DEFAULT_CHAUKHAT_PRODUCT],
    };
  }
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
  const res = await apiFetch('/api/admin/chaukhat/all', {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch admin chaukhat data');
  }
  return await res.json();
}

export async function saveAdminChaukhatProduct(product: Partial<ChaukhatProduct>): Promise<ChaukhatProduct> {
  const method = product.id ? 'PUT' : 'POST';
  const url = product.id
    ? `/api/admin/chaukhat/products/${encodeURIComponent(product.id)}`
    : '/api/admin/chaukhat/products';

  const res = await apiFetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save Chaukhat product');
  }
  const json = await res.json();
  return json.product;
}

export async function deleteAdminChaukhatProduct(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/chaukhat/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete Chaukhat product');
  }
}

export async function saveAdminChaukhatSectionSize(section: Partial<ChaukhatSectionSize>): Promise<ChaukhatSectionSize> {
  const method = section.id ? 'PUT' : 'POST';
  const url = section.id
    ? `/api/admin/chaukhat/section-sizes/${encodeURIComponent(section.id)}`
    : '/api/admin/chaukhat/section-sizes';

  const res = await apiFetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(section),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save Section Size');
  }
  const json = await res.json();
  return json.sectionSize;
}

export async function deleteAdminChaukhatSectionSize(id: string): Promise<void> {
  const res = await apiFetch(`/api/admin/chaukhat/section-sizes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete Section Size');
  }
}

export async function reorderAdminChaukhatProducts(ids: string[]): Promise<void> {
  const res = await apiFetch('/api/admin/chaukhat/reorder', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reorder Chaukhat products');
  }
}






