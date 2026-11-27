import type express from 'express';
import {
  CUSTOMER_COOKIE_NAME,
  resolveCustomerFromToken,
} from './otpService.ts';
import {
  evaluateCustomerEntitlement,
  getAdminMonetizationDashboard,
  getPublicMonetizationConfig,
  processGooglePlayRtdnNotification,
  restoreCustomerGooglePlayPurchases,
  updateServerAdMobSettings,
  verifyAndPersistGooglePlayPurchase,
} from './googlePlayBillingService.ts';
import { getDb } from './db.ts';
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

function resolveOptionalCustomer(req: express.Request): CustomerAccount | null {
  const { token } = extractCustomerToken(req);
  if (!token) return null;
  const resolved = resolveCustomerFromToken(token);
  return resolved?.customer || null;
}

function requireCustomerSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const { token, viaCookie } = extractCustomerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      errorCode: 'CUSTOMER_AUTH_REQUIRED',
      error: 'Please sign in with your mobile number (OTP) before subscribing or restoring purchases.',
    });
  }

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  if (viaCookie && isMutation && !isSafeCookieMutation(req)) {
    return res.status(403).json({
      success: false,
      errorCode: 'CSRF_CHECK_FAILED',
      error: 'Invalid request origin for authenticated subscription action.',
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
  next();
}

export function registerMonetizationRoutes(
  app: express.Express,
  deps: {
    verifyAdminToken: express.RequestHandler;
  }
): void {
  // ========================================================================
  // 1. PUBLIC + CUSTOMER MONETIZATION CONFIG & ENTITLEMENT ROUTES
  // ========================================================================

  app.get('/api/monetization/config', (req, res) => {
    try {
      const customer = resolveOptionalCustomer(req);
      const config = getPublicMonetizationConfig(customer?.id || null);
      return res.status(200).json({
        success: true,
        ...config,
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Could not load monetization configuration.',
      });
    }
  });

  app.get('/api/subscriptions/status', (req, res) => {
    try {
      const customer = resolveOptionalCustomer(req);
      if (!customer) {
        return res.status(200).json({
          success: true,
          authenticated: false,
          entitlement: evaluateCustomerEntitlement(null),
          history: [],
        });
      }

      const entitlement = evaluateCustomerEntitlement(customer.id);
      const db = getDb();
      const history = (db.premiumSubscriptions || [])
        .filter(s => s.customerId === customer.id && s.platform === 'android_google_play')
        .map(s => ({
          id: s.id,
          productId: s.productId,
          planName: s.planName,
          priceInr: s.priceInr,
          billingCycle: s.billingCycle,
          status: s.status,
          autoRenewing: s.autoRenewing,
          expiryDate: s.expiryDate,
          lastVerifiedAt: s.lastVerifiedAt,
          orderId: s.orderId,
        }));

      return res.status(200).json({
        success: true,
        authenticated: true,
        entitlement,
        history,
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Could not check subscription status.',
      });
    }
  });

  // Verify a newly completed Google Play subscription purchase on the server
  app.post('/api/subscriptions/google-play/verify', requireCustomerSession, async (req, res) => {
    try {
      const customer = (req as any).customerAccount as CustomerAccount;
      const result = await verifyAndPersistGooglePlayPurchase({
        customer,
        productId: req.body?.productId,
        purchaseToken: req.body?.purchaseToken,
        packageName: req.body?.packageName,
      });

      if (!result.ok) {
        return res.status(result.statusCode).json({
          success: false,
          errorCode: result.errorCode,
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        entitlement: result.entitlement,
        subscription: result.record
          ? {
              id: result.record.id,
              productId: result.record.productId,
              planName: result.record.planName,
              priceInr: result.record.priceInr,
              status: result.record.status,
              expiryDate: result.record.expiryDate,
              autoRenewing: result.record.autoRenewing,
              lastVerifiedAt: result.record.lastVerifiedAt,
            }
          : null,
      });
    } catch {
      return res.status(500).json({
        success: false,
        errorCode: 'SUBSCRIPTION_VERIFY_ERROR',
        error: 'Unable to verify Google Play subscription right now. Please try again shortly.',
      });
    }
  });

  // Restore purchases after reinstall or login on another device
  app.post('/api/subscriptions/google-play/restore', requireCustomerSession, async (req, res) => {
    try {
      const customer = (req as any).customerAccount as CustomerAccount;
      const purchases = Array.isArray(req.body?.purchases) ? req.body.purchases : [];
      const result = await restoreCustomerGooglePlayPurchases({
        customer,
        purchases,
      });

      return res.status(result.statusCode).json({
        success: result.ok,
        restoredCount: result.restoredCount,
        entitlement: result.entitlement,
        warnings: result.warnings,
        message: result.message,
      });
    } catch {
      return res.status(500).json({
        success: false,
        errorCode: 'RESTORE_PURCHASE_ERROR',
        error: 'Unable to restore purchases right now. Please try again shortly.',
      });
    }
  });

  // Google Play Real-Time Developer Notifications (RTDN) Pub/Sub Push Endpoint
  app.post('/api/subscriptions/google-play/rtdn', async (req, res) => {
    try {
      const headerToken =
        typeof req.headers['x-google-play-rtdn-token'] === 'string'
          ? req.headers['x-google-play-rtdn-token']
          : typeof req.query.token === 'string'
          ? req.query.token
          : '';
      const result = await processGooglePlayRtdnNotification({
        providedToken: headerToken,
        body: req.body,
      });

      return res.status(result.statusCode).json({
        received: result.ok,
        message: result.message,
      });
    } catch {
      return res.status(500).json({
        received: false,
        message: 'Failed to process Google Play RTDN notification.',
      });
    }
  });

  // ========================================================================
  // 2. ADMIN PANEL AD MANAGEMENT & SUBSCRIPTION STATISTICS ROUTES
  // ========================================================================

  app.get('/api/admin/monetization', deps.verifyAdminToken, (req, res) => {
    try {
      const dashboard = getAdminMonetizationDashboard({
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        productId: typeof req.query.productId === 'string' ? req.query.productId : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });

      return res.status(200).json({
        success: true,
        ...dashboard,
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Failed to load monetization dashboard data.',
      });
    }
  });

  app.put('/api/admin/monetization/config', deps.verifyAdminToken, (req, res) => {
    try {
      const payload = req.body?.adSettings && typeof req.body.adSettings === 'object'
        ? req.body.adSettings
        : req.body;
      const result = updateServerAdMobSettings(payload || {});
      return res.status(result.statusCode).json({
        success: result.ok,
        error: result.error,
        adSettings: result.adSettings,
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Failed to persist AdMob configuration.',
      });
    }
  });
}
