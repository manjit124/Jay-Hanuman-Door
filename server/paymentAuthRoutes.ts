import type express from 'express';
import { getDb } from './db.ts';
import {
  CUSTOMER_COOKIE_NAME,
  CUSTOMER_SESSION_TTL_MS,
  getCustomerAccountSummary,
  getSmsProviderStatus,
  requestMobileOtp,
  resolveCustomerFromToken,
  revokeCustomerSession,
  updateCustomerProfile,
  verifyMobileOtp,
} from './otpService.ts';
import {
  createRazorpayOrderForCustomer,
  exportPaymentsToCsv,
  getAdminPaymentSettingsSummary,
  getPublicPaymentConfig,
  processRazorpayWebhook,
  queryAdminPayments,
  recordClientFailureOrCancel,
  syncRazorpayTransactionStatus,
  updateAdminPaymentSettings,
  verifyCheckoutPayment,
  type PricingCalculators,
} from './razorpayService.ts';
import { evaluateCustomerEntitlement } from './googlePlayBillingService.ts';
import type { CustomerAccount } from '../src/types.ts';

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function extractCustomerToken(req: express.Request): { token: string | null; viaCookie: boolean } {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith('jhd_cust_')) return { token, viaCookie: false };
  }
  const headerToken = req.headers['x-customer-token'];
  if (typeof headerToken === 'string' && headerToken.startsWith('jhd_cust_')) {
    return { token: headerToken.trim(), viaCookie: false };
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[CUSTOMER_COOKIE_NAME]) {
    return { token: cookies[CUSTOMER_COOKIE_NAME], viaCookie: true };
  }
  return { token: null, viaCookie: false };
}

function isSafeCookieMutation(req: express.Request): boolean {
  // Require custom X-Requested-With header or matching Origin/Host for cookie-authenticated mutations
  if (String(req.headers['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest') {
    return true;
  }
  const origin = String(req.headers.origin || '').trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
    } catch {
      return false;
    }
  }
  return false;
}

function setCustomerSessionCookie(res: express.Response, token: string): void {
  const maxAgeSec = Math.floor(CUSTOMER_SESSION_TTL_MS / 1000);
  // Emit HttpOnly; Secure; SameSite=None; Partitioned so persistent login works in HTTPS iframes & browsers
  res.setHeader(
    'Set-Cookie',
    `${CUSTOMER_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=None; Partitioned`
  );
}

function clearCustomerSessionCookie(res: express.Response): void {
  res.setHeader(
    'Set-Cookie',
    `${CUSTOMER_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
  );
}

export function requireCustomerAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const { token, viaCookie } = extractCustomerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      errorCode: 'CUSTOMER_AUTH_REQUIRED',
      error: 'Please sign in with your mobile number (OTP) to continue.',
    });
  }

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  if (viaCookie && isMutation && !isSafeCookieMutation(req)) {
    return res.status(403).json({
      success: false,
      errorCode: 'CSRF_CHECK_FAILED',
      error: 'Invalid request origin for session-authenticated action.',
    });
  }

  const resolved = resolveCustomerFromToken(token);
  if (!resolved) {
    return res.status(401).json({
      success: false,
      errorCode: 'CUSTOMER_SESSION_EXPIRED',
      error: 'Your session has expired. Please sign in again with OTP.',
    });
  }

  (req as any).customerAccount = resolved.customer;
  (req as any).customerToken = token;
  next();
}

export function registerPaymentAndOtpRoutes(
  app: express.Express,
  deps: {
    verifyAdminToken: express.RequestHandler;
    isValidAdminToken: (token?: string) => boolean;
    calculators: PricingCalculators;
  }
): void {
  // ==========================================
  // 1. CUSTOMER MOBILE OTP AUTHENTICATION ROUTES
  // ==========================================

  app.get('/api/customer-auth/provider-status', (_req, res) => {
    const status = getSmsProviderStatus();
    res.json({
      success: true,
      ...status,
    });
  });

  app.post('/api/customer-auth/send-otp', async (req, res) => {
    try {
      const clientIp =
        String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        'unknown';
      const result = await requestMobileOtp({
        rawMobile: req.body?.mobile,
        clientIp,
      });
      return res.status(result.statusCode).json({
        success: result.ok,
        ...result,
      });
    } catch {
      return res.status(500).json({
        success: false,
        errorCode: 'OTP_SERVICE_ERROR',
        error: 'OTP SMS service is temporarily unavailable. Please try again shortly.',
      });
    }
  });

  app.post('/api/customer-auth/verify-otp', (req, res) => {
    try {
      const clientIp =
        String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        'unknown';
      const result = verifyMobileOtp({
        rawMobile: req.body?.mobile,
        rawOtp: req.body?.otp,
        customerName: req.body?.name,
        clientIp,
        userAgent: req.headers['user-agent'],
      });

      if (!result.ok || !result.token || !result.customer) {
        return res.status(result.statusCode).json({
          success: false,
          errorCode: result.errorCode,
          error: result.error,
          attemptsRemaining: result.attemptsRemaining,
        });
      }

      setCustomerSessionCookie(res, result.token);
      const summary = getCustomerAccountSummary(result.customer);
      return res.status(200).json({
        success: true,
        isNewUser: result.isNewUser,
        token: result.token,
        expiresAt: result.expiresAt,
        ...summary,
      });
    } catch {
      return res.status(500).json({
        success: false,
        errorCode: 'OTP_VERIFY_ERROR',
        error: 'Unable to verify OTP right now. Please try again shortly.',
      });
    }
  });

  app.get('/api/customer-auth/me', (req, res) => {
    const { token } = extractCustomerToken(req);
    const resolved = token ? resolveCustomerFromToken(token) : null;
    if (!resolved) {
      return res.status(200).json({
        success: true,
        authenticated: false,
        customer: null,
        entitlement: evaluateCustomerEntitlement(null),
        payments: [],
        quotes: [],
        orders: [],
      });
    }
    const summary = getCustomerAccountSummary(resolved.customer);
    return res.json({
      success: true,
      authenticated: true,
      ...summary,
    });
  });

  app.put('/api/customer-auth/profile', requireCustomerAuth, (req, res) => {
    const customer = (req as any).customerAccount as CustomerAccount;
    const updated = updateCustomerProfile(customer.id, {
      name: req.body?.name,
      email: req.body?.email,
      city: req.body?.city,
      address: req.body?.address,
    });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Customer account not found.' });
    }
    return res.json({
      success: true,
      customer: updated,
    });
  });

  app.post('/api/customer-auth/logout', (req, res) => {
    const { token } = extractCustomerToken(req);
    if (token) {
      revokeCustomerSession(token);
    }
    clearCustomerSessionCookie(res);
    return res.json({ success: true, message: 'Signed out successfully.' });
  });

  // ==========================================
  // 2. RAZORPAY CUSTOMER PAYMENT ROUTES
  // ==========================================

  app.get('/api/payments/config', (_req, res) => {
    res.json({
      success: true,
      ...getPublicPaymentConfig(),
    });
  });

  app.post('/api/payments/create-order', requireCustomerAuth, async (req, res) => {
    try {
      const customer = (req as any).customerAccount as CustomerAccount;
      // Note: Any req.body.amount is strictly ignored; server calculates price from authoritative DB/config
      const result = await createRazorpayOrderForCustomer({
        customer,
        body: {
          itemType: req.body?.itemType,
          packId: req.body?.packId,
          quoteId: req.body?.quoteId,
          calculationInput: req.body?.calculationInput,
          chaukhatInput: req.body?.chaukhatInput,
        },
        calculators: deps.calculators,
      });

      return res.status(result.statusCode).json({
        success: result.ok,
        ...result,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to create Razorpay payment order.',
      });
    }
  });

  app.post('/api/payments/verify', requireCustomerAuth, async (req, res) => {
    try {
      const customer = (req as any).customerAccount as CustomerAccount;
      const result = await verifyCheckoutPayment({
        customer,
        razorpayOrderId: req.body?.razorpay_order_id,
        razorpayPaymentId: req.body?.razorpay_payment_id,
        razorpaySignature: req.body?.razorpay_signature,
      });
      return res.status(result.statusCode).json({
        success: result.ok,
        ...result,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err?.message || 'Payment verification failed.',
      });
    }
  });

  app.post('/api/payments/mark-status', requireCustomerAuth, (req, res) => {
    const customer = (req as any).customerAccount as CustomerAccount;
    const result = recordClientFailureOrCancel({
      customer,
      razorpayOrderId: String(req.body?.razorpay_order_id || '').trim(),
      status: req.body?.status === 'failed' ? 'failed' : 'cancelled',
      reason: req.body?.reason,
      errorCode: req.body?.errorCode,
    });
    return res.status(result.statusCode).json({
      success: result.ok,
      ...result,
    });
  });

  app.get('/api/payments/my-history', requireCustomerAuth, (req, res) => {
    const customer = (req as any).customerAccount as CustomerAccount;
    const summary = getCustomerAccountSummary(customer);
    return res.json({
      success: true,
      payments: summary.payments,
      quotes: summary.quotes,
      orders: summary.orders,
      woodScanCredits: customer.woodScanCredits,
    });
  });

  app.get('/api/payments/:transactionId/receipt', (req, res) => {
    const txKey = String(req.params.transactionId || '').trim();
    const db = getDb();
    const payment = (db.payments || []).find(
      p => p.transactionId === txKey || p.id === txKey || p.razorpayOrderId === txKey
    );
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment receipt not found.' });
    }

    // Allow either the owning customer OR an authenticated admin
    const adminHeader = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : String(req.headers['x-admin-token'] || '').trim();
    const isAdmin = deps.isValidAdminToken(adminHeader);

    if (!isAdmin) {
      const { token } = extractCustomerToken(req);
      const resolved = resolveCustomerFromToken(token);
      if (!resolved || resolved.customer.id !== payment.customerId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to access this payment receipt.',
        });
      }
    }

    return res.json({
      success: true,
      payment,
      business: {
        name: db.settings?.businessName || 'WindowCut Pro',
        phone: '',
        whatsapp: '',
        email: db.settings?.email || 'support@windowcutpro.com',
        address: '',
      },
    });
  });

  // Razorpay Server-to-Server Webhook (verifies raw body HMAC-SHA256 signature)
  app.post('/api/payments/webhook', (req, res) => {
    try {
      const rawBody: Buffer | string = (req as any).rawBody || JSON.stringify(req.body || {});
      const signatureHeader = String(req.headers['x-razorpay-signature'] || '').trim();
      const eventIdHeader = String(req.headers['x-razorpay-event-id'] || '').trim();

      const result = processRazorpayWebhook({
        rawBody,
        parsedBody: req.body,
        signatureHeader,
        eventIdHeader: eventIdHeader || undefined,
      });

      return res.status(result.statusCode).json({
        received: result.ok,
        ...result,
      });
    } catch (err: any) {
      return res.status(500).json({
        received: false,
        error: err?.message || 'Webhook processing error.',
      });
    }
  });

  // ==========================================
  // 3. ADMIN PANEL PAYMENT MANAGEMENT & SETTINGS
  // ==========================================

  app.get('/api/admin/payments', deps.verifyAdminToken, (req, res) => {
    const result = queryAdminPayments({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      mode: typeof req.query.mode === 'string' ? req.query.mode : undefined,
    });
    return res.json({
      success: true,
      ...result,
    });
  });

  app.get('/api/admin/payments/export', deps.verifyAdminToken, (req, res) => {
    const result = queryAdminPayments({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      mode: typeof req.query.mode === 'string' ? req.query.mode : undefined,
    });
    const csv = exportPaymentsToCsv(result.payments);
    const dateStamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="jai-hanuman-door-payments-${dateStamp}.csv"`
    );
    return res.status(200).send(csv);
  });

  app.get('/api/admin/payments/:id/check-status', deps.verifyAdminToken, async (req, res) => {
    const result = await syncRazorpayTransactionStatus(String(req.params.id || ''));
    return res.status(result.statusCode).json({
      success: result.ok,
      ...result,
    });
  });

  app.get('/api/admin/payment-settings', deps.verifyAdminToken, (_req, res) => {
    return res.json({
      success: true,
      paymentSettings: getAdminPaymentSettingsSummary(),
      smsProvider: getSmsProviderStatus(),
    });
  });

  app.put('/api/admin/payment-settings', deps.verifyAdminToken, (req, res) => {
    const result = updateAdminPaymentSettings({
      mode: req.body?.mode,
      checkoutBrandName: req.body?.checkoutBrandName,
      checkoutDescription: req.body?.checkoutDescription,
      checkoutThemeColor: req.body?.checkoutThemeColor,
    });
    return res.status(result.statusCode).json({
      success: result.ok,
      error: result.error,
      paymentSettings: result.settings,
    });
  });
}
