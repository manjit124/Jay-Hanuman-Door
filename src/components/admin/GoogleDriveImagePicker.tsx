import React, { useState, useEffect } from 'react';
import {
  Upload,
  HardDrive,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import {
  uploadImage,
  previewDriveOrExternalImage,
  importDriveOrExternalImageToStorage,
  type DriveImagePreviewResult,
  type DriveImageImportResult,
} from '../../lib/api.ts';

export interface GoogleDriveImagePickerProps {
  label?: string;
  sublabel?: string;
  value: string;
  onChange: (url: string, metadata?: { fileId?: string; mimeType?: string; size?: number; width?: number; height?: number }) => void;
  allowMultiple?: boolean;
  onAddMultiple?: (urls: string[]) => void;
  category?: 'products' | 'catalog' | 'banners' | 'delivery' | 'videos' | string;
  deviceUploadButtonText?: string;
  aspectRatioHint?: string;
  previewHeightClass?: string;
  disabled?: boolean;
  compact?: boolean;
  onToast?: (msg: string) => void;
}

export const GoogleDriveImagePicker: React.FC<GoogleDriveImagePickerProps> = ({
  label = 'Image',
  sublabel = 'Auto-optimizes photos and saves permanently to Google Drive',
  value,
  onChange,
  allowMultiple = false,
  onAddMultiple,
  category = 'products',
  deviceUploadButtonText,
  aspectRatioHint,
  previewHeightClass = 'h-36',
  disabled = false,
  compact = false,
  onToast,
}) => {
  const [sourceMode, setSourceMode] = useState<'device' | 'drive'>('device');
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewResult, setPreviewResult] = useState<DriveImagePreviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear messages on tab change
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [sourceMode]);

  // Handle Option A: Upload from Device
  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || isUploading || disabled) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    if (allowMultiple && files.length > 1 && onAddMultiple) {
      setIsUploading(true);
      setUploadProgress(10);
      try {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file.type.startsWith('image/')) continue;
          setUploadProgress(Math.round(((i + 1) / files.length) * 90));
          const res = await uploadImage(file, {
            maxDimension: 1920,
            quality: 0.84,
          });
          if (res?.url) uploadedUrls.push(res.url);
        }
        if (uploadedUrls.length > 0) {
          onAddMultiple(uploadedUrls);
          setSuccessMessage(`Uploaded ${uploadedUrls.length} image(s) permanently to Google Drive!`);
          if (onToast) onToast(`Uploaded ${uploadedUrls.length} image(s) to Google Drive`);
        }
      } catch (err: any) {
        const msg = err?.message || 'Device upload failed. Please try again.';
        setErrorMessage(msg);
        if (onToast) onToast(msg);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
        e.target.value = '';
      }
      return;
    }

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      const err = 'Invalid file type: Please select an image file (JPG, PNG, WebP, GIF, SVG).';
      setErrorMessage(err);
      if (onToast) onToast(err);
      e.target.value = '';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      const err = 'File size exceeds 20 MB limit. Please select a smaller photo.';
      setErrorMessage(err);
      if (onToast) onToast(err);
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    try {
      const res = await uploadImage(file, {
        maxDimension: 1920,
        quality: 0.84,
        onProgress: pct => setUploadProgress(pct),
      });

      if (res?.url) {
        onChange(res.url, {
          size: res.optimizedSize || res.originalSize,
          width: res.width,
          height: res.height,
        });
        setSuccessMessage('Photo uploaded and saved permanently to Google Drive!');
        if (onToast) onToast('Photo saved to Google Drive!');
      } else {
        throw new Error('Upload server did not return a valid image URL.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Device photo upload failed. Please try again or use Google Drive link.';
      setErrorMessage(msg);
      if (onToast) onToast(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  // Handle Option B: Preview Google Drive Image
  const handlePreviewDrive = async () => {
    const raw = driveUrlInput.trim();
    if (!raw || isPreviewing || isImporting || disabled) return;

    setIsPreviewing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewResult(null);

    try {
      const preview = await previewDriveOrExternalImage(raw);
      setPreviewResult(preview);
      setSuccessMessage(
        preview.isGoogleDrive
          ? `Verified Google Drive Image (${preview.width}×${preview.height}px, ${Math.max(1, Math.round(preview.size / 1024))} KB)`
          : `Verified Image (${preview.width}×${preview.height}px, ${Math.max(1, Math.round(preview.size / 1024))} KB)`
      );
    } catch (err: any) {
      setPreviewResult(null);
      const rawMsg = String(err?.message || err || '').trim();
      const cleanMsg =
        !rawMsg || rawMsg === 'Failed to fetch' || rawMsg === 'Load failed' || rawMsg === 'NetworkError'
          ? 'Network error connecting to backend. Please verify your connection or upload the image directly from your device.'
          : rawMsg;
      setErrorMessage(cleanMsg);
    } finally {
      setIsPreviewing(false);
    }
  };

  // Handle Option B: Import Google Drive Image into Permanent Storage
  const handleImportDrive = async () => {
    const raw = driveUrlInput.trim();
    if (!raw || isImporting || isPreviewing || disabled) return;

    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const imported: DriveImageImportResult = await importDriveOrExternalImageToStorage(raw, category);
      const permanentUrl = imported.url;

      onChange(permanentUrl, {
        fileId: imported.fileId || undefined,
        mimeType: imported.mimeType,
        size: imported.size,
        width: imported.width,
        height: imported.height,
      });

      setDriveUrlInput('');
      setPreviewResult(null);
      setSuccessMessage(
        `Imported successfully to Google Drive (${imported.width}×${imported.height}px, ${Math.max(1, Math.round(imported.size / 1024))} KB)!`
      );
      if (onToast) onToast('Image imported and saved permanently to Google Drive!');
    } catch (err: any) {
      const rawMsg = String(err?.message || err || '').trim();
      const cleanMsg =
        !rawMsg || rawMsg === 'Failed to fetch' || rawMsg === 'Load failed' || rawMsg === 'NetworkError'
          ? 'Network error connecting to Google Drive storage service. Please check your network connection or upload directly from your device.'
          : rawMsg;
      setErrorMessage(cleanMsg);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={`rounded-xl border border-[#E5E5E5] bg-white transition-all ${compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-3'}`}>
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {label && (
            <label className="block font-bold text-[#1A1A1A] text-xs flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#C89211]" />
              <span>{label}</span>
              {aspectRatioHint && (
                <span className="text-[10px] text-[#666666] font-normal">({aspectRatioHint})</span>
              )}
            </label>
          )}
          {sublabel && <p className="text-[10px] text-[#666666] mt-0.5">{sublabel}</p>}
        </div>

        {/* Option A / Option B Segmented Switcher */}
        <div className="inline-flex rounded-lg bg-[#F8F8F6] p-0.5 border border-[#E5E5E5]">
          <button
            type="button"
            onClick={() => setSourceMode('device')}
            disabled={disabled}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sourceMode === 'device'
                ? 'bg-[#C89211] text-white shadow-xs'
                : 'text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>Option A: Device Upload</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('drive')}
            disabled={disabled}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
              sourceMode === 'drive'
                ? 'bg-[#C89211] text-white shadow-xs'
                : 'text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            <HardDrive className="w-3 h-3" />
            <span>Option B: Google Drive Link</span>
          </button>
        </div>
      </div>

      {/* Option A: Upload from Device */}
      {sourceMode === 'device' && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <label
              className={`px-3.5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-xs transition ${
                isUploading || disabled
                  ? 'bg-stone-400 cursor-not-allowed'
                  : 'bg-[#C89211] hover:bg-[#A0700B] cursor-pointer active:scale-95'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading{uploadProgress !== null ? ` ${uploadProgress}%` : ''}...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {deviceUploadButtonText || (value ? 'Replace Image from Device' : 'Upload Image from Device')}
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple={allowMultiple}
                disabled={isUploading || disabled}
                onChange={handleDeviceUpload}
                className="hidden"
              />
            </label>

            <span className="text-[11px] text-[#666666]">
              JPG, PNG, WebP up to 20 MB • Saves permanently to Google Drive
            </span>
          </div>
        </div>
      )}

      {/* Option B: Google Drive Image Link */}
      {sourceMode === 'drive' && (
        <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#666666]">
            <span className="font-semibold text-[#1A1A1A]">Paste Google Drive Sharing URL or Direct Image Link:</span>
            <span>Supports /file/d/FILE_ID/view &amp; open?id=FILE_ID</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={driveUrlInput}
              onChange={e => {
                setDriveUrlInput(e.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
              disabled={disabled || isPreviewing || isImporting}
              className="flex-1 px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:ring-2 focus:ring-[#C89211] focus:outline-none"
            />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isPreviewing || isImporting || !driveUrlInput.trim() || disabled}
                onClick={handlePreviewDrive}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-100 text-[#1A1A1A] border border-[#D5D5D0] font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {isPreviewing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C89211]" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-[#C89211]" />
                )}
                <span>{isPreviewing ? 'Checking...' : 'Preview Image'}</span>
              </button>

              <button
                type="button"
                disabled={isImporting || isPreviewing || !driveUrlInput.trim() || disabled}
                onClick={handleImportDrive}
                className="px-4 py-2 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isImporting ? 'Importing to Drive...' : 'Import Image'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview of Checked Google Drive Link (before importing) */}
      {previewResult && (
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Image Preview from Link (Ready to Import)</span>
            </span>
            <span className="text-[10px] text-amber-800 font-mono bg-amber-100/70 px-2 py-0.5 rounded">
              {previewResult.width} × {previewResult.height} px • {Math.max(1, Math.round(previewResult.size / 1024))} KB
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <img
              src={previewResult.previewDataUrl}
              alt="Preview"
              className="max-h-36 max-w-[200px] object-contain rounded-lg bg-white border border-amber-200 shadow-xs"
            />
            <div className="flex-1 space-y-1.5 text-xs">
              <p className="text-[11px] text-[#1A1A1A]">
                <strong>Format:</strong> {previewResult.mimeType} {previewResult.isGoogleDrive && '• Google Drive File'}
              </p>
              {previewResult.fileId && (
                <p className="text-[10px] text-[#666666] font-mono break-all">
                  File ID: {previewResult.fileId}
                </p>
              )}
              <button
                type="button"
                onClick={handleImportDrive}
                disabled={isImporting}
                className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Import and Save to Permanent Google Drive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <strong className="font-bold text-rose-900 block">Image Operation Failed</strong>
            <p className="text-[11px] leading-relaxed text-rose-800">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-800 p-1 text-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Success Message Alert */}
      {successMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-semibold flex-1">{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Current Active Image Preview Card */}
      {value && value.trim().length > 0 && (
        <div className="p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="relative group shrink-0">
            <img
              src={value}
              alt="Current"
              className={`w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg bg-white border border-[#D5D5D0] shadow-xs`}
              onError={e => {
                // Fallback for broken image
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80';
              }}
            />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Saved in Google Drive
              </span>
              {value.includes('drive.google.com') || value.includes('/api/drive/media/') ? (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                  Google Drive File
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-[#1A1A1A] font-mono truncate" title={value}>
              {value}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white hover:bg-stone-100 text-[#1A1A1A] border border-[#D5D5D0] text-xs flex items-center gap-1"
              title="Open full image in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
              disabled={disabled}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Remove this image"
            >
              <X className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
