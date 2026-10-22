import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
import { TeamMember, BusinessSettings } from '../types.ts';
import { TeamMemberDetailModal } from './TeamMemberDetailModal.tsx';

interface TeamSectionProps {
  teamMembers: TeamMember[];
  settings?: BusinessSettings;
}

export const TeamSection: React.FC<TeamSectionProps> = ({ teamMembers, settings }) => {
  // Filter active members and sort by displayOrder
  const activeMembers = React.useMemo(() => {
    return (teamMembers || [])
      .filter(m => m.active)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [teamMembers]);

  // Selected member for detail modal
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Carousel ref and scroll state
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Check scroll position to update arrows and active indicators
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);

    // Calculate approximate active card index
    const cardWidth = scrollRef.current.firstElementChild?.clientWidth || 110;
    const newIndex = Math.round(scrollLeft / (cardWidth + 12));
    setActiveIndex(Math.min(activeMembers.length - 1, Math.max(0, newIndex)));
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [activeMembers.length]);

  // Scroll left / right handlers
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // If no team members are active, hide section cleanly
  if (activeMembers.length === 0) {
    return null;
  }

  return (
    <section
      id="our-team-section"
      aria-label="Our Leadership Team"
      className="relative py-7 sm:py-9 bg-[#F8F8F6] text-[#1A1A1A] overflow-hidden border-y border-[#E5E5E5]"
    >
      {/* Subtle Warm Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Compact Section Header */}
        <div className="flex items-center justify-between gap-4 mb-4 sm:mb-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211] shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A] tracking-tight">
                  Our Leadership Team
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30">
                  Master Craftsmen
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#666666] mt-0.5">
                Swipe to explore master craftsmen & leadership
              </p>
            </div>
          </div>

          {/* Desktop / Tablet Scroll Arrows & Swipe Hint */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-[10px] font-medium text-[#C89211] sm:hidden flex items-center gap-0.5">
              Swipe <ArrowRight className="w-3 h-3" />
            </span>

            {activeMembers.length > 2 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => scroll('left')}
                  disabled={!canScrollLeft}
                  aria-label="Previous team members"
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                    canScrollLeft
                      ? 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-[#C89211] hover:text-white hover:border-[#C89211] cursor-pointer active:scale-95 shadow-sm'
                      : 'bg-[#F8F8F6] text-stone-300 border-[#E5E5E5] cursor-not-allowed opacity-40'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => scroll('right')}
                  disabled={!canScrollRight}
                  aria-label="Next team members"
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                    canScrollRight
                      ? 'bg-white text-[#1A1A1A] border-[#E5E5E5] hover:bg-[#C89211] hover:text-white hover:border-[#C89211] cursor-pointer active:scale-95 shadow-sm'
                      : 'bg-[#F8F8F6] text-stone-300 border-[#E5E5E5] cursor-not-allowed opacity-40'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Swipe Carousel Track */}
        <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
          <div
            ref={scrollRef}
            className="flex items-start gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 touch-pan-x"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {activeMembers.map((member) => (
              <div
                key={member.id}
                id={`team-card-${member.id}`}
                onClick={() => setSelectedMember(member)}
                className="w-[102px] sm:w-[124px] md:w-[136px] shrink-0 snap-start group flex flex-col items-center text-center p-2 rounded-2xl bg-white hover:bg-stone-50 border border-[#E5E5E5] hover:border-[#C89211]/50 transition-all duration-300 cursor-pointer select-none active:scale-95 shadow-sm hover:shadow-md"
              >
                {/* Circular Profile Image (80-100px on mobile, responsive) */}
                <div className="relative mb-2">
                  <div className="p-1 rounded-full bg-gradient-to-tr from-[#C89211] via-amber-300 to-[#C89211] group-hover:from-amber-500 group-hover:to-amber-400 transition-all duration-300 shadow-sm">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-stone-100 border-2 border-white relative">
                      <img
                        src={member.photo}
                        alt={member.name}
                        loading="lazy"
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-108"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                    </div>
                  </div>

                  {/* Experience Badge Pill */}
                  {member.experience && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white border border-[#C89211]/40 text-[#C89211] px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold whitespace-nowrap shadow-sm flex items-center gap-0.5">
                      <Briefcase className="w-2.5 h-2.5 text-[#C89211] shrink-0" />
                      <span>{member.experience}</span>
                    </div>
                  )}
                </div>

                {/* Member Name */}
                <h3 className="font-serif text-xs sm:text-sm font-bold text-[#1A1A1A] group-hover:text-[#C89211] transition-colors line-clamp-1 w-full mt-0.5 tracking-tight">
                  {member.name}
                </h3>

                {/* Short Designation */}
                <p className="text-[10px] sm:text-[11px] text-[#C89211] font-medium line-clamp-1 w-full mt-0.5">
                  {member.designation}
                </p>

                {/* Optional Specialization or View prompt */}
                <span className="text-[9px] text-[#666666] group-hover:text-[#C89211] transition-colors mt-0.5 line-clamp-1 w-full">
                  {member.specialization || 'View Profile'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Swipe Progress Dots (Visible when more than 3 members on mobile) */}
        {activeMembers.length > 3 && (
          <div className="flex items-center justify-center gap-1.5 mt-3 sm:hidden">
            {activeMembers.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIndex === idx
                    ? 'w-4 bg-[#C89211]'
                    : 'w-1.5 bg-stone-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detailed Profile View Modal */}
      {selectedMember && (
        <TeamMemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          settings={settings}
        />
      )}
    </section>
  );
};
