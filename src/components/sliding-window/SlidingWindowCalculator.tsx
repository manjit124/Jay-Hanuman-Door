import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calculator,
  Maximize2,
  Sliders,
  Layers,
  FolderOpen,
  User,
  LogOut,
  LogIn,
  UserPlus,
  Plus,
  Save,
  Download,
  FileSpreadsheet,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Lock,
  Camera,
  FileImage,
} from 'lucide-react';
import type {
  BusinessSettings,
  CustomerAccount,
  FabricationProfile,
  NotebookScanProjectRecord,
  SlidingTrackType,
  SlidingWindowCalculationResult,
  SlidingWindowInput,
  SlidingWindowProject,
  SlidingWindowUserSettings,
  WindowMeasurementUnit,
} from '../../types.ts';
import {
  createDefaultFabricationProfiles,
  GLASS_THICKNESS_OPTIONS,
  WINDOW_CONFIGURATION_OPTIONS,
} from '../../data/slidingWindowDefaults.ts';
import { formatMeasurement } from '../../lib/slidingWindowEngine.ts';
import {
  downloadSlidingWindowCuttingPDF,
  downloadTechnicalDrawingsPDF,
  exportSlidingWindowExcelCSV,
} from '../../lib/slidingWindowExport.ts';
import {
  initOrLoadSlidingWorkspace,
  loginFabricatorAccount,
  registerFabricatorAccount,
  logoutFabricatorAccount,
  createFabricationProfileApi,
  updateFabricationProfileApi,
  duplicateFabricationProfileApi,
  setDefaultFabricationProfileApi,
  resetFabricationProfileApi,
  deleteFabricationProfileApi,
  saveSlidingWindowSettingsApi,
  saveSlidingWindowProjectApi,
  deleteSlidingWindowProjectApi,
  calculateSlidingWindowsServerApi,
  type FabricatorIdentity,
} from '../../lib/slidingWindowApi.ts';
import { FabricationSettingsView } from './FabricationSettingsView.tsx';
import { BulkWindowEntryTable } from './BulkWindowEntryTable.tsx';
import { CuttingListReportView } from './CuttingListReportView.tsx';
import { WindowTechnicalDrawing } from './WindowTechnicalDrawing.tsx';
import { SlidingWindowIcon } from './SlidingWindowIcon.tsx';
import { NotebookPhotoScannerModal } from './NotebookPhotoScannerModal.tsx';
import { MeasurementInput } from './MeasurementInput.tsx';
import { adMobService } from '../../lib/admob/admobService.ts';
import { AdMobBannerSlot } from '../admob/AdMobBannerSlot.tsx';

export type SlidingWindowWorkspaceTab = 'single' | 'bulk' | 'settings' | 'projects';

interface SlidingWindowCalculatorProps {
  settings: BusinessSettings;
  initialTab?: SlidingWindowWorkspaceTab;
  scannerLaunchToken?: number;
  onTabChange?: (tab: SlidingWindowWorkspaceTab) => void;
  onSwitchToDoorCalculator?: () => void;
  onSwitchToChaukhatCalculator?: () => void;
  currentCustomer?: CustomerAccount | null;
  onRequireCalculationLogin?: (resumeAction: () => void | Promise<void>) => void;
}

type WorkspaceTab = SlidingWindowWorkspaceTab;

function createWindowId(prefix = 'win'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const SlidingWindowCalculator: React.FC<SlidingWindowCalculatorProps> = ({
  settings,
  initialTab = 'single',
  scannerLaunchToken = 0,
  onTabChange,
  onSwitchToDoorCalculator,
  onSwitchToChaukhatCalculator,
  currentCustomer,
  onRequireCalculationLogin,
}) => {
  // Workspace Persistence & Auth State
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(true);
  const [identity, setIdentity] = useState<FabricatorIdentity | null>(null);
  const [profiles, setProfiles] = useState<FabricationProfile[]>(() =>
    createDefaultFabricationProfiles('guest')
  );
  const [userSettings, setUserSettings] = useState<SlidingWindowUserSettings>({
    ownerId: 'guest',
    defaultUnit: 'inch',
    default2TrackProfileId: 'profile-2-track-standard',
    default3TrackProfileId: 'profile-3-track-standard',
    showMmReference: true,
    updatedAt: new Date().toISOString(),
  });
  const [savedProjects, setSavedProjects] = useState<SlidingWindowProject[]>([]);

  // Active Navigation Tab
  const [activeTab, setActiveTabState] = useState<WorkspaceTab>(initialTab);
  useEffect(() => {
    setActiveTabState(initialTab);
  }, [initialTab]);

  const setActiveTab = useCallback(
    (tab: WorkspaceTab) => {
      setActiveTabState(tab);
      if (onTabChange) onTabChange(tab);
    },
    [onTabChange]
  );

  const [selectedSettingsProfileId, setSelectedSettingsProfileId] = useState<string>(
    'profile-2-track-standard'
  );

  // Project Metadata (shared across Single & Bulk workflows)
  const [projectName, setProjectName] = useState<string>('Site Window Fabrication');
  const [customerName, setCustomerName] = useState<string>('');

  // Single Window Input State (Section 1)
  const [singleWindow, setSingleWindow] = useState<SlidingWindowInput>({
    id: 'single-w1',
    windowNumber: 'W1',
    width: 36,
    height: 48,
    unit: 'inch',
    trackType: '2-track',
    configuration: '2 Glass Panels',
    glassThickness: '5mm Clear / Toughened',
    mosquitoNetRequired: false,
    profileId: 'profile-2-track-standard',
    notes: '',
  });
  const [singleResult, setSingleResult] = useState<SlidingWindowCalculationResult | null>(null);

  // Bulk Project State (Section 7)
  const [bulkWindows, setBulkWindows] = useState<SlidingWindowInput[]>([
    {
      id: 'bulk-w1',
      windowNumber: 'W1',
      width: 36,
      height: 48,
      unit: 'inch',
      trackType: '2-track',
      configuration: '2 Glass Panels',
      glassThickness: '5mm Clear / Toughened',
      mosquitoNetRequired: false,
      profileId: 'profile-2-track-standard',
    },
    {
      id: 'bulk-w2',
      windowNumber: 'W2',
      width: 48,
      height: 48,
      unit: 'inch',
      trackType: '3-track',
      configuration: '2 Glass + 1 Mosquito Net',
      glassThickness: '5mm Clear / Toughened',
      mosquitoNetRequired: true,
      profileId: 'profile-3-track-standard',
    },
  ]);
  const [bulkResultsById, setBulkResultsById] = useState<
    Record<string, SlidingWindowCalculationResult>
  >({});

  // Saved Project Viewer State
  const [viewingProject, setViewingProject] = useState<SlidingWindowProject | null>(null);

  // Active Bulk Row Technical Drawing Modal
  const [activeDrawingResult, setActiveDrawingResult] =
    useState<SlidingWindowCalculationResult | null>(null);

  // AI Notebook Photo Scanner Modal & Attached Scan Record
  const [showNotebookScanner, setShowNotebookScanner] = useState<boolean>(false);
  const [activeNotebookScan, setActiveNotebookScan] =
    useState<NotebookScanProjectRecord | null>(null);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Action Status Banner
  const [statusNotice, setStatusNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isSavingProject, setIsSavingProject] = useState<boolean>(false);
  const [isCalculatingSingle, setIsCalculatingSingle] = useState<boolean>(false);
  const [isCalculatingBulk, setIsCalculatingBulk] = useState<boolean>(false);

  // Refs synced with latest user measurements so auto-calculation after OTP login uses exact preserved values
  const singleWindowRef = useRef<SlidingWindowInput>(singleWindow);
  const bulkWindowsRef = useRef<SlidingWindowInput[]>(bulkWindows);
  useEffect(() => {
    singleWindowRef.current = singleWindow;
  }, [singleWindow]);
  useEffect(() => {
    bulkWindowsRef.current = bulkWindows;
  }, [bulkWindows]);

  // Immediately clear all displayed calculation results when customer logs out
  useEffect(() => {
    if (!currentCustomer) {
      setSingleResult(null);
      setBulkResultsById({});
      setActiveDrawingResult(null);
      setViewingProject(null);
      setShowNotebookScanner(false);
    }
  }, [currentCustomer]);

  // Launch Photo Measurement Scanner when triggered from Home screen
  const lastScannerTokenRef = useRef<number>(0);
  useEffect(() => {
    if (scannerLaunchToken > 0 && scannerLaunchToken !== lastScannerTokenRef.current) {
      lastScannerTokenRef.current = scannerLaunchToken;
      if (!currentCustomer && onRequireCalculationLogin) {
        onRequireCalculationLogin(() => {
          setShowNotebookScanner(true);
        });
      } else {
        setShowNotebookScanner(true);
      }
    }
  }, [scannerLaunchToken, currentCustomer, onRequireCalculationLogin]);

  const showNotice = useCallback((type: 'success' | 'error', message: string) => {
    setStatusNotice({ type, message });
    window.setTimeout(() => {
      setStatusNotice(prev => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const getDefaultProfileForTrack = useCallback(
    (track: SlidingTrackType, profileList: FabricationProfile[], uSettings?: SlidingWindowUserSettings) => {
      const preferredId =
        track === '3-track'
          ? uSettings?.default3TrackProfileId
          : uSettings?.default2TrackProfileId;
      return (
        profileList.find(p => p.id === preferredId && p.trackType === track) ||
        profileList.find(p => p.trackType === track && p.isDefault) ||
        profileList.find(p => p.trackType === track) ||
        profileList[0]
      );
    },
    []
  );

  // Hydrate workspace on mount
  const hydrateFromPayload = useCallback(
    (payload: {
      identity: FabricatorIdentity;
      profiles: FabricationProfile[];
      settings: SlidingWindowUserSettings;
      projects: SlidingWindowProject[];
    }) => {
      const loadedProfiles =
        payload.profiles && payload.profiles.length > 0
          ? payload.profiles
          : createDefaultFabricationProfiles(payload.identity?.ownerId || 'guest');
      setIdentity(payload.identity);
      setProfiles(loadedProfiles);
      setUserSettings(payload.settings);
      setSavedProjects(payload.projects || []);

      const def2 = getDefaultProfileForTrack('2-track', loadedProfiles, payload.settings);
      const def3 = getDefaultProfileForTrack('3-track', loadedProfiles, payload.settings);

      if (def2) {
        setSelectedSettingsProfileId(prev =>
          loadedProfiles.some(p => p.id === prev) ? prev : def2.id
        );
      }

      setSingleWindow(prev => {
        const targetDef = prev.trackType === '3-track' ? def3 : def2;
        const exists = loadedProfiles.some(p => p.id === prev.profileId);
        return {
          ...prev,
          unit: payload.settings?.defaultUnit || prev.unit,
          profileId: exists ? prev.profileId : targetDef?.id || loadedProfiles[0].id,
        };
      });

      setBulkWindows(prev =>
        prev.map(w => {
          const exists = loadedProfiles.some(p => p.id === w.profileId);
          if (exists) return w;
          const targetDef = w.trackType === '3-track' ? def3 : def2;
          return { ...w, profileId: targetDef?.id || loadedProfiles[0].id };
        })
      );

      // Do NOT pre-compute or render calculation results on load; calculations run only after
      // verified mobile OTP login via the protected server endpoint.
    },
    [getDefaultProfileForTrack]
  );

  useEffect(() => {
    let mounted = true;
    initOrLoadSlidingWorkspace()
      .then(payload => {
        if (mounted) {
          hydrateFromPayload(payload);
          setLoadingWorkspace(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setLoadingWorkspace(false);
          const fallbackDefaults = createDefaultFabricationProfiles('guest');
          setProfiles(fallbackDefaults);
          showNotice('error', err?.message || 'Offline mode active: loaded default fabrication rules.');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Resolve profile helper
  const resolveProfile = useCallback(
    (win: SlidingWindowInput): FabricationProfile | null => {
      return (
        profiles.find(p => p.id === win.profileId) ||
        getDefaultProfileForTrack(win.trackType, profiles, userSettings) ||
        null
      );
    },
    [profiles, userSettings, getDefaultProfileForTrack]
  );

  // Single Window Handlers
  const handleSingleTrackChange = (nextTrack: SlidingTrackType) => {
    const defProfile = getDefaultProfileForTrack(nextTrack, profiles, userSettings);
    const nextConfig = WINDOW_CONFIGURATION_OPTIONS[nextTrack][0];
    setSingleWindow(prev => ({
      ...prev,
      trackType: nextTrack,
      configuration: nextConfig,
      mosquitoNetRequired: nextTrack === '3-track',
      profileId: defProfile?.id || prev.profileId,
    }));
  };

  useEffect(() => {
    adMobService.preloadInterstitial(settings?.adSettings);
  }, [settings?.adSettings]);

  const runServerSingleCalculation = async () => {
    const winToCalc = singleWindowRef.current;
    setIsCalculatingSingle(true);
    try {
      const results = await calculateSlidingWindowsServerApi([winToCalc]);
      const result = results[0];
      if (!result) {
        showNotice('error', 'Server did not return a calculation result. Please try again.');
        return;
      }
      setSingleResult(result);
      if (!result.isValid) {
        showNotice('error', result.errors[0] || 'Check window inputs and profile rules.');
      } else {
        showNotice('success', `Calculated fabrication cutting sizes for ${winToCalc.windowNumber}.`);
        // Non-intrusive post-calculation interstitial (strictly respects 3-min frequency cap and Premium status)
        window.setTimeout(() => {
          adMobService
            .showPlacementInterstitial('sliding_window', () => {}, settings?.adSettings)
            .catch(() => {});
        }, 350);
      }
    } catch (err: any) {
      if (err?.code === 'CUSTOMER_AUTH_REQUIRED' || err?.status === 401) {
        setSingleResult(null);
        if (onRequireCalculationLogin) {
          onRequireCalculationLogin(() => runServerSingleCalculation());
          return;
        }
      }
      showNotice('error', err?.message || 'Could not calculate fabrication cutting sizes.');
    } finally {
      setIsCalculatingSingle(false);
    }
  };

  const handleCalculateSingleWindow = () => {
    if (!currentCustomer && onRequireCalculationLogin) {
      onRequireCalculationLogin(() => runServerSingleCalculation());
      return;
    }
    void runServerSingleCalculation();
  };

  const handleAddSingleToBulk = () => {
    const nextIndex = bulkWindows.length + 1;
    const newItem: SlidingWindowInput = {
      ...singleWindow,
      id: createWindowId('bulk'),
      windowNumber: singleWindow.windowNumber || `W${nextIndex}`,
    };
    setBulkWindows(prev => [...prev, newItem]);
    setSingleWindow(prev => ({
      ...prev,
      windowNumber: `W${nextIndex + 1}`,
    }));
    showNotice('success', `Added ${newItem.windowNumber} to Bulk Project list.`);
  };

  // Bulk Window Handlers
  const handleAddBulkWindows = (count: number) => {
    const startIdx = bulkWindows.length;
    const def2 = getDefaultProfileForTrack('2-track', profiles, userSettings);
    const last = bulkWindows[bulkWindows.length - 1];
    const additions: SlidingWindowInput[] = [];
    for (let i = 0; i < count; i++) {
      additions.push({
        id: createWindowId('bulk'),
        windowNumber: `W${startIdx + i + 1}`,
        width: last?.width || 36,
        height: last?.height || 48,
        unit: last?.unit || userSettings.defaultUnit || 'inch',
        trackType: last?.trackType || '2-track',
        configuration: last?.configuration || '2 Glass Panels',
        glassThickness: last?.glassThickness || '5mm Clear',
        mosquitoNetRequired: last?.mosquitoNetRequired ?? false,
        profileId: last?.profileId || def2?.id || profiles[0]?.id || '',
      });
    }
    setBulkWindows(prev => [...prev, ...additions]);
  };

  const handleUpdateBulkWindow = (id: string, updates: Partial<SlidingWindowInput>) => {
    setBulkWindows(prev => prev.map(w => (w.id === id ? { ...w, ...updates } : w)));
  };

  const handleDuplicateBulkWindow = (id: string) => {
    const source = bulkWindows.find(w => w.id === id);
    if (!source) return;
    const copy: SlidingWindowInput = {
      ...source,
      id: createWindowId('bulk'),
      windowNumber: `W${bulkWindows.length + 1}`,
    };
    setBulkWindows(prev => [...prev, copy]);
    showNotice('success', `Duplicated ${source.windowNumber} as ${copy.windowNumber}.`);
  };

  const handleDeleteBulkWindow = (id: string) => {
    if (bulkWindows.length <= 1) return;
    setBulkWindows(prev => prev.filter(w => w.id !== id));
    setBulkResultsById(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const runServerBulkSingleCalculation = async (id: string, openDrawingAfter = false) => {
    const target = bulkWindowsRef.current.find(w => w.id === id);
    if (!target) return;
    setIsCalculatingBulk(true);
    try {
      const results = await calculateSlidingWindowsServerApi([target]);
      const calc = results[0];
      if (!calc) return;
      setBulkResultsById(prev => ({ ...prev, [id]: calc }));
      if (!calc.isValid) {
        showNotice('error', `${target.windowNumber}: ${calc.errors[0]}`);
        return;
      }
      if (openDrawingAfter) {
        setActiveDrawingResult(calc);
      }
    } catch (err: any) {
      if (err?.code === 'CUSTOMER_AUTH_REQUIRED' || err?.status === 401) {
        if (onRequireCalculationLogin) {
          onRequireCalculationLogin(() => runServerBulkSingleCalculation(id, openDrawingAfter));
          return;
        }
      }
      showNotice('error', err?.message || 'Could not calculate window fabrication sizes.');
    } finally {
      setIsCalculatingBulk(false);
    }
  };

  const handleCalculateBulkSingle = (id: string) => {
    if (!currentCustomer && onRequireCalculationLogin) {
      onRequireCalculationLogin(() => runServerBulkSingleCalculation(id, false));
      return;
    }
    void runServerBulkSingleCalculation(id, false);
  };

  const handleOpenBulkDrawing = (id: string) => {
    if (!currentCustomer && onRequireCalculationLogin) {
      onRequireCalculationLogin(() => runServerBulkSingleCalculation(id, true));
      return;
    }
    void runServerBulkSingleCalculation(id, true);
  };

  const handleExportAllDrawings = async (resultsList: SlidingWindowCalculationResult[], projName: string, custName: string) => {
    const valid = resultsList.filter(r => r.isValid);
    if (valid.length === 0) {
      showNotice('error', 'Calculate at least one valid window before exporting drawings.');
      return;
    }
    try {
      await downloadTechnicalDrawingsPDF({
        projectName: projName,
        customerName: custName,
        results: valid,
        settings,
      });
      showNotice('success', `Exported ${valid.length} technical window drawing${valid.length === 1 ? '' : 's'} into PDF.`);
    } catch (err: any) {
      showNotice('error', err?.message || 'Could not export technical drawings PDF.');
    }
  };

  const runServerBulkAllCalculation = async () => {
    const windowsList = bulkWindowsRef.current;
    if (windowsList.length === 0) return;
    setIsCalculatingBulk(true);
    try {
      const results = await calculateSlidingWindowsServerApi(windowsList);
      const nextMap: Record<string, SlidingWindowCalculationResult> = {};
      let validCount = 0;
      let errorCount = 0;
      results.forEach((calc, idx) => {
        const winId = calc.windowId || windowsList[idx]?.id;
        if (winId) nextMap[winId] = calc;
        if (calc.isValid) validCount++;
        else errorCount++;
      });
      setBulkResultsById(nextMap);
      if (errorCount > 0) {
        showNotice(
          'error',
          `Calculated ${validCount} valid windows; ${errorCount} window(s) need attention.`
        );
      } else {
        showNotice('success', `Calculated cutting sizes for all ${validCount} windows.`);
      }
      if (validCount > 0) {
        window.setTimeout(() => {
          adMobService
            .showPlacementInterstitial('sliding_window', () => {}, settings?.adSettings)
            .catch(() => {});
        }, 350);
      }
    } catch (err: any) {
      if (err?.code === 'CUSTOMER_AUTH_REQUIRED' || err?.status === 401) {
        setBulkResultsById({});
        if (onRequireCalculationLogin) {
          onRequireCalculationLogin(() => runServerBulkAllCalculation());
          return;
        }
      }
      showNotice('error', err?.message || 'Could not calculate bulk windows.');
    } finally {
      setIsCalculatingBulk(false);
    }
  };

  const handleCalculateBulkAll = () => {
    if (!currentCustomer && onRequireCalculationLogin) {
      onRequireCalculationLogin(() => runServerBulkAllCalculation());
      return;
    }
    void runServerBulkAllCalculation();
  };

  const orderedBulkResults = useMemo(() => {
    if (!currentCustomer) return [];
    return bulkWindows
      .map(w => bulkResultsById[w.id])
      .filter((r): r is SlidingWindowCalculationResult => Boolean(r));
  }, [bulkWindows, bulkResultsById, currentCustomer]);

  const hasValidBulkResults = useMemo(
    () => orderedBulkResults.some(r => r.isValid),
    [orderedBulkResults]
  );

  // Open AI Notebook Photo Scanner (requires verified mobile OTP login)
  const handleOpenNotebookScanner = () => {
    if (!currentCustomer && onRequireCalculationLogin) {
      onRequireCalculationLogin(() => setShowNotebookScanner(true));
      return;
    }
    setShowNotebookScanner(true);
  };

  // Handle confirmed measurements from AI Notebook Photo Scanner -> Server Calculation Engine
  const handleNotebookScanConfirmed = async (payload: {
    projectName: string;
    customerName: string;
    windows: SlidingWindowInput[];
    notebookScan: NotebookScanProjectRecord;
  }) => {
    setProjectName(payload.projectName);
    setCustomerName(payload.customerName);
    setActiveNotebookScan(payload.notebookScan);
    setBulkWindows(payload.windows);
    bulkWindowsRef.current = payload.windows;
    if (payload.windows.length === 1) {
      setSingleWindow(payload.windows[0]);
      singleWindowRef.current = payload.windows[0];
    }
    setShowNotebookScanner(false);
    setActiveTab('bulk');

    const computeScanned = async () => {
      try {
        const results = await calculateSlidingWindowsServerApi(payload.windows);
        const nextMap: Record<string, SlidingWindowCalculationResult> = {};
        let validCount = 0;
        let invalidCount = 0;
        results.forEach((calc, idx) => {
          const winId = calc.windowId || payload.windows[idx]?.id;
          if (winId) nextMap[winId] = calc;
          if (calc.isValid) validCount++;
          else invalidCount++;
        });
        setBulkResultsById(nextMap);
        if (payload.windows.length === 1 && nextMap[payload.windows[0].id]) {
          setSingleResult(nextMap[payload.windows[0].id]);
        }
        if (invalidCount > 0) {
          showNotice(
            'error',
            `Loaded ${payload.windows.length} scanned windows: ${validCount} calculated, ${invalidCount} need size/rule review.`
          );
        } else {
          showNotice(
            'success',
            `Calculated ${validCount} verified window${
              validCount === 1 ? '' : 's'
            } from ${payload.notebookScan.pages.length} notebook page${
              payload.notebookScan.pages.length === 1 ? '' : 's'
            }. Click Save Project to store photos & cutting list.`
          );
        }
      } catch (err: any) {
        if (err?.code === 'CUSTOMER_AUTH_REQUIRED' || err?.status === 401) {
          if (onRequireCalculationLogin) {
            onRequireCalculationLogin(() => computeScanned());
            return;
          }
        }
        showNotice('error', err?.message || 'Could not calculate scanned windows.');
      }
    };

    if (!currentCustomer && onRequireCalculationLogin) {
      onRequireCalculationLogin(() => computeScanned());
      return;
    }
    await computeScanned();
  };

  // Save Project (works from either Single or Bulk tab)
  const handleSaveProject = async (windowsToSave: SlidingWindowInput[]) => {
    if (windowsToSave.length === 0) return;
    if (!currentCustomer && onRequireCalculationLogin) {
      onRequireCalculationLogin(() => handleSaveProject(windowsToSave));
      return;
    }
    setIsSavingProject(true);
    try {
      const saved = await saveSlidingWindowProjectApi({
        projectName: projectName.trim() || 'Window Fabrication Project',
        customerName: customerName.trim(),
        defaultUnit: userSettings.defaultUnit || 'inch',
        windows: windowsToSave,
        notebookScan: activeNotebookScan || undefined,
      });
      setSavedProjects(prev => [saved, ...prev]);
      // Sync bulk results if saving bulk windows
      if (windowsToSave === bulkWindows) {
        const resMap: Record<string, SlidingWindowCalculationResult> = {};
        saved.results.forEach(r => {
          resMap[r.windowId] = r;
        });
        setBulkResultsById(resMap);
      }
      showNotice(
        'success',
        `Saved project "${saved.projectName}" (${saved.results.length} window${
          saved.results.length === 1 ? '' : 's'
        })${
          saved.notebookScan
            ? ` with ${saved.notebookScan.pages.length} scanned notebook photo${
                saved.notebookScan.pages.length === 1 ? '' : 's'
              }`
            : ''
        } and locked rule snapshot.`
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'Failed to save project.');
    } finally {
      setIsSavingProject(false);
    }
  };

  // Profile Management Handlers (Section 5 & 6)
  const handleCreateProfile = async (payload: Partial<FabricationProfile>) => {
    setIsSavingProfile(true);
    try {
      const created = await createFabricationProfileApi(payload);
      setProfiles(prev => [...prev, created]);
      setSelectedSettingsProfileId(created.id);
      showNotice('success', `Created new profile "${created.name}".`);
    } catch (err: any) {
      showNotice('error', err?.message || 'Could not create profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdateProfile = async (id: string, updates: Partial<FabricationProfile>) => {
    setIsSavingProfile(true);
    try {
      const updated = await updateFabricationProfileApi(id, updates);
      setProfiles(prev => prev.map(p => (p.id === id ? updated : p)));
      // Re-calculate active single preview on server ONLY if already authenticated & displayed
      if (singleWindow.profileId === id) {
        if (currentCustomer && singleResult) {
          void runServerSingleCalculation();
        } else {
          setSingleResult(null);
        }
      }
      showNotice('success', `Saved changes to "${updated.name}". Old saved projects remain unchanged.`);
    } catch (err: any) {
      showNotice('error', err?.message || 'Could not save profile changes.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDuplicateProfile = async (id: string, newName?: string) => {
    setIsSavingProfile(true);
    try {
      const copy = await duplicateFabricationProfileApi(id, newName);
      setProfiles(prev => [...prev, copy]);
      setSelectedSettingsProfileId(copy.id);
      showNotice('success', `Duplicated profile as "${copy.name}".`);
    } catch (err: any) {
      showNotice('error', err?.message || 'Could not duplicate profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    setIsSavingProfile(true);
    try {
      const remaining = await deleteFabricationProfileApi(id);
      setProfiles(remaining);
      if (selectedSettingsProfileId === id && remaining[0]) {
        setSelectedSettingsProfileId(remaining[0].id);
      }
      showNotice('success', 'Profile deleted.');
    } catch (err: any) {
      showNotice('error', err?.message || 'Could not delete profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSetDefaultProfile = async (id: string) => {
    setIsSavingProfile(true);
    try {
      const res = await setDefaultFabricationProfileApi(id);
      setProfiles(res.profiles);
      setUserSettings(prev => ({
        ...prev,
        default2TrackProfileId:
          res.profile.trackType === '2-track' ? res.profile.id : prev.default2TrackProfileId,
        default3TrackProfileId:
          res.profile.trackType === '3-track' ? res.profile.id : prev.default3TrackProfileId,
      }));
      showNotice('success', `"${res.profile.name}" is now your default ${res.profile.trackType} profile.`);
    } catch (err: any) {
      showNotice('error', err?.message || 'Could not set default profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResetProfile = async (id: string) => {
    setIsSavingProfile(true);
    try {
      const reset = await resetFabricationProfileApi(id);
      setProfiles(prev => prev.map(p => (p.id === id ? reset : p)));
      if (singleWindow.profileId === id) {
        if (currentCustomer && singleResult) {
          void runServerSingleCalculation();
        } else {
          setSingleResult(null);
        }
      }
      showNotice('success', `Reset "${reset.name}" to standard factory defaults.`);
    } catch (err: any) {
      showNotice('error', err?.message || 'Could not reset profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleMmReference = async () => {
    const nextVal = !userSettings.showMmReference;
    setUserSettings(prev => ({ ...prev, showMmReference: nextVal }));
    try {
      await saveSlidingWindowSettingsApi({ showMmReference: nextVal });
    } catch {
      // Non-blocking preference save
    }
  };

  // Fabricator Account Auth Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const payload =
        authMode === 'register'
          ? await registerFabricatorAccount({
              name: authName.trim(),
              email: authEmail.trim(),
              password: authPassword,
            })
          : await loginFabricatorAccount({
              email: authEmail.trim(),
              password: authPassword,
            });
      hydrateFromPayload(payload);
      setShowAuthModal(false);
      setAuthPassword('');
      showNotice(
        'success',
        authMode === 'register'
          ? `Account created for ${payload.identity.name}. Your profiles and projects are privately isolated.`
          : `Signed in as ${payload.identity.name}. Loaded ${payload.profiles.length} profiles and ${payload.projects.length} saved projects.`
      );
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const payload = await logoutFabricatorAccount();
      hydrateFromPayload(payload);
      setViewingProject(null);
      showNotice('success', 'Signed out. Switched to a clean guest workspace.');
    } catch (err: any) {
      showNotice('error', err?.message || 'Could not sign out.');
    }
  };

  const handleDeleteSavedProject = async (id: string) => {
    try {
      await deleteSlidingWindowProjectApi(id);
      setSavedProjects(prev => prev.filter(p => p.id !== id));
      if (viewingProject?.id === id) setViewingProject(null);
      showNotice('success', 'Saved project deleted.');
    } catch (err: any) {
      showNotice('error', err?.message || 'Could not delete project.');
    }
  };

  const handleLoadProjectIntoBulk = (proj: SlidingWindowProject) => {
    setProjectName(proj.projectName);
    setCustomerName(proj.customerName || '');
    setBulkWindows(proj.windows.map(w => ({ ...w })));
    setActiveNotebookScan(proj.notebookScan || null);
    const map: Record<string, SlidingWindowCalculationResult> = {};
    proj.results.forEach(r => {
      map[r.windowId] = r;
    });
    setBulkResultsById(map);
    setActiveTab('bulk');
    showNotice('success', `Loaded "${proj.projectName}" into Bulk Windows workspace.`);
  };

  const singleTrackProfiles = profiles.filter(p => p.trackType === singleWindow.trackType);
  const singleConfigOptions = WINDOW_CONFIGURATION_OPTIONS[singleWindow.trackType];

  return (
    <div className="min-h-screen bg-white text-[#0F172A] pb-24">
      {/* Top WindowCut Pro Calculator Switcher Bar */}
      <div className="bg-[#0A2540] text-white border-b border-[#1E3A5F] sticky top-[60px] sm:top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col lg:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#F97316] font-bold uppercase tracking-wider whitespace-nowrap">
              WindowCut Pro
            </span>
            <span className="text-slate-500">/</span>
            <span className="font-semibold text-slate-100">
              Sliding Window Fabrication Calculator
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center bg-[#0F2F52] p-1 rounded-xl border border-[#1E3A5F] text-xs gap-1">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-[#0B5ED7] text-white font-bold flex items-center gap-1.5 whitespace-nowrap cursor-default"
            >
              <SlidingWindowIcon className="w-3.5 h-3.5" />
              <span>Sliding Window</span>
            </button>

            {onSwitchToDoorCalculator && (
              <button
                type="button"
                onClick={onSwitchToDoorCalculator}
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium whitespace-nowrap cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Shutter Estimator</span>
              </button>
            )}

            {onSwitchToChaukhatCalculator && (
              <button
                type="button"
                onClick={onSwitchToChaukhatCalculator}
                className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium whitespace-nowrap cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Frame Estimator</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Page Header + Fabricator Workspace Account Strip */}
        <div className="pb-5 mb-5 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0B5ED7] mb-1">
              WindowCut Pro · Aluminium &amp; Glass Engineering
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A2540] tracking-tight">
              Sliding Window Fabrication Calculator
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] mt-1 max-w-2xl">
              Calculate Top Track, Bottom Track, Bearing Position, Handle, Interlock, Glass Cutting Size, and Mosquito Net dimensions using your editable 2-Track and 3-Track fabrication profiles.
            </p>
          </div>

          {/* Fabricator Account Strip */}
          <div className="flex flex-wrap items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2 pr-2 border-r border-[#E2E8F0]">
              <User className="w-4 h-4 text-[#0B5ED7]" />
              <div className="text-xs">
                <div className="font-semibold text-[#0A2540]">
                  {loadingWorkspace ? 'Loading workspace...' : identity?.name || 'Guest Fabricator'}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  {identity?.role === 'user' || identity?.role === 'admin'
                    ? identity.email || 'Authenticated Workspace'
                    : 'Sign in to keep profiles across devices'}
                </div>
              </div>
            </div>

            {identity?.role === 'user' ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#FEF3F2] text-[#B42318] border border-[#E2E8F0] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                    setShowAuthModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A2540] hover:bg-[#0B5ED7] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F97316]" />
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                    setShowAuthModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#EFF6FF] text-[#0A2540] border border-[#BFDBFE] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#0B5ED7]" />
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Feedback Banner */}
        {statusNotice && (
          <div
            className={`mb-5 px-4 py-3 rounded-lg border flex items-center justify-between gap-3 text-xs font-medium ${
              statusNotice.type === 'success'
                ? 'bg-[#F0F9F4] border-[#B7E4C7] text-[#0F5132]'
                : 'bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="p-0.5 hover:opacity-70 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary Calculation Modes + Prominent Photo Measurement Scanner CTA */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            id="sw-mode-single"
            type="button"
            onClick={() => setActiveTab('single')}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
              activeTab === 'single'
                ? 'bg-[#0A2540] text-white border-[#0A2540]'
                : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:border-[#0B5ED7]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'single'
                    ? 'bg-[#0B5ED7] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#0B5ED7]'
                }`}
              >
                <SlidingWindowIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">Sliding Window Size Calculator</div>
                <div className={`text-[11px] truncate ${activeTab === 'single' ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  Glass, Track, Bearing &amp; Mosquito Net sizes
                </div>
              </div>
            </div>
            <ArrowRight
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'single' ? 'text-[#F97316]' : 'text-[#94A3B8]'
              }`}
            />
          </button>

          <button
            id="sw-mode-bulk"
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
              activeTab === 'bulk'
                ? 'bg-[#0A2540] text-white border-[#0A2540]'
                : 'bg-[#F8FAFC] text-[#0F172A] border-[#E2E8F0] hover:border-[#0B5ED7]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  activeTab === 'bulk'
                    ? 'bg-[#0B5ED7] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#0B5ED7]'
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">
                  Bulk Window Calculator ({bulkWindows.length})
                </div>
                <div className={`text-[11px] truncate ${activeTab === 'bulk' ? 'text-slate-300' : 'text-[#64748B]'}`}>
                  50+ windows batch table, PDF &amp; Excel export
                </div>
              </div>
            </div>
            <ArrowRight
              className={`w-4 h-4 shrink-0 ${
                activeTab === 'bulk' ? 'text-[#F97316]' : 'text-[#94A3B8]'
              }`}
            />
          </button>

          <button
            id="sw-scan-notebook-ai-btn"
            type="button"
            onClick={handleOpenNotebookScanner}
            className="p-3.5 rounded-xl border border-[#F97316] bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#0A2540] text-left transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[64px]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#F97316] text-white flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-extrabold tracking-tight text-[#0A2540] truncate">
                  Photo Measurement Scanner
                </div>
                <div className="text-[11px] text-[#C2410C] truncate">
                  Scan handwritten site notebook sizes with AI
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 text-[#F97316]" />
          </button>
        </div>

        {/* Connected Module Navigation Tabs + MM Reference Toggle */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              id="sw-tab-single"
              type="button"
              onClick={() => setActiveTab('single')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-[#0B5ED7] text-white'
                  : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EFF6FF] hover:text-[#0B5ED7]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Single Window
            </button>

            <button
              id="sw-tab-bulk"
              type="button"
              onClick={() => setActiveTab('bulk')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'bulk'
                  ? 'bg-[#0B5ED7] text-white'
                  : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EFF6FF] hover:text-[#0B5ED7]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Bulk Window ({bulkWindows.length})
            </button>

            <button
              id="sw-tab-settings"
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#0B5ED7] text-white'
                  : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EFF6FF] hover:text-[#0B5ED7]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Fabrication Settings ({profiles.length})
            </button>

            <button
              id="sw-tab-projects"
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-[#0B5ED7] text-white'
                  : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#EFF6FF] hover:text-[#0B5ED7]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Saved Projects ({savedProjects.length})
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-[#475569] cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={userSettings.showMmReference}
              onChange={handleToggleMmReference}
              className="rounded border-[#CBD5E1] accent-[#0B5ED7]"
            />
            Show MM / Inch dual reference
          </label>
        </div>

        {/* ================================================================ */}
        {/* TAB 1: SINGLE WINDOW CALCULATOR                                  */}
        {/* ================================================================ */}
        {activeTab === 'single' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Window Input Form (Section 1) */}
            <div className="lg:col-span-5 bg-white border border-[#E5E5E5] rounded-xl overflow-hidden">
              <div className="px-5 py-4 bg-[#F8F8F6] border-b border-[#E5E5E5] flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#1A1A1A]">Window Measurements &amp; Spec</h2>
                  <p className="text-[11px] text-[#666666]">
                    Enter exact site opening size and select your calculation profile
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="text-[11px] font-semibold text-[#C89211] hover:underline whitespace-nowrap cursor-pointer"
                >
                  Edit Rules →
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Project & Customer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      placeholder="e.g. Sharma Residence"
                      className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                    />
                  </div>
                </div>

                {/* Window Number + Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                      Window Number
                    </label>
                    <input
                      type="text"
                      value={singleWindow.windowNumber}
                      onChange={e =>
                        setSingleWindow(prev => ({ ...prev, windowNumber: e.target.value }))
                      }
                      placeholder="W1"
                      className="w-full px-3 py-2 text-xs font-mono font-semibold border border-[#DCDCDC] rounded-lg text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                      Measurement Unit
                    </label>
                    <select
                      value={singleWindow.unit}
                      onChange={e =>
                        setSingleWindow(prev => ({
                          ...prev,
                          unit: e.target.value as WindowMeasurementUnit,
                        }))
                      }
                      className="w-full px-3 py-2 text-xs font-semibold border border-[#DCDCDC] rounded-lg text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                    >
                      <option value="inch">Inch (")</option>
                      <option value="feet">Feet (ft)</option>
                      <option value="mm">Millimeter (mm)</option>
                    </select>
                  </div>
                </div>

                {/* Window Width & Height */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                      Window Width ({singleWindow.unit})
                    </label>
                    <MeasurementInput
                      value={singleWindow.width}
                      unit={singleWindow.unit}
                      ariaLabel={`Window Width (${singleWindow.unit})`}
                      placeholder={singleWindow.unit === 'inch' ? 'e.g. 36 1/2 or 36.500' : 'Width'}
                      showConversionHint={singleWindow.unit === 'inch'}
                      onValueChange={val =>
                        setSingleWindow(prev => ({
                          ...prev,
                          width: val ?? 0,
                        }))
                      }
                      className="w-full px-3 py-2.5 text-base font-mono tabular-nums font-bold border border-[#DCDCDC] rounded-lg text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                      Window Height ({singleWindow.unit})
                    </label>
                    <MeasurementInput
                      value={singleWindow.height}
                      unit={singleWindow.unit}
                      ariaLabel={`Window Height (${singleWindow.unit})`}
                      placeholder={singleWindow.unit === 'inch' ? 'e.g. 42 3/8 or 42.375' : 'Height'}
                      showConversionHint={singleWindow.unit === 'inch'}
                      onValueChange={val =>
                        setSingleWindow(prev => ({
                          ...prev,
                          height: val ?? 0,
                        }))
                      }
                      className="w-full px-3 py-2.5 text-base font-mono tabular-nums font-bold border border-[#DCDCDC] rounded-lg text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                    />
                  </div>
                </div>

                {/* Window Type (2 Track / 3 Track) */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1.5">
                    Window Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSingleTrackChange('2-track')}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                        singleWindow.trackType === '2-track'
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'bg-white text-[#444444] border-[#DCDCDC] hover:bg-[#F8F8F6]'
                      }`}
                    >
                      2 Track Sliding
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSingleTrackChange('3-track')}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                        singleWindow.trackType === '3-track'
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'bg-white text-[#444444] border-[#DCDCDC] hover:bg-[#F8F8F6]'
                      }`}
                    >
                      3 Track Sliding
                    </button>
                  </div>
                </div>

                {/* Calculation Profile Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                    Active Fabrication Profile
                  </label>
                  <select
                    value={singleWindow.profileId}
                    onChange={e =>
                      setSingleWindow(prev => ({ ...prev, profileId: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-xs font-semibold border border-[#DCDCDC] rounded-lg text-[#1A1A1A] bg-[#F8F8F6] focus:outline-none focus:border-[#C89211]"
                  >
                    {(singleTrackProfiles.length > 0 ? singleTrackProfiles : profiles).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Window Configuration + Glass Thickness */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                      Window Configuration
                    </label>
                    <select
                      value={singleWindow.configuration}
                      onChange={e =>
                        setSingleWindow(prev => ({ ...prev, configuration: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                    >
                      {singleConfigOptions.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                      Glass Thickness
                    </label>
                    <select
                      value={singleWindow.glassThickness}
                      onChange={e =>
                        setSingleWindow(prev => ({ ...prev, glassThickness: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C89211]"
                    >
                      {GLASS_THICKNESS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mosquito Net Required: Yes / No */}
                <div className="flex items-center justify-between py-2.5 px-3.5 rounded-lg bg-[#F8F8F6] border border-[#E5E5E5]">
                  <div>
                    <div className="text-xs font-semibold text-[#1A1A1A]">Mosquito Net Required</div>
                    <div className="text-[11px] text-[#666666]">
                      Calculates independent mosquito net width &amp; height rules
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSingleWindow(prev => ({ ...prev, mosquitoNetRequired: true }))
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        singleWindow.mosquitoNetRequired
                          ? 'bg-[#0B5ED7] text-white'
                          : 'bg-white text-[#555555] border border-[#DCDCDC]'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSingleWindow(prev => ({ ...prev, mosquitoNetRequired: false }))
                      }
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                        !singleWindow.mosquitoNetRequired
                          ? 'bg-[#1A1A1A] text-white'
                          : 'bg-white text-[#555555] border border-[#DCDCDC]'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="pt-2 space-y-2.5">
                  <button
                    id="btn-calculate-single-window"
                    type="button"
                    disabled={isCalculatingSingle}
                    onClick={handleCalculateSingleWindow}
                    className="w-full py-3 px-4 rounded-lg bg-[#0B5ED7] hover:bg-[#084BB3] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
                  >
                    <Calculator className="w-4 h-4" />
                    {isCalculatingSingle ? 'Calculating Cutting Sizes...' : 'Calculate Fabrication Sizes'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleAddSingleToBulk}
                      className="py-2 px-3 rounded-lg bg-white hover:bg-[#EFF6FF] text-[#0A2540] border border-[#BFDBFE] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#0B5ED7]" />
                      Add to Bulk Project
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveProject([singleWindow])}
                      disabled={isSavingProject}
                      className="py-2 px-3 rounded-lg bg-[#0A2540] hover:bg-[#06182B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5 text-[#F97316]" />
                      {isSavingProject ? 'Saving...' : 'Save Calculation'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Authenticated Calculation Report (Section 8) */}
            <div className="lg:col-span-7">
              {currentCustomer && singleResult ? (
                <CuttingListReportView
                  results={[singleResult]}
                  projectName={projectName}
                  customerName={customerName}
                  settings={settings}
                  showMmReference={userSettings.showMmReference}
                  onDownloadPdf={() => {
                    if (singleResult?.isValid) {
                      downloadSlidingWindowCuttingPDF({
                        projectName,
                        customerName,
                        results: [singleResult],
                        settings,
                      });
                    }
                  }}
                  onExportExcel={() => {
                    if (singleResult?.isValid) {
                      exportSlidingWindowExcelCSV({
                        projectName,
                        customerName,
                        results: [singleResult],
                      });
                    }
                  }}
                />
              ) : (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center mx-auto">
                    {currentCustomer ? (
                      <Calculator className="w-6 h-6 text-[#0B5ED7]" />
                    ) : (
                      <Lock className="w-6 h-6 text-[#F97316]" />
                    )}
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-[#0A2540]">
                      {currentCustomer
                        ? 'Ready to Calculate Cutting Sizes'
                        : 'Fabrication Cutting List Locked'}
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {currentCustomer
                        ? `Entered opening ${singleWindow.windowNumber}: ${singleWindow.width} × ${singleWindow.height} ${singleWindow.unit} (${singleWindow.trackType}). Click "Calculate Fabrication Sizes" to generate your cutting dimensions, bearing positions, and technical drawing.`
                        : `Your window measurements (${singleWindow.width} × ${singleWindow.height} ${singleWindow.unit}, ${singleWindow.trackType}) are preserved. Click "Calculate Fabrication Sizes" and sign in with your mobile number to view cutting results.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCalculatingSingle}
                    onClick={handleCalculateSingleWindow}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B5ED7] hover:bg-[#084BB3] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>
                      {isCalculatingSingle
                        ? 'Calculating...'
                        : 'Calculate Fabrication Sizes'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: BULK WINDOWS PROJECT (SECTION 7)                          */}
        {/* ================================================================ */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            {/* Attached AI Notebook Scan Summary Strip */}
            {activeNotebookScan && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#0B5ED7] text-white flex items-center justify-center shrink-0">
                    <FileImage className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#0A2540]">
                      AI Notebook Scan Attached ({activeNotebookScan.pages.length} Page
                      {activeNotebookScan.pages.length === 1 ? '' : 's'} ·{' '}
                      {activeNotebookScan.extractedRows.length} Verified Window
                      {activeNotebookScan.extractedRows.length === 1 ? '' : 's'})
                    </div>
                    <div className="text-[11px] text-[#475569]">
                      Original notebook photo(s), AI extraction, and your verified measurements will be saved together with this project.
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenNotebookScanner}
                    className="px-3 py-2 rounded-lg bg-white hover:bg-[#FFF7ED] text-[#0A2540] border border-[#FED7AA] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#F97316]" />
                    Scan New / Add Pages
                  </button>
                  <button
                    type="button"
                    disabled={isSavingProject}
                    onClick={() => handleSaveProject(bulkWindows)}
                    className="px-3.5 py-2 rounded-lg bg-[#0A2540] hover:bg-[#06182B] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 text-[#F97316]" />
                    {isSavingProject ? 'Saving...' : 'Save Scanned Project'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNotebookScan(null)}
                    className="p-2 rounded-lg text-[#777777] hover:text-[#1A1A1A] hover:bg-white cursor-pointer"
                    title="Detach notebook scan from current draft"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Project Metadata Bar */}
            <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg bg-white text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                />
              </div>
              <div className="flex items-end">
                <div className="w-full px-3 py-2 rounded-lg bg-white border border-[#E5E5E5] flex items-center justify-between text-xs">
                  <span className="text-[#666666]">Total Windows in Project</span>
                  <span className="font-mono tabular-nums font-bold text-[#1A1A1A]">
                    {bulkWindows.length}
                  </span>
                </div>
              </div>
            </div>

            <BulkWindowEntryTable
              windows={bulkWindows}
              resultsById={currentCustomer ? bulkResultsById : {}}
              profiles={profiles}
              defaultUnit={userSettings.defaultUnit}
              onAddWindows={handleAddBulkWindows}
              onUpdateWindow={handleUpdateBulkWindow}
              onDuplicateWindow={handleDuplicateBulkWindow}
              onDeleteWindow={handleDeleteBulkWindow}
              onCalculateSingle={handleCalculateBulkSingle}
              onCalculateAll={handleCalculateBulkAll}
              onOpenDrawing={handleOpenBulkDrawing}
              onSaveProject={() => handleSaveProject(bulkWindows)}
              onDownloadPdf={() =>
                downloadSlidingWindowCuttingPDF({
                  projectName,
                  customerName,
                  results: orderedBulkResults,
                  settings,
                })
              }
              onExportAllDrawingsPdf={() =>
                handleExportAllDrawings(orderedBulkResults, projectName, customerName)
              }
              onExportExcel={() =>
                exportSlidingWindowExcelCSV({
                  projectName,
                  customerName,
                  results: orderedBulkResults,
                })
              }
              isSavingProject={isSavingProject}
              hasValidResults={hasValidBulkResults}
            />

            {orderedBulkResults.length > 0 && (
              <div className="pt-2">
                <CuttingListReportView
                  results={orderedBulkResults}
                  projectName={projectName}
                  customerName={customerName}
                  settings={settings}
                  showMmReference={userSettings.showMmReference}
                  onDownloadPdf={() =>
                    downloadSlidingWindowCuttingPDF({
                      projectName,
                      customerName,
                      results: orderedBulkResults,
                      settings,
                    })
                  }
                  onExportAllDrawingsPdf={() =>
                    handleExportAllDrawings(orderedBulkResults, projectName, customerName)
                  }
                  onExportExcel={() =>
                    exportSlidingWindowExcelCSV({
                      projectName,
                      customerName,
                      results: orderedBulkResults,
                    })
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: FABRICATION SETTINGS & PROFILES (SECTIONS 5 & 6)          */}
        {/* ================================================================ */}
        {activeTab === 'settings' && (
          <FabricationSettingsView
            profiles={profiles}
            selectedProfileId={selectedSettingsProfileId}
            onSelectProfile={setSelectedSettingsProfileId}
            onCreateProfile={handleCreateProfile}
            onUpdateProfile={handleUpdateProfile}
            onDuplicateProfile={handleDuplicateProfile}
            onDeleteProfile={handleDeleteProfile}
            onSetDefaultProfile={handleSetDefaultProfile}
            onResetProfile={handleResetProfile}
            isSaving={isSavingProfile}
          />
        )}

        {/* ================================================================ */}
        {/* TAB 4: SAVED PROJECTS & IMMUTABLE SNAPSHOTS (SECTION 10)         */}
        {/* ================================================================ */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {savedProjects.length === 0 ? (
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-10 text-center">
                <FolderOpen className="w-8 h-8 text-[#C89211] mx-auto mb-3" />
                <h3 className="text-base font-bold text-[#1A1A1A]">No Saved Fabrication Projects Yet</h3>
                <p className="text-xs text-[#666666] mt-1 max-w-md mx-auto">
                  Save a single window or bulk project to preserve exact cutting measurements and profile rule snapshots. Future profile edits will never alter saved projects.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('bulk')}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1A1A1A] text-white text-xs font-semibold hover:bg-black cursor-pointer"
                >
                  Open Bulk Calculator
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedProjects.map(proj => (
                  <div
                    key={proj.id}
                    className={`bg-white border rounded-xl p-4 flex flex-col justify-between transition-colors ${
                      viewingProject?.id === proj.id
                        ? 'border-[#C89211] bg-[#FFFDF7]'
                        : 'border-[#E5E5E5]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-[#1A1A1A]">{proj.projectName}</h3>
                          <p className="text-xs text-[#666666]">
                            {proj.customerName || 'Walk-in / General Customer'}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono tabular-nums font-bold text-[#8E6506] bg-[#FFF7E3] px-2 py-0.5 rounded border border-[#C89211]/30 whitespace-nowrap">
                          {proj.results.length} Win
                        </span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#EFECE6] space-y-1 text-[11px] text-[#555555]">
                        <div>
                          Saved:{' '}
                          <span className="font-mono text-[#1A1A1A]">
                            {new Date(proj.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[#0F5132]">
                          <Lock className="w-3 h-3" />
                          <span>Locked profile snapshot preserved</span>
                        </div>
                        {proj.notebookScan && proj.notebookScan.pages.length > 0 && (
                          <div className="flex items-center gap-1 text-[#8E6506] font-semibold">
                            <Camera className="w-3 h-3" />
                            <span>
                              {proj.notebookScan.pages.length} AI Scanned Notebook Photo
                              {proj.notebookScan.pages.length === 1 ? '' : 's'} Saved
                            </span>
                          </div>
                        )}
                        {proj.results[0]?.isValid && (
                          <div className="font-mono tabular-nums text-[#1A1A1A] pt-1">
                            {proj.results[0].windowNumber}:{' '}
                            {formatMeasurement(
                              proj.results[0].original.width,
                              proj.results[0].displayUnit
                            )}{' '}
                            ×{' '}
                            {formatMeasurement(
                              proj.results[0].original.height,
                              proj.results[0].displayUnit
                            )}{' '}
                            ({proj.results[0].original.trackType})
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EFECE6] flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingProject(proj)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-black text-white text-xs font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#E6B33A]" />
                        View Report
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadProjectIntoBulk(proj)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] border border-[#E5E5E5] text-xs font-semibold cursor-pointer"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadSlidingWindowCuttingPDF({
                            projectName: proj.projectName,
                            customerName: proj.customerName,
                            results: proj.results,
                            settings,
                          })
                        }
                        title="Download PDF"
                        className="p-1.5 rounded-lg bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] border border-[#E5E5E5] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          exportSlidingWindowExcelCSV({
                            projectName: proj.projectName,
                            customerName: proj.customerName,
                            results: proj.results,
                          })
                        }
                        title="Export Excel"
                        className="p-1.5 rounded-lg bg-white hover:bg-[#F8F8F6] text-[#1D6F42] border border-[#E5E5E5] cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedProject(proj.id)}
                        title="Delete saved project"
                        className="p-1.5 rounded-lg bg-white hover:bg-[#FEF3F2] text-[#B42318] border border-[#E5E5E5] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewingProject && (
              <div className="pt-4 border-t border-[#E5E5E5] space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1A1A1A]">
                    Locked Snapshot Report: {viewingProject.projectName}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setViewingProject(null)}
                    className="text-xs font-semibold text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    Close Report
                  </button>
                </div>

                {/* Saved Original Notebook Photos & AI-vs-User Verification Audit */}
                {viewingProject.notebookScan && (
                  <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-[#C89211]" />
                          Saved Notebook Photographs &amp; AI Extraction Audit
                        </h4>
                        <p className="text-[11px] text-[#666666]">
                          Verified on{' '}
                          {new Date(viewingProject.notebookScan.verifiedAt).toLocaleString('en-IN')} ·{' '}
                          {viewingProject.notebookScan.pages.length} Page(s) ·{' '}
                          {viewingProject.notebookScan.extractedRows.length} Extracted Row(s)
                        </p>
                      </div>
                    </div>

                    {viewingProject.notebookScan.pages.some(p => p.photoUrl) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {viewingProject.notebookScan.pages.map(page => (
                          <div
                            key={page.id}
                            className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden"
                          >
                            <div className="px-3 py-1.5 bg-[#FAFAF8] border-b border-[#E5E5E5] flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#1A1A1A]">
                                Page {page.pageNumber}
                              </span>
                              <span className="text-[#666666] truncate max-w-[160px]">
                                {page.fileName}
                              </span>
                            </div>
                            {page.photoUrl ? (
                              <img
                                src={page.photoUrl}
                                alt={`Saved notebook page ${page.pageNumber}`}
                                className="w-full h-48 object-contain bg-[#FFFFFF] p-1"
                              />
                            ) : (
                              <div className="h-32 flex items-center justify-center text-xs text-[#777777] p-3 text-center">
                                Photo file recorded ({page.fileName})
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {viewingProject.notebookScan.extractedRows.length > 0 && (
                      <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#FAFAF8] border-b border-[#E5E5E5] text-[10px] font-bold uppercase tracking-wider text-[#555555]">
                              <th className="py-2 px-3">Window</th>
                              <th className="py-2 px-3">Original Handwritten Text</th>
                              <th className="py-2 px-3">AI Initial Reading</th>
                              <th className="py-2 px-3">User Verified Final</th>
                              <th className="py-2 px-3">AI Confidence</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EFECE6]">
                            {viewingProject.notebookScan.extractedRows.map(r => {
                              const changed =
                                r.width !== r.originalAiSnapshot.width ||
                                r.height !== r.originalAiSnapshot.height ||
                                r.unit !== r.originalAiSnapshot.unit;
                              return (
                                <tr key={r.id}>
                                  <td className="py-2 px-3 font-mono font-bold text-[#1A1A1A]">
                                    {r.windowNumber}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-[#555555]">
                                    {r.rawText}
                                  </td>
                                  <td className="py-2 px-3 font-mono tabular-nums text-[#555555]">
                                    {r.originalAiSnapshot.width !== null
                                      ? formatMeasurement(r.originalAiSnapshot.width, r.originalAiSnapshot.unit)
                                      : '?'}{' '}
                                    ×{' '}
                                    {r.originalAiSnapshot.height !== null
                                      ? formatMeasurement(r.originalAiSnapshot.height, r.originalAiSnapshot.unit)
                                      : '?'}
                                  </td>
                                  <td className="py-2 px-3 font-mono tabular-nums font-bold text-[#1A1A1A]">
                                    {r.width !== null ? formatMeasurement(r.width, r.unit) : '?'} ×{' '}
                                    {r.height !== null ? formatMeasurement(r.height, r.unit) : '?'}
                                    {changed && (
                                      <span className="ml-1.5 text-[10px] font-sans font-semibold text-[#C89211]">
                                        (Edited)
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-[11px] font-semibold text-[#555555]">
                                    {r.originalAiSnapshot.confidence}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <CuttingListReportView
                  results={viewingProject.results}
                  projectName={viewingProject.projectName}
                  customerName={viewingProject.customerName}
                  settings={settings}
                  showMmReference={userSettings.showMmReference}
                  onDownloadPdf={() =>
                    downloadSlidingWindowCuttingPDF({
                      projectName: viewingProject.projectName,
                      customerName: viewingProject.customerName,
                      results: viewingProject.results,
                      settings,
                    })
                  }
                  onExportAllDrawingsPdf={() =>
                    handleExportAllDrawings(
                      viewingProject.results,
                      viewingProject.projectName,
                      viewingProject.customerName
                    )
                  }
                  onExportExcel={() =>
                    exportSlidingWindowExcelCSV({
                      projectName: viewingProject.projectName,
                      customerName: viewingProject.customerName,
                      results: viewingProject.results,
                    })
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Adaptive Banner Ad (automatically hidden for Ad-Free Premium subscribers) */}
        <AdMobBannerSlot placement="sliding_window" settings={settings} />
      </div>

      {/* AI Notebook Photo Size Scanner Modal */}
      <NotebookPhotoScannerModal
        isOpen={showNotebookScanner}
        onClose={() => setShowNotebookScanner(false)}
        profiles={profiles}
        defaultUnit={userSettings.defaultUnit || 'inch'}
        default2TrackProfileId={userSettings.default2TrackProfileId}
        default3TrackProfileId={userSettings.default3TrackProfileId}
        initialProjectName={projectName}
        initialCustomerName={customerName}
        onConfirmAndCalculate={handleNotebookScanConfirmed}
      />

      {/* Bulk Individual Window Technical Drawing Modal */}
      {activeDrawingResult && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setActiveDrawingResult(null)}
        >
          <div
            className="bg-white border border-[#E5E5E5] rounded-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-[#1A1A1A] text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-sm font-bold">
                  Technical Window Drawing — {activeDrawingResult.windowNumber}
                </h3>
                <p className="text-[11px] text-stone-300">
                  {projectName || 'Window Fabrication'} · {activeDrawingResult.original.trackType.toUpperCase()} ({activeDrawingResult.original.configuration})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrawingResult(null)}
                className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Close drawing modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <WindowTechnicalDrawing
                result={activeDrawingResult}
                projectName={projectName}
                customerName={customerName}
                settings={settings}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fabricator Sign In / Create Account Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] rounded-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-[#1A1A1A] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {authMode === 'login' ? 'Fabricator Sign In' : 'Create Fabricator Account'}
                </h3>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  Keep your custom fabrication profiles &amp; window projects privately synced
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-5 space-y-4">
              {authError && (
                <div className="p-3 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#B42318]">
                  {authError}
                </div>
              )}

              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                    Full Name / Workshop Name
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    placeholder="e.g. Shree Ram Aluminium Works"
                    className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="fabricator@example.com"
                  className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#555555] uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs border border-[#DCDCDC] rounded-lg text-[#1A1A1A] focus:outline-none focus:border-[#C89211]"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-[#C89211] hover:bg-[#A6780E] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {authSubmitting
                  ? 'Please wait...'
                  : authMode === 'login'
                  ? 'Sign In & Load Workspace'
                  : 'Create Private Workspace'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(prev => (prev === 'login' ? 'register' : 'login'));
                    setAuthError(null);
                  }}
                  className="text-xs font-semibold text-[#C89211] hover:underline cursor-pointer"
                >
                  {authMode === 'login'
                    ? 'Need an account? Create one'
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
