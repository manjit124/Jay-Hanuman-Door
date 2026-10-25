import React, { useEffect, useState } from 'react';
import { Sparkles, Info } from 'lucide-react';
import { adMobService } from '../../lib/admob/admobService.ts';
import { getActiveAdMobSettings } from '../../lib/admob/admobConfig.ts';
import { BusinessSettings } from '../../types.ts';

interface AdMobBannerSlotProps {
  placement: 'home' | 'catalog' | 'calculator' | 'guide' | 'tracking' | 'detail' | 'visualizer' | 'saved';
  settings?: BusinessSettings;
  className?: string;
  position?: 'top' | 'bottom';
}

export const AdMobBannerSlot: React.FC<AdMobBannerSlotProps> = ({
  placement,
  settings,
  className = '',
  position = 'bottom',
}) => {
  const adConfig = getActiveAdMobSettings(settings?.adSettings);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    const native = adMobService.isNative();
    setIsNative(native);

    if (!adConfig.enabled || !adConfig.enableBanners) {
      return;
    }

    if (native) {
      // In native Android, initialize and display banner with bottom-nav protection margin
      const bannerPos: 'top' | 'bottom' = position === 'top' ? 'top' : 'bottom';
      adMobService.showAdaptiveBanner(bannerPos, settings?.adSettings, 72);
      return () => {
        adMobService.hideAdaptiveBanner();
      };
    }
  }, [adConfig.enabled, adConfig.enableBanners, position, settings?.adSettings]);

  if (!adConfig.enabled || !adConfig.enableBanners) {
    return null;
  }

  // If in native Android, the banner is rendered as a native overlay by Google Mobile Ads SDK.
  // We reserve space in layout to prevent screen jumps or overlapping content.
  if (isNative) {
    return (
      <div
        className={`w-full min-h-[52px] pointer-events-none transition-all ${className}`}
        aria-hidden="true"
      />
    );
  }

  // Web / Dev Preview Mode: Render policy-compliant test banner placeholder
  return (
    <div
      className={`w-full max-w-4xl mx-auto my-3 px-3 py-2.5 rounded-xl bg-stone-100 border border-dashed border-stone-300 text-stone-600 flex items-center justify-between gap-3 text-xs shadow-xs select-none ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#C89211] text-white uppercase tracking-wider">
          Ad
        </span>
        <span className="font-semibold text-stone-700">Google AdMob Adaptive Banner</span>
        <span className="hidden sm:inline text-stone-400">•</span>
        <span className="hidden sm:inline text-[11px] text-stone-500">Placement: {placement}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
        <Info className="w-3.5 h-3.5 text-stone-400" />
        <span>{adConfig.testMode ? 'Test Mode Active' : 'Live Mode'}</span>
      </div>
    </div>
  );
};
