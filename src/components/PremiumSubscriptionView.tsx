import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Crown,
  Sparkles,
  Calculator,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  ArrowLeft,
  Calendar,
  CreditCard,
  Ban,
  UserCheck,
  Clock,
} from 'lucide-react';
import type {
  CustomerAccount,
  PremiumEntitlementSummary,
  PremiumPlanDefinition,
  PremiumPlanId,
} from '../types.ts';
import {
  FREE_ENTITLEMENT,
  PREMIUM_PLANS,
  fetchSubscriptionStatus,
  isAndroidNativeApp,
  openGooglePlayManageSubscription,
  purchaseGooglePlaySubscription,
  queryNativePlayProducts,
  restoreGooglePlayPurchases,
  type NativePlayProduct,
} from '../lib/billing/playBillingService.ts';
import { BRAND_LOGO_URL, BRAND_NAME } from '../config/brand.ts';

interface PremiumSubscriptionViewProps {
  currentCustomer: CustomerAccount | null;
  entitlement: PremiumEntitlementSummary;
  plans?: PremiumPlanDefinition[];
  onEntitlementUpdated: (entitlement: PremiumEntitlementSummary) => void;
  onRequireLogin: (reason?: string) => void;
  onBack: () => void;
}

function formatExpiryDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const PremiumSubscriptionView: React.FC<PremiumSubscriptionViewProps> = ({
  currentCustomer,
  entitlement,
  plans,
  onEntitlementUpdated,
  onRequireLogin,
  onBack,
}) => {
  const effectivePlans = plans && plans.length > 0 ? plans : PREMIUM_PLANS;
  const monthlyPlan =
    effectivePlans.find(p => p.productId === 'JHD_ADFREE_MONTHLY') || PREMIUM_PLANS[0];
  const yearlyPlan =
    effectivePlans.find(p => p.productId === 'JHD_ADFREE_YEARLY') || PREMIUM_PLANS[1];

  const [nativeProducts, setNativeProducts] = useState<Record<string, NativePlayProduct>>({});
  const [busyPlan, setBusyPlan] = useState<PremiumPlanId | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [notice, setNotice] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      productId: PremiumPlanId;
      planName: string;
      priceInr: number;
      billingCycle: 'monthly' | 'yearly';
      status: string;
      autoRenewing: boolean;
      expiryDate: string;
      lastVerifiedAt: string;
      orderId?: string;
    }>
  >([]);

  const isNativeAndroid = isAndroidNativeApp();

  const refreshStatusFromServer = async (showSpinner = false) => {
    if (showSpinner) setRefreshingStatus(true);
    try {
      const res = await fetchSubscriptionStatus();
      onEntitlementUpdated(res.entitlement || FREE_ENTITLEMENT);
      setHistory(res.history || []);
    } catch {
      if (!currentCustomer) {
        onEntitlementUpdated(FREE_ENTITLEMENT);
        setHistory([]);
      }
    } finally {
      if (showSpinner) setRefreshingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatusFromServer(false);
    if (isNativeAndroid) {
      queryNativePlayProducts()
        .then(items => {
          const map: Record<string, NativePlayProduct> = {};
          for (const p of items) {
            if (p.productId) map[p.productId] = p;
          }
          setNativeProducts(map);
        })
        .catch(() => {});
    }
  }, [currentCustomer?.id]);

  const handleSubscribe = async (productId: PremiumPlanId) => {
    setNotice(null);
    if (!currentCustomer) {
      onRequireLogin(
        `Sign in with your mobile number OTP first so your Ad-Free Premium subscription stays linked to your ${BRAND_NAME} account across reinstalls and devices.`
      );
      return;
    }

    setBusyPlan(productId);
    try {
      const result = await purchaseGooglePlaySubscription({
        productId,
        customerId: currentCustomer.id,
      });

      if (!result.ok) {
        setNotice({
          type: result.errorCode === 'ANDROID_GOOGLE_PLAY_REQUIRED' ? 'info' : 'error',
          message:
            result.error ||
            'Could not complete Google Play subscription right now. Please try again.',
        });
        return;
      }

      if (result.entitlement) {
        onEntitlementUpdated(result.entitlement);
      }
      await refreshStatusFromServer(false);
      setNotice({
        type: 'success',
        message:
          result.entitlement?.isPremium
            ? `${BRAND_NAME} Premium is now active. All advertisements have been removed across the app.`
            : 'Purchase submitted to Google Play. Your status will activate automatically once payment settles.',
      });
    } finally {
      setBusyPlan(null);
    }
  };

  const handleRestorePurchase = async () => {
    setNotice(null);
    if (!currentCustomer) {
      onRequireLogin(
        'Sign in with your mobile number OTP to restore your Google Play Ad-Free Premium subscription.'
      );
      return;
    }

    setRestoring(true);
    try {
      const result = await restoreGooglePlayPurchases();
      onEntitlementUpdated(result.entitlement || FREE_ENTITLEMENT);
      await refreshStatusFromServer(false);
      setNotice({
        type: result.ok && result.entitlement?.isPremium ? 'success' : result.ok ? 'info' : 'error',
        message: result.message,
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleManageSubscription = async () => {
    await openGooglePlayManageSubscription(entitlement.productId);
  };

  const monthlyDisplayPrice =
    nativeProducts.JHD_ADFREE_MONTHLY?.formattedPrice || `₹${monthlyPlan.priceInr}`;
  const yearlyDisplayPrice =
    nativeProducts.JHD_ADFREE_YEARLY?.formattedPrice || `₹${yearlyPlan.priceInr}`;

  const isVerifiedPremium =
    entitlement.subscriptionPlan === 'premium' &&
    entitlement.isPremium &&
    entitlement.adsRemoved;

  const isMonthlyActive =
    isVerifiedPremium && entitlement.productId === 'JHD_ADFREE_MONTHLY';
  const isYearlyActive =
    isVerifiedPremium && entitlement.productId === 'JHD_ADFREE_YEARLY';

  const statusLabel = (() => {
    if (isVerifiedPremium && entitlement.status === 'cancelled') {
      return 'Cancelled — Active Until Expiry';
    }
    if (isVerifiedPremium) {
      return 'Premium Plan (Active — Ad-Free)';
    }
    if (entitlement.status === 'pending') {
      return 'Free Plan (Payment Pending)';
    }
    if (entitlement.status === 'expired') {
      return 'Free Plan (Subscription Expired)';
    }
    if (entitlement.status === 'refunded' || entitlement.status === 'revoked') {
      return 'Free Plan (Subscription Refunded / Revoked)';
    }
    return 'Free Plan (Ad-Supported)';
  })();

  return (
    <section
      id="premium-subscription-view"
      className="min-h-screen bg-[#F8FAFC] text-[#0F172A] py-6 sm:py-10 pb-24 lg:pb-12"
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:border-[#0B5ED7] text-xs font-semibold text-[#0F172A] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#0B5ED7]" />
            <span>Back to Home</span>
          </button>

          <button
            type="button"
            onClick={() => refreshStatusFromServer(true)}
            disabled={refreshingStatus}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] text-xs font-medium text-[#475569] transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingStatus ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Hero Header */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-[#E2E8F0] bg-white p-1 shrink-0 hidden sm:flex items-center justify-center shadow-xs">
                <img
                  src={BRAND_LOGO_URL}
                  alt={BRAND_NAME}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
                  <Crown className="w-4 h-4 text-[#F97316]" />
                  <span>Ad-Free Fabrication Membership</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0A2540] tracking-tight">
                  {BRAND_NAME} Premium
                </h1>
                <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
                  Calculate Sliding Window cutting sheets, glass sizes, bulk lists, and photo scans with zero advertisements.
                </p>
              </div>
            </div>

            {/* Live Entitlement Status Box */}
            <div
              id="premium-status-card"
              className={`lg:w-80 rounded-xl p-4 border ${
                entitlement.isPremium
                  ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                  : 'bg-[#F8FAFC] border-[#E2E8F0]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Current Plan Status
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    entitlement.isPremium ? 'text-[#065F46]' : 'text-[#475569]'
                  }`}
                >
                  {entitlement.adsRemoved ? '0 Ads' : 'Standard'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#0A2540]">
                {entitlement.isPremium ? (
                  <CheckCircle2 className="w-4 h-4 text-[#16803A] shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-[#0B5ED7] shrink-0" />
                )}
                <span>{statusLabel}</span>
              </div>
              {entitlement.planName && (
                <div className="mt-2 pt-2 border-t border-[#E2E8F0] space-y-1 text-xs text-[#475569] tabular-nums">
                  <div className="flex items-center justify-between">
                    <span>Plan</span>
                    <span className="font-semibold text-[#0A2540]">{entitlement.planName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{entitlement.isPremium ? 'Valid Until' : 'Ended On'}</span>
                    <span className="font-semibold text-[#0A2540]">
                      {formatExpiryDate(entitlement.expiryDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Auto-Renewal</span>
                    <span className="font-semibold text-[#0A2540]">
                      {entitlement.autoRenewing ? 'Enabled' : 'Off'}
                    </span>
                  </div>
                </div>
              )}
              {!currentCustomer && (
                <div className="mt-3 pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() =>
                      onRequireLogin('Sign in with your mobile OTP to check or restore Premium.')
                    }
                    className="w-full py-2 px-3 rounded-lg bg-[#0B5ED7] hover:bg-[#084BB3] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-white" />
                    <span>Sign In With Mobile OTP</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {notice && (
            <div
              role="status"
              className={`mt-5 p-3.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${
                notice.type === 'success'
                  ? 'bg-[#F4FBF6] border-[#A7DFB9] text-[#14532D]'
                  : notice.type === 'error'
                  ? 'bg-[#FEF3F2] border-[#FECDCA] text-[#912018]'
                  : 'bg-[#FFF7E3] border-[#E7C77A] text-[#7A5205]'
              }`}
            >
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#16803A]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{notice.message}</span>
            </div>
          )}
        </div>

        {/* Subscription Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Monthly Plan */}
          <div
            id="plan-card-monthly"
            className={`bg-white rounded-2xl p-6 border flex flex-col justify-between transition-colors ${
              isMonthlyActive ? 'border-[#16803A] ring-1 ring-[#16803A]/20' : 'border-[#E5E5E5]'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                    Monthly Plan
                  </p>
                  <h2 className="font-serif text-xl font-bold text-[#1A1A1A] mt-0.5">
                    Ad-Free Monthly
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-[#666666] bg-[#F8F8F6] border border-[#E5E5E5] px-2 py-1 rounded">
                  JHD_ADFREE_MONTHLY
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-3xl sm:text-4xl font-black text-[#1A1A1A]">
                  {monthlyDisplayPrice}
                </span>
                <span className="text-sm text-[#666666] font-medium">/ month</span>
              </div>

              <p className="text-xs text-[#555555] leading-relaxed">
                Flexible 30-day Google Play subscription. Cancel any time directly from your Google Play account settings.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-[#222222] pt-2 border-t border-[#F0EFEA]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16803A] shrink-0" />
                  <span>Complete Ad-Free Experience across all screens</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16803A] shrink-0" />
                  <span>Uninterrupted Sliding Window, Glass, Track &amp; Bulk Calculators</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16803A] shrink-0" />
                  <span>Photo Measurement Scanner &amp; AI tools without banner or interstitial ads</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                id="btn-subscribe-monthly"
                type="button"
                disabled={busyPlan !== null || isMonthlyActive}
                onClick={() => handleSubscribe('JHD_ADFREE_MONTHLY')}
                className={`w-full h-11 px-4 rounded-xl font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 ${
                  isMonthlyActive
                    ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] cursor-default'
                    : 'bg-[#0A2540] hover:bg-[#0B5ED7] text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isMonthlyActive
                    ? 'Current Active Plan'
                    : busyPlan === 'JHD_ADFREE_MONTHLY'
                    ? 'Connecting to Google Play...'
                    : 'Subscribe Monthly'}
                </span>
              </button>
            </div>
          </div>

          {/* Yearly Plan (Best Value) */}
          <div
            id="plan-card-yearly"
            className={`bg-white rounded-2xl p-6 border flex flex-col justify-between transition-colors ${
              isYearlyActive
                ? 'border-[#16803A] ring-1 ring-[#16803A]/20'
                : 'border-[#0B5ED7] ring-1 ring-[#0B5ED7]/20'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                    Yearly Plan • Save ₹189/Year
                  </p>
                  <h2 className="text-xl font-extrabold text-[#0A2540] mt-0.5">
                    Ad-Free Yearly
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-[#0B5ED7] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-1 rounded">
                  JHD_ADFREE_YEARLY
                </span>
              </div>

              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-3xl sm:text-4xl font-black text-[#0A2540]">
                  {yearlyDisplayPrice}
                </span>
                <span className="text-sm text-[#64748B] font-medium">/ year</span>
                <span className="text-xs font-semibold text-[#16803A] ml-1">
                  (~₹33/month)
                </span>
              </div>

              <p className="text-xs text-[#475569] leading-relaxed">
                Best value for daily window fabricators, glass workshops, and contractors. Full 365-day ad-free access billed via Google Play.
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm text-[#0F172A] pt-2 border-t border-[#E2E8F0]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B5ED7] shrink-0" />
                  <span>Zero banners, zero interstitials, zero rewarded ad prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B5ED7] shrink-0" />
                  <span>All Fabrication Calculators with instant PDF &amp; Excel exports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B5ED7] shrink-0" />
                  <span>Photo Measurement Scanner &amp; AI tools synced across devices</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <button
                id="btn-subscribe-yearly"
                type="button"
                disabled={busyPlan !== null || isYearlyActive}
                onClick={() => handleSubscribe('JHD_ADFREE_YEARLY')}
                className={`w-full h-11 px-4 rounded-xl font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 ${
                  isYearlyActive
                    ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] cursor-default'
                    : 'bg-[#0B5ED7] hover:bg-[#084BB3] text-white'
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>
                  {isYearlyActive
                    ? 'Current Active Plan'
                    : busyPlan === 'JHD_ADFREE_YEARLY'
                    ? 'Connecting to Google Play...'
                    : 'Subscribe Yearly'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Included Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-2">
            <Ban className="w-5 h-5 text-[#0B5ED7]" />
            <h3 className="font-bold text-sm text-[#0A2540]">Ad-Free Experience</h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Removes every adaptive banner, post-calculation interstitial, native card, app-open ad, and rewarded ad prompt across the entire application.
            </p>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-2">
            <Calculator className="w-5 h-5 text-[#F97316]" />
            <h3 className="font-bold text-sm text-[#0A2540]">All Fabrication Calculators</h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Fast, distraction-free workflow across Sliding Window Size, Glass Cutting, Track Size, Bearing Position, Mosquito Net, and Bulk Window calculators.
            </p>
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-2">
            <Sparkles className="w-5 h-5 text-[#0B5ED7]" />
            <h3 className="font-bold text-sm text-[#0A2540]">Scanner &amp; AI Tools</h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Clean workspace for Photo Measurement Scanning and AI identification with instant results and zero post-scan ad prompts.
            </p>
          </div>
        </div>

        {/* Restore Purchase & Manage Subscription Controls */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#0A2540]">
              Already Subscribed or Need Billing Changes?
            </h3>
            <p className="text-xs text-[#475569]">
              Reinstalled the app or switched phones? Restore your verified Google Play purchase or open Google Play subscription management.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              id="btn-restore-purchase"
              type="button"
              onClick={handleRestorePurchase}
              disabled={restoring}
              className="flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#0A2540] border border-[#CBD5E1] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0B5ED7] ${restoring ? 'animate-spin' : ''}`} />
              <span>{restoring ? 'Restoring...' : 'Restore Purchase'}</span>
            </button>
            <button
              id="btn-manage-subscription"
              type="button"
              onClick={handleManageSubscription}
              className="flex-1 sm:flex-initial h-10 px-4 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0A2540] border border-[#CBD5E1] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#0B5ED7]" />
              <span>Manage Subscription</span>
            </button>
          </div>
        </div>

        {/* Subscription History (when customer has verified records) */}
        {history.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0A2540]">
              <Calendar className="w-4 h-4 text-[#0B5ED7]" />
              <span>Google Play Subscription History</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[11px] uppercase tracking-wider text-[#64748B]">
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Product ID</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Valid Until</th>
                    <th className="py-2">Order Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {history.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 pr-4 font-semibold text-[#0A2540]">
                        {item.planName} (₹{item.priceInr})
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-[11px] text-[#475569]">
                        {item.productId}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold capitalize text-[#0A2540]">
                        {item.status}
                      </td>
                      <td className="py-2.5 pr-4 text-[#475569]">
                        {formatExpiryDate(item.expiryDate)}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-[#64748B]">
                        {item.orderId || 'Verified via Play'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Google Play Billing, Renewal & Cancellation Terms */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 space-y-2.5 text-xs text-[#475569] leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-[#0A2540]">
            <ShieldCheck className="w-4 h-4 text-[#0B5ED7]" />
            <span>Google Play Billing, Renewal &amp; Cancellation Terms</span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Google Play Subscription Billing:</strong> {BRAND_NAME} Premium subscriptions (Monthly ₹49 and Yearly ₹399) are processed exclusively through Google Play Billing for package <code className="font-mono text-[#0A2540]">com.doorstudio.ai</code> and verified securely on our servers.
            </li>
            <li>
              <strong>Auto-Renewal:</strong> Subscriptions renew automatically through your Google Play account unless auto-renew is turned off at least 24 hours before the end of the current billing period.
            </li>
            <li>
              <strong>Cancellation Policy:</strong> You can cancel or switch plans anytime in Google Play Store → Payments &amp; subscriptions → Subscriptions. If you cancel, you continue to enjoy the full Ad-Free experience until your paid expiry date.
            </li>
            <li>
              <strong>Expiration &amp; Refunds:</strong> When a subscription expires or is refunded/revoked through Google Play, standard non-intrusive advertisements automatically resume.
            </li>
            <li>
              <strong>Separate from One-Time Orders:</strong> One-time workshop orders and AI scan credit pack purchases processed via Razorpay remain completely separate from Google Play Premium ad-free subscriptions.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default PremiumSubscriptionView;
