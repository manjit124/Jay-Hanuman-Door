import React from 'react';
import { Home, Layers, Calculator, BookOpen, Heart, Sparkles, Truck, Box } from 'lucide-react';

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

interface NavItemConfig {
  id: string;
  tabKey: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isSaved?: boolean;
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
  const resolvedFavCount = favoritesCount !== undefined ? favoritesCount : favoriteCount;

  const handleNav = (tab: string) => {
    if (setCurrentTab) setCurrentTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  const handleOpenSaved = () => {
    if (onOpenFavorites) {
      onOpenFavorites();
    } else if (onOpenProfile) {
      onOpenProfile('favorites');
    }
  };

  const navItems: NavItemConfig[] = [
    { id: 'bottom-nav-home', tabKey: 'home', label: 'Home', icon: Home },
    { id: 'bottom-nav-gallery', tabKey: 'gallery', label: 'Catalog', icon: Layers },
    { id: 'bottom-nav-visualizer', tabKey: 'visualizer', label: '3D / AR', icon: Box },
    { id: 'bottom-nav-calculator', tabKey: 'calculator', label: 'Calc', icon: Calculator },
    { id: 'bottom-nav-articles', tabKey: 'articles', label: 'Guide', icon: BookOpen },
    { id: 'bottom-nav-track', tabKey: 'tracking', label: 'Track', icon: Truck },
    { id: 'bottom-nav-wood-detector', tabKey: 'wood-detector', label: 'AI Lakdi', icon: Sparkles },
    { id: 'bottom-nav-favorites', tabKey: 'favorites', label: 'Saved', icon: Heart, isSaved: true },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E5E5] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-bottom pb-[env(safe-area-inset-bottom,0px)]">
      <nav className="flex items-center justify-between w-full h-[68px] sm:h-[70px] max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const isSelected = current === item.tabKey || (item.tabKey === 'visualizer' && current === 'fitting');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              id={item.id}
              onClick={() => (item.isSaved ? handleOpenSaved() : handleNav(item.tabKey))}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 px-0.5 pt-1 pb-1 focus:outline-none transition-colors duration-200 select-none ${
                isSelected ? 'text-[#C89211]' : 'text-[#777777] hover:text-[#1A1A1A]'
              }`}
              aria-label={item.label}
              aria-selected={isSelected}
            >
              {/* Icon with subtle active scale */}
              <div className="relative flex items-center justify-center h-[24px]">
                <Icon
                  className={`w-[22px] h-[22px] transition-transform duration-200 ease-out ${
                    isSelected ? 'scale-105 text-[#C89211] stroke-[2.2]' : 'text-[#777777] stroke-[1.8]'
                  }`}
                />
                {item.isSaved && resolvedFavCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[14px] text-center rounded-full text-[8.5px] font-bold bg-rose-600 text-white leading-none shadow-sm">
                    {resolvedFavCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[9.5px] leading-tight mt-1 text-center truncate max-w-full transition-colors duration-200 ${
                  isSelected ? 'font-bold text-[#C89211]' : 'font-medium text-[#666666]'
                }`}
              >
                {item.label}
              </span>

              {/* Subtle Gold Indicator Pill BELOW the label (preserves height to prevent tab jump) */}
              <div
                className={`h-[3px] rounded-full mt-1 transition-all duration-200 ${
                  isSelected ? 'w-5 bg-[#C89211] opacity-100 scale-100' : 'w-5 bg-transparent opacity-0 scale-75'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
};
