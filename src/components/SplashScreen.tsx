import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
  isDataReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 1200,
  isDataReady = true,
}) => {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Keep splash brief and snappy without delaying the app startup
    const timer = setTimeout(() => {
      setFadeOut(true);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, 400); // 400ms fade transition
      return () => clearTimeout(hideTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!visible) return null;

  return (
    <div
      id="app-splash-screen"
      role="status"
      aria-label="Loading Jai Hanuman Door"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0C0A09] text-white transition-opacity duration-500 select-none ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle luxury golden radial glow in background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,146,17,0.18)_0%,rgba(12,10,9,0.95)_70%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-6 text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Official Jai Hanuman Door Logo with subtle golden aura */}
        <div className="relative mb-5 group">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#C89211]/30 via-[#FEF08A]/20 to-[#C89211]/30 blur-md animate-pulse" />
          <img
            src="/assets/logo.png"
            alt="Jai Hanuman Door Official Logo"
            className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full object-contain shadow-2xl border-2 border-[#C89211]/60 bg-[#0C0A09]"
            loading="eager"
            draggable={false}
          />
        </div>

        {/* Brand Text */}
        <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-[#FEF08A] drop-shadow-sm">
          Jai Hanuman Door
        </h1>
        <p className="text-xs sm:text-sm text-amber-200/80 font-medium tracking-wider uppercase mt-1">
          Wooden Door • Sagwan Door • Door Frame
        </p>
        <p className="text-[11px] text-stone-400 mt-1 max-w-xs">
          Direct Workshop Manufacturing &amp; Instant Estimation
        </p>

        {/* Elegant Gold Progress Indicator */}
        <div className="mt-6 w-36 h-1 rounded-full bg-stone-800 overflow-hidden relative border border-[#C89211]/30">
          <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#C89211] via-[#FEF08A] to-[#C89211] w-full animate-[pulse_1.2s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
};
