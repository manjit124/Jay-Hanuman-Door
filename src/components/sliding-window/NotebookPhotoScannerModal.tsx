import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Upload,
  X,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  FileImage,
  Edit3,
  Layers,
  Sparkles,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react';
import type {
  FabricationProfile,
  NotebookExtractedRow,
  NotebookPhotoPageRecord,
  NotebookScanConfidence,
  NotebookScanProjectRecord,
  SlidingTrackType,
  SlidingWindowInput,
  WindowMeasurementUnit,
} from '../../types.ts';
import {
  GLASS_THICKNESS_OPTIONS,
  WINDOW_CONFIGURATION_OPTIONS,
} from '../../data/slidingWindowDefaults.ts';
import { scanNotebookPhotoApi } from '../../lib/slidingWindowApi.ts';
import { MeasurementInput } from './MeasurementInput.tsx';

interface NotebookPhotoScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: FabricationProfile[];
  defaultUnit: WindowMeasurementUnit;
  default2TrackProfileId?: string;
  default3TrackProfileId?: string;
  initialProjectName: string;
  initialCustomerName: string;
  onConfirmAndCalculate: (payload: {
    projectName: string;
    customerName: string;
    windows: SlidingWindowInput[];
    notebookScan: NotebookScanProjectRecord;
  }) => void;
}

interface ScannedPageState extends NotebookPhotoPageRecord {
  localPreviewUrl?: string;
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function maybeCompressForUpload(file: File): Promise<File> {
  const lowerName = (file.name || '').toLowerCase();
  const lowerType = (file.type || '').toLowerCase();
  const isHeic =
    lowerType.includes('heic') ||
    lowerType.includes('heif') ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif');
  const isStandardSmall =
    !isHeic &&
    (lowerType === 'image/jpeg' || lowerType === 'image/png' || lowerType === 'image/webp') &&
    file.size <= 350 * 1024;

  // Tiny already-standard images don't need re-encoding
  if (isStandardSmall) {
    return file;
  }

  // Try decoding and normalizing to crisp <= 1800px sRGB JPEG (handles 12MP+ camera shots,
  // EXIF orientation, and browser-decodable HEIC/PNG; falls back to original file if browser cannot decode HEIC)
  try {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = imgUrl;
      });
      const maxDim = 1800;
      const needsResize = Math.max(img.width, img.height) > maxDim;
      const needsReencode = isHeic || needsResize || file.size > 1.2 * 1024 * 1024;
      if (!needsReencode) {
        return file;
      }
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const targetW = Math.max(1, Math.round(img.width * scale));
      const targetH = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', 0.88)
      );
      if (!blob) return file;
      if (!isHeic && !needsResize && blob.size >= file.size) return file;
      const baseName = (file.name || 'notebook-page').replace(/\.[^.]+$/, '') || 'notebook-page';
      return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  } catch {
    return file;
  }
}

async function fileToCompactPreviewDataUrl(file: File): Promise<string> {
  const lowerName = (file.name || '').toLowerCase();
  const lowerType = (file.type || '').toLowerCase();
  if (
    lowerType.includes('heic') ||
    lowerType.includes('heif') ||
    lowerName.endsWith('.heic') ||
    lowerName.endsWith('.heif')
  ) {
    return '';
  }
  try {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = imgUrl;
      });
      const maxDim = 1200;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.78);
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  } catch {
    return '';
  }
}

export const NotebookPhotoScannerModal: React.FC<NotebookPhotoScannerModalProps> = ({
  isOpen,
  onClose,
  profiles,
  defaultUnit,
  default2TrackProfileId,
  default3TrackProfileId,
  initialProjectName,
  initialCustomerName,
  onConfirmAndCalculate,
}) => {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  const [pages, setPages] = useState<ScannedPageState[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [rows, setRows] = useState<NotebookExtractedRow[]>([]);
  const [modelUsed, setModelUsed] = useState<string>('gemini-4-hydrogen');

  const [scanProjectName, setScanProjectName] = useState<string>(initialProjectName || '');
  const [scanCustomerName, setScanCustomerName] = useState<string>(initialCustomerName || '');

  // Fabrication spec applied to all confirmed scanned windows (strictly uses existing profiles)
  const [selectedTrackType, setSelectedTrackType] = useState<SlidingTrackType>('2-track');
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    default2TrackProfileId ||
      profiles.find(p => p.trackType === '2-track' && p.isDefault)?.id ||
      profiles[0]?.id ||
      ''
  );
  const [selectedConfiguration, setSelectedConfiguration] = useState<string>(
    WINDOW_CONFIGURATION_OPTIONS['2-track'][0]
  );
  const [selectedGlassThickness, setSelectedGlassThickness] = useState<string>(
    GLASS_THICKNESS_OPTIONS[0]
  );
  const [mosquitoNetRequired, setMosquitoNetRequired] = useState<boolean>(false);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanningProgressText, setScanningProgressText] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [rescanTargetPageId, setRescanTargetPageId] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<boolean>(false);
  const [highlightEditMode, setHighlightEditMode] = useState<boolean>(false);
  const [confirmWarning, setConfirmWarning] = useState<string | null>(null);

  const activePage = useMemo(
    () => pages.find(p => p.id === activePageId) || pages[0] || null,
    [pages, activePageId]
  );

  const trackProfiles = useMemo(
    () => profiles.filter(p => p.trackType === selectedTrackType),
    [profiles, selectedTrackType]
  );

  // Duplicate Window Number detection (case-insensitive)
  const duplicateWindowKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = r.windowNumber.trim().toUpperCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const dups = new Set<string>();
    counts.forEach((count, key) => {
      if (count > 1) dups.add(key);
    });
    return dups;
  }, [rows]);

  const missingDimensionRows = useMemo(
    () => rows.filter(r => r.width === null || r.height === null || r.width <= 0 || r.height <= 0),
    [rows]
  );

  const unverifiedRows = useMemo(
    () => rows.filter(r => !r.confirmed),
    [rows]
  );

  const reviewOrUnclearRows = useMemo(
    () => rows.filter(r => r.confidence !== 'High'),
    [rows]
  );

  if (!isOpen) return null;

  const handleTrackTypeChange = (nextTrack: SlidingTrackType) => {
    setSelectedTrackType(nextTrack);
    setSelectedConfiguration(WINDOW_CONFIGURATION_OPTIONS[nextTrack][0]);
    setMosquitoNetRequired(nextTrack === '3-track');
    const preferredId = nextTrack === '3-track' ? default3TrackProfileId : default2TrackProfileId;
    const matched =
      profiles.find(p => p.id === preferredId && p.trackType === nextTrack) ||
      profiles.find(p => p.trackType === nextTrack && p.isDefault) ||
      profiles.find(p => p.trackType === nextTrack);
    if (matched) setSelectedProfileId(matched.id);
  };

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setScanError(null);
    setConfirmWarning(null);
    setIsScanning(true);

    let workingPages = [...pages];
    let workingRows = [...rows];
    let currentRescanId = rescanTargetPageId;

    try {
      for (let i = 0; i < files.length; i++) {
        const rawFile = files[i];
        const targetPageIdx = currentRescanId
          ? workingPages.findIndex(p => p.id === currentRescanId)
          : -1;
        const pageNum = targetPageIdx >= 0 ? workingPages[targetPageIdx].pageNumber : workingPages.length + 1;

        setScanningProgressText(
          files.length > 1
            ? `Scanning photo ${i + 1} of ${files.length} (Page ${pageNum}) with Gemini AI...`
            : `Analyzing handwritten measurements (Page ${pageNum}) with Gemini AI...`
        );

        const preparedFile = await maybeCompressForUpload(rawFile);
        const fallbackPreviewUrl = await fileToCompactPreviewDataUrl(preparedFile);

        const existingCount =
          targetPageIdx >= 0
            ? workingRows.filter(r => r.pageId !== currentRescanId).length
            : workingRows.length;

        const res = await scanNotebookPhotoApi(preparedFile, {
          pageNumber: pageNum,
          existingWindowCount: existingCount,
          defaultUnit,
        });

        setModelUsed(res.modelUsed || 'gemini-4-hydrogen');

        const pageRecord: ScannedPageState = {
          ...res.page,
          photoUrl: res.page.photoUrl || fallbackPreviewUrl,
          localPreviewUrl: fallbackPreviewUrl || res.page.photoUrl,
        };

        if (targetPageIdx >= 0 && currentRescanId) {
          workingPages[targetPageIdx] = pageRecord;
          workingRows = [
            ...workingRows.filter(r => r.pageId !== currentRescanId),
            ...res.rows,
          ];
          currentRescanId = null;
          setRescanTargetPageId(null);
        } else {
          workingPages = [...workingPages, pageRecord];
          workingRows = [...workingRows, ...res.rows];
        }

        if (res.detectedProjectName && (!scanProjectName.trim() || scanProjectName === 'Site Window Fabrication')) {
          setScanProjectName(res.detectedProjectName);
        }
        if (res.detectedCustomerName && !scanCustomerName.trim()) {
          setScanCustomerName(res.detectedCustomerName);
        }

        setPages([...workingPages]);
        setRows([...workingRows]);
        setActivePageId(pageRecord.id);
      }
    } catch (err: any) {
      setScanError(
        err?.message ||
          'Could not scan the notebook photograph. Please ensure the writing is clear and well-lit, or try again.'
      );
    } finally {
      setIsScanning(false);
      setScanningProgressText('');
      setRescanTargetPageId(null);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  const triggerTakePhoto = (rescanPageId: string | null = null) => {
    setRescanTargetPageId(rescanPageId);
    setScanError(null);
    cameraInputRef.current?.click();
  };

  const triggerUploadPhoto = (rescanPageId: string | null = null) => {
    setRescanTargetPageId(rescanPageId);
    setScanError(null);
    uploadInputRef.current?.click();
  };

  const handleRemovePage = (pageId: string) => {
    const nextPages = pages
      .filter(p => p.id !== pageId)
      .map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    const pageNumById = new Map(nextPages.map(p => [p.id, p.pageNumber]));
    const nextRows = rows
      .filter(r => r.pageId !== pageId)
      .map(r => ({
        ...r,
        pageLabel: pageNumById.has(r.pageId) ? `Page ${pageNumById.get(r.pageId)}` : r.pageLabel,
      }));
    setPages(nextPages);
    setRows(nextRows);
    if (activePageId === pageId) {
      setActivePageId(nextPages[0]?.id || null);
    }
  };

  const handleUpdateRow = (id: string, updates: Partial<NotebookExtractedRow>) => {
    setConfirmWarning(null);
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const next: NotebookExtractedRow = { ...r, ...updates };
        const hasValidDims =
          next.width !== null &&
          next.height !== null &&
          Number.isFinite(next.width) &&
          Number.isFinite(next.height) &&
          next.width > 0 &&
          next.height > 0;
        if (!hasValidDims) {
          next.confidence = 'Unclear';
          next.confirmed = false;
        } else if (
          updates.width !== undefined ||
          updates.height !== undefined ||
          updates.unit !== undefined
        ) {
          // User actively edited the row -> clear unit ambiguity when unit explicitly chosen
          if (updates.unit !== undefined) {
            next.unitAmbiguous = false;
          }
          if (next.confidence === 'Unclear') {
            next.confidence = 'Review';
          }
        }
        return next;
      })
    );
  };

  const handleDeleteRow = (id: string) => {
    setConfirmWarning(null);
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleAddManualRow = () => {
    setConfirmWarning(null);
    const nextNum = `W${rows.length + 1}`;
    const targetPage = activePage || pages[0];
    const manualRow: NotebookExtractedRow = {
      id: createLocalId('nb-manual'),
      pageId: targetPage?.id || 'manual',
      pageLabel: targetPage ? `Page ${targetPage.pageNumber}` : 'Manual',
      windowNumber: nextNum,
      rawText: 'Added manually by fabricator',
      width: null,
      height: null,
      unit: defaultUnit,
      unitAmbiguous: false,
      confidence: 'Review',
      flags: ['Manually added row — enter Width and Height.'],
      confirmed: false,
      originalAiSnapshot: {
        windowNumber: nextNum,
        rawText: 'Manual entry',
        width: null,
        height: null,
        unit: defaultUnit,
        confidence: 'Review',
      },
    };
    setRows(prev => [...prev, manualRow]);
    setHighlightEditMode(true);
  };

  const handleAutoRenumberDuplicates = () => {
    const seen = new Set<string>();
    let counter = 1;
    setRows(prev =>
      prev.map(r => {
        const clean = r.windowNumber.trim();
        const key = clean.toUpperCase();
        if (clean && !seen.has(key)) {
          seen.add(key);
          return r;
        }
        let candidate = `W${counter}`;
        while (seen.has(candidate.toUpperCase())) {
          counter++;
          candidate = `W${counter}`;
        }
        seen.add(candidate.toUpperCase());
        counter++;
        return { ...r, windowNumber: candidate };
      })
    );
    setConfirmWarning(null);
  };

  const handleVerifyAllValidRows = () => {
    setConfirmWarning(null);
    setRows(prev =>
      prev.map(r => {
        const valid = r.width !== null && r.height !== null && r.width > 0 && r.height > 0;
        return valid ? { ...r, confirmed: true } : r;
      })
    );
  };

  const handleEditMeasurementsClick = () => {
    setHighlightEditMode(true);
    setConfirmWarning(null);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const firstNeedsAttention = tableContainerRef.current.querySelector<HTMLInputElement>(
        'input[data-needs-attention="true"]'
      );
      const firstInput =
        firstNeedsAttention ||
        tableContainerRef.current.querySelector<HTMLInputElement>('input[type="number"]');
      firstInput?.focus();
    }
  };

  const handleConfirmAllAndCalculate = () => {
    if (rows.length === 0) {
      setConfirmWarning('Add or scan at least one window measurement before calculating.');
      return;
    }

    if (missingDimensionRows.length > 0) {
      setHighlightEditMode(true);
      setConfirmWarning(
        `${missingDimensionRows.length} window row(s) are missing Width or Height (${missingDimensionRows
          .map(r => r.windowNumber)
          .join(', ')}). Enter valid numbers or delete those rows before calculating.`
      );
      return;
    }

    if (unverifiedRows.length > 0) {
      setHighlightEditMode(true);
      setConfirmWarning(
        `${unverifiedRows.length} highlighted row(s) (${unverifiedRows
          .map(r => r.windowNumber)
          .join(', ')}) have Review/Unclear confidence and must be checked & verified first. Tick their Verify box or click "Mark All Valid Verified" once you have compared them with the photo.`
      );
      return;
    }

    const activeProfile =
      profiles.find(p => p.id === selectedProfileId) ||
      profiles.find(p => p.trackType === selectedTrackType && p.isDefault) ||
      profiles[0];

    const windowsToCalculate: SlidingWindowInput[] = rows.map((r, idx) => ({
      id: createLocalId(`nb-win-${idx + 1}`),
      windowNumber: r.windowNumber.trim() || `W${idx + 1}`,
      width: Number(r.width),
      height: Number(r.height),
      unit: r.unit,
      trackType: selectedTrackType,
      configuration: selectedConfiguration,
      glassThickness: selectedGlassThickness,
      mosquitoNetRequired,
      profileId: activeProfile?.id,
      notes: r.notes || (r.rawText ? `Scanned: ${r.rawText}` : undefined),
    }));

    const verifiedRows: NotebookExtractedRow[] = rows.map(r => ({
      ...r,
      confirmed: true,
    }));

    const cleanPages: NotebookPhotoPageRecord[] = pages.map(({ localPreviewUrl, ...rest }) => ({
      ...rest,
      photoUrl: rest.photoUrl || localPreviewUrl || '',
    }));

    const notebookScan: NotebookScanProjectRecord = {
      pages: cleanPages,
      extractedRows: verifiedRows,
      verifiedByUser: true,
      verifiedAt: new Date().toISOString(),
      modelUsed,
    };

    onConfirmAndCalculate({
      projectName: scanProjectName.trim() || initialProjectName || 'Notebook Scanned Project',
      customerName: scanCustomerName.trim() || initialCustomerName || '',
      windows: windowsToCalculate,
      notebookScan,
    });
  };

  const getConfidenceBadgeClass = (conf: NotebookScanConfidence) => {
    if (conf === 'High') return 'text-[#0F5132] bg-[#E8F5E9] border-[#B7E4C7]';
    if (conf === 'Review') return 'text-[#9A5B00] bg-[#FEF3C7] border-[#FCD34D]';
    return 'text-[#B42318] bg-[#FEE4E2] border-[#FDA29B]';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="AI Notebook Photo Size Scanner"
    >
      {/* Hidden File Inputs: Mobile Rear Camera & Gallery Upload */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => void processFiles(e.target.files)}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp,.heic,.heif"
        multiple
        className="hidden"
        onChange={e => void processFiles(e.target.files)}
      />

      <div className="bg-white border border-[#E5E5E5] rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#1A1A1A] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#C89211] text-white flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold truncate">
                  AI Notebook Photo Size Scanner
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#2D2D2D] text-[#E6B33A] border border-[#C89211]/40">
                  <Sparkles className="w-3 h-3" />
                  Human-Verified OCR
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-300 truncate">
                Scan handwritten Hindi, English &amp; Hinglish carpenter notebook sizes into your Sliding Window Calculator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close notebook scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#FFFFFF]">
          {/* Step 1: Capture / Upload Action Bar */}
          <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                  {pages.length === 0
                    ? 'Step 1: Capture or Upload Handwritten Notebook Page'
                    : `Scanned ${pages.length} Notebook Page${pages.length === 1 ? '' : 's'} — Add More Pages if Needed`}
                </h3>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  Supports JPG, JPEG, PNG, WebP &amp; HEIC · Multiple windows per page &amp; multi-page projects supported.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                <button
                  id="nb-scanner-take-photo"
                  type="button"
                  disabled={isScanning}
                  onClick={() => triggerTakePhoto(null)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-[#C89211] hover:bg-[#A6780E] text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>{pages.length > 0 ? 'Take Another' : 'Take Photo'}</span>
                </button>
                <button
                  id="nb-scanner-upload-photo"
                  type="button"
                  disabled={isScanning}
                  onClick={() => triggerUploadPhoto(null)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-[#E6B33A] shrink-0" />
                  <span>{pages.length > 0 ? 'Add Photo(s)' : 'Upload Photo'}</span>
                </button>
              </div>
            </div>

            {/* Scanning Progress Indicator */}
            {isScanning && (
              <div className="mt-3 p-3 rounded-lg bg-white border border-[#C89211]/50 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#C89211] animate-spin shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-[#1A1A1A]">
                    {scanningProgressText || 'Reading handwritten measurements with Gemini Vision...'}
                  </div>
                  <div className="text-[11px] text-[#666666]">
                    Checking Width × Height notation, units (Inch / Feet / MM), decimals, and uncertain digits.
                  </div>
                </div>
              </div>
            )}

            {/* Scan Error Notice */}
            {scanError && (
              <div className="mt-3 p-3 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScanError(null)}
                  className="p-0.5 hover:opacity-70 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Empty State Guidance before first photo */}
          {pages.length === 0 && rows.length === 0 && !isScanning && (
            <div className="border border-dashed border-[#D6D3CD] rounded-xl p-6 sm:p-8 text-center bg-[#FAFAF8]">
              <FileImage className="w-10 h-10 text-[#C89211] mx-auto mb-3" />
              <h4 className="text-sm font-bold text-[#1A1A1A]">
                Ready to Scan Your Carpenter Measurement Notebook
              </h4>
              <p className="text-xs text-[#666666] mt-1.5 max-w-xl mx-auto leading-relaxed">
                Take a crisp photo of your measurement sheet (e.g. <span className="font-mono text-[#1A1A1A]">W1 = 36 × 48</span>,{' '}
                <span className="font-mono text-[#1A1A1A]">W2 = 42 × 48</span>,{' '}
                <span className="font-mono text-[#1A1A1A]">W3 = 4 × 3.5 Feet</span>). Uncertain or overwritten numbers will be highlighted for your confirmation before any fabrication calculation runs.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[#555555]">
                <span className="px-2.5 py-1 rounded bg-white border border-[#E5E5E5]">Hindi / English / Hinglish</span>
                <span className="px-2.5 py-1 rounded bg-white border border-[#E5E5E5]">Inch · Feet · MM · Decimals</span>
                <span className="px-2.5 py-1 rounded bg-white border border-[#E5E5E5]">Multi-Page &amp; 15+ Windows</span>
                <span className="px-2.5 py-1 rounded bg-white border border-[#E5E5E5]">Uses Existing Saved Profiles</span>
              </div>
            </div>
          )}

          {/* Split Workspace once >= 1 page or manual row exists */}
          {(pages.length > 0 || rows.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Original Notebook Photo Viewer (for side-by-side comparison) */}
              <div className="lg:col-span-5 bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-white border-b border-[#E5E5E5] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileImage className="w-4 h-4 text-[#C89211] shrink-0" />
                    <span className="text-xs font-bold text-[#1A1A1A] truncate">
                      Original Notebook Photo {activePage ? `(Page ${activePage.pageNumber})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setZoomed(z => !z)}
                      className="p-1.5 rounded-md bg-[#F8F8F6] hover:bg-[#EFECE6] text-[#1A1A1A] border border-[#E5E5E5] cursor-pointer"
                      title={zoomed ? 'Reset zoom' : 'Zoom in to inspect handwriting'}
                    >
                      {zoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                    </button>
                    {activePage && (
                      <>
                        <button
                          type="button"
                          disabled={isScanning}
                          onClick={() => triggerUploadPhoto(activePage.id)}
                          className="px-2 py-1.5 rounded-md bg-[#F8F8F6] hover:bg-[#EFECE6] text-[#1A1A1A] border border-[#E5E5E5] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Replace and rescan this page"
                        >
                          <RefreshCw className="w-3 h-3 text-[#C89211]" />
                          Rescan
                        </button>
                        <button
                          type="button"
                          disabled={isScanning}
                          onClick={() => handleRemovePage(activePage.id)}
                          className="p-1.5 rounded-md bg-white hover:bg-[#FEF3F2] text-[#B42318] border border-[#E5E5E5] cursor-pointer disabled:opacity-50"
                          title="Remove this page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Multi-Page Tabs */}
                {pages.length > 1 && (
                  <div className="px-3 py-2 bg-[#F8F8F6] border-b border-[#E5E5E5] flex items-center gap-1.5 overflow-x-auto">
                    {pages.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActivePageId(p.id)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                          activePage?.id === p.id
                            ? 'bg-[#1A1A1A] text-white'
                            : 'bg-white text-[#555555] border border-[#DCDCDC] hover:border-[#C89211]'
                        }`}
                      >
                        Page {p.pageNumber} ({rows.filter(r => r.pageId === p.id).length})
                      </button>
                    ))}
                  </div>
                )}

                {/* Photo Canvas */}
                <div className="p-3">
                  {activePage && (activePage.localPreviewUrl || activePage.photoUrl) ? (
                    <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-auto max-h-[380px] sm:max-h-[460px]">
                      <img
                        src={activePage.localPreviewUrl || activePage.photoUrl}
                        alt={`Scanned notebook page ${activePage.pageNumber}`}
                        className={`w-full h-auto object-contain transition-transform origin-top-left ${
                          zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                        }`}
                        onClick={() => setZoomed(z => !z)}
                      />
                    </div>
                  ) : (
                    <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 text-center text-xs text-[#666666]">
                      {activePage
                        ? `Uploaded file: ${activePage.fileName} (HEIC preview not supported natively in this browser — AI OCR extracted values on the right)`
                        : 'No photo attached yet'}
                    </div>
                  )}

                  {/* AI Page Summary & Page Warnings */}
                  {activePage?.rawAiSummary && (
                    <div className="mt-3 p-2.5 rounded-lg bg-white border border-[#E5E5E5] text-[11px] text-[#444444]">
                      <span className="font-bold text-[#1A1A1A]">AI Reading Note: </span>
                      {activePage.rawAiSummary}
                    </div>
                  )}

                  {activePage && activePage.warnings.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-lg bg-[#FFFBEB] border border-[#FCD34D] text-[11px] text-[#9A5B00] space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Photo Quality / Reading Alerts
                      </div>
                      {activePage.warnings.map((w, i) => (
                        <div key={i}>• {w}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Editable Verification Table + Profile Spec */}
              <div ref={tableContainerRef} className="lg:col-span-7 space-y-4">
                {/* Project / Customer & Fabrication Profile Selector */}
                <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                        Project Name {pages.some(p => p.detectedProjectName) ? '(Detected)' : ''}
                      </label>
                      <input
                        type="text"
                        value={scanProjectName}
                        onChange={e => setScanProjectName(e.target.value)}
                        placeholder="e.g. Sharma Residence"
                        className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                        Customer Name {pages.some(p => p.detectedCustomerName) ? '(Detected)' : ''}
                      </label>
                      <input
                        type="text"
                        value={scanCustomerName}
                        onChange={e => setScanCustomerName(e.target.value)}
                        placeholder="e.g. Rajesh Sharma"
                        className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                      />
                    </div>
                  </div>

                  {/* Saved Fabrication Profile & Track Spec (Strictly Read-Only on Profile Rules) */}
                  <div className="pt-2 border-t border-[#E5E5E5] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-[#555555] uppercase tracking-wider mb-1">
                        Track Type
                      </label>
                      <select
                        value={selectedTrackType}
                        onChange={e => handleTrackTypeChange(e.target.value as SlidingTrackType)}
                        className="w-full px-2.5 py-2 text-xs font-semibold border border-[#DCDCDC] rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                      >
                        <option value="2-track">2 Track</option>
                        <option value="3-track">3 Track</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-[#555555] uppercase tracking-wider mb-1">
                        Saved Profile
                      </label>
                      <select
                        value={selectedProfileId}
                        onChange={e => setSelectedProfileId(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs font-semibold border border-[#DCDCDC] rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                      >
                        {(trackProfiles.length > 0 ? trackProfiles : profiles).map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#555555] uppercase tracking-wider mb-1">
                        Glass Spec
                      </label>
                      <select
                        value={selectedGlassThickness}
                        onChange={e => setSelectedGlassThickness(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-[#DCDCDC] rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                      >
                        {GLASS_THICKNESS_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#555555] uppercase tracking-wider mb-1">
                        Mosquito Net
                      </label>
                      <button
                        type="button"
                        onClick={() => setMosquitoNetRequired(v => !v)}
                        className={`w-full px-2.5 py-2 text-xs font-bold rounded-lg border cursor-pointer transition-colors ${
                          mosquitoNetRequired
                            ? 'bg-[#C89211] text-white border-[#C89211]'
                            : 'bg-white text-[#444444] border-[#DCDCDC]'
                        }`}
                      >
                        {mosquitoNetRequired ? 'Net: YES' : 'Net: NO'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Validation Alerts: Duplicates / Missing / Review */}
                {duplicateWindowKeys.size > 0 && (
                  <div className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FCD34D] flex flex-wrap items-center justify-between gap-2 text-xs text-[#9A5B00]">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Duplicate window numbers detected:{' '}
                        <span className="font-mono font-bold">
                          {Array.from(duplicateWindowKeys).join(', ')}
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoRenumberDuplicates}
                      className="px-3 py-1.5 rounded-md bg-[#1A1A1A] text-white text-[11px] font-bold hover:bg-black cursor-pointer whitespace-nowrap"
                    >
                      Auto-Renumber Duplicates
                    </button>
                  </div>
                )}

                {(reviewOrUnclearRows.length > 0 || missingDimensionRows.length > 0) && (
                  <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex flex-wrap items-center justify-between gap-2 text-xs text-[#991B1B]">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Human Verification Required: </span>
                        {missingDimensionRows.length > 0 && (
                          <span>{missingDimensionRows.length} missing/unreadable size(s). </span>
                        )}
                        {reviewOrUnclearRows.length > 0 && (
                          <span>
                            {reviewOrUnclearRows.length} row(s) flagged for Review/Unclear reading. Compare highlighted rows with the notebook photo before calculating.
                          </span>
                        )}
                      </div>
                    </div>
                    {missingDimensionRows.length === 0 && unverifiedRows.length > 0 && (
                      <button
                        type="button"
                        onClick={handleVerifyAllValidRows}
                        className="px-3 py-1.5 rounded-md bg-[#0F5132] text-white text-[11px] font-bold hover:bg-[#0B3D26] cursor-pointer whitespace-nowrap"
                      >
                        Mark All Valid Verified
                      </button>
                    )}
                  </div>
                )}

                {/* Extracted Window Measurements Table */}
                <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#F8F8F6] border-b border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#1A1A1A] flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#C89211]" />
                        AI Extraction Results ({rows.length} Window{rows.length === 1 ? '' : 's'})
                      </h3>
                      <p className="text-[11px] text-[#666666]">
                        Edit any Width, Height, Unit, or Window No. below. Yellow = Review, Red = Unclear/Missing.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddManualRow}
                      className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-lg bg-white hover:bg-[#FFF7E3] text-[#1A1A1A] border border-[#C89211]/60 text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#C89211]" />
                      Add Window Manually
                    </button>
                  </div>

                  {rows.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#666666]">
                      No rows extracted from this photograph. Click{' '}
                      <span className="font-bold text-[#1A1A1A]">Rescan</span> or{' '}
                      <span className="font-bold text-[#1A1A1A]">Add Window Manually</span>.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#FAFAF8] border-b border-[#E5E5E5] text-[10px] font-bold uppercase tracking-wider text-[#555555]">
                            <th className="py-2.5 px-2.5 w-10 text-center">Verify</th>
                            <th className="py-2.5 px-2.5 min-w-[92px]">Window No.</th>
                            <th className="py-2.5 px-2.5 min-w-[92px]">Width</th>
                            <th className="py-2.5 px-2.5 min-w-[92px]">Height</th>
                            <th className="py-2.5 px-2.5 min-w-[84px]">Unit</th>
                            <th className="py-2.5 px-2.5 min-w-[90px]">Confidence</th>
                            <th className="py-2.5 px-2.5 w-10 text-center">Del</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFECE6]">
                          {rows.map(row => {
                            const isMissing =
                              row.width === null ||
                              row.height === null ||
                              row.width <= 0 ||
                              row.height <= 0;
                            const isDup = duplicateWindowKeys.has(row.windowNumber.trim().toUpperCase());
                            const isRed = row.confidence === 'Unclear' || isMissing;
                            const isYellow = !isRed && (row.confidence === 'Review' || isDup || row.unitAmbiguous);
                            const rowBg = isRed
                              ? 'bg-[#FEF2F2]'
                              : isYellow
                              ? 'bg-[#FFFBEB]'
                              : 'bg-white';

                            return (
                              <React.Fragment key={row.id}>
                                <tr className={`${rowBg} transition-colors`}>
                                  <td className="py-2.5 px-2.5 text-center align-top">
                                    <button
                                      type="button"
                                      disabled={isMissing}
                                      onClick={() =>
                                        handleUpdateRow(row.id, { confirmed: !row.confirmed })
                                      }
                                      className="p-1 rounded hover:bg-black/5 disabled:opacity-35 cursor-pointer"
                                      title={
                                        isMissing
                                          ? 'Enter Width and Height before verifying'
                                          : row.confirmed
                                          ? 'Verified by user'
                                          : 'Click to verify this reading'
                                      }
                                    >
                                      {row.confirmed ? (
                                        <CheckSquare className="w-4 h-4 text-[#0F5132]" />
                                      ) : (
                                        <Square className="w-4 h-4 text-[#9A5B00]" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-2 px-2 align-top">
                                    <input
                                      type="text"
                                      value={row.windowNumber}
                                      onChange={e =>
                                        handleUpdateRow(row.id, { windowNumber: e.target.value })
                                      }
                                      className={`w-full px-2 py-1.5 text-xs font-mono font-bold rounded border bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211] ${
                                        isDup ? 'border-[#D97706]' : 'border-[#DCDCDC]'
                                      }`}
                                    />
                                    <div className="text-[10px] text-[#777777] mt-0.5 truncate">
                                      {row.pageLabel}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 align-top">
                                    <MeasurementInput
                                      value={row.width}
                                      unit={row.unit}
                                      allowEmpty
                                      placeholder="?"
                                      ariaLabel={`Width for ${row.windowNumber}`}
                                      dataNeedsAttention={
                                        row.width === null || row.width <= 0 || isRed || isYellow
                                          ? 'true'
                                          : 'false'
                                      }
                                      onValueChange={val =>
                                        handleUpdateRow(row.id, {
                                          width: val !== null && Number.isFinite(val) ? val : null,
                                        })
                                      }
                                      className={`w-full px-2 py-1.5 text-xs font-mono tabular-nums font-bold rounded border bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211] ${
                                        row.width === null || row.width <= 0
                                          ? 'border-[#DC2626] bg-[#FEF2F2]'
                                          : highlightEditMode && (isRed || isYellow)
                                          ? 'border-[#D97706]'
                                          : 'border-[#DCDCDC]'
                                      }`}
                                    />
                                  </td>
                                  <td className="py-2 px-2 align-top">
                                    <MeasurementInput
                                      value={row.height}
                                      unit={row.unit}
                                      allowEmpty
                                      placeholder="?"
                                      ariaLabel={`Height for ${row.windowNumber}`}
                                      dataNeedsAttention={
                                        row.height === null || row.height <= 0 || isRed || isYellow
                                          ? 'true'
                                          : 'false'
                                      }
                                      onValueChange={val =>
                                        handleUpdateRow(row.id, {
                                          height: val !== null && Number.isFinite(val) ? val : null,
                                        })
                                      }
                                      className={`w-full px-2 py-1.5 text-xs font-mono tabular-nums font-bold rounded border bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211] ${
                                        row.height === null || row.height <= 0
                                          ? 'border-[#DC2626] bg-[#FEF2F2]'
                                          : highlightEditMode && (isRed || isYellow)
                                          ? 'border-[#D97706]'
                                          : 'border-[#DCDCDC]'
                                      }`}
                                    />
                                  </td>
                                  <td className="py-2 px-2 align-top">
                                    <select
                                      value={row.unit}
                                      onChange={e =>
                                        handleUpdateRow(row.id, {
                                          unit: e.target.value as WindowMeasurementUnit,
                                          unitAmbiguous: false,
                                        })
                                      }
                                      className={`w-full px-1.5 py-1.5 text-xs font-semibold rounded border bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211] ${
                                        row.unitAmbiguous ? 'border-[#D97706]' : 'border-[#DCDCDC]'
                                      }`}
                                    >
                                      <option value="inch">Inch</option>
                                      <option value="feet">Feet</option>
                                      <option value="mm">MM</option>
                                    </select>
                                  </td>
                                  <td className="py-2 px-2 align-top">
                                    <span
                                      className={`inline-block text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap ${getConfidenceBadgeClass(
                                        isMissing ? 'Unclear' : row.confidence
                                      )}`}
                                    >
                                      {isMissing ? 'Unclear' : row.confidence}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-center align-top">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(row.id)}
                                      className="p-1.5 rounded text-[#888888] hover:text-[#B42318] hover:bg-white cursor-pointer"
                                      title="Delete row"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                                {/* Original Recognized Handwritten Text + Warning Flags Sub-Row */}
                                <tr className={`${rowBg} border-b border-[#E5E5E5]`}>
                                  <td colSpan={7} className="pb-2.5 pt-0 px-3">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                                      <span className="text-[#666666]">
                                        Recognized Text:{' '}
                                        <span className="font-mono font-semibold text-[#1A1A1A]">
                                          &ldquo;{row.rawText}&rdquo;
                                        </span>
                                      </span>
                                      {row.notes && (
                                        <span className="text-[#555555]">Note: {row.notes}</span>
                                      )}
                                      {row.flags.map((flag, fIdx) => (
                                        <span
                                          key={fIdx}
                                          className="text-[10px] font-semibold text-[#9A5B00] inline-flex items-center gap-1"
                                        >
                                          <AlertTriangle className="w-3 h-3 shrink-0" />
                                          {flag}
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Human Verification Confirmation Warning */}
                {confirmWarning && (
                  <div className="p-3 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318] flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{confirmWarning}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Human-Verification Gate Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#F8F8F6] border-t border-[#E5E5E5] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-[#555555]">
            <CheckCircle2 className="w-4 h-4 text-[#C89211] shrink-0" />
            <span>
              {rows.length === 0
                ? 'Scan a notebook page to extract measurements'
                : `${rows.filter(r => r.confirmed).length} of ${rows.length} window measurement(s) verified · Calculation begins only after confirmation`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 min-h-[44px] rounded-lg bg-white hover:bg-[#EFECE6] text-[#444444] border border-[#DCDCDC] text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isScanning}
              onClick={() => triggerUploadPhoto(activePage?.id || null)}
              className="px-3.5 py-2.5 min-h-[44px] rounded-lg bg-white hover:bg-[#EFECE6] text-[#1A1A1A] border border-[#DCDCDC] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#C89211]" />
              Rescan Photo
            </button>
            <button
              type="button"
              disabled={rows.length === 0}
              onClick={handleEditMeasurementsClick}
              className="px-3.5 py-2.5 min-h-[44px] rounded-lg bg-white hover:bg-[#FFF7E3] text-[#1A1A1A] border border-[#C89211]/60 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-40"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#C89211]" />
              Edit Measurements
            </button>
            <button
              id="nb-scanner-confirm-all"
              type="button"
              disabled={rows.length === 0 || isScanning}
              onClick={handleConfirmAllAndCalculate}
              className="col-span-2 sm:col-span-1 px-4 py-2.5 min-h-[44px] rounded-lg bg-[#C89211] hover:bg-[#A6780E] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm All Measurements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
