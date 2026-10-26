import React, { useState, useEffect, useMemo } from 'react';
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
import { AdminPanel } from './components/AdminPanel.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { TeamSection } from './components/TeamSection.tsx';
import { OurStorySection } from './components/OurStorySection.tsx';
import { useAdminGesture } from './hooks/useAdminGesture.ts';
import { PrivacyPolicyPage } from './components/legal/PrivacyPolicyPage.tsx';
import { AboutUsPage } from './components/legal/AboutUsPage.tsx';
import { ContactUsPage } from './components/legal/ContactUsPage.tsx';
import { DisclaimerPage } from './components/legal/DisclaimerPage.tsx';
import { AIWoodDetector } from './components/AIWoodDetector.tsx';
import { CustomerOrderTracking } from './components/CustomerOrderTracking.tsx';
import { DoorVisualizerPage } from './components/visualizer/DoorVisualizerPage.tsx';
import { PromotionalBannerCarousel } from './components/PromotionalBannerCarousel.tsx';
import { HomepageBannerSlider } from './components/HomepageBannerSlider.tsx';
import { ContentProtectionWarning } from './components/ContentProtectionWarning.tsx';
import { useContentProtection } from './lib/contentProtection.ts';
import {
  getCleanWhatsAppDigits,
  formatWhatsAppDisplay,
  getWhatsAppUrl,
  getGoogleMapsUrl,
} from './lib/contactUtils.ts';
import { initSpaAnalytics } from './lib/analytics.ts';
import { adMobService } from './lib/admob/admobService.ts';
import { AdMobBannerSlot } from './components/admob/AdMobBannerSlot.tsx';

export const App: React.FC = () => {
  // Navigation View State: 'home' | 'gallery' | 'calculator' | 'visualizer' | 'articles' | 'contact' | 'privacy' | 'about' | 'disclaimer' | 'wood-detector' | 'tracking'
  const [activeView, setActiveView] = useState<
    'home' | 'gallery' | 'calculator' | 'visualizer' | 'articles' | 'contact' | 'privacy' | 'about' | 'disclaimer' | 'wood-detector' | 'tracking'
  >('home');
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
    businessName: 'Jai Hanuman Door',
    tagline: 'Master Craftsmen in Handcrafted Sagwan & Teak Doors',
    whatsappNumber: '7887412884',
    googleMapsUrl: 'https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac',
    phone: '+91 98220 12345',
    email: 'orders@jaihanumandoor.com',
    address: 'Plot No. 42, Timber Market Industrial Area, Pune, Maharashtra 411042',
    disclaimer: 'Price shown is an estimated price and may vary according to final design, material quality, hardware and customization.',
    quotePrefix: 'JHD',
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

  // Saved Doors & Estimates Modal State (Public Browser Storage)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState<'favorites' | 'history' | 'notifications'>('favorites');
  const [favoriteDoorIds, setFavoriteDoorIds] = useState<string[]>(getGuestFavorites);
  const [loadedCalcRecord, setLoadedCalcRecord] = useState<UserCalculationRecord | null>(null);

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
        const parts = path.split('/').filter(Boolean);
        if (parts.length > 1 && parts[1] !== 'order' && parts[1] !== 'track') {
          setTrackingInitialId(parts[1].toUpperCase());
        }
        setActiveView('tracking');
      } else if (path === '/privacy' || path === '/privacy-policy') {
        setActiveView('privacy');
      } else if (path === '/about' || path === '/about-us') {
        setActiveView('about');
      } else if (path === '/contact' || path === '/contact-us') {
        setActiveView('contact');
      } else if (path === '/disclaimer') {
        setActiveView('disclaimer');
      } else if (path === '/catalog' || path === '/doors' || path === '/gallery') {
        setActiveView('gallery');
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
      } else if (path === '/articles' || path === '/guides' || path === '/blog') {
        setActiveView('articles');
      } else if (path.startsWith('/door/')) {
        setActiveView('gallery');
      } else if (path.startsWith('/article/')) {
        setActiveView('articles');
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
        const parts = path.split('/').filter(Boolean);
        if (parts.length > 1 && parts[1] !== 'door' && parts[1] !== 'fitting' && parts[1] !== '3d' && parts[1] !== 'ar') {
          const doorIdOrName = decodeURIComponent(parts[1]);
          const found = doors.find(d => d.id === doorIdOrName || d.name.toLowerCase() === doorIdOrName.toLowerCase());
          if (found) setVisualizerDoor(found);
        }
        setActiveView('visualizer');
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
        if (doorParam) {
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
      document.title = `${selectedDoorForDetail.name} | Jai Hanuman Door`;
      return;
    }
    const viewTitles: Record<string, string> = {
      home: 'Jai Hanuman Door | Door Price Calculator & Handcrafted Door Catalog',
      gallery: 'Wooden Door Catalog & Designs | Jai Hanuman Door',
      calculator: 'Instant Door Price Calculator | Jai Hanuman Door',
      articles: 'Woodcraft Guides & Buying Tips | Jai Hanuman Door',
      contact: 'Contact Us | Jai Hanuman Door',
      about: 'About Us | Jai Hanuman Door',
      privacy: 'Privacy Policy | Jai Hanuman Door',
      disclaimer: 'Disclaimer | Jai Hanuman Door',
      'wood-detector': 'AI Wood Detector – Lakdi Ki Pehchan | Jai Hanuman Door',
      tracking: 'Track Order & Live Manufacturing Progress | Jai Hanuman Door',
    };
    if (viewTitles[activeView]) {
      document.title = viewTitles[activeView];
    }
  }, [activeView, selectedDoorForDetail]);

  // Load Catalog & Calculator master data
  const loadAppData = async () => {
    try {
      setLoading(true);
      const [catalogData, calcData] = await Promise.all([
        fetchCatalog(),
        fetchCalculatorData(),
      ]);

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

      // Load All India Delivery public states and customer stories
      fetchPublicDeliveryData()
        .then(delData => {
          if (delData.states && delData.states.length > 0) {
            setDeliveryStates(delData.states);
          }
          if (delData.stories && delData.stories.length > 0) {
            setDeliveryStories(delData.stories);
          }
        })
        .catch(err => {
          console.warn('Delivery data fallback in use:', err);
        });

      // Check if deep-linked to a door directly
      if (typeof window !== 'undefined') {
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
    }
  };

  useEffect(() => {
    loadAppData();
    setFavoriteDoorIds(getGuestFavorites());
  }, []);

  // Initialize Native Google AdMob SDK and preload ad units
  useEffect(() => {
    adMobService.initialize(settings?.adSettings);
  }, [settings?.adSettings]);

  // Format 6: Google AdMob App Open Ad (Cold start & Foreground return)
  useEffect(() => {
    const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
    if (!isNative) return;

    let appStateHandle: { remove: () => Promise<void> } | null = null;
    CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        // App returned to foreground: show App Open Ad if eligible
        adMobService.showAppOpenAd(settings?.adSettings);
      }
    }).then(h => {
      appStateHandle = h;
    }).catch(() => {});

    // Cold start: Attempt App Open Ad after UI mounts (2.5s settle timer)
    const coldStartTimer = setTimeout(() => {
      adMobService.showAppOpenAd(settings?.adSettings);
    }, 2500);

    return () => {
      clearTimeout(coldStartTimer);
      if (appStateHandle?.remove) {
        appStateHandle.remove().catch(() => {});
      }
    };
  }, [settings?.adSettings]);

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
    const cleanTab =
      tab === 'history' || tab === 'notifications'
        ? tab
        : 'favorites';
    setProfileActiveTab(cleanTab);
    setShowProfileModal(true);
  };

  const handleToggleFavorite = async (doorId: string) => {
    const updated = toggleGuestFavorite(doorId);
    setFavoriteDoorIds(updated);
  };

  const handleLoadCalculation = (record: UserCalculationRecord) => {
    setLoadedCalcRecord(record);
    setShowProfileModal(false);
    if (record.doorId) {
      const foundDoor = doors.find(d => d.id === record.doorId);
      if (foundDoor) {
        setCalculatorDoor(foundDoor);
      }
    }
    setActiveView('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Canonical route navigation
  const navigateToView = (view: string) => {
    setActiveView(view);
    const viewToPathMap: Record<string, string> = {
      home: '/',
      gallery: '/catalog',
      calculator: '/calculator',
      visualizer: '/visualizer',
      articles: '/articles',
      about: '/about',
      contact: '/contact',
      privacy: '/privacy-policy',
      disclaimer: '/disclaimer',
      'wood-detector': '/wood-detector',
      tracking: '/track',
    };
    const targetPath = viewToPathMap[view] || '/';
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
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
    } else if (clean === 'whatsapp') {
      const waNumber = settings?.whatsappNumber || '7887412884';
      const bName = settings?.businessName || 'Jai Hanuman Door';
      window.open(getWhatsAppUrl(waNumber, `Hello ${bName}, I would like to inquire about your special promotional door offers.`), '_blank');
    } else if (clean === 'contact') {
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
    // Format 2: Google AdMob Interstitial (Natural break after door calculation)
    adMobService.showQuotationInterstitial(() => {
      setQuotationCalcResult(calcResult);
      setQuotationDoor(door || null);
    }, settings?.adSettings);
  };

  // Featured doors list for Home Screen (Section 2)
  const featuredDoors = doors.filter(d => d.featured).slice(0, 4);

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] font-sans flex flex-col selection:bg-[#FFF7E3] selection:text-[#C89211] pb-16 md:pb-0">
      
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
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* VIEW 1: HOME SCREEN (Section 2) */}
        {activeView === 'home' && (
          <div className="space-y-4 sm:space-y-8">
            
            {/* Dynamic Homepage Banner Slider */}
            <HomepageBannerSlider
              banners={mainBanners}
              settings={settings}
              onNavigate={(view) => {
                const target = view.replace(/^[\/#]+/, '').toLowerCase();
                if (target === 'chaukhat' || target === 'chaukhat-calculator') {
                  setCalculatorOption('chaukhat');
                  setActiveView('calculator');
                } else if (target === 'calculator' || target === 'door-calculator') {
                  setCalculatorOption('door');
                  setActiveView('calculator');
                } else if (target === 'doors' || target === 'catalogue' || target === 'catalog') {
                  setActiveView('gallery');
                } else if (target === 'ar' || target === '3d') {
                  setActiveView('visualizer');
                } else if (['home', 'gallery', 'calculator', 'visualizer', 'articles', 'contact', 'privacy', 'about', 'disclaimer', 'wood-detector', 'tracking'].includes(target)) {
                  setActiveView(target as any);
                } else {
                  setActiveView('gallery');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* Quick Action Strip (Price Calculator & Catalog) */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="bg-[#F8F8F6] text-[#1A1A1A] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-[#E5E5E5] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
                <div className="space-y-1.5 text-center md:text-left">
                  <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 uppercase tracking-wide">
                    Live Cost Calculator
                  </span>
                  <h3 className="font-serif text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#1A1A1A]">
                    Calculate Approximate Door Price in 30 Seconds
                  </h3>
                  <p className="text-[#666666] text-xs sm:text-sm max-w-xl leading-relaxed">
                    Select your custom door size in inches, choose 100% seasoned Sagwan or Sal wood, select Chaukhat frame and premium PU polish for an instant itemized factory quote.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full md:w-auto flex-shrink-0">
                  <button
                    id="home-open-calc-cta"
                    onClick={() => {
                      setActiveView('calculator');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    Open Price Calculator
                  </button>

                  <button
                    id="home-open-catalog-cta"
                    onClick={() => {
                      setActiveView('gallery');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="h-11 sm:h-12 px-4 sm:px-5 rounded-xl bg-white hover:bg-[#F8F8F6] text-[#1A1A1A] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-[#E5E5E5] transition-all cursor-pointer shadow-sm"
                  >
                    <Layers className="w-4 h-4 text-[#C89211]" />
                    Explore Catalog
                  </button>
                </div>
              </div>
            </div>

            {/* 3D & AR Door Fitting Studio Showcase Banner on Home Screen */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-r from-[#FFF7E3] via-white to-[#FFF7E3] border border-[#C89211]/40 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 relative overflow-hidden group">
                <div className="space-y-2 text-center lg:text-left z-10 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/40 uppercase tracking-wide">
                    <Box className="w-3 h-3 text-[#C89211]" />
                    <span>3D &amp; AR Innovation • Virtual Door Fitting Studio</span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#1A1A1A] leading-tight">
                    See Doors in 3D &amp; Fit Directly into Your Home Entrance
                  </h3>
                  <p className="text-[#666666] text-xs sm:text-sm leading-relaxed">
                    Rotate 360°, inspect genuine Sagwan wood grains, test PU polish finishes, swing doors open on hinges, and use your phone's AR camera or entrance photo to check proportions on your home wall before placing an order.
                  </p>
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-0.5 text-[11px] sm:text-xs text-[#C89211] font-semibold">
                    <span className="flex items-center gap-1">✓ 360° Interactive 3D</span>
                    <span className="flex items-center gap-1">✓ Live AR &amp; Photo Fitting</span>
                    <span className="flex items-center gap-1">✓ Instant Factory Quotes</span>
                  </div>
                </div>

                <div className="z-10 flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto flex-shrink-0">
                  <button
                    id="home-open-3d-visualizer-cta"
                    onClick={() => {
                      navigateToView('visualizer');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Box className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span>Launch 3D &amp; AR Studio</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Wood Detector Feature Banner on Home Screen */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
              <div className="bg-[#F8F8F6] border border-[#E5E5E5] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
                <div className="space-y-1.5 text-center md:text-left z-10">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-[#FFF7E3] text-[#C89211] border border-[#C89211]/30 uppercase tracking-wide">
                    <Sparkles className="w-3 h-3 text-[#C89211]" />
                    <span>New AI Feature • AI Wood Detector</span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#1A1A1A]">
                    Aapke Darwaze Ki Lakdi Kaun Si Hai?
                  </h3>
                  <p className="text-[#666666] text-xs sm:text-sm max-w-xl leading-relaxed">
                    Darwaze ki photo upload karein aur AI se lakdi ke baare mein jaanein. Grains, texture aur color tone ka instant AI visual estimate paayein.
                  </p>
                </div>

                <div className="z-10 flex-shrink-0 w-full md:w-auto">
                  <button
                    id="home-open-wood-detector-cta"
                    onClick={() => {
                      navigateToView('wood-detector');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full md:w-auto h-11 sm:h-12 px-5 sm:px-6 rounded-xl bg-[#C89211] hover:bg-[#A0700B] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span>AI Wood Detector Kholein</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Order Tracking Banner on Home Screen */}
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

            {/* Door Categories Grid (Section 2 & 3) */}
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
                    setActiveView('gallery');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                      setActiveView('gallery');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
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

            {/* PROMOTIONAL BANNER CAROUSEL (Slot 1: Direct From Manufacturer & Main Door Collections) */}
            <PromotionalBannerCarousel
              banners={promotionBanners}
              slotId="slot_1"
              onBannerAction={handleBannerAction}
            />

            {/* Featured Doors Section (Section 2) */}
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

            {/* Why Choose Us / Trust Badges (Section 2) */}
            <div className="bg-[#F8F8F6] border-y border-[#E5E5E5] py-6 sm:py-14">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-4 sm:mb-8">
                  <span className="text-[#C89211] font-semibold text-xs tracking-wider uppercase">
                    Uncompromising Wood Standards
                  </span>
                  <h2 className="font-serif text-xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight mt-0.5">
                    Why Indian Homeowners Trust Our Doors
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
                  <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E5E5E5] shadow-sm space-y-2">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#FFF7E3] text-[#C89211] flex items-center justify-center border border-[#C89211]/30">
                      <TreePine className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="font-serif text-xs sm:text-base font-bold text-[#1A1A1A]">
                      100% Seasoned Timber
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#666666] leading-relaxed line-clamp-3 sm:line-clamp-none">
                      Kiln-dried wood with regulated moisture content below 10%, preventing seasonal warping and bending during Indian monsoons.
                    </p>
                  </div>

                  <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E5E5E5] shadow-sm space-y-2">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#FFF7E3] text-[#C89211] flex items-center justify-center border border-[#C89211]/30">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="font-serif text-xs sm:text-base font-bold text-[#1A1A1A]">
                      Termite & Borer Proof
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#666666] leading-relaxed line-clamp-3 sm:line-clamp-none">
                      Vacuum pressure chemical impregnation treatment to protect against termites and subterranean insect attack for decades.
                    </p>
                  </div>

                  <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E5E5E5] shadow-sm space-y-2">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#FFF7E3] text-[#C89211] flex items-center justify-center border border-[#C89211]/30">
                      <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="font-serif text-xs sm:text-base font-bold text-[#1A1A1A]">
                      Direct Factory Pricing
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#666666] leading-relaxed line-clamp-3 sm:line-clamp-none">
                      No intermediaries or showroom overheads. You get authentic CP Sagwan wood direct from our manufacturing facility.
                    </p>
                  </div>

                  <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-[#E5E5E5] shadow-sm space-y-2">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#FFF7E3] text-[#C89211] flex items-center justify-center border border-[#C89211]/30">
                      <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="font-serif text-xs sm:text-base font-bold text-[#1A1A1A]">
                      Precision Custom Sizing
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#666666] leading-relaxed line-clamp-3 sm:line-clamp-none">
                      Whether standard 36×78" or custom bungalow archway entrances, every shutter and Chaukhat is made to the exact millimetre.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PROMOTIONAL BANNER B (Below Why Indian Homeowners Trust Our Doors, Above Our Story) */}
            <PromotionalBannerCarousel
              banners={promotionBanners}
              slotId="slot_2"
              onBannerAction={handleBannerAction}
            />

            {/* Our Story & Heritage Section */}
            <OurStorySection teamMembers={teamMembers} settings={settings} />

            {/* ALL INDIA DELIVERY SECTION (🇮🇳 Door Delivery Across India - Slidable State Cards & Stories) */}
            <AllIndiaDeliverySection
              states={deliveryStates}
              stories={deliveryStories}
              settings={settings}
              onOpenCalculator={() => {
                setActiveView('calculator');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="my-3 sm:my-5"
            />

            {/* Articles & Guides Preview Carousel */}
            <ArticlesGuidesCarousel
              articles={articles}
              settings={settings}
              onViewAll={() => {
                setSelectedArticleIdForView(null);
                setActiveView('articles');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onSelectArticle={(art: Article) => {
                setSelectedArticleIdForView(art.id);
                setActiveView('articles');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="mt-2 mb-2"
            />

            {/* AdMob Adaptive Banner Placement (Home Screen) */}
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-6 mb-2">
              <AdMobBannerSlot placement="home" settings={settings} />
            </div>

            {/* Design & Content Protection Warning Section */}
            <ContentProtectionWarning
              settings={settings}
              onNavigateLegal={navigateToView}
              className="mt-6 mb-2"
            />

          </div>
        )}

        {/* VIEW 2: DOOR GALLERY (Section 3) */}
        {activeView === 'gallery' && (
          <DoorGallery
            doors={doors}
            categories={categories}
            banners={banners}
            onSelectDoor={door => handleOpenDoorDetail(door)}
            onCalculateDoor={handleCalculateDoor}
            onOpenVisualizer={handleOpenVisualizer}
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
              onOpenVisualizer={handleOpenVisualizer}
              onOpenProfileHistory={() => handleOpenProfileModal('history')}
              initialCalculationRecord={loadedCalcRecord}
              onClearInitialRecord={() => setLoadedCalcRecord(null)}
              onSwitchToChaukhatCalculator={() => {
                setCalculatorOption('chaukhat');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              activeChaukhatCalculation={combinedChaukhat}
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
            />
          )
        )}

        {/* VIEW: 3D & AR DOOR FITTING STUDIO */}
        {activeView === 'visualizer' && (
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
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateCatalog={() => {
              navigateToView('gallery');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenQuotationModal={(calc, door) => {
              handleOpenQuotationModal(calc, door);
            }}
          />
        )}

        {/* VIEW 4: ARTICLES & GUIDES (Section 17) */}
        {activeView === 'articles' && (
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
            doors={doors}
            onBack={() => { setActiveView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onOpenCalculator={door => handleCalculateDoor(door)}
            onOpenGallery={() => { setActiveView('gallery'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        )}

        {/* VIEW 6: PRIVACY POLICY */}
        {activeView === 'privacy' && (
          <PrivacyPolicyPage
            settings={settings}
            onBack={() => { setActiveView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onNavigateContact={() => { setActiveView('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        )}

        {/* VIEW 7: ABOUT US */}
        {activeView === 'about' && (
          <AboutUsPage
            settings={settings}
            teamMembers={teamMembers}
            onBack={() => { setActiveView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onNavigateGallery={() => { setActiveView('gallery'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onNavigateCalculator={() => { setActiveView('calculator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onNavigateContact={() => { setActiveView('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        )}

        {/* VIEW 8: DISCLAIMER & ESTIMATION TERMS */}
        {activeView === 'disclaimer' && (
          <DisclaimerPage
            settings={settings}
            onBack={() => { setActiveView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onNavigateCalculator={() => { setActiveView('calculator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            onNavigateContact={() => { setActiveView('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        )}

        {/* VIEW 9: AI WOOD DETECTOR (LAKDI KI PEHCHAN) */}
        {activeView === 'wood-detector' && (
          <AIWoodDetector
            settings={settings}
            onNavigateToCatalog={() => {
              setActiveView('gallery');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToCalculator={() => {
              setActiveView('calculator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateToContact={() => {
              setActiveView('contact');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW 10: CUSTOMER ORDER TRACKING */}
        {activeView === 'tracking' && (
          <>
            <CustomerOrderTracking
              initialTrackingId={trackingInitialId}
              onNavigateHome={() => {
                navigateToView('home');
              }}
              onSelectDoor={(doorId) => {
                const door = doors.find(d => d.id === doorId);
                if (door) {
                  handleOpenDoorDetail(door);
                }
              }}
            />
            <div className="max-w-4xl mx-auto px-3 sm:px-6 mt-4 mb-2">
              <AdMobBannerSlot placement="tracking" settings={settings} />
            </div>
          </>
        )}
      </main>

      {/* Footer (Section 2) */}
      <footer className="bg-[#F8F8F6] text-[#666666] border-t border-[#E5E5E5] pt-6 sm:pt-10 pb-20 sm:pb-8 mt-4 sm:mt-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-12">
            
            {/* Business Brand (Hidden admin gesture access) */}
            <div className="space-y-3 sm:col-span-2 lg:col-span-1">
              <div
                id="footer-brand-logo"
                data-testid="footer-brand-logo"
                onClick={handleFooterLogoTap}
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                title={settings.businessName}
              >
                <div className="w-8 h-8 rounded-lg bg-[#C89211] text-white font-bold flex items-center justify-center font-serif text-lg group-hover:scale-105 transition-transform shadow-sm">
                  {(settings.businessName || 'J')[0]}
                </div>
                <span className="font-serif text-xl font-bold text-[#1A1A1A] tracking-tight group-hover:text-[#C89211] transition-colors">
                  {settings.businessName}
                </span>
              </div>
              <p className="text-xs text-[#666666] leading-relaxed">
                {settings.tagline || 'Direct manufacturer of seasoned Sagwan, Teak wood and designer entrance doors for homes and commercial estates.'}
              </p>
              {settings.gstNumber && (
                <div className="text-[11px] text-[#C89211] font-mono font-semibold">
                  GSTIN: {settings.gstNumber}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mb-3">
                Collections & Tools
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => navigateToView('calculator')}
                    className="text-[#666666] hover:text-[#C89211] transition-colors"
                  >
                    Door Price Calculator
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateToView('gallery')}
                    className="text-[#666666] hover:text-[#C89211] transition-colors"
                  >
                    Door Catalog Gallery
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigateToView('articles')}
                    className="text-[#666666] hover:text-[#C89211] transition-colors"
                  >
                    Wood Care & Dimension Guides
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-visualizer"
                    onClick={() => navigateToView('visualizer')}
                    className="text-[#666666] hover:text-[#C89211] transition-colors flex items-center gap-1.5"
                  >
                    <Box className="w-3.5 h-3.5 text-[#C89211]" />
                    <span>3D &amp; AR Fitting Studio</span>
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-track"
                    onClick={() => navigateToView('tracking')}
                    className="text-[#666666] hover:text-[#C89211] transition-colors flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5 text-[#C89211]" />
                    <span>Track Order &amp; Manufacturing</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Information & Legal Section */}
            <div>
              <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mb-3">
                Information &amp; Legal
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    id="footer-link-about"
                    onClick={() => navigateToView('about')}
                    className="text-[#666666] hover:text-[#C89211] transition-colors text-left"
                  >
                    About Us &amp; Heritage
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-contact"
                    onClick={() => navigateToView('contact')}
                    className="text-[#666666] hover:text-[#C89211] transition-colors text-left"
                  >
                    Contact Us &amp; Inquiries
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-privacy"
                    onClick={() => navigateToView('privacy')}
                    className="text-[#666666] hover:text-[#C89211] transition-colors text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-disclaimer"
                    onClick={() => navigateToView('disclaimer')}
                    className="text-[#666666] hover:text-[#C89211] transition-colors text-left"
                  >
                    Disclaimer &amp; Terms
                  </button>
                </li>
              </ul>
            </div>

            {/* Factory Location & Hours */}
            <div>
              <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mb-3">
                Workshop & Showroom
              </h4>
              <p className="text-xs text-[#666666] leading-relaxed mb-2">
                {settings.address}
              </p>
              <div className="text-xs text-[#666666] space-y-1 mb-3">
                <div>Mon – Sat: 9:00 AM – 8:00 PM</div>
                <div>Sunday: By Appointment</div>
              </div>
              <a
                id="footer-shop-location-btn"
                href={getGoogleMapsUrl(settings.googleMapsUrl || settings.legalSettings?.socialLinks?.googleBusiness)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#FFF8E8] hover:bg-[#FFF2D4] border border-[#C89211] text-left transition-all duration-200 shadow-xs hover:shadow-sm group mt-1 max-w-full"
                title="Open Shop Location in Google Maps"
              >
                <div className="w-7 h-7 rounded-lg bg-white border border-[#C89211]/30 flex items-center justify-center text-[#C89211] shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <MapPin className="w-4 h-4 text-[#C89211] fill-[#C89211]/20" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-[#222222] leading-tight">
                    Shop Location
                  </div>
                  <div className="text-[10px] text-[#C89211] font-semibold flex items-center gap-0.5 mt-0.5 leading-none">
                    <span>View on Google Maps</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </div>
              </a>
            </div>

            {/* Direct Connect & Admin Access */}
            <div>
              <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mb-3">
                Factory Assistance
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#999999]">Phone:</span>{' '}
                  <a href={`tel:${settings.phone}`} className="text-[#1A1A1A] hover:text-[#C89211] font-mono font-medium">
                    {settings.phone}
                  </a>
                </div>
                <div>
                  <span className="text-[#999999]">WhatsApp:</span>{' '}
                  <a
                    id="footer-whatsapp-link"
                    href={getWhatsAppUrl(settings?.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#16803A] font-mono font-semibold hover:underline"
                  >
                    {formatWhatsAppDisplay(settings?.whatsappNumber)}
                  </a>
                </div>
                <div>
                  <span className="text-[#999999]">Email:</span>{' '}
                  <a href={`mailto:${settings.email}`} className="text-[#1A1A1A] hover:text-[#C89211]">
                    {settings.email}
                  </a>
                </div>
              </div>
            </div>

          </div>

          <div className="pt-8 border-t border-[#E5E5E5] text-center text-xs text-[#666666] flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
            </div>

            {/* Quick Inline Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <button
                onClick={() => navigateToView('privacy')}
                className="text-[#666666] hover:text-[#C89211] transition-colors"
              >
                Privacy Policy
              </button>
              <span className="text-[#CCCCCC]">•</span>
              <button
                onClick={() => navigateToView('about')}
                className="text-[#666666] hover:text-[#C89211] transition-colors"
              >
                About Us
              </button>
              <span className="text-[#CCCCCC]">•</span>
              <button
                onClick={() => navigateToView('contact')}
                className="text-[#666666] hover:text-[#C89211] transition-colors"
              >
                Contact Us
              </button>
              <span className="text-[#CCCCCC]">•</span>
              <button
                onClick={() => navigateToView('disclaimer')}
                className="text-[#666666] hover:text-[#C89211] transition-colors flex items-center gap-1"
              >
                <span>Disclaimer &amp; Content Protection</span>
              </button>
            </div>

            <div className="text-[11px] text-[#666666]">
              Handcrafted in India • 100% Kiln-Dried Solid Timber
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Section 2 & 27) */}
      <BottomNav
        activeView={activeView}
        onNavigate={navigateToView}
        onOpenFavorites={() => handleOpenProfileModal('favorites')}
        onOpenProfile={handleOpenProfileModal}
        favoritesCount={favoriteDoorIds.length}
      />

      {/* MODAL 1: Door Detail Modal (Section 3) */}
      {selectedDoorForDetail && (
        <DoorDetailModal
          door={selectedDoorForDetail}
          onClose={handleCloseDoorDetail}
          onCalculateThisDoor={handleCalculateDoor}
          onOpenVisualizer={(door) => {
            handleCloseDoorDetail();
            handleOpenVisualizer(door);
          }}
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
        />
      )}

      {/* MODAL 4: Full Admin Control Center (Sections 13, 14, 15, 16, 22) */}
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

      {/* MODAL 5: Saved Doors & Calculations History (Public Browser Storage) */}
      {showProfileModal && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          settings={settings}
          doors={doors}
          initialTab={profileActiveTab}
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

    </div>
  );
};

export default App;
