import React, { useState, useEffect, useMemo } from 'react';
import {
  Ruler,
  TreePine,
  Sparkles,
  Frame as FrameIcon,
  Wrench,
  Calculator,
  Download,
  Share2,
  MessageCircle,
  RotateCcw,
  CheckCircle2,
  Info,
  ChevronRight,
  ArrowRight,
  FileText,
  BookmarkPlus,
  History,
  AlertCircle,
} from 'lucide-react';
import {
  DoorMaterial,
  PolishFinish,
  ChaukhatFrame,
  HardwareItem,
  BusinessSettings,
  Door,
  CalculationResult,
  UserProfile,
  UserCalculationRecord,
} from '../types.ts';
import { saveUserCalculation } from '../lib/api.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

interface DoorCalculatorProps {
  materials: DoorMaterial[];
  finishes: PolishFinish[];
  frames: ChaukhatFrame[];
  hardware: HardwareItem[];
  settings: BusinessSettings;
  preselectedDoor?: Door | null;
  onClearPreselectedDoor?: () => void;
  onOpenQuotationModal: (calcResult: CalculationResult, selectedDoor?: Door | null) => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: (contextMsg?: string) => void;
  onOpenProfileHistory?: () => void;
  initialCalculationRecord?: UserCalculationRecord | null;
  onClearInitialRecord?: () => void;
}

export const DoorCalculator: React.FC<DoorCalculatorProps> = ({
  materials,
  finishes,
  frames,
  hardware,
  settings,
  preselectedDoor,
  onClearPreselectedDoor,
  onOpenQuotationModal,
  currentUser,
  onOpenAuth,
  onOpenProfileHistory,
  initialCalculationRecord,
  onClearInitialRecord,
}) => {
  // Step 1: Dimensions
  const [selectedPreset, setSelectedPreset] = useState<string>('36x78');
  const [widthInch, setWidthInch] = useState<number>(36);
  const [heightInch, setHeightInch] = useState<number>(78);

  // Step 2: Material
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');

  // Step 3: Polish / Finish
  const [selectedFinishId, setSelectedFinishId] = useState<string>('');

  // Step 4: Chowkhat / Frame
  const [selectedFrameId, setSelectedFrameId] = useState<string>('');

  // Step 5: Hardware
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('');
  const [hardwareQty, setHardwareQty] = useState<number>(1);

  // Active calculator step tab
  const [activeStep, setActiveStep] = useState<number>(1);

  // Save to history notification states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load from initialCalculationRecord if provided
  useEffect(() => {
    if (initialCalculationRecord) {
      setWidthInch(initialCalculationRecord.result.widthInch);
      setHeightInch(initialCalculationRecord.result.heightInch);
      setSelectedPreset('custom');

      // Match material
      const mat = materials.find(
        m => m.id === initialCalculationRecord.input.materialId || m.name === initialCalculationRecord.result.materialName
      );
      if (mat) setSelectedMaterialId(mat.id);

      // Match finish
      const fin = finishes.find(
        f => f.id === initialCalculationRecord.input.finishId || f.name === initialCalculationRecord.result.finishName
      );
      if (fin) setSelectedFinishId(fin.id);

      // Match frame
      const frm = frames.find(
        fr => fr.id === initialCalculationRecord.input.frameId || fr.name === initialCalculationRecord.result.frameName
      );
      if (frm) setSelectedFrameId(frm.id);

      // Match hardware
      const hwd = hardware.find(
        h => h.id === initialCalculationRecord.input.hardwareId || h.name === initialCalculationRecord.result.hardwareName
      );
      if (hwd) setSelectedHardwareId(hwd.id);

      if (initialCalculationRecord.input.hardwareQty) {
        setHardwareQty(initialCalculationRecord.input.hardwareQty);
      }
    }
  }, [initialCalculationRecord, materials, finishes, frames, hardware]);

  // Initialize selections with sensible defaults when DB data loads
  useEffect(() => {
    if (materials.length > 0 && !selectedMaterialId) {
      // Default to Sagwan or first material
      const sagwan = materials.find(m => m.name.toLowerCase().includes('sagwan')) || materials[0];
      setSelectedMaterialId(sagwan.id);
    }
    if (finishes.length > 0 && !selectedFinishId) {
      // Default to Teak Polish or first finish
      const teakPolish = finishes.find(f => f.name.toLowerCase().includes('teak')) || finishes[0];
      setSelectedFinishId(teakPolish.id);
    }
    if (frames.length > 0 && !selectedFrameId) {
      // Default to Normal Frame
      const normalFrame = frames.find(fr => fr.name.toLowerCase().includes('normal')) || frames[0];
      setSelectedFrameId(normalFrame.id);
    }
    if (hardware.length > 0 && !selectedHardwareId) {
      // Default to Aldrop Single
      const aldrop = hardware.find(h => h.name.toLowerCase().includes('single')) || hardware[0];
      setSelectedHardwareId(aldrop.id);
    }
  }, [materials, finishes, frames, hardware]);

  // If a door was passed from the gallery, set material if matching
  useEffect(() => {
    if (preselectedDoor && materials.length > 0) {
      const match = materials.find(
        m => m.name.toLowerCase() === preselectedDoor.material?.toLowerCase()
      );
      if (match) {
        setSelectedMaterialId(match.id);
      }
    }
  }, [preselectedDoor, materials]);

  // Standard Presets
  const presets = [
    { label: '30 × 78 inch', w: 30, h: 78, desc: 'Bathroom / Utility' },
    { label: '32 × 78 inch', w: 32, h: 78, desc: 'Bedroom Standard' },
    { label: '34 × 78 inch', w: 34, h: 78, desc: 'Wide Bedroom' },
    { label: '36 × 78 inch', w: 36, h: 78, desc: 'Standard Main Entrance' },
    { label: 'Custom Size', w: 0, h: 0, desc: 'Enter exact opening' },
  ];

  const handlePresetSelect = (preset: typeof presets[0]) => {
    if (preset.label === 'Custom Size') {
      setSelectedPreset('custom');
    } else {
      setSelectedPreset(`${preset.w}x${preset.h}`);
      setWidthInch(preset.w);
      setHeightInch(preset.h);
    }
  };

  // Calculation Math
  const calculation: CalculationResult = useMemo(() => {
    const w = Math.max(12, Number(widthInch) || 36);
    const h = Math.max(24, Number(heightInch) || 78);
    const rawSqFt = (w * h) / 144;
    const sqFt = Math.round(rawSqFt * 100) / 100;

    // Material Cost
    const mat = materials.find(m => m.id === selectedMaterialId) || materials[0];
    const materialRate = mat ? mat.ratePerSqFt : 800;
    const materialName = mat ? mat.name : 'Sagwan';
    const materialCost = Math.round(sqFt * materialRate);

    // Polish Cost
    const fin = finishes.find(f => f.id === selectedFinishId) || finishes[0];
    const finishRate = fin ? fin.ratePerSqFt : 150;
    const finishName = fin ? fin.name : 'Teak Polish';
    const finishCost = Math.round(sqFt * finishRate);

    // Frame Cost
    const frm = frames.find(fr => fr.id === selectedFrameId) || frames[0];
    const frameCost = frm ? frm.price : 3500;
    const frameName = frm ? frm.name : 'Normal Frame';

    // Hardware Cost
    const hwd = hardware.find(h => h.id === selectedHardwareId) || hardware[0];
    const hardwarePrice = hwd ? hwd.price : 700;
    const hardwareName = hwd ? hwd.name : 'Single Aldrop';
    const qty = Math.max(0, Number(hardwareQty) || 1);
    const hardwareCost = hardwarePrice * qty;

    // Subtotal & Total
    const subtotal = materialCost + finishCost + frameCost + hardwareCost;
    const taxPercent = Number(settings.additionalChargePercentage) || 0;
    const additionalCharges = Math.round((subtotal * taxPercent) / 100);
    const total = subtotal + additionalCharges;

    return {
      widthInch: w,
      heightInch: h,
      sqFt,
      materialName,
      materialRate,
      materialCost,
      finishName,
      finishRate,
      finishCost,
      frameName,
      frameCost,
      hardwareName,
      hardwarePrice,
      hardwareQty: qty,
      hardwareCost,
      subtotal,
      additionalCharges,
      additionalChargeName: settings.additionalChargeName || 'Taxes',
      total,
    };
  }, [
    widthInch,
    heightInch,
    selectedMaterialId,
    selectedFinishId,
    selectedFrameId,
    selectedHardwareId,
    hardwareQty,
    materials,
    finishes,
    frames,
    hardware,
    settings,
  ]);

  // WhatsApp Message Formatter (Section 12)
  const prepareWhatsAppMessage = () => {
    return `Hello ${settings.businessName || 'Jai Hanuman Door'}, I am interested in this door.

Door Design: ${preselectedDoor ? preselectedDoor.name : 'Custom Door'}
Door Size: ${calculation.widthInch} × ${calculation.heightInch} inch (${calculation.sqFt.toFixed(2)})
Material: ${calculation.materialName} (₹${calculation.materialRate} = ₹${calculation.materialCost.toLocaleString('en-IN')})
Finish: ${calculation.finishName} (₹${calculation.finishRate} = ₹${calculation.finishCost.toLocaleString('en-IN')})
Frame: ${calculation.frameName} (₹${calculation.frameCost.toLocaleString('en-IN')})
Hardware: ${calculation.hardwareName} (Qty: ${calculation.hardwareQty} = ₹${calculation.hardwareCost.toLocaleString('en-IN')})
---
Estimated Total: ₹${calculation.total.toLocaleString('en-IN')}

Please provide more details.`;
  };

  const handleSendWhatsApp = () => {
    const text = prepareWhatsAppMessage();
    const url = getWhatsAppUrl(settings?.whatsappNumber, text);
    window.open(url, '_blank');
  };

  const handleShareQuote = async () => {
    const text = prepareWhatsAppMessage();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${settings?.businessName || 'Jai Hanuman Door'} Door Estimate`,
          text: text,
        });
      } catch {
        // User dismissed
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Quotation summary copied to clipboard!');
    }
  };

  const resetAll = () => {
    setWidthInch(36);
    setHeightInch(78);
    setSelectedPreset('36x78');
    if (materials[0]) setSelectedMaterialId(materials[0].id);
    if (finishes[0]) setSelectedFinishId(finishes[0].id);
    if (frames[0]) setSelectedFrameId(frames[0].id);
    if (hardware[0]) setSelectedHardwareId(hardware[0].id);
    setHardwareQty(1);
    setActiveStep(1);
    if (onClearPreselectedDoor) onClearPreselectedDoor();
  };

  const handleSaveCalculation = async () => {
    try {
      setSaveStatus('saving');
      setSaveMsg(null);
      await saveUserCalculation({
        input: {
          widthInch: calculation.widthInch,
          heightInch: calculation.heightInch,
          materialId: selectedMaterialId,
          finishId: selectedFinishId,
          frameId: selectedFrameId,
          hardwareId: selectedHardwareId,
          hardwareQty: hardwareQty,
        },
        result: calculation,
        doorId: preselectedDoor?.id,
        doorName: preselectedDoor?.name || `${calculation.materialName} Door`,
        doorImage: preselectedDoor?.images?.[0],
      });
      setSaveStatus('saved');
      setSaveMsg('Calculation saved to your saved estimates!');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMsg(err.message || 'Failed to save calculation');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <span className="text-amber-500 font-semibold text-xs sm:text-sm tracking-wider uppercase">
          Dynamic Price Estimator
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight mt-1">
          Door Price Calculator
        </h2>
        <p className="text-stone-600 text-sm sm:text-base mt-2">
          Calculate the exact cost of your door in real time based on dimensions, seasoned timber, polish quality, frame, and hardware.
        </p>

        {/* Selected Door Notification Banner */}
        {preselectedDoor && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-stone-800 flex items-center justify-between gap-3 text-xs sm:text-sm max-w-lg mx-auto">
            <div className="flex items-center gap-2 text-left">
              <img
                src={preselectedDoor.images?.[0] || ''}
                alt=""
                className="w-10 h-12 object-cover rounded bg-stone-200 flex-shrink-0"
              />
              <div>
                <div className="font-semibold text-stone-900 line-clamp-1">{preselectedDoor.name}</div>
                <div className="text-stone-500 text-[11px]">{preselectedDoor.category}</div>
              </div>
            </div>
            <button
              onClick={onClearPreselectedDoor}
              className="text-amber-800 hover:text-amber-950 text-xs font-semibold underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Loaded From History Banner */}
        {initialCalculationRecord && (
          <div className="mt-4 p-3 rounded-xl bg-amber-950/20 border border-amber-500/40 text-stone-800 flex items-center justify-between gap-3 text-xs sm:text-sm max-w-lg mx-auto">
            <div className="flex items-center gap-2 text-left">
              <History className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-semibold text-stone-900 line-clamp-1">
                  Loaded: {initialCalculationRecord.doorName || 'Saved Calculation'}
                </div>
                <div className="text-stone-500 text-[11px]">
                  {initialCalculationRecord.result.widthInch}" × {initialCalculationRecord.result.heightInch}" • {initialCalculationRecord.result.materialName}
                </div>
              </div>
            </div>
            {onClearInitialRecord && (
              <button
                onClick={onClearInitialRecord}
                className="text-amber-800 hover:text-amber-950 text-xs font-semibold underline"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Quick link to View Past Calculations */}
        {onOpenProfileHistory && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={onOpenProfileHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 text-xs font-medium border border-stone-200 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>View Past Saved Estimates</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Calculator Steps (Left 7 Cols) + Live Quotation Breakdown (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Interactive Steps Container */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STEP 1: Door Size */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  1
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-amber-600" />
                  Door Size & Dimensions
                </h3>
              </div>
              <span className="text-xs font-medium text-stone-500">
                Inches
              </span>
            </div>

            {/* Presets Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              {presets.map(p => {
                const isSelected =
                  p.label === 'Custom Size'
                    ? selectedPreset === 'custom'
                    : selectedPreset === `${p.w}x${p.h}`;
                return (
                  <button
                    key={p.label}
                    id={`preset-${p.label.replace(/[^a-zA-Z0-9]/g, '-')}`}
                    onClick={() => handlePresetSelect(p)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-stone-900 shadow-sm'
                        : 'bg-stone-50/60 border-stone-200 text-stone-700 hover:bg-stone-100/80'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm">{p.label}</div>
                    <div className="text-[10px] text-stone-500">{p.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Dimension Sliders & Number Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
              
              {/* Width */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
                  <span>Width (Inches)</span>
                  <span className="text-amber-700 font-mono text-sm font-bold">{widthInch}"</span>
                </div>
                <input
                  id="input-door-width"
                  type="number"
                  min={12}
                  max={96}
                  value={widthInch}
                  onChange={e => {
                    setWidthInch(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white font-mono text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                <input
                  type="range"
                  min={12}
                  max={96}
                  value={widthInch}
                  onChange={e => {
                    setWidthInch(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="w-full mt-2 accent-amber-600 cursor-pointer"
                />
              </div>

              {/* Height */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
                  <span>Height (Inches)</span>
                  <span className="text-amber-700 font-mono text-sm font-bold">{heightInch}"</span>
                </div>
                <input
                  id="input-door-height"
                  type="number"
                  min={24}
                  max={120}
                  value={heightInch}
                  onChange={e => {
                    setHeightInch(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white font-mono text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                <input
                  type="range"
                  min={24}
                  max={120}
                  value={heightInch}
                  onChange={e => {
                    setHeightInch(Number(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="w-full mt-2 accent-amber-600 cursor-pointer"
                />
              </div>

            </div>

            {/* Square Feet Result Box (Required in Section 4) */}
            <div className="mt-4 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-amber-900">
                  Calculated Door Area:
                </div>
                <div className="text-xs text-amber-800 font-mono mt-0.5">
                  ({widthInch}" × {heightInch}") ÷ 144
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
                  {calculation.sqFt.toFixed(2)}
                </span>
              </div>
            </div>

          </div>

          {/* STEP 2: Door Material (Section 5) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  2
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
                  <TreePine className="w-5 h-5 text-amber-600" />
                  Select Door Material
                </h3>
              </div>
              <span className="text-xs text-stone-500">Rate</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map(mat => {
                const isSelected = selectedMaterialId === mat.id;
                const cost = Math.round(calculation.sqFt * mat.ratePerSqFt);
                return (
                  <div
                    key={mat.id}
                    id={`material-${mat.id}`}
                    onClick={() => setSelectedMaterialId(mat.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-stone-900 shadow-sm'
                        : 'bg-white border-stone-200/90 text-stone-700 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm sm:text-base text-stone-900">{mat.name}</span>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-stone-100 text-amber-800">
                        ₹{mat.ratePerSqFt}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {mat.description}
                    </p>
                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                      <span>Area Cost:</span>
                      <span className="font-bold font-mono text-stone-900">
                        {calculation.sqFt.toFixed(2)} × ₹{mat.ratePerSqFt} = ₹{cost.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Polish / Finish (Section 6) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  3
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  Select Polish / Finish
                </h3>
              </div>
              <span className="text-xs text-stone-500">Rate</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {finishes.map(fin => {
                const isSelected = selectedFinishId === fin.id;
                const cost = Math.round(calculation.sqFt * fin.ratePerSqFt);
                return (
                  <div
                    key={fin.id}
                    id={`finish-${fin.id}`}
                    onClick={() => setSelectedFinishId(fin.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-stone-900 shadow-sm'
                        : 'bg-white border-stone-200/90 text-stone-700 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm sm:text-base text-stone-900">{fin.name}</span>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-stone-100 text-amber-800">
                        {fin.ratePerSqFt > 0 ? `₹${fin.ratePerSqFt}` : 'Included'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {fin.description}
                    </p>
                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                      <span>Finish Cost:</span>
                      <span className="font-bold font-mono text-stone-900">
                        {fin.ratePerSqFt > 0 ? `₹${cost.toLocaleString('en-IN')}` : '₹0'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 4: Chowkhat / Door Frame (Section 7) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  4
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
                  <FrameIcon className="w-5 h-5 text-amber-600" />
                  Chowkhat / Door Frame
                </h3>
              </div>
              <span className="text-xs text-stone-500">Fixed Unit Price</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {frames.map(frm => {
                const isSelected = selectedFrameId === frm.id;
                return (
                  <div
                    key={frm.id}
                    id={`frame-${frm.id}`}
                    onClick={() => setSelectedFrameId(frm.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-stone-900 shadow-sm'
                        : 'bg-white border-stone-200/90 text-stone-700 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm sm:text-base text-stone-900">{frm.name}</span>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-stone-100 text-amber-800">
                        {frm.price > 0 ? `₹${frm.price.toLocaleString('en-IN')}` : 'No Frame'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {frm.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 5: Hardware (Section 8) */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  5
                </span>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-600" />
                  Hardware & Fittings
                </h3>
              </div>
              <span className="text-xs text-stone-500">Aldrop / Lock / Latches</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {hardware.map(hwd => {
                const isSelected = selectedHardwareId === hwd.id;
                return (
                  <div
                    key={hwd.id}
                    id={`hardware-${hwd.id}`}
                    onClick={() => setSelectedHardwareId(hwd.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 text-stone-900 shadow-sm'
                        : 'bg-white border-stone-200/90 text-stone-700 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm sm:text-base text-stone-900">{hwd.name}</span>
                      <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-stone-100 text-amber-800">
                        {hwd.price > 0 ? `₹${hwd.price.toLocaleString('en-IN')}` : 'None'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {hwd.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Quantity Selector */}
            {selectedHardwareId && selectedHardwareId !== 'hwd-0' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-semibold text-stone-700">Hardware Quantity:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHardwareQty(Math.max(1, hardwareQty - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-stone-300 font-bold text-stone-700 hover:bg-stone-100 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-mono font-bold text-sm text-stone-900">
                    {hardwareQty}
                  </span>
                  <button
                    onClick={() => setHardwareQty(hardwareQty + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-stone-300 font-bold text-stone-700 hover:bg-stone-100 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right: Transparent Price Estimate Summary Card (Section 9 & 10) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          
          <div className="bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-2xl p-5 sm:p-6">
            
            {/* Header */}
            <div className="border-b border-stone-800 pb-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                  Transparent Breakdown
                </span>
                <button
                  onClick={resetAll}
                  className="text-stone-400 hover:text-stone-200 text-xs flex items-center gap-1"
                  title="Reset to defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mt-2">
                DOOR PRICE ESTIMATE
              </h3>
              
              <div className="mt-2 text-xs text-stone-300 space-y-0.5">
                <div>
                  <span className="text-stone-400">Door Size:</span>{' '}
                  <span className="font-bold text-amber-300 font-mono">
                    {calculation.widthInch} × {calculation.heightInch} inch
                  </span>
                </div>
                <div>
                  <span className="text-stone-400">Calculated Area:</span>{' '}
                  <span className="font-bold text-amber-300 font-mono">
                    {calculation.sqFt.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Transparent Line Items List (Section 9) */}
            <div className="space-y-3 text-xs sm:text-sm">
              
              {/* 1. Material */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-800/80">
                <div>
                  <div className="font-semibold text-stone-200">
                    Material: {calculation.materialName}
                  </div>
                  <div className="text-[11px] text-stone-400 font-mono">
                    {calculation.sqFt.toFixed(2)} × ₹{calculation.materialRate}
                  </div>
                </div>
                <div className="font-bold font-mono text-stone-100 text-sm">
                  ₹{calculation.materialCost.toLocaleString('en-IN')}
                </div>
              </div>

              {/* 2. Polish / Finish */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-800/80">
                <div>
                  <div className="font-semibold text-stone-200">
                    Finish: {calculation.finishName}
                  </div>
                  <div className="text-[11px] text-stone-400 font-mono">
                    {calculation.sqFt.toFixed(2)} × ₹{calculation.finishRate}
                  </div>
                </div>
                <div className="font-bold font-mono text-stone-100 text-sm">
                  ₹{calculation.finishCost.toLocaleString('en-IN')}
                </div>
              </div>

              {/* 3. Frame */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-800/80">
                <div>
                  <div className="font-semibold text-stone-200">
                    Frame: {calculation.frameName}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {calculation.frameCost > 0 ? 'Full Timber Chaukhat' : 'Shutter only'}
                  </div>
                </div>
                <div className="font-bold font-mono text-stone-100 text-sm">
                  ₹{calculation.frameCost.toLocaleString('en-IN')}
                </div>
              </div>

              {/* 4. Hardware */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-800/80">
                <div>
                  <div className="font-semibold text-stone-200">
                    Hardware: {calculation.hardwareName}
                  </div>
                  <div className="text-[11px] text-stone-400 font-mono">
                    Qty: {calculation.hardwareQty} × ₹{calculation.hardwarePrice}
                  </div>
                </div>
                <div className="font-bold font-mono text-stone-100 text-sm">
                  ₹{calculation.hardwareCost.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Additional charges if configured in DB */}
              {calculation.additionalCharges > 0 && (
                <div className="flex items-center justify-between pb-2 border-b border-stone-800/80">
                  <div className="text-stone-300">
                    {calculation.additionalChargeName}
                  </div>
                  <div className="font-bold font-mono text-stone-100">
                    ₹{calculation.additionalCharges.toLocaleString('en-IN')}
                  </div>
                </div>
              )}

            </div>

            {/* Estimated Total Block */}
            <div className="mt-5 p-4 rounded-xl bg-stone-950 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-400/90 uppercase font-semibold tracking-wider">
                  Estimated Total
                </span>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  Direct Factory Price
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
                  ₹{calculation.total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Required Disclaimer (Section 10) */}
            <p className="text-[11px] text-stone-400 mt-4 leading-relaxed bg-stone-800/40 p-3 rounded-lg border border-stone-800">
              <Info className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
              {settings.disclaimer || 'Price shown is an estimated price and may vary according to final design, material quality, hardware and customization.'}
            </p>

            {/* Action Buttons (Section 10) */}
            <div className="mt-5 space-y-2.5">
              {/* Generate Official Quotation */}
              <button
                id="btn-generate-quote-modal"
                onClick={() => onOpenQuotationModal(calculation, preselectedDoor)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 transition-all active:scale-[0.98]"
              >
                <FileText className="w-4 h-4" />
                Generate / Download Quotation
              </button>

              {/* Save to History Button */}
              <button
                id="btn-save-calculation"
                onClick={handleSaveCalculation}
                disabled={saveStatus === 'saving'}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-amber-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-stone-700 transition-colors active:scale-[0.98]"
              >
                <BookmarkPlus className="w-4 h-4 text-amber-400" />
                {saveStatus === 'saving'
                  ? 'Saving to Account...'
                  : saveStatus === 'saved'
                  ? '✓ Saved to Account'
                  : 'Save Calculation to History'}
              </button>

              {saveMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
                    saveStatus === 'saved'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {saveStatus === 'saved' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span>{saveMsg}</span>
                  </div>
                  {saveStatus === 'saved' && onOpenProfileHistory && (
                    <button
                      onClick={onOpenProfileHistory}
                      className="underline font-semibold hover:text-emerald-200"
                    >
                      View
                    </button>
                  )}
                </div>
              )}

              {/* Direct WhatsApp Action (Section 12) */}
              <button
                id="btn-whatsapp-quote"
                onClick={handleSendWhatsApp}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700/90 hover:bg-emerald-600 text-emerald-100 font-semibold text-sm flex items-center justify-center gap-2 border border-emerald-500/30 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-300" />
                Send on WhatsApp
              </button>

              {/* Share Quote */}
              <button
                id="btn-share-quote"
                onClick={handleShareQuote}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium text-xs flex items-center justify-center gap-2 border border-stone-700 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share Quote
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
