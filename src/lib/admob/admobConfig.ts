import { AdMobSettings } from '../../types.ts';

/**
 * ============================================================================
 * GOOGLE ADMOB CENTRALIZED CONFIGURATION FOR JAI HANUMAN DOOR
 * Package: com.doorstudio.ai
 * ============================================================================
 *
 * PRODUCTION ADMOB IDs (Configured as specified):
 * - Application ID:          ca-app-pub-2305048922926538~7688035209
 * - 1. Banner Ad:            ca-app-pub-2305048922926538/1465835268
 * - 2. Interstitial Ad:      ca-app-pub-2305048922926538/9911387219
 * - 3. Rewarded Ad:          ca-app-pub-2305048922926538/5315122927
 * - 4. Rewarded Interstitial ca-app-pub-2305048922926538/9719815523
 * - 5. Native Advanced Ad:   ca-app-pub-2305048922926538/1274349298
 * - 6. App Open Ad:          ca-app-pub-2305048922926538/8352349801
 *
 * SAFETY POLICY:
 * During development & testing, Google's official sample Ad Unit IDs are used
 * when testMode is true to avoid policy violations or invalid traffic.
 * When testMode is set to false (in production), the official production IDs above are served.
 */

export const ADMOB_PUBLISHER_ID = 'pub-2305048922926538';

// Official Production AdMob IDs for Jai Hanuman Door (com.doorstudio.ai)
export const ADMOB_PRODUCTION_IDS = {
  APP_ID: 'ca-app-pub-2305048922926538~7688035209',
  BANNER: 'ca-app-pub-2305048922926538/1465835268',
  INTERSTITIAL: 'ca-app-pub-2305048922926538/9911387219',
  REWARDED: 'ca-app-pub-2305048922926538/5315122927',
  REWARDED_INTERSTITIAL: 'ca-app-pub-2305048922926538/9719815523',
  NATIVE: 'ca-app-pub-2305048922926538/1274349298',
  APP_OPEN: 'ca-app-pub-2305048922926538/8352349801',
} as const;

// Official Google Sample / Test Ad Unit IDs (Guaranteed to return safe test ads)
export const ADMOB_TEST_IDS = {
  APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  BANNER: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED: 'ca-app-pub-3940256099942544/5224354917',
  REWARDED_INTERSTITIAL: 'ca-app-pub-3940256099942544/5354046379',
  NATIVE: 'ca-app-pub-3940256099942544/2247696110',
  APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
} as const;

export const DEFAULT_ADMOB_SETTINGS: AdMobSettings = {
  enabled: true,
  testMode: true,
  appId: ADMOB_TEST_IDS.APP_ID,
  bannerAdUnitId: ADMOB_TEST_IDS.BANNER,
  interstitialAdUnitId: ADMOB_TEST_IDS.INTERSTITIAL,
  rewardedAdUnitId: ADMOB_TEST_IDS.REWARDED,
  rewardedInterstitialAdUnitId: ADMOB_TEST_IDS.REWARDED_INTERSTITIAL,
  nativeAdUnitId: ADMOB_TEST_IDS.NATIVE,
  appOpenAdUnitId: ADMOB_TEST_IDS.APP_OPEN,
  enableBanners: true,
  enableInterstitials: true,
  enableRewardedAds: true,
  enableRewardedInterstitialAds: true,
  enableCatalogNativeAds: true,
  enableAppOpenAds: true,
  catalogNativeAdFrequency: 6, // Show a native ad after every 6 door products
  interstitialMinIntervalSeconds: 45, // Minimum 45 seconds between full-screen interstitials
  appOpenMinIntervalSeconds: 180, // Minimum 180 seconds between App Open ads
};

const ADMOB_LOCAL_STORAGE_KEY = 'jai_admob_settings_v2';

/**
 * Returns merged active AdMob configuration.
 * Priority:
 * 1. Admin configured settings from backend / Firestore BusinessSettings
 * 2. Local storage overrides (for instant on-device testing)
 * 3. Build-time Vite environment variables
 * 4. Production or Test defaults depending on testMode flag
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

  // Selected default IDs depending on testMode
  const activeDefaults = testMode ? ADMOB_TEST_IDS : ADMOB_PRODUCTION_IDS;

  const rawAppId = customSettings?.appId || localOverride.appId || env.VITE_ADMOB_APP_ID;
  const rawBanner = customSettings?.bannerAdUnitId || localOverride.bannerAdUnitId || env.VITE_ADMOB_BANNER_ID;
  const rawInterstitial = customSettings?.interstitialAdUnitId || localOverride.interstitialAdUnitId || env.VITE_ADMOB_INTERSTITIAL_ID;
  const rawRewarded = customSettings?.rewardedAdUnitId || localOverride.rewardedAdUnitId || env.VITE_ADMOB_REWARDED_ID;
  const rawRewardedInterstitial = customSettings?.rewardedInterstitialAdUnitId || localOverride.rewardedInterstitialAdUnitId || env.VITE_ADMOB_REWARDED_INTERSTITIAL_ID;
  const rawNative = customSettings?.nativeAdUnitId || localOverride.nativeAdUnitId || env.VITE_ADMOB_NATIVE_ID;
  const rawAppOpen = customSettings?.appOpenAdUnitId || localOverride.appOpenAdUnitId || env.VITE_ADMOB_APP_OPEN_ID;

  return {
    enabled: customSettings?.enabled ?? localOverride.enabled ?? (env.VITE_ADMOB_ENABLED !== 'false'),
    testMode,
    appId: testMode ? ADMOB_TEST_IDS.APP_ID : (rawAppId || ADMOB_PRODUCTION_IDS.APP_ID),
    bannerAdUnitId: testMode ? ADMOB_TEST_IDS.BANNER : (rawBanner || ADMOB_PRODUCTION_IDS.BANNER),
    interstitialAdUnitId: testMode ? ADMOB_TEST_IDS.INTERSTITIAL : (rawInterstitial || ADMOB_PRODUCTION_IDS.INTERSTITIAL),
    rewardedAdUnitId: testMode ? ADMOB_TEST_IDS.REWARDED : (rawRewarded || ADMOB_PRODUCTION_IDS.REWARDED),
    rewardedInterstitialAdUnitId: testMode ? ADMOB_TEST_IDS.REWARDED_INTERSTITIAL : (rawRewardedInterstitial || ADMOB_PRODUCTION_IDS.REWARDED_INTERSTITIAL),
    nativeAdUnitId: testMode ? ADMOB_TEST_IDS.NATIVE : (rawNative || ADMOB_PRODUCTION_IDS.NATIVE),
    appOpenAdUnitId: testMode ? ADMOB_TEST_IDS.APP_OPEN : (rawAppOpen || ADMOB_PRODUCTION_IDS.APP_OPEN),
    enableBanners: customSettings?.enableBanners ?? localOverride.enableBanners ?? true,
    enableInterstitials: customSettings?.enableInterstitials ?? localOverride.enableInterstitials ?? true,
    enableRewardedAds: customSettings?.enableRewardedAds ?? localOverride.enableRewardedAds ?? true,
    enableRewardedInterstitialAds: customSettings?.enableRewardedInterstitialAds ?? localOverride.enableRewardedInterstitialAds ?? true,
    enableCatalogNativeAds: customSettings?.enableCatalogNativeAds ?? localOverride.enableCatalogNativeAds ?? true,
    enableAppOpenAds: customSettings?.enableAppOpenAds ?? localOverride.enableAppOpenAds ?? true,
    catalogNativeAdFrequency: customSettings?.catalogNativeAdFrequency ?? localOverride.catalogNativeAdFrequency ?? 6,
    interstitialMinIntervalSeconds: customSettings?.interstitialMinIntervalSeconds ?? localOverride.interstitialMinIntervalSeconds ?? 45,
    appOpenMinIntervalSeconds: customSettings?.appOpenMinIntervalSeconds ?? localOverride.appOpenMinIntervalSeconds ?? 180,
  };
}

/**
 * Saves local AdMob overrides for testing directly on device.
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
 * Validates AdMob Android Application ID format (ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX with tilde '~').
 */
export function isValidAdMobAppId(id: string): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return /^ca-app-pub-\d{16}~\d{10}$/.test(trimmed) ||
    trimmed === ADMOB_TEST_IDS.APP_ID ||
    trimmed === ADMOB_PRODUCTION_IDS.APP_ID;
}

/**
 * Validates AdMob Ad Unit ID format (ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX with slash '/').
 */
export function isValidAdMobAdUnitId(id: string): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return /^ca-app-pub-\d{16}\/\d{10}$/.test(trimmed) ||
    Object.values(ADMOB_TEST_IDS).includes(trimmed as any) ||
    Object.values(ADMOB_PRODUCTION_IDS).includes(trimmed as any);
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
