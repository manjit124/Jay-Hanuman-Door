import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HomeBanner } from '../types.ts';

interface PromotionalBannerCarouselProps {
  banners: HomeBanner[];
  slotId: 'slot_1' | 'slot_2' | string;
  onBannerAction: (action: string) => void;
  className?: string;
  autoSlideInterval?: number; // ms, default 4500 (4.5s)
}

export const PromotionalBannerCarousel: React.FC<PromotionalBannerCarouselProps> = ({
  banners,
  slotId = 'slot_1',
  onBannerAction,
  className = '',
  autoSlideInterval = 4500,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageRatio, setImageRatio] = useState<number | null>(null);

  // Touch swipe coordinates for mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const isSlotA = slotId === 'slot_1' || slotId === 'slot_a';
  const isSlotB = slotId === 'slot_2' || slotId === 'slot_b';

  // Strictly filter banners assigned to this exact slot, sorted by order
  // NEVER fallback to slot="all" or other slots to prevent cross-contamination
  const displayBanners = React.useMemo(() => {
    return (banners || [])
      .filter(b => {
        if (b.active === false) return false;
        if (b.bannerType && b.bannerType !== 'promotion') return false;
        if (!b.image || typeof b.image !== 'string' || !b.image.trim()) return false;

        if (isSlotA) {
          return b.slot === 'slot_1' || b.slot === 'slot_a';
        }
        if (isSlotB) {
          return b.slot === 'slot_2' || b.slot === 'slot_b';
        }
        return b.slot === slotId;
      })
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [banners, slotId, isSlotA, isSlotB]);

  // Measure natural aspect ratio of the active banner image
  useEffect(() => {
    const activeBanner = displayBanners[currentIndex] || displayBanners[0];
    if (!activeBanner?.image) return;

    const img = new Image();
    img.src = activeBanner.image;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = img.naturalWidth / img.naturalHeight;
        // Clamp aspect ratio to compact card range (2.2 to 4.2)
        const clamped = Math.max(2.2, Math.min(4.2, ratio));
        setImageRatio(clamped);
      }
    };
  }, [displayBanners, currentIndex]);

  // Keep currentIndex valid when banner list changes
  useEffect(() => {
    if (currentIndex >= displayBanners.length) {
      setCurrentIndex(0);
    }
  }, [displayBanners.length, currentIndex]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (displayBanners.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + displayBanners.length) % displayBanners.length);
  }, [displayBanners.length]);

  const handleNext = useCallback(() => {
    if (displayBanners.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % displayBanners.length);
  }, [displayBanners.length]);

  // Auto-rotate every 4.5 seconds, paused during hover / user interaction
  useEffect(() => {
    if (displayBanners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [displayBanners.length, isPaused, autoSlideInterval, handleNext]);

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (_e: React.TouchEvent) => {
    // Tracking swipe
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

  // Clickable Destination Link Resolver
  const handleBannerClick = (banner: HomeBanner, e?: React.MouseEvent) => {
    if (e) {
      const target = e.target as HTMLElement;
      if (target.closest('button[data-carousel-arrow]') || target.closest('button[data-carousel-dot]')) {
        return;
      }
    }

    const destination = (banner.destinationUrl || '').trim();
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
      window.open(
        'https://wa.me/917887412884?text=' +
          encodeURIComponent('Hello Jai Hanuman Door, I am inquiring about your promotional door offer.'),
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    const cleanRoute = destination.replace(/^[\/#]+/, '').toLowerCase();
    if (banner.openInNewTab) {
      const targetUrl = cleanRoute ? `/${cleanRoute}` : '/';
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    onBannerAction(cleanRoute || 'gallery');
  };

  if (displayBanners.length === 0) return null;

  return (
    /* 
      Compact Flipkart-Style Promotional Deal Banner:
      - Small side margins with full-width responsive card: px-2.5 sm:px-4 lg:px-8
      - Compact horizontal dimensions: h-[140px] on mobile up to h-[180-200px] on desktop
      - width: 100%, height: 100%, object-fit: cover ensuring complete container width fill without empty sides
      - Strictly isolated to the assigned slot
    */
    <div className={`w-full max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-8 my-3 sm:my-4.5 ${className}`}>
      {/* Outer Banner Carousel Container */}
      <div
        className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-stone-200/90 shadow-xs hover:shadow-sm transition-all select-none group bg-[#F8F8F6] max-h-[160px] sm:max-h-[190px] lg:max-h-[220px] min-h-[105px] sm:min-h-[135px]"
        style={{
          aspectRatio: imageRatio ? `${imageRatio}` : '3 / 1',
        }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label={`Promotional Banner Slot ${slotId}`}
      >
        {/* Carousel Slides Track */}
        <div
          className="w-full h-full flex transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {displayBanners.map((banner, idx) => {
            const hasDestination = Boolean(banner.destinationUrl && banner.destinationUrl.trim());

            return (
              <div
                key={banner.id || idx}
                className={`w-full h-full flex-shrink-0 relative overflow-hidden flex items-center justify-center bg-[#F8F8F6] ${
                  hasDestination ? 'cursor-pointer' : 'cursor-default'
                }`}
                onClick={hasDestination ? e => handleBannerClick(banner, e) : undefined}
                title={hasDestination ? `Click to open ${banner.destinationUrl}` : undefined}
              >
                {/* 
                  Full-Width Promotional Banner Artwork:
                  - width: 100%, height: 100%, object-fit: cover
                  - Fills the complete container width edge-to-edge
                  - Clean matching background
                */}
                <img
                  src={banner.image}
                  alt={banner.title || `Promotional Banner ${idx + 1}`}
                  className="w-full h-full object-cover object-center block select-none"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  draggable={false}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              </div>
            );
          })}
        </div>

        {/* Previous Navigation Arrow (Visible when > 1 slide) */}
        {displayBanners.length > 1 && (
          <button
            type="button"
            data-carousel-arrow="true"
            onClick={e => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous Banner"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-stone-800 hover:text-[#C89211] border border-stone-200/90 shadow-md backdrop-blur-xs flex items-center justify-center transition-all opacity-85 sm:opacity-0 group-hover:opacity-100 cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Next Navigation Arrow (Visible when > 1 slide) */}
        {displayBanners.length > 1 && (
          <button
            type="button"
            data-carousel-arrow="true"
            onClick={e => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next Banner"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white text-stone-800 hover:text-[#C89211] border border-stone-200/90 shadow-md backdrop-blur-xs flex items-center justify-center transition-all opacity-85 sm:opacity-0 group-hover:opacity-100 cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        {/* Slide Indicators (Dots) */}
        {displayBanners.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-xs pointer-events-auto shadow-sm">
            {displayBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                data-carousel-dot="true"
                onClick={e => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-5 sm:w-7 h-1.5 sm:h-2 bg-[#C89211] shadow-xs'
                    : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/70 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
