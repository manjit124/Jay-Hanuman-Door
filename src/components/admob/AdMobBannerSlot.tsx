import React, { useEffect, useState } from 'react';
import { Crown, Info } from 'lucide-react';
import { adMobService } from '../../lib/admob/admobService.ts';
import { getActiveAdMobSettings } from '../../lib/admob/admobConfig.ts';
import { BusinessSettings } from '../../types.ts';

export type AdBannerPlacement =
  | 'home'
  | 'catalog'
  | 'calculator'
  | 'sliding_window'
  | 'ai_wood_detector'
  | 'chaukhat'
  | 'guide'
  | 'articles'
  | 'tracking'
  | 'detail'
  | 'visualizer'
  | 'saved';

interface AdMobBannerSlotProps {
  placement: AdBannerPlacement;
  settings?: BusinessSettings;
  className?: string;
  position?: 'top' | 'bottom';
  onOpenPremium?: () => void;
}

export const AdMobBannerSlot: React.FC<AdMobBannerSlotProps> = ({
  placement,
  settings,
  className = '',
  position = 'bottom',
  onOpenPremium,
}) => {
  const [isPremium, setIsPremium] = useState<boolean>(() => adMobService.isPremiumActive());
  const [isNative, setIsNative] = useState<boolean>(false);

  useEffect(() => {
    setIsPremium(adMobService.isPremiumActive());
    return adMobService.subscribeEntitlementChange((premium) => {
      setIsPremium(premium);
      if (premium) {
        adMobService.hideAdaptiveBanner();
      }
    });
  }, []);

  const isAdmin = adMobService.isAdminActive();
  const adConfig = getActiveAdMobSettings(settings?.adSettings);
  const isEnabled =
    !isAdmin && !isPremium && adMobService.isPlacementEnabled(placement, settings?.adSettings);

  useEffect(() => {
    if (isAdmin || isPremium) {
      adMobService.hideAdaptiveBanner();
      return;
    }

    const native = adMobService.isNative();
    setIsNative(native);

    if (!isEnabled) {
      return;
    }

    adMobService.trackEvent('impression', 'banner', placement);

    if (native) {
      const bannerPos: 'top' | 'bottom' = position === 'top' ? 'top' : 'bottom';
      adMobService.showAdaptiveBanner(bannerPos, settings?.adSettings, 72);
      return () => {
        adMobService.hideAdaptiveBanner();
      };
    }
  }, [isEnabled, position, placement, settings?.adSettings, isAdmin, isPremium]);

  if (isAdmin || isPremium || !isEnabled) {
    return null;
  }

  if (isNative) {
    return (
      <div
        data-admob-banner={placement}
        className={`w-full min-h-[56px] pointer-events-none transition-all ${className}`}
        aria-hidden="true"
      />
    );
  }

  const handleRemoveAdsClick = () => {
    if (onOpenPremium) {
      onOpenPremium();
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jhd:open-premium'));
    }
  };

  return (
    <div
      data-testid={`admob-banner-${placement}`}
      data-admob-banner={placement}
      className={`w-full max-w-4xl mx-auto my-3 px-3.5 py-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-[#555555] flex flex-wrap items-center justify-between gap-2.5 text-xs select-none ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#C89211] text-white uppercase tracking-wider shrink-0">
          Ad
        </span>
        <span className="font-semibold text-[#1A1A1A] truncate">Google AdMob Adaptive Banner</span>
        <span className="hidden sm:inline text-[#CCCCCC]">•</span>
        <span className="hidden sm:inline text-[11px] text-[#666666] font-mono">{placement}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[#666666]">
          <Info className="w-3.5 h-3.5 text-[#888888]" />
          <span>{adConfig.testMode ? 'Test Ad Unit' : 'Live Ad Unit'}</span>
        </span>
        <button
          type="button"
          onClick={handleRemoveAdsClick}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#A0700B] hover:text-[#1A1A1A] transition-colors whitespace-nowrap cursor-pointer"
        >
          <Crown className="w-3.5 h-3.5 text-[#C89211]" />
          <span>Remove Ads</span>
        </button>
      </div>
    </div>
  );
};
