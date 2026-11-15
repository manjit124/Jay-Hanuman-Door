import React, { useState, useEffect, useRef } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Upload,
  Trash2,
  ExternalLink,
  Copy,
  RefreshCw,
  Folder,
  ShieldCheck,
  Eye,
  Film,
  Image as ImageIcon,
  Key,
  Info,
  Loader2,
  ClipboardPaste,
  HardDrive,
  Camera,
  RotateCcw,
  Box,
  X,
} from 'lucide-react';
import {
  getAdminAuthHeaders,
  apiFetch,
  uploadFileWithProgress,
  previewDriveOrExternalMedia,
  importDriveOrExternalMediaToStorage,
  readTextFromClipboard,
  resolveImageUrl,
  sanitizeDriveUrlInput,
  validateDriveOrMediaUrlInput,
  fetchBunnyStorageStatus,
  fetchBunnyStorageFiles,
  deleteBunnyStorageFile,
  BunnyStatusInfo,
  BunnyFileItem,
} from '../../lib/api.ts';

type BunnyFolder =
  | 'products'
  | 'videos'
  | 'models3d'
  | 'banners'
  | 'delivery'
  | 'materials'
  | 'finishes'
  | 'hardware'
  | 'frames'
  | 'categories'
  | 'brand'
  | 'team'
  | 'articles'
  | 'notifications'
  | 'chaukhat'
  | 'catalog'
  | 'tracking'
  | 'general';

const FOLDER_OPTIONS: { id: BunnyFolder; label: string }[] = [
  { id: 'products', label: 'Door Designs' },
  { id: 'videos', label: 'Videos' },
  { id: 'models3d', label: '3D Models' },
  { id: 'banners', label: 'Banners' },
  { id: 'delivery', label: 'India Delivery' },
  { id: 'materials', label: 'Materials' },
  { id: 'finishes', label: 'Polish Finishes' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'frames', label: 'Frames' },
  { id: 'categories', label: 'Categories' },
  { id: 'brand', label: 'Brand & Logo' },
  { id: 'team', label: 'Team' },
  { id: 'articles', label: 'Articles' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'chaukhat', label: 'Chaukhat' },
  { id: 'tracking', label: 'Order Tracking' },
  { id: 'catalog', label: 'Catalog PDFs' },
];

interface LegacyDriveStatus {
  configured: boolean;
  connected: boolean;
  ownerEmail?: string;
  hasRefreshToken: boolean;
  hasClientSecret: boolean;
  scope: string;
}

export const AdminGoogleDriveTab: React.FC = () => {
  // Primary Bunny.net Storage state
  const [bunnyStatus, setBunnyStatus] = useState<BunnyStatusInfo | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [activeFolder, setActiveFolder] = useState<BunnyFolder>('products');
  const [files, setFiles] = useState<BunnyFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  // Upload & Retry state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [uploadSourceMode, setUploadSourceMode] = useState<'device' | 'link'>('device');

  // External Link Import state (imports URL into Bunny Storage)
  const [linkInput, setLinkInput] = useState('');
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const linkPreviewLockRef = useRef(false);
  const linkImportLockRef = useRef(false);
  const [previewingLink, setPreviewingLink] = useState(false);
  const [linkPreviewResult, setLinkPreviewResult] = useState<any>(null);
  const [importingLink, setImportingLink] = useState(false);
  const linkValidation = validateDriveOrMediaUrlInput(linkInput);

  // Preview modal & copy toast
  const [previewItem, setPreviewItem] = useState<BunnyFileItem | null>(null);
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);

  // In-app delete confirmation state (no window.confirm)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<BunnyFileItem | null>(null);
  const [forceDeleteItem, setForceDeleteItem] = useState<BunnyFileItem | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  // Legacy Google Drive OAuth (collapsed secondary section for historical access)
  const [legacyStatus, setLegacyStatus] = useState<LegacyDriveStatus | null>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('shivshahidoors@gmail.com');
  const [savingCreds, setSavingCreds] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const loadBunnyStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetchBunnyStorageStatus();
      if (res.success && res.status) {
        setBunnyStatus(res.status);
      }
    } catch (err) {
      console.warn('Could not fetch Bunny Storage status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadFolderFiles = async (folder: BunnyFolder) => {
    try {
      setLoadingFiles(true);
      setFilesError(null);
      const res = await fetchBunnyStorageFiles(folder);
      if (res.success) {
        setFiles(res.files || []);
      } else {
        setFilesError(res.error || 'Unable to load files from Bunny Storage');
      }
    } catch (err: any) {
      setFilesError(err?.message || 'Unable to load files from Bunny Storage');
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadLegacyDriveStatus = async () => {
    try {
      const res = await apiFetch('/api/admin/drive/status', {
        headers: getAdminAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.status) {
        setLegacyStatus(data.status);
      }
    } catch {
      // Ignore legacy check failures
    }
  };

  useEffect(() => {
    loadBunnyStatus();
    loadLegacyDriveStatus();
  }, []);

  useEffect(() => {
    loadFolderFiles(activeFolder);
    setConfirmDeleteItem(null);
    setForceDeleteItem(null);
  }, [activeFolder]);

  const executeFileUpload = async (fileToUpload: File) => {
    setUploading(true);
    setUploadProgress(5);
    setUploadSuccess(null);
    setUploadError(null);

    try {
      const result = await uploadFileWithProgress(
        '/api/admin/bunny/upload',
        fileToUpload,
        pct => setUploadProgress(pct),
        300000,
        {
          folder: activeFolder,
          category: activeFolder,
          mediaType:
            activeFolder === 'videos'
              ? 'video'
              : activeFolder === 'models3d'
              ? 'model3d'
              : 'any',
          description: description.trim() || `${activeFolder} upload`,
        }
      );

      if (!result.ok || !result.data?.success) {
        const prefix = result.errorCode ? `[${result.errorCode}] ` : '';
        throw new Error(`${prefix}${result.error || 'Upload to Bunny Storage failed'}`);
      }

      setUploadProgress(100);
      setUploadSuccess(result.data);
      setUploadFile(null);
      setLastFailedFile(null);
      setDescription('');
      await Promise.all([loadFolderFiles(activeFolder), loadBunnyStatus()]);
    } catch (err: any) {
      setLastFailedFile(fileToUpload);
      setUploadError(err?.message || 'Failed to upload file to Bunny Storage');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || uploading) return;
    await executeFileUpload(uploadFile);
  };

  const handleRetryUpload = async () => {
    if (!lastFailedFile || uploading) return;
    await executeFileUpload(lastFailedFile);
  };

  const executeDeleteFile = async (item: BunnyFileItem, force = false) => {
    setDeletingPath(item.objectPath);
    setUploadError(null);
    try {
      const res = await deleteBunnyStorageFile(item.objectPath, force);
      if (!res.success) {
        if (res.inUse && !force) {
          setConfirmDeleteItem(null);
          setForceDeleteItem(item);
          return;
        }
        throw new Error(res.error || 'Failed to delete file from Bunny Storage');
      }

      setFiles(prev => prev.filter(f => f.objectPath !== item.objectPath));
      if (previewItem?.objectPath === item.objectPath) {
        setPreviewItem(null);
      }
      setConfirmDeleteItem(null);
      setForceDeleteItem(null);
      setCopiedBanner(`Deleted "${item.name}" from Bunny Storage.`);
      setTimeout(() => setCopiedBanner(null), 3500);
    } catch (err: any) {
      setUploadError('Delete failed: ' + (err?.message || 'Unable to delete file'));
      setConfirmDeleteItem(null);
      setForceDeleteItem(null);
    } finally {
      setDeletingPath(null);
    }
  };

  const handleSaveLegacyCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    setConfigSuccess(null);
    setConfigError(null);
    try {
      const res = await apiFetch('/api/admin/drive/configure', {
        method: 'POST',
        headers: {
          ...getAdminAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: clientId.trim() || undefined,
          clientSecret: clientSecret.trim() || undefined,
          refreshToken: refreshToken.trim() || undefined,
          ownerEmail: ownerEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save legacy credentials');
      }
      setConfigSuccess('Legacy Drive credentials saved on server.');
      setLegacyStatus(data.status);
      setClientSecret('');
      setRefreshToken('');
    } catch (err: any) {
      setConfigError(err.message || 'Failed to update legacy credentials');
    } finally {
      setSavingCreds(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedBanner(`${label} copied to clipboard!`);
      setTimeout(() => setCopiedBanner(null), 3000);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header Banner: Bunny.net Cloud Storage */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 border border-[#C89211]/40 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white">
                  Bunny.net Cloud Media Storage
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    bunnyStatus?.connected && bunnyStatus?.writable
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {bunnyStatus?.connected && bunnyStatus?.writable
                    ? 'Connected & Active'
                    : bunnyStatus?.configured
                    ? 'Check Connection'
                    : 'Server Env Required'}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                Primary edge media storage for all website &amp; Android APK photos, videos, and 3D models.{' '}
                {bunnyStatus?.zone ? (
                  <>
                    Zone: <span className="text-amber-300 font-mono">{bunnyStatus.zone}</span> • Region:{' '}
                    <span className="text-amber-300 font-mono">{bunnyStatus.region}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              loadBunnyStatus();
              loadFolderFiles(activeFolder);
            }}
            disabled={loadingStatus}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Security & Delivery Info Card */}
      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-semibold text-stone-900">
              {bunnyStatus?.statusMessage || 'Server-Side Authenticated Bunny Storage API'}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Credentials stay strictly in server environment variables. Supports JPG, PNG, WebP (up to 20 MB), MP4 &amp; WebM videos (up to 100 MB, HTTP 206 streaming), and .glb/.gltf 3D models (up to 60 MB).
            </p>
            {bunnyStatus && bunnyStatus.missingVars?.length > 0 && (
              <p className="text-[11px] text-rose-700 font-semibold mt-1">
                Missing server environment variables: {bunnyStatus.missingVars.join(', ')}
              </p>
            )}
          </div>
        </div>
        <div className="text-[11px] font-mono text-stone-600 bg-white px-2.5 py-1 rounded border border-stone-200 shrink-0">
          {bunnyStatus?.cdnUrlConfigured
            ? `CDN: ${bunnyStatus.cdnUrl}`
            : `Proxy: /api/bunny/media/*`}
        </div>
      </div>

      {/* Content-Type Folders & Upload Manager */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-5">
        <div className="flex flex-col gap-3 border-b border-stone-200 pb-4">
          <div>
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#C89211]" />
              <span>Bunny Storage Content Folders</span>
            </h4>
            <p className="text-xs text-[#666666] mt-0.5">
              Select a content folder to upload, preview, copy public URLs, or delete files.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {FOLDER_OPTIONS.map(folder => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveFolder(folder.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeFolder === folder.id
                    ? 'bg-[#C89211] text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {folder.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Box: Device Upload OR External URL Import */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Upload into folder: /{activeFolder}/</span>
            </div>

            <div className="inline-flex rounded-lg bg-white p-0.5 border border-stone-300">
              <button
                type="button"
                onClick={() => setUploadSourceMode('device')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  uploadSourceMode === 'device'
                    ? 'bg-[#C89211] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>Upload From Device</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadSourceMode('link')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  uploadSourceMode === 'link'
                    ? 'bg-[#C89211] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <HardDrive className="w-3 h-3" />
                <span>Import From Link</span>
              </button>
            </div>
          </div>

          {uploadSourceMode === 'device' ? (
            <form onSubmit={handleDirectUpload} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <input
                    type="file"
                    accept={
                      activeFolder === 'videos'
                        ? 'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov'
                        : activeFolder === 'models3d'
                        ? '.glb,.gltf,model/gltf-binary,model/gltf+json'
                        : 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,video/mp4,video/webm,.glb,.gltf'
                    }
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        setLastFailedFile(null);
                        setUploadError(null);
                      }
                    }}
                    className="flex-1 min-w-0 text-xs text-stone-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#C89211] file:text-white hover:file:bg-[#A0700B] cursor-pointer bg-white p-2 rounded-xl border border-stone-300"
                  />
                  {activeFolder !== 'videos' && activeFolder !== 'models3d' && (
                    <label className="px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Camera className="w-3.5 h-3.5 text-[#C89211]" />
                      <span>Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            setUploadFile(e.target.files[0]);
                            setLastFailedFile(null);
                            setUploadError(null);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C89211]/30 bg-white"
                  />
                </div>
              </div>

              {uploading && uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700">
                    <span>Uploading to Bunny.net Storage ({activeFolder})...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className="h-full bg-[#C89211] transition-all duration-200"
                      style={{ width: `${Math.max(5, Math.min(100, uploadProgress))}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="py-2 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs flex items-center gap-2 border border-amber-500/40 shadow-sm transition-all cursor-pointer disabled:opacity-40"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Uploading{uploadProgress !== null ? ` (${uploadProgress}%)` : ''}...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Upload to Bunny Storage ({activeFolder})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    ref={linkInputRef}
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={linkInput}
                    onChange={e => {
                      setLinkInput(e.target.value);
                      setUploadError(null);
                      setLinkPreviewResult(null);
                    }}
                    onPaste={e => {
                      const pasted =
                        e.clipboardData?.getData('text/plain') || e.clipboardData?.getData('text');
                      if (pasted && pasted.trim()) {
                        e.preventDefault();
                        const cleaned = sanitizeDriveUrlInput(pasted) || pasted.trim();
                        setLinkInput(cleaned);
                        setUploadError(null);
                        setLinkPreviewResult(null);
                      }
                    }}
                    placeholder="Paste public HTTPS image, video, .glb or sharing URL to mirror into Bunny Storage"
                    className="flex-1 min-h-[42px] px-3 py-2.5 rounded-lg bg-white border border-stone-300 text-sm sm:text-xs text-stone-900 select-text pointer-events-auto relative z-10 focus:ring-2 focus:ring-[#C89211]"
                  />
                  <button
                    type="button"
                    onClick={async e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const clip = await readTextFromClipboard(linkInputRef.current);
                      if (clip.text) {
                        const cleaned = sanitizeDriveUrlInput(clip.text) || clip.text.trim();
                        setLinkInput(cleaned);
                        setUploadError(null);
                        setLinkPreviewResult(null);
                        setCopiedBanner('Pasted link from clipboard!');
                        setTimeout(() => setCopiedBanner(null), 2500);
                        return;
                      }
                      linkInputRef.current?.focus();
                      setUploadError('Tap inside the URL box above and long-press -> Paste your link.');
                    }}
                    className="px-3.5 py-2.5 min-h-[42px] rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ClipboardPaste className="w-4 h-4 text-[#C89211]" />
                    <span>Paste Link</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={previewingLink || importingLink || !linkValidation.isValid}
                    onClick={async e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (linkPreviewLockRef.current || linkImportLockRef.current || !linkValidation.isValid) return;
                      linkPreviewLockRef.current = true;
                      setPreviewingLink(true);
                      setUploadError(null);
                      setLinkPreviewResult(null);
                      try {
                        const prev = await previewDriveOrExternalMedia(
                          linkValidation.normalizedUrl,
                          activeFolder === 'videos' ? 'video' : activeFolder === 'models3d' ? 'model3d' : 'any'
                        );
                        setLinkPreviewResult(prev);
                      } catch (err: any) {
                        setUploadError(err?.message || 'Preview failed');
                      } finally {
                        linkPreviewLockRef.current = false;
                        setPreviewingLink(false);
                      }
                    }}
                    className="px-3.5 py-2 rounded-lg bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {previewingLink ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C89211]" />
                    ) : (
                      <Eye className="w-3.5 h-3.5 text-[#C89211]" />
                    )}
                    <span>{previewingLink ? 'Checking...' : 'Preview'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={importingLink || previewingLink || !linkValidation.isValid}
                    onClick={async e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (linkImportLockRef.current || linkPreviewLockRef.current || !linkValidation.isValid) return;
                      linkImportLockRef.current = true;
                      setImportingLink(true);
                      setUploadError(null);
                      setUploadSuccess(null);
                      try {
                        const imp = await importDriveOrExternalMediaToStorage(
                          linkValidation.normalizedUrl,
                          activeFolder,
                          activeFolder === 'videos' ? 'video' : activeFolder === 'models3d' ? 'model3d' : 'any'
                        );
                        setUploadSuccess({
                          name: imp.filename,
                          url: imp.url,
                          storageType: imp.storageType,
                        });
                        setLinkInput('');
                        setLinkPreviewResult(null);
                        await loadFolderFiles(activeFolder);
                      } catch (err: any) {
                        setUploadError(err?.message || 'Import to Bunny Storage failed');
                      } finally {
                        linkImportLockRef.current = false;
                        setImportingLink(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {importingLink ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>{importingLink ? 'Importing...' : `Import to Bunny (${activeFolder})`}</span>
                  </button>
                </div>
              </div>

              {linkPreviewResult && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-3 text-xs">
                  {linkPreviewResult.previewUrl && linkPreviewResult.mimeType?.startsWith('video/') ? (
                    <video
                      src={resolveImageUrl(linkPreviewResult.previewUrl, '')}
                      controls
                      muted
                      playsInline
                      className="w-32 h-20 rounded-lg border border-amber-200 bg-black object-contain shrink-0"
                    />
                  ) : linkPreviewResult.previewDataUrl || linkPreviewResult.previewUrl ? (
                    <img
                      src={linkPreviewResult.previewDataUrl || resolveImageUrl(linkPreviewResult.previewUrl, '')}
                      alt={linkPreviewResult.originalName || 'Preview'}
                      className="w-16 h-16 object-cover rounded-lg border border-amber-200 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center shrink-0">
                      <Film className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    {linkPreviewResult.originalName && (
                      <p className="font-bold text-stone-900 truncate">{linkPreviewResult.originalName}</p>
                    )}
                    <p className="text-stone-700">
                      {linkPreviewResult.mimeType}
                      {linkPreviewResult.size > 0 ? ` • ${Math.round(linkPreviewResult.size / 1024)} KB` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">
                  Uploaded to Bunny.net Storage! URL:{' '}
                  <code className="bg-emerald-100/60 px-1 rounded">{uploadSuccess.url}</code>
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(uploadSuccess.url, 'Public Media URL')}
                className="px-2.5 py-1 rounded bg-white border border-emerald-300 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer shrink-0 self-end sm:self-auto"
              >
                <Copy className="w-3 h-3" />
                <span>Copy URL</span>
              </button>
            </div>
          )}

          {copiedBanner && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
              {copiedBanner}
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {lastFailedFile && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleRetryUpload}
                    className="px-3 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry Upload</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* In-App Delete Confirmation Bars */}
        {confirmDeleteItem && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Permanently delete <strong>{confirmDeleteItem.name}</strong> from Bunny.net Storage ({confirmDeleteItem.folder})?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={deletingPath === confirmDeleteItem.objectPath}
                onClick={() => executeDeleteFile(confirmDeleteItem, false)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {deletingPath === confirmDeleteItem.objectPath ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteItem(null)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {forceDeleteItem && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>{forceDeleteItem.name}</strong> is referenced in a catalog door, banner, or delivery story. Delete from Bunny Storage anyway?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={deletingPath === forceDeleteItem.objectPath}
                onClick={() => executeDeleteFile(forceDeleteItem, true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span>Force Delete</span>
              </button>
              <button
                type="button"
                onClick={() => setForceDeleteItem(null)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-semibold text-xs cursor-pointer"
              >
                Keep File
              </button>
            </div>
          </div>
        )}

        {/* Existing Files Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800">
            <span>Files in /{activeFolder}/ ({files.length})</span>
            <button
              type="button"
              onClick={() => loadFolderFiles(activeFolder)}
              disabled={loadingFiles}
              className="text-[#C89211] hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${loadingFiles ? 'animate-spin' : ''}`} />
              <span>Refresh files</span>
            </button>
          </div>

          {filesError && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              {filesError}
            </div>
          )}

          {loadingFiles ? (
            <div className="py-8 text-center text-xs text-stone-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#C89211] mx-auto mb-2" />
              <span>Loading Bunny.net Storage files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-500 border border-dashed border-stone-300 rounded-xl bg-stone-50">
              No files stored in <strong>/{activeFolder}/</strong> yet. Upload your first photo, video, or 3D model above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {files.map(f => (
                <div
                  key={f.objectPath}
                  className="p-3 bg-stone-50 rounded-xl border border-stone-200 hover:border-[#C89211]/50 flex flex-col justify-between space-y-2.5 transition-all"
                >
                  <div className="space-y-1.5">
                    <div
                      onClick={() => setPreviewItem(f)}
                      className="aspect-video bg-stone-200 rounded-lg overflow-hidden relative flex items-center justify-center cursor-pointer group"
                    >
                      {f.isVideo || f.mimeType.startsWith('video/') ? (
                        <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center gap-1 text-amber-400">
                          <Film className="w-6 h-6" />
                          <span className="text-[10px] font-semibold">Click to Play Video</span>
                        </div>
                      ) : f.is3DModel ? (
                        <div className="w-full h-full bg-stone-800 flex flex-col items-center justify-center gap-1 text-amber-300">
                          <Box className="w-6 h-6" />
                          <span className="text-[10px] font-semibold">3D Model ({f.name.split('.').pop()?.toUpperCase()})</span>
                        </div>
                      ) : (
                        <img
                          src={resolveImageUrl(f.url, '')}
                          alt={f.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      )}
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[9px] font-semibold inline-flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" />
                        Preview
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-stone-900 truncate" title={f.objectPath}>
                      {f.name}
                    </div>
                    <div className="text-[10px] text-stone-500 flex items-center justify-between">
                      <span>{f.size >= 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`}</span>
                      <span>{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(f.url, 'Public Media URL')}
                      className="flex-1 py-1 px-1.5 rounded bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      title="Copy permanent public URL"
                    >
                      <Copy className="w-3 h-3 text-[#C89211]" />
                      <span>Copy URL</span>
                    </button>
                    <a
                      href={resolveImageUrl(f.url, f.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-white hover:bg-stone-100 text-stone-600 border border-stone-300"
                      title="Open public URL"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setForceDeleteItem(null);
                        setConfirmDeleteItem(f);
                      }}
                      disabled={deletingPath === f.objectPath}
                      className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer disabled:opacity-50"
                      title="Delete from Bunny Storage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div
          onClick={() => setPreviewItem(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200"
          >
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate">{previewItem.name}</div>
                <div className="text-[11px] font-mono text-stone-500 truncate">{previewItem.objectPath}</div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-stone-950 flex items-center justify-center min-h-[240px] max-h-[65vh]">
              {previewItem.isVideo || previewItem.mimeType.startsWith('video/') ? (
                <video
                  src={resolveImageUrl(previewItem.url, '')}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[58vh] w-full rounded-lg bg-black"
                />
              ) : previewItem.is3DModel ? (
                <div className="text-center text-amber-300 space-y-2 py-8">
                  <Box className="w-12 h-12 mx-auto" />
                  <p className="text-sm font-bold">{previewItem.name}</p>
                  <p className="text-xs text-stone-400">3D Model ready for 3D &amp; AR Door Visualizer</p>
                </div>
              ) : (
                <img
                  src={resolveImageUrl(previewItem.url, '')}
                  alt={previewItem.name}
                  className="max-h-[58vh] w-auto object-contain rounded-lg"
                />
              )}
            </div>
            <div className="px-4 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2 text-xs">
              <code className="truncate text-[11px] text-stone-600">{previewItem.url}</code>
              <button
                type="button"
                onClick={() => copyToClipboard(previewItem.url, 'Public Media URL')}
                className="px-3 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs shrink-0 cursor-pointer inline-flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Architecture Summary Card */}
      <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-2.5">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <Info className="w-4 h-4 text-amber-700" />
          <span>Bunny.net Storage &amp; Cross-Platform Media Delivery</span>
        </div>
        <div className="space-y-1 text-[11px] text-amber-900 leading-relaxed">
          <p>
            • <strong>Server-Side Credential Protection:</strong> Uploads flow through authenticated admin APIs (<code className="font-mono bg-amber-100/60 px-1 rounded">/api/admin/bunny/upload</code>) using server-side Bunny Storage AccessKey credentials. Secrets never ship in website or Android APK bundles.
          </p>
          <p>
            • <strong>Website &amp; Android APK Compatible:</strong> Files are served publicly via <code className="font-mono bg-amber-100/60 px-1 rounded">/api/bunny/media/*</code> (or direct Pull Zone CDN when configured on the server), supporting HTTP 206 byte-range video seeking.
          </p>
          <p>
            • <strong>Historical Media Preserved:</strong> Existing Firestore, local, and historical catalog URLs continue loading cleanly without deleting prior data.
          </p>
        </div>
      </div>

      {/* Legacy Google Drive OAuth Settings (Collapsed) */}
      <details className="rounded-2xl bg-white border border-stone-200 p-4 text-xs">
        <summary className="font-bold text-stone-700 cursor-pointer flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Key className="w-4 h-4 text-stone-500" />
            <span>Legacy Google Drive OAuth Settings (Historical Media Compatibility)</span>
          </span>
          <span className="text-[11px] font-normal text-stone-500">
            {legacyStatus?.connected ? 'Connected (Read Fallback)' : 'Optional / Legacy'}
          </span>
        </summary>
        <form onSubmit={handleSaveLegacyCredentials} className="space-y-3 pt-4 border-t border-stone-200 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="email"
              value={ownerEmail}
              onChange={e => setOwnerEmail(e.target.value)}
              placeholder="Owner Email"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900"
            />
            <input
              type="text"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="Google OAuth Client ID (Optional legacy)"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono text-stone-900"
            />
            <input
              type="password"
              value={clientSecret}
              onChange={e => setClientSecret(e.target.value)}
              placeholder={legacyStatus?.hasClientSecret ? '•••• (Configured)' : 'Client Secret'}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono text-stone-900"
            />
            <input
              type="password"
              value={refreshToken}
              onChange={e => setRefreshToken(e.target.value)}
              placeholder={legacyStatus?.hasRefreshToken ? '•••• (Active)' : 'OAuth Refresh Token'}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono text-stone-900"
            />
          </div>
          {configSuccess && (
            <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">{configSuccess}</div>
          )}
          {configError && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-red-800">{configError}</div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingCreds}
              className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs cursor-pointer disabled:opacity-50"
            >
              {savingCreds ? 'Saving...' : 'Save Legacy Credentials'}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
};
