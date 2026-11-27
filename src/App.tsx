import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldCheck,
  TreePine,
  Calculator,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Eye,
  CheckCircle2,
  Award,
  Layers,
  Wrench,
  ChevronRight,
  Send,
  Heart,
  Sparkles,
  Truck,
  Package,
  Box,
  AlertTriangle,
  X,
  Camera,
  Ruler,
  Sliders,
  Grid3X3,
} from 'lucide-react';
import {
  Door,
  Category,
  DoorMaterial,
  PolishFinish,
  ChaukhatFrame,
  HardwareItem,
  HomeBanner,
  Article,
  BusinessSettings,
  CalculationResult,
  UserCalculationRecord,
  TeamMember,
  IndiaDeliveryState,
  DeliveryStory,
  ChaukhatCalculationResult,
  CustomerAccount,
  PaymentTransaction,
  Quotation,
  PremiumEntitlementSummary,
  PremiumPlanDefinition,
  WindowSystemCategoryId,
  WindowSystemDefinition,
} from './types.ts';
import {
  fetchCatalog,
  fetchCalculatorData,
  fetchPublicDeliveryData,
  getGuestFavorites,
  toggleGuestFavorite,
} from './lib/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { HeroSlider } from './components/HeroSlider.tsx';
import { DoorGallery } from './components/DoorGallery.tsx';
import { DoorDetailModal } from './components/DoorDetailModal.tsx';
import { DoorCalculator } from './components/DoorCalculator.tsx';
import { ChaukhatCalculator } from './components/ChaukhatCalculator.tsx';
import { QuotationModal } from './components/QuotationModal.tsx';
import { ArticlesSection } from './components/ArticlesSection.tsx';
import { ArticlesGuidesCarousel } from './components/ArticlesGuidesCarousel.tsx';
import { AllIndiaDeliverySection } from './components/AllIndiaDeliverySection.tsx';
import { DEFAULT_INDIA_STATES, DEFAULT_DELIVERY_STORIES } from './data/indiaDeliveryData.ts';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen as CapSplashScreen } from '@capacitor/splash-screen';
import { SplashScreen } from './components/SplashScreen.tsx';
import { TeamSection } from './components/TeamSection.tsx';
import { OurStorySection } from './components/OurStorySection.tsx';
import { useAdminGesture } from './hooks/useAdminGesture.ts';
import { PrivacyPolicyPage } from './components/legal/PrivacyPolicyPage.tsx';
import { AboutUsPage } from './components/legal/AboutUsPage.tsx';
import { ContactUsPage } from './components/legal/ContactUsPage.tsx';
import { DisclaimerPage } from './components/legal/DisclaimerPage.tsx';
import { PromotionalBannerCarousel } from './components/PromotionalBannerCarousel.tsx';

const AdminPanel = React.lazy(() => import('./components/AdminPanel.tsx').then(m => ({ default: m.AdminPanel })));
const AIWoodDetector = React.lazy(() => import('./components/AIWoodDetector.tsx').then(m => ({ default: m.AIWoodDetector })));
const CustomerOrderTracking = React.lazy(() => import('./components/CustomerOrderTracking.tsx').then(m => ({ default: m.CustomerOrderTracking })));
const DoorVisualizerPage = React.lazy(() => import('./components/visualizer/DoorVisualizerPage.tsx').then(m => ({ default: m.DoorVisualizerPage })));
const SlidingWindowCalculator = React.lazy(() => import('./components/sliding-window/SlidingWindowCalculator.tsx').then(m => ({ default: m.SlidingWindowCalculator })));
import type { SlidingWindowWorkspaceTab } from './components/sliding-window/SlidingWindowCalculator.tsx';
import { SlidingWindowIcon } from './components/sliding-window/SlidingWindowIcon.tsx';
import { WindowCategoryHomeSection } from './components/window-systems/WindowCategoryHomeSection.tsx';
import {
  WindowSelectionScreen,
  type WindowSelectionLaunchConfig,
} from './components/window-systems/WindowSelectionScreen.tsx';
import { WindowSystemCalculatorView } from './components/window-systems/WindowSystemCalculatorView.tsx';
import { createDefaultIndianWindowSystems } from './data/indianWindowSystemsDefaults.ts';
import { fetchPublicWindowSystems } from './lib/windowSystemApi.ts';
import { HomepageBannerSlider } from './components/HomepageBannerSlider.tsx';
import { ContentProtectionWarning } from './components/ContentProtectionWarning.tsx';
import { useContentProtection } from './lib/contentProtection.ts';
import { initSpaAnalytics } from './lib/analytics.ts';
import { adMobService } from './lib/admob/admobService.ts';
import { AdMobBannerSlot } from './components/admob/AdMobBannerSlot.tsx';
import { FEATURE_FLAGS, isCustomerViewDisabled } from './config/featureFlags.ts';
import { CustomerOtpLoginModal } from './components/CustomerOtpLoginModal.tsx';
import { LoginRequiredPopup } from './components/LoginRequiredPopup.tsx';
import { PaymentReceiptModal } from './components/PaymentReceiptModal.tsx';
import {
  fetchCurrentCustomerSession,
  logoutCustomerSession,
  startRazorpayCheckoutFlow,
  type CreateOrderRequestPayload,
  type CustomerOrderSummary,
  type CustomerSessionPayload,
} from './lib/customerPaymentApi.ts';
import { syncServerCredits, type CreditPack } from './lib/creditManager.ts';
import { PremiumSubscriptionView } from './components/PremiumSubscriptionView.tsx';
import {
  FREE_ENTITLEMENT,
  PREMIUM_PLANS,
  fetchMonetizationConfig,
} from './lib/billing/playBillingService.ts';
import { saveLocalAdMobSettings } from './lib/admob/admobConfig.ts';
import {
  BRAND_LOGO_URL,
  BRAND_NAME,
  BRAND_TAGLINE,
  resolveBrandLogoUrl,
  resolveBrandName,
  resolveBrandTagline,
} from './config/brand.ts';

export const App: React.FC = () => {
  // Navigation View State
  const [activeView, setActiveView] = useState<
    | 'home'
    | 'gallery'
    | 'calculator'
    | 'sliding-window'
    | 'window-category'
    | 'window-system-calculator'
    | 'visualizer'
    | 'articles'
    | 'contact'
    | 'privacy'
    | 'about'
    | 'disclaimer'
    | 'wood-detector'
    | 'tracking'
    | 'premium'
  >('home');
  const [windowSystems, setWindowSystems] = useState<WindowSystemDefinition[]>(() =>
    createDefaultIndianWindowSystems()
  );
  const [selectedWindowCategoryId, setSelectedWindowCategoryId] =
    useState<WindowSystemCategoryId>('sliding');
  const [selectedWindowLaunch, setSelectedWindowLaunch] =
    useState<WindowSelectionLaunchConfig | null>(null);
  const [premiumEntitlement, setPremiumEntitlement] = useState<PremiumEntitlementSummary>(FREE_ENTITLEMENT);
  const [premiumPlans, setPremiumPlans] = useState<PremiumPlanDefinition[]>(PREMIUM_PLANS);
  const [otpLoginCustomReason, setOtpLoginCustomReason] = useState<string | null>(null);
  const [slidingWindowTab, setSlidingWindowTab] = useState<SlidingWindowWorkspaceTab>('single');
  const [scannerLaunchToken, setScannerLaunchToken] = useState<number>(0);
  const [visualizerDoor, setVisualizerDoor] = useState<Door | null>(null);
  const [trackingInitialId, setTrackingInitialId] = useState<string>('');

  // Application Data States
  const [loading, setLoading] = useState(true);
  const [doors, setDoors] = useState<Door[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);

  const mainBanners = useMemo(() => {
    return (banners || []).filter(
      b =>
        b.bannerType === 'main' ||
        b.slot === 'hero' ||
        b.slot === 'main' ||
        (!b.bannerType && (!b.slot || b.slot === 'hero' || b.slot === 'main'))
    );
  }, [banners]);

  const promotionBanners = useMemo(() => {
    return (banners || []).filter(
      b =>
        (b.bannerType === 'promotion' || (!b.bannerType && b.slot !== 'hero' && b.slot !== 'main')) &&
        (b.slot === 'slot_1' || b.slot === 'slot_2' || b.slot === 'slot_a' || b.slot === 'slot_b')
    );
  }, [banners]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    businessName: BRAND_NAME,
    tagline: BRAND_TAGLINE,
    logoUrl: BRAND_LOGO_URL,
    whatsappNumber: '',
    googleMapsUrl: '',
    phone: '',
    email: 'support@windowcutpro.com',
    address: '',
    disclaimer: 'Cutting lists and estimates generated by WindowCut Pro are based on your entered dimensions and active fabrication profile rules. Verify site openings before final cutting.',
    quotePrefix: 'WCP',
    additionalChargePercentage: 0,
    additionalChargeName: 'Taxes & Levies',
  });

  // Calculator options data
  const [materials, setMaterials] = useState<DoorMaterial[]>([]);
  const [finishes, setFinishes] = useState<PolishFinish[]>([]);
  const [frames, setFrames] = useState<ChaukhatFrame[]>([]);
  const [hardware, setHardware] = useState<HardwareItem[]>([]);

  // All India Delivery state
  const [deliveryStates, setDeliveryStates] = useState<IndiaDeliveryState[]>(DEFAULT_INDIA_STATES);
  const [deliveryStories, setDeliveryStories] = useState<DeliveryStory[]>(DEFAULT_DELIVERY_STORIES);

  // Modals
  const [selectedDoorForDetail, setSelectedDoorForDetail] = useState<Door | null>(null);
  const [calculatorDoor, setCalculatorDoor] = useState<Door | null>(null);
  const [calculatorOption, setCalculatorOption] = useState<'door' | 'chaukhat'>('door');
  const [combinedChaukhat, setCombinedChaukhat] = useState<ChaukhatCalculationResult | null>(null);
  const [activeDoorCalculation, setActiveDoorCalculation] = useState<CalculationResult | null>(null);
  const [quotationCalcResult, setQuotationCalcResult] = useState<CalculationResult | null>(null);
  const [quotationDoor, setQuotationDoor] = useState<Door | null>(null);
  const [selectedArticleIdForView, setSelectedArticleIdForView] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<string>('dashboard');

  // Hidden admin access gesture on footer brand logo
  const { handleTap: handleFooterLogoTap } = useAdminGesture({
    requiredTaps: 6,
    maxIntervalMs: 500,
    maxTotalTimeMs: 2500,
    onSuccess: () => {
      setShowAdminPanel(true);
    },
  });

  // Client-side content protection & Android FLAG_SECURE
  useContentProtection(settings?.contentProtection, activeView);

  // Saved Doors, Estimates & Authenticated Customer Account State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState<
    'account' | 'payments' | 'orders' | 'favorites' | 'history' | 'notifications'
  >('account');
  const [favoriteDoorIds, setFavoriteDoorIds] = useState<string[]>(getGuestFavorites);
  const [loadedCalcRecord, setLoadedCalcRecord] = useState<UserCalculationRecord | null>(null);

  // Mobile OTP Customer Session & Razorpay Payment States
  const [currentCustomer, setCurrentCustomer] = useState<CustomerAccount | null>(null);
  const [customerPayments, setCustomerPayments] = useState<PaymentTransaction[]>([]);
  const [customerQuotes, setCustomerQuotes] = useState<Quotation[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderSummary[]>([]);
  const [showOtpLoginModal, setShowOtpLoginModal] = useState(false);
  const [showLoginRequiredPopup, setShowLoginRequiredPopup] = useState(false);
  const pendingCalculationActionRef = useRef<(() => void | Promise<void>) | null>(null);
  const [pendingPaymentPayload, setPendingPaymentPayload] = useState<CreateOrderRequestPayload | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [payingCreditPackId, setPayingCreditPackId] = useState<string | null>(null);
  const [activePaymentReceipt, setActivePaymentReceipt] = useState<{
    payment: PaymentTransaction;
    statusMessage?: string;
  } | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<{
    type: 'config' | 'error';
    message: string;
    missingEnvVars?: string[];
  } | null>(null);

  // Sync URL routing for SEO canonical routes and deep-links
  useEffect(() => {
    const syncRouteFromPath = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/admin')) {
        const parts = path.split('/').filter(Boolean);
        const sub = parts[1] || 'dashboard';
        if (sub === 'login') {
          setShowAdminPanel(true);
        } else {
          setAdminInitialTab(sub);
          setShowAdminPanel(true);
        }
      } else if (path.startsWith('/track') || path.startsWith('/order-track') || path.startsWith('/tracking')) {
        if (FEATURE_FLAGS.orderTracking) {
          const parts = path.split('/').filter(Boolean);
          if (parts.length > 1 && parts[1] !== 'order' && parts[1] !== 'track') {
            setTrackingInitialId(parts[1].toUpperCase());
          }
          setActiveView('tracking');
        } else {
          setActiveView('home');
          window.history.replaceState({}, '', '/');
        }
      } else if (path === '/privacy' || path === '/privacy-policy') {
        setActiveView('privacy');
      } else if (path === '/about' || path === '/about-us') {
        setActiveView('about');
      } else if (path === '/delivery' || path === '/india-delivery') {
        setActiveView('home');
        window.history.replaceState({}, '', '/');
      } else if (path === '/contact' || path === '/contact-us') {
        setActiveView('contact');
      } else if (path === '/disclaimer') {
        if (FEATURE_FLAGS.copyrightFooter) {
          setActiveView('disclaimer');
        } else {
          setActiveView('home');
          window.history.replaceState({}, '', '/');
        }
      } else if (path === '/catalog' || path === '/doors' || path === '/gallery') {
        if (FEATURE_FLAGS.doorCatalogue) {
          setActiveView('gallery');
        } else {
          setActiveView('home');
          window.history.replaceState({}, '', '/');
        }
      } else if (
        path.startsWith('/sliding-window') ||
        path === '/window-calculator' ||
        path === '/fabrication-calculator'
      ) {
        if (path.includes('/bulk')) {
          setSlidingWindowTab('bulk');
        } else if (path.includes('/settings')) {
          setSlidingWindowTab('settings');
        } else if (path.includes('/projects')) {
          setSlidingWindowTab('projects');
        } else {
          setSlidingWindowTab('single');
        }
        setActiveView('sliding-window');
      } else if (path === '/chaukhat' || path === '/chaukhat-calculator' || path === '/frame-calculator') {
        setActiveView('calculator');
        setCalculatorOption('chaukhat');
      } else if (path === '/calculator' || path === '/price-calculator') {
        setActiveView('calculator');
        setCalculatorOption('door');
      } else if (
        path === '/wood-detector' ||
        path === '/ai-wood-detector' ||
        path === '/lakdi-ki-pehchan' ||
        path === '/wood-scan' ||
        path === '/detect-wood'
      ) {
        setActiveView('wood-detector');
      } else if (
        path === '/premium' ||
        path === '/ad-free' ||
        path === '/subscription' ||
        path === '/upgrade'
      ) {
        setActiveView('premium');
      } else if (path === '/articles' || path === '/guides' || path === '/blog') {
        if (FEATURE_FLAGS.articlesBlog) {
          setActiveView('articles');
        } else {
          setActiveView('home');
          window.history.replaceState({}, '', '/');
        }
      } else if (path.startsWith('/door/')) {
        if (FEATURE_FLAGS.doorCatalogue) {
          setActiveView('gallery');
        } else {
          setActiveView('home');
          window.history.replaceState({}, '', '/');
        }
      } else if (path.startsWith('/article/')) {
        if (FEATURE_FLAGS.articlesBlog) {
          setActiveView('articles');
        } else {
          setActiveView('home');
          window.history.replaceState({}, '', '/');
        }
      } else if (path === '/') {
        setActiveView('home');
      } else if (
        path === '/visualizer' ||
        path.startsWith('/visualizer') ||
        path === '/3d' ||
        path.startsWith('/3d') ||
        path === '/ar' ||
        path.startsWith('/ar') ||
        path === '/3d-visualizer' ||
        path === '/3d-fitting' ||
        path === '/door-fitting' ||
        path === '/ai-visualizer'
      ) {
        if (FEATURE_FLAGS.visualizer3dAr) {
          const parts = path.split('/').filter(Boolean);
          if (parts.length > 1 && parts[1] !== 'door' && parts[1] !== 'fitting' && parts[1] !== '3d' && parts[1] !== 'ar') {
            const doorIdOrName = decodeURIComponent(parts[1]);
            const found = doors.find(d => d.id === doorIdOrName || d.name.toLowerCase() === doorIdOrName.toLowerCase());
            if (found) setVisualizerDoor(found);
          }
          setActiveView('visualizer');
        } else {
          setActiveView('home');
          window.history.replaceState({}, '', '/');
        }
      }
      // Check query parameter ?track=... or ?door=...
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const trackParam = urlParams.get('track') || urlParams.get('trackingId') || urlParams.get('id');
        if (trackParam) {
          setTrackingInitialId(trackParam.toUpperCase());
          setActiveView('tracking');
        }
        const doorParam = urlParams.get('door') || urlParams.get('doorId');
        if (doorParam && FEATURE_FLAGS.visualizer3dAr && FEATURE_FLAGS.doorCatalogue) {
          const found = doors.find(d => d.id === doorParam || d.name.toLowerCase() === doorParam.toLowerCase());
          if (found) {
            setVisualizerDoor(found);
            setActiveView('visualizer');
          }
        }
      } catch {}
    };

    syncRouteFromPath();
    window.addEventListener('popstate', syncRouteFromPath);
    return () => window.removeEventListener('popstate', syncRouteFromPath);
  }, []);

  // Google Analytics 4: Initialize SPA route change tracking without duplicate events
  useEffect(() => {
    const cleanupAnalytics = initSpaAnalytics();
    return cleanupAnalytics;
  }, []);

  // Update document.title on route & modal changes to enrich GA4 analytics reports
  useEffect(() => {
    if (selectedDoorForDetail) {
      document.title = `${selectedDoorForDetail.name} | ${BRAND_NAME}`;
      return;
    }
    const viewTitles: Record<string, string> = {
      home: `${BRAND_NAME} | ${BRAND_TAGLINE}`,
      gallery: `Designs Catalog | ${BRAND_NAME}`,
      calculator: `Workshop Price Estimator | ${BRAND_NAME}`,
      'sliding-window': `${BRAND_TAGLINE} | ${BRAND_NAME}`,
      articles: `Fabrication Guides | ${BRAND_NAME}`,
      contact: `Contact Us | ${BRAND_NAME}`,
      about: `About ${BRAND_NAME} | ${BRAND_TAGLINE}`,
      privacy: `Privacy Policy | ${BRAND_NAME}`,
      disclaimer: `Disclaimer | ${BRAND_NAME}`,
      'wood-detector': `AI Wood Detector | ${BRAND_NAME}`,
      tracking: `Order Tracking | ${BRAND_NAME}`,
      premium: `${BRAND_NAME} Premium – Ad-Free Fabrication Workspace`,
    };
    if (viewTitles[activeView]) {
      document.title = viewTitles[activeView];
    }
  }, [activeView, selectedDoorForDetail]);

  // Load Catalog & Calculator master data
  const loadAppData = async () => {
    try {
      setLoading(true);
      const [catalogData, calcData, delData, windowSysData] = await Promise.all([
        fetchCatalog(),
        fetchCalculatorData(),
        FEATURE_FLAGS.allIndiaDelivery
          ? fetchPublicDeliveryData().catch(err => {
              console.warn('Delivery data fallback in use:', err);
              return null;
            })
          : Promise.resolve(null),
        fetchPublicWindowSystems().catch(() => null),
      ]);

      if (windowSysData && Array.isArray(windowSysData.systems) && windowSysData.systems.length > 0) {
        setWindowSystems(windowSysData.systems);
      }

      setDoors(catalogData.doors || []);
      setCategories(catalogData.categories || []);
      setBanners(catalogData.banners || []);
      setArticles(catalogData.articles || []);
      setTeamMembers(catalogData.teamMembers || []);
      if (catalogData.settings) {
        setSettings(catalogData.settings);
      }

      setMaterials(calcData.materials || []);
      setFinishes(calcData.finishes || []);
      setFrames(calcData.frames || []);
      setHardware(calcData.hardware || []);

      if (delData) {
        if (Array.isArray(delData.states) && delData.states.length > 0) {
          setDeliveryStates(delData.states);
        }
        if (Array.isArray(delData.stories)) {
          setDeliveryStories(delData.stories);
        }
      }

      // Check if deep-linked to a door directly (only when catalogue is active)
      if (FEATURE_FLAGS.doorCatalogue && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath.toLowerCase().startsWith('/door/')) {
          const seg = currentPath.split('/').filter(Boolean)[1];
          if (seg && catalogData.doors) {
            const matchedDoor = catalogData.doors.find(
              d => d.id.toLowerCase() === decodeURIComponent(seg).toLowerCase()
            );
            if (matchedDoor) {
              setSelectedDoorForDetail(matchedDoor);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
      CapSplashScreen.hide().catch(() => {});
    }
  };

  const normalizeVerifiedEntitlement = (
    entitlement?: PremiumEntitlementSummary | null
  ): PremiumEntitlementSummary => {
    if (!entitlement) return FREE_ENTITLEMENT;
    const expiry =
      typeof entitlement.expiryTimeMillis === 'number' &&
      Number.isFinite(entitlement.expiryTimeMillis) &&
      entitlement.expiryTimeMillis > 0
        ? entitlement.expiryTimeMillis
        : null;
    const isVerifiedPremium = Boolean(
      entitlement.subscriptionPlan === 'premium' &&
      entitlement.isPremium === true &&
      entitlement.adsRemoved === true &&
      (entitlement.status === 'active' || entitlement.status === 'cancelled') &&
      entitlement.source === 'google_play_billing' &&
      expiry !== null &&
      expiry > Date.now()
    );
    if (isVerifiedPremium) {
      return {
        ...entitlement,
        subscriptionPlan: 'premium',
        subscriptionStatus: entitlement.status,
        subscriptionExpiryDate: entitlement.subscriptionExpiryDate || entitlement.expiryDate || null,
        isPremium: true,
        adsRemoved: true,
      };
    }
    return {
      ...FREE_ENTITLEMENT,
      ...entitlement,
      subscriptionPlan: 'free',
      subscriptionStatus: entitlement.subscriptionStatus || entitlement.status || 'none',
      subscriptionExpiryDate: entitlement.subscriptionExpiryDate || entitlement.expiryDate || null,
      isPremium: false,
      adsRemoved: false,
      autoRenewing: false,
    };
  };

  const applyPremiumEntitlement = (entitlement?: PremiumEntitlementSummary | null) => {
    const next = normalizeVerifiedEntitlement(entitlement);
    setPremiumEntitlement(next);
    adMobService.setPremiumEntitlement(next);
  };

  const applyCustomerSession = (session: CustomerSessionPayload | null) => {
    if (!session || !session.authenticated || !session.customer) {
      setCurrentCustomer(null);
      setCustomerPayments([]);
      setCustomerQuotes([]);
      setCustomerOrders([]);
      // Logout or guest session ALWAYS resets immediately to Free Plan with ads enabled
      applyPremiumEntitlement(FREE_ENTITLEMENT);
      return;
    }
    setCurrentCustomer(session.customer);
    setCustomerPayments(session.payments || []);
    setCustomerQuotes(session.quotes || []);
    setCustomerOrders(session.orders || []);
    if (typeof session.customer.woodScanCredits === 'number') {
      syncServerCredits(session.customer.woodScanCredits);
    }
    // Login NEVER activates Premium; apply only backend-verified entitlement (defaults to Free)
    applyPremiumEntitlement(session.entitlement || FREE_ENTITLEMENT);
  };

  const refreshCustomerSession = async () => {
    const session = await fetchCurrentCustomerSession();
    applyCustomerSession(session);
  };

  const refreshMonetizationState = async () => {
    const config = await fetchMonetizationConfig();
    if (!config) {
      // Fail closed: never preserve unverified/stale Premium state when server check fails
      applyPremiumEntitlement(FREE_ENTITLEMENT);
      return;
    }
    if (config.adSettings) {
      saveLocalAdMobSettings(config.adSettings);
      setSettings(prev => ({
        ...prev,
        adSettings: config.adSettings,
      }));
    }
    if (Array.isArray(config.plans) && config.plans.length > 0) {
      setPremiumPlans(config.plans);
    }
    applyPremiumEntitlement(config.entitlement || FREE_ENTITLEMENT);
  };

  useEffect(() => {
    loadAppData();
    setFavoriteDoorIds(getGuestFavorites());
    refreshCustomerSession();
    refreshMonetizationState();
  }, []);

  // Re-verify server-authoritative Ad-Free entitlement whenever customer logs in or logs out
  useEffect(() => {
    refreshMonetizationState();
  }, [currentCustomer?.id]);

  // Listen for "Remove Ads" click from any AdMobBannerSlot across the app
  useEffect(() => {
    const handleOpenPremiumEvent = () => {
      navigateToView('premium');
    };
    window.addEventListener('jhd:open-premium', handleOpenPremiumEvent);
    return () => window.removeEventListener('jhd:open-premium', handleOpenPremiumEvent);
  }, []);

  // Sync Admin Panel open state with AdMob Service: suppress ads ONLY while Admin Panel is open
  useEffect(() => {
    const isPathAdmin = typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/admin');
    const isAdminActive = showAdminPanel || isPathAdmin;
    adMobService.setAdminPanelActive(isAdminActive);
    adMobService.setAdminSessionActive(isAdminLoggedIn);
    if (isAdminActive) {
      adMobService.hideAdaptiveBanner();
    }
  }, [showAdminPanel, isAdminLoggedIn]);

  // Initialize Native Google AdMob SDK and preload ad units (skipped automatically when Premium is active)
  useEffect(() => {
    if (!adMobService.isAdminActive() && !showAdminPanel && !premiumEntitlement.isPremium) {
      adMobService.initialize(settings?.adSettings);
    }
  }, [settings?.adSettings, showAdminPanel, premiumEntitlement.isPremium]);

  // Format 6: Google AdMob App Open Ad (Cold start & Foreground return — strictly suppressed for Premium users)
  useEffect(() => {
    const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
    if (!isNative) return;

    let appStateHandle: { remove: () => Promise<void> } | null = null;
    CapApp.addListener('appStateChange', async (state) => {
      if (state.isActive) {
        // Re-verify subscription status on resume before showing any ad (handles expirations & renewals)
        await refreshMonetizationState();
        if (!adMobService.isAdminActive() && !showAdminPanel && !adMobService.isPremiumActive()) {
          adMobService.showAppOpenAd(settings?.adSettings);
        }
      }
    }).then(h => {
      appStateHandle = h;
    }).catch(() => {});

    // Cold start: Attempt App Open Ad after UI mounts (2.5s settle timer)
    const coldStartTimer = setTimeout(() => {
      if (!adMobService.isAdminActive() && !showAdminPanel && !adMobService.isPremiumActive()) {
        adMobService.showAppOpenAd(settings?.adSettings);
      }
    }, 2500);

    return () => {
      clearTimeout(coldStartTimer);
      if (appStateHandle?.remove) {
        appStateHandle.remove().catch(() => {});
      }
    };
  }, [settings?.adSettings, showAdminPanel]);

  useEffect(() => {
    // Configure native Android dark status bar only on native platforms
    const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
    if (isNative) {
      try {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#0c0a09' }).catch(() => {});
      } catch {
        // Fallback
      }
    }

    // Android Hardware Back Button navigation listener
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    let isCancelled = false;

    if (isNative) {
      CapApp.addListener('backButton', () => {
        if (isCancelled) return;
        // 1. If any modal is open, close the modal first
        if (selectedDoorForDetail) {
          setSelectedDoorForDetail(null);
          return;
        }
        if (showAdminPanel) {
          setShowAdminPanel(false);
          return;
        }
        if (showProfileModal) {
          setShowProfileModal(false);
          return;
        }
        if (quotationCalcResult || quotationDoor) {
          setQuotationCalcResult(null);
          setQuotationDoor(null);
          return;
        }
        // 2. If on sub-view, return to home view
        if (activeView !== 'home') {
          setActiveView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        // 3. Otherwise, exit native app
        CapApp.exitApp().catch(() => {});
      }).then((handle) => {
        if (isCancelled) {
          handle?.remove?.();
        } else {
          listenerHandle = handle;
        }
      }).catch(() => {});
    }

    return () => {
      isCancelled = true;
      if (listenerHandle && typeof listenerHandle.remove === 'function') {
        listenerHandle.remove().catch(() => {});
      }
    };
  }, [
    selectedDoorForDetail,
    showAdminPanel,
    showProfileModal,
    quotationCalcResult,
    quotationDoor,
    activeView,
  ]);

  const handleCloseAdminPanel = () => {
    setShowAdminPanel(false);
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleAdminTabNavigate = (tab: string) => {
    setAdminInitialTab(tab);
    window.history.pushState({}, '', `/admin/${tab}`);
  };

  const handleAdminLogoutSuccess = () => {
    setIsAdminLoggedIn(false);
    setShowAdminPanel(false);
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleOpenProfileModal = (tab?: unknown) => {
    const cleanTab: 'account' | 'payments' | 'orders' | 'favorites' | 'history' | 'notifications' =
      tab === 'account'
        ? 'account'
        : tab === 'payments'
        ? 'payments'
        : tab === 'orders'
        ? 'orders'
        : tab === 'notifications' && FEATURE_FLAGS.appMessages
        ? 'notifications'
        : tab === 'favorites' && FEATURE_FLAGS.doorCatalogue
        ? 'favorites'
        : tab === 'history'
        ? 'history'
        : currentCustomer
        ? 'account'
        : 'history';
    setProfileActiveTab(cleanTab);
    setShowProfileModal(true);
  };

  const handleRequireCalculationLogin = (resumeAction: () => void | Promise<void>) => {
    pendingCalculationActionRef.current = resumeAction;
    setShowLoginRequiredPopup(true);
  };

  const handleCustomerLogout = async () => {
    await logoutCustomerSession();
    applyCustomerSession(null);
    setActiveDoorCalculation(null);
    setCombinedChaukhat(null);
    setQuotationCalcResult(null);
    pendingCalculationActionRef.current = null;
  };

  const executeOnlinePayment = async (
    payload: CreateOrderRequestPayload,
    packIdForUi?: string | null
  ) => {
    setPaymentNotice(null);
    setIsProcessingPayment(true);
    if (packIdForUi) setPayingCreditPackId(packIdForUi);
    try {
      const outcome = await startRazorpayCheckoutFlow(payload);
      if (outcome.outcome === 'auth_required') {
        setPendingPaymentPayload(payload);
        setShowOtpLoginModal(true);
        return;
      }
      if (outcome.outcome === 'config_required') {
        setPaymentNotice({
          type: 'config',
          message: outcome.message,
          missingEnvVars: outcome.missingEnvVars,
        });
        return;
      }
      if (outcome.outcome === 'error' && !outcome.payment) {
        setPaymentNotice({
          type: 'error',
          message: outcome.message,
        });
        return;
      }

      if (typeof outcome.updatedCredits === 'number') {
        syncServerCredits(outcome.updatedCredits);
      }

      if (outcome.payment) {
        setActivePaymentReceipt({
          payment: outcome.payment,
          statusMessage: outcome.message,
        });
      }

      await refreshCustomerSession();
    } finally {
      setIsProcessingPayment(false);
      setPayingCreditPackId(null);
    }
  };

  const handleStartOnlinePayment = async (
    payload: CreateOrderRequestPayload,
    packIdForUi?: string | null
  ) => {
    if (!currentCustomer) {
      setPendingPaymentPayload(payload);
      setShowOtpLoginModal(true);
      return;
    }
    await executeOnlinePayment(payload, packIdForUi);
  };

  const handlePayOnlineCreditPack = async (pack: CreditPack) => {
    await handleStartOnlinePayment(
      { itemType: 'credit_pack', packId: pack.id },
      pack.id
    );
  };

  const handlePayOnlineQuote = async (quote: Quotation) => {
    await handleStartOnlinePayment({
      itemType: 'quotation',
      quoteId: quote.id,
    });
  };

  const handlePayOnlineChaukhat = async (chaukhatInput: {
    woodTypeId: string;
    sectionSizeId: string;
    customWidthInch?: number;
    customDepthInch?: number;
    heightFt: number;
    widthFt: number;
    designId: 'plain' | 'diamond' | 'hand_carved';
    productId?: string;
  }) => {
    await handleStartOnlinePayment({
      itemType: 'chaukhat_calculation',
      chaukhatInput,
    });
  };

  const handleToggleFavorite = async (doorId: string) => {
    const updated = toggleGuestFavorite(doorId);
    setFavoriteDoorIds(updated);
  };

  const handleLoadCalculation = (record: UserCalculationRecord) => {
    setLoadedCalcRecord(record);
    setShowProfileModal(false);
    if (FEATURE_FLAGS.doorCatalogue && record.doorId) {
      const foundDoor = doors.find(d => d.id === record.doorId);
      if (foundDoor) {
        setCalculatorDoor(foundDoor);
      }
    }
    setActiveView('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Canonical route navigation (safely redirects disabled views to Home)
  const navigateToView = (rawView: string) => {
    const view = isCustomerViewDisabled(rawView) ? 'home' : rawView;
    const fromView = activeView;
    if (fromView !== view && !adMobService.isAdminActive() && !showAdminPanel && view !== 'admin' && fromView !== 'admin') {
      adMobService.recordNavigationTransition(fromView, view, () => {}, settings?.adSettings);
    }
    setActiveView(view as any);
    const viewToPathMap: Record<string, string> = {
      home: '/',
      gallery: '/catalog',
      calculator: '/calculator',
      'sliding-window': '/sliding-window',
      visualizer: '/visualizer',
      articles: '/articles',
      about: '/about',
      contact: '/contact',
      privacy: '/privacy-policy',
      disclaimer: '/disclaimer',
      'wood-detector': '/wood-detector',
      tracking: '/track',
      premium: '/premium',
    };
    const targetPath = viewToPathMap[view] || '/';
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSlidingWindowSection = (
    tab: SlidingWindowWorkspaceTab = 'single',
    openScanner = false
  ) => {
    setSlidingWindowTab(tab);
    if (openScanner) {
      setScannerLaunchToken((prev) => prev + 1);
    }
    setActiveView('sliding-window');
    const subPath = tab === 'single' ? '/sliding-window' : `/sliding-window/${tab}`;
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      if (window.location.pathname !== subPath) {
        window.history.pushState({}, '', subPath);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenVisualizer = (door?: Door | null) => {
    if (door) {
      setVisualizerDoor(door);
    }
    navigateToView('visualizer');
  };

  const handleBannerAction = (action: string) => {
    const clean = String(action || 'gallery').replace(/^[\/#]+/, '').toLowerCase();
    if (action.startsWith('http://') || action.startsWith('https://')) {
      window.open(action, '_blank', 'noopener,noreferrer');
      return;
    }
    if (clean === 'sliding-window' || clean === 'sliding-window-calculator' || clean === 'window-calculator') {
      openSlidingWindowSection('single');
      return;
    }
    if (clean === 'chaukhat' || clean === 'chaukhat-calculator') {
      setCalculatorOption('chaukhat');
      navigateToView('calculator');
    } else if (clean === 'calculator' || clean === 'door-calculator') {
      setCalculatorOption('door');
      navigateToView('calculator');
    } else if (clean === 'gallery' || clean === 'doors' || clean === 'catalog' || clean === 'catalogue') {
      navigateToView('gallery');
    } else if (clean === 'visualizer' || clean === '3d' || clean === 'ar') {
      navigateToView('visualizer');
    } else if (clean === 'wood-detector') {
      navigateToView('wood-detector');
    } else if (clean === 'tracking' || clean === 'track') {
      navigateToView('tracking');
    } else if (clean === 'articles' || clean === 'blog') {
      navigateToView('articles');
    } else if (clean === 'whatsapp' || clean === 'contact') {
      navigateToView('contact');
    } else {
      navigateToView((clean as any) || 'gallery');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDoorDetail = (door: Door) => {
    setSelectedDoorForDetail(door);
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      const targetUrl = `/door/${encodeURIComponent(door.id)}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({}, '', targetUrl);
      }
    }
  };

  const handleCloseDoorDetail = () => {
    setSelectedDoorForDetail(null);
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      if (window.location.pathname.startsWith('/door/')) {
        const backUrl = activeView === 'gallery' ? '/catalog' : '/';
        window.history.pushState({}, '', backUrl);
      }
    }
  };

  // Handlers for cross-component workflows
  const handleCalculateDoor = (door: Door) => {
    setCalculatorDoor(door);
    handleCloseDoorDetail();
    navigateToView('calculator');
  };

  const handleOpenQuotationModal = (calcResult: CalculationResult, door?: Door | null) => {
    // Never interrupt customer quotation generation or PDF download with an interstitial ad
    setQuotationCalcResult(calcResult);
    setQuotationDoor(door || null);
  };

  // Featured doors list for Home Screen (Section 2)
  const featuredDoors = doors.filter(d => d.featured).slice(0, 4);

  return (
    <div className="min-h-screen bg-white text-[#0F172A] font-sans flex flex-col selection:bg-[#EFF6FF] selection:text-[#0B5ED7] pb-16 md:pb-0">
      
      {/* Official WindowCut Pro Splash Screen */}
      <SplashScreen minDurationMs={1100} isDataReady={!loading} />

      {/* Navigation Bar */}
      <Navbar
        settings={settings}
        businessName={settings.businessName}
        tagline={settings.tagline}
        whatsappNumber={settings.whatsappNumber}
        activeView={activeView}
        onNavigate={navigateToView}
        onOpenAdmin={() => setShowAdminPanel(true)}
        onTriggerAdminAccess={() => setShowAdminPanel(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenFavorites={() => handleOpenProfileModal('favorites')}
        onOpenProfile={handleOpenProfileModal}
        favoritesCount={favoriteDoorIds.length}
        currentCustomer={currentCustomer}
        onOpenCustomerAuth={() => {
          setOtpLoginCustomReason(null);
          setShowOtpLoginModal(true);
        }}
        isPremium={premiumEntitlement.isPremium}
      />

      {/* Payment Gateway Notice Banner (Config Required / Error) */}
      {paymentNotice && (
        <div
          id="payment-notice-banner"
          className="bg-amber-50 border-b border-amber-300 text-amber-950 px-4 py-3"
        >
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">
                  {paymentNotice.type === 'config'
                    ? 'Razorpay Online Payment Setup Required'
                    : 'Payment Could Not Start'}
                </div>
                <p>{paymentNotice.message}</p>
                {paymentNotice.missingEnvVars && paymentNotice.missingEnvVars.length > 0 && (
                  <p className="font-mono text-[11px] text-amber-900">
                    Required server environment variables: {paymentNotice.missingEnvVars.join(', ')}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPaymentNotice(null)}
              aria-label="Dismiss payment notice"
              className="p-1 rounded-lg hover:bg-amber-200/60 text-amber-900 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW 1: HOME SCREEN (Section 2) */}
        {activeView === 'home' && (
          <div className="space-y-4 sm:space-y-8">
            
            {/* Dynamic Homepage Banner Slider OR Lightweight Business Hero Header */}
            {FEATURE_FLAGS.homeBanners ? (
              <HomepageBannerSlider
                banners={mainBanners}
                settings={settings}
                onNavigate={(view) => {
                  const target = view.replace(/^[\/#]+/, '').toLowerCase();
                  if (target === 'chaukhat' || target === 'chaukhat-calculator') {
                    setCalculatorOption('chaukhat');
                    navigateToView('calculator');
                  } else if (target === 'calculator' || target === 'door-calculator') {
                    setCalculatorOption('door');
                    navigateToView('calculator');
                  } else if (target === 'doors' || target === 'catalogue' || target === 'catalog') {
                    navigateToView('gallery');
                  } else if (target === 'ar' || target === '3d') {
                    navigateToView('visualizer');
                  } else if (['home', 'gallery', 'calculator', 'sliding-window', 'visualizer', 'articles', 'contact', 'privacy', 'about', 'disclaimer', 'wood-detector', 'tracking'].includes(target)) {
                    navigateToView(target);
                  } else {
                    navigateToView('home');
                  }
                }}
              />
            ) : (
              <section className="bg-gradient-to-b from-[#F8FAFC] via-white to-white border-b border-[#E2E8F0]">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-7 sm:py-12">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
                    {/* Left Column: WindowCut Pro Value Proposition & Primary Actions */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B5ED7]">
                        <SlidingWindowIcon className="w-4 h-4 text-[#F97316]" />
                        <span>Aluminium &amp; Glass Precision · 2-Track &amp; 3-Track</span>
                      </div>

                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0A2540] tracking-tight leading-[1.1]">
                        WindowCut <span className="text-[#F97316]">Pro</span>
                      </h1>

                      <p className="text-base sm:text-lg font-semibold text-[#0B5ED7] -mt-2">
                        {resolveBrandTagline(settings.tagline)}
                      </p>

                      <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-2xl">
                        Compute exact cutting measurements for Top Track, Bottom Track, Glass Panels, Bearing Positions, Handle, Interlock, and Mosquito Net in seconds. Scan handwritten site notebooks or run multi-window bulk sheets with custom profile deductions.
                      </p>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          id="home-open-sliding-window-single-cta"
                          type="button"
                          onClick={() => openSlidingWindowSection('single')}
                          className="h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-[#0B5ED7] hover:bg-[#084BB3] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                        >
                          <SlidingWindowIcon className="w-4 h-4 text-white" />
                          <span>Sliding Window Size Calculator</span>
                        </button>

                        <button
                          id="home-open-photo-scanner-cta"
                          type="button"
                          onClick={() => openSlidingWindowSection('bulk', true)}
                          className="h-11 sm:h-12 px-5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                        >
                          <Camera className="w-4 h-4 text-white" />
                          <span>Photo Measurement Scanner</span>
                        </button>

                        <button
                          id="home-open-sliding-window-bulk-cta"
                          type="button"
                          onClick={() => openSlidingWindowSection('bulk')}
                          className="h-11 sm:h-12 px-4 sm:px-5 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0A2540] hover:text-[#0B5ED7] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 border border-[#CBD5E1] transition-colors cursor-pointer"
                        >
                          <Layers className="w-4 h-4 text-[#0B5ED7]" />
                          <span>Bulk Window Calculator</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-[#475569]">
                        <button
                          id="home-sw-settings-link"
                          type="button"
                          onClick={() => openSlidingWindowSection('settings')}
                          className="inline-flex items-center gap-1.5 font-semibold text-[#0A2540] hover:text-[#0B5ED7] underline underline-offset-4 cursor-pointer"
                        >
                          <Sliders className="w-3.5 h-3.5 text-[#0B5ED7]" />
                          <span>Fabrication Settings &amp; Rules</span>
                        </button>
                        <span className="text-[#CBD5E1]">|</span>
                        <button
                          id="home-sw-projects-link"
                          type="button"
                          onClick={() => openSlidingWindowSection('projects')}
                          className="inline-flex items-center gap-1.5 font-semibold text-[#0A2540] hover:text-[#0B5ED7] underline underline-offset-4 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-[#F97316]" />
                          <span>Saved Projects</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Official WindowCut Pro Brand Showcase */}
                    <div className="lg:col-span-5 flex justify-center lg:justify-end">
                      <div className="w-full max-w-sm bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-[0_12px_36px_rgba(11,94,215,0.08)] flex flex-col items-center text-center">
                        <img
                          src={resolveBrandLogoUrl(settings.logoUrl)}
                          alt={resolveBrandName(settings.businessName)}
                          className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = BRAND_LOGO_URL;
                          }}
                        />
                        <div className="w-full mt-4 pt-4 border-t border-[#E2E8F0] grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="font-mono text-sm font-extrabold text-[#0B5ED7]">2 &amp; 3</div>
                            <div className="text-[11px] font-medium text-[#64748B]">Track Systems</div>
                          </div>
                          <div className="border-x border-[#E2E8F0]">
                            <div className="font-mono text-sm font-extrabold text-[#F97316]">1/16&Prime;</div>
                            <div className="text-[11px] font-medium text-[#64748B]">Exact Decimals</div>
                          </div>
                          <div>
                            <div className="font-mono text-sm font-extrabold text-[#0A2540]">PDF/XLS</div>
                            <div className="text-[11px] font-medium text-[#64748B]">Cutting Sheets</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Core WindowCut Pro Fabrication Tools Suite */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center text-center pt-3 sm:pt-4 mb-6 sm:mb-8 gap-2">
                <span className="text-[#0B5ED7] font-bold text-xs tracking-wider uppercase">
                  Fabrication Calculator Suite
                </span>
                <h2 className="w-full max-w-2xl mx-auto text-center text-[clamp(1rem,4.6vw,1.35rem)] sm:text-2xl lg:text-3xl font-extrabold text-[#0A2540] tracking-tight leading-snug">
                  <span className="block">Every Sliding Window Cutting</span>{' '}
                  <span className="block">Calculation in One Place</span>
                </h2>
                <button
                  type="button"
                  onClick={() => openSlidingWindowSection('single')}
                  className="text-[#0B5ED7] hover:text-[#084BB3] font-semibold text-xs sm:text-sm inline-flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <span>Launch Calculator</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
                {[
                  {
                    id: 'tool-sliding-window-size',
                    title: 'Sliding Window Size Calculator',
                    desc: '2-Track & 3-Track shutter, track, interlock & handle sizes from opening dimensions.',
                    accent: 'blue',
                    icon: SlidingWindowIcon,
                    onClick: () => openSlidingWindowSection('single'),
                  },
                  {
                    id: 'tool-glass-cutting-size',
                    title: 'Glass Cutting Size Calculator',
                    desc: 'Exact glass panel width & height with custom deduction rules in inch decimals & mm.',
                    accent: 'blue',
                    icon: Grid3X3,
                    onClick: () => openSlidingWindowSection('single'),
                  },
                  {
                    id: 'tool-track-size',
                    title: 'Track Size Calculator',
                    desc: 'Accurate Top Track, Bottom Track & Side Frame cutting lengths for your profile.',
                    accent: 'blue',
                    icon: Ruler,
                    onClick: () => openSlidingWindowSection('single'),
                  },
                  {
                    id: 'tool-bearing-position',
                    title: 'Bearing Position Calculator',
                    desc: 'Exact bottom rail bearing placement, handle section & interlock cutting sizes.',
                    accent: 'orange',
                    icon: Wrench,
                    onClick: () => openSlidingWindowSection('single'),
                  },
                  {
                    id: 'tool-mosquito-net-size',
                    title: 'Mosquito Net Size Calculator',
                    desc: '3-Track mosquito net sash and mesh cutting dimensions calculated automatically.',
                    accent: 'blue',
                    icon: ShieldCheck,
                    onClick: () => openSlidingWindowSection('single'),
                  },
                  {
                    id: 'tool-bulk-window',
                    title: 'Bulk Window Calculator',
                    desc: 'Calculate entire project lists at once and export consolidated PDF or Excel sheets.',
                    accent: 'orange',
                    icon: Layers,
                    onClick: () => openSlidingWindowSection('bulk'),
                  },
                  {
                    id: 'tool-photo-scanner',
                    title: 'Photo Measurement Scanner',
                    desc: 'Scan handwritten measurement notes and import sizes directly into Bulk Calculator.',
                    accent: 'orange',
                    icon: Camera,
                    onClick: () => openSlidingWindowSection('bulk', true),
                  },
                  {
                    id: 'tool-fabrication-profiles',
                    title: 'Custom Profile Deductions',
                    desc: 'Save unlimited 2-Track & 3-Track workshop rules (Jindal, Domal) for repeat jobs.',
                    accent: 'blue',
                    icon: Sliders,
                    onClick: () => openSlidingWindowSection('settings'),
                  },
                ].map((tool) => {
                  const Icon = tool.icon;
                  const isOrange = tool.accent === 'orange';
                  return (
                    <button
                      key={tool.id}
                      id={tool.id}
                      type="button"
                      onClick={tool.onClick}
                      className="group h-full w-full min-w-0 text-left bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0B5ED7] rounded-xl p-3 sm:p-4 lg:p-5 transition-all shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-md flex flex-col justify-between gap-2.5 sm:gap-3 cursor-pointer"
                    >
                      <div className="space-y-2 sm:space-y-2.5">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                            isOrange
                              ? 'bg-[#FFF7ED] text-[#F97316] border-[#FED7AA]'
                              : 'bg-[#EFF6FF] text-[#0B5ED7] border-[#BFDBFE]'
                          }`}
                        >
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <h3 className="text-[13px] sm:text-sm lg:text-base font-bold text-[#0A2540] group-hover:text-[#0B5ED7] transition-colors leading-snug">
                          {tool.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-[#475569] leading-relaxed line-clamp-3">
                          {tool.desc}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[#0B5ED7] pt-1 mt-auto">
                        <span>Open Tool</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Indian Aluminium Window Systems & Categories (A: Sliding, B: Indian Aluminium, C: Special) */}
            <WindowCategoryHomeSection
              systems={windowSystems}
              onSelectCategory={(catId) => {
                setSelectedWindowCategoryId(catId);
                setActiveView('window-category');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectSystem={(sys) => {
                setSelectedWindowLaunch({
                  system: sys,
                  profileSeriesId: sys.profileSeries[0]?.id,
                  trackCount: sys.defaultTrackCount,
                  shutterCount: sys.defaultShutterCount,
                  includeMosquitoNet: sys.defaultMosquitoNet,
                });
                setActiveView('window-system-calculator');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* Additional Workshop Utilities (Existing Calculators Preserved Cleanly) */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
                    Additional Workshop Utilities
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0A2540]">
                    Frame Estimator &amp; AI Wood Identification
                  </h3>
                  <p className="text-xs sm:text-sm text-[#475569] max-w-xl">
                    Need to calculate frame/chaukhat measurements or scan timber photos? Access all saved workshop tools from your WindowCut Pro account.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    id="home-open-calc-cta"
                    type="button"
                    onClick={() => {
                      setCalculatorOption('door');
                      navigateToView('calculator');
                    }}
                    className="h-10 px-4 rounded-xl bg-white hover:bg-[#EFF6FF] text-[#0A2540] hover:text-[#0B5ED7] border border-[#CBD5E1] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Calculator className="w-4 h-4 text-[#0B5ED7]" />
                    <span>Frame &amp; Shutter Estimator</span>
                  </button>
                  <button
                    id="home-open-wood-detector-cta"
                    type="button"
                    onClick={() => {
                      navigateToView('wood-detector');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="h-10 px-4 rounded-xl bg-white hover:bg-[#FFF7ED] text-[#0A2540] hover:text-[#EA580C] border border-[#CBD5E1] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#F97316]" />
                    <span>AI Wood Detector</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Order Tracking Banner on Home Screen */}
            {FEATURE_FLAGS.orderTracking && (
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
                <div className="space-y-1.5 text-center lg:text-left z-10 max-w-xl">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 uppercase tracking-wide">
                    <Truck className="w-3 h-3 text-[#C89211]" />
                    <span>Real-Time Manufacturing &amp; Dispatch</span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#1A1A1A]">
                    Track Your Custom Door Order
                  </h3>
                  <p className="text-[#666666] text-xs sm:text-sm leading-relaxed">
                    Check your 15 live craftsmanship stages from wood selection and workshop joinery to 100% door ready, polishing, and dispatch to your doorstep.
                  </p>
                </div>

                <div className="z-10 w-full lg:w-auto flex flex-col sm:flex-row items-center gap-2.5">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const input = form.elements.namedItem('homeTrackId') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        setTrackingInitialId(input.value.trim().toUpperCase());
                        navigateToView('tracking');
                      } else {
                        navigateToView('tracking');
                      }
                    }}
                    className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto"
                  >
                    <div className="relative w-full sm:w-64">
                      <input
                        type="text"
                        name="homeTrackId"
                        placeholder="Tracking ID (e.g. JHD-2026-H8K24)"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E5E5E5] rounded-xl text-[#1A1A1A] placeholder-[#999999] text-xs font-mono uppercase focus:outline-none focus:border-[#C89211] h-11"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full sm:w-auto h-11 px-5 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Track Order</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
            )}

            {/* Door Categories Grid (Section 2 & 3) */}
            {FEATURE_FLAGS.doorCatalogue && (
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-8 gap-2 sm:gap-4">
                <div>
                  <span className="text-[#C89211] font-semibold text-xs tracking-wider uppercase">
                    Woodwork Collections
                  </span>
                  <h2 className="font-serif text-xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight mt-0.5">
                    Popular Door Categories
                  </h2>
                </div>
                <button
                  onClick={() => {
                    navigateToView('gallery');
                  }}
                  className="text-[#C89211] hover:text-[#A0700B] font-semibold text-xs sm:text-sm flex items-center gap-1 group self-start sm:self-auto"
                >
                  <span>View All Categories</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                {[
                  { name: 'Sagwan Door', tag: 'CP Teak Wood', img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80' },
                  { name: 'Designer Door', tag: 'Hand Carved', img: 'https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=600&q=80' },
                  { name: 'Main Door', tag: 'Heavy Security', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
                  { name: 'Double Door', tag: 'Jodi Darwaja', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
                  { name: 'Door Frame / Chaukhat', tag: 'Seasoned Timber', img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80' },
                  { name: 'Traditional Door', tag: 'Temple & Royal', img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80' },
                  { name: 'Modern Door', tag: 'CNC Fluted', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
                  { name: 'Premium Door', tag: 'Italian PU Finish', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' },
                ].map((cat, i) => (
                  <div
                    key={cat.name}
                    id={`home-cat-card-${i}`}
                    onClick={() => {
                      navigateToView('gallery');
                    }}
                    className="group cursor-pointer bg-white rounded-xl border border-stone-200/90 hover:border-amber-400 p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all flex items-center gap-3"
                  >
                    <div className="w-12 h-14 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                      <img src={cat.img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div>
                      <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                        {cat.name}
                      </h4>
                      <span className="text-[11px] text-stone-500">{cat.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* PROMOTIONAL BANNER CAROUSEL (Slot 1: Direct From Manufacturer & Main Door Collections) */}
            {FEATURE_FLAGS.homeBanners && (
              <PromotionalBannerCarousel
                banners={promotionBanners}
                slotId="slot_1"
                onBannerAction={handleBannerAction}
              />
            )}

            {/* Featured Doors Section (Section 2) */}
            {FEATURE_FLAGS.doorCatalogue && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                  <span className="text-amber-600 font-semibold text-xs sm:text-sm tracking-wider uppercase">
                    Handcrafted Highlights
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
                    Featured Door Designs
                  </h2>
                </div>
                <button
                  onClick={() => navigateToView('gallery')}
                  className="text-amber-700 hover:text-amber-800 font-semibold text-xs sm:text-sm flex items-center gap-1 group"
                >
                  <span>Explore Full Catalog ({doors.length})</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
                {(featuredDoors.length > 0 ? featuredDoors : doors.slice(0, 4)).map(door => (
                  <div
                    key={door.id}
                    id={`featured-card-${door.id}`}
                    className="group bg-white rounded-xl sm:rounded-2xl border border-[#E5E5E5] shadow-sm hover:shadow-xl hover:border-[#C89211]/50 transition-all duration-300 flex flex-col overflow-hidden"
                  >
                    <div
                      className="relative aspect-[3/4] bg-stone-100 overflow-hidden cursor-pointer"
                      onClick={() => handleOpenDoorDetail(door)}
                    >
                      <img
                        src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'}
                        alt={door.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-2 sm:top-3 left-2 sm:left-3 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[11px] font-semibold bg-white/90 backdrop-blur-md text-[#1A1A1A] border border-[#E5E5E5] shadow-sm">
                        {door.category}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(door.id);
                        }}
                        title={favoriteDoorIds.includes(door.id) ? 'Remove from Saved' : 'Save Door'}
                        className={`absolute top-2 sm:top-3 right-2 sm:right-3 p-1 sm:p-1.5 rounded-full backdrop-blur-md transition-all ${
                          favoriteDoorIds.includes(door.id)
                            ? 'bg-white text-rose-500 shadow-md ring-1 ring-rose-500/50'
                            : 'bg-white/80 hover:bg-white text-[#666666] hover:text-rose-500 border border-[#E5E5E5]'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                            favoriteDoorIds.includes(door.id) ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-2.5 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3
                          onClick={() => handleOpenDoorDetail(door)}
                          className="font-serif text-xs sm:text-lg font-bold text-[#1A1A1A] group-hover:text-[#C89211] cursor-pointer transition-colors line-clamp-1"
                        >
                          {door.name}
                        </h3>
                        <p className="hidden sm:block text-[#666666] text-xs mt-1 line-clamp-2 leading-relaxed">
                          {door.description}
                        </p>
                      </div>

                      <div className="pt-2 sm:pt-3 mt-1.5 sm:mt-3 border-t border-[#E5E5E5]">
                        <div className="flex items-baseline justify-between mb-1.5 sm:mb-3">
                          <span className="text-[10px] sm:text-xs text-[#666666]">From:</span>
                          <span className="text-xs sm:text-lg font-bold text-[#C89211] font-mono">
                            ₹{door.startingPrice.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                          <button
                            id={`home-view-in-home-${door.id}`}
                            onClick={() => handleOpenVisualizer(door)}
                            className="w-full py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Box className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                            <span className="truncate">View 3D/AR</span>
                          </button>

                          <div className="grid grid-cols-2 gap-1 sm:gap-2">
                            <button
                              onClick={() => handleOpenDoorDetail(door)}
                              className="py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-lg sm:rounded-xl bg-[#F8F8F6] hover:bg-[#EFEFEF] text-[#1A1A1A] font-semibold text-[10px] sm:text-xs flex items-center justify-center gap-0.5 sm:gap-1.5 transition-colors border border-[#E5E5E5]"
                            >
                              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#666666]" />
                              <span>Details</span>
                            </button>

                            <button
                              onClick={() => handleCalculateDoor(door)}
                              className="py-1.5 sm:py-2 px-1 sm:px-2.5 rounded-lg sm:rounded-xl bg-[#FFF7E3] hover:bg-[#FFECC0] text-[#C89211] font-semibold text-[10px] sm:text-xs flex items-center justify-center gap-0.5 sm:gap-1.5 border border-[#C89211]/30 transition-all cursor-pointer"
                            >
                              <Calculator className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C89211]" />
                              <span>Price</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Why Fabricators Choose WindowCut Pro */}
            <div className="bg-[#F8FAFC] border-y border-[#E2E8F0] py-8 sm:py-14">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-9">
                  <span className="text-[#0B5ED7] font-bold text-xs tracking-wider uppercase">
                    Workshop-Grade Precision
                  </span>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-[#0A2540] tracking-tight mt-1">
                    Built for Faster, Error-Free Sliding Window Fabrication
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#0B5ED7] flex items-center justify-center border border-[#BFDBFE]">
                      <Ruler className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0A2540]">
                      Exact Fraction to Decimal
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Every 1/16&Prime; to 15/16&Prime; inch measurement converts automatically using the exact workshop decimal table with zero rounding drift.
                    </p>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center border border-[#FED7AA]">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0A2540]">
                      Custom Profile Rules
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Configure and save your own aluminium section deductions for 2-Track and 3-Track profiles, glass clearances, and mosquito nets.
                    </p>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#0B5ED7] flex items-center justify-center border border-[#BFDBFE]">
                      <Camera className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0A2540]">
                      Photo Measurement Scanner
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Snap a photo of handwritten site notebook sizes and turn them into verified bulk cutting tables in seconds.
                    </p>
                  </div>

                  <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E2E8F0] shadow-xs space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center border border-[#FED7AA]">
                      <Award className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#0A2540]">
                      PDF, SVG &amp; Excel Export
                    </h3>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      Download clean workshop cutting lists, dimensioned technical drawings, and batch spreadsheets ready for sharing on WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PROMOTIONAL BANNER B (Below Why Indian Homeowners Trust Our Doors, Above Our Story) */}
            {FEATURE_FLAGS.homeBanners && (
              <PromotionalBannerCarousel
                banners={promotionBanners}
                slotId="slot_2"
                onBannerAction={handleBannerAction}
              />
            )}

            {/* Our Story & Heritage + Owner Section */}
            {FEATURE_FLAGS.ourStoryAndTeam && (
              <OurStorySection teamMembers={teamMembers} settings={settings} />
            )}

            {/* ALL INDIA DELIVERY SECTION (Door Delivery Across India - Slidable State Cards & Stories) */}
            {FEATURE_FLAGS.allIndiaDelivery && (
              <AllIndiaDeliverySection
                states={deliveryStates}
                stories={deliveryStories}
                settings={settings}
                onOpenCalculator={() => {
                  navigateToView('calculator');
                }}
                className="my-3 sm:my-5"
              />
            )}

            {/* Articles & Guides Preview Carousel */}
            {FEATURE_FLAGS.articlesBlog && (
              <ArticlesGuidesCarousel
                articles={articles}
                settings={settings}
                onViewAll={() => {
                  setSelectedArticleIdForView(null);
                  navigateToView('articles');
                }}
                onSelectArticle={(art: Article) => {
                  setSelectedArticleIdForView(art.id);
                  navigateToView('articles');
                }}
                className="mt-2 mb-2"
              />
            )}

            {/* AdMob Adaptive Banner Placement (Home Screen) */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 mb-2">
              <AdMobBannerSlot placement="home" settings={settings} />
            </div>

            {/* Design & Content Protection Warning / Copyright Section */}
            {FEATURE_FLAGS.copyrightFooter && (
              <ContentProtectionWarning
                settings={settings}
                onNavigateLegal={navigateToView}
                className="mt-6 mb-2"
              />
            )}

          </div>
        )}

        {/* VIEW 2: DOOR GALLERY (Section 3) */}
        {FEATURE_FLAGS.doorCatalogue && activeView === 'gallery' && (
          <DoorGallery
            doors={doors}
            categories={categories}
            banners={banners}
            onSelectDoor={door => handleOpenDoorDetail(door)}
            onCalculateDoor={handleCalculateDoor}
            onOpenVisualizer={FEATURE_FLAGS.visualizer3dAr ? handleOpenVisualizer : undefined}
            onNavigate={navigateToView}
            settings={settings}
            favoriteDoorIds={favoriteDoorIds}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {/* VIEW 3: SEPARATE DOOR & CHAUKHAT PRICE CALCULATORS */}
        {activeView === 'calculator' && (
          calculatorOption === 'door' ? (
            <DoorCalculator
              doors={doors}
              categories={categories}
              materials={materials}
              finishes={finishes}
              frames={frames}
              hardware={hardware}
              settings={settings}
              preselectedDoor={calculatorDoor}
              onClearPreselectedDoor={() => setCalculatorDoor(null)}
              onOpenQuotationModal={(calc, door) => {
                setActiveDoorCalculation(calc);
                handleOpenQuotationModal(calc, door);
              }}
              onOpenVisualizer={FEATURE_FLAGS.visualizer3dAr ? handleOpenVisualizer : undefined}
              onOpenProfileHistory={() => handleOpenProfileModal('history')}
              initialCalculationRecord={loadedCalcRecord}
              onClearInitialRecord={() => setLoadedCalcRecord(null)}
              onSwitchToChaukhatCalculator={() => {
                setCalculatorOption('chaukhat');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              activeChaukhatCalculation={combinedChaukhat}
              currentCustomer={currentCustomer}
              onRequireCalculationLogin={handleRequireCalculationLogin}
            />
          ) : (
            <ChaukhatCalculator
              settings={settings}
              activeDoorCalculation={activeDoorCalculation || quotationCalcResult}
              activeDoor={calculatorDoor || quotationDoor}
              onSwitchToDoorCalculator={() => {
                setCalculatorOption('door');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onUpdateCombinedChaukhat={(result) => setCombinedChaukhat(result)}
              currentCustomer={currentCustomer}
              onPayOnlineChaukhat={handlePayOnlineChaukhat}
              isPayingOnline={isProcessingPayment}
              onRequireCalculationLogin={handleRequireCalculationLogin}
            />
          )
        )}

        {/* VIEW 3A: INDIAN WINDOW CATEGORY SELECTION SCREEN */}
        {activeView === 'window-category' && (
          <WindowSelectionScreen
            initialCategoryId={selectedWindowCategoryId}
            systems={windowSystems}
            onBack={() => navigateToView('home')}
            onLaunchCalculator={(config) => {
              setSelectedWindowLaunch(config);
              setActiveView('window-system-calculator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW 3A-2: DEDICATED INDIAN WINDOW SYSTEM CUTTING CALCULATOR */}
        {activeView === 'window-system-calculator' && selectedWindowLaunch && (
          <WindowSystemCalculatorView
            system={
              windowSystems.find((s) => s.id === selectedWindowLaunch.system.id) ||
              selectedWindowLaunch.system
            }
            allSystems={windowSystems}
            initialProfileSeriesId={selectedWindowLaunch.profileSeriesId}
            initialTrackCount={selectedWindowLaunch.trackCount}
            initialShutterCount={selectedWindowLaunch.shutterCount}
            initialMosquitoNet={selectedWindowLaunch.includeMosquitoNet}
            customerUser={currentCustomer}
            settings={settings}
            isAdminLoggedIn={isAdminLoggedIn}
            onBack={() => {
              setSelectedWindowCategoryId(selectedWindowLaunch.system.categoryId);
              setActiveView('window-category');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSwitchSystem={(nextSys) => {
              setSelectedWindowLaunch({
                system: nextSys,
                profileSeriesId: nextSys.profileSeries[0]?.id,
                trackCount: nextSys.defaultTrackCount,
                shutterCount: nextSys.defaultShutterCount,
                includeMosquitoNet: nextSys.defaultMosquitoNet,
              });
            }}
            onOpenLegacySlidingWorkspace={(tab) => openSlidingWindowSection(tab)}
            onOpenAdminFormulaManager={() => {
              setAdminInitialTab('window-systems');
              setShowAdminPanel(true);
            }}
            onRequireCalculationLogin={(_reason, onSuccess) => {
              if (currentCustomer) return true;
              handleRequireCalculationLogin(() => {
                if (onSuccess) onSuccess();
              });
              return false;
            }}
          />
        )}

        {/* VIEW 3B: SLIDING WINDOW FABRICATION CALCULATOR */}
        {activeView === 'sliding-window' && (
          <React.Suspense fallback={<div className="py-16 text-center text-sm text-[#64748B]">Loading Sliding Window Fabrication Calculator...</div>}>
            <SlidingWindowCalculator
              settings={settings}
              initialTab={slidingWindowTab}
              scannerLaunchToken={scannerLaunchToken}
              onTabChange={(tab) => {
                setSlidingWindowTab(tab);
                const subPath = tab === 'single' ? '/sliding-window' : `/sliding-window/${tab}`;
                if (typeof window !== 'undefined' && window.history && window.history.pushState) {
                  if (window.location.pathname !== subPath) {
                    window.history.pushState({}, '', subPath);
                  }
                }
              }}
              onSwitchToDoorCalculator={() => {
                setCalculatorOption('door');
                navigateToView('calculator');
              }}
              onSwitchToChaukhatCalculator={() => {
                setCalculatorOption('chaukhat');
                navigateToView('calculator');
              }}
              currentCustomer={currentCustomer}
              onRequireCalculationLogin={handleRequireCalculationLogin}
            />
          </React.Suspense>
        )}

        {/* VIEW: 3D & AR DOOR FITTING STUDIO */}
        {FEATURE_FLAGS.visualizer3dAr && activeView === 'visualizer' && (
          <React.Suspense fallback={<div className="py-16 text-center text-sm text-stone-500">Loading 3D & AR Studio...</div>}>
            <DoorVisualizerPage
              doors={doors}
              categories={categories}
              initialDoor={visualizerDoor}
              materials={materials}
              finishes={finishes}
              frames={frames}
              hardware={hardware}
              settings={settings}
              onNavigateHome={() => {
                navigateToView('home');
              }}
              onNavigateCatalog={() => {
                navigateToView('gallery');
              }}
              onOpenQuotationModal={(calc, door) => {
                handleOpenQuotationModal(calc, door);
              }}
            />
          </React.Suspense>
        )}

        {/* VIEW 4: ARTICLES & GUIDES (Section 17) */}
        {FEATURE_FLAGS.articlesBlog && activeView === 'articles' && (
          <>
            <ArticlesSection
              articles={articles}
              doors={doors}
              settings={settings}
              initialArticleId={selectedArticleIdForView}
              onOpenCalculator={door => handleCalculateDoor(door)}
              onOpenDoorDetail={door => handleOpenDoorDetail(door)}
            />
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 mb-2">
              <AdMobBannerSlot placement="guide" settings={settings} />
            </div>
          </>
        )}

        {/* VIEW 5: CONTACT US & ENQUIRIES */}
        {activeView === 'contact' && (
          <ContactUsPage
            settings={settings}
            doors={FEATURE_FLAGS.doorCatalogue ? doors : []}
            onBack={() => navigateToView('home')}
            onOpenCalculator={door => handleCalculateDoor(door)}
            onOpenGallery={FEATURE_FLAGS.doorCatalogue ? () => navigateToView('gallery') : undefined}
          />
        )}

        {/* VIEW 6: PRIVACY POLICY */}
        {activeView === 'privacy' && (
          <PrivacyPolicyPage
            settings={settings}
            onBack={() => navigateToView('home')}
            onNavigateContact={() => navigateToView('contact')}
          />
        )}

        {/* VIEW 7: ABOUT WINDOWCUT PRO */}
        {activeView === 'about' && (
          <AboutUsPage
            settings={settings}
            teamMembers={FEATURE_FLAGS.ourStoryAndTeam ? teamMembers : []}
            onBack={() => navigateToView('home')}
            onNavigateGallery={FEATURE_FLAGS.doorCatalogue ? () => navigateToView('gallery') : undefined}
            onNavigateCalculator={() => openSlidingWindowSection('single')}
            onNavigateContact={() => navigateToView('contact')}
          />
        )}

        {/* VIEW 8: DISCLAIMER & ESTIMATION TERMS */}
        {FEATURE_FLAGS.copyrightFooter && activeView === 'disclaimer' && (
          <DisclaimerPage
            settings={settings}
            onBack={() => navigateToView('home')}
            onNavigateCalculator={() => navigateToView('calculator')}
            onNavigateContact={() => navigateToView('contact')}
          />
        )}

        {/* VIEW 9: AI WOOD DETECTOR (LAKDI KI PEHCHAN) */}
        {activeView === 'wood-detector' && (
          <React.Suspense fallback={<div className="py-16 text-center text-sm text-stone-500">Loading AI Wood Detector...</div>}>
            <AIWoodDetector
              settings={settings}
              onNavigateToCatalog={FEATURE_FLAGS.doorCatalogue ? () => navigateToView('gallery') : undefined}
              onNavigateToCalculator={() => navigateToView('calculator')}
              onNavigateToContact={() => navigateToView('contact')}
              onPayOnlineCreditPack={handlePayOnlineCreditPack}
              payingPackId={payingCreditPackId}
              currentCustomer={currentCustomer}
              onRequireCalculationLogin={handleRequireCalculationLogin}
            />
          </React.Suspense>
        )}

        {/* VIEW 10: CUSTOMER ORDER TRACKING */}
        {FEATURE_FLAGS.orderTracking && activeView === 'tracking' && (
          <React.Suspense fallback={<div className="py-16 text-center text-sm text-stone-500">Loading Order Tracking...</div>}>
            <CustomerOrderTracking
              initialTrackingId={trackingInitialId}
              onNavigateHome={() => {
                navigateToView('home');
              }}
              onSelectDoor={
                FEATURE_FLAGS.doorCatalogue
                  ? (doorId) => {
                      const door = doors.find(d => d.id === doorId);
                      if (door) {
                        handleOpenDoorDetail(door);
                      }
                    }
                  : undefined
              }
            />
            <div className="max-w-4xl mx-auto px-3 sm:px-6 mt-4 mb-2">
              <AdMobBannerSlot placement="tracking" settings={settings} />
            </div>
          </React.Suspense>
        )}

        {/* VIEW 11: WINDOWCUT PRO PREMIUM (AD-FREE SUBSCRIPTION) */}
        {activeView === 'premium' && (
          <PremiumSubscriptionView
            currentCustomer={currentCustomer}
            entitlement={premiumEntitlement}
            plans={premiumPlans}
            onEntitlementUpdated={applyPremiumEntitlement}
            onRequireLogin={(reason) => {
              setOtpLoginCustomReason(reason || null);
              setShowOtpLoginModal(true);
            }}
            onBack={() => navigateToView('home')}
          />
        )}
      </main>

      {/* Footer (WindowCut Pro Navigation & Support) */}
      <footer className="bg-[#F8FAFC] text-[#475569] border-t border-[#E2E8F0] pt-8 sm:pt-10 pb-20 sm:pb-9 mt-6 sm:mt-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${FEATURE_FLAGS.copyrightFooter ? 'lg:grid-cols-5 mb-8 sm:mb-10' : 'lg:grid-cols-4'} gap-6 sm:gap-8`}>
            {/* Business Brand (Hidden 6-tap admin gesture preserved) */}
            <div className="space-y-3 sm:col-span-2 lg:col-span-1">
              <div
                id="footer-brand-logo"
                data-testid="footer-brand-logo"
                onClick={handleFooterLogoTap}
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                title={resolveBrandName(settings.businessName)}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#E2E8F0] shadow-xs bg-white flex items-center justify-center shrink-0 p-0.5 group-hover:border-[#0B5ED7] transition-colors">
                  <img
                    src={resolveBrandLogoUrl(settings.logoUrl)}
                    alt={resolveBrandName(settings.businessName)}
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = BRAND_LOGO_URL;
                    }}
                  />
                </div>
                <div>
                  <span className="text-lg font-extrabold text-[#0A2540] tracking-tight group-hover:text-[#0B5ED7] transition-colors block leading-none">
                    {resolveBrandName(settings.businessName)}
                  </span>
                  <span className="text-[11px] font-semibold text-[#0B5ED7] block mt-0.5">
                    {resolveBrandTagline(settings.tagline)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                Precision 2-Track &amp; 3-Track sliding window cutting lists, glass sizes, bearing positions, mosquito net dimensions, bulk batch sheets, and photo measurement scanning.
              </p>
            </div>

            {/* Calculators & Tools */}
            <div>
              <h4 className="text-sm font-bold text-[#0A2540] mb-3">
                Fabrication Calculators
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    id="footer-link-sliding-window"
                    onClick={() => openSlidingWindowSection('single')}
                    className="text-[#475569] hover:text-[#0B5ED7] transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                  >
                    <SlidingWindowIcon className="w-3.5 h-3.5 text-[#0B5ED7]" />
                    <span>Sliding Window Size Calculator</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openSlidingWindowSection('bulk')}
                    className="text-[#475569] hover:text-[#0B5ED7] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>Bulk Window Calculator</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openSlidingWindowSection('bulk', true)}
                    className="text-[#475569] hover:text-[#0B5ED7] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#0B5ED7]" />
                    <span>Photo Measurement Scanner</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => openSlidingWindowSection('settings')}
                    className="text-[#475569] hover:text-[#0B5ED7] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#475569]" />
                    <span>Fabrication Settings &amp; Rules</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateToView('calculator')}
                    className="text-[#475569] hover:text-[#0B5ED7] transition-colors cursor-pointer"
                  >
                    Frame &amp; Shutter Estimator
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-wood-detector"
                    onClick={() => navigateToView('wood-detector')}
                    className="text-[#475569] hover:text-[#0B5ED7] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>AI Wood Detector</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Application & Policies */}
            <div>
              <h4 className="text-sm font-bold text-[#0A2540] mb-3">
                Application &amp; Info
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    id="footer-link-premium"
                    onClick={() => navigateToView('premium')}
                    className="text-[#475569] hover:text-[#F97316] transition-colors flex items-center gap-1.5 cursor-pointer font-semibold"
                  >
                    <Award className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>{premiumEntitlement.isPremium ? 'WindowCut Pro Premium (Active)' : 'Remove Ads (Premium)'}</span>
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-about"
                    onClick={() => navigateToView('about')}
                    className="text-[#475569] hover:text-[#0B5ED7] transition-colors text-left cursor-pointer"
                  >
                    About WindowCut Pro
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-contact"
                    onClick={() => navigateToView('contact')}
                    className="text-[#475569] hover:text-[#0B5ED7] transition-colors text-left cursor-pointer"
                  >
                    Contact &amp; Support
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-privacy"
                    onClick={() => navigateToView('privacy')}
                    className="text-[#475569] hover:text-[#0B5ED7] transition-colors text-left cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Direct Support & Assistance */}
            <div>
              <h4 className="text-sm font-bold text-[#0A2540] mb-3">
                Support &amp; Assistance
              </h4>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[#64748B]">Support Email:</span>{' '}
                  <a href={`mailto:${settings.email || 'support@windowcutpro.com'}`} className="text-[#0F172A] hover:text-[#0B5ED7] font-medium">
                    {settings.email || 'support@windowcutpro.com'}
                  </a>
                </div>
                <p className="text-[#64748B] leading-relaxed">
                  Need help with profile deductions, bulk sheets, or account support? Reach out via our in-app support desk.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => navigateToView('contact')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#EFF6FF] border border-[#CBD5E1] hover:border-[#0B5ED7] text-left transition-colors group cursor-pointer"
                  >
                    <span className="font-semibold text-xs text-[#0A2540] group-hover:text-[#0B5ED7]">
                      Open Support Form →
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {FEATURE_FLAGS.copyrightFooter && (
            <div className="pt-8 border-t border-[#E2E8F0] text-center text-xs text-[#64748B] flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                © {new Date().getFullYear()} {resolveBrandName(settings.businessName)}. All rights reserved.
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                <button
                  onClick={() => navigateToView('privacy')}
                  className="text-[#64748B] hover:text-[#0B5ED7] transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
                <span className="text-[#CBD5E1]">•</span>
                <button
                  onClick={() => navigateToView('about')}
                  className="text-[#64748B] hover:text-[#0B5ED7] transition-colors cursor-pointer"
                >
                  About
                </button>
                <span className="text-[#CBD5E1]">•</span>
                <button
                  onClick={() => navigateToView('contact')}
                  className="text-[#64748B] hover:text-[#0B5ED7] transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Section 2 & 27) */}
      <BottomNav
        activeView={activeView}
        onNavigate={navigateToView}
        onOpenFavorites={() => handleOpenProfileModal('favorites')}
        onOpenProfile={handleOpenProfileModal}
        favoritesCount={favoriteDoorIds.length}
        isPremium={premiumEntitlement.isPremium}
      />

      {/* MODAL 1: Door Detail Modal (Section 3) */}
      {FEATURE_FLAGS.doorCatalogue && selectedDoorForDetail && (
        <DoorDetailModal
          door={selectedDoorForDetail}
          onClose={handleCloseDoorDetail}
          onCalculateThisDoor={handleCalculateDoor}
          onOpenVisualizer={
            FEATURE_FLAGS.visualizer3dAr
              ? (door) => {
                  handleCloseDoorDetail();
                  handleOpenVisualizer(door);
                }
              : undefined
          }
          allDoors={doors}
          onSelectDoor={d => handleOpenDoorDetail(d)}
          settings={settings}
          favoriteDoorIds={favoriteDoorIds}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* MODAL 2: Quotation Generator Modal (Section 11) */}
      {quotationCalcResult && (
        <QuotationModal
          calculation={quotationCalcResult}
          door={quotationDoor}
          settings={settings}
          onClose={() => setQuotationCalcResult(null)}
          currentCustomer={currentCustomer}
          materials={materials}
          finishes={finishes}
          frames={frames}
          hardware={hardware}
          onPayOnlineQuote={handlePayOnlineQuote}
          isPayingOnline={isProcessingPayment}
        />
      )}

      {/* MODAL 4: Full Admin Control Center (Sections 13, 14, 15, 16, 22) */}
      {showAdminPanel && (
        <React.Suspense fallback={null}>
          <AdminPanel
            isOpen={showAdminPanel}
            onClose={handleCloseAdminPanel}
            onDataUpdated={loadAppData}
            isLoggedIn={isAdminLoggedIn}
            setIsLoggedIn={setIsAdminLoggedIn}
            initialTab={adminInitialTab}
            onNavigateTab={handleAdminTabNavigate}
            onLogoutSuccess={handleAdminLogoutSuccess}
          />
        </React.Suspense>
      )}

      {/* MODAL 5: Customer Account, Payment History, Orders & Saved Estimates */}
      {showProfileModal && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          settings={settings}
          doors={doors}
          initialTab={profileActiveTab}
          currentCustomer={currentCustomer}
          entitlement={premiumEntitlement}
          onOpenPremium={() => {
            setShowProfileModal(false);
            navigateToView('premium');
          }}
          customerPayments={customerPayments}
          customerQuotes={customerQuotes}
          customerOrders={customerOrders}
          onOpenOtpLogin={() => {
            setShowProfileModal(false);
            setShowOtpLoginModal(true);
          }}
          onCustomerUpdated={(updated) => setCurrentCustomer(updated)}
          onCustomerLogout={handleCustomerLogout}
          onSelectDoor={door => {
            setShowProfileModal(false);
            handleOpenDoorDetail(door);
          }}
          onCalculateDoor={door => {
            setShowProfileModal(false);
            handleCalculateDoor(door);
          }}
          onLoadCalculation={handleLoadCalculation}
        />
      )}

      {/* MODAL 5B: Mandatory Login Required Popup for Guest Calculation Attempts */}
      <LoginRequiredPopup
        isOpen={showLoginRequiredPopup}
        onClose={() => {
          setShowLoginRequiredPopup(false);
          pendingCalculationActionRef.current = null;
        }}
        onLoginClick={() => {
          setShowLoginRequiredPopup(false);
          setOtpLoginCustomReason(
            'Please login with your mobile number to view your calculation results.'
          );
          setShowOtpLoginModal(true);
        }}
      />

      {/* MODAL 6: Customer Mobile Number OTP Login */}
      <CustomerOtpLoginModal
        isOpen={showOtpLoginModal}
        onClose={() => {
          setShowOtpLoginModal(false);
          setPendingPaymentPayload(null);
          setOtpLoginCustomReason(null);
          pendingCalculationActionRef.current = null;
        }}
        onAuthenticated={async (session) => {
          applyCustomerSession(session);
          setShowOtpLoginModal(false);
          setOtpLoginCustomReason(null);
          await refreshMonetizationState();
          if (pendingPaymentPayload) {
            const payloadToResume = pendingPaymentPayload;
            setPendingPaymentPayload(null);
            await executeOnlinePayment(
              payloadToResume,
              payloadToResume.itemType === 'credit_pack' ? payloadToResume.packId : null
            );
          }
          if (pendingCalculationActionRef.current) {
            const resumeCalc = pendingCalculationActionRef.current;
            pendingCalculationActionRef.current = null;
            window.setTimeout(() => {
              void resumeCalc();
            }, 80);
          }
        }}
        title={pendingPaymentPayload ? 'Sign In to Complete Payment' : 'Customer Mobile Login'}
        subtitle={
          otpLoginCustomReason ||
          (pendingPaymentPayload
            ? 'Verify your 10-digit Indian mobile number via OTP so your payment receipt and order history are linked to your account.'
            : 'Sign in securely with a 6-digit SMS OTP to save your profile, pay online, and access payment receipts.')
        }
      />

      {/* MODAL 7: Verified Payment Outcome & Downloadable PDF Receipt */}
      <PaymentReceiptModal
        isOpen={Boolean(activePaymentReceipt)}
        onClose={() => setActivePaymentReceipt(null)}
        payment={activePaymentReceipt?.payment || null}
        statusMessage={activePaymentReceipt?.statusMessage}
        settings={settings}
      />

    </div>
  );
};

export default App;
