import React from 'react';
import {
  Calculator,
  MessageCircle,
  DoorClosed,
  BookOpen,
  Layers,
  Heart,
  ShieldCheck,
  Sparkles,
  Truck,
  Box,
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] text-[#1A1A1A] shadow-sm">
      {/* Subtle feedback toast on successful 6th tap */}
      {isOpeningFeedback && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white border border-[#C89211] rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold text-[#C89211] animate-in fade-in slide-in-from-top-2 duration-150">
          <ShieldCheck className="w-4 h-4 text-[#C89211] animate-pulse" />
          <span>Opening secure access...</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[58px] sm:h-16">
          
          {/* Brand Logo & Name (Protected 6-tap hidden gesture) */}
          <button
            id="brand-logo"
            data-testid="brand-logo"
            onClick={e => {
              handleLogoTap(e);
              handleNav('home');
            }}
            className="flex items-center gap-2.5 sm:gap-3 text-left group focus:outline-none cursor-pointer select-none"
            title={resolvedBusinessName}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C89211] to-[#A0700B] flex items-center justify-center shadow-md shadow-[#C89211]/20 border border-[#C89211]/30 group-hover:scale-105 transition-transform flex-shrink-0">
              <DoorClosed className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-serif text-base sm:text-xl font-bold tracking-tight text-[#1A1A1A] group-hover:text-[#C89211] transition-colors line-clamp-1">
                  {resolvedBusinessName}
                </span>
                <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30">
                  Manufacturer
                </span>
              </div>
              <p className="text-[11px] text-[#666666] hidden sm:block line-clamp-1">
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
                  ? 'bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 font-semibold'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6]'
              }`}
            >
              Home
            </button>
            <button
              id="nav-gallery"
              onClick={() => handleNav('gallery')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === 'gallery'
                  ? 'bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 font-semibold'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6]'
              }`}
            >
              Door Designs
            </button>
            <button
              id="nav-calculator"
              onClick={() => handleNav('calculator')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === 'calculator'
                  ? 'bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 font-semibold'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6]'
              }`}
            >
              Price Calculator
            </button>
            <button
              id="nav-visualizer"
              onClick={() => handleNav('visualizer')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                current === 'visualizer' || current === 'fitting'
                  ? 'bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 font-semibold'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6]'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-[#C89211]" />
              <span>3D &amp; AR Fitting</span>
            </button>
            <button
              id="nav-wood-detector"
              onClick={() => handleNav('wood-detector')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                current === 'wood-detector'
                  ? 'bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 font-semibold'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C89211]" />
              <span>AI Wood Detector</span>
            </button>
            <button
              id="nav-articles"
              onClick={() => handleNav('articles')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === 'articles'
                  ? 'bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 font-semibold'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6]'
              }`}
            >
              Wood Guide & Articles
            </button>
            <button
              id="nav-contact"
              onClick={() => handleNav('contact')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                current === 'contact'
                  ? 'bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 font-semibold'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6]'
              }`}
            >
              Contact & Workshop
            </button>
            <button
              id="nav-track"
              onClick={() => handleNav('tracking')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                current === 'tracking'
                  ? 'bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 font-semibold'
                  : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6]'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Track Order</span>
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Track Order Quick Action */}
            <button
              id="nav-track-btn"
              onClick={() => handleNav('tracking')}
              title="Track Live Order"
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium border ${
                current === 'tracking'
                  ? 'bg-[#FFF7E3] text-[#C89211] border-[#C89211]'
                  : 'bg-[#F7F7F7] hover:bg-[#EFEFEF] text-[#1A1A1A] hover:text-[#C89211] border-[#E5E5E5]'
              }`}
            >
              <Truck className="w-4 h-4 text-[#C89211]" />
              <span className="hidden sm:inline">Track</span>
            </button>

            {/* Saved Doors / Estimates Button (Public, No Login Required) */}
            <button
              id="nav-favorites-btn"
              onClick={handleOpenSaved}
              title="My Saved Doors & Estimates"
              className="relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#F7F7F7] hover:bg-[#EFEFEF] text-[#1A1A1A] hover:text-[#C89211] border border-[#E5E5E5] transition-colors text-xs sm:text-sm font-medium"
            >
              <Heart className={`w-4 h-4 ${resolvedFavCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-[#666666]'}`} />
              <span className="hidden sm:inline">Saved</span>
              {resolvedFavCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white shadow-sm leading-none">
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
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#16803A] hover:bg-[#126830] text-white transition-all shadow-sm"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>WhatsApp</span>
            </a>

            {/* Calculate Price Button */}
            <button
              id="nav-calc-cta"
              onClick={() => handleNav('calculator')}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#C89211] hover:bg-[#A0700B] text-white transition-all shadow-sm cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-white" />
              <span>Calculate Price</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
