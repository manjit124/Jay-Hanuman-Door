import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import { HomeBanner, BusinessSettings } from '../types.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

interface HomepageBannerSliderProps {
  banners: HomeBanner[];
  settings?: BusinessSettings;
  onNavigate?: (route: string) => void;
  className?: string;
  autoSlideInterval?: number; // ms, default 4500 (4.5s)
}

export const HomepageBannerSlider: React.FC<HomepageBannerSliderProps> = ({
  banners = [],
  settings,
  onNavigate,
  className = '',
  autoSlideInterval = 4500,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Filter only enabled main banners and sort by order
  const activeBanners = React.useMemo(() => {
    let list = (banners || []).filter(
      b =>
        b.active !== false &&
        (b.bannerType === 'main' ||
          b.slot === 'hero' ||
          b.slot === 'main' ||
          (!b.bannerType && (!b.slot || b.slot === 'hero' || b.slot === 'main' || b.id === 'ban-1' || b.id === 'ban-3')))
    );

    list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    // Fallback if no main banner is configured yet
    if (list.length === 0) {
      list = [
        {
          id: 'default-main-banner-1',
          bannerType: 'main',
          title: 'Direct From Manufacturer: Premium Sagwan Wood Doors',
          subtitle: 'Precision Handcrafted, Seasoned Timber & Transparent Square Feet Pricing',
          image: '/uploads/184809-1792324353484-424213.png',
          buttonText: 'Calculate Door Price',
          buttonAction: 'calculator',
          destinationUrl: 'calculator',
          order: 1,
          active: true,
          slot: 'hero',
        },
      ];
    }

    return list;
  }, [banners]);

  // Touch Swipe tracking refs for mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Keep currentIndex in bounds if activeBanners length changes
  useEffect(() => {
    if (activeBanners.length > 0 && currentIndex >= activeBanners.length) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  const handlePrev = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  const handleNext = useCallback(() => {
    if (activeBanners.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  // Auto-slide effect (4.5s default)
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused, autoSlideInterval, handleNext]);

  // Touch Handlers for Mobile Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (_e: React.TouchEvent) => {
    // Tracking
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartXRef.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - (touchStartYRef.current || 0);

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Route & Link Resolver
  const handleBannerClick = (banner: HomeBanner, e?: React.MouseEvent) => {
    if (e) {
      const target = e.target as HTMLElement;
      if (target.closest('button[data-nav-arrow]') || target.closest('button[data-nav-dot]')) return;
    }

    const destination = (banner.destinationUrl || banner.buttonAction || '').trim();
    if (!destination) {
      return;
    }

    const isExternal =
      destination.startsWith('http://') ||
      destination.startsWith('https://') ||
      destination.startsWith('//') ||
      destination.startsWith('tel:') ||
      destination.startsWith('mailto:');

    if (isExternal) {
      if (banner.openInNewTab !== false) {
        window.open(destination, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = destination;
      }
      return;
    }

    if (destination === 'whatsapp') {
      const phone = settings?.whatsappNumber || '7887412884';
      const bizName = settings?.businessName || 'Jai Hanuman Door';
      const waUrl = getWhatsAppUrl(
        phone,
        `Hello ${bizName}, I am inquiring about the banner: "${banner.title}"`
      );
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const cleanRoute = destination.replace(/^[\/#]+/, '').toLowerCase();
    if (banner.openInNewTab) {
      const targetUrl = cleanRoute ? `/${cleanRoute}` : '/';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (onNavigate) {
      onNavigate(cleanRoute || 'gallery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (activeBanners.length === 0) {
    return null;
  }

  return (
    <div
      className={`w-full relative overflow-hidden select-none bg-stone-900 group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Main Hero Banner Slider"
    >
      {/* 
        Preserved Hero Banner Size & Layout:
        - Desktop 400-460px, Tablet 320px, Mobile 220px
        - Displays hero background image with full fidelity
        - Displays text overlay (badge, title, subtitle) and custom CTA button
      */}
      <div className="relative w-full h-[220px] sm:h-[320px] md:h-[400px] lg:h-[460px] overflow-hidden">
        {/* Slides Track */}
        <div
          className="w-full h-full flex transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {activeBanners.map((banner, idx) => {
            const hasCustomText = Boolean(banner.title && banner.title.trim());
            const hasButton = Boolean(banner.buttonText && banner.buttonText.trim());
            const hasDestination = Boolean((banner.destinationUrl && banner.destinationUrl.trim()) || (banner.buttonAction && banner.buttonAction.trim()));

            return (
              <div
                key={banner.id || idx}
                className={`w-full h-full flex-shrink-0 relative overflow-hidden bg-stone-950 ${
                  hasDestination ? 'cursor-pointer' : 'cursor-default'
                }`}
                onClick={e => handleBannerClick(banner, e)}
              >
                {/* Banner Background Image */}
                <img
                  src={banner.image}
                  alt={banner.title || `Main Banner ${idx + 1}`}
                  draggable={false}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80';
                  }}
                />

                {/* Dark Gradient Overlay for text readability */}
                {hasCustomText ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent max-w-3xl" />
                  </>
                ) : hasButton ? (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                ) : (
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                )}

                {/* Overlay Content (Title, Subtitle, CTA Button, Badge) */}
                {(hasCustomText || hasButton || banner.badge) && (
                  <div className="absolute inset-0 z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 flex flex-col justify-end sm:justify-center pb-8 sm:pb-6 pointer-events-none">
                    <div className="max-w-2xl py-2 sm:py-6 pointer-events-auto">
                      {/* Optional Badge */}
                      {banner.badge && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] sm:text-xs font-semibold mb-2 sm:mb-3 backdrop-blur-sm">
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{banner.badge}</span>
                        </div>
                      )}

                      {/* Main Title */}
                      {hasCustomText && (
                        <h2 className="font-serif text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-1 sm:mb-2 text-balance drop-shadow-md">
                          {banner.title}
                        </h2>
                      )}

                      {/* Optional Subtitle */}
                      {banner.subtitle && (
                        <p className="text-white/90 text-xs sm:text-sm md:text-base line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-5 max-w-xl leading-relaxed drop-shadow">
                          {banner.subtitle}
                        </p>
                      )}

                      {/* Custom CTA Button */}
                      {hasButton && (
                        <div className="inline-block mt-1 sm:mt-0">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleBannerClick(banner);
                            }}
                            className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                          >
                            <span>{banner.buttonText}</span>
                            {banner.destinationUrl?.startsWith('http://') || banner.destinationUrl?.startsWith('https://') ? (
                              <ExternalLink className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Carousel Navigation Arrows (Only when > 1 slide) */}
        {activeBanners.length > 1 && (
          <>
            <button
              type="button"
              data-nav-arrow="true"
              onClick={e => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous Slide"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              type="button"
              data-nav-arrow="true"
              onClick={e => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next Slide"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Clickable Pagination Indicator Dots */}
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-md">
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-nav-arrow="true"
                  onClick={e => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    currentIndex === idx
                      ? 'w-6 sm:w-8 h-1.5 sm:h-2 bg-[#C89211] shadow-sm'
                      : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/50 hover:bg-white/90'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
