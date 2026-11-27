import React, { useEffect, useState } from 'react';
import { BRAND_LOGO_URL, BRAND_NAME, BRAND_TAGLINE } from '../config/brand.ts';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
  isDataReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1100,
}) => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, 360);
      return () => clearTimeout(hideTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!visible) return null;

  return (
    <div
      id="app-splash-screen"
      role="status"
      aria-label={`Loading ${BRAND_NAME}`}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-[#0A2540] transition-opacity duration-300 select-none ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle engineering blueprint tint */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(11,94,215,0.08)_0%,rgba(255,255,255,0)_58%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.06)_0%,rgba(255,255,255,0)_50%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Exact WindowCut Pro Official Logo */}
        <div className="mb-5 p-2 rounded-3xl bg-white border border-[#E2E8F0] shadow-[0_14px_40px_rgba(11,94,215,0.12)]">
          <img
            src={BRAND_LOGO_URL}
            alt={`${BRAND_NAME} Official Logo`}
            className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl object-contain"
            loading="eager"
            draggable={false}
          />
        </div>

        {/* Brand Wordmark */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A2540]">
          WindowCut <span className="text-[#F97316]">Pro</span>
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-[#0B5ED7] tracking-wide mt-1">
          {BRAND_TAGLINE}
        </p>
        <p className="text-xs text-[#64748B] mt-1.5 max-w-xs">
          Glass Cutting · Tracks · Bearings · Mosquito Net · Bulk Sheets
        </p>

        {/* Clean Blue-to-Orange Progress Bar */}
        <div className="mt-6 w-44 h-1.5 rounded-full bg-[#E2E8F0] overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#0B5ED7] via-[#3B82F6] to-[#F97316] animate-pulse" />
        </div>
      </div>
    </div>
  );
};
