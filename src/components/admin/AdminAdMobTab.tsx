import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  DollarSign,
  Layers,
  FileText,
  Smartphone,
  Eye,
  Info,
  Clock,
  ExternalLink,
  Award,
  Maximize2,
  Layout,
  Video,
  BarChart2,
  TrendingUp,
} from 'lucide-react';
import { BusinessSettings, AdMobSettings } from '../../types.ts';
import {
  ADMOB_TEST_IDS,
  ADMOB_PRODUCTION_IDS,
  ADMOB_PUBLISHER_ID,
  DEFAULT_ADMOB_SETTINGS,
  getActiveAdMobSettings,
  saveLocalAdMobSettings,
  validateAdMobIdMismatch,
} from '../../lib/admob/admobConfig.ts';
import { adMobService } from '../../lib/admob/admobService.ts';

interface AdminAdMobTabProps {
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => Promise<void>;
}

export const AdminAdMobTab: React.FC<AdminAdMobTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const currentAdSettings: AdMobSettings = settings.adSettings || getActiveAdMobSettings();
  const [form, setForm] = useState<AdMobSettings>({
    enabled: currentAdSettings.enabled ?? true,
    testMode: currentAdSettings.testMode ?? true,
    appId: currentAdSettings.appId || ADMOB_PRODUCTION_IDS.APP_ID,
    bannerAdUnitId: currentAdSettings.bannerAdUnitId || ADMOB_PRODUCTION_IDS.BANNER,
    interstitialAdUnitId: currentAdSettings.interstitialAdUnitId || ADMOB_PRODUCTION_IDS.INTERSTITIAL,
    rewardedAdUnitId: currentAdSettings.rewardedAdUnitId || ADMOB_PRODUCTION_IDS.REWARDED,
    rewardedInterstitialAdUnitId: currentAdSettings.rewardedInterstitialAdUnitId || ADMOB_PRODUCTION_IDS.REWARDED_INTERSTITIAL,
    nativeAdUnitId: currentAdSettings.nativeAdUnitId || ADMOB_PRODUCTION_IDS.NATIVE,
    appOpenAdUnitId: currentAdSettings.appOpenAdUnitId || ADMOB_PRODUCTION_IDS.APP_OPEN,
    enableBanners: currentAdSettings.enableBanners ?? true,
    enableInterstitials: currentAdSettings.enableInterstitials ?? true,
    enableRewardedAds: currentAdSettings.enableRewardedAds ?? true,
    enableRewardedInterstitialAds: currentAdSettings.enableRewardedInterstitialAds ?? true,
    enableCatalogNativeAds: currentAdSettings.enableCatalogNativeAds ?? true,
    enableAppOpenAds: currentAdSettings.enableAppOpenAds ?? true,
    catalogNativeAdFrequency: currentAdSettings.catalogNativeAdFrequency || 6,
    interstitialMinIntervalSeconds: currentAdSettings.interstitialMinIntervalSeconds || 45,
    appOpenMinIntervalSeconds: currentAdSettings.appOpenMinIntervalSeconds || 180,
    maxInterstitialsPerSession: currentAdSettings.maxInterstitialsPerSession ?? 4,
    maxAppOpenPerSession: currentAdSettings.maxAppOpenPerSession ?? 2,
    enableNavTransitionInterstitials: currentAdSettings.enableNavTransitionInterstitials ?? true,
    navTransitionMinViews: currentAdSettings.navTransitionMinViews ?? 4,
    enableArticlesNativeAds: currentAdSettings.enableArticlesNativeAds ?? true,
    articlesNativeAdFrequency: currentAdSettings.articlesNativeAdFrequency ?? 3,
    enableVisualizerRewardedBonus: currentAdSettings.enableVisualizerRewardedBonus ?? true,
    bannerHome: currentAdSettings.bannerHome ?? true,
    bannerCatalog: currentAdSettings.bannerCatalog ?? true,
    bannerCalculator: currentAdSettings.bannerCalculator ?? true,
    bannerChaukhat: currentAdSettings.bannerChaukhat ?? true,
    bannerDetail: currentAdSettings.bannerDetail ?? true,
    bannerVisualizer: currentAdSettings.bannerVisualizer ?? true,
    bannerArticles: currentAdSettings.bannerArticles ?? true,
    bannerTracking: currentAdSettings.bannerTracking ?? true,
    bannerSaved: currentAdSettings.bannerSaved ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [, setAnalyticsTick] = useState(0);

  const handleResetAnalytics = () => {
    adMobService.resetAnalytics();
    setAnalyticsTick((prev) => prev + 1);
    setTestStatus('AdMob local performance analytics reset.');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setTestStatus(null);
    try {
      const updatedBusinessSettings: BusinessSettings = {
        ...settings,
        adSettings: form,
      };
      await onUpdateSettings(updatedBusinessSettings);
      saveLocalAdMobSettings(form);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      alert('Failed to save AdMob settings: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleSetProductionDefaults = () => {
    setForm({
      ...form,
      testMode: false,
      appId: ADMOB_PRODUCTION_IDS.APP_ID,
      bannerAdUnitId: ADMOB_PRODUCTION_IDS.BANNER,
      interstitialAdUnitId: ADMOB_PRODUCTION_IDS.INTERSTITIAL,
      rewardedAdUnitId: ADMOB_PRODUCTION_IDS.REWARDED,
      rewardedInterstitialAdUnitId: ADMOB_PRODUCTION_IDS.REWARDED_INTERSTITIAL,
      nativeAdUnitId: ADMOB_PRODUCTION_IDS.NATIVE,
      appOpenAdUnitId: ADMOB_PRODUCTION_IDS.APP_OPEN,
    });
    setTestStatus('Loaded all 6 official Production AdMob IDs (ca-app-pub-2305048922926538). Save settings to commit.');
  };

  const handleResetToTestDefaults = () => {
    setForm({
      ...DEFAULT_ADMOB_SETTINGS,
      testMode: true,
      appId: ADMOB_TEST_IDS.APP_ID,
      bannerAdUnitId: ADMOB_TEST_IDS.BANNER,
      interstitialAdUnitId: ADMOB_TEST_IDS.INTERSTITIAL,
      rewardedAdUnitId: ADMOB_TEST_IDS.REWARDED,
      rewardedInterstitialAdUnitId: ADMOB_TEST_IDS.REWARDED_INTERSTITIAL,
      nativeAdUnitId: ADMOB_TEST_IDS.NATIVE,
      appOpenAdUnitId: ADMOB_TEST_IDS.APP_OPEN,
    });
    setTestStatus('Loaded Google official sample test Ad Unit IDs. Zero policy risk during development.');
  };

  // Test Handlers for each format (Explicit manual diagnostic test clicks in settings tab)
  const handleTestInterstitial = async () => {
    setTestStatus('Testing Interstitial Ad (Format 2)...');
    try {
      await adMobService.showQuotationInterstitial(() => {
        setTestStatus('✅ Interstitial ad completed/dismissed successfully.');
      }, form, 5000, true);
    } catch (err: any) {
      setTestStatus('❌ Interstitial test error: ' + (err.message || err));
    }
  };

  const handleTestRewarded = async () => {
    setTestStatus('Testing Rewarded Video Ad (Format 3)...');
    try {
      const result = await adMobService.showRewardedAd(
        (reward) => {
          setTestStatus(`✅ Rewarded video completed! User verified reward: +${reward.amount || 3} Credits.`);
        },
        () => {
          // dismissed
        },
        form,
        true
      );
      if (!result.shown) {
        setTestStatus('⚠️ Rewarded ad not shown or still preparing. Check network.');
      }
    } catch (err: any) {
      setTestStatus('❌ Rewarded test error: ' + (err.message || err));
    }
  };

  const handleTestRewardedInterstitial = async () => {
    setTestStatus('Testing Rewarded Interstitial Ad (Format 4)...');
    try {
      const result = await adMobService.showRewardedInterstitialAd(
        (reward) => {
          setTestStatus(`✅ Rewarded interstitial completed! User reward verified: +${reward.amount || 3} Credits.`);
        },
        () => {},
        form,
        true
      );
      if (!result.shown) {
        setTestStatus('⚠️ Rewarded interstitial not shown or still preparing.');
      }
    } catch (err: any) {
      setTestStatus('❌ Rewarded interstitial error: ' + (err.message || err));
    }
  };

  const handleTestAppOpen = async () => {
    setTestStatus('Testing App Open Ad (Format 6)...');
    try {
      const shown = await adMobService.showAppOpenAd(form, true);
      setTestStatus(shown ? '✅ App Open Ad presented successfully.' : '⚠️ App Open Ad skipped (frequency cap, freshness, or busy context).');
    } catch (err: any) {
      setTestStatus('❌ App Open Ad error: ' + (err.message || err));
    }
  };

  const handlePreloadAll = async () => {
    setTestStatus('Preloading all full-screen AdMob formats in background...');
    const [intOk, rewOk, appOpenOk] = await Promise.all([
      adMobService.preloadInterstitial(form, true),
      adMobService.preloadRewarded(form, true),
      adMobService.preloadAppOpen(form, true),
    ]);
    setTestStatus(`Preload results: Interstitial: ${intOk ? 'Ready' : 'Failed'}, Rewarded: ${rewOk ? 'Ready' : 'Failed'}, AppOpen: ${appOpenOk ? 'Ready' : 'Failed'}`);
  };

  const status = adMobService.getStatus();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E5E5] gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF7E3] border border-[#C89211]/30 text-[#C89211] text-xs font-semibold uppercase mb-1">
            <DollarSign className="w-3.5 h-3.5 text-[#C89211]" />
            <span>Complete 6-Format AdMob Integration</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A]">
            Google AdMob Monetization (All 6 Formats)
          </h3>
          <p className="text-xs sm:text-sm text-[#666666] mt-0.5">
            Configure Banner, Interstitial, Rewarded Video, Rewarded Interstitial, Native Advanced, and App Open ads for package <code className="font-mono text-stone-800">com.doorstudio.ai</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSetProductionDefaults}
            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C89211]" />
            <span>Load Production IDs</span>
          </button>
          <button
            type="button"
            onClick={handleResetToTestDefaults}
            className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] text-xs font-semibold border border-[#E5E5E5] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Use Google Test IDs</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#C89211] hover:bg-[#b07d08] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
          >
            {saving ? 'Saving...' : 'Save AdMob Settings'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>All 6 AdMob format configurations saved and synchronized successfully!</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Controls & All 6 Format IDs */}
        <div className="lg:col-span-2 space-y-6">

          {/* Master Toggles Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C89211]" />
              <span>AdMob Format Feature Toggles</span>
            </h4>

            <div className="space-y-3 divide-y divide-stone-100 text-xs">
              
              {/* Global Enable */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Enable Ads Globally</p>
                  <p className="text-[#666666] text-[11px]">Master on/off switch for all mobile advertisements in the app</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={e => setForm({ ...form, enabled: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Test Mode */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                    <span>AdMob Test Mode</span>
                    {form.testMode ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Safe For Dev
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Live Production
                      </span>
                    )}
                  </p>
                  <p className="text-[#666666] text-[11px]">
                    When enabled, uses Google's official sample IDs to safely verify callbacks without account strikes.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.testMode}
                  onChange={e => setForm({ ...form, testMode: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Format 1: Banners Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">1. Adaptive Banner Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Displays adaptive banners with safe layout clearance above bottom navigation
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableBanners}
                  onChange={e => setForm({ ...form, enableBanners: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Format 2: Interstitials Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">2. Quotation Interstitial Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Natural break transition when user generates official quotation PDF
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableInterstitials}
                  onChange={e => setForm({ ...form, enableInterstitials: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Format 3: Rewarded Ads Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">3. Rewarded Video Ads (+3 Free Credits)</p>
                  <p className="text-[#666666] text-[11px]">
                    Optional user action: watch short video ad to earn +3 Free AI Wood Scan Credits
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableRewardedAds}
                  onChange={e => setForm({ ...form, enableRewardedAds: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Format 4: Rewarded Interstitial Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">4. Rewarded Interstitial Ads (+3 Free Credits)</p>
                  <p className="text-[#666666] text-[11px]">
                    Opt-in interactive sponsor with countdown disclosure for +3 Free AI Scan Credits
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableRewardedInterstitialAds}
                  onChange={e => setForm({ ...form, enableRewardedInterstitialAds: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Format 5: Native Advanced Ads Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">5. Catalog Native Advanced Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Policy-compliant sponsored editorial cards in the door gallery with required "Ad" badges
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableCatalogNativeAds}
                  onChange={e => setForm({ ...form, enableCatalogNativeAds: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              {/* Format 6: App Open Ads Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">6. App Open Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Shown when returning to foreground or cold launch with 4-hour freshness rule
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableAppOpenAds}
                  onChange={e => setForm({ ...form, enableAppOpenAds: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

            </div>
          </div>

          {/* Smart Ad Frequency & Session Limits Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C89211]" />
              <span>Smart Ad Frequency &amp; Session Management</span>
            </h4>
            <p className="text-[#666666] text-xs leading-relaxed">
              Enforce policy-compliant frequency caps and session limits so ads appear only at natural transition points without overwhelming users.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Max Interstitials Per Session:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.maxInterstitialsPerSession ?? 4}
                  onChange={e => setForm({ ...form, maxInterstitialsPerSession: Math.max(1, parseInt(e.target.value) || 4) })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">Recommended: 3 to 5 ads per user session</p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Min Interval Between Interstitials (Sec):
                </label>
                <input
                  type="number"
                  min="20"
                  max="300"
                  value={form.interstitialMinIntervalSeconds || 45}
                  onChange={e => setForm({ ...form, interstitialMinIntervalSeconds: Math.max(20, parseInt(e.target.value) || 45) })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">Cooldown between full-screen ads (Default: 45s)</p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Max App Open Ads Per Session:
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={form.maxAppOpenPerSession ?? 2}
                  onChange={e => setForm({ ...form, maxAppOpenPerSession: Math.max(1, parseInt(e.target.value) || 2) })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">Safe limit on foreground return ads (Default: 2)</p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Min Interval for App Open Ads (Sec):
                </label>
                <input
                  type="number"
                  min="60"
                  max="600"
                  value={form.appOpenMinIntervalSeconds || 180}
                  onChange={e => setForm({ ...form, appOpenMinIntervalSeconds: Math.max(60, parseInt(e.target.value) || 180) })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">Enforces 3-minute gap between foreground ads</p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Catalog Native Ad Frequency (Doors):
                </label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={form.catalogNativeAdFrequency || 6}
                  onChange={e => setForm({ ...form, catalogNativeAdFrequency: Math.max(3, parseInt(e.target.value) || 6) })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">Insert a sponsored native card every N doors (Default: 6)</p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Articles Native Ad Frequency (Guides):
                </label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={form.articlesNativeAdFrequency ?? 3}
                  onChange={e => setForm({ ...form, articlesNativeAdFrequency: Math.max(2, parseInt(e.target.value) || 3) })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">Insert a sponsored card every N articles (Default: 3)</p>
              </div>
            </div>

            {/* Natural Section Transitions & Rewarded Toggles */}
            <div className="pt-3 border-t border-stone-100 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Section Navigation Transition Interstitials</p>
                  <p className="text-[#666666] text-[11px]">
                    Display interstitial ad at natural transition breaks when navigating between major app screens
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableNavTransitionInterstitials !== false}
                  onChange={e => setForm({ ...form, enableNavTransitionInterstitials: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Articles &amp; Blog Native Sponsored Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Display sponsored editorial partner cards in the woodworking guides &amp; articles feed
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableArticlesNativeAds !== false}
                  onChange={e => setForm({ ...form, enableArticlesNativeAds: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">3D Studio 4K Lighting Rewarded Video Bonus</p>
                  <p className="text-[#666666] text-[11px]">
                    Offer optional opt-in rewarded video to unlock 4K architectural lighting &amp; reflections in 3D viewer
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableVisualizerRewardedBonus !== false}
                  onChange={e => setForm({ ...form, enableVisualizerRewardedBonus: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Granular Screen Banner Placements Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Layout className="w-4 h-4 text-[#C89211]" />
              <span>Banner Placements by Screen</span>
            </h4>
            <p className="text-[#666666] text-xs leading-relaxed">
              Enable or disable responsive adaptive banners for specific screens. Banners include fixed bottom clearance to avoid covering navigation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
              {[
                { key: 'bannerHome', label: 'Home Screen', desc: 'Above trust badge section' },
                { key: 'bannerCatalog', label: 'Door Catalog & Gallery', desc: 'Bottom of catalog grid' },
                { key: 'bannerCalculator', label: 'Door Price Calculator', desc: 'Below itemized price breakdown' },
                { key: 'bannerChaukhat', label: 'Chaukhat Frame Calculator', desc: 'Below frame estimation total' },
                { key: 'bannerDetail', label: 'Door Detail Modal', desc: 'Below specifications table' },
                { key: 'bannerVisualizer', label: '3D & AR Door Visualizer', desc: 'Bottom of studio viewer' },
                { key: 'bannerArticles', label: 'Wood Articles & Guides', desc: 'Bottom of feed and reader' },
                { key: 'bannerTracking', label: 'Order Tracking Screen', desc: 'Below live dispatch timeline' },
                { key: 'bannerSaved', label: 'Saved Doors & Favorites', desc: 'Bottom of profile modal' },
              ].map(item => (
                <label
                  key={item.key}
                  className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 bg-stone-50/50 flex items-start justify-between gap-3 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-semibold text-stone-900 block">{item.label}</span>
                    <span className="text-[11px] text-stone-500">{item.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={(form as any)[item.key] !== false}
                    onChange={e => setForm({ ...form, [item.key]: e.target.checked })}
                    className="w-4 h-4 mt-0.5 accent-[#C89211] rounded cursor-pointer shrink-0"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Ad Unit IDs Configuration (All 6 Formats) */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#C89211]" />
                <span>All 6 Google AdMob Production &amp; Test Ad Unit IDs</span>
              </h4>
              <span className="text-[11px] text-[#666666] font-mono">com.doorstudio.ai</span>
            </div>

            <div className="space-y-3.5 text-xs">
              
              {/* App ID */}
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  AdMob Android Application ID:
                </label>
                <input
                  type="text"
                  value={form.appId}
                  onChange={e => setForm({ ...form, appId: e.target.value.trim() })}
                  placeholder="ca-app-pub-2305048922926538~7688035209"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                {validateAdMobIdMismatch('appId', form.appId || '') && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validateAdMobIdMismatch('appId', form.appId || '')}</span>
                  </p>
                )}
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Production: <code className="text-[#C89211] font-mono">ca-app-pub-2305048922926538~7688035209</code>
                </p>
              </div>

              {/* 1. Banner Ad */}
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  1. Banner Ad Unit ID:
                </label>
                <input
                  type="text"
                  value={form.bannerAdUnitId}
                  onChange={e => setForm({ ...form, bannerAdUnitId: e.target.value.trim() })}
                  placeholder="ca-app-pub-2305048922926538/1465835268"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Production: <code className="text-[#C89211] font-mono">ca-app-pub-2305048922926538/1465835268</code>
                </p>
              </div>

              {/* 2. Interstitial Ad */}
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  2. Interstitial Ad Unit ID (Quotation Natural Break):
                </label>
                <input
                  type="text"
                  value={form.interstitialAdUnitId}
                  onChange={e => setForm({ ...form, interstitialAdUnitId: e.target.value.trim() })}
                  placeholder="ca-app-pub-2305048922926538/9911387219"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Production: <code className="text-[#C89211] font-mono">ca-app-pub-2305048922926538/9911387219</code>
                </p>
              </div>

              {/* 3. Rewarded Video Ad */}
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  3. Rewarded Video Ad Unit ID (+3 AI Scan Credits):
                </label>
                <input
                  type="text"
                  value={form.rewardedAdUnitId}
                  onChange={e => setForm({ ...form, rewardedAdUnitId: e.target.value.trim() })}
                  placeholder="ca-app-pub-2305048922926538/5315122927"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Production: <code className="text-[#C89211] font-mono">ca-app-pub-2305048922926538/5315122927</code>
                </p>
              </div>

              {/* 4. Rewarded Interstitial Ad */}
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  4. Rewarded Interstitial Ad Unit ID (+3 AI Scan Credits):
                </label>
                <input
                  type="text"
                  value={form.rewardedInterstitialAdUnitId}
                  onChange={e => setForm({ ...form, rewardedInterstitialAdUnitId: e.target.value.trim() })}
                  placeholder="ca-app-pub-2305048922926538/9719815523"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Production: <code className="text-[#C89211] font-mono">ca-app-pub-2305048922926538/9719815523</code>
                </p>
              </div>

              {/* 5. Native Advanced Ad */}
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  5. Native Advanced Ad Unit ID (Door Catalog Grid):
                </label>
                <input
                  type="text"
                  value={form.nativeAdUnitId}
                  onChange={e => setForm({ ...form, nativeAdUnitId: e.target.value.trim() })}
                  placeholder="ca-app-pub-2305048922926538/1274349298"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Production: <code className="text-[#C89211] font-mono">ca-app-pub-2305048922926538/1274349298</code>
                </p>
              </div>

              {/* 6. App Open Ad */}
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  6. App Open Ad Unit ID (Launch &amp; Foreground Return):
                </label>
                <input
                  type="text"
                  value={form.appOpenAdUnitId}
                  onChange={e => setForm({ ...form, appOpenAdUnitId: e.target.value.trim() })}
                  placeholder="ca-app-pub-2305048922926538/8352349801"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Production: <code className="text-[#C89211] font-mono">ca-app-pub-2305048922926538/8352349801</code>
                </p>
              </div>

            </div>
          </div>

          {/* app-ads.txt Digital Asset Verification */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Authorized Digital Sellers (app-ads.txt)</span>
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Verified
              </span>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              Google AdMob crawler verifies your developer domain inventory at <strong className="text-[#1A1A1A]">https://jaihanumandoor.com/app-ads.txt</strong>.
            </p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-800 break-all select-all">
              google.com, {ADMOB_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0
            </div>
          </div>

        </div>

        {/* Right Column: Diagnostic Tester for All 6 Formats */}
        <div className="space-y-6">
          
          <div className="p-5 rounded-2xl bg-stone-900 text-stone-100 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-400" />
              <span>All 6 Formats Diagnostic Tester</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">Environment:</span>
                <span className="font-semibold text-stone-200">
                  {status.isNative ? 'Android Native (Capacitor)' : 'Web Browser / Preview'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">SDK Initialized:</span>
                <span className={status.isInitialized ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {status.isInitialized ? 'Yes (Active)' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">Interstitial:</span>
                <span className={status.isInterstitialLoaded ? 'text-emerald-400 font-semibold' : 'text-stone-400'}>
                  {status.isInterstitialLoaded ? 'Ready' : (status.isInterstitialLoading ? 'Loading...' : 'Idle')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">Rewarded Video:</span>
                <span className={status.isRewardedLoaded ? 'text-emerald-400 font-semibold' : 'text-stone-400'}>
                  {status.isRewardedLoaded ? 'Ready' : (status.isRewardedLoading ? 'Loading...' : 'Idle')}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">App Open:</span>
                <span className={status.isAppOpenLoaded ? 'text-emerald-400 font-semibold' : 'text-stone-400'}>
                  {status.isAppOpenLoaded ? 'Ready' : 'Idle'}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handlePreloadAll}
                className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
              >
                <span>Preload All Full-Screen Ads</span>
              </button>

              <button
                type="button"
                onClick={handleTestInterstitial}
                className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
              >
                <span>Test 2. Interstitial Ad</span>
              </button>

              <button
                type="button"
                onClick={handleTestRewarded}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm active:scale-98"
              >
                <span>Test 3. Rewarded Video (+3 Cr)</span>
              </button>

              <button
                type="button"
                onClick={handleTestRewardedInterstitial}
                className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
              >
                <span>Test 4. Rewarded Interstitial (+3 Cr)</span>
              </button>

              <button
                type="button"
                onClick={handleTestAppOpen}
                className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
              >
                <span>Test 6. App Open Ad</span>
              </button>
            </div>

            {testStatus && (
              <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-300 font-mono leading-relaxed break-words">
                {testStatus}
              </div>
            )}
          </div>

          {/* Monetization & Performance Analytics Dashboard */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#C89211]" />
                <span>Monetization & Health Analytics</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Live
              </span>
            </div>

            <p className="text-xs text-[#666666] leading-relaxed">
              Monitored session ad impressions, user reward verifications, and SDK delivery health across all 6 formats.
            </p>

            {/* Active Session Guardrails */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Current Session Guardrails
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Interstitials Shown:</span>
                  <span className="font-bold text-stone-900">
                    {status.sessionInterstitialCount} / {form.maxInterstitialsPerSession} cap
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">App Open Shown:</span>
                  <span className="font-bold text-stone-900">
                    {status.sessionAppOpenCount} / {form.maxAppOpenPerSession} cap
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-stone-200 col-span-2">
                  <span className="text-stone-500 block text-[10px]">Section Views:</span>
                  <span className="font-bold text-stone-900">
                    {status.navigationViewCount} views (interstitial every {form.navTransitionMinViews} screens)
                  </span>
                </div>
              </div>
            </div>

            {/* Format Impressions Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-700">
                <span>Impressions by Format</span>
                <span className="text-stone-400 font-normal">Aggregated</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Banner</span>
                  <span className="font-bold text-[#C89211] text-sm">
                    {status.analytics?.impressions?.banner || 0}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Native</span>
                  <span className="font-bold text-[#C89211] text-sm">
                    {status.analytics?.impressions?.native || 0}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Interstitial</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {status.analytics?.impressions?.interstitial || 0}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Rewarded</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {status.analytics?.impressions?.rewarded || 0}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Rew. Interstitial</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {status.analytics?.impressions?.rewarded_interstitial || 0}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">App Open</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {status.analytics?.impressions?.app_open || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Health & Verified Rewards */}
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-amber-950 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  Verified User Rewards:
                </span>
                <span className="font-bold text-amber-900 text-sm">
                  {status.analytics?.rewards || 0} granted
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-600 pt-1 border-t border-amber-200/50">
                <span>SDK Load Successes:</span>
                <span className="font-semibold text-emerald-700">{status.analytics?.loads?.success || 0}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-600">
                <span>Load Fails / No Fill:</span>
                <span className="font-semibold text-stone-700">
                  {(status.analytics?.loads?.fail || 0) + (status.analytics?.loads?.no_fill || 0)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAnalytics}
              className="w-full py-2 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-stone-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Local Analytics Counters</span>
            </button>
          </div>

          {/* AdMob Policy & Safeguards Summary */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>AdMob 6-Format Compliance Rules</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-amber-900 leading-relaxed list-disc list-inside">
              <li><strong>1. Banner:</strong> Fixed 72px clearance prevents covering bottom navigation.</li>
              <li><strong>2. Interstitial:</strong> Limited to natural quotation transitions with 45s frequency cap.</li>
              <li><strong>3. Rewarded:</strong> +3 Credits awarded only after verified video completion callback.</li>
              <li><strong>4. Rewarded Interstitial:</strong> Full opt-in and countdown disclosure before award.</li>
              <li><strong>5. Native Advanced:</strong> Clear "Ad / Sponsored Partner" badges. Never disguised as door models.</li>
              <li><strong>6. App Open:</strong> Suppressed during camera, AI scans, or active checkout. 4h freshness check.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
