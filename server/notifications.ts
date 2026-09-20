import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { getDb, saveDb } from './db.ts';
import {
  NotificationTokenRecord,
  NotificationCampaign,
  NotificationPreferences,
  NotificationCategory,
  NotificationTargetAudience,
  NotificationStats,
} from '../src/types.ts';

// Lazy Firebase Admin Initialization Singleton
let firebaseAdminApp: App | null = null;
let fcmInitAttempted = false;
let fcmInitError: string | null = null;

export function getFirebaseAdmin(): App | null {
  if (firebaseAdminApp) return firebaseAdminApp;
  if (getApps().length > 0) {
    firebaseAdminApp = getApps()[0];
    return firebaseAdminApp;
  }
  if (fcmInitAttempted && fcmInitError) return null;

  fcmInitAttempted = true;

  try {
    // 1. Check for complete JSON in FIREBASE_SERVICE_ACCOUNT_KEY
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        firebaseAdminApp = initializeApp({
          credential: cert(serviceAccount),
        });
        console.log('Firebase Admin initialized successfully using FIREBASE_SERVICE_ACCOUNT_KEY');
        return firebaseAdminApp;
      } catch (jsonErr) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', jsonErr);
      }
    }

    // 2. Check for individual environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      // Fix multiline private key formatting if passed as escaped string
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      firebaseAdminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized successfully using FIREBASE credentials');
      return firebaseAdminApp;
    }

    // 3. Check for application default credentials if in GCP environment
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseAdminApp = initializeApp({
        credential: applicationDefault(),
      });
      console.log('Firebase Admin initialized with application default credentials');
      return firebaseAdminApp;
    }

    fcmInitError = 'Firebase Admin credentials not found in environment variables';
    return null;
  } catch (err: any) {
    console.error('Error initializing Firebase Admin SDK:', err);
    fcmInitError = err?.message || 'Failed to initialize Firebase Admin';
    return null;
  }
}

export function isFcmConfigured(): boolean {
  return getFirebaseAdmin() !== null;
}

export function getFcmConfigStatus(): {
  isConfigured: boolean;
  projectId?: string;
  clientEmail?: string;
  reason?: string;
} {
  const app = getFirebaseAdmin();
  if (app) {
    const projectId = process.env.FIREBASE_PROJECT_ID || (app.options.credential as any)?.projectId;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || (app.options.credential as any)?.clientEmail;
    return {
      isConfigured: true,
      projectId: projectId || 'Configured Project',
      clientEmail: clientEmail ? `${clientEmail.substring(0, 8)}...` : 'Service Account',
    };
  }

  return {
    isConfigured: false,
    reason: fcmInitError || 'Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY',
  };
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  newDesigns: true,
  offers: true,
  priceUpdates: true,
  doorTips: true,
  importantUpdates: true,
};

// Register or update device token
export function registerOrUpdateToken(data: {
  token: string;
  userId?: string;
  deviceId: string;
  platform?: 'web' | 'android' | 'ios' | 'pwa';
  browser?: string;
  permission?: 'granted' | 'denied' | 'default';
  preferences?: Partial<NotificationPreferences>;
}): NotificationTokenRecord {
  const db = getDb();
  const now = new Date().toISOString();

  const platform = data.platform || 'web';
  const browser = data.browser || 'Browser';
  const permission = data.permission || 'granted';

  const userPrefs: NotificationPreferences = {
    ...DEFAULT_PREFERENCES,
    ...(data.preferences || {}),
  };

  // Find existing token record
  let existingIndex = db.notificationTokens.findIndex(t => t.token === data.token);

  if (existingIndex >= 0) {
    const existing = db.notificationTokens[existingIndex];
    const updated: NotificationTokenRecord = {
      ...existing,
      userId: data.userId || existing.userId,
      deviceId: data.deviceId || existing.deviceId,
      platform,
      browser,
      permission,
      active: true,
      preferences: {
        ...existing.preferences,
        ...userPrefs,
      },
      updatedAt: now,
      lastUsedAt: now,
    };
    db.notificationTokens[existingIndex] = updated;
    saveDb(db);
    return updated;
  }

  // Also check if same deviceId exists with an old token, mark old inactive
  if (data.deviceId) {
    db.notificationTokens.forEach(t => {
      if (t.deviceId === data.deviceId && t.token !== data.token) {
        t.active = false;
        t.updatedAt = now;
      }
    });
  }

  // Create new record
  const newRecord: NotificationTokenRecord = {
    id: 'tok_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    token: data.token,
    userId: data.userId,
    deviceId: data.deviceId,
    platform,
    browser,
    permission,
    active: true,
    preferences: userPrefs,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
  };

  db.notificationTokens.push(newRecord);
  saveDb(db);
  return newRecord;
}

// Update preferences for a device or user
export function updateTokenPreferences(
  identifier: { deviceId?: string; userId?: string; token?: string },
  preferences: Partial<NotificationPreferences>
): boolean {
  const db = getDb();
  let updatedCount = 0;
  const now = new Date().toISOString();

  db.notificationTokens.forEach(t => {
    let match = false;
    if (identifier.token && t.token === identifier.token) match = true;
    if (identifier.deviceId && t.deviceId === identifier.deviceId) match = true;
    if (identifier.userId && t.userId === identifier.userId) match = true;

    if (match) {
      t.preferences = {
        ...t.preferences,
        ...preferences,
      };
      t.updatedAt = now;
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    saveDb(db);
    return true;
  }
  return false;
}

// Get eligible tokens for campaign based on category & audience preferences
export function getEligibleTokens(
  category: NotificationCategory,
  targetAudience: NotificationTargetAudience
): NotificationTokenRecord[] {
  const db = getDb();

  return db.notificationTokens.filter(t => {
    if (!t.active) return false;
    if (!t.token || t.token.trim() === '') return false;
    if (t.permission === 'denied') return false;
    if (t.preferences.enabled === false) return false;

    // Audience filtering
    if (targetAudience === 'all') {
      // Respect category preference
      if (category === 'new_designs') return t.preferences.newDesigns !== false;
      if (category === 'offers') return t.preferences.offers !== false;
      if (category === 'price_updates') return t.preferences.priceUpdates !== false;
      if (category === 'door_tips') return t.preferences.doorTips !== false;
      if (category === 'important_updates') return t.preferences.importantUpdates !== false;
      return true;
    }

    if (targetAudience === 'new_designs') return t.preferences.newDesigns !== false;
    if (targetAudience === 'offers') return t.preferences.offers !== false;
    if (targetAudience === 'price_updates') return t.preferences.priceUpdates !== false;
    if (targetAudience === 'door_tips') return t.preferences.doorTips !== false;
    if (targetAudience === 'important_updates') return t.preferences.importantUpdates !== false;

    return true;
  });
}

// Send Campaign Notification
export async function sendCampaignNotification(campaign: NotificationCampaign): Promise<{
  success: boolean;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  invalidTokensCleaned: number;
  error?: string;
}> {
  const db = getDb();
  const eligible = getEligibleTokens(campaign.category, campaign.targetAudience);

  // If no subscribers registered yet
  if (eligible.length === 0) {
    const updatedCampaign: NotificationCampaign = {
      ...campaign,
      status: 'sent',
      sentAt: new Date().toISOString(),
      recipientCount: 0,
      successCount: 0,
      failureCount: 0,
    };

    const cIndex = db.notificationCampaigns.findIndex(c => c.id === campaign.id);
    if (cIndex >= 0) {
      db.notificationCampaigns[cIndex] = updatedCampaign;
    } else {
      db.notificationCampaigns.push(updatedCampaign);
    }
    saveDb(db);

    return {
      success: true,
      recipientCount: 0,
      successCount: 0,
      failureCount: 0,
      invalidTokensCleaned: 0,
    };
  }

  const app = getFirebaseAdmin();
  if (!app) {
    // Record campaign as failed with clear configuration guidance
    const errorMsg = 'Push notifications are not configured. Add the required Firebase credentials/environment variables.';
    const updatedCampaign: NotificationCampaign = {
      ...campaign,
      status: 'failed',
      error: errorMsg,
      recipientCount: eligible.length,
      successCount: 0,
      failureCount: eligible.length,
    };

    const cIndex = db.notificationCampaigns.findIndex(c => c.id === campaign.id);
    if (cIndex >= 0) {
      db.notificationCampaigns[cIndex] = updatedCampaign;
    } else {
      db.notificationCampaigns.push(updatedCampaign);
    }
    saveDb(db);

    throw new Error(errorMsg);
  }

  // Collect tokens
  const tokenStrings = Array.from(new Set(eligible.map(e => e.token)));
  let totalSuccess = 0;
  let totalFailure = 0;
  const invalidTokensToRemove = new Set<string>();

  // Deep link action URL
  const actionUrl = campaign.deepLink || '/';
  const defaultIcon = '/assets/app-icon.svg';

  // Batch into chunks of 500 for FCM Multicast
  const chunkSize = 500;
  for (let i = 0; i < tokenStrings.length; i += chunkSize) {
    const batch = tokenStrings.slice(i, i + chunkSize);

    const multicastMessage: MulticastMessage = {
      tokens: batch,
      notification: {
        title: campaign.title,
        body: campaign.message,
        imageUrl: campaign.image || undefined,
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title: campaign.title,
          body: campaign.message,
          icon: campaign.image || defaultIcon,
          image: campaign.image || undefined,
          badge: defaultIcon,
          requireInteraction: true,
          data: {
            url: actionUrl,
            campaignId: campaign.id,
            category: campaign.category,
            doorId: campaign.doorId || '',
          },
          actions: [
            { action: 'open', title: 'View Details' },
            { action: 'close', title: 'Dismiss' },
          ],
        },
        fcmOptions: {
          link: actionUrl,
        },
      },
      data: {
        title: campaign.title,
        body: campaign.message,
        image: campaign.image || '',
        category: campaign.category,
        url: actionUrl,
        doorId: campaign.doorId || '',
        campaignId: campaign.id,
      },
    };

    try {
      const messaging = getMessaging(app);
      const response = await messaging.sendEachForMulticast(multicastMessage);
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      // Inspect failures to identify unregistered or invalid tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/invalid-argument'
          ) {
            invalidTokensToRemove.add(batch[idx]);
          }
        }
      });
    } catch (batchErr: any) {
      console.error('Error sending multicast batch:', batchErr);
      totalFailure += batch.length;
    }
  }

  // Clean up invalid tokens automatically
  let invalidCleaned = 0;
  if (invalidTokensToRemove.size > 0) {
    db.notificationTokens.forEach(t => {
      if (invalidTokensToRemove.has(t.token)) {
        t.active = false;
        t.updatedAt = new Date().toISOString();
        invalidCleaned++;
      }
    });
  }

  // Update campaign record
  const updatedCampaign: NotificationCampaign = {
    ...campaign,
    status: totalSuccess > 0 ? 'sent' : totalFailure > 0 ? 'failed' : 'sent',
    sentAt: new Date().toISOString(),
    recipientCount: tokenStrings.length,
    successCount: totalSuccess,
    failureCount: totalFailure,
    error: totalSuccess === 0 && totalFailure > 0 ? 'FCM delivery failed for all target tokens' : undefined,
  };

  const cIndex = db.notificationCampaigns.findIndex(c => c.id === campaign.id);
  if (cIndex >= 0) {
    db.notificationCampaigns[cIndex] = updatedCampaign;
  } else {
    db.notificationCampaigns.push(updatedCampaign);
  }
  saveDb(db);

  return {
    success: totalSuccess > 0 || tokenStrings.length === 0,
    recipientCount: tokenStrings.length,
    successCount: totalSuccess,
    failureCount: totalFailure,
    invalidTokensCleaned: invalidCleaned,
  };
}

// Get statistics for Admin Panel
export function getNotificationStats(): NotificationStats {
  const db = getDb();
  const fcmStatus = getFcmConfigStatus();

  const totalSubscribers = db.notificationTokens.length;
  const activeSubscribers = db.notificationTokens.filter(t => t.active && t.preferences.enabled !== false).length;
  const campaignsCount = db.notificationCampaigns.length;

  const categorySubscribers: Record<NotificationCategory, number> = {
    new_designs: db.notificationTokens.filter(t => t.active && t.preferences.enabled !== false && t.preferences.newDesigns !== false).length,
    offers: db.notificationTokens.filter(t => t.active && t.preferences.enabled !== false && t.preferences.offers !== false).length,
    price_updates: db.notificationTokens.filter(t => t.active && t.preferences.enabled !== false && t.preferences.priceUpdates !== false).length,
    door_tips: db.notificationTokens.filter(t => t.active && t.preferences.enabled !== false && t.preferences.doorTips !== false).length,
    important_updates: db.notificationTokens.filter(t => t.active && t.preferences.enabled !== false && t.preferences.importantUpdates !== false).length,
  };

  return {
    totalSubscribers,
    activeSubscribers,
    campaignsCount,
    categorySubscribers,
    isFcmConfigured: fcmStatus.isConfigured,
    fcmConfigDetails: fcmStatus.isConfigured
      ? { projectId: fcmStatus.projectId, clientEmail: fcmStatus.clientEmail }
      : undefined,
  };
}

// Background scheduler runner for scheduled campaigns
let schedulerInterval: NodeJS.Timeout | null = null;

export function startScheduledNotificationWorker(): void {
  if (schedulerInterval) return;

  schedulerInterval = setInterval(async () => {
    try {
      const db = getDb();
      const now = new Date();

      const scheduledCampaigns = db.notificationCampaigns.filter(
        c => c.status === 'scheduled' && c.scheduledAt && new Date(c.scheduledAt) <= now
      );

      for (const campaign of scheduledCampaigns) {
        console.log(`Executing scheduled notification campaign: "${campaign.title}" (${campaign.id})`);
        try {
          await sendCampaignNotification(campaign);
        } catch (err: any) {
          console.error(`Failed to process scheduled campaign ${campaign.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Error in scheduled notification worker:', err);
    }
  }, 30000); // Check every 30 seconds

  console.log('Background push notification scheduler started (Asia/Kolkata timezone support)');
}
