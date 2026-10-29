import React, { useState, useEffect, useMemo } from 'react';
import {
  TreePine,
  Ruler,
  Maximize2,
  Sparkles,
  Download,
  MessageCircle,
  RotateCcw,
  PlusCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Calculator,
  Eye,
  Info,
  Check,
  Award,
} from 'lucide-react';
import { AdMobBannerSlot } from './admob/AdMobBannerSlot.tsx';
import {
  ChaukhatWoodType,
  ChaukhatSectionSize,
  ChaukhatDimensionPreset,
  ChaukhatDesignCard,
  ChaukhatProduct,
  ChaukhatCalculationResult,
  BusinessSettings,
  CalculationResult,
  Door,
} from '../types.ts';
import {
  DEFAULT_CHAUKHAT_WOOD_TYPES,
  DEFAULT_CHAUKHAT_SECTION_SIZES,
  DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
  DEFAULT_CHAUKHAT_DESIGNS,
  DEFAULT_CHAUKHAT_PRODUCT,
} from '../data/chaukhatDefaults.ts';
import { fetchChaukhatConfig, resolveImageUrl } from '../lib/api.ts';
import { generateChaukhatQuotationPDF, generateCombinedQuotationPDF } from '../lib/pdfGenerator.ts';
import { getWhatsAppUrl, formatWhatsAppDisplay } from '../lib/contactUtils.ts';

interface ChaukhatCalculatorProps {
  settings: BusinessSettings;
  activeDoorCalculation?: CalculationResult | null;
  activeDoor?: Door | null;
  onSwitchToDoorCalculator: () => void;
  onUpdateCombinedChaukhat?: (result: ChaukhatCalculationResult | null) => void;
}

export const ChaukhatCalculator: React.FC<ChaukhatCalculatorProps> = ({
  settings,
  activeDoorCalculation,
  activeDoor,
  onSwitchToDoorCalculator,
  onUpdateCombinedChaukhat,
}) => {
  // Configuration data loaded from backend (or fallback defaults)
  const [woodTypes, setWoodTypes] = useState<ChaukhatWoodType[]>(DEFAULT_CHAUKHAT_WOOD_TYPES);
  const [sectionSizes, setSectionSizes] = useState<ChaukhatSectionSize[]>(DEFAULT_CHAUKHAT_SECTION_SIZES);
  const [dimensionPresets, setDimensionPresets] = useState<ChaukhatDimensionPreset[]>(DEFAULT_CHAUKHAT_DIMENSION_PRESETS);
  const [products, setProducts] = useState<ChaukhatProduct[]>([DEFAULT_CHAUKHAT_PRODUCT]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Customer Selections
  const [selectedWoodId, setSelectedWoodId] = useState<string>('wood-sagwan');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('sec-5x4');
  const [customWidthInch, setCustomWidthInch] = useState<number>(5);
  const [customDepthInch, setCustomDepthInch] = useState<number>(4);

  // Overall Frame Dimensions
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset-7x4');
  const [frameHeightFt, setFrameHeightFt] = useState<number>(7);
  const [frameWidthFt, setFrameWidthFt] = useState<number>(4);
  const [isCustomDimensions, setIsCustomDimensions] = useState<boolean>(false);

  // Design Choice: 'plain' | 'diamond' | 'hand_carved'
  const [selectedDesignId, setSelectedDesignId] = useState<'plain' | 'diamond' | 'hand_carved'>('plain');

  // Preview & Modal States
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [showQuotationModal, setShowQuotationModal] = useState<boolean>(false);
  const [addedToCombined, setAddedToCombined] = useState<boolean>(false);
  const [showCombinedModal, setShowCombinedModal] = useState<boolean>(false);

  // Load backend configuration
  useEffect(() => {
    let isMounted = true;
    fetchChaukhatConfig()
      .then(res => {
        if (isMounted) {
          if (res.woodTypes?.length) setWoodTypes(res.woodTypes.filter(w => w.active));
          if (res.sectionSizes?.length) setSectionSizes(res.sectionSizes.filter(s => s.active));
          if (res.dimensionPresets?.length) setDimensionPresets(res.dimensionPresets.filter(p => p.active));
          if (res.products?.length) setProducts(res.products.filter(p => p.active));
          setLoadingConfig(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoadingConfig(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Preset Selection
  const handleSelectPreset = (preset: ChaukhatDimensionPreset) => {
    setSelectedPresetId(preset.id);
    setIsCustomDimensions(false);
    setFrameHeightFt(preset.heightFt);
    setFrameWidthFt(preset.widthFt);
  };

  const handleSelectCustomDimensions = () => {
    setSelectedPresetId('custom');
    setIsCustomDimensions(true);
  };

  // Active Product
  const activeProduct = products[0] || DEFAULT_CHAUKHAT_PRODUCT;

  // Active Selected Wood
  const selectedWood = useMemo(() => {
    return woodTypes.find(w => w.id === selectedWoodId) || woodTypes[0] || DEFAULT_CHAUKHAT_WOOD_TYPES[0];
  }, [woodTypes, selectedWoodId]);

  // Active Section Dimensions
  const activeSection = useMemo(() => {
    if (selectedSectionId === 'custom') {
      return {
        id: 'custom',
        name: `${customWidthInch}" × ${customDepthInch}" (Custom Wood Section)`,
        widthInch: customWidthInch,
        depthInch: customDepthInch,
      };
    }
    const found = sectionSizes.find(s => s.id === selectedSectionId) || sectionSizes[0] || DEFAULT_CHAUKHAT_SECTION_SIZES[0];
    return {
      id: found.id,
      name: found.name,
      widthInch: found.widthInch,
      depthInch: found.depthInch,
    };
  }, [selectedSectionId, customWidthInch, customDepthInch, sectionSizes]);

  // Calculate Running Length & Cubic Feet
  // Running length = 2 × height + width (measured along frame's outside perimeter)
  const runningLengthFt = useMemo(() => {
    return Math.round((2 * frameHeightFt + frameWidthFt) * 10) / 10;
  }, [frameHeightFt, frameWidthFt]);

  const cubicFeet = useMemo(() => {
    const cf = runningLengthFt * ((activeSection.widthInch * activeSection.depthInch) / 144);
    return Math.round(cf * 100) / 100;
  }, [runningLengthFt, activeSection]);

  // Calculate Price for any design option
  const computePriceForDesign = (designId: 'plain' | 'diamond' | 'hand_carved') => {
    const pricingMethod = activeProduct.pricingMethod || 'running_foot';
    let materialCost = 0;
    let carvingCharge = 0;

    const baseRatePerRft = selectedWood.baseRatePerRft || activeProduct.baseMaterialRate || 450;
    const baseRatePerCuFt = selectedWood.baseRatePerCuFt || 3600;

    // Cross-sectional factor (baseline is standard 5" × 4" = 20 sq.in)
    const standardSectionArea = 20;
    const currentSectionArea = activeSection.widthInch * activeSection.depthInch;
    const sectionFactor = currentSectionArea / standardSectionArea;

    if (pricingMethod === 'running_foot') {
      const adjustedRate = Math.round(baseRatePerRft * Math.max(0.7, Math.min(2.5, sectionFactor)));
      materialCost = Math.round(runningLengthFt * adjustedRate);

      if (designId === 'diamond') {
        const rate = activeProduct.diamondCarvingCharge || 120;
        carvingCharge = Math.round(runningLengthFt * rate);
      } else if (designId === 'hand_carved') {
        const rate = activeProduct.handCarvedCharge || 280;
        carvingCharge = Math.round(runningLengthFt * rate);
      } else {
        carvingCharge = activeProduct.plainCarvingCharge || 0;
      }
    } else if (pricingMethod === 'cubic_foot') {
      materialCost = Math.round(cubicFeet * baseRatePerCuFt);
      if (designId === 'diamond') {
        carvingCharge = Math.round(runningLengthFt * (activeProduct.diamondCarvingCharge || 120));
      } else if (designId === 'hand_carved') {
        carvingCharge = Math.round(runningLengthFt * (activeProduct.handCarvedCharge || 280));
      } else {
        carvingCharge = 0;
      }
    } else {
      // Fixed price
      materialCost = activeProduct.fixedPrice || 8500;
      if (designId === 'diamond') {
        carvingCharge = activeProduct.diamondCarvingCharge || 1800;
      } else if (designId === 'hand_carved') {
        carvingCharge = activeProduct.handCarvedCharge || 3500;
      } else {
        carvingCharge = 0;
      }
    }

    const subtotal = materialCost + carvingCharge;
    const taxPercent = Number(settings?.additionalChargePercentage) || 0;
    const additionalCharges = Math.round((subtotal * taxPercent) / 100);
    const total = subtotal + additionalCharges;

    return {
      materialCost,
      carvingCharge,
      subtotal,
      additionalCharges,
      total,
    };
  };

  // Full calculation result for currently selected design
  const calculationResult: ChaukhatCalculationResult = useMemo(() => {
    const priceData = computePriceForDesign(selectedDesignId);
    const designCard = DEFAULT_CHAUKHAT_DESIGNS.find(d => d.id === selectedDesignId) || DEFAULT_CHAUKHAT_DESIGNS[0];

    const designImage = selectedDesignId === 'diamond'
      ? (activeProduct.diamondImage || designCard.image)
      : selectedDesignId === 'hand_carved'
      ? (activeProduct.handCarvedImage || designCard.image)
      : (activeProduct.plainImage || designCard.image);

    return {
      id: `chk-calc-${Date.now()}`,
      woodType: selectedWood.name,
      woodRatePerRft: selectedWood.baseRatePerRft,
      sectionSizeName: activeSection.name,
      sectionWidthInch: activeSection.widthInch,
      sectionDepthInch: activeSection.depthInch,
      isCustomSection: selectedSectionId === 'custom',
      heightFt: frameHeightFt,
      widthFt: frameWidthFt,
      heightInch: Math.round(frameHeightFt * 12),
      widthInch: Math.round(frameWidthFt * 12),
      isCustomDimensions,
      runningLengthFt,
      cubicFeet,
      selectedDesignId,
      selectedDesignName: designCard.name,
      selectedDesignImage: designImage,
      pricingMethod: activeProduct.pricingMethod || 'running_foot',
      materialCost: priceData.materialCost,
      designCarvingCharge: priceData.carvingCharge,
      subtotal: priceData.subtotal,
      additionalCharges: priceData.additionalCharges,
      totalPrice: priceData.total,
      currency: 'INR',
      isEstimate: true,
      timestamp: new Date().toISOString(),
    };
  }, [
    selectedDesignId,
    selectedWood,
    activeSection,
    frameHeightFt,
    frameWidthFt,
    isCustomDimensions,
    runningLengthFt,
    cubicFeet,
    activeProduct,
    settings,
  ]);

  // Keep parent combined quotation updated if customer opted into combined quotation
  useEffect(() => {
    if (addedToCombined && onUpdateCombinedChaukhat) {
      onUpdateCombinedChaukhat(calculationResult);
    }
  }, [calculationResult, addedToCombined, onUpdateCombinedChaukhat]);

  // Combined Quotation Math
  const combinedQuotation = useMemo(() => {
    const doorCost = activeDoorCalculation?.total || 0;
    const chaukhatCost = calculationResult.totalPrice || 0;
    const combinedSubtotal = (activeDoorCalculation?.subtotal || 0) + calculationResult.subtotal;
    const additionalCharges = (activeDoorCalculation?.additionalCharges || 0) + calculationResult.additionalCharges;
    const combinedTotal = doorCost + chaukhatCost;

    return {
      doorCalculation: activeDoorCalculation,
      chaukhatCalculation: calculationResult,
      doorCost,
      chaukhatCost,
      combinedSubtotal,
      additionalCharges,
      combinedTotal,
      timestamp: new Date().toISOString(),
    };
  }, [activeDoorCalculation, calculationResult]);

  // Reset Selections
  const handleResetSelection = () => {
    setSelectedWoodId('wood-sagwan');
    setSelectedSectionId('sec-5x4');
    setCustomWidthInch(5);
    setCustomDepthInch(4);
    setSelectedPresetId('preset-7x4');
    setFrameHeightFt(7);
    setFrameWidthFt(4);
    setIsCustomDimensions(false);
    setSelectedDesignId('plain');
    setAddedToCombined(false);
    if (onUpdateCombinedChaukhat) {
      onUpdateCombinedChaukhat(null);
    }
  };

  // WhatsApp Enquiry Trigger
  const handleWhatsAppEnquiry = () => {
    const phone = settings.whatsappNumber || '7887412884';
    const lines = [
      `*New Chaukhat (Door Frame) Enquiry — Jai Hanuman Door*`,
      ``,
      `• *Selected Design:* ${calculationResult.selectedDesignName}`,
      `• *Timber Wood:* ${calculationResult.woodType}`,
      `• *Section Size (Cross-section):* ${calculationResult.sectionSizeName}`,
      `• *Overall Frame Opening:* ${calculationResult.heightFt} ft × ${calculationResult.widthFt} ft (${calculationResult.heightInch}" × ${calculationResult.widthInch}")`,
      `• *Running Length (2H + W):* ${calculationResult.runningLengthFt} Running Feet`,
      `• *Wood Timber Material Cost:* ₹${calculationResult.materialCost.toLocaleString('en-IN')}`,
      `• *Carving / Design Charge:* ₹${calculationResult.designCarvingCharge.toLocaleString('en-IN')}`,
      `• *Estimated Total Price:* ₹${calculationResult.totalPrice.toLocaleString('en-IN')}`,
      ``,
      addedToCombined && activeDoorCalculation
        ? `*Included in Combined Quotation:* Door (${activeDoorCalculation.doorName}) + Chaukhat = ₹${combinedQuotation.combinedTotal.toLocaleString('en-IN')}`
        : `*Pricing Basis:* Length-based calculation (estimate subject to site measurements)`,
      ``,
      `Please confirm timber availability and dispatch schedule.`,
    ];

    const url = getWhatsAppUrl(phone, lines.join('\n'));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Combined WhatsApp Enquiry
  const handleCombinedWhatsAppEnquiry = () => {
    const phone = settings.whatsappNumber || '7887412884';
    const lines = [
      `*Complete Door + Chaukhat Combined Quotation Enquiry — Jai Hanuman Door*`,
      ``,
      `1️⃣ *Door Shutter Details:*`,
      `• Design: ${activeDoorCalculation?.doorName || 'Selected Design'}`,
      `• Wood: ${activeDoorCalculation?.materialName}`,
      `• Dimensions: ${activeDoorCalculation?.widthInch}" × ${activeDoorCalculation?.heightInch}" (${activeDoorCalculation?.sqFt.toFixed(2)} sq.ft)`,
      `• Door Price: ₹${(activeDoorCalculation?.total || 0).toLocaleString('en-IN')}`,
      ``,
      `2️⃣ *Chaukhat (Door Frame) Details:*`,
      `• Design: ${calculationResult.selectedDesignName}`,
      `• Wood: ${calculationResult.woodType}`,
      `• Section Profile: ${calculationResult.sectionSizeName}`,
      `• Frame Size: ${calculationResult.heightFt} ft × ${calculationResult.widthFt} ft (${calculationResult.runningLengthFt} Rft)`,
      `• Chaukhat Price: ₹${calculationResult.totalPrice.toLocaleString('en-IN')}`,
      ``,
      `💰 *COMBINED TOTAL:* ₹${combinedQuotation.combinedTotal.toLocaleString('en-IN')}`,
      `*(Zero double counting — each component itemized exactly once)*`,
      ``,
      `Please provide formal workshop confirmation and production timeline.`,
    ];

    const url = getWhatsAppUrl(phone, lines.join('\n'));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] pb-24">
      {/* Top Breadcrumb & Dual Quotation Switcher */}
      <div className="bg-[#1A1A1A] text-white border-b border-[#2D2D2D] sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#A0700B] font-bold uppercase tracking-wider">Independent Calculators</span>
              <span className="text-[#666666]">/</span>
              <span className="font-semibold text-stone-200">Option B: Chaukhat (Door Frame) Price Calculator</span>
            </div>

            {/* Independent Quotation Option Switcher */}
            <div className="flex items-center bg-[#262626] p-1 rounded-xl border border-[#3A3A3A] text-xs">
              <button
                type="button"
                onClick={onSwitchToDoorCalculator}
                className="px-3.5 py-1.5 rounded-lg text-stone-400 hover:text-white transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-[#C89211]" />
                <span>Option A: Door Calculator</span>
              </button>

              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg bg-[#C89211] text-white font-bold shadow-sm flex items-center gap-1.5 cursor-default"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Option B: Chaukhat Calculator</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Combined Quotation Notice Banner if Door is Active */}
      {activeDoorCalculation && (
        <div className="bg-gradient-to-r from-amber-900/90 via-stone-900 to-amber-950 text-white border-b border-amber-500/30 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="bg-[#C89211] text-white px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                Door Shutter Active
              </span>
              <span>
                Calculated Door: <strong>{activeDoorCalculation.doorName || 'Door'}</strong> (₹{activeDoorCalculation.total.toLocaleString('en-IN')}).
                Selecting Chaukhat will <strong>NOT</strong> add to door price unless you choose Combined Quotation.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAddedToCombined(true);
                setShowCombinedModal(true);
              }}
              className="text-[#E6B33A] hover:underline font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>View Combined Door + Chaukhat Quote</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative bg-[#1A1A1A] text-white pt-8 pb-12 overflow-hidden border-b border-[#2A2A2A]">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C89211_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C89211]/20 border border-[#C89211]/30 text-[#E6B33A] text-xs font-semibold mb-3">
              <TreePine className="w-3.5 h-3.5" />
              <span>Independent Wood Frame Quotation System</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-3">
              Chaukhat (Door Frame) Price Calculator
            </h1>
            <p className="text-sm sm:text-base text-stone-300 leading-relaxed">
              Calculate the exact workshop price for seasoned solid timber Chaukhats. Configure wood species, cross-sectional dimensions, frame opening size, and artisan carving designs with transparent length-based pricing.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT 7 COLS: STEP-BY-STEP CUSTOMER CONFIGURATION */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* STEP 1: SELECT WOOD TYPE */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#C89211] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    1
                  </span>
                  <div>
                    <h2 className="font-bold text-base text-stone-900">Select Wood Type</h2>
                    <p className="text-xs text-stone-500">Choose kiln-seasoned timber for frame durability and strength</p>
                  </div>
                </div>
                <span className="text-xs text-[#C89211] font-bold">
                  {selectedWood.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {woodTypes.map(wood => {
                  const isSelected = selectedWoodId === wood.id;
                  return (
                    <button
                      key={wood.id}
                      type="button"
                      onClick={() => setSelectedWoodId(wood.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#C89211] bg-amber-50/40 ring-2 ring-[#C89211]/20 shadow-sm'
                          : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-stone-900">{wood.name}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[#C89211]" />
                          )}
                        </div>
                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {wood.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-stone-400">Base Timber Rate</span>
                        <span className="font-mono font-bold text-stone-900">
                          ₹{wood.baseRatePerRft} / Rft
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: SELECT CHAUKHAT WOOD SECTION SIZE (CROSS-SECTION) */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#C89211] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    2
                  </span>
                  <div>
                    <h2 className="font-bold text-base text-stone-900">Select Wood Section Size (Cross-Section)</h2>
                    <p className="text-xs text-stone-500">Thickness & depth of the solid timber jamb (Width × Depth in inches)</p>
                  </div>
                </div>
                <span className="text-xs text-[#C89211] font-bold">
                  {activeSection.widthInch}" × {activeSection.depthInch}"
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {sectionSizes.map(sec => {
                  const isSelected = selectedSectionId === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-[#C89211] bg-amber-50/40 ring-2 ring-[#C89211]/20 shadow-sm'
                          : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-stone-900">{sec.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C89211]" />}
                      </div>
                      <p className="text-xs text-stone-500">{sec.description || 'Precision planed timber section'}</p>
                      {sec.isPopular && (
                        <span className="inline-block mt-2 text-[10px] font-bold bg-[#C89211]/15 text-[#A0700B] px-2 py-0.5 rounded">
                          Recommended Choice
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Custom Section Card */}
                <button
                  type="button"
                  onClick={() => setSelectedSectionId('custom')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedSectionId === 'custom'
                      ? 'border-[#C89211] bg-amber-50/40 ring-2 ring-[#C89211]/20 shadow-sm'
                      : 'border-dashed border-stone-300 hover:border-stone-400 bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-stone-900">Custom Section Size</span>
                    {selectedSectionId === 'custom' && <CheckCircle2 className="w-4 h-4 text-[#C89211]" />}
                  </div>
                  <p className="text-xs text-stone-500">Enter custom width & thickness for non-standard wall openings</p>
                </button>
              </div>

              {/* Custom Cross-Section Input Fields */}
              {selectedSectionId === 'custom' && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800">
                    <Ruler className="w-3.5 h-3.5 text-[#C89211]" />
                    <span>Enter Custom Timber Section Dimensions</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">
                        Width (Face Width in inches)
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        step="0.5"
                        value={customWidthInch}
                        onChange={e => setCustomWidthInch(Math.max(2, Number(e.target.value) || 5))}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-stone-300 text-stone-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-600 mb-1 font-medium">
                        Depth (Wall Thickness in inches)
                      </label>
                      <input
                        type="number"
                        min="1.5"
                        max="12"
                        step="0.5"
                        value={customDepthInch}
                        onChange={e => setCustomDepthInch(Math.max(1.5, Number(e.target.value) || 4))}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-stone-300 text-stone-900 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 3: SELECT OVERALL CHAUKHAT SIZE (FRAME OPENING) */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#C89211] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    3
                  </span>
                  <div>
                    <h2 className="font-bold text-base text-stone-900">Select Overall Chaukhat Size (Frame Opening)</h2>
                    <p className="text-xs text-stone-500">
                      Overall outer height and width along the perimeter (distinct from timber cross-section)
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#C89211] font-bold">
                  {frameHeightFt} ft × {frameWidthFt} ft ({calculationResult.runningLengthFt} Rft)
                </span>
              </div>

              {/* Distinction Clarification Callout */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 mb-4 flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-[#C89211] shrink-0 mt-0.5" />
                <p>
                  <strong>Perimeter vs Section:</strong> Frame opening dimensions (e.g. 7 ft × 4 ft) determine total running feet <code>(2 × Height + Width = {calculationResult.runningLengthFt} Rft)</code>. Wood cross-section (e.g. {activeSection.name}) determines the solid volume of timber per running foot.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                {dimensionPresets.map(preset => {
                  const isSelected = !isCustomDimensions && selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#C89211] bg-amber-50/60 ring-2 ring-[#C89211]/20 font-bold text-stone-900 shadow-sm'
                          : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <div className="text-sm font-bold">{preset.label}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">{preset.heightFt * 12}" × {preset.widthFt * 12}"</div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleSelectCustomDimensions}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    isCustomDimensions
                      ? 'border-[#C89211] bg-amber-50/60 ring-2 ring-[#C89211]/20 font-bold text-stone-900 shadow-sm'
                      : 'border-dashed border-stone-300 hover:border-stone-400 bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="text-sm font-bold">Custom Size</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Any Height & Width</div>
                </button>
              </div>

              {/* Custom Height & Width Slider / Inputs */}
              {isCustomDimensions && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="flex justify-between items-center mb-1.5 font-medium text-stone-700">
                        <span>Height (Feet):</span>
                        <span className="font-mono font-bold text-[#C89211] text-sm">
                          {frameHeightFt} ft ({Math.round(frameHeightFt * 12)}")
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="12"
                        step="0.5"
                        value={frameHeightFt}
                        onChange={e => setFrameHeightFt(Number(e.target.value))}
                        className="w-full accent-[#C89211]"
                      />
                      <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                        <span>5 ft</span>
                        <span>7 ft (Standard)</span>
                        <span>8.5 ft</span>
                        <span>12 ft</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5 font-medium text-stone-700">
                        <span>Width (Feet):</span>
                        <span className="font-mono font-bold text-[#C89211] text-sm">
                          {frameWidthFt} ft ({Math.round(frameWidthFt * 12)}")
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="8"
                        step="0.25"
                        value={frameWidthFt}
                        onChange={e => setFrameWidthFt(Number(e.target.value))}
                        className="w-full accent-[#C89211]"
                      />
                      <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                        <span>2 ft</span>
                        <span>3.5 ft</span>
                        <span>4 ft (Standard)</span>
                        <span>8 ft (Double)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 4: SELECT CHAUKHAT DESIGN CARDS WITH ACTUAL IMAGES */}
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#C89211] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                    4
                  </span>
                  <div>
                    <h2 className="font-bold text-base text-stone-900">Select Chaukhat Design</h2>
                    <p className="text-xs text-stone-500">
                      Plain wooden frame or artisan carved designer detailing with actual workshop photos
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DEFAULT_CHAUKHAT_DESIGNS.map(design => {
                  const isSelected = selectedDesignId === design.id;
                  const priceQuote = computePriceForDesign(design.id);
                  const rawImg = design.id === 'diamond'
                    ? (activeProduct.diamondImage || design.image)
                    : design.id === 'hand_carved'
                    ? (activeProduct.handCarvedImage || design.image)
                    : (activeProduct.plainImage || design.image);
                  const displayImg = resolveImageUrl(rawImg);

                  return (
                    <div
                      key={design.id}
                      onClick={() => setSelectedDesignId(design.id)}
                      className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'border-[#C89211] bg-amber-50/20 ring-2 ring-[#C89211]/30 shadow-md'
                          : 'border-stone-200 hover:border-stone-300 bg-white hover:shadow-sm'
                      }`}
                    >
                      <div>
                        {/* Design Image Card with Zoom */}
                        <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                          <img
                            src={displayImg}
                            alt={design.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(displayImg);
                            }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white text-xs backdrop-blur-sm transition-opacity"
                            title="Zoom Image"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {isSelected && (
                            <div className="absolute top-2 left-2 bg-[#C89211] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Selected</span>
                            </div>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div className="p-4 space-y-1.5">
                          <h3 className="font-bold text-sm text-stone-900 group-hover:text-[#A0700B] transition-colors">
                            {design.name}
                          </h3>
                          <p className="text-[11px] text-[#A0700B] font-semibold">
                            {design.tagline}
                          </p>
                          <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                            {design.description}
                          </p>
                        </div>
                      </div>

                      {/* Design Price Footer */}
                      <div className="p-4 pt-3 border-t border-stone-100 bg-stone-50/60 mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500">Calculated Estimate</span>
                          <span className="font-mono font-bold text-sm text-stone-900">
                            ₹{priceQuote.total.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400 text-right mt-0.5">
                          {design.id === 'plain'
                            ? 'Shutter rebate profile included'
                            : design.id === 'diamond'
                            ? `+₹${activeProduct.diamondCarvingCharge || 120}/Rft carving`
                            : `+₹${activeProduct.handCarvedCharge || 280}/Rft hand-carving`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT 5 COLS: STEP 5 — SHOW PRICE BREAKDOWN & ACTION DOCK */}
          <div className="lg:col-span-5 sticky top-28 space-y-4">
            
            {/* PRICE BREAKDOWN CARD */}
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-lg p-6 space-y-5">
              <div className="border-b border-stone-100 pb-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 mb-2">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Kiln-Seasoned Solid Wood Frame</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-stone-900">
                  Chaukhat Price Breakdown
                </h3>
                <p className="text-xs text-stone-500">
                  Instant length-based workshop estimate with zero double counting
                </p>
              </div>

              {/* Specifications Snapshot */}
              <div className="space-y-2 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200/60">
                <div className="flex justify-between py-1 border-b border-stone-200/50">
                  <span className="text-stone-500">Wood Timber:</span>
                  <span className="font-semibold text-stone-900">{calculationResult.woodType}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-200/50">
                  <span className="text-stone-500">Section Dimensions:</span>
                  <span className="font-semibold text-stone-900">{calculationResult.sectionSizeName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-200/50">
                  <span className="text-stone-500">Overall Frame Opening:</span>
                  <span className="font-semibold text-stone-900">
                    {calculationResult.heightFt} ft × {calculationResult.widthFt} ft ({calculationResult.heightInch}" × {calculationResult.widthInch}")
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-stone-200/50">
                  <span className="text-stone-500">Selected Design:</span>
                  <span className="font-semibold text-[#A0700B]">{calculationResult.selectedDesignName}</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-stone-500">Total Running Length (2H + W):</span>
                  <span className="font-mono font-bold text-stone-900">
                    {calculationResult.runningLengthFt} Running Feet
                  </span>
                </div>
              </div>

              {/* Itemized Cost Lines */}
              <div className="space-y-2.5 text-xs pt-1">
                <div className="flex justify-between items-center text-stone-700">
                  <div>
                    <span className="font-medium">Solid Timber Material Cost</span>
                    <span className="text-[10px] text-stone-400 block font-normal">
                      {calculationResult.runningLengthFt} Rft seasoned {calculationResult.woodType}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-stone-900 text-sm">
                    ₹{calculationResult.materialCost.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-stone-700">
                  <div>
                    <span className="font-medium">Design / Carving Craftsmanship</span>
                    <span className="text-[10px] text-stone-400 block font-normal">
                      {calculationResult.selectedDesignId === 'plain'
                        ? 'Standard clean rebate profile (Included)'
                        : `${calculationResult.selectedDesignName} detailing`}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-stone-900 text-sm">
                    {calculationResult.designCarvingCharge > 0
                      ? `₹${calculationResult.designCarvingCharge.toLocaleString('en-IN')}`
                      : <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-sans">Included (₹0)</span>}
                  </span>
                </div>

                {calculationResult.additionalCharges > 0 && (
                  <div className="flex justify-between items-center text-stone-700">
                    <span className="font-medium">{settings?.additionalChargeName || 'Taxes & Levies'}</span>
                    <span className="font-mono font-bold text-stone-900">
                      ₹{calculationResult.additionalCharges.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Final Estimated Total Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 to-[#2A2318] text-white space-y-1 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-stone-300 uppercase tracking-wider font-semibold">
                    Estimated Chaukhat Price
                  </span>
                  <span className="text-[10px] bg-[#C89211] text-white px-2 py-0.5 rounded font-bold uppercase">
                    Workshop Direct
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div className="font-mono text-3xl font-bold text-white tracking-tight">
                    ₹{calculationResult.totalPrice.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-stone-400 font-sans">
                    GST & Seasoning Included
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/80 pt-1 italic">
                  * Price shown is an estimate. Masonry site measurements and wall plaster variations may modify final running length.
                </p>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Get Chaukhat Quotation PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppEnquiry}
                  className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enquire on WhatsApp</span>
                </button>

                {/* Add Chaukhat to Combined Quotation Button */}
                <button
                  type="button"
                  onClick={() => {
                    setAddedToCombined(true);
                    if (onUpdateCombinedChaukhat) {
                      onUpdateCombinedChaukhat(calculationResult);
                    }
                    setShowCombinedModal(true);
                  }}
                  className={`w-full py-3 px-4 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    addedToCombined
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-stone-800 bg-white hover:bg-stone-50 text-stone-900'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-[#C89211]" />
                  <span>{addedToCombined ? '✓ Chaukhat Added to Combined Quotation' : 'Add Chaukhat to Combined Quotation'}</span>
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleResetSelection}
                    className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Selection</span>
                  </button>

                  <button
                    type="button"
                    onClick={onSwitchToDoorCalculator}
                    className="text-xs text-[#C89211] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Calculate Door Only →</span>
                  </button>
                </div>
              </div>

            </div>

            {/* CRAFTSMANSHIP GUARANTEE BADGE */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-center gap-3">
              <Award className="w-8 h-8 text-[#C89211] shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-stone-900 block">Seasoned Timber Guarantee</span>
                <span className="text-stone-600">
                  Every Chaukhat is kiln-dried to 8-12% moisture with double rebate precision for seamless door fitting.
                </span>
              </div>
            </div>

            {/* AdMob Adaptive Banner Placement (Chaukhat Frame Calculator) */}
            <div className="pt-2">
              <AdMobBannerSlot placement="chaukhat" settings={settings} />
            </div>

          </div>

        </div>
      </div>

      {/* FULL ZOOM IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 border-b border-stone-200 flex items-center justify-between">
              <span className="font-bold text-sm text-stone-900">Chaukhat Product Photo Preview</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-stone-400 hover:text-stone-900 font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2 bg-stone-950 flex items-center justify-center">
              <img
                src={resolveImageUrl(previewImage)}
                alt="Chaukhat frame zoom"
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* CHAUKHAT STANDALONE QUOTATION PDF DOWNLOAD MODAL */}
      {showQuotationModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowQuotationModal(false)}
        >
          <div
            className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  Download Chaukhat Quotation PDF
                </h3>
                <p className="text-xs text-stone-500">Official estimate with itemized timber breakdown</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuotationModal(false)}
                className="text-stone-400 hover:text-stone-800 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Your Full Name (Optional)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-[#C89211]"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 98220 12345"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-[#C89211]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Selected Design:</span>
                <span className="font-bold text-stone-900">{calculationResult.selectedDesignName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Wood & Size:</span>
                <span className="font-bold text-stone-900">{calculationResult.woodType} ({calculationResult.runningLengthFt} Rft)</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-stone-200">
                <span className="font-semibold text-stone-900">Estimated Total:</span>
                <span className="font-mono font-bold text-[#A0700B]">₹{calculationResult.totalPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQuotationModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  generateChaukhatQuotationPDF(calculationResult, settings, customerName, customerPhone);
                  setShowQuotationModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Generate PDF Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMBINED DOOR + CHAUKHAT QUOTATION MODAL */}
      {showCombinedModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCombinedModal(false)}
        >
          <div
            className="max-w-xl w-full bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-stone-100 pb-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-[#A0700B] text-[10px] font-bold border border-amber-200 uppercase tracking-wider mb-1">
                  Single Non-Overlapping Quotation
                </div>
                <h3 className="font-serif text-2xl font-bold text-stone-900">
                  Door + Chaukhat Combined Quotation
                </h3>
                <p className="text-xs text-stone-500">
                  Complete entrance solution with matching grain, guaranteed rebate fitment, and transparent pricing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCombinedModal(false)}
                className="text-stone-400 hover:text-stone-800 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Component 1: Door Shutter */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-stone-800 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Door Shutter Component</span>
                </span>
                <span className="font-mono font-bold text-stone-900">
                  ₹{(activeDoorCalculation?.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
              {activeDoorCalculation ? (
                <div className="space-y-1 text-stone-600">
                  <div className="flex justify-between">
                    <span>Design:</span>
                    <strong className="text-stone-900">{activeDoorCalculation.doorName || 'Selected Design'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Timber Wood:</span>
                    <strong className="text-stone-900">{activeDoorCalculation.materialName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Shutter Dimensions:</span>
                    <strong className="text-stone-900">
                      {activeDoorCalculation.widthInch}" × {activeDoorCalculation.heightInch}" ({activeDoorCalculation.sqFt.toFixed(2)} sq.ft)
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-stone-500 italic flex items-center justify-between">
                  <span>No door shutter currently calculated.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCombinedModal(false);
                      onSwitchToDoorCalculator();
                    }}
                    className="text-[#C89211] font-bold underline"
                  >
                    Select Door
                  </button>
                </div>
              )}
            </div>

            {/* Component 2: Chaukhat Frame */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#C89211] text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Chaukhat (Door Frame) Component</span>
                </span>
                <span className="font-mono font-bold text-[#A0700B]">
                  ₹{calculationResult.totalPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="space-y-1 text-stone-600">
                <div className="flex justify-between">
                  <span>Design:</span>
                  <strong className="text-stone-900">{calculationResult.selectedDesignName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Timber Wood:</span>
                  <strong className="text-stone-900">{calculationResult.woodType}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Section Size:</span>
                  <strong className="text-stone-900">{calculationResult.sectionSizeName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Overall Frame Opening:</span>
                  <strong className="text-stone-900">
                    {calculationResult.heightFt} ft × {calculationResult.widthFt} ft ({calculationResult.runningLengthFt} Rft)
                  </strong>
                </div>
              </div>
            </div>

            {/* Combined Total Summary Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-stone-900 to-[#2A2318] text-white space-y-2 shadow-lg">
              <div className="flex justify-between text-xs text-stone-300">
                <span>Door Shutter Price:</span>
                <span className="font-mono">₹{(activeDoorCalculation?.total || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-300">
                <span>Chaukhat Frame Price:</span>
                <span className="font-mono">₹{calculationResult.totalPrice.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-700">
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#E6B33A] font-bold block">
                    Combined Grand Total
                  </span>
                  <span className="text-[10px] text-stone-400">Zero duplicate craftsmanship or material overheads</span>
                </div>
                <span className="font-mono text-2xl font-bold text-white">
                  ₹{combinedQuotation.combinedTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Combined Modal Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  generateCombinedQuotationPDF(combinedQuotation, settings, customerName, customerPhone);
                  setShowCombinedModal(false);
                }}
                className="py-3 px-4 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Combined PDF</span>
              </button>

              <button
                type="button"
                onClick={handleCombinedWhatsAppEnquiry}
                className="py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enquire Combined on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
