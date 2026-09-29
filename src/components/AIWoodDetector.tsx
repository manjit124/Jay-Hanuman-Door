import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Camera,
  Sparkles,
  TreePine,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  MessageCircle,
  ChevronRight,
  Info,
  CheckCircle2,
  HelpCircle,
  X,
  Plus,
  RefreshCw,
  Eye,
  Sliders,
  FileSearch,
  BookOpen,
  Layers,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AIWoodAnalysisResult, BusinessSettings } from '../types.ts';
import { detectWoodFromImage, fetchWoodSpeciesGuide } from '../lib/api.ts';
import { getWhatsAppUrl } from '../lib/contactUtils.ts';

interface AIWoodDetectorProps {
  settings?: BusinessSettings;
  onNavigateToCatalog?: () => void;
  onNavigateToCalculator?: () => void;
  onNavigateToContact?: () => void;
}

// Structured slots for high-accuracy multi-image wood identification
export interface WoodScanSlots {
  fullDoor: string | null;
  grainCloseup: string | null;
  unpolishedEdge: string | null;
  endGrain: string | null;
}

export const AIWoodDetector: React.FC<AIWoodDetectorProps> = ({
  settings,
  onNavigateToCatalog,
  onNavigateToCalculator,
  onNavigateToContact,
}) => {
  // Multi-image slots state
  const [slots, setSlots] = useState<WoodScanSlots>({
    fullDoor: null,
    grainCloseup: null,
    unpolishedEdge: null,
    endGrain: null,
  });

  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);
  const [result, setResult] = useState<AIWoodAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showComparisonGuide, setShowComparisonGuide] = useState<boolean>(false);
  const [selectedGuideSpecies, setSelectedGuideSpecies] = useState<string>('Sagwan (Teak)');
  const [guideProfiles, setGuideProfiles] = useState<Record<string, any>>({});

  // Hidden file input refs for each slot
  const fullDoorInputRef = useRef<HTMLInputElement>(null);
  const grainCloseupInputRef = useRef<HTMLInputElement>(null);
  const unpolishedEdgeInputRef = useRef<HTMLInputElement>(null);
  const endGrainInputRef = useRef<HTMLInputElement>(null);

  // Analysis steps for loading animation
  const SCAN_STEPS = [
    'Darwaze aur lakdi ki photo load ho gayi hai...',
    'Grain direction aur longitudinal lines ka vishleshan ho raha hai...',
    'Ring-porous vs Diffuse-porous cellular pore distribution scan ho rahi hai...',
    'Surface polish, PU coat, tinted stain aur natural oiliness check ho rahi hai...',
    'Sagwan (Teak), Saal, Sheesham aur Jungle Wood ke anatomical data se match kiya ja raha hai...',
  ];

  // Fetch botanical timber comparison guide
  useEffect(() => {
    fetchWoodSpeciesGuide()
      .then(profiles => setGuideProfiles(profiles))
      .catch(err => console.warn('Could not load timber guide:', err));
  }, []);

  // Helper to optimize photo: resizes to max 1600px with high smoothing to protect grain while keeping payload ~350KB
  const optimizeImageForAnalysis = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        reject(new Error('Kripya keval JPG, JPEG, PNG ya WEBP photo upload karein.'));
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        reject(new Error('Photo size 25MB se kam hona chahiye.'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Photo read karne mein error aayi.'));
      reader.onload = (e) => {
        const rawResult = e.target?.result as string;
        if (!rawResult) {
          reject(new Error('Photo data empty hai.'));
          return;
        }

        const img = new Image();
        img.onerror = () => resolve(rawResult);
        img.onload = () => {
          try {
            const MAX_DIM = 1600;
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (width > MAX_DIM || height > MAX_DIM) {
              if (width > height) {
                height = Math.round((height * MAX_DIM) / width);
                width = MAX_DIM;
              } else {
                width = Math.round((width * MAX_DIM) / height);
                height = MAX_DIM;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawResult);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(optimizedDataUrl);
          } catch {
            resolve(rawResult);
          }
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    });
  };

  // Slot file selection handler
  const handleSlotSelect = async (
    slotKey: keyof WoodScanSlots,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await optimizeImageForAnalysis(file);
      setSlots(prev => ({ ...prev, [slotKey]: dataUrl }));
      setResult(null);
    } catch (err: any) {
      setError(err.message || 'Photo upload nahi ho saki.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveSlot = (slotKey: keyof WoodScanSlots) => {
    setSlots(prev => ({ ...prev, [slotKey]: null }));
  };

  const hasAnyPhoto = Boolean(slots.fullDoor || slots.grainCloseup || slots.unpolishedEdge || slots.endGrain);

  // Trigger analysis
  const handleStartAnalysis = async () => {
    if (analyzing) return;

    if (!hasAnyPhoto) {
      setError('Kripya kam se kam ek darwaze ya lakdi ki photo upload karein.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setScanStepIndex(0);

    const interval = setInterval(() => {
      setScanStepIndex(prev => (prev + 1) % SCAN_STEPS.length);
    }, 1400);

    try {
      const activeSlots: { fullDoor?: string; grainCloseup?: string; unpolishedEdge?: string; endGrain?: string } = {};
      if (slots.fullDoor) activeSlots.fullDoor = slots.fullDoor;
      if (slots.grainCloseup) activeSlots.grainCloseup = slots.grainCloseup;
      if (slots.unpolishedEdge) activeSlots.unpolishedEdge = slots.unpolishedEdge;
      if (slots.endGrain) activeSlots.endGrain = slots.endGrain;

      // Primary fallback image for backward compatibility
      const primaryImg = slots.fullDoor || slots.grainCloseup || slots.unpolishedEdge || slots.endGrain || '';

      const analysisResult = await detectWoodFromImage({
        image: primaryImg,
        slots: activeSlots,
      });

      clearInterval(interval);
      setResult(analysisResult);

      setTimeout(() => {
        const el = document.getElementById('wood-analysis-result');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      clearInterval(interval);
      setError(
        err.message ||
          'Lakdi pehchanne mein samasya aayi. Kripya thodi der baad ya kisi doosri saaf photo ke sath prayas karein.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Reset all slots
  const handleReset = () => {
    setSlots({
      fullDoor: null,
      grainCloseup: null,
      unpolishedEdge: null,
      endGrain: null,
    });
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Resolved WhatsApp Link
  const expertNumber = settings?.whatsappNumber || '7887412884';
  const expertMessage =
    result?.likely_wood_type && !result.likely_wood_type.toLowerCase().includes('could not')
      ? `Namaste Jai Hanuman Door, maine AI Wood Detector se apne darwaze ki photo scan ki hai. Result: "${result.likely_wood_type}" (Confidence: ${result.confidence_level}). Kripya lakdi ki sahi pehchan aur quotation dene mein madad karein.`
      : 'Namaste Jai Hanuman Door, maine AI Wood Detector se apne darwaze ki lakdi analyze ki hai. Kripya iski pehchan aur quotation mein madad karein.';
  const whatsappUrl = getWhatsAppUrl(expertNumber, expertMessage);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>AI Wood Detector – Lakdi Ki Pehchan</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-stone-100 tracking-tight">
            Aapke Darwaze Ki Lakdi Kaun Si Hai?
          </h1>

          <p className="text-stone-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Darwaze ki photo upload karein aur multi-feature visual AI se lakdi ke baare mein jaanein. Grains, pores,
            interlock pattern, surface finish aur natural oiliness ka rigorous botanical vishleshan.
          </p>

          {/* Privacy & Honesty Banner */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-stone-900/90 border border-stone-800 text-[12px] text-stone-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Privacy Safe (In-memory scan)</span>
            </span>
            <span className="text-stone-600">•</span>
            <span className="text-amber-300">Sagwan vs Sal vs Sheesham Comparison</span>
            <span className="text-stone-600">•</span>
            <span className="text-stone-400">No False Claims</span>
          </div>
        </div>

        {/* Action Toggle: Open Interactive Timber Comparison Guide */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowComparisonGuide(!showComparisonGuide)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium transition-all shadow-md"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>{showComparisonGuide ? 'Lakdi Pehchan Guide Band Karein' : 'Lakdi Pehchan Nirdeshika (Comparison Guide) Dekhein'}</span>
            {showComparisonGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* INTERACTIVE WOOD COMPARISON GUIDE DRAWER */}
        {showComparisonGuide && (
          <div className="bg-stone-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-3">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 flex items-center gap-2">
                  <TreePine className="w-5 h-5 text-amber-400" />
                  <span>Wood Species Visual Comparison Guide</span>
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Indian timber categories ka visual anatomical comparison. Sahi pehchan ke mukhya sanket.
                </p>
              </div>

              {/* Species Tabs */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Sagwan (Teak)',
                  'Saal (Sal)',
                  'Sheesham',
                  'Jungle Wood',
                  'Deodar',
                  'Plywood',
                  'Veneered Wood',
                ].map(sp => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSelectedGuideSpecies(sp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedGuideSpecies === sp
                        ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    {sp.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Content */}
            {guideProfiles[selectedGuideSpecies] ? (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-serif text-lg font-bold text-amber-300">
                      {guideProfiles[selectedGuideSpecies].speciesName}
                    </span>
                    {guideProfiles[selectedGuideSpecies].botanicalName && (
                      <span className="text-xs italic text-stone-400">
                        Botanical: {guideProfiles[selectedGuideSpecies].botanicalName}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-300 leading-relaxed">
                    {guideProfiles[selectedGuideSpecies].hindiSummary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Grain &amp; Pores
                    </span>
                    <p className="text-stone-300 text-xs">
                      <strong>Porosity:</strong> {guideProfiles[selectedGuideSpecies].porosityType}
                    </p>
                    <p className="text-stone-300 text-xs leading-relaxed">
                      {guideProfiles[selectedGuideSpecies].poreStructureAndTyloses}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Texture &amp; Natural Color
                    </span>
                    <p className="text-stone-300 text-xs leading-relaxed">
                      {guideProfiles[selectedGuideSpecies].naturalColorHeartwood}
                    </p>
                    <p className="text-stone-400 text-xs italic">
                      {guideProfiles[selectedGuideSpecies].textureAndTactility}
                    </p>
                  </div>
                </div>

                {/* Traps & Imitation Warnings */}
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-200 text-xs space-y-1.5">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Imitation &amp; False Selling Traps
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-stone-300">
                    {guideProfiles[selectedGuideSpecies].commonImitationRisks?.map((risk: string, idx: number) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-xs text-stone-400 py-4 text-center">
                Loading timber profile details...
              </div>
            )}
          </div>
        )}

        {/* MULTI-IMAGE UPLOAD SLOTS SECTION */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-800 gap-2">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-100 flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                <span>Upload Door &amp; Wood Photos</span>
              </h2>
              <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
                Zyada accuracy ke liye alag-alag angles ki photo dein. Pores aur unpolished hisse se AI behtar pehchan pata hai.
              </p>
            </div>
            {hasAnyPhoto && (
              <button
                type="button"
                onClick={handleReset}
                disabled={analyzing}
                className="text-xs text-stone-400 hover:text-amber-400 flex items-center gap-1 self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* 4 DEDICATED SLOTS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Slot 1: Full Door Photo (Required) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 font-bold text-[10px] flex items-center justify-center">1</span>
                  <span>Full Door View (Zaroori)</span>
                </span>
                <span className="text-[11px] text-amber-400 font-medium">Main Photo</span>
              </div>

              {slots.fullDoor ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-amber-500/50 group bg-stone-950">
                  <img src={slots.fullDoor} alt="Full door" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot('fullDoor')}
                    disabled={analyzing}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 text-stone-300 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-stone-900/90 text-amber-300 border border-stone-800">
                    Full View Added
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fullDoorInputRef.current?.click()}
                  disabled={analyzing}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-stone-700 hover:border-amber-500/60 bg-stone-950/40 hover:bg-stone-950 flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-stone-200 transition-all p-4 group"
                >
                  <Camera className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-stone-300">Poore Darwaze Ki Photo Lein</span>
                  <span className="text-[11px] text-stone-500">Frame aur door panel dono dikhein</span>
                </button>
              )}
              <input
                ref={fullDoorInputRef}
                type="file"
                accept="image/*"
                onChange={e => handleSlotSelect('fullDoor', e)}
                className="hidden"
              />
            </div>

            {/* Slot 2: Close-up Grain & Pores (Recommended) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 font-bold text-[10px] flex items-center justify-center">2</span>
                  <span>Grain &amp; Pores Close-up</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">Bohot Madadgar</span>
              </div>

              {slots.grainCloseup ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-amber-500/50 group bg-stone-950">
                  <img src={slots.grainCloseup} alt="Grain closeup" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot('grainCloseup')}
                    disabled={analyzing}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 text-stone-300 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-stone-900/90 text-emerald-300 border border-stone-800">
                    Grain Close-up Added
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => grainCloseupInputRef.current?.click()}
                  disabled={analyzing}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-stone-700 hover:border-amber-500/60 bg-stone-950/40 hover:bg-stone-950 flex flex-col items-center justify-center gap-2 text-stone-400 hover:text-stone-200 transition-all p-4 group"
                >
                  <Eye className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-stone-300">Pores &amp; Texture Nazdeek Se</span>
                  <span className="text-[11px] text-stone-500">10 se 15 cm doori se saaf grain photo</span>
                </button>
              )}
              <input
                ref={grainCloseupInputRef}
                type="file"
                accept="image/*"
                onChange={e => handleSlotSelect('grainCloseup', e)}
                className="hidden"
              />
            </div>

            {/* Slot 3: Unpolished / Bare Edge (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-stone-700 text-stone-200 font-bold text-[10px] flex items-center justify-center">3</span>
                  <span>Unpolished / Bina Polish Ka Hissa</span>
                </span>
                <span className="text-[11px] text-stone-400">Optional</span>
              </div>

              {slots.unpolishedEdge ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-amber-500/50 group bg-stone-950">
                  <img src={slots.unpolishedEdge} alt="Unpolished edge" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot('unpolishedEdge')}
                    disabled={analyzing}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 text-stone-300 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-stone-900/90 text-stone-300 border border-stone-800">
                    Unpolished Edge Added
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => unpolishedEdgeInputRef.current?.click()}
                  disabled={analyzing}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-stone-800 hover:border-amber-500/50 bg-stone-950/30 hover:bg-stone-950 flex flex-col items-center justify-center gap-2 text-stone-500 hover:text-stone-300 transition-all p-4 group"
                >
                  <Layers className="w-6 h-6 text-stone-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-stone-300">Piche Ka Ya Unpolished Kinara</span>
                  <span className="text-[11px] text-stone-500">Polish ke bina asli lakdi ka rang</span>
                </button>
              )}
              <input
                ref={unpolishedEdgeInputRef}
                type="file"
                accept="image/*"
                onChange={e => handleSlotSelect('unpolishedEdge', e)}
                className="hidden"
              />
            </div>

            {/* Slot 4: End-Grain / Cut Edge (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-stone-700 text-stone-200 font-bold text-[10px] flex items-center justify-center">4</span>
                  <span>End-Grain / Top-Bottom Edge</span>
                </span>
                <span className="text-[11px] text-stone-400">Optional</span>
              </div>

              {slots.endGrain ? (
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-amber-500/50 group bg-stone-950">
                  <img src={slots.endGrain} alt="End grain" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot('endGrain')}
                    disabled={analyzing}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-900/80 text-stone-300 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-stone-900/90 text-stone-300 border border-stone-800">
                    End-Grain Added
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => endGrainInputRef.current?.click()}
                  disabled={analyzing}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-stone-800 hover:border-amber-500/50 bg-stone-950/30 hover:bg-stone-950 flex flex-col items-center justify-center gap-2 text-stone-500 hover:text-stone-300 transition-all p-4 group"
                >
                  <TreePine className="w-6 h-6 text-stone-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-stone-300">Darwaze Ka Top ya Bottom Edge</span>
                  <span className="text-[11px] text-stone-500">Annual rings aur solid vs ply check</span>
                </button>
              )}
              <input
                ref={endGrainInputRef}
                type="file"
                accept="image/*"
                onChange={e => handleSlotSelect('endGrain', e)}
                className="hidden"
              />
            </div>

          </div>

          {/* Action Button: Analyze Wood Now */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-800">
            <div className="text-xs text-stone-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Multi-feature AI vision scan. Fast, safe &amp; objective.</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleReset}
                disabled={analyzing || !hasAnyPhoto}
                className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-stone-700 transition-colors flex-1 sm:flex-none disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={analyzing || !hasAnyPhoto}
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-stone-950 font-bold text-xs sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all active:scale-95 flex-1 sm:flex-none disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-stone-950" />
                <span>{analyzing ? 'Scanning Grain & Pores...' : 'Analyze Wood Now'}</span>
              </button>
            </div>
          </div>

          {/* Scanning Progress Banner */}
          {analyzing && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-center gap-3 animate-pulse">
              <RefreshCw className="w-5 h-5 text-amber-400 animate-spin flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-300">Lakdi Ka Vishleshan Ho Raha Hai...</p>
                <p className="text-stone-300 text-xs mt-0.5">{SCAN_STEPS[scanStepIndex]}</p>
              </div>
            </div>
          )}

          {/* Error Banner with Working Retry */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="font-semibold text-rose-300">Analysis Error</p>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    disabled={analyzing}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                    <span>Dobara Try Karein (Retry)</span>
                  </button>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Expert Se Madad Lein</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COMPREHENSIVE HONEST RESULT DISPLAY */}
        {result && (
          <div
            id="wood-analysis-result"
            className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 animate-fade-in relative overflow-hidden"
          >
            {/* Header & Confidence Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-800 gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
                  Timber Botanical Inspection Report
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-100 mt-2">
                  Vishleshan Parinam (Result)
                </h2>
              </div>

              {/* Confidence Badge */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-stone-400 block">Visual Evidence Strength</span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mt-1 ${
                      result.confidence_level === 'High'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : result.confidence_level === 'Moderate'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-stone-800 text-stone-300 border border-stone-700'
                    }`}
                  >
                    {result.confidence_level} Confidence
                  </span>
                </div>
              </div>
            </div>

            {/* Main Likely Wood Box */}
            <div className="bg-gradient-to-br from-amber-950/40 via-stone-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-5 sm:p-6 space-y-3">
              <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">
                Likely Wood Species (Sambhavit Lakdi):
              </span>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-serif text-2xl sm:text-4xl font-extrabold text-amber-300">
                  {result.likely_wood_type}
                </span>
              </div>

              {/* Customer Friendly Hindi Explanation */}
              <p className="text-stone-200 text-sm sm:text-base leading-relaxed bg-stone-950/50 p-4 rounded-xl border border-stone-800/80">
                {result.customer_explanation}
              </p>
            </div>

            {/* CRITICAL ANTI-FALSE-SAGWAN WARNING BANNER */}
            {result.anti_false_sagwan_notice && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs sm:text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-amber-300">Sawmill Quality &amp; Authenticity Note</p>
                  <p className="text-stone-300 leading-relaxed text-xs">
                    {result.anti_false_sagwan_notice}
                  </p>
                </div>
              </div>
            )}

            {/* Grid 1: Visible Evidence & Reasons for Match */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Visible Evidence */}
              <div className="bg-stone-950/60 border border-stone-800/90 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Visible Evidence (Photo Mein Dekhe Gaye Lakshana):</span>
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-stone-300">
                  {(result.visible_evidence && result.visible_evidence.length > 0
                    ? result.visible_evidence
                    : result.visual_observations
                  ).map((obs, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reasons for Match */}
              <div className="bg-stone-950/60 border border-stone-800/90 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-amber-400" />
                  <span>Species Matching Rationale (Kyon Lagti Hai):</span>
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-stone-300">
                  {result.reasons_for_match.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Grid 2: Alternative Possibilities & Features Unassessed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Alternative Possibilities */}
              <div className="bg-stone-950/60 border border-stone-800/90 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-stone-300 uppercase tracking-wide flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-stone-400" />
                  <span>Doosri Sambhavit Lakdiyan (Alternative Woods):</span>
                </h4>
                {result.alternative_possibilities && result.alternative_possibilities.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {result.alternative_possibilities.map((alt, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs font-semibold text-amber-200"
                      >
                        {alt}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">Koi anya species prabal nahi dikh rahi hai.</p>
                )}
              </div>

              {/* Features That Could Not Be Assessed */}
              <div className="bg-stone-950/60 border border-stone-800/90 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-stone-400 uppercase tracking-wide flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-stone-400" />
                  <span>Features That Could Not Be Assessed (Anumaan Se Pare):</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-stone-400">
                  {(result.features_unassessed && result.features_unassessed.length > 0
                    ? result.features_unassessed
                    : ['End-grain cross-sectional pores cannot be viewed in standard surface photos']
                  ).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-stone-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Photo Recommendations If Additional Evidence Needed */}
            {result.additional_photos_recommended && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-200 text-xs sm:text-sm space-y-2">
                <p className="font-semibold text-amber-300 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span>Sahi Pehchan Ke Liye Additional Photo Tips:</span>
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-stone-300">
                  {(result.photo_recommendations && result.photo_recommendations.length > 0
                    ? result.photo_recommendations
                    : [
                        'Darwaze ke top ya bottom unpolished edge ki close-up photo lein.',
                        'Natural din ki dhoop mein bina camera flash ke 10cm doori se photo lein.',
                      ]
                  ).map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800 text-[11px] text-stone-400 leading-relaxed">
              <span className="font-semibold text-stone-300">Pramanikta Notice:</span> {result.disclaimer || 'Yeh analysis sirf camera photo par aadharit ek visual estimate hai. Yeh kisi government laboratory ya botanical scientific test ka replacement nahi hai.'}
            </div>

            {/* ACTION BUTTONS & WHATSAPP EXPERT CTA */}
            <div className="pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-stone-700 transition-colors flex-1 sm:flex-none"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>Analyze Another Door</span>
                </button>

                {onNavigateToCatalog && (
                  <button
                    type="button"
                    onClick={onNavigateToCatalog}
                    className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-stone-700 transition-colors flex-1 sm:flex-none"
                  >
                    <span>View Teak Doors</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Primary WhatsApp Expert CTA */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Jai Hanuman Sawmill Expert Se Baat Karein</span>
              </a>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
