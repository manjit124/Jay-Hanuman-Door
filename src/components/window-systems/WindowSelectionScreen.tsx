import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Layers, ShieldCheck, Sliders } from 'lucide-react';
import type { WindowSystemCategoryId, WindowSystemDefinition } from '../../types.ts';
import {
  WINDOW_SYSTEM_CATEGORIES,
  isWindowSystemFormulaReady,
} from '../../data/indianWindowSystemsDefaults.ts';
import { WindowSystemIllustration } from './WindowSystemIllustration.tsx';

export interface WindowSelectionLaunchConfig {
  system: WindowSystemDefinition;
  profileSeriesId?: string;
  trackCount: number;
  shutterCount: number;
  includeMosquitoNet: boolean;
}

interface WindowSelectionScreenProps {
  initialCategoryId: WindowSystemCategoryId;
  systems: WindowSystemDefinition[];
  onBack: () => void;
  onLaunchCalculator: (config: WindowSelectionLaunchConfig) => void;
}

export const WindowSelectionScreen: React.FC<WindowSelectionScreenProps> = ({
  initialCategoryId,
  systems,
  onBack,
  onLaunchCalculator,
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<WindowSystemCategoryId>(initialCategoryId);

  useEffect(() => {
    setActiveCategoryId(initialCategoryId);
  }, [initialCategoryId]);

  const categorySystems = useMemo(
    () =>
      (systems || [])
        .filter((s) => s.enabled !== false && s.categoryId === activeCategoryId)
        .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999)),
    [systems, activeCategoryId]
  );

  const [selectedSystemId, setSelectedSystemId] = useState<string>(categorySystems[0]?.id || '');

  useEffect(() => {
    if (!categorySystems.some((s) => s.id === selectedSystemId)) {
      setSelectedSystemId(categorySystems[0]?.id || '');
    }
  }, [categorySystems, selectedSystemId]);

  const selectedSystem = useMemo(
    () => categorySystems.find((s) => s.id === selectedSystemId) || categorySystems[0] || null,
    [categorySystems, selectedSystemId]
  );

  const [profileSeriesId, setProfileSeriesId] = useState<string>('');
  const [trackCount, setTrackCount] = useState<number>(2);
  const [shutterCount, setShutterCount] = useState<number>(2);
  const [includeMosquitoNet, setIncludeMosquitoNet] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedSystem) return;
    setProfileSeriesId(selectedSystem.profileSeries[0]?.id || '');
    setTrackCount(selectedSystem.defaultTrackCount || 2);
    setShutterCount(selectedSystem.defaultShutterCount || 2);
    setIncludeMosquitoNet(Boolean(selectedSystem.defaultMosquitoNet));
  }, [selectedSystem?.id]);

  const activeCategoryMeta =
    WINDOW_SYSTEM_CATEGORIES.find((c) => c.id === activeCategoryId) || WINDOW_SYSTEM_CATEGORIES[0];

  const handleLaunch = () => {
    if (!selectedSystem) return;
    onLaunchCalculator({
      system: selectedSystem,
      profileSeriesId: profileSeriesId || selectedSystem.profileSeries[0]?.id,
      trackCount,
      shutterCount,
      includeMosquitoNet: selectedSystem.supportsMosquitoNet ? includeMosquitoNet : false,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#475569] hover:text-[#0B5ED7] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Category Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-xl">
          {WINDOW_SYSTEM_CATEGORIES.map((cat) => {
            const active = cat.id === activeCategoryId;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#0B5ED7] text-white shadow-sm'
                    : 'text-[#475569] hover:text-[#0A2540]'
                }`}
              >
                {cat.code}. {cat.shortTitle}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
          Window Selection · Category {activeCategoryMeta.code}
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A2540] mt-1">
          {activeCategoryMeta.title}
        </h1>
        <p className="text-xs sm:text-sm text-[#475569] mt-1">
          {activeCategoryMeta.subtitle}. Select your exact window profile system and configuration below.
        </p>
      </div>

      {/* Main Layout: Window Types Grid + Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Available Window Types in Category */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categorySystems.map((sys) => {
              const isSelected = sys.id === selectedSystem?.id;
              const ready = isWindowSystemFormulaReady(sys);
              return (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => setSelectedSystemId(sys.id)}
                  className={`text-left rounded-xl p-3 sm:p-3.5 border transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EFF6FF] border-[#0B5ED7] ring-2 ring-[#0B5ED7]/20 shadow-sm'
                      : 'bg-white border-[#E2E8F0] hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="w-full rounded-lg bg-white border border-[#E2E8F0] p-2">
                      <WindowSystemIllustration type={sys.illustrationType} className="w-full h-16" />
                    </div>
                    <h2 className="text-xs sm:text-sm font-bold text-[#0A2540] leading-snug">
                      {sys.name}
                    </h2>
                    <p className="text-[11px] text-[#475569] line-clamp-2 leading-relaxed">
                      {sys.shortDescription}
                    </p>
                  </div>

                  <div className="pt-1 border-t border-[#E2E8F0]/70 flex items-center justify-between text-[10px] font-semibold">
                    {ready ? (
                      <span className="inline-flex items-center gap-1 text-[#059669]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified Formula</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#D97706]">
                        <Sliders className="w-3 h-3" />
                        <span>Setup Required</span>
                      </span>
                    )}
                    <span className="text-[#64748B] font-mono">
                      {sys.profileSeries[0]?.code || 'STD'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Window System Pre-Configuration */}
        {selectedSystem && (
          <div className="lg:col-span-5 xl:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 lg:sticky lg:top-20">
            <div className="flex items-start gap-3 pb-3 border-b border-[#E2E8F0]">
              <div className="w-20 shrink-0 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-1.5">
                <WindowSystemIllustration type={selectedSystem.illustrationType} className="w-full h-12" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0B5ED7]">
                  Selected System
                </div>
                <h3 className="text-base font-extrabold text-[#0A2540] leading-tight">
                  {selectedSystem.name}
                </h3>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  {selectedSystem.shortDescription}
                </p>
              </div>
            </div>

            {/* Profile Series Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#0A2540]">
                Profile / System Series
              </label>
              <select
                value={profileSeriesId}
                onChange={(e) => setProfileSeriesId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs sm:text-sm font-medium text-[#0A2540] focus:border-[#0B5ED7] focus:outline-none"
              >
                {selectedSystem.profileSeries.map((ps) => (
                  <option key={ps.id} value={ps.id}>
                    {ps.name} ({ps.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Track Configuration */}
            {selectedSystem.supportsTracks && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#0A2540]">
                  Track Configuration
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedSystem.allowedTrackCounts.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrackCount(t)}
                      className={`h-9 px-3.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        trackCount === t
                          ? 'bg-[#0A2540] text-white border-[#0A2540]'
                          : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:border-[#0B5ED7]'
                      }`}
                    >
                      {t} Track
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Shutter Count */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#0A2540]">
                Number of Glass Shutters / Panels
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedSystem.allowedShutterCounts.map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setShutterCount(cnt)}
                    className={`h-9 px-3.5 rounded-lg text-xs font-bold border transition-colors tabular-nums cursor-pointer ${
                      shutterCount === cnt
                        ? 'bg-[#0B5ED7] text-white border-[#0B5ED7]'
                        : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:border-[#0B5ED7]'
                    }`}
                  >
                    {cnt} {cnt === 1 ? 'Panel' : 'Shutters'}
                  </button>
                ))}
              </div>
            </div>

            {/* Mosquito Net Option */}
            {selectedSystem.supportsMosquitoNet && (
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] cursor-pointer">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#F97316] shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-[#0A2540]">Include Mosquito Net</div>
                    <div className="text-[11px] text-[#64748B]">
                      Calculate separate mosquito net frame &amp; mesh sizes
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeMosquitoNet}
                  onChange={(e) => setIncludeMosquitoNet(e.target.checked)}
                  className="w-4 h-4 accent-[#F97316] cursor-pointer"
                />
              </label>
            )}

            {/* Reusable Presets (if available) */}
            {selectedSystem.presets && selectedSystem.presets.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-[#0A2540] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0B5ED7]" />
                  <span>Quick Presets</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSystem.presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setProfileSeriesId(preset.profileSeriesId);
                        setTrackCount(preset.trackCount);
                        setShutterCount(preset.shutterCount);
                        setIncludeMosquitoNet(preset.includeMosquitoNet);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#CBD5E1] text-[11px] font-semibold text-[#334155] cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Launch Calculator Button */}
            <button
              id="launch-selected-window-calc-btn"
              type="button"
              onClick={handleLaunch}
              className="w-full h-11 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <span>Open Cutting Size Calculator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
