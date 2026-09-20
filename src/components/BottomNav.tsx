import React from 'react';
import { Home, Layers, Calculator, BookOpen, Heart } from 'lucide-react';

interface BottomNavProps {
  currentTab?: string;
  activeView?: string;
  setCurrentTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  favoriteCount?: number;
  favoritesCount?: number;
  onOpenProfile?: (tab?: 'favorites' | 'history') => void;
  onOpenFavorites?: () => void;
  // Legacy optional props retained for compatibility
  currentUser?: any;
  onOpenAuth?: () => void;
  onOpenMore?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  activeView,
  setCurrentTab,
  onNavigate,
  favoriteCount = 0,
  favoritesCount,
  onOpenProfile,
  onOpenFavorites,
}) => {
  const current = currentTab || activeView || 'home';
  const handleNav = (tab: string) => {
    if (setCurrentTab) setCurrentTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  const resolvedFavCount = favoritesCount !== undefined ? favoritesCount : favoriteCount;

  const handleOpenSaved = () => {
    if (onOpenFavorites) {
      onOpenFavorites();
    } else if (onOpenProfile) {
      onOpenProfile('favorites');
    }
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-stone-900/98 backdrop-blur-md border-t border-stone-800 px-2 py-1.5 shadow-2xl safe-bottom">
      <nav className="flex items-center justify-around">
        {/* Home */}
        <button
          id="bottom-nav-home"
          onClick={() => handleNav('home')}
          className={`flex flex-col items-center justify-center w-14 py-1 focus:outline-none transition-colors ${
            current === 'home' ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Home</span>
        </button>

        {/* Gallery */}
        <button
          id="bottom-nav-gallery"
          onClick={() => handleNav('gallery')}
          className={`flex flex-col items-center justify-center w-14 py-1 focus:outline-none transition-colors ${
            current === 'gallery' ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Catalog</span>
        </button>

        {/* Center Highlight: Calculator */}
        <button
          id="bottom-nav-calculator"
          onClick={() => handleNav('calculator')}
          className="flex flex-col items-center justify-center -mt-4 focus:outline-none group"
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              current === 'calculator'
                ? 'bg-gradient-to-tr from-amber-500 to-amber-600 text-stone-950 ring-4 ring-stone-900 shadow-amber-900/40'
                : 'bg-stone-800 text-amber-400 border border-amber-500/30'
            }`}
          >
            <Calculator className="w-6 h-6" />
          </div>
          <span
            className={`text-[11px] mt-0.5 font-semibold ${
              current === 'calculator' ? 'text-amber-400' : 'text-stone-300'
            }`}
          >
            Calculator
          </span>
        </button>

        {/* Articles / Wood Guide */}
        <button
          id="bottom-nav-articles"
          onClick={() => handleNav('articles')}
          className={`flex flex-col items-center justify-center w-14 py-1 focus:outline-none transition-colors ${
            current === 'articles' ? 'text-amber-400' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 font-medium">Guide</span>
        </button>

        {/* Saved Doors / Estimates */}
        <button
          id="bottom-nav-favorites"
          onClick={handleOpenSaved}
          className="relative flex flex-col items-center justify-center w-14 py-1 text-stone-400 hover:text-stone-200 focus:outline-none transition-colors"
        >
          <div className="relative">
            <Heart className={`w-5 h-5 ${resolvedFavCount > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
            {resolvedFavCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white leading-none">
                {resolvedFavCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 font-medium">Saved</span>
        </button>
      </nav>
    </div>
  );
};
