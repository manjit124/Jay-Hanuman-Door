import React, { useState, useEffect, useRef } from 'react';
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
  Video,
  Box,
  ClipboardPaste,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  uploadImage,
  uploadVideo,
  upload3DModel,
  previewDriveOrExternalMedia,
  importDriveOrExternalMediaToStorage,
  resolveImageUrl,
  isGoogleDriveEmbedUrl,
  extractClientGoogleDriveFileId,
  getClientGoogleDriveDirectUrl,
  getClientGoogleDriveThumbnailUrl,
  type DriveMediaPreviewResult,
  type DriveMediaImportResult,
} from '../../lib/api.ts';

export interface GoogleDriveImagePickerProps {
  label?: string;
  sublabel?: string;
  helperText?: string;
  value: string;
  onChange: (
    url: string,
    metadata?: {
      fileId?: string;
      mimeType?: string;
      size?: number;
      width?: number;
      height?: number;
      isVideo?: boolean;
      is3DModel?: boolean;
    }
  ) => void;
  onFileSelect?: (file: File) => void;
  allowMultiple?: boolean;
  onAddMultiple?: (urls: string[]) => void;
  category?: 'products' | 'catalog' | 'banners' | 'delivery' | 'videos' | string;
  mediaType?: 'image' | 'video' | 'model3d' | 'any';
  allowVideo?: boolean;
  deviceUploadButtonText?: string;
  aspectRatioHint?: string;
  previewHeightClass?: string;
  disabled?: boolean;
  compact?: boolean;
  onToast?: (msg: string) => void;
}

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    url.includes('mimeType=video') ||
    url.includes('/videos/')
  );
}

function is3DModelUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.toLowerCase().split('?')[0];
  return clean.endsWith('.glb') || clean.endsWith('.gltf');
}

export const GoogleDriveImagePicker: React.FC<GoogleDriveImagePickerProps> = ({
  label = 'Media Asset',
  sublabel,
  helperText,
  value,
  onChange,
  onFileSelect,
  allowMultiple = false,
  onAddMultiple,
  category = 'products',
  mediaType = 'image',
  allowVideo = false,
  deviceUploadButtonText,
  aspectRatioHint,
  disabled = false,
  compact = false,
  onToast,
}) => {
  const effectiveMediaType: 'image' | 'video' | 'model3d' | 'any' =
    mediaType === 'video'
      ? 'video'
      : mediaType === 'model3d'
      ? 'model3d'
      : allowVideo || mediaType === 'any'
      ? 'any'
      : 'image';

  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceMode, setSourceMode] = useState<'device' | 'drive'>('device');
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewResult, setPreviewResult] = useState<DriveMediaPreviewResult | null>(null);
  const [clientFallback, setClientFallback] = useState<{
    directUrl: string;
    thumbnailUrl?: string;
    fileId: string | null;
    isVideo: boolean;
    previewFailed?: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear messages on tab change
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setClientFallback(null);
  }, [sourceMode]);

  // Determine accepted file types for Option A Device Upload
  const fileAccept =
    effectiveMediaType === 'video'
      ? 'video/mp4,video/webm,video/quicktime,video/mov,video/*'
      : effectiveMediaType === 'model3d'
      ? '.glb,.gltf'
      : effectiveMediaType === 'any'
      ? 'image/*,video/*,.glb,.gltf'
      : 'image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/*';

  // Handle Option A: Upload from Device
  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || isUploading || disabled) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Multi-upload for images
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
          setSuccessMessage(`Uploaded ${uploadedUrls.length} file(s) permanently to Google Drive!`);
          if (onToast) onToast(`Uploaded ${uploadedUrls.length} file(s) to Google Drive`);
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
    if (onFileSelect) {
      onFileSelect(file);
    }

    // Video Upload
    if (file.type.startsWith('video/') || effectiveMediaType === 'video') {
      if (file.size > 55 * 1024 * 1024) {
        const err = 'Video file size exceeds 55 MB limit. Please select a compressed video.';
        setErrorMessage(err);
        if (onToast) onToast(err);
        e.target.value = '';
        return;
      }

      setIsUploading(true);
      setUploadProgress(10);
      try {
        const res = await uploadVideo(file, pct => setUploadProgress(pct));
        if (res?.url) {
          onChange(res.url, {
            size: res.size || file.size,
            mimeType: file.type || 'video/mp4',
            isVideo: true,
          });
          setSuccessMessage('Video uploaded and saved permanently to Google Drive!');
          if (onToast) onToast('Video saved to Google Drive!');
        } else {
          throw new Error('Upload server did not return a valid video URL.');
        }
      } catch (err: any) {
        const msg = err?.message || 'Device video upload failed. Please try again or use Google Drive link.';
        setErrorMessage(msg);
        if (onToast) onToast(msg);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
        e.target.value = '';
      }
      return;
    }

    // 3D Model Upload
    if (file.name.endsWith('.glb') || file.name.endsWith('.gltf') || effectiveMediaType === 'model3d') {
      setIsUploading(true);
      setUploadProgress(20);
      try {
        const res = await upload3DModel(file);
        if (res?.url) {
          onChange(res.url, {
            size: file.size,
            mimeType: 'model/gltf-binary',
            is3DModel: true,
          });
          setSuccessMessage('3D model uploaded and saved permanently to Google Drive!');
          if (onToast) onToast('3D model saved to Google Drive!');
        } else {
          throw new Error('Upload server did not return a valid model URL.');
        }
      } catch (err: any) {
        const msg = err?.message || '3D model upload failed. Please try again.';
        setErrorMessage(msg);
        if (onToast) onToast(msg);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
        e.target.value = '';
      }
      return;
    }

    // Image Upload
    if (!file.type.startsWith('image/')) {
      const err = 'Invalid file type: Please select an image (JPG, PNG, WebP) or video (MP4, WebM).';
      setErrorMessage(err);
      if (onToast) onToast(err);
      e.target.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      const err = 'File size exceeds 25 MB limit. Please select a smaller photo.';
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

  // Paste Link from Clipboard (non-blocking mobile/WebView friendly fallback)
  const handlePasteClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          setDriveUrlInput(clipText.trim());
          setErrorMessage(null);
          setSuccessMessage('Pasted link from clipboard! Click "Preview" to verify.');
          if (onToast) onToast('Pasted link from clipboard');
          return;
        }
      }
    } catch {
      // Browser / WebView clipboard read permission blocked
    }

    urlInputRef.current?.focus();
    setErrorMessage(null);
    setSuccessMessage('Please tap inside the URL box above and paste your Google Drive link (Ctrl+V or long-press -> Paste).');
  };

  const buildClientFallbackOption = (rawUrl: string) => {
    const fileId = extractClientGoogleDriveFileId(rawUrl);
    const isVideoMode = effectiveMediaType === 'video';
    if (fileId) {
      return {
        fileId,
        directUrl: getClientGoogleDriveDirectUrl(fileId, isVideoMode ? 'video' : 'image'),
        thumbnailUrl: isVideoMode ? undefined : getClientGoogleDriveThumbnailUrl(fileId, 1600),
        isVideo: isVideoMode,
        previewFailed: false,
      };
    }
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'https:') {
        const lower = rawUrl.toLowerCase().split('?')[0];
        const looksVideo = isVideoMode || lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
        return {
          fileId: null,
          directUrl: rawUrl,
          isVideo: looksVideo,
          previewFailed: false,
        };
      }
    } catch {}
    return null;
  };

  // Handle Option B: Preview Google Drive Link
  const handlePreviewDrive = async () => {
    const raw = driveUrlInput.trim();
    if (!raw || isPreviewing || isImporting || disabled) return;

    setIsPreviewing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewResult(null);
    setClientFallback(null);

    try {
      const preview = await previewDriveOrExternalMedia(raw, effectiveMediaType);
      setPreviewResult(preview);

      const typeLabel = preview.isVideo ? 'Video' : preview.is3DModel ? '3D Model' : 'Image';
      const dimInfo = preview.width && preview.height ? ` (${preview.width}×${preview.height}px)` : '';
      const sizeInfo = preview.size ? ` • ${Math.max(1, Math.round(preview.size / 1024))} KB` : '';

      setSuccessMessage(
        preview.isGoogleDrive
          ? `Verified Google Drive ${typeLabel}${preview.originalName ? ` "${preview.originalName}"` : ''}${dimInfo}${sizeInfo}. Ready to import!`
          : `Verified ${typeLabel}${dimInfo}${sizeInfo}. Ready to import!`
      );
    } catch (err: any) {
      setPreviewResult(null);
      const rawMsg = String(err?.message || err || '').trim();
      const cleanMsg =
        !rawMsg || rawMsg === 'Failed to fetch' || rawMsg === 'Load failed' || rawMsg === 'NetworkError'
          ? 'Network error connecting to backend. Please check your connection or upload directly from your device.'
          : rawMsg;
      setErrorMessage(cleanMsg);

      const fallbackOpt = buildClientFallbackOption(raw);
      if (fallbackOpt && !rawMsg.includes('DRIVE_PERMISSION_DENIED') && !rawMsg.includes('DRIVE_NOT_FOUND')) {
        setClientFallback(fallbackOpt);
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  // Handle Option B: Import Google Drive Link into Permanent Storage
  const handleImportDrive = async () => {
    const raw = driveUrlInput.trim();
    if (!raw || isImporting || isPreviewing || disabled) return;

    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setClientFallback(null);

    try {
      const targetCat = effectiveMediaType === 'video' ? 'videos' : category;
      const imported: DriveMediaImportResult = await importDriveOrExternalMediaToStorage(
        raw,
        targetCat,
        effectiveMediaType
      );
      const permanentUrl = imported.url;

      onChange(permanentUrl, {
        fileId: imported.fileId || undefined,
        mimeType: imported.mimeType,
        size: imported.size,
        width: imported.width,
        height: imported.height,
        isVideo: imported.isVideo,
        is3DModel: imported.is3DModel,
      });

      setDriveUrlInput('');
      setPreviewResult(null);

      const typeLabel = imported.isVideo ? 'Video' : imported.is3DModel ? '3D Model' : 'Image';
      setSuccessMessage(
        imported.deduplicated
          ? `Linked existing Google Drive ${typeLabel} without creating duplicate storage files!`
          : `Imported ${typeLabel} successfully and saved permanently to Google Drive storage!`
      );
      if (onToast) onToast(`${typeLabel} imported and saved permanently to Google Drive!`);
    } catch (err: any) {
      const rawMsg = String(err?.message || err || '').trim();
      const cleanMsg =
        !rawMsg || rawMsg === 'Failed to fetch' || rawMsg === 'Load failed' || rawMsg === 'NetworkError'
          ? 'Network error connecting to storage service. Please check your network connection or upload directly from your device.'
          : rawMsg;
      setErrorMessage(cleanMsg);

      const fallbackOpt = buildClientFallbackOption(raw);
      if (
        fallbackOpt &&
        !rawMsg.includes('DRIVE_PERMISSION_DENIED') &&
        !rawMsg.includes('DRIVE_NOT_FOUND') &&
        !rawMsg.includes('DRIVE_FOLDER_NOT_SUPPORTED')
      ) {
        setClientFallback(fallbackOpt);
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleApplyClientFallback = () => {
    if (!clientFallback || disabled) return;
    onChange(clientFallback.directUrl, {
      fileId: clientFallback.fileId || undefined,
      isVideo: clientFallback.isVideo,
      is3DModel: effectiveMediaType === 'model3d',
    });
    setDriveUrlInput('');
    setPreviewResult(null);
    setClientFallback(null);
    setErrorMessage(null);
    setSuccessMessage(
      'Linked directly via Google Drive public view URL (fallback mode — file was NOT copied to backend storage). Keep Drive sharing set to "Anyone with the link can view".'
    );
    if (onToast) onToast('Saved direct Google Drive fallback link');
  };

  const resolvedValueUrl = value ? resolveImageUrl(value, '') : '';
  const isCurrentDriveEmbed = Boolean(value && isGoogleDriveEmbedUrl(value));
  const isCurrentVideo = Boolean(value && (isVideoUrl(value) || isCurrentDriveEmbed));
  const isCurrent3D = Boolean(value && is3DModelUrl(value));

  const displaySublabel =
    sublabel ||
    helperText ||
    (effectiveMediaType === 'video'
      ? 'Upload MP4/WebM video or paste Google Drive sharing link. Saved permanently to Google Drive.'
      : effectiveMediaType === 'model3d'
      ? 'Upload .glb/.gltf 3D model or paste Google Drive link. Saved permanently to Google Drive.'
      : effectiveMediaType === 'any'
      ? 'Upload photo or video from device, or paste Google Drive sharing link.'
      : 'Auto-optimizes photos (1680px HD) and saves permanently to Google Drive account.');

  const defaultButtonText =
    deviceUploadButtonText ||
    (effectiveMediaType === 'video'
      ? value
        ? 'Replace Video from Device'
        : 'Upload Video from Device'
      : effectiveMediaType === 'model3d'
      ? value
        ? 'Replace 3D Model from Device'
        : 'Upload 3D Model (.glb)'
      : effectiveMediaType === 'any'
      ? value
        ? 'Replace Photo / Video from Device'
        : 'Upload Photo / Video from Device'
      : value
      ? 'Replace Image from Device'
      : 'Upload Image from Device');

  return (
    <div
      className={`rounded-xl border border-[#E5E5E5] bg-white transition-all ${
        compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-3'
      }`}
    >
      {/* Header with Title and Option A / Option B Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {label && (
            <label className="font-bold text-[#1A1A1A] text-xs flex items-center gap-1.5">
              {effectiveMediaType === 'video' ? (
                <Video className="w-3.5 h-3.5 text-[#C89211]" />
              ) : effectiveMediaType === 'model3d' ? (
                <Box className="w-3.5 h-3.5 text-[#C89211]" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-[#C89211]" />
              )}
              <span>{label}</span>
              {aspectRatioHint && (
                <span className="text-[10px] text-[#666666] font-normal">({aspectRatioHint})</span>
              )}
            </label>
          )}
          {displaySublabel && (
            <p className="text-[10px] text-[#666666] mt-0.5 leading-relaxed">{displaySublabel}</p>
          )}
        </div>

        {/* Option A / Option B Segmented Switcher */}
        <div className="inline-flex rounded-lg bg-[#F8F8F6] p-0.5 border border-[#E5E5E5] shrink-0">
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
                  <span>{defaultButtonText}</span>
                </>
              )}
              <input
                type="file"
                accept={fileAccept}
                multiple={allowMultiple && effectiveMediaType === 'image'}
                disabled={isUploading || disabled}
                onChange={handleDeviceUpload}
                className="hidden"
              />
            </label>

            <span className="text-[11px] text-[#666666]">
              {effectiveMediaType === 'video'
                ? 'MP4, WebM up to 55 MB • Saves permanently to Google Drive'
                : effectiveMediaType === 'model3d'
                ? '.glb or .gltf 3D asset • Saves permanently to Google Drive'
                : effectiveMediaType === 'any'
                ? 'JPG, PNG, WebP (25 MB) or MP4/WebM Video (55 MB)'
                : 'JPG, PNG, WebP up to 25 MB • Saves permanently to Google Drive'}
            </span>
          </div>
        </div>
      )}

      {/* Option B: Google Drive Link Upload with Paste, Preview & Import */}
      {sourceMode === 'drive' && (
        <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#666666]">
            <span className="font-semibold text-[#1A1A1A]">
              Paste Google Drive Sharing URL or Direct Link:
            </span>
            <span>Supports /file/d/FILE_ID/view, open?id=FILE_ID &amp; uc?id=FILE_ID</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                ref={urlInputRef}
                type="url"
                value={driveUrlInput}
                onChange={e => {
                  setDriveUrlInput(e.target.value);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                disabled={disabled || isPreviewing || isImporting}
                className="w-full px-3 py-2 pr-24 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:ring-2 focus:ring-[#C89211] focus:outline-none"
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                disabled={disabled || isPreviewing || isImporting}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-[#F0F0EE] hover:bg-stone-200 text-[#1A1A1A] text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                title="Paste link from clipboard"
              >
                <ClipboardPaste className="w-3 h-3 text-[#C89211]" />
                <span>Paste Link</span>
              </button>
            </div>

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
                <span>{isPreviewing ? 'Checking...' : 'Preview'}</span>
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
                <span>{isImporting ? 'Importing...' : 'Import & Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview of Checked Google Drive Link (before importing) */}
      {previewResult && (
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#C89211]" />
              <span>
                {previewResult.isVideo
                  ? 'Video Preview from Link (Ready to Import)'
                  : previewResult.is3DModel
                  ? '3D Model Preview from Link (Ready to Import)'
                  : 'Image Preview from Link (Ready to Import)'}
              </span>
            </span>
            <span className="text-[10px] text-amber-800 font-mono bg-amber-100/70 px-2 py-0.5 rounded">
              {previewResult.width && previewResult.height ? `${previewResult.width} × ${previewResult.height} px • ` : ''}
              {previewResult.size > 0 ? `${Math.max(1, Math.round(previewResult.size / 1024))} KB` : 'Drive Video Stream'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {previewResult.isVideo ? (
              <div className="relative w-full sm:w-60 aspect-video rounded-lg overflow-hidden bg-black border border-amber-200 shadow-xs shrink-0">
                {previewResult.isDriveEmbed && previewResult.embedUrl ? (
                  <iframe
                    src={previewResult.embedUrl}
                    title="Google Drive Video Preview"
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                ) : previewResult.previewUrl ? (
                  <video
                    src={resolveImageUrl(previewResult.previewUrl, '')}
                    poster={previewResult.previewPosterUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : previewResult.previewPosterUrl ? (
                  <img
                    src={previewResult.previewPosterUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="p-8 text-center text-white text-xs flex flex-col items-center gap-1">
                    <Video className="w-6 h-6 text-[#C89211]" />
                    <span>Google Drive Video</span>
                  </div>
                )}
              </div>
            ) : previewResult.is3DModel ? (
              <div className="w-24 h-24 rounded-lg bg-stone-900 text-white flex flex-col items-center justify-center p-2 text-center border border-amber-200">
                <Box className="w-8 h-8 text-[#C89211] mb-1" />
                <span className="text-[10px] font-mono">.GLB 3D</span>
              </div>
            ) : (
              previewResult.previewDataUrl && (
                <img
                  src={previewResult.previewDataUrl}
                  alt="Preview"
                  className="max-h-36 max-w-[200px] object-contain rounded-lg bg-white border border-amber-200 shadow-xs"
                />
              )
            )}

            <div className="flex-1 space-y-1.5 text-xs">
              <p className="text-[11px] text-[#1A1A1A]">
                <strong>Format:</strong> {previewResult.mimeType}{' '}
                {previewResult.isGoogleDrive && '• Google Drive File'}
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
                {isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Import and Save to Permanent Google Drive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert with Clear Device Upload Action */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div>
              <strong className="font-bold text-rose-900 block">Backend Import Notice</strong>
              <p className="text-[11px] leading-relaxed text-rose-800 break-words">{errorMessage}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSourceMode('device');
                  setErrorMessage(null);
                  setClientFallback(null);
                }}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-[#1A1A1A] border border-rose-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3 text-[#C89211]" />
                <span>Switch to Upload From Device</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setClientFallback(null);
            }}
            className="text-rose-400 hover:text-rose-800 p-1 text-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Client Direct Drive Fallback Preview (when backend route unavailable/blocked) */}
      {clientFallback && (
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-300 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Direct Google Drive Fallback Preview (Optional)</span>
            </span>
            {clientFallback.fileId && (
              <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                File ID: {clientFallback.fileId}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {clientFallback.isVideo ? (
              <div className="w-full sm:w-52 aspect-video rounded-lg overflow-hidden bg-black border border-amber-200 shrink-0">
                <iframe
                  src={clientFallback.directUrl}
                  title="Direct Drive Video Preview"
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen"
                />
              </div>
            ) : (
              <div className="shrink-0">
                {!clientFallback.previewFailed ? (
                  <img
                    src={clientFallback.directUrl}
                    alt="Direct Drive Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-28 max-w-[160px] object-contain rounded-lg bg-white border border-amber-200 shadow-xs"
                    onError={e => {
                      const imgEl = e.target as HTMLImageElement;
                      if (clientFallback.thumbnailUrl && imgEl.src !== clientFallback.thumbnailUrl) {
                        imgEl.src = clientFallback.thumbnailUrl;
                      } else {
                        setClientFallback(prev => (prev ? { ...prev, previewFailed: true } : null));
                      }
                    }}
                  />
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-white border border-amber-200 text-[11px] text-amber-900">
                    Preview could not load directly (check that Google Drive sharing is set to "Anyone with the link can view").
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 space-y-1.5 min-w-0">
              <p className="text-[11px] text-amber-900 leading-relaxed">
                You can link this public URL directly right now, or use <strong>Option A: Device Upload</strong> for local/Drive permanent storage.
              </p>
              <p className="text-[10px] font-mono text-amber-800 truncate" title={clientFallback.directUrl}>
                {clientFallback.directUrl}
              </p>
              <button
                type="button"
                onClick={handleApplyClientFallback}
                className="px-3 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Use Direct Drive Link (Fallback)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
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

      {/* Current Active Media Preview Card with Replace and Remove options */}
      {value && value.trim().length > 0 && (
        <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSourceMode(sourceMode === 'device' ? 'drive' : 'device')}
                disabled={disabled}
                className="px-2 py-1 rounded bg-white hover:bg-stone-100 text-[#C89211] border border-[#D5D5D0] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                title="Replace this media file"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setSuccessMessage(null);
                  setErrorMessage(null);
                }}
                disabled={disabled}
                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                title="Remove this media file"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {isCurrentVideo ? (
              <div className="relative rounded-lg overflow-hidden bg-black w-full sm:w-64 aspect-video shrink-0 shadow-xs">
                {isCurrentDriveEmbed ? (
                  <iframe
                    src={resolvedValueUrl}
                    title="Google Drive Video Player"
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={resolvedValueUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain rounded-lg"
                    onContextMenu={e => e.preventDefault()}
                  />
                )}
              </div>
            ) : isCurrent3D ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-stone-900 text-white flex flex-col items-center justify-center p-2 text-center border border-[#D5D5D0] shrink-0">
                <Box className="w-6 h-6 text-[#C89211] mb-1" />
                <span className="text-[9px] font-mono">3D Model</span>
              </div>
            ) : (
              <div className="relative group shrink-0">
                <img
                  src={resolvedValueUrl}
                  alt="Current"
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg bg-white border border-[#D5D5D0] shadow-xs"
                  onError={e => {
                    const imgEl = e.target as HTMLImageElement;
                    const driveId = extractClientGoogleDriveFileId(value);
                    const thumb = driveId ? getClientGoogleDriveThumbnailUrl(driveId, 800) : '';
                    if (thumb && imgEl.src !== thumb && !imgEl.dataset.thumbTried) {
                      imgEl.dataset.thumbTried = '1';
                      imgEl.src = thumb;
                      return;
                    }
                    imgEl.src =
                      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=300&q=80';
                  }}
                />
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[11px] text-[#1A1A1A] font-mono truncate" title={value}>
                {value}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={resolvedValueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C89211] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open direct file link</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
