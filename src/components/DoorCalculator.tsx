import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Ruler,
  TreePine,
  Sparkles,
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
  Box,
  Eye,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Filter,
  Check,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import {
  DoorMaterial,
  PolishFinish,
  ChaukhatFrame,
  HardwareItem,
  BusinessSettings,
  Door,
  Category,
  CalculationResult,
  UserProfile,
  UserCalculationRecord,
  ChaukhatCalculationResult,
} from '../types.ts';
import {
  saveUserCalculation,
  DEFAULT_MATERIALS,
  DEFAULT_FINISHES,
  DEFAULT_FRAMES,
  DEFAULT_HARDWARE,
} from '../lib/api.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';
import { adMobService } from '../lib/admob/admobService.ts';
import { AdMobBannerSlot } from './admob/AdMobBannerSlot.tsx';

interface DoorCalculatorProps {
  doors?: Door[];
  categories?: Category[];
  materials: DoorMaterial[];
  finishes: PolishFinish[];
  frames: ChaukhatFrame[];
  hardware: HardwareItem[];
  settings: BusinessSettings;
  preselectedDoor?: Door | null;
  onClearPreselectedDoor?: () => void;
  onOpenQuotationModal: (calcResult: CalculationResult, selectedDoor?: Door | null) => void;
  onOpenVisualizer?: (door?: Door | null) => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: (contextMsg?: string) => void;
  onOpenProfileHistory?: () => void;
  initialCalculationRecord?: UserCalculationRecord | null;
  onClearInitialRecord?: () => void;
  onSwitchToChaukhatCalculator?: () => void;
  activeChaukhatCalculation?: ChaukhatCalculationResult | null;
}

export const DoorCalculator: React.FC<DoorCalculatorProps> = ({
  doors: propDoors,
  categories = [],
  materials: propMaterials,
  finishes: propFinishes,
  frames: propFrames,
  hardware: propHardware,
  settings,
  preselectedDoor,
  onClearPreselectedDoor,
  onOpenQuotationModal,
  onOpenVisualizer,
  currentUser,
  onOpenAuth,
  onOpenProfileHistory,
  initialCalculationRecord,
  onClearInitialRecord,
  onSwitchToChaukhatCalculator,
  activeChaukhatCalculation,
}) => {
  // 1. Live Active Catalogue Doors (single source of truth from Catalogue / Admin)
  const activeDoors = useMemo(() => {
    const list = Array.isArray(propDoors) && propDoors.length > 0 ? propDoors : [];
    return list.filter(d => d.active !== false);
  }, [propDoors]);

  // Guaranteed non-empty lists with fallbacks for cold-start & offline resilience
  const materials = useMemo(() => {
    const list = Array.isArray(propMaterials) && propMaterials.length > 0 ? propMaterials : DEFAULT_MATERIALS;
    return list.filter(m => m.active !== false);
  }, [propMaterials]);

  const finishes = useMemo(() => {
    const list = Array.isArray(propFinishes) && propFinishes.length > 0 ? propFinishes : DEFAULT_FINISHES;
    return list.filter(f => f.active !== false);
  }, [propFinishes]);

  const frames = useMemo(() => {
    const list = Array.isArray(propFrames) && propFrames.length > 0 ? propFrames : DEFAULT_FRAMES;
    return list.filter(fr => fr.active !== false);
  }, [propFrames]);

  const hardware = useMemo(() => {
    const list = Array.isArray(propHardware) && propHardware.length > 0 ? propHardware : DEFAULT_HARDWARE;
    return list.filter(h => h.active !== false);
  }, [propHardware]);

  // Selected Door State
  const [selectedDoor, setSelectedDoor] = useState<Door | null>(() => {
    if (preselectedDoor) return preselectedDoor;
    if (activeDoors.length > 0) return activeDoors[0];
    return null;
  });

  // Keep in sync with preselectedDoor from outside (e.g. Catalogue "Calculate Price" button)
  useEffect(() => {
    if (preselectedDoor) {
      setSelectedDoor(preselectedDoor);
    } else if (!selectedDoor && activeDoors.length > 0) {
      setSelectedDoor(activeDoors[0]);
    }
  }, [preselectedDoor, activeDoors]);

  // STEP 1: Dimensions & Unit (Controlled numeric inputs in inches)
  const [dimensionUnit, setDimensionUnit] = useState<'in' | 'ft'>('in');
  const [selectedPreset, setSelectedPreset] = useState<string>('36x78');
  const [customWidth, setCustomWidth] = useState<string>('36');
  const [customHeight, setCustomHeight] = useState<string>('78');
  const [hasEnteredCustom, setHasEnteredCustom] = useState<boolean>(false);

  // Numeric sanitization: allows only numbers and at most one decimal point; prevents negative values
  const sanitizeNumericInput = (val: string): string => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    // Prevent overflow while allowing standard and large custom door sizes
    if (parts[0].length > 6) {
      return parts[0].slice(0, 6) + (parts[1] !== undefined ? '.' + parts[1] : '');
    }
    return cleaned;
  };

  // Derived numeric values for calculation and validation
  const parsedWidth = parseFloat(customWidth);
  const parsedHeight = parseFloat(customHeight);
  const isWidthValid = !isNaN(parsedWidth) && parsedWidth > 0;
  const isHeightValid = !isNaN(parsedHeight) && parsedHeight > 0;
  const widthInch = isWidthValid ? parsedWidth : 0;
  const heightInch = isHeightValid ? parsedHeight : 0;

  // Common Presets (Section 3 requirement)
  const presets = useMemo(() => [
    { label: '3 × 6.5 ft', w: 36, h: 78, desc: 'Bedroom Standard (36 × 78 in)' },
    { label: '3 × 7 ft', w: 36, h: 84, desc: 'Main Entrance Standard (36 × 84 in)' },
    { label: '3.5 × 7 ft', w: 42, h: 84, desc: 'Wide Single Entrance (42 × 84 in)' },
    { label: '4 × 7 ft', w: 48, h: 84, desc: 'Grand 1.5 Shutter (48 × 84 in)' },
    { label: '5 × 7 ft', w: 60, h: 84, desc: 'Double Door Bungalow (60 × 84 in)' },
    { label: '2.5 × 6.5 ft', w: 30, h: 78, desc: 'Bathroom / Utility (30 × 78 in)' },
    { label: 'Custom Size', w: 0, h: 0, desc: 'Enter exact opening dimensions' },
  ], []);

  const handlePresetSelect = (preset: typeof presets[0]) => {
    if (preset.label === 'Custom Size') {
      setSelectedPreset('custom');
      // If customer switches to Custom Size without previously typing a custom value, show clear empty fields with placeholders
      if (!hasEnteredCustom) {
        setCustomWidth('');
        setCustomHeight('');
      }
    } else {
      setSelectedPreset(`${preset.w}x${preset.h}`);
      setCustomWidth(String(preset.w));
      setCustomHeight(String(preset.h));
    }
  };

  const handleStepWidth = (delta: number) => {
    setSelectedPreset('custom');
    setHasEnteredCustom(true);
    const num = parseFloat(customWidth);
    const base = isNaN(num) ? (delta > 0 ? 36 : 35) : num;
    const next = Math.max(1, Math.round((base + delta) * 100) / 100);
    setCustomWidth(String(next));
  };

  const handleStepHeight = (delta: number) => {
    setSelectedPreset('custom');
    setHasEnteredCustom(true);
    const num = parseFloat(customHeight);
    const base = isNaN(num) ? (delta > 0 ? 78 : 77) : num;
    const next = Math.max(1, Math.round((base + delta) * 100) / 100);
    setCustomHeight(String(next));
  };

  // STEP 2: Catalogue Door Filters & Search
  const [doorSearch, setDoorSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const filteredDoors = useMemo(() => {
    return activeDoors.filter(d => {
      const matchesSearch = doorSearch.trim() === '' ||
        d.name.toLowerCase().includes(doorSearch.toLowerCase()) ||
        d.category.toLowerCase().includes(doorSearch.toLowerCase()) ||
        d.id.toLowerCase().includes(doorSearch.toLowerCase());
      const matchesCategory = selectedCategoryFilter === 'all' || d.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [activeDoors, doorSearch, selectedCategoryFilter]);

  // STEP 3: Supported Materials for the selected Door
  const availableMaterialsForDoor = useMemo(() => {
    if (!selectedDoor) return materials;
    if (selectedDoor.availableMaterialIds && selectedDoor.availableMaterialIds.length > 0) {
      const allowed = materials.filter(m => selectedDoor.availableMaterialIds?.includes(m.id));
      return allowed.length > 0 ? allowed : materials;
    }
    // If door has recommended material e.g. 'Sagwan'
    if (selectedDoor.material) {
      const matched = materials.find(m => m.name.toLowerCase().includes(selectedDoor.material.toLowerCase()));
      if (matched) {
        // Put recommended material first
        return [matched, ...materials.filter(m => m.id !== matched.id)];
      }
    }
    return materials;
  }, [selectedDoor, materials]);

  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('mat-1');

  // Keep material valid when door changes
  useEffect(() => {
    if (availableMaterialsForDoor.length > 0) {
      if (!availableMaterialsForDoor.some(m => m.id === selectedMaterialId)) {
        setSelectedMaterialId(availableMaterialsForDoor[0].id);
      }
    }
  }, [availableMaterialsForDoor, selectedMaterialId]);

  // STEP 4: Supported Polish Finishes for the selected Door
  const availableFinishesForDoor = useMemo(() => {
    if (!selectedDoor) return finishes;
    if (selectedDoor.availableFinishIds && selectedDoor.availableFinishIds.length > 0) {
      const allowed = finishes.filter(f => selectedDoor.availableFinishIds?.includes(f.id));
      return allowed.length > 0 ? allowed : finishes;
    }
    return finishes;
  }, [selectedDoor, finishes]);

  const [selectedFinishId, setSelectedFinishId] = useState<string>('fin-2');

  useEffect(() => {
    if (availableFinishesForDoor.length > 0) {
      if (!availableFinishesForDoor.some(f => f.id === selectedFinishId)) {
        setSelectedFinishId(availableFinishesForDoor[0].id);
      }
    }
  }, [availableFinishesForDoor, selectedFinishId]);



  // STEP 6: Hardware Selection (supports 'none')
  const availableHardwareForDoor = useMemo(() => {
    if (!selectedDoor) return hardware;
    if (selectedDoor.availableHardwareIds && selectedDoor.availableHardwareIds.length > 0) {
      const allowed = hardware.filter(h => selectedDoor.availableHardwareIds?.includes(h.id));
      return allowed.length > 0 ? allowed : hardware;
    }
    return hardware;
  }, [selectedDoor, hardware]);

  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('hwd-1');
  const [hardwareQty, setHardwareQty] = useState<number>(1);

  useEffect(() => {
    if (selectedHardwareId !== 'none' && availableHardwareForDoor.length > 0) {
      if (!availableHardwareForDoor.some(h => h.id === selectedHardwareId)) {
        setSelectedHardwareId(availableHardwareForDoor[0].id);
      }
    }
  }, [availableHardwareForDoor, selectedHardwareId]);

  // Full Image Preview Modal State
  const [previewDoor, setPreviewDoor] = useState<Door | null>(null);
  const [previewImgIdx, setPreviewImgIdx] = useState<number>(0);
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  // Full Image Preview Modal State for Hardware & Fittings
  const [previewHardware, setPreviewHardware] = useState<HardwareItem | null>(null);
  const [previewHardwareZoom, setPreviewHardwareZoom] = useState<number>(1);
  // Helper image resolvers to guarantee authentic thumbnails are always visible
  const getMaterialImage = (mat: DoorMaterial): string => {
    if (mat.image && mat.image.trim()) return mat.image;
    const name = mat.name.toLowerCase();
    if (name.includes('sagwan') || name.includes('teak')) {
      return 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('sal')) {
      return 'https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('pine')) {
      return 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('plywood')) {
      return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('veneer') || name.includes('flush')) {
      return 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=400&q=80';
  };

  const getFinishImage = (fin: PolishFinish): string => {
    if (fin.image && fin.image.trim()) return fin.image;
    const name = fin.name.toLowerCase();
    if (name.includes('teak')) {
      return 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('pu') || name.includes('polyurethane')) {
      return 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('melamine')) {
      return 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=400&q=80';
    }
    if (name.includes('raw') || name.includes('unpolished')) {
      return 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80';
    }
    return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80';
  };

  const getHardwareImage = (hwd: HardwareItem): string => {
    if (hwd.image && hwd.image.trim()) return hwd.image;
    const name = hwd.name.toLowerCase();
    if (name.includes('mortise') || name.includes('lock') || name.includes('handle')) {
      return 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=1200&q=80';
    }
    if (name.includes('antique')) {
      return 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=1200&q=80';
    }
    if (name.includes('heavy')) {
      return 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80';
    }
    return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80';
  };

  // Save to history notification states
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load from initialCalculationRecord if provided
  useEffect(() => {
    if (initialCalculationRecord) {
      setCustomWidth(String(initialCalculationRecord.result.widthInch));
      setCustomHeight(String(initialCalculationRecord.result.heightInch));
      setSelectedPreset('custom');
      setHasEnteredCustom(true);

      if (initialCalculationRecord.input.doorId) {
        const found = activeDoors.find(d => d.id === initialCalculationRecord.input.doorId);
        if (found) setSelectedDoor(found);
      }

      const mat = materials.find(
        m => m.id === initialCalculationRecord.input.materialId || m.name === initialCalculationRecord.result.materialName
      );
      if (mat) setSelectedMaterialId(mat.id);

      const fin = finishes.find(
        f => f.id === initialCalculationRecord.input.finishId || f.name === initialCalculationRecord.result.finishName
      );
      if (fin) setSelectedFinishId(fin.id);



      const hwd = hardware.find(
        h => h.id === initialCalculationRecord.input.hardwareId || h.name === initialCalculationRecord.result.hardwareName
      );
      if (hwd) setSelectedHardwareId(hwd.id);

      if (initialCalculationRecord.input.hardwareQty) {
        setHardwareQty(initialCalculationRecord.input.hardwareQty);
      }
    }
  }, [initialCalculationRecord, materials, finishes, frames, hardware, activeDoors]);

  // Calculation Math (Section 4 & 5: Product-Specific Pricing Logic)
  const calculation: CalculationResult = useMemo(() => {
    const isValidDim = isWidthValid && isHeightValid;
    const w = isValidDim ? widthInch : 0;
    const h = isValidDim ? heightInch : 0;
    const rawSqFt = isValidDim ? (w * h) / 144 : 0;
    const sqFt = Math.round(rawSqFt * 100) / 100;

    // 1. Pricing Model: Determine whether catalogue door is all-inclusive base price or craftsmanship-only
    const isCraftsmanshipOnly = selectedDoor ? (selectedDoor.craftsmanshipOnly === true) : false;
    const isAllInclusive = selectedDoor ? !isCraftsmanshipOnly : false;

    const doorPricingType = selectedDoor?.pricingType || 'sqft';
    let doorBaseRate = 800; // Standard craftsmanship rate for custom doors
    let hasMissingPrice = false;
    let missingPriceMessage: string | undefined = undefined;

    if (selectedDoor?.basePrice !== undefined && selectedDoor.basePrice > 0) {
      doorBaseRate = selectedDoor.basePrice;
    } else if (selectedDoor?.startingPrice && selectedDoor.startingPrice > 0) {
      // Backward-compatible calculation for legacy doors without explicit basePrice
      doorBaseRate = Math.round(selectedDoor.startingPrice / 19.5);
    } else if (selectedDoor) {
      // Door selected but no price configured
      doorBaseRate = 0;
      hasMissingPrice = true;
      missingPriceMessage = `Price for "${selectedDoor.name}" is pending workshop configuration. Click 'Get Official Quotation' or enquire on WhatsApp for custom pricing.`;
    }

    // Material Cost (respects door-specific override rate if configured)
    const mat = materials.find(m => m.id === selectedMaterialId) || materials[0] || DEFAULT_MATERIALS[0];
    const materialRate = (selectedDoor?.materialPrices && selectedDoor.materialPrices[selectedMaterialId] !== undefined)
      ? selectedDoor.materialPrices[selectedMaterialId]
      : (mat ? mat.ratePerSqFt : 800);
    const materialName = mat ? mat.name : 'Sagwan';

    let doorCost = 0;
    let materialCost = 0;
    let materialAdjustmentPerSqFt = 0;

    if (selectedDoor && isAllInclusive) {
      // Catalogue Design with All-Inclusive Base Door Price:
      // The catalogue door starting price covers the entire door in its configured wood.
      const defaultMaterialName = selectedDoor.material || 'Sagwan';
      const defaultMat = materials.find(m => m.name.toLowerCase().includes(defaultMaterialName.toLowerCase())) || materials[0];
      const defaultMaterialStandardRate = defaultMat ? defaultMat.ratePerSqFt : 1000;
      const selectedMaterialStandardRate = mat ? mat.ratePerSqFt : 1000;

      // If customer chooses a different timber material, adjust by the price difference
      materialAdjustmentPerSqFt = selectedMaterialStandardRate - defaultMaterialStandardRate;

      if (doorPricingType === 'fixed') {
        const fixedBase = selectedDoor.basePrice !== undefined && selectedDoor.basePrice > 0
          ? selectedDoor.basePrice
          : (selectedDoor.startingPrice || 15000);
        doorCost = isValidDim ? Math.max(0, fixedBase + Math.round(sqFt * materialAdjustmentPerSqFt)) : 0;
      } else {
        const effectiveRate = Math.max(0, doorBaseRate + materialAdjustmentPerSqFt);
        doorCost = isValidDim ? Math.round(sqFt * effectiveRate) : 0;
      }

      // Wood material is already included in the base door shutter price, not charged twice
      materialCost = 0;
    } else {
      // Custom Door without catalogue design OR explicitly configured craftsmanship-only door
      if (doorPricingType === 'fixed') {
        doorCost = selectedDoor?.basePrice !== undefined && selectedDoor.basePrice > 0
          ? selectedDoor.basePrice
          : (selectedDoor?.startingPrice || 0);
      } else {
        doorCost = isValidDim ? Math.round(sqFt * doorBaseRate) : 0;
      }
      materialCost = isValidDim ? Math.round(sqFt * materialRate) : 0;
    }

    // Minimum order price enforcement
    if (!hasMissingPrice && selectedDoor?.minPrice && doorCost < selectedDoor.minPrice) {
      doorCost = selectedDoor.minPrice;
    }

    // Dimension range warnings
    let validationWarning: string | undefined = undefined;
    if (!isValidDim) {
      validationWarning = 'Please enter valid width and height dimensions to calculate quotation.';
    } else if (selectedDoor) {
      if (selectedDoor.minWidthInch && w < selectedDoor.minWidthInch) {
        validationWarning = `Width is below recommended minimum (${selectedDoor.minWidthInch}") for ${selectedDoor.name}.`;
      } else if (selectedDoor.maxWidthInch && w > selectedDoor.maxWidthInch) {
        validationWarning = `Width exceeds recommended maximum (${selectedDoor.maxWidthInch}") for ${selectedDoor.name}.`;
      } else if (selectedDoor.minHeightInch && h < selectedDoor.minHeightInch) {
        validationWarning = `Height is below recommended minimum (${selectedDoor.minHeightInch}") for ${selectedDoor.name}.`;
      } else if (selectedDoor.maxHeightInch && h > selectedDoor.maxHeightInch) {
        validationWarning = `Height exceeds recommended maximum (${selectedDoor.maxHeightInch}") for ${selectedDoor.name}.`;
      }
    }

    // Polish Cost (respects door-specific override rate if configured)
    const fin = finishes.find(f => f.id === selectedFinishId) || finishes[0] || DEFAULT_FINISHES[1];
    const finishRate = (selectedDoor?.finishPrices && selectedDoor.finishPrices[selectedFinishId] !== undefined)
      ? selectedDoor.finishPrices[selectedFinishId]
      : (fin ? fin.ratePerSqFt : 150);
    const finishName = fin ? fin.name : 'Teak Polish';
    const finishCost = isValidDim ? Math.round(sqFt * finishRate) : 0;

    // Door Price Calculator is strictly door shutter + timber + finish + hardware (no chaukhat added)
    const frameCost = 0;
    const frameName = 'No Frame / Shutter Only';

    // Hardware Cost (supports 'none')
    let hardwareCost = 0;
    let hardwareName = 'No Hardware Included';
    let hardwarePrice = 0;
    const qty = Math.max(0, Number(hardwareQty) || 1);

    if (selectedHardwareId !== 'none') {
      const hwd = hardware.find(h => h.id === selectedHardwareId) || hardware[0] || DEFAULT_HARDWARE[1];
      hardwarePrice = (selectedDoor?.hardwarePrices && selectedDoor.hardwarePrices[selectedHardwareId] !== undefined)
        ? selectedDoor.hardwarePrices[selectedHardwareId]
        : (hwd ? hwd.price : 700);
      hardwareName = hwd ? hwd.name : 'Single Aldrop';
      hardwareCost = hardwarePrice * qty;
    }

    // Subtotal & Total (Frame cost is not added)
    const subtotal = doorCost + materialCost + finishCost + hardwareCost;
    const taxPercent = Number(settings?.additionalChargePercentage) || 0;
    const additionalCharges = Math.round((subtotal * taxPercent) / 100);
    const total = subtotal + additionalCharges;

    return {
      widthInch: w,
      heightInch: h,
      sqFt,
      doorId: selectedDoor?.id,
      doorName: selectedDoor?.name || 'Custom Handcrafted Door',
      doorImage: selectedDoor?.images?.[0],
      doorCategory: selectedDoor?.category,
      doorPricingType,
      doorBaseRate,
      doorCost,
      materialIncludedInDoorPrice: isAllInclusive,
      materialAdjustmentPerSqFt,
      materialName,
      materialRate,
      materialCost,
      finishName,
      finishRate,
      finishCost,
      frameId: 'none',
      frameName,
      frameCost: 0,
      hardwareName,
      hardwarePrice,
      hardwareQty: qty,
      hardwareCost,
      subtotal,
      additionalCharges,
      additionalChargeName: settings?.additionalChargeName || 'Taxes',
      total,
      validationWarning: validationWarning || missingPriceMessage,
      hasMissingPrice,
      missingPriceMessage,
    };
  }, [
    customWidth,
    customHeight,
    isWidthValid,
    isHeightValid,
    widthInch,
    heightInch,
    selectedDoor,
    selectedMaterialId,
    selectedFinishId,
    selectedHardwareId,
    hardwareQty,
    materials,
    finishes,
    hardware,
    settings,
  ]);

  // WhatsApp Message Formatter (Section 9)
  const prepareWhatsAppMessage = () => {
    const isMatIncluded = calculation.materialIncludedInDoorPrice;
    return `Hello ${settings?.businessName || 'Jai Hanuman Door'}, I am interested in this door quotation.

Door Design: ${selectedDoor ? `${selectedDoor.name} (ID: ${selectedDoor.id})` : 'Custom Handcrafted Door'}
Category: ${selectedDoor?.category || 'Main Entrance'}
Size: ${calculation.widthInch} × ${calculation.heightInch} inch (${calculation.sqFt.toFixed(2)} sq.ft)
Door Shutter: ₹${calculation.doorCost.toLocaleString('en-IN')} (${calculation.doorPricingType === 'fixed' ? 'Fixed Price' : `₹${calculation.doorBaseRate}/sq.ft`})
Material: ${calculation.materialName} (${isMatIncluded ? 'Included in Door Shutter' : `₹${calculation.materialRate}/sq.ft = ₹${calculation.materialCost.toLocaleString('en-IN')}`})
Polish: ${calculation.finishCost > 0 ? `${calculation.finishName} (₹${calculation.finishCost.toLocaleString('en-IN')})` : `${calculation.finishName} (No Polish)`}
Hardware: ${calculation.hardwareCost > 0 ? `${calculation.hardwareName} (Qty: ${calculation.hardwareQty} = ₹${calculation.hardwareCost.toLocaleString('en-IN')})` : 'No Hardware Included'}
---
Estimated Total: ₹${calculation.total.toLocaleString('en-IN')}

Please provide official factory dispatch schedule and installation assistance.`;
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

  // AdMob Quotation Interstitial Logic (Part 2 requirement)
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

  // Preload interstitial so it's ready when user taps "Get Official Quotation PDF"
  useEffect(() => {
    adMobService.preloadInterstitial(settings?.adSettings);
  }, [settings?.adSettings]);

  const handleGenerateQuotation = async () => {
    if (isGeneratingQuote) return;
    if (!isWidthValid || !isHeightValid || widthInch <= 0 || heightInch <= 0) {
      alert('Please enter valid door dimensions (width & height) to generate quotation.');
      return;
    }
    setIsGeneratingQuote(true);
    try {
      // Show preloaded interstitial with fail-safe timeout; quotation modal always opens
      await adMobService.showQuotationInterstitial(() => {
        onOpenQuotationModal(calculation, selectedDoor);
      }, settings?.adSettings);
    } catch {
      onOpenQuotationModal(calculation, selectedDoor);
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  const resetAll = () => {
    setCustomWidth('36');
    setCustomHeight('78');
    setHasEnteredCustom(false);
    setSelectedPreset('36x78');
    setDimensionUnit('in');
    if (activeDoors.length > 0) setSelectedDoor(activeDoors[0]);
    if (materials[0]) setSelectedMaterialId(materials[0].id);
    if (finishes[0]) setSelectedFinishId(finishes[0].id);
    setSelectedHardwareId('hwd-1');
    setHardwareQty(1);
    if (onClearPreselectedDoor) onClearPreselectedDoor();
  };

  const handleSaveCalculation = async () => {
    try {
      setSaveStatus('saving');
      setSaveMsg(null);
      await saveUserCalculation({
        input: {
          doorId: selectedDoor?.id,
          doorName: selectedDoor?.name,
          doorImage: selectedDoor?.images?.[0],
          widthInch: calculation.widthInch,
          heightInch: calculation.heightInch,
          materialId: selectedMaterialId,
          finishId: selectedFinishId,
          frameId: 'none',
          hardwareId: selectedHardwareId,
          hardwareQty: calculation.hardwareQty,
        },
        result: calculation,
        notes: `Selected: ${selectedDoor?.name || 'Custom Door'} (${calculation.widthInch}" × ${calculation.heightInch}")`,
      });
      setSaveStatus('saved');
      setSaveMsg('Calculation saved to your profile history!');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setSaveMsg(err.message || 'Please log in to save this estimate');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] py-3 sm:py-8 pb-20 lg:pb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Independent Quotation Option Switcher Bar */}
        <div className="mb-4 bg-[#1A1A1A] p-2.5 sm:p-3 rounded-2xl border border-[#2D2D2D] text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-[#C89211]/20 text-[#E6B33A] px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] border border-[#C89211]/40">
              Two Independent Calculators
            </span>
            <span className="text-stone-300 hidden sm:inline">Calculate door shutter, chaukhat frame, or both independently</span>
          </div>

          <div className="flex items-center bg-[#262626] p-1 rounded-xl border border-[#3A3A3A] text-xs">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-[#C89211] text-white font-bold shadow-sm flex items-center gap-1.5 cursor-default"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Option A: Door Calculator</span>
            </button>

            {onSwitchToChaukhatCalculator && (
              <button
                type="button"
                onClick={onSwitchToChaukhatCalculator}
                className="px-3 py-1.5 rounded-lg text-stone-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#C89211]" />
                <span>Option B: Chaukhat Calculator</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Header & Breadcrumb */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#E5E5E5] pb-3 sm:pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 mb-2">
              <Calculator className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Direct Factory Pricing Engine</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black text-[#1A1A1A] tracking-tight">
              Door Price Calculator
            </h1>
            <p className="text-xs sm:text-sm text-[#666666] mt-1 max-w-2xl">
              Configure your exact doorway dimensions, select handcrafted Catalogue designs, choose seasoned timber species, polish coats, and fittings with 100% transparent pricing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetAll}
              className="px-3 py-2 rounded-xl bg-[#F8F8F6] hover:bg-[#EFEFEF] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset all selections"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {onOpenProfileHistory && (
              <button
                onClick={onOpenProfileHistory}
                className="px-3.5 py-2 rounded-xl bg-[#FFF7E3] hover:bg-[#FFECC0] text-[#C89211] border border-[#C89211]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#C89211]" />
                <span>My Saved Quotes</span>
              </button>
            )}
          </div>
        </div>

        {/* Layout: Sidebar (Door Designs) + Main Calculator Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================================= */}
          {/* DESKTOP SIDEBAR / SECTION 1: Door Designs Thumbnail Sidebar */}
          {/* ========================================================================= */}
          <div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-sm font-bold text-[#1A1A1A]">
                      Door Designs
                    </h3>
                    <p className="text-[10px] text-[#666666]">
                      {activeDoors.length} Catalogue Models
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-[#C89211] bg-[#FFF7E3] px-2 py-0.5 rounded-full font-mono font-bold border border-[#C89211]/30">
                  Catalogue Sync
                </span>
              </div>

              {/* Search & Category Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
                  <input
                    type="text"
                    placeholder="Search designs..."
                    value={doorSearch}
                    onChange={e => setDoorSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#F7F7F7] border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:bg-white focus:border-[#C89211] placeholder:text-[#999999]"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                  <button
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition cursor-pointer ${
                      selectedCategoryFilter === 'all'
                        ? 'bg-[#C89211] text-white font-bold shadow-sm'
                        : 'bg-[#F7F7F7] text-[#666666] hover:text-[#1A1A1A] border border-[#E5E5E5]'
                    }`}
                  >
                    All ({activeDoors.length})
                  </button>
                  {categories.map(cat => {
                    const count = activeDoors.filter(d => d.category === cat.name).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryFilter(cat.name)}
                        className={`px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition cursor-pointer ${
                          selectedCategoryFilter === cat.name
                            ? 'bg-[#C89211] text-white font-bold shadow-sm'
                            : 'bg-[#F7F7F7] text-[#666666] hover:text-[#1A1A1A] border border-[#E5E5E5]'
                        }`}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thumbnail List */}
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {/* Custom Handcrafted Door (Without Catalogue Design) */}
                <div
                  onClick={() => setSelectedDoor(null)}
                  className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    selectedDoor === null
                      ? 'bg-[#FFF7E3] border-[#C89211] shadow-md ring-2 ring-[#C89211]/30'
                      : 'bg-white hover:bg-[#F8F8F6] border-[#E5E5E5]'
                  }`}
                >
                  <div className="w-14 h-18 rounded-lg bg-[#FAF7F2] border border-[#E5E5E5] shrink-0 flex flex-col items-center justify-center text-[#C89211]">
                    <Sparkles className="w-6 h-6 mb-0.5" />
                    <span className="text-[8px] font-bold tracking-wider">CUSTOM</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-[#C89211] font-semibold">Custom Workshop Build</span>
                      {selectedDoor === null && (
                        <span className="text-[9px] font-bold text-[#C89211] bg-[#FFF7E3] px-1.5 py-0.2 rounded border border-[#C89211]/30 flex items-center gap-0.5 shrink-0">
                          <Check className="w-2.5 h-2.5" /> Selected
                        </span>
                      )}
                    </div>
                    <h4 className={`text-xs font-bold truncate mt-0.5 ${selectedDoor === null ? 'text-[#1A1A1A] font-serif' : 'text-[#1A1A1A]'}`}>
                      Custom Handcrafted Door (No Catalogue Design)
                    </h4>
                    <div className="text-[11px] font-mono mt-1 text-[#666666]">
                      ₹800/sq.ft Craftsmanship + Timber
                    </div>
                  </div>
                </div>

                {filteredDoors.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#666666]">
                    No designs match your search filter.
                  </div>
                ) : (
                  filteredDoors.map(door => {
                    const isSelected = selectedDoor?.id === door.id;
                    const pricingType = door.pricingType || 'sqft';
                    const rateDisplay = pricingType === 'fixed'
                      ? `₹${(door.basePrice || door.startingPrice || 15000).toLocaleString('en-IN')} (Fixed)`
                      : `₹${door.basePrice || Math.round((door.startingPrice || 15600) / 19.5)}/sq.ft`;

                    return (
                      <div
                        key={door.id}
                        onClick={() => setSelectedDoor(door)}
                        className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-[#FFF7E3] border-[#C89211] shadow-md ring-2 ring-[#C89211]/30'
                            : 'bg-white hover:bg-[#F8F8F6] border-[#E5E5E5]'
                        }`}
                      >
                        {/* Thumbnail with Preview Button Overlay */}
                        <div className="relative w-14 h-18 rounded-lg overflow-hidden bg-[#F8F8F6] border border-[#E5E5E5] shrink-0">
                          <img
                            src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'}
                            alt={door.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewDoor(door);
                              setPreviewImgIdx(0);
                              setPreviewZoom(1);
                            }}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                            title="Preview Full Image"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Door Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-[#C89211] font-semibold truncate">
                              {door.category}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-bold text-[#C89211] bg-[#FFF7E3] px-1.5 py-0.2 rounded border border-[#C89211]/30 flex items-center gap-0.5 shrink-0">
                                <Check className="w-2.5 h-2.5" /> Selected
                              </span>
                            )}
                          </div>

                          <h4 className={`text-xs font-bold truncate mt-0.5 ${isSelected ? 'text-[#1A1A1A] font-serif' : 'text-[#1A1A1A]'}`}>
                            {door.name}
                          </h4>

                          <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                            <span className={isSelected ? 'text-[#C89211] font-bold' : 'text-[#666666]'}>
                              {rateDisplay}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDoor(door);
                                setPreviewImgIdx(0);
                                setPreviewZoom(1);
                              }}
                              className="text-[10px] text-[#666666] hover:text-[#C89211] underline cursor-pointer"
                            >
                              Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MAIN COLUMN: 6-STEP CUSTOMER CALCULATION FLOW */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 space-y-6">

            {/* Validation warning banner if door dimension out of bounds */}
            {calculation.validationWarning && (
              <div className="p-3.5 rounded-xl bg-[#FFF7E3] border border-[#C89211]/40 text-[#1A1A1A] text-xs flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="w-4 h-4 text-[#C89211] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <strong className="text-[#C89211]">Custom Size Advisory:</strong> {calculation.validationWarning} Our workshop will custom manufacture this design to your exact specification.
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------------- */}
            {/* STEP 1: Select Door Size */}
            {/* --------------------------------------------------------------------- */}
            <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E5E5] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211] font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h2 className="font-serif text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                      <span>Select Door Opening Size</span>
                      <Ruler className="w-4 h-4 text-[#C89211]" />
                    </h2>
                    <p className="text-[11px] text-[#666666]">
                      Choose standard architectural sizes or enter exact custom opening
                    </p>
                  </div>
                </div>

                {/* Standard Dimension Unit */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-xs">
                  <span className="text-[#666666]">Unit:</span>
                  <span className="font-semibold text-[#C89211]">Inches (in)</span>
                  <span className="text-[#CCCCCC]">•</span>
                  <span className="text-[#666666]">Instant (ft) conversion</span>
                </div>
              </div>

              {/* Common Presets Grid */}
              <div>
                <label className="text-xs font-semibold text-[#1A1A1A] block mb-2">
                  Common Architectural Presets:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {presets.map(p => {
                    const isMatch = selectedPreset === (p.label === 'Custom Size' ? 'custom' : `${p.w}x${p.h}`);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handlePresetSelect(p)}
                        className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                          isMatch
                            ? 'bg-[#FFF7E3] border-[#C89211] text-[#1A1A1A] ring-2 ring-[#C89211]/30 shadow-sm'
                            : 'bg-white hover:bg-[#F8F8F6] border-[#E5E5E5] text-[#1A1A1A]'
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>{p.label}</span>
                          {isMatch && <Check className="w-3 h-3 text-[#C89211]" />}
                        </div>
                        <div className="text-[10px] text-[#666666] truncate mt-0.5">
                          {p.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exact Custom Dimensions Input */}
              <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {/* Width Input Block */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#1A1A1A] mb-1.5">
                    <span>Width (inches)</span>
                    <span className="font-mono text-[#C89211] text-[11px] font-bold">
                      {isWidthValid ? `${parsedWidth} in (${(parsedWidth / 12).toFixed(2)} ft)` : '-- in'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStepWidth(-1)}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-[#EFEFEF] text-[#1A1A1A] border border-[#E5E5E5] flex items-center justify-center font-bold text-sm cursor-pointer select-none shadow-sm"
                      title="Decrease width by 1 inch"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customWidth}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const sanitized = sanitizeNumericInput(e.target.value);
                        setSelectedPreset('custom');
                        setHasEnteredCustom(true);
                        setCustomWidth(sanitized);
                      }}
                      placeholder="Enter width"
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono text-center font-bold text-sm focus:border-[#C89211] placeholder:text-[#999999] placeholder:font-normal shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepWidth(1)}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-[#EFEFEF] text-[#1A1A1A] border border-[#E5E5E5] flex items-center justify-center font-bold text-sm cursor-pointer select-none shadow-sm"
                      title="Increase width by 1 inch"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-[#666666] mt-1.5 text-center">
                    {isWidthValid ? (
                      <span className="text-[#1A1A1A]">
                        <strong className="text-[#C89211]">{parsedWidth}</strong> in ({((parsedWidth / 12)).toFixed(2)} ft)
                      </span>
                    ) : (
                      <span className="text-[#999999]">e.g. 36 in (3.00 ft)</span>
                    )}
                  </div>
                </div>

                {/* Height Input Block */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-[#1A1A1A] mb-1.5">
                    <span>Height (inches)</span>
                    <span className="font-mono text-[#C89211] text-[11px] font-bold">
                      {isHeightValid ? `${parsedHeight} in (${(parsedHeight / 12).toFixed(2)} ft)` : '-- in'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStepHeight(-1)}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-[#EFEFEF] text-[#1A1A1A] border border-[#E5E5E5] flex items-center justify-center font-bold text-sm cursor-pointer select-none shadow-sm"
                      title="Decrease height by 1 inch"
                    >
                      -
                    </button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customHeight}
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const sanitized = sanitizeNumericInput(e.target.value);
                        setSelectedPreset('custom');
                        setHasEnteredCustom(true);
                        setCustomHeight(sanitized);
                      }}
                      placeholder="Enter height"
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono text-center font-bold text-sm focus:border-[#C89211] placeholder:text-[#999999] placeholder:font-normal shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepHeight(1)}
                      className="w-9 h-9 rounded-lg bg-white hover:bg-[#EFEFEF] text-[#1A1A1A] border border-[#E5E5E5] flex items-center justify-center font-bold text-sm cursor-pointer select-none shadow-sm"
                      title="Increase height by 1 inch"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-[#666666] mt-1.5 text-center">
                    {isHeightValid ? (
                      <span className="text-[#1A1A1A]">
                        <strong className="text-[#C89211]">{parsedHeight}</strong> in ({((parsedHeight / 12)).toFixed(2)} ft)
                      </span>
                    ) : (
                      <span className="text-[#999999]">e.g. 84 in (7.00 ft)</span>
                    )}
                  </div>
                </div>

                {/* Automatically Calculated Area Badge */}
                <div className="p-3 rounded-xl bg-white border border-[#E5E5E5] text-center flex flex-col justify-center min-h-[90px] shadow-sm">
                  <div className="text-[10px] text-[#C89211] uppercase font-bold tracking-wider">
                    Calculated Surface Area
                  </div>
                  {isWidthValid && isHeightValid ? (
                    <>
                      <div className="font-mono text-xl sm:text-2xl font-black text-[#1A1A1A] mt-0.5">
                        {calculation.sqFt.toFixed(2)} <span className="text-xs font-normal text-[#666666]">sq.ft</span>
                      </div>
                      <div className="text-[10px] text-[#666666] mt-0.5">
                        ({parsedWidth}" × {parsedHeight}" ÷ 144) • {Math.round(calculation.sqFt * 0.092903 * 100) / 100} sq.m
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-mono text-xl sm:text-2xl font-black text-[#999999] mt-0.5">
                        -- <span className="text-xs font-normal">sq.ft</span>
                      </div>
                      <div className="text-[10px] text-[#C89211] mt-0.5 font-medium">
                        Enter width &amp; height above
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* STEP 2: Select Door Design (Mobile Carousel / Grid + Selected Banner) */}
            {/* --------------------------------------------------------------------- */}
            <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211] font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h2 className="font-serif text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                      <span>Select Catalogue Door Design</span>
                      <Box className="w-4 h-4 text-[#C89211]" />
                    </h2>
                    <p className="text-[11px] text-[#666666]">
                      Each design features its own configured craftsmanship rate / price
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Design Feature Banner */}
              {selectedDoor && (
                <div className="p-4 rounded-xl bg-[#FFF7E3] border border-[#C89211]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div
                      className="relative w-16 h-22 rounded-lg overflow-hidden bg-white border-2 border-[#C89211]/50 shrink-0 cursor-pointer group shadow-sm"
                      onClick={() => {
                        setPreviewDoor(selectedDoor);
                        setPreviewImgIdx(0);
                        setPreviewZoom(1);
                      }}
                      title="Tap to preview full image"
                    >
                      <img
                        src={selectedDoor.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'}
                        alt={selectedDoor.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-[#C89211] border border-[#C89211]/30 shadow-xs">
                          {selectedDoor.category}
                        </span>
                        <span className="text-[10px] font-mono text-[#666666]">
                          ID: {selectedDoor.id}
                        </span>
                      </div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1A1A]">
                        {selectedDoor.name}
                      </h3>
                      <div className="text-xs text-[#666666] flex items-center gap-3">
                        <span>
                          Configured Rate: <strong className="font-mono text-[#C89211]">
                            {selectedDoor.pricingType === 'fixed'
                              ? `₹${(selectedDoor.basePrice || selectedDoor.startingPrice || 15000).toLocaleString('en-IN')} (Fixed)`
                              : `₹${selectedDoor.basePrice || Math.round((selectedDoor.startingPrice || 15600) / 19.5)}/sq.ft`}
                          </strong>
                        </span>
                        <span className="text-[#CCCCCC]">•</span>
                        <span>
                          Door Cost: <strong className="font-mono text-[#16803A]">₹{calculation.doorCost.toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-[#C89211]/20 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDoor(selectedDoor);
                        setPreviewImgIdx(0);
                        setPreviewZoom(1);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#666666]" />
                      <span>Full Preview</span>
                    </button>

                    {onOpenVisualizer && (
                      <button
                        type="button"
                        onClick={() => onOpenVisualizer(selectedDoor)}
                        className="px-3 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                      >
                        <Box className="w-3.5 h-3.5 text-white" />
                        <span>3D &amp; AR Studio</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {!selectedDoor && (
                <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-16 h-20 rounded-lg bg-white border border-[#E5E5E5] flex flex-col items-center justify-center text-[#C89211] shrink-0">
                      <Sparkles className="w-6 h-6 mb-1" />
                      <span className="text-[9px] font-bold">CUSTOM</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30">
                          Custom Shutter
                        </span>
                        <span className="text-[10px] text-[#666666]">
                          Workshop Carpentry
                        </span>
                      </div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1A1A]">
                        Custom Handcrafted Door (Without Catalogue Design)
                      </h3>
                      <div className="text-xs text-[#666666] flex items-center gap-3">
                        <span>
                          Craftsmanship Rate: <strong className="font-mono text-[#C89211]">₹800/sq.ft</strong>
                        </span>
                        <span className="text-[#CCCCCC]">•</span>
                        <span>
                          Door Workmanship: <strong className="font-mono text-[#16803A]">₹{calculation.doorCost.toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full sm:w-auto text-right">
                    <span className="text-[11px] text-[#666666] block">
                      Choose your preferred timber &amp; finish below
                    </span>
                  </div>
                </div>
              )}

              {/* Mobile / Tablet Horizontal Scrollable Catalogue Designs (Section 1 requirement) */}
              <div className="block lg:hidden space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-[#666666]">
                  <span>Browse &amp; Tap to Change Design:</span>
                  <span className="text-[10px] text-[#C89211] font-semibold">Swipe horizontally →</span>
                </div>

                <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory">
                  {/* Custom Option for mobile */}
                  <div
                    onClick={() => setSelectedDoor(null)}
                    className={`w-36 shrink-0 snap-start p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedDoor === null
                        ? 'bg-[#FFF7E3] border-[#C89211] shadow-md ring-2 ring-[#C89211]/30'
                        : 'bg-white border-[#E5E5E5] hover:border-[#C89211]'
                    }`}
                  >
                    <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#FAF7F2] mb-1.5 border border-[#E5E5E5] flex flex-col items-center justify-center text-[#C89211]">
                      <Sparkles className="w-8 h-8 mb-1" />
                      <span className="text-[9px] font-bold">CUSTOM DOOR</span>
                    </div>
                    <div>
                      <div className="text-[9px] text-[#C89211] font-semibold">Custom Build</div>
                      <div className="text-xs font-bold text-[#1A1A1A] truncate">Workshop Door</div>
                      <div className="text-[10px] font-mono text-[#666666] mt-0.5">₹800/sq.ft</div>
                    </div>
                  </div>

                  {filteredDoors.map(door => {
                    const isSelected = selectedDoor?.id === door.id;
                    const pricingType = door.pricingType || 'sqft';
                    const rateDisplay = pricingType === 'fixed'
                      ? `₹${(door.basePrice || door.startingPrice || 15000).toLocaleString('en-IN')}`
                      : `₹${door.basePrice || Math.round((door.startingPrice || 15600) / 19.5)}/sq.ft`;

                    return (
                      <div
                        key={door.id}
                        onClick={() => setSelectedDoor(door)}
                        className={`w-36 shrink-0 snap-start p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#FFF7E3] border-[#C89211] shadow-md ring-2 ring-[#C89211]/30'
                            : 'bg-white border-[#E5E5E5] hover:border-[#C89211]'
                        }`}
                      >
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#F8F8F6] mb-1.5 border border-[#E5E5E5]">
                          <img
                            src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'}
                            alt={door.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewDoor(door);
                              setPreviewImgIdx(0);
                              setPreviewZoom(1);
                            }}
                            className="absolute bottom-1 right-1 p-1 rounded bg-black/50 text-white shadow-sm"
                            title="Preview image"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>

                        <div>
                          <span className="text-[9px] text-[#C89211] font-semibold truncate block">
                            {door.category}
                          </span>
                          <h4 className="text-[11px] font-bold text-[#1A1A1A] truncate line-clamp-1">
                            {door.name}
                          </h4>
                          <div className="text-[10px] font-mono text-[#C89211] font-bold mt-0.5">
                            {rateDisplay}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* STEP 3: Wood / Material */}
            {/* --------------------------------------------------------------------- */}
            <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211] font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h2 className="font-serif text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                      <span>Select Seasoned Wood / Material</span>
                      <TreePine className="w-4 h-4 text-[#C89211]" />
                    </h2>
                    <p className="text-[11px] text-[#666666]">
                      Seasoned timber with kiln-dry treatment against moisture and termites
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-[#C89211]">
                  ₹{calculation.materialCost.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {availableMaterialsForDoor.map(mat => {
                  const isSelected = selectedMaterialId === mat.id;
                  const effectiveRate = (selectedDoor?.materialPrices && selectedDoor.materialPrices[mat.id] !== undefined)
                    ? selectedDoor.materialPrices[mat.id]
                    : mat.ratePerSqFt;
                  const itemCost = Math.round(calculation.sqFt * effectiveRate);
                  const matImg = mat.image || getMaterialImage(mat);

                  return (
                    <div
                      key={mat.id}
                      onClick={() => setSelectedMaterialId(mat.id)}
                      className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 sm:gap-3 min-h-[58px] sm:min-h-[64px] ${
                        isSelected
                          ? 'bg-[#FFF7E3] border-[#C89211] text-[#1A1A1A] shadow-sm ring-1 ring-[#C89211]/40'
                          : 'bg-white hover:bg-[#F8F8F6] border-[#E5E5E5] text-[#1A1A1A]'
                      }`}
                    >
                      {/* Left Thumbnail */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg shrink-0 overflow-hidden border border-[#E5E5E5] bg-[#F8F8F6] relative flex items-center justify-center">
                        <img
                          src={matImg}
                          alt={mat.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getMaterialImage(mat);
                          }}
                        />
                      </div>

                      {/* Content (2 lines) */}
                      <div className="flex-1 min-w-0">
                        {/* Line 1: Option Name (Left) & Price (Right) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-[13px] sm:text-sm text-[#1A1A1A] flex items-center gap-1.5 truncate">
                            <span className="truncate">{mat.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#C89211] shrink-0" />}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold font-mono text-[13px] sm:text-sm text-[#C89211]">
                              ₹{itemCost.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Line 2: Short Description + Rate */}
                        <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px] text-[#666666]">
                          <p className="truncate flex-1">
                            {mat.description || 'Premium kiln-dried seasoned timber'}
                          </p>
                          <span className="font-mono text-[10px] text-[#888888] shrink-0">
                            (₹{effectiveRate}/sq.ft)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* STEP 4: Polish / Finish */}
            {/* --------------------------------------------------------------------- */}
            <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211] font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h2 className="font-serif text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                      <span>Select Polish / Protective Coating</span>
                      <Sparkles className="w-4 h-4 text-[#C89211]" />
                    </h2>
                    <p className="text-[11px] text-[#666666]">
                      Hand-rubbed polishes and weather-resistant Italian PU coatings
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-[#C89211]">
                  ₹{calculation.finishCost.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {availableFinishesForDoor.map(fin => {
                  const isSelected = selectedFinishId === fin.id;
                  const effectiveRate = (selectedDoor?.finishPrices && selectedDoor.finishPrices[fin.id] !== undefined)
                    ? selectedDoor.finishPrices[fin.id]
                    : fin.ratePerSqFt;
                  const itemCost = Math.round(calculation.sqFt * effectiveRate);
                  const finImg = fin.image || getFinishImage(fin);

                  return (
                    <div
                      key={fin.id}
                      onClick={() => setSelectedFinishId(fin.id)}
                      className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 sm:gap-3 min-h-[58px] sm:min-h-[64px] ${
                        isSelected
                          ? 'bg-[#FFF7E3] border-[#C89211] text-[#1A1A1A] shadow-sm ring-1 ring-[#C89211]/40'
                          : 'bg-white hover:bg-[#F8F8F6] border-[#E5E5E5] text-[#1A1A1A]'
                      }`}
                    >
                      {/* Left Thumbnail */}
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg shrink-0 overflow-hidden border border-[#E5E5E5] bg-[#F8F8F6] relative flex items-center justify-center">
                        <img
                          src={finImg}
                          alt={fin.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getFinishImage(fin);
                          }}
                        />
                      </div>

                      {/* Content (2 lines) */}
                      <div className="flex-1 min-w-0">
                        {/* Line 1: Option Name (Left) & Price (Right) */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-[13px] sm:text-sm text-[#1A1A1A] flex items-center gap-1.5 truncate">
                            <span className="truncate">{fin.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#C89211] shrink-0" />}
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`font-bold font-mono text-[13px] sm:text-sm ${effectiveRate === 0 ? 'text-[#16803A]' : 'text-[#C89211]'}`}>
                              {effectiveRate === 0 ? '₹0' : `₹${itemCost.toLocaleString('en-IN')}`}
                            </span>
                          </div>
                        </div>

                        {/* Line 2: Short Description + Rate */}
                        <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px] text-[#666666]">
                          <p className="truncate flex-1">
                            {fin.description || 'Protective wood polish finish'}
                          </p>
                          {effectiveRate > 0 && (
                            <span className="font-mono text-[10px] text-[#888888] shrink-0">
                              (₹{effectiveRate}/sq.ft)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* STEP 5: Hardware Selection */}
            {/* --------------------------------------------------------------------- */}
            <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211] font-bold text-xs">
                    5
                  </div>
                  <div>
                    <h2 className="font-serif text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                      <span>Select Hardware &amp; Fittings</span>
                      <Wrench className="w-4 h-4 text-[#C89211]" />
                    </h2>
                    <p className="text-[11px] text-[#666666]">
                      Solid brass antique aldrop, royal handles, and heavy security latches
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {selectedHardwareId !== 'none' && (
                    <div className="flex items-center gap-1 bg-[#F8F8F6] px-2 py-0.5 rounded-lg border border-[#E5E5E5] text-xs">
                      <span className="text-[#666666] text-[10px]">Qty:</span>
                      <button
                        type="button"
                        onClick={() => setHardwareQty(Math.max(1, hardwareQty - 1))}
                        className="px-1 text-[#1A1A1A] hover:text-[#C89211]"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-[#C89211] px-1">{hardwareQty}</span>
                      <button
                        type="button"
                        onClick={() => setHardwareQty(hardwareQty + 1)}
                        className="px-1 text-[#1A1A1A] hover:text-[#C89211]"
                      >
                        +
                      </button>
                    </div>
                  )}

                  <span className="text-xs font-mono font-bold text-[#C89211]">
                    ₹{calculation.hardwareCost.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {/* No Hardware Option */}
                <div
                  onClick={() => setSelectedHardwareId('none')}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 sm:gap-3 min-h-[58px] sm:min-h-[64px] ${
                    selectedHardwareId === 'none' || selectedHardwareId === 'hwd-0'
                      ? 'bg-[#FFF7E3] border-[#C89211] text-[#1A1A1A] shadow-sm ring-1 ring-[#C89211]/40'
                      : 'bg-white hover:bg-[#F8F8F6] border-[#E5E5E5] text-[#1A1A1A]'
                  }`}
                >
                  {/* Left Thumbnail (Wrench icon) */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg shrink-0 border border-[#E5E5E5] bg-[#F8F8F6] flex flex-col items-center justify-center text-[#888888]">
                    <Wrench className="w-5 h-5 text-[#888888]" />
                    <span className="text-[8px] font-semibold text-[#888888] mt-0.5">No Fitting</span>
                  </div>

                  {/* Content: 2-line layout */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-[13px] sm:text-sm text-[#1A1A1A] flex items-center gap-1.5 truncate">
                        <span className="truncate">No Hardware Included</span>
                        {(selectedHardwareId === 'none' || selectedHardwareId === 'hwd-0') && (
                          <Check className="w-3.5 h-3.5 text-[#C89211] shrink-0" />
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold font-mono text-[13px] sm:text-sm text-[#16803A]">
                          ₹0
                        </span>
                      </div>
                    </div>

                    <div className="mt-0.5 text-[11px] text-[#666666] truncate">
                      Supply shutter without handles, aldrop, or locks
                    </div>
                  </div>
                </div>

                {availableHardwareForDoor
                  .filter(hwd => hwd.id !== 'hwd-0' && !hwd.name.toLowerCase().includes('no hardware'))
                  .map(hwd => {
                    const isSelected = selectedHardwareId === hwd.id;
                    const price = (selectedDoor?.hardwarePrices && selectedDoor.hardwarePrices[hwd.id] !== undefined)
                      ? selectedDoor.hardwarePrices[hwd.id]
                      : hwd.price;
                    const itemTotal = price * (isSelected ? hardwareQty : 1);
                    const hwdImg = hwd.image || getHardwareImage(hwd);

                    return (
                      <div
                        key={hwd.id}
                        onClick={() => setSelectedHardwareId(hwd.id)}
                        className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 sm:gap-3 min-h-[58px] sm:min-h-[64px] ${
                          isSelected
                            ? 'bg-[#FFF7E3] border-[#C89211] text-[#1A1A1A] shadow-sm ring-1 ring-[#C89211]/40'
                            : 'bg-white hover:bg-[#F8F8F6] border-[#E5E5E5] text-[#1A1A1A]'
                        }`}
                      >
                        {/* Left Thumbnail with zoom preview */}
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg shrink-0 overflow-hidden border border-[#E5E5E5] bg-[#F8F8F6] relative group/img flex items-center justify-center">
                          <img
                            src={hwdImg}
                            alt={hwd.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getHardwareImage(hwd);
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewHardware(hwd);
                              setPreviewHardwareZoom(1);
                            }}
                            className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            title="Preview hardware image"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Content: 2-line layout */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-[13px] sm:text-sm text-[#1A1A1A] flex items-center gap-1.5 truncate">
                              <span className="truncate">{hwd.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#C89211] shrink-0" />}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold font-mono text-[13px] sm:text-sm text-[#C89211]">
                                ₹{itemTotal.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          {/* Line 2: Short Description + (Unit Price if Qty > 1) */}
                          <div className="flex items-center justify-between gap-2 mt-0.5 text-[11px] text-[#666666]">
                            <p className="truncate flex-1">
                              {hwd.description || 'Premium architectural door fitting'}
                            </p>
                            {isSelected && hardwareQty > 1 && (
                              <span className="font-mono text-[10px] text-[#888888] shrink-0">
                                (₹{price} × {hardwareQty})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* FINAL TRANSPARENT QUOTATION BREAKDOWN */}
            {/* --------------------------------------------------------------------- */}
            <div className="p-6 rounded-3xl bg-white border-2 border-[#C89211]/30 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5E5] pb-4">
                <div>
                  <span className="text-xs uppercase tracking-widest font-bold text-[#C89211]">
                    Official Quotation Breakdown
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-black text-[#1A1A1A] mt-0.5">
                    {calculation.doorName}
                  </h3>
                  <div className="text-xs text-[#666666] mt-0.5">
                    Category: <strong className="text-[#1A1A1A]">{calculation.doorCategory || 'Main Door'}</strong> • Size: <strong className="text-[#C89211] font-mono">{calculation.widthInch}" × {calculation.heightInch}" ({calculation.sqFt.toFixed(2)} sq.ft)</strong>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-[#666666]">Estimated Total (Inclusive of all specs):</div>
                  <div className="font-mono text-2xl sm:text-3xl lg:text-4xl font-black text-[#C89211]">
                    ₹{calculation.total.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Itemized Transparent List */}
              <div className="bg-[#F8F8F6] rounded-2xl p-4 border border-[#E5E5E5] divide-y divide-[#E5E5E5] text-xs sm:text-sm">
                {/* 1. Door Price */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-[#1A1A1A]">
                      {calculation.materialIncludedInDoorPrice
                        ? `Door Shutter & Design (${calculation.doorName})`
                        : `Door Design / Craftsmanship (${calculation.doorName})`}
                    </span>
                    <div className="text-[11px] text-[#666666] font-mono">
                      {calculation.hasMissingPrice ? (
                        <span className="text-[#C89211] font-sans font-semibold">
                          Custom workshop quotation required (pricing pending in Admin)
                        </span>
                      ) : calculation.doorPricingType === 'fixed' ? (
                        `Fixed Price Shutter (${calculation.materialName} Wood)`
                      ) : calculation.materialIncludedInDoorPrice ? (
                        calculation.materialAdjustmentPerSqFt !== 0 && calculation.materialAdjustmentPerSqFt !== undefined ? (
                          `${calculation.sqFt.toFixed(2)} sq.ft @ ₹${(calculation.doorBaseRate || 0) + calculation.materialAdjustmentPerSqFt}/sq.ft (Base ₹${calculation.doorBaseRate} + ${calculation.materialName} timber adj.)`
                        ) : (
                          `${calculation.sqFt.toFixed(2)} sq.ft @ ₹${calculation.doorBaseRate}/sq.ft (Solid ${calculation.materialName} Timber)`
                        )
                      ) : (
                        `${calculation.sqFt.toFixed(2)} sq.ft @ ₹${calculation.doorBaseRate}/sq.ft`
                      )}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#C89211]">
                    {calculation.hasMissingPrice
                      ? 'Custom Quote'
                      : `₹${calculation.doorCost.toLocaleString('en-IN')}`}
                  </span>
                </div>

                {/* 2. Material */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-[#1A1A1A]">
                      Wood Material ({calculation.materialName})
                    </span>
                    <div className="text-[11px] text-[#666666] font-mono">
                      {calculation.materialIncludedInDoorPrice ? (
                        <span className="text-[#16803A] font-sans font-medium flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#16803A]" />
                          Included in Door Shutter (All-Inclusive Base Price)
                        </span>
                      ) : (
                        `${calculation.sqFt.toFixed(2)} sq.ft @ ₹${calculation.materialRate}/sq.ft`
                      )}
                    </div>
                  </div>
                  {calculation.materialIncludedInDoorPrice ? (
                    <span className="font-mono font-semibold text-xs text-[#16803A] bg-[#E8F5E9] px-2 py-0.5 rounded border border-[#C8E6C9]">
                      Included (₹0)
                    </span>
                  ) : (
                    <span className="font-mono font-bold text-[#1A1A1A]">
                      ₹{calculation.materialCost.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {/* 3. Polish */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-[#1A1A1A]">
                      Polish / Finish ({calculation.finishName})
                    </span>
                    <div className="text-[11px] text-[#666666] font-mono">
                      {calculation.sqFt.toFixed(2)} sq.ft @ ₹${calculation.finishRate}/sq.ft
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#1A1A1A]">
                    ₹{calculation.finishCost.toLocaleString('en-IN')}
                  </span>
                </div>


                {/* 5. Hardware */}
                <div className="py-2.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-[#1A1A1A]">
                      Hardware & Fitting ({calculation.hardwareName})
                    </span>
                    <div className="text-[11px] text-[#666666]">
                      {calculation.hardwareCost > 0 ? `Qty: ${calculation.hardwareQty} Unit(s)` : 'No hardware'}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#1A1A1A]">
                    ₹{calculation.hardwareCost.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Taxes / Additional if configured */}
                {calculation.additionalCharges > 0 && (
                  <div className="py-2.5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-[#1A1A1A]">
                        {calculation.additionalChargeName} ({settings.additionalChargePercentage}%)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[#666666]">
                      ₹{calculation.additionalCharges.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Message */}
              {saveMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  saveStatus === 'saved' ? 'bg-[#16803A]/10 text-[#16803A] border border-[#16803A]/30' : 'bg-[#C62828]/10 text-[#C62828] border border-[#C62828]/30'
                }`}>
                  {saveStatus === 'saved' ? <CheckCircle2 className="w-4 h-4 text-[#16803A]" /> : <AlertCircle className="w-4 h-4 text-[#C62828]" />}
                  <span>{saveMsg}</span>
                </div>
              )}

              {/* Action Buttons (Section 8 & 9) */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateQuotation}
                  disabled={isGeneratingQuote}
                  className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-[#C89211] to-[#b07d08] hover:opacity-95 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-70"
                >
                  <FileText className="w-5 h-5 text-white" />
                  <span>{isGeneratingQuote ? 'Preparing Official Quotation...' : 'Get Official Quotation PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  title="Direct WhatsApp Enquiry"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enquire on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCalculation}
                  disabled={saveStatus === 'saving'}
                  className="w-full sm:w-auto px-4 py-3.5 rounded-xl bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Save to history"
                >
                  <BookmarkPlus className="w-4 h-4 text-[#C89211]" />
                  <span>{saveStatus === 'saving' ? 'Saving...' : 'Save Estimate'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareQuote}
                  className="w-full sm:w-auto p-3.5 rounded-xl bg-white hover:bg-[#F8F8F6] text-[#666666] border border-[#E5E5E5] text-xs flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                  title="Share breakdown"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Factory Assurance Footer */}
              <div className="pt-3 border-t border-[#E5E5E5] text-[11px] text-[#666666] flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16803A]" />
                  100% Genuine Timber &amp; Seasoning Warranty
                </span>
                <span>
                  Official Factory WhatsApp: <strong className="text-[#C89211]">+91 {settings.whatsappNumber || '78874 12884'}</strong>
                </span>
              </div>
            </div>

            {/* AdMob Adaptive Banner Placement (Below Quotation Summary, never occluding inputs or actions) */}
            <div className="pt-2">
              <AdMobBannerSlot placement="calculator" settings={settings} />
            </div>

          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: FULL IMAGE PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewDoor && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPreviewDoor(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-white border border-[#E5E5E5] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5E5] bg-[#F8F8F6]">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211]">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-[#1A1A1A]">
                    {previewDoor.name}
                  </h3>
                  <div className="text-[11px] text-[#666666] flex items-center gap-2">
                    <span>{previewDoor.category}</span>
                    <span>•</span>
                    <span className="font-mono">ID: {previewDoor.id}</span>
                  </div>
                </div>
              </div>

              {/* Zoom & Close Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#E5E5E5] text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.max(1, previewZoom - 0.5))}
                    className="p-1 hover:text-[#C89211] text-[#666666] cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-[#C89211] font-bold px-1">{previewZoom}x</span>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(Math.min(3, previewZoom + 0.5))}
                    className="p-1 hover:text-[#C89211] text-[#666666] cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewDoor(null)}
                  className="p-1.5 rounded-lg bg-white hover:bg-[#F8F8F6] text-[#666666] hover:text-[#1A1A1A] border border-[#E5E5E5] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Display Area (never cropped, high-res full image) */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-[#F8F8F6] min-h-[360px]">
              <div
                className="transition-transform duration-200"
                style={{ transform: `scale(${previewZoom})` }}
              >
                <img
                  src={previewDoor.images?.[previewImgIdx] || previewDoor.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'}
                  alt={previewDoor.name}
                  className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-[#E5E5E5] select-none bg-white"
                />
              </div>
            </div>

            {/* Modal Bottom Gallery Thumbnails & Selection CTA */}
            <div className="p-4 border-t border-[#E5E5E5] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Additional Photos Selector if present */}
              {previewDoor.images && previewDoor.images.length > 1 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-[10px] text-[#666666] font-semibold mr-1">Views:</span>
                  {previewDoor.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewImgIdx(idx)}
                      className={`w-10 h-14 rounded-md overflow-hidden border transition cursor-pointer shrink-0 ${
                        previewImgIdx === idx ? 'border-[#C89211] ring-2 ring-[#C89211]/40' : 'border-[#E5E5E5] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#666666]">
                  Base Starting Price: <strong className="font-mono text-[#C89211]">₹{previewDoor.startingPrice.toLocaleString('en-IN')}</strong>
                </div>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewDoor(null)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-[#F8F8F6] text-[#666666] border border-[#E5E5E5] text-xs font-semibold transition cursor-pointer"
                >
                  Close &amp; Continue
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDoor(previewDoor);
                    setPreviewDoor(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C89211] to-[#b07d08] hover:opacity-95 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Select this Design for Calculation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Hardware Full Image Preview Modal */}
      {previewHardware && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPreviewHardware(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white border border-[#E5E5E5] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E5E5] bg-[#F8F8F6]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211]">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-[#1A1A1A]">
                    {previewHardware.name}
                  </h3>
                  <div className="text-[11px] text-[#666666]">
                    ₹{previewHardware.price.toLocaleString('en-IN')} • Hardware &amp; Fitting
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#E5E5E5] text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewHardwareZoom(Math.max(1, previewHardwareZoom - 0.5))}
                    className="p-1 hover:text-[#C89211] text-[#666666] cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] text-[#C89211] font-bold px-1">{previewHardwareZoom}x</span>
                  <button
                    type="button"
                    onClick={() => setPreviewHardwareZoom(Math.min(3, previewHardwareZoom + 0.5))}
                    className="p-1 hover:text-[#C89211] text-[#666666] cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewHardware(null)}
                  className="p-1.5 rounded-lg bg-white hover:bg-[#F8F8F6] text-[#666666] hover:text-[#1A1A1A] border border-[#E5E5E5] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-[#F8F8F6] min-h-[300px]">
              <div
                className="transition-transform duration-200"
                style={{ transform: `scale(${previewHardwareZoom})` }}
              >
                <img
                  src={previewHardware.image || getHardwareImage(previewHardware)}
                  alt={previewHardware.name}
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-[#E5E5E5] select-none bg-white"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#E5E5E5] bg-white flex items-center justify-between">
              <p className="text-xs text-[#666666] max-w-sm">
                {previewHardware.description}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedHardwareId(previewHardware.id);
                  setPreviewHardware(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Select this Hardware</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
