import React, { useState, useEffect } from 'react';
import {
  X,
  Heart,
  History,
  Calculator,
  Eye,
  Trash2,
  Calendar,
  TreePine,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Bell,
  Sparkles,
  User,
  Phone,
  CreditCard,
  Download,
  LogOut,
  LogIn,
  Package,
  Edit2,
  Check,
  XCircle,
  Clock,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import {
  UserCalculationRecord,
  Door,
  BusinessSettings,
  NotificationPreferences,
  CustomerAccount,
  PaymentTransaction,
  PremiumEntitlementSummary,
  Quotation,
} from '../types.ts';
import {
  fetchCustomerPaymentHistory,
  updateCustomerAccountProfile,
  type CustomerOrderSummary,
} from '../lib/customerPaymentApi.ts';
import { generatePaymentReceiptPDF } from '../lib/pdfGenerator.ts';
import {
  fetchUserFavorites,
  toggleUserFavorite,
  fetchUserCalculations,
  deleteUserCalculation,
  clearUserCalculations,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '../lib/api.ts';
import { ProtectedImage } from './ProtectedImage.tsx';
import {
  getDeviceId,
  getNotificationPermissionState,
  setupPushNotifications,
} from '../lib/notifications.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';
import { AdMobBannerSlot } from './admob/AdMobBannerSlot.tsx';
import { FEATURE_FLAGS } from '../config/featureFlags.ts';
import { BRAND_LOGO_URL, BRAND_NAME, resolveBrandLogoUrl, resolveBrandName } from '../config/brand.ts';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  doors?: Door[];
  settings?: BusinessSettings;
  onSelectDoor?: (door: Door) => void;
  onSelectDoorForDetail?: (door: Door) => void;
  onCalculateDoor?: (door: Door) => void;
  onLoadCalculation?: (record: UserCalculationRecord) => void;
  onLoadCalculationIntoCalculator?: (record: UserCalculationRecord) => void;
  initialTab?: 'account' | 'payments' | 'orders' | 'favorites' | 'history' | 'notifications';
  defaultTab?: 'account' | 'payments' | 'orders' | 'favorites' | 'history' | 'notifications';
  // Customer OTP Authenticated Account
  currentCustomer?: CustomerAccount | null;
  entitlement?: PremiumEntitlementSummary | null;
  onOpenPremium?: () => void;
  customerPayments?: PaymentTransaction[];
  customerQuotes?: Quotation[];
  customerOrders?: CustomerOrderSummary[];
  onOpenOtpLogin?: () => void;
  onCustomerUpdated?: (customer: CustomerAccount) => void;
  onCustomerLogout?: () => void;
  // Optional legacy props maintained for seamless backwards compatibility
  currentUser?: any;
  user?: any;
  onUserUpdated?: (user: any) => void;
  onUpdateProfile?: (user: any) => void;
  onLogout?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  doors = [],
  settings,
  onSelectDoor,
  onSelectDoorForDetail,
  onCalculateDoor,
  onLoadCalculation,
  onLoadCalculationIntoCalculator,
  initialTab,
  defaultTab,
  currentCustomer,
  entitlement,
  onOpenPremium,
  customerPayments: initialPayments = [],
  customerQuotes: initialQuotes = [],
  customerOrders: initialOrders = [],
  onOpenOtpLogin,
  onCustomerUpdated,
  onCustomerLogout,
}) => {
  const resolveAllowedTab = (
    tab?: string
  ): 'account' | 'payments' | 'orders' | 'favorites' | 'history' | 'notifications' => {
    if (tab === 'account') return 'account';
    if (tab === 'payments') return 'payments';
    if (tab === 'orders') return 'orders';
    if (tab === 'notifications' && FEATURE_FLAGS.appMessages) return 'notifications';
    if (tab === 'favorites' && FEATURE_FLAGS.doorCatalogue) return 'favorites';
    if (tab === 'history') return 'history';
    return currentCustomer ? 'account' : FEATURE_FLAGS.doorCatalogue ? 'favorites' : 'history';
  };
  const resolvedTab = resolveAllowedTab(initialTab || defaultTab);
  const handleSelectDoor = onSelectDoor || onSelectDoorForDetail || (() => {});
  const handleCalculate = onCalculateDoor || (() => {});
  const handleLoadCalculation = onLoadCalculation || onLoadCalculationIntoCalculator || (() => {});

  const [activeTab, setActiveTab] = useState<
    'account' | 'payments' | 'orders' | 'favorites' | 'history' | 'notifications'
  >(resolvedTab);
  const [payments, setPayments] = useState<PaymentTransaction[]>(initialPayments);
  const [customerQuotes, setCustomerQuotes] = useState<Quotation[]>(initialQuotes);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderSummary[]>(initialOrders);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentCustomer?.name || '');
  const [profileCity, setProfileCity] = useState(currentCustomer?.city || '');
  const [profileEmail, setProfileEmail] = useState(currentCustomer?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Notification Preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    enabled: true,
    newDesigns: true,
    offers: true,
    priceUpdates: true,
    doorTips: true,
    importantUpdates: true,
  });
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  // Favorites state
  const [favoriteDoors, setFavoriteDoors] = useState<Door[]>([]);

  // Calculation History state
  const [history, setHistory] = useState<UserCalculationRecord[]>([]);

  // Reload data whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(resolveAllowedTab(initialTab || defaultTab));
      setProfileName(currentCustomer?.name || '');
      setProfileCity(currentCustomer?.city || '');
      setProfileEmail(currentCustomer?.email || '');
      setEditingProfile(false);
      loadUserData();
    }
  }, [isOpen, initialTab, defaultTab, currentCustomer]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [favs, calcs, payRes] = await Promise.all([
        FEATURE_FLAGS.doorCatalogue ? fetchUserFavorites() : Promise.resolve([]),
        fetchUserCalculations(),
        currentCustomer ? fetchCustomerPaymentHistory().catch(() => null) : Promise.resolve(null),
      ]);
      setFavoriteDoors(favs);
      setHistory(calcs);
      if (payRes?.success) {
        setPayments(payRes.payments || []);
        setCustomerQuotes(payRes.quotes || []);
        setCustomerOrders(payRes.orders || []);
      } else if (!currentCustomer) {
        setPayments([]);
        setCustomerQuotes([]);
        setCustomerOrders([]);
      }

      // Load push notification preferences only when App Messages feature is enabled
      if (FEATURE_FLAGS.appMessages) {
        try {
          const deviceId = getDeviceId();
          const notifRes = await fetchNotificationPreferences(deviceId).catch(() => null);
          if (notifRes?.preferences) {
            setNotificationPrefs(notifRes.preferences);
          }
          setNotifPermission(getNotificationPermissionState());
        } catch {
          // ignore notification prefs error
        }
      }
    } catch (err: any) {
      console.error('Error loading saved items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifPref = async (key: keyof NotificationPreferences) => {
    const updated = {
      ...notificationPrefs,
      [key]: !notificationPrefs[key],
    };
    setNotificationPrefs(updated);

    if (key === 'enabled' && updated.enabled && notifPermission !== 'granted') {
      await setupPushNotifications(updated);
      setNotifPermission(getNotificationPermissionState());
    }

    try {
      const deviceId = getDeviceId();
      await updateNotificationPreferences({
        deviceId,
        preferences: updated,
      });
      setSuccessMsg('Notification preferences saved');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  if (!isOpen) return null;

  const handleRemoveFavorite = async (doorId: string) => {
    try {
      await toggleUserFavorite(doorId);
      setFavoriteDoors(prev => prev.filter(d => d.id !== doorId));
      setSuccessMsg('Removed from saved doors');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove favorite');
    }
  };

  const handleDeleteCalculation = async (calcId: string) => {
    try {
      const updated = await deleteUserCalculation(calcId);
      setHistory(updated);
      setSuccessMsg('Calculation removed from saved estimates');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete calculation');
    }
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your saved calculation history?')) return;
    try {
      await clearUserCalculations();
      setHistory([]);
      setSuccessMsg('All saved calculation history cleared');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to clear history');
    }
  };

  const handleWhatsAppShare = (calc: UserCalculationRecord) => {
    const r = calc.result;
    const brandName = resolveBrandName(settings?.businessName);
    const msg = `*${brandName} Estimate Inquiry*\n\n` +
      `*Item:* ${calc.doorName || 'Custom Fabrication Estimate'}\n` +
      `*Dimensions:* ${r.widthInch}" W × ${r.heightInch}" H (${r.sqFt} sq.ft)\n` +
      `*Wood:* ${r.materialName}\n` +
      `*Finish:* ${r.finishName}\n` +
      `*Frame:* ${r.frameName}\n` +
      `*Estimated Cost:* ₹${r.total.toLocaleString('en-IN')}\n\n` +
      `I would like to verify this design and discuss factory delivery.`;

    const url = getWhatsAppUrl('', msg);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        id="user-profile-modal-card"
        className="relative w-full max-w-4xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl text-[#1A1A1A] overflow-hidden my-6 max-h-[92vh] flex flex-col"
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#BFDBFE] shadow-xs bg-white p-0.5 flex items-center justify-center shrink-0">
              <img
                src={resolveBrandLogoUrl(settings?.logoUrl)}
                alt={BRAND_NAME}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = BRAND_LOGO_URL;
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A]">
                  {currentCustomer ? currentCustomer.name : 'Customer Account & Saved Estimates'}
                </h2>
                <span className="text-xs text-[#666666] font-mono">
                  {currentCustomer ? `· +91 ${currentCustomer.mobile}` : '· Guest Session'}
                </span>
              </div>
              <p className="text-xs text-[#666666]">
                {currentCustomer
                  ? 'Verified mobile account — manage profile, online payments, receipts, and estimates.'
                  : 'Sign in with your mobile number (OTP) to pay online and keep your receipts and orders synced.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentCustomer ? (
              onCustomerLogout && (
                <button
                  id="btn-customer-logout"
                  type="button"
                  onClick={onCustomerLogout}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] hover:bg-stone-100 text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#666666]" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )
            ) : (
              onOpenOtpLogin && (
                <button
                  id="btn-modal-open-otp-login"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOtpLogin();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login with OTP</span>
                </button>
              )
            )}
            <button
              id="close-profile-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-[#E5E5E5] bg-[#F8F8F6] flex items-center gap-4 overflow-x-auto">
          <button
            id="tab-user-account"
            type="button"
            onClick={() => setActiveTab('account')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'account'
                ? 'border-[#C89211] text-[#C89211]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            id="tab-user-payments"
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'payments'
                ? 'border-[#C89211] text-[#C89211]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Payments ({payments.length})</span>
          </button>

          <button
            id="tab-user-orders"
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'orders'
                ? 'border-[#C89211] text-[#C89211]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Orders &amp; Quotes ({customerOrders.length + customerQuotes.length})</span>
          </button>

          {FEATURE_FLAGS.doorCatalogue && (
            <button
              id="tab-user-favorites"
              onClick={() => setActiveTab('favorites')}
              className={`pb-3 px-1 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'favorites'
                  ? 'border-[#C89211] text-[#C89211]'
                  : 'border-transparent text-[#666666] hover:text-[#1A1A1A]'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Saved Doors ({favoriteDoors.length})</span>
            </button>
          )}

          <button
            id="tab-user-history"
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#C89211] text-[#C89211]'
                : 'border-transparent text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Saved Estimates ({history.length})</span>
          </button>

          {FEATURE_FLAGS.appMessages && (
            <button
              id="tab-user-notifications"
              onClick={() => setActiveTab('notifications')}
              className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'notifications'
                  ? 'border-[#C89211] text-[#C89211]'
                  : 'border-transparent text-[#666666] hover:text-[#1A1A1A]'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Push Notifications</span>
            </button>
          )}
        </div>

        {/* Global Notifications inside modal */}
        {(error || successMsg) && (
          <div className="px-6 pt-3">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Scrollable Tab Body */}
        <div className="overflow-y-auto p-5 sm:p-6 flex-1 space-y-6 bg-white">
          {/* TAB 0A: CUSTOMER PROFILE */}
          {activeTab === 'account' && (
            <div className="space-y-5">
              {!currentCustomer ? (
                <div className="p-6 rounded-2xl border border-[#E5E5E5] bg-[#FAF8F4] text-center space-y-3">
                  <Phone className="w-8 h-8 text-[#C89211] mx-auto" />
                  <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                    Sign In with Your Mobile Number
                  </h3>
                  <p className="text-xs text-[#666666] max-w-md mx-auto leading-relaxed">
                    Verify your 10-digit Indian mobile number with a one-time SMS OTP to manage your profile, pay online via Razorpay, and access your order &amp; payment receipts.
                  </p>
                  {onOpenOtpLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenOtpLogin();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Login / Register with Mobile OTP</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-[#FAF8F4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-[#666666]">Verified Customer Account</div>
                      <h3 className="font-serif text-xl font-bold text-[#1A1A1A] mt-0.5">
                        {currentCustomer.name}
                      </h3>
                      <div className="text-xs text-[#555555] font-mono mt-1">
                        +91 {currentCustomer.mobile} · Joined{' '}
                        {new Date(currentCustomer.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingProfile(!editingProfile)}
                        className="px-3.5 py-2 rounded-xl border border-[#E5E5E5] bg-white hover:bg-stone-50 text-xs font-semibold text-[#1A1A1A] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{editingProfile ? 'Cancel Edit' : 'Edit Profile'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Authoritative Subscription Plan Status Card */}
                  {(() => {
                    const isVerifiedPremium = Boolean(
                      entitlement?.subscriptionPlan === 'premium' &&
                      entitlement?.isPremium &&
                      entitlement?.adsRemoved
                    );
                    const expiryIso = entitlement?.subscriptionExpiryDate || entitlement?.expiryDate || null;
                    const expiryFormatted = expiryIso
                      ? new Date(expiryIso).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : null;

                    return (
                      <div
                        id="profile-subscription-status-card"
                        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isVerifiedPremium
                            ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                            : 'bg-[#F8FAFC] border-[#E2E8F0]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Crown
                              className={`w-4 h-4 ${
                                isVerifiedPremium ? 'text-[#059669]' : 'text-[#F97316]'
                              }`}
                            />
                            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                              Subscription Plan
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                isVerifiedPremium ? 'text-[#065F46]' : 'text-[#0A2540]'
                              }`}
                            >
                              · {isVerifiedPremium ? 'Premium Plan (Active)' : 'Free Plan (Ad-Supported)'}
                            </span>
                          </div>
                          <p className="text-xs text-[#475569] leading-relaxed">
                            {isVerifiedPremium
                              ? `${entitlement?.planName || 'Ad-Free Premium'} is active${
                                  expiryFormatted ? ` until ${expiryFormatted}` : ''
                                }. All advertisements are disabled.`
                              : entitlement?.status === 'expired'
                              ? 'Your previous Premium subscription expired. Free Plan and standard ads are active.'
                              : 'You are on the Free Plan with standard ads enabled. Upgrade to Premium for an ad-free workspace.'}
                          </p>
                        </div>
                        {onOpenPremium && (
                          <button
                            id="btn-profile-upgrade-premium"
                            type="button"
                            onClick={onOpenPremium}
                            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                              isVerifiedPremium
                                ? 'bg-white hover:bg-[#F0FDF4] text-[#065F46] border border-[#A7F3D0]'
                                : 'bg-[#0B5ED7] hover:bg-[#084BB3] text-white'
                            }`}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>{isVerifiedPremium ? 'Manage Subscription' : 'Upgrade to Premium'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {editingProfile && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSavingProfile(true);
                        setError(null);
                        try {
                          const res = await updateCustomerAccountProfile({
                            name: profileName,
                            city: profileCity,
                            email: profileEmail,
                          });
                          if (!res.success || !res.customer) {
                            setError(res.error || 'Failed to update profile.');
                          } else {
                            if (onCustomerUpdated) onCustomerUpdated(res.customer);
                            setEditingProfile(false);
                            setSuccessMsg('Customer profile updated.');
                            setTimeout(() => setSuccessMsg(null), 3000);
                          }
                        } catch (err: any) {
                          setError(err?.message || 'Error updating profile.');
                        } finally {
                          setSavingProfile(false);
                        }
                      }}
                      className="p-5 rounded-2xl border border-[#E5E5E5] bg-white space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Full Name</label>
                          <input
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">City</label>
                          <input
                            type="text"
                            value={profileCity}
                            onChange={(e) => setProfileCity(e.target.value)}
                            placeholder="Enter your city"
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Email (Optional)</label>
                          <input
                            type="email"
                            value={profileEmail}
                            onChange={(e) => setProfileEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E5E5] text-xs"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-4 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white">
                      <div className="text-[#666666]">AI Wood Scan Balance</div>
                      <div className="text-xl font-bold font-mono tabular-nums text-[#C89211] mt-1">
                        {currentCustomer.woodScanCredits} Credits
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white">
                      <div className="text-[#666666]">Total Online Payments</div>
                      <div className="text-xl font-bold font-mono tabular-nums text-[#1A1A1A] mt-1">
                        {payments.length}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white">
                      <div className="text-[#666666]">Orders &amp; Quotations</div>
                      <div className="text-xl font-bold font-mono tabular-nums text-[#1A1A1A] mt-1">
                        {customerOrders.length + customerQuotes.length}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 0B: CUSTOMER PAYMENT HISTORY */}
          {activeTab === 'payments' && (
            <div id="customer-payment-history-panel" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">Payment History &amp; Receipts</h3>
                  <p className="text-xs text-[#666666]">
                    Verified Razorpay orders, payment IDs, amounts, status, and downloadable PDF receipts.
                  </p>
                </div>
              </div>

              {!currentCustomer ? (
                <div className="p-6 rounded-2xl border border-[#E5E5E5] bg-[#FAF8F4] text-center space-y-2.5">
                  <p className="text-xs text-[#666666]">
                    Sign in with your mobile number (OTP) to view your verified online payments and download receipts.
                  </p>
                  {onOpenOtpLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenOtpLogin();
                      }}
                      className="px-4 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white text-xs font-semibold cursor-pointer"
                    >
                      Sign In with Mobile OTP
                    </button>
                  )}
                </div>
              ) : payments.length === 0 ? (
                <div className="p-8 rounded-2xl border border-[#E5E5E5] bg-[#FAF8F4] text-center text-xs text-[#666666]">
                  No online payments yet. When you pay online for AI Wood Scan credits, Door Quotations, or Chaukhat frames, your verified receipts will appear here.
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl border border-[#E5E5E5] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="font-semibold text-sm text-[#1A1A1A]">{p.productName}</div>
                        <div className="text-[#666666] flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px]">
                          <span>Order: {p.razorpayOrderId}</span>
                          {p.razorpayPaymentId && <span>· Payment: {p.razorpayPaymentId}</span>}
                          <span>
                            ·{' '}
                            {new Date(p.paidAt || p.createdAt).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-0.5">
                          {p.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Paid
                            </span>
                          ) : p.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              Failed
                            </span>
                          ) : p.status === 'cancelled' ? (
                            <span className="inline-flex items-center gap-1 text-stone-600 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                          <span className="text-[#666666]">· {p.transactionId}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-base font-bold font-mono tabular-nums text-[#1A1A1A]">
                            ₹{Number(p.amountInr || 0).toLocaleString('en-IN')}
                          </div>
                          {p.receiptNumber && (
                            <div className="text-[10px] font-mono text-[#666666]">{p.receiptNumber}</div>
                          )}
                        </div>
                        {p.status === 'paid' && (
                          <button
                            type="button"
                            onClick={() => generatePaymentReceiptPDF(p, settings)}
                            className="px-3 py-2 rounded-xl bg-[#FFF7E3] border border-[#C89211]/40 text-[#A0700B] hover:bg-[#FCEEC8] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 0C: CUSTOMER ORDERS & QUOTES */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">Order &amp; Quotation History</h3>
                <p className="text-xs text-[#666666]">
                  Historical door orders and official quotations associated with your verified mobile number.
                </p>
              </div>

              {!currentCustomer ? (
                <div className="p-6 rounded-2xl border border-[#E5E5E5] bg-[#FAF8F4] text-center text-xs text-[#666666]">
                  Sign in with your mobile number (OTP) to view your order and quotation history.
                </div>
              ) : customerOrders.length === 0 && customerQuotes.length === 0 ? (
                <div className="p-8 rounded-2xl border border-[#E5E5E5] bg-[#FAF8F4] text-center text-xs text-[#666666]">
                  No orders or saved quotations linked to +91 {currentCustomer.mobile} yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {customerOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl border border-[#E5E5E5] bg-white flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-sm text-[#1A1A1A]">{ord.productName}</div>
                        <div className="text-[#666666] mt-0.5">
                          Order #{ord.orderNumber} · Qty {ord.quantity} · {ord.deliveryStatusText || ord.status}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums font-bold text-sm text-[#1A1A1A]">
                        ₹{Number(ord.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}

                  {customerQuotes.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-[#E5E5E5] bg-white flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-sm text-[#1A1A1A]">
                          {q.doorName || 'Custom Wood Door'} ({q.quoteNumber})
                        </div>
                        <div className="text-[#666666] mt-0.5">
                          {q.widthInch}&quot; × {q.heightInch}&quot; · {q.materialName} · Status: {q.status}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums font-bold text-sm text-[#C89211]">
                        ₹{Number(q.total || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: SAVED DOORS (FAVORITES) */}
          {FEATURE_FLAGS.doorCatalogue && activeTab === 'favorites' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">Your Saved Doors</h3>
                  <p className="text-xs text-[#666666]">
                    Bookmark your preferred Sagwan, Teak, and carved door designs to calculate prices or share anytime.
                  </p>
                </div>
              </div>

              {favoriteDoors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteDoors.map(door => (
                    <div
                      key={door.id}
                      className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden hover:border-[#C89211]/50 hover:shadow-md transition-all flex flex-col group shadow-sm"
                    >
                      <div className="relative aspect-[3/4] bg-[#F8F8F6] overflow-hidden">
                        <ProtectedImage
                          src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'}
                          alt={door.name}
                          watermarkSettings={settings?.contentProtection}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          containerClassName="w-full h-full"
                        />
                        <button
                          onClick={() => handleRemoveFavorite(door.id)}
                          title="Remove from Saved Doors"
                          className="absolute top-2 right-2 z-30 p-1.5 rounded-full bg-white/90 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="absolute bottom-2 left-2 z-30 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/95 text-[#C89211] border border-[#E5E5E5] shadow-sm">
                          {door.category}
                        </span>
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-[#1A1A1A] text-sm line-clamp-1">{door.name}</h4>
                          <p className="text-xs text-[#666666] mt-0.5">{door.material || 'Sagwan Wood'}</p>
                          <p className="text-xs font-semibold text-[#C89211] mt-2">
                            Starts from ₹{door.startingPrice?.toLocaleString('en-IN') || '15,000'}
                          </p>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#E5E5E5] flex items-center gap-2">
                          <button
                            onClick={() => {
                              onClose();
                              handleSelectDoor(door);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-[#F8F8F6] hover:bg-stone-200 text-[#1A1A1A] border border-[#E5E5E5] text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Specs</span>
                          </button>
                          <button
                            onClick={() => {
                              onClose();
                              handleCalculate(door);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-[#C89211] hover:bg-[#b07d08] text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Calculate</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-[#E5E5E5] bg-[#F8F8F6]">
                  <Heart className="w-12 h-12 text-[#999999] mx-auto mb-3" />
                  <h4 className="text-base font-bold text-[#1A1A1A]">No Saved Doors Yet</h4>
                  <p className="text-xs text-[#666666] max-w-sm mx-auto mt-1">
                    Click the heart icon on any door design in the Door Gallery to save it here for quick reference.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CALCULATION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">Your Saved Door Price Estimates</h3>
                  <p className="text-xs text-[#666666]">
                    Review and reload your past calculations, compare sizes, or share directly on WhatsApp.
                  </p>
                </div>
                {history.length > 0 && (
                  <button
                    id="btn-clear-history"
                    onClick={handleClearAllHistory}
                    className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {history.length > 0 ? (
                <div className="space-y-3.5">
                  {history.map(item => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#E5E5E5] rounded-xl p-4 hover:border-[#C89211]/50 hover:shadow-md transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {item.doorImage ? (
                            <ProtectedImage
                              src={item.doorImage}
                              alt=""
                              showWatermark={false}
                              watermarkSettings={settings?.contentProtection}
                              className="w-12 h-16 object-cover rounded-lg border border-[#E5E5E5] shrink-0"
                              containerClassName="w-12 h-16 shrink-0 rounded-lg overflow-hidden"
                            />
                          ) : (
                            <div className="w-12 h-16 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] flex items-center justify-center text-[#C89211] shrink-0">
                              <TreePine className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-[#1A1A1A] text-sm sm:text-base">
                                {item.doorName || 'Custom Engineered Door'}
                              </h4>
                              {item.quotationId && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Quoted
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#666666] mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right sm:self-center">
                          <span className="text-[11px] text-[#666666] block">Calculated Total</span>
                          <span className="font-serif text-lg sm:text-xl font-bold text-[#C89211]">
                            ₹{item.result.total?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Specs pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#E5E5E5] text-xs">
                        <div className="bg-[#F8F8F6] p-2 rounded-lg border border-[#E5E5E5]">
                          <span className="text-[10px] text-[#666666] block uppercase font-medium">Dimensions</span>
                          <span className="font-semibold text-[#1A1A1A]">
                            {item.result.widthInch}" × {item.result.heightInch}" ({item.result.sqFt})
                          </span>
                        </div>
                        <div className="bg-[#F8F8F6] p-2 rounded-lg border border-[#E5E5E5]">
                          <span className="text-[10px] text-[#666666] block uppercase font-medium">Timber Wood</span>
                          <span className="font-semibold text-[#1A1A1A] truncate block" title={item.result.materialName}>
                            {item.result.materialName}
                          </span>
                        </div>
                        <div className="bg-[#F8F8F6] p-2 rounded-lg border border-[#E5E5E5]">
                          <span className="text-[10px] text-[#666666] block uppercase font-medium">Finish Polish</span>
                          <span className="font-semibold text-[#1A1A1A] truncate block" title={item.result.finishName}>
                            {item.result.finishName}
                          </span>
                        </div>
                        <div className="bg-[#F8F8F6] p-2 rounded-lg border border-[#E5E5E5]">
                          <span className="text-[10px] text-[#666666] block uppercase font-medium">Chaukhat & Fit</span>
                          <span className="font-semibold text-[#1A1A1A] truncate block" title={item.result.frameName}>
                            {item.result.frameName}
                          </span>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-[#666666] bg-[#F8F8F6] p-2 rounded-lg italic border border-[#E5E5E5]">
                          "{item.notes}"
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
                        <button
                          onClick={() => handleDeleteCalculation(item.id)}
                          className="text-[#666666] hover:text-rose-600 text-xs flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleWhatsAppShare(item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>
                          <button
                            onClick={() => {
                              onClose();
                              handleLoadCalculation(item);
                            }}
                            className="px-3 py-1 rounded-lg bg-[#C89211] hover:bg-[#b07d08] text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Load in Calculator</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-[#E5E5E5] bg-[#F8F8F6]">
                  <Calculator className="w-12 h-12 text-[#999999] mx-auto mb-3" />
                  <h4 className="text-base font-bold text-[#1A1A1A]">No Saved Estimates Yet</h4>
                  <p className="text-xs text-[#666666] max-w-sm mx-auto mt-1">
                    Whenever you calculate a door price in the Price Calculator, click "Save Calculation" to save it here for later comparison.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Push Notifications */}
          {FEATURE_FLAGS.appMessages && activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                <div>
                  <h3 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#C89211]" />
                    <span>Push Notification Preferences</span>
                  </h3>
                  <p className="text-xs text-[#666666] mt-1">
                    Control which updates and alerts you receive on this device
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.enabled}
                    onChange={() => handleToggleNotifPref('enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C89211]"></div>
                </label>
              </div>

              {notificationPrefs.enabled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
                    <div>
                      <h4 className="text-xs font-semibold text-[#1A1A1A]">New Door Designs</h4>
                      <p className="text-[11px] text-[#666666]">Get notified when new Sagwan carving models and modern patterns arrive</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.newDesigns}
                      onChange={() => handleToggleNotifPref('newDesigns')}
                      className="w-4 h-4 rounded text-[#C89211] bg-white border-[#E5E5E5] focus:ring-[#C89211]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
                    <div>
                      <h4 className="text-xs font-semibold text-[#1A1A1A]">Factory Discounts & Festive Offers</h4>
                      <p className="text-[11px] text-[#666666]">Special seasonal discounts, bundle rates, and festive promotions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.offers}
                      onChange={() => handleToggleNotifPref('offers')}
                      className="w-4 h-4 rounded text-[#C89211] bg-white border-[#E5E5E5] focus:ring-[#C89211]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
                    <div>
                      <h4 className="text-xs font-semibold text-[#1A1A1A]">Wood Pricing Updates</h4>
                      <p className="text-[11px] text-[#666666]">Notifies when timber rates (CP Teak, Sal, Meranti) are revised</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.priceUpdates}
                      onChange={() => handleToggleNotifPref('priceUpdates')}
                      className="w-4 h-4 rounded text-[#C89211] bg-white border-[#E5E5E5] focus:ring-[#C89211]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5]">
                    <div>
                      <h4 className="text-xs font-semibold text-[#1A1A1A]">Door Care & Maintenance Tips</h4>
                      <p className="text-[11px] text-[#666666]">Expert guides on Sagwan wood preservation, polish maintenance, and weatherproofing</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.doorTips}
                      onChange={() => handleToggleNotifPref('doorTips')}
                      className="w-4 h-4 rounded text-[#C89211] bg-white border-[#E5E5E5] focus:ring-[#C89211]"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-center">
                  <p className="text-xs text-[#666666]">
                    Notifications are disabled. Toggle the switch above to receive alerts on new designs and factory offers.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AdMob Adaptive Banner Placement (Saved / Favorites Modal) */}
          <div className="pt-2">
            <AdMobBannerSlot placement="saved" settings={settings} />
          </div>

        </div>

      </div>
    </div>
  );
};
