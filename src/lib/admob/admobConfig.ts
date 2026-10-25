import { AdMobSettings } from '../../types.ts';

/**
 * ============================================================================
 * GOOGLE ADMOB CENTRALIZED CONFIGURATION FOR JAI HANUMAN DOOR
 * Package: com.doorstudio.ai
 * ============================================================================
 *
 * NOTE FOR PRODUCTION DEPLOYMENT:
 * During development & testing, Google's official sample Ad Unit IDs are used.
 * When releasing to Google Play:
 * 1. Create your real App ID and Ad Units in https://apps.admob.com
 * 2. Set the environment variables in your GitHub Actions or production .env:
 *    - VITE_ADMOB_APP_ID="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
 *    - VITE_ADMOB_BANNER_ID="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
 *    - VITE_ADMOB_INTERSTITIAL_ID="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
 *    - VITE_ADMOB_NATIVE_ID="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
 *    - VITE_ADMOB_TEST_MODE="false"
 * 3. Or configure them through the Manufacturer Admin Control Center -> AdMob tab.
 * 4. Update the <string name="admob_app_id"> in android/app/src/main/res/values/strings.xml.
 */

// Google Official Test Ad Unit IDs (Guaranteed to return test ads safely)
export const ADMOB_TEST_IDS = {
  APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  NATIVE: 'ca-app-pub-3940256099942544/2247696110',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
} as const;

export const DEFAULT_ADMOB_SETTINGS: AdMobSettings = {
  enabled: true,
  testMode: true,
  appId: ADMOB_TEST_IDS.APP_ID,
  bannerAdUnitId: ADMOB_TEST_IDS.BANNER,
  interstitialAdUnitId: ADMOB_TEST_IDS.INTERSTITIAL,
  nativeAdUnitId: ADMOB_TEST_IDS.NATIVE,
  enableBanners: true,
  enableInterstitials: true,
  enableCatalogNativeAds: true,
  catalogNativeAdFrequency: 6, // Show a native ad after every 6 door products
  interstitialMinIntervalSeconds: 45, // Minimum 45 seconds between full-screen interstitials
};

const ADMOB_LOCAL_STORAGE_KEY = 'jai_admob_settings_v1';

/**
 * Returns merged active AdMob configuration.
 * Priority:
 * 1. Admin configured settings from backend / Firestore BusinessSettings
 * 2. Local storage overrides (for instant on-device testing)
 * 3. Build-time Vite environment variables
 * 4. Default test configuration
 */
export function getActiveAdMobSettings(customSettings?: AdMobSettings): AdMobSettings {
  let localOverride: Partial<AdMobSettings> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(ADMOB_LOCAL_STORAGE_KEY);
      if (stored) {
        localOverride = JSON.parse(stored);
      }
    } catch {}
  }

  const env = (import.meta as any).env || {};
  const isEnvProduction = env.PROD && env.VITE_ADMOB_TEST_MODE === 'false';
  const testMode = customSettings?.testMode ?? localOverride.testMode ?? !isEnvProduction;

  const rawBanner = customSettings?.bannerAdUnitId || localOverride.bannerAdUnitId || env.VITE_ADMOB_BANNER_ID;
  const rawInterstitial = customSettings?.interstitialAdUnitId || localOverride.interstitialAdUnitId || env.VITE_ADMOB_INTERSTITIAL_ID;
  const rawNative = customSettings?.nativeAdUnitId || localOverride.nativeAdUnitId || env.VITE_ADMOB_NATIVE_ID;
  const rawAppId = customSettings?.appId || localOverride.appId || env.VITE_ADMOB_APP_ID;

  return {
    enabled: customSettings?.enabled ?? localOverride.enabled ?? (env.VITE_ADMOB_ENABLED !== 'false'),
    testMode,
    appId: testMode || !rawAppId ? ADMOB_TEST_IDS.APP_ID : rawAppId,
    bannerAdUnitId: testMode || !rawBanner ? ADMOB_TEST_IDS.BANNER : rawBanner,
    interstitialAdUnitId: testMode || !rawInterstitial ? ADMOB_TEST_IDS.INTERSTITIAL : rawInterstitial,
    nativeAdUnitId: testMode || !rawNative ? ADMOB_TEST_IDS.NATIVE : rawNative,
    enableBanners: customSettings?.enableBanners ?? localOverride.enableBanners ?? true,
    enableInterstitials: customSettings?.enableInterstitials ?? localOverride.enableInterstitials ?? true,
    enableCatalogNativeAds: customSettings?.enableCatalogNativeAds ?? localOverride.enableCatalogNativeAds ?? true,
    catalogNativeAdFrequency: customSettings?.catalogNativeAdFrequency ?? localOverride.catalogNativeAdFrequency ?? 6,
    interstitialMinIntervalSeconds: customSettings?.interstitialMinIntervalSeconds ?? localOverride.interstitialMinIntervalSeconds ?? 45,
  };
}

/**
 * Saves local AdMob overrides for testing directly in device.
 */
export function saveLocalAdMobSettings(settings: Partial<AdMobSettings>): void {
  if (typeof window !== 'undefined') {
    try {
      const current = getActiveAdMobSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(ADMOB_LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
}

/**
 * Verified Publisher ID from Google AdMob account
 */
export const ADMOB_PUBLISHER_ID = 'pub-2305048922926538';

/**
 * Validates AdMob Android Application ID format (ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX with tilde '~').
 */
export function isValidAdMobAppId(id: string): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return /^ca-app-pub-\d{16}~\d{10}$/.test(trimmed) || trimmed === ADMOB_TEST_IDS.APP_ID;
}

/**
 * Validates AdMob Ad Unit ID format (ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX with slash '/').
 */
export function isValidAdMobAdUnitId(id: string): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return /^ca-app-pub-\d{16}\/\d{10}$/.test(trimmed) ||
    trimmed === ADMOB_TEST_IDS.BANNER ||
    trimmed === ADMOB_TEST_IDS.INTERSTITIAL ||
    trimmed === ADMOB_TEST_IDS.NATIVE ||
    trimmed === ADMOB_TEST_IDS.REWARDED;
}

/**
 * Detects if user mistakenly placed an App ID (~ format) into an Ad Unit ID field,
 * or placed an Ad Unit ID (/ format) into an App ID field.
 */
export function validateAdMobIdMismatch(type: 'appId' | 'adUnit', value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (type === 'adUnit' && trimmed.includes('~')) {
    return 'Format Error: You entered an AdMob App ID (with "~"). Ad Unit IDs require a slash "/" (e.g. ca-app-pub-.../...).';
  }
  if (type === 'appId' && trimmed.includes('/')) {
    return 'Format Error: You entered an Ad Unit ID (with "/"). AdMob Application ID requires a tilde "~" (e.g. ca-app-pub-...~...).';
  }
  return null;
}
