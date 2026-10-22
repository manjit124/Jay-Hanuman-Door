import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Camera,
  RotateCcw,
  Sliders,
  Move,
  Maximize2,
  Trash2,
  Sun,
  Eye,
  Columns,
  Sparkles,
  Info,
  ShieldCheck,
  Check,
  Compass,
  Wand2,
  RefreshCw,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { Door, CustomDoorFittingState, WoodColorTone } from '../../types.ts';
import {
  resolveTransparentDoorCutout,
  removeBackgroundFromImage,
  getCachedTransparentDoor,
  setCachedTransparentDoor,
  checkIfImageHasAlpha,
} from '../../lib/transparentDoorUtils.ts';
import { uploadImage } from '../../lib/api.ts';

interface EntrancePhotoFittingProps {
  door: Door;
  fittingState: CustomDoorFittingState;
  doorSnapshotUrl?: string | null;
  onCaptureComposite: (compositeDataUrl: string) => void;
  className?: string;
}

const SAMPLE_ENTRANCES = [
  {
    id: 'modern-villa',
    title: 'Modern Villa Entrance',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'heritage-arch',
    title: 'Indian Traditional Porch',
    url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'apartment-doorway',
    title: 'Apartment Doorway',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
  },
];

export const EntrancePhotoFitting: React.FC<EntrancePhotoFittingProps> = ({
  door,
  fittingState,
  doorSnapshotUrl,
  onCaptureComposite,
  className = '',
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customPngInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Transparent Door Cutout States
  const [transparentDoorImg, setTransparentDoorImg] = useState<string>(() => {
    return (
      door.transparentPngUrl ||
      door.model3d?.transparentPngUrl ||
      doorSnapshotUrl ||
      getCachedTransparentDoor(door.id) ||
      door.images?.[0] ||
      ''
    );
  });
  const [isProcessingCutout, setIsProcessingCutout] = useState(false);
  const [isUploadingCustomPng, setIsUploadingCustomPng] = useState(false);
  const [cutoutSource, setCutoutSource] = useState<'admin' | 'snapshot' | 'cached' | 'auto'>('auto');
  const [cutoutTolerance, setCutoutTolerance] = useState(36);

  // Door Overlay Transform States
  const [posX, setPosX] = useState(0); // Offset in % (-50 to +50)
  const [posY, setPosY] = useState(0);
  const [scale, setScale] = useState(68); // Scale % (20 to 120)
  const [widthScale, setWidthScale] = useState(100); // 50% to 150%
  const [heightScale, setHeightScale] = useState(100); // 50% to 150%
  const [rotateY, setRotateY] = useState(0); // 3D Perspective angle (-45 to +45 deg)
  const [rotateX, setRotateX] = useState(0); // Pitch angle (-25 to +25 deg)
  const [rotateZ, setRotateZ] = useState(0); // Roll / tilt angle (-20 to +20 deg)
  const [brightness, setBrightness] = useState(100); // 60 to 140%
  const [shadowStrength, setShadowStrength] = useState(32); // 0 to 60px blur
  const [opacity, setOpacity] = useState(100);

  // Comparison Modes: 'normal' | 'split' | 'before_after'
  const [viewMode, setViewMode] = useState<'normal' | 'split' | 'before_after'>('normal');
  const [splitPercent, setSplitPercent] = useState(50);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showGuides, setShowGuides] = useState(true);

  // Active Control Tab: 'position' | 'perspective' | 'lighting' | 'cutout'
  const [activeTab, setActiveTab] = useState<'position' | 'perspective' | 'lighting' | 'cutout'>('position');

  // Automatically load or generate transparent door cutout
  useEffect(() => {
    let isCancelled = false;

    async function loadCutout() {
      setIsProcessingCutout(true);

      // Check current source
      if (door.transparentPngUrl && door.transparentPngUrl.trim()) {
        setCutoutSource('admin');
      } else if (door.model3d?.transparentPngUrl && door.model3d.transparentPngUrl.trim()) {
        setCutoutSource('admin');
      } else if (doorSnapshotUrl) {
        setCutoutSource('snapshot');
      } else if (getCachedTransparentDoor(door.id)) {
        setCutoutSource('cached');
      } else {
        setCutoutSource('auto');
      }

      try {
        const resolved = await resolveTransparentDoorCutout(door, doorSnapshotUrl);
        if (!isCancelled && resolved) {
          setTransparentDoorImg(resolved);
        }
      } catch (err) {
        console.warn('Could not load transparent door cutout:', err);
      } finally {
        if (!isCancelled) {
          setIsProcessingCutout(false);
        }
      }
    }

    loadCutout();

    return () => {
      isCancelled = true;
    };
  }, [door.id, door.transparentPngUrl, door.model3d?.transparentPngUrl, door.images, doorSnapshotUrl]);

  // Manual re-cut / tolerance tuning
  const handleRecutTolerance = async (tol: number) => {
    setCutoutTolerance(tol);
    setIsProcessingCutout(true);
    try {
      const rawImg = door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80';
      const reprocessed = await removeBackgroundFromImage(rawImg, { tolerance: tol, cropToDoor: true });
      setCachedTransparentDoor(door.id, reprocessed);
      setTransparentDoorImg(reprocessed);
      setCutoutSource('auto');
    } catch (err) {
      console.warn('Re-cut failed:', err);
    } finally {
      setIsProcessingCutout(false);
    }
  };

  // Upload Custom PNG from Cutout Tab
  const handleUploadCustomCutout = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingCustomPng(true);
      const res = await uploadImage(file);
      setTransparentDoorImg(res.url);
      setCachedTransparentDoor(door.id, res.url);
      setCutoutSource('admin');
    } catch (err: any) {
      // Local fallback using object URL
      const localUrl = URL.createObjectURL(file);
      setTransparentDoorImg(localUrl);
      setCachedTransparentDoor(door.id, localUrl);
      setCutoutSource('admin');
    } finally {
      setIsUploadingCustomPng(false);
    }
  };

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialX: number; initialY: number }>({
    x: 0,
    y: 0,
    initialX: 0,
    initialY: 0,
  });

  // Handle Photo Selection
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setPhotoUrl(localUrl);
    // Reset transforms to centered default
    setPosX(0);
    setPosY(0);
    setScale(68);
    setWidthScale(100);
    setHeightScale(100);
    setRotateY(0);
    setRotateX(0);
    setRotateZ(0);
  };

  const handleSelectSample = (sampleUrl: string) => {
    setPhotoUrl(sampleUrl);
    setPosX(0);
    setPosY(0);
    setScale(68);
    setWidthScale(100);
    setHeightScale(100);
    setRotateY(0);
    setRotateX(0);
    setRotateZ(0);
  };

  const handleRemovePhoto = () => {
    if (photoUrl && photoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoUrl);
    }
    setPhotoUrl(null);
  };

  // Drag Handling for touch and mouse
  const handlePointerDown = (e: React.PointerEvent) => {
    if (viewMode === 'split') return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: posX,
      initialY: posY,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const rect = containerRef.current.getBoundingClientRect();
    const percentX = (deltaX / rect.width) * 100;
    const percentY = (deltaY / rect.height) * 100;

    setPosX(Math.max(-50, Math.min(50, dragStartRef.current.initialX + percentX)));
    setPosY(Math.max(-50, Math.min(50, dragStartRef.current.initialY + percentY)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // Capture composite image
  const handleCaptureComposite = () => {
    if (!photoUrl || !containerRef.current) return;

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = photoUrl;

    bgImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = bgImg.naturalWidth || 1280;
      canvas.height = bgImg.naturalHeight || 960;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw entrance background
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      // 2. Draw door overlay
      const doorImg = new Image();
      doorImg.crossOrigin = 'anonymous';
      doorImg.src = activeDoorImg;

      doorImg.onload = () => {
        ctx.save();

        // Calculate door position & dimensions relative to canvas
        const doorBaseW = (canvas.width * (scale / 100) * 0.45) * (widthScale / 100);
        const doorBaseH = (canvas.height * (scale / 100) * 0.82) * (heightScale / 100);
        const centerCanvasX = canvas.width / 2 + (canvas.width * (posX / 100));
        const centerCanvasY = canvas.height / 2 + (canvas.height * (posY / 100));

        ctx.translate(centerCanvasX, centerCanvasY);

        // In-plane rotation
        if (rotateZ !== 0) {
          ctx.rotate((rotateZ * Math.PI) / 180);
        }

        // 3D Perspective scaling
        const cosY = Math.cos((rotateY * Math.PI) / 180);
        const cosX = Math.cos((rotateX * Math.PI) / 180);
        ctx.scale(Math.max(0.4, cosY), Math.max(0.4, cosX));

        // Brightness & Opacity
        ctx.filter = `brightness(${brightness}%)`;
        ctx.globalAlpha = opacity / 100;

        // Realistic drop shadow
        if (shadowStrength > 0) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
          ctx.shadowBlur = shadowStrength * 1.5;
          ctx.shadowOffsetX = rotateY * 0.6;
          ctx.shadowOffsetY = 16;
        }

        ctx.drawImage(doorImg, -doorBaseW / 2, -doorBaseH / 2, doorBaseW, doorBaseH);
        ctx.restore();

        // 3. Watermark & Specifications Badge
        ctx.fillStyle = 'rgba(18, 16, 14, 0.90)';
        ctx.fillRect(20, canvas.height - 85, canvas.width - 40, 65);

        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, canvas.height - 85, canvas.width - 40, 65);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`JAI HANUMAN DOOR • ${door.name}`, 36, canvas.height - 52);

        ctx.fillStyle = '#d6d3d1';
        ctx.font = '13px monospace';
        ctx.fillText(
          `${fittingState.woodType} • ${fittingState.widthInch}" × ${fittingState.heightInch}" • WhatsApp: +91 78874 12884`,
          36,
          canvas.height - 30
        );

        const compositeUrl = canvas.toDataURL('image/jpeg', 0.92);
        onCaptureComposite(compositeUrl);
      };
    };
  };

  // Door image source: prefers genuine transparent cutout
  const activeDoorImg = transparentDoorImg || doorSnapshotUrl || door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className={`flex flex-col bg-white border border-[#E5E5E5] rounded-2xl overflow-hidden shadow-sm ${className}`}>
      {/* Top Banner / Privacy & Status */}
      <div className="px-4 py-3 bg-[#F8F8F6] border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[#1A1A1A]">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>100% Private:</strong> Your entrance photo stays strictly in your browser and is never stored on any server.
          </span>
        </div>

        {photoUrl && (
          <div className="flex items-center gap-2">
            {/* View Mode Switches */}
            <div className="inline-flex rounded-lg bg-stone-100 p-0.5 border border-[#E5E5E5]">
              <button
                onClick={() => { setViewMode('normal'); setShowOriginal(false); }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  viewMode === 'normal' && !showOriginal ? 'bg-[#C89211] text-white shadow-xs' : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                Fitted Door
              </button>
              <button
                onClick={() => { setViewMode('normal'); setShowOriginal(true); }}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  viewMode === 'normal' && showOriginal ? 'bg-[#C89211] text-white shadow-xs' : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                Original Photo
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  viewMode === 'split' ? 'bg-[#C89211] text-white shadow-xs' : 'text-[#666666] hover:text-[#1A1A1A]'
                }`}
              >
                <Columns className="w-3 h-3" />
                <span>Split Slider</span>
              </button>
            </div>

            {/* Remove Photo */}
            <button
              onClick={handleRemovePhoto}
              className="p-1.5 rounded-lg text-[#666666] hover:text-[#C62828] hover:bg-rose-50 transition-colors cursor-pointer"
              title="Remove photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main View Area */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-[#F8F8F6] flex items-center justify-center overflow-hidden select-none">
        {!photoUrl ? (
          /* Empty State: Prompt Upload or Sample Photo */
          <div className="p-6 text-center max-w-lg space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center mx-auto text-[#C89211] shadow-sm">
              <Camera className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A]">
                Upload Home Entrance Photo
              </h3>
              <p className="text-xs text-[#666666] mt-1.5 leading-relaxed">
                Take a straight-on photo of your doorway or select a picture from your gallery. We'll virtually place the transparent cutout of <strong className="text-[#C89211]">{door.name}</strong> directly into your entrance frame.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload My Entrance Photo</span>
              </button>
            </div>

            {/* Quick Sample Photos */}
            <div className="pt-3 border-t border-[#E5E5E5]">
              <span className="text-[11px] text-[#666666] block mb-2 font-medium">Or try an instant sample doorway:</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {SAMPLE_ENTRANCES.map(sample => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample.url)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-[#1A1A1A] border border-[#E5E5E5] text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#C89211]" />
                    <span>{sample.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        ) : (
          /* Interactive Compositing Canvas */
          <div
            ref={containerRef}
            className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Background Entrance Image */}
            <img
              src={photoUrl}
              alt="Entrance"
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Normal Overlay Mode */}
            {viewMode === 'normal' && !showOriginal && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  transform: `translate(${posX}%, ${posY}%)`,
                }}
              >
                <div
                  className="relative transition-transform duration-75"
                  style={{
                    width: `${scale * 0.45 * (widthScale / 100)}%`,
                    height: `${scale * 0.82 * (heightScale / 100)}%`,
                    transform: `perspective(900px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) rotateZ(${rotateZ}deg)`,
                    filter: `brightness(${brightness}%)`,
                    opacity: opacity / 100,
                  }}
                >
                  {/* The Transparent Door Cutout */}
                  <img
                    src={activeDoorImg}
                    alt={door.name}
                    className="w-full h-full object-contain"
                    style={{
                      filter: `drop-shadow(${rotateY * 0.5}px 14px ${shadowStrength}px rgba(0,0,0,0.72))`,
                    }}
                  />

                  {/* Alignment Guide Lines */}
                  {showGuides && (
                    <div className="absolute inset-0 border-2 border-dashed border-amber-400/50 pointer-events-none rounded-sm">
                      <div className="absolute top-1/2 left-0 right-0 border-t border-amber-400/30" />
                      <div className="absolute top-0 bottom-0 left-1/2 border-l border-amber-400/30" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Split Slider Mode */}
            {viewMode === 'split' && (
              <>
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ width: `${splitPercent}%` }}
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      transform: `translate(${posX}%, ${posY}%)`,
                    }}
                  >
                    <div
                      style={{
                        width: `${scale * 0.45 * (widthScale / 100)}%`,
                        height: `${scale * 0.82 * (heightScale / 100)}%`,
                        transform: `perspective(900px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) rotateZ(${rotateZ}deg)`,
                        filter: `brightness(${brightness}%)`,
                        opacity: opacity / 100,
                      }}
                    >
                      <img
                        src={activeDoorImg}
                        alt={door.name}
                        className="w-full h-full object-contain"
                        style={{
                          filter: `drop-shadow(${rotateY * 0.5}px 14px ${shadowStrength}px rgba(0,0,0,0.72))`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Slider Line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow-2xl pointer-events-none"
                  style={{ left: `${splitPercent}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs shadow-xl border-2 border-white">
                    ↔
                  </div>
                </div>

                {/* Interactive slider input */}
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={splitPercent}
                  onChange={e => setSplitPercent(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
                />
              </>
            )}

            {/* Transparent Cutout Status Pill */}
            <div className="absolute top-3 left-3 z-10 pointer-events-none px-3 py-1 rounded-full bg-stone-950/85 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                Transparent PNG Overlay ({cutoutSource === 'admin' ? 'Official PNG' : cutoutSource === 'snapshot' ? '3D Render' : cutoutSource === 'cached' ? 'Cached Cutout' : 'Auto Cutout'})
              </span>
            </div>

            {/* Helper Overlay Pill */}
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none px-3 py-1 rounded-full bg-white/90 border border-[#E5E5E5] text-[11px] text-[#1A1A1A] backdrop-blur-md flex items-center gap-1.5 shadow-sm">
              <Move className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Drag door to align with doorway • Use controls below</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Adjustment Controls Panel */}
      {photoUrl && (
        <div className="p-4 bg-[#F8F8F6] border-t border-[#E5E5E5] space-y-4">
          {/* Sub-tabs for clean layout */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5E5] pb-3">
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setActiveTab('position')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'position' ? 'bg-[#C89211] text-white shadow-xs' : 'text-[#666666] hover:bg-white'
                }`}
              >
                <Move className="w-3.5 h-3.5" />
                <span>Size & Position</span>
              </button>

              <button
                onClick={() => setActiveTab('perspective')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'perspective' ? 'bg-[#C89211] text-white shadow-xs' : 'text-[#666666] hover:bg-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>3D Angle Tilt</span>
              </button>

              <button
                onClick={() => setActiveTab('lighting')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'lighting' ? 'bg-[#C89211] text-white shadow-xs' : 'text-[#666666] hover:bg-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light & Shadow</span>
              </button>

              <button
                onClick={() => setActiveTab('cutout')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'cutout' ? 'bg-[#C89211] text-white shadow-xs' : 'text-[#666666] hover:bg-white'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Door Cutout</span>
              </button>
            </div>

            {/* Capture Composite CTA */}
            <button
              onClick={handleCaptureComposite}
              className="px-3.5 py-1.5 bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Capture Fitted Photo</span>
            </button>
          </div>

          {/* Tab 1: Size & Position */}
          {activeTab === 'position' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Overall Scale:</span>
                  <span className="font-mono text-[#C89211] font-bold">{scale}%</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="120"
                  value={scale}
                  onChange={e => setScale(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Door Width:</span>
                  <span className="font-mono text-[#C89211] font-bold">{widthScale}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="150"
                  value={widthScale}
                  onChange={e => setWidthScale(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Door Height:</span>
                  <span className="font-mono text-[#C89211] font-bold">{heightScale}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="150"
                  value={heightScale}
                  onChange={e => setHeightScale(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Guides:</span>
                  <button
                    onClick={() => setShowGuides(!showGuides)}
                    className="text-[#C89211] underline cursor-pointer"
                  >
                    {showGuides ? 'Hide' : 'Show'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setPosX(0);
                    setPosY(0);
                    setScale(68);
                    setWidthScale(100);
                    setHeightScale(100);
                  }}
                  className="w-full py-1.5 rounded bg-white hover:bg-stone-50 text-[#1A1A1A] text-[11px] font-medium border border-[#E5E5E5] transition cursor-pointer shadow-xs"
                >
                  Reset Position & Size
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: 3D Perspective Tilt */}
          {activeTab === 'perspective' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Horizontal Turn (Y):</span>
                  <span className="font-mono text-[#C89211] font-bold">{rotateY}°</span>
                </div>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  value={rotateY}
                  onChange={e => setRotateY(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Vertical Pitch (X):</span>
                  <span className="font-mono text-[#C89211] font-bold">{rotateX}°</span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="25"
                  value={rotateX}
                  onChange={e => setRotateX(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Roll Angle (Z):</span>
                  <span className="font-mono text-[#C89211] font-bold">{rotateZ}°</span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  value={rotateZ}
                  onChange={e => setRotateZ(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Quick Presets:</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setRotateY(-15); setRotateX(0); setRotateZ(0); }}
                    className="flex-1 py-1 rounded bg-white hover:bg-stone-50 text-[#1A1A1A] text-[11px] border border-[#E5E5E5] cursor-pointer shadow-xs"
                  >
                    Left 15°
                  </button>
                  <button
                    onClick={() => { setRotateY(0); setRotateX(0); setRotateZ(0); }}
                    className="flex-1 py-1 rounded bg-white hover:bg-stone-50 text-[#1A1A1A] text-[11px] border border-[#E5E5E5] cursor-pointer shadow-xs"
                  >
                    Front 0°
                  </button>
                  <button
                    onClick={() => { setRotateY(15); setRotateX(0); setRotateZ(0); }}
                    className="flex-1 py-1 rounded bg-white hover:bg-stone-50 text-[#1A1A1A] text-[11px] border border-[#E5E5E5] cursor-pointer shadow-xs"
                  >
                    Right 15°
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Light & Shadow */}
          {activeTab === 'lighting' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Door Lighting / Brightness:</span>
                  <span className="font-mono text-[#C89211] font-bold">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Realistic Drop Shadow:</span>
                  <span className="font-mono text-[#C89211] font-bold">{shadowStrength}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={shadowStrength}
                  onChange={e => setShadowStrength(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#1A1A1A] font-medium">
                  <span>Door Overlay Opacity:</span>
                  <span className="font-mono text-[#C89211] font-bold">{opacity}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={opacity}
                  onChange={e => setOpacity(Number(e.target.value))}
                  className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Tab 4: Door Cutout & Transparency Controls */}
          {activeTab === 'cutout' && (
            <div className="space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-[#E5E5E5] shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <strong className="text-[#1A1A1A] text-xs">
                      {cutoutSource === 'admin' && 'Official Transparent Cutout PNG (Configured for Product)'}
                      {cutoutSource === 'snapshot' && '3D Studio Transparent Render (Alpha Channel)'}
                      {cutoutSource === 'cached' && 'Cached Transparent Door Cutout'}
                      {cutoutSource === 'auto' && 'Automated Background-Removed Door Cutout'}
                    </strong>
                  </div>
                  <p className="text-[#666666] text-[11px] leading-relaxed">
                    Only the actual door is visible. Your entrance wall, flooring, and doorway remain 100% visible through transparent areas.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {doorSnapshotUrl && (
                    <button
                      onClick={() => {
                        setTransparentDoorImg(doorSnapshotUrl);
                        setCutoutSource('snapshot');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] border border-[#E5E5E5] text-[11px] font-semibold transition cursor-pointer"
                      title="Use 3D Scene View"
                    >
                      Use 3D Snapshot
                    </button>
                  )}

                  {/* Upload custom transparent PNG */}
                  <label className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#C89211] border border-[#E5E5E5] text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3 h-3" />
                    <span>{isUploadingCustomPng ? 'Uploading...' : 'Upload PNG'}</span>
                    <input
                      ref={customPngInputRef}
                      type="file"
                      accept=".png,.webp"
                      disabled={isUploadingCustomPng}
                      onChange={handleUploadCustomCutout}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => handleRecutTolerance(cutoutTolerance)}
                    disabled={isProcessingCutout}
                    className="px-3 py-1.5 rounded-lg bg-[#FFF7E3] hover:bg-amber-100 text-[#C89211] border border-[#C89211]/40 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isProcessingCutout ? 'animate-spin' : ''}`} />
                    <span>{isProcessingCutout ? 'Extracting Cutout...' : 'Re-Cut from Photo'}</span>
                  </button>
                </div>
              </div>

              {/* Cutout Tolerance Slider & Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[#1A1A1A] font-medium">
                    <span>Background Removal Sensitivity:</span>
                    <span className="font-mono text-[#C89211] font-bold">{cutoutTolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="75"
                    value={cutoutTolerance}
                    onChange={e => handleRecutTolerance(Number(e.target.value))}
                    className="w-full accent-[#C89211] h-1.5 bg-stone-300 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#666666]">
                    <span>Tighter (Preserves edges)</span>
                    <span>Aggressive (Removes background/borders)</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-[#E5E5E5] text-[11px] text-[#666666] flex items-start gap-2 shadow-xs">
                  <Info className="w-4 h-4 text-[#C89211] shrink-0 mt-0.5" />
                  <span>
                    The cutout preserves all handcrafted wood carvings, panel reliefs, and natural grain while completely eliminating rectangular photo backdrops and white borders.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
