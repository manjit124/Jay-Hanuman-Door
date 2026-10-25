import {
  AdMob,
  BannerAdSize,
  BannerAdPosition,
  InterstitialAdPluginEvents,
  BannerAdPluginEvents,
  AdOptions,
} from '@capacitor-community/admob';
import { AdMobSettings } from '../../types.ts';
import { getActiveAdMobSettings } from './admobConfig.ts';

class AdMobService {
  private isInitialized = false;
  private isInitializing = false;
  private isInterstitialLoading = false;
  private isInterstitialLoaded = false;
  private lastInterstitialShownTime = 0;
  private isAdInProgress = false;
  private activeBannerPosition: 'top' | 'bottom' | null = null;
  private listenersRegistered = false;

  public isNative(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).Capacitor?.isNativePlatform?.() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && Boolean((window as any).Capacitor))
    );
  }

  /**
   * Initializes Google Mobile Ads SDK once at app launch.
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
      console.log('🌐 [AdMob] Web environment detected. Native AdMob calls will be safely mocked.');
      this.isInitialized = true;
      this.isInitializing = false;
      return;
    }

    try {
      console.log('📱 [AdMob] Initializing Google Mobile Ads SDK for Android...');
      await AdMob.initialize({
        testingDevices: ['2077ef8a63d52868702e54201d579520'],
        initializeForTesting: config.testMode,
      });

      this.registerEventListeners();
      this.isInitialized = true;
      console.log('✅ [AdMob] SDK initialized successfully.');

      // Preload the first interstitial ad so it is ready for quotation generation
      if (config.enableInterstitials) {
        this.preloadInterstitial(customSettings);
      }
    } catch (err: any) {
      console.warn('⚠️ [AdMob] Initialization warning (app will continue normally):', err.message || err);
      // Still set initialized to true so that ad calls fail gracefully without blocking user actions
      this.isInitialized = true;
    } finally {
      this.isInitializing = false;
    }
  }

  private registerEventListeners(): void {
    if (this.listenersRegistered || !this.isNative()) return;
    this.listenersRegistered = true;

    try {
      AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
        console.log('🎯 [AdMob] Interstitial ad preloaded and ready.');
        this.isInterstitialLoaded = true;
        this.isInterstitialLoading = false;
      });

      AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (info) => {
        console.warn('⚠️ [AdMob] Interstitial failed to preload:', info);
        this.isInterstitialLoaded = false;
        this.isInterstitialLoading = false;
      });

      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        console.log('🚪 [AdMob] Interstitial dismissed by user.');
        this.isInterstitialLoaded = false;
        this.lastInterstitialShownTime = Date.now();
        // Preload next interstitial in background
        setTimeout(() => this.preloadInterstitial(), 1500);
      });

      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (info) => {
        console.warn('⚠️ [AdMob] Interstitial failed to show:', info);
        this.isInterstitialLoaded = false;
        this.lastInterstitialShownTime = Date.now();
      });
    } catch (err) {
      console.warn('Could not register AdMob event listeners:', err);
    }
  }

  /**
   * Preloads an interstitial ad ahead of time.
   */
  public async preloadInterstitial(customSettings?: AdMobSettings): Promise<boolean> {
    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableInterstitials) return false;
    if (this.isInterstitialLoaded || this.isInterstitialLoading) return this.isInterstitialLoaded;

    if (!this.isNative()) {
      // In web preview, mark as ready for mock simulation
      this.isInterstitialLoaded = true;
      return true;
    }

    try {
      this.isInterstitialLoading = true;
      console.log('⏳ [AdMob] Preloading interstitial ad with ID:', config.interstitialAdUnitId);
      const options: AdOptions = {
        adId: config.interstitialAdUnitId,
        isTesting: config.testMode,
      };
      await AdMob.prepareInterstitial(options);
      this.isInterstitialLoaded = true;
      this.isInterstitialLoading = false;
      return true;
    } catch (err: any) {
      console.warn('⚠️ [AdMob] Interstitial preload error:', err.message || err);
      this.isInterstitialLoaded = false;
      this.isInterstitialLoading = false;
      return false;
    }
  }

  /**
   * Shows an interstitial ad when user generates a quotation.
   * Guarantees that onDone() is ALWAYS called within safetyTimeoutMs.
   */
  public async showQuotationInterstitial(
    onDone: () => void,
    customSettings?: AdMobSettings,
    safetyTimeoutMs = 3500
  ): Promise<void> {
    let completed = false;
    const safeComplete = () => {
      if (!completed) {
        completed = true;
        this.isAdInProgress = false;
        onDone();
      }
    };

    // If an ad is already showing or user clicked repeatedly, finish immediately
    if (this.isAdInProgress) {
      safeComplete();
      return;
    }

    const config = getActiveAdMobSettings(customSettings);

    // 1. Check if ads or quotation interstitials are disabled
    if (!config.enabled || !config.enableInterstitials) {
      safeComplete();
      return;
    }

    // 2. Enforce frequency capping (minimum interval between interstitials)
    const now = Date.now();
    const minIntervalMs = (config.interstitialMinIntervalSeconds || 45) * 1000;
    if (now - this.lastInterstitialShownTime < minIntervalMs) {
      console.log(`⏱️ [AdMob] Frequency cap active (${Math.round((minIntervalMs - (now - this.lastInterstitialShownTime)) / 1000)}s remaining). Skipping ad.`);
      safeComplete();
      return;
    }

    this.isAdInProgress = true;

    // 3. Safety timeout: never block the quotation screen indefinitely
    const timeoutHandle = setTimeout(() => {
      if (!completed) {
        console.warn('⚠️ [AdMob] Safety timeout reached. Showing quotation immediately.');
        safeComplete();
      }
    }, safetyTimeoutMs);

    // 4. In Web browser / non-native mode: proceed immediately without delay
    if (!this.isNative()) {
      clearTimeout(timeoutHandle);
      this.lastInterstitialShownTime = now;
      safeComplete();
      return;
    }

    // 5. Native Android Capacitor AdMob presentation
    try {
      // If ad was not preloaded, try a quick preload or proceed immediately
      if (!this.isInterstitialLoaded) {
        console.log('ℹ️ [AdMob] Interstitial was not preloaded; attempting quick load...');
        const loaded = await this.preloadInterstitial(customSettings);
        if (!loaded) {
          clearTimeout(timeoutHandle);
          safeComplete();
          return;
        }
      }

      // Prepare one-time dismissal listener for this specific ad show invocation
      let dismissHandle: any = null;
      let failHandle: any = null;

      const cleanup = () => {
        clearTimeout(timeoutHandle);
        try {
          if (dismissHandle?.remove) dismissHandle.remove();
          if (failHandle?.remove) failHandle.remove();
        } catch {}
      };

      try {
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
      } catch (listenerErr) {
        console.warn('Could not attach temporary listener:', listenerErr);
      }

      console.log('🚀 [AdMob] Presenting quotation interstitial ad...');
      await AdMob.showInterstitial();
    } catch (err: any) {
      console.warn('⚠️ [AdMob] Could not present interstitial:', err.message || err);
      clearTimeout(timeoutHandle);
      safeComplete();
    }
  }

  /**
   * Shows an adaptive banner ad at the top or bottom of the screen.
   * On mobile, adds appropriate margin to prevent covering the 68px BottomNav.
   */
  public async showAdaptiveBanner(
    position: 'top' | 'bottom' = 'bottom',
    customSettings?: AdMobSettings,
    margin = 72 // Default margin 72px so bottom navigation is never covered
  ): Promise<void> {
    const config = getActiveAdMobSettings(customSettings);
    if (!config.enabled || !config.enableBanners) return;
    if (!this.isNative()) return;

    try {
      await this.initialize(customSettings);

      console.log(`📌 [AdMob] Displaying adaptive banner at ${position} (margin: ${margin}px)...`);
      await AdMob.showBanner({
        adId: config.bannerAdUnitId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: position === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
        margin: position === 'bottom' ? margin : 0,
        isTesting: config.testMode,
      });

      this.activeBannerPosition = position;
    } catch (err: any) {
      console.warn('⚠️ [AdMob] Banner display warning:', err.message || err);
    }
  }

  /**
   * Hides or removes the banner ad overlay.
   */
  public async hideAdaptiveBanner(): Promise<void> {
    if (!this.isNative() || !this.activeBannerPosition) return;
    try {
      await AdMob.hideBanner();
      this.activeBannerPosition = null;
    } catch (err) {
      // ignore
    }
  }

  public getStatus() {
    return {
      isInitialized: this.isInitialized,
      isNative: this.isNative(),
      isInterstitialLoaded: this.isInterstitialLoaded,
      isInterstitialLoading: this.isInterstitialLoading,
      lastInterstitialShownTime: this.lastInterstitialShownTime,
      activeBannerPosition: this.activeBannerPosition,
    };
  }
}

export const adMobService = new AdMobService();
