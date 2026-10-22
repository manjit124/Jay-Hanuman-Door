import { useState, useRef, useEffect, useMemo, FC } from 'react';
import {
  Truck,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MessageCircle,
  Phone,
  Calculator,
  X,
  Package,
  Calendar,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { IndiaDeliveryState, DeliveryStory, BusinessSettings } from '../types.ts';
import { getWhatsAppUrl, getPhoneTelUrl } from '../lib/contactUtils.ts';

interface AllIndiaDeliverySectionProps {
  states: IndiaDeliveryState[];
  stories: DeliveryStory[];
  settings?: BusinessSettings;
  onOpenCalculator?: () => void;
  className?: string;
}

export const AllIndiaDeliverySection: FC<AllIndiaDeliverySectionProps> = ({
  states,
  stories,
  settings,
  onOpenCalculator,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedState, setSelectedState] = useState<IndiaDeliveryState | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHoveredOrTouched, setIsHoveredOrTouched] = useState(false);

  // Filter published stories only
  const publishedStories = useMemo(() => {
    return stories.filter(s => s.published !== false);
  }, [stories]);

  // Sort states: Available states first, then Maharashtra/surrounding
  const sortedStates = useMemo(() => {
    const list = [...states];
    return list.sort((a, b) => {
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      if (a.code === 'MH') return -1;
      if (b.code === 'MH') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [states]);

  // Stories for currently selected state
  const stateStories = useMemo(() => {
    if (!selectedState) return [];
    return publishedStories.filter(
      s => s.stateId === selectedState.id || s.stateId === selectedState.code || s.stateName.toLowerCase() === selectedState.name.toLowerCase()
    );
  }, [selectedState, publishedStories]);

  // Scroll listener for arrows and pagination dots
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 15);

    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).clientWidth + 10
      : 105;
    const currentIdx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(sortedStates.length - 1, Math.max(0, currentIdx)));
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [sortedStates.length]);

  // Gentle auto-slide (pauses if touched/hovered or modal is open)
  useEffect(() => {
    if (isHoveredOrTouched || selectedState) return;
    const interval = setInterval(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 140, behavior: 'smooth' });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isHoveredOrTouched, selectedState]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  // WhatsApp Inquiry Generator for selected state
  const handleStateWhatsApp = (state: IndiaDeliveryState, city?: string) => {
    const phone = settings?.whatsappNumber || '7887412884';
    const locText = city ? `${city}, ${state.name}` : state.name;
    const msg = `Hello Jai Hanuman Door, I want to check delivery charges and timeframe for ${locText}. Please share catalog, freight estimates, and safe wooden crate dispatch schedule.`;
    window.open(getWhatsAppUrl(phone, msg), '_blank');
  };

  if (sortedStates.length === 0) {
    return null;
  }

  return (
    <section className={`w-full overflow-hidden py-4 sm:py-6 ${className}`}>
      {/* 1. MAIN SECTION HEADER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4 sm:mb-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7E3] border border-[#C89211]/30 text-[#C89211] font-bold text-xs tracking-wider uppercase mb-1.5 shadow-2xs">
              <span className="text-sm">🇮🇳</span>
              <span>ALL INDIA DELIVERY</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
              Jai Hanuman Door — Door Delivery Across India
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] leading-relaxed mt-1">
              Apne shehar se direct hamari manufacturing workshop se door order karein. India ke multiple states aur cities me delivery available.
            </p>
          </div>

          {/* Desktop Navigation Controls & Swipe hint */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            <span className="text-[11px] sm:text-xs font-semibold text-[#C89211] flex items-center gap-1">
              <span>Swipe to explore delivery across India</span>
              <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
            </span>

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollByAmount('left')}
                disabled={!canScrollLeft}
                aria-label="Previous states"
                className={`p-2 rounded-full border border-[#E5E5E5] bg-white transition cursor-pointer ${
                  canScrollLeft
                    ? 'text-[#1A1A1A] hover:text-[#C89211] hover:border-[#C89211] shadow-xs'
                    : 'text-[#BBBBBB] opacity-40 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByAmount('right')}
                disabled={!canScrollRight}
                aria-label="Next states"
                className={`p-2 rounded-full border border-[#E5E5E5] bg-white transition cursor-pointer ${
                  canScrollRight
                    ? 'text-[#1A1A1A] hover:text-[#C89211] hover:border-[#C89211] shadow-xs'
                    : 'text-[#BBBBBB] opacity-40 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL SLIDABLE STATE CARDS (3–4 Circular Cards Partially Visible on Mobile) */}
      <div className="relative w-full">
        <div
          ref={scrollContainerRef}
          onMouseEnter={() => setIsHoveredOrTouched(true)}
          onMouseLeave={() => setIsHoveredOrTouched(false)}
          onTouchStart={() => setIsHoveredOrTouched(true)}
          onTouchEnd={() => setIsHoveredOrTouched(false)}
          className="flex gap-2.5 sm:gap-3.5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 pt-1 px-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {sortedStates.map(state => {
            const hasStories = publishedStories.some(
              s => s.stateId === state.id || s.stateId === state.code
            );

            return (
              <button
                key={state.id}
                type="button"
                onClick={() => setSelectedState(state)}
                className={`group shrink-0 snap-start rounded-2xl p-2 sm:p-3 text-center transition-all duration-300 border flex flex-col items-center justify-between cursor-pointer w-[24vw] min-w-[92px] max-w-[115px] sm:w-[130px] sm:min-w-[130px] ${
                  state.available
                    ? 'bg-white hover:bg-[#FFFDF8] border-[#E5E5E5] hover:border-[#C89211] shadow-2xs hover:shadow-md'
                    : 'bg-[#F9F9F8] border-[#E5E5E5] opacity-65 cursor-pointer'
                }`}
              >
                {/* Top Circular Visual Icon with State Initials */}
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#FFF9EC] via-white to-[#F5ECE0] border-2 border-[#C89211]/30 group-hover:border-[#C89211] flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-105 mb-2">
                  <span className="font-serif font-extrabold text-xs sm:text-sm text-[#C89211] tracking-wider">
                    {state.code}
                  </span>

                  {/* Tiny Indian Flag Accent */}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white shadow-xs border border-stone-200 flex items-center justify-center text-[10px]">
                    🇮🇳
                  </span>

                  {hasStories && (
                    <span
                      title="Verified customer stories available"
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold shadow-xs ring-2 ring-white"
                    >
                      ✓
                    </span>
                  )}
                </div>

                {/* State Name */}
                <div className="w-full">
                  <h3 className="font-bold text-[11px] sm:text-xs text-[#1A1A1A] group-hover:text-[#C89211] transition-colors truncate px-0.5 leading-tight">
                    {state.name}
                  </h3>

                  {/* Delivery Status / Small Truck Icon */}
                  <div className="mt-1 flex items-center justify-center gap-1">
                    {state.available ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] sm:text-[10px] font-bold border border-emerald-200">
                        <Truck className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">Delivery Available</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[9px] font-medium border border-stone-200">
                        <span>Check City</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Micro info on transit days */}
                <div className="mt-1.5 text-[9px] text-[#888888] font-mono truncate w-full">
                  {state.deliveryDays}
                </div>
              </button>
            );
          })}
        </div>

        {/* 3. PAGINATION DOTS (Active dot in Jai Hanuman Gold) */}
        <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
          {sortedStates.slice(0, Math.min(sortedStates.length, 8)).map((_, dotIdx) => (
            <span
              key={dotIdx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                dotIdx === Math.min(activeIndex, 7)
                  ? 'w-6 bg-[#C89211]'
                  : 'w-1.5 bg-[#E5E5E5]'
              }`}
            />
          ))}
          {sortedStates.length > 8 && (
            <span className="text-[10px] text-[#888888] ml-1 font-mono">
              +{sortedStates.length - 8} more
            </span>
          )}
        </div>
      </div>

      {/* 4. STATE CARD OPEN INTERACTION (MODAL / BOTTOM SHEET) */}
      {selectedState && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedState(null)}
        >
          <div
            className="relative w-full max-w-xl bg-white border border-[#E5E5E5] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 border-b border-[#E5E5E5] bg-gradient-to-r from-[#FFFDF8] to-[#FFF8E7]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#C89211]/30 flex items-center justify-center shadow-xs">
                  <span className="font-serif font-extrabold text-lg text-[#C89211]">
                    {selectedState.code}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A]">
                      {selectedState.name} Delivery
                    </h3>
                    <span className="text-base">🇮🇳</span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    {selectedState.available ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        <Truck className="w-3 h-3" />
                        <span>Delivery Available</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-xs font-bold border border-stone-200">
                        <span>Currently On Inquiry</span>
                      </span>
                    )}

                    <span className="text-[11px] text-[#666666] flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-[#C89211]" />
                      <span>{selectedState.deliveryDays}</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedState(null)}
                className="p-2 rounded-full bg-white hover:bg-stone-100 text-[#666666] hover:text-[#1A1A1A] border border-[#E5E5E5] transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
              {/* Safe Packing Badge: 7-Layer Wooden Crate Packing + Foam Protection */}
              <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border-2 border-[#C89211]/30 flex items-start gap-3 shadow-2xs">
                <ShieldCheck className="w-6 h-6 text-[#C89211] shrink-0 mt-0.5" />
                <div className="text-xs text-[#1A1A1A] space-y-1">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF7E3] text-[#C89211] font-bold text-[10px] uppercase tracking-wide border border-[#C89211]/25">
                    <Sparkles className="w-3 h-3" />
                    <span>Safe Packing Badge</span>
                  </div>
                  <p className="font-bold text-[#1A1A1A] text-xs sm:text-sm">
                    7-Layer Wooden Crate Packing + Foam Protection
                  </p>
                  <p className="text-[#666666] text-[11px] leading-relaxed">
                    {selectedState.deliveryNote ||
                      'Every door is secured with bubble insulation, edge protectors, heavy moisture-barrier plastic, and heavy exterior wooden crate frames to prevent any scratches or transit impact.'}
                  </p>
                </div>
              </div>

              {/* Major Cities Served in this State */}
              {selectedState.citiesServed && selectedState.citiesServed.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5 uppercase tracking-wide">
                      <MapPin className="w-3.5 h-3.5 text-[#C89211]" />
                      <span>Key Cities Served in {selectedState.name}</span>
                    </span>
                    <span className="text-[10px] text-[#888888] font-mono">
                      {selectedState.citiesServed.length} Major Centers
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#F8F8F6] rounded-xl border border-[#E5E5E5]">
                    {selectedState.citiesServed.map((city, cIdx) => (
                      <span
                        key={cIdx}
                        onClick={() => handleStateWhatsApp(selectedState, city)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FFF7E3] hover:text-[#C89211] hover:border-[#C89211] border border-[#E5E5E5] text-xs font-medium text-[#1A1A1A] transition cursor-pointer shadow-2xs flex items-center gap-1"
                        title={`Click to inquire for ${city}`}
                      >
                        <span>{city}</span>
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#888888] mt-1 italic">
                    * Other towns, tehsils, and rural construction sites across {selectedState.name} are also deliverable.
                  </p>
                </div>
              )}

              {/* 5. RECENT DELIVERY STORIES / VERIFIED PROOF SYSTEM */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-serif text-sm sm:text-base font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#C89211]" />
                    <span>Recent Delivery Stories</span>
                  </h4>
                  <span className="text-[11px] text-[#C89211] font-bold">
                    {stateStories.length > 0 ? `${stateStories.length} Story` : 'All India Coverage'}
                  </span>
                </div>

                {stateStories.length > 0 ? (
                  <div className="space-y-3">
                    {stateStories.map(story => (
                      <div
                        key={story.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E5E5E5] hover:border-[#C89211]/50 shadow-2xs transition-all flex flex-col gap-3"
                      >
                        {/* Story Header Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>✓ Delivered Successfully</span>
                            </span>

                            {story.isVerifiedCustomer === true || (story.isVerified === true && !story.isSample) ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-2xs">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Verified Customer</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-300/80">
                                <Info className="w-3 h-3 text-amber-600" />
                                <span>Demo Preview — Replace with Verified Customer Data</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-[#888888] font-mono">
                            <Calendar className="w-3 h-3" />
                            <span>{story.deliveryDate}</span>
                          </div>
                        </div>

                        {/* Story Content & Product Thumbnail */}
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-[#E5E5E5] bg-stone-100">
                            <img
                              src={story.doorThumbnail || story.doorPhotoUrl || story.deliveryPhoto || story.deliveryPhotoUrl || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'}
                              alt={story.orderTitle || story.orderDescription || 'Custom Door'}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">City:</span>
                              <p className="text-xs font-bold text-[#1A1A1A]">
                                {story.city || story.cityName}, {story.stateName}
                              </p>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">Order:</span>
                              <p className="text-xs sm:text-sm font-bold text-[#C89211]">
                                {story.orderTitle || story.orderDescription}
                              </p>
                            </div>

                            <div className="text-[11px] text-[#666666]">
                              Customer: <strong className="text-[#1A1A1A]">{story.customerName || `${story.customerFirstName || 'Customer'} ${story.customerInitial || ''}`.trim()}</strong>
                            </div>

                            {(story.reviewText || story.customerReview) && (
                              <blockquote className="mt-2 text-xs text-[#444444] bg-[#FCFBF9] p-2.5 rounded-xl border border-[#F0EFEA] italic leading-relaxed">
                                “{story.reviewText || story.customerReview}”
                              </blockquote>
                            )}
                          </div>
                        </div>

                        {/* Optional unboxing / delivery photo */}
                        {(story.deliveryPhoto || story.deliveryPhotoUrl) && (story.deliveryPhoto !== story.doorThumbnail) && (
                          <div className="relative rounded-xl overflow-hidden border border-[#E5E5E5] max-h-40 bg-stone-50">
                            <img
                              src={story.deliveryPhoto || story.deliveryPhotoUrl}
                              alt="Delivery proof"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <span className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-semibold backdrop-blur-xs">
                              Unboxing / Installation Proof
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Clean Fallback when no customer story exists yet */
                  <div className="p-5 rounded-2xl bg-[#FCFBF9] border border-[#E5E5E5] text-center space-y-2">
                    <Package className="w-8 h-8 text-[#C89211] mx-auto opacity-70" />
                    <p className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                      Delivery available — Customer stories coming soon.
                    </p>
                    <p className="text-[11px] text-[#666666] max-w-sm mx-auto leading-relaxed">
                      We deliver kiln-dried solid wooden doors across all districts in {selectedState.name}. Be among the first to share your verified unboxing story!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer CTAs */}
            <div className="p-3.5 sm:p-4 border-t border-[#E5E5E5] bg-white flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => handleStateWhatsApp(selectedState)}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enquire Delivery to {selectedState.name}</span>
              </button>

              {settings?.phone && (
                <a
                  href={getPhoneTelUrl(settings.phone)}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-stone-300 transition cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-[#C89211]" />
                  <span>Call Workshop</span>
                </a>
              )}

              {onOpenCalculator && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedState(null);
                    onOpenCalculator();
                  }}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#FFF7E3] hover:bg-[#FFEEC2] text-[#C89211] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-[#C89211]/40 transition cursor-pointer"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Calculate Door Price</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

