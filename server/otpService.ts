import crypto from 'crypto';
import { getDb, saveDb } from './db.ts';
import { evaluateCustomerEntitlement } from './googlePlayBillingService.ts';
import { DEFAULT_FREE_CREDITS } from '../src/lib/creditManager.ts';
import type {
  CustomerAccount,
  CustomerSessionRecord,
  OtpChallengeRecord,
} from '../src/types.ts';

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 45 * 1000; // 45 seconds (within 30-60s requirement)
export const OTP_MAX_ATTEMPTS = 5;
export const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const CUSTOMER_COOKIE_NAME = 'jhd_customer_session';

// Sliding-window rate limit stores (in-memory per process)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_OTP_PER_MOBILE_WINDOW = 5;
const MAX_OTP_PER_IP_WINDOW = 15;
const MAX_VERIFY_PER_IP_WINDOW = 30;

const mobileSendLog = new Map<string, number[]>();
const ipSendLog = new Map<string, number[]>();
const ipVerifyLog = new Map<string, number[]>();
const inFlightOtpMobiles = new Set<string>();

export const APITXT_SEND_OTP_ENDPOINT = 'https://apitxt.com/api/sendOTP';

export interface SmsDispatchResult {
  sent: boolean;
  provider: 'apitxt';
  providerRequestId?: string;
  error?: string;
  errorCode?: string;
  missingEnvVars?: string[];
}

export type SmsTransportFn = (params: {
  mobileWithCountryCode: string; // e.g. "919876543210"
  otp: string;
  apiKey: string;
}) => Promise<SmsDispatchResult>;

/**
 * Strictly validates and normalizes an Indian 10-digit mobile number.
 * Accepts "9876543210", "+919876543210", "91 98765-43210", "09876543210".
 * Returns canonical 10-digit string starting with 6-9, or null if invalid.
 */
export function normalizeIndianMobile(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const digits = String(raw).replace(/\D/g, '');
  let core = digits;
  if (core.length === 12 && core.startsWith('91')) {
    core = core.slice(2);
  } else if (core.length === 11 && core.startsWith('0')) {
    core = core.slice(1);
  }
  if (!/^[6-9]\d{9}$/.test(core)) {
    return null;
  }
  return core;
}

export function maskMobileNumber(mobile: string): string {
  const clean = normalizeIndianMobile(mobile);
  if (!clean) return '**********';
  return `+91 ${clean.slice(0, 2)}****${clean.slice(6)}`;
}

function getEnvValue(name: string): string {
  return String(process.env[name] || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

export function getSmsProviderStatus(): {
  provider: 'apitxt';
  configured: boolean;
  hasApiKey: boolean;
  missingEnvVars: string[];
  setupMessage: string;
} {
  const apiKey = getEnvValue('APITXT_API_KEY');
  const missingEnvVars: string[] = [];
  if (!apiKey) missingEnvVars.push('APITXT_API_KEY');

  const configured = missingEnvVars.length === 0;
  return {
    provider: 'apitxt',
    configured,
    hasApiKey: Boolean(apiKey),
    missingEnvVars,
    setupMessage: configured
      ? 'APITXT SMS OTP provider is configured and ready.'
      : 'OTP SMS service is temporarily unavailable. Server environment variable APITXT_API_KEY is not configured.',
  };
}

function hashOtp(otp: string, salt: string): string {
  return crypto.scryptSync(otp, salt, 32).toString('hex');
}

function verifyOtpHash(candidateOtp: string, salt: string, storedHash: string): boolean {
  const candidateBuf = Buffer.from(hashOtp(candidateOtp, salt), 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (candidateBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function recordAndCheckRateLimit(
  store: Map<string, number[]>,
  key: string,
  maxRequests: number,
  nowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const existing = (store.get(key) || []).filter(ts => nowMs - ts < RATE_LIMIT_WINDOW_MS);
  if (existing.length >= maxRequests) {
    const oldest = existing[0];
    const retryAfterSec = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (nowMs - oldest)) / 1000));
    store.set(key, existing);
    return { allowed: false, retryAfterSec };
  }
  existing.push(nowMs);
  store.set(key, existing);
  return { allowed: true, retryAfterSec: 0 };
}

export function clearOtpRateLimitsForTests(): void {
  mobileSendLog.clear();
  ipSendLog.clear();
  ipVerifyLog.clear();
  inFlightOtpMobiles.clear();
}

/**
 * Official APITXT OTP delivery transport (POST https://apitxt.com/api/sendOTP).
 * Uses application/x-www-form-urlencoded with authkey, mobile (91XXXXXXXXXX), and otp.
 * Never logs or echoes plaintext OTP, APITXT_API_KEY, raw upstream errors, or unmasked mobile numbers.
 */
export async function sendViaApitxt(params: {
  mobileWithCountryCode: string;
  otp: string;
  apiKey: string;
}): Promise<SmsDispatchResult> {
  const formBody = new URLSearchParams({
    authkey: params.apiKey,
    mobile: params.mobileWithCountryCode,
    otp: params.otp,
  });

  const masked = maskMobileNumber(params.mobileWithCountryCode);

  try {
    const response = await fetch(APITXT_SEND_OTP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formBody.toString(),
      signal: AbortSignal.timeout(12000),
    });

    const rawText = await response.text();
    let parsed: Record<string, any> | null = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }

    const statusStr = String(parsed?.status ?? '').trim().toLowerCase();
    const typeStr = String(parsed?.type ?? '').trim().toLowerCase();
    const explicitFailure =
      parsed !== null &&
      (statusStr === 'error' ||
        statusStr === 'failed' ||
        statusStr === 'fail' ||
        statusStr === 'false' ||
        typeStr === 'error' ||
        parsed.success === false ||
        parsed.error === true);

    if (!response.ok || explicitFailure) {
      console.warn(
        `[OTP][APITXT] Dispatch failed for ${masked} (HTTP ${response.status})`
      );

      if (response.status === 422) {
        return {
          sent: false,
          provider: 'apitxt',
          errorCode: 'INVALID_MOBILE',
          error: 'Invalid mobile number. Please enter a valid 10-digit Indian mobile number.',
        };
      }
      if (response.status === 429) {
        return {
          sent: false,
          provider: 'apitxt',
          errorCode: 'APITXT_RATE_LIMITED',
          error: 'Too many OTP requests right now. Please wait a minute and try again.',
        };
      }
      return {
        sent: false,
        provider: 'apitxt',
        errorCode: 'APITXT_SERVICE_UNAVAILABLE',
        error: 'OTP SMS service is temporarily unavailable. Please try again shortly.',
      };
    }

    const requestId =
      parsed?.data?.request_id ||
      parsed?.request_id ||
      parsed?.id ||
      'apitxt_dispatched';

    console.info(`[OTP][APITXT] OTP dispatched successfully to ${masked}`);

    return {
      sent: true,
      provider: 'apitxt',
      providerRequestId: String(requestId),
    };
  } catch (err: any) {
    const errType = err?.name === 'TimeoutError' ? 'timeout' : 'network';
    console.warn(`[OTP][APITXT] Gateway ${errType} error for ${masked}`);
    return {
      sent: false,
      provider: 'apitxt',
      errorCode: 'APITXT_NETWORK_ERROR',
      error: 'OTP SMS service is temporarily unavailable. Please try again shortly.',
    };
  }
}

export interface SendOtpServiceResult {
  ok: boolean;
  statusCode: number;
  message?: string;
  error?: string;
  errorCode?: string;
  missingEnvVars?: string[];
  resendAfterSeconds?: number;
  expiresInSeconds?: number;
  maskedMobile?: string;
  isExistingAccount?: boolean;
}

/**
 * Generates a secure 6-digit OTP, stores its salted scrypt hash, and dispatches via APITXT.
 * Plaintext OTP is NEVER returned in responses or written to logs/DB.
 */
export async function requestMobileOtp(params: {
  rawMobile: unknown;
  clientIp: string;
  nowMs?: number;
  transport?: SmsTransportFn;
}): Promise<SendOtpServiceResult> {
  const nowMs = params.nowMs ?? Date.now();
  const mobile = normalizeIndianMobile(params.rawMobile);
  if (!mobile) {
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'INVALID_MOBILE',
      error: 'Invalid mobile number. Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
    };
  }

  // Prevent duplicate concurrent OTP requests for the same mobile number
  if (inFlightOtpMobiles.has(mobile)) {
    return {
      ok: false,
      statusCode: 429,
      errorCode: 'OTP_REQUEST_IN_PROGRESS',
      error: 'An OTP request is already in progress for this number. Please wait a moment.',
    };
  }

  inFlightOtpMobiles.add(mobile);
  try {
    const db = getDb();
    if (!Array.isArray(db.otpChallenges)) db.otpChallenges = [];
    if (!Array.isArray(db.customerUsers)) db.customerUsers = [];

    // Enforce 45-second resend cooldown before rate-limit increment
    const latestActive = db.otpChallenges
      .filter(c => c.mobile === mobile && !c.consumed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (latestActive) {
      const resendAtMs = new Date(latestActive.resendAvailableAt).getTime();
      if (nowMs < resendAtMs) {
        const remainingSec = Math.max(1, Math.ceil((resendAtMs - nowMs) / 1000));
        return {
          ok: false,
          statusCode: 429,
          errorCode: 'OTP_RESEND_COOLDOWN',
          resendAfterSeconds: remainingSec,
          error: `Please wait ${remainingSec} second${remainingSec === 1 ? '' : 's'} before requesting another OTP.`,
        };
      }
    }

    // Enforce sliding-window rate limits per mobile & per IP
    const mobileLimit = recordAndCheckRateLimit(mobileSendLog, mobile, MAX_OTP_PER_MOBILE_WINDOW, nowMs);
    if (!mobileLimit.allowed) {
      return {
        ok: false,
        statusCode: 429,
        errorCode: 'RATE_LIMIT_MOBILE',
        resendAfterSeconds: mobileLimit.retryAfterSec,
        error: `Too many OTP requests for this number. Please try again in ${Math.ceil(mobileLimit.retryAfterSec / 60)} minute(s).`,
      };
    }

    const ipLimit = recordAndCheckRateLimit(ipSendLog, params.clientIp || 'unknown', MAX_OTP_PER_IP_WINDOW, nowMs);
    if (!ipLimit.allowed) {
      return {
        ok: false,
        statusCode: 429,
        errorCode: 'RATE_LIMIT_IP',
        resendAfterSeconds: ipLimit.retryAfterSec,
        error: 'Too many OTP requests from this network. Please wait a few minutes and try again.',
      };
    }

    // Verify APITXT_API_KEY configuration (NO dummy/fake OTP fallback)
    const providerStatus = getSmsProviderStatus();
    const apiKey = getEnvValue('APITXT_API_KEY');

    if (!params.transport && !providerStatus.configured) {
      return {
        ok: false,
        statusCode: 424,
        errorCode: 'SMS_PROVIDER_NOT_CONFIGURED',
        missingEnvVars: providerStatus.missingEnvVars,
        error: providerStatus.setupMessage,
      };
    }

    // Cryptographically secure 6-digit OTP (100000 - 999999)
    const otp = String(crypto.randomInt(100000, 1000000));
    const salt = crypto.randomBytes(16).toString('hex');
    const otpHash = hashOtp(otp, salt);

    // Dispatch via APITXT BEFORE invalidating old challenges or storing new one
    const dispatchFn = params.transport || sendViaApitxt;
    const dispatch = await dispatchFn({
      mobileWithCountryCode: `91${mobile}`,
      otp,
      apiKey,
    });

    if (!dispatch.sent) {
      const failureStatus = dispatch.errorCode === 'INVALID_MOBILE' ? 400 : 424;
      return {
        ok: false,
        statusCode: failureStatus,
        errorCode: dispatch.errorCode || 'SMS_DELIVERY_FAILED',
        error: dispatch.error || 'OTP SMS service is temporarily unavailable. Please try again shortly.',
      };
    }

    // Mark any previous unconsumed challenges for this mobile as superseded
    for (const ch of db.otpChallenges) {
      if (ch.mobile === mobile && !ch.consumed) {
        ch.consumed = true;
        ch.consumedAt = new Date(nowMs).toISOString();
      }
    }

    const challenge: OtpChallengeRecord = {
      id: `otp-${nowMs}-${crypto.randomBytes(6).toString('hex')}`,
      mobile,
      otpHash,
      otpSalt: salt,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt: new Date(nowMs + OTP_EXPIRY_MS).toISOString(),
      resendAvailableAt: new Date(nowMs + OTP_RESEND_COOLDOWN_MS).toISOString(),
      consumed: false,
      provider: 'apitxt',
      providerRequestId: dispatch.providerRequestId,
      createdAt: new Date(nowMs).toISOString(),
    };

    db.otpChallenges.unshift(challenge);
    // Keep latest 500 OTP records to prevent unbounded DB growth
    if (db.otpChallenges.length > 500) {
      db.otpChallenges = db.otpChallenges.slice(0, 500);
    }

    saveDb(db);

    const existingAccount = db.customerUsers.find(u => u.mobile === mobile);

    return {
      ok: true,
      statusCode: 200,
      message: `OTP sent successfully to ${maskMobileNumber(mobile)}.`,
      maskedMobile: maskMobileNumber(mobile),
      resendAfterSeconds: Math.round(OTP_RESEND_COOLDOWN_MS / 1000),
      expiresInSeconds: Math.round(OTP_EXPIRY_MS / 1000),
      isExistingAccount: Boolean(existingAccount),
    };
  } finally {
    inFlightOtpMobiles.delete(mobile);
  }
}

export interface VerifyOtpServiceResult {
  ok: boolean;
  statusCode: number;
  error?: string;
  errorCode?: string;
  attemptsRemaining?: number;
  isNewUser?: boolean;
  token?: string;
  expiresAt?: string;
  customer?: CustomerAccount;
}

/**
 * Verifies a 6-digit OTP against the latest active hashed challenge, creates or reuses
 * a unique customer account for the verified mobile number, and issues a secure session token.
 */
export function verifyMobileOtp(params: {
  rawMobile: unknown;
  rawOtp: unknown;
  customerName?: unknown;
  clientIp: string;
  userAgent?: string;
  nowMs?: number;
}): VerifyOtpServiceResult {
  const nowMs = params.nowMs ?? Date.now();
  const mobile = normalizeIndianMobile(params.rawMobile);
  if (!mobile) {
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'INVALID_MOBILE',
      error: 'Please enter a valid 10-digit Indian mobile number.',
    };
  }

  const otp = String(params.rawOtp || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(otp)) {
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'INVALID_OTP_FORMAT',
      error: 'Please enter the 6-digit numeric OTP sent to your mobile number.',
    };
  }

  const verifyIpLimit = recordAndCheckRateLimit(
    ipVerifyLog,
    params.clientIp || 'unknown',
    MAX_VERIFY_PER_IP_WINDOW,
    nowMs
  );
  if (!verifyIpLimit.allowed) {
    return {
      ok: false,
      statusCode: 429,
      errorCode: 'RATE_LIMIT_VERIFY',
      error: 'Too many verification attempts. Please wait a few minutes and try again.',
    };
  }

  const db = getDb();
  if (!Array.isArray(db.otpChallenges)) db.otpChallenges = [];
  if (!Array.isArray(db.customerUsers)) db.customerUsers = [];
  if (!Array.isArray(db.customerSessions)) db.customerSessions = [];

  const challenge = db.otpChallenges
    .filter(c => c.mobile === mobile && !c.consumed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!challenge) {
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'OTP_NOT_FOUND',
      error: 'No active OTP found for this mobile number. Please click Send OTP first.',
    };
  }

  if (nowMs > new Date(challenge.expiresAt).getTime()) {
    challenge.consumed = true;
    challenge.consumedAt = new Date(nowMs).toISOString();
    saveDb(db);
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'OTP_EXPIRED',
      error: 'This OTP has expired after 5 minutes. Please request a new OTP.',
    };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    challenge.consumed = true;
    challenge.consumedAt = new Date(nowMs).toISOString();
    saveDb(db);
    return {
      ok: false,
      statusCode: 429,
      errorCode: 'OTP_MAX_ATTEMPTS_EXCEEDED',
      attemptsRemaining: 0,
      error: 'Maximum 5 incorrect OTP attempts reached. Please request a new OTP.',
    };
  }

  const isMatch = verifyOtpHash(otp, challenge.otpSalt, challenge.otpHash);
  if (!isMatch) {
    challenge.attempts += 1;
    const remaining = Math.max(0, challenge.maxAttempts - challenge.attempts);
    if (remaining === 0) {
      challenge.consumed = true;
      challenge.consumedAt = new Date(nowMs).toISOString();
    }
    saveDb(db);
    return {
      ok: false,
      statusCode: remaining === 0 ? 429 : 400,
      errorCode: remaining === 0 ? 'OTP_MAX_ATTEMPTS_EXCEEDED' : 'OTP_INVALID',
      attemptsRemaining: remaining,
      error:
        remaining === 0
          ? 'Maximum 5 incorrect OTP attempts reached. Please request a new OTP.'
          : `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Mark challenge consumed (single-use)
  challenge.consumed = true;
  challenge.consumedAt = new Date(nowMs).toISOString();

  // Deduplicated customer lookup by normalized 10-digit mobile number
  const nowIso = new Date(nowMs).toISOString();
  const cleanName =
    typeof params.customerName === 'string' ? params.customerName.trim().slice(0, 80) : '';

  let customer = db.customerUsers.find(u => normalizeIndianMobile(u.mobile) === mobile);
  let isNewUser = false;

  if (!customer) {
    isNewUser = true;
    customer = {
      id: `cust-${nowMs}-${crypto.randomBytes(5).toString('hex')}`,
      mobile,
      countryCode: '+91',
      name: cleanName || `Customer ${mobile.slice(-4)}`,
      woodScanCredits: DEFAULT_FREE_CREDITS,
      subscriptionPlan: 'free',
      subscriptionStatus: 'none',
      subscriptionExpiryDate: null,
      verifiedAt: nowIso,
      lastLoginAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.customerUsers.unshift(customer);
  } else {
    customer.mobile = mobile;
    customer.lastLoginAt = nowIso;
    customer.updatedAt = nowIso;
    if (cleanName && (!customer.name || customer.name.startsWith('Customer '))) {
      customer.name = cleanName;
    }
    if (typeof customer.woodScanCredits !== 'number' || Number.isNaN(customer.woodScanCredits)) {
      customer.woodScanCredits = DEFAULT_FREE_CREDITS;
    }
    // Login NEVER activates Premium: always reconcile plan strictly from verified payment records
    const verifiedEntitlement = evaluateCustomerEntitlement(customer.id, nowMs);
    customer.subscriptionPlan = verifiedEntitlement.subscriptionPlan;
    customer.subscriptionStatus = verifiedEntitlement.subscriptionStatus;
    customer.subscriptionExpiryDate = verifiedEntitlement.subscriptionExpiryDate;
  }

  // Create secure 256-bit random session token (stored hashed in DB)
  const rawToken = `jhd_cust_${crypto.randomBytes(32).toString('hex')}`;
  const expiresAt = new Date(nowMs + CUSTOMER_SESSION_TTL_MS).toISOString();
  const session: CustomerSessionRecord = {
    id: `sess-${nowMs}-${crypto.randomBytes(5).toString('hex')}`,
    customerId: customer.id,
    mobile,
    tokenHash: hashSessionToken(rawToken),
    expiresAt,
    createdAt: nowIso,
    lastUsedAt: nowIso,
    revoked: false,
    userAgent: params.userAgent ? String(params.userAgent).slice(0, 180) : undefined,
  };

  // Prune expired/revoked sessions for hygiene
  db.customerSessions = db.customerSessions
    .filter(s => !s.revoked && new Date(s.expiresAt).getTime() > nowMs)
    .slice(0, 499);
  db.customerSessions.unshift(session);

  saveDb(db);

  return {
    ok: true,
    statusCode: 200,
    isNewUser,
    token: rawToken,
    expiresAt,
    customer,
  };
}

export function resolveCustomerFromToken(
  rawToken: string | null | undefined,
  nowMs = Date.now()
): { customer: CustomerAccount; session: CustomerSessionRecord } | null {
  if (!rawToken || typeof rawToken !== 'string' || !rawToken.startsWith('jhd_cust_')) {
    return null;
  }
  const db = getDb();
  if (!Array.isArray(db.customerSessions) || !Array.isArray(db.customerUsers)) {
    return null;
  }
  const tokenHash = hashSessionToken(rawToken);
  const session = db.customerSessions.find(
    s => !s.revoked && s.tokenHash === tokenHash && new Date(s.expiresAt).getTime() > nowMs
  );
  if (!session) return null;

  const customer = db.customerUsers.find(u => u.id === session.customerId);
  if (!customer) return null;

  return { customer, session };
}

export function revokeCustomerSession(rawToken: string | null | undefined): boolean {
  if (!rawToken || typeof rawToken !== 'string') return false;
  const db = getDb();
  if (!Array.isArray(db.customerSessions)) return false;
  const tokenHash = hashSessionToken(rawToken);
  const session = db.customerSessions.find(s => s.tokenHash === tokenHash && !s.revoked);
  if (!session) return false;
  session.revoked = true;
  saveDb(db);
  return true;
}

export function updateCustomerProfile(
  customerId: string,
  updates: { name?: unknown; email?: unknown; city?: unknown; address?: unknown }
): CustomerAccount | null {
  const db = getDb();
  if (!Array.isArray(db.customerUsers)) return null;
  const customer = db.customerUsers.find(u => u.id === customerId);
  if (!customer) return null;

  if (typeof updates.name === 'string' && updates.name.trim()) {
    customer.name = updates.name.trim().slice(0, 80);
  }
  if (typeof updates.email === 'string') {
    const cleanEmail = updates.email.trim().slice(0, 120);
    if (!cleanEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      customer.email = cleanEmail || undefined;
    }
  }
  if (typeof updates.city === 'string') {
    customer.city = updates.city.trim().slice(0, 80) || undefined;
  }
  if (typeof updates.address === 'string') {
    customer.address = updates.address.trim().slice(0, 240) || undefined;
  }
  // Re-attach authoritative server-evaluated subscription fields (profile update can NEVER alter subscriptionPlan)
  const entitlement = evaluateCustomerEntitlement(customer.id);
  customer.subscriptionPlan = entitlement.subscriptionPlan;
  customer.subscriptionStatus = entitlement.subscriptionStatus;
  customer.subscriptionExpiryDate = entitlement.subscriptionExpiryDate;
  customer.updatedAt = new Date().toISOString();
  saveDb(db);
  return customer;
}

/**
 * Aggregates verified customer's Order History (historical orders + quotes matching their mobile),
 * Payment History, and authoritative server-verified Subscription Entitlement without altering
 * or exposing any other customer's records.
 */
export function getCustomerAccountSummary(customer: CustomerAccount) {
  const db = getDb();
  const normalizedMobile = normalizeIndianMobile(customer.mobile);
  const entitlement = evaluateCustomerEntitlement(customer.id);

  const authoritativeCustomer: CustomerAccount = {
    ...customer,
    subscriptionPlan: entitlement.subscriptionPlan,
    subscriptionStatus: entitlement.subscriptionStatus,
    subscriptionExpiryDate: entitlement.subscriptionExpiryDate,
  };

  const payments = (db.payments || [])
    .filter(
      p =>
        p.customerId === customer.id ||
        (normalizedMobile && normalizeIndianMobile(p.customerMobile) === normalizedMobile)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const quotes = (db.quotes || [])
    .filter(q => normalizedMobile && normalizeIndianMobile(q.customerPhone) === normalizedMobile)
    .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

  const orders = (db.trackingOrders || [])
    .filter(o => normalizedMobile && normalizeIndianMobile(o.customerPhone) === normalizedMobile)
    .map(o => ({
      id: o.id,
      orderNumber: o.trackingId,
      productName: o.productName,
      category: o.productCategory,
      woodType: o.woodType,
      quantity: o.quantity,
      totalAmount: o.totalAmount,
      advancePaid: o.advancePaid,
      status: o.status,
      deliveryStatusText: o.deliveryStatusText,
      createdAt: o.createdAt,
    }));

  return {
    customer: authoritativeCustomer,
    entitlement,
    payments,
    quotes,
    orders,
  };
}
