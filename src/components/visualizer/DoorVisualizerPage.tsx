import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Box,
  Camera,
  Upload,
  Sparkles,
  MessageCircle,
  FileText,
  Sliders,
  RotateCcw,
  Check,
  ChevronDown,
  Layers,
  Ruler,
  TreePine,
  ShieldCheck,
  Eye,
  Info,
  Search,
  X,
  ArrowUp,
  CheckCircle2,
  Tag,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  Door,
  Category,
  DoorMaterial,
  PolishFinish,
  ChaukhatFrame,
  HardwareItem,
  BusinessSettings,
  CalculationResult,
  CustomDoorFittingState,
  WoodColorTone,
  DoorDesignStyle,
} from '../../types.ts';
import { Door3DScene, Door3DSceneHandle, isDoorDoubleDoor } from './Door3DScene.tsx';
import { EntrancePhotoFitting } from './EntrancePhotoFitting.tsx';
import { LiveARCamera } from './LiveARCamera.tsx';
import { DoorCustomizationStudio } from './DoorCustomizationStudio.tsx';
import { DesignCaptureModal } from './DesignCaptureModal.tsx';
import { resolveImageUrl } from '../../lib/api.ts';
import { getWhatsAppUrl } from '../../lib/contactUtils.ts';
import { AdMobBannerSlot } from '../admob/AdMobBannerSlot.tsx';

interface DoorVisualizerPageProps {
  doors: Door[];
  categories?: Category[];
  initialDoor?: Door | null;
  initialMode?: '3d' | 'photo' | 'live_ar';
  materials: DoorMaterial[];
  finishes: PolishFinish[];
  frames: ChaukhatFrame[];
  hardware: HardwareItem[];
  settings: BusinessSettings;
  onNavigateHome: () => void;
  onNavigateCatalog: () => void;
  onOpenQuotationModal: (calculation: CalculationResult, door: Door) => void;
}

export const DoorVisualizerPage: React.FC<DoorVisualizerPageProps> = ({
  doors,
  categories,
  initialDoor,
  initialMode,
  materials,
  finishes,
  frames,
  hardware,
  settings,
  onNavigateHome,
  onNavigateCatalog,
  onOpenQuotationModal,
}) => {
  // Selected Door
  const [selectedDoor, setSelectedDoor] = useState<Door>(() => {
    return initialDoor || doors[0] || {
      id: 'default-door',
      name: 'Royal Sagwan Carved Door',
      category: 'Sagwan Door',
      description: 'Handcrafted premium Sagwan door',
      material: 'Sagwan (CP Teak)',
      startingPrice: 16000,
      images: ['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'],
      availableSizes: ['36 × 78 inch'],
      featured: true,
      popular: true,
      active: true,
      createdAt: new Date().toISOString(),
    };
  });

  // Visualization Mode: '3d' | 'photo' | 'live_ar'
  const [activeMode, setActiveMode] = useState<'3d' | 'photo' | 'live_ar'>(() => initialMode || '3d');

  // Custom Door Fitting State
  const [fittingState, setFittingState] = useState<CustomDoorFittingState>(() => {
    const defaultMat = materials.find(m => m.name.toLowerCase().includes('sagwan')) || materials[0];
    const defaultFin = finishes.find(f => f.name.toLowerCase().includes('teak')) || finishes[0];
    const defaultFrm = frames.find(f => f.name.toLowerCase().includes('normal')) || frames[0];
    const defaultHwd = hardware[0];
    const isDouble = isDoorDoubleDoor(selectedDoor);

    return {
      doorId: selectedDoor.id,
      woodType: defaultMat ? defaultMat.name : 'Sagwan',
      woodMaterialId: defaultMat ? defaultMat.id : 'mat-1',
      finishId: defaultFin ? defaultFin.id : 'fin-1',
      finishName: defaultFin ? defaultFin.name : 'Teak Polish',
      colorTone: 'golden_teak',
      designStyle: 'carving',
      widthInch: isDouble ? 48 : 36,
      heightInch: 78,
      thicknessInch: 1.5,
      isDoubleDoor: isDouble,
      frameId: defaultFrm ? defaultFrm.id : 'frm-1',
      frameName: defaultFrm ? defaultFrm.name : 'Normal Frame',
      hardwareId: defaultHwd ? defaultHwd.id : 'hwd-1',
      hardwareName: defaultHwd ? defaultHwd.name : 'Single Aldrop',
      hardwareQty: isDouble ? 2 : 1,
      handleStyle: 'brass_royal',
      doorOpenAngle: 0,
      lightingIntensity: 1.0,
    };
  });

  // Refs & Capture States
  const scene3DRef = useRef<Door3DSceneHandle | null>(null);
  const viewerSectionRef = useRef<HTMLDivElement | null>(null);
  const catalogueSectionRef = useRef<HTMLDivElement | null>(null);
  const [doorSnapshotUrl, setDoorSnapshotUrl] = useState<string | null>(null);
  const [capturedModalImage, setCapturedModalImage] = useState<string | null>(null);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [doorSelectorOpen, setDoorSelectorOpen] = useState(false);

  // Catalogue Section States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'name_asc' | 'has_3d'>('recommended');
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyHas3D, setOnlyHas3D] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [showScrollUp, setShowScrollUp] = useState(false);

  // Show "Back to 3D Viewer" button when user scrolls down into catalogue
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowScrollUp(window.scrollY > 420);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter only active doors from existing catalogue
  const availableDoors = useMemo(() => {
    return doors.filter(d => d.active !== false);
  }, [doors]);

  // Extract all categories dynamically from existing catalogue
  const categoryList = useMemo(() => {
    const set = new Set<string>();
    if (categories && categories.length > 0) {
      categories.forEach(c => {
        if (c.name) set.add(c.name.trim());
      });
    }
    availableDoors.forEach(d => {
      if (d.category) set.add(d.category.trim());
    });
    return Array.from(set).filter(Boolean);
  }, [categories, availableDoors]);

  // Filter and Sort catalogue doors
  const filteredCatalogueDoors = useMemo(() => {
    let list = [...availableDoors];

    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(d =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.category && d.category.toLowerCase().includes(q)) ||
        (d.material && d.material.toLowerCase().includes(q)) ||
        (d.id && d.id.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      list = list.filter(d => d.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Featured toggle
    if (onlyFeatured) {
      list = list.filter(d => d.featured || d.popular);
    }

    // 3D Model toggle
    if (onlyHas3D) {
      list = list.filter(d => Boolean(d.model3d?.modelUrl));
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'price_asc') {
        return (a.startingPrice || 0) - (b.startingPrice || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.startingPrice || 0) - (a.startingPrice || 0);
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'has_3d') {
        const aHas = a.model3d?.modelUrl ? 1 : 0;
        const bHas = b.model3d?.modelUrl ? 1 : 0;
        return bHas - aHas;
      }
      // 'recommended' - Popular & Featured first
      const aScore = (a.featured ? 2 : 0) + (a.popular ? 1 : 0);
      const bScore = (b.featured ? 2 : 0) + (b.popular ? 1 : 0);
      return bScore - aScore;
    });

    return list;
  }, [availableDoors, searchQuery, selectedCategory, onlyFeatured, onlyHas3D, sortBy]);

  // Selecting a Catalogue Door
  const handleSelectCatalogueDoor = (door: Door, scrollToViewer = true) => {
    setSelectedDoor(door);
    const isDouble = isDoorDoubleDoor(door);
    setFittingState(prev => ({
      ...prev,
      doorId: door.id,
      isDoubleDoor: isDouble,
      widthInch: isDouble && prev.widthInch < 48 ? 48 : (!isDouble && prev.widthInch > 42 ? 36 : prev.widthInch),
    }));
    setDoorSnapshotUrl(null);

    if (scrollToViewer && viewerSectionRef.current) {
      viewerSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToViewer = () => {
    if (viewerSectionRef.current) {
      viewerSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToCatalogue = () => {
    if (catalogueSectionRef.current) {
      catalogueSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Sync if initialDoor changes
  useEffect(() => {
    if (initialDoor && initialDoor.id !== selectedDoor.id) {
      setSelectedDoor(initialDoor);
      const isDouble = isDoorDoubleDoor(initialDoor);
      setDoorSnapshotUrl(null);
      setFittingState(prev => ({
        ...prev,
        doorId: initialDoor.id,
        isDoubleDoor: isDouble,
        widthInch: isDouble && prev.widthInch < 48 ? 48 : prev.widthInch,
      }));
    }
  }, [initialDoor]);

  // Sync if initialMode changes
  useEffect(() => {
    if (initialMode && initialMode !== activeMode) {
      setActiveMode(initialMode);
    }
  }, [initialMode]);

  // Sync if doors list updates from admin catalogue
  useEffect(() => {
    if (selectedDoor) {
      const updated = doors.find(d => d.id === selectedDoor.id);
      if (updated && updated !== selectedDoor) {
        setSelectedDoor(updated);
      }
    }
  }, [doors]);

  // Reactive Calculation Math (Reuses application's exact formulas)
  const calculation: CalculationResult = useMemo(() => {
    const w = Math.max(12, fittingState.widthInch || 36);
    const h = Math.max(24, fittingState.heightInch || 78);
    const rawSqFt = (w * h) / 144;
    const sqFt = Math.round(rawSqFt * 100) / 100;

    const mat = materials.find(m => m.id === fittingState.woodMaterialId) || materials[0];
    const materialRate = mat ? mat.ratePerSqFt : 800;
    const materialCost = Math.round(sqFt * materialRate);

    // Polish, Frame, and Hardware options are removed - no additional charges
    const finishCost = 0;
    const finishRate = 0;
    const frameCost = 0;
    const hardwareCost = 0;

    const subtotal = materialCost;
    const taxPercent = Number(settings?.additionalChargePercentage) || 0;
    const additionalCharges = Math.round((subtotal * taxPercent) / 100);
    const total = subtotal + additionalCharges;

    return {
      sqFt,
      widthInch: w,
      heightInch: h,
      doorCost: 0,
      materialIncludedInDoorPrice: false,
      materialCost,
      materialRate,
      materialName: mat ? mat.name : fittingState.woodType,
      finishCost,
      finishRate,
      finishName: 'Natural Wood',
      frameCost,
      frameName: 'Shutter Only',
      hardwareCost,
      hardwarePrice: 0,
      hardwareQty: 0,
      hardwareName: 'None',
      subtotal,
      additionalCharges,
      additionalChargeName: settings?.additionalChargeName || 'Taxes',
      total,
      currency: 'INR',
    };
  }, [fittingState, materials, settings]);

  // Handle Capture Action
  const handleCaptureDesign = () => {
    if (activeMode === '3d') {
      const snap = scene3DRef.current?.captureCanvasImage();
      if (snap) {
        setDoorSnapshotUrl(snap);
        setCapturedModalImage(snap);
        setIsCaptureModalOpen(true);
      }
    }
  };

  // Switch to Entrance Photo Mode with fresh 3D snapshot
  const handleSwitchToPhoto = () => {
    const snap = scene3DRef.current?.captureCanvasImage();
    if (snap) {
      setDoorSnapshotUrl(snap);
    }
    setActiveMode('photo');
  };

  // Switch to Live AR Mode with fresh 3D snapshot
  const handleSwitchToAR = () => {
    const snap = scene3DRef.current?.captureCanvasImage();
    if (snap) {
      setDoorSnapshotUrl(snap);
    }
    setActiveMode('live_ar');
  };

  // WhatsApp Enquiry Trigger
  const handleSendWhatsApp = () => {
    const text = `Hello Jai Hanuman Door,
I customized "${selectedDoor.name}" (Catalogue ID: ${selectedDoor.id}) in your 3D & AR Fitting Studio:
- Wood Species: ${fittingState.woodType}
- Size: ${fittingState.widthInch}" × ${fittingState.heightInch}" (${calculation.sqFt} sq.ft)
- Thickness: ${fittingState.thicknessInch}"
- Estimated Factory Price: ₹${calculation.total.toLocaleString('en-IN')}

Please share final pricing, delivery schedule, and site measurement assistance for my home entrance.`;

    const url = getWhatsAppUrl(settings.whatsappNumber || '7887412884', text);
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] pb-32 pt-4 sm:pt-6">
      {/* Top Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#666666] hover:text-[#C89211] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </button>
            <span className="text-[#E5E5E5]">•</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C89211]" />
              <span>3D &amp; AR Fitting Studio</span>
            </span>
          </div>

          {/* Door Selector Button */}
          <div className="relative">
            <button
              onClick={() => setDoorSelectorOpen(!doorSelectorOpen)}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E5] text-xs sm:text-sm font-semibold flex items-center gap-2 hover:border-[#C89211]/40 transition shadow-sm text-[#1A1A1A]"
            >
              <Box className="w-4 h-4 text-[#C89211]" />
              <span className="max-w-[150px] sm:max-w-[220px] truncate">{selectedDoor.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />
            </button>

            {/* Door Dropdown Menu */}
            {doorSelectorOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#666666] uppercase tracking-wider">
                  Select Door Design
                </div>
                {doors.map(d => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setSelectedDoor(d);
                      setFittingState(prev => ({ ...prev, doorId: d.id }));
                      setDoorSelectorOpen(false);
                    }}
                    className={`w-full p-2 rounded-xl flex items-center gap-3 text-left transition ${
                      d.id === selectedDoor.id
                        ? 'bg-[#FFF7E3] border border-[#C89211]/50 text-[#1A1A1A]'
                        : 'hover:bg-[#F8F8F6] text-[#666666]'
                    }`}
                  >
                    <img
                      src={resolveImageUrl(d.image || d.images?.[0], 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80')}
                      alt={d.name}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80') {
                          target.src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80';
                        }
                      }}
                      className="w-10 h-14 object-cover rounded-lg bg-[#F8F8F6] shrink-0 border border-[#E5E5E5]"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold truncate text-[#1A1A1A]">{d.name}</div>
                      <div className="text-[11px] text-[#C89211] font-mono mt-0.5">
                        From ₹{d.startingPrice?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div ref={viewerSectionRef} id="visualizer-main-viewer-section" className="max-w-7xl mx-auto px-4 sm:px-6 scroll-mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Visualizer Viewport (Col 7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* View Mode Switcher Pills */}
            <div className="flex items-center gap-2 p-1 bg-[#F8F8F6] border border-[#E5E5E5] rounded-2xl shadow-sm">
              <button
                onClick={() => setActiveMode('3d')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeMode === '3d'
                    ? 'bg-[#C89211] text-white shadow-md'
                    : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-white'
                }`}
              >
                <Box className="w-4 h-4" />
                <span>3D Studio</span>
              </button>

              <button
                onClick={handleSwitchToPhoto}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeMode === 'photo'
                    ? 'bg-[#C89211] text-white shadow-md'
                    : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Fit in Entrance</span>
              </button>

              <button
                onClick={handleSwitchToAR}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeMode === 'live_ar'
                    ? 'bg-[#C89211] text-white shadow-md'
                    : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Live AR 3D</span>
              </button>
            </div>

            {/* Active Viewport Container */}
            <div className="w-full relative shadow-md rounded-2xl border border-[#E5E5E5] overflow-hidden bg-[#F8F8F6]">
              {activeMode === '3d' && (
                <Door3DScene
                  ref={scene3DRef}
                  door={selectedDoor}
                  fittingState={fittingState}
                  onOpenAngleChange={angle => setFittingState(prev => ({ ...prev, doorOpenAngle: angle }))}
                  className="h-[460px] sm:h-[540px]"
                />
              )}

              {activeMode === 'photo' && (
                <EntrancePhotoFitting
                  door={selectedDoor}
                  fittingState={fittingState}
                  doorSnapshotUrl={doorSnapshotUrl}
                  onCaptureComposite={dataUrl => {
                    setCapturedModalImage(dataUrl);
                    setIsCaptureModalOpen(true);
                  }}
                  className="min-h-[460px]"
                />
              )}

              {activeMode === 'live_ar' && (
                <LiveARCamera
                  door={selectedDoor}
                  allDoors={doors.filter(d => d.active !== false)}
                  onSelectDoor={d => {
                    setSelectedDoor(d);
                    setFittingState(prev => ({ ...prev, doorId: d.id }));
                  }}
                  fittingState={fittingState}
                  onUpdateFittingState={updated => setFittingState(prev => ({ ...prev, ...updated }))}
                  doorSnapshotUrl={doorSnapshotUrl}
                  onCaptureComposite={dataUrl => {
                    setCapturedModalImage(dataUrl);
                    setIsCaptureModalOpen(true);
                  }}
                  onFallbackToPhotoUpload={() => setActiveMode('photo')}
                  onOpenQuotation={() => onOpenQuotationModal(calculation, selectedDoor)}
                  className="min-h-[460px]"
                />
              )}
            </div>

            {/* Viewport Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-[#E5E5E5] rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                {activeMode === '3d' && (
                  <button
                    onClick={handleCaptureDesign}
                    className="py-2.5 px-4 rounded-xl bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] border border-[#E5E5E5] font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-[#C89211]" />
                    <span>View Specifications</span>
                  </button>
                )}

                <button
                  onClick={handleSendWhatsApp}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              </div>

              {/* Get Official Quotation CTA */}
              <button
                onClick={() => onOpenQuotationModal(calculation, selectedDoor)}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#C89211] to-[#b07d08] hover:opacity-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Get Quotation for This Design →</span>
              </button>
            </div>

            {/* Quick Explore Anchor Bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-2xl text-xs text-[#666666]">
              <div className="flex items-center gap-2 truncate">
                <Layers className="w-3.5 h-3.5 text-[#C89211] shrink-0" />
                <span className="truncate">
                  Selected: <strong className="text-[#1A1A1A]">{selectedDoor.name}</strong> • {availableDoors.length} designs in catalogue
                </span>
              </div>
              <button
                type="button"
                onClick={handleScrollToCatalogue}
                className="text-[#C89211] hover:text-[#b07d08] font-bold flex items-center gap-1 shrink-0 ml-2 transition cursor-pointer"
              >
                <span>Explore More Designs ↓</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Customization Studio (Col 5) */}
          <div className="lg:col-span-5 bg-white border border-[#E5E5E5] rounded-2xl p-5 sm:p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3 mb-5">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#C89211]" />
                <span>Customization Studio</span>
              </h2>

              <button
                onClick={() => {
                  setFittingState(prev => ({
                    ...prev,
                    widthInch: 36,
                    heightInch: 78,
                    colorTone: 'golden_teak',
                    designStyle: 'carving',
                    doorOpenAngle: 0,
                  }));
                }}
                className="text-xs text-[#666666] hover:text-[#C89211] flex items-center gap-1 transition"
                title="Reset customizations to default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Customization Studio Controls */}
            <DoorCustomizationStudio
              door={selectedDoor}
              fittingState={fittingState}
              onChange={updated => setFittingState(prev => ({ ...prev, ...updated }))}
              materials={materials}
              estimatedPrice={calculation.total}
            />
          </div>
        </div>
      </div>

      {/* SECTION: Explore More Catalogue Designs */}
      <section
        id="catalogue-designs-section"
        ref={catalogueSectionRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 sm:mt-14 scroll-mt-6"
      >
        <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-3xl p-4 sm:p-7 shadow-md">
          {/* Section Heading */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E5E5E5]">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 uppercase tracking-wider mb-2">
                <Layers className="w-3.5 h-3.5 text-[#C89211]" />
                <span>Jai Hanuman Master Catalog • All Authentic Designs</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
                Explore More Catalogue Designs
              </h2>
              <p className="text-[#666666] text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Tap any door to instantly load it into the 3D Viewer, fit onto your home entrance photo, test genuine wood finishes, and calculate real factory quotations.
              </p>
            </div>

            {/* Currently Active in 3D Studio Indicator */}
            <div className="flex items-center gap-3 bg-white border border-[#C89211]/40 rounded-2xl p-2.5 px-3.5 self-start md:self-auto shrink-0 shadow-sm">
              <img
                src={resolveImageUrl(selectedDoor.image || selectedDoor.images?.[0], 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80')}
                alt={selectedDoor.name}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80') {
                    target.src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80';
                  }
                }}
                className="w-9 h-12 object-cover rounded-lg bg-[#F8F8F6] shrink-0 border border-[#C89211]/40"
              />
              <div className="text-left">
                <div className="text-[10px] font-bold text-[#C89211] uppercase tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16803A] animate-pulse"></span>
                  Active in 3D Studio
                </div>
                <div className="text-xs font-bold text-[#1A1A1A] max-w-[140px] sm:max-w-[180px] truncate">
                  {selectedDoor.name}
                </div>
                <button
                  type="button"
                  onClick={handleScrollToViewer}
                  className="text-[11px] text-[#666666] hover:text-[#C89211] font-medium underline mt-0.5 transition cursor-pointer"
                >
                  Scroll up to view ↑
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar & Filter Controls */}
          <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input
                  id="visualizer-catalog-search"
                  type="text"
                  placeholder="Search door name, carving, wood type (e.g. Sagwan, Modern)..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(12);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-[#1A1A1A] placeholder:text-[#666666] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/40 focus:border-[#C89211] transition shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setVisibleCount(12);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#1A1A1A] p-1"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Controls: Sorting & Filter Toggles */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                {/* Sort dropdown */}
                <select
                  id="visualizer-catalog-sort"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl border border-[#E5E5E5] bg-white text-[#1A1A1A] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C89211]/30 cursor-pointer shadow-sm"
                >
                  <option value="recommended">Featured &amp; Popular</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="has_3d">3D CAD Model First</option>
                </select>

                {/* Featured toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setOnlyFeatured(!onlyFeatured);
                    setVisibleCount(12);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                    onlyFeatured
                      ? 'bg-[#FFF7E3] text-[#C89211] border-[#C89211]/50'
                      : 'bg-white text-[#666666] border-[#E5E5E5] hover:text-[#1A1A1A] hover:bg-stone-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C89211]" />
                  <span>Featured</span>
                </button>

                {/* 3D Model Only toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setOnlyHas3D(!onlyHas3D);
                    setVisibleCount(12);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                    onlyHas3D
                      ? 'bg-emerald-50 text-[#16803A] border-emerald-300'
                      : 'bg-white text-[#666666] border-[#E5E5E5] hover:text-[#1A1A1A] hover:bg-stone-50'
                  }`}
                >
                  <Box className="w-3.5 h-3.5 text-[#16803A]" />
                  <span>3D CAD Only</span>
                </button>
              </div>
            </div>

            {/* Category Filter Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-2 no-scrollbar scroll-smooth">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setVisibleCount(12);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'all'
                    ? 'bg-[#C89211] text-white shadow-sm'
                    : 'bg-white text-[#666666] border border-[#E5E5E5] hover:text-[#1A1A1A]'
                }`}
              >
                <span>All Doors</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-mono">
                  {availableDoors.length}
                </span>
              </button>

              {categoryList.map(cat => {
                const count = availableDoors.filter(d => d.category?.toLowerCase() === cat.toLowerCase()).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setVisibleCount(12);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-[#C89211] text-white shadow-sm'
                        : 'bg-white text-[#666666] border border-[#E5E5E5] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <span>{cat}</span>
                    {count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-100 font-mono text-[#1A1A1A]">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between text-xs text-[#666666] px-1 pt-1">
              <div>
                Showing <strong className="text-[#1A1A1A]">{Math.min(visibleCount, filteredCatalogueDoors.length)}</strong> of{' '}
                <strong className="text-[#1A1A1A]">{filteredCatalogueDoors.length}</strong> designs
                {(searchQuery || selectedCategory !== 'all' || onlyFeatured || onlyHas3D) && (
                  <span className="text-[#C89211] ml-1.5">(Filtered)</span>
                )}
              </div>

              {(searchQuery || selectedCategory !== 'all' || onlyFeatured || onlyHas3D) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setOnlyFeatured(false);
                    setOnlyHas3D(false);
                    setVisibleCount(12);
                  }}
                  className="text-[#C89211] hover:underline font-semibold transition"
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>

          {/* CATALOGUE GRID */}
          <div className="mt-5">
            {filteredCatalogueDoors.length === 0 ? (
              <div className="text-center py-14 px-4 bg-white rounded-2xl border border-[#E5E5E5]">
                <Box className="w-12 h-12 text-[#666666] mx-auto mb-3" />
                <h3 className="font-serif text-lg font-bold text-[#1A1A1A] mb-1">No designs found</h3>
                <p className="text-[#666666] text-xs sm:text-sm max-w-md mx-auto mb-4">
                  We couldn't find any door matching "{searchQuery}". Try searching for Sagwan, Carved, Modern, or clear filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setOnlyFeatured(false);
                    setOnlyHas3D(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#C89211] hover:opacity-95 text-white font-bold text-xs transition cursor-pointer"
                >
                  Show All Available Doors
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {filteredCatalogueDoors.slice(0, visibleCount).map(door => {
                  const isCurrent = door.id === selectedDoor.id;
                  const hasGlb = Boolean(door.model3d?.modelUrl);

                  return (
                    <div
                      key={door.id}
                      onClick={() => handleSelectCatalogueDoor(door, true)}
                      className={`group relative rounded-2xl border p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FFF7E3] border-[#C89211] ring-2 ring-[#C89211]/50 shadow-md'
                          : 'bg-white border-[#E5E5E5] hover:border-[#C89211]/40 hover:shadow-md'
                      }`}
                    >
                      {/* Image Box */}
                      <div>
                        <div className="aspect-[3/4] relative overflow-hidden bg-[#F8F8F6] rounded-xl mb-2.5 border border-[#E5E5E5]">
                          <img
                            src={resolveImageUrl(door.image || door.images?.[0], 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80')}
                            alt={door.name}
                            loading="lazy"
                            draggable={false}
                            onContextMenu={e => e.preventDefault()}
                            onError={e => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80';
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none pointer-events-none"
                          />

                          {/* Top-Left Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                            {isCurrent && (
                              <span className="bg-[#C89211] text-white font-bold text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>In 3D Studio</span>
                              </span>
                            )}
                            {door.featured && !isCurrent && (
                              <span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shadow">
                                Featured
                              </span>
                            )}
                          </div>

                          {/* Top-Right Badge: 3D CAD or 2.5D Photo */}
                          <div className="absolute top-2 right-2 z-10">
                            {hasGlb ? (
                              <span className="bg-white/95 border border-emerald-500/60 text-[#16803A] font-semibold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-md shadow-sm">
                                <Box className="w-3 h-3 text-[#16803A]" />
                                <span>3D CAD</span>
                              </span>
                            ) : (
                              <span className="bg-white/90 border border-[#E5E5E5] text-[#666666] text-[10px] px-2 py-0.5 rounded-md backdrop-blur-md">
                                2.5D Real Photo
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Door Title & Category */}
                        <div className="space-y-1">
                          <h3 className="font-serif font-bold text-xs sm:text-sm text-[#1A1A1A] group-hover:text-[#C89211] transition line-clamp-1">
                            {door.name}
                          </h3>
                          <div className="text-[11px] text-[#666666] truncate flex items-center gap-1">
                            <span>{door.category || 'Sagwan Door'}</span>
                            {door.material && (
                              <>
                                <span>•</span>
                                <span className="truncate">{door.material}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Price & Action Button */}
                      <div className="mt-3 pt-2.5 border-t border-[#E5E5E5] space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-[#666666] uppercase tracking-wider font-semibold">Starting</span>
                          <span className="text-[#C89211] font-mono font-bold text-xs sm:text-sm">
                            ₹{(door.startingPrice || 14000).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Button: View in My Home */}
                        <button
                          type="button"
                          id={`visualizer-door-select-${door.id}`}
                          onClick={e => {
                            e.stopPropagation();
                            handleSelectCatalogueDoor(door, true);
                          }}
                          className={`w-full py-2 px-2 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] ${
                            isCurrent
                              ? 'bg-[#C89211] text-white shadow-sm'
                              : 'bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] border border-[#E5E5E5] hover:border-[#C89211] shadow-sm'
                          }`}
                        >
                          <Box className="w-3.5 h-3.5" />
                          <span>{isCurrent ? 'Viewing in 3D ↑' : 'View in My Home'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination / Show More Designs */}
            {filteredCatalogueDoors.length > visibleCount && (
              <div className="mt-8 text-center flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setVisibleCount(prev => prev + 12)}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] font-bold text-xs sm:text-sm border border-[#E5E5E5] transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Show More Designs ({filteredCatalogueDoors.length - visibleCount} remaining)</span>
                  <ChevronDown className="w-4 h-4 text-[#C89211]" />
                </button>

                <button
                  type="button"
                  onClick={() => setVisibleCount(filteredCatalogueDoors.length)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-[#F8F8F6] text-[#666666] hover:text-[#1A1A1A] font-semibold text-xs border border-[#E5E5E5] transition cursor-pointer shadow-sm"
                >
                  Show All {filteredCatalogueDoors.length} Doors
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AdMob Adaptive Banner Placement (3D Studio Bottom) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 mb-2">
        <AdMobBannerSlot placement="visualizer" settings={settings} />
      </div>

      {/* Floating "Back to 3D Viewer" Button for Mobile / Long Scrolling */}
      {showScrollUp && (
        <div className="fixed bottom-[84px] right-4 z-40 sm:bottom-6 sm:right-6 animate-fade-in">
          <button
            type="button"
            onClick={handleScrollToViewer}
            className="px-3.5 py-2 rounded-full bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs shadow-xl flex items-center gap-1.5 border border-[#C89211]/40 backdrop-blur-md cursor-pointer transition hover:scale-105 active:scale-95"
            title="Scroll up to 3D Studio"
          >
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Back to 3D Studio</span>
            <span className="sm:hidden">3D Viewer ↑</span>
          </button>
        </div>
      )}

      {/* Custom Design & Specification Details Modal */}
      <DesignCaptureModal
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        door={selectedDoor}
        fittingState={fittingState}
        estimatedPrice={calculation.total}
        capturedImageUrl={capturedModalImage}
        officialWhatsApp={settings.whatsappNumber || '7887412884'}
        onOpenQuotation={() => onOpenQuotationModal(calculation, selectedDoor)}
      />
    </div>
  );
};
