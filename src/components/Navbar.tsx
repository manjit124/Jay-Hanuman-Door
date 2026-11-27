import React from 'react';
import {
  Calculator,
  Heart,
  ShieldCheck,
  Sparkles,
  Truck,
  Box,
  User,
  Crown,
} from 'lucide-react';
import { BusinessSettings, CustomerAccount } from '../types.ts';
import { useAdminGesture } from '../hooks/useAdminGesture.ts';
import { SlidingWindowIcon } from './sliding-window/SlidingWindowIcon.tsx';
import { FEATURE_FLAGS } from '../config/featureFlags.ts';
import {
  BRAND_LOGO_URL,
  resolveBrandLogoUrl,
  resolveBrandName,
  resolveBrandTagline,
} from '../config/brand.ts';

interface NavbarProps {
  currentTab?: string;
  activeView?: string;
  setCurrentTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  settings?: BusinessSettings;
  businessName?: string;
  tagline?: string;
  whatsappNumber?: string;
  onOpenAdmin?: () => void;
  onTriggerAdminAccess?: () => void;
  isAdminLoggedIn?: boolean;
  favoriteCount?: number;
  favoritesCount?: number;
  onOpenProfile?: (tab?: 'account' | 'payments' | 'orders' | 'favorites' | 'history') => void;
  onOpenFavorites?: () => void;
  currentCustomer?: CustomerAccount | null;
  onOpenCustomerAuth?: () => void;
  isPremium?: boolean;
  // Legacy optional props retained so callers don't break
  currentUser?: any;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  activeView,
  setCurrentTab,
  onNavigate,
  settings,
  businessName,
  tagline,
  whatsappNumber,
  onOpenAdmin,
  onTriggerAdminAccess,
  favoriteCount = 0,
  favoritesCount,
  onOpenProfile,
  onOpenFavorites,
  currentCustomer,
  onOpenCustomerAuth,
  isPremium = false,
}) => {
  const current = currentTab || activeView || 'home';
  const handleNav = (tab: string) => {
    if (setCurrentTab) setCurrentTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  const { handleTap: handleLogoTap, isOpeningFeedback } = useAdminGesture({
    requiredTaps: 6,
    maxIntervalMs: 500,
    maxTotalTimeMs: 2500,
    onSuccess: () => {
      if (onTriggerAdminAccess) {
        onTriggerAdminAccess();
      } else if (onOpenAdmin) {
        onOpenAdmin();
      }
    },
  });

  const resolvedBusinessName = resolveBrandName(settings?.businessName || businessName);
  const resolvedTagline = resolveBrandTagline(settings?.tagline || tagline);
  const resolvedLogoUrl = resolveBrandLogoUrl(settings?.logoUrl);
  const resolvedFavCount = favoritesCount !== undefined ? favoritesCount : favoriteCount;

  const handleOpenSaved = () => {
    if (!FEATURE_FLAGS.doorCatalogue) {
      if (onOpenProfile) {
        onOpenProfile('history');
      } else if (onOpenFavorites) {
        onOpenFavorites();
      }
      return;
    }
    if (onOpenFavorites) {
      onOpenFavorites();
    } else if (onOpenProfile) {
      onOpenProfile('favorites');
    }
  };

  const navLinkCls = (isActive: boolean) =>
    `px-2.5 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      isActive
        ? 'bg-[#EFF6FF] text-[#0B5ED7] border border-[#BFDBFE] font-semibold'
        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] text-[#0F172A] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Subtle feedback toast on successful 6th tap */}
      {isOpeningFeedback && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white border border-[#0B5ED7] rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold text-[#0B5ED7] animate-in fade-in slide-in-from-top-2 duration-150">
          <ShieldCheck className="w-4 h-4 text-[#0B5ED7] animate-pulse" />
          <span>Opening secure access...</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px] sm:h-16">
          {/* Brand Logo & Name (Protected 6-tap hidden gesture) */}
          <button
            id="brand-logo"
            data-testid="brand-logo"
            onClick={(e) => {
              handleLogoTap(e);
              handleNav('home');
            }}
            className="flex items-center gap-2.5 sm:gap-3 text-left group focus:outline-none cursor-pointer select-none shrink-0"
            title={resolvedBusinessName}
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden border border-[#E2E8F0] bg-white shadow-xs group-hover:border-[#0B5ED7] transition-colors shrink-0 flex items-center justify-center p-0.5">
              <img
                src={resolvedLogoUrl}
                alt={resolvedBusinessName}
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = BRAND_LOGO_URL;
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#0A2540] group-hover:text-[#0B5ED7] transition-colors leading-none">
                  {resolvedBusinessName}
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#475569] hidden sm:block line-clamp-1 mt-0.5">
                {resolvedTagline}
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 min-w-0 overflow-x-auto no-scrollbar mx-2">
            <button id="nav-home" onClick={() => handleNav('home')} className={navLinkCls(current === 'home')}>
              Home
            </button>
            <button
              id="nav-sliding-window"
              onClick={() => handleNav('sliding-window')}
              className={`${navLinkCls(current === 'sliding-window')} flex items-center gap-1.5`}
            >
              <SlidingWindowIcon className="w-4 h-4 text-[#0B5ED7]" />
              <span>Window Calculator</span>
            </button>
            {FEATURE_FLAGS.doorCatalogue && (
              <button
                id="nav-gallery"
                onClick={() => handleNav('gallery')}
                className={navLinkCls(current === 'gallery')}
              >
                Designs
              </button>
            )}
            <button
              id="nav-calculator"
              onClick={() => handleNav('calculator')}
              className={navLinkCls(current === 'calculator')}
            >
              Estimator
            </button>
            {FEATURE_FLAGS.visualizer3dAr && (
              <button
                id="nav-visualizer"
                onClick={() => handleNav('visualizer')}
                className={`${navLinkCls(current === 'visualizer' || current === 'fitting')} flex items-center gap-1.5`}
              >
                <Box className="w-3.5 h-3.5 text-[#0B5ED7]" />
                <span>3D View</span>
              </button>
            )}
            <button
              id="nav-wood-detector"
              onClick={() => handleNav('wood-detector')}
              className={`${navLinkCls(current === 'wood-detector')} flex items-center gap-1.5`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
              <span>AI Detector</span>
            </button>
            {FEATURE_FLAGS.articlesBlog && (
              <button
                id="nav-articles"
                onClick={() => handleNav('articles')}
                className={navLinkCls(current === 'articles')}
              >
                Guides
              </button>
            )}
            <button
              id="nav-about"
              onClick={() => handleNav('about')}
              className={navLinkCls(current === 'about')}
            >
              About
            </button>
            <button
              id="nav-contact"
              onClick={() => handleNav('contact')}
              className={navLinkCls(current === 'contact')}
            >
              Contact
            </button>
            {FEATURE_FLAGS.orderTracking && (
              <button
                id="nav-track"
                onClick={() => handleNav('tracking')}
                className={`${navLinkCls(current === 'tracking')} flex items-center gap-1.5`}
              >
                <Truck className="w-3.5 h-3.5 text-[#0B5ED7]" />
                <span>Track</span>
              </button>
            )}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {FEATURE_FLAGS.orderTracking && (
              <button
                id="nav-track-btn"
                onClick={() => handleNav('tracking')}
                title="Track Live Order"
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium border whitespace-nowrap shrink-0 cursor-pointer ${
                  current === 'tracking'
                    ? 'bg-[#EFF6FF] text-[#0B5ED7] border-[#0B5ED7]'
                    : 'bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] hover:text-[#0B5ED7] border-[#E2E8F0]'
                }`}
              >
                <Truck className="w-4 h-4 text-[#0B5ED7]" />
                <span className="hidden sm:inline">Track</span>
              </button>
            )}

            {/* Ad-Free Premium Upgrade / Status Button */}
            <button
              id="nav-premium-btn"
              type="button"
              onClick={() => handleNav('premium')}
              title={isPremium ? 'Premium Plan Active (Ad-Free)' : 'Free Plan — Upgrade to Premium to Remove Ads'}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-semibold border whitespace-nowrap shrink-0 cursor-pointer ${
                isPremium
                  ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                  : current === 'premium'
                  ? 'bg-[#FFF7ED] text-[#EA580C] border-[#F97316]'
                  : 'bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]'
              }`}
            >
              <Crown className={`w-3.5 h-3.5 ${isPremium ? 'text-[#059669]' : 'text-[#F97316]'}`} />
              <span>{isPremium ? 'Premium Active' : 'Go Premium'}</span>
            </button>

            {/* Customer Mobile OTP Login / Verified Account Button */}
            {currentCustomer ? (
              <button
                id="nav-customer-account-btn"
                type="button"
                onClick={() => onOpenProfile && onOpenProfile('payments')}
                title={`Signed in as ${currentCustomer.name} (+91 ${currentCustomer.mobile})`}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#0B5ED7] border border-[#BFDBFE] transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <User className="w-4 h-4 text-[#0B5ED7]" />
                <span className="max-w-[96px] truncate">{currentCustomer.name}</span>
              </button>
            ) : (
              onOpenCustomerAuth && (
                <button
                  id="nav-customer-login-btn"
                  type="button"
                  onClick={onOpenCustomerAuth}
                  title="Sign in with Mobile OTP"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#0F172A] hover:text-[#0B5ED7] border border-[#E2E8F0] transition-colors text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#0B5ED7]" />
                  <span>Login</span>
                </button>
              )
            )}

            {/* Saved Estimates / Sheets Button */}
            <button
              id="nav-favorites-btn"
              onClick={handleOpenSaved}
              title="My Saved Sheets & Estimates"
              className="relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] hover:text-[#0B5ED7] border border-[#E2E8F0] transition-colors text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Heart
                className={`w-4 h-4 ${
                  FEATURE_FLAGS.doorCatalogue && resolvedFavCount > 0
                    ? 'text-rose-500 fill-rose-500'
                    : 'text-[#475569]'
                }`}
              />
              <span className="hidden sm:inline">Saved</span>
              {FEATURE_FLAGS.doorCatalogue && resolvedFavCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white shadow-sm leading-none">
                  {resolvedFavCount}
                </span>
              )}
            </button>

            {/* Primary WindowCut Pro Calculator CTA */}
            <button
              id="nav-calc-cta"
              onClick={() => handleNav('sliding-window')}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#0B5ED7] hover:bg-[#084BB3] text-white transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-white" />
              <span>Calculate</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
