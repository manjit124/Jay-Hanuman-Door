import crypto from 'crypto';
import { getDb, saveDb } from './db.ts';
import type {
  AdMobSettings,
  CustomerAccount,
  GooglePlayBillingServerStatus,
  MonetizationPublicConfig,
  PremiumEntitlementSummary,
  PremiumPlanDefinition,
  PremiumPlanId,
  PremiumSubscriptionRecord,
  PremiumSubscriptionStats,
  PremiumSubscriptionStatus,
} from '../src/types.ts';
import {
  ADMOB_PRODUCTION_IDS,
  ADMOB_TEST_IDS,
  DEFAULT_ADMOB_SETTINGS,
  isValidAdMobAdUnitId,
  isValidAdMobAppId,
  validateAdMobIdMismatch,
} from '../src/lib/admob/admobConfig.ts';

// ============================================================================
// AUTHORITATIVE GOOGLE PLAY SUBSCRIPTION PRODUCT CATALOG
// Strictly isolated from Razorpay one-time payments.
// ============================================================================

export const GOOGLE_PLAY_DEFAULT_PACKAGE_NAME = 'com.doorstudio.ai';

export const PREMIUM_PLAN_CATALOG: Record<PremiumPlanId, PremiumPlanDefinition> = {
  JHD_ADFREE_MONTHLY: {
    productId: 'JHD_ADFREE_MONTHLY',
    name: 'Monthly Ad-Free Premium',
    priceInr: 49,
    billingCycle: 'monthly',
    durationDays: 30,
    billingLabel: '₹49 / month',
  },
  JHD_ADFREE_YEARLY: {
    productId: 'JHD_ADFREE_YEARLY',
    name: 'Yearly Ad-Free Premium',
    priceInr: 399,
    billingCycle: 'yearly',
    durationDays: 365,
    billingLabel: '₹399 / year',
    savingsNote: 'Save ₹189/year compared to monthly billing',
  },
};

export const VALID_PREMIUM_PRODUCT_IDS: PremiumPlanId[] = [
  'JHD_ADFREE_MONTHLY',
  'JHD_ADFREE_YEARLY',
];

export function isValidPremiumProductId(value: unknown): value is PremiumPlanId {
  return typeof value === 'string' && VALID_PREMIUM_PRODUCT_IDS.includes(value as PremiumPlanId);
}

// ============================================================================
// GOOGLE PLAY SERVICE ACCOUNT CREDENTIALS (SERVER-SIDE ONLY)
// ============================================================================

interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

function getConfiguredPackageName(): string {
  return (process.env.GOOGLE_PLAY_PACKAGE_NAME || GOOGLE_PLAY_DEFAULT_PACKAGE_NAME).trim();
}

function loadServiceAccountCredentials(): ServiceAccountCredentials | null {
  const rawJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed?.client_email && parsed?.private_key) {
        return {
          clientEmail: String(parsed.client_email).trim(),
          privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
          tokenUri: String(parsed.token_uri || 'https://oauth2.googleapis.com/token').trim(),
        };
      }
    } catch {
      return null;
    }
  }

  const clientEmail = process.env.GOOGLE_PLAY_CLIENT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    return {
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
      tokenUri: 'https://oauth2.googleapis.com/token',
    };
  }

  return null;
}

export function getGooglePlayBillingServerStatus(): GooglePlayBillingServerStatus {
  const creds = loadServiceAccountCredentials();
  const packageName = getConfiguredPackageName();
  const hasRtdnToken = Boolean(process.env.GOOGLE_PLAY_RTDN_TOKEN?.trim());
  const missingEnvVars: string[] = [];

  if (!creds) {
    missingEnvVars.push('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (or GOOGLE_PLAY_CLIENT_EMAIL + GOOGLE_PLAY_PRIVATE_KEY)');
  }

  return {
    configured: Boolean(creds),
    packageName,
    hasServiceAccount: Boolean(creds),
    hasRtdnToken,
    missingEnvVars,
  };
}

// ============================================================================
// OAUTH2 JWT TOKEN MINTING FOR GOOGLE PLAY DEVELOPER API
// ============================================================================

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getGooglePlayAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAtMs - 60_000) {
    return cachedAccessToken.token;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: creds.tokenUri,
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );

  const signingInput = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = base64UrlEncode(signer.sign(creds.privateKey));
  const assertion = `${signingInput}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const resp = await fetch(creds.tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.access_token) {
      throw new Error(
        data?.error_description || data?.error || `Google OAuth2 token exchange failed (HTTP ${resp.status})`
      );
    }

    const expiresInSec = Number(data.expires_in) || 3600;
    cachedAccessToken = {
      token: String(data.access_token),
      expiresAtMs: Date.now() + expiresInSec * 1000,
    };
    return cachedAccessToken.token;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// GOOGLE PLAY DEVELOPER API SUBSCRIPTION VERIFIER
// ============================================================================

export interface VerifiedGooglePlayPurchase {
  valid: boolean;
  productId: PremiumPlanId;
  orderId?: string;
  status: Exclude<PremiumSubscriptionStatus, 'none'>;
  autoRenewing: boolean;
  acknowledged: boolean;
  startTimeMillis: number;
  expiryTimeMillis: number;
  cancelReason?: string;
  revokedAt?: string;
  obfuscatedExternalAccountId?: string;
  errorCode?: string;
  error?: string;
}

export type GooglePlayVerifierFn = (params: {
  packageName: string;
  productId: PremiumPlanId;
  purchaseToken: string;
}) => Promise<VerifiedGooglePlayPurchase>;

let testVerifierOverride: GooglePlayVerifierFn | null = null;

/**
 * Allows automated server-side test suites to inject a deterministic Google Play API
 * verifier without modifying production verification behavior.
 */
export function setGooglePlayVerifierForTesting(fn: GooglePlayVerifierFn | null): void {
  if (process.env.NODE_ENV !== 'test' && process.env.JHD_ALLOW_TEST_VERIFIER !== '1') {
    throw new Error('Test verifier override is strictly restricted to test execution.');
  }
  testVerifierOverride = fn;
}

function mapGooglePlayV2StateToStatus(
  subscriptionState: string,
  expiryTimeMillis: number,
  canceledStateContext?: any
): { status: Exclude<PremiumSubscriptionStatus, 'none'>; cancelReason?: string } {
  const now = Date.now();
  const state = String(subscriptionState || '').toUpperCase();

  if (state === 'SUBSCRIPTION_STATE_PENDING' || state === 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED') {
    return { status: 'pending' };
  }

  if (state === 'SUBSCRIPTION_STATE_CANCELED') {
    let cancelReason = 'user_cancelled';
    if (canceledStateContext?.systemInitiatedCancellation) cancelReason = 'system_cancelled';
    else if (canceledStateContext?.developerInitiatedCancellation) cancelReason = 'developer_cancelled';
    else if (canceledStateContext?.replacementCancellation) cancelReason = 'replaced';

    // Cancelled subscription remains ad-free until expiryTimeMillis, then becomes expired
    if (expiryTimeMillis <= now) {
      return { status: 'expired', cancelReason };
    }
    return { status: 'cancelled', cancelReason };
  }

  if (state === 'SUBSCRIPTION_STATE_EXPIRED') {
    return { status: 'expired' };
  }

  if (state === 'SUBSCRIPTION_STATE_ON_HOLD' || state === 'SUBSCRIPTION_STATE_PAUSED') {
    return { status: 'expired', cancelReason: state.toLowerCase() };
  }

  if (state === 'SUBSCRIPTION_STATE_ACTIVE' || state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') {
    if (expiryTimeMillis <= now) {
      return { status: 'expired' };
    }
    return { status: 'active' };
  }

  return expiryTimeMillis > now ? { status: 'active' } : { status: 'expired' };
}

async function verifyWithGooglePlayDeveloperApi(params: {
  packageName: string;
  productId: PremiumPlanId;
  purchaseToken: string;
}): Promise<VerifiedGooglePlayPurchase> {
  if (testVerifierOverride) {
    return testVerifierOverride(params);
  }

  const creds = loadServiceAccountCredentials();
  if (!creds) {
    return {
      valid: false,
      productId: params.productId,
      status: 'pending',
      autoRenewing: false,
      acknowledged: false,
      startTimeMillis: Date.now(),
      expiryTimeMillis: 0,
      errorCode: 'GOOGLE_PLAY_NOT_CONFIGURED',
      error:
        'Google Play Developer API service account credentials are not configured on the server. Configure GOOGLE_PLAY_SERVICE_ACCOUNT_JSON to enable live purchase verification.',
    };
  }

  const accessToken = await getGooglePlayAccessToken(creds);
  const v2Url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
    params.packageName
  )}/purchases/subscriptionsv2/tokens/${encodeURIComponent(params.purchaseToken)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  let rawData: any = null;
  let httpStatus = 0;
  try {
    const resp = await fetch(v2Url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    httpStatus = resp.status;
    rawData = await resp.json().catch(() => ({}));
  } finally {
    clearTimeout(timeout);
  }

  if (httpStatus === 404 || httpStatus === 410) {
    return {
      valid: false,
      productId: params.productId,
      status: 'expired',
      autoRenewing: false,
      acknowledged: false,
      startTimeMillis: 0,
      expiryTimeMillis: 0,
      errorCode: 'PURCHASE_NOT_FOUND',
      error: 'Google Play could not locate this subscription purchase token.',
    };
  }

  if (httpStatus < 200 || httpStatus >= 300 || !rawData) {
    return {
      valid: false,
      productId: params.productId,
      status: 'pending',
      autoRenewing: false,
      acknowledged: false,
      startTimeMillis: 0,
      expiryTimeMillis: 0,
      errorCode: 'GOOGLE_PLAY_API_ERROR',
      error: rawData?.error?.message || `Google Play verification returned HTTP ${httpStatus}.`,
    };
  }

  const lineItems: any[] = Array.isArray(rawData.lineItems) ? rawData.lineItems : [];
  const matchedItem =
    lineItems.find(item => item?.productId === params.productId) ||
    lineItems.find(item => isValidPremiumProductId(item?.productId));

  if (!matchedItem || !isValidPremiumProductId(matchedItem.productId)) {
    return {
      valid: false,
      productId: params.productId,
      status: 'revoked',
      autoRenewing: false,
      acknowledged: false,
      startTimeMillis: 0,
      expiryTimeMillis: 0,
      errorCode: 'PRODUCT_ID_MISMATCH',
      error: 'Verified Google Play purchase does not match an authorized WindowCut Pro Premium product.',
    };
  }

  const resolvedProductId = matchedItem.productId as PremiumPlanId;
  const startTimeMillis = rawData.startTime ? Date.parse(rawData.startTime) : Date.now();
  const expiryTimeMillis = matchedItem.expiryTime ? Date.parse(matchedItem.expiryTime) : 0;
  const autoRenewing = Boolean(matchedItem.autoRenewingPlan?.autoRenewEnabled);
  const acknowledged = rawData.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED';
  const isRevoked = Boolean(rawData.canceledStateContext?.developerInitiatedCancellation || rawData.revocationContext);

  const mapped = isRevoked
    ? { status: 'revoked' as const, cancelReason: 'revoked_or_refunded' }
    : mapGooglePlayV2StateToStatus(
        rawData.subscriptionState,
        expiryTimeMillis,
        rawData.canceledStateContext
      );

  // Acknowledge active subscription if not yet acknowledged (prevents Google Play 3-day auto-refund)
  let finalAcknowledged = acknowledged;
  if (!acknowledged && mapped.status === 'active') {
    try {
      const ackUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
        params.packageName
      )}/purchases/subscriptions/${encodeURIComponent(resolvedProductId)}/tokens/${encodeURIComponent(
        params.purchaseToken
      )}:acknowledge`;
      const ackResp = await fetch(ackUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (ackResp.ok) {
        finalAcknowledged = true;
      }
    } catch {
      // Non-fatal: entitlement still verified; acknowledge will retry on next sync
    }
  }

  return {
    valid: true,
    productId: resolvedProductId,
    orderId: rawData.latestOrderId || undefined,
    status: mapped.status,
    autoRenewing,
    acknowledged: finalAcknowledged,
    startTimeMillis: Number.isFinite(startTimeMillis) ? startTimeMillis : Date.now(),
    expiryTimeMillis: Number.isFinite(expiryTimeMillis) ? expiryTimeMillis : 0,
    cancelReason: mapped.cancelReason,
    revokedAt: isRevoked ? new Date().toISOString() : undefined,
    obfuscatedExternalAccountId: rawData.externalAccountIdentifiers?.obfuscatedExternalAccountId || undefined,
  };
}

// ============================================================================
// TOKEN HASHING & MASKING HELPERS (NEVER STORE/LOG RAW TOKENS)
// ============================================================================

export function hashPurchaseToken(purchaseToken: string): string {
  return crypto.createHash('sha256').update(purchaseToken.trim()).digest('hex');
}

export function maskPurchaseToken(purchaseToken: string): string {
  const clean = purchaseToken.trim();
  if (clean.length <= 8) return 'gp_****';
  return `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
}

// ============================================================================
// AUTHORITATIVE ENTITLEMENT EVALUATION (REAL-TIME EXPIRY & LIFECYCLE)
// ============================================================================

function isVerifiedSubscriptionRecord(sub: PremiumSubscriptionRecord): boolean {
  return (
    sub.platform === 'android_google_play' &&
    isValidPremiumProductId(sub.productId) &&
    (sub.verificationSource === 'google_play_api' || sub.verificationSource === 'rtdn_webhook') &&
    typeof sub.purchaseTokenHash === 'string' &&
    sub.purchaseTokenHash.trim().length > 0
  );
}

/**
 * Synchronizes a customer's stored subscriptionPlan / subscriptionStatus / subscriptionExpiryDate
 * directly from authoritative verified subscription records in db.premiumSubscriptions.
 * Mutates db in memory; returns true if any field changed.
 */
export function syncCustomerAccountSubscriptionFieldsInDb(
  customerId: string,
  nowMs = Date.now()
): boolean {
  const db = getDb();
  const customer = (db.customerUsers || []).find(u => u.id === customerId);
  if (!customer) return false;

  const customerSubs = (db.premiumSubscriptions || [])
    .filter(s => s.customerId === customerId && isVerifiedSubscriptionRecord(s))
    .sort((a, b) => Number(b.expiryTimeMillis || 0) - Number(a.expiryTimeMillis || 0));

  const entitled = customerSubs.find(
    s => (s.status === 'active' || s.status === 'cancelled') && Number(s.expiryTimeMillis || 0) > nowMs
  );

  const nextPlan: 'free' | 'premium' = entitled ? 'premium' : 'free';
  const nextStatus: PremiumSubscriptionStatus = entitled
    ? entitled.status
    : customerSubs[0]
    ? customerSubs[0].status
    : 'none';
  const nextExpiry: string | null = entitled
    ? entitled.expiryDate || new Date(entitled.expiryTimeMillis).toISOString()
    : customerSubs[0]?.expiryDate || null;

  if (
    customer.subscriptionPlan !== nextPlan ||
    customer.subscriptionStatus !== nextStatus ||
    (customer.subscriptionExpiryDate ?? null) !== nextExpiry
  ) {
    customer.subscriptionPlan = nextPlan;
    customer.subscriptionStatus = nextStatus;
    customer.subscriptionExpiryDate = nextExpiry;
    customer.updatedAt = new Date(nowMs).toISOString();
    return true;
  }
  return false;
}

/**
 * Re-evaluates all stored Google Play subscriptions against current time.
 * Any active/cancelled subscription whose expiryTimeMillis has passed is automatically
 * transitioned to 'expired' in permanent storage and the customer account reverts to
 * subscriptionPlan = "free" so ads are restored immediately.
 */
export function refreshExpiredSubscriptionsIfNeeded(nowMs = Date.now()): boolean {
  const db = getDb();
  const subs = db.premiumSubscriptions || [];
  let changed = false;
  const affectedCustomerIds = new Set<string>();

  for (const sub of subs) {
    if (
      (sub.status === 'active' || sub.status === 'cancelled') &&
      Number(sub.expiryTimeMillis || 0) <= nowMs
    ) {
      sub.status = 'expired';
      sub.autoRenewing = false;
      sub.updatedAt = new Date(nowMs).toISOString();
      affectedCustomerIds.add(sub.customerId);
      changed = true;
    }
  }

  for (const custId of affectedCustomerIds) {
    if (syncCustomerAccountSubscriptionFieldsInDb(custId, nowMs)) {
      changed = true;
    }
  }

  if (changed) {
    saveDb(db, {
      entity: 'premium_subscription',
      action: 'bulk_update',
      details: 'Automatically transitioned expired Google Play subscriptions to expired and restored Free plan',
    });
  }

  return changed;
}

/**
 * Computes authoritative ad-free entitlement for a customer.
 * CRITICAL RULES:
 * - Login, registration, role, or frontend state NEVER activates Premium.
 * - Strictly evaluates backend-verified Google Play subscription records ONLY
 *   (`platform === 'android_google_play'`, verified via `google_play_api` or `rtdn_webhook`, with hashed token).
 * - NEVER treats Razorpay payments or credit packs as ad-free subscription entitlements.
 * - Active subscriptions grant `subscriptionPlan = "premium"` while expiryTimeMillis > now.
 * - Cancelled subscriptions keep ad-free access ONLY until expiryTimeMillis > now.
 * - Pending, expired, refunded, revoked, or missing subscriptions ALWAYS return `subscriptionPlan = "free"`.
 */
export function evaluateCustomerEntitlement(
  customerId?: string | null,
  nowMs = Date.now()
): PremiumEntitlementSummary {
  const freeSummary: PremiumEntitlementSummary = {
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

  if (!customerId) return freeSummary;

  refreshExpiredSubscriptionsIfNeeded(nowMs);

  const db = getDb();
  const customerSubs = (db.premiumSubscriptions || [])
    .filter(s => s.customerId === customerId && isVerifiedSubscriptionRecord(s))
    .sort((a, b) => Number(b.expiryTimeMillis || 0) - Number(a.expiryTimeMillis || 0));

  if (customerSubs.length === 0) {
    return freeSummary;
  }

  // 1. Check for any currently entitled verified record (active OR cancelled but unexpired)
  const entitledRecord = customerSubs.find(
    s =>
      (s.status === 'active' || s.status === 'cancelled') &&
      Number(s.expiryTimeMillis || 0) > nowMs
  );

  if (entitledRecord) {
    const expiryIso =
      entitledRecord.expiryDate || new Date(entitledRecord.expiryTimeMillis).toISOString();
    return {
      subscriptionPlan: 'premium',
      subscriptionStatus: entitledRecord.status,
      subscriptionExpiryDate: expiryIso,
      isPremium: true,
      adsRemoved: true,
      status: entitledRecord.status,
      productId: entitledRecord.productId,
      planName: entitledRecord.planName,
      priceInr: entitledRecord.priceInr,
      billingCycle: entitledRecord.billingCycle,
      expiryTimeMillis: entitledRecord.expiryTimeMillis,
      expiryDate: expiryIso,
      autoRenewing: entitledRecord.status === 'active' && Boolean(entitledRecord.autoRenewing),
      lastVerifiedAt: entitledRecord.lastVerifiedAt,
      source: 'google_play_billing',
      message:
        entitledRecord.status === 'cancelled'
          ? 'Subscription cancelled; ad-free access remains active until the end of your current billing period.'
          : 'WindowCut Pro Premium is active. All advertisements are removed.',
    };
  }

  // 2. Otherwise return Free plan with the most recent non-entitled state (pending / expired / refunded / revoked)
  const latest = customerSubs[0];
  let message = 'Your Premium subscription has expired. Free Plan and ads have been restored.';
  if (latest.status === 'pending') {
    message = 'Your Google Play subscription payment is pending confirmation. Ad-free access activates once settled.';
  } else if (latest.status === 'refunded' || latest.status === 'revoked') {
    message = 'This Google Play subscription was refunded or revoked. Free Plan and standard ads are active.';
  }

  return {
    subscriptionPlan: 'free',
    subscriptionStatus: latest.status,
    subscriptionExpiryDate: latest.expiryDate || null,
    isPremium: false,
    adsRemoved: false,
    status: latest.status,
    productId: latest.productId,
    planName: latest.planName,
    priceInr: latest.priceInr,
    billingCycle: latest.billingCycle,
    expiryTimeMillis: latest.expiryTimeMillis,
    expiryDate: latest.expiryDate,
    autoRenewing: false,
    lastVerifiedAt: latest.lastVerifiedAt,
    source: 'google_play_billing',
    message,
  };
}

// ============================================================================
// PERSIST & UPSERT VERIFIED GOOGLE PLAY SUBSCRIPTION
// ============================================================================

export function upsertVerifiedSubscriptionRecord(params: {
  customer: CustomerAccount;
  packageName: string;
  purchaseToken: string;
  verified: VerifiedGooglePlayPurchase;
  verificationSource: 'google_play_api' | 'rtdn_webhook';
}): { record: PremiumSubscriptionRecord; entitlement: PremiumEntitlementSummary } {
  const db = getDb();
  if (!Array.isArray(db.premiumSubscriptions)) {
    db.premiumSubscriptions = [];
  }

  const plan = PREMIUM_PLAN_CATALOG[params.verified.productId];
  const tokenHash = hashPurchaseToken(params.purchaseToken);
  const nowIso = new Date().toISOString();
  const expiryIso = params.verified.expiryTimeMillis
    ? new Date(params.verified.expiryTimeMillis).toISOString()
    : nowIso;

  const existingIdx = db.premiumSubscriptions.findIndex(s => s.purchaseTokenHash === tokenHash);

  let record: PremiumSubscriptionRecord;
  if (existingIdx !== -1) {
    const existing = db.premiumSubscriptions[existingIdx];
    record = {
      ...existing,
      customerId: params.customer.id,
      customerMobile: params.customer.mobile,
      customerName: params.customer.name,
      customerEmail: params.customer.email,
      productId: plan.productId,
      planName: plan.name,
      priceInr: plan.priceInr,
      billingCycle: plan.billingCycle,
      packageName: params.packageName,
      orderId: params.verified.orderId || existing.orderId,
      status: params.verified.status,
      autoRenewing: params.verified.autoRenewing,
      acknowledged: params.verified.acknowledged || existing.acknowledged,
      startTimeMillis: params.verified.startTimeMillis || existing.startTimeMillis,
      expiryTimeMillis: params.verified.expiryTimeMillis,
      expiryDate: expiryIso,
      cancelReason: params.verified.cancelReason,
      revokedAt: params.verified.revokedAt || existing.revokedAt,
      verificationSource: params.verificationSource,
      lastVerifiedAt: nowIso,
      updatedAt: nowIso,
    };
    db.premiumSubscriptions[existingIdx] = record;
  } else {
    record = {
      id: `sub_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`,
      customerId: params.customer.id,
      customerMobile: params.customer.mobile,
      customerName: params.customer.name,
      customerEmail: params.customer.email,
      productId: plan.productId,
      planName: plan.name,
      priceInr: plan.priceInr,
      billingCycle: plan.billingCycle,
      platform: 'android_google_play',
      packageName: params.packageName,
      purchaseTokenHash: tokenHash,
      purchaseTokenMasked: maskPurchaseToken(params.purchaseToken),
      orderId: params.verified.orderId,
      status: params.verified.status,
      autoRenewing: params.verified.autoRenewing,
      acknowledged: params.verified.acknowledged,
      startTimeMillis: params.verified.startTimeMillis || Date.now(),
      expiryTimeMillis: params.verified.expiryTimeMillis,
      expiryDate: expiryIso,
      cancelReason: params.verified.cancelReason,
      revokedAt: params.verified.revokedAt,
      verificationSource: params.verificationSource,
      lastVerifiedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.premiumSubscriptions.unshift(record);
  }

  syncCustomerAccountSubscriptionFieldsInDb(params.customer.id);

  saveDb(db, {
    entity: 'premium_subscription',
    action: existingIdx !== -1 ? 'update' : 'create',
    targetId: record.id,
    targetName: `${record.customerName} (${record.productId})`,
    details: `Google Play subscription ${record.productId} verified: status=${record.status}, expiry=${record.expiryDate}`,
  });

  const entitlement = evaluateCustomerEntitlement(params.customer.id);
  return { record, entitlement };
}

// ============================================================================
// VERIFY PURCHASE & RESTORE PURCHASES FLOWS
// ============================================================================

export async function verifyAndPersistGooglePlayPurchase(params: {
  customer: CustomerAccount;
  productId: unknown;
  purchaseToken: unknown;
  packageName?: unknown;
}): Promise<{
  ok: boolean;
  statusCode: number;
  errorCode?: string;
  error?: string;
  record?: PremiumSubscriptionRecord;
  entitlement?: PremiumEntitlementSummary;
}> {
  if (!isValidPremiumProductId(params.productId)) {
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'INVALID_PRODUCT_ID',
      error: `Invalid Google Play product ID. Allowed plans: ${VALID_PREMIUM_PRODUCT_IDS.join(', ')}.`,
    };
  }

  const purchaseToken = typeof params.purchaseToken === 'string' ? params.purchaseToken.trim() : '';
  if (purchaseToken.length < 12 || purchaseToken.length > 2048) {
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'INVALID_PURCHASE_TOKEN',
      error: 'A valid Google Play purchase token is required for server verification.',
    };
  }

  const expectedPackageName = getConfiguredPackageName();
  const suppliedPackageName =
    typeof params.packageName === 'string' && params.packageName.trim()
      ? params.packageName.trim()
      : expectedPackageName;

  if (suppliedPackageName !== expectedPackageName) {
    return {
      ok: false,
      statusCode: 403,
      errorCode: 'PACKAGE_NAME_MISMATCH',
      error: 'Purchase package name does not match this application.',
    };
  }

  // Prevent hijacking another customer's active purchase token
  const db = getDb();
  const tokenHash = hashPurchaseToken(purchaseToken);
  const existing = (db.premiumSubscriptions || []).find(s => s.purchaseTokenHash === tokenHash);
  if (existing && existing.customerId !== params.customer.id) {
    // Allow re-binding only if the old record is not active or matches obfuscated account ID after verification
    const verifiedCheck = await verifyWithGooglePlayDeveloperApi({
      packageName: expectedPackageName,
      productId: params.productId,
      purchaseToken,
    });
    if (!verifiedCheck.valid) {
      return {
        ok: false,
        statusCode: verifiedCheck.errorCode === 'GOOGLE_PLAY_NOT_CONFIGURED' ? 503 : 400,
        errorCode: verifiedCheck.errorCode || 'VERIFICATION_FAILED',
        error: verifiedCheck.error || 'Could not verify Google Play purchase.',
      };
    }
    if (
      verifiedCheck.obfuscatedExternalAccountId &&
      verifiedCheck.obfuscatedExternalAccountId !== params.customer.id
    ) {
      return {
        ok: false,
        statusCode: 409,
        errorCode: 'PURCHASE_BOUND_TO_ANOTHER_ACCOUNT',
        error: 'This Google Play subscription is already linked to another WindowCut Pro account.',
      };
    }
    const { record, entitlement } = upsertVerifiedSubscriptionRecord({
      customer: params.customer,
      packageName: expectedPackageName,
      purchaseToken,
      verified: verifiedCheck,
      verificationSource: 'google_play_api',
    });
    return { ok: true, statusCode: 200, record, entitlement };
  }

  const verified = await verifyWithGooglePlayDeveloperApi({
    packageName: expectedPackageName,
    productId: params.productId,
    purchaseToken,
  });

  if (!verified.valid) {
    return {
      ok: false,
      statusCode: verified.errorCode === 'GOOGLE_PLAY_NOT_CONFIGURED' ? 503 : 400,
      errorCode: verified.errorCode || 'VERIFICATION_FAILED',
      error: verified.error || 'Google Play subscription verification failed.',
    };
  }

  const { record, entitlement } = upsertVerifiedSubscriptionRecord({
    customer: params.customer,
    packageName: expectedPackageName,
    purchaseToken,
    verified,
    verificationSource: 'google_play_api',
  });

  return {
    ok: true,
    statusCode: 200,
    record,
    entitlement,
  };
}

export async function restoreCustomerGooglePlayPurchases(params: {
  customer: CustomerAccount;
  purchases?: Array<{ productId?: unknown; purchaseToken?: unknown; packageName?: unknown }>;
}): Promise<{
  ok: boolean;
  statusCode: number;
  restoredCount: number;
  entitlement: PremiumEntitlementSummary;
  warnings: string[];
  message: string;
}> {
  const warnings: string[] = [];
  let restoredCount = 0;

  // 1. Verify any device-reported Google Play purchase tokens against Google Play Developer API
  if (Array.isArray(params.purchases) && params.purchases.length > 0) {
    for (const item of params.purchases.slice(0, 10)) {
      if (!isValidPremiumProductId(item?.productId) || typeof item?.purchaseToken !== 'string') {
        continue;
      }
      const res = await verifyAndPersistGooglePlayPurchase({
        customer: params.customer,
        productId: item.productId,
        purchaseToken: item.purchaseToken,
        packageName: item.packageName,
      });
      if (res.ok) {
        restoredCount++;
      } else if (res.error) {
        warnings.push(res.error);
      }
    }
  }

  // 2. Always evaluate authoritative permanent database records for this customer
  //    (supports account login on another device or reinstall where account-bound entitlement exists)
  const entitlement = evaluateCustomerEntitlement(params.customer.id);

  let message: string;
  if (entitlement.isPremium) {
    message = `Premium subscription restored (${entitlement.planName}). Active until ${
      entitlement.expiryDate ? new Date(entitlement.expiryDate).toLocaleDateString('en-IN') : 'renewal date'
    }.`;
  } else if (entitlement.status === 'pending') {
    message = 'Found a pending Google Play subscription. Ad-free access will unlock once Google Play confirms payment.';
  } else if (entitlement.status === 'expired') {
    message = 'Your previous Premium subscription has expired. Subscribe again to remove advertisements.';
  } else if (warnings.length > 0) {
    message = warnings[0];
  } else {
    message = 'No active Google Play Premium subscription was found for this account.';
  }

  return {
    ok: true,
    statusCode: 200,
    restoredCount,
    entitlement,
    warnings,
    message,
  };
}

// ============================================================================
// GOOGLE PLAY REAL-TIME DEVELOPER NOTIFICATIONS (RTDN) WEBHOOK
// ============================================================================

export async function processGooglePlayRtdnNotification(params: {
  providedToken?: string;
  body: any;
}): Promise<{ ok: boolean; statusCode: number; message: string }> {
  const expectedToken = process.env.GOOGLE_PLAY_RTDN_TOKEN?.trim();
  if (!expectedToken) {
    return {
      ok: false,
      statusCode: 503,
      message: 'GOOGLE_PLAY_RTDN_TOKEN is not configured on the server.',
    };
  }

  const provided = String(params.providedToken || '').trim();
  const expectedBuf = Buffer.from(expectedToken, 'utf8');
  const providedBuf = Buffer.from(provided, 'utf8');
  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return {
      ok: false,
      statusCode: 401,
      message: 'Unauthorized RTDN notification token.',
    };
  }

  const encodedData = params.body?.message?.data;
  if (typeof encodedData !== 'string' || !encodedData.trim()) {
    return { ok: false, statusCode: 400, message: 'Missing Pub/Sub message.data payload.' };
  }

  let decoded: any;
  try {
    decoded = JSON.parse(Buffer.from(encodedData, 'base64').toString('utf8'));
  } catch {
    return { ok: false, statusCode: 400, message: 'Invalid base64 JSON payload in RTDN message.' };
  }

  const subNote = decoded?.subscriptionNotification;
  if (!subNote?.purchaseToken || !isValidPremiumProductId(subNote?.subscriptionId)) {
    return { ok: true, statusCode: 200, message: 'Ignored non-subscription or test RTDN message.' };
  }

  const purchaseToken = String(subNote.purchaseToken).trim();
  const productId = subNote.subscriptionId as PremiumPlanId;
  const packageName = String(decoded?.packageName || getConfiguredPackageName()).trim();
  const tokenHash = hashPurchaseToken(purchaseToken);

  const db = getDb();
  const existing = (db.premiumSubscriptions || []).find(s => s.purchaseTokenHash === tokenHash);
  if (!existing) {
    return { ok: true, statusCode: 200, message: 'No matching local subscription record for RTDN token.' };
  }

  const customer = (db.customerUsers || []).find(c => c.id === existing.customerId) || {
    id: existing.customerId,
    mobile: existing.customerMobile,
    countryCode: '+91',
    name: existing.customerName,
    email: existing.customerEmail,
    woodScanCredits: 0,
    subscriptionPlan: 'free' as const,
    subscriptionStatus: 'none' as const,
    subscriptionExpiryDate: null,
    verifiedAt: existing.createdAt,
    lastLoginAt: existing.updatedAt,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt,
  };

  // Notification type 12 = SUBSCRIPTION_REVOKED
  const notificationType = Number(subNote.notificationType);
  if (notificationType === 12) {
    upsertVerifiedSubscriptionRecord({
      customer,
      packageName,
      purchaseToken,
      verificationSource: 'rtdn_webhook',
      verified: {
        valid: true,
        productId,
        orderId: existing.orderId,
        status: 'revoked',
        autoRenewing: false,
        acknowledged: existing.acknowledged,
        startTimeMillis: existing.startTimeMillis,
        expiryTimeMillis: Date.now() - 1000,
        cancelReason: 'rtdn_revoked',
        revokedAt: new Date().toISOString(),
      },
    });
    return { ok: true, statusCode: 200, message: 'Processed RTDN revocation.' };
  }

  const verified = await verifyWithGooglePlayDeveloperApi({
    packageName,
    productId,
    purchaseToken,
  });

  if (verified.valid) {
    upsertVerifiedSubscriptionRecord({
      customer,
      packageName,
      purchaseToken,
      verified,
      verificationSource: 'rtdn_webhook',
    });
    return { ok: true, statusCode: 200, message: `Updated subscription status to ${verified.status}.` };
  }

  return { ok: true, statusCode: 200, message: 'RTDN received; verification deferred.' };
}

// ============================================================================
// SERVER-PERSISTED ADMOB CONFIGURATION & ADMIN ANALYTICS
// ============================================================================

export function getServerAdMobSettings(): AdMobSettings {
  const db = getDb();
  const stored = db.settings?.adSettings || ({} as Partial<AdMobSettings>);

  const testMode = stored.testMode ?? (process.env.NODE_ENV !== 'production');
  const resolveId = (storedVal: string | undefined, envVal: string | undefined, prod: string, test: string) => {
    if (testMode) return test;
    const candidate = (storedVal || envVal || '').trim();
    if (!candidate || Object.values(ADMOB_TEST_IDS).includes(candidate as any)) return prod;
    return candidate;
  };

  return {
    ...DEFAULT_ADMOB_SETTINGS,
    ...stored,
    enabled: stored.enabled ?? true,
    testMode,
    appId: resolveId(stored.appId, process.env.ADMOB_APP_ID, ADMOB_PRODUCTION_IDS.APP_ID, ADMOB_TEST_IDS.APP_ID),
    bannerAdUnitId: resolveId(
      stored.bannerAdUnitId,
      process.env.ADMOB_BANNER_UNIT_ID,
      ADMOB_PRODUCTION_IDS.BANNER,
      ADMOB_TEST_IDS.BANNER
    ),
    interstitialAdUnitId: resolveId(
      stored.interstitialAdUnitId,
      process.env.ADMOB_INTERSTITIAL_UNIT_ID,
      ADMOB_PRODUCTION_IDS.INTERSTITIAL,
      ADMOB_TEST_IDS.INTERSTITIAL
    ),
    rewardedAdUnitId: resolveId(
      stored.rewardedAdUnitId,
      process.env.ADMOB_REWARDED_UNIT_ID,
      ADMOB_PRODUCTION_IDS.REWARDED,
      ADMOB_TEST_IDS.REWARDED
    ),
    rewardedInterstitialAdUnitId: resolveId(
      stored.rewardedInterstitialAdUnitId,
      undefined,
      ADMOB_PRODUCTION_IDS.REWARDED_INTERSTITIAL,
      ADMOB_TEST_IDS.REWARDED_INTERSTITIAL
    ),
    nativeAdUnitId: resolveId(
      stored.nativeAdUnitId,
      undefined,
      ADMOB_PRODUCTION_IDS.NATIVE,
      ADMOB_TEST_IDS.NATIVE
    ),
    appOpenAdUnitId: resolveId(
      stored.appOpenAdUnitId,
      undefined,
      ADMOB_PRODUCTION_IDS.APP_OPEN,
      ADMOB_TEST_IDS.APP_OPEN
    ),
    interstitialMinIntervalSeconds: Math.max(
      30,
      Math.min(1800, Number(stored.interstitialMinIntervalSeconds) || 180)
    ),
    bannerHome: stored.bannerHome !== false,
    bannerCatalog: stored.bannerCatalog !== false,
    bannerCalculator: stored.bannerCalculator !== false,
    bannerSlidingWindow: stored.bannerSlidingWindow !== false,
    bannerWoodDetector: stored.bannerWoodDetector !== false,
    bannerChaukhat: stored.bannerChaukhat !== false,
    bannerDetail: stored.bannerDetail !== false,
    bannerVisualizer: stored.bannerVisualizer !== false,
    bannerArticles: stored.bannerArticles !== false,
    bannerTracking: stored.bannerTracking !== false,
    bannerSaved: stored.bannerSaved !== false,
    interstitialSlidingWindow: stored.interstitialSlidingWindow !== false,
    interstitialWoodDetector: stored.interstitialWoodDetector !== false,
    interstitialCalculator: stored.interstitialCalculator !== false,
    rewardedWoodDetector: stored.rewardedWoodDetector !== false,
  };
}

export function updateServerAdMobSettings(input: Partial<AdMobSettings>): {
  ok: boolean;
  statusCode: number;
  error?: string;
  adSettings?: AdMobSettings;
} {
  const current = getServerAdMobSettings();

  // Validate ID format mismatches when provided
  if (input.appId !== undefined && input.appId.trim()) {
    const mismatch = validateAdMobIdMismatch('appId', input.appId);
    if (mismatch) return { ok: false, statusCode: 400, error: mismatch };
    if (!isValidAdMobAppId(input.appId)) {
      return { ok: false, statusCode: 400, error: 'Invalid AdMob App ID format (expected ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX).' };
    }
  }

  const unitFields: Array<{ key: keyof AdMobSettings; label: string }> = [
    { key: 'bannerAdUnitId', label: 'Banner Ad Unit ID' },
    { key: 'interstitialAdUnitId', label: 'Interstitial Ad Unit ID' },
    { key: 'rewardedAdUnitId', label: 'Rewarded Ad Unit ID' },
    { key: 'rewardedInterstitialAdUnitId', label: 'Rewarded Interstitial Ad Unit ID' },
    { key: 'nativeAdUnitId', label: 'Native Ad Unit ID' },
    { key: 'appOpenAdUnitId', label: 'App Open Ad Unit ID' },
  ];

  for (const field of unitFields) {
    const val = input[field.key];
    if (typeof val === 'string' && val.trim()) {
      const mismatch = validateAdMobIdMismatch('adUnit', val);
      if (mismatch) return { ok: false, statusCode: 400, error: `${field.label}: ${mismatch}` };
      if (!isValidAdMobAdUnitId(val)) {
        return {
          ok: false,
          statusCode: 400,
          error: `${field.label} has invalid format (expected ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX).`,
        };
      }
    }
  }

  const nextSettings: AdMobSettings = {
    ...current,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : current.enabled,
    testMode: typeof input.testMode === 'boolean' ? input.testMode : current.testMode,
    appId: typeof input.appId === 'string' && input.appId.trim() ? input.appId.trim() : current.appId,
    bannerAdUnitId:
      typeof input.bannerAdUnitId === 'string' && input.bannerAdUnitId.trim()
        ? input.bannerAdUnitId.trim()
        : current.bannerAdUnitId,
    interstitialAdUnitId:
      typeof input.interstitialAdUnitId === 'string' && input.interstitialAdUnitId.trim()
        ? input.interstitialAdUnitId.trim()
        : current.interstitialAdUnitId,
    rewardedAdUnitId:
      typeof input.rewardedAdUnitId === 'string' && input.rewardedAdUnitId.trim()
        ? input.rewardedAdUnitId.trim()
        : current.rewardedAdUnitId,
    rewardedInterstitialAdUnitId:
      typeof input.rewardedInterstitialAdUnitId === 'string' && input.rewardedInterstitialAdUnitId.trim()
        ? input.rewardedInterstitialAdUnitId.trim()
        : current.rewardedInterstitialAdUnitId,
    nativeAdUnitId:
      typeof input.nativeAdUnitId === 'string' && input.nativeAdUnitId.trim()
        ? input.nativeAdUnitId.trim()
        : current.nativeAdUnitId,
    appOpenAdUnitId:
      typeof input.appOpenAdUnitId === 'string' && input.appOpenAdUnitId.trim()
        ? input.appOpenAdUnitId.trim()
        : current.appOpenAdUnitId,
    enableBanners: typeof input.enableBanners === 'boolean' ? input.enableBanners : current.enableBanners,
    enableInterstitials:
      typeof input.enableInterstitials === 'boolean' ? input.enableInterstitials : current.enableInterstitials,
    enableRewardedAds:
      typeof input.enableRewardedAds === 'boolean' ? input.enableRewardedAds : current.enableRewardedAds,
    enableRewardedInterstitialAds:
      typeof input.enableRewardedInterstitialAds === 'boolean'
        ? input.enableRewardedInterstitialAds
        : current.enableRewardedInterstitialAds,
    enableCatalogNativeAds:
      typeof input.enableCatalogNativeAds === 'boolean' ? input.enableCatalogNativeAds : current.enableCatalogNativeAds,
    enableAppOpenAds:
      typeof input.enableAppOpenAds === 'boolean' ? input.enableAppOpenAds : current.enableAppOpenAds,
    interstitialMinIntervalSeconds:
      input.interstitialMinIntervalSeconds !== undefined
        ? Math.max(30, Math.min(1800, Math.round(Number(input.interstitialMinIntervalSeconds) || 180)))
        : current.interstitialMinIntervalSeconds,
    appOpenMinIntervalSeconds:
      input.appOpenMinIntervalSeconds !== undefined
        ? Math.max(60, Math.min(1800, Math.round(Number(input.appOpenMinIntervalSeconds) || 180)))
        : current.appOpenMinIntervalSeconds,
    maxInterstitialsPerSession:
      input.maxInterstitialsPerSession !== undefined
        ? Math.max(1, Math.min(20, Math.round(Number(input.maxInterstitialsPerSession) || 4)))
        : current.maxInterstitialsPerSession,
    maxAppOpenPerSession:
      input.maxAppOpenPerSession !== undefined
        ? Math.max(1, Math.min(10, Math.round(Number(input.maxAppOpenPerSession) || 2)))
        : current.maxAppOpenPerSession,
    catalogNativeAdFrequency:
      input.catalogNativeAdFrequency !== undefined
        ? Math.max(3, Math.min(20, Math.round(Number(input.catalogNativeAdFrequency) || 6)))
        : current.catalogNativeAdFrequency,
    articlesNativeAdFrequency:
      input.articlesNativeAdFrequency !== undefined
        ? Math.max(2, Math.min(10, Math.round(Number(input.articlesNativeAdFrequency) || 3)))
        : current.articlesNativeAdFrequency,
    enableNavTransitionInterstitials:
      typeof input.enableNavTransitionInterstitials === 'boolean'
        ? input.enableNavTransitionInterstitials
        : current.enableNavTransitionInterstitials,
    enableArticlesNativeAds:
      typeof input.enableArticlesNativeAds === 'boolean'
        ? input.enableArticlesNativeAds
        : current.enableArticlesNativeAds,
    enableVisualizerRewardedBonus:
      typeof input.enableVisualizerRewardedBonus === 'boolean'
        ? input.enableVisualizerRewardedBonus
        : current.enableVisualizerRewardedBonus,
    bannerHome: typeof input.bannerHome === 'boolean' ? input.bannerHome : current.bannerHome,
    bannerCatalog: typeof input.bannerCatalog === 'boolean' ? input.bannerCatalog : current.bannerCatalog,
    bannerCalculator:
      typeof input.bannerCalculator === 'boolean' ? input.bannerCalculator : current.bannerCalculator,
    bannerSlidingWindow:
      typeof input.bannerSlidingWindow === 'boolean' ? input.bannerSlidingWindow : current.bannerSlidingWindow,
    bannerWoodDetector:
      typeof input.bannerWoodDetector === 'boolean' ? input.bannerWoodDetector : current.bannerWoodDetector,
    bannerChaukhat: typeof input.bannerChaukhat === 'boolean' ? input.bannerChaukhat : current.bannerChaukhat,
    bannerDetail: typeof input.bannerDetail === 'boolean' ? input.bannerDetail : current.bannerDetail,
    bannerVisualizer:
      typeof input.bannerVisualizer === 'boolean' ? input.bannerVisualizer : current.bannerVisualizer,
    bannerArticles: typeof input.bannerArticles === 'boolean' ? input.bannerArticles : current.bannerArticles,
    bannerTracking: typeof input.bannerTracking === 'boolean' ? input.bannerTracking : current.bannerTracking,
    bannerSaved: typeof input.bannerSaved === 'boolean' ? input.bannerSaved : current.bannerSaved,
    interstitialSlidingWindow:
      typeof input.interstitialSlidingWindow === 'boolean'
        ? input.interstitialSlidingWindow
        : current.interstitialSlidingWindow,
    interstitialWoodDetector:
      typeof input.interstitialWoodDetector === 'boolean'
        ? input.interstitialWoodDetector
        : current.interstitialWoodDetector,
    interstitialCalculator:
      typeof input.interstitialCalculator === 'boolean'
        ? input.interstitialCalculator
        : current.interstitialCalculator,
    rewardedWoodDetector:
      typeof input.rewardedWoodDetector === 'boolean'
        ? input.rewardedWoodDetector
        : current.rewardedWoodDetector,
  };

  const db = getDb();
  db.settings = {
    ...db.settings,
    adSettings: nextSettings,
  };

  saveDb(db, {
    entity: 'monetization_config',
    action: 'update',
    targetId: 'admob_settings',
    targetName: 'Google AdMob & Monetization Settings',
    details: `Updated AdMob config (enabled=${nextSettings.enabled}, testMode=${nextSettings.testMode}, cap=${nextSettings.interstitialMinIntervalSeconds}s)`,
  });

  return { ok: true, statusCode: 200, adSettings: nextSettings };
}

export function getPublicMonetizationConfig(customerId?: string | null): MonetizationPublicConfig {
  const billingStatus = getGooglePlayBillingServerStatus();
  return {
    adSettings: getServerAdMobSettings(),
    entitlement: evaluateCustomerEntitlement(customerId),
    plans: [
      PREMIUM_PLAN_CATALOG.JHD_ADFREE_MONTHLY,
      PREMIUM_PLAN_CATALOG.JHD_ADFREE_YEARLY,
    ],
    googlePlayPackageName: billingStatus.packageName,
    googlePlayVerificationConfigured: billingStatus.configured,
  };
}

export function getAdminMonetizationDashboard(filters?: {
  status?: string;
  productId?: string;
  search?: string;
}): {
  adSettings: AdMobSettings;
  plans: PremiumPlanDefinition[];
  billingServerStatus: GooglePlayBillingServerStatus;
  stats: PremiumSubscriptionStats;
  subscriptions: PremiumSubscriptionRecord[];
} {
  const nowMs = Date.now();
  refreshExpiredSubscriptionsIfNeeded(nowMs);

  const db = getDb();
  const allSubs = [...(db.premiumSubscriptions || [])].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  );

  const activeCustomerIds = new Set<string>();
  let activeAutoRenewingCount = 0;
  let cancelledActiveCount = 0;
  let expiredSubscriptions = 0;
  let pendingSubscriptions = 0;
  let refundedOrRevokedSubscriptions = 0;
  let monthlyActiveCount = 0;
  let yearlyActiveCount = 0;
  let monthlyTotalCount = 0;
  let yearlyTotalCount = 0;

  for (const sub of allSubs) {
    if (sub.productId === 'JHD_ADFREE_MONTHLY') monthlyTotalCount++;
    if (sub.productId === 'JHD_ADFREE_YEARLY') yearlyTotalCount++;

    const isEntitledNow =
      (sub.status === 'active' || sub.status === 'cancelled') && Number(sub.expiryTimeMillis || 0) > nowMs;

    if (isEntitledNow) {
      activeCustomerIds.add(sub.customerId);
      if (sub.status === 'active') activeAutoRenewingCount++;
      if (sub.status === 'cancelled') cancelledActiveCount++;
      if (sub.productId === 'JHD_ADFREE_MONTHLY') monthlyActiveCount++;
      if (sub.productId === 'JHD_ADFREE_YEARLY') yearlyActiveCount++;
    } else if (sub.status === 'expired') {
      expiredSubscriptions++;
    } else if (sub.status === 'pending') {
      pendingSubscriptions++;
    } else if (sub.status === 'refunded' || sub.status === 'revoked') {
      refundedOrRevokedSubscriptions++;
    }
  }

  let filtered = allSubs;
  if (filters?.status && filters.status !== 'all') {
    const target = filters.status.toLowerCase();
    if (target === 'entitled') {
      filtered = filtered.filter(
        s => (s.status === 'active' || s.status === 'cancelled') && Number(s.expiryTimeMillis || 0) > nowMs
      );
    } else {
      filtered = filtered.filter(s => s.status === target);
    }
  }

  if (filters?.productId && filters.productId !== 'all') {
    filtered = filtered.filter(s => s.productId === filters.productId);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      s =>
        s.customerName.toLowerCase().includes(q) ||
        s.customerMobile.toLowerCase().includes(q) ||
        (s.customerEmail || '').toLowerCase().includes(q) ||
        (s.orderId || '').toLowerCase().includes(q) ||
        s.productId.toLowerCase().includes(q)
    );
  }

  return {
    adSettings: getServerAdMobSettings(),
    plans: [
      PREMIUM_PLAN_CATALOG.JHD_ADFREE_MONTHLY,
      PREMIUM_PLAN_CATALOG.JHD_ADFREE_YEARLY,
    ],
    billingServerStatus: getGooglePlayBillingServerStatus(),
    stats: {
      activePremiumCustomers: activeCustomerIds.size,
      activeAutoRenewingCount,
      cancelledActiveCount,
      expiredSubscriptions,
      pendingSubscriptions,
      refundedOrRevokedSubscriptions,
      monthlyActiveCount,
      yearlyActiveCount,
      monthlyTotalCount,
      yearlyTotalCount,
      totalRecords: allSubs.length,
    },
    subscriptions: filtered,
  };
}
