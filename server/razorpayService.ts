import crypto from 'crypto';
import { getDb, saveDb } from './db.ts';
import { CREDIT_PACKS, type CreditPack } from '../src/lib/creditManager.ts';
import { normalizeIndianMobile } from './otpService.ts';
import type {
  CalculationInput,
  CalculationResult,
  ChaukhatCalculationResult,
  CustomerAccount,
  PaymentGatewaySettings,
  PaymentItemType,
  PaymentStatus,
  PaymentTransaction,
  RazorpayMode,
} from '../src/types.ts';

export interface PricingCalculators {
  performCalculation: (input: CalculationInput) => CalculationResult;
  performChaukhatCalculation: (input: Record<string, any>) => ChaukhatCalculationResult;
}

export interface RazorpayHttpResponse {
  ok: boolean;
  status: number;
  data: any;
}

export type RazorpayTransportFn = (params: {
  method: 'GET' | 'POST';
  path: string;
  keyId: string;
  keySecret: string;
  body?: Record<string, any>;
}) => Promise<RazorpayHttpResponse>;

function getEnv(name: string): string {
  return String(process.env[name] || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

export function maskPublicKeyId(keyId: string): string {
  if (!keyId) return '';
  if (keyId.length <= 12) return `${keyId.slice(0, 4)}****`;
  return `${keyId.slice(0, 10)}****${keyId.slice(-4)}`;
}

export function getActiveRazorpayMode(): RazorpayMode {
  const db = getDb();
  const dbMode = db.paymentSettings?.mode;
  if (dbMode === 'live') return 'live';
  if (dbMode === 'test') return 'test';
  return getEnv('RAZORPAY_MODE').toLowerCase() === 'live' ? 'live' : 'test';
}

export function getRazorpayCredentials(mode: RazorpayMode): {
  mode: RazorpayMode;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  configured: boolean;
  missingEnvVars: string[];
} {
  const keyIdVar = mode === 'live' ? 'RAZORPAY_LIVE_KEY_ID' : 'RAZORPAY_TEST_KEY_ID';
  const keySecretVar = mode === 'live' ? 'RAZORPAY_LIVE_KEY_SECRET' : 'RAZORPAY_TEST_KEY_SECRET';

  const keyId = getEnv(keyIdVar);
  const keySecret = getEnv(keySecretVar);
  const webhookSecret =
    getEnv(mode === 'live' ? 'RAZORPAY_LIVE_WEBHOOK_SECRET' : 'RAZORPAY_TEST_WEBHOOK_SECRET') ||
    getEnv('RAZORPAY_WEBHOOK_SECRET');

  const missingEnvVars: string[] = [];
  if (!keyId) missingEnvVars.push(keyIdVar);
  if (!keySecret) missingEnvVars.push(keySecretVar);

  return {
    mode,
    keyId,
    keySecret,
    webhookSecret,
    configured: missingEnvVars.length === 0,
    missingEnvVars,
  };
}

/**
 * Returns safe public config for frontend Checkout initialization (NEVER exposes secrets).
 */
export function getPublicPaymentConfig() {
  const db = getDb();
  const mode = getActiveRazorpayMode();
  const creds = getRazorpayCredentials(mode);
  const settings = db.paymentSettings || {
    mode,
    currency: 'INR' as const,
    checkoutBrandName: db.settings?.businessName || 'WindowCut Pro',
    checkoutDescription: 'WindowCut Pro — Sliding Window Fabrication Calculator',
    checkoutThemeColor: '#0B5ED7',
    smsProvider: 'apitxt' as const,
  };

  return {
    configured: creds.configured,
    mode,
    keyId: creds.configured ? creds.keyId : '', // Razorpay Key ID is public by design; Key Secret is NEVER exposed
    currency: 'INR',
    checkoutBrandName: settings.checkoutBrandName || db.settings?.businessName || 'WindowCut Pro',
    checkoutDescription: settings.checkoutDescription || 'WindowCut Pro — Sliding Window Fabrication Calculator',
    checkoutThemeColor: settings.checkoutThemeColor || '#0B5ED7',
    missingEnvVars: creds.missingEnvVars,
    creditPacks: CREDIT_PACKS,
  };
}

/**
 * Returns safe Admin Payment Settings summary (zero secret strings ever sent to frontend).
 */
export function getAdminPaymentSettingsSummary() {
  const db = getDb();
  const mode = getActiveRazorpayMode();
  const testCreds = getRazorpayCredentials('test');
  const liveCreds = getRazorpayCredentials('live');
  const webhookSecretSet = Boolean(
    getEnv('RAZORPAY_WEBHOOK_SECRET') ||
      getEnv('RAZORPAY_TEST_WEBHOOK_SECRET') ||
      getEnv('RAZORPAY_LIVE_WEBHOOK_SECRET')
  );

  return {
    mode,
    currency: 'INR',
    checkoutBrandName: db.paymentSettings?.checkoutBrandName || db.settings?.businessName || 'WindowCut Pro',
    checkoutDescription:
      db.paymentSettings?.checkoutDescription || 'WindowCut Pro — Sliding Window Fabrication Calculator',
    checkoutThemeColor: db.paymentSettings?.checkoutThemeColor || '#0B5ED7',
    updatedAt: db.paymentSettings?.updatedAt || null,
    credentialsStatus: {
      testModeReady: testCreds.configured,
      testKeyIdMasked: maskPublicKeyId(testCreds.keyId),
      testKeySecretSet: Boolean(testCreds.keySecret),
      liveModeReady: liveCreds.configured,
      liveKeyIdMasked: maskPublicKeyId(liveCreds.keyId),
      liveKeySecretSet: Boolean(liveCreds.keySecret),
      webhookSecretSet,
      activeMissingEnvVars: mode === 'live' ? liveCreds.missingEnvVars : testCreds.missingEnvVars,
    },
    webhookEndpointPath: '/api/payments/webhook',
  };
}

export function updateAdminPaymentSettings(updates: {
  mode?: unknown;
  checkoutBrandName?: unknown;
  checkoutDescription?: unknown;
  checkoutThemeColor?: unknown;
}): { ok: boolean; statusCode: number; error?: string; settings?: ReturnType<typeof getAdminPaymentSettingsSummary> } {
  const db = getDb();
  const current: PaymentGatewaySettings = db.paymentSettings || {
    mode: 'test',
    currency: 'INR',
    checkoutBrandName: db.settings?.businessName || 'WindowCut Pro',
    checkoutDescription: 'WindowCut Pro — Sliding Window Fabrication Calculator',
    checkoutThemeColor: '#0B5ED7',
    smsProvider: 'apitxt',
  };

  if (updates.mode !== undefined) {
    const requestedMode = String(updates.mode).trim().toLowerCase();
    if (requestedMode !== 'test' && requestedMode !== 'live') {
      return { ok: false, statusCode: 400, error: 'Payment mode must be either "test" or "live".' };
    }
    if (requestedMode === 'live') {
      const liveCreds = getRazorpayCredentials('live');
      if (!liveCreds.configured) {
        return {
          ok: false,
          statusCode: 400,
          error: `Cannot switch to LIVE mode until server environment variables are configured: ${liveCreds.missingEnvVars.join(', ')}. Keep TEST mode active until live credentials are verified.`,
        };
      }
      if (!liveCreds.keyId.startsWith('rzp_live_')) {
        return {
          ok: false,
          statusCode: 400,
          error: 'RAZORPAY_LIVE_KEY_ID must be a valid Razorpay Live Key starting with "rzp_live_".',
        };
      }
    }
    current.mode = requestedMode;
  }

  if (typeof updates.checkoutBrandName === 'string' && updates.checkoutBrandName.trim()) {
    current.checkoutBrandName = updates.checkoutBrandName.trim().slice(0, 80);
  }
  if (typeof updates.checkoutDescription === 'string' && updates.checkoutDescription.trim()) {
    current.checkoutDescription = updates.checkoutDescription.trim().slice(0, 140);
  }
  if (typeof updates.checkoutThemeColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(updates.checkoutThemeColor.trim())) {
    current.checkoutThemeColor = updates.checkoutThemeColor.trim();
  }
  current.smsProvider = 'apitxt';
  current.updatedAt = new Date().toISOString();

  db.paymentSettings = current;
  saveDb(db, {
    entity: 'settings',
    action: 'update',
    targetName: 'Payment Settings',
    details: `Updated Razorpay payment settings (mode=${current.mode})`,
  });

  return { ok: true, statusCode: 200, settings: getAdminPaymentSettingsSummary() };
}

/**
 * Default real Razorpay REST API v1 transport using HTTP Basic Auth (keyId:keySecret).
 */
export async function defaultRazorpayTransport(params: {
  method: 'GET' | 'POST';
  path: string;
  keyId: string;
  keySecret: string;
  body?: Record<string, any>;
}): Promise<RazorpayHttpResponse> {
  const auth = Buffer.from(`${params.keyId}:${params.keySecret}`).toString('base64');
  const url = `https://api.razorpay.com/v1${params.path}`;

  const response = await fetch(url, {
    method: params.method,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 300) };
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export interface VerifiedPricingItem {
  itemType: PaymentItemType;
  itemReferenceId: string;
  productName: string;
  productDescription: string;
  amountInr: number;
  amountPaise: number;
  creditsToAward?: number;
  pricingSnapshot: Record<string, any>;
}

/**
 * Resolves authoritative server-side pricing strictly from existing application pricing data.
 * Client-supplied prices/amounts are NEVER accepted or trusted.
 */
export function resolveVerifiedItemPricing(
  payload: {
    itemType: unknown;
    packId?: unknown;
    quoteId?: unknown;
    calculationInput?: unknown;
    chaukhatInput?: unknown;
  },
  calculators: PricingCalculators
): { ok: true; item: VerifiedPricingItem } | { ok: false; statusCode: number; error: string } {
  const itemType = String(payload.itemType || '').trim() as PaymentItemType;
  const db = getDb();

  if (itemType === 'credit_pack') {
    const packId = String(payload.packId || '').trim();
    const pack: CreditPack | undefined = CREDIT_PACKS.find(p => p.id === packId);
    if (!pack) {
      return {
        ok: false,
        statusCode: 400,
        error: 'Invalid AI Wood Scan credit package selected.',
      };
    }
    const amountInr = Number(pack.priceInInr || pack.price);
    return {
      ok: true,
      item: {
        itemType: 'credit_pack',
        itemReferenceId: pack.id,
        productName: `AI Wood Detector — ${pack.name} (${pack.credits} Credits)`,
        productDescription: pack.description,
        amountInr,
        amountPaise: Math.round(amountInr * 100),
        creditsToAward: pack.credits,
        pricingSnapshot: {
          source: 'CREDIT_PACKS',
          packId: pack.id,
          credits: pack.credits,
          scans: pack.scans,
          priceInInr: amountInr,
        },
      },
    };
  }

  if (itemType === 'quotation') {
    const quoteId = String(payload.quoteId || '').trim();
    if (!quoteId) {
      return { ok: false, statusCode: 400, error: 'Quotation ID is required for online payment.' };
    }
    const quote = (db.quotes || []).find(q => q.id === quoteId || q.quoteNumber === quoteId);
    if (!quote) {
      return {
        ok: false,
        statusCode: 404,
        error: 'Saved quotation not found in server database. Please generate a quotation first.',
      };
    }
    const verifiedTotal = Math.round(Number(quote.total || 0));
    if (!Number.isFinite(verifiedTotal) || verifiedTotal < 1) {
      return { ok: false, statusCode: 400, error: 'Quotation has an invalid total amount.' };
    }
    return {
      ok: true,
      item: {
        itemType: 'quotation',
        itemReferenceId: quote.id,
        productName: `${quote.doorName || 'Custom Wood Door'} (${quote.quoteNumber})`,
        productDescription: `${quote.widthInch}" × ${quote.heightInch}" • ${quote.materialName} • ${quote.finishName}`,
        amountInr: verifiedTotal,
        amountPaise: Math.round(verifiedTotal * 100),
        pricingSnapshot: {
          source: 'saved_quotation',
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          subtotal: quote.subtotal,
          additionalCharges: quote.additionalCharges,
          total: verifiedTotal,
        },
      },
    };
  }

  if (itemType === 'door_calculation') {
    if (!payload.calculationInput || typeof payload.calculationInput !== 'object') {
      return { ok: false, statusCode: 400, error: 'Door calculation configuration is required.' };
    }
    const result = calculators.performCalculation(payload.calculationInput as CalculationInput);
    const verifiedTotal = Math.round(Number(result.total || 0));
    if (!Number.isFinite(verifiedTotal) || verifiedTotal < 1) {
      return { ok: false, statusCode: 400, error: 'Calculated door price is invalid.' };
    }
    return {
      ok: true,
      item: {
        itemType: 'door_calculation',
        itemReferenceId: result.doorId || 'custom-door',
        productName: `${result.doorName || 'Custom Wood Door'} (${result.widthInch}" × ${result.heightInch}")`,
        productDescription: `${result.materialName} • ${result.finishName}${result.hardwareCost > 0 ? ` • ${result.hardwareName}` : ''}`,
        amountInr: verifiedTotal,
        amountPaise: Math.round(verifiedTotal * 100),
        pricingSnapshot: {
          source: 'performCalculation',
          widthInch: result.widthInch,
          heightInch: result.heightInch,
          sqFt: result.sqFt,
          materialName: result.materialName,
          finishName: result.finishName,
          hardwareName: result.hardwareName,
          subtotal: result.subtotal,
          additionalCharges: result.additionalCharges,
          total: verifiedTotal,
        },
      },
    };
  }

  if (itemType === 'chaukhat_calculation') {
    if (!payload.chaukhatInput || typeof payload.chaukhatInput !== 'object') {
      return { ok: false, statusCode: 400, error: 'Chaukhat configuration is required.' };
    }
    const result = calculators.performChaukhatCalculation(payload.chaukhatInput as Record<string, any>);
    const verifiedTotal = Math.round(Number(result.totalPrice || 0));
    if (!Number.isFinite(verifiedTotal) || verifiedTotal < 1) {
      return { ok: false, statusCode: 400, error: 'Calculated chaukhat price is invalid.' };
    }
    return {
      ok: true,
      item: {
        itemType: 'chaukhat_calculation',
        itemReferenceId: `chaukhat-${result.selectedDesignId}`,
        productName: `Wooden Chaukhat — ${result.selectedDesignName} (${result.woodType})`,
        productDescription: `${result.heightFt}ft × ${result.widthFt}ft (${result.runningLengthFt} Rft) • Section ${result.sectionSizeName}`,
        amountInr: verifiedTotal,
        amountPaise: Math.round(verifiedTotal * 100),
        pricingSnapshot: {
          source: 'performChaukhatCalculation',
          woodType: result.woodType,
          sectionSizeName: result.sectionSizeName,
          runningLengthFt: result.runningLengthFt,
          design: result.selectedDesignName,
          materialCost: result.materialCost,
          designCarvingCharge: result.designCarvingCharge,
          totalPrice: verifiedTotal,
        },
      },
    };
  }

  return {
    ok: false,
    statusCode: 400,
    error: 'Unsupported payment item type. Use credit_pack, quotation, door_calculation, or chaukhat_calculation.',
  };
}

function generateUniqueTransactionId(nowMs = Date.now()): string {
  const year = new Date(nowMs).getFullYear();
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `JHD-TXN-${year}-${suffix}`;
}

function generateNextReceiptNumber(payments: PaymentTransaction[], nowMs = Date.now()): string {
  const year = new Date(nowMs).getFullYear();
  const existingPaidCount = payments.filter(p => Boolean(p.receiptNumber)).length + 1;
  const randomTag = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `JHD-RCPT-${year}-${String(existingPaidCount).padStart(4, '0')}-${randomTag}`;
}

/**
 * Verifies Razorpay Checkout HMAC-SHA256 signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
 */
export function verifyRazorpayCheckoutSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  keySecret: string;
}): boolean {
  if (!params.razorpayOrderId || !params.razorpayPaymentId || !params.razorpaySignature || !params.keySecret) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', params.keySecret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(String(params.razorpaySignature).trim(), 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Verifies Razorpay Webhook HMAC-SHA256 signature over raw request payload bytes.
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: Buffer | string;
  signatureHeader: string;
  webhookSecret: string;
}): boolean {
  if (!params.rawBody || !params.signatureHeader || !params.webhookSecret) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', params.webhookSecret)
    .update(params.rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(String(params.signatureHeader).trim(), 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Creates a real Razorpay Order via backend API using strictly server-verified pricing.
 */
export async function createRazorpayOrderForCustomer(params: {
  customer: CustomerAccount;
  body: {
    itemType: unknown;
    packId?: unknown;
    quoteId?: unknown;
    calculationInput?: unknown;
    chaukhatInput?: unknown;
  };
  calculators: PricingCalculators;
  transport?: RazorpayTransportFn;
  overrideCreds?: { mode: RazorpayMode; keyId: string; keySecret: string };
}) {
  // 1. Resolve authoritative server-side price (ignores any client-supplied amount!)
  const pricing = resolveVerifiedItemPricing(params.body, params.calculators);
  if ('error' in pricing) {
    return {
      ok: false,
      statusCode: pricing.statusCode,
      errorCode: 'INVALID_PAYMENT_ITEM',
      error: pricing.error,
    };
  }

  // 2. Load active mode & server-side credentials
  const mode = params.overrideCreds?.mode || getActiveRazorpayMode();
  const creds = params.overrideCreds
    ? {
        mode: params.overrideCreds.mode,
        keyId: params.overrideCreds.keyId,
        keySecret: params.overrideCreds.keySecret,
        configured: Boolean(params.overrideCreds.keyId && params.overrideCreds.keySecret),
        missingEnvVars: [] as string[],
      }
    : getRazorpayCredentials(mode);

  if (!creds.configured) {
    return {
      ok: false,
      statusCode: 424,
      errorCode: 'RAZORPAY_NOT_CONFIGURED',
      mode,
      missingEnvVars: creds.missingEnvVars,
      error: `Razorpay ${mode.toUpperCase()} mode credentials are not configured on the server. Set ${creds.missingEnvVars.join(', ')} in server environment variables.`,
    };
  }

  const nowMs = Date.now();
  const transactionId = generateUniqueTransactionId(nowMs);
  const transportFn = params.transport || defaultRazorpayTransport;

  // 3. Call Razorpay Orders API
  let rzpRes: RazorpayHttpResponse;
  try {
    rzpRes = await transportFn({
      method: 'POST',
      path: '/orders',
      keyId: creds.keyId,
      keySecret: creds.keySecret,
      body: {
        amount: pricing.item.amountPaise,
        currency: 'INR',
        receipt: transactionId,
        notes: {
          transactionId,
          customerId: params.customer.id,
          customerMobile: params.customer.mobile,
          itemType: pricing.item.itemType,
          itemReferenceId: pricing.item.itemReferenceId,
          productName: pricing.item.productName.slice(0, 120),
        },
      },
    });
  } catch (err: any) {
    return {
      ok: false,
      statusCode: 424,
      errorCode: 'RAZORPAY_NETWORK_ERROR',
      error: `Unable to contact Razorpay gateway: ${err?.message || 'Network error'}`,
    };
  }

  if (!rzpRes.ok || !rzpRes.data?.id) {
    return {
      ok: false,
      statusCode: 424,
      errorCode: 'RAZORPAY_ORDER_CREATION_FAILED',
      error:
        rzpRes.data?.error?.description ||
        `Razorpay rejected order creation (HTTP ${rzpRes.status}). Check your ${mode.toUpperCase()} API keys.`,
    };
  }

  // Verify returned amount matches server-calculated amount
  const returnedAmount = Number(rzpRes.data.amount);
  if (returnedAmount !== pricing.item.amountPaise) {
    return {
      ok: false,
      statusCode: 500,
      errorCode: 'RAZORPAY_AMOUNT_MISMATCH',
      error: 'Order amount verification failed with payment gateway.',
    };
  }

  const nowIso = new Date(nowMs).toISOString();
  const db = getDb();
  if (!Array.isArray(db.payments)) db.payments = [];

  const paymentRecord: PaymentTransaction = {
    id: `pay-${nowMs}-${crypto.randomBytes(5).toString('hex')}`,
    transactionId,
    mode,
    status: 'pending',
    itemType: pricing.item.itemType,
    itemReferenceId: pricing.item.itemReferenceId,
    productName: pricing.item.productName,
    productDescription: pricing.item.productDescription,
    amountInr: pricing.item.amountInr,
    amountPaise: pricing.item.amountPaise,
    currency: 'INR',
    customerId: params.customer.id,
    customerName: params.customer.name,
    customerMobile: params.customer.mobile,
    customerEmail: params.customer.email,
    customerCity: params.customer.city,
    razorpayOrderId: String(rzpRes.data.id),
    razorpaySignatureVerified: false,
    fulfillmentApplied: false,
    creditsAwarded: pricing.item.creditsToAward,
    pricingSnapshot: pricing.item.pricingSnapshot,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.payments.unshift(paymentRecord);
  saveDb(db);

  const settings = db.paymentSettings;

  return {
    ok: true,
    statusCode: 201,
    order: {
      transactionId: paymentRecord.transactionId,
      razorpayOrderId: paymentRecord.razorpayOrderId,
      amountPaise: paymentRecord.amountPaise,
      amountInr: paymentRecord.amountInr,
      currency: 'INR',
      keyId: creds.keyId, // Public Key ID only
      mode,
      productName: paymentRecord.productName,
      productDescription: paymentRecord.productDescription,
      brandName: settings?.checkoutBrandName || db.settings?.businessName || 'WindowCut Pro',
      themeColor: settings?.checkoutThemeColor || '#0B5ED7',
      prefill: {
        name: params.customer.name,
        contact: `+91${params.customer.mobile}`,
        email: params.customer.email || '',
      },
    },
    payment: paymentRecord,
  };
}

/**
 * Applies post-payment fulfillment idempotently (e.g. crediting AI Wood Scan credits once,
 * updating quotation status if applicable) and issues a unique receipt number.
 */
function finalizeVerifiedPaymentRecord(
  payment: PaymentTransaction,
  details: {
    razorpayPaymentId: string;
    paymentMethod?: string;
    viaWebhook?: boolean;
  }
): { payment: PaymentTransaction; updatedCredits?: number } {
  const db = getDb();
  const nowIso = new Date().toISOString();

  payment.razorpayPaymentId = details.razorpayPaymentId;
  payment.razorpaySignatureVerified = true;
  if (details.viaWebhook) {
    payment.webhookVerified = true;
  }
  if (details.paymentMethod) {
    payment.paymentMethod = details.paymentMethod;
  }
  payment.status = 'paid';
  payment.paidAt = payment.paidAt || nowIso;
  payment.updatedAt = nowIso;
  payment.failureReason = undefined;
  payment.failureCode = undefined;

  if (!payment.receiptNumber) {
    payment.receiptNumber = generateNextReceiptNumber(db.payments || []);
  }

  let updatedCredits: number | undefined;

  // Idempotent fulfillment: NEVER double-credit on duplicate verify or webhook
  if (!payment.fulfillmentApplied) {
    if (payment.itemType === 'credit_pack' && payment.creditsAwarded && payment.creditsAwarded > 0) {
      const customer = (db.customerUsers || []).find(
        u =>
          u.id === payment.customerId ||
          normalizeIndianMobile(u.mobile) === normalizeIndianMobile(payment.customerMobile)
      );
      if (customer) {
        customer.woodScanCredits = (Number(customer.woodScanCredits) || 0) + payment.creditsAwarded;
        customer.updatedAt = nowIso;
        updatedCredits = customer.woodScanCredits;
      }
    } else if (payment.itemType === 'quotation' && payment.itemReferenceId) {
      const quote = (db.quotes || []).find(q => q.id === payment.itemReferenceId);
      if (quote) {
        quote.status = 'converted';
      }
    }
    payment.fulfillmentApplied = true;
  } else if (payment.itemType === 'credit_pack') {
    const customer = (db.customerUsers || []).find(u => u.id === payment.customerId);
    if (customer) {
      updatedCredits = customer.woodScanCredits;
    }
  }

  saveDb(db);
  return { payment, updatedCredits };
}

/**
 * Verifies Razorpay Checkout signature on the backend before marking a payment as paid.
 * Prevents tampering, invalid signatures, cross-user hijacking, and duplicate processing.
 */
export async function verifyCheckoutPayment(params: {
  customer: CustomerAccount;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  transport?: RazorpayTransportFn;
  overrideKeySecret?: string;
}) {
  const orderId = String(params.razorpayOrderId || '').trim();
  const paymentId = String(params.razorpayPaymentId || '').trim();
  const signature = String(params.razorpaySignature || '').trim();

  if (!orderId || !paymentId || !signature) {
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'MISSING_VERIFICATION_FIELDS',
      error: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required.',
    };
  }

  const db = getDb();
  if (!Array.isArray(db.payments)) db.payments = [];

  const payment = db.payments.find(p => p.razorpayOrderId === orderId);
  if (!payment) {
    return {
      ok: false,
      statusCode: 404,
      errorCode: 'PAYMENT_ORDER_NOT_FOUND',
      error: 'Payment order not found.',
    };
  }

  // Ownership check
  if (
    payment.customerId !== params.customer.id &&
    normalizeIndianMobile(payment.customerMobile) !== normalizeIndianMobile(params.customer.mobile)
  ) {
    return {
      ok: false,
      statusCode: 403,
      errorCode: 'PAYMENT_OWNERSHIP_MISMATCH',
      error: 'You are not authorized to verify this payment order.',
    };
  }

  // Prevent replay of same paymentId on a different order
  const duplicateOther = db.payments.find(
    p => p.razorpayPaymentId === paymentId && p.id !== payment.id
  );
  if (duplicateOther) {
    return {
      ok: false,
      statusCode: 409,
      errorCode: 'DUPLICATE_PAYMENT_ID',
      error: 'This Razorpay payment ID has already been processed for another order.',
    };
  }

  // Idempotent return if already verified with the exact same paymentId
  if (payment.status === 'paid' && payment.razorpayPaymentId === paymentId && payment.razorpaySignatureVerified) {
    const customer = (db.customerUsers || []).find(u => u.id === payment.customerId);
    return {
      ok: true,
      statusCode: 200,
      alreadyVerified: true,
      payment,
      updatedCredits: customer?.woodScanCredits,
    };
  }

  const creds = getRazorpayCredentials(payment.mode);
  const keySecret = params.overrideKeySecret || creds.keySecret;
  if (!keySecret) {
    return {
      ok: false,
      statusCode: 424,
      errorCode: 'RAZORPAY_NOT_CONFIGURED',
      error: `Razorpay ${payment.mode.toUpperCase()} key secret is not configured on the server.`,
    };
  }

  const isValidSignature = verifyRazorpayCheckoutSignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    keySecret,
  });

  if (!isValidSignature) {
    payment.status = 'failed';
    payment.failureCode = 'INVALID_SIGNATURE';
    payment.failureReason = 'Razorpay payment signature verification failed on the server.';
    payment.updatedAt = new Date().toISOString();
    saveDb(db);
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'INVALID_PAYMENT_SIGNATURE',
      error: 'Payment signature verification failed. Payment was NOT marked as successful.',
      payment,
    };
  }

  // Optional live confirmation with Razorpay Payment Fetch API to verify captured/authorized status & exact amount
  let paymentMethod: string | undefined;
  const transportFn = params.transport || (creds.configured ? defaultRazorpayTransport : undefined);
  if (transportFn && (creds.keyId || params.overrideKeySecret)) {
    try {
      const fetchRes = await transportFn({
        method: 'GET',
        path: `/payments/${encodeURIComponent(paymentId)}`,
        keyId: creds.keyId || 'rzp_test_verify',
        keySecret,
      });
      if (fetchRes.ok && fetchRes.data) {
        const gwAmount = Number(fetchRes.data.amount);
        const gwCurrency = String(fetchRes.data.currency || '').toUpperCase();
        const gwStatus = String(fetchRes.data.status || '').toLowerCase();
        if (Number.isFinite(gwAmount) && gwAmount !== payment.amountPaise) {
          payment.status = 'failed';
          payment.failureCode = 'AMOUNT_MISMATCH';
          payment.failureReason = 'Paid amount does not match server-calculated order amount.';
          payment.updatedAt = new Date().toISOString();
          saveDb(db);
          return {
            ok: false,
            statusCode: 400,
            errorCode: 'PAYMENT_AMOUNT_MISMATCH',
            error: 'Paid amount mismatch detected.',
            payment,
          };
        }
        if (gwCurrency && gwCurrency !== 'INR') {
          payment.status = 'failed';
          payment.failureCode = 'CURRENCY_MISMATCH';
          payment.failureReason = 'Unexpected currency returned by gateway.';
          payment.updatedAt = new Date().toISOString();
          saveDb(db);
          return {
            ok: false,
            statusCode: 400,
            errorCode: 'PAYMENT_CURRENCY_MISMATCH',
            error: 'Unexpected payment currency.',
            payment,
          };
        }
        if (gwStatus === 'failed') {
          payment.status = 'failed';
          payment.failureCode = fetchRes.data.error_code || 'GATEWAY_FAILED';
          payment.failureReason = fetchRes.data.error_description || 'Payment failed at gateway.';
          payment.updatedAt = new Date().toISOString();
          saveDb(db);
          return {
            ok: false,
            statusCode: 400,
            errorCode: 'PAYMENT_FAILED_AT_GATEWAY',
            error: payment.failureReason,
            payment,
          };
        }
        if (fetchRes.data.method) {
          paymentMethod = String(fetchRes.data.method);
        }
      }
    } catch {
      // If cryptographic HMAC signature already matched and gateway fetch had transient network blip,
      // proceed using verified HMAC signature; webhook will also reconcile.
    }
  }

  const finalized = finalizeVerifiedPaymentRecord(payment, {
    razorpayPaymentId: paymentId,
    paymentMethod,
  });

  return {
    ok: true,
    statusCode: 200,
    alreadyVerified: false,
    payment: finalized.payment,
    updatedCredits: finalized.updatedCredits,
  };
}

/**
 * Allows customer checkout UI to record ONLY non-success terminal states ('cancelled' or 'failed')
 * when checkout is dismissed or fails before signature verification.
 * NEVER permits setting status to 'paid' or 'refunded'.
 */
export function recordClientFailureOrCancel(params: {
  customer: CustomerAccount;
  razorpayOrderId: string;
  status: 'cancelled' | 'failed';
  reason?: string;
  errorCode?: string;
}) {
  if (params.status !== 'cancelled' && params.status !== 'failed') {
    return {
      ok: false,
      statusCode: 400,
      error: 'Only "cancelled" or "failed" status can be recorded from checkout dismissal.',
    };
  }

  const db = getDb();
  if (!Array.isArray(db.payments)) db.payments = [];

  const payment = db.payments.find(p => p.razorpayOrderId === params.razorpayOrderId);
  if (!payment) {
    return { ok: false, statusCode: 404, error: 'Payment order not found.' };
  }

  if (
    payment.customerId !== params.customer.id &&
    normalizeIndianMobile(payment.customerMobile) !== normalizeIndianMobile(params.customer.mobile)
  ) {
    return { ok: false, statusCode: 403, error: 'Not authorized to update this payment order.' };
  }

  // Never downgrade an already verified paid transaction!
  if (payment.status === 'paid') {
    return { ok: true, statusCode: 200, payment };
  }

  payment.status = params.status;
  payment.failureCode = params.errorCode ? String(params.errorCode).slice(0, 80) : params.status.toUpperCase();
  payment.failureReason = params.reason
    ? String(params.reason).slice(0, 240)
    : params.status === 'cancelled'
    ? 'Customer closed Razorpay checkout before completing payment.'
    : 'Payment failed during checkout.';
  payment.updatedAt = new Date().toISOString();
  saveDb(db);

  return { ok: true, statusCode: 200, payment };
}

/**
 * Processes Razorpay server-to-server webhooks with strict HMAC-SHA256 verification
 * and duplicate-event idempotency.
 */
export function processRazorpayWebhook(params: {
  rawBody: Buffer | string;
  parsedBody: any;
  signatureHeader: string;
  eventIdHeader?: string;
  overrideWebhookSecret?: string;
}) {
  const mode = getActiveRazorpayMode();
  const webhookSecret =
    params.overrideWebhookSecret ||
    getRazorpayCredentials(mode).webhookSecret ||
    getEnv('RAZORPAY_WEBHOOK_SECRET');

  if (!webhookSecret) {
    return {
      ok: false,
      statusCode: 424,
      errorCode: 'WEBHOOK_SECRET_NOT_CONFIGURED',
      error: 'RAZORPAY_WEBHOOK_SECRET is not configured on the server.',
    };
  }

  if (
    !verifyRazorpayWebhookSignature({
      rawBody: params.rawBody,
      signatureHeader: params.signatureHeader,
      webhookSecret,
    })
  ) {
    return {
      ok: false,
      statusCode: 400,
      errorCode: 'INVALID_WEBHOOK_SIGNATURE',
      error: 'Invalid X-Razorpay-Signature header.',
    };
  }

  const eventType = String(params.parsedBody?.event || '').trim();
  const paymentEntity = params.parsedBody?.payload?.payment?.entity || {};
  const orderEntity = params.parsedBody?.payload?.order?.entity || {};
  const refundEntity = params.parsedBody?.payload?.refund?.entity || {};

  const razorpayOrderId = String(paymentEntity.order_id || orderEntity.id || '').trim();
  const razorpayPaymentId = String(paymentEntity.id || refundEntity.payment_id || '').trim();

  const dedupKey =
    (params.eventIdHeader && String(params.eventIdHeader).trim()) ||
    `${eventType}:${razorpayOrderId || 'no_order'}:${razorpayPaymentId || 'no_pay'}:${params.parsedBody?.created_at || ''}`;

  const db = getDb();
  if (!Array.isArray(db.paymentWebhookEvents)) db.paymentWebhookEvents = [];
  if (!Array.isArray(db.payments)) db.payments = [];

  // Duplicate webhook idempotency check
  const alreadyProcessed = db.paymentWebhookEvents.find(ev => ev.eventId === dedupKey);
  if (alreadyProcessed) {
    return {
      ok: true,
      statusCode: 200,
      duplicate: true,
      eventType,
      eventId: dedupKey,
    };
  }

  let matchedPayment = razorpayOrderId
    ? db.payments.find(p => p.razorpayOrderId === razorpayOrderId)
    : undefined;
  if (!matchedPayment && razorpayPaymentId) {
    matchedPayment = db.payments.find(p => p.razorpayPaymentId === razorpayPaymentId);
  }

  if (matchedPayment) {
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const gwAmount = Number(paymentEntity.amount ?? orderEntity.amount_paid ?? matchedPayment.amountPaise);
      if (gwAmount === matchedPayment.amountPaise) {
        finalizeVerifiedPaymentRecord(matchedPayment, {
          razorpayPaymentId: razorpayPaymentId || matchedPayment.razorpayPaymentId || `wh_${Date.now()}`,
          paymentMethod: paymentEntity.method ? String(paymentEntity.method) : matchedPayment.paymentMethod,
          viaWebhook: true,
        });
      }
    } else if (eventType === 'payment.failed') {
      if (matchedPayment.status !== 'paid') {
        matchedPayment.status = 'failed';
        matchedPayment.razorpayPaymentId = razorpayPaymentId || matchedPayment.razorpayPaymentId;
        matchedPayment.failureCode = paymentEntity.error_code || 'PAYMENT_FAILED';
        matchedPayment.failureReason =
          paymentEntity.error_description || paymentEntity.error_reason || 'Payment failed (webhook notification).';
        matchedPayment.webhookVerified = true;
        matchedPayment.updatedAt = new Date().toISOString();
      }
    } else if (eventType === 'refund.processed') {
      matchedPayment.status = 'refunded';
      matchedPayment.webhookVerified = true;
      matchedPayment.updatedAt = new Date().toISOString();
    }
  }

  db.paymentWebhookEvents.unshift({
    id: `wh-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    eventId: dedupKey,
    eventType,
    razorpayOrderId: razorpayOrderId || undefined,
    razorpayPaymentId: razorpayPaymentId || undefined,
    mode: matchedPayment?.mode || mode,
    processedAt: new Date().toISOString(),
  });
  if (db.paymentWebhookEvents.length > 1000) {
    db.paymentWebhookEvents = db.paymentWebhookEvents.slice(0, 1000);
  }

  saveDb(db);

  return {
    ok: true,
    statusCode: 200,
    duplicate: false,
    eventType,
    eventId: dedupKey,
    paymentUpdated: Boolean(matchedPayment),
    paymentStatus: matchedPayment?.status,
  };
}

/**
 * Admin: Query & filter payments with KPI summary
 */
export function queryAdminPayments(filters: {
  search?: string;
  status?: string;
  mode?: string;
}) {
  const db = getDb();
  const all = [...(db.payments || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const search = String(filters.search || '').trim().toLowerCase();
  const statusFilter = String(filters.status || 'all').trim().toLowerCase();
  const modeFilter = String(filters.mode || 'all').trim().toLowerCase();

  const filtered = all.filter(p => {
    if (statusFilter && statusFilter !== 'all' && p.status !== statusFilter) {
      return false;
    }
    if (modeFilter && modeFilter !== 'all' && p.mode !== modeFilter) {
      return false;
    }
    if (search) {
      const hay = [
        p.transactionId,
        p.receiptNumber || '',
        p.razorpayOrderId,
        p.razorpayPaymentId || '',
        p.customerMobile,
        p.customerName,
        p.productName,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const paidList = all.filter(p => p.status === 'paid');
  const summary = {
    totalTransactions: all.length,
    totalRevenueInr: paidList.reduce((acc, p) => acc + (Number(p.amountInr) || 0), 0),
    paidCount: paidList.length,
    pendingCount: all.filter(p => p.status === 'pending').length,
    failedCount: all.filter(p => p.status === 'failed').length,
    cancelledCount: all.filter(p => p.status === 'cancelled').length,
    refundedCount: all.filter(p => p.status === 'refunded').length,
  };

  return { payments: filtered, summary };
}

/**
 * Admin: Live Razorpay transaction status check & reconciliation
 */
export async function syncRazorpayTransactionStatus(
  paymentIdOrTxnId: string,
  transport?: RazorpayTransportFn
) {
  const db = getDb();
  const payment = (db.payments || []).find(
    p => p.id === paymentIdOrTxnId || p.transactionId === paymentIdOrTxnId || p.razorpayOrderId === paymentIdOrTxnId
  );
  if (!payment) {
    return { ok: false, statusCode: 404, error: 'Payment transaction not found.' };
  }

  const creds = getRazorpayCredentials(payment.mode);
  if (!creds.configured) {
    return {
      ok: false,
      statusCode: 424,
      errorCode: 'RAZORPAY_NOT_CONFIGURED',
      error: `Cannot check Razorpay status because ${payment.mode.toUpperCase()} credentials (${creds.missingEnvVars.join(', ')}) are not configured.`,
    };
  }

  const transportFn = transport || defaultRazorpayTransport;
  try {
    const res = await transportFn({
      method: 'GET',
      path: `/orders/${encodeURIComponent(payment.razorpayOrderId)}/payments`,
      keyId: creds.keyId,
      keySecret: creds.keySecret,
    });

    if (!res.ok) {
      return {
        ok: false,
        statusCode: 424,
        error: res.data?.error?.description || `Razorpay status check failed (HTTP ${res.status}).`,
      };
    }

    const items: any[] = Array.isArray(res.data?.items) ? res.data.items : [];
    const captured = items.find(i => i.status === 'captured' || i.status === 'authorized');
    const failed = items.find(i => i.status === 'failed');

    if (captured && Number(captured.amount) === payment.amountPaise) {
      finalizeVerifiedPaymentRecord(payment, {
        razorpayPaymentId: String(captured.id),
        paymentMethod: captured.method ? String(captured.method) : undefined,
      });
    } else if (failed && payment.status === 'pending') {
      payment.status = 'failed';
      payment.razorpayPaymentId = String(failed.id);
      payment.failureCode = failed.error_code || 'GATEWAY_FAILED';
      payment.failureReason = failed.error_description || 'Payment failed at Razorpay.';
      payment.updatedAt = new Date().toISOString();
      saveDb(db);
    }

    return {
      ok: true,
      statusCode: 200,
      payment,
      gatewayPaymentsCount: items.length,
      gatewayLatestStatus: captured?.status || failed?.status || items[0]?.status || 'created',
    };
  } catch (err: any) {
    return {
      ok: false,
      statusCode: 424,
      error: `Failed to reach Razorpay API: ${err?.message || 'Network error'}`,
    };
  }
}

/**
 * Escapes CSV cell values safely (prevents CSV/spreadsheet formula injection).
 */
function csvSafeCell(value: unknown): string {
  let str = String(value ?? '').replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportPaymentsToCsv(payments: PaymentTransaction[]): string {
  const headers = [
    'Transaction ID',
    'Receipt Number',
    'Date',
    'Mode',
    'Status',
    'Customer Name',
    'Customer Mobile',
    'Product / Package',
    'Item Type',
    'Amount (INR)',
    'Payment Method',
    'Razorpay Order ID',
    'Razorpay Payment ID',
    'Signature Verified',
    'Failure Reason',
  ];

  const rows = payments.map(p => [
    p.transactionId,
    p.receiptNumber || '',
    p.paidAt || p.createdAt,
    p.mode.toUpperCase(),
    p.status.toUpperCase(),
    p.customerName,
    `+91 ${p.customerMobile}`,
    p.productName,
    p.itemType,
    p.amountInr,
    p.paymentMethod || '',
    p.razorpayOrderId,
    p.razorpayPaymentId || '',
    p.razorpaySignatureVerified ? 'YES' : 'NO',
    p.failureReason || '',
  ]);

  return [headers, ...rows].map(row => row.map(csvSafeCell).join(',')).join('\n');
}
