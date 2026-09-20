import React from 'react';
import {
  Calculator,
  MessageCircle,
  DoorClosed,
  BookOpen,
  Layers,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import { BusinessSettings } from '../types.ts';
import { useAdminGesture } from '../hooks/useAdminGesture.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

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
  onOpenProfile?: (tab?: 'favorites' | 'history') => void;
  onOpenFavorites?: () => void;
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

  const resolvedBusinessName = settings?.businessName || businessName || 'Jai Hanuman Door';
  const resolvedWhatsapp = settings?.whatsappNumber || whatsappNumber || '7887412884';
  const resolvedFavCount = favoritesCount !== undefined ? favoritesCount : favoriteCount;

  const whatsappUrl = getWhatsAppUrl(
    resolvedWhatsapp,
    `Hello ${resolvedBusinessName}, I would like to inquire about your handcrafted doors and price estimates.`
  );

  const handleOpenSaved = () => {
    if (onOpenFavorites) {
      onOpenFavorites();
    } else if (onOpenProfile) {
      onOpenProfile('favorites');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-stone-100 shadow-md">
      {/* Subtle feedback toast on successful 6th tap */}
      {isOpeningFeedback && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-stone-900/95 border border-amber-500/50 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold text-amber-300 animate-in fade-in slide-in-from-top-2 duration-150">
          <ShieldCheck className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Opening secure access...</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Name (Protected 6-tap hidden gesture) */}
          <button
            id="brand-logo"
            data-testid="brand-logo"
            onClick={e => {
              handleLogoTap(e);
              handleNav('home');
            }}
            className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer select-none"
            title={resolvedBusinessName}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-900/30 border border-amber-500/30 group-hover:scale-105 transition-transform">
              <DoorClosed className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-stone-100 group-hover:text-amber-400 transition-colors">
                  {resolvedBusinessName}
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Manufacturer
                </span>
              </div>
              <p className="text-xs text-stone-400 hidden sm:block line-clamp-1">
                {settings?.tagline || tagline || 'Master Craftsmen in Sagwan & Teak Wood Doors'}
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              id="nav-home"
              onClick={() => handleNav('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === 'home'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              Home
            </button>
            <button
              id="nav-gallery"
              onClick={() => handleNav('gallery')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === 'gallery'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              Door Designs
            </button>
            <button
              id="nav-calculator"
              onClick={() => handleNav('calculator')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === 'calculator'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              Price Calculator
            </button>
            <button
              id="nav-articles"
              onClick={() => handleNav('articles')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === 'articles'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              Wood Guide & Articles
            </button>
            <button
              id="nav-contact"
              onClick={() => handleNav('contact')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === 'contact'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              Contact & Workshop
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Saved Doors / Estimates Button (Public, No Login Required) */}
            <button
              id="nav-favorites-btn"
              onClick={handleOpenSaved}
              title="My Saved Doors & Estimates"
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-stone-200 hover:text-amber-300 border border-stone-700/60 transition-colors text-xs sm:text-sm font-medium"
            >
              <Heart className={`w-4 h-4 ${resolvedFavCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-stone-400'}`} />
              <span className="hidden sm:inline">Saved</span>
              {resolvedFavCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-sm">
                  {resolvedFavCount}
                </span>
              )}
            </button>

            {/* Direct WhatsApp Action */}
            <a
              id="nav-whatsapp-btn"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/30 transition-all shadow-sm"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-300" />
              <span>WhatsApp</span>
            </a>

            {/* Calculate Price Button */}
            <button
              id="nav-calc-cta"
              onClick={() => handleNav('calculator')}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 transition-all shadow-md"
            >
              <Calculator className="w-4 h-4" />
              Calculate Price
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
