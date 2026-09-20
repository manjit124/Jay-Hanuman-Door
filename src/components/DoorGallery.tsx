import React, { useState, useMemo } from 'react';
import { Search, Filter, Calculator, Eye, Sparkles, TrendingUp, X, Heart } from 'lucide-react';
import { Door, Category, BusinessSettings } from '../types.ts';
import { ProtectedImage } from './ProtectedImage.tsx';

interface DoorGalleryProps {
  doors: Door[];
  categories: Category[];
  onSelectDoor: (door: Door) => void;
  onCalculateDoor: (door: Door) => void;
  settings: BusinessSettings;
  favoriteDoorIds?: string[];
  onToggleFavorite?: (doorId: string) => void;
}

export const DoorGallery: React.FC<DoorGalleryProps> = ({
  doors,
  categories,
  onSelectDoor,
  onCalculateDoor,
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Title & Introduction */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <span className="text-amber-500 font-semibold text-xs sm:text-sm tracking-wider uppercase">
          Master Catalog
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mt-1">
          Explore Handcrafted Door Designs
        </h2>
        <p className="text-stone-600 text-sm sm:text-base mt-2">
          From regal Sagwan main entrances to modern CNC fluted panels. Built with 100% seasoned timber directly from our manufacturing workshop.
        </p>
      </div>

      {/* Search Bar & Quick Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/80 p-4 mb-8">
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all' && !showOnlyFavorites
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              showOnlyFavorites
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-white' : 'fill-rose-500 text-rose-600'}`} />
            <span>Saved Doors</span>
            <span className={`text-[10px] px-1 rounded ${showOnlyFavorites ? 'bg-rose-700 text-rose-100' : 'bg-rose-200/80 text-rose-800'}`}>
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat && !showOnlyFavorites
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
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

      {/* Product Grid */}
      {filteredDoors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          {filteredDoors.map(door => (
            <div
              key={door.id}
              id={`door-card-${door.id}`}
              className="group bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all duration-300 flex flex-col overflow-hidden"
            >
              
              {/* Protected Product Image Box */}
              <div
                className="relative aspect-[3/4] bg-stone-100 overflow-hidden cursor-pointer"
                onClick={() => onSelectDoor(door)}
              >
                <ProtectedImage
                  src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'}
                  alt={door.name}
                  watermarkSettings={settings.contentProtection}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  containerClassName="w-full h-full"
                />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 z-30 pointer-events-none flex flex-col gap-1.5">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-stone-900/85 backdrop-blur-md text-amber-300 border border-stone-700/50 shadow-sm">
                    {door.category}
                  </span>
                  {door.featured && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-stone-950 uppercase tracking-wide">
                      Featured
                    </span>
                  )}
                </div>

                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
                  {door.popular && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-800/80 text-emerald-300 border border-emerald-500/30">
                      ★ Popular
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
                      className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
                        favoriteDoorIds.includes(door.id)
                          ? 'bg-stone-900/90 text-rose-500 shadow-md ring-1 ring-rose-500/50'
                          : 'bg-stone-900/60 hover:bg-stone-900/90 text-stone-300 hover:text-rose-400'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 transition-transform active:scale-125 ${
                          favoriteDoorIds.includes(door.id) ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3
                    onClick={() => onSelectDoor(door)}
                    className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-700 cursor-pointer transition-colors line-clamp-1"
                  >
                    {door.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 mb-2">
                    <span className="font-medium text-stone-700">{door.material || 'Sagwan (Teak)'}</span>
                    <span>•</span>
                    <span>Seasoned Wood</span>
                  </div>

                  <p className="text-stone-600 text-xs line-clamp-2 leading-relaxed mb-3">
                    {door.description}
                  </p>
                </div>

                {/* Pricing & Actions */}
                <div className="pt-3 border-t border-stone-100">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs text-stone-500">Starting price:</span>
                    <span className="text-xl font-bold text-amber-700 font-mono">
                      ₹{door.startingPrice.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id={`view-details-${door.id}`}
                      onClick={() => onSelectDoor(door)}
                      className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-stone-600" />
                      View Details
                    </button>

                    <button
                      id={`calc-price-${door.id}`}
                      onClick={() => onCalculateDoor(door)}
                      className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Calculate
                    </button>
                  </div>
                </div>

              </div>

            </div>
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

    </div>
  );
};
