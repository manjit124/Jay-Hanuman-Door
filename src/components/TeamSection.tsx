import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Award,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Mail,
  ArrowRight,
  ShieldCheck,
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

  // Carousel Index (0-based index of leftmost visible card)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Touch and drag tracking for swipe
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute visible card count based on responsive viewport
  const [itemsPerPage, setItemsPerPage] = useState(3);

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(1); // Mobile: 1 card
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2); // Tablet: 2 cards
      } else {
        setItemsPerPage(3); // Desktop: 3 cards
      }
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  const totalCards = activeMembers.length;
  const maxIndex = Math.max(0, totalCards - itemsPerPage);

  // Next and Previous navigation handlers
  const handleNext = useCallback(() => {
    if (totalCards <= itemsPerPage) return;
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  }, [totalCards, itemsPerPage, maxIndex]);

  const handlePrev = useCallback(() => {
    if (totalCards <= itemsPerPage) return;
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  }, [totalCards, itemsPerPage, maxIndex]);

  // Auto-slide effect (every 4.5 seconds when not interacting or hovered)
  useEffect(() => {
    if (totalCards <= itemsPerPage) return;
    if (isHovered || isInteracting) return;

    const interval = setInterval(() => {
      handleNext();
    }, 4500);

    return () => clearInterval(interval);
  }, [totalCards, itemsPerPage, isHovered, isInteracting, handleNext]);

  // Handle temporary pause on interaction
  const triggerInteractionPause = () => {
    setIsInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 6000);
  };

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    triggerInteractionPause();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    // Minimum swipe threshold of 45px
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setTouchStartX(null);
  };

  // Section 16: Clean Empty State (If no team members are active, hide entire section)
  if (totalCards === 0) {
    return null;
  }

  const showControls = totalCards > itemsPerPage;

  return (
    <section
      id="our-team-section"
      aria-label="Our Leadership Team"
      className="relative py-14 sm:py-20 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-stone-100 overflow-hidden border-y border-amber-500/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Decorative Warm Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-700/10 rounded-full blur-3xl pointer-events-none translate-y-1/2"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Craftsmanship & Heritage</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-100 tracking-tight">
              Our Leadership Team
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-2 leading-relaxed">
              Meet the master craftsmen, wood seasoning specialists, and manufacturing leaders dedicated to building enduring quality doors for your home.
            </p>
          </div>

          {/* Desktop & Tablet Carousel Arrows */}
          {showControls && (
            <div className="flex items-center gap-3 self-start md:self-end">
              <button
                id="team-carousel-prev-btn"
                onClick={() => {
                  handlePrev();
                  triggerInteractionPause();
                }}
                aria-label="Previous team member"
                className="w-10 h-10 rounded-xl bg-stone-800/80 hover:bg-amber-600 hover:text-stone-950 text-stone-300 border border-stone-700/80 hover:border-amber-500 flex items-center justify-center transition-all shadow-sm active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                id="team-carousel-next-btn"
                onClick={() => {
                  handleNext();
                  triggerInteractionPause();
                }}
                aria-label="Next team member"
                className="w-10 h-10 rounded-xl bg-stone-800/80 hover:bg-amber-600 hover:text-stone-950 text-stone-300 border border-stone-700/80 hover:border-amber-500 flex items-center justify-center transition-all shadow-sm active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Container */}
        <div
          className="relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Card Track */}
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
            }}
          >
            {activeMembers.map((member) => (
              <div
                key={member.id}
                className="shrink-0 px-3 transition-all"
                style={{ width: `${100 / itemsPerPage}%` }}
              >
                <div
                  id={`team-card-${member.id}`}
                  onClick={() => setSelectedMember(member)}
                  className="h-full group bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle Corner Gold Accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-tr-3xl pointer-events-none transition-opacity group-hover:from-amber-500/20"></div>

                  <div>
                    {/* Member Photo */}
                    <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-5 bg-stone-800 border border-stone-700/60 relative group-hover:border-amber-500/40 transition-colors">
                      <img
                        src={member.photo}
                        alt={member.name}
                        loading="lazy"
                        className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      {member.experience && (
                        <div className="absolute bottom-2 left-2 bg-stone-950/80 backdrop-blur-sm text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-amber-400" />
                          <span>{member.experience}</span>
                        </div>
                      )}
                    </div>

                    {/* Member Name & Designation */}
                    <div className="space-y-1 mb-3">
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-100 group-hover:text-amber-400 transition-colors tracking-tight">
                        {member.name}
                      </h3>
                      <p className="text-amber-500/90 text-xs sm:text-sm font-medium">
                        {member.designation}
                      </p>
                    </div>

                    {/* Specialization Badge */}
                    {member.specialization && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-stone-800/90 text-stone-300 border border-stone-700">
                          <Award className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{member.specialization}</span>
                        </span>
                      </div>
                    )}

                    {/* Short Bio */}
                    {member.shortBio && (
                      <p className="text-xs text-stone-400 italic line-clamp-3 leading-relaxed mb-4">
                        "{member.shortBio}"
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Social icons + View Profile */}
                  <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between gap-2 mt-auto">
                    {/* Social links */}
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {member.socialLinks?.linkedin && (
                        <a
                          href={member.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="LinkedIn"
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-400 flex items-center justify-center transition-colors text-xs"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {member.socialLinks?.instagram && (
                        <a
                          href={member.socialLinks.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Instagram"
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-400 flex items-center justify-center transition-colors text-xs"
                        >
                          <Instagram className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {member.socialLinks?.facebook && (
                        <a
                          href={member.socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Facebook"
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-400 flex items-center justify-center transition-colors text-xs"
                        >
                          <Facebook className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {member.socialLinks?.youtube && (
                        <a
                          href={member.socialLinks.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="YouTube"
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-400 flex items-center justify-center transition-colors text-xs"
                        >
                          <Youtube className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {member.socialLinks?.email && (
                        <a
                          href={`mailto:${member.socialLinks.email}`}
                          title={`Email ${member.name}`}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-400 flex items-center justify-center transition-colors text-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* View Profile Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group/btn ml-auto"
                    >
                      <span>View Profile</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel Pagination Dots for Mobile / Tablet */}
        {showControls && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  triggerInteractionPause();
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === idx
                    ? 'w-7 bg-amber-500 shadow-sm'
                    : 'w-2 bg-stone-700 hover:bg-stone-600'
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
