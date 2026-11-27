import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookmarkCheck,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FolderOpen,
  Printer,
  Save,
  ShieldCheck,
  Sliders,
  Trash2,
} from 'lucide-react';
import type {
  BusinessSettings,
  CustomerAccount,
  SavedWindowSystemCalculation,
  WindowCustomDeductionsInput,
  WindowMeasurementUnit,
  WindowSystemCalculationResult,
  WindowSystemDefinition,
} from '../../types.ts';
import { GLASS_THICKNESS_OPTIONS } from '../../data/slidingWindowDefaults.ts';
import { isWindowSystemFormulaReady } from '../../data/indianWindowSystemsDefaults.ts';
import { calculateWindowSystemCutting } from '../../lib/windowSystemEngine.ts';
import { downloadWindowSystemCuttingPDF } from '../../lib/windowSystemExport.ts';
import {
  deleteSavedWindowSystemCalc,
  fetchSavedWindowSystemCalcs,
  saveWindowSystemCalculation,
} from '../../lib/windowSystemApi.ts';
import { MeasurementInput } from '../sliding-window/MeasurementInput.tsx';
import { AdMobBannerSlot } from '../admob/AdMobBannerSlot.tsx';
import { adMobService } from '../../lib/admob/admobService.ts';
import { WindowSystemIllustration } from './WindowSystemIllustration.tsx';

interface WindowSystemCalculatorViewProps {
  system: WindowSystemDefinition;
  allSystems: WindowSystemDefinition[];
  initialProfileSeriesId?: string;
  initialTrackCount?: number;
  initialShutterCount?: number;
  initialMosquitoNet?: boolean;
  customerUser: CustomerAccount | null;
  settings?: BusinessSettings;
  isAdminLoggedIn?: boolean;
  onBack: () => void;
  onSwitchSystem: (system: WindowSystemDefinition) => void;
  onOpenLegacySlidingWorkspace: (tab: 'single' | 'bulk' | 'settings') => void;
  onOpenAdminFormulaManager?: () => void;
  onRequireCalculationLogin: (reason: string, onSuccess?: () => void) => boolean;
}

const EMPTY_CUSTOM_DEDUCTIONS: WindowCustomDeductionsInput = {
  enabled: false,
  topTrackDeductionInch: 0,
  topTrackAdditionInch: 0,
  bottomTrackDeductionInch: 0,
  bottomTrackAdditionInch: 0,
  sideFrameDeductionInch: 0,
  sideFrameAdditionInch: 0,
  interlockDeductionInch: 0,
  interlockAdditionInch: 0,
  handleDeductionInch: 0,
  handleAdditionInch: 0,
  glassWidthDeductionInch: 0,
  glassWidthAdditionInch: 0,
  glassHeightDeductionInch: 0,
  glassHeightAdditionInch: 0,
  mosquitoNetWidthDeductionInch: 0,
  mosquitoNetWidthAdditionInch: 0,
  mosquitoNetHeightDeductionInch: 0,
  mosquitoNetHeightAdditionInch: 0,
};

export const WindowSystemCalculatorView: React.FC<WindowSystemCalculatorViewProps> = ({
  system,
  allSystems,
  initialProfileSeriesId,
  initialTrackCount,
  initialShutterCount,
  initialMosquitoNet,
  customerUser,
  settings,
  isAdminLoggedIn = false,
  onBack,
  onSwitchSystem,
  onOpenLegacySlidingWorkspace,
  onOpenAdminFormulaManager,
  onRequireCalculationLogin,
}) => {
  // Core Window Inputs
  const [windowLabel, setWindowLabel] = useState('W-1');
  const [unit, setUnit] = useState<WindowMeasurementUnit>('inch');
  const [width, setWidth] = useState<number | null>(48);
  const [height, setHeight] = useState<number | null>(48);
  const [quantity, setQuantity] = useState<number>(1);
  const [trackCount, setTrackCount] = useState<number>(initialTrackCount || system.defaultTrackCount || 2);
  const [shutterCount, setShutterCount] = useState<number>(initialShutterCount || system.defaultShutterCount || 2);
  const [includeMosquitoNet, setIncludeMosquitoNet] = useState<boolean>(
    initialMosquitoNet !== undefined ? initialMosquitoNet : Boolean(system.defaultMosquitoNet)
  );
  const [profileSeriesId, setProfileSeriesId] = useState<string>(
    initialProfileSeriesId || system.profileSeries[0]?.id || ''
  );
  const [glassThickness, setGlassThickness] = useState<string>(GLASS_THICKNESS_OPTIONS[1]);

  // Custom Deductions Drawer
  const [showCustomDeductions, setShowCustomDeductions] = useState<boolean>(false);
  const [customDeductions, setCustomDeductions] =
    useState<WindowCustomDeductionsInput>(EMPTY_CUSTOM_DEDUCTIONS);

  // Calculation & Saved Lists State
  const [result, setResult] = useState<WindowSystemCalculationResult | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>(customerUser?.name || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedList, setSavedList] = useState<SavedWindowSystemCalculation[]>([]);
  const [showSavedList, setShowSavedList] = useState<boolean>(false);

  // Sync defaults when switching systems
  useEffect(() => {
    setProfileSeriesId(initialProfileSeriesId || system.profileSeries[0]?.id || '');
    setTrackCount(initialTrackCount || system.defaultTrackCount || 2);
    setShutterCount(initialShutterCount || system.defaultShutterCount || 2);
    setIncludeMosquitoNet(
      initialMosquitoNet !== undefined ? initialMosquitoNet : Boolean(system.defaultMosquitoNet)
    );
    setCustomDeductions(EMPTY_CUSTOM_DEDUCTIONS);
    setShowCustomDeductions(false);
    setResult(null);
    setSaveMessage(null);
    setSaveError(null);
  }, [system.id]);

  useEffect(() => {
    if (customerUser?.name && !customerName) {
      setCustomerName(customerUser.name);
    }
  }, [customerUser?.name]);

  // Load saved cutting lists when signed in
  useEffect(() => {
    if (!customerUser) {
      setSavedList([]);
      return;
    }
    fetchSavedWindowSystemCalcs()
      .then((list) => setSavedList(list))
      .catch(() => {});
  }, [customerUser?.id]);

  const formulaReady = useMemo(() => isWindowSystemFormulaReady(system), [system]);

  const runCalculationInternal = () => {
    setSaveMessage(null);
    setSaveError(null);

    const calc = calculateWindowSystemCutting(system, {
      systemId: system.id,
      profileSeriesId,
      width: Number(width) || 0,
      height: Number(height) || 0,
      unit,
      quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
      trackCount,
      shutterCount,
      includeMosquitoNet: system.supportsMosquitoNet ? includeMosquitoNet : false,
      glassThickness,
      windowLabel,
      customDeductions: customDeductions.enabled ? customDeductions : undefined,
    });

    setResult(calc);

    if (calc.status === 'calculated') {
      // Trigger AdMob interstitial according to existing frequency rules (skipped automatically for verified Premium)
      adMobService.showPlacementInterstitial('sliding_window', () => {}, settings?.adSettings).catch(() => {});
    }
  };

  const handleCalculate = () => {
    // Preserve mandatory OTP login gate before showing calculated cutting results
    const allowed = onRequireCalculationLogin(
      `Sign in with your mobile OTP to view cutting measurements for ${system.name}.`,
      () => runCalculationInternal()
    );
    if (!allowed) return;
    runCalculationInternal();
  };

  const handleSaveCalculation = async () => {
    if (!result || result.status !== 'calculated') return;
    const allowed = onRequireCalculationLogin(
      'Sign in with your mobile OTP to save cutting lists to your account.'
    );
    if (!allowed) return;

    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const saved = await saveWindowSystemCalculation({
        projectName: projectName.trim() || `${system.name} — ${result.input.windowLabel}`,
        customerName: customerName.trim() || customerUser?.name || 'Workshop Client',
        result,
      });
      setSavedList((prev) => [saved, ...prev]);
      setSaveMessage('Cutting list saved to your account.');
    } catch (err: any) {
      setSaveError(err?.message || 'Unable to save cutting list.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      await deleteSavedWindowSystemCalc(id);
      setSavedList((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setSaveError(err?.message || 'Unable to delete saved cutting list.');
    }
  };

  const handleDownloadPdf = () => {
    if (!result || result.status !== 'calculated') return;
    downloadWindowSystemCuttingPDF({
      result,
      projectName: projectName.trim() || `${system.name} Cutting List`,
      customerName: customerName.trim() || customerUser?.name || 'Fabricator',
      settings,
    });
  };

  const handlePrint = () => {
    if (!result || result.status !== 'calculated') return;
    window.print();
  };

  const updateCustomField = (
    key: keyof WindowCustomDeductionsInput,
    val: number | null | boolean
  ) => {
    setCustomDeductions((prev) => ({
      ...prev,
      [key]: typeof val === 'boolean' ? val : Number(val) || 0,
    }));
  };

  const isLegacyVerified =
    system.usesLegacySlidingEngine === '2-track' || system.usesLegacySlidingEngine === '3-track';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Navigation & System Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#475569] hover:text-[#0B5ED7] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Window Systems</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Switch Window System"
            value={system.id}
            onChange={(e) => {
              const target = allSystems.find((s) => s.id === e.target.value);
              if (target) onSwitchSystem(target);
            }}
            className="h-9 px-3 rounded-lg bg-white border border-[#CBD5E1] text-xs font-bold text-[#0A2540] focus:border-[#0B5ED7] focus:outline-none"
          >
            {allSystems
              .filter((s) => s.enabled !== false)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>

          {customerUser && savedList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSavedList((v) => !v)}
              className="h-9 px-3 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#CBD5E1] text-xs font-bold text-[#0A2540] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#0B5ED7]" />
              <span>Saved ({savedList.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* System Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-24 sm:w-28 shrink-0 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-2">
            <WindowSystemIllustration type={system.illustrationType} className="w-full h-14 sm:h-16" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="uppercase tracking-wider text-[#0B5ED7]">Cutting Size Calculator</span>
              <span className="text-[#CBD5E1]">·</span>
              {formulaReady ? (
                <span className="inline-flex items-center gap-1 text-[#059669]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isLegacyVerified ? 'Verified Sliding Formula' : 'Admin Configured Formula'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[#D97706]">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Setup Required</span>
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-[#0A2540] leading-tight">
              {system.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#475569]">{system.shortDescription}</p>
          </div>
        </div>

        {/* Shortcut to Existing Full Sliding Workspace (Bulk + Photo Scanner) for Verified 2T/3T */}
        {isLegacyVerified && (
          <div className="flex flex-wrap gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={() => onOpenLegacySlidingWorkspace('bulk')}
              className="h-9 px-3 rounded-lg bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <span>Bulk &amp; Photo Scanner</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenLegacySlidingWorkspace('settings')}
              className="h-9 px-3 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#0A2540] border border-[#CBD5E1] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#0B5ED7]" />
              <span>Edit 2T/3T Rules</span>
            </button>
          </div>
        )}
      </div>

      {/* Saved Calculations Drawer */}
      {showSavedList && savedList.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-[#0A2540]">Saved Cutting Lists</h2>
            <button
              type="button"
              onClick={() => setShowSavedList(false)}
              className="text-xs font-semibold text-[#64748B] hover:text-[#0A2540] cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {savedList.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    setResult(item.result);
                    setProjectName(item.projectName);
                    setCustomerName(item.customerName);
                    setShowSavedList(false);
                  }}
                  className="text-left min-w-0 flex-1 cursor-pointer"
                >
                  <div className="text-xs font-bold text-[#0A2540] truncate">{item.projectName}</div>
                  <div className="text-[11px] text-[#475569] truncate">
                    {item.systemName} · {item.result.input.widthDecimalFormatted} × {item.result.input.heightDecimalFormatted} (Qty {item.result.input.quantity})
                  </div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSaved(item.id)}
                  aria-label="Delete saved cutting list"
                  className="p-1.5 text-[#94A3B8] hover:text-[#DC2626] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Workspace: Inputs Left, Results Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: INPUT FORM */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 print:hidden">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <h2 className="text-sm sm:text-base font-extrabold text-[#0A2540]">
              Window Dimensions &amp; Configuration
            </h2>
            {/* Unit Switcher */}
            <div className="inline-flex rounded-lg bg-[#F1F5F9] p-0.5">
              {(['inch', 'feet', 'mm'] as WindowMeasurementUnit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase cursor-pointer ${
                    unit === u ? 'bg-[#0B5ED7] text-white' : 'text-[#475569]'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Width & Height with Mixed Fraction + Decimal Support */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0A2540]">
                Total Window Width ({unit})
              </label>
              <MeasurementInput
                value={width}
                unit={unit}
                onValueChange={setWidth}
                placeholder={unit === 'inch' ? 'e.g. 48 1/2 or 48.5' : 'Enter width'}
                ariaLabel="Total Window Width"
                showConversionHint
                className="w-full h-11 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0B5ED7] focus:bg-white focus:outline-none text-sm font-mono font-bold text-[#0A2540]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0A2540]">
                Total Window Height ({unit})
              </label>
              <MeasurementInput
                value={height}
                unit={unit}
                onValueChange={setHeight}
                placeholder={unit === 'inch' ? 'e.g. 48 or 42 3/8' : 'Enter height'}
                ariaLabel="Total Window Height"
                showConversionHint
                className="w-full h-11 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0B5ED7] focus:bg-white focus:outline-none text-sm font-mono font-bold text-[#0A2540]"
              />
            </div>
          </div>

          {/* Quantity & Window Tag */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0A2540]">Window Quantity</label>
              <input
                type="number"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1)))}
                className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0B5ED7] focus:bg-white focus:outline-none text-sm font-mono font-bold text-[#0A2540]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#0A2540]">Window Tag / Label</label>
              <input
                type="text"
                maxLength={32}
                value={windowLabel}
                onChange={(e) => setWindowLabel(e.target.value)}
                placeholder="W-1 / Bedroom"
                className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#0B5ED7] focus:bg-white focus:outline-none text-xs sm:text-sm font-semibold text-[#0A2540]"
              />
            </div>
          </div>

          {/* Profile Series Selector */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0A2540]">Profile Series</label>
            <select
              value={profileSeriesId}
              onChange={(e) => setProfileSeriesId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs sm:text-sm font-semibold text-[#0A2540] focus:border-[#0B5ED7] focus:outline-none"
            >
              {system.profileSeries.map((ps) => (
                <option key={ps.id} value={ps.id}>
                  {ps.name} ({ps.code}){ps.isConfigured ? '' : ' — Setup Required'}
                </option>
              ))}
            </select>
          </div>

          {/* Track & Shutter Selectors */}
          <div className="grid grid-cols-2 gap-3">
            {system.supportsTracks && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#0A2540]">Track Configuration</label>
                <select
                  value={trackCount}
                  onChange={(e) => setTrackCount(Number(e.target.value) || system.defaultTrackCount)}
                  className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs sm:text-sm font-semibold text-[#0A2540] focus:border-[#0B5ED7] focus:outline-none"
                >
                  {system.allowedTrackCounts.map((t) => (
                    <option key={t} value={t}>
                      {t} Track
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={system.supportsTracks ? 'space-y-1' : 'col-span-2 space-y-1'}>
              <label className="block text-xs font-bold text-[#0A2540]">Number of Glass Shutters</label>
              <select
                value={shutterCount}
                onChange={(e) => setShutterCount(Number(e.target.value) || system.defaultShutterCount)}
                className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs sm:text-sm font-semibold text-[#0A2540] focus:border-[#0B5ED7] focus:outline-none"
              >
                {system.allowedShutterCounts.map((cnt) => (
                  <option key={cnt} value={cnt}>
                    {cnt} {cnt === 1 ? 'Glass Panel' : 'Glass Shutters'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Glass Thickness */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0A2540]">Glass Thickness</label>
            <select
              value={glassThickness}
              onChange={(e) => setGlassThickness(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs sm:text-sm font-medium text-[#0A2540] focus:border-[#0B5ED7] focus:outline-none"
            >
              {GLASS_THICKNESS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Mosquito Net Requirement */}
          {system.supportsMosquitoNet && (
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FFF7ED] border border-[#FED7AA] cursor-pointer">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#F97316] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#0A2540]">Mosquito Net Required</div>
                  <div className="text-[11px] text-[#64748B]">Include mosquito net frame &amp; mesh cutting sizes</div>
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

          {/* Custom Deductions & Additions Accordion */}
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCustomDeductions((v) => !v)}
              className="w-full px-3.5 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] flex items-center justify-between text-xs font-bold text-[#0A2540] cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#0B5ED7]" />
                <span>Custom Deductions &amp; Additions (Inches)</span>
              </span>
              {showCustomDeductions ? (
                <ChevronUp className="w-4 h-4 text-[#64748B]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#64748B]" />
              )}
            </button>

            {showCustomDeductions && (
              <div className="p-3.5 space-y-3 bg-white border-t border-[#E2E8F0]">
                <label className="flex items-center gap-2.5 text-xs font-bold text-[#0A2540] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customDeductions.enabled}
                    onChange={(e) => updateCustomField('enabled', e.target.checked)}
                    className="w-4 h-4 accent-[#0B5ED7]"
                  />
                  <span>Apply my custom workshop deductions for this calculation</span>
                </label>

                <p className="text-[11px] text-[#64748B]">
                  Enter exact minus (−) deductions and plus (+) allowances in decimal or fraction inches (e.g. 6.25 or 6 1/4).
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Top Track (−)', key: 'topTrackDeductionInch' as const },
                    { label: 'Top Track (+)', key: 'topTrackAdditionInch' as const },
                    { label: 'Bottom Track (−)', key: 'bottomTrackDeductionInch' as const },
                    { label: 'Bottom Track (+)', key: 'bottomTrackAdditionInch' as const },
                    { label: 'Side Frame (−)', key: 'sideFrameDeductionInch' as const },
                    { label: 'Side Frame (+)', key: 'sideFrameAdditionInch' as const },
                    { label: 'Handle Section (−)', key: 'handleDeductionInch' as const },
                    { label: 'Interlock Section (−)', key: 'interlockDeductionInch' as const },
                    { label: 'Glass Width (−)', key: 'glassWidthDeductionInch' as const },
                    { label: 'Glass Width (+)', key: 'glassWidthAdditionInch' as const },
                    { label: 'Glass Height (−)', key: 'glassHeightDeductionInch' as const },
                    { label: 'Glass Height (+)', key: 'glassHeightAdditionInch' as const },
                    { label: 'Mosquito Net W (−)', key: 'mosquitoNetWidthDeductionInch' as const },
                    { label: 'Mosquito Net W (+)', key: 'mosquitoNetWidthAdditionInch' as const },
                    { label: 'Mosquito Net H (−)', key: 'mosquitoNetHeightDeductionInch' as const },
                    { label: 'Mosquito Net H (+)', key: 'mosquitoNetHeightAdditionInch' as const },
                  ].map((field) => (
                    <div key={field.key} className="space-y-0.5">
                      <label className="block text-[10px] font-bold text-[#475569]">
                        {field.label}
                      </label>
                      <MeasurementInput
                        value={customDeductions[field.key] as number}
                        unit="inch"
                        allowZero
                        onValueChange={(v) => {
                          setCustomDeductions((prev) => ({
                            ...prev,
                            enabled: true,
                            [field.key]: Number(v) || 0,
                          }));
                        }}
                        placeholder="0"
                        className="w-full h-8 px-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-mono text-[#0A2540]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Primary Calculate CTA */}
          <button
            id="calculate-window-system-btn"
            type="button"
            onClick={handleCalculate}
            className="w-full h-12 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>Calculate Cutting Size</span>
          </button>
        </div>

        {/* RIGHT: RESULTS / SETUP REQUIRED / QUOTATION PANEL */}
        <div className="lg:col-span-7 space-y-4">
          {!result ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 text-center space-y-3">
              <div className="w-28 mx-auto rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-2.5">
                <WindowSystemIllustration type={system.illustrationType} className="w-full h-16" />
              </div>
              <h3 className="text-base font-extrabold text-[#0A2540]">
                Ready to Calculate {system.name}
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] max-w-md mx-auto">
                {formulaReady
                  ? 'Enter overall width, height, quantity, and shutter options on the left, then click Calculate Cutting Size to generate exact aluminium, glass, and mosquito net cutting measurements.'
                  : `Cutting deductions for ${system.name} require workshop setup. Click Calculate or open Custom Deductions to enter your exact profile deductions, or configure permanent rules in Admin Panel.`}
              </p>
              {!formulaReady && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomDeductions(true);
                      updateCustomField('enabled', true);
                    }}
                    className="h-9 px-4 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold cursor-pointer"
                  >
                    Enter Custom Deductions
                  </button>
                  {isAdminLoggedIn && onOpenAdminFormulaManager && (
                    <button
                      type="button"
                      onClick={onOpenAdminFormulaManager}
                      className="h-9 px-4 rounded-lg bg-[#0A2540] text-white text-xs font-bold cursor-pointer"
                    >
                      Configure in Admin Panel
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : result.status === 'setup_required' ? (
            /* EXPLICIT SETUP REQUIRED STATE — ZERO FABRICATED NUMBERS */
            <div className="bg-white border border-[#FDBA74] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C]">
                    Setup Required · No Assumed Formula
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0A2540]">
                    {system.name} Formula Not Configured Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                    {result.setupMessage}
                  </p>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 text-xs text-[#334155] space-y-1.5">
                <div className="font-bold text-[#0A2540]">Why no measurements are displayed:</div>
                <p>
                  Indian aluminium extrusion dies ({system.name}) vary across manufacturers and regional workshops. WindowCut Pro strictly avoids guessing deductions so you never waste aluminium sections or glass sheets.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomDeductions(true);
                    updateCustomField('enabled', true);
                  }}
                  className="h-10 px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sliders className="w-4 h-4" />
                  <span>Enter My Workshop Deductions</span>
                </button>
                {onOpenAdminFormulaManager && (
                  <button
                    type="button"
                    onClick={onOpenAdminFormulaManager}
                    className="h-10 px-4 rounded-xl bg-[#0A2540] hover:bg-[#1E293B] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Configure Permanently in Admin Panel</span>
                  </button>
                )}
              </div>
            </div>
          ) : result.status === 'invalid' ? (
            <div className="bg-white border border-[#FECACA] rounded-2xl p-5 space-y-2">
              <div className="text-sm font-bold text-[#B91C1C]">Invalid Dimensions or Deductions</div>
              <ul className="list-disc pl-5 text-xs text-[#991B1B] space-y-1">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            /* CALCULATED CUTTING LIST & QUOTATION VIEW */
            <div className="space-y-4">
              {/* Summary Header Bar */}
              <div className="bg-[#0A2540] text-white rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
                      {result.systemName} · {result.profileSeriesName}
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold mt-0.5">
                      Window {result.input.windowLabel} — Cutting List
                    </h2>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-xs text-[#CBD5E1]">Overall Opening Size</div>
                    <div className="text-sm sm:text-base font-extrabold text-white">
                      {result.input.widthDecimalFormatted} × {result.input.heightDecimalFormatted}
                    </div>
                    {(result.input.widthFractionFormatted || result.input.heightFractionFormatted) && (
                      <div className="text-[11px] text-[#93C5FD]">
                        ({result.input.widthFractionFormatted || result.input.widthDecimalFormatted} ×{' '}
                        {result.input.heightFractionFormatted || result.input.heightDecimalFormatted})
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata Strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] sm:text-xs text-[#CBD5E1] pt-2 border-t border-white/15 tabular-nums">
                  <span>Quantity: <strong className="text-white">{result.input.quantity}</strong></span>
                  <span>·</span>
                  <span>Tracks: <strong className="text-white">{result.input.trackCount}</strong></span>
                  <span>·</span>
                  <span>Shutters: <strong className="text-white">{result.input.shutterCount}</strong></span>
                  <span>·</span>
                  <span>Mosquito Net: <strong className="text-white">{result.input.includeMosquitoNet ? 'Yes' : 'No'}</strong></span>
                  <span>·</span>
                  <span>MM: <strong className="text-white">{result.input.widthMm} × {result.input.heightMm}</strong></span>
                </div>
              </div>

              {/* Action Bar: Project Details + Save / Print / Download PDF */}
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-3.5 sm:p-4 space-y-3 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project / Site Name (optional)"
                    className="h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0A2540]"
                  />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer / Client Name (optional)"
                    className="h-9 px-3 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs text-[#0A2540]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCalculation}
                    disabled={saving}
                    className="h-9 px-3.5 rounded-lg bg-[#0B5ED7] hover:bg-[#084BB3] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Cutting List'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="h-9 px-3.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="h-9 px-3.5 rounded-lg bg-[#F8FAFC] hover:bg-[#EFF6FF] text-[#0A2540] border border-[#CBD5E1] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#0B5ED7]" />
                    <span>Print</span>
                  </button>
                </div>
                {saveMessage && (
                  <div className="text-xs font-semibold text-[#059669] flex items-center gap-1.5">
                    <BookmarkCheck className="w-4 h-4" />
                    <span>{saveMessage}</span>
                  </div>
                )}
                {saveError && (
                  <div className="text-xs font-semibold text-[#DC2626]">{saveError}</div>
                )}
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-3 text-xs text-[#9A3412] space-y-1">
                  {result.warnings.map((w, idx) => (
                    <div key={idx}>• {w}</div>
                  ))}
                </div>
              )}

              {/* 1. Aluminium Section Cutting Sizes */}
              {result.aluminiumSections.length > 0 && (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#0A2540] uppercase tracking-wide">
                      Aluminium Section Cutting Measurements
                    </h3>
                    <span className="text-[11px] font-semibold text-[#64748B]">
                      Inches (Decimal &amp; Fraction)
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] text-[10px] sm:text-[11px] uppercase tracking-wider text-[#64748B] bg-[#FAFCFF]">
                          <th className="py-2.5 px-3 sm:px-4 font-bold">Section</th>
                          <th className="py-2.5 px-2.5 font-bold text-right">Decimal (in)</th>
                          <th className="py-2.5 px-2.5 font-bold text-right">Fraction (in)</th>
                          <th className="py-2.5 px-2.5 font-bold text-right hidden sm:table-cell">MM</th>
                          <th className="py-2.5 px-3 font-bold text-right">Total Pcs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-xs sm:text-sm">
                        {result.aluminiumSections.map((row) => (
                          <tr key={row.id} className="hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-3 sm:px-4">
                              <div className="font-bold text-[#0A2540]">{row.name}</div>
                              <div className="text-[10px] sm:text-[11px] text-[#64748B] font-mono">
                                {row.formulaSummary}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-extrabold text-[#0B5ED7] tabular-nums whitespace-nowrap">
                              {row.lengthDecimalFormatted}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-[#0A2540] tabular-nums whitespace-nowrap">
                              {row.lengthFractionFormatted || '—'}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono text-[#64748B] tabular-nums hidden sm:table-cell whitespace-nowrap">
                              {row.lengthMm} mm
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0A2540] tabular-nums whitespace-nowrap">
                              {row.totalPieces}{' '}
                              <span className="text-[10px] font-normal text-[#64748B]">
                                ({row.piecesPerWindow}/win)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Glass Cutting Measurements */}
              {result.glassCutting.length > 0 && (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#EFF6FF] border-b border-[#BFDBFE] flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#0A2540] uppercase tracking-wide">
                      Glass Cutting Sizes
                    </h3>
                    <span className="text-[11px] font-semibold text-[#0B5ED7]">
                      {result.input.glassThickness}
                    </span>
                  </div>
                  <div className="divide-y divide-[#F1F5F9]">
                    {result.glassCutting.map((row) => (
                      <div
                        key={row.id}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-sm font-bold text-[#0A2540]">{row.name}</div>
                          <div className="text-[11px] text-[#64748B] font-mono">{row.formulaSummary}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                          <div>
                            <div className="text-[10px] uppercase text-[#64748B]">Glass Width</div>
                            <div className="text-sm font-extrabold text-[#0B5ED7]">
                              {row.widthDecimalFormatted}
                              {row.widthFractionFormatted && (
                                <span className="text-xs font-semibold text-[#0A2540] ml-1">
                                  ({row.widthFractionFormatted})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[#94A3B8] font-bold">×</span>
                          <div>
                            <div className="text-[10px] uppercase text-[#64748B]">Glass Height</div>
                            <div className="text-sm font-extrabold text-[#0B5ED7]">
                              {row.heightDecimalFormatted}
                              {row.heightFractionFormatted && (
                                <span className="text-xs font-semibold text-[#0A2540] ml-1">
                                  ({row.heightFractionFormatted})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase text-[#64748B]">Total Sheets</div>
                            <div className="text-sm font-extrabold text-[#0A2540]">{row.totalPieces} pcs</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Mosquito Net Cutting Measurements */}
              {result.mosquitoNetCutting.length > 0 && (
                <div className="bg-white border border-[#FED7AA] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#FFF7ED] border-b border-[#FED7AA] flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#9A3412] uppercase tracking-wide">
                      Mosquito Net Frame &amp; Mesh Cutting Sizes
                    </h3>
                    <span className="text-[11px] font-semibold text-[#C2410C]">Separate Mesh Calculation</span>
                  </div>
                  <div className="divide-y divide-[#FFEDD5]">
                    {result.mosquitoNetCutting.map((row) => (
                      <div
                        key={row.id}
                        className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-sm font-bold text-[#0A2540]">{row.name}</div>
                          <div className="text-[11px] text-[#64748B] font-mono">{row.formulaSummary}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                          <div>
                            <div className="text-[10px] uppercase text-[#64748B]">Net Width</div>
                            <div className="text-sm font-extrabold text-[#EA580C]">
                              {row.widthDecimalFormatted}
                              {row.widthFractionFormatted && (
                                <span className="text-xs font-semibold text-[#0A2540] ml-1">
                                  ({row.widthFractionFormatted})
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[#94A3B8] font-bold">×</span>
                          <div>
                            <div className="text-[10px] uppercase text-[#64748B]">Net Height</div>
                            <div className="text-sm font-extrabold text-[#EA580C]">
                              {row.heightDecimalFormatted}
                              {row.heightFractionFormatted && (
                                <span className="text-xs font-semibold text-[#0A2540] ml-1">
                                  ({row.heightFractionFormatted})
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] uppercase text-[#64748B]">Total Units</div>
                            <div className="text-sm font-extrabold text-[#0A2540]">{row.totalPieces} pcs</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Total Material Cutting List */}
              {result.materialSummary.length > 0 && (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#0A2540] uppercase tracking-wide">
                      Total Material Cutting Summary (Qty: {result.input.quantity})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] text-[10px] sm:text-[11px] uppercase tracking-wider text-[#64748B]">
                          <th className="py-2 px-3 sm:px-4 font-bold">Material</th>
                          <th className="py-2 px-2.5 font-bold">Cut Size</th>
                          <th className="py-2 px-2.5 font-bold text-right">Qty</th>
                          <th className="py-2 px-3 sm:px-4 font-bold text-right">Total Requirement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-xs">
                        {result.materialSummary.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 px-3 sm:px-4 font-bold text-[#0A2540]">{item.name}</td>
                            <td className="py-2 px-2.5 font-mono text-[#334155] tabular-nums">
                              {item.cutSizeDisplay}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-[#0A2540] tabular-nums">
                              {item.totalPieces} pcs
                            </td>
                            <td className="py-2 px-3 sm:px-4 text-right font-mono font-semibold text-[#0B5ED7] tabular-nums">
                              {item.totalRunningFeet !== undefined
                                ? `${item.totalRunningFeet} ft`
                                : item.totalAreaSqFt !== undefined
                                  ? `${item.totalAreaSqFt} sq.ft`
                                  : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AdMob Banner Placement (Free users only; automatically hidden for verified Premium users) */}
          <div className="print:hidden">
            <AdMobBannerSlot placement="calculator" settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
};
