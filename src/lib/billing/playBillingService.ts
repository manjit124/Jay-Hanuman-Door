import { registerPlugin } from '@capacitor/core';
import { getAdminToken, getApiBaseUrl } from '../api.ts';
import { getCustomerMemoryToken } from '../customerPaymentApi.ts';
import type {
  AdMobSettings,
  GooglePlayBillingServerStatus,
  MonetizationPublicConfig,
  PremiumEntitlementSummary,
  PremiumPlanDefinition,
  PremiumPlanId,
  PremiumSubscriptionRecord,
  PremiumSubscriptionStats,
} from '../../types.ts';

// ============================================================================
// CAPACITOR NATIVE GOOGLE PLAY BILLING PLUGIN BRIDGE
// ============================================================================

export interface NativePlayProduct {
  productId: PremiumPlanId;
  title: string;
  description: string;
  offerToken?: string;
  basePlanId?: string;
  formattedPrice?: string;
  priceCurrencyCode?: string;
  priceAmountMicros?: number;
  billingPeriod?: string;
}

export interface NativePlayPurchase {
  productId: string;
  purchaseToken: string;
  orderId?: string;
  packageName: string;
  purchaseTime: number;
  autoRenewing: boolean;
  acknowledged: boolean;
  purchaseState: 'PURCHASED' | 'PENDING' | 'UNSPECIFIED';
}

interface PlayBillingCapacitorPlugin {
  queryProducts(options: { productIds: PremiumPlanId[] }): Promise<{ products: NativePlayProduct[] }>;
  purchaseSubscription(options: {
    productId: PremiumPlanId;
    obfuscatedAccountId?: string;
  }): Promise<NativePlayPurchase>;
  restorePurchases(): Promise<{ purchases: NativePlayPurchase[] }>;
  openManageSubscriptions(options: { productId?: string }): Promise<{ opened: boolean; url: string }>;
}

const NativePlayBilling = registerPlugin<PlayBillingCapacitorPlugin>('PlayBilling');

export const PREMIUM_PLANS: PremiumPlanDefinition[] = [
  {
    productId: 'JHD_ADFREE_MONTHLY',
    name: 'Monthly Ad-Free Premium',
    priceInr: 49,
    billingCycle: 'monthly',
    durationDays: 30,
    billingLabel: '₹49 / month',
  },
  {
    productId: 'JHD_ADFREE_YEARLY',
    name: 'Yearly Ad-Free Premium',
    priceInr: 399,
    billingCycle: 'yearly',
    durationDays: 365,
    billingLabel: '₹399 / year',
    savingsNote: 'Save ₹189/year compared to monthly billing',
  },
];

export const FREE_ENTITLEMENT: PremiumEntitlementSummary = {
  subscriptionPlan: 'free',
  subscriptionStatus: 'none',
  subscriptionExpiryDate: null,
  isPremium: false,
  adsRemoved: false,
  status: 'none',
  productId: null,
  planName: null,
  priceInr: null,
  billingCycle: null,
  expiryTimeMillis: null,
  expiryDate: null,
  autoRenewing: false,
  lastVerifiedAt: null,
  source: 'none',
};

export function isAndroidNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
      return typeof cap.getPlatform === 'function' ? cap.getPlatform() === 'android' : true;
    }
  } catch {}
  return false;
}

function resolveUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

function buildCustomerHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (includeJson) headers['Content-Type'] = 'application/json';
  const token = getCustomerMemoryToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function buildAdminHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (includeJson) headers['Content-Type'] = 'application/json';
  const token = getAdminToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response from server (HTTP ${res.status}).`);
  }
}

// ============================================================================
// SERVER-AUTHORITATIVE MONETIZATION & SUBSCRIPTION API CLIENT
// ============================================================================

export async function fetchMonetizationConfig(): Promise<MonetizationPublicConfig | null> {
  try {
    const res = await fetch(resolveUrl('/api/monetization/config'), {
      credentials: 'include',
      headers: buildCustomerHeaders(false),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok || !data?.success) return null;
    return {
      adSettings: data.adSettings,
      entitlement: data.entitlement || FREE_ENTITLEMENT,
      plans: Array.isArray(data.plans) ? data.plans : PREMIUM_PLANS,
      googlePlayPackageName: data.googlePlayPackageName || 'com.doorstudio.ai',
      googlePlayVerificationConfigured: Boolean(data.googlePlayVerificationConfigured),
    };
  } catch {
    return null;
  }
}

export async function fetchSubscriptionStatus(): Promise<{
  authenticated: boolean;
  entitlement: PremiumEntitlementSummary;
  history: Array<{
    id: string;
    productId: PremiumPlanId;
    planName: string;
    priceInr: number;
    billingCycle: 'monthly' | 'yearly';
    status: string;
    autoRenewing: boolean;
    expiryDate: string;
    lastVerifiedAt: string;
    orderId?: string;
  }>;
}> {
  const res = await fetch(resolveUrl('/api/subscriptions/status'), {
    credentials: 'include',
    headers: buildCustomerHeaders(false),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    return { authenticated: false, entitlement: FREE_ENTITLEMENT, history: [] };
  }
  return {
    authenticated: Boolean(data.authenticated),
    entitlement: data.entitlement || FREE_ENTITLEMENT,
    history: Array.isArray(data.history) ? data.history : [],
  };
}

export async function queryNativePlayProducts(): Promise<NativePlayProduct[]> {
  if (!isAndroidNativeApp()) return [];
  try {
    const res = await NativePlayBilling.queryProducts({
      productIds: ['JHD_ADFREE_MONTHLY', 'JHD_ADFREE_YEARLY'],
    });
    return Array.isArray(res?.products) ? res.products : [];
  } catch {
    return [];
  }
}

/**
 * Initiates a real Google Play Billing subscription purchase on Android and
 * verifies the returned purchase token on the backend via Google Play Developer API.
 */
export async function purchaseGooglePlaySubscription(params: {
  productId: PremiumPlanId;
  customerId: string;
}): Promise<{
  ok: boolean;
  entitlement?: PremiumEntitlementSummary;
  errorCode?: string;
  error?: string;
}> {
  if (!isAndroidNativeApp()) {
    return {
      ok: false,
      errorCode: 'ANDROID_GOOGLE_PLAY_REQUIRED',
      error:
        'Ad-Free Premium subscriptions are billed exclusively through Google Play Billing inside the WindowCut Pro Android app. Open the Android app from Google Play to subscribe, or tap Restore Purchase if you already subscribed on Android.',
    };
  }

  let nativePurchase: NativePlayPurchase;
  try {
    nativePurchase = await NativePlayBilling.purchaseSubscription({
      productId: params.productId,
      obfuscatedAccountId: params.customerId,
    });
  } catch (err: any) {
    const code = String(err?.code || 'GOOGLE_PLAY_PURCHASE_FAILED');
    const msg =
      code === 'USER_CANCELED'
        ? 'Google Play checkout was cancelled.'
        : err?.message || 'Google Play checkout could not be completed.';
    return { ok: false, errorCode: code, error: msg };
  }

  if (!nativePurchase?.purchaseToken) {
    return {
      ok: false,
      errorCode: 'MISSING_PURCHASE_TOKEN',
      error: 'Google Play did not return a purchase token to verify.',
    };
  }

  const verifyRes = await fetch(resolveUrl('/api/subscriptions/google-play/verify'), {
    method: 'POST',
    credentials: 'include',
    headers: buildCustomerHeaders(true),
    body: JSON.stringify({
      productId: nativePurchase.productId || params.productId,
      purchaseToken: nativePurchase.purchaseToken,
      packageName: nativePurchase.packageName || 'com.doorstudio.ai',
    }),
  });

  const data = await parseJsonSafe(verifyRes);
  if (!verifyRes.ok || !data?.success) {
    return {
      ok: false,
      errorCode: data?.errorCode || 'VERIFICATION_FAILED',
      error: data?.error || 'Server verification of Google Play subscription failed.',
    };
  }

  return {
    ok: true,
    entitlement: data.entitlement,
  };
}

/**
 * Restores purchases from Google Play (on Android) and authoritative account records
 * stored permanently on the server (works after reinstall or login on another device).
 */
export async function restoreGooglePlayPurchases(): Promise<{
  ok: boolean;
  entitlement: PremiumEntitlementSummary;
  message: string;
  warnings: string[];
}> {
  let nativePurchases: NativePlayPurchase[] = [];
  if (isAndroidNativeApp()) {
    try {
      const nativeResult = await NativePlayBilling.restorePurchases();
      if (Array.isArray(nativeResult?.purchases)) {
        nativePurchases = nativeResult.purchases;
      }
    } catch {
      // Fall through to server account-level restore so reinstall/new-device restore still works
    }
  }

  const res = await fetch(resolveUrl('/api/subscriptions/google-play/restore'), {
    method: 'POST',
    credentials: 'include',
    headers: buildCustomerHeaders(true),
    body: JSON.stringify({
      purchases: nativePurchases.map(p => ({
        productId: p.productId,
        purchaseToken: p.purchaseToken,
        packageName: p.packageName,
      })),
    }),
  });

  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    return {
      ok: false,
      entitlement: FREE_ENTITLEMENT,
      message: data?.error || 'Could not restore purchases right now.',
      warnings: [],
    };
  }

  return {
    ok: true,
    entitlement: data.entitlement || FREE_ENTITLEMENT,
    message: data.message || 'Purchase restore check completed.',
    warnings: Array.isArray(data.warnings) ? data.warnings : [],
  };
}

export async function openGooglePlayManageSubscription(productId?: PremiumPlanId | null): Promise<void> {
  const pkg = 'com.doorstudio.ai';
  const url = productId
    ? `https://play.google.com/store/account/subscriptions?sku=${encodeURIComponent(productId)}&package=${encodeURIComponent(pkg)}`
    : `https://play.google.com/store/account/subscriptions?package=${encodeURIComponent(pkg)}`;

  if (isAndroidNativeApp()) {
    try {
      await NativePlayBilling.openManageSubscriptions({ productId: productId || undefined });
      return;
    } catch {
      // Fallback to browser link below
    }
  }

  if (typeof window !== 'undefined') {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ============================================================================
// ADMIN PANEL MONETIZATION & SUBSCRIPTION STATS API CLIENT
// ============================================================================

export interface AdminMonetizationDashboardPayload {
  adSettings: AdMobSettings;
  plans: PremiumPlanDefinition[];
  billingServerStatus: GooglePlayBillingServerStatus;
  stats: PremiumSubscriptionStats;
  subscriptions: PremiumSubscriptionRecord[];
}

export async function fetchAdminMonetizationDashboard(filters?: {
  status?: string;
  productId?: string;
  search?: string;
}): Promise<AdminMonetizationDashboardPayload> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.productId && filters.productId !== 'all') params.set('productId', filters.productId);
  if (filters?.search && filters.search.trim()) params.set('search', filters.search.trim());
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(resolveUrl(`/api/admin/monetization${qs}`), {
    credentials: 'include',
    headers: buildAdminHeaders(false),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to load Admin Monetization dashboard.');
  }
  return {
    adSettings: data.adSettings,
    plans: data.plans || PREMIUM_PLANS,
    billingServerStatus: data.billingServerStatus,
    stats: data.stats,
    subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
  };
}

export async function saveAdminMonetizationConfig(
  adSettings: AdMobSettings
): Promise<AdMobSettings> {
  const res = await fetch(resolveUrl('/api/admin/monetization/config'), {
    method: 'PUT',
    credentials: 'include',
    headers: buildAdminHeaders(true),
    body: JSON.stringify({ adSettings }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to save AdMob configuration to permanent database.');
  }
  return data.adSettings;
}
