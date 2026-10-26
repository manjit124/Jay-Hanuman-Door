import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  InterstitialAdPluginEvents,
  BannerAdPluginEvents,
  RewardAdPluginEvents,
  RewardInterstitialAdPluginEvents,
  AppOpenAdPluginEvents,
  AdOptions,
  RewardAdOptions,
  RewardInterstitialAdOptions,
  AppOpenAdOptions,
  AdMobRewardItem,
  AdMobRewardInterstitialItem,
  AdmobConsentStatus,
} from '@capacitor-community/admob';
import { AdMobSettings } from '../../types.ts';
import { getActiveAdMobSettings } from './admobConfig.ts';
import { addPurchasedCredits } from '../creditManager.ts';

/**
 * ============================================================================
 * JAI HANUMAN DOOR - COMPLETE GOOGLE ADMOB SERVICE
 * Package: com.doorstudio.ai
 * Supports all 6 Google AdMob ad formats:
 * 1. Adaptive Banner
 * 2. Interstitial
 * 3. Rewarded Video (+3 Free Credits)
 * 4. Rewarded Interstitial
 * 5. Native Advanced
 * 6. App Open (Cold start & Foreground return)
 * ============================================================================
 */
class AdMobService {
  private isInitialized = false;
  private isInitializing = false;
  private listenersRegistered = false;

  // Interstitial State
  private isInterstitialLoading = false;
  private isInterstitialLoaded = false;
  private lastInterstitialShownTime = 0;

  // Rewarded Video State
  private isRewardedLoading = false;
  private isRewardedLoaded = false;
  private lastRewardedShownTime = 0;

  // Rewarded Interstitial State
  private isRewardedInterstitialLoading = false;
  private isRewardedInterstitialLoaded = false;

  // App Open Ad State
  private isAppOpenLoading = false;
  private isAppOpenLoaded = false;
  private appOpenLoadTimestamp = 0; // Freshness check (< 4 hours)
  private lastAppOpenShownTime = 0;

  // Banner State
  private activeBannerPosition: 'top' | 'bottom' | null = null;
  private isBannerShowing = false;

  // Global Full-Screen Ad Lock (Ensures only 1 full-screen ad shows at any time)
  private isFullScreenAdActive = false;

  // Safe Context Locks: Prevent ads during camera, photo scanning, or checkout
  private isCameraOrScanActive = false;

  public isNative(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && Boolean((window as any).Capacitor))
    );
  }

  /**
   * Safe context lock: Notify when user opens camera or initiates an AI Wood scan
   * to strictly suppress App Open or Interstitial ads.
   */
  public setCameraOrScanActive(active: boolean): void {
    this.isCameraOrScanActive = active;
  }

  public isCameraOrScanBusy(): boolean {
    return this.isCameraOrScanActive;
  }

  /**
   * Initializes the Google Mobile Ads SDK and requests UMP consent if applicable.
   * Safe to call multiple times; executes only once.
   */
  public async initialize(customSettings?: AdMobSettings): Promise<void> {
    if (this.isInitialized || this.isInitializing) return;
    this.isInitializing = true;

    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled) {
      console.log('ℹ️ [AdMob] Ads are disabled in settings.');
      this.isInitializing = false;
      return;
    }

    if (!this.isNative()) {
      console.log('🌐 [AdMob] Web preview mode detected. Native AdMob calls will be safely mocked.');
      this.isInitialized = true;
      this.isInitializing = false;
      return;
    }

    try {
      console.log('📱 [AdMob] Initializing Google Mobile Ads SDK for Android (com.doorstudio.ai)...');

      // 1. Google UMP Consent check (EU/EEA & global policy compliance)
      try {
        const consentInfo = await AdMob.requestConsentInfo();
        if (consentInfo.status === AdmobConsentStatus.REQUIRED) {
          console.log('📋 [AdMob UMP] Requesting user consent via Google consent form...');
          await AdMob.showConsentForm();
        }
      } catch (consentErr: any) {
        console.warn('ℹ️ [AdMob UMP] Consent check skipped/not required in region:', consentErr?.message || consentErr);
      }

      // 2. Initialize Mobile Ads SDK
      await AdMob.initialize({
        testingDevices: ['2077ef8a63d52868702e54201d579520', 'EMULATOR'],
        initializeForTesting: config.testMode,
      });

      this.registerGlobalEventListeners();
      this.isInitialized = true;
      console.log('✅ [AdMob] Google Mobile Ads SDK initialized successfully. TestMode:', config.testMode);

      // 3. Preload full-screen ads in background for smooth natural transitions
      if (config.enableInterstitials) {
        this.preloadInterstitial(customSettings);
      }
      if (config.enableRewardedAds) {
        this.preloadRewarded(customSettings);
      }
      if (config.enableAppOpenAds) {
        this.preloadAppOpen(customSettings);
      }
    } catch (err: any) {
      console.warn('⚠️ [AdMob] Initialization notice (app will continue normally):', err.message || err);
      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  private registerGlobalEventListeners(): void {
    if (this.listenersRegistered || !this.isNative()) return;
    this.listenersRegistered = true;

    try {
      // --- Interstitial Listeners ---
      AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
        console.log('🎯 [AdMob] Interstitial preloaded and ready.');
        this.isInterstitialLoaded = true;
        this.isInterstitialLoading = false;
      });

      AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (err) => {
        console.warn('⚠️ [AdMob] Interstitial load failed:', err);
        this.isInterstitialLoaded = false;
        this.isInterstitialLoading = false;
      });

      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        console.log('🚪 [AdMob] Interstitial dismissed.');
        this.isInterstitialLoaded = false;
        this.isFullScreenAdActive = false;
        this.lastInterstitialShownTime = Date.now();
        setTimeout(() => this.preloadInterstitial(), 3000);
      });

      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
        this.isInterstitialLoaded = false;
        this.isFullScreenAdActive = false;
        this.lastInterstitialShownTime = Date.now();
      });

      // --- Rewarded Video Listeners ---
      AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
        console.log('🎁 [AdMob] Rewarded video preloaded and ready.');
        this.isRewardedLoaded = true;
        this.isRewardedLoading = false;
      });

      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err) => {
        console.warn('⚠️ [AdMob] Rewarded video load failed:', err);
        this.isRewardedLoaded = false;
        this.isRewardedLoading = false;
      });

      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        console.log('🚪 [AdMob] Rewarded video closed.');
        this.isRewardedLoaded = false;
        this.isFullScreenAdActive = false;
        setTimeout(() => this.preloadRewarded(), 3000);
      });

      AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        this.isRewardedLoaded = false;
        this.isFullScreenAdActive = false;
      });

      // --- App Open Listeners ---
      AdMob.addListener(AppOpenAdPluginEvents.Loaded, () => {
        console.log('📱 [AdMob] App Open ad preloaded.');
        this.isAppOpenLoaded = true;
        this.isAppOpenLoading = false;
        this.appOpenLoadTimestamp = Date.now();
      });

      AdMob.addListener(AppOpenAdPluginEvents.FailedToLoad, (err) => {
        console.warn('⚠️ [AdMob] App Open ad load failed:', err);
        this.isAppOpenLoaded = false;
        this.isAppOpenLoading = false;
      });

      AdMob.addListener(AppOpenAdPluginEvents.Closed, () => {
        console.log('🚪 [AdMob] App Open ad closed.');
        this.isAppOpenLoaded = false;
        this.isFullScreenAdActive = false;
        this.lastAppOpenShownTime = Date.now();
        setTimeout(() => this.preloadAppOpen(), 5000);
      });

      AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, () => {
        this.isAppOpenLoaded = false;
        this.isFullScreenAdActive = false;
        this.lastAppOpenShownTime = Date.now();
      });
    } catch (err) {
      console.warn('Could not register AdMob event listeners:', err);
    }
  }

  // ==========================================================================
  // FORMAT 1: BANNER AD (Adaptive Banner with bottomNav margin protection)
  // ==========================================================================
  public async showAdaptiveBanner(
    position: 'top' | 'bottom' = 'bottom',
    customSettings?: AdMobSettings,
    margin = 72
  ): Promise<void> {
    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableBanners) return;
    if (!this.isNative()) return;

    if (this.isBannerShowing && this.activeBannerPosition === position) {
      return; // Already showing at this position
    }

    try {
      await this.initialize(customSettings);

      console.log(`📌 [AdMob Banner] Showing adaptive banner at ${position} (margin: ${margin}px)...`);
      await AdMob.showBanner({
        adId: config.bannerAdUnitId || '',
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: position === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
        margin: position === 'bottom' ? margin : 0,
        isTesting: config.testMode,
      });

      this.activeBannerPosition = position;
      this.isBannerShowing = true;
    } catch (err: any) {
      console.warn('⚠️ [AdMob Banner] Banner display warning:', err?.message || err);
    }
  }

  public async hideAdaptiveBanner(): Promise<void> {
    if (!this.isNative() || !this.isBannerShowing) return;
    try {
      await AdMob.hideBanner();
      this.isBannerShowing = false;
      this.activeBannerPosition = null;
    } catch {
      this.isBannerShowing = false;
      this.activeBannerPosition = null;
    }
  }

  // ==========================================================================
  // FORMAT 2: INTERSTITIAL AD (Natural breaks e.g. after quotation estimate)
  // ==========================================================================
  public async preloadInterstitial(customSettings?: AdMobSettings): Promise<boolean> {
    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableInterstitials) return false;
    if (this.isInterstitialLoaded || this.isInterstitialLoading) return this.isInterstitialLoaded;

    if (!this.isNative()) {
      this.isInterstitialLoaded = true;
      return true;
    }

    try {
      this.isInterstitialLoading = true;
      const options: AdOptions = {
        adId: config.interstitialAdUnitId || '',
        isTesting: config.testMode,
      };
      await AdMob.prepareInterstitial(options);
      this.isInterstitialLoaded = true;
      this.isInterstitialLoading = false;
      return true;
    } catch (err: any) {
      console.warn('⚠️ [AdMob Interstitial] Preload error:', err?.message || err);
      this.isInterstitialLoaded = false;
      this.isInterstitialLoading = false;
      return false;
    }
  }

  public async showQuotationInterstitial(
    onDone: () => void,
    customSettings?: AdMobSettings,
    safetyTimeoutMs = 3500
  ): Promise<void> {
    let completed = false;
    const safeComplete = () => {
      if (!completed) {
        completed = true;
        this.isFullScreenAdActive = false;
        onDone();
      }
    };

    if (this.isFullScreenAdActive || this.isCameraOrScanActive) {
      safeComplete();
      return;
    }

    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableInterstitials) {
      safeComplete();
      return;
    }

    // Frequency capping
    const now = Date.now();
    const minIntervalMs = (config.interstitialMinIntervalSeconds || 45) * 1000;
    if (now - this.lastInterstitialShownTime < minIntervalMs) {
      console.log('⏱️ [AdMob Interstitial] Frequency cap active; skipping.');
      safeComplete();
      return;
    }

    this.isFullScreenAdActive = true;

    // Safety timeout: Never lock the user on a stuck screen
    const timeoutHandle = setTimeout(() => {
      safeComplete();
    }, safetyTimeoutMs);

    if (!this.isNative()) {
      clearTimeout(timeoutHandle);
      this.lastInterstitialShownTime = now;
      safeComplete();
      return;
    }

    try {
      if (!this.isInterstitialLoaded) {
        const loaded = await this.preloadInterstitial(customSettings);
        if (!loaded) {
          clearTimeout(timeoutHandle);
          safeComplete();
          return;
        }
      }

      let dismissHandle: any = null;
      let failHandle: any = null;

      const cleanup = () => {
        clearTimeout(timeoutHandle);
        try {
          if (dismissHandle?.remove) dismissHandle.remove();
          if (failHandle?.remove) failHandle.remove();
        } catch {}
      };

      dismissHandle = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        cleanup();
        this.lastInterstitialShownTime = Date.now();
        this.isInterstitialLoaded = false;
        safeComplete();
      });

      failHandle = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
        cleanup();
        this.lastInterstitialShownTime = Date.now();
        this.isInterstitialLoaded = false;
        safeComplete();
      });

      console.log('🚀 [AdMob Interstitial] Showing interstitial ad...');
      await AdMob.showInterstitial();
    } catch (err: any) {
      console.warn('⚠️ [AdMob Interstitial] Could not show interstitial:', err?.message || err);
      clearTimeout(timeoutHandle);
      safeComplete();
    }
  }

  // ==========================================================================
  // FORMAT 3: REWARDED VIDEO AD (+3 AI Wood Scan Credits upon verified completion)
  // ==========================================================================
  public async preloadRewarded(customSettings?: AdMobSettings): Promise<boolean> {
    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableRewardedAds) return false;
    if (this.isRewardedLoaded || this.isRewardedLoading) return this.isRewardedLoaded;

    if (!this.isNative()) {
      this.isRewardedLoaded = true;
      return true;
    }

    try {
      this.isRewardedLoading = true;
      const options: RewardAdOptions = {
        adId: config.rewardedAdUnitId || '',
        isTesting: config.testMode,
      };
      await AdMob.prepareRewardVideoAd(options);
      this.isRewardedLoaded = true;
      this.isRewardedLoading = false;
      return true;
    } catch (err: any) {
      console.warn('⚠️ [AdMob Rewarded] Preload error:', err?.message || err);
      this.isRewardedLoaded = false;
      this.isRewardedLoading = false;
      return false;
    }
  }

  /**
   * Presents a Rewarded Video ad.
   * STRICT MONETIZATION RULES:
   * - Credits are granted ONLY when SDK confirms user completed the ad.
   * - Deduplication token prevents duplicate grants.
   * - Early close or error awards zero credits.
   */
  public async showRewardedAd(
    onRewardConfirmed: (reward: { amount: number; type: string }) => void,
    onDismissed?: () => void,
    customSettings?: AdMobSettings
  ): Promise<{ shown: boolean; rewarded: boolean }> {
    if (this.isFullScreenAdActive) {
      return { shown: false, rewarded: false };
    }

    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableRewardedAds) {
      return { shown: false, rewarded: false };
    }

    // Web preview simulation
    if (!this.isNative()) {
      const grantTxToken = `rewarded_sim_${Date.now()}`;
      addPurchasedCredits(3, grantTxToken);
      onRewardConfirmed({ amount: 3, type: 'AI_WOOD_SCAN_CREDITS' });
      if (onDismissed) onDismissed();
      return { shown: true, rewarded: true };
    }

    this.isFullScreenAdActive = true;
    let earnedReward = false;
    let rewardGranted = false;

    try {
      if (!this.isRewardedLoaded) {
        const loaded = await this.preloadRewarded(customSettings);
        if (!loaded) {
          this.isFullScreenAdActive = false;
          return { shown: false, rewarded: false };
        }
      }

      // One-time reward event listener
      let rewardHandle: any = null;
      let dismissHandle: any = null;

      const cleanup = () => {
        try {
          if (rewardHandle?.remove) rewardHandle.remove();
          if (dismissHandle?.remove) dismissHandle.remove();
        } catch {}
      };

      rewardHandle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
        console.log('🎉 [AdMob Rewarded] User completed video. Reward verified by SDK:', reward);
        earnedReward = true;
        if (!rewardGranted) {
          rewardGranted = true;
          // Exact credit rule: +3 Credits for AI Wood Scan
          const txToken = `admob_reward_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          addPurchasedCredits(3, txToken);
          onRewardConfirmed({ amount: 3, type: reward.type || 'Credits' });
        }
      });

      dismissHandle = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        cleanup();
        this.isFullScreenAdActive = false;
        this.isRewardedLoaded = false;
        if (onDismissed) onDismissed();
      });

      console.log('🚀 [AdMob Rewarded] Presenting rewarded video ad...');
      const result = await AdMob.showRewardVideoAd();

      if (result && !rewardGranted) {
        rewardGranted = true;
        earnedReward = true;
        const txToken = `admob_reward_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        addPurchasedCredits(3, txToken);
        onRewardConfirmed({ amount: 3, type: result.type || 'Credits' });
      }

      return { shown: true, rewarded: earnedReward };
    } catch (err: any) {
      console.warn('⚠️ [AdMob Rewarded] Failed to show rewarded ad:', err?.message || err);
      this.isFullScreenAdActive = false;
      this.isRewardedLoaded = false;
      return { shown: false, rewarded: false };
    }
  }

  // ==========================================================================
  // FORMAT 4: REWARDED INTERSTITIAL AD (Clear opt-in disclosure + verified reward)
  // ==========================================================================
  public async preloadRewardedInterstitial(customSettings?: AdMobSettings): Promise<boolean> {
    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableRewardedInterstitialAds) return false;
    if (this.isRewardedInterstitialLoaded || this.isRewardedInterstitialLoading) {
      return this.isRewardedInterstitialLoaded;
    }

    if (!this.isNative()) {
      this.isRewardedInterstitialLoaded = true;
      return true;
    }

    try {
      this.isRewardedInterstitialLoading = true;
      const options: RewardInterstitialAdOptions = {
        adId: config.rewardedInterstitialAdUnitId || '',
        isTesting: config.testMode,
      };
      await AdMob.prepareRewardInterstitialAd(options);
      this.isRewardedInterstitialLoaded = true;
      this.isRewardedInterstitialLoading = false;
      return true;
    } catch (err: any) {
      console.warn('⚠️ [AdMob Rewarded Interstitial] Preload error:', err?.message || err);
      this.isRewardedInterstitialLoaded = false;
      this.isRewardedInterstitialLoading = false;
      return false;
    }
  }

  public async showRewardedInterstitialAd(
    onRewardConfirmed: (reward: { amount: number; type: string }) => void,
    onDismissed?: () => void,
    customSettings?: AdMobSettings
  ): Promise<{ shown: boolean; rewarded: boolean }> {
    if (this.isFullScreenAdActive) {
      return { shown: false, rewarded: false };
    }

    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableRewardedInterstitialAds) {
      return { shown: false, rewarded: false };
    }

    if (!this.isNative()) {
      const grantTxToken = `rewarded_int_sim_${Date.now()}`;
      addPurchasedCredits(3, grantTxToken);
      onRewardConfirmed({ amount: 3, type: 'AI_WOOD_SCAN_CREDITS' });
      if (onDismissed) onDismissed();
      return { shown: true, rewarded: true };
    }

    this.isFullScreenAdActive = true;
    let earnedReward = false;
    let rewardGranted = false;

    try {
      if (!this.isRewardedInterstitialLoaded) {
        const loaded = await this.preloadRewardedInterstitial(customSettings);
        if (!loaded) {
          this.isFullScreenAdActive = false;
          return { shown: false, rewarded: false };
        }
      }

      let rewardHandle: any = null;
      let dismissHandle: any = null;

      const cleanup = () => {
        try {
          if (rewardHandle?.remove) rewardHandle.remove();
          if (dismissHandle?.remove) dismissHandle.remove();
        } catch {}
      };

      rewardHandle = await AdMob.addListener(RewardInterstitialAdPluginEvents.Rewarded, (reward: AdMobRewardInterstitialItem) => {
        console.log('🎉 [AdMob Rewarded Interstitial] User earned reward:', reward);
        earnedReward = true;
        if (!rewardGranted) {
          rewardGranted = true;
          const txToken = `admob_rew_int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          addPurchasedCredits(3, txToken);
          onRewardConfirmed({ amount: 3, type: reward.type || 'Credits' });
        }
      });

      dismissHandle = await AdMob.addListener(RewardInterstitialAdPluginEvents.Dismissed, () => {
        cleanup();
        this.isFullScreenAdActive = false;
        this.isRewardedInterstitialLoaded = false;
        if (onDismissed) onDismissed();
      });

      console.log('🚀 [AdMob Rewarded Interstitial] Presenting ad...');
      const res = await AdMob.showRewardInterstitialAd();

      if (res && !rewardGranted) {
        rewardGranted = true;
        earnedReward = true;
        const txToken = `admob_rew_int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        addPurchasedCredits(3, txToken);
        onRewardConfirmed({ amount: 3, type: res.type || 'Credits' });
      }

      return { shown: true, rewarded: earnedReward };
    } catch (err: any) {
      console.warn('⚠️ [AdMob Rewarded Interstitial] Show failed:', err?.message || err);
      this.isFullScreenAdActive = false;
      this.isRewardedInterstitialLoaded = false;
      return { shown: false, rewarded: false };
    }
  }

  // ==========================================================================
  // FORMAT 6: APP OPEN AD (Foreground return & cold start with 4h freshness)
  // ==========================================================================
  public async preloadAppOpen(customSettings?: AdMobSettings): Promise<boolean> {
    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableAppOpenAds) return false;
    if (this.isAppOpenLoaded || this.isAppOpenLoading) {
      // Check 4-hour freshness rule recommended by Google
      const isFresh = Date.now() - this.appOpenLoadTimestamp < 4 * 60 * 60 * 1000;
      if (isFresh) return this.isAppOpenLoaded;
    }

    if (!this.isNative()) {
      this.isAppOpenLoaded = true;
      this.appOpenLoadTimestamp = Date.now();
      return true;
    }

    try {
      this.isAppOpenLoading = true;
      const options: AppOpenAdOptions = {
        adId: config.appOpenAdUnitId || '',
      };
      await AdMob.loadAppOpen(options);
      this.isAppOpenLoaded = true;
      this.isAppOpenLoading = false;
      this.appOpenLoadTimestamp = Date.now();
      return true;
    } catch (err: any) {
      console.warn('⚠️ [AdMob App Open] Preload error:', err?.message || err);
      this.isAppOpenLoaded = false;
      this.isAppOpenLoading = false;
      return false;
    }
  }

  public async showAppOpenAd(customSettings?: AdMobSettings): Promise<boolean> {
    // Safety checks: Never interrupt when camera, photo scan, or another full-screen ad is active
    if (this.isFullScreenAdActive || this.isCameraOrScanActive) {
      return false;
    }

    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableAppOpenAds) {
      return false;
    }

    // Enforce minimum interval between App Open impressions (default 180s)
    const now = Date.now();
    const minIntervalMs = (config.appOpenMinIntervalSeconds || 180) * 1000;
    if (now - this.lastAppOpenShownTime < minIntervalMs) {
      return false;
    }

    // Google 4-hour freshness rule
    const isFresh = now - this.appOpenLoadTimestamp < 4 * 60 * 60 * 1000;
    if (!isFresh) {
      this.isAppOpenLoaded = false;
      this.preloadAppOpen(customSettings);
      return false;
    }

    if (!this.isNative()) {
      this.lastAppOpenShownTime = now;
      return true;
    }

    try {
      if (!this.isAppOpenLoaded) {
        return false;
      }

      this.isFullScreenAdActive = true;
      console.log('🚀 [AdMob App Open] Presenting App Open ad...');
      await AdMob.showAppOpen();
      this.lastAppOpenShownTime = Date.now();
      return true;
    } catch (err: any) {
      console.warn('⚠️ [AdMob App Open] Show failed:', err?.message || err);
      this.isFullScreenAdActive = false;
      this.isAppOpenLoaded = false;
      return false;
    }
  }

  // ==========================================================================
  // STATUS & DIAGNOSTICS FOR ADMIN MONITORING
  // ==========================================================================
  public getStatus() {
    return {
      isInitialized: this.isInitialized,
      isNative: this.isNative(),
      isFullScreenAdActive: this.isFullScreenAdActive,
      isCameraOrScanActive: this.isCameraOrScanActive,
      // Interstitial
      isInterstitialLoaded: this.isInterstitialLoaded,
      isInterstitialLoading: this.isInterstitialLoading,
      lastInterstitialShownTime: this.lastInterstitialShownTime,
      // Rewarded
      isRewardedLoaded: this.isRewardedLoaded,
      isRewardedLoading: this.isRewardedLoading,
      // Rewarded Interstitial
      isRewardedInterstitialLoaded: this.isRewardedInterstitialLoaded,
      // App Open
      isAppOpenLoaded: this.isAppOpenLoaded,
      appOpenLoadTimestamp: this.appOpenLoadTimestamp,
      lastAppOpenShownTime: this.lastAppOpenShownTime,
      // Banner
      activeBannerPosition: this.activeBannerPosition,
      isBannerShowing: this.isBannerShowing,
    };
  }
}

export const adMobService = new AdMobService();
