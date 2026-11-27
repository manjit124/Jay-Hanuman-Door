import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Search, Sliders, X } from 'lucide-react';
import type { WindowSystemCategoryId, WindowSystemDefinition } from '../../types.ts';
import {
  WINDOW_SYSTEM_CATEGORIES,
  isWindowSystemFormulaReady,
} from '../../data/indianWindowSystemsDefaults.ts';
import { WindowSystemIllustration } from './WindowSystemIllustration.tsx';

interface WindowCategoryHomeSectionProps {
  systems: WindowSystemDefinition[];
  onSelectCategory: (categoryId: WindowSystemCategoryId) => void;
  onSelectSystem: (system: WindowSystemDefinition) => void;
}

export const WindowCategoryHomeSection: React.FC<WindowCategoryHomeSectionProps> = ({
  systems,
  onSelectCategory,
  onSelectSystem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const enabledSystems = useMemo(
    () =>
      (systems || [])
        .filter((s) => s.enabled !== false)
        .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999)),
    [systems]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredSystems = useMemo(() => {
    if (!normalizedQuery) return enabledSystems;
    return enabledSystems.filter((s) => {
      const cat = WINDOW_SYSTEM_CATEGORIES.find((c) => c.id === s.categoryId);
      const haystack = [
        s.name,
        s.shortDescription,
        s.slug,
        cat?.title || '',
        ...(s.profileSeries || []).map((p) => `${p.name} ${p.code}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [enabledSystems, normalizedQuery]);

  const systemsByCategory = useMemo(() => {
    const grouped: Record<WindowSystemCategoryId, WindowSystemDefinition[]> = {
      sliding: [],
      indian_aluminium: [],
      special: [],
    };
    for (const sys of filteredSystems) {
      if (grouped[sys.categoryId]) {
        grouped[sys.categoryId].push(sys);
      }
    }
    return grouped;
  }, [filteredSystems]);

  return (
    <section
      id="indian-window-systems-hub"
      className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8"
    >
      {/* Header + Search Bar + Category Quick Selectors */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
              Indian Aluminium Window Fabrication Systems
            </p>
            <h2 className="text-lg sm:text-2xl font-extrabold text-[#0A2540] tracking-tight">
              Choose Your Window System &amp; Profile Series
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] max-w-2xl">
              Separate cutting calculators for 2-Track, 3-Track, 4-Track, 18/50, Dhumal, Indian Section, Fixed, Openable, Ventilator &amp; Mosquito Net windows.
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="window-system-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 2 Track, 4 Track, 18/50, Dhumal..."
              aria-label="Search window systems"
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0B5ED7] focus:bg-white focus:outline-none text-xs sm:text-sm text-[#0A2540] placeholder:text-[#94A3B8] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#0A2540] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Quick Navigation Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {WINDOW_SYSTEM_CATEGORIES.map((cat) => {
            const count = enabledSystems.filter((s) => s.categoryId === cat.id).length;
            const isOrange = cat.accent === 'orange';
            return (
              <button
                key={cat.id}
                id={`home-category-btn-${cat.id}`}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className="group text-left bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] hover:border-[#0B5ED7] rounded-xl px-3.5 py-3 transition-all flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                    <span className={isOrange ? 'text-[#F97316]' : 'text-[#0B5ED7]'}>
                      Category {cat.code}
                    </span>
                    <span className="text-[#94A3B8]">·</span>
                    <span className="text-[#64748B] tabular-nums">{count} Systems</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#0A2540] group-hover:text-[#0B5ED7] truncate mt-0.5">
                    {cat.title}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#0B5ED7] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty Search Result State */}
      {filteredSystems.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-2">
          <p className="text-sm font-bold text-[#0A2540]">
            No window systems matched &ldquo;{searchQuery}&rdquo;
          </p>
          <p className="text-xs text-[#64748B]">
            Try searching for 2 Track, 3 Track, 4 Track, 18/50, Dhumal, Fixed, Openable, or Ventilator.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-2 h-9 px-4 rounded-lg bg-[#0B5ED7] text-white text-xs font-semibold cursor-pointer"
          >
            Show All Window Systems
          </button>
        </div>
      ) : (
        /* Three Separate Window Categories */
        <div className="space-y-8">
          {WINDOW_SYSTEM_CATEGORIES.map((category) => {
            const catSystems = systemsByCategory[category.id];
            if (!catSystems || catSystems.length === 0) return null;
            const isOrange = category.accent === 'orange';

            return (
              <div
                key={category.id}
                id={`window-category-section-${category.id}`}
                className="space-y-3.5"
              >
                {/* Section Header */}
                <div className="flex items-end justify-between gap-3 border-b border-[#E2E8F0] pb-2.5">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                      <span className={isOrange ? 'text-[#F97316]' : 'text-[#0B5ED7]'}>
                        {category.code}. {category.shortTitle}
                      </span>
                      <span className="text-[#CBD5E1]">·</span>
                      <span className="text-[#64748B] tabular-nums">{catSystems.length} Types</span>
                    </div>
                    <h3 className="text-base sm:text-xl font-extrabold text-[#0A2540] tracking-tight mt-0.5">
                      {category.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#64748B] mt-0.5">
                      {category.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectCategory(category.id)}
                    className="shrink-0 text-xs font-bold text-[#0B5ED7] hover:text-[#084BB3] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <span>Select Options</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Responsive 2-Column Mobile Grid -> 3/4 Column Desktop Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
                  {catSystems.map((sys) => {
                    const ready = isWindowSystemFormulaReady(sys);
                    return (
                      <div
                        key={sys.id}
                        id={`window-system-card-${sys.slug}`}
                        className="group h-full min-w-0 bg-white hover:bg-[#FAFCFF] border border-[#E2E8F0] hover:border-[#0B5ED7] rounded-xl p-3 sm:p-4 transition-all shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md flex flex-col justify-between gap-2.5"
                      >
                        <div className="space-y-2.5">
                          {/* Window Architectural Illustration */}
                          <div className="w-full rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] p-2 flex items-center justify-center">
                            <WindowSystemIllustration
                              type={sys.illustrationType}
                              className="w-full h-16 sm:h-20"
                            />
                          </div>

                          {/* Title & Description */}
                          <div className="space-y-1">
                            <h4 className="text-[13px] sm:text-sm font-bold text-[#0A2540] group-hover:text-[#0B5ED7] leading-snug">
                              {sys.name}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-[#475569] leading-relaxed line-clamp-2">
                              {sys.shortDescription}
                            </p>
                          </div>

                          {/* Quiet Unboxed Formula Readiness Metadata (Zero-Pill Discipline) */}
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold">
                            {ready ? (
                              <span className="inline-flex items-center gap-1 text-[#059669]">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>Verified Formula</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#D97706]">
                                <Sliders className="w-3 h-3 shrink-0" />
                                <span>Setup Required</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Calculate Cutting Size Button */}
                        <button
                          type="button"
                          onClick={() => onSelectSystem(sys)}
                          className={`w-full h-9 sm:h-10 px-2.5 rounded-lg text-[11px] sm:text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                            ready
                              ? 'bg-[#0B5ED7] hover:bg-[#084BB3] text-white'
                              : 'bg-[#FFF7ED] hover:bg-[#F97316] text-[#C2410C] hover:text-white border border-[#FED7AA] hover:border-[#F97316]'
                          }`}
                        >
                          <span className="truncate">Calculate Cutting Size</span>
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
