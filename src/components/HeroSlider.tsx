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
    <div className="relative w-full overflow-hidden bg-stone-950 text-stone-100 min-h-[480px] sm:min-h-[540px] lg:min-h-[580px] flex items-center">
      {/* Background Image with Opacity & Gradient Overlay */}
      <div className="absolute inset-0 z-0 select-none">
        <img
          src={currentBanner.image}
          alt={currentBanner.title}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="w-full h-full object-cover object-center brightness-40 transition-all duration-700 ease-out pointer-events-none select-none"
          onError={(e) => {
            // Fallback if image fails
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/50 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full">
        <div className="max-w-2xl">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>100% Seasoned Timber • Direct Factory Pricing</span>
          </div>

          {/* Main Title */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4 text-balance">
            {currentBanner.title}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-stone-300 mb-8 max-w-xl leading-relaxed">
            {currentBanner.subtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              id="hero-calc-btn"
              onClick={() => onNavigate('calculator')}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-900/40 hover:shadow-amber-900/60 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              Calculate Door Price
            </button>

            <button
              id="hero-browse-btn"
              onClick={() => onNavigate ? onNavigate('gallery') : onBannerAction?.('gallery')}
              className="px-6 py-3.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-100 font-semibold text-sm sm:text-base border border-stone-700 transition-all flex items-center gap-2"
            >
              <Layers className="w-5 h-5 text-amber-400" />
              Browse Door Designs
            </button>

            <a
              id="hero-whatsapp-btn"
              href={getWhatsAppUrl(
                resolvedWhatsapp,
                `Hello ${resolvedBusinessName}, I would like to get a quote for a custom wooden door.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 font-medium text-sm sm:text-base border border-emerald-600/40 transition-all"
            >
              <MessageCircle className="w-5 h-5 text-emerald-300" />
              <span className="hidden sm:inline">WhatsApp Enquiry</span>
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="mt-8 sm:mt-10 pt-6 border-t border-stone-800/80 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-stone-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span>CP Sagwan & Sal Wood</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span>Transparent Price Breakdown</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
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
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-stone-900/60 hover:bg-stone-900/90 text-stone-300 flex items-center justify-center backdrop-blur-sm border border-stone-700/50 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            id="hero-next-btn"
            onClick={() => setCurrentIndex(prev => (prev + 1) % activeBanners.length)}
            aria-label="Next Slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-stone-900/60 hover:bg-stone-900/90 text-stone-300 flex items-center justify-center backdrop-blur-sm border border-stone-700/50 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {activeBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  currentIndex === i ? 'w-8 bg-amber-500' : 'w-2 bg-stone-600'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
