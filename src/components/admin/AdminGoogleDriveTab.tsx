import React, { useState, useEffect } from 'react';
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
  Play,
  Film,
  Image as ImageIcon,
  Key,
  Info,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { getAdminAuthHeaders, apiFetch } from '../../lib/api.ts';

type DriveCategory = 'products' | 'catalog' | 'banners' | 'delivery' | 'videos';

interface DriveFileItem {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  category: DriveCategory;
  url: string;
  webViewLink?: string;
  createdAt: string;
}

interface DriveStatus {
  configured: boolean;
  connected: boolean;
  ownerEmail?: string;
  connectedAt?: string;
  lastVerifiedAt?: string;
  rootFolderId?: string;
  hasRefreshToken: boolean;
  hasClientSecret: boolean;
  scope: string;
}

export const AdminGoogleDriveTab: React.FC = () => {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DriveCategory>('products');
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Configuration Form State
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('shivshahidoors@gmail.com');
  const [savingCreds, setSavingCreds] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Test Upload State
  const [testingUpload, setTestingUpload] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Manual File Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  // Active Preview State
  const [previewItem, setPreviewItem] = useState<DriveFileItem | null>(null);

  // Deletion State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await apiFetch('/api/admin/drive/status', {
        headers: getAdminAuthHeaders(),
      });
      const data = await res.json();
      if (data.success && data.status) {
        setStatus(data.status);
      }
    } catch (err: any) {
      console.warn('Could not fetch drive status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchCategoryFiles = async (cat: DriveCategory) => {
    try {
      setLoadingFiles(true);
      const res = await apiFetch(`/api/admin/drive/files?category=${cat}`, {
        headers: getAdminAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setFiles(data.files || []);
      }
    } catch (err: any) {
      console.warn('Could not fetch category files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchCategoryFiles(activeCategory);
  }, [activeCategory]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
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
        throw new Error(data.error || 'Failed to save credentials');
      }

      setConfigSuccess('Credentials stored securely on server.');
      setStatus(data.status);
      // Clear sensitive secret inputs from memory
      setClientSecret('');
      setRefreshToken('');
    } catch (err: any) {
      setConfigError(err.message || 'Failed to update credentials');
    } finally {
      setSavingCreds(false);
    }
  };

  const handleRunTestUpload = async () => {
    setTestingUpload(true);
    setTestResult(null);
    setTestError(null);

    try {
      const res = await apiFetch('/api/admin/drive/test-upload', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Connection verification failed');
      }

      setTestResult(data.result);
      fetchStatus();
      fetchCategoryFiles(activeCategory);
    } catch (err: any) {
      setTestError(err.message || 'Test upload failed');
    } finally {
      setTestingUpload(false);
    }
  };

  const handleDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadSuccess(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      let safeName = (uploadFile.name && uploadFile.name !== 'blob' && uploadFile.name.trim())
        ? uploadFile.name.trim()
        : `drive_upload_${Date.now()}`;
      formData.append('file', uploadFile, safeName);
      formData.append('category', activeCategory);
      formData.append('description', description.trim() || `${activeCategory} upload`);

      const res = await apiFetch('/api/admin/drive/upload', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadSuccess(data);
      setUploadFile(null);
      setDescription('');
      fetchCategoryFiles(activeCategory);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file to Google Drive');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}" from your Google Drive?`)) {
      return;
    }

    setDeletingId(fileId);
    try {
      const res = await apiFetch(`/api/admin/drive/files/${fileId}`, {
        method: 'DELETE',
        headers: getAdminAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete file');
      }
      setFiles(prev => prev.filter(f => f.fileId !== fileId));
      if (previewItem?.fileId === fileId) {
        setPreviewItem(null);
      }
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 border border-[#C89211]/40 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white">
                  Owner Google Drive Central Media Storage
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    status?.connected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {status?.connected ? 'Connected' : 'Setup Required'}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
                Central storage authorized by the owner (<span className="text-amber-300 font-mono">{status?.ownerEmail || 'shivshahidoors@gmail.com'}</span>).
                Customers view media and stream videos with zero sign-in required via local cached delivery.
              </p>
            </div>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loadingStatus}
            className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>

      {/* Scope & Least-Privilege Safeguard Card */}
      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-semibold text-stone-900">
              OAuth Least-Privilege Scope: <span className="font-mono text-[11px] text-[#C89211]">drive.file</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              The app only accesses files and folders it creates inside <strong>Jai Hanuman Door Media</strong>. Your private personal documents, spreadsheets, and photos remain 100% private.
            </p>
          </div>
        </div>
        <div className="text-[11px] font-mono text-stone-500 bg-white px-2.5 py-1 rounded border border-stone-200 shrink-0">
          Folder: Jai Hanuman Door Media
        </div>
      </div>

      {/* Connection Test & Verification Section */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C89211]" />
              <span>1-Click Live Connection Test</span>
            </h4>
            <p className="text-xs text-[#666666] mt-0.5">
              Executes a real test image upload into your Drive's <span className="font-mono text-amber-700">products</span> subfolder, verifies read permissions, and cleans up.
            </p>
          </div>

          <button
            id="btn-drive-test-upload"
            type="button"
            onClick={handleRunTestUpload}
            disabled={testingUpload}
            className="py-2 px-4 rounded-xl bg-[#0C0A09] hover:bg-stone-800 text-amber-400 font-bold text-xs flex items-center gap-2 border border-[#C89211]/40 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {testingUpload ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Verifying Drive Access...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4 text-amber-400" />
                <span>Test Upload 1 Image into My Google Drive</span>
              </>
            )}
          </button>
        </div>

        {testResult && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Real Google Drive Connection Test Succeeded!</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Successfully wrote test image to folder <strong>Jai Hanuman Door Media/products/</strong>, verified retrieval via Drive API, and confirmed permissions.
            </p>
            <div className="text-[10px] font-mono text-emerald-700 pt-1">
              Verified at: {new Date(testResult.verifiedAt).toLocaleString()}
            </div>
          </div>
        )}

        {testError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-bold text-red-950">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Connection Test Notice: Missing Server-Side Refresh Token</span>
            </div>
            <p className="text-[11px] text-red-800 leading-relaxed">
              {testError}
            </p>
            <p className="text-[11px] text-red-700 font-medium">
              To enable server-side offline uploads, enter your Google Cloud OAuth Client ID, Secret, and Refresh Token in the configuration box below.
            </p>
          </div>
        )}
      </div>

      {/* GCP AI Studio Project Limitation & Shortest Supported Workaround Guide */}
      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-stone-900 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-800 shrink-0 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h4 className="text-sm font-bold text-stone-950 flex items-center gap-2">
              <span>Why OAuth Configuration was Blocked in "zeta-gadget-wf6jr" &amp; The Supported Workaround</span>
            </h4>
            <p className="text-xs text-stone-700 leading-relaxed">
              <strong>The Exact Blocker:</strong> Project <code className="bg-stone-200/80 px-1 py-0.5 rounded font-mono text-[11px]">zeta-gadget-wf6jr</code> is a managed Google Cloud project provisioned automatically by Google AI Studio under internal organizational policies. Normal accounts are not granted the organization-level role required for <code className="bg-stone-200/80 px-1 py-0.5 rounded font-mono text-[11px]">oauthconfig.testusers.get</code>. You do <strong>NOT</strong> need to edit IAM roles.
            </p>
            <p className="text-xs text-stone-700 leading-relaxed">
              <strong>The Shortest Supported Workaround:</strong> Google OAuth 2.0 credentials are <em>not</em> restricted to the server's hosting project. You can generate an OAuth Client ID in <strong>any standard Google Cloud project</strong> where <span className="font-mono text-amber-900 font-semibold">{ownerEmail}</span> has full Owner permissions (free, takes ~60 seconds to create). That OAuth client will authorize your Google Drive smoothly without any IAM blockers!
            </p>
          </div>
        </div>

        {/* 3 Simple Setup Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <span className="w-5 h-5 rounded-full bg-[#C89211] text-white flex items-center justify-center text-[11px]">1</span>
              <span>Create Free GCP Project</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Go to <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer" className="text-[#C89211] font-semibold underline inline-flex items-center gap-0.5">console.cloud.google.com <ExternalLink className="w-3 h-3" /></a> and create a project (e.g. <em>"Jai Hanuman Door Drive"</em>). You are 100% full Owner.
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <span className="w-5 h-5 rounded-full bg-[#C89211] text-white flex items-center justify-center text-[11px]">2</span>
              <span>Enable Drive &amp; Create Client</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Enable <strong>Google Drive API</strong>. In OAuth Consent Screen, choose <strong>External</strong>, add your email as Test User. Under Credentials, create <strong>OAuth Client ID</strong> (Web app) with redirect: <code className="font-mono text-[10px] bg-stone-100 p-0.5 rounded">https://developers.google.com/oauthplayground</code>
            </p>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <span className="w-5 h-5 rounded-full bg-[#C89211] text-white flex items-center justify-center text-[11px]">3</span>
              <span>Get Refresh Token &amp; Test</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              In <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer" className="text-[#C89211] font-semibold underline inline-flex items-center gap-0.5">OAuth Playground <ExternalLink className="w-3 h-3" /></a>, paste Client ID/Secret, authorize scope <code className="font-mono text-[10px] bg-stone-100 p-0.5 rounded">drive.file</code>, exchange tokens, paste Refresh Token below, and click Test Upload!
            </p>
          </div>
        </div>
      </div>

      {/* Server Credentials Configuration Card */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Key className="w-4 h-4 text-[#C89211]" />
              <span>Server-Side OAuth Credentials Setup</span>
            </h4>
            <p className="text-xs text-[#666666] mt-0.5">
              Saved strictly in <span className="font-mono text-stone-800">server/data/google_drive_credentials.json</span> (mode 0600). Never sent to frontend or public users.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCredentials} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Owner Email (Google Account)
              </label>
              <input
                type="email"
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
                placeholder="shivshahidoors@gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C89211]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Google OAuth Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="e.g. 1234567890-xxx.apps.googleusercontent.com"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#C89211]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Client Secret
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder={status?.hasClientSecret ? '•••••••••••••••• (Configured on server)' : 'GOCSPX-...'}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#C89211]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                OAuth Refresh Token
              </label>
              <input
                type="password"
                value={refreshToken}
                onChange={e => setRefreshToken(e.target.value)}
                placeholder={status?.hasRefreshToken ? '•••••••••••••••• (Active on server)' : '1//04...'}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#C89211]/30"
              />
            </div>
          </div>

          {configSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              {configSuccess}
            </div>
          )}

          {configError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {configError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-stone-500">
              Scope needed: <code className="font-mono text-[#C89211]">https://www.googleapis.com/auth/drive.file</code>
            </div>
            <button
              type="submit"
              disabled={savingCreds}
              className="py-2 px-5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {savingCreds ? 'Saving Credentials...' : 'Save Drive Credentials to Server'}
            </button>
          </div>
        </form>
      </div>

      {/* Category Folders & Upload Manager */}
      <div className="p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div>
            <h4 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#C89211]" />
              <span>Jai Hanuman Door Media Subfolders</span>
            </h4>
            <p className="text-xs text-[#666666] mt-0.5">
              Select category subfolder to upload or browse files in your Google Drive.
            </p>
          </div>

          {/* Subfolder Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['products', 'catalog', 'banners', 'delivery', 'videos'] as DriveCategory[]).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-[#C89211] text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Form Box */}
        <form onSubmit={handleDirectUpload} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-[#C89211]" />
              <span>Upload to: Jai Hanuman Door Media / {activeCategory}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="file"
                accept={activeCategory === 'videos' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,application/pdf'}
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
                className="w-full text-xs text-stone-700 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#C89211] file:text-white hover:file:bg-[#A0700B] cursor-pointer bg-white p-2 rounded-xl border border-stone-300"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Optional description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#C89211]/30 bg-white"
              />
            </div>
          </div>

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Uploaded <strong>{uploadSuccess.name}</strong> to Google Drive! URL: <code className="bg-emerald-100/60 px-1 rounded">{uploadSuccess.url}</code>
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(uploadSuccess.url, 'Media URL')}
                className="px-2 py-1 rounded bg-white border border-emerald-300 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Copy className="w-3 h-3" />
                <span>Copy URL</span>
              </button>
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {uploadError}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="py-2 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs flex items-center gap-2 border border-amber-500/40 shadow-sm transition-all cursor-pointer disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Uploading to Google Drive...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Upload File to Drive ({activeCategory})</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing Files Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800">
            <span>Files in {activeCategory} subfolder ({files.length})</span>
            <button
              type="button"
              onClick={() => fetchCategoryFiles(activeCategory)}
              disabled={loadingFiles}
              className="text-[#C89211] hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${loadingFiles ? 'animate-spin' : ''}`} />
              <span>Refresh files</span>
            </button>
          </div>

          {loadingFiles ? (
            <div className="py-8 text-center text-xs text-stone-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#C89211] mx-auto mb-2" />
              <span>Loading Drive files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-500 border border-dashed border-stone-300 rounded-xl bg-stone-50">
              No files currently uploaded in <strong>{activeCategory}</strong> folder. Use the upload box above to add your first file.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {files.map(f => (
                <div
                  key={f.fileId}
                  className="p-3 bg-stone-50 rounded-xl border border-stone-200 hover:border-[#C89211]/50 flex flex-col justify-between space-y-2.5 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="aspect-video bg-stone-200 rounded-lg overflow-hidden relative flex items-center justify-center">
                      {f.mimeType.startsWith('video/') ? (
                        <div className="flex flex-col items-center gap-1 text-stone-600">
                          <Film className="w-6 h-6 text-[#C89211]" />
                          <span className="text-[10px] font-semibold">Video</span>
                        </div>
                      ) : (
                        <img
                          src={f.url}
                          alt={f.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                      )}
                    </div>
                    <div className="font-semibold text-xs text-stone-900 truncate" title={f.name}>
                      {f.name}
                    </div>
                    <div className="text-[10px] text-stone-500 flex items-center justify-between">
                      <span>{(f.size / 1024).toFixed(0)} KB</span>
                      <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-stone-200">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(f.url, 'Permanent Media URL')}
                      className="flex-1 py-1 px-1.5 rounded bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                      title="Copy URL to use in door catalog"
                    >
                      <Copy className="w-3 h-3 text-[#C89211]" />
                      <span>Copy URL</span>
                    </button>
                    {f.webViewLink && (
                      <a
                        href={f.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-white hover:bg-stone-100 text-stone-600 border border-stone-300"
                        title="View in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteFile(f.fileId, f.name)}
                      disabled={deletingId === f.fileId}
                      className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer disabled:opacity-50"
                      title="Delete from Google Drive"
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

      {/* Customer Delivery & Quotas Architecture Card */}
      <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-3">
        <div className="flex items-center gap-2 font-bold text-amber-950">
          <Info className="w-4 h-4 text-amber-700" />
          <span>Customer Delivery Method &amp; Google Drive Quota Architecture</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-amber-900 leading-relaxed">
          <p>
            • <strong>Zero Login Required for Customers:</strong> Customers never need to log in to your Google Drive to view product photos or play videos. Every file is streamed via the clean proxy URL <code className="font-mono bg-amber-100/60 px-1 rounded">/api/drive/media/:fileId</code>.
          </p>
          <p>
            • <strong>Quota Protection via Local Mirror:</strong> Google Drive imposes rate limits and bandwidth quotas on repeated file downloads. To protect your Drive quota, the server automatically caches downloaded files in <code className="font-mono bg-amber-100/60 px-1 rounded">data/uploads/drive_cache/</code>. Each file is only downloaded from Google once, after which all customer visits are served directly at microsecond speeds.
          </p>
          <p>
            • <strong>HTTP 206 Video Streaming:</strong> Demonstration and carving videos support partial content ranges so users on mobile phones can scrub through videos without loading the entire 50MB file into memory.
          </p>
        </div>
      </div>
    </div>
  );
};
