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
  // Centralized Smart Frequency & Session Management
  maxInterstitialsPerSession: 4, // Max 4 interstitials per user session
  maxAppOpenPerSession: 2, // Max 2 App Open ads per user session
  enableNavTransitionInterstitials: true, // Show interstitial during natural section navigation
  navTransitionMinViews: 4, // After visiting 4 screens
  enableArticlesNativeAds: true, // Native sponsored ad in articles / guides
  articlesNativeAdFrequency: 3, // After every 3 articles
  enableVisualizerRewardedBonus: true, // Rewarded ad unlock for 4K studio lighting in 3D studio
  // Granular placement banner toggles
  bannerHome: true,
  bannerCatalog: true,
  bannerCalculator: true,
  bannerChaukhat: true,
  bannerDetail: true,
  bannerVisualizer: true,
  bannerArticles: true,
  bannerTracking: true,
  bannerSaved: true,
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
  const isProd = Boolean(env.PROD);
  const testMode = customSettings?.testMode ??
    localOverride.testMode ??
    (env.VITE_ADMOB_TEST_MODE !== undefined ? env.VITE_ADMOB_TEST_MODE === 'true' : !isProd);

  const rawAppId = customSettings?.appId || localOverride.appId || env.VITE_ADMOB_APP_ID;
  const rawBanner = customSettings?.bannerAdUnitId || localOverride.bannerAdUnitId || env.VITE_ADMOB_BANNER_ID;
  const rawInterstitial = customSettings?.interstitialAdUnitId || localOverride.interstitialAdUnitId || env.VITE_ADMOB_INTERSTITIAL_ID;
  const rawRewarded = customSettings?.rewardedAdUnitId || localOverride.rewardedAdUnitId || env.VITE_ADMOB_REWARDED_ID;
  const rawRewardedInterstitial = customSettings?.rewardedInterstitialAdUnitId || localOverride.rewardedInterstitialAdUnitId || env.VITE_ADMOB_REWARDED_INTERSTITIAL_ID;
  const rawNative = customSettings?.nativeAdUnitId || localOverride.nativeAdUnitId || env.VITE_ADMOB_NATIVE_ID;
  const rawAppOpen = customSettings?.appOpenAdUnitId || localOverride.appOpenAdUnitId || env.VITE_ADMOB_APP_OPEN_ID;

  // Safeguard: In production mode (testMode = false), if a test ID was configured, replace it with the production ID
  const resolveId = (raw: string | undefined, prod: string, test: string) => {
    if (testMode) return test;
    if (!raw || raw === test || Object.values(ADMOB_TEST_IDS).includes(raw as any)) return prod;
    return raw;
  };

  return {
    enabled: customSettings?.enabled ?? localOverride.enabled ?? (env.VITE_ADMOB_ENABLED !== 'false'),
    testMode,
    appId: resolveId(rawAppId, ADMOB_PRODUCTION_IDS.APP_ID, ADMOB_TEST_IDS.APP_ID),
    bannerAdUnitId: resolveId(rawBanner, ADMOB_PRODUCTION_IDS.BANNER, ADMOB_TEST_IDS.BANNER),
    interstitialAdUnitId: resolveId(rawInterstitial, ADMOB_PRODUCTION_IDS.INTERSTITIAL, ADMOB_TEST_IDS.INTERSTITIAL),
    rewardedAdUnitId: resolveId(rawRewarded, ADMOB_PRODUCTION_IDS.REWARDED, ADMOB_TEST_IDS.REWARDED),
    rewardedInterstitialAdUnitId: resolveId(rawRewardedInterstitial, ADMOB_PRODUCTION_IDS.REWARDED_INTERSTITIAL, ADMOB_TEST_IDS.REWARDED_INTERSTITIAL),
    nativeAdUnitId: resolveId(rawNative, ADMOB_PRODUCTION_IDS.NATIVE, ADMOB_TEST_IDS.NATIVE),
    appOpenAdUnitId: resolveId(rawAppOpen, ADMOB_PRODUCTION_IDS.APP_OPEN, ADMOB_TEST_IDS.APP_OPEN),
    enableBanners: customSettings?.enableBanners ?? localOverride.enableBanners ?? true,
    enableInterstitials: customSettings?.enableInterstitials ?? localOverride.enableInterstitials ?? true,
    enableRewardedAds: customSettings?.enableRewardedAds ?? localOverride.enableRewardedAds ?? true,
    enableRewardedInterstitialAds: customSettings?.enableRewardedInterstitialAds ?? localOverride.enableRewardedInterstitialAds ?? true,
    enableCatalogNativeAds: customSettings?.enableCatalogNativeAds ?? localOverride.enableCatalogNativeAds ?? true,
    enableAppOpenAds: customSettings?.enableAppOpenAds ?? localOverride.enableAppOpenAds ?? true,
    catalogNativeAdFrequency: customSettings?.catalogNativeAdFrequency ?? localOverride.catalogNativeAdFrequency ?? 6,
    interstitialMinIntervalSeconds: customSettings?.interstitialMinIntervalSeconds ?? localOverride.interstitialMinIntervalSeconds ?? 45,
    appOpenMinIntervalSeconds: customSettings?.appOpenMinIntervalSeconds ?? localOverride.appOpenMinIntervalSeconds ?? 180,
    // Centralized Smart Frequency & Session Management
    maxInterstitialsPerSession: customSettings?.maxInterstitialsPerSession ?? localOverride.maxInterstitialsPerSession ?? 4,
    maxAppOpenPerSession: customSettings?.maxAppOpenPerSession ?? localOverride.maxAppOpenPerSession ?? 2,
    enableNavTransitionInterstitials: customSettings?.enableNavTransitionInterstitials ?? localOverride.enableNavTransitionInterstitials ?? true,
    navTransitionMinViews: customSettings?.navTransitionMinViews ?? localOverride.navTransitionMinViews ?? 4,
    enableArticlesNativeAds: customSettings?.enableArticlesNativeAds ?? localOverride.enableArticlesNativeAds ?? true,
    articlesNativeAdFrequency: customSettings?.articlesNativeAdFrequency ?? localOverride.articlesNativeAdFrequency ?? 3,
    enableVisualizerRewardedBonus: customSettings?.enableVisualizerRewardedBonus ?? localOverride.enableVisualizerRewardedBonus ?? true,
    // Granular placement banner toggles
    bannerHome: customSettings?.bannerHome ?? localOverride.bannerHome ?? true,
    bannerCatalog: customSettings?.bannerCatalog ?? localOverride.bannerCatalog ?? true,
    bannerCalculator: customSettings?.bannerCalculator ?? localOverride.bannerCalculator ?? true,
    bannerChaukhat: customSettings?.bannerChaukhat ?? localOverride.bannerChaukhat ?? true,
    bannerDetail: customSettings?.bannerDetail ?? localOverride.bannerDetail ?? true,
    bannerVisualizer: customSettings?.bannerVisualizer ?? localOverride.bannerVisualizer ?? true,
    bannerArticles: customSettings?.bannerArticles ?? localOverride.bannerArticles ?? true,
    bannerTracking: customSettings?.bannerTracking ?? localOverride.bannerTracking ?? true,
    bannerSaved: customSettings?.bannerSaved ?? localOverride.bannerSaved ?? true,
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
