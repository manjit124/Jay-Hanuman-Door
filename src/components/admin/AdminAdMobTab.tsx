import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  DollarSign,
  Smartphone,
  Clock,
  Award,
  Layout,
  BarChart2,
  Crown,
  Users,
  Search,
  RefreshCw,
} from 'lucide-react';
import {
  BusinessSettings,
  AdMobSettings,
  GooglePlayBillingServerStatus,
  PremiumSubscriptionRecord,
  PremiumSubscriptionStats,
} from '../../types.ts';
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
import {
  fetchAdminMonetizationDashboard,
  saveAdminMonetizationConfig,
} from '../../lib/billing/playBillingService.ts';

interface AdminAdMobTabProps {
  settings: BusinessSettings;
  onUpdateSettings: (newSettings: BusinessSettings) => Promise<void>;
}

function normalizeAdForm(source?: Partial<AdMobSettings>): AdMobSettings {
  const base = source || getActiveAdMobSettings();
  return {
    enabled: base.enabled ?? true,
    testMode: base.testMode ?? false,
    appId: base.appId || ADMOB_PRODUCTION_IDS.APP_ID,
    bannerAdUnitId: base.bannerAdUnitId || ADMOB_PRODUCTION_IDS.BANNER,
    interstitialAdUnitId: base.interstitialAdUnitId || ADMOB_PRODUCTION_IDS.INTERSTITIAL,
    rewardedAdUnitId: base.rewardedAdUnitId || ADMOB_PRODUCTION_IDS.REWARDED,
    rewardedInterstitialAdUnitId:
      base.rewardedInterstitialAdUnitId || ADMOB_PRODUCTION_IDS.REWARDED_INTERSTITIAL,
    nativeAdUnitId: base.nativeAdUnitId || ADMOB_PRODUCTION_IDS.NATIVE,
    appOpenAdUnitId: base.appOpenAdUnitId || ADMOB_PRODUCTION_IDS.APP_OPEN,
    enableBanners: base.enableBanners ?? true,
    enableInterstitials: base.enableInterstitials ?? true,
    enableRewardedAds: base.enableRewardedAds ?? true,
    enableRewardedInterstitialAds: base.enableRewardedInterstitialAds ?? true,
    enableCatalogNativeAds: base.enableCatalogNativeAds ?? true,
    enableAppOpenAds: base.enableAppOpenAds ?? true,
    catalogNativeAdFrequency: base.catalogNativeAdFrequency || 6,
    interstitialMinIntervalSeconds: base.interstitialMinIntervalSeconds ?? 180,
    appOpenMinIntervalSeconds: base.appOpenMinIntervalSeconds ?? 180,
    maxInterstitialsPerSession: base.maxInterstitialsPerSession ?? 4,
    maxAppOpenPerSession: base.maxAppOpenPerSession ?? 2,
    enableNavTransitionInterstitials: base.enableNavTransitionInterstitials ?? false,
    navTransitionMinViews: base.navTransitionMinViews ?? 4,
    enableArticlesNativeAds: base.enableArticlesNativeAds ?? true,
    articlesNativeAdFrequency: base.articlesNativeAdFrequency ?? 3,
    enableVisualizerRewardedBonus: base.enableVisualizerRewardedBonus ?? true,
    bannerHome: base.bannerHome ?? true,
    bannerCatalog: base.bannerCatalog ?? true,
    bannerCalculator: base.bannerCalculator ?? true,
    bannerSlidingWindow: base.bannerSlidingWindow ?? true,
    bannerWoodDetector: base.bannerWoodDetector ?? true,
    bannerChaukhat: base.bannerChaukhat ?? true,
    bannerDetail: base.bannerDetail ?? true,
    bannerVisualizer: base.bannerVisualizer ?? true,
    bannerArticles: base.bannerArticles ?? true,
    bannerTracking: base.bannerTracking ?? true,
    bannerSaved: base.bannerSaved ?? true,
    interstitialSlidingWindow: base.interstitialSlidingWindow ?? true,
    interstitialWoodDetector: base.interstitialWoodDetector ?? true,
    interstitialCalculator: base.interstitialCalculator ?? true,
    rewardedWoodDetector: base.rewardedWoodDetector ?? true,
  };
}

function formatDateShort(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const AdminAdMobTab: React.FC<AdminAdMobTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [form, setForm] = useState<AdMobSettings>(() =>
    normalizeAdForm(settings.adSettings || getActiveAdMobSettings())
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [, setAnalyticsTick] = useState(0);

  // Server-authoritative Google Play Subscription Statistics & Subscriber Table
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [billingServerStatus, setBillingServerStatus] =
    useState<GooglePlayBillingServerStatus | null>(null);
  const [subStats, setSubStats] = useState<PremiumSubscriptionStats>({
    totalRecords: 0,
    activePremiumCustomers: 0,
    expiredSubscriptions: 0,
    cancelledActiveUntilExpiry: 0,
    pendingSubscriptions: 0,
    refundedOrRevokedSubscriptions: 0,
    monthlyActiveCount: 0,
    yearlyActiveCount: 0,
    monthlyTotalCount: 0,
    yearlyTotalCount: 0,
  });
  const [subscriptions, setSubscriptions] = useState<PremiumSubscriptionRecord[]>([]);
  const [subStatusFilter, setSubStatusFilter] = useState<string>('all');
  const [subPlanFilter, setSubPlanFilter] = useState<string>('all');
  const [subSearch, setSubSearch] = useState<string>('');

  const loadMonetizationDashboard = useCallback(
    async (hydrateForm = false) => {
      setLoadingDashboard(true);
      setDashboardError(null);
      try {
        const data = await fetchAdminMonetizationDashboard({
          status: subStatusFilter,
          productId: subPlanFilter,
          search: subSearch,
        });
        setBillingServerStatus(data.billingServerStatus);
        setSubStats(data.stats);
        setSubscriptions(data.subscriptions);
        if (hydrateForm && data.adSettings) {
          setForm(normalizeAdForm(data.adSettings));
          saveLocalAdMobSettings(data.adSettings);
        }
      } catch (err: any) {
        setDashboardError(err?.message || 'Could not load subscription statistics.');
      } finally {
        setLoadingDashboard(false);
      }
    },
    [subStatusFilter, subPlanFilter, subSearch]
  );

  useEffect(() => {
    loadMonetizationDashboard(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadMonetizationDashboard(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [subStatusFilter, subPlanFilter, subSearch, loadMonetizationDashboard]);

  const handleResetAnalytics = () => {
    adMobService.resetAnalytics();
    setAnalyticsTick(prev => prev + 1);
    setTestStatus('AdMob local performance analytics reset.');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    setTestStatus(null);
    try {
      // Save permanently to authoritative monetization endpoint (Firestore + DB)
      const persisted = await saveAdminMonetizationConfig(form);
      const normalized = normalizeAdForm(persisted);
      setForm(normalized);
      saveLocalAdMobSettings(normalized);

      // Keep BusinessSettings state in sync across the app
      await onUpdateSettings({
        ...settings,
        adSettings: normalized,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save AdMob settings.');
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
    setTestStatus(
      'Loaded official Production AdMob IDs (ca-app-pub-2305048922926538). Click Save AdMob Settings to persist.'
    );
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
    setTestStatus(
      'Loaded Google official sample test Ad Unit IDs. Zero policy risk during development.'
    );
  };

  // Diagnostic Testers
  const handleTestInterstitial = async () => {
    setTestStatus('Testing Interstitial Ad...');
    try {
      await adMobService.showQuotationInterstitial(
        () => {
          setTestStatus('Interstitial ad completed/dismissed successfully.');
        },
        form,
        5000,
        true
      );
    } catch (err: any) {
      setTestStatus('Interstitial test error: ' + (err.message || err));
    }
  };

  const handleTestRewarded = async () => {
    setTestStatus('Testing Rewarded Video Ad...');
    try {
      const result = await adMobService.showRewardedAd(
        reward => {
          setTestStatus(
            `Rewarded video completed! Verified reward: +${reward.amount || 3} Credits.`
          );
        },
        () => {},
        form,
        true
      );
      if (!result.shown) {
        setTestStatus('Rewarded ad not shown or still preparing. Check network.');
      }
    } catch (err: any) {
      setTestStatus('Rewarded test error: ' + (err.message || err));
    }
  };

  const handleTestRewardedInterstitial = async () => {
    setTestStatus('Testing Rewarded Interstitial Ad...');
    try {
      const result = await adMobService.showRewardedInterstitialAd(
        reward => {
          setTestStatus(
            `Rewarded interstitial completed! Verified reward: +${reward.amount || 3} Credits.`
          );
        },
        () => {},
        form,
        true
      );
      if (!result.shown) {
        setTestStatus('Rewarded interstitial not shown or still preparing.');
      }
    } catch (err: any) {
      setTestStatus('Rewarded interstitial error: ' + (err.message || err));
    }
  };

  const handleTestAppOpen = async () => {
    setTestStatus('Testing App Open Ad...');
    try {
      const shown = await adMobService.showAppOpenAd(form, true);
      setTestStatus(
        shown
          ? 'App Open Ad presented successfully.'
          : 'App Open Ad skipped (frequency cap, Premium status, or busy context).'
      );
    } catch (err: any) {
      setTestStatus('App Open Ad error: ' + (err.message || err));
    }
  };

  const handlePreloadAll = async () => {
    setTestStatus('Preloading full-screen AdMob formats in background...');
    const [intOk, rewOk, appOpenOk] = await Promise.all([
      adMobService.preloadInterstitial(form, true),
      adMobService.preloadRewarded(form, true),
      adMobService.preloadAppOpen(form, true),
    ]);
    setTestStatus(
      `Preload results: Interstitial: ${intOk ? 'Ready' : 'Failed'}, Rewarded: ${
        rewOk ? 'Ready' : 'Failed'
      }, AppOpen: ${appOpenOk ? 'Ready' : 'Failed'}`
    );
  };

  const status = adMobService.getStatus();

  return (
    <div id="admin-admob-monetization-tab" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E5E5] gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C89211] mb-1">
            <DollarSign className="w-3.5 h-3.5 text-[#C89211]" />
            <span>AdMob Monetization &amp; Google Play Premium Control</span>
          </div>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A]">
            Ads &amp; Ad-Free Premium Subscriptions
          </h3>
          <p className="text-xs sm:text-sm text-[#666666] mt-0.5">
            Control AdMob placements, 3-minute frequency caps, and monitor verified Google Play Premium subscriptions for <code className="font-mono text-stone-800">com.doorstudio.ai</code>.
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
            id="btn-save-admob-settings"
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#C89211] hover:bg-[#b07d08] text-white text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save AdMob Settings'}
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>AdMob configuration saved permanently to database and synchronized!</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{saveError}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 1: GOOGLE PLAY PREMIUM SUBSCRIPTION STATISTICS & SUBSCRIBERS  */}
      {/* ===================================================================== */}
      <div
        id="admin-premium-subscriptions-section"
        className="p-5 rounded-2xl bg-white border border-[#E5E5E5] space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-[#1A1A1A] flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#C89211]" />
              <span>Google Play Ad-Free Premium Subscription Statistics</span>
            </h4>
            <p className="text-xs text-[#666666] mt-0.5">
              Verified Google Play Billing entitlements only (<code className="font-mono">JHD_ADFREE_MONTHLY</code> ₹49 &amp; <code className="font-mono">JHD_ADFREE_YEARLY</code> ₹399). Completely isolated from Razorpay one-time payments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {billingServerStatus && (
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                  billingServerStatus.configured
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {billingServerStatus.configured
                  ? 'Google Play API Ready'
                  : 'Play Service Account Pending'}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadMonetizationDashboard(false)}
              disabled={loadingDashboard}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] text-xs font-semibold border border-[#E5E5E5] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDashboard ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
          <div className="p-3.5 rounded-xl bg-[#F4FBF6] border border-[#A7DFB9]">
            <span className="text-[11px] font-semibold text-[#166534] block">
              Active Premium
            </span>
            <span
              id="stat-active-premium"
              className="text-2xl font-black text-[#14532D] mt-1 block"
            >
              {subStats.activePremiumCustomers}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E5E5]">
            <span className="text-[11px] font-semibold text-[#555555] block">
              Expired
            </span>
            <span
              id="stat-expired-subscriptions"
              className="text-2xl font-black text-[#1A1A1A] mt-1 block"
            >
              {subStats.expiredSubscriptions}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FFF7E3]/70 border border-[#E7C77A]">
            <span className="text-[11px] font-semibold text-[#8C6308] block">
              Monthly (₹49)
            </span>
            <span
              id="stat-monthly-active"
              className="text-2xl font-black text-[#1A1A1A] mt-1 block"
            >
              {subStats.monthlyActiveCount}
            </span>
            <span className="text-[10px] text-[#7A5205]">
              {subStats.monthlyTotalCount} total
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FFF7E3]/70 border border-[#E7C77A]">
            <span className="text-[11px] font-semibold text-[#8C6308] block">
              Yearly (₹399)
            </span>
            <span
              id="stat-yearly-active"
              className="text-2xl font-black text-[#1A1A1A] mt-1 block"
            >
              {subStats.yearlyActiveCount}
            </span>
            <span className="text-[10px] text-[#7A5205]">
              {subStats.yearlyTotalCount} total
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E5E5]">
            <span className="text-[11px] font-semibold text-[#555555] block">
              Cancelled (Grace)
            </span>
            <span className="text-2xl font-black text-[#1A1A1A] mt-1 block">
              {subStats.cancelledActiveUntilExpiry}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E5E5]">
            <span className="text-[11px] font-semibold text-[#555555] block">
              Pending / Revoked
            </span>
            <span className="text-2xl font-black text-[#1A1A1A] mt-1 block">
              {subStats.pendingSubscriptions + subStats.refundedOrRevokedSubscriptions}
            </span>
          </div>
        </div>

        {dashboardError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {dashboardError}
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={subSearch}
              onChange={e => setSubSearch(e.target.value)}
              placeholder="Search subscriber name, mobile, or Google Play order ID..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A]"
            />
          </div>
          <select
            value={subStatusFilter}
            onChange={e => setSubStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled (Active Until Expiry)</option>
            <option value="expired">Expired</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="revoked">Revoked</option>
          </select>
          <select
            value={subPlanFilter}
            onChange={e => setSubPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold"
          >
            <option value="all">All Plans</option>
            <option value="JHD_ADFREE_MONTHLY">Monthly (₹49)</option>
            <option value="JHD_ADFREE_YEARLY">Yearly (₹399)</option>
          </select>
        </div>

        {/* Subscriber Table */}
        <div className="overflow-x-auto border border-[#E5E5E5] rounded-xl">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="bg-[#FAFAF8] border-b border-[#E5E5E5] text-[11px] font-bold uppercase tracking-wider text-[#555555]">
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Plan / Product ID</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Auto-Renew</th>
                <th className="py-2.5 px-3">Expiry</th>
                <th className="py-2.5 px-3">Last Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE6]">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-4 text-center text-[#666666]">
                    <div className="inline-flex items-center gap-2">
                      <Users className="w-4 h-4 text-stone-400" />
                      <span>
                        No Google Play subscription records match the current filter yet.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                subscriptions.map(sub => {
                  const isCurrentlyEntitled =
                    (sub.status === 'active' || sub.status === 'cancelled') &&
                    sub.expiryTimeMillis > Date.now();
                  return (
                    <tr key={sub.id} className="hover:bg-stone-50/70">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#1A1A1A]">
                          {sub.customerName || 'Customer'}
                        </div>
                        <div className="text-[11px] text-[#666666] font-mono">
                          {sub.customerMobile ? `+91 ${sub.customerMobile}` : sub.customerId}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#1A1A1A]">
                          {sub.planName} (₹{sub.priceInr})
                        </div>
                        <div className="text-[11px] font-mono text-[#666666]">
                          {sub.productId}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold capitalize border ${
                            isCurrentlyEntitled
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : sub.status === 'pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#555555]">
                        {sub.autoRenewing ? 'Yes' : 'No'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#1A1A1A]">
                        {formatDateShort(sub.expiryDate)}
                      </td>
                      <td className="py-2.5 px-3 text-[#666666]">
                        {formatDateShort(sub.lastVerifiedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 2: ADMOB CONFIGURATION & PLACEMENT CONTROLS                   */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Controls & Ad Unit IDs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Master Format Toggles */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] space-y-4">
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C89211]" />
              <span>Master AdMob Format Controls</span>
            </h4>

            <div className="space-y-3 divide-y divide-stone-100 text-xs">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Enable Ads Globally</p>
                  <p className="text-[#666666] text-[11px]">
                    Master switch for all advertisements (automatically disabled for Premium subscribers)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={e => setForm({ ...form, enabled: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                    <span>AdMob Test Mode</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        form.testMode
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {form.testMode ? 'Safe Test IDs' : 'Live Production'}
                    </span>
                  </p>
                  <p className="text-[#666666] text-[11px]">
                    Use Google official test IDs while testing builds before Play Store release
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.testMode}
                  onChange={e => setForm({ ...form, testMode: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">1. Adaptive Banner Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Non-intrusive banners with fixed layout clearance (never overlay nav or inputs)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableBanners}
                  onChange={e => setForm({ ...form, enableBanners: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">2. Interstitial Ads (Post-Result)</p>
                  <p className="text-[#666666] text-[11px]">
                    Shown after completed calculations or AI detection results, obeying frequency cap
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableInterstitials}
                  onChange={e => setForm({ ...form, enableInterstitials: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">3. Optional Rewarded Video Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Optional free-tier AI Wood Detector scan credit reward (hidden for Premium users)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableRewardedAds}
                  onChange={e => setForm({ ...form, enableRewardedAds: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">4. Rewarded Interstitial Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Opt-in interactive sponsor for extra AI Wood Scan credits (hidden for Premium users)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableRewardedInterstitialAds}
                  onChange={e =>
                    setForm({ ...form, enableRewardedInterstitialAds: e.target.checked })
                  }
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">5. Catalog Native Advanced Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Sponsored cards in catalog when Door Catalog is enabled
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.enableCatalogNativeAds}
                  onChange={e => setForm({ ...form, enableCatalogNativeAds: e.target.checked })}
                  className="w-5 h-5 accent-[#C89211] rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">6. App Open Ads</p>
                  <p className="text-[#666666] text-[11px]">
                    Cold start and foreground return ads (suppressed for Premium users &amp; active scans)
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

          {/* Interstitial Frequency Cap & Placement Rules */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] space-y-4">
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C89211]" />
              <span>Interstitial Frequency Cap &amp; Feature Placement Controls</span>
            </h4>
            <p className="text-[#666666] text-xs leading-relaxed">
              Enforce maximum one interstitial every 3 minutes (180 seconds) globally so measurements, scans, and PDF quotation downloads are never interrupted.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Interstitial Frequency Cap (Seconds):
                </label>
                <input
                  id="input-interstitial-frequency-cap"
                  type="number"
                  min="30"
                  max="1800"
                  value={form.interstitialMinIntervalSeconds ?? 180}
                  onChange={e =>
                    setForm({
                      ...form,
                      interstitialMinIntervalSeconds: Math.max(
                        30,
                        parseInt(e.target.value, 10) || 180
                      ),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold tabular-nums"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Default: 180 seconds (1 interstitial per 3 minutes max)
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Max Interstitials Per Session:
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={form.maxInterstitialsPerSession ?? 4}
                  onChange={e =>
                    setForm({
                      ...form,
                      maxInterstitialsPerSession: Math.max(
                        1,
                        parseInt(e.target.value, 10) || 4
                      ),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold tabular-nums"
                />
                <p className="text-[10px] text-stone-500 mt-0.5">
                  Recommended: 3 to 5 interstitials per session
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#1A1A1A] mb-1">
                  Min Interval for App Open Ads (Seconds):
                </label>
                <input
                  type="number"
                  min="60"
                  max="1800"
                  value={form.appOpenMinIntervalSeconds ?? 180}
                  onChange={e =>
                    setForm({
                      ...form,
                      appOpenMinIntervalSeconds: Math.max(
                        60,
                        parseInt(e.target.value, 10) || 180
                      ),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold tabular-nums"
                />
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
                  onChange={e =>
                    setForm({
                      ...form,
                      maxAppOpenPerSession: Math.max(1, parseInt(e.target.value, 10) || 2),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold tabular-nums"
                />
              </div>
            </div>

            {/* Per-Placement Interstitial & Rewarded Toggles */}
            <div className="pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                {
                  key: 'interstitialSlidingWindow',
                  label: 'Sliding Window Interstitial',
                  desc: 'After completed cutting calculation (3-min cap)',
                },
                {
                  key: 'interstitialWoodDetector',
                  label: 'AI Wood Detector Interstitial',
                  desc: 'After wood detection results appear (never during scan)',
                },
                {
                  key: 'interstitialCalculator',
                  label: 'Door Price Calculator Interstitial',
                  desc: 'After completed price calculation (never blocks PDF)',
                },
                {
                  key: 'rewardedWoodDetector',
                  label: 'Wood Detector Rewarded Credits',
                  desc: 'Optional free-user video reward (hidden when Premium)',
                },
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

          {/* Banner Placements by Screen */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] space-y-4">
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Layout className="w-4 h-4 text-[#C89211]" />
              <span>Adaptive Banner Placements by Screen</span>
            </h4>
            <p className="text-[#666666] text-xs leading-relaxed">
              Toggle adaptive banners per screen. Every banner automatically hides when a user holds an active Google Play Premium subscription.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
              {[
                { key: 'bannerSlidingWindow', label: 'Sliding Window Calculator', desc: 'Bottom of fabrication workspace' },
                { key: 'bannerWoodDetector', label: 'AI Wood Detector', desc: 'Below wood identification results' },
                { key: 'bannerCalculator', label: 'Door Price Calculator', desc: 'Below itemized price breakdown' },
                { key: 'bannerHome', label: 'Home Screen', desc: 'Non-intrusive bottom section' },
                { key: 'bannerChaukhat', label: 'Chaukhat Frame Calculator', desc: 'Below frame estimation total' },
                { key: 'bannerCatalog', label: 'Door Catalog & Gallery', desc: 'Bottom of catalog grid (when enabled)' },
                { key: 'bannerDetail', label: 'Door Detail Modal', desc: 'Below specifications table' },
                { key: 'bannerSaved', label: 'Saved Estimates & Favorites', desc: 'Bottom of profile modal' },
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

          {/* Ad Unit IDs Configuration */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#C89211]" />
                <span>Google AdMob App ID &amp; Ad Unit IDs</span>
              </h4>
              <span className="text-[11px] text-[#666666] font-mono">com.doorstudio.ai</span>
            </div>

            <div className="space-y-3.5 text-xs">
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
              </div>

              {[
                {
                  key: 'bannerAdUnitId',
                  label: '1. Adaptive Banner Ad Unit ID',
                  placeholder: ADMOB_PRODUCTION_IDS.BANNER,
                },
                {
                  key: 'interstitialAdUnitId',
                  label: '2. Interstitial Ad Unit ID',
                  placeholder: ADMOB_PRODUCTION_IDS.INTERSTITIAL,
                },
                {
                  key: 'rewardedAdUnitId',
                  label: '3. Rewarded Video Ad Unit ID',
                  placeholder: ADMOB_PRODUCTION_IDS.REWARDED,
                },
                {
                  key: 'rewardedInterstitialAdUnitId',
                  label: '4. Rewarded Interstitial Ad Unit ID',
                  placeholder: ADMOB_PRODUCTION_IDS.REWARDED_INTERSTITIAL,
                },
                {
                  key: 'nativeAdUnitId',
                  label: '5. Native Advanced Ad Unit ID',
                  placeholder: ADMOB_PRODUCTION_IDS.NATIVE,
                },
                {
                  key: 'appOpenAdUnitId',
                  label: '6. App Open Ad Unit ID',
                  placeholder: ADMOB_PRODUCTION_IDS.APP_OPEN,
                },
              ].map(field => (
                <div key={field.key}>
                  <label className="block font-semibold text-[#1A1A1A] mb-1">{field.label}:</label>
                  <input
                    type="text"
                    value={(form as any)[field.key] || ''}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value.trim() })}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-mono text-[11px]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* app-ads.txt Verification */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Authorized Digital Sellers (app-ads.txt)</span>
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active
              </span>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-800 break-all select-all">
              google.com, {ADMOB_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostics & Analytics */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-stone-900 text-stone-100 space-y-4">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <Play className="w-4 h-4 text-amber-400" />
              <span>AdMob Diagnostic Tester</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">Environment:</span>
                <span className="font-semibold text-stone-200">
                  {status.isNative ? 'Android Native (Capacitor)' : 'Web Preview'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">SDK Initialized:</span>
                <span className={status.isInitialized ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {status.isInitialized ? 'Yes (Active)' : 'Idle'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">Interstitial:</span>
                <span className={status.isInterstitialLoaded ? 'text-emerald-400 font-semibold' : 'text-stone-400'}>
                  {status.isInterstitialLoaded ? 'Ready' : status.isInterstitialLoading ? 'Loading...' : 'Idle'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span className="text-stone-400">Rewarded Video:</span>
                <span className={status.isRewardedLoaded ? 'text-emerald-400 font-semibold' : 'text-stone-400'}>
                  {status.isRewardedLoaded ? 'Ready' : status.isRewardedLoading ? 'Loading...' : 'Idle'}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handlePreloadAll}
                className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
              >
                Preload All Full-Screen Ads
              </button>
              <button
                type="button"
                onClick={handleTestInterstitial}
                className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
              >
                Test Interstitial Ad
              </button>
              <button
                type="button"
                onClick={handleTestRewarded}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors cursor-pointer"
              >
                Test Rewarded Video (+3 Cr)
              </button>
              <button
                type="button"
                onClick={handleTestRewardedInterstitial}
                className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
              >
                Test Rewarded Interstitial (+3 Cr)
              </button>
              <button
                type="button"
                onClick={handleTestAppOpen}
                className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
              >
                Test App Open Ad
              </button>
            </div>

            {testStatus && (
              <div className="p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-[11px] text-stone-300 font-mono leading-relaxed break-words">
                {testStatus}
              </div>
            )}
          </div>

          {/* Local Session Analytics */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#C89211]" />
                <span>Session Ad Delivery</span>
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
              <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-stone-500 block text-[10px]">Interstitials Shown</span>
                <span className="font-bold text-stone-900">
                  {status.sessionInterstitialCount} / {form.maxInterstitialsPerSession}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-stone-500 block text-[10px]">Frequency Cap</span>
                <span className="font-bold text-stone-900">
                  {form.interstitialMinIntervalSeconds || 180}s
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-stone-500 block text-[10px]">Banner Impressions</span>
                <span className="font-bold text-[#C89211]">
                  {status.analytics?.impressions?.banner || 0}
                </span>
              </div>
              <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-stone-500 block text-[10px]">Verified Rewards</span>
                <span className="font-bold text-emerald-700">
                  {status.analytics?.rewards || 0}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAnalytics}
              className="w-full py-2 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-stone-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Local Counters</span>
            </button>
          </div>

          {/* Compliance Summary */}
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-950 text-xs space-y-2.5">
            <div className="flex items-center gap-2 font-bold">
              <Award className="w-4 h-4 text-[#C89211]" />
              <span>Monetization Safeguards</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-amber-900 leading-relaxed list-disc list-inside">
              <li>Active Google Play Premium subscribers see zero ads app-wide.</li>
              <li>Interstitials never interrupt measurements, camera scans, or PDF quotes.</li>
              <li>Global 3-minute interstitial cap enforced across all calculators.</li>
              <li>Razorpay one-time orders never grant Google Play subscription status.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
