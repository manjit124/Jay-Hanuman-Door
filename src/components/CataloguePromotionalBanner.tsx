import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Calculator,
  Layers,
  Box,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Award,
  TreePine,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { HomeBanner, Door } from '../types.ts';

export const DEFAULT_CATALOGUE_BANNERS: HomeBanner[] = [
  {
    id: 'cat-banner-1',
    title: '100% Genuine Sagwan Doors',
    subtitle: 'Direct Factory Pricing • 100% Kiln-Dried CP Teak Wood',
    badge: 'Direct From Manufacturer',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    buttonText: 'Explore Collection',
    buttonAction: 'gallery',
    order: 1,
    active: true,
  },
  {
    id: 'cat-banner-2',
    title: 'Premium Main Door Collection',
    subtitle: 'Custom Millimetre Sizes & Royal Jodi Darwaja Archways',
    badge: 'Handcrafted Heritage',
    image: 'https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=800&q=80',
    buttonText: 'View in 3D / AR',
    buttonAction: 'visualizer',
    order: 2,
    active: true,
  },
  {
    id: 'cat-banner-3',
    title: 'Calculate Your Door Price',
    subtitle: 'Get an instant approximate factory quotation in 30 seconds',
    badge: 'Live Cost Estimator',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    buttonText: 'Calculate Now',
    buttonAction: 'calculator',
    order: 3,
    active: true,
  },
  {
    id: 'cat-banner-4',
    title: '3D / AR Door Visualization',
    subtitle: 'See how the door fits onto your home entrance with Live AR Camera',
    badge: 'Virtual Fitting Room',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    buttonText: 'Try 3D / AR Studio',
    buttonAction: 'visualizer',
    order: 4,
    active: true,
  },
  {
    id: 'cat-banner-5',
    title: 'Custom Frame & Timber Solutions',
    subtitle: 'Matching Teak & Sal wood Chaukhats seasoned to 8-12% moisture',
    badge: 'Precision Joinery',
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
    buttonText: 'Get Quote',
    buttonAction: 'calculator',
    order: 5,
    active: true,
  },
];

interface CataloguePromotionalBannerProps {
  banners?: HomeBanner[];
  slotIndex?: number;
  onAction?: (action: string) => void;
  className?: string;
}

export const CataloguePromotionalBanner: React.FC<CataloguePromotionalBannerProps> = ({
  banners = [],
  slotIndex = 0,
  onAction,
  className = '',
}) => {
  // Merge active banners from props or use default curated banners
  const activeBanners = React.useMemo(() => {
    const list = (banners || []).filter(b => b.active !== false);
    if (list.length > 0) {
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      return list;
    }
    return DEFAULT_CATALOGUE_BANNERS;
  }, [banners]);

  // If slotIndex is provided, offset initial banner to show varied cards across rows
  const [currentIndex, setCurrentIndex] = useState(() => {
    return activeBanners.length > 0 ? slotIndex % activeBanners.length : 0;
  });

  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % activeBanners.length);
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartXRef.current;
    const deltaY = touchEndY - (touchStartYRef.current || 0);

    if (Math.abs(deltaX) > 35 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) handleNext();
      else handlePrev();
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];

  const handleButtonClick = (action?: string) => {
    if (onAction) {
      onAction(action || currentBanner.buttonAction || 'gallery');
    }
  };

  const getActionIcon = (action?: string) => {
    switch (action) {
      case 'calculator':
        return <Calculator className="w-3.5 h-3.5" />;
      case 'visualizer':
        return <Box className="w-3.5 h-3.5" />;
      case 'gallery':
        return <Layers className="w-3.5 h-3.5" />;
      default:
        return <ArrowRight className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className={`w-full relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#E8E2D2] bg-gradient-to-r from-[#FFF9EE] via-[#FFFDF8] to-[#FAF6ED] shadow-sm hover:shadow-md transition-all select-none group my-2 sm:my-3 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Subtle Warm Glow Ambient Decoration */}
      <div className="absolute top-0 right-1/3 w-64 h-32 bg-[#C89211]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Main Banner Flex Container: Left Content + Right Image */}
      <div className="relative z-10 flex items-center justify-between p-3.5 sm:p-5 md:p-6 min-h-[140px] sm:min-h-[160px] gap-3 sm:gap-6">
        
        {/* Left Side: Headline, Subtitle, Badge, CTA */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Badge */}
          <div className="mb-1 sm:mb-1.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF0CD] text-[#C89211] border border-[#C89211]/30 text-[9px] sm:text-[11px] font-bold tracking-wide uppercase">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#C89211] shrink-0" />
              <span className="truncate">{currentBanner.badge || 'Direct Factory Pricing'}</span>
            </span>
          </div>

          {/* Headline */}
          <h3 className="font-serif text-sm sm:text-lg md:text-xl font-bold text-[#1A1A1A] tracking-tight leading-snug line-clamp-1">
            {currentBanner.title}
          </h3>

          {/* Subtitle */}
          <p className="text-[#666666] text-[10px] sm:text-xs md:text-sm line-clamp-1 sm:line-clamp-2 mt-0.5 sm:mt-1 leading-snug">
            {currentBanner.subtitle}
          </p>

          {/* Small Gold CTA Button */}
          <div className="mt-2.5 sm:mt-3 flex items-center">
            <button
              type="button"
              onClick={() => handleButtonClick(currentBanner.buttonAction)}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-[10.5px] sm:text-xs md:text-sm shadow-xs hover:shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{currentBanner.buttonText || 'Explore Now'}</span>
              {getActionIcon(currentBanner.buttonAction)}
            </button>
          </div>
        </div>

        {/* Right Side: Attractive Door Image Showcase */}
        <div
          className="w-24 sm:w-36 md:w-48 h-24 sm:h-28 md:h-32 relative overflow-hidden rounded-xl sm:rounded-2xl border border-[#EAE2D0] bg-white shadow-xs shrink-0 cursor-pointer group/img"
          onClick={() => handleButtonClick(currentBanner.buttonAction)}
          title={currentBanner.title}
        >
          <img
            src={currentBanner.image}
            alt={currentBanner.title}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105 pointer-events-none select-none"
            loading="lazy"
            onError={e => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Navigation Arrows (if multiple banners) */}
      {activeBanners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/90 hover:bg-white border border-[#E5E5E5] text-[#1A1A1A] hover:text-[#C89211] shadow-xs flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Slide"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/90 hover:bg-white border border-[#E5E5E5] text-[#1A1A1A] hover:text-[#C89211] shadow-xs flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-4 sm:w-5 h-1 sm:h-1.5 bg-[#C89211]'
                    : 'w-1 sm:w-1.5 h-1 sm:h-1.5 bg-[#D0C8B5] hover:bg-[#A09580]'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
