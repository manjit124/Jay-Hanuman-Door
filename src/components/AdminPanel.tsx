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
  Inbox,
  MapPin,
  HardDrive,
} from 'lucide-react';
import { ProtectedImage } from './ProtectedImage.tsx';
import { DEFAULT_CONTENT_PROTECTION } from '../lib/contentProtection.ts';
import { AdminNotificationsTab } from './AdminNotificationsTab.tsx';
import { AdminTeamTab } from './AdminTeamTab.tsx';
import { AdminArticlesTab } from './AdminArticlesTab.tsx';
import { AdminLegalTab } from './admin/AdminLegalTab.tsx';
import { AdminEnquiriesTab } from './admin/AdminEnquiriesTab.tsx';
import { AdminBackupRestore } from './admin/AdminBackupRestore.tsx';
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
  deleteBanner,
  createArticle,
  updateArticle,
  deleteArticle,
  updateSettings,
  deleteQuote,
  resetDatabase,
  uploadImage,
  resetAdminDefaultPassword,
} from '../lib/api.ts';
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

  // Active Admin Section Tab
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'doors'
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
    | 'enquiries'
    | 'legal'
    | 'backup'
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

  // Status message for successful saves
  const [toastMsg, setToastMsg] = useState('');

  // Editing forms state
  const [editingDoor, setEditingDoor] = useState<Partial<Door> | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Partial<DoorMaterial> | null>(null);
  const [editingFinish, setEditingFinish] = useState<Partial<PolishFinish> | null>(null);
  const [editingFrame, setEditingFrame] = useState<Partial<ChaukhatFrame> | null>(null);
  const [editingHardware, setEditingHardware] = useState<Partial<HardwareItem> | null>(null);
  const [editingBanner, setEditingBanner] = useState<Partial<HomeBanner> | null>(null);
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);

  // Uploading state
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
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
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTab) {
      const mapped = initialTab === 'prices' ? 'materials' : initialTab;
      if (['dashboard', 'doors', 'materials', 'finishes', 'frames', 'hardware', 'banners', 'articles', 'settings', 'quotes', 'team', 'notifications', 'enquiries', 'legal'].includes(mapped)) {
        setActiveTab(mapped as any);
      }
    }
  }, [initialTab]);

  useEffect(() => {
    if (isLoggedIn && isOpen) {
      loadData();
    }
  }, [isLoggedIn, isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const ok = await adminLogin(emailInput.trim(), passwordInput);
      if (ok) {
        setIsLoggedIn(true);
        setPasswordInput('');
        setLoginError('');
        loadData();
        showToast('Welcome to Door Business Admin Portal');
        if (onNavigateTab) {
          onNavigateTab('dashboard');
        }
      } else {
        setLoginError('Invalid email or password.');
      }
    } catch {
      setLoginError('Invalid email or password.');
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

  // Direct File Upload helper
  const handleFileUploadHelper = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadImage(file);
      onSuccess(res.url);
      showToast('Image uploaded successfully');
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  // Quick price update handlers
  const handleQuickUpdateMaterialRate = async (id: string, newRate: number) => {
    if (newRate <= 0) return;
    try {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl text-stone-100 overflow-hidden my-4 max-h-[96vh] flex flex-col">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/90 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
                  Manufacturer Admin Control Center
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Secure Backend
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Manage doors, live rates, Chaukhat frames, hardware, banners & WhatsApp settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                id="admin-logout-btn"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
              title="Return to Customer Storefront"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast alert */}
        {toastMsg && (
          <div className="bg-amber-600 text-stone-950 text-xs sm:text-sm font-bold px-4 py-2 text-center shadow-md animate-in slide-in-from-top duration-200">
            {toastMsg}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          
          {!isLoggedIn ? (
            currentUser && !bypassCustomerDenied ? (
              /* Access Denied View for Customer Accounts attempting admin route (TEST 10) */
              <div className="w-full max-w-md mx-auto my-auto p-6 sm:p-8 space-y-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl font-bold text-white">
                    Access Denied
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    You are currently signed in as a customer account (<span className="text-stone-200 font-medium">{currentUser.name || currentUser.email}</span>). 
                    Factory administrator credentials and authorization are required to access this portal.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    id="admin-switch-account-btn"
                    onClick={() => setBypassCustomerDenied(true)}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors shadow-lg shadow-amber-950/40"
                  >
                    Sign In with Admin Credentials
                  </button>
                  <button
                    id="admin-back-to-store-btn"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors"
                  >
                    Return to Customer Home
                  </button>
                </div>
              </div>
            ) : (
              /* Admin Login Form Screen */
              <div className="w-full max-w-md mx-auto my-auto p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-white">
                    Administrator Sign In
                  </h3>
                  <p className="text-xs text-stone-400">
                    Enter master security credentials to manage manufacturing catalog, live pricing & business configuration
                  </p>
                </div>

                {loginError && (
                  <div
                    id="admin-login-error"
                    className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs text-center font-medium"
                  >
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
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
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-700 bg-stone-800 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-stone-300">
                        Admin Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
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
                        className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-stone-700 bg-stone-800 text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-400 p-1 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1.5 px-0.5">
                      <span>Default password: <strong className="text-amber-400 font-mono">admin123</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailInput('shivshahidoors@gmail.com');
                          setPasswordInput('admin123');
                          setLoginError('');
                        }}
                        className="text-amber-400 hover:text-amber-300 hover:underline font-medium"
                      >
                        Auto-fill credentials
                      </button>
                    </div>
                  </div>

                  <button
                    id="admin-login-btn"
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-bold text-sm shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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

                {/* Forgot password dialog / guidance */}
                {showForgotPassword && (
                  <div className="p-4 rounded-xl bg-stone-800/95 border border-amber-600/30 text-xs text-stone-300 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between text-amber-400 font-semibold">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4" />
                        <span>Administrator Credentials & Recovery</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="text-stone-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5 text-stone-300 text-[11px] leading-relaxed">
                      <p>
                        Your master administration login is ready:
                      </p>
                      <div className="bg-stone-900/90 rounded-lg p-2.5 border border-stone-700/80 space-y-1 font-mono text-[12px]">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Email:</span>
                          <span className="text-amber-300">shivshahidoors@gmail.com</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Master Password:</span>
                          <span className="text-amber-400 font-bold">admin123</span>
                        </div>
                      </div>
                      <p className="text-stone-400 pt-1">
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
                        className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors text-center"
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
                        className="py-2 px-3 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 font-semibold text-xs transition-colors text-center"
                      >
                        {isResettingPassword ? 'Resetting...' : 'Reset to admin123'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    ← Return to Customer Storefront
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Logged In Admin Workspace */
            <>
              {/* Sidebar Navigation */}
              <div className="w-full md:w-60 bg-stone-950/60 border-b md:border-b-0 md:border-r border-stone-800 p-3 space-y-1 overflow-x-auto md:overflow-x-visible flex md:flex-col flex-shrink-0">
                
                <button
                  id="admin-tab-dashboard"
                  onClick={() => handleTabSelect('dashboard')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'dashboard' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  Dashboard
                </button>

                <button
                  id="admin-tab-doors"
                  onClick={() => { handleTabSelect('doors'); setEditingDoor(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'doors' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <DoorClosed className="w-4 h-4" />
                  Door Designs ({doors.length})
                </button>

                <button
                  id="admin-tab-materials"
                  onClick={() => { handleTabSelect('materials'); setEditingMaterial(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'materials' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <TreePine className="w-4 h-4" />
                  Materials (₹)
                </button>

                <button
                  id="admin-tab-finishes"
                  onClick={() => { handleTabSelect('finishes'); setEditingFinish(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'finishes' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Polish / Finish
                </button>

                <button
                  id="admin-tab-frames"
                  onClick={() => { handleTabSelect('frames'); setEditingFrame(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'frames' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <FrameIcon className="w-4 h-4" />
                  Door Frames (Chaukhat)
                </button>

                <button
                  id="admin-tab-hardware"
                  onClick={() => { handleTabSelect('hardware'); setEditingHardware(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'hardware' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  Hardware & Aldrops
                </button>

                <button
                  id="admin-tab-banners"
                  onClick={() => { handleTabSelect('banners'); setEditingBanner(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'banners' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Home Banners
                </button>

                <button
                  id="admin-tab-articles"
                  onClick={() => { handleTabSelect('articles'); setEditingArticle(null); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'articles' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Articles & Guides
                </button>

                <button
                  id="admin-tab-quotes"
                  onClick={() => handleTabSelect('quotes')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'quotes' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Customer Quotes ({quotes.length})
                </button>

                <button
                  id="admin-tab-notifications"
                  onClick={() => handleTabSelect('notifications')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'notifications' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Push Notifications
                </button>

                <button
                  id="admin-tab-team"
                  onClick={() => handleTabSelect('team')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'team' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Team & Leadership ({teamMembers.length})
                </button>

                <button
                  id="admin-tab-enquiries"
                  onClick={() => handleTabSelect('enquiries')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'enquiries' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  Customer Inquiries
                </button>

                <button
                  id="admin-tab-legal"
                  onClick={() => handleTabSelect('legal')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'legal' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Legal &amp; Information Pages
                </button>

                <button
                  id="admin-tab-settings"
                  onClick={() => handleTabSelect('settings')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'settings' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  Business & WhatsApp
                </button>

                <button
                  id="admin-tab-backup"
                  onClick={() => handleTabSelect('backup')}
                  className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-colors ${
                    activeTab === 'backup' ? 'bg-amber-600 text-stone-950' : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Backup &amp; Persistence
                </button>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-5 sm:p-7 overflow-y-auto space-y-6">
                
                {/* 1. DASHBOARD VIEW */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                        Overview & Metrics
                      </h3>
                      <button
                        onClick={() => handleTabSelect('backup')}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800/90 border border-stone-700/60 hover:bg-stone-750 transition"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                        Backup &amp; Export Data
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/60">
                        <div className="text-xs text-stone-400 font-medium">Door Designs</div>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 mt-1">
                          {doors.length}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">
                          {doors.filter(d => d.featured).length} Featured
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/60">
                        <div className="text-xs text-stone-400 font-medium">Quotes Generated</div>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 mt-1">
                          {quotes.length}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">
                          Direct customer leads
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/60">
                        <div className="text-xs text-stone-400 font-medium">Wood Materials</div>
                        <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 mt-1">
                          {materials.length}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">
                          Sagwan: ₹{materials.find(m => m.name.toLowerCase().includes('sagwan'))?.ratePerSqFt || 800}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-stone-800/80 border border-stone-700/60">
                        <div className="text-xs text-stone-400 font-medium">WhatsApp Number</div>
                        <div className="text-sm font-mono text-emerald-400 mt-2 font-bold truncate">
                          {formatWhatsAppDisplay(settings?.whatsappNumber)}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">
                          Active Inquiries Route
                        </div>
                      </div>
                    </div>

                    {/* Quick Price Matrix (Section 15) */}
                    <div className="p-5 rounded-2xl bg-stone-800/50 border border-stone-700/70 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-base font-bold text-stone-100 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-amber-400" />
                          Live Calculator Rate Matrix
                        </h4>
                        <span className="text-xs text-stone-400">
                          Updates immediately affect customer calculations
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                          <div className="text-stone-400 font-medium">Sagwan (CP Teak)</div>
                          <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                            ₹{materials.find(m => m.name.toLowerCase().includes('sagwan'))?.ratePerSqFt || 800}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                          <div className="text-stone-400 font-medium">Teak Polish Rate</div>
                          <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                            ₹{finishes.find(f => f.name.toLowerCase().includes('teak'))?.ratePerSqFt || 150}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                          <div className="text-stone-400 font-medium">Normal Frame Price</div>
                          <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                            ₹{frames.find(fr => fr.name.toLowerCase().includes('normal'))?.price.toLocaleString('en-IN') || '3,500'}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
                          <div className="text-stone-400 font-medium">Aldrop Single</div>
                          <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                            ₹{hardware.find(h => h.name.toLowerCase().includes('single'))?.price.toLocaleString('en-IN') || '700'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Quotations Table preview */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-base font-bold text-stone-100">
                          Recent Customer Quotations
                        </h4>
                        <button
                          onClick={() => setActiveTab('quotes')}
                          className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                        >
                          View All ({quotes.length}) →
                        </button>
                      </div>

                      {quotes.length > 0 ? (
                        <div className="border border-stone-800 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-stone-950 text-stone-400 border-b border-stone-800">
                              <tr>
                                <th className="p-3">Ref No.</th>
                                <th className="p-3">Customer</th>
                                <th className="p-3">Dimensions</th>
                                <th className="p-3">Estimated Total</th>
                                <th className="p-3">Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800/60">
                              {quotes.slice(0, 5).map(q => (
                                <tr key={q.id} className="hover:bg-stone-800/40">
                                  <td className="p-3 font-mono text-amber-400 font-bold">{q.quoteNumber}</td>
                                  <td className="p-3 font-medium text-stone-200">
                                    {q.customerName} ({q.customerPhone})
                                  </td>
                                  <td className="p-3 text-stone-400 font-mono">
                                    {q.widthInch}" × {q.heightInch}" ({q.sqFt.toFixed(2)})
                                  </td>
                                  <td className="p-3 font-mono font-bold text-stone-100">
                                    ₹{q.total.toLocaleString('en-IN')}
                                  </td>
                                  <td className="p-3 text-stone-500">
                                    {new Date(q.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-stone-500 text-xs bg-stone-800/40 rounded-xl border border-stone-800">
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
                        <p className="text-xs text-stone-400">
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
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Door Design
                      </button>
                    </div>

                    {/* Edit or Add Door Form */}
                    {editingDoor && (
                      <div className="p-5 rounded-2xl bg-stone-800 border border-stone-700 space-y-4">
                        <div className="flex items-center justify-between border-b border-stone-700 pb-3">
                          <h4 className="font-serif text-base font-bold text-amber-400">
                            {editingDoor.id ? 'Edit Door Design' : 'Create New Door Design'}
                          </h4>
                          <button
                            onClick={() => setEditingDoor(null)}
                            className="text-stone-400 hover:text-stone-200 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          {/* Name */}
                          <div>
                            <label className="block font-semibold text-stone-300 mb-1">
                              Door Name <span className="text-amber-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={editingDoor.name || ''}
                              onChange={e => setEditingDoor({ ...editingDoor, name: e.target.value })}
                              placeholder="e.g. Royal Sagwan Floral Carved Door"
                              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          {/* Category */}
                          <div>
                            <label className="block font-semibold text-stone-300 mb-1">
                              Category <span className="text-amber-400">*</span>
                            </label>
                            <select
                              value={editingDoor.category || ''}
                              onChange={e => setEditingDoor({ ...editingDoor, category: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-amber-500"
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
                            <label className="block font-semibold text-stone-300 mb-1">
                              Starting Price (₹)
                            </label>
                            <input
                              type="number"
                              value={editingDoor.startingPrice || 0}
                              onChange={e => setEditingDoor({ ...editingDoor, startingPrice: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 font-mono text-xs focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          {/* Primary Material */}
                          <div>
                            <label className="block font-semibold text-stone-300 mb-1">
                              Recommended Material
                            </label>
                            <input
                              type="text"
                              value={editingDoor.material || 'Sagwan'}
                              onChange={e => setEditingDoor({ ...editingDoor, material: e.target.value })}
                              placeholder="e.g. Sagwan (Teak Wood), Sal Wood"
                              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          {/* Direct Image Upload (Section 14 requirement) */}
                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-stone-300 mb-1">
                              Door Image (Direct File Upload)
                            </label>
                            <div className="flex items-center gap-3">
                              <label className="cursor-pointer px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 transition-colors">
                                <Upload className="w-3.5 h-3.5" />
                                {uploadingImage ? 'Uploading...' : 'Choose File to Upload'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadingImage}
                                  onChange={e =>
                                    handleFileUploadHelper(e, url => {
                                      const current = editingDoor.images || [];
                                      setEditingDoor({ ...editingDoor, images: [url, ...current] });
                                    })
                                  }
                                  className="hidden"
                                />
                              </label>
                              <span className="text-[11px] text-stone-400">
                                Select JPG/PNG file from your phone or PC
                              </span>
                            </div>

                            {/* Images preview list */}
                            {editingDoor.images && editingDoor.images.length > 0 && (
                              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                                {editingDoor.images.map((img, idx) => (
                                  <div key={idx} className="relative w-16 h-20 rounded border border-stone-700 overflow-hidden group">
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

                          {/* Description */}
                          <div className="sm:col-span-2">
                            <label className="block font-semibold text-stone-300 mb-1">
                              Description & Features
                            </label>
                            <textarea
                              rows={3}
                              value={editingDoor.description || ''}
                              onChange={e => setEditingDoor({ ...editingDoor, description: e.target.value })}
                              placeholder="e.g. Handcrafted solid Sagwan wood door with traditional carvings..."
                              className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-amber-500"
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
                              <span className="text-stone-300">Mark as Featured</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingDoor.popular || false}
                                onChange={e => setEditingDoor({ ...editingDoor, popular: e.target.checked })}
                                className="rounded accent-amber-500"
                              />
                              <span className="text-stone-300">Mark as Popular</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingDoor.active !== undefined ? editingDoor.active : true}
                                onChange={e => setEditingDoor({ ...editingDoor, active: e.target.checked })}
                                className="rounded accent-amber-500"
                              />
                              <span className="text-stone-300">Active (Visible in Catalog)</span>
                            </label>
                          </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end gap-2 pt-3 border-t border-stone-700">
                          <button
                            onClick={() => setEditingDoor(null)}
                            className="px-4 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!editingDoor.name?.trim()) {
                                alert('Please provide door name');
                                return;
                              }
                              try {
                                if (editingDoor.id) {
                                  await updateDoor(editingDoor.id, editingDoor);
                                } else {
                                  await createDoor(editingDoor);
                                }
                                setEditingDoor(null);
                                loadData();
                                onDataUpdated();
                                showToast('Door design saved successfully');
                              } catch (err: any) {
                                alert(err.message || 'Save failed');
                              }
                            }}
                            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
                          >
                            Save Door Design
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Door List Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {doors.map(door => (
                        <div
                          key={door.id}
                          className="p-4 rounded-2xl bg-stone-850 border border-stone-750 flex flex-col justify-between space-y-3 shadow-sm hover:border-amber-500/40 transition-all"
                        >
                          <div>
                            <div className="flex gap-3">
                              <img
                                src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'}
                                alt=""
                                className="w-16 h-20 object-cover rounded-xl bg-stone-900 border border-stone-700 flex-shrink-0"
                              />
                              <div className="overflow-hidden flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                    {door.category}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${door.active !== false ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-stone-800 text-stone-400 border-stone-700'}`}>
                                    {door.active !== false ? 'Active' : 'Disabled'}
                                  </span>
                                </div>
                                <h4 className="font-bold text-stone-100 text-sm mt-1.5 line-clamp-1">
                                  {door.name}
                                </h4>
                                <div className="flex gap-1.5 mt-1 text-[10px]">
                                  {door.featured && <span className="text-amber-300 font-medium bg-amber-500/10 px-1.5 py-0.2 rounded">★ Featured</span>}
                                  {door.popular && <span className="text-emerald-300 font-medium bg-emerald-500/10 px-1.5 py-0.2 rounded">★ Popular</span>}
                                </div>
                              </div>
                            </div>

                            {/* Price & Quick Edit */}
                            <div className="mt-3 p-3 rounded-xl bg-stone-900/90 border border-stone-800">
                              {quickEditDoorId === door.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                                    <span>Quick Edit Starting Price:</span>
                                    <button onClick={() => setQuickEditDoorId(null)} className="text-stone-400 hover:text-white">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-amber-400 font-mono font-bold text-sm">₹</span>
                                    <input
                                      type="number"
                                      value={quickEditDoorPrice}
                                      onChange={e => setQuickEditDoorPrice(Number(e.target.value))}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-amber-500/50 text-amber-300 font-mono font-bold text-sm"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5 pt-1">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setQuickEditDoorPrice(prev => Math.max(0, prev - 500))}
                                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                      >
                                        -₹500
                                      </button>
                                      <button
                                        onClick={() => setQuickEditDoorPrice(prev => prev + 500)}
                                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                      >
                                        +₹500
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => handleQuickUpdateDoorPrice(door.id, quickEditDoorPrice)}
                                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                                    >
                                      Save ₹
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-[10px] text-stone-400">Starting Price</div>
                                    <div className="text-lg font-mono font-bold text-amber-400">
                                      ₹{door.startingPrice.toLocaleString('en-IN')}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setQuickEditDoorId(door.id);
                                      setQuickEditDoorPrice(door.startingPrice);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit ₹</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-stone-800 flex items-center gap-2">
                            <button
                              onClick={() => setEditingDoor(door)}
                              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Details & Photos</span>
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
                              className="p-2 rounded-xl bg-stone-800 hover:bg-red-950/60 text-stone-400 hover:text-red-300 border border-stone-700"
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
                            <TreePine className="w-5 h-5 text-amber-400" />
                            Wood Materials & Live Rates (₹)
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {materials.length} Species
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 mt-1">
                          Edit timber prices and technical details. All updates immediately update the customer door calculator.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setShowBulkRateModal(true)}
                          className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Wood Material</span>
                        </button>

                        {/* View Switcher */}
                        <div className="flex rounded-xl bg-stone-800 p-0.5 border border-stone-700">
                          <button
                            onClick={() => setMaterialsViewMode('cards')}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              materialsViewMode === 'cards'
                                ? 'bg-amber-600 text-stone-950 font-bold'
                                : 'text-stone-400 hover:text-stone-200'
                            }`}
                            title="Card View (Mobile Optimized)"
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setMaterialsViewMode('table')}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              materialsViewMode === 'table'
                                ? 'bg-amber-600 text-stone-950 font-bold'
                                : 'text-stone-400 hover:text-stone-200'
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
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={materialSearch}
                        onChange={e => setMaterialSearch(e.target.value)}
                        placeholder="Search wood material by name or specifications (e.g. Sagwan, Sal, Teak)..."
                        className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-stone-900 border border-stone-700 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                      />
                      {materialSearch && (
                        <button
                          onClick={() => setMaterialSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Bulk Rate Adjustment Modal */}
                    {showBulkRateModal && (
                      <div className="fixed inset-0 z-[60] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
                          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-amber-400" />
                              <h4 className="font-bold text-white text-base">Bulk Price Adjustment</h4>
                            </div>
                            <button
                              onClick={() => setShowBulkRateModal(false)}
                              className="text-stone-400 hover:text-white"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          <p className="text-xs text-stone-300">
                            Apply a market price change across all wood species simultaneously. This will immediately update customer price calculations.
                          </p>

                          {/* Mode selector */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <button
                              onClick={() => setBulkAdjustmentMode('fixed')}
                              className={`py-2 px-3 rounded-xl border font-bold transition-colors ${
                                bulkAdjustmentMode === 'fixed'
                                  ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                                  : 'bg-stone-800 border-stone-700 text-stone-300'
                              }`}
                            >
                              Fixed Amount (₹/sq.ft.)
                            </button>
                            <button
                              onClick={() => setBulkAdjustmentMode('percent')}
                              className={`py-2 px-3 rounded-xl border font-bold transition-colors ${
                                bulkAdjustmentMode === 'percent'
                                  ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                                  : 'bg-stone-800 border-stone-700 text-stone-300'
                              }`}
                            >
                              Percentage (%)
                            </button>
                          </div>

                          {/* Value input & presets */}
                          {bulkAdjustmentMode === 'fixed' ? (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-stone-300">
                                Adjustment Amount (₹ per sq.ft.)
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-stone-400 font-mono text-sm">₹</span>
                                <input
                                  type="number"
                                  value={bulkAdjustmentAmount}
                                  onChange={e => setBulkAdjustmentAmount(Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white font-mono font-bold text-sm"
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
                                        ? 'bg-amber-500 text-stone-950'
                                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                    }`}
                                  >
                                    {val > 0 ? `+₹${val}` : `-₹${Math.abs(val)}`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-stone-300">
                                Adjustment Percentage (%)
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={bulkAdjustmentPercent}
                                  onChange={e => setBulkAdjustmentPercent(Number(e.target.value))}
                                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white font-mono font-bold text-sm"
                                />
                                <span className="text-stone-400 font-mono text-sm">%</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {[-10, -5, 5, 10, 15].map(pct => (
                                  <button
                                    key={pct}
                                    type="button"
                                    onClick={() => setBulkAdjustmentPercent(pct)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold ${
                                      bulkAdjustmentPercent === pct
                                        ? 'bg-amber-500 text-stone-950'
                                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                    }`}
                                  >
                                    {pct > 0 ? `+${pct}%` : `${pct}%`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Preview changes */}
                          <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-1.5 max-h-36 overflow-y-auto text-xs">
                            <span className="text-[11px] font-bold text-stone-400 block uppercase tracking-wider">
                              Preview Changes:
                            </span>
                            {materials.map(m => {
                              const previewRate =
                                bulkAdjustmentMode === 'fixed'
                                  ? Math.max(50, m.ratePerSqFt + bulkAdjustmentAmount)
                                  : Math.max(50, Math.round(m.ratePerSqFt * (1 + bulkAdjustmentPercent / 100)));
                              return (
                                <div key={m.id} className="flex justify-between items-center text-stone-300">
                                  <span>{m.name}</span>
                                  <span className="font-mono">
                                    ₹{m.ratePerSqFt} → <strong className="text-amber-400">₹{previewRate}</strong>
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                            <button
                              onClick={() => setShowBulkRateModal(false)}
                              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleApplyBulkRateAdjustment}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md"
                            >
                              Apply to All Materials
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dedicated Edit Wood Rate & Details Form Card */}
                    {editingMaterial && (
                      <div className="p-5 rounded-2xl bg-stone-850 border-2 border-amber-500/50 space-y-4 text-xs shadow-xl animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center pb-3 border-b border-stone-700">
                          <div className="flex items-center gap-2">
                            <Edit2 className="w-4 h-4 text-amber-400" />
                            <h4 className="font-bold text-sm text-white">
                              {editingMaterial.id ? `Edit ${editingMaterial.name || 'Wood Material'} Rate & Details` : 'Add New Wood Material'}
                            </h4>
                          </div>
                          <button
                            onClick={() => setEditingMaterial(null)}
                            className="p-1 rounded-lg hover:bg-stone-700 text-stone-400 hover:text-white"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Wood Species Name */}
                          <div>
                            <label className="block text-stone-200 font-semibold mb-1.5">
                              Wood Species Name <span className="text-amber-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={editingMaterial.name || ''}
                              onChange={e => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                              placeholder="e.g. Sagwan (CP Teak), Sal Wood, Pine, Burma Teak"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 font-semibold focus:outline-none focus:border-amber-500"
                            />
                            <p className="text-[11px] text-stone-400 mt-1">
                              Appears in the door calculator and customer quotes.
                            </p>
                          </div>

                          {/* Rate Input + Quick Presets */}
                          <div>
                            <label className="block text-stone-200 font-semibold mb-1.5">
                              Rate per Sq.Ft. (₹) <span className="text-amber-400">*</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-mono font-bold text-base">₹</span>
                              <input
                                type="number"
                                min={50}
                                value={editingMaterial.ratePerSqFt || 0}
                                onChange={e => setEditingMaterial({ ...editingMaterial, ratePerSqFt: Number(e.target.value) })}
                                className="w-full px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-700 text-amber-300 font-mono font-bold text-base focus:outline-none focus:border-amber-500"
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
                                  className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-[11px] font-mono"
                                >
                                  {step > 0 ? `+₹${step}` : `-₹${Math.abs(step)}`}
                                </button>
                              ))}

                              {/* Common Presets */}
                              <span className="text-[10px] text-stone-500 ml-1">Presets:</span>
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
                                  className="px-1.5 py-0.5 rounded bg-stone-900 hover:bg-amber-950/40 text-stone-400 hover:text-amber-300 border border-stone-800 text-[10px]"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Technical Description / Grain Spec */}
                          <div className="md:col-span-2">
                            <label className="block text-stone-200 font-semibold mb-1.5">
                              Timber Specifications & Details
                            </label>
                            <textarea
                              rows={3}
                              value={editingMaterial.description || ''}
                              onChange={e => setEditingMaterial({ ...editingMaterial, description: e.target.value })}
                              placeholder="e.g. 100% Kiln-seasoned Central Province Teak. Moisture content <12%. High oil content protects against termites and warping. Ideal for heavy main entrance doors with deep 3D carving."
                              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* Live Impact Calculator Box */}
                          <div className="md:col-span-2 p-3 rounded-xl bg-stone-900/90 border border-stone-800">
                            <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-2">
                              <Calculator className="w-4 h-4" />
                              <span>Live Customer Door Cost Preview with this rate:</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                              <div className="p-2 rounded-lg bg-stone-950 border border-stone-800/80">
                                <div className="text-[10px] text-stone-400">Standard Single</div>
                                <div className="text-[11px] text-stone-500">7×3 ft (21 sq.ft.)</div>
                                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                                  ₹{((editingMaterial.ratePerSqFt || 0) * 21).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg bg-stone-950 border border-stone-800/80">
                                <div className="text-[10px] text-stone-400">Bedroom Door</div>
                                <div className="text-[11px] text-stone-500">7×3.25 ft (22.75 sq.ft.)</div>
                                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                                  ₹{Math.round((editingMaterial.ratePerSqFt || 0) * 22.75).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg bg-stone-950 border border-stone-800/80">
                                <div className="text-[10px] text-stone-400">Main Entrance</div>
                                <div className="text-[11px] text-stone-500">7.5×3.5 ft (26.25 sq.ft.)</div>
                                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                                  ₹{Math.round((editingMaterial.ratePerSqFt || 0) * 26.25).toLocaleString('en-IN')}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg bg-stone-950 border border-stone-800/80">
                                <div className="text-[10px] text-stone-400">Grand Double</div>
                                <div className="text-[11px] text-stone-500">8×5 ft (40 sq.ft.)</div>
                                <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
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
                                className="w-4 h-4 rounded text-amber-500 bg-stone-900 border-stone-700"
                              />
                              <span className="text-stone-300 font-medium">
                                Active in Customer Door Calculator
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-700">
                          <button
                            onClick={() => setEditingMaterial(null)}
                            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold transition-colors"
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
                            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-md transition-colors flex items-center gap-1.5"
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
                          <div className="p-8 text-center bg-stone-900/50 rounded-2xl border border-stone-800 text-stone-400">
                            <TreePine className="w-8 h-8 mx-auto mb-2 text-stone-600" />
                            <p className="text-sm font-semibold text-stone-300">No wood materials found</p>
                            <p className="text-xs text-stone-500 mt-1">Try clearing your search query or add a new wood species.</p>
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
                                    ? 'bg-stone-850/90 border-stone-700/80 hover:border-amber-500/40 shadow-sm'
                                    : 'bg-stone-900/60 border-stone-800/60 opacity-75'
                                }`}
                              >
                                <div>
                                  {/* Card Header */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                        <TreePine className="w-4 h-4 text-amber-400" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-white text-sm sm:text-base leading-tight">
                                          {mat.name}
                                        </h4>
                                        <span className="text-[10px] text-stone-400">Timber Rate</span>
                                      </div>
                                    </div>

                                    {/* Status toggle pill */}
                                    <button
                                      onClick={() => handleToggleMaterialStatus(mat)}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                                        mat.active
                                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60'
                                          : 'bg-stone-800 text-stone-400 border-stone-700 hover:bg-stone-700'
                                      }`}
                                      title="Click to toggle status"
                                    >
                                      {mat.active ? '✓ Active' : 'Disabled'}
                                    </button>
                                  </div>

                                  {/* Price Section */}
                                  <div className="mt-3.5 p-3 rounded-xl bg-stone-900/90 border border-stone-800">
                                    {quickEditMaterialId === mat.id ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                                          <span>Quick Edit Rate:</span>
                                          <button
                                            onClick={() => setQuickEditMaterialId(null)}
                                            className="text-stone-400 hover:text-white"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-amber-400 font-mono font-bold text-sm">₹</span>
                                          <input
                                            type="number"
                                            value={quickEditMaterialRate}
                                            onChange={e => setQuickEditMaterialRate(Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-amber-500/50 text-amber-300 font-mono font-bold text-sm"
                                            autoFocus
                                          />
                                        </div>
                                        <div className="flex items-center justify-between gap-1.5 pt-1">
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => setQuickEditMaterialRate(prev => Math.max(50, prev - 50))}
                                              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                            >
                                              -₹50
                                            </button>
                                            <button
                                              onClick={() => setQuickEditMaterialRate(prev => prev + 50)}
                                              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                            >
                                              +₹50
                                            </button>
                                          </div>
                                          <button
                                            onClick={() => handleQuickUpdateMaterialRate(mat.id, quickEditMaterialRate)}
                                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                                          >
                                            Save ₹
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-xl sm:text-2xl font-mono font-black text-amber-400">
                                              ₹{mat.ratePerSqFt}
                                            </span>
                                            <span className="text-[11px] text-stone-400 font-medium">/ sq.ft.</span>
                                          </div>
                                          <div className="text-[10px] text-stone-400 mt-0.5">
                                            Standard 7×3 ft Door ≈ <strong className="text-stone-300 font-mono">₹{(mat.ratePerSqFt * 21).toLocaleString('en-IN')}</strong>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => {
                                            setQuickEditMaterialId(mat.id);
                                            setQuickEditMaterialRate(mat.ratePerSqFt);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
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
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                                      Specifications & Grain:
                                    </span>
                                    <p className="text-xs text-stone-300 leading-relaxed bg-stone-900/40 p-2.5 rounded-xl border border-stone-800/60 min-h-[3.5rem]">
                                      {mat.description || 'No description provided.'}
                                    </p>
                                  </div>
                                </div>

                                {/* Full Action Buttons (Clean & Prominent on Mobile) */}
                                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center gap-2">
                                  <button
                                    onClick={() => setEditingMaterial(mat)}
                                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
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
                                    className="p-2 rounded-xl bg-stone-800 hover:bg-red-950/50 text-stone-400 hover:text-red-300 border border-stone-700/80 hover:border-red-800/60 transition-colors"
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
                        <div className="border border-stone-800 rounded-2xl overflow-hidden bg-stone-900/50 text-xs shadow-lg">
                          <div className="overflow-x-auto w-full">
                            <table className="w-full text-left min-w-[680px]">
                              <thead className="bg-stone-950 text-stone-400 border-b border-stone-800">
                                <tr>
                                  <th className="p-3.5 font-bold">Wood Material</th>
                                  <th className="p-3.5 font-bold">Rate (₹/sq.ft.)</th>
                                  <th className="p-3.5 font-bold">7×3 ft Door Est.</th>
                                  <th className="p-3.5 font-bold">Description & Specs</th>
                                  <th className="p-3.5 font-bold">Status</th>
                                  <th className="p-3.5 font-bold text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-800/60">
                                {filteredMaterials.map(mat => (
                                  <tr key={mat.id} className="hover:bg-stone-800/40 transition-colors">
                                    <td className="p-3.5 font-bold text-stone-100 flex items-center gap-2">
                                      <TreePine className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                      <span>{mat.name}</span>
                                    </td>
                                    <td className="p-3.5">
                                      {quickEditMaterialId === mat.id ? (
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="number"
                                            value={quickEditMaterialRate}
                                            onChange={e => setQuickEditMaterialRate(Number(e.target.value))}
                                            className="w-20 px-2 py-1 rounded bg-stone-800 border border-amber-500 text-amber-300 font-mono font-bold text-xs"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleQuickUpdateMaterialRate(mat.id, quickEditMaterialRate)}
                                            className="px-2 py-1 rounded bg-amber-500 text-stone-950 font-bold text-[10px]"
                                          >
                                            ✓
                                          </button>
                                          <button
                                            onClick={() => setQuickEditMaterialId(null)}
                                            className="px-1.5 py-1 text-stone-400 hover:text-white text-[10px]"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-bold text-amber-400 text-sm">
                                            ₹{mat.ratePerSqFt}
                                          </span>
                                          <button
                                            onClick={() => {
                                              setQuickEditMaterialId(mat.id);
                                              setQuickEditMaterialRate(mat.ratePerSqFt);
                                            }}
                                            className="text-[10px] text-stone-400 hover:text-amber-400 underline"
                                          >
                                            edit
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3.5 font-mono text-stone-300 text-xs">
                                      ₹{(mat.ratePerSqFt * 21).toLocaleString('en-IN')}
                                    </td>
                                    <td className="p-3.5 text-stone-300 max-w-xs">
                                      <p className="line-clamp-2">{mat.description || '-'}</p>
                                    </td>
                                    <td className="p-3.5">
                                      <button
                                        onClick={() => handleToggleMaterialStatus(mat)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                          mat.active
                                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                            : 'bg-stone-800 text-stone-400 border-stone-700'
                                        }`}
                                      >
                                        {mat.active ? 'Active' : 'Disabled'}
                                      </button>
                                    </td>
                                    <td className="p-3.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => setEditingMaterial(mat)}
                                          className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 font-semibold text-xs flex items-center gap-1"
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
                                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-red-950/60 text-stone-400 hover:text-red-300 border border-stone-700"
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
                        <p className="text-xs text-stone-400">
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
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add Finish Option
                      </button>
                    </div>

                    {/* Edit Form */}
                    {editingFinish && (
                      <div className="p-4 rounded-xl bg-stone-800 border border-stone-700 space-y-3 text-xs">
                        <div className="flex justify-between items-center font-bold text-amber-400 border-b border-stone-700 pb-2">
                          <span>{editingFinish.id ? 'Edit Polish Finish' : 'Add Polish Option'}</span>
                          <button onClick={() => setEditingFinish(null)}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-stone-300 mb-1">Finish Name</label>
                            <input
                              type="text"
                              value={editingFinish.name || ''}
                              onChange={e => setEditingFinish({ ...editingFinish, name: e.target.value })}
                              placeholder="e.g. PU Italian Finish, Melamine Matt"
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                            />
                          </div>
                          <div>
                            <label className="block text-stone-300 mb-1">Rate (₹)</label>
                            <input
                              type="number"
                              value={editingFinish.ratePerSqFt || 0}
                              onChange={e => setEditingFinish({ ...editingFinish, ratePerSqFt: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100 font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-stone-300 mb-1">Description</label>
                            <input
                              type="text"
                              value={editingFinish.description || ''}
                              onChange={e => setEditingFinish({ ...editingFinish, description: e.target.value })}
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-stone-700">
                          <button onClick={() => setEditingFinish(null)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300">Cancel</button>
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
                            className="px-4 py-1.5 rounded bg-amber-600 text-stone-950 font-bold"
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
                          className="p-4 rounded-2xl bg-stone-850 border border-stone-750 flex flex-col justify-between text-xs space-y-3 shadow-sm hover:border-amber-500/40 transition-all"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                  <Sparkles className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                  <div className="font-bold text-stone-100 text-sm">{fin.name}</div>
                                  <div className="text-[10px] text-stone-400">Polish Finish Option</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${fin.active !== false ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-stone-800 text-stone-400 border-stone-700'}`}>
                                {fin.active !== false ? 'Active' : 'Disabled'}
                              </span>
                            </div>

                            {/* Price & Quick Edit */}
                            <div className="mt-3 p-3 rounded-xl bg-stone-900/90 border border-stone-800">
                              {quickEditFinishId === fin.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                                    <span>Quick Edit Finish Rate:</span>
                                    <button onClick={() => setQuickEditFinishId(null)} className="text-stone-400 hover:text-white">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-amber-400 font-mono font-bold text-sm">₹</span>
                                    <input
                                      type="number"
                                      value={quickEditFinishRate}
                                      onChange={e => setQuickEditFinishRate(Number(e.target.value))}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-amber-500/50 text-amber-300 font-mono font-bold text-sm"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5 pt-1">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setQuickEditFinishRate(prev => Math.max(0, prev - 25))}
                                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                      >
                                        -₹25
                                      </button>
                                      <button
                                        onClick={() => setQuickEditFinishRate(prev => prev + 25)}
                                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                      >
                                        +₹25
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => handleQuickUpdateFinishRate(fin.id, quickEditFinishRate)}
                                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                                    >
                                      Save ₹
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-lg font-mono font-bold text-amber-400">
                                        {fin.ratePerSqFt > 0 ? `₹${fin.ratePerSqFt}` : 'Free / Included'}
                                      </span>
                                      {fin.ratePerSqFt > 0 && <span className="text-[11px] text-stone-400">/ sq.ft.</span>}
                                    </div>
                                    {fin.ratePerSqFt > 0 && (
                                      <div className="text-[10px] text-stone-400 mt-0.5">
                                        Standard 21 sq.ft. door ≈ <strong className="text-stone-300 font-mono">₹{(fin.ratePerSqFt * 21).toLocaleString('en-IN')}</strong>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => {
                                      setQuickEditFinishId(fin.id);
                                      setQuickEditFinishRate(fin.ratePerSqFt);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit ₹</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                                Details & Spec:
                              </span>
                              <p className="text-xs text-stone-300 bg-stone-900/40 p-2.5 rounded-xl border border-stone-800/60">
                                {fin.description || 'No specific finish description.'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-stone-800 flex items-center gap-2">
                            <button
                              onClick={() => setEditingFinish(fin)}
                              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
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
                              className="p-2 rounded-xl bg-stone-800 hover:bg-red-950/60 text-stone-400 hover:text-red-300 border border-stone-700"
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

                {/* 5. DOOR FRAMES (CHAUKHAT) (Section 15) */}
                {activeTab === 'frames' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-white">
                          Door Frames (Chaukhat) Fixed Pricing
                        </h3>
                        <p className="text-xs text-stone-400">
                          Configure Chaukhat prices: Normal Frame (₹3,500), Designer Frame (₹11,025), Hand Carving Frame (₹11,637)
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setEditingFrame({
                            name: '',
                            price: 3500,
                            description: '',
                            active: true,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add Frame Option
                      </button>
                    </div>

                    {/* Edit Frame Form */}
                    {editingFrame && (
                      <div className="p-4 rounded-xl bg-stone-800 border border-stone-700 space-y-3 text-xs">
                        <div className="flex justify-between items-center font-bold text-amber-400 border-b border-stone-700 pb-2">
                          <span>{editingFrame.id ? 'Edit Frame Price' : 'Add Chaukhat Frame'}</span>
                          <button onClick={() => setEditingFrame(null)}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-stone-300 mb-1">Frame Design Name</label>
                            <input
                              type="text"
                              value={editingFrame.name || ''}
                              onChange={e => setEditingFrame({ ...editingFrame, name: e.target.value })}
                              placeholder="e.g. Hand Carving Frame"
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                            />
                          </div>
                          <div>
                            <label className="block text-stone-300 mb-1">Fixed Price (₹)</label>
                            <input
                              type="number"
                              value={editingFrame.price || 0}
                              onChange={e => setEditingFrame({ ...editingFrame, price: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100 font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-stone-300 mb-1">Description / Section Size</label>
                            <input
                              type="text"
                              value={editingFrame.description || ''}
                              onChange={e => setEditingFrame({ ...editingFrame, description: e.target.value })}
                              placeholder="e.g. 5x3 inch section with stepped moldings"
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-stone-700">
                          <button onClick={() => setEditingFrame(null)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300">Cancel</button>
                          <button
                            onClick={async () => {
                              if (!editingFrame.name) return;
                              if (editingFrame.id) {
                                await updateFrame(editingFrame.id, editingFrame);
                              } else {
                                await createFrame(editingFrame);
                              }
                              setEditingFrame(null);
                              loadData();
                              onDataUpdated();
                              showToast('Frame saved successfully');
                            }}
                            className="px-4 py-1.5 rounded bg-amber-600 text-stone-950 font-bold"
                          >
                            Save Frame
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {frames.map(frm => (
                        <div
                          key={frm.id}
                          className="p-4 rounded-2xl bg-stone-850 border border-stone-750 flex flex-col justify-between text-xs space-y-3 shadow-sm hover:border-amber-500/40 transition-all"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                  <Layers className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                  <div className="font-bold text-stone-100 text-sm">{frm.name}</div>
                                  <div className="text-[10px] text-stone-400">Chaukhat Frame</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${frm.active !== false ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-stone-800 text-stone-400 border-stone-700'}`}>
                                {frm.active !== false ? 'Active' : 'Disabled'}
                              </span>
                            </div>

                            {/* Price & Quick Edit */}
                            <div className="mt-3 p-3 rounded-xl bg-stone-900/90 border border-stone-800">
                              {quickEditFrameId === frm.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                                    <span>Quick Edit Frame Price:</span>
                                    <button onClick={() => setQuickEditFrameId(null)} className="text-stone-400 hover:text-white">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-amber-400 font-mono font-bold text-sm">₹</span>
                                    <input
                                      type="number"
                                      value={quickEditFramePrice}
                                      onChange={e => setQuickEditFramePrice(Number(e.target.value))}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-amber-500/50 text-amber-300 font-mono font-bold text-sm"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5 pt-1">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setQuickEditFramePrice(prev => Math.max(0, prev - 250))}
                                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                      >
                                        -₹250
                                      </button>
                                      <button
                                        onClick={() => setQuickEditFramePrice(prev => prev + 250)}
                                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                      >
                                        +₹250
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => handleQuickUpdateFramePrice(frm.id, quickEditFramePrice)}
                                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                                    >
                                      Save ₹
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-lg font-mono font-bold text-amber-400">
                                        {frm.price > 0 ? `₹${frm.price.toLocaleString('en-IN')}` : '₹0 (No Frame)'}
                                      </span>
                                      <span className="text-[11px] text-stone-400">/ frame</span>
                                    </div>
                                    <div className="text-[10px] text-stone-400 mt-0.5">
                                      Fixed Chaukhat add-on in quotation
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setQuickEditFrameId(frm.id);
                                      setQuickEditFramePrice(frm.price);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit ₹</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                                Section / Description:
                              </span>
                              <p className="text-xs text-stone-300 bg-stone-900/40 p-2.5 rounded-xl border border-stone-800/60">
                                {frm.description || 'Standard door frame section.'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-stone-800 flex items-center gap-2">
                            <button
                              onClick={() => setEditingFrame(frm)}
                              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Price & Details</span>
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`Delete frame ${frm.name}?`)) {
                                  await deleteFrame(frm.id);
                                  await loadData();
                                  onDataUpdated();
                                  showToast('Frame deleted');
                                }
                              }}
                              className="p-2 rounded-xl bg-stone-800 hover:bg-red-950/60 text-stone-400 hover:text-red-300 border border-stone-700"
                              title="Delete Frame"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. HARDWARE & ALDROPS (Section 15) */}
                {activeTab === 'hardware' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-white">
                          Hardware & Aldrop Rates
                        </h3>
                        <p className="text-xs text-stone-400">
                          Aldrop Single (₹700), Heavy Aldrop (₹1,300), Antique Heavy (₹1,700), Mortise lock sets
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setEditingHardware({
                            name: '',
                            price: 700,
                            description: '',
                            defaultQty: 1,
                            active: true,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add Hardware Item
                      </button>
                    </div>

                    {/* Edit Form */}
                    {editingHardware && (
                      <div className="p-4 rounded-xl bg-stone-800 border border-stone-700 space-y-3 text-xs">
                        <div className="flex justify-between items-center font-bold text-amber-400 border-b border-stone-700 pb-2">
                          <span>{editingHardware.id ? 'Edit Hardware Item' : 'Add Hardware Item'}</span>
                          <button onClick={() => setEditingHardware(null)}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-stone-300 mb-1">Hardware Name</label>
                            <input
                              type="text"
                              value={editingHardware.name || ''}
                              onChange={e => setEditingHardware({ ...editingHardware, name: e.target.value })}
                              placeholder="e.g. Heavy Aldrop Kit"
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                            />
                          </div>
                          <div>
                            <label className="block text-stone-300 mb-1">Unit Price (₹)</label>
                            <input
                              type="number"
                              value={editingHardware.price || 0}
                              onChange={e => setEditingHardware({ ...editingHardware, price: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100 font-mono"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-stone-300 mb-1">Description</label>
                            <input
                              type="text"
                              value={editingHardware.description || ''}
                              onChange={e => setEditingHardware({ ...editingHardware, description: e.target.value })}
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-stone-700">
                          <button onClick={() => setEditingHardware(null)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300">Cancel</button>
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
                              showToast('Hardware updated');
                            }}
                            className="px-4 py-1.5 rounded bg-amber-600 text-stone-950 font-bold"
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
                          className="p-4 rounded-2xl bg-stone-850 border border-stone-750 flex flex-col justify-between text-xs space-y-3 shadow-sm hover:border-amber-500/40 transition-all"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                  <Lock className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                  <div className="font-bold text-stone-100 text-sm">{hwd.name}</div>
                                  <div className="text-[10px] text-stone-400">Hardware & Fitting Accessory</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${hwd.active !== false ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-stone-800 text-stone-400 border-stone-700'}`}>
                                {hwd.active !== false ? 'Active' : 'Disabled'}
                              </span>
                            </div>

                            {/* Price & Quick Edit */}
                            <div className="mt-3 p-3 rounded-xl bg-stone-900/90 border border-stone-800">
                              {quickEditHardwareId === hwd.id ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] text-stone-400">
                                    <span>Quick Edit Hardware Price:</span>
                                    <button onClick={() => setQuickEditHardwareId(null)} className="text-stone-400 hover:text-white">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-amber-400 font-mono font-bold text-sm">₹</span>
                                    <input
                                      type="number"
                                      value={quickEditHardwarePrice}
                                      onChange={e => setQuickEditHardwarePrice(Number(e.target.value))}
                                      className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-amber-500/50 text-amber-300 font-mono font-bold text-sm"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5 pt-1">
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setQuickEditHardwarePrice(prev => Math.max(0, prev - 50))}
                                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                      >
                                        -₹50
                                      </button>
                                      <button
                                        onClick={() => setQuickEditHardwarePrice(prev => prev + 50)}
                                        className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] font-mono text-stone-300"
                                      >
                                        +₹50
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => handleQuickUpdateHardwarePrice(hwd.id, quickEditHardwarePrice)}
                                      className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                                    >
                                      Save ₹
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-lg font-mono font-bold text-amber-400">
                                        {hwd.price > 0 ? `₹${hwd.price.toLocaleString('en-IN')}` : '₹0'}
                                      </span>
                                      <span className="text-[11px] text-stone-400">/ unit</span>
                                    </div>
                                    <div className="text-[10px] text-stone-400 mt-0.5">
                                      Default Qty: {hwd.defaultQty || 1}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setQuickEditHardwareId(hwd.id);
                                      setQuickEditHardwarePrice(hwd.price);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 border border-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit ₹</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                                Description & Details:
                              </span>
                              <p className="text-xs text-stone-300 bg-stone-900/40 p-2.5 rounded-xl border border-stone-800/60">
                                {hwd.description || 'Hardware & lock accessory specification.'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-stone-800 flex items-center gap-2">
                            <button
                              onClick={() => setEditingHardware(hwd)}
                              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
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
                              className="p-2 rounded-xl bg-stone-800 hover:bg-red-950/60 text-stone-400 hover:text-red-300 border border-stone-700"
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

                {/* 7. HOME BANNERS (Section 16) */}
                {activeTab === 'banners' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-serif text-xl font-bold text-white">
                          Home Slider Banners
                        </h3>
                        <p className="text-xs text-stone-400">
                          Upload banner artwork, headline, subtitle, button text, and destination
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setEditingBanner({
                            title: '',
                            subtitle: '',
                            image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
                            buttonText: 'Calculate Door Price',
                            buttonAction: 'calculator',
                            order: banners.length + 1,
                            active: true,
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Banner
                      </button>
                    </div>

                    {/* Edit Banner */}
                    {editingBanner && (
                      <div className="p-4 rounded-xl bg-stone-800 border border-stone-700 space-y-3 text-xs">
                        <div className="flex justify-between items-center font-bold text-amber-400 border-b border-stone-700 pb-2">
                          <span>{editingBanner.id ? 'Edit Banner' : 'Create Banner'}</span>
                          <button onClick={() => setEditingBanner(null)}><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-stone-300 mb-1">Headline Title</label>
                            <input
                              type="text"
                              value={editingBanner.title || ''}
                              onChange={e => setEditingBanner({ ...editingBanner, title: e.target.value })}
                              placeholder="e.g. Master Handcrafted Sagwan Doors"
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-300 mb-1">Subtitle</label>
                            <input
                              type="text"
                              value={editingBanner.subtitle || ''}
                              onChange={e => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                              placeholder="e.g. Direct factory rates and seasoned timber"
                              className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-300 mb-1">Banner Image (Direct Upload)</label>
                            <div className="flex items-center gap-3">
                              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5">
                                <Upload className="w-3.5 h-3.5" />
                                {uploadingImage ? 'Uploading...' : 'Upload Image File'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={uploadingImage}
                                  onChange={e =>
                                    handleFileUploadHelper(e, url => setEditingBanner({ ...editingBanner, image: url }))
                                  }
                                  className="hidden"
                                />
                              </label>
                              {editingBanner.image && (
                                <img src={editingBanner.image} alt="" className="w-20 h-10 object-cover rounded border border-stone-700" />
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-stone-300 mb-1">Button Label</label>
                              <input
                                type="text"
                                value={editingBanner.buttonText || ''}
                                onChange={e => setEditingBanner({ ...editingBanner, buttonText: e.target.value })}
                                className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                              />
                            </div>
                            <div>
                              <label className="block text-stone-300 mb-1">Button Action</label>
                              <select
                                value={editingBanner.buttonAction || 'calculator'}
                                onChange={e => setEditingBanner({ ...editingBanner, buttonAction: e.target.value })}
                                className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                              >
                                <option value="calculator">Open Price Calculator</option>
                                <option value="gallery">Open Door Gallery</option>
                                <option value="whatsapp">Open WhatsApp Enquiry</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-stone-700">
                          <button onClick={() => setEditingBanner(null)} className="px-3 py-1.5 rounded bg-stone-700 text-stone-300">Cancel</button>
                          <button
                            onClick={async () => {
                              if (!editingBanner.title) return;
                              if (editingBanner.id) {
                                await updateBanner(editingBanner.id, editingBanner);
                              } else {
                                await createBanner(editingBanner);
                              }
                              setEditingBanner(null);
                              loadData();
                              onDataUpdated();
                              showToast('Banner saved');
                            }}
                            className="px-4 py-1.5 rounded bg-amber-600 text-stone-950 font-bold"
                          >
                            Save Banner
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Banner cards */}
                    <div className="space-y-3">
                      {banners.map(b => (
                        <div key={b.id} className="p-3 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <img src={b.image} alt="" className="w-24 h-14 object-cover rounded bg-stone-900 border border-stone-700" />
                            <div>
                              <div className="font-bold text-stone-100">{b.title}</div>
                              <div className="text-stone-400 text-[11px] line-clamp-1">{b.subtitle}</div>
                              <div className="text-amber-400 text-[10px] mt-0.5 font-medium">Button: "{b.buttonText}" → {b.buttonAction}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setEditingBanner(b)} className="p-1.5 rounded bg-stone-700 text-stone-200">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm('Delete this banner?')) {
                                  await deleteBanner(b.id);
                                  loadData();
                                  onDataUpdated();
                                  showToast('Banner deleted');
                                }
                              }}
                              className="p-1.5 rounded bg-red-900/40 text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                        <p className="text-xs text-stone-400">
                          Review all estimates generated by customers with full breakdown and contact details
                        </p>
                      </div>
                    </div>

                    {quotes.length > 0 ? (
                      <div className="border border-stone-800 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-stone-950 text-stone-400 border-b border-stone-800">
                            <tr>
                              <th className="p-3">Ref No.</th>
                              <th className="p-3">Customer</th>
                              <th className="p-3">Door / Size</th>
                              <th className="p-3">Material & Frame</th>
                              <th className="p-3">Total Amount</th>
                              <th className="p-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-800/60">
                            {quotes.map(q => (
                              <tr key={q.id} className="hover:bg-stone-800/40">
                                <td className="p-3 font-mono font-bold text-amber-400">{q.quoteNumber}</td>
                                <td className="p-3">
                                  <div className="font-bold text-stone-100">{q.customerName}</div>
                                  <div className="text-stone-400 font-mono">{q.customerPhone}</div>
                                  {q.customerCity && <div className="text-[10px] text-stone-500">{q.customerCity}</div>}
                                </td>
                                <td className="p-3">
                                  <div className="font-medium text-stone-200">{q.doorName}</div>
                                  <div className="text-stone-400 font-mono">{q.widthInch}" × {q.heightInch}" ({q.sqFt.toFixed(2)})</div>
                                </td>
                                <td className="p-3 text-stone-300">
                                  <div>{q.materialName} ({q.finishName})</div>
                                  <div className="text-[10px] text-stone-400">{q.frameName}</div>
                                </td>
                                <td className="p-3 font-mono font-bold text-amber-400 text-sm">
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
                      <div className="p-8 text-center text-stone-400 text-xs bg-stone-800/40 rounded-xl border border-stone-800">
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
                      <p className="text-xs text-stone-400">
                        Configure brand name, phone, official WhatsApp inquiry routing number, and quotation terms
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-stone-800 border border-stone-700 space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        <div>
                          <label className="block font-semibold text-stone-300 mb-1">Business Name</label>
                          <input
                            type="text"
                            value={settings.businessName}
                            onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-stone-300 mb-1">Tagline</label>
                          <input
                            type="text"
                            value={settings.tagline}
                            onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
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
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-emerald-600/50 text-emerald-300 font-mono"
                          />
                          <span className="text-[10px] text-stone-400 mt-1 block">
                            Official customer WhatsApp number (e.g. 7887412884). Customer WhatsApp actions route via +91 {settings.whatsappNumber}.
                          </span>
                        </div>

                        {/* Google Maps Location URL */}
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-amber-400" />
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
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-amber-600/50 text-amber-200 font-mono text-xs sm:text-sm"
                          />
                          <span className="text-[10px] text-stone-400 mt-1 block">
                            Direct Google Maps link opened by the "View Shop Location" buttons across Contact Us, About Us, and Footer.
                          </span>
                        </div>

                        <div>
                          <label className="block font-semibold text-stone-300 mb-1">Display Contact Phone</label>
                          <input
                            type="text"
                            value={settings.phone}
                            onChange={e => setSettings({ ...settings, phone: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-stone-300 mb-1">Contact Email</label>
                          <input
                            type="email"
                            value={settings.email}
                            onChange={e => setSettings({ ...settings, email: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-stone-300 mb-1">GST Number</label>
                          <input
                            type="text"
                            value={settings.gstNumber || ''}
                            onChange={e => setSettings({ ...settings, gstNumber: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100 font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-stone-300 mb-1">Factory / Workshop Address</label>
                          <input
                            type="text"
                            value={settings.address}
                            onChange={e => setSettings({ ...settings, address: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-stone-300 mb-1">Quotation Ref Prefix</label>
                          <input
                            type="text"
                            value={settings.quotePrefix}
                            onChange={e => setSettings({ ...settings, quotePrefix: e.target.value })}
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-stone-300 mb-1">Tax / Additional Charge % (Optional)</label>
                          <input
                            type="number"
                            value={settings.additionalChargePercentage || 0}
                            onChange={e => setSettings({ ...settings, additionalChargePercentage: Number(e.target.value) })}
                            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100 font-mono"
                          />
                        </div>

                        {/* Admin Password Change */}
                        <div className="sm:col-span-2 pt-2 border-t border-stone-700">
                          <label className="block font-semibold text-amber-400 mb-1">
                            Update Admin Security Key (Password)
                          </label>
                          <input
                            type="text"
                            placeholder="Leave blank to keep current password, or enter new password"
                            id="change-admin-password-input"
                            className="w-full max-w-sm px-3 py-2 rounded bg-stone-900 border border-stone-700 text-stone-100 font-mono"
                          />
                        </div>

                      </div>

                      <div className="flex justify-end pt-3 border-t border-stone-700">
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
                          className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-md"
                        >
                          Save Business Settings
                        </button>
                      </div>
                    </div>

                    {/* Content Protection & Anti-Copy System Card */}
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                              Content Protection & Anti-Copy System
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Active Guard
                              </span>
                            </h3>
                            <p className="text-xs text-stone-400 mt-0.5">
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
                          className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save Protection Settings
                        </button>
                      </div>

                      {/* Technical Platform Transparency Notice */}
                      <div className="rounded-xl bg-amber-950/20 border border-amber-500/30 p-4 text-xs text-amber-200/90 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-300">
                            Platform Security Architecture Notice
                          </p>
                          <p className="text-stone-300 text-[11px] leading-relaxed">
                            <strong>Web / PWA:</strong> Browsers do not provide an operating-system API to guarantee 100% screenshot prevention. Our web layer blocks right-click saving, drag-to-desktop, print-to-PDF scraping, direct image URL exposure, and PrintScreen clipboard capture.
                          </p>
                          <p className="text-emerald-300 text-[11px] leading-relaxed">
                            <strong>Native Android:</strong> Hardware-level <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">WindowManager.LayoutParams.FLAG_SECURE</code> is fully implemented in the Android native wrapper. When enabled, Android SurfaceFlinger hardware blocks screenshots, screen recording, and app switcher thumbnails across all protected customer screens.
                          </p>
                        </div>
                      </div>

                      {/* Controls Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Core Image Protection */}
                        <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                                Image Download Protection
                              </span>
                              <p className="text-[11px] text-stone-400 mt-0.5">
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
                              <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                          </div>

                          <div className="border-t border-stone-800/80 pt-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                  Dynamic Brand Watermark
                                </span>
                                <p className="text-[11px] text-stone-400 mt-0.5">
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
                                <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                              </label>
                            </div>
                          </div>

                          {/* Watermark Config Fields */}
                          <div className="space-y-3 pt-2 border-t border-stone-800/80">
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-300 mb-1">
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
                                className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs font-medium focus:border-amber-500 outline-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-stone-300 mb-1">
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
                                  className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:border-amber-500 outline-none"
                                >
                                  <option value="diagonal">Diagonal Repeated Grid</option>
                                  <option value="center">Center Artisan Crest</option>
                                  <option value="repeated">Matrix Grid Pattern</option>
                                  <option value="corner">Discreet Corner Stamp</option>
                                </select>
                              </div>

                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <label className="text-[11px] font-semibold text-stone-300">
                                    Opacity
                                  </label>
                                  <span className="text-[11px] font-mono text-amber-400">
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
                                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-700 rounded-lg"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 2. Android Native & Preview */}
                        <div className="space-y-4">
                          {/* Android Native Flags */}
                          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-4 space-y-3">
                            <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                              Android Native Protections (FLAG_SECURE)
                            </span>

                            <div className="flex items-center justify-between pt-1">
                              <div>
                                <p className="text-xs text-stone-300 font-medium">Screenshot Protection</p>
                                <p className="text-[10px] text-stone-400">Blanks OS screenshots in native Android build.</p>
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
                                <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>

                            <div className="flex items-center justify-between border-t border-stone-800/80 pt-2">
                              <div>
                                <p className="text-xs text-stone-300 font-medium">Screen Recording Protection</p>
                                <p className="text-[10px] text-stone-400">Blocks screen recording capture &amp; recent task previews.</p>
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
                                <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                          </div>

                          {/* Live Watermark Interactive Preview */}
                          <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                                Live Customer View Preview
                              </span>
                              <span className="text-[10px] text-stone-400 font-mono">
                                Pattern: {settings.contentProtection?.watermarkPattern || 'diagonal'}
                              </span>
                            </div>

                            <div className="h-36 rounded-lg overflow-hidden border border-stone-700 relative">
                              <ProtectedImage
                                src={doors[0]?.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'}
                                alt="Watermark Preview"
                                watermarkSettings={settings.contentProtection || DEFAULT_CONTENT_PROTECTION}
                                showWatermark={settings.contentProtection?.enableWatermark ?? true}
                                className="w-full h-full object-cover"
                                containerClassName="w-full h-full"
                              />
                            </div>
                            <p className="text-[10px] text-stone-400 mt-2 text-center">
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

              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
