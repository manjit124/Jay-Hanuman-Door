import {
  getAdminToken,
  getApiBaseUrl,
  getCustomerMemoryToken,
  setCustomerMemoryToken,
} from './api.ts';
import type {
  CalculationInput,
  CustomerAccount,
  PaymentItemType,
  PaymentTransaction,
  PremiumEntitlementSummary,
  Quotation,
  RazorpayMode,
} from '../types.ts';

export { setCustomerMemoryToken, getCustomerMemoryToken };

function resolveUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

function customerHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getCustomerMemoryToken();
  if (token) {
    headers['X-Customer-Token'] = token;
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function adminHeaders(includeJson = true): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected server response (HTTP ${res.status}).`);
  }
}

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  productName: string;
  category?: string;
  woodType?: string;
  quantity: number;
  totalAmount: number;
  advancePaid?: number;
  status: string;
  deliveryStatusText?: string;
  createdAt: string;
}

export interface CustomerSessionPayload {
  authenticated: boolean;
  customer: CustomerAccount;
  entitlement?: PremiumEntitlementSummary;
  payments: PaymentTransaction[];
  quotes: Quotation[];
  orders: CustomerOrderSummary[];
  isNewUser?: boolean;
}

export interface SmsProviderStatusResponse {
  provider: 'apitxt';
  configured: boolean;
  hasApiKey: boolean;
  missingEnvVars: string[];
  setupMessage: string;
}

export async function fetchSmsProviderStatus(): Promise<SmsProviderStatusResponse> {
  const res = await fetch(resolveUrl('/api/customer-auth/provider-status'), {
    credentials: 'include',
    headers: customerHeaders(false),
  });
  return parseJsonSafe(res);
}

export async function sendCustomerOtp(mobile: string): Promise<{
  success: boolean;
  message?: string;
  maskedMobile?: string;
  resendAfterSeconds?: number;
  expiresInSeconds?: number;
  isExistingAccount?: boolean;
  error?: string;
  errorCode?: string;
  missingEnvVars?: string[];
}> {
  const res = await fetch(resolveUrl('/api/customer-auth/send-otp'), {
    method: 'POST',
    credentials: 'include',
    headers: customerHeaders(true),
    body: JSON.stringify({ mobile }),
  });
  return parseJsonSafe(res);
}

export async function verifyCustomerOtp(params: {
  mobile: string;
  otp: string;
  name?: string;
}): Promise<{
  success: boolean;
  isNewUser?: boolean;
  token?: string;
  customer?: CustomerAccount;
  entitlement?: PremiumEntitlementSummary;
  payments?: PaymentTransaction[];
  quotes?: Quotation[];
  orders?: CustomerOrderSummary[];
  error?: string;
  errorCode?: string;
  attemptsRemaining?: number;
}> {
  const res = await fetch(resolveUrl('/api/customer-auth/verify-otp'), {
    method: 'POST',
    credentials: 'include',
    headers: customerHeaders(true),
    body: JSON.stringify(params),
  });
  const data = await parseJsonSafe(res);
  if (data?.success && data?.token) {
    setCustomerMemoryToken(data.token);
  }
  return data;
}

export async function fetchCurrentCustomerSession(): Promise<CustomerSessionPayload | null> {
  try {
    const res = await fetch(resolveUrl('/api/customer-auth/me'), {
      credentials: 'include',
      headers: customerHeaders(false),
    });
    if (!res.ok) return null;
    const data = await parseJsonSafe(res);
    if (!data?.success || !data?.customer) return null;
    return {
      authenticated: true,
      customer: data.customer,
      entitlement: data.entitlement,
      payments: Array.isArray(data.payments) ? data.payments : [],
      quotes: Array.isArray(data.quotes) ? data.quotes : [],
      orders: Array.isArray(data.orders) ? data.orders : [],
    };
  } catch {
    return null;
  }
}

export async function updateCustomerAccountProfile(updates: {
  name?: string;
  email?: string;
  city?: string;
  address?: string;
}): Promise<{ success: boolean; customer?: CustomerAccount; error?: string }> {
  const res = await fetch(resolveUrl('/api/customer-auth/profile'), {
    method: 'PUT',
    credentials: 'include',
    headers: customerHeaders(true),
    body: JSON.stringify(updates),
  });
  return parseJsonSafe(res);
}

export async function logoutCustomerSession(): Promise<void> {
  try {
    await fetch(resolveUrl('/api/customer-auth/logout'), {
      method: 'POST',
      credentials: 'include',
      headers: customerHeaders(true),
      body: JSON.stringify({}),
    });
  } finally {
    setCustomerMemoryToken(null);
  }
}

// ==========================================
// RAZORPAY CHECKOUT & PAYMENT API
// ==========================================

export interface PublicPaymentConfig {
  configured: boolean;
  mode: RazorpayMode;
  keyId: string;
  currency: 'INR';
  checkoutBrandName: string;
  checkoutDescription: string;
  checkoutThemeColor: string;
  missingEnvVars: string[];
}

export async function fetchPublicPaymentConfig(): Promise<PublicPaymentConfig> {
  const res = await fetch(resolveUrl('/api/payments/config'), {
    credentials: 'include',
    headers: customerHeaders(false),
  });
  return parseJsonSafe(res);
}

export interface CreateOrderRequestPayload {
  itemType: PaymentItemType;
  packId?: string;
  quoteId?: string;
  calculationInput?: CalculationInput;
  chaukhatInput?: Record<string, any>;
}

export async function createPaymentOrder(payload: CreateOrderRequestPayload): Promise<{
  success: boolean;
  order?: {
    transactionId: string;
    razorpayOrderId: string;
    amountPaise: number;
    amountInr: number;
    currency: 'INR';
    keyId: string;
    mode: RazorpayMode;
    productName: string;
    productDescription?: string;
    brandName: string;
    themeColor: string;
    prefill: { name: string; contact: string; email: string };
  };
  payment?: PaymentTransaction;
  error?: string;
  errorCode?: string;
  missingEnvVars?: string[];
}> {
  const res = await fetch(resolveUrl('/api/payments/create-order'), {
    method: 'POST',
    credentials: 'include',
    headers: customerHeaders(true),
    body: JSON.stringify(payload),
  });
  return parseJsonSafe(res);
}

export async function verifyRazorpayPaymentApi(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{
  success: boolean;
  payment?: PaymentTransaction;
  updatedCredits?: number;
  error?: string;
  errorCode?: string;
}> {
  const res = await fetch(resolveUrl('/api/payments/verify'), {
    method: 'POST',
    credentials: 'include',
    headers: customerHeaders(true),
    body: JSON.stringify(payload),
  });
  return parseJsonSafe(res);
}

export async function markRazorpayPaymentFailedOrCancelled(payload: {
  razorpay_order_id: string;
  status: 'cancelled' | 'failed';
  reason?: string;
  errorCode?: string;
}): Promise<{ success: boolean; payment?: PaymentTransaction; error?: string }> {
  const res = await fetch(resolveUrl('/api/payments/mark-status'), {
    method: 'POST',
    credentials: 'include',
    headers: customerHeaders(true),
    body: JSON.stringify(payload),
  });
  return parseJsonSafe(res);
}

export async function fetchCustomerPaymentHistory(): Promise<{
  success: boolean;
  payments: PaymentTransaction[];
  quotes: Quotation[];
  orders: CustomerOrderSummary[];
  woodScanCredits?: number;
}> {
  const res = await fetch(resolveUrl('/api/payments/my-history'), {
    credentials: 'include',
    headers: customerHeaders(false),
  });
  return parseJsonSafe(res);
}

/**
 * Dynamically loads Razorpay's official Checkout script once.
 */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean((window as any).Razorpay)));
      existing.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(Boolean((window as any).Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export interface RazorpayFlowResult {
  outcome: 'paid' | 'failed' | 'cancelled' | 'auth_required' | 'config_required' | 'error';
  payment?: PaymentTransaction;
  updatedCredits?: number;
  message: string;
  missingEnvVars?: string[];
}

/**
 * End-to-end Razorpay Checkout orchestrator:
 * 1. Calls backend /api/payments/create-order (server verifies exact existing price).
 * 2. Loads Razorpay Checkout JS and opens Razorpay checkout sheet.
 * 3. Sends Razorpay response to backend /api/payments/verify for HMAC-SHA256 signature validation.
 * 4. Records cancelled/failed attempts honestly (never marks paid on frontend alone).
 */
export async function startRazorpayCheckoutFlow(
  payload: CreateOrderRequestPayload
): Promise<RazorpayFlowResult> {
  const orderRes = await createPaymentOrder(payload);

  if (!orderRes.success || !orderRes.order) {
    if (orderRes.errorCode === 'CUSTOMER_AUTH_REQUIRED' || orderRes.errorCode === 'CUSTOMER_SESSION_EXPIRED') {
      return {
        outcome: 'auth_required',
        message: orderRes.error || 'Please sign in with your mobile number (OTP) before paying online.',
      };
    }
    if (orderRes.errorCode === 'RAZORPAY_NOT_CONFIGURED') {
      return {
        outcome: 'config_required',
        message: orderRes.error || 'Razorpay keys are not configured on the server yet.',
        missingEnvVars: orderRes.missingEnvVars,
      };
    }
    return {
      outcome: 'error',
      message: orderRes.error || 'Unable to start Razorpay checkout.',
    };
  }

  const loaded = await loadRazorpayCheckoutScript();
  if (!loaded || !(window as any).Razorpay) {
    return {
      outcome: 'error',
      payment: orderRes.payment,
      message: 'Could not load Razorpay Checkout script. Please check your internet connection.',
    };
  }

  const ord = orderRes.order;

  return new Promise<RazorpayFlowResult>((resolve) => {
    let settled = false;

    const rzp = new (window as any).Razorpay({
      key: ord.keyId,
      amount: ord.amountPaise,
      currency: ord.currency,
      name: ord.brandName,
      description: ord.productName,
      order_id: ord.razorpayOrderId,
      prefill: ord.prefill,
      notes: {
        transactionId: ord.transactionId,
      },
      theme: {
        color: ord.themeColor || '#C89211',
      },
      modal: {
        ondismiss: async () => {
          if (settled) return;
          settled = true;
          const marked = await markRazorpayPaymentFailedOrCancelled({
            razorpay_order_id: ord.razorpayOrderId,
            status: 'cancelled',
            reason: 'Customer closed Razorpay checkout before completing payment.',
          }).catch(() => null);
          resolve({
            outcome: 'cancelled',
            payment: marked?.payment || orderRes.payment,
            message: 'Payment was cancelled before completion.',
          });
        },
      },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        if (settled) return;
        settled = true;
        try {
          const verified = await verifyRazorpayPaymentApi({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (verified.success && verified.payment) {
            resolve({
              outcome: 'paid',
              payment: verified.payment,
              updatedCredits: verified.updatedCredits,
              message: 'Payment verified successfully.',
            });
          } else {
            resolve({
              outcome: 'failed',
              payment: verified.payment || orderRes.payment,
              message: verified.error || 'Payment signature verification failed.',
            });
          }
        } catch (err: any) {
          resolve({
            outcome: 'failed',
            payment: orderRes.payment,
            message: err?.message || 'Could not verify payment with server.',
          });
        }
      },
    });

    rzp.on('payment.failed', async (failRes: any) => {
      if (settled) return;
      settled = true;
      const errDesc = failRes?.error?.description || 'Payment failed at gateway.';
      const errCode = failRes?.error?.code || 'PAYMENT_FAILED';
      const marked = await markRazorpayPaymentFailedOrCancelled({
        razorpay_order_id: ord.razorpayOrderId,
        status: 'failed',
        reason: errDesc,
        errorCode: errCode,
      }).catch(() => null);
      resolve({
        outcome: 'failed',
        payment: marked?.payment || orderRes.payment,
        message: errDesc,
      });
    });

    rzp.open();
  });
}

// ==========================================
// ADMIN PANEL PAYMENT MANAGEMENT API
// ==========================================

export interface AdminPaymentsSummary {
  totalTransactions: number;
  totalRevenueInr: number;
  paidCount: number;
  pendingCount: number;
  failedCount: number;
  cancelledCount: number;
  refundedCount: number;
}

export async function fetchAdminPayments(filters: {
  search?: string;
  status?: string;
  mode?: string;
}): Promise<{
  success: boolean;
  payments: PaymentTransaction[];
  summary: AdminPaymentsSummary;
  error?: string;
}> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.mode && filters.mode !== 'all') params.set('mode', filters.mode);

  const res = await fetch(resolveUrl(`/api/admin/payments?${params.toString()}`), {
    credentials: 'include',
    headers: adminHeaders(false),
  });
  return parseJsonSafe(res);
}

export async function checkAdminRazorpayStatus(paymentIdOrTxnId: string): Promise<{
  success: boolean;
  payment?: PaymentTransaction;
  gatewayPaymentsCount?: number;
  gatewayLatestStatus?: string;
  error?: string;
}> {
  const res = await fetch(
    resolveUrl(`/api/admin/payments/${encodeURIComponent(paymentIdOrTxnId)}/check-status`),
    {
      credentials: 'include',
      headers: adminHeaders(false),
    }
  );
  return parseJsonSafe(res);
}

export async function downloadAdminPaymentsCsv(filters: {
  search?: string;
  status?: string;
  mode?: string;
}): Promise<void> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.mode && filters.mode !== 'all') params.set('mode', filters.mode);

  const res = await fetch(resolveUrl(`/api/admin/payments/export?${params.toString()}`), {
    credentials: 'include',
    headers: adminHeaders(false),
  });
  if (!res.ok) {
    throw new Error('Failed to export payment report.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jai-hanuman-door-payments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export interface AdminPaymentSettingsResponse {
  success: boolean;
  paymentSettings: {
    mode: RazorpayMode;
    currency: 'INR';
    checkoutBrandName: string;
    checkoutDescription: string;
    checkoutThemeColor: string;
    updatedAt: string | null;
    credentialsStatus: {
      testModeReady: boolean;
      testKeyIdMasked: string;
      testKeySecretSet: boolean;
      liveModeReady: boolean;
      liveKeyIdMasked: string;
      liveKeySecretSet: boolean;
      webhookSecretSet: boolean;
      activeMissingEnvVars: string[];
    };
    webhookEndpointPath: string;
  };
  smsProvider: SmsProviderStatusResponse;
  error?: string;
}

export async function fetchAdminPaymentSettings(): Promise<AdminPaymentSettingsResponse> {
  const res = await fetch(resolveUrl('/api/admin/payment-settings'), {
    credentials: 'include',
    headers: adminHeaders(false),
  });
  return parseJsonSafe(res);
}

export async function saveAdminPaymentSettings(payload: {
  mode?: RazorpayMode;
  checkoutBrandName?: string;
  checkoutDescription?: string;
  checkoutThemeColor?: string;
}): Promise<{
  success: boolean;
  paymentSettings?: AdminPaymentSettingsResponse['paymentSettings'];
  error?: string;
}> {
  const res = await fetch(resolveUrl('/api/admin/payment-settings'), {
    method: 'PUT',
    credentials: 'include',
    headers: adminHeaders(true),
    body: JSON.stringify(payload),
  });
  return parseJsonSafe(res);
}
