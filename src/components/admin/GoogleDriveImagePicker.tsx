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
  Camera,
} from 'lucide-react';
import {
  uploadImage,
  uploadVideo,
  upload3DModel,
  deleteBunnyStorageFile,
  inferMediaKindAndMime,
  previewDriveOrExternalMedia,
  importDriveOrExternalMediaToStorage,
  resolveImageUrl,
  isGoogleDriveEmbedUrl,
  extractClientGoogleDriveFileId,
  getClientGoogleDriveDirectUrl,
  getClientGoogleDriveThumbnailUrl,
  readTextFromClipboard,
  sanitizeDriveUrlInput,
  validateDriveOrMediaUrlInput,
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
  const previewLockRef = useRef(false);
  const importLockRef = useRef(false);
  const lastFailedFileRef = useRef<File | null>(null);

  const [sourceMode, setSourceMode] = useState<'device' | 'drive'>('device');
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [canRetryUpload, setCanRetryUpload] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [isDeletingFromBunny, setIsDeletingFromBunny] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewResult, setPreviewResult] = useState<DriveMediaPreviewResult | null>(null);
  const [lastImportedMeta, setLastImportedMeta] = useState<{
    url: string;
    isVideo?: boolean;
    is3DModel?: boolean;
    mimeType?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const urlValidation = validateDriveOrMediaUrlInput(driveUrlInput);

  // Clear messages on tab change
  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [sourceMode]);

  // Determine accepted file types for Option A Device Upload
  const fileAccept =
    effectiveMediaType === 'video'
      ? 'video/mp4,video/webm,video/quicktime,video/*'
      : effectiveMediaType === 'model3d'
      ? '.glb,.gltf,model/gltf-binary,model/gltf+json'
      : effectiveMediaType === 'any'
      ? 'image/*,video/*,.glb,.gltf'
      : 'image/*';

  // Core single-file upload worker (supports initial selection and 1-click Retry)
  const executeSingleFileUpload = async (file: File) => {
    if (!file || isUploading || disabled) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setCanRetryUpload(false);

    if (onFileSelect) {
      onFileSelect(file);
    }

    const inferred = inferMediaKindAndMime(file);

    // Video Upload (MP4, WebM, MOV up to 100 MB)
    const isVideoFile =
      inferred.kind === 'video' ||
      (effectiveMediaType === 'video' && inferred.kind === 'unknown');
    if (isVideoFile) {
      if (file.size > 100 * 1024 * 1024) {
        const err = 'Video file size exceeds 100 MB limit. Please select a smaller MP4/WebM video.';
        setErrorMessage(err);
        if (onToast) onToast(err);
        return;
      }

      lastFailedFileRef.current = file;
      setIsUploading(true);
      setUploadProgress(10);
      try {
        const res = await uploadVideo(file, pct => setUploadProgress(pct), 'videos');
        if (res?.url) {
          lastFailedFileRef.current = null;
          setCanRetryUpload(false);
          setLastImportedMeta({
            url: res.url,
            mimeType: res.mimeType || inferred.mimeType || 'video/mp4',
            isVideo: true,
          });
          onChange(res.url, {
            fileId: res.fileId,
            size: res.size || file.size,
            mimeType: res.mimeType || inferred.mimeType || 'video/mp4',
            isVideo: true,
          });
          const storageLabel =
            res.storageType === 'bunny_storage'
              ? 'Bunny Cloud Storage (videos folder)'
              : `Cloud Storage (${res.storageType || 'bunny'})`;
          setSuccessMessage(`Video uploaded and saved permanently to ${storageLabel}!`);
          if (onToast) onToast('Video saved to Bunny Cloud Storage!');
        } else {
          throw new Error('Upload server did not return a valid video URL.');
        }
      } catch (err: any) {
        const msg = err?.message || 'Device video upload failed. Please retry or check your connection.';
        setCanRetryUpload(true);
        setErrorMessage(msg);
        if (onToast) onToast(msg);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
      return;
    }

    // 3D Model Upload (.glb, .gltf up to 60 MB)
    if (inferred.kind === 'model3d' || effectiveMediaType === 'model3d') {
      if (file.size > 60 * 1024 * 1024) {
        const err = '3D model size exceeds 60 MB limit. Please optimize your .glb/.gltf file.';
        setErrorMessage(err);
        if (onToast) onToast(err);
        return;
      }
      lastFailedFileRef.current = file;
      setIsUploading(true);
      setUploadProgress(15);
      try {
        const res = await upload3DModel(file, pct => setUploadProgress(pct), 'models3d');
        if (res?.url) {
          lastFailedFileRef.current = null;
          setCanRetryUpload(false);
          setLastImportedMeta({
            url: res.url,
            mimeType: inferred.mimeType || 'model/gltf-binary',
            is3DModel: true,
          });
          onChange(res.url, {
            fileId: res.fileId,
            size: res.size || file.size,
            mimeType: inferred.mimeType || 'model/gltf-binary',
            is3DModel: true,
          });
          setSuccessMessage('3D model (.glb/.gltf) uploaded to Bunny Cloud Storage!');
          if (onToast) onToast('3D model saved to Bunny Cloud Storage!');
        } else {
          throw new Error('Upload server did not return a valid model URL.');
        }
      } catch (err: any) {
        const msg = err?.message || '3D model upload failed. Please retry.';
        setCanRetryUpload(true);
        setErrorMessage(msg);
        if (onToast) onToast(msg);
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
      return;
    }

    // Image Upload (JPG, PNG, WebP up to 20 MB; supports Android content:// URIs with empty/octet-stream MIME)
    const isImageCandidate =
      inferred.kind === 'image' ||
      (inferred.kind === 'unknown' && (!file.type || file.type === 'application/octet-stream'));

    if (!isImageCandidate) {
      const err = 'Unsupported file format: Select a JPG, PNG, or WebP image (or MP4/WebM video).';
      setErrorMessage(err);
      if (onToast) onToast(err);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      const err = 'Image file size exceeds 20 MB limit. Please select a smaller photo.';
      setErrorMessage(err);
      if (onToast) onToast(err);
      return;
    }

    lastFailedFileRef.current = file;
    setIsUploading(true);
    setUploadProgress(10);
    try {
      const res = await uploadImage(file, {
        category,
        maxDimension: 1920,
        quality: 0.84,
        onProgress: pct => setUploadProgress(pct),
      });

      if (res?.url) {
        lastFailedFileRef.current = null;
        setCanRetryUpload(false);
        onChange(res.url, {
          fileId: res.fileId,
          mimeType: res.mimeType || inferred.mimeType || 'image/jpeg',
          size: res.optimizedSize || res.originalSize,
          width: res.width,
          height: res.height,
        });
        const storageLabel =
          res.storageType === 'bunny_storage'
            ? `Bunny Cloud Storage (${category})`
            : `Cloud Storage (${res.storageType || 'bunny'})`;
        setSuccessMessage(`Photo uploaded and saved permanently to ${storageLabel}!`);
        if (onToast) onToast('Photo saved to Bunny Cloud Storage!');
      } else {
        throw new Error('Upload server did not return a valid image URL.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Device photo upload failed. Click Retry Upload to try again.';
      setCanRetryUpload(true);
      setErrorMessage(msg);
      if (onToast) onToast(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Handle Option A: Upload from Device (Gallery, File Picker, or Camera Capture)
  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || isUploading || disabled) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setCanRetryUpload(false);

    // Multi-upload for images
    if (allowMultiple && files.length > 1 && onAddMultiple) {
      setIsUploading(true);
      setUploadProgress(10);
      try {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const inferred = inferMediaKindAndMime(file);
          const isImageCandidate =
            inferred.kind === 'image' ||
            (inferred.kind === 'unknown' && (!file.type || file.type === 'application/octet-stream'));
          if (!isImageCandidate || file.size > 20 * 1024 * 1024) continue;
          setUploadProgress(Math.round(((i + 1) / files.length) * 90));
          const res = await uploadImage(file, {
            category,
            maxDimension: 1920,
            quality: 0.84,
          });
          if (res?.url) uploadedUrls.push(res.url);
        }
        if (uploadedUrls.length > 0) {
          onAddMultiple(uploadedUrls);
          setSuccessMessage(`Uploaded ${uploadedUrls.length} photo(s) permanently to Bunny Cloud Storage (${category})!`);
          if (onToast) onToast(`Uploaded ${uploadedUrls.length} photo(s) to Bunny Storage!`);
        } else {
          setErrorMessage('No supported image files found (JPG, PNG, WebP up to 20 MB).');
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
    e.target.value = '';
    await executeSingleFileUpload(file);
  };

  const applyDriveUrlChange = (nextRaw: string, autoSanitize = false) => {
    const cleaned = autoSanitize ? sanitizeDriveUrlInput(nextRaw) || nextRaw.trim() : nextRaw;
    setDriveUrlInput(cleaned);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewResult(null);
  };

  // Paste Link from Clipboard (Web Clipboard API + Capacitor Native Clipboard fallback)
  const handlePasteClipboard = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();

    const clip = await readTextFromClipboard(urlInputRef.current);
    if (clip.text) {
      const cleaned = sanitizeDriveUrlInput(clip.text) || clip.text.trim();
      applyDriveUrlChange(cleaned, true);
      const check = validateDriveOrMediaUrlInput(cleaned);
      if (check.isValid) {
        setSuccessMessage(
          check.fileId
            ? `Link pasted • Valid Google Drive File ID: ${check.fileId}`
            : 'Link pasted! Click "Preview" or "Import & Save".'
        );
      } else if (check.error) {
        setErrorMessage(check.error);
      }
      if (onToast) onToast('Pasted link from clipboard');
      return;
    }

    urlInputRef.current?.focus();
    setErrorMessage(null);
    setSuccessMessage('Tap inside the URL box above and long-press -> Paste to paste your Google Drive link.');
  };

  // Fallback: Convert Google Drive sharing link to direct uc?export=view / preview URL and save into form
  const handleUseDirectDriveFallback = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const check = validateDriveOrMediaUrlInput(driveUrlInput);
    if (!check.fileId) return;

    const directUrl =
      effectiveMediaType === 'video'
        ? getClientGoogleDriveDirectUrl(check.fileId, 'video')
        : `https://drive.google.com/uc?export=view&id=${encodeURIComponent(check.fileId)}`;

    setLastImportedMeta({
      url: directUrl,
      isVideo: effectiveMediaType === 'video',
      is3DModel: effectiveMediaType === 'model3d',
      mimeType: effectiveMediaType === 'video' ? 'video/mp4' : effectiveMediaType === 'model3d' ? 'model/gltf-binary' : 'image/jpeg',
    });

    onChange(directUrl, {
      fileId: check.fileId,
      isVideo: effectiveMediaType === 'video',
      is3DModel: effectiveMediaType === 'model3d',
      mimeType: effectiveMediaType === 'video' ? 'video/mp4' : effectiveMediaType === 'model3d' ? 'model/gltf-binary' : 'image/jpeg',
    });

    setErrorMessage(null);
    setPreviewResult(null);
    setDriveUrlInput('');
    setSuccessMessage(`Saved! Linked direct Google Drive URL (${directUrl}).`);
    if (onToast) onToast('Saved! Direct Google Drive link attached.');
  };

  // Handle Option B: Preview Google Drive Link
  const handlePreviewDrive = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const raw = driveUrlInput.trim();
    if (!raw || previewLockRef.current || importLockRef.current || isPreviewing || isImporting || disabled) return;

    const validation = validateDriveOrMediaUrlInput(raw);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please enter a valid Google Drive sharing link or https:// URL.');
      return;
    }

    previewLockRef.current = true;
    setIsPreviewing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPreviewResult(null);

    try {
      const preview = await previewDriveOrExternalMedia(validation.normalizedUrl, effectiveMediaType);
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
      if (onToast) onToast(cleanMsg);
    } finally {
      previewLockRef.current = false;
      setIsPreviewing(false);
    }
  };

  // Handle Option B: Import Google Drive Link into Permanent Storage
  const handleImportDrive = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const raw = driveUrlInput.trim();
    if (!raw || importLockRef.current || previewLockRef.current || isImporting || isPreviewing || disabled) return;

    const validation = validateDriveOrMediaUrlInput(raw);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Please enter a valid Google Drive sharing link or https:// URL.');
      return;
    }

    importLockRef.current = true;
    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const targetCat = effectiveMediaType === 'video' ? 'videos' : category;
      const imported: DriveMediaImportResult = await importDriveOrExternalMediaToStorage(
        validation.normalizedUrl,
        targetCat,
        effectiveMediaType
      );
      const permanentUrl = imported.url;

      setLastImportedMeta({
        url: permanentUrl,
        isVideo: imported.isVideo,
        is3DModel: imported.is3DModel,
        mimeType: imported.mimeType,
      });

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
      const storageMsg =
        imported.storageType === 'bunny_storage'
          ? `Imported ${typeLabel} and saved permanently to Bunny Cloud Storage (${targetCat})!`
          : imported.storageType === 'google_drive_embed'
          ? `Verified and linked playable Google Drive ${typeLabel}!`
          : `Imported ${typeLabel} and saved permanently to Cloud Storage (${imported.storageType})!`;

      setSuccessMessage(
        imported.deduplicated
          ? `Saved! Linked existing ${typeLabel} (${permanentUrl}) without creating duplicates.`
          : `Saved! ${storageMsg}`
      );
      if (onToast) onToast(`Saved! ${typeLabel} imported to Bunny Cloud Storage.`);
    } catch (err: any) {
      const rawMsg = String(err?.message || err || '').trim();
      const cleanMsg =
        !rawMsg || rawMsg === 'Failed to fetch' || rawMsg === 'Load failed' || rawMsg === 'NetworkError'
          ? 'Network error connecting to storage service. Please check your internet connection or upload directly from your device.'
          : rawMsg;
      setErrorMessage(cleanMsg);
      if (onToast) onToast(cleanMsg);
    } finally {
      importLockRef.current = false;
      setIsImporting(false);
    }
  };

  const resolvedValueUrl = value ? resolveImageUrl(value, '') : '';
  const isCurrentDriveEmbed = Boolean(value && isGoogleDriveEmbedUrl(value));
  const matchesImportedMeta = Boolean(lastImportedMeta && lastImportedMeta.url === value);
  const isCurrentVideo = Boolean(
    value &&
      (isCurrentDriveEmbed ||
        isVideoUrl(value) ||
        effectiveMediaType === 'video' ||
        (matchesImportedMeta && lastImportedMeta?.isVideo))
  );
  const isCurrent3D = Boolean(
    value &&
      (is3DModelUrl(value) ||
        effectiveMediaType === 'model3d' ||
        (matchesImportedMeta && lastImportedMeta?.is3DModel))
  );

  const displaySublabel =
    sublabel ||
    helperText ||
    (effectiveMediaType === 'video'
      ? 'Upload MP4/WebM video (max 100 MB) or paste Drive sharing link. Saved to Bunny Cloud Storage.'
      : effectiveMediaType === 'model3d'
      ? 'Upload .glb/.gltf 3D model (max 60 MB) or paste link. Saved to Bunny Cloud Storage.'
      : effectiveMediaType === 'any'
      ? 'Upload photo (JPG/PNG/WebP) or video (MP4/WebM) from device to Bunny Cloud Storage.'
      : 'Auto-optimizes JPG/PNG/WebP photos (1680px HD) and saves permanently to Bunny Cloud Storage.');

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

      {/* Option A: Upload from Device (Gallery / Files + Camera / Video Capture for Android) */}
      {sourceMode === 'device' && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
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

            {(effectiveMediaType === 'image' || effectiveMediaType === 'any') && (
              <label
                className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 shadow-xs transition ${
                  isUploading || disabled
                    ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                    : 'bg-[#FFF8E7] hover:bg-amber-100 text-[#8F6500] border-[#C89211]/40 cursor-pointer active:scale-95'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-[#C89211]" />
                <span>Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={isUploading || disabled}
                  onChange={handleDeviceUpload}
                  className="hidden"
                />
              </label>
            )}

            {effectiveMediaType === 'video' && (
              <label
                className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center gap-1.5 shadow-xs transition ${
                  isUploading || disabled
                    ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                    : 'bg-[#FFF8E7] hover:bg-amber-100 text-[#8F6500] border-[#C89211]/40 cursor-pointer active:scale-95'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-[#C89211]" />
                <span>Record Video</span>
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  disabled={isUploading || disabled}
                  onChange={handleDeviceUpload}
                  className="hidden"
                />
              </label>
            )}

            <span className="text-[11px] text-[#666666]">
              {effectiveMediaType === 'video'
                ? 'MP4, WebM, MOV up to 100 MB • Bunny Cloud Storage (videos)'
                : effectiveMediaType === 'model3d'
                ? '.glb or .gltf up to 60 MB • Bunny Cloud Storage (models3d)'
                : effectiveMediaType === 'any'
                ? 'JPG, PNG, WebP (20 MB) or MP4/WebM Video (100 MB)'
                : `JPG, PNG, WebP up to 20 MB • Bunny Cloud (${category})`}
            </span>
          </div>

          {isUploading && uploadProgress !== null && (
            <div className="space-y-1">
              <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full bg-[#C89211] transition-all duration-200"
                  style={{ width: `${Math.max(8, Math.min(100, uploadProgress))}%` }}
                />
              </div>
              <p className="text-[10px] text-[#666666] font-medium">
                Uploading to Bunny Cloud Storage... {uploadProgress}%
              </p>
            </div>
          )}
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

          <div className="space-y-2">
            {/* Unobstructed URL Input + Side-by-Side Paste Button (zero overlay on touch input) */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <input
                  ref={urlInputRef}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={driveUrlInput}
                  onChange={e => applyDriveUrlChange(e.target.value)}
                  onInput={e => applyDriveUrlChange((e.target as HTMLInputElement).value)}
                  onPaste={e => {
                    const pasted =
                      e.clipboardData?.getData('text/plain') || e.clipboardData?.getData('text');
                    if (pasted && pasted.trim()) {
                      e.preventDefault();
                      applyDriveUrlChange(pasted, true);
                    } else {
                      const targetEl = e.currentTarget;
                      requestAnimationFrame(() => {
                        if (targetEl?.value) applyDriveUrlChange(targetEl.value, true);
                      });
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePreviewDrive(e);
                    }
                  }}
                  placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                  disabled={disabled || isPreviewing || isImporting}
                  className="w-full min-h-[42px] px-3 py-2.5 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] text-sm sm:text-xs select-text pointer-events-auto relative z-10 focus:ring-2 focus:ring-[#C89211] focus:outline-none"
                />
                {driveUrlInput.length > 0 && !isPreviewing && !isImporting && (
                  <button
                    type="button"
                    onClick={() => applyDriveUrlChange('')}
                    className="p-2 rounded-lg bg-white hover:bg-stone-100 border border-[#E5E5E5] text-stone-500 hover:text-stone-900 shrink-0 cursor-pointer"
                    title="Clear URL"
                    aria-label="Clear Google Drive URL"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handlePasteClipboard}
                disabled={disabled || isPreviewing || isImporting}
                className="px-3.5 py-2.5 min-h-[42px] rounded-lg bg-white hover:bg-stone-100 text-[#1A1A1A] border border-[#D5D5D0] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0 shadow-xs active:scale-95"
                title="Paste link from clipboard"
              >
                <ClipboardPaste className="w-4 h-4 text-[#C89211]" />
                <span>Paste Link</span>
              </button>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isPreviewing || isImporting || !urlValidation.isValid || disabled}
                onClick={handlePreviewDrive}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-100 text-[#1A1A1A] border border-[#D5D5D0] font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                disabled={isImporting || isPreviewing || !urlValidation.isValid || disabled}
                onClick={handleImportDrive}
                className="px-4 py-2 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isImporting ? 'Importing & Saving...' : 'Import & Save'}</span>
              </button>
            </div>
          </div>

          {driveUrlInput.trim().length > 0 && (
            <div className="flex items-center justify-between gap-2 text-[11px] flex-wrap">
              {urlValidation.isValid ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {urlValidation.isGoogleDrive && urlValidation.fileId
                      ? `Valid Google Drive link • File ID: ${urlValidation.fileId}`
                      : 'Valid HTTPS media link • Ready to Preview or Import & Save'}
                  </span>
                </span>
              ) : (
                <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{urlValidation.error || 'Invalid URL'}</span>
                </span>
              )}
            </div>
          )}
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
              {previewResult.duration ? ` • ${previewResult.duration}s` : ''}
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
                    preload="metadata"
                    className="w-full h-full object-contain rounded-lg"
                    onError={() => {
                      setPreviewResult(null);
                      setErrorMessage('Video stream verified on backend, but could not be decoded by this browser.');
                    }}
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
              (previewResult.previewDataUrl || previewResult.previewUrl || previewResult.previewPosterUrl) && (
                <img
                  src={
                    previewResult.previewDataUrl ||
                    (previewResult.previewUrl ? resolveImageUrl(previewResult.previewUrl, '') : previewResult.previewPosterUrl)
                  }
                  alt={previewResult.originalName || 'Preview'}
                  className="max-h-36 max-w-[200px] object-contain rounded-lg bg-white border border-amber-200 shadow-xs"
                  onError={() => {
                    setPreviewResult(null);
                    setErrorMessage('Verified image metadata, but failed to render preview bytes in WebView.');
                  }}
                />
              )
            )}

            <div className="flex-1 space-y-1.5 text-xs">
              {previewResult.originalName && (
                <p className="text-[11px] text-[#1A1A1A] font-semibold truncate">
                  {previewResult.originalName}
                </p>
              )}
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
                disabled={isImporting || isPreviewing}
                className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{isImporting ? 'Importing & Saving...' : 'Import & Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert with Retry & Device Upload Action */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div>
              <strong className="font-bold text-rose-900 block">Upload / Import Notice</strong>
              <p className="text-[11px] leading-relaxed text-rose-800 break-words">{errorMessage}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canRetryUpload && lastFailedFileRef.current && (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    const retryFile = lastFailedFileRef.current;
                    if (retryFile) void executeSingleFileUpload(retryFile);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Upload</span>
                </button>
              )}
              {urlValidation.isGoogleDrive && urlValidation.fileId && (
                <button
                  type="button"
                  onClick={handleUseDirectDriveFallback}
                  className="px-2.5 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>
                    {effectiveMediaType === 'video'
                      ? 'Save Direct Drive Link (Preview)'
                      : 'Save Direct Drive URL (uc?export=view)'}
                  </span>
                </button>
              )}
              {sourceMode === 'drive' && (
                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('device');
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-[#1A1A1A] border border-rose-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-[#C89211]" />
                  <span>Switch to Upload From Device</span>
                </button>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setCanRetryUpload(false);
            }}
            className="text-rose-400 hover:text-rose-800 p-1 text-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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

      {/* Current Active Media Preview Card with Replace and Confirmed Remove/Delete options */}
      {value && value.trim().length > 0 && (
        <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {value.includes('/api/bunny/media/') || value.includes('.b-cdn.net/')
                  ? 'Saved in Bunny Cloud'
                  : value.includes('/api/drive/media/') || value.includes('drive.google.com')
                  ? 'Saved in Google Drive'
                  : value.includes('/uploads/')
                  ? 'Saved in Cloud Storage'
                  : 'Media Linked'}
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
                disabled={disabled || isDeletingFromBunny}
                className="px-2 py-1 rounded bg-white hover:bg-stone-100 text-[#C89211] border border-[#D5D5D0] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                title="Replace this media file"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmRemoveOpen(prev => !prev)}
                disabled={disabled || isDeletingFromBunny}
                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                title="Remove or delete this media file"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {confirmRemoveOpen && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-rose-900">
                Remove this media attachment?
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setConfirmRemoveOpen(false);
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 font-semibold cursor-pointer"
                >
                  Unlink Only
                </button>
                {(value.includes('/api/bunny/media/') || value.includes('.b-cdn.net/')) && (
                  <button
                    type="button"
                    disabled={isDeletingFromBunny}
                    onClick={async () => {
                      setIsDeletingFromBunny(true);
                      try {
                        const delRes = await deleteBunnyStorageFile(value);
                        if (!delRes.success) {
                          setErrorMessage(delRes.error || 'Could not delete file from Bunny Storage.');
                          if (onToast) onToast(delRes.error || 'Delete blocked (media may still be in use).');
                        } else {
                          onChange('');
                          setSuccessMessage('Media deleted from Bunny Cloud Storage.');
                          if (onToast) onToast('Deleted from Bunny Cloud Storage');
                        }
                      } finally {
                        setIsDeletingFromBunny(false);
                        setConfirmRemoveOpen(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingFromBunny ? 'Deleting...' : 'Delete from Bunny'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmRemoveOpen(false)}
                  className="px-2 py-1 rounded text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

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
