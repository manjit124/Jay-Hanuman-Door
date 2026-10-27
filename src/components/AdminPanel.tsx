import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  DoorClosed,
  TreePine,
  Sparkles,
  Frame as FrameIcon,
  Wrench,
  Sliders,
  Image as ImageIcon,
  BookOpen,
  Settings as SettingsIcon,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  FileText,
  DollarSign,
  Layers,
  Search,
  RotateCcw,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  TrendingUp,
  Percent,
  Calculator,
  CheckCircle2,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  Bell,
  Users,
  Lock,
  Smartphone,
  AlertTriangle,
  AlertCircle,
  Inbox,
  MapPin,
  HardDrive,
  Truck,
  Box,
  Video,
  Server,
  Activity,
} from 'lucide-react';
import { ProtectedImage } from './ProtectedImage.tsx';
import { DEFAULT_CONTENT_PROTECTION } from '../lib/contentProtection.ts';
import { AdminNotificationsTab } from './AdminNotificationsTab.tsx';
import { AdminTeamTab } from './AdminTeamTab.tsx';
import { AdminArticlesTab } from './AdminArticlesTab.tsx';
import { AdminLegalTab } from './admin/AdminLegalTab.tsx';
import { AdminEnquiriesTab } from './admin/AdminEnquiriesTab.tsx';
import { AdminBackupRestore } from './admin/AdminBackupRestore.tsx';
import { AdminWoodDetectorTab } from './admin/AdminWoodDetectorTab.tsx';
import { AdminOrderTrackingTab } from './admin/AdminOrderTrackingTab.tsx';
import { AdminVisualizerTab } from './admin/AdminVisualizerTab.tsx';
import { AdminBrandStoryTab } from './AdminBrandStoryTab.tsx';
import { AdminDeliveryTab } from './admin/AdminDeliveryTab.tsx';
import { AdminChaukhatTab } from './admin/AdminChaukhatTab.tsx';
import { AdminAdMobTab } from './admin/AdminAdMobTab.tsx';
import {
  Door,
  Category,
  DoorMaterial,
  PolishFinish,
  ChaukhatFrame,
  HardwareItem,
  HomeBanner,
  Article,
  Quotation,
  BusinessSettings,
  UserProfile,
  TeamMember,
  IndiaDeliveryState,
  DeliveryStory,
} from '../types.ts';
import {
  adminLogin,
  adminLogout,
  clearAdminToken,
  fetchAdminAllData,
  createDoor,
  updateDoor,
  deleteDoor,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createFinish,
  updateFinish,
  deleteFinish,
  createFrame,
  updateFrame,
  deleteFrame,
  createHardware,
  updateHardware,
  deleteHardware,
  createBanner,
  updateBanner,
  updateSlotBanner,
  deleteBanner,
  createArticle,
  updateArticle,
  deleteArticle,
  updateSettings,
  deleteQuote,
  resetDatabase,
  uploadImage,
  uploadVideo,
  upload3DModel,
  resetAdminDefaultPassword,
  getApiBaseUrl,
  getCustomApiBaseUrl,
  setCustomApiBaseUrl,
} from '../lib/api.ts';
import { signInAdminWithGoogle, getClientAuth, ensureFirebaseAuthSession } from '../lib/firestoreClient.ts';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { removeBackgroundFromImage } from '../lib/transparentDoorUtils.ts';
import { formatWhatsAppDisplay } from '../lib/contactUtils.ts';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated: () => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (status: boolean) => void;
  initialTab?: string;
  onNavigateTab?: (tab: string) => void;
  currentUser?: UserProfile | null;
  onLogoutSuccess?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  onDataUpdated,
  isLoggedIn,
  setIsLoggedIn,
  initialTab,
  onNavigateTab,
  currentUser,
  onLogoutSuccess,
}) => {
  // Login state
  const [emailInput, setEmailInput] = useState('shivshahidoors@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [bypassCustomerDenied, setBypassCustomerDenied] = useState(false);

  // Server connection diagnostics & custom URL
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(getCustomApiBaseUrl());
  const [serverTestStatus, setServerTestStatus] = useState<string | null>(null);
  const [isTestingServer, setIsTestingServer] = useState(false);

  // Active Admin Section Tab
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'tracking'
    | 'delivery'
    | 'doors'
    | 'visualizer'
    | 'materials'
    | 'finishes'
    | 'frames'
    | 'hardware'
    | 'banners'
    | 'articles'
    | 'settings'
    | 'quotes'
    | 'notifications'
    | 'team'
    | 'story'
    | 'enquiries'
    | 'legal'
    | 'backup'
    | 'wood-detector'
    | 'admob'
  >('dashboard');

  // Loaded DB data in Admin
  const [loading, setLoading] = useState(false);
  const [doors, setDoors] = useState<Door[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<DoorMaterial[]>([]);
  const [finishes, setFinishes] = useState<PolishFinish[]>([]);
  const [frames, setFrames] = useState<ChaukhatFrame[]>([]);
  const [hardware, setHardware] = useState<HardwareItem[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [deliveryStates, setDeliveryStates] = useState<IndiaDeliveryState[]>([]);
  const [deliveryStories, setDeliveryStories] = useState<DeliveryStory[]>([]);

  // Status message for successful saves
  const [toastMsg, setToastMsg] = useState('');

  // Editing forms state
  const [editingDoor, setEditingDoor] = useState<Partial<Door> | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Partial<DoorMaterial> | null>(null);
  const [editingFinish, setEditingFinish] = useState<Partial<PolishFinish> | null>(null);
  const [editingFrame, setEditingFrame] = useState<Partial<ChaukhatFrame> | null>(null);
  const [editingHardware, setEditingHardware] = useState<Partial<HardwareItem> | null>(null);
  const [editingBanner, setEditingBanner] = useState<Partial<HomeBanner> | null>(null);
  const [bannerSlotFilter, setBannerSlotFilter] = useState<'all' | 'slot_1' | 'slot_2' | 'slot_3'>('all');
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const [bannerDimensions, setBannerDimensions] = useState<{ width: number; height: number; ratio: string } | null>(null);

  useEffect(() => {
    if (!editingBanner?.image) {
      setBannerDimensions(null);
      return;
    }
    const img = new Image();
    img.src = editingBanner.image;
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w > 0 && h > 0) {
        const gcdVal = (a: number, b: number): number => (b === 0 ? a : gcdVal(b, a % b));
        const divisor = gcdVal(w, h);
        const ratioW = Math.round((w / divisor) * 10) / 10;
        const ratioH = Math.round((h / divisor) * 10) / 10;
        setBannerDimensions({ width: w, height: h, ratio: `${ratioW}:${ratioH}` });
      } else {
        setBannerDimensions(null);
      }
    };
    img.onerror = () => {
      setBannerDimensions(null);
    };
  }, [editingBanner?.image]);
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);

  // Uploading state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isUploadingModel, setIsUploadingModel] = useState(false);
  const [isUploadingPng, setIsUploadingPng] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [isSavingDoor, setIsSavingDoor] = useState(false);

  // Quick inline price & details editing states
  const [quickEditMaterialId, setQuickEditMaterialId] = useState<string | null>(null);
  const [quickEditMaterialRate, setQuickEditMaterialRate] = useState<number>(0);
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialsViewMode, setMaterialsViewMode] = useState<'cards' | 'table'>('cards');

  // Bulk rate adjustment state
  const [showBulkRateModal, setShowBulkRateModal] = useState(false);
  const [bulkAdjustmentPercent, setBulkAdjustmentPercent] = useState<number>(5);
  const [bulkAdjustmentAmount, setBulkAdjustmentAmount] = useState<number>(50);
  const [bulkAdjustmentMode, setBulkAdjustmentMode] = useState<'percent' | 'fixed'>('fixed');

  // Quick price editing states for other tabs
  const [quickEditFinishId, setQuickEditFinishId] = useState<string | null>(null);
  const [quickEditFinishRate, setQuickEditFinishRate] = useState<number>(0);

  const [quickEditFrameId, setQuickEditFrameId] = useState<string | null>(null);
  const [quickEditFramePrice, setQuickEditFramePrice] = useState<number>(0);

  const [quickEditHardwareId, setQuickEditHardwareId] = useState<string | null>(null);
  const [quickEditHardwarePrice, setQuickEditHardwarePrice] = useState<number>(0);

  const [quickEditDoorId, setQuickEditDoorId] = useState<string | null>(null);
  const [quickEditDoorPrice, setQuickEditDoorPrice] = useState<number>(0);

  // Firebase Auth state listener
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const auth = getClientAuth();
    if (auth) {
      if (auth.currentUser) {
        setFbUser(auth.currentUser);
      }
      const unsub = onAuthStateChanged(auth, u => {
        setFbUser(u);
      });
      return () => unsub();
    }
  }, []);

  const ensureActiveAuthSession = async (): Promise<boolean> => {
    const auth = getClientAuth();
    if (auth?.currentUser && auth.currentUser.email) {
      const email = auth.currentUser.email.toLowerCase().trim();
      if (
        email === 'shivshahidoors@gmail.com' ||
        email === 'jayhanumandoor@gmail.com' ||
        email === 'jaihanumandoor@gmail.com' ||
        email.endsWith('@jaihanumandoor.com') ||
        email.endsWith('@shivshahidoors.com')
      ) {
        setFbUser(auth.currentUser);
        return true;
      }
    }

    // Establish Firebase Auth session using authorized administrator credentials
    const hasPassAuth = await ensureFirebaseAuthSession(emailInput || 'shivshahidoors@gmail.com', passwordInput || 'admin123');
    if (hasPassAuth) {
      if (auth?.currentUser) {
        setFbUser(auth.currentUser);
      }
      return true;
    }

    // Do NOT auto-launch background popups. Return false so UI informs user clearly.
    return false;
  };

  const [confirmDeleteBannerId, setConfirmDeleteBannerId] = useState<string | null>(null);
  const [deletingBannerId, setDeletingBannerId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleDeleteBanner = async (bannerId: string, bannerLabel?: string) => {
    if (!bannerId || deletingBannerId) return;
    setDeletingBannerId(bannerId);
    try {
      await ensureActiveAuthSession();
      const res = await deleteBanner(bannerId);
      setBanners(prev => prev.filter(b => b.id !== bannerId));
      if (editingBanner?.id === bannerId) {
        setEditingBanner(null);
        setBannerUploadError(null);
      }
      setConfirmDeleteBannerId(null);
      await loadData();
      onDataUpdated();
      const label = bannerLabel ? `"${bannerLabel}"` : 'Banner';
      if (res?.cleanupWarning) {
        showToast(`${label} deleted from database (Image cleanup note: ${res.cleanupWarning})`);
      } else {
        showToast(`${label} deleted permanently`);
      }
    } catch (err: any) {
      showToast(`Delete failed: ${err?.message || 'Unable to delete banner'}`);
    } finally {
      setDeletingBannerId(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await ensureActiveAuthSession();
      const data = await fetchAdminAllData();
      setDoors(data.doors || []);
      setCategories(data.categories || []);
      setMaterials(data.materials || []);
      setFinishes(data.finishes || []);
      setFrames(data.frames || []);
      setHardware(data.hardware || []);
      setBanners(data.banners || []);
      setArticles(data.articles || []);
      setQuotes(data.quotes || []);
      setTeamMembers(data.teamMembers || []);
      setSettings(data.settings);
      setDeliveryStates(data.deliveryStates || []);
      setDeliveryStories(data.deliveryStories || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTab) {
      const mapped = initialTab === 'prices' ? 'materials' : initialTab === 'orders' ? 'tracking' : (initialTab === 'deliveries' || initialTab === 'delivery-stories' || initialTab === 'shipping') ? 'delivery' : (initialTab === '3d' || initialTab === 'ar') ? 'visualizer' : initialTab;
      if (['dashboard', 'tracking', 'delivery', 'doors', 'visualizer', 'materials', 'finishes', 'frames', 'hardware', 'banners', 'articles', 'settings', 'quotes', 'team', 'notifications', 'enquiries', 'legal', 'backup', 'wood-detector'].includes(mapped)) {
        setActiveTab(mapped as any);
      }
    }
  }, [initialTab]);

  useEffect(() => {
    if (isLoggedIn && isOpen) {
      ensureActiveAuthSession().catch(() => {});
      loadData();
    }
  }, [isLoggedIn, isOpen]);

  const handleTestServer = async () => {
    setIsTestingServer(true);
    setServerTestStatus(null);
    try {
      const activeUrl = customServerUrl.trim() || getApiBaseUrl();
      const testEndpoint = (activeUrl.startsWith('http') ? activeUrl : '') + '/api/catalog';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(testEndpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        setServerTestStatus('Connected: Backend API is live and responding normally.');
      } else if (res.status === 302 || contentType.includes('text/html')) {
        setServerTestStatus('Notice: Server is behind web preview proxy; app will use direct cloud database authentication.');
      } else {
        setServerTestStatus(`Server responded with status code HTTP ${res.status}`);
      }
    } catch (err: any) {
      setServerTestStatus(`Offline or unreachable: ${err.message || 'Connection failed'}. Direct cloud database authentication will be used.`);
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleSaveCustomServerUrl = () => {
    setCustomApiBaseUrl(customServerUrl.trim());
    showToast(customServerUrl.trim() ? `Server URL updated to: ${customServerUrl.trim()}` : 'Default backend URL restored');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await adminLogin(emailInput.trim(), passwordInput);
      if (res.success) {
        setIsLoggedIn(true);
        setPasswordInput('');
        setLoginError('');
        loadData();
        showToast(
          res.source === 'firestore'
            ? 'Signed in via Secure Cloud Database (Direct Mode)'
            : 'Welcome to Door Business Admin Portal'
        );
        if (onNavigateTab) {
          onNavigateTab('dashboard');
        }
      } else {
        setLoginError(res.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Authentication request failed. Please check your internet connection.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    setIsLoggedIn(false);
    setBypassCustomerDenied(false);
    onClose();
    if (onLogoutSuccess) {
      onLogoutSuccess();
    }
  };

  const handleTabSelect = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  // Direct File Upload helper (supports single or multi-file selection with browser compression & progress)
  const handleFileUploadHelper = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string, allUrls?: string[]) => void
  ) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0 || uploadingImage) return;
    setUploadingImage(true);
    setUploadProgress(5);
    const uploadedUrls: string[] = [];
    let totalSavedBytes = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadImage(file, {
          maxDimension: 1680,
          quality: 0.82,
          onProgress: (pct) => {
            const overall = Math.round(((i + pct / 100) / files.length) * 100);
            setUploadProgress(overall);
          },
        });
        uploadedUrls.push(res.url);
        if (res.originalSize && res.optimizedSize && res.originalSize > res.optimizedSize) {
          totalSavedBytes += res.originalSize - res.optimizedSize;
        }
        onSuccess(res.url, uploadedUrls);
      }
      const savedKb = Math.round(totalSavedBytes / 1024);
      showToast(
        files.length > 1
          ? `${files.length} photos uploaded${savedKb > 20 ? ` (saved ${savedKb} KB)` : ''}`
          : `Image uploaded${savedKb > 20 ? ` (optimized by ${savedKb} KB)` : ' successfully'}`
      );
    } catch (err: any) {
      showToast(err?.message || 'Image upload failed. Please retry.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  // Direct Video Upload helper
  const handleVideoUploadHelper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Video file size exceeds 50 MB limit. Please select a compressed MP4/WebM video.');
      return;
    }

    setUploadingVideo(true);
    try {
      const res = await uploadVideo(file);
      if (editingDoor) {
        setEditingDoor({ ...editingDoor, videoUrl: res.url });
      }
      showToast('Product video uploaded successfully!');
    } catch (err: any) {
      alert(err.message || 'Video upload failed');
    } finally {
      setUploadingVideo(false);
    }
  };

  // Quick price update handlers
  const handleQuickUpdateMaterialRate = async (id: string, newRate: number) => {
    if (newRate <= 0) return;
    try {
      await ensureActiveAuthSession();
      await updateMaterial(id, { ratePerSqFt: newRate });
      setQuickEditMaterialId(null);
      await loadData();
      onDataUpdated();
      showToast(`Rate updated to ₹${newRate}/sq.ft.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update rate');
    }
  };

  const handleToggleMaterialStatus = async (mat: DoorMaterial) => {
    try {
      await ensureActiveAuthSession();
      await updateMaterial(mat.id, { active: !mat.active });
      await loadData();
      onDataUpdated();
      showToast(`${mat.name} is now ${!mat.active ? 'Active' : 'Disabled'}`);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleApplyBulkRateAdjustment = async () => {
    const confirmationText =
      bulkAdjustmentMode === 'fixed'
        ? `Apply ₹${bulkAdjustmentAmount > 0 ? '+' : ''}${bulkAdjustmentAmount}/sq.ft. to all wood materials?`
        : `Apply ${bulkAdjustmentPercent > 0 ? '+' : ''}${bulkAdjustmentPercent}% to all wood materials?`;
    if (!confirm(confirmationText)) return;

    try {
      await ensureActiveAuthSession();
      for (const mat of materials) {
        let newRate = mat.ratePerSqFt;
        if (bulkAdjustmentMode === 'fixed') {
          newRate = Math.max(50, mat.ratePerSqFt + bulkAdjustmentAmount);
        } else {
          newRate = Math.max(50, Math.round(mat.ratePerSqFt * (1 + bulkAdjustmentPercent / 100)));
        }
        await updateMaterial(mat.id, { ratePerSqFt: newRate });
      }
      setShowBulkRateModal(false);
      await loadData();
      onDataUpdated();
      showToast('All wood rates updated successfully');
    } catch (err: any) {
      alert(err.message || 'Bulk adjustment failed');
    }
  };

  const handleQuickUpdateFinishRate = async (id: string, newRate: number) => {
    try {
      await ensureActiveAuthSession();
      await updateFinish(id, { ratePerSqFt: newRate });
      setQuickEditFinishId(null);
      await loadData();
      onDataUpdated();
      showToast(`Finish rate updated to ₹${newRate}/sq.ft.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update finish rate');
    }
  };

  const handleQuickUpdateFramePrice = async (id: string, newPrice: number) => {
    try {
      await ensureActiveAuthSession();
      await updateFrame(id, { price: newPrice });
      setQuickEditFrameId(null);
      await loadData();
      onDataUpdated();
      showToast(`Frame price updated to ₹${newPrice.toLocaleString('en-IN')}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update frame price');
    }
  };

  const handleQuickUpdateHardwarePrice = async (id: string, newPrice: number) => {
    try {
      await ensureActiveAuthSession();
      await updateHardware(id, { price: newPrice });
      setQuickEditHardwareId(null);
      await loadData();
      onDataUpdated();
      showToast(`Hardware price updated to ₹${newPrice.toLocaleString('en-IN')}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update hardware price');
    }
  };

  const handleQuickUpdateDoorPrice = async (id: string, newPrice: number) => {
    try {
      await ensureActiveAuthSession();
      await updateDoor(id, { startingPrice: newPrice });
      setQuickEditDoorId(null);
      await loadData();
      onDataUpdated();
      showToast(`Door starting price updated to ₹${newPrice.toLocaleString('en-IN')}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update door starting price');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl text-[#1A1A1A] overflow-hidden my-4 max-h-[96vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5] bg-[#F8F8F6] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF7E3] text-[#C89211] flex items-center justify-center border border-[#C89211]/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A]">
                  Manufacturer Admin Control Center
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 uppercase">
                  Secure Backend
                </span>
              </div>
              <p className="text-xs text-[#666666]">
                Manage doors, live rates, Chaukhat frames, hardware, banners & WhatsApp settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                id="admin-logout-btn"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-100 transition-colors cursor-pointer"
              title="Return to Customer Storefront"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast alert */}
        {toastMsg && (
          <div className="bg-[#C89211] text-white text-xs sm:text-sm font-bold px-4 py-2 text-center shadow-md animate-in slide-in-from-top duration-200">
            {toastMsg}
          </div>
        )}

        {/* Firebase Auth Warning Banner when logged into Admin Panel but auth.currentUser is missing */}
        {isLoggedIn && (!fbUser || !fbUser.email) && (
          <div className="bg-[#FFF7E3] border-b border-[#C89211]/30 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#1A1A1A] animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#C89211] shrink-0" />
              <span>
                <strong>Firebase Auth Session Inactive:</strong> Cloud Firestore write operations require a verified Firebase Auth session.
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await signInAdminWithGoogle();
                  if (res.success) {
                    showToast('Firebase Auth session activated via Google Sign-In');
                  } else if (res.error) {
                    alert(res.error);
                  }
                } catch (err: any) {
                  alert(err.message || 'Google sign-in failed');
                }
              }}
              className="px-3 py-1 bg-[#C89211] hover:bg-[#A0700B] text-white font-bold rounded-lg shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sign In with Google (shivshahidoors@gmail.com)</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row bg-white">
          
          {!isLoggedIn ? (
            currentUser && !bypassCustomerDenied ? (
              /* Access Denied View for Customer Accounts attempting admin route (TEST 10) */
              <div className="w-full max-w-md mx-auto my-auto p-6 sm:p-8 space-y-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#C62828]/10 border border-[#C62828]/30 text-[#C62828] flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl font-bold text-[#1A1A1A]">
                    Access Denied
                  </h3>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    You are currently signed in as a customer account (<span className="text-[#1A1A1A] font-medium">{currentUser.name || currentUser.email}</span>). 
                    Factory administrator credentials and authorization are required to access this portal.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    id="admin-switch-account-btn"
                    onClick={() => setBypassCustomerDenied(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
                  >
                    Sign In with Admin Credentials
                  </button>
                  <button
                    id="admin-back-to-store-btn"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] border border-[#E5E5E5] font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Return to Customer Home
                  </button>
                </div>
              </div>
            ) : (
              /* Admin Login Form Screen */
              <div className="w-full max-w-md mx-auto my-auto p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF7E3] border border-[#C89211]/30 text-[#C89211] flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-[#1A1A1A]">
                    Administrator Sign In
                  </h3>
                  <p className="text-xs text-[#666666]">
                    Enter master security credentials to manage manufacturing catalog, live pricing & business configuration
                  </p>
                </div>

                {loginError && (
                  <div
                    id="admin-login-error"
                    className="p-3 rounded-xl bg-[#C62828]/10 border border-[#C62828]/30 text-[#C62828] text-xs text-center font-medium"
                  >
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                      Admin Email
                    </label>
                    <input
                      id="admin-login-email"
                      type="email"
                      required
                      autoComplete="username"
                      placeholder="e.g. shivshahidoors@gmail.com"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] text-[#1A1A1A] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/30 focus:bg-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#1A1A1A]">
                        Admin Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                        className="text-[11px] text-[#C89211] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <KeyRound className="w-3 h-3" />
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="admin-login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        placeholder="Enter admin password (e.g. admin123)"
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] text-[#1A1A1A] text-sm focus:outline-none focus:ring-2 focus:ring-[#C89211]/30 focus:bg-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#1A1A1A] p-1 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#666666] mt-1.5 px-0.5">
                      <span>Default password: <strong className="text-[#C89211] font-mono">admin123</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailInput('shivshahidoors@gmail.com');
                          setPasswordInput('admin123');
                          setLoginError('');
                        }}
                        className="text-[#C89211] hover:underline font-medium cursor-pointer"
                      >
                        Auto-fill credentials
                      </button>
                    </div>
                  </div>

                  <button
                    id="admin-login-btn"
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 px-4 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      'Authenticate & Unlock Dashboard'
                    )}
                  </button>
                </form>

                {/* Google Sign-In Option for Direct Firebase Auth ID Token */}
                <div className="space-y-2 pt-1 border-t border-[#E5E5E5]">
                  <p className="text-[11px] text-center text-[#666666]">
                    Or authenticate with verified Google account:
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      setLoginError('');
                      setIsLoggingIn(true);
                      try {
                        const res = await signInAdminWithGoogle();
                        if (res.success) {
                          setIsLoggedIn(true);
                          loadData();
                          showToast('Signed in via Firebase Auth (Google Sign-In)');
                          if (onNavigateTab) {
                            onNavigateTab('dashboard');
                          }
                        } else {
                          setLoginError(res.error || 'Google Sign-In failed.');
                        }
                      } catch (err: any) {
                        setLoginError(err.message || 'Google Sign-In failed.');
                      } finally {
                        setIsLoggingIn(false);
                      }
                    }}
                    disabled={isLoggingIn}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-50 border border-[#E5E5E5] text-[#1A1A1A] font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Sign In with Google (shivshahidoors@gmail.com)</span>
                  </button>
                </div>

                {/* Forgot password dialog / guidance */}
                {showForgotPassword && (
                  <div className="p-4 rounded-xl bg-[#FFF7E3] border border-[#C89211]/30 text-xs text-[#1A1A1A] space-y-3 shadow-md">
                    <div className="flex items-center justify-between text-[#C89211] font-semibold">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4" />
                        <span>Administrator Credentials & Recovery</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5 text-[#1A1A1A] text-[11px] leading-relaxed">
                      <p>
                        Your master administration login is ready:
                      </p>
                      <div className="bg-white rounded-lg p-2.5 border border-[#C89211]/20 space-y-1 font-mono text-[12px] shadow-xs">
                        <div className="flex justify-between">
                          <span className="text-[#666666]">Email:</span>
                          <span className="text-[#C89211] font-medium">shivshahidoors@gmail.com</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#666666]">Master Password:</span>
                          <span className="text-[#C89211] font-bold">admin123</span>
                        </div>
                      </div>
                      <p className="text-[#666666] pt-1">
                        You can also sign in using the password configured in Settings or your owner account password.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailInput('shivshahidoors@gmail.com');
                          setPasswordInput('admin123');
                          setShowForgotPassword(false);
                          setLoginError('');
                        }}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs transition-colors text-center cursor-pointer"
                      >
                        Fill & Use admin123
                      </button>
                      <button
                        type="button"
                        disabled={isResettingPassword}
                        onClick={async () => {
                          setIsResettingPassword(true);
                          try {
                            await resetAdminDefaultPassword();
                            setEmailInput('shivshahidoors@gmail.com');
                            setPasswordInput('admin123');
                            setShowForgotPassword(false);
                            setLoginError('');
                            showToast('Admin password reset to admin123');
                          } catch {
                            // ignore
                          } finally {
                            setIsResettingPassword(false);
                          }
                        }}
                        className="py-2 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] border border-[#E5E5E5] font-semibold text-xs transition-colors text-center cursor-pointer"
                      >
                        {isResettingPassword ? 'Resetting...' : 'Reset to admin123'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Server Diagnostics & Endpoint Settings */}
                <div className="pt-2 border-t border-[#E5E5E5] text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowServerConfig(!showServerConfig)}
                    className="text-[11px] text-[#666666] hover:text-[#1A1A1A] inline-flex items-center gap-1.5 font-medium cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5 text-[#C89211]" />
                    <span>{showServerConfig ? 'Hide Server Connection Details' : 'Server Connection & Diagnostics'}</span>
                  </button>

                  {showServerConfig && (
                    <div className="p-3.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-left text-xs space-y-2.5 animate-in fade-in duration-200">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#1A1A1A] mb-1">
                          <span>Active API Server Endpoint:</span>
                          <span className="text-[10px] text-[#C89211] font-mono">
                            {getApiBaseUrl() ? 'Configured URL' : 'Direct / Local'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#666666] break-all bg-white p-2 rounded-lg border border-[#E5E5E5]">
                          {getApiBaseUrl() || '(Same-Origin / Direct Firestore Cloud Store)'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-[#1A1A1A]">
                          Custom Backend Server URL (Optional):
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. https://your-server.run.app"
                            value={customServerUrl}
                            onChange={e => setCustomServerUrl(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E5E5E5] bg-white text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleSaveCustomServerUrl}
                            className="px-2.5 py-1.5 rounded-lg bg-[#C89211] text-white font-bold text-xs hover:bg-[#A0700B] cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleTestServer}
                          disabled={isTestingServer}
                          className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] border border-[#E5E5E5] text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isTestingServer ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3 text-[#C89211]" />}
                          Test Connection
                        </button>
                      </div>

                      {serverTestStatus && (
                        <div className="p-2 rounded-lg bg-white border border-[#E5E5E5] text-[11px] text-[#1A1A1A] font-medium leading-relaxed">
                          {serverTestStatus}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-xs text-[#666666] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                    >
                      ← Return to Customer Storefront
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Logged In Admin Workspace */
            <>
              {/* Sidebar Navigation */}
              <div className="w-full md:w-60 bg-[#F8F8F6] border-b md:border-b-0 md:border-r border-[#E5E5E5] p-3 space-y-1 overflow-x-auto md:overflow-x-visible flex md:flex-col flex-shrink-0">
                
                <button
                  id="admin-tab-dashboard"
                  onClick={() => handleTabSelect('dashboard')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'dashboard' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  Dashboard
                </button>

                <button
                  id="admin-tab-tracking"
                  onClick={() => handleTabSelect('tracking')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'tracking' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  Order Tracking &amp; Mfg
                </button>

                <button
                  id="admin-tab-delivery"
                  onClick={() => handleTabSelect('delivery')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'delivery' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-amber-500" />
                  India Delivery Stories ({deliveryStories.length})
                </button>

                <button
                  id="admin-tab-doors"
                  onClick={() => { handleTabSelect('doors'); setEditingDoor(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'doors' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <DoorClosed className="w-4 h-4" />
                  Door Designs ({doors.length})
                </button>

                <button
                  id="admin-tab-visualizer"
                  onClick={() => handleTabSelect('visualizer')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'visualizer' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <Box className="w-4 h-4" />
                  3D &amp; AR Models
                </button>

                <button
                  id="admin-tab-materials"
                  onClick={() => { handleTabSelect('materials'); setEditingMaterial(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'materials' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <TreePine className="w-4 h-4" />
                  Materials (₹)
                </button>

                <button
                  id="admin-tab-finishes"
                  onClick={() => { handleTabSelect('finishes'); setEditingFinish(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'finishes' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Polish / Finish
                </button>

                <button
                  id="admin-tab-frames"
                  onClick={() => { handleTabSelect('frames'); setEditingFrame(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'frames' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <FrameIcon className="w-4 h-4" />
                  Chaukhat & Frame Management
                </button>

                <button
                  id="admin-tab-hardware"
                  onClick={() => { handleTabSelect('hardware'); setEditingHardware(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'hardware' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  Hardware & Aldrops
                </button>

                <button
                  id="admin-tab-main-banners"
                  onClick={() => { handleTabSelect('main-banners'); setEditingBanner(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'main-banners' || activeTab === 'banners' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Main Banner Management ({banners.filter(b => b.bannerType === 'main' || b.slot === 'hero' || b.slot === 'main' || (!b.bannerType && (!b.slot || b.slot === 'hero' || b.slot === 'main' || b.id === 'ban-1' || b.id === 'ban-3'))).length})
                </button>

                <button
                  id="admin-tab-promotion-banners"
                  onClick={() => { handleTabSelect('promotion-banners'); setEditingBanner(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'promotion-banners' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Promotion Banner Management ({banners.filter(b => b.bannerType === 'promotion' || (b.slot && b.slot !== 'hero' && b.slot !== 'main') || (!b.bannerType && b.id && b.id.startsWith('ban-17'))).length})
                </button>

                <button
                  id="admin-tab-articles"
                  onClick={() => { handleTabSelect('articles'); setEditingArticle(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'articles' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Articles & Guides
                </button>

                <button
                  id="admin-tab-quotes"
                  onClick={() => handleTabSelect('quotes')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'quotes' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Customer Quotes ({quotes.length})
                </button>

                <button
                  id="admin-tab-notifications"
                  onClick={() => handleTabSelect('notifications')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'notifications' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Push Notifications
                </button>

                <button
                  id="admin-tab-team"
                  onClick={() => handleTabSelect('team')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'team' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Team & Leadership ({teamMembers.length})
                </button>

                <button
                  id="admin-tab-story"
                  onClick={() => handleTabSelect('story')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'story' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-[#C89211]" />
                  Brand &amp; Company Story
                </button>

                <button
                  id="admin-tab-enquiries"
                  onClick={() => handleTabSelect('enquiries')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'enquiries' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  Customer Inquiries
                </button>

                <button
                  id="admin-tab-legal"
                  onClick={() => handleTabSelect('legal')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'legal' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Legal &amp; Information Pages
                </button>

                <button
                  id="admin-tab-settings"
                  onClick={() => handleTabSelect('settings')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'settings' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  Business & WhatsApp
                </button>

                <button
                  id="admin-tab-wood-detector"
                  onClick={() => handleTabSelect('wood-detector')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'wood-detector' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <TreePine className="w-4 h-4" />
                  AI Wood Detector
                </button>

                <button
                  id="admin-tab-backup"
                  onClick={() => handleTabSelect('backup')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'backup' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  Backup &amp; Persistence
                </button>

                <button
                  id="admin-tab-admob"
                  onClick={() => handleTabSelect('admob')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    activeTab === 'admob' ? 'bg-[#C89211] text-white shadow-sm font-bold' : 'text-[#666666] hover:text-[#1A1A1A] hover:bg-stone-200/60'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  AdMob Monetization
                </button>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-6">
                
                {/* 1. DASHBOARD VIEW */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A]">
                        Overview & Metrics
                      </h3>
                      <button
                        onClick={() => handleTabSelect('backup')}
                        className="text-xs text-[#C89211] hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 border border-[#E5E5E5] hover:bg-stone-200 transition cursor-pointer font-medium"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                        Backup &amp; Export Data
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs">
                        <div className="text-xs text-[#666666] font-medium">Door Designs</div>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-[#C89211] mt-1">
                          {doors.length}
                        </div>
                        <div className="text-[11px] text-[#666666] mt-1">
                          {doors.filter(d => d.featured).length} Featured
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs">
                        <div className="text-xs text-[#666666] font-medium">Quotes Generated</div>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-[#C89211] mt-1">
                          {quotes.length}
                        </div>
                        <div className="text-[11px] text-[#666666] mt-1">
                          Direct customer leads
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs">
                        <div className="text-xs text-[#666666] font-medium">Wood Materials</div>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-[#C89211] mt-1">
                          {materials.length}
                        </div>
                        <div className="text-[11px] text-[#666666] mt-1">
                          Sagwan: ₹{materials.find(m => m.name.toLowerCase().includes('sagwan'))?.ratePerSqFt || 800}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] shadow-xs">
                        <div className="text-xs text-[#666666] font-medium">WhatsApp Number</div>
                        <div className="text-sm font-mono text-emerald-600 mt-2 font-bold truncate">
                          {formatWhatsAppDisplay(settings?.whatsappNumber)}
                        </div>
                        <div className="text-[11px] text-[#666666] mt-1">
                          Active Inquiries Route
                        </div>
                      </div>
                    </div>

                    {/* Quick Price Matrix (Section 15) */}
                    <div className="p-5 rounded-2xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-[#C89211]" />
                          Live Calculator Rate Matrix
                        </h4>
                        <span className="text-xs text-[#666666]">
                          Updates immediately affect customer calculations
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-white border border-[#E5E5E5] shadow-xs">
                          <div className="text-[#666666] font-medium">Sagwan (CP Teak)</div>
                          <div className="text-base font-bold font-mono text-[#C89211] mt-0.5">
                            ₹{materials.find(m => m.name.toLowerCase().includes('sagwan'))?.ratePerSqFt || 800}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white border border-[#E5E5E5] shadow-xs">
                          <div className="text-[#666666] font-medium">Teak Polish Rate</div>
                          <div className="text-base font-bold font-mono text-[#C89211] mt-0.5">
                            ₹{finishes.find(f => f.name.toLowerCase().includes('teak'))?.ratePerSqFt || 150}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white border border-[#E5E5E5] shadow-xs">
                          <div className="text-[#666666] font-medium">Normal Frame Price</div>
                          <div className="text-base font-bold font-mono text-[#C89211] mt-0.5">
                            ₹{frames.find(fr => fr.name.toLowerCase().includes('normal'))?.price.toLocaleString('en-IN') || '3,500'}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white border border-[#E5E5E5] shadow-xs">
                          <div className="text-[#666666] font-medium">Aldrop Single</div>
                          <div className="text-base font-bold font-mono text-[#C89211] mt-0.5">
                            ₹{hardware.find(h => h.name.toLowerCase().includes('single'))?.price.toLocaleString('en-IN') || '700'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Tracking & Manufacturing Quick Action */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#FFF7E3] via-white to-[#FFF7E3] border border-[#C89211]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 shrink-0">
                          <Truck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-serif text-sm font-bold text-[#1A1A1A]">Order Tracking &amp; Manufacturing Management</h4>
                          <p className="text-xs text-[#666666]">Track 15 live craftsmanship stages, upload progress photos/videos, and send instant WhatsApp updates to customers.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('tracking')}
                        className="px-4 py-2 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs whitespace-nowrap transition shadow-sm self-start sm:self-auto cursor-pointer"
                      >
                        Manage Orders →
                      </button>
                    </div>

                    {/* Recent Quotations Table preview */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-base font-bold text-[#1A1A1A]">
                          Recent Customer Quotations
                        </h4>
                        <button
                          onClick={() => setActiveTab('quotes')}
                          className="text-xs text-[#C89211] hover:underline font-semibold cursor-pointer"
                        >
                          View All ({quotes.length}) →
                        </button>
                      </div>

                      {quotes.length > 0 ? (
                        <div className="border border-[#E5E5E5] rounded-xl overflow-hidden text-xs bg-white shadow-xs">
                          <table className="w-full text-left">
                            <thead className="bg-[#F8F8F6] text-[#666666] border-b border-[#E5E5E5]">
                              <tr>
                                <th className="p-3">Ref No.</th>
                                <th className="p-3">Customer</th>
                                <th className="p-3">Dimensions</th>
                                <th className="p-3">Estimated Total</th>
                                <th className="p-3">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E5E5]">
                              {quotes.slice(0, 5).map(q => (
                                <tr key={q.id} className="hover:bg-stone-50 transition-colors">
                                  <td className="p-3 font-mono text-[#C89211] font-bold">{q.quoteNumber}</td>
                                  <td className="p-3 font-medium text-[#1A1A1A]">
                                    {q.customerName} ({q.customerPhone})
                                  </td>
                                  <td className="p-3 text-[#666666] font-mono">
                                    {q.widthInch}" × {q.heightInch}" ({q.sqFt.toFixed(2)})
                                  </td>
                                  <td className="p-3 font-mono font-bold text-[#1A1A1A]">
                                    ₹{q.total.toLocaleString('en-IN')}
                                  </td>
                                  <td className="p-3 text-[#666666]">
                                    {new Date(q.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-[#666666] text-xs bg-[#F8F8F6] rounded-xl border border-[#E5E5E5]">
                          No quotations generated yet. They will appear here when customers calculate prices.
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* 2. DOOR MANAGEMENT (Section 14) */}
                {activeTab === 'doors' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-white">
                          Door Catalog Designs
                        </h3>
                        <p className="text-xs text-[#666666]">
                          Upload new door photos directly from your device, configure categories, pricing and descriptions
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setEditingDoor({
                            name: '',
                            category: categories[0]?.name || 'Sagwan Door',
                            description: '',
                            material: 'Sagwan',
                            startingPrice: 15600,
                            images: [],
                            availableSizes: ['30 × 78 inch', '32 × 78 inch', '34 × 78 inch', '36 × 78 inch', 'Custom Size'],
                            featured: false,
                            popular: false,
                            active: true,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Door Design
                      </button>
                    </div>

                    {/* Edit or Add Door Form */}
                    {editingDoor && (
                      <div className="p-5 rounded-2xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-4">
                        <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                          <div>
                            <h4 className="font-serif text-base font-bold text-[#C89211]">
                              {editingDoor.id ? 'Edit Door Design' : 'Create New Door Design'}
                            </h4>
                            <div className="text-[11px] text-[#666666] font-mono mt-0.5">
                              Product ID: <span className="text-[#C89211] font-bold">{editingDoor.id || 'Will be generated on save'}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingDoor(null)}
                            className="text-[#666666] hover:text-[#1A1A1A] p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Product-Specific Pricing Configuration (Section 7) */}
                        <div className="p-4 rounded-xl bg-white border border-[#C89211]/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] flex items-center gap-1.5">
                              <Calculator className="w-3.5 h-3.5" />
                              <span>Calculator Pricing &amp; Sizing Configuration</span>
                            </label>
                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              Direct Catalogue ↔ Calculator Sync
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block font-semibold text-[#1A1A1A] mb-1">
                                Pricing Model <span className="text-[#C89211]">*</span>
                              </label>
                              <select
                                value={editingDoor.pricingType || 'sqft'}
                                onChange={e => setEditingDoor({ ...editingDoor, pricingType: e.target.value as 'sqft' | 'fixed' })}
                                className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:ring-2 focus:ring-[#C89211]"
                              >
                                <option value="sqft">Per Sq.Ft Rate (₹/sq.ft)</option>
                                <option value="fixed">Fixed Price (Flat ₹)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-semibold text-[#1A1A1A] mb-1">
                                {editingDoor.pricingType === 'fixed' ? 'Fixed Shutter Price (₹)' : 'Base Rate (₹/sq.ft)'} <span className="text-[#C89211]">*</span>
                              </label>
                              <input
                                type="number"
                                value={editingDoor.basePrice !== undefined ? editingDoor.basePrice : (editingDoor.pricingType === 'fixed' ? (editingDoor.startingPrice || 15000) : (editingDoor.startingPrice ? Math.round(editingDoor.startingPrice / 19.5) : 800))}
                                onChange={e => setEditingDoor({ ...editingDoor, basePrice: Number(e.target.value) })}
                                placeholder={editingDoor.pricingType === 'fixed' ? 'e.g. 24000' : 'e.g. 850'}
                                className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] border border-[#C89211]/40 text-[#C89211] font-mono font-bold text-xs focus:ring-2 focus:ring-[#C89211]"
                              />
                            </div>

                            <div>
                              <label className="block font-semibold text-[#1A1A1A] mb-1">
                                Minimum Order Price (₹)
                              </label>
                              <input
                                type="number"
                                value={editingDoor.minPrice || 0}
                                onChange={e => setEditingDoor({ ...editingDoor, minPrice: Number(e.target.value) })}
                                placeholder="e.g. 10000"
                                className="w-full px-3 py-2 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] font-mono text-xs focus:ring-2 focus:ring-[#C89211]"
                              />
                            </div>
                          </div>

                          {/* Recommended Size Boundaries */}
                          <div className="pt-2 border-t border-[#E5E5E5]">
                            <div className="text-[11px] font-semibold text-[#1A1A1A] mb-1.5">
                              Recommended Size Range for this Design (Inches)
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] text-[#666666] block mb-0.5">Min Width (in)</label>
                                <input
                                  type="number"
                                  value={editingDoor.minWidthInch || 24}
                                  onChange={e => setEditingDoor({ ...editingDoor, minWidthInch: Number(e.target.value) })}
                                  className="w-full px-2 py-1 rounded bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[#666666] block mb-0.5">Max Width (in)</label>
                                <input
                                  type="number"
                                  value={editingDoor.maxWidthInch || 72}
                                  onChange={e => setEditingDoor({ ...editingDoor, maxWidthInch: Number(e.target.value) })}
                                  className="w-full px-2 py-1 rounded bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[#666666] block mb-0.5">Min Height (in)</label>
                                <input
                                  type="number"
                                  value={editingDoor.minHeightInch || 60}
                                  onChange={e => setEditingDoor({ ...editingDoor, minHeightInch: Number(e.target.value) })}
                                  className="w-full px-2 py-1 rounded bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[#666666] block mb-0.5">Max Height (in)</label>
                                <input
                                  type="number"
                                  value={editingDoor.maxHeightInch || 96}
                                  onChange={e => setEditingDoor({ ...editingDoor, maxHeightInch: Number(e.target.value) })}
                                  className="w-full px-2 py-1 rounded bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Supported Wood / Materials */}
                          <div className="pt-2 border-t border-[#E5E5E5]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-semibold text-[#1A1A1A]">Supported Wood / Materials</span>
                              <span className="text-[10px] text-[#666666]">Uncheck to restrict in calculator</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-[#F8F8F6] rounded-lg border border-[#E5E5E5]">
                              {materials.map(mat => {
                                const isSupported = !editingDoor.availableMaterialIds || editingDoor.availableMaterialIds.length === 0 || editingDoor.availableMaterialIds.includes(mat.id);
                                const overrideRate = editingDoor.materialPrices?.[mat.id];
                                return (
                                  <div key={mat.id} className="flex items-center justify-between p-1.5 rounded bg-white border border-[#E5E5E5] text-[11px]">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isSupported}
                                        onChange={e => {
                                          const current = editingDoor.availableMaterialIds ? [...editingDoor.availableMaterialIds] : materials.map(m => m.id);
                                          const updated = e.target.checked ? [...current, mat.id] : current.filter(id => id !== mat.id);
                                          setEditingDoor({ ...editingDoor, availableMaterialIds: updated });
                                        }}
                                        className="accent-amber-500 rounded"
                                      />
                                      <span className="text-[#1A1A1A] font-medium">{mat.name}</span>
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-[#666666]">₹/sq.ft:</span>
                                      <input
                                        type="number"
                                        value={overrideRate !== undefined ? overrideRate : mat.ratePerSqFt}
                                        onChange={e => {
                                          const val = Number(e.target.value);
                                          setEditingDoor({
                                            ...editingDoor,
                                            materialPrices: {
                                              ...(editingDoor.materialPrices || {}),
                                              [mat.id]: val,
                                            },
                                          });
                                        }}
                                        className="w-16 px-1.5 py-0.5 rounded bg-[#F8F8F6] border border-[#E5E5E5] text-[#C89211] text-[10px] font-mono text-right"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Supported Polish Finishes */}
                          <div className="pt-2 border-t border-[#E5E5E5]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-semibold text-[#1A1A1A]">Supported Polish / Finishes</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 bg-[#F8F8F6] rounded-lg border border-[#E5E5E5]">
                              {finishes.map(fin => {
                                const isSupported = !editingDoor.availableFinishIds || editingDoor.availableFinishIds.length === 0 || editingDoor.availableFinishIds.includes(fin.id);
                                const overrideRate = editingDoor.finishPrices?.[fin.id];
                                return (
                                  <div key={fin.id} className="flex items-center justify-between p-1.5 rounded bg-white border border-[#E5E5E5] text-[11px]">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isSupported}
                                        onChange={e => {
                                          const current = editingDoor.availableFinishIds ? [...editingDoor.availableFinishIds] : finishes.map(f => f.id);
                                          const updated = e.target.checked ? [...current, fin.id] : current.filter(id => id !== fin.id);
                                          setEditingDoor({ ...editingDoor, availableFinishIds: updated });
                                        }}
                                        className="accent-amber-500 rounded"
                                      />
                                      <span className="text-[#1A1A1A] font-medium">{fin.name}</span>
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-[#666666]">₹/sq.ft:</span>
                                      <input
                                        type="number"
                                        value={overrideRate !== undefined ? overrideRate : fin.ratePerSqFt}
                                        onChange={e => {
                                          const val = Number(e.target.value);
                                          setEditingDoor({
                                            ...editingDoor,
                                            finishPrices: {
                                              ...(editingDoor.finishPrices || {}),
                                              [fin.id]: val,
                                            },
                                          });
                                        }}
                                        className="w-16 px-1.5 py-0.5 rounded bg-[#F8F8F6] border border-[#E5E5E5] text-[#C89211] text-[10px] font-mono text-right"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Supported Chaukhat / Frames */}
                          <div className="pt-2 border-t border-[#E5E5E5]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-semibold text-[#1A1A1A]">Supported Chaukhat / Frames</span>
                              <span className="text-[10px] text-[#666666]">Uncheck to restrict in calculator</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 bg-[#F8F8F6] rounded-lg border border-[#E5E5E5]">
                              {frames.map(frm => {
                                const isSupported = !editingDoor.availableFrameIds || editingDoor.availableFrameIds.length === 0 || editingDoor.availableFrameIds.includes(frm.id);
                                const overridePrice = editingDoor.framePrices?.[frm.id];
                                return (
                                  <div key={frm.id} className="flex items-center justify-between p-1.5 rounded bg-white border border-[#E5E5E5] text-[11px]">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isSupported}
                                        onChange={e => {
                                          const current = editingDoor.availableFrameIds ? [...editingDoor.availableFrameIds] : frames.map(f => f.id);
                                          const updated = e.target.checked ? [...current, frm.id] : current.filter(id => id !== frm.id);
                                          setEditingDoor({ ...editingDoor, availableFrameIds: updated });
                                        }}
                                        className="accent-amber-500 rounded"
                                      />
                                      <span className="text-[#1A1A1A] font-medium truncate max-w-[130px]">{frm.name}</span>
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-[#666666]">Price (₹):</span>
                                      <input
                                        type="number"
                                        value={overridePrice !== undefined ? overridePrice : frm.price}
                                        onChange={e => {
                                          const val = Number(e.target.value);
                                          setEditingDoor({
                                            ...editingDoor,
                                            framePrices: {
                                              ...(editingDoor.framePrices || {}),
                                              [frm.id]: val,
                                            },
                                          });
                                        }}
                                        className="w-16 px-1.5 py-0.5 rounded bg-[#F8F8F6] border border-[#E5E5E5] text-[#C89211] text-[10px] font-mono text-right"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Supported Hardware & Fittings */}
                          <div className="pt-2 border-t border-[#E5E5E5]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-semibold text-[#1A1A1A]">Supported Hardware & Fittings</span>
                              <span className="text-[10px] text-[#666666]">Uncheck to restrict in calculator</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 bg-[#F8F8F6] rounded-lg border border-[#E5E5E5]">
                              {hardware.map(hwd => {
                                const isSupported = !editingDoor.availableHardwareIds || editingDoor.availableHardwareIds.length === 0 || editingDoor.availableHardwareIds.includes(hwd.id);
                                const overridePrice = editingDoor.hardwarePrices?.[hwd.id];
                                return (
                                  <div key={hwd.id} className="flex items-center justify-between p-1.5 rounded bg-white border border-[#E5E5E5] text-[11px]">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isSupported}
                                        onChange={e => {
                                          const current = editingDoor.availableHardwareIds ? [...editingDoor.availableHardwareIds] : hardware.map(h => h.id);
                                          const updated = e.target.checked ? [...current, hwd.id] : current.filter(id => id !== hwd.id);
                                          setEditingDoor({ ...editingDoor, availableHardwareIds: updated });
                                        }}
                                        className="accent-amber-500 rounded"
                                      />
                                      <span className="text-[#1A1A1A] font-medium truncate max-w-[130px]">{hwd.name}</span>
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-[#666666]">Price (₹):</span>
                                      <input
                                        type="number"
                                        value={overridePrice !== undefined ? overridePrice : hwd.price}
                                        onChange={e => {
                                          const val = Number(e.target.value);
                                          setEditingDoor({
                                            ...editingDoor,
                                            hardwarePrices: {
                                              ...(editingDoor.hardwarePrices || {}),
                                              [hwd.id]: val,
                                            },
                                          });
                                        }}
                                        className="w-16 px-1.5 py-0.5 rounded bg-[#F8F8F6] border border-[#E5E5E5] text-[#C89211] text-[10px] font-mono text-right"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          {/* Name */}
                          <div>
                            <label className="block font-semibold text-[#1A1A1A] mb-1">
                              Door Name <span className="text-[#C89211]">*</span>
                            </label>
                            <input
                              type="text"
                              value={editingDoor.name || ''}
                              onChange={e => setEditingDoor({ ...editingDoor, name: e.target.value })}
                              placeholder="e.g. Royal Sagwan Floral Carved Door"
                              className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:ring-2 focus:ring-[#C89211]"
                            />
                          </div>

                          {/* Category */}
                          <div>
                            <label className="block font-semibold text-[#1A1A1A] mb-1">
                              Category <span className="text-[#C89211]">*</span>
                            </label>
                            <select
                              value={editingDoor.category || ''}
                              onChange={e => setEditingDoor({ ...editingDoor, category: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:ring-2 focus:ring-[#C89211]"
                            >
                              <option value="Sagwan Door">Sagwan Door</option>
                              <option value="Designer Door">Designer Door</option>
                              <option value="Main Door">Main Door</option>
                              <option value="Double Door">Double Door</option>
                              <option value="Wooden Door">Wooden Door</option>
                              <option value="Traditional Door">Traditional Door</option>
                              <option value="Modern Door">Modern Door</option>
                              <option value="Premium Door">Premium Door</option>
                              <option value="Door Frame / Chaukhat">Door Frame / Chaukhat</option>
                            </select>
                          </div>

                          {/* Starting Price */}
                          <div>
                            <label className="block font-semibold text-[#1A1A1A] mb-1">
                              Starting Price (₹)
                            </label>
                            <input
                              type="number"
                              value={editingDoor.startingPrice || 0}
                              onChange={e => setEditingDoor({ ...editingDoor, startingPrice: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono text-xs focus:ring-2 focus:ring-[#C89211]"
                            />
                          </div>

                          {/* Primary Material */}
                          <div>
                            <label className="block font-semibold text-[#1A1A1A] mb-1">
                              Recommended Material
                            </label>
                            <input
                              type="text"
                              value={editingDoor.material || 'Sagwan'}
                              onChange={e => setEditingDoor({ ...editingDoor, material: e.target.value })}
                              placeholder="e.g. Sagwan (Teak Wood), Sal Wood"
                              className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:ring-2 focus:ring-[#C89211]"
                            />
                          </div>

                          {/* Direct Image Upload (Section 14 requirement) */}
                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-[#1A1A1A] mb-1">
                              Door Image (Direct File Upload)
                            </label>
                            <div className="flex items-center gap-3">
                              <label className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-colors ${uploadingImage ? 'bg-stone-400 cursor-wait' : 'cursor-pointer bg-[#C89211] hover:bg-[#A0700B]'}`}>
                                {uploadingImage ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5" />
                                )}
                                {uploadingImage
                                  ? `Uploading${uploadProgress !== null ? ` ${uploadProgress}%` : ''}...`
                                  : 'Choose File(s) to Upload'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  disabled={uploadingImage}
                                  onChange={e =>
                                    handleFileUploadHelper(e, url => {
                                      setEditingDoor(prev => {
                                        if (!prev) return prev;
                                        const current = prev.images || [];
                                        if (current.includes(url)) return prev;
                                        return {
                                          ...prev,
                                          image: current.length === 0 ? url : (prev.image || url),
                                          images: [url, ...current],
                                        };
                                      });
                                    })
                                  }
                                  className="hidden"
                                />
                              </label>
                              <span className="text-[11px] text-[#666666]">
                                Auto-optimizes camera photos (1680px HD) for fast upload
                              </span>
                            </div>

                            {/* Images preview list */}
                            {editingDoor.images && editingDoor.images.length > 0 && (
                              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                {editingDoor.images.map((img, idx) => (
                                  <div key={idx} className="relative w-16 h-20 rounded border border-[#E5E5E5] overflow-hidden group">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = editingDoor.images?.filter((_, i) => i !== idx);
                                        setEditingDoor({ ...editingDoor, images: updated });
                                      }}
                                      className="absolute top-1 right-1 bg-red-600 text-white rounded p-0.5 opacity-80 hover:opacity-100"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Door Video (Product Video) Upload Feature */}
                          <div className="sm:col-span-2 p-3.5 bg-white rounded-xl border border-[#E5E5E5] space-y-2.5">
                            <div className="flex items-center justify-between">
                              <label className="block font-semibold text-[#1A1A1A] text-xs flex items-center gap-1.5">
                                <Video className="w-4 h-4 text-[#C89211]" />
                                <span>Door Video (Product Video)</span>
                              </label>
                              <span className="text-[10px] text-[#666666]">
                                Recommended Max 50 MB • MP4, WebM, MOV
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <label className="cursor-pointer px-4 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs">
                                {uploadingVideo ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Uploading Video...</span>
                                  </>
                                ) : (
                                  <>
                                    <Video className="w-3.5 h-3.5" />
                                    <span>🎥 Choose Video to Upload</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm,video/quicktime,video/mov,video/*"
                                  disabled={uploadingVideo}
                                  onChange={handleVideoUploadHelper}
                                  className="hidden"
                                />
                              </label>
                              <span className="text-[11px] text-[#666666]">
                                Upload MP4/WebM product video from your phone or PC
                              </span>
                            </div>

                            {/* Video Preview with Controls, Replace & Remove options */}
                            {editingDoor.videoUrl && (
                              <div className="mt-3 p-3 bg-[#F8F8F6] rounded-xl border border-[#E5E5E5] space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-[#16803A]" />
                                    <span>Product Video Uploaded</span>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {/* Replace Video Button */}
                                    <label className="cursor-pointer text-[11px] font-semibold text-[#C89211] hover:underline flex items-center gap-1">
                                      <Edit2 className="w-3 h-3" />
                                      <span>Replace Video</span>
                                      <input
                                        type="file"
                                        accept="video/mp4,video/webm,video/quicktime,video/mov,video/*"
                                        disabled={uploadingVideo}
                                        onChange={handleVideoUploadHelper}
                                        className="hidden"
                                      />
                                    </label>
                                    <span className="text-[#CCCCCC]">•</span>
                                    {/* Remove Video Button */}
                                    <button
                                      type="button"
                                      onClick={() => setEditingDoor({ ...editingDoor, videoUrl: undefined })}
                                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Remove Video</span>
                                    </button>
                                  </div>
                                </div>

                                <div className="relative rounded-lg overflow-hidden bg-black max-w-sm shadow-sm">
                                  <video
                                    src={editingDoor.videoUrl}
                                    controls
                                    playsInline
                                    preload="metadata"
                                    className="w-full max-h-56 object-contain rounded-lg"
                                    onContextMenu={e => e.preventDefault()}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-[#1A1A1A] mb-1">
                              Description & Features
                            </label>
                            <textarea
                              rows={3}
                              value={editingDoor.description || ''}
                              onChange={e => setEditingDoor({ ...editingDoor, description: e.target.value })}
                              placeholder="e.g. Handcrafted solid Sagwan wood door with traditional carvings..."
                              className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:ring-2 focus:ring-[#C89211]"
                            />
                          </div>

                          {/* Toggles */}
                          <div className="sm:col-span-2 flex flex-wrap gap-4 pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingDoor.featured || false}
                                onChange={e => setEditingDoor({ ...editingDoor, featured: e.target.checked })}
                                className="rounded accent-amber-500"
                              />
                              <span className="text-[#1A1A1A]">Mark as Featured</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingDoor.popular || false}
                                onChange={e => setEditingDoor({ ...editingDoor, popular: e.target.checked })}
                                className="rounded accent-amber-500"
                              />
                              <span className="text-[#1A1A1A]">Mark as Popular</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingDoor.active !== undefined ? editingDoor.active : true}
                                onChange={e => setEditingDoor({ ...editingDoor, active: e.target.checked })}
                                className="rounded accent-amber-500"
                              />
                              <span className="text-[#1A1A1A]">Active (Visible in Catalog)</span>
                            </label>
                          </div>

                          {/* 3D & AR Model Attachment (.glb / .gltf) */}
                          <div className="sm:col-span-2 p-4 rounded-xl bg-white border border-[#E5E5E5] space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] flex items-center gap-1.5">
                                <Box className="w-3.5 h-3.5" />
                                <span>3D CAD Model (.glb / .gltf) - Optional</span>
                              </label>
                              {editingDoor.model3d?.modelUrl && (
                                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Custom 3D Attached
                                </span>
                              )}
                            </div>

                            {editingDoor.model3d?.modelUrl ? (
                              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8F8F6] border border-emerald-500/30 text-xs">
                                <span className="text-[#1A1A1A] font-mono truncate max-w-xs">
                                  {editingDoor.model3d.modelUrl.split('/').pop()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingDoor({
                                      ...editingDoor,
                                      model3d: { ...editingDoor.model3d, modelUrl: '' },
                                    })
                                  }
                                  className="text-red-400 hover:text-red-300 text-xs p-1"
                                  title="Remove 3D model and use catalogue image preview"
                                >
                                  Remove 3D File
                                </button>
                              </div>
                            ) : (
                              <p className="text-[11px] text-[#666666] leading-relaxed">
                                No custom .glb uploaded. This catalogue door automatically uses its image for the 2.5D architectural 3D viewer and AR entrance fitting.
                              </p>
                            )}

                            <div>
                              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#C89211] border border-[#E5E5E5] text-xs font-semibold cursor-pointer transition">
                                <Upload className="w-3.5 h-3.5" />
                                <span>{isUploadingModel ? 'Uploading 3D Model...' : 'Upload / Replace .glb Model'}</span>
                                <input
                                  type="file"
                                  accept=".glb,.gltf"
                                  disabled={isUploadingModel}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      setIsUploadingModel(true);
                                      const res = await upload3DModel(file);
                                      setEditingDoor(prev => ({
                                        ...prev,
                                        model3d: {
                                          ...prev?.model3d,
                                          modelUrl: res.url,
                                          arEnabled: true,
                                        },
                                      }));
                                      showToast('3D Model uploaded successfully!');
                                    } catch (err: any) {
                                      alert(err.message || '3D Model upload failed');
                                    } finally {
                                      setIsUploadingModel(false);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>

                          {/* Transparent PNG Door Cutout (.png) - For Fit in Entrance */}
                          <div className="sm:col-span-2 p-4 rounded-xl bg-white border border-[#E5E5E5] space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold uppercase tracking-wider text-[#C89211] flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Transparent PNG Cutout (.png) - Optional for Fit in Entrance</span>
                              </label>
                              {editingDoor.transparentPngUrl && (
                                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Custom PNG Attached
                                </span>
                              )}
                            </div>

                            {editingDoor.transparentPngUrl ? (
                              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8F8F6] border border-emerald-500/30 text-xs">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-16 rounded-lg bg-[repeating-conic-gradient(#262626_0_25%,#1c1c1c_0_50%)] bg-[size:10px_10px] p-1 flex items-center justify-center border border-[#E5E5E5] shrink-0">
                                    <img
                                      src={editingDoor.transparentPngUrl}
                                      alt="Transparent Cutout"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="space-y-0.5 overflow-hidden">
                                    <span className="text-[#1A1A1A] font-mono text-xs truncate block max-w-xs">
                                      {editingDoor.transparentPngUrl.split('/').pop()}
                                    </span>
                                    <span className="text-[10px] text-emerald-400 font-semibold block">
                                      Active in Fit in Entrance &amp; AR
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingDoor({
                                      ...editingDoor,
                                      transparentPngUrl: '',
                                    })
                                  }
                                  className="text-red-400 hover:text-red-300 text-xs p-1.5 rounded hover:bg-white transition"
                                  title="Remove transparent PNG cutout"
                                >
                                  Remove PNG
                                </button>
                              </div>
                            ) : (
                              <p className="text-[11px] text-[#666666] leading-relaxed">
                                No custom transparent PNG uploaded. The application automatically isolates and removes the background from the catalogue photo in real time, or you can upload/generate a custom transparent PNG below.
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {/* Upload custom PNG */}
                              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#C89211] border border-[#E5E5E5] text-xs font-semibold cursor-pointer transition">
                                {isUploadingPng ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Upload className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {isUploadingPng
                                    ? `Uploading PNG${uploadProgress !== null ? ` ${uploadProgress}%` : ''}...`
                                    : 'Upload Transparent PNG'}
                                </span>
                                <input
                                  type="file"
                                  accept=".png,.webp,image/png,image/webp"
                                  disabled={isUploadingPng}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || isUploadingPng) return;
                                    try {
                                      setIsUploadingPng(true);
                                      setUploadProgress(5);
                                      const res = await uploadImage(file, {
                                        maxDimension: 1800,
                                        preserveTransparency: true,
                                        onProgress: pct => setUploadProgress(pct),
                                      });
                                      setEditingDoor(prev => ({
                                        ...prev,
                                        transparentPngUrl: res.url,
                                      }));
                                      showToast('Transparent PNG uploaded successfully!');
                                    } catch (err: any) {
                                      showToast(err?.message || 'PNG upload failed. Please retry.');
                                    } finally {
                                      setIsUploadingPng(false);
                                      setUploadProgress(null);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>

                              {/* Auto-Generate from Catalogue Photo */}
                              {editingDoor.images?.[0] && (
                                <button
                                  type="button"
                                  disabled={isGeneratingPng}
                                  onClick={async () => {
                                    try {
                                      setIsGeneratingPng(true);
                                      const transparentDataUrl = await removeBackgroundFromImage(editingDoor.images[0]);
                                      // Convert DataURL to File and upload to server
                                      const blob = await (await fetch(transparentDataUrl)).blob();
                                      const file = new File([blob], `door-${editingDoor.id || 'cutout'}-transparent.png`, { type: 'image/png' });
                                      const res = await uploadImage(file);
                                      setEditingDoor(prev => ({
                                        ...prev,
                                        transparentPngUrl: res.url,
                                      }));
                                      showToast('Transparent PNG auto-generated and saved!');
                                    } catch (err: any) {
                                      alert(err.message || 'Auto background removal failed');
                                    } finally {
                                      setIsGeneratingPng(false);
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFF7E3] hover:bg-amber-600/30 text-[#C89211] border border-[#C89211]/40 text-xs font-semibold transition cursor-pointer"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>{isGeneratingPng ? 'Generating Cutout...' : '⚡ Auto-Remove Background from Photo'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                          <button
                            onClick={() => setEditingDoor(null)}
                            className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1A1A1A] text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isSavingDoor}
                            onClick={async () => {
                              if (!editingDoor.name?.trim()) {
                                alert('Please provide door name');
                                return;
                              }
                              setIsSavingDoor(true);
                              try {
                                const isAuthActive = await ensureActiveAuthSession();
                                if (!isAuthActive) {
                                  alert('Database Authorization Required: Please click "Sign In with Google (shivshahidoors@gmail.com)" in the header banner above to authorize Cloud Firestore writes.');
                                  return;
                                }
                                if (editingDoor.id) {
                                  await updateDoor(editingDoor.id, editingDoor);
                                } else {
                                  await createDoor(editingDoor);
                                }
                                setEditingDoor(null);
                                await loadData();
                                onDataUpdated();
                                showToast('Door design saved successfully');
                              } catch (err: any) {
                                console.error('Save door error:', err);
                                alert(err.message || 'Save failed');
                              } finally {
                                setIsSavingDoor(false);
                              }
                            }}
                            className="px-5 py-2 rounded-lg bg-[#C89211] hover:bg-[#A0700B] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            {isSavingDoor && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{isSavingDoor ? 'Saving Design...' : 'Save Door Design'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Door List Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {doors.map(door => (
                        <div
                          key={door.id}
                          className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#E5E5E5] flex flex-col justify-between space-y-3 shadow-sm hover:border-[#C89211]/40 transition-all"
                        >
                          <div>
                            <div className="flex gap-3">
                              <img
                                src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'}
                                alt=""
                                className="w-16 h-20 object-cover rounded-xl bg-white border border-[#E5E5E5] flex-shrink-0"
                              />
                              <div className="overflow-hidden flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-semibold text-[#C89211] bg-[#FFF7E3] px-2 py-0.5 rounded-full border border-[#C89211]/30">
                                    {door.category}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${door.active !== false ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-[#F8F8F6] text-[#666666] border-[#E5E5E5]'}`}>
                                    {door.active !== false ? 'Active' : 'Disabled'}
                                  </span>
                                </div>
                                <h4 className="font-bold text-[#1A1A1A] text-sm mt-1.5 line-clamp-1">
                                  {door.name}
                                </h4>
                                <div className="flex flex-wrap gap-1.5 mt-1 text-[10px]">
                                  {door.featured && <span className="text-[#C89211] font-medium bg-[#FFF7E3] px-1.5 py-0.5 rounded border border-[#C89211]/30">★ Featured</span>}
                                  {door.popular && <span className="text-emerald-300 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">★ Popular</span>}
                                  {door.transparentPngUrl && <span className="text-teal-300 font-medium bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">✂ PNG Cutout</span>}
                                  {door.model3d?.modelUrl && <span className="text-sky-300 font-medium bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">3D CAD</span>}
                                </div>
                              </div>
                            </div>

                            {/* Price & Quick Edit */}
                            <div className="mt-3 p-3 rounded-xl bg-white border border-[#E5E5E5]">
                              {quickEditDoorId === door.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] text-[#666666]">
                                    <span>Quick Edit Starting Price:</span>
                                    <button onClick={() => setQuickEditDoorId(null)} className="text-[#666666] hover:text-white">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[#C89211] font-mono font-bold text-sm">₹</span>
                                    <input
                                      type="number"
                                      value={quickEditDoorPrice}
                                      onChange={e => setQuickEditDoorPrice(Number(e.target.value))}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#F8F8F6] border border-amber-500/50 text-[#C89211] font-mono font-bold text-sm"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5 pt-1">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setQuickEditDoorPrice(prev => Math.max(0, prev - 500))}
                                        className="px-2 py-1 rounded bg-[#F8F8F6] hover:bg-stone-100 text-[10px] font-mono text-[#1A1A1A]"
                                      >
                                        -₹500
                                      </button>
                                      <button
                                        onClick={() => setQuickEditDoorPrice(prev => prev + 500)}
                                        className="px-2 py-1 rounded bg-[#F8F8F6] hover:bg-stone-100 text-[10px] font-mono text-[#1A1A1A]"
                                      >
                                        +₹500
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => handleQuickUpdateDoorPrice(door.id, quickEditDoorPrice)}
                                      className="px-3 py-1 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs"
                                    >
                                      Save ₹
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-[10px] text-[#666666]">Starting Price</div>
                                    <div className="text-lg font-mono font-bold text-[#C89211]">
                                      ₹{door.startingPrice.toLocaleString('en-IN')}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setQuickEditDoorId(door.id);
                                      setQuickEditDoorPrice(door.startingPrice);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#C89211] hover:text-[#C89211] border border-[#E5E5E5] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit ₹</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-[#E5E5E5] flex items-center gap-2">
                            <button
                              onClick={() => setEditingDoor(door)}
                              className="flex-1 py-2 px-3 rounded-xl bg-[#FFF7E3] hover:bg-[#FFF7E3] text-[#C89211] hover:text-amber-200 border border-[#C89211]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Details &amp; Photos</span>
                            </button>

                            <button
                              onClick={() => {
                                handleTabSelect('visualizer');
                              }}
                              className="py-2 px-2.5 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#C89211] border border-[#E5E5E5] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                              title="Configure 3D & AR settings for this design"
                            >
                              <Box className="w-3.5 h-3.5 text-[#C89211]" />
                              <span>3D / AR</span>
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`Delete door "${door.name}"?`)) {
                                  await deleteDoor(door.id);
                                  await loadData();
                                  onDataUpdated();
                                  showToast('Door deleted');
                                }
                              }}
                              className="p-2 rounded-xl bg-[#F8F8F6] hover:bg-red-950/60 text-[#666666] hover:text-red-300 border border-[#E5E5E5]"
                              title="Delete Door"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

                {/* 3. MATERIALS MANAGEMENT (Section 15) */}
                {activeTab === 'materials' && (
                  <div className="space-y-6">
                    {/* Header & Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                            <TreePine className="w-5 h-5 text-[#C89211]" />
                            Wood Materials & Live Rates (₹)
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30">
                            {materials.length} Species
                          </span>
                        </div>
                        <p className="text-xs text-[#666666] mt-1">
                          Edit timber prices and technical details. All updates immediately update the customer door calculator.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setShowBulkRateModal(true)}
                          className="px-3 py-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#C89211] border border-[#C89211]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="Adjust all wood rates at once"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Bulk Adjust ₹</span>
                        </button>

                        <button
                          onClick={() =>
                            setEditingMaterial({
                              name: '',
                              ratePerSqFt: 500,
                              description: '',
                              active: true,
                            })
                          }
                          className="px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Wood Material</span>
                        </button>

                        {/* View Switcher */}
                        <div className="flex rounded-xl bg-[#F8F8F6] p-0.5 border border-[#E5E5E5]">
                          <button
                            onClick={() => setMaterialsViewMode('cards')}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              materialsViewMode === 'cards'
                                ? 'bg-[#C89211] text-white font-bold'
                                : 'text-[#666666] hover:text-[#1A1A1A]'
                            }`}
                            title="Card View (Mobile Optimized)"
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setMaterialsViewMode('table')}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              materialsViewMode === 'table'
                                ? 'bg-[#C89211] text-white font-bold'
                                : 'text-[#666666] hover:text-[#1A1A1A]'
                            }`}
                            title="Table View (Spreadsheet)"
                          >
                            <TableIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                      <input
                        type="text"
                        value={materialSearch}
                        onChange={e => setMaterialSearch(e.target.value)}
                        placeholder="Search wood material by name or specifications (e.g. Sagwan, Sal, Teak)..."
                        className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] placeholder-stone-500 focus:outline-none focus:border-[#C89211]"
                      />
                      {materialSearch && (
                        <button
                          onClick={() => setMaterialSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#1A1A1A] text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Bulk Rate Adjustment Modal */}
                    {showBulkRateModal && (
                      <div className="fixed inset-0 z-[60] bg-[#F8F8F6] backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white border border-[#E5E5E5] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
                          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-[#C89211]" />
                              <h4 className="font-bold text-white text-base">Bulk Price Adjustment</h4>
                            </div>
                            <button
                              onClick={() => setShowBulkRateModal(false)}
                              className="text-[#666666] hover:text-white"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <p className="text-xs text-[#1A1A1A]">
                            Apply a market price change across all wood species simultaneously. This will immediately update customer price calculations.
                          </p>

                          {/* Mode selector */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                              onClick={() => setBulkAdjustmentMode('fixed')}
                              className={`py-2 px-3 rounded-xl border font-bold transition-colors ${
                                bulkAdjustmentMode === 'fixed'
                                  ? 'bg-[#FFF7E3] border-amber-500 text-[#C89211]'
                                  : 'bg-[#F8F8F6] border-[#E5E5E5] text-[#1A1A1A]'
                              }`}
                            >
                              Fixed Amount (₹/sq.ft.)
                            </button>
                            <button
                              onClick={() => setBulkAdjustmentMode('percent')}
                              className={`py-2 px-3 rounded-xl border font-bold transition-colors ${
                                bulkAdjustmentMode === 'percent'
                                  ? 'bg-[#FFF7E3] border-amber-500 text-[#C89211]'
                                  : 'bg-[#F8F8F6] border-[#E5E5E5] text-[#1A1A1A]'
                              }`}
                            >
                              Percentage (%)
                            </button>
                          </div>

                          {/* Value input & presets */}
                          {bulkAdjustmentMode === 'fixed' ? (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-[#1A1A1A]">
                                Adjustment Amount (₹ per sq.ft.)
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-[#666666] font-mono text-sm">₹</span>
                                <input
                                  type="number"
                                  value={bulkAdjustmentAmount}
                                  onChange={e => setBulkAdjustmentAmount(Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-white font-mono font-bold text-sm"
                                />
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {[-50, -25, 25, 50, 100].map(val => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setBulkAdjustmentAmount(val)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${
                                      bulkAdjustmentAmount === val
                                        ? 'bg-[#C89211] text-white'
                                        : 'bg-[#F8F8F6] text-[#1A1A1A] hover:bg-stone-100'
                                    }`}
                                  >
                                    {val > 0 ? `+₹${val}` : `-₹${Math.abs(val)}`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-[#1A1A1A]">
                                Adjustment Percentage (%)
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={bulkAdjustmentPercent}
                                  onChange={e => setBulkAdjustmentPercent(Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-white font-mono font-bold text-sm"
                                />
                                <span className="text-[#666666] font-mono text-sm">%</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {[-10, -5, 5, 10, 15].map(pct => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => setBulkAdjustmentPercent(pct)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${
                                      bulkAdjustmentPercent === pct
                                        ? 'bg-[#C89211] text-white'
                                        : 'bg-[#F8F8F6] text-[#1A1A1A] hover:bg-stone-100'
                                    }`}
                                  >
                                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Preview changes */}
                          <div className="p-3 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-1.5 max-h-36 overflow-y-auto text-xs">
                            <span className="text-[11px] font-bold text-[#666666] block uppercase tracking-wider">
                              Preview Changes:
                            </span>
                            {materials.map(m => {
                              const previewRate =
                                bulkAdjustmentMode === 'fixed'
                                  ? Math.max(50, m.ratePerSqFt + bulkAdjustmentAmount)
                                  : Math.max(50, Math.round(m.ratePerSqFt * (1 + bulkAdjustmentPercent / 100)));
                              return (
                                <div key={m.id} className="flex justify-between items-center text-[#1A1A1A]">
                                  <span>{m.name}</span>
                                  <span className="font-mono">
                                    ₹{m.ratePerSqFt} → <strong className="text-[#C89211]">₹{previewRate}</strong>
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                            <button
                              onClick={() => setShowBulkRateModal(false)}
                              className="px-4 py-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleApplyBulkRateAdjustment}
                              className="px-4 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white text-xs font-bold shadow-md"
                            >
                              Apply to All Materials
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dedicated Edit Wood Rate & Details Form Card */}
                    {editingMaterial && (
                      <div className="p-5 rounded-2xl bg-[#F7F7F7] border-2 border-amber-500/50 space-y-4 text-xs shadow-xl animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center pb-3 border-b border-[#E5E5E5]">
                          <div className="flex items-center gap-2">
                            <Edit2 className="w-4 h-4 text-[#C89211]" />
                            <h4 className="font-bold text-sm text-white">
                              {editingMaterial.id ? `Edit ${editingMaterial.name || 'Wood Material'} Rate & Details` : 'Add New Wood Material'}
                            </h4>
                          </div>
                          <button
                            onClick={() => setEditingMaterial(null)}
                            className="p-1 rounded-lg hover:bg-stone-100 text-[#666666] hover:text-white"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Wood Species Name */}
                          <div>
                            <label className="block text-[#1A1A1A] font-semibold mb-1.5">
                              Wood Species Name <span className="text-[#C89211]">*</span>
                            </label>
                            <input
                              type="text"
                              value={editingMaterial.name || ''}
                              onChange={e => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                              placeholder="e.g. Sagwan (CP Teak), Sal Wood, Pine, Burma Teak"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] font-semibold focus:outline-none focus:border-[#C89211]"
                            />
                            <p className="text-[11px] text-[#666666] mt-1">
                              Appears in the door calculator and customer quotes.
                            </p>
                          </div>

                          {/* Rate Input + Quick Presets */}
                          <div>
                            <label className="block text-[#1A1A1A] font-semibold mb-1.5">
                              Rate per Sq.Ft. (₹) <span className="text-[#C89211]">*</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-[#C89211] font-mono font-bold text-base">₹</span>
                              <input
                                type="number"
                                min={50}
                                value={editingMaterial.ratePerSqFt || 0}
                                onChange={e => setEditingMaterial({ ...editingMaterial, ratePerSqFt: Number(e.target.value) })}
                                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#C89211] font-mono font-bold text-base focus:outline-none focus:border-[#C89211]"
                              />
                            </div>

                            {/* Quick Step Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {[-50, -25, +25, +50].map(step => (
                                <button
                                  key={step}
                                  type="button"
                                  onClick={() =>
                                    setEditingMaterial({
                                      ...editingMaterial,
                                      ratePerSqFt: Math.max(50, (editingMaterial.ratePerSqFt || 500) + step),
                                    })
                                  }
                                  className="px-2 py-0.5 rounded-md bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] border border-[#E5E5E5] text-[11px] font-mono"
                                >
                                  {step > 0 ? `+₹${step}` : `-₹${Math.abs(step)}`}
                                </button>
                              ))}

                              {/* Common Presets */}
                              <span className="text-[10px] text-[#666666] ml-1">Presets:</span>
                              {[
                                { label: 'Plywood (₹350)', rate: 350 },
                                { label: 'Pine (₹450)', rate: 450 },
                                { label: 'Sal (₹650)', rate: 650 },
                                { label: 'Sagwan (₹800)', rate: 800 },
                                { label: 'Teak (₹1,150)', rate: 1150 },
                              ].map(preset => (
                                <button
                                  key={preset.rate}
                                  type="button"
                                  onClick={() =>
                                    setEditingMaterial({
                                      ...editingMaterial,
                                      ratePerSqFt: preset.rate,
                                    })
                                  }
                                  className="px-1.5 py-0.5 rounded bg-white hover:bg-[#FFF7E3] text-[#666666] hover:text-[#C89211] border border-[#E5E5E5] text-[10px]"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Technical Description / Grain Spec */}
                          <div className="md:col-span-2">
                            <label className="block text-[#1A1A1A] font-semibold mb-1.5">
                              Timber Specifications & Details
                            </label>
                            <textarea
                              rows={3}
                              value={editingMaterial.description || ''}
                              onChange={e => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                              placeholder="e.g. 100% Kiln-seasoned Central Province Teak. Moisture content <12%. High oil content protects against termites and warping. Ideal for heavy main entrance doors with deep 3D carving."
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] placeholder-stone-500 focus:outline-none focus:border-[#C89211]"
                            />
                          </div>

                          {/* Live Impact Calculator Box */}
                          <div className="md:col-span-2 p-3 rounded-xl bg-white border border-[#E5E5E5]">
                            <div className="flex items-center gap-1.5 text-[#C89211] font-bold mb-2">
                              <Calculator className="w-4 h-4" />
                              <span>Live Customer Door Cost Preview with this rate:</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                              <div className="p-2 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5]">
                                <div className="text-[10px] text-[#666666]">Standard Single</div>
                                <div className="text-[11px] text-[#666666]">7×3 ft (21 sq.ft.)</div>
                                <div className="text-xs font-mono font-bold text-[#C89211] mt-0.5">
                                  ₹{((editingMaterial.ratePerSqFt || 0) * 21).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5]">
                                <div className="text-[10px] text-[#666666]">Bedroom Door</div>
                                <div className="text-[11px] text-[#666666]">7×3.25 ft (22.75 sq.ft.)</div>
                                <div className="text-xs font-mono font-bold text-[#C89211] mt-0.5">
                                  ₹{Math.round((editingMaterial.ratePerSqFt || 0) * 22.75).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5]">
                                <div className="text-[10px] text-[#666666]">Main Entrance</div>
                                <div className="text-[11px] text-[#666666]">7.5×3.5 ft (26.25 sq.ft.)</div>
                                <div className="text-xs font-mono font-bold text-[#C89211] mt-0.5">
                                  ₹{Math.round((editingMaterial.ratePerSqFt || 0) * 26.25).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5]">
                                <div className="text-[10px] text-[#666666]">Grand Double</div>
                                <div className="text-[11px] text-[#666666]">8×5 ft (40 sq.ft.)</div>
                                <div className="text-xs font-mono font-bold text-[#C89211] mt-0.5">
                                  ₹{((editingMaterial.ratePerSqFt || 0) * 40).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Active / Inactive Status */}
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={editingMaterial.active !== false}
                                onChange={e => setEditingMaterial({ ...editingMaterial, active: e.target.checked })}
                                className="w-4 h-4 rounded text-[#C89211] bg-white border-[#E5E5E5]"
                              />
                              <span className="text-[#1A1A1A] font-medium">
                                Active in Customer Door Calculator
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                          <button
                            onClick={() => setEditingMaterial(null)}
                            className="px-4 py-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-100 text-[#1A1A1A] font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!editingMaterial.name) {
                                alert('Please provide a wood material name');
                                return;
                              }
                              try {
                                if (editingMaterial.id) {
                                  await updateMaterial(editingMaterial.id, editingMaterial);
                                } else {
                                  await createMaterial(editingMaterial);
                                }
                                setEditingMaterial(null);
                                await loadData();
                                onDataUpdated();
                                showToast(`${editingMaterial.name} updated successfully!`);
                              } catch (err: any) {
                                alert(err.message || 'Failed to save material');
                              }
                            }}
                            className="px-5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold shadow-md transition-colors flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            Save Price & Details
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Filtered Materials List */}
                    {(() => {
                      const filteredMaterials = materials.filter(m => {
                        if (!materialSearch) return true;
                        const query = materialSearch.toLowerCase();
                        return (
                          m.name.toLowerCase().includes(query) ||
                          (m.description && m.description.toLowerCase().includes(query))
                        );
                      });

                      if (filteredMaterials.length === 0) {
                        return (
                          <div className="p-8 text-center bg-white rounded-2xl border border-[#E5E5E5] text-[#666666]">
                            <TreePine className="w-8 h-8 mx-auto mb-2 text-stone-600" />
                            <p className="text-sm font-semibold text-[#1A1A1A]">No wood materials found</p>
                            <p className="text-xs text-[#666666] mt-1">Try clearing your search query or add a new wood species.</p>
                          </div>
                        );
                      }

                      {/* CARDS VIEW (DEFAULT - Fully responsive & mobile-optimized) */}
                      if (materialsViewMode === 'cards') {
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMaterials.map(mat => (
                              <div
                                key={mat.id}
                                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                                  mat.active
                                    ? 'bg-[#F7F7F7]/90 border-[#E5E5E5] hover:border-[#C89211]/40 shadow-sm'
                                    : 'bg-white border-[#E5E5E5] opacity-75'
                                }`}
                              >
                                <div>
                                  {/* Card Header */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-xl bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center flex-shrink-0">
                                        <TreePine className="w-4 h-4 text-[#C89211]" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-white text-sm sm:text-base leading-tight">
                                          {mat.name}
                                        </h4>
                                        <span className="text-[10px] text-[#666666]">Timber Rate</span>
                                      </div>
                                    </div>

                                    {/* Status toggle pill */}
                                    <button
                                      onClick={() => handleToggleMaterialStatus(mat)}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                        mat.active
                                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60'
                                          : 'bg-[#F8F8F6] text-[#666666] border-[#E5E5E5] hover:bg-stone-100'
                                      }`}
                                      title="Click to toggle status"
                                    >
                                      {mat.active ? '✓ Active' : 'Disabled'}
                                    </button>
                                  </div>

                                  {/* Price Section */}
                                  <div className="mt-3.5 p-3 rounded-xl bg-white border border-[#E5E5E5]">
                                    {quickEditMaterialId === mat.id ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[11px] text-[#666666]">
                                          <span>Quick Edit Rate:</span>
                                          <button
                                            onClick={() => setQuickEditMaterialId(null)}
                                            className="text-[#666666] hover:text-white"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[#C89211] font-mono font-bold text-sm">₹</span>
                                          <input
                                            type="number"
                                            value={quickEditMaterialRate}
                                            onChange={e => setQuickEditMaterialRate(Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#F8F8F6] border border-amber-500/50 text-[#C89211] font-mono font-bold text-sm"
                                            autoFocus
                                          />
                                        </div>
                                        <div className="flex items-center justify-between gap-1.5 pt-1">
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => setQuickEditMaterialRate(prev => Math.max(50, prev - 50))}
                                              className="px-2 py-1 rounded bg-[#F8F8F6] hover:bg-stone-100 text-[10px] font-mono text-[#1A1A1A]"
                                            >
                                              -₹50
                                            </button>
                                            <button
                                              onClick={() => setQuickEditMaterialRate(prev => prev + 50)}
                                              className="px-2 py-1 rounded bg-[#F8F8F6] hover:bg-stone-100 text-[10px] font-mono text-[#1A1A1A]"
                                            >
                                              +₹50
                                            </button>
                                          </div>
                                          <button
                                            onClick={() => handleQuickUpdateMaterialRate(mat.id, quickEditMaterialRate)}
                                            className="px-3 py-1 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs"
                                          >
                                            Save ₹
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-xl sm:text-2xl font-mono font-black text-[#C89211]">
                                              ₹{mat.ratePerSqFt}
                                            </span>
                                            <span className="text-[11px] text-[#666666] font-medium">/ sq.ft.</span>
                                          </div>
                                          <div className="text-[10px] text-[#666666] mt-0.5">
                                            Standard 7×3 ft Door ≈ <strong className="text-[#1A1A1A] font-mono">₹{(mat.ratePerSqFt * 21).toLocaleString('en-IN')}</strong>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => {
                                            setQuickEditMaterialId(mat.id);
                                            setQuickEditMaterialRate(mat.ratePerSqFt);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#C89211] hover:text-[#C89211] border border-[#E5E5E5] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                          title="Quick change price"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          <span>Edit ₹</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Specifications Details */}
                                  <div className="mt-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] block mb-1">
                                      Specifications & Grain:
                                    </span>
                                    <p className="text-xs text-[#1A1A1A] leading-relaxed bg-white p-2.5 rounded-xl border border-[#E5E5E5] min-h-[3.5rem]">
                                      {mat.description || 'No description provided.'}
                                    </p>
                                  </div>
                                </div>

                                {/* Full Action Buttons (Clean & Prominent on Mobile) */}
                                <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex items-center gap-2">
                                  <button
                                    onClick={() => setEditingMaterial(mat)}
                                    className="flex-1 py-2 px-3 rounded-xl bg-[#FFF7E3] hover:bg-[#FFF7E3] text-[#C89211] hover:text-amber-200 border border-[#C89211]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit Price & Details</span>
                                  </button>

                                  <button
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to delete material "${mat.name}"?`)) {
                                        await deleteMaterial(mat.id);
                                        await loadData();
                                        onDataUpdated();
                                        showToast(`Deleted ${mat.name}`);
                                      }
                                    }}
                                    className="p-2 rounded-xl bg-[#F8F8F6] hover:bg-red-950/50 text-[#666666] hover:text-red-300 border border-[#E5E5E5] hover:border-red-800/60 transition-colors"
                                    title="Delete Material"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      {/* TABLE VIEW (Spreadsheet view with horizontal scroll protection) */}
                      return (
                        <div className="border border-[#E5E5E5] rounded-2xl overflow-hidden bg-white text-xs shadow-lg">
                          <div className="overflow-x-auto w-full">
                            <table className="w-full text-left min-w-[680px]">
                              <thead className="bg-[#F8F8F6] text-[#666666] border-b border-[#E5E5E5]">
                                <tr>
                                  <th className="p-3.5 font-bold">Wood Material</th>
                                  <th className="p-3.5 font-bold">Rate (₹/sq.ft.)</th>
                                  <th className="p-3.5 font-bold">7×3 ft Door Est.</th>
                                  <th className="p-3.5 font-bold">Description & Specs</th>
                                  <th className="p-3.5 font-bold">Status</th>
                                  <th className="p-3.5 font-bold text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E5E5E5]">
                                {filteredMaterials.map(mat => (
                                  <tr key={mat.id} className="hover:bg-[#F8F8F6] transition-colors">
                                    <td className="p-3.5 font-bold text-[#1A1A1A] flex items-center gap-2">
                                      <TreePine className="w-4 h-4 text-[#C89211] flex-shrink-0" />
                                      <span>{mat.name}</span>
                                    </td>
                                    <td className="p-3.5">
                                      {quickEditMaterialId === mat.id ? (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="number"
                                            value={quickEditMaterialRate}
                                            onChange={e => setQuickEditMaterialRate(Number(e.target.value))}
                                            className="w-20 px-2 py-1 rounded bg-[#F8F8F6] border border-amber-500 text-[#C89211] font-mono font-bold text-xs"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleQuickUpdateMaterialRate(mat.id, quickEditMaterialRate)}
                                            className="px-2 py-1 rounded bg-[#C89211] text-white font-bold text-[10px]"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={() => setQuickEditMaterialId(null)}
                                            className="px-1.5 py-1 text-[#666666] hover:text-white text-[10px]"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-[#C89211] text-sm">
                                            ₹{mat.ratePerSqFt}
                                          </span>
                                          <button
                                            onClick={() => {
                                              setQuickEditMaterialId(mat.id);
                                              setQuickEditMaterialRate(mat.ratePerSqFt);
                                            }}
                                            className="text-[10px] text-[#666666] hover:text-[#C89211] underline"
                                          >
                                            edit
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3.5 font-mono text-[#1A1A1A] text-xs">
                                      ₹{(mat.ratePerSqFt * 21).toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-3.5 text-[#1A1A1A] max-w-xs">
                                      <p className="line-clamp-2">{mat.description || '-'}</p>
                                    </td>
                                    <td className="p-3.5">
                                      <button
                                        onClick={() => handleToggleMaterialStatus(mat)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                          mat.active
                                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                            : 'bg-[#F8F8F6] text-[#666666] border-[#E5E5E5]'
                                        }`}
                                      >
                                        {mat.active ? 'Active' : 'Disabled'}
                                      </button>
                                    </td>
                                    <td className="p-3.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => setEditingMaterial(mat)}
                                          className="px-2.5 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#C89211] font-semibold text-xs flex items-center gap-1"
                                          title="Edit Price & Details"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                          <span>Edit</span>
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (confirm(`Delete material ${mat.name}?`)) {
                                              await deleteMaterial(mat.id);
                                              await loadData();
                                              onDataUpdated();
                                              showToast('Material deleted');
                                            }
                                          }}
                                          className="p-1.5 rounded-lg bg-[#F8F8F6] hover:bg-red-950/60 text-[#666666] hover:text-red-300 border border-[#E5E5E5]"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 4. POLISH / FINISHES (Section 15) */}
                {activeTab === 'finishes' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-white">
                          Polish / Finish Rates (₹)
                        </h3>
                        <p className="text-xs text-[#666666]">
                          Manage polish options: Normal Polish (₹110), Teak Polish (₹150), Melamine (₹180), PU (₹250)
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setEditingFinish({
                            name: '',
                            ratePerSqFt: 150,
                            description: '',
                            active: true,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add Finish Option
                      </button>
                    </div>

                    {/* Edit Form */}
                    {editingFinish && (
                      <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3 text-xs">
                        <div className="flex justify-between items-center font-bold text-[#C89211] border-b border-[#E5E5E5] pb-2">
                          <span>{editingFinish.id ? 'Edit Polish Finish' : 'Add Polish Option'}</span>
                          <button onClick={() => setEditingFinish(null)}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[#1A1A1A] mb-1">Finish Name</label>
                            <input
                              type="text"
                              value={editingFinish.name || ''}
                              onChange={e => setEditingFinish({ ...editingFinish, name: e.target.value })}
                              placeholder="e.g. PU Italian Finish, Melamine Matt"
                              className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#1A1A1A] mb-1">Rate (₹)</label>
                            <input
                              type="number"
                              value={editingFinish.ratePerSqFt || 0}
                              onChange={e => setEditingFinish({ ...editingFinish, ratePerSqFt: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[#1A1A1A] mb-1">Description</label>
                            <input
                              type="text"
                              value={editingFinish.description || ''}
                              onChange={e => setEditingFinish({ ...editingFinish, description: e.target.value })}
                              className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                          <button onClick={() => setEditingFinish(null)} className="px-3 py-1.5 rounded bg-stone-100 text-[#1A1A1A]">Cancel</button>
                          <button
                            onClick={async () => {
                              if (!editingFinish.name) return;
                              if (editingFinish.id) {
                                await updateFinish(editingFinish.id, editingFinish);
                              } else {
                                await createFinish(editingFinish);
                              }
                              setEditingFinish(null);
                              loadData();
                              onDataUpdated();
                              showToast('Polish finish saved');
                            }}
                            className="px-4 py-1.5 rounded bg-[#C89211] text-white font-bold"
                          >
                            Save Finish
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Finishes List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {finishes.map(fin => (
                        <div
                          key={fin.id}
                          className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#E5E5E5] flex flex-col justify-between text-xs space-y-3 shadow-sm hover:border-[#C89211]/40 transition-all"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center flex-shrink-0">
                                  <Sparkles className="w-4 h-4 text-[#C89211]" />
                                </div>
                                <div>
                                  <div className="font-bold text-[#1A1A1A] text-sm">{fin.name}</div>
                                  <div className="text-[10px] text-[#666666]">Polish Finish Option</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${fin.active !== false ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-[#F8F8F6] text-[#666666] border-[#E5E5E5]'}`}>
                                {fin.active !== false ? 'Active' : 'Disabled'}
                              </span>
                            </div>

                            {/* Price & Quick Edit */}
                            <div className="mt-3 p-3 rounded-xl bg-white border border-[#E5E5E5]">
                              {quickEditFinishId === fin.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] text-[#666666]">
                                    <span>Quick Edit Finish Rate:</span>
                                    <button onClick={() => setQuickEditFinishId(null)} className="text-[#666666] hover:text-white">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[#C89211] font-mono font-bold text-sm">₹</span>
                                    <input
                                      type="number"
                                      value={quickEditFinishRate}
                                      onChange={e => setQuickEditFinishRate(Number(e.target.value))}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#F8F8F6] border border-amber-500/50 text-[#C89211] font-mono font-bold text-sm"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5 pt-1">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setQuickEditFinishRate(prev => Math.max(0, prev - 25))}
                                        className="px-2 py-1 rounded bg-[#F8F8F6] hover:bg-stone-100 text-[10px] font-mono text-[#1A1A1A]"
                                      >
                                        -₹25
                                      </button>
                                      <button
                                        onClick={() => setQuickEditFinishRate(prev => prev + 25)}
                                        className="px-2 py-1 rounded bg-[#F8F8F6] hover:bg-stone-100 text-[10px] font-mono text-[#1A1A1A]"
                                      >
                                        +₹25
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => handleQuickUpdateFinishRate(fin.id, quickEditFinishRate)}
                                      className="px-3 py-1 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs"
                                    >
                                      Save ₹
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-lg font-mono font-bold text-[#C89211]">
                                        {fin.ratePerSqFt > 0 ? `₹${fin.ratePerSqFt}` : 'Free / Included'}
                                      </span>
                                      {fin.ratePerSqFt > 0 && <span className="text-[11px] text-[#666666]">/ sq.ft.</span>}
                                    </div>
                                    {fin.ratePerSqFt > 0 && (
                                      <div className="text-[10px] text-[#666666] mt-0.5">
                                        Standard 21 sq.ft. door ≈ <strong className="text-[#1A1A1A] font-mono">₹{(fin.ratePerSqFt * 21).toLocaleString('en-IN')}</strong>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => {
                                      setQuickEditFinishId(fin.id);
                                      setQuickEditFinishRate(fin.ratePerSqFt);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#C89211] hover:text-[#C89211] border border-[#E5E5E5] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit ₹</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] block mb-1">
                                Details & Spec:
                              </span>
                              <p className="text-xs text-[#1A1A1A] bg-white p-2.5 rounded-xl border border-[#E5E5E5]">
                                {fin.description || 'No specific finish description.'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-[#E5E5E5] flex items-center gap-2">
                            <button
                              onClick={() => setEditingFinish(fin)}
                              className="flex-1 py-2 px-3 rounded-xl bg-[#FFF7E3] hover:bg-[#FFF7E3] text-[#C89211] hover:text-amber-200 border border-[#C89211]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Price & Details</span>
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`Delete finish ${fin.name}?`)) {
                                  await deleteFinish(fin.id);
                                  await loadData();
                                  onDataUpdated();
                                  showToast('Finish deleted');
                                }
                              }}
                              className="p-2 rounded-xl bg-[#F8F8F6] hover:bg-red-950/60 text-[#666666] hover:text-red-300 border border-[#E5E5E5]"
                              title="Delete Finish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. CHAUKHAT & FRAME MANAGEMENT */}
                {activeTab === 'frames' && (
                  <AdminChaukhatTab
                    legacyFrames={frames}
                    onLegacyFrameSave={async (frm) => {
                      if (frm.id) {
                        await updateFrame(frm.id, frm);
                      } else {
                        await createFrame(frm);
                      }
                      await loadData();
                      onDataUpdated();
                    }}
                    onLegacyFrameDelete={async (id) => {
                      if (!confirm('Are you sure you want to delete this frame?')) return;
                      await deleteFrame(id);
                      await loadData();
                      onDataUpdated();
                    }}
                    showToast={showToast}
                    onDataUpdated={onDataUpdated}
                  />
                )}

                {/* 6. HARDWARE & ALDROPS (Section 15) */}
                {activeTab === 'hardware' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-white">
                          Hardware & Aldrop Rates
                        </h3>
                        <p className="text-xs text-[#666666]">
                          Aldrop Single (₹700), Heavy Aldrop (₹1,300), Antique Heavy (₹1,700), Mortise lock sets
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setEditingHardware({
                            name: '',
                            price: 700,
                            description: '',
                            image: '',
                            defaultQty: 1,
                            active: true,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add Hardware Item
                      </button>
                    </div>

                    {/* Edit Form */}
                    {editingHardware && (
                      <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3 text-xs">
                        <div className="flex justify-between items-center font-bold text-[#C89211] border-b border-[#E5E5E5] pb-2">
                          <div className="flex items-center gap-2">
                            <span>{editingHardware.id ? 'Edit Hardware Item' : 'Add Hardware Item'}</span>
                            {editingHardware.id && (
                              <span className="font-mono text-[10px] text-[#666666] bg-white px-2 py-0.5 rounded border border-[#E5E5E5]">
                                ID: {editingHardware.id}
                              </span>
                            )}
                          </div>
                          <button onClick={() => setEditingHardware(null)}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[#1A1A1A] mb-1">Hardware Product Name <span className="text-[#C89211]">*</span></label>
                            <input
                              type="text"
                              value={editingHardware.name || ''}
                              onChange={e => setEditingHardware({ ...editingHardware, name: e.target.value })}
                              placeholder="e.g. Heavy Aldrop Kit"
                              className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#1A1A1A] mb-1">Unit Price (₹) <span className="text-[#C89211]">*</span></label>
                            <input
                              type="number"
                              value={editingHardware.price || 0}
                              onChange={e => setEditingHardware({ ...editingHardware, price: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[#1A1A1A] mb-1">Product ID / Code</label>
                            <input
                              type="text"
                              value={editingHardware.id || ''}
                              disabled={!!editingHardware.id}
                              onChange={e => setEditingHardware({ ...editingHardware, id: e.target.value })}
                              placeholder="Auto-generated (e.g. hwd-5)"
                              className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#666666] font-mono text-xs disabled:opacity-75"
                            />
                          </div>
                          <div>
                            <label className="block text-[#1A1A1A] mb-1">Default Qty per Door</label>
                            <input
                              type="number"
                              min="0"
                              value={editingHardware.defaultQty ?? 1}
                              onChange={e => setEditingHardware({ ...editingHardware, defaultQty: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[#1A1A1A] mb-1">Description & Material Specs</label>
                            <input
                              type="text"
                              value={editingHardware.description || ''}
                              onChange={e => setEditingHardware({ ...editingHardware, description: e.target.value })}
                              placeholder="e.g. Heavy-gauge forged brass / SS 12-inch security aldrop kit"
                              className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                            />
                          </div>

                          {/* Hardware Image Upload & URL */}
                          <div className="sm:col-span-2 p-3 rounded-lg bg-white border border-[#E5E5E5] space-y-2">
                            <label className="block text-[#1A1A1A] font-semibold mb-1">
                              Hardware Product Image (Thumbnail & Full Preview)
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="cursor-pointer px-3.5 py-1.5 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-1.5 transition-colors">
                                <Upload className="w-3.5 h-3.5" />
                                {uploadingImage ? 'Uploading Image...' : 'Upload Image File'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadingImage}
                                  onChange={e =>
                                    handleFileUploadHelper(e, url => {
                                      setEditingHardware({ ...editingHardware, image: url });
                                    })
                                  }
                                  className="hidden"
                                />
                              </label>

                              <span className="text-[#666666] text-xs">or URL:</span>

                              <input
                                type="text"
                                value={editingHardware.image || ''}
                                onChange={e => setEditingHardware({ ...editingHardware, image: e.target.value })}
                                placeholder="https://images.unsplash.com/..."
                                className="flex-1 min-w-[200px] px-3 py-1.5 rounded bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs font-mono"
                              />

                              {editingHardware.image && (
                                <button
                                  type="button"
                                  onClick={() => setEditingHardware({ ...editingHardware, image: '' })}
                                  className="px-2 py-1 rounded bg-red-950 text-red-300 hover:bg-red-900 border border-red-800 text-xs"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            {editingHardware.image && (
                              <div className="flex items-center gap-3 pt-1">
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-amber-500/50 bg-[#F8F8F6] shrink-0">
                                  <img
                                    src={editingHardware.image}
                                    alt="Hardware preview"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-[11px] text-[#666666]">
                                  This photo will be displayed in the calculator's Hardware &amp; Fittings section with thumbnail and full zoom preview.
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Active Status */}
                          <div className="sm:col-span-2 pt-1">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingHardware.active !== false}
                                onChange={e => setEditingHardware({ ...editingHardware, active: e.target.checked })}
                                className="rounded accent-amber-500"
                              />
                              <span className="text-[#1A1A1A] font-medium">Active (Visible in Calculator)</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                          <button onClick={() => setEditingHardware(null)} className="px-3 py-1.5 rounded bg-stone-100 text-[#1A1A1A]">Cancel</button>
                          <button
                            onClick={async () => {
                              if (!editingHardware.name) return;
                              if (editingHardware.id) {
                                await updateHardware(editingHardware.id, editingHardware);
                              } else {
                                await createHardware(editingHardware);
                              }
                              setEditingHardware(null);
                              loadData();
                              onDataUpdated();
                              showToast('Hardware updated successfully');
                            }}
                            className="px-4 py-1.5 rounded bg-[#C89211] text-white font-bold"
                          >
                            Save Item
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {hardware.map(hwd => (
                        <div
                          key={hwd.id}
                          className="p-4 rounded-2xl bg-[#F7F7F7] border border-[#E5E5E5] flex flex-col justify-between text-xs space-y-3 shadow-sm hover:border-[#C89211]/40 transition-all"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                {hwd.image ? (
                                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-[#E5E5E5] shrink-0">
                                    <img src={hwd.image} alt={hwd.name} className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center shrink-0">
                                    <Lock className="w-5 h-5 text-[#C89211]" />
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-[#1A1A1A] text-sm flex items-center gap-1.5">
                                    <span>{hwd.name}</span>
                                    <span className="font-mono text-[9px] bg-white px-1.5 py-0.5 rounded text-[#666666] border border-[#E5E5E5]">
                                      {hwd.id}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[#666666]">Hardware &amp; Fitting Accessory</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${hwd.active !== false ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-[#F8F8F6] text-[#666666] border-[#E5E5E5]'}`}>
                                {hwd.active !== false ? 'Active' : 'Disabled'}
                              </span>
                            </div>

                            {/* Price & Quick Edit */}
                            <div className="mt-3 p-3 rounded-xl bg-white border border-[#E5E5E5]">
                              {quickEditHardwareId === hwd.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] text-[#666666]">
                                    <span>Quick Edit Hardware Price:</span>
                                    <button onClick={() => setQuickEditHardwareId(null)} className="text-[#666666] hover:text-white">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[#C89211] font-mono font-bold text-sm">₹</span>
                                    <input
                                      type="number"
                                      value={quickEditHardwarePrice}
                                      onChange={e => setQuickEditHardwarePrice(Number(e.target.value))}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#F8F8F6] border border-amber-500/50 text-[#C89211] font-mono font-bold text-sm"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5 pt-1">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setQuickEditHardwarePrice(prev => Math.max(0, prev - 50))}
                                        className="px-2 py-1 rounded bg-[#F8F8F6] hover:bg-stone-100 text-[10px] font-mono text-[#1A1A1A]"
                                      >
                                        -₹50
                                      </button>
                                      <button
                                        onClick={() => setQuickEditHardwarePrice(prev => prev + 50)}
                                        className="px-2 py-1 rounded bg-[#F8F8F6] hover:bg-stone-100 text-[10px] font-mono text-[#1A1A1A]"
                                      >
                                        +₹50
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => handleQuickUpdateHardwarePrice(hwd.id, quickEditHardwarePrice)}
                                      className="px-3 py-1 rounded-lg bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs"
                                    >
                                      Save ₹
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-lg font-mono font-bold text-[#C89211]">
                                        {hwd.price > 0 ? `₹${hwd.price.toLocaleString('en-IN')}` : '₹0'}
                                      </span>
                                      <span className="text-[11px] text-[#666666]">/ unit</span>
                                    </div>
                                    <div className="text-[10px] text-[#666666] mt-0.5">
                                      Default Qty: {hwd.defaultQty || 1}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setQuickEditHardwareId(hwd.id);
                                      setQuickEditHardwarePrice(hwd.price);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#F8F8F6] hover:bg-stone-100 text-[#C89211] hover:text-[#C89211] border border-[#E5E5E5] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit ₹</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] block mb-1">
                                Description & Details:
                              </span>
                              <p className="text-xs text-[#1A1A1A] bg-white p-2.5 rounded-xl border border-[#E5E5E5]">
                                {hwd.description || 'Hardware & lock accessory specification.'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-[#E5E5E5] flex items-center gap-2">
                            <button
                              onClick={() => setEditingHardware(hwd)}
                              className="flex-1 py-2 px-3 rounded-xl bg-[#FFF7E3] hover:bg-[#FFF7E3] text-[#C89211] hover:text-amber-200 border border-[#C89211]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Price & Details</span>
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`Delete hardware ${hwd.name}?`)) {
                                  await deleteHardware(hwd.id);
                                  await loadData();
                                  onDataUpdated();
                                  showToast('Hardware deleted');
                                }
                              }}
                              className="p-2 rounded-xl bg-[#F8F8F6] hover:bg-red-950/60 text-[#666666] hover:text-red-300 border border-[#E5E5E5]"
                              title="Delete Hardware"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7A. MAIN BANNER MANAGEMENT */}
                {(activeTab === 'main-banners' || activeTab === 'banners') && (() => {
                  const mainBannersList = banners
                    .filter(b => b.bannerType === 'main' || b.slot === 'hero' || b.slot === 'main' || (!b.bannerType && (!b.slot || b.slot === 'hero' || b.slot === 'main' || b.id === 'ban-1' || b.id === 'ban-3')))
                    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

                  return (
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                            <span>Main Banner Management</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFF7E3] text-[#C89211] font-sans font-semibold border border-[#C89211]/30">
                              {mainBannersList.length} Main Banners
                            </span>
                          </h3>
                          <p className="text-xs text-[#666666] mt-0.5">
                            Manage wide full-bleed hero banners displayed in the main homepage carousel. Recommended size: 1500 × 500 px (3:1 aspect ratio). Upload complete artwork displayed in its original aspect ratio without cropped text.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBannerUploadError(null);
                            setEditingBanner({
                              bannerType: 'main',
                              slot: 'hero',
                              title: '',
                              image: '',
                              destinationUrl: '',
                              openInNewTab: false,
                              order: mainBannersList.length + 1,
                              active: true,
                            });
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-2 shadow transition active:scale-95 cursor-pointer shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          Add Main Banner
                        </button>
                      </div>

                      {/* Edit / Create Main Banner Modal */}
                      {editingBanner && (editingBanner.bannerType === 'main' || editingBanner.slot === 'hero' || activeTab === 'main-banners' || activeTab === 'banners') && (
                        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-[#E5E5E5] space-y-5 text-xs shadow-2xl">
                          <div className="flex justify-between items-center font-bold text-[#C89211] border-b border-[#E5E5E5] pb-3">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-5 h-5 text-[#C89211]" />
                              <span className="text-base font-serif text-[#1A1A1A]">
                                {editingBanner.id ? 'Edit Main Banner' : 'Upload New Main Banner (1500 × 500 px)'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBanner(null);
                                setBannerUploadError(null);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#F8F8F6] text-[#666666] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {bannerUploadError && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <strong className="font-semibold block text-xs">Image Upload Error</strong>
                                <span className="text-xs">{bannerUploadError}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setBannerUploadError(null)}
                                className="text-rose-400 hover:text-rose-700 font-bold text-xs p-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          <div className="space-y-4">
                            {/* Upload Image */}
                            <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <label className="block text-[#1A1A1A] font-bold text-xs sm:text-sm">
                                    1. Main Banner Image (Device Upload or URL)
                                  </label>
                                  <p className="text-[11px] text-[#666666]">
                                    Upload artwork from phone/PC. Stored in Cloudflare R2 media storage.
                                  </p>
                                </div>
                                {bannerDimensions && (
                                  <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                                    📐 Dimensions: {bannerDimensions.width} × {bannerDimensions.height} px ({bannerDimensions.ratio})
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95">
                                  {uploadingImage ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span>Uploading{uploadProgress !== null ? ` ${uploadProgress}%` : ''}...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4" />
                                      <span>{editingBanner.image ? 'Replace Main Banner Image' : 'Upload Image from Device'}</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif,image/*"
                                    disabled={uploadingImage}
                                    onChange={async e => {
                                      const file = e.target.files?.[0];
                                      if (!file || uploadingImage) return;
                                      setBannerUploadError(null);
                                      if (!file.type.startsWith('image/')) {
                                        const err = 'Invalid file type: Please select an image (JPG, PNG, WebP, SVG, AVIF).';
                                        setBannerUploadError(err);
                                        showToast(err);
                                        e.target.value = '';
                                        return;
                                      }
                                      if (file.size > 15 * 1024 * 1024) {
                                        const err = 'File size exceeds 15 MB limit. Please upload a smaller image.';
                                        setBannerUploadError(err);
                                        showToast(err);
                                        e.target.value = '';
                                        return;
                                      }
                                      setUploadingImage(true);
                                      setUploadProgress(5);
                                      try {
                                        const res = await uploadImage(file, {
                                          maxDimension: 1920,
                                          quality: 0.84,
                                          onProgress: pct => setUploadProgress(pct),
                                        });
                                        setEditingBanner(prev => prev ? { ...prev, image: res.url, bannerType: 'main' } : null);
                                        showToast('Main banner uploaded successfully!');
                                      } catch (err: any) {
                                        const msg = err?.message || 'Upload failed.';
                                        setBannerUploadError(msg);
                                        showToast(msg);
                                      } finally {
                                        setUploadingImage(false);
                                        setUploadProgress(null);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>

                                <div className="flex-1 min-w-[220px] flex items-center gap-2">
                                  <span className="text-[#666666] text-xs font-medium whitespace-nowrap">URL:</span>
                                  <input
                                    type="text"
                                    value={editingBanner.image || ''}
                                    onChange={e => setEditingBanner({ ...editingBanner, image: e.target.value, bannerType: 'main' })}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs font-mono focus:outline-none focus:border-[#C89211]"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 2. TEXT CONTENT & HEADLINES */}
                            <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3">
                              <label className="block text-[#1A1A1A] font-bold text-xs sm:text-sm">
                                2. Banner Text &amp; Headings (Optional)
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                <div>
                                  <label className="block text-[#1A1A1A] mb-1 font-semibold text-xs">Pill Tag / Badge</label>
                                  <input
                                    type="text"
                                    value={editingBanner.badge || ''}
                                    onChange={e => setEditingBanner({ ...editingBanner, badge: e.target.value })}
                                    placeholder="e.g. Direct From Manufacturer"
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:outline-none focus:border-[#C89211]"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-[#1A1A1A] mb-1 font-semibold text-xs">Main Headline / Title</label>
                                  <input
                                    type="text"
                                    value={editingBanner.title || ''}
                                    onChange={e => setEditingBanner({ ...editingBanner, title: e.target.value })}
                                    placeholder="e.g. Direct From Manufacturer: Premium Sagwan Wood Doors"
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:outline-none focus:border-[#C89211]"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[#1A1A1A] mb-1 font-semibold text-xs">Subtitle / Description</label>
                                <textarea
                                  rows={2}
                                  value={editingBanner.subtitle || ''}
                                  onChange={e => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                                  placeholder="e.g. Precision Handcrafted, Seasoned Timber & Transparent Square Feet Pricing"
                                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:outline-none focus:border-[#C89211]"
                                />
                              </div>
                            </div>

                            {/* 3. BUTTON LABEL & DESTINATION LINK */}
                            <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3">
                              <label className="block text-[#1A1A1A] font-bold text-xs sm:text-sm">
                                3. Call to Action Button &amp; Link
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                  <label className="block text-[#1A1A1A] mb-1 font-semibold text-xs">Button Label (CTA)</label>
                                  <input
                                    type="text"
                                    value={editingBanner.buttonText || ''}
                                    onChange={e => setEditingBanner({ ...editingBanner, buttonText: e.target.value })}
                                    placeholder="e.g. Calculate Door Price, Explore Designs"
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:outline-none focus:border-[#C89211]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[#1A1A1A] mb-1 font-semibold text-xs">Destination Route or URL</label>
                                  <input
                                    type="text"
                                    value={editingBanner.destinationUrl || ''}
                                    onChange={e => setEditingBanner({ ...editingBanner, destinationUrl: e.target.value, buttonAction: e.target.value })}
                                    placeholder="e.g. calculator, gallery, whatsapp, https://..."
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono text-xs focus:outline-none focus:border-[#C89211]"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-1">
                                <label className="text-[#1A1A1A] font-semibold flex items-center gap-2 cursor-pointer select-none text-xs">
                                  <input
                                    type="checkbox"
                                    checked={editingBanner.openInNewTab === true}
                                    onChange={e => setEditingBanner({ ...editingBanner, openInNewTab: e.target.checked })}
                                    className="w-4 h-4 rounded text-[#C89211] accent-amber-500"
                                  />
                                  <span>Open destination link in a new browser tab</span>
                                </label>
                              </div>
                            </div>

                            {/* 4. SORT ORDER & ACTIVE */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              <div>
                                <label className="block text-[#1A1A1A] mb-1 font-semibold text-xs">Slide Order</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editingBanner.order ?? 1}
                                  onChange={e => setEditingBanner({ ...editingBanner, order: Number(e.target.value) })}
                                  className="w-full px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:outline-none focus:border-[#C89211]"
                                />
                              </div>
                              <div className="flex items-center sm:pt-5">
                                <label className="text-[#1A1A1A] font-semibold flex items-center gap-2 cursor-pointer select-none text-xs">
                                  <input
                                    type="checkbox"
                                    checked={editingBanner.active !== false}
                                    onChange={e => setEditingBanner({ ...editingBanner, active: e.target.checked })}
                                    className="w-4 h-4 rounded text-[#C89211] accent-amber-500"
                                  />
                                  <span className={editingBanner.active !== false ? 'text-emerald-600 font-bold' : 'text-stone-500'}>
                                    {editingBanner.active !== false ? 'Active in Main Carousel' : 'Disabled (Draft)'}
                                  </span>
                                </label>
                              </div>
                            </div>

                            {/* 5. LIVE HERO PREVIEW */}
                            <div className="pt-2">
                              <label className="block text-[#1A1A1A] font-bold text-xs mb-1">
                                Main Hero Banner Live Preview
                              </label>
                              <div className="relative w-full h-[180px] sm:h-[240px] rounded-xl bg-stone-900 border-2 border-dashed border-[#C89211]/50 flex items-center justify-center overflow-hidden">
                                {editingBanner.image ? (
                                  <>
                                    <img
                                      src={editingBanner.image}
                                      alt="Preview"
                                      className="w-full h-full object-cover object-center block"
                                    />
                                    {/* Overlay Gradient */}
                                    {(editingBanner.title || editingBanner.buttonText) && (
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                                    )}
                                    {/* Text Overlay */}
                                    <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end">
                                      {editingBanner.badge && (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold w-fit mb-1 border border-amber-500/30">
                                          <Sparkles className="w-3 h-3 text-amber-400" />
                                          <span>{editingBanner.badge}</span>
                                        </div>
                                      )}
                                      {editingBanner.title && (
                                        <h3 className="font-serif text-base sm:text-xl font-bold text-white drop-shadow">
                                          {editingBanner.title}
                                        </h3>
                                      )}
                                      {editingBanner.subtitle && (
                                        <p className="text-white/80 text-[11px] sm:text-xs line-clamp-2 mt-0.5 max-w-lg">
                                          {editingBanner.subtitle}
                                        </p>
                                      )}
                                      {editingBanner.buttonText && (
                                        <div className="mt-2">
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C89211] text-white font-bold text-[11px]">
                                            {editingBanner.buttonText}
                                            <ArrowRight className="w-3 h-3" />
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-stone-400 text-xs">No main banner image uploaded yet</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-[#E5E5E5]">
                            <div>
                              {editingBanner.id && (
                                confirmDeleteBannerId === editingBanner.id ? (
                                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-xl px-2.5 py-1.5">
                                    <span className="text-[11px] font-bold text-rose-700">Delete permanently?</span>
                                    <button
                                      type="button"
                                      disabled={deletingBannerId === editingBanner.id}
                                      onClick={() => handleDeleteBanner(editingBanner.id!, editingBanner.title || 'Main Banner')}
                                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                                    >
                                      {deletingBannerId === editingBanner.id ? 'Deleting...' : 'Yes, Delete'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingBannerId === editingBanner.id}
                                      onClick={() => setConfirmDeleteBannerId(null)}
                                      className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold border border-stone-200 transition cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteBannerId(editingBanner.id!)}
                                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                                    title="Delete this main banner permanently"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-600" />
                                    <span>Delete Main Banner</span>
                                  </button>
                                )
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBanner(null);
                                  setBannerUploadError(null);
                                  setConfirmDeleteBannerId(null);
                                }}
                                className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] text-[#1A1A1A] font-semibold transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const image = (editingBanner.image || '').trim();
                                if (!image) {
                                  alert('Please upload or enter a main banner image.');
                                  return;
                                }
                                const payload: Partial<HomeBanner> = {
                                  ...editingBanner,
                                  bannerType: 'main',
                                  slot: 'hero',
                                  title: (editingBanner.title || '').trim() || `Main Banner #${editingBanner.order || mainBannersList.length + 1}`,
                                  subtitle: (editingBanner.subtitle || '').trim(),
                                  badge: (editingBanner.badge || '').trim(),
                                  buttonText: (editingBanner.buttonText || '').trim(),
                                  buttonAction: (editingBanner.destinationUrl || editingBanner.buttonAction || '').trim(),
                                  image,
                                  destinationUrl: (editingBanner.destinationUrl || editingBanner.buttonAction || '').trim(),
                                  openInNewTab: Boolean(editingBanner.openInNewTab),
                                  order: Number(editingBanner.order) || mainBannersList.length + 1,
                                  active: editingBanner.active !== false,
                                };
                                try {
                                  if (editingBanner.id) {
                                    await updateBanner(editingBanner.id, payload);
                                  } else {
                                    await createBanner(payload);
                                  }
                                  setEditingBanner(null);
                                  setBannerUploadError(null);
                                  loadData();
                                  onDataUpdated();
                                  showToast('Main banner saved successfully!');
                                } catch (err: any) {
                                  alert(err.message || 'Failed to save main banner');
                                }
                              }}
                              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              <span>Save Main Banner</span>
                            </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Main Banners List */}
                      <div className="space-y-3">
                        {mainBannersList.map((b, idx, arr) => (
                          <div
                            key={b.id || idx}
                            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs ${
                              b.active !== false ? 'bg-white border-[#E5E5E5] shadow-sm' : 'bg-white border-[#E5E5E5] opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <span className="w-8 h-8 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex items-center justify-center font-mono font-bold text-[#C89211] shrink-0">
                                #{b.order || idx + 1}
                              </span>
                              <div className="w-32 sm:w-44 h-16 sm:h-20 rounded-xl overflow-hidden bg-stone-900 border border-[#E5E5E5] shrink-0 flex items-center justify-center p-1">
                                <img src={b.image} alt={b.title || 'Main Banner'} className="max-w-full max-h-full object-contain block" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-[#1A1A1A] text-sm block truncate">{b.title || `Main Banner #${b.order || idx + 1}`}</span>
                                <div className="text-[11px] text-[#666666] mt-1 flex flex-wrap items-center gap-2">
                                  {b.destinationUrl ? (
                                    <span className="font-mono text-[#C89211] font-semibold bg-[#FFF7E3] px-2 py-0.5 rounded border border-[#C89211]/30">
                                      🔗 {b.destinationUrl}
                                    </span>
                                  ) : (
                                    <span className="text-stone-500 bg-stone-100 px-2 py-0.5 rounded font-medium">Non-Clickable</span>
                                  )}
                                  <span>•</span>
                                  <span className={b.active !== false ? 'text-emerald-600 font-semibold' : 'text-stone-500'}>
                                    {b.active !== false ? 'Active' : 'Disabled'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={async () => {
                                  if (idx === 0) return;
                                  const prev = arr[idx - 1];
                                  await updateBanner(b.id, { order: prev.order || idx });
                                  await updateBanner(prev.id, { order: b.order || idx + 1 });
                                  loadData();
                                  onDataUpdated();
                                }}
                                className="p-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-200 text-[#1A1A1A] disabled:opacity-30 cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === arr.length - 1}
                                onClick={async () => {
                                  if (idx === arr.length - 1) return;
                                  const next = arr[idx + 1];
                                  await updateBanner(b.id, { order: next.order || idx + 2 });
                                  await updateBanner(next.id, { order: b.order || idx + 1 });
                                  loadData();
                                  onDataUpdated();
                                }}
                                className="p-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-200 text-[#1A1A1A] disabled:opacity-30 cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateBanner(b.id, { active: b.active === false ? true : false });
                                  loadData();
                                  onDataUpdated();
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                  b.active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-[#F8F8F6] text-[#666666] border-[#E5E5E5]'
                                }`}
                              >
                                {b.active !== false ? 'Enabled' : 'Disabled'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBanner({ ...b, bannerType: 'main' })}
                                className="p-2 rounded-xl bg-[#F8F8F6] hover:bg-stone-200 text-[#1A1A1A] cursor-pointer"
                                title="Edit Main Banner"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {confirmDeleteBannerId === b.id ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-xl px-2 py-1">
                                  <button
                                    type="button"
                                    disabled={deletingBannerId === b.id}
                                    onClick={() => handleDeleteBanner(b.id, b.title || 'Main Banner')}
                                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                                  >
                                    {deletingBannerId === b.id ? 'Deleting...' : 'Confirm Delete'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingBannerId === b.id}
                                    onClick={() => setConfirmDeleteBannerId(null)}
                                    className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold border border-stone-200 transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteBannerId(b.id)}
                                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                                  title="Delete Main Banner"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 7B. PROMOTION BANNER MANAGEMENT - INDEPENDENT SLOT A & SLOT B */}
                {activeTab === 'promotion-banners' && (() => {
                  const allPromoBanners = banners
                    .filter(b => b.bannerType === 'promotion' || (b.slot && b.slot !== 'hero' && b.slot !== 'main'))
                    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

                  const slotABanners = allPromoBanners.filter(b => b.slot === 'slot_1' || b.slot === 'slot_a');
                  const slotBBanners = allPromoBanners.filter(b => b.slot === 'slot_2' || b.slot === 'slot_b');
                  const otherPromoBanners = allPromoBanners.filter(
                    b => b.slot !== 'slot_1' && b.slot !== 'slot_a' && b.slot !== 'slot_2' && b.slot !== 'slot_b'
                  );

                  // Primary active/first banner for each slot
                  const primaryBannerA = slotABanners[0] || null;
                  const primaryBannerB = slotBBanners[0] || null;

                  return (
                    <div className="space-y-8">
                      {/* Section Header */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] flex items-center gap-2.5">
                              <Sparkles className="w-5 h-5 text-[#C89211]" />
                              <span>Homepage Promotional Banners</span>
                            </h3>
                            <p className="text-xs text-[#666666] mt-1 max-w-3xl leading-relaxed">
                              Manage the <strong>two independent promotional banner slots</strong> on your homepage. Each slot has its own isolated image upload, clickable destination URL, and enable/disable toggle. Changes to one slot never affect the other.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <span className="text-xs px-3 py-1 rounded-full bg-[#FFF7E3] text-[#C89211] font-bold border border-[#C89211]/30">
                              Slot A: {slotABanners.length} slide{slotABanners.length === 1 ? '' : 's'}
                            </span>
                            <span className="text-xs px-3 py-1 rounded-full bg-[#FFF7E3] text-[#C89211] font-bold border border-[#C89211]/30">
                              Slot B: {slotBBanners.length} slide{slotBBanners.length === 1 ? '' : 's'}
                            </span>
                            {otherPromoBanners.length > 0 && (
                              <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-300">
                                Unassigned: {otherPromoBanners.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Edit / Add Modal (for specific slide details) */}
                      {editingBanner && (editingBanner.bannerType === 'promotion' || activeTab === 'promotion-banners') && (
                        <div className="p-4 sm:p-6 rounded-2xl bg-white border-2 border-[#C89211] space-y-5 text-xs shadow-2xl animate-in fade-in duration-200">
                          <div className="flex justify-between items-center font-bold text-[#C89211] border-b border-[#E5E5E5] pb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-[#C89211]" />
                              <span className="text-base font-serif text-[#1A1A1A]">
                                {editingBanner.id ? 'Edit Promotional Slide' : 'Add New Promotional Slide'}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-[#FFF7E3] text-[#C89211] font-bold uppercase">
                                {editingBanner.slot === 'slot_2' || editingBanner.slot === 'slot_b' ? 'Banner Slot B' : 'Banner Slot A'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBanner(null);
                                setBannerUploadError(null);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#F8F8F6] text-[#666666] hover:text-[#1A1A1A] transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {bannerUploadError && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <strong className="font-semibold block text-xs">Upload Error</strong>
                                <span className="text-xs">{bannerUploadError}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setBannerUploadError(null)}
                                className="text-rose-400 hover:text-rose-700 font-bold text-xs p-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          )}

                          <div className="space-y-4">
                            {/* Upload Image */}
                            <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <label className="block text-[#1A1A1A] font-bold text-xs sm:text-sm">
                                    Promotional Banner Image (Phone/PC or URL)
                                  </label>
                                  <p className="text-[11px] text-[#666666]">
                                    Upload complete promotional graphic (recommended ratio: ~3:1, e.g. 1500 × 500 px). Stored permanently in Cloudflare R2 / Server storage.
                                  </p>
                                </div>
                                {bannerDimensions && (
                                  <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                                    📐 {bannerDimensions.width} × {bannerDimensions.height} px ({bannerDimensions.ratio})
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition active:scale-95">
                                  {uploadingImage ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span>Uploading to R2...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4" />
                                      <span>{editingBanner.image ? 'Replace Image' : 'Upload Image from Device'}</span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif,image/*"
                                    disabled={uploadingImage}
                                    onChange={async e => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setBannerUploadError(null);
                                      if (!file.type.startsWith('image/')) {
                                        const err = 'Invalid file type: Please select an image (JPG, PNG, WebP, SVG, AVIF).';
                                        setBannerUploadError(err);
                                        showToast(err);
                                        return;
                                      }
                                      if (file.size > 15 * 1024 * 1024) {
                                        const err = 'File size exceeds 15 MB limit. Please upload a smaller image.';
                                        setBannerUploadError(err);
                                        showToast(err);
                                        return;
                                      }
                                      setUploadingImage(true);
                                      try {
                                        const res = await uploadImage(file);
                                        setEditingBanner(prev => prev ? { ...prev, image: res.url, bannerType: 'promotion' } : null);
                                        showToast('Promotion banner uploaded successfully!');
                                      } catch (err: any) {
                                        const msg = err?.message || 'Upload failed.';
                                        setBannerUploadError(msg);
                                        showToast(msg);
                                      } finally {
                                        setUploadingImage(false);
                                        e.target.value = '';
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>

                                <div className="flex-1 min-w-[220px] flex items-center gap-2">
                                  <span className="text-[#666666] text-xs font-medium whitespace-nowrap">URL:</span>
                                  <input
                                    type="text"
                                    value={editingBanner.image || ''}
                                    onChange={e => setEditingBanner({ ...editingBanner, image: e.target.value, bannerType: 'promotion' })}
                                    placeholder="https://... or /uploads/..."
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs font-mono focus:outline-none focus:border-[#C89211]"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Destination URL */}
                            <div className="p-4 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-3">
                              <label className="block text-[#1A1A1A] font-bold text-xs sm:text-sm">
                                Clickable Destination Link (Optional)
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <input
                                  type="text"
                                  value={editingBanner.destinationUrl || ''}
                                  onChange={e => setEditingBanner({ ...editingBanner, destinationUrl: e.target.value })}
                                  placeholder="e.g. gallery, calculator, whatsapp, or https://..."
                                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono text-xs focus:outline-none focus:border-[#C89211]"
                                />
                                <label className="text-[#1A1A1A] font-semibold flex items-center gap-2 cursor-pointer select-none text-xs">
                                  <input
                                    type="checkbox"
                                    checked={editingBanner.openInNewTab === true}
                                    onChange={e => setEditingBanner({ ...editingBanner, openInNewTab: e.target.checked })}
                                    className="w-4 h-4 rounded text-[#C89211] accent-amber-500"
                                  />
                                  <span>Open link in new browser tab</span>
                                </label>
                              </div>
                            </div>

                            {/* Slot Assignment, Internal Title, Order, Active Toggle */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                              <div>
                                <label className="block text-[#1A1A1A] mb-1 font-semibold text-xs">Slot Assignment</label>
                                <select
                                  value={editingBanner.slot === 'slot_2' || editingBanner.slot === 'slot_b' ? 'slot_2' : 'slot_1'}
                                  onChange={e => setEditingBanner({ ...editingBanner, slot: e.target.value as any })}
                                  className="w-full px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] font-semibold text-xs focus:outline-none focus:border-[#C89211]"
                                >
                                  <option value="slot_1">Banner A (Below Popular Categories)</option>
                                  <option value="slot_2">Banner B (Below Trust Badges)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[#1A1A1A] mb-1 font-semibold text-xs">Slide Label / Title</label>
                                <input
                                  type="text"
                                  value={editingBanner.title || ''}
                                  onChange={e => setEditingBanner({ ...editingBanner, title: e.target.value })}
                                  placeholder="e.g. Teak Door Offer"
                                  className="w-full px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:outline-none focus:border-[#C89211]"
                                />
                              </div>
                              <div>
                                <label className="block text-[#1A1A1A] mb-1 font-semibold text-xs">Sort Order</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editingBanner.order ?? 1}
                                  onChange={e => setEditingBanner({ ...editingBanner, order: Number(e.target.value) })}
                                  className="w-full px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:outline-none focus:border-[#C89211]"
                                />
                              </div>
                              <div className="flex items-center sm:pt-5">
                                <label className="text-[#1A1A1A] font-semibold flex items-center gap-2 cursor-pointer select-none text-xs">
                                  <input
                                    type="checkbox"
                                    checked={editingBanner.active !== false}
                                    onChange={e => setEditingBanner({ ...editingBanner, active: e.target.checked })}
                                    className="w-4 h-4 rounded text-[#C89211] accent-amber-500"
                                  />
                                  <span className={editingBanner.active !== false ? 'text-emerald-600 font-bold' : 'text-stone-500'}>
                                    {editingBanner.active !== false ? 'Active' : 'Disabled'}
                                  </span>
                                </label>
                              </div>
                            </div>

                            {/* Live Preview */}
                            <div className="pt-2">
                              <label className="block text-[#1A1A1A] font-bold text-xs mb-1">
                                Full-Width Card Preview (Matches Uploaded Aspect Ratio)
                              </label>
                              <div
                                className="relative w-full rounded-xl bg-stone-100 border-2 border-dashed border-[#C89211]/50 overflow-hidden flex items-center justify-center max-h-[220px]"
                                style={{
                                  aspectRatio: bannerDimensions && bannerDimensions.width && bannerDimensions.height
                                    ? `${bannerDimensions.width / bannerDimensions.height}`
                                    : '3 / 1',
                                }}
                              >
                                {editingBanner.image ? (
                                  <img
                                    src={editingBanner.image}
                                    alt="Preview"
                                    className="w-full h-full object-cover block"
                                  />
                                ) : (
                                  <span className="text-stone-400 text-xs py-8">No banner image uploaded yet</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Modal Actions */}
                          <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-[#E5E5E5]">
                            <div>
                              {editingBanner.id && (
                                confirmDeleteBannerId === editingBanner.id ? (
                                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-xl px-2.5 py-1.5">
                                    <span className="text-[11px] font-bold text-rose-700">Delete permanently?</span>
                                    <button
                                      type="button"
                                      disabled={deletingBannerId === editingBanner.id}
                                      onClick={() => handleDeleteBanner(editingBanner.id!, editingBanner.title || 'Promotional Banner')}
                                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                                    >
                                      {deletingBannerId === editingBanner.id ? 'Deleting...' : 'Yes, Delete'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={deletingBannerId === editingBanner.id}
                                      onClick={() => setConfirmDeleteBannerId(null)}
                                      className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold border border-stone-200 transition cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteBannerId(editingBanner.id!)}
                                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                                    title="Delete this banner permanently"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-600" />
                                    <span>Delete Banner</span>
                                  </button>
                                )
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBanner(null);
                                  setBannerUploadError(null);
                                }}
                                className="px-4 py-2.5 rounded-xl bg-[#F8F8F6] text-[#1A1A1A] font-semibold transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const image = (editingBanner.image || '').trim();
                                if (!image) {
                                  alert('Please upload or enter a promotion banner image.');
                                  return;
                                }
                                const targetSlot = editingBanner.slot === 'slot_2' || editingBanner.slot === 'slot_b' ? 'slot_2' : 'slot_1';
                                const payload: Partial<HomeBanner> = {
                                  ...editingBanner,
                                  bannerType: 'promotion',
                                  slot: targetSlot,
                                  title: (editingBanner.title || '').trim() || `Promotion Banner (${targetSlot === 'slot_1' ? 'Slot A' : 'Slot B'})`,
                                  image,
                                  destinationUrl: (editingBanner.destinationUrl || '').trim(),
                                  openInNewTab: Boolean(editingBanner.openInNewTab),
                                  order: Number(editingBanner.order) || 1,
                                  active: editingBanner.active !== false,
                                };
                                try {
                                  if (editingBanner.id) {
                                    await updateBanner(editingBanner.id, payload);
                                  } else {
                                    await createBanner(payload);
                                  }
                                  setEditingBanner(null);
                                  setBannerUploadError(null);
                                  loadData();
                                  onDataUpdated();
                                  showToast('Promotional slide saved successfully!');
                                } catch (err: any) {
                                  alert(err.message || 'Failed to save promotional slide');
                                }
                              }}
                              className="px-6 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
                            >
                              <Check className="w-4 h-4" />
                              <span>Save Promotional Slide</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                      {/* ========================================================================= */}
                      {/* SLOT A: UPPER PROMOTIONAL BANNER (BELOW POPULAR CATEGORIES) */}
                      {/* ========================================================================= */}
                      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E5E5] gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-[#FFF7E3] text-[#C89211] font-bold flex items-center justify-center text-xs border border-[#C89211]/30">
                                A
                              </span>
                              <h4 className="font-serif text-lg font-bold text-[#1A1A1A]">
                                Promotional Banner A (Upper Slot)
                              </h4>
                              {primaryBannerA?.active !== false ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                                  ● Active on Homepage
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-bold border border-stone-200">
                                  ○ Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#666666] mt-1">
                              <strong>Position:</strong> Below <em>“Popular Door Categories”</em> and above <em>“Why Indian Homeowners Trust Our Doors”</em>.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setBannerUploadError(null);
                                setEditingBanner({
                                  bannerType: 'promotion',
                                  slot: 'slot_1',
                                  title: `Slot A Slide #${slotABanners.length + 1}`,
                                  image: '',
                                  destinationUrl: 'gallery',
                                  openInNewTab: false,
                                  order: slotABanners.length + 1,
                                  active: true,
                                });
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#F8F8F6] hover:bg-[#EFEFEF] text-[#1A1A1A] font-semibold text-xs flex items-center gap-1.5 border border-[#E5E5E5] transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#C89211]" />
                              <span>+ Add Slide to Banner A</span>
                            </button>
                          </div>
                        </div>

                        {/* Banner A Direct Control Card */}
                        {primaryBannerA ? (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            {/* Visual Preview */}
                            <div className="lg:col-span-5 space-y-2">
                              <div className="relative w-full rounded-xl overflow-hidden bg-stone-100 border border-[#E5E5E5] shadow-xs group aspect-[3/1] max-h-[160px] flex items-center justify-center">
                                <img
                                  src={primaryBannerA.image}
                                  alt={primaryBannerA.title || 'Banner A'}
                                  className="w-full h-full object-cover block"
                                />
                                {primaryBannerA.destinationUrl && (
                                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono">
                                    🔗 {primaryBannerA.destinationUrl}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#666666] flex items-center justify-between px-1">
                                <span className="truncate max-w-[220px]" title={primaryBannerA.image}>
                                  Source: {primaryBannerA.image}
                                </span>
                                <span className="font-semibold text-[#C89211]">
                                  {slotABanners.length} slide{slotABanners.length === 1 ? '' : 's'} in Slot A
                                </span>
                              </div>
                            </div>

                            {/* Slot A Direct Controls Form */}
                            <div className="lg:col-span-7 space-y-3.5 text-xs">
                              {/* Direct Upload / Replace */}
                              <div>
                                <label className="block text-[#1A1A1A] font-bold mb-1">
                                  1. Upload / Replace Banner A Image
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95">
                                    {uploadingImage ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Uploading{uploadProgress !== null ? ` ${uploadProgress}%` : ''}...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Upload New Image</span>
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={uploadingImage}
                                      onChange={async e => {
                                        const file = e.target.files?.[0];
                                        if (!file || uploadingImage) return;
                                        setUploadingImage(true);
                                        setUploadProgress(5);
                                        try {
                                          const res = await uploadImage(file, {
                                            maxDimension: 1800,
                                            quality: 0.83,
                                            onProgress: pct => setUploadProgress(pct),
                                          });
                                          await updateSlotBanner('slot_1', { image: res.url });
                                          loadData();
                                          onDataUpdated();
                                          showToast('Banner A image updated successfully!');
                                        } catch (err: any) {
                                          showToast(err?.message || 'Upload failed');
                                        } finally {
                                          setUploadingImage(false);
                                          setUploadProgress(null);
                                          e.target.value = '';
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    value={primaryBannerA.image}
                                    onChange={async e => {
                                      const newImg = e.target.value;
                                      await updateSlotBanner('slot_1', { image: newImg });
                                      loadData();
                                      onDataUpdated();
                                    }}
                                    placeholder="Image URL..."
                                    className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] font-mono text-[11px] focus:outline-none focus:border-[#C89211]"
                                  />
                                </div>
                              </div>

                              {/* Destination Link */}
                              <div>
                                <label className="block text-[#1A1A1A] font-bold mb-1">
                                  2. Destination Link & Target
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    value={primaryBannerA.destinationUrl || ''}
                                    onChange={async e => {
                                      const url = e.target.value;
                                      await updateSlotBanner('slot_1', { destinationUrl: url });
                                      loadData();
                                      onDataUpdated();
                                    }}
                                    placeholder="e.g. gallery, calculator, https://..."
                                    className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] font-mono text-xs focus:outline-none focus:border-[#C89211]"
                                  />
                                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold select-none">
                                    <input
                                      type="checkbox"
                                      checked={primaryBannerA.openInNewTab === true}
                                      onChange={async e => {
                                        await updateSlotBanner('slot_1', { openInNewTab: e.target.checked });
                                        loadData();
                                        onDataUpdated();
                                      }}
                                      className="w-4 h-4 rounded text-[#C89211] accent-amber-500"
                                    />
                                    <span>Open in New Tab</span>
                                  </label>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-[#666666]">
                                  <span>Quick Links:</span>
                                  {['gallery', 'calculator', 'whatsapp', 'chaukhat-calculator'].map(link => (
                                    <button
                                      key={link}
                                      type="button"
                                      onClick={async () => {
                                        await updateSlotBanner('slot_1', { destinationUrl: link });
                                        loadData();
                                        onDataUpdated();
                                        showToast(`Banner A destination set to "${link}"`);
                                      }}
                                      className="px-2 py-0.5 rounded bg-stone-100 hover:bg-[#FFF7E3] hover:text-[#C89211] transition-colors cursor-pointer"
                                    >
                                      {link}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Active Status & Edit Slide */}
                              <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={primaryBannerA.active !== false}
                                    onChange={async e => {
                                      await updateSlotBanner('slot_1', { active: e.target.checked });
                                      loadData();
                                      onDataUpdated();
                                      showToast(e.target.checked ? 'Banner A Enabled' : 'Banner A Disabled');
                                    }}
                                    className="w-4 h-4 rounded text-[#C89211] accent-amber-500"
                                  />
                                  <span className={primaryBannerA.active !== false ? 'text-emerald-600 font-bold' : 'text-stone-500 font-medium'}>
                                    {primaryBannerA.active !== false ? 'Slot A is Visible on Homepage' : 'Slot A is Hidden (Disabled)'}
                                  </span>
                                </label>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingBanner(primaryBannerA)}
                                    className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-200 text-[#1A1A1A] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit Slide Details</span>
                                  </button>
                                  {confirmDeleteBannerId === primaryBannerA.id ? (
                                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-lg px-2 py-1">
                                      <span className="text-[11px] font-bold text-rose-700">Delete Banner A?</span>
                                      <button
                                        type="button"
                                        disabled={deletingBannerId === primaryBannerA.id}
                                        onClick={() => handleDeleteBanner(primaryBannerA.id, primaryBannerA.title || 'Banner A')}
                                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                                      >
                                        {deletingBannerId === primaryBannerA.id ? 'Deleting...' : 'Confirm'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={deletingBannerId === primaryBannerA.id}
                                        onClick={() => setConfirmDeleteBannerId(null)}
                                        className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold border border-stone-200 transition cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteBannerId(primaryBannerA.id)}
                                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Delete Banner A"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Delete Banner</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 rounded-xl bg-[#F8F8F6] border-2 border-dashed border-[#E5E5E5] text-center space-y-3">
                            <ImageIcon className="w-8 h-8 text-stone-400 mx-auto" />
                            <p className="text-xs text-stone-500">No banner currently assigned to Slot A.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBanner({
                                  bannerType: 'promotion',
                                  slot: 'slot_1',
                                  title: 'Promotion Banner A',
                                  image: '',
                                  destinationUrl: 'gallery',
                                  openInNewTab: false,
                                  order: 1,
                                  active: true,
                                });
                              }}
                              className="px-4 py-2 rounded-xl bg-[#C89211] text-white font-bold text-xs"
                            >
                              Assign Banner to Slot A
                            </button>
                          </div>
                        )}

                        {/* Slides in Slot A */}
                        {slotABanners.length > 0 && (
                          <div className="pt-3 border-t border-[#E5E5E5] space-y-2">
                            <span className="text-xs font-bold text-[#1A1A1A] block">
                              All Slides in Slot A ({slotABanners.length}) — {slotABanners.length > 1 ? 'auto-rotates every 4.5s' : 'active promotional banner'}
                            </span>
                            <div className="space-y-1.5">
                              {slotABanners.map((b, idx) => (
                                <div key={b.id || idx} className="p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex items-center justify-between gap-3 text-xs">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="font-mono font-bold text-[#C89211]">#{idx + 1}</span>
                                    <img src={b.image} alt="" className="w-16 h-8 object-cover rounded border border-[#E5E5E5]" />
                                    <span className="font-semibold text-[#1A1A1A] truncate">{b.title || `Slide #${idx + 1}`}</span>
                                    <span className="text-[11px] text-[#666666] hidden sm:inline">🔗 {b.destinationUrl || 'None'}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setEditingBanner(b)}
                                      className="p-1.5 rounded-lg hover:bg-stone-200 text-[#1A1A1A] cursor-pointer"
                                      title="Edit Slide"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    {confirmDeleteBannerId === b.id ? (
                                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-lg px-2 py-0.5">
                                        <button
                                          type="button"
                                          disabled={deletingBannerId === b.id}
                                          onClick={() => handleDeleteBanner(b.id, b.title || `Slide #${idx + 1}`)}
                                          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
                                        >
                                          {deletingBannerId === b.id ? 'Deleting...' : 'Confirm'}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={deletingBannerId === b.id}
                                          onClick={() => setConfirmDeleteBannerId(null)}
                                          className="px-1.5 py-0.5 rounded bg-white hover:bg-stone-100 text-stone-600 text-[10px] font-semibold border border-stone-200 transition cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteBannerId(b.id)}
                                        className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer"
                                        title="Delete Slide"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ========================================================================= */}
                      {/* SLOT B: LOWER PROMOTIONAL BANNER (BELOW TRUST BADGES) */}
                      {/* ========================================================================= */}
                      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E5E5] shadow-sm space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E5E5] gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-[#FFF7E3] text-[#C89211] font-bold flex items-center justify-center text-xs border border-[#C89211]/30">
                                B
                              </span>
                              <h4 className="font-serif text-lg font-bold text-[#1A1A1A]">
                                Promotional Banner B (Lower Slot)
                              </h4>
                              {primaryBannerB?.active !== false ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                                  ● Active on Homepage
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-bold border border-stone-200">
                                  ○ Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#666666] mt-1">
                              <strong>Position:</strong> Below <em>“Why Indian Homeowners Trust Our Doors”</em> and above <em>“Our Story & Heritage”</em>.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setBannerUploadError(null);
                                setEditingBanner({
                                  bannerType: 'promotion',
                                  slot: 'slot_2',
                                  title: `Slot B Slide #${slotBBanners.length + 1}`,
                                  image: '',
                                  destinationUrl: 'calculator',
                                  openInNewTab: false,
                                  order: slotBBanners.length + 1,
                                  active: true,
                                });
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#F8F8F6] hover:bg-[#EFEFEF] text-[#1A1A1A] font-semibold text-xs flex items-center gap-1.5 border border-[#E5E5E5] transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#C89211]" />
                              <span>+ Add Slide to Banner B</span>
                            </button>
                          </div>
                        </div>

                        {/* Banner B Direct Control Card */}
                        {primaryBannerB ? (
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            {/* Visual Preview */}
                            <div className="lg:col-span-5 space-y-2">
                              <div className="relative w-full rounded-xl overflow-hidden bg-stone-100 border border-[#E5E5E5] shadow-xs group aspect-[3/1] max-h-[160px] flex items-center justify-center">
                                <img
                                  src={primaryBannerB.image}
                                  alt={primaryBannerB.title || 'Banner B'}
                                  className="w-full h-full object-cover block"
                                />
                                {primaryBannerB.destinationUrl && (
                                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono">
                                    🔗 {primaryBannerB.destinationUrl}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#666666] flex items-center justify-between px-1">
                                <span className="truncate max-w-[220px]" title={primaryBannerB.image}>
                                  Source: {primaryBannerB.image}
                                </span>
                                <span className="font-semibold text-[#C89211]">
                                  {slotBBanners.length} slide{slotBBanners.length === 1 ? '' : 's'} in Slot B
                                </span>
                              </div>
                            </div>

                            {/* Slot B Direct Controls Form */}
                            <div className="lg:col-span-7 space-y-3.5 text-xs">
                              {/* Direct Upload / Replace */}
                              <div>
                                <label className="block text-[#1A1A1A] font-bold mb-1">
                                  1. Upload / Replace Banner B Image
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95">
                                    {uploadingImage ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Uploading{uploadProgress !== null ? ` ${uploadProgress}%` : ''}...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Upload New Image</span>
                                      </>
                                    )}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={uploadingImage}
                                      onChange={async e => {
                                        const file = e.target.files?.[0];
                                        if (!file || uploadingImage) return;
                                        setUploadingImage(true);
                                        setUploadProgress(5);
                                        try {
                                          const res = await uploadImage(file, {
                                            maxDimension: 1800,
                                            quality: 0.83,
                                            onProgress: pct => setUploadProgress(pct),
                                          });
                                          await updateSlotBanner('slot_2', { image: res.url });
                                          loadData();
                                          onDataUpdated();
                                          showToast('Banner B image updated successfully!');
                                        } catch (err: any) {
                                          showToast(err?.message || 'Upload failed');
                                        } finally {
                                          setUploadingImage(false);
                                          setUploadProgress(null);
                                          e.target.value = '';
                                        }
                                      }}
                                      className="hidden"
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    value={primaryBannerB.image}
                                    onChange={async e => {
                                      const newImg = e.target.value;
                                      await updateSlotBanner('slot_2', { image: newImg });
                                      loadData();
                                      onDataUpdated();
                                    }}
                                    placeholder="Image URL..."
                                    className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] font-mono text-[11px] focus:outline-none focus:border-[#C89211]"
                                  />
                                </div>
                              </div>

                              {/* Destination Link */}
                              <div>
                                <label className="block text-[#1A1A1A] font-bold mb-1">
                                  2. Destination Link & Target
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    value={primaryBannerB.destinationUrl || ''}
                                    onChange={async e => {
                                      const url = e.target.value;
                                      await updateSlotBanner('slot_2', { destinationUrl: url });
                                      loadData();
                                      onDataUpdated();
                                    }}
                                    placeholder="e.g. calculator, whatsapp, https://..."
                                    className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] font-mono text-xs focus:outline-none focus:border-[#C89211]"
                                  />
                                  <label className="flex items-center gap-1.5 cursor-pointer font-semibold select-none">
                                    <input
                                      type="checkbox"
                                      checked={primaryBannerB.openInNewTab === true}
                                      onChange={async e => {
                                        await updateSlotBanner('slot_2', { openInNewTab: e.target.checked });
                                        loadData();
                                        onDataUpdated();
                                      }}
                                      className="w-4 h-4 rounded text-[#C89211] accent-amber-500"
                                    />
                                    <span>Open in New Tab</span>
                                  </label>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-[#666666]">
                                  <span>Quick Links:</span>
                                  {['calculator', 'whatsapp', 'gallery', 'contact'].map(link => (
                                    <button
                                      key={link}
                                      type="button"
                                      onClick={async () => {
                                        await updateSlotBanner('slot_2', { destinationUrl: link });
                                        loadData();
                                        onDataUpdated();
                                        showToast(`Banner B destination set to "${link}"`);
                                      }}
                                      className="px-2 py-0.5 rounded bg-stone-100 hover:bg-[#FFF7E3] hover:text-[#C89211] transition-colors cursor-pointer"
                                    >
                                      {link}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Active Status & Edit Slide */}
                              <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={primaryBannerB.active !== false}
                                    onChange={async e => {
                                      await updateSlotBanner('slot_2', { active: e.target.checked });
                                      loadData();
                                      onDataUpdated();
                                      showToast(e.target.checked ? 'Banner B Enabled' : 'Banner B Disabled');
                                    }}
                                    className="w-4 h-4 rounded text-[#C89211] accent-amber-500"
                                  />
                                  <span className={primaryBannerB.active !== false ? 'text-emerald-600 font-bold' : 'text-stone-500 font-medium'}>
                                    {primaryBannerB.active !== false ? 'Slot B is Visible on Homepage' : 'Slot B is Hidden (Disabled)'}
                                  </span>
                                </label>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingBanner(primaryBannerB)}
                                    className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-200 text-[#1A1A1A] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit Slide Details</span>
                                  </button>
                                  {confirmDeleteBannerId === primaryBannerB.id ? (
                                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-lg px-2 py-1">
                                      <span className="text-[11px] font-bold text-rose-700">Delete Banner B?</span>
                                      <button
                                        type="button"
                                        disabled={deletingBannerId === primaryBannerB.id}
                                        onClick={() => handleDeleteBanner(primaryBannerB.id, primaryBannerB.title || 'Banner B')}
                                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                                      >
                                        {deletingBannerId === primaryBannerB.id ? 'Deleting...' : 'Confirm'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={deletingBannerId === primaryBannerB.id}
                                        onClick={() => setConfirmDeleteBannerId(null)}
                                        className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold border border-stone-200 transition cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteBannerId(primaryBannerB.id)}
                                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Delete Banner B"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Delete Banner</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 rounded-xl bg-[#F8F8F6] border-2 border-dashed border-[#E5E5E5] text-center space-y-3">
                            <ImageIcon className="w-8 h-8 text-stone-400 mx-auto" />
                            <p className="text-xs text-stone-500">No banner currently assigned to Slot B.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBanner({
                                  bannerType: 'promotion',
                                  slot: 'slot_2',
                                  title: 'Promotion Banner B',
                                  image: '',
                                  destinationUrl: 'calculator',
                                  openInNewTab: false,
                                  order: 1,
                                  active: true,
                                });
                              }}
                              className="px-4 py-2 rounded-xl bg-[#C89211] text-white font-bold text-xs"
                            >
                              Assign Banner to Slot B
                            </button>
                          </div>
                        )}

                        {/* Slides in Slot B */}
                        {slotBBanners.length > 0 && (
                          <div className="pt-3 border-t border-[#E5E5E5] space-y-2">
                            <span className="text-xs font-bold text-[#1A1A1A] block">
                              All Slides in Slot B ({slotBBanners.length}) — {slotBBanners.length > 1 ? 'auto-rotates every 4.5s' : 'active promotional banner'}
                            </span>
                            <div className="space-y-1.5">
                              {slotBBanners.map((b, idx) => (
                                <div key={b.id || idx} className="p-2.5 rounded-xl bg-[#F8F8F6] border border-[#E5E5E5] flex items-center justify-between gap-3 text-xs">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="font-mono font-bold text-[#C89211]">#{idx + 1}</span>
                                    <img src={b.image} alt="" className="w-16 h-8 object-cover rounded border border-[#E5E5E5]" />
                                    <span className="font-semibold text-[#1A1A1A] truncate">{b.title || `Slide #${idx + 1}`}</span>
                                    <span className="text-[11px] text-[#666666] hidden sm:inline">🔗 {b.destinationUrl || 'None'}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setEditingBanner(b)}
                                      className="p-1.5 rounded-lg hover:bg-stone-200 text-[#1A1A1A] cursor-pointer"
                                      title="Edit Slide"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    {confirmDeleteBannerId === b.id ? (
                                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 rounded-lg px-2 py-0.5">
                                        <button
                                          type="button"
                                          disabled={deletingBannerId === b.id}
                                          onClick={() => handleDeleteBanner(b.id, b.title || `Slide #${idx + 1}`)}
                                          className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
                                        >
                                          {deletingBannerId === b.id ? 'Deleting...' : 'Confirm'}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={deletingBannerId === b.id}
                                          onClick={() => setConfirmDeleteBannerId(null)}
                                          className="px-1.5 py-0.5 rounded bg-white hover:bg-stone-100 text-stone-600 text-[10px] font-semibold border border-stone-200 transition cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteBannerId(b.id)}
                                        className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer"
                                        title="Delete Slide"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ========================================================================= */}
                      {/* OTHER / UNASSIGNED PROMOTIONAL BANNERS */}
                      {/* ========================================================================= */}
                      {otherPromoBanners.length > 0 && (
                        <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-sm space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-200 gap-2">
                            <div>
                              <h4 className="font-serif text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#C89211]" />
                                <span>Unassigned &amp; Legacy Promotional Banners ({otherPromoBanners.length})</span>
                              </h4>
                              <p className="text-xs text-[#666666] mt-0.5">
                                These promotional banners are currently not assigned to Slot A or Slot B. You can assign them or delete them below.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {otherPromoBanners.map((b, idx) => (
                              <div key={b.id || idx} className="p-3 rounded-xl bg-white border border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                                <div className="flex items-center gap-3 min-w-0">
                                  <img src={b.image} alt="" className="w-20 h-10 object-cover rounded border border-[#E5E5E5] shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-[#1A1A1A] truncate">{b.title || 'Untitled Banner'}</span>
                                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] font-mono">
                                        Slot: {b.slot || 'None'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-[#666666] truncate mt-0.5">
                                      ID: <span className="font-mono text-stone-500">{b.id}</span> • Link: <span className="font-mono">{b.destinationUrl || 'None'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setEditingBanner({ ...b, bannerType: 'promotion' })}
                                    className="px-3 py-1.5 rounded-lg bg-[#F8F8F6] hover:bg-stone-200 text-[#1A1A1A] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit / Assign</span>
                                  </button>
                                  {confirmDeleteBannerId === b.id ? (
                                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-lg px-2 py-1">
                                      <button
                                        type="button"
                                        disabled={deletingBannerId === b.id}
                                        onClick={() => handleDeleteBanner(b.id, b.title || 'Promotional Banner')}
                                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                                      >
                                        {deletingBannerId === b.id ? 'Deleting...' : 'Confirm Delete'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={deletingBannerId === b.id}
                                        onClick={() => setConfirmDeleteBannerId(null)}
                                        className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 text-stone-600 text-[11px] font-semibold border border-stone-200 transition cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteBannerId(b.id)}
                                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Delete Banner"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 8. ARTICLES / BLOG (Section 17) */}
                {activeTab === 'articles' && (
                  <AdminArticlesTab
                    doors={doors}
                    settings={settings || undefined}
                    onDataUpdated={() => {
                      loadData();
                      onDataUpdated();
                    }}
                  />
                )}

                {/* 9. CUSTOMER QUOTES LOG */}
                {activeTab === 'quotes' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-white">
                          Customer Quotations & Leads
                        </h3>
                        <p className="text-xs text-[#666666]">
                          Review all estimates generated by customers with full breakdown and contact details
                        </p>
                      </div>
                    </div>

                    {quotes.length > 0 ? (
                      <div className="border border-[#E5E5E5] rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-[#F8F8F6] text-[#666666] border-b border-[#E5E5E5]">
                            <tr>
                              <th className="p-3">Ref No.</th>
                              <th className="p-3">Customer</th>
                              <th className="p-3">Door / Size</th>
                              <th className="p-3">Material & Frame</th>
                              <th className="p-3">Total Amount</th>
                              <th className="p-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E5E5]">
                            {quotes.map(q => (
                              <tr key={q.id} className="hover:bg-[#F8F8F6]">
                                <td className="p-3 font-mono font-bold text-[#C89211]">{q.quoteNumber}</td>
                                <td className="p-3">
                                  <div className="font-bold text-[#1A1A1A]">{q.customerName}</div>
                                  <div className="text-[#666666] font-mono">{q.customerPhone}</div>
                                  {q.customerCity && <div className="text-[10px] text-[#666666]">{q.customerCity}</div>}
                                </td>
                                <td className="p-3">
                                  <div className="font-medium text-[#1A1A1A]">{q.doorName}</div>
                                  <div className="text-[#666666] font-mono">{q.widthInch}" × {q.heightInch}" ({q.sqFt.toFixed(2)})</div>
                                </td>
                                <td className="p-3 text-[#1A1A1A]">
                                  <div>{q.materialName} ({q.finishName})</div>
                                  <div className="text-[10px] text-[#666666]">{q.frameName}</div>
                                </td>
                                <td className="p-3 font-mono font-bold text-[#C89211] text-sm">
                                  ₹{q.total.toLocaleString('en-IN')}
                                </td>
                                <td className="p-3 space-x-2">
                                  <a
                                    href={`https://wa.me/${q.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                      `Hello ${q.customerName}, this is regarding your door quotation ${q.quoteNumber} for ${q.doorName}.`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded bg-emerald-900/60 text-emerald-200 inline-flex items-center gap-1"
                                    title="Message Customer on WhatsApp"
                                  >
                                    WhatsApp
                                  </a>
                                  <button
                                    onClick={async () => {
                                      if (confirm('Delete quotation record?')) {
                                        await deleteQuote(q.id);
                                        loadData();
                                        showToast('Quotation deleted');
                                      }
                                    }}
                                    className="p-1.5 rounded bg-red-900/40 text-red-300"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-[#666666] text-xs bg-[#F8F8F6] rounded-xl border border-[#E5E5E5]">
                        No customer quotations recorded yet.
                      </div>
                    )}
                  </div>
                )}

                {/* 10. BUSINESS & WHATSAPP SETTINGS (Sections 12, 13, 26) */}
                {activeTab === 'settings' && settings && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-white">
                        Business & WhatsApp Settings
                      </h3>
                      <p className="text-xs text-[#666666]">
                        Configure brand name, phone, official WhatsApp inquiry routing number, and quotation terms
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#F8F8F6] border border-[#E5E5E5] space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        <div>
                          <label className="block font-semibold text-[#1A1A1A] mb-1">Business Name</label>
                          <input
                            type="text"
                            value={settings.businessName}
                            onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-[#1A1A1A] mb-1">Tagline</label>
                          <input
                            type="text"
                            value={settings.tagline}
                            onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                          />
                        </div>

                        {/* WhatsApp Number */}
                        <div>
                          <label className="block font-semibold text-emerald-400 mb-1">
                            Official WhatsApp Number
                          </label>
                          <input
                            type="text"
                            value={settings.whatsappNumber}
                            onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value.replace(/[^0-9]/g, '') })}
                            placeholder="e.g. 7887412884"
                            className="w-full px-3 py-2 rounded bg-white border border-emerald-600/50 text-emerald-300 font-mono"
                          />
                          <span className="text-[10px] text-[#666666] mt-1 block">
                            Official customer WhatsApp number (e.g. 7887412884). Customer WhatsApp actions route via +91 {settings.whatsappNumber}.
                          </span>
                        </div>

                        {/* Google Maps Location URL */}
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-[#C89211] mb-1 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-[#C89211]" />
                            Google Maps Location (URL)
                          </label>
                          <input
                            type="url"
                            value={settings.googleMapsUrl || settings.legalSettings?.socialLinks?.googleBusiness || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setSettings({
                                ...settings,
                                googleMapsUrl: val,
                                legalSettings: {
                                  ...settings.legalSettings,
                                  socialLinks: {
                                    ...settings.legalSettings?.socialLinks,
                                    googleBusiness: val,
                                  },
                                },
                              });
                            }}
                            placeholder="https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac"
                            className="w-full px-3 py-2 rounded bg-white border border-amber-600/50 text-amber-200 font-mono text-xs sm:text-sm"
                          />
                          <span className="text-[10px] text-[#666666] mt-1 block">
                            Direct Google Maps link opened by the "View Shop Location" buttons across Contact Us, About Us, and Footer.
                          </span>
                        </div>

                        {/* Production API Server URL (Capacitor Android & Cloud Run) */}
                        <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                          <label className="block font-semibold text-amber-800 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Server className="w-4 h-4 text-[#C89211]" />
                              Production API Server URL (Android &amp; Cloud Run)
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-stone-700 border border-stone-200">
                              Active: {settings.productionApiUrl || 'Direct Local / Cloud Firestore'}
                            </span>
                          </label>
                          <input
                            type="url"
                            value={settings.productionApiUrl || ''}
                            onChange={e => setSettings({ ...settings, productionApiUrl: e.target.value.trim() })}
                            placeholder="e.g. https://ais-dev-um3h2mohb2itzx3vvljosl-768916382182.asia-southeast1.run.app"
                            className="w-full px-3 py-2 rounded bg-white border border-amber-600/50 text-[#1A1A1A] font-mono text-xs sm:text-sm"
                          />
                          <span className="text-[10px] text-[#666666] mt-1 block">
                            Android Capacitor app reads this URL from Firestore settings to connect to the active Cloud Run backend for AI Wood Scan and sync without needing an APK rebuild.
                          </span>
                        </div>

                        <div>
                          <label className="block font-semibold text-[#1A1A1A] mb-1">Display Contact Phone</label>
                          <input
                            type="text"
                            value={settings.phone}
                            onChange={e => setSettings({ ...settings, phone: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-[#1A1A1A] mb-1">Contact Email</label>
                          <input
                            type="email"
                            value={settings.email}
                            onChange={e => setSettings({ ...settings, email: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-[#1A1A1A] mb-1">GST Number</label>
                          <input
                            type="text"
                            value={settings.gstNumber || ''}
                            onChange={e => setSettings({ ...settings, gstNumber: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-[#1A1A1A] mb-1">Factory / Workshop Address</label>
                          <input
                            type="text"
                            value={settings.address}
                            onChange={e => setSettings({ ...settings, address: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-[#1A1A1A] mb-1">Quotation Ref Prefix</label>
                          <input
                            type="text"
                            value={settings.quotePrefix}
                            onChange={e => setSettings({ ...settings, quotePrefix: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-[#1A1A1A] mb-1">Tax / Additional Charge % (Optional)</label>
                          <input
                            type="number"
                            value={settings.additionalChargePercentage || 0}
                            onChange={e => setSettings({ ...settings, additionalChargePercentage: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                          />
                        </div>

                        {/* Admin Password Change */}
                        <div className="sm:col-span-2 pt-2 border-t border-[#E5E5E5]">
                          <label className="block font-semibold text-[#C89211] mb-1">
                            Update Admin Security Key (Password)
                          </label>
                          <input
                            type="text"
                            placeholder="Leave blank to keep current password, or enter new password"
                            id="change-admin-password-input"
                            className="w-full max-w-sm px-3 py-2 rounded bg-white border border-[#E5E5E5] text-[#1A1A1A] font-mono"
                          />
                        </div>

                      </div>

                      <div className="flex justify-end pt-3 border-t border-[#E5E5E5]">
                        <button
                          onClick={async () => {
                            const newPassElem = document.getElementById('change-admin-password-input') as HTMLInputElement;
                            const newPass = newPassElem?.value?.trim();
                            try {
                              await updateSettings({
                                ...settings,
                                ...(newPass ? { adminPassword: newPass } : {}),
                              });
                              if (newPassElem) newPassElem.value = '';
                              loadData();
                              onDataUpdated();
                              showToast('Business & WhatsApp settings saved successfully');
                            } catch (err: any) {
                              alert(err.message || 'Settings update failed');
                            }
                          }}
                          className="px-6 py-2.5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs shadow-md"
                        >
                          Save Business Settings
                        </button>
                      </div>
                    </div>

                    {/* Content Protection & Anti-Copy System Card */}
                    <div className="bg-white border border-[#E5E5E5] rounded-2xl p-6 shadow-xl space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E5E5] pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#FFF7E3] border border-[#C89211]/30 flex items-center justify-center text-[#C89211]">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                              Content Protection & Anti-Copy System
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Active Guard
                              </span>
                            </h3>
                            <p className="text-xs text-[#666666] mt-0.5">
                              Safeguard door designs, gallery renders, and catalog images against unauthorized saving and capture.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              await updateSettings({
                                ...settings,
                                contentProtection: {
                                  enableImageProtection: settings.contentProtection?.enableImageProtection ?? true,
                                  enableWatermark: settings.contentProtection?.enableWatermark ?? true,
                                  watermarkText: settings.contentProtection?.watermarkText || 'Jai Hanuman Door',
                                  watermarkOpacity: settings.contentProtection?.watermarkOpacity ?? 0.22,
                                  watermarkPattern: settings.contentProtection?.watermarkPattern || 'diagonal',
                                  enableAndroidFlagSecure: settings.contentProtection?.enableAndroidFlagSecure ?? true,
                                  enableAndroidScreenRecordProtection: settings.contentProtection?.enableAndroidScreenRecordProtection ?? true,
                                },
                              });
                              loadData();
                              onDataUpdated();
                              showToast('Content protection settings saved successfully');
                            } catch (err: any) {
                              alert(err.message || 'Failed to save content protection settings');
                            }
                          }}
                          className="px-5 py-2 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs shadow-md flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save Protection Settings
                        </button>
                      </div>

                      {/* Technical Platform Transparency Notice */}
                      <div className="rounded-xl bg-amber-950/20 border border-[#C89211]/30 p-4 text-xs text-amber-200/90 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-[#C89211] shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-[#C89211]">
                            Platform Security Architecture Notice
                          </p>
                          <p className="text-[#1A1A1A] text-[11px] leading-relaxed">
                            <strong>Web / PWA:</strong> Browsers do not provide an operating-system API to guarantee 100% screenshot prevention. Our web layer blocks right-click saving, drag-to-desktop, print-to-PDF scraping, direct image URL exposure, and PrintScreen clipboard capture.
                          </p>
                          <p className="text-emerald-700 text-[11px] leading-relaxed">
                            <strong>Native Android:</strong> Hardware-level <code className="bg-stone-200/80 px-1 py-0.5 rounded text-[#C89211] font-mono">WindowManager.LayoutParams.FLAG_SECURE</code> is fully implemented in the Android native wrapper. When enabled, Android SurfaceFlinger hardware blocks screenshots, screen recording, and app switcher thumbnails across all protected customer screens.
                          </p>
                        </div>
                      </div>

                      {/* Controls Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Core Image Protection */}
                        <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-[#C89211]" />
                                Image Download Protection
                              </span>
                              <p className="text-[11px] text-[#666666] mt-0.5">
                                Disable right-click &quot;Save Image As&quot;, drag-to-desktop, and print-to-PDF.
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings.contentProtection?.enableImageProtection ?? true}
                                onChange={(e) => {
                                  const current = settings.contentProtection || DEFAULT_CONTENT_PROTECTION;
                                  setSettings({
                                    ...settings,
                                    contentProtection: { ...current, enableImageProtection: e.target.checked },
                                  });
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-stone-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                          </div>

                          <div className="border-t border-[#E5E5E5] pt-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-[#C89211]" />
                                  Dynamic Brand Watermark
                                </span>
                                <p className="text-[11px] text-[#666666] mt-0.5">
                                  Overlay semi-transparent brand watermark on catalog images.
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.contentProtection?.enableWatermark ?? true}
                                  onChange={(e) => {
                                    const current = settings.contentProtection || DEFAULT_CONTENT_PROTECTION;
                                    setSettings({
                                      ...settings,
                                      contentProtection: { ...current, enableWatermark: e.target.checked },
                                    });
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-stone-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                              </label>
                            </div>
                          </div>

                          {/* Watermark Config Fields */}
                          <div className="space-y-3 pt-2 border-t border-[#E5E5E5]">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">
                                Watermark Text
                              </label>
                              <input
                                type="text"
                                value={settings.contentProtection?.watermarkText ?? 'Jai Hanuman Door'}
                                onChange={(e) => {
                                  const current = settings.contentProtection || DEFAULT_CONTENT_PROTECTION;
                                  setSettings({
                                    ...settings,
                                    contentProtection: { ...current, watermarkText: e.target.value },
                                  });
                                }}
                                placeholder="Jai Hanuman Door"
                                maxLength={50}
                                className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs font-medium focus:border-[#C89211] outline-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">
                                  Pattern / Position
                                </label>
                                <select
                                  value={settings.contentProtection?.watermarkPattern ?? 'diagonal'}
                                  onChange={(e) => {
                                    const current = settings.contentProtection || DEFAULT_CONTENT_PROTECTION;
                                    setSettings({
                                      ...settings,
                                      contentProtection: {
                                        ...current,
                                        watermarkPattern: e.target.value as any,
                                      },
                                    });
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#1A1A1A] text-xs focus:border-[#C89211] outline-none"
                                >
                                  <option value="diagonal">Diagonal Repeated Grid</option>
                                  <option value="center">Center Artisan Crest</option>
                                  <option value="repeated">Matrix Grid Pattern</option>
                                  <option value="corner">Discreet Corner Stamp</option>
                                </select>
                              </div>

                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <label className="text-[11px] font-semibold text-[#1A1A1A]">
                                    Opacity
                                  </label>
                                  <span className="text-[11px] font-mono text-[#C89211]">
                                    {Math.round((settings.contentProtection?.watermarkOpacity ?? 0.22) * 100)}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0.05"
                                  max="0.60"
                                  step="0.01"
                                  value={settings.contentProtection?.watermarkOpacity ?? 0.22}
                                  onChange={(e) => {
                                    const current = settings.contentProtection || DEFAULT_CONTENT_PROTECTION;
                                    setSettings({
                                      ...settings,
                                      contentProtection: {
                                        ...current,
                                        watermarkOpacity: parseFloat(e.target.value),
                                      },
                                    });
                                  }}
                                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-100 rounded-lg"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Android Native & Preview */}
                        <div className="space-y-4">
                          {/* Android Native Flags */}
                          <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl p-4 space-y-3">
                            <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5 text-[#C89211]" />
                              Android Native Protections (FLAG_SECURE)
                            </span>

                            <div className="flex items-center justify-between pt-1">
                              <div>
                                <p className="text-xs text-[#1A1A1A] font-medium">Screenshot Protection</p>
                                <p className="text-[10px] text-[#666666]">Blanks OS screenshots in native Android build.</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.contentProtection?.enableAndroidFlagSecure ?? true}
                                  onChange={(e) => {
                                    const current = settings.contentProtection || DEFAULT_CONTENT_PROTECTION;
                                    setSettings({
                                      ...settings,
                                      contentProtection: { ...current, enableAndroidFlagSecure: e.target.checked },
                                    });
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-stone-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>

                            <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-2">
                              <div>
                                <p className="text-xs text-[#1A1A1A] font-medium">Screen Recording Protection</p>
                                <p className="text-[10px] text-[#666666]">Blocks screen recording capture &amp; recent task previews.</p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.contentProtection?.enableAndroidScreenRecordProtection ?? true}
                                  onChange={(e) => {
                                    const current = settings.contentProtection || DEFAULT_CONTENT_PROTECTION;
                                    setSettings({
                                      ...settings,
                                      contentProtection: { ...current, enableAndroidScreenRecordProtection: e.target.checked },
                                    });
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-stone-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                          </div>

                          {/* Live Watermark Interactive Preview */}
                          <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider">
                                Live Customer View Preview
                              </span>
                              <span className="text-[10px] text-[#666666] font-mono">
                                Pattern: {settings.contentProtection?.watermarkPattern || 'diagonal'}
                              </span>
                            </div>

                            <div className="h-36 rounded-lg overflow-hidden border border-[#E5E5E5] relative">
                              <ProtectedImage
                                src={doors[0]?.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'}
                                alt="Watermark Preview"
                                watermarkSettings={settings.contentProtection || DEFAULT_CONTENT_PROTECTION}
                                showWatermark={settings.contentProtection?.enableWatermark ?? true}
                                className="w-full h-full object-cover"
                                containerClassName="w-full h-full"
                              />
                            </div>
                            <p className="text-[10px] text-[#666666] mt-2 text-center">
                              Right-clicking or dragging this preview will be automatically prevented by the protection shield.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Push Notifications Admin Tab */}
                {activeTab === 'notifications' && (
                  <AdminNotificationsTab
                    doors={doors}
                    onShowToast={showToast}
                  />
                )}

                {/* Team & Leadership Admin Tab */}
                {activeTab === 'team' && (
                  <AdminTeamTab
                    teamMembers={teamMembers}
                    onReload={async () => {
                      await loadData();
                      onDataUpdated();
                    }}
                    settings={settings || undefined}
                  />
                )}

                {/* Brand & Company Story Admin Tab */}
                {activeTab === 'story' && (
                  <AdminBrandStoryTab
                    settings={settings}
                    onDataUpdated={async () => {
                      await loadData();
                      onDataUpdated();
                    }}
                    showToast={showToast}
                  />
                )}

                {/* Customer Inquiries Admin Tab */}
                {activeTab === 'enquiries' && (
                  <AdminEnquiriesTab
                    onShowToast={showToast}
                  />
                )}

                {/* Legal & Info Pages Admin Tab */}
                {activeTab === 'legal' && (
                  <AdminLegalTab
                    settings={settings}
                    onSaved={async () => {
                      await loadData();
                      onDataUpdated();
                    }}
                    onShowToast={showToast}
                  />
                )}

                {/* Data Backup & Persistence Tab */}
                {activeTab === 'backup' && (
                  <AdminBackupRestore
                    onDataRestored={async () => {
                      await loadData();
                      onDataUpdated();
                    }}
                    showToast={showToast}
                  />
                )}

                {/* AI Wood Detector Management Tab */}
                {activeTab === 'wood-detector' && (
                  <AdminWoodDetectorTab
                    settings={settings}
                    onSettingsUpdated={async () => {
                      await loadData();
                      onDataUpdated();
                    }}
                  />
                )}

                {/* Order Tracking & Manufacturing Progress Admin Tab */}
                {activeTab === 'tracking' && (
                  <AdminOrderTrackingTab
                    quotes={quotes}
                    officialWhatsApp={settings?.whatsappNumber || '7887412884'}
                  />
                )}

                {/* All India Delivery & Customer Stories Admin Tab */}
                {activeTab === 'delivery' && (
                  <AdminDeliveryTab
                    states={deliveryStates}
                    stories={deliveryStories}
                    onRefresh={async () => {
                      await loadData();
                      onDataUpdated();
                    }}
                    showToast={showToast}
                  />
                )}

                {/* 3D & AR Design Management Tab */}
                {activeTab === 'visualizer' && (
                  <AdminVisualizerTab
                    doors={doors}
                    onDoorUpdated={async () => {
                      await loadData();
                      onDataUpdated();
                    }}
                    showToast={showToast}
                  />
                )}

                {/* Google AdMob Monetization Admin Tab */}
                {activeTab === 'admob' && (
                  <AdminAdMobTab
                    settings={settings || undefined}
                    onUpdateSettings={async (newSettings) => {
                      await updateSettings(newSettings);
                      await loadData();
                      onDataUpdated();
                      showToast('AdMob settings saved successfully');
                    }}
                  />
                )}

              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
