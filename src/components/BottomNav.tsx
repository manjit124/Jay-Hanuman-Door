import React from 'react';
import { Home, Layers, Calculator, BookOpen, Heart, Sparkles, Truck, Box, Crown } from 'lucide-react';
import { SlidingWindowIcon } from './sliding-window/SlidingWindowIcon.tsx';
import { FEATURE_FLAGS } from '../config/featureFlags.ts';

interface BottomNavProps {
  currentTab?: string;
  activeView?: string;
  setCurrentTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
  favoriteCount?: number;
  favoritesCount?: number;
  onOpenProfile?: (tab?: 'favorites' | 'history') => void;
  onOpenFavorites?: () => void;
  isPremium?: boolean;
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
  isPremium = false,
}) => {
  const current = currentTab || activeView || 'home';
  const resolvedFavCount = favoritesCount !== undefined ? favoritesCount : favoriteCount;

  const handleNav = (tab: string) => {
    if (setCurrentTab) setCurrentTab(tab);
    if (onNavigate) onNavigate(tab);
  };

  const handleOpenSaved = () => {
    if (!FEATURE_FLAGS.doorCatalogue) {
      if (onOpenProfile) {
        onOpenProfile('history');
      } else if (onOpenFavorites) {
        onOpenFavorites();
      }
      return;
    }
    if (onOpenFavorites) {
      onOpenFavorites();
    } else if (onOpenProfile) {
      onOpenProfile('favorites');
    }
  };

  const navItems: NavItemConfig[] = [
    { id: 'bottom-nav-home', tabKey: 'home', label: 'Home', icon: Home },
    {
      id: 'bottom-nav-sliding-window',
      tabKey: 'sliding-window',
      label: 'Window',
      icon: SlidingWindowIcon,
    },
    ...(FEATURE_FLAGS.doorCatalogue
      ? [{ id: 'bottom-nav-gallery', tabKey: 'gallery', label: 'Catalog', icon: Layers }]
      : []),
    ...(FEATURE_FLAGS.visualizer3dAr
      ? [{ id: 'bottom-nav-visualizer', tabKey: 'visualizer', label: '3D / AR', icon: Box }]
      : []),
    { id: 'bottom-nav-calculator', tabKey: 'calculator', label: 'Estimator', icon: Calculator },
    ...(FEATURE_FLAGS.articlesBlog
      ? [{ id: 'bottom-nav-articles', tabKey: 'articles', label: 'Guide', icon: BookOpen }]
      : []),
    { id: 'bottom-nav-wood-detector', tabKey: 'wood-detector', label: 'AI Scan', icon: Sparkles },
    {
      id: 'bottom-nav-premium',
      tabKey: 'premium',
      label: isPremium ? 'Ad-Free' : 'Upgrade',
      icon: Crown,
    },
    ...(FEATURE_FLAGS.orderTracking
      ? [{ id: 'bottom-nav-track', tabKey: 'tracking', label: 'Track', icon: Truck }]
      : []),
    { id: 'bottom-nav-favorites', tabKey: 'favorites', label: 'Saved', icon: Heart, isSaved: true },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E2E8F0] shadow-[0_-4px_20px_rgba(15,23,42,0.06)] safe-bottom pb-[env(safe-area-inset-bottom,0px)]">
      <nav
        aria-label="Bottom Navigation"
        className="flex items-center justify-start sm:justify-between w-full h-[66px] sm:h-[70px] max-w-3xl mx-auto px-1.5 overflow-x-auto no-scrollbar"
      >
        {navItems.map((item) => {
          const isSelected =
            current === item.tabKey || (item.tabKey === 'visualizer' && current === 'fitting');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              id={item.id}
              data-testid={item.id}
              type="button"
              onClick={() => (item.isSaved ? handleOpenSaved() : handleNav(item.tabKey))}
              className={`flex flex-col items-center justify-center flex-1 shrink-0 min-w-[64px] h-full px-1 pt-1 pb-1 focus:outline-none transition-colors duration-200 select-none cursor-pointer ${
                isSelected ? 'text-[#0B5ED7]' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
              aria-label={item.label}
              aria-current={isSelected ? 'page' : undefined}
            >
              <div className="relative flex items-center justify-center h-[24px]">
                <Icon
                  className={`w-[22px] h-[22px] transition-transform duration-200 ease-out ${
                    isSelected
                      ? 'scale-105 text-[#0B5ED7] stroke-[2.2]'
                      : 'text-[#64748B] stroke-[1.8]'
                  }`}
                />
                {item.isSaved && FEATURE_FLAGS.doorCatalogue && resolvedFavCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[14px] text-center rounded-full text-[8.5px] font-bold bg-rose-600 text-white leading-none shadow-sm">
                    {resolvedFavCount}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] leading-tight mt-1 text-center whitespace-nowrap transition-colors duration-200 ${
                  isSelected ? 'font-bold text-[#0B5ED7]' : 'font-medium text-[#475569]'
                }`}
              >
                {item.label}
              </span>

              <div
                className={`h-[3px] rounded-full mt-1 transition-all duration-200 ${
                  isSelected
                    ? 'w-5 bg-[#F97316] opacity-100 scale-100'
                    : 'w-5 bg-transparent opacity-0 scale-75'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </div>
  );
};
