import React, { useState, useMemo } from 'react';
import { Search, Filter, Calculator, Eye, Sparkles, TrendingUp, X, Heart, Box, Camera, Video } from 'lucide-react';
import { Door, Category, BusinessSettings, HomeBanner } from '../types.ts';
import { ProtectedImage } from './ProtectedImage.tsx';
import { CataloguePromotionalBanner } from './CataloguePromotionalBanner.tsx';
import { ContentProtectionWarning } from './ContentProtectionWarning.tsx';
import { AdMobBannerSlot } from './admob/AdMobBannerSlot.tsx';
import { AdMobCatalogNativeCard } from './admob/AdMobCatalogNativeCard.tsx';

interface DoorGalleryProps {
  doors: Door[];
  categories: Category[];
  banners?: HomeBanner[];
  onSelectDoor: (door: Door) => void;
  onCalculateDoor: (door: Door) => void;
  onOpenVisualizer?: (door: Door, mode?: '3d' | 'photo' | 'live_ar') => void;
  onOpenLiveAR?: (door: Door) => void;
  onNavigate?: (view: string) => void;
  settings: BusinessSettings;
  favoriteDoorIds?: string[];
  onToggleFavorite?: (doorId: string) => void;
}

export const DoorGallery: React.FC<DoorGalleryProps> = ({
  doors,
  categories,
  banners = [],
  onSelectDoor,
  onCalculateDoor,
  onOpenVisualizer,
  onOpenLiveAR,
  onNavigate,
  settings,
  favoriteDoorIds = [],
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false);
  const [showOnlyPopular, setShowOnlyPopular] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'price-low' | 'price-high'>('recommended');

  const standardCategories = [
    'Sagwan Door',
    'Designer Door',
    'Main Door',
    'Double Door',
    'Wooden Door',
    'Traditional Door',
    'Modern Door',
    'Premium Door',
    'Door Frame / Chaukhat',
  ];

  // Merge categories if admin added new ones
  const allCategoryNames = useMemo(() => {
    const list = new Set<string>(standardCategories);
    categories.forEach(c => list.add(c.name));
    doors.forEach(d => {
      if (d.category) list.add(d.category);
    });
    return Array.from(list);
  }, [categories, doors]);

  const materialsList = useMemo(() => {
    const list = new Set<string>();
    doors.forEach(d => {
      if (d.material) list.add(d.material);
    });
    return Array.from(list);
  }, [doors]);

  // Filter and Sort Doors
  const filteredDoors = useMemo(() => {
    return doors.filter(door => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          door.name.toLowerCase().includes(q) ||
          door.description.toLowerCase().includes(q) ||
          door.category.toLowerCase().includes(q) ||
          door.material.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Category
      if (selectedCategory !== 'all' && door.category !== selectedCategory) {
        return false;
      }

      // Material
      if (selectedMaterial !== 'all' && door.material !== selectedMaterial) {
        return false;
      }

      // Featured
      if (showOnlyFeatured && !door.featured) {
        return false;
      }

      // Popular
      if (showOnlyPopular && !door.popular) {
        return false;
      }

      // Favorites
      if (showOnlyFavorites && !favoriteDoorIds.includes(door.id)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.startingPrice - b.startingPrice;
      if (sortBy === 'price-high') return b.startingPrice - a.startingPrice;
      // Default: featured first, then newest
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [doors, searchQuery, selectedCategory, selectedMaterial, showOnlyFeatured, showOnlyPopular, showOnlyFavorites, favoriteDoorIds, sortBy]);

  // AdMob Native Ads Spacing (Part 3 requirement)
  const nativeAdFrequency = settings?.adSettings?.catalogNativeAdFrequency || 6;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-4 sm:pb-6">
      
      {/* Title & Introduction */}
      <div className="text-center max-w-3xl mx-auto mb-5 sm:mb-10">
        <span className="text-[#C89211] font-semibold text-xs sm:text-sm tracking-wider uppercase">
          Master Catalog
        </span>
        <h2 className="font-serif text-2xl sm:text-4xl font-extrabold text-[#1A1A1A] tracking-tight mt-1">
          Explore Handcrafted Door Designs
        </h2>
        <p className="text-[#666666] text-xs sm:text-base mt-1.5">
          From regal Sagwan main entrances to modern CNC fluted panels. Built with 100% seasoned timber directly from our manufacturing workshop.
        </p>
      </div>

      {/* Search Bar & Quick Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E5] p-3 sm:p-4 mb-5 sm:mb-8">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="gallery-search-input"
              type="text"
              placeholder="Search door name, wood type (e.g. Sagwan, Teak, Double Door)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controls: Material & Sorting */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Material Filter */}
            {materialsList.length > 0 && (
              <select
                id="gallery-material-select"
                value={selectedMaterial}
                onChange={e => setSelectedMaterial(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="all">All Materials</option>
                {materialsList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}

            {/* Sort Order */}
            <select
              id="gallery-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="recommended">Featured First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>

            {/* Featured toggle */}
            <button
              id="gallery-featured-toggle"
              onClick={() => setShowOnlyFeatured(!showOnlyFeatured)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                showOnlyFeatured
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Featured
            </button>

            {/* Popular toggle */}
            <button
              id="gallery-popular-toggle"
              onClick={() => setShowOnlyPopular(!showOnlyPopular)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                showOnlyPopular
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              Popular
            </button>
          </div>

        </div>

        {/* Category Filter Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 mt-3 border-t border-stone-100 no-scrollbar">
          <button
            id="cat-chip-all"
            onClick={() => {
              setSelectedCategory('all');
              setShowOnlyFavorites(false);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all' && !showOnlyFavorites
                ? 'bg-[#C89211] text-white shadow-sm'
                : 'bg-[#F7F7F7] text-[#666666] hover:bg-stone-200 border border-[#E5E5E5]'
            }`}
          >
            All Categories ({doors.length})
          </button>

          {/* Saved Doors Quick Filter */}
          <button
            id="cat-chip-saved-doors"
            onClick={() => {
              setShowOnlyFavorites(!showOnlyFavorites);
              if (!showOnlyFavorites) setSelectedCategory('all');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              showOnlyFavorites
                ? 'bg-[#C89211] text-white shadow-sm'
                : 'bg-[#FFF7E3] text-[#C89211] hover:bg-amber-100 border border-[#C89211]/30'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-white' : 'fill-[#C89211] text-[#C89211]'}`} />
            <span>Saved Doors</span>
            <span className={`text-[10px] px-1 rounded ${showOnlyFavorites ? 'bg-[#A0700B] text-white' : 'bg-[#C89211]/20 text-[#C89211]'}`}>
              {favoriteDoorIds.length}
            </span>
          </button>

          {allCategoryNames.map(cat => {
            const count = doors.filter(d => d.category === cat).length;
            return (
              <button
                key={cat}
                id={`cat-chip-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => {
                  setSelectedCategory(cat);
                  setShowOnlyFavorites(false);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat && !showOnlyFavorites
                    ? 'bg-[#C89211] text-white shadow-sm'
                    : 'bg-[#F7F7F7] text-[#666666] hover:bg-stone-200 border border-[#E5E5E5]'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1 rounded ${selectedCategory === cat && !showOnlyFavorites ? 'bg-amber-700 text-amber-100' : 'text-stone-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Results Count / Reset Filter bar */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-stone-500 mb-4 px-1">
        <div>
          Showing <span className="font-semibold text-stone-800">{filteredDoors.length}</span> door designs
          {selectedCategory !== 'all' && <span> in <span className="text-amber-700 font-medium">"{selectedCategory}"</span></span>}
        </div>
        {(selectedCategory !== 'all' || searchQuery || selectedMaterial !== 'all' || showOnlyFeatured || showOnlyPopular || showOnlyFavorites) && (
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedMaterial('all');
              setSearchQuery('');
              setShowOnlyFeatured(false);
              setShowOnlyPopular(false);
              setShowOnlyFavorites(false);
            }}
            className="text-amber-600 hover:text-amber-800 font-medium underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Product Grid - Compact 2-column on mobile, responsive multi-column on desktop */}
      {filteredDoors.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-6">
          {filteredDoors.map((door, idx) => (
            <React.Fragment key={door.id}>
              <div
                id={`door-card-${door.id}`}
                className="group bg-white rounded-xl sm:rounded-2xl border border-[#E5E5E5] shadow-sm hover:shadow-xl hover:border-[#C89211]/50 transition-all duration-300 flex flex-col overflow-hidden"
              >
                
                {/* Protected Product Image Box */}
                <div
                  className="relative aspect-[3/4] bg-stone-100 overflow-hidden cursor-pointer"
                  onClick={() => onSelectDoor(door)}
                >
                  <ProtectedImage
                    src={door.image || door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'}
                    alt={door.name}
                    watermarkSettings={settings.contentProtection}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    containerClassName="w-full h-full"
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-30 pointer-events-none flex flex-col gap-1">
                    <span className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[11px] font-semibold bg-white/90 backdrop-blur-md text-[#1A1A1A] border border-[#E5E5E5] shadow-sm">
                      {door.category}
                    </span>
                    {door.featured && (
                      <span className="px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-[#C89211] text-white uppercase tracking-wide">
                        Featured
                      </span>
                    )}
                    {door.videoUrl && (
                      <span className="px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-black/75 text-white flex items-center gap-1 backdrop-blur-xs">
                        <Video className="w-2.5 h-2.5 text-[#C89211]" />
                        <span>Video</span>
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-30 flex items-center gap-1 pointer-events-auto">
                    {door.popular && (
                      <span className="hidden xs:inline-block px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] font-semibold bg-white/90 text-[#16803A] border border-[#16803A]/30">
                        ★
                      </span>
                    )}
                    {onToggleFavorite && (
                      <button
                        id={`fav-btn-${door.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(door.id);
                        }}
                        title={favoriteDoorIds.includes(door.id) ? 'Remove from Saved' : 'Save Door'}
                        className={`p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all ${
                          favoriteDoorIds.includes(door.id)
                            ? 'bg-white text-rose-500 shadow-md ring-1 ring-rose-500/50'
                            : 'bg-white/80 hover:bg-white text-[#666666] hover:text-rose-500'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform active:scale-125 ${
                            favoriteDoorIds.includes(door.id) ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* View in My Room (Live AR 3D Visualizer) Button on Image */}
                  {onOpenVisualizer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenLiveAR) onOpenLiveAR(door);
                        else onOpenVisualizer(door, 'live_ar');
                      }}
                      className="hidden sm:flex absolute bottom-2.5 right-2.5 z-20 px-2.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-[#1A1A1A] border border-[#C89211] text-[11px] font-bold shadow-md items-center gap-1.5 backdrop-blur-md transition hover:scale-105 cursor-pointer"
                      title="View in My Room (Live AR 3D Visualizer)"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#C89211]" />
                      <span>View in My Room</span>
                    </button>
                  )}
                </div>

                {/* Product Info - Compact 2-line styling */}
                <div className="p-2 sm:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3
                      onClick={() => onSelectDoor(door)}
                      className="font-serif text-xs sm:text-lg font-bold text-[#1A1A1A] group-hover:text-[#C89211] cursor-pointer transition-colors line-clamp-1"
                    >
                      {door.name}
                    </h3>
                    
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-[#666666] mt-0.5 sm:mt-1 mb-1 sm:mb-2">
                      <span className="font-medium text-[#1A1A1A] truncate">{door.material || 'Sagwan (Teak)'}</span>
                      <span>•</span>
                      <span className="truncate">Seasoned</span>
                    </div>

                    <p className="hidden sm:block text-[#666666] text-xs line-clamp-2 leading-relaxed mb-3">
                      {door.description}
                    </p>
                  </div>

                  {/* Pricing & Actions */}
                  <div className="pt-1.5 sm:pt-3 border-t border-[#E5E5E5] space-y-1.5 sm:space-y-2">
                    <div className="flex items-baseline justify-between mb-0.5 sm:mb-1">
                      <span className="text-[10px] sm:text-xs text-[#666666]">From:</span>
                      <span className="text-xs sm:text-xl font-bold text-[#C89211] font-mono">
                        ₹{door.startingPrice.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Primary "View in My Room" Live AR CTA */}
                    {onOpenVisualizer && (
                      <button
                        id={`view-in-room-btn-${door.id}`}
                        onClick={() => {
                          if (onOpenLiveAR) onOpenLiveAR(door);
                          else onOpenVisualizer(door, 'live_ar');
                        }}
                        className="w-full py-1.5 sm:py-2.5 px-1.5 sm:px-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#C89211] to-[#b07d08] hover:opacity-95 text-white font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        <span className="truncate">View in 3D/AR</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-1 sm:gap-2">
                      <button
                        id={`view-details-${door.id}`}
                        onClick={() => onSelectDoor(door)}
                        className="py-1.5 sm:py-2 px-1 sm:px-3 rounded-lg sm:rounded-xl bg-[#F8F8F6] hover:bg-stone-200 text-[#1A1A1A] font-semibold text-[10px] sm:text-xs flex items-center justify-center gap-0.5 sm:gap-1.5 transition-colors"
                      >
                        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#666666]" />
                        <span>Details</span>
                      </button>

                      <button
                        id={`calc-price-${door.id}`}
                        onClick={() => onCalculateDoor(door)}
                        className="py-1.5 sm:py-2 px-1 sm:px-3 rounded-lg sm:rounded-xl bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] font-semibold text-[10px] sm:text-xs flex items-center justify-center gap-0.5 sm:gap-1.5 border border-[#E5E5E5] transition-all shadow-sm"
                      >
                        <Calculator className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C89211]" />
                        <span>Price</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              {/* Policy-Compliant AdMob Native Ad Card in Catalog Grid (Part 3 requirement) */}
              {(idx + 1) % nativeAdFrequency === 0 && (
                <AdMobCatalogNativeCard
                  key={`admob-native-card-${idx}`}
                  index={Math.floor((idx + 1) / nativeAdFrequency) - 1}
                  settings={settings}
                />
              )}

              {/* Promotional Banner inserted after every 6 products (after 3 rows on mobile, only between chunks) */}
              {(idx + 1) % 6 === 0 && idx < filteredDoors.length - 1 && (
                <div className="col-span-full my-1.5 sm:my-2">
                  <CataloguePromotionalBanner
                    banners={banners}
                    slotIndex={Math.floor((idx + 1) / 6) - 1}
                    onAction={(action) => {
                      if (onNavigate) {
                        onNavigate(action);
                      } else if (action === 'calculator') {
                        onCalculateDoor(door);
                      } else if (action === 'visualizer' && onOpenVisualizer) {
                        onOpenVisualizer(door, '3d');
                      }
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900 mb-1">No Door Designs Found</h3>
          <p className="text-stone-500 text-xs sm:text-sm mb-4">
            No doors matched your current search filters. Try clearing keywords or category restrictions.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedMaterial('all');
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* AdMob Adaptive Banner Placement (Catalog Screen) */}
      <div className="mt-4 mb-2">
        <AdMobBannerSlot placement="catalog" settings={settings} />
      </div>

      {/* Design & Content Protection Warning Notice (Before Footer) */}
      <div className="mt-6 sm:mt-10 pt-4 border-t border-[#E5E5E5]">
        <ContentProtectionWarning
          settings={settings}
          variant="full"
          onNavigateLegal={onNavigate}
        />
      </div>

    </div>
  );
};
