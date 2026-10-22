import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calculator, Layers, MessageCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { HomeBanner, BusinessSettings } from '../types.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

interface HeroSliderProps {
  banners: HomeBanner[];
  settings?: BusinessSettings;
  onNavigate?: (tab: string) => void;
  onBannerAction?: (action: string) => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ banners, settings, onNavigate, onBannerAction }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const resolvedWhatsapp = settings?.whatsappNumber || '7887412884';
  const resolvedBusinessName = settings?.businessName || 'Jai Hanuman Door';

  const activeBanners = banners.length > 0 ? banners : [
    {
      id: 'default-1',
      title: 'Direct From Manufacturer: Premium Sagwan Wood Doors',
      subtitle: 'Precision Handcrafted, Seasoned Timber & Transparent Square Feet Pricing',
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
      buttonText: 'Calculate Door Price',
      buttonAction: 'calculator',
      order: 1,
      active: true,
    }
  ];

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];

  const handleAction = (action: string) => {
    if (onBannerAction) {
      onBannerAction(action);
      return;
    }
    if (action === 'whatsapp') {
      window.open(getWhatsAppUrl(resolvedWhatsapp, `Hello ${resolvedBusinessName}, I would like to inquire about custom door manufacturing.`), '_blank');
    } else if (onNavigate) {
      onNavigate(action || 'calculator');
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-[#1A1A1A] text-white min-h-[290px] sm:min-h-[380px] lg:min-h-[440px] flex items-center">
      {/* Background Image with Opacity & Gradient Overlay */}
      <div className="absolute inset-0 z-0 select-none">
        <img
          src={currentBanner.image}
          alt={currentBanner.title}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full object-cover object-center brightness-50 transition-all duration-700 ease-out pointer-events-none select-none"
          onError={(e) => {
            // Fallback if image fails
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 w-full">
        <div className="max-w-2xl">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] sm:text-xs font-medium mb-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>100% Seasoned Timber • Direct Factory Pricing</span>
          </div>

          {/* Main Title */}
          <h1 className="font-serif text-xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-1.5 sm:mb-2.5 text-balance">
            {currentBanner.title}
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-white/90 mb-3 sm:mb-5 max-w-xl leading-relaxed line-clamp-2 sm:line-clamp-none">
            {currentBanner.subtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              id="hero-calc-btn"
              onClick={() => onNavigate ? onNavigate('calculator') : onBannerAction?.('calculator')}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5 sm:gap-2 cursor-pointer h-10 sm:h-11"
            >
              <Calculator className="w-4 h-4 text-white" />
              <span>Calculate Door Price</span>
            </button>

            <button
              id="hero-browse-btn"
              onClick={() => onNavigate ? onNavigate('gallery') : onBannerAction?.('gallery')}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white/90 hover:bg-white text-[#1A1A1A] font-semibold text-xs sm:text-sm border border-white/80 shadow-sm backdrop-blur-sm transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer h-10 sm:h-11"
            >
              <Layers className="w-4 h-4 text-[#C89211]" />
              <span>Browse Door Designs</span>
            </button>

            <a
              id="hero-whatsapp-btn"
              href={getWhatsAppUrl(
                resolvedWhatsapp,
                `Hello ${resolvedBusinessName}, I would like to get a quote for a custom wooden door.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#16803A] hover:bg-[#126830] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer h-10 sm:h-11"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">WhatsApp Enquiry</span>
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/20 flex flex-wrap items-center gap-3 sm:gap-6 text-[11px] sm:text-xs text-white/80">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C89211]" />
              <span>CP Sagwan &amp; Sal Wood</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Transparent Price Breakdown</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Instant PDF Quotation</span>
            </div>
          </div>

        </div>
      </div>

      {/* Slider Controls (if multiple banners) */}
      {activeBanners.length > 1 && (
        <>
          <button
            id="hero-prev-btn"
            onClick={() => setCurrentIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length)}
            aria-label="Previous Slide"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-[#1A1A1A] flex items-center justify-center backdrop-blur-sm border border-white/60 shadow-md transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            id="hero-next-btn"
            onClick={() => setCurrentIndex(prev => (prev + 1) % activeBanners.length)}
            aria-label="Next Slide"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/80 hover:bg-white text-[#1A1A1A] flex items-center justify-center backdrop-blur-sm border border-white/60 shadow-md transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {activeBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  currentIndex === i ? 'w-6 bg-[#C89211]' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
