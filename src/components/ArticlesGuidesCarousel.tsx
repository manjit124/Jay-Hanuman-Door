import React, { useRef, useState, useEffect } from 'react';
import {
  ArrowRight,
  Clock,
  Eye,
  Heart,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { Article, BusinessSettings } from '../types.ts';
import { ProtectedImage } from './ProtectedImage.tsx';

interface ArticlesGuidesCarouselProps {
  articles: Article[];
  settings?: BusinessSettings;
  onViewAll: () => void;
  onSelectArticle: (article: Article) => void;
  className?: string;
}

export const ArticlesGuidesCarousel: React.FC<ArticlesGuidesCarouselProps> = ({
  articles,
  settings,
  onViewAll,
  onSelectArticle,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  // Mouse drag support states
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftPos, setScrollLeftPos] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Filter only active published articles
  const displayArticles = React.useMemo(() => {
    const list = articles.filter(
      art => art.published !== false && art.status !== 'draft' && art.status !== 'archived'
    );
    return list.length > 0 ? list : articles;
  }, [articles]);

  // Update arrow buttons visibility & active index on scroll
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 15);

    // Approximate active card index
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).clientWidth + 16
      : 300;
    const currentIdx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.min(displayArticles.length - 1, Math.max(0, currentIdx)));
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
  }, [displayArticles.length]);

  // Programmatic scroll helpers
  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Mouse Drag to Scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftPos(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) {
      setHasDragged(true);
    }
    el.scrollLeft = scrollLeftPos - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  if (!displayArticles || displayArticles.length === 0) {
    return null;
  }

  return (
    <section className={`w-full overflow-hidden ${className}`}>
      {/* 1. SECTION HEADER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-3 sm:mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-[#C89211] font-bold text-xs tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>WOOD WISDOM</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1A1A1A] tracking-tight mt-0.5">
              Door Buying &amp; Maintenance Guides
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop Prev / Next Carousel Navigation Arrows */}
            <div className="hidden md:flex items-center gap-1.5 mr-2">
              <button
                type="button"
                onClick={() => scrollByAmount('left')}
                disabled={!canScrollLeft}
                aria-label="Previous articles"
                className={`p-2 rounded-full border border-[#E5E5E5] bg-white transition-all cursor-pointer ${
                  canScrollLeft
                    ? 'text-[#1A1A1A] hover:text-[#C89211] hover:border-[#C89211] hover:bg-[#FFFDF8] shadow-xs'
                    : 'text-[#BBBBBB] opacity-40 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByAmount('right')}
                disabled={!canScrollRight}
                aria-label="Next articles"
                className={`p-2 rounded-full border border-[#E5E5E5] bg-white transition-all cursor-pointer ${
                  canScrollRight
                    ? 'text-[#1A1A1A] hover:text-[#C89211] hover:border-[#C89211] hover:bg-[#FFFDF8] shadow-xs'
                    : 'text-[#BBBBBB] opacity-40 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View All Button */}
            <button
              type="button"
              onClick={onViewAll}
              className="text-[#C89211] hover:text-[#A0700B] font-bold text-xs sm:text-sm flex items-center gap-1 group transition-colors cursor-pointer py-1"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL SLIDABLE ARTICLES CAROUSEL */}
      <div className="relative w-full">
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex gap-3.5 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-1 px-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
            isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {displayArticles.map((art, idx) => (
            <article
              key={art.id}
              onClick={() => {
                if (!hasDragged) {
                  onSelectArticle(art);
                }
              }}
              className="group bg-white rounded-[20px] border border-[#E5E5E5] hover:border-[#C89211]/60 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_30px_rgba(200,146,17,0.12)] transition-all duration-300 flex flex-col justify-between cursor-pointer w-[84vw] max-w-[340px] sm:w-[320px] md:w-[350px] lg:w-[370px] shrink-0 snap-start"
            >
              <div>
                {/* Landscape Article Cover Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                  <ProtectedImage
                    src={art.image}
                    alt={art.title}
                    watermarkSettings={settings?.contentProtection}
                    showWatermark={true}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    containerClassName="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {/* Category Badge on top of image */}
                  {art.category && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#C89211] font-bold text-[10px] tracking-wide border border-[#C89211]/30 shadow-xs pointer-events-none">
                      {art.category}
                    </span>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 sm:p-5">
                  {/* Reading Time */}
                  <div className="flex items-center gap-1.5 text-[11px] text-[#C89211] font-semibold mb-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{art.readTime || '4 min read'}</span>
                    {art.author && (
                      <>
                        <span className="text-[#CCCCCC]">•</span>
                        <span className="text-[#666666] font-normal truncate max-w-[140px]">
                          {art.author}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1A1A] group-hover:text-[#C89211] transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h3>

                  {/* 1–2 line Short Description */}
                  <p className="text-xs text-[#666666] mt-2 line-clamp-2 leading-relaxed">
                    {art.excerpt}
                  </p>
                </div>
              </div>

              {/* Card Footer: Views, Likes & Read Guide CTA */}
              <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-[#F0EFEA] flex items-center justify-between text-[11px] text-[#777777] font-medium bg-[#FCFBF9]/50">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1" title="Views">
                    <Eye className="w-3.5 h-3.5 text-[#999999]" />
                    <span>{(art.views || 0).toLocaleString('en-IN')}</span>
                  </span>
                  <span className="flex items-center gap-1" title="Likes">
                    <Heart className="w-3.5 h-3.5 text-[#999999]" />
                    <span>{(art.likes || 0).toLocaleString('en-IN')}</span>
                  </span>
                </div>

                <span className="text-[#C89211] font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Read Guide</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </article>
          ))}

          {/* End-of-Carousel "Browse All Guides" Card */}
          <div
            onClick={onViewAll}
            className="group bg-gradient-to-br from-[#FFFDF8] via-white to-[#FFF7E3] rounded-[20px] border-2 border-dashed border-[#C89211]/40 hover:border-[#C89211] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 w-[65vw] max-w-[260px] sm:w-[220px] shrink-0 snap-start self-stretch shadow-xs hover:shadow-md"
          >
            <div className="w-12 h-12 rounded-full bg-[#FFF7E3] text-[#C89211] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#C89211] group-hover:text-white transition-all shadow-xs border border-[#C89211]/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="font-serif text-sm font-bold text-[#1A1A1A]">
              Explore All Guides
            </h4>
            <p className="text-[11px] text-[#666666] mt-1 mb-3">
              {displayArticles.length} Timber, Chaukhat &amp; Door Care articles
            </p>
            <span className="text-xs font-bold text-[#C89211] flex items-center gap-1 group-hover:text-[#A0700B]">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>

          {/* Spacer to prevent cut-off on right edge */}
          <div className="w-2 shrink-0 sm:hidden" aria-hidden="true" />
        </div>

        {/* Mobile Swipe Guidance Dots / Indicator */}
        <div className="flex sm:hidden items-center justify-center gap-1.5 pt-1 pb-1">
          {displayArticles.slice(0, Math.min(displayArticles.length, 6)).map((_, dotIdx) => (
            <span
              key={dotIdx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                dotIdx === activeIndex
                  ? 'w-5 bg-[#C89211]'
                  : 'w-1.5 bg-[#E5E5E5]'
              }`}
            />
          ))}
          {displayArticles.length > 6 && (
            <span className="text-[10px] text-[#999999] ml-1 font-mono">
              +{displayArticles.length - 6}
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
