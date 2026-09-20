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
} from './types.ts';
import {
  fetchCatalog,
  fetchCalculatorData,
  getGuestFavorites,
  toggleGuestFavorite,
} from './lib/api.ts';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { HeroSlider } from './components/HeroSlider.tsx';
import { DoorGallery } from './components/DoorGallery.tsx';
import { DoorDetailModal } from './components/DoorDetailModal.tsx';
import { DoorCalculator } from './components/DoorCalculator.tsx';
import { QuotationModal } from './components/QuotationModal.tsx';
import { ArticlesSection } from './components/ArticlesSection.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { UserProfileModal } from './components/UserProfileModal.tsx';
import { TeamSection } from './components/TeamSection.tsx';
import { useAdminGesture } from './hooks/useAdminGesture.ts';
import { PrivacyPolicyPage } from './components/legal/PrivacyPolicyPage.tsx';
import { AboutUsPage } from './components/legal/AboutUsPage.tsx';
import { ContactUsPage } from './components/legal/ContactUsPage.tsx';
import { DisclaimerPage } from './components/legal/DisclaimerPage.tsx';
import {
  getCleanWhatsAppDigits,
  formatWhatsAppDisplay,
  getWhatsAppUrl,
  getGoogleMapsUrl,
} from './lib/contactUtils.ts';

export const App: React.FC = () => {
  // Navigation View State: 'home' | 'gallery' | 'calculator' | 'articles' | 'contact' | 'privacy' | 'about' | 'disclaimer'
  const [activeView, setActiveView] = useState<
    'home' | 'gallery' | 'calculator' | 'articles' | 'contact' | 'privacy' | 'about' | 'disclaimer'
  >('home');

  // Application Data States
  const [loading, setLoading] = useState(true);
  const [doors, setDoors] = useState<Door[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
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

  // Modals
  const [selectedDoorForDetail, setSelectedDoorForDetail] = useState<Door | null>(null);
  const [calculatorDoor, setCalculatorDoor] = useState<Door | null>(null);
  const [quotationCalcResult, setQuotationCalcResult] = useState<CalculationResult | null>(null);
  const [quotationDoor, setQuotationDoor] = useState<Door | null>(null);
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

  // Saved Doors & Estimates Modal State (Public Browser Storage)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState<'favorites' | 'history' | 'notifications'>('favorites');
  const [favoriteDoorIds, setFavoriteDoorIds] = useState<string[]>(getGuestFavorites);
  const [loadedCalcRecord, setLoadedCalcRecord] = useState<UserCalculationRecord | null>(null);

  // Sync /admin URL routing
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
      } else if (path === '/privacy' || path === '/privacy-policy') {
        setActiveView('privacy');
      } else if (path === '/about' || path === '/about-us') {
        setActiveView('about');
      } else if (path === '/contact' || path === '/contact-us') {
        setActiveView('contact');
      } else if (path === '/disclaimer') {
        setActiveView('disclaimer');
      } else if (
        path === '/visualizer' ||
        path.startsWith('/visualizer') ||
        path === '/ai-visualizer' ||
        path.startsWith('/ai-visualizer') ||
        path === '/video-visualizer' ||
        path.startsWith('/video-visualizer') ||
        path === '/video-visualization' ||
        path.startsWith('/video-visualization') ||
        path === '/ai-video' ||
        path.startsWith('/ai-video') ||
        path === '/video' ||
        path.startsWith('/video/')
      ) {
        // Safe redirect: legacy/removed Visualizer URLs gracefully redirect to Home or Door Catalog
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', '/');
        }
        setActiveView('home');
      }
    };

    syncRouteFromPath();
    window.addEventListener('popstate', syncRouteFromPath);
    return () => window.removeEventListener('popstate', syncRouteFromPath);
  }, []);

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

  // Handlers for cross-component workflows
  const handleCalculateDoor = (door: Door) => {
    setCalculatorDoor(door);
    setSelectedDoorForDetail(null);
    setActiveView('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenQuotationModal = (calcResult: CalculationResult, door?: Door | null) => {
    setQuotationCalcResult(calcResult);
    setQuotationDoor(door || null);
  };

  // Featured doors list for Home Screen (Section 2)
  const featuredDoors = doors.filter(d => d.featured).slice(0, 4);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col selection:bg-amber-500 selection:text-stone-950 pb-16 md:pb-0">
      
      {/* Navigation Bar */}
      <Navbar
        settings={settings}
        businessName={settings.businessName}
        tagline={settings.tagline}
        whatsappNumber={settings.whatsappNumber}
        activeView={activeView}
        onNavigate={view => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
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
          <div className="space-y-12 sm:space-y-16">
            
            {/* Hero Banner Slider */}
            <HeroSlider
              banners={banners}
              settings={settings}
              onNavigate={(view) => {
                setActiveView(view);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBannerAction={(action) => {
                if (action === 'calculator') {
                  setActiveView('calculator');
                } else if (action === 'gallery') {
                  setActiveView('gallery');
                } else if (action === 'whatsapp') {
                  window.open(getWhatsAppUrl(settings.whatsappNumber, `Hello ${settings.businessName}, I would like to inquire about handcrafted doors.`), '_blank');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* Quick Action Strip (Price Calculator & Catalog) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-stone-100 rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                    Live Cost Calculator
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-white">
                    Calculate Approximate Door Price in 30 Seconds
                  </h3>
                  <p className="text-stone-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                    Select your custom door size in inches, choose 100% seasoned Sagwan or Sal wood, select Chaukhat frame and premium PU polish for an instant itemized factory quote.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-shrink-0">
                  <button
                    id="home-open-calc-cta"
                    onClick={() => {
                      setActiveView('calculator');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all active:scale-[0.98]"
                  >
                    <Calculator className="w-5 h-5" />
                    Open Price Calculator
                  </button>

                  <button
                    id="home-open-catalog-cta"
                    onClick={() => {
                      setActiveView('gallery');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="py-3.5 px-5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-stone-700 transition-all"
                  >
                    <Layers className="w-4 h-4 text-amber-400" />
                    Explore Catalog
                  </button>
                </div>
              </div>
            </div>

            {/* Door Categories Grid (Section 2 & 3) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                  <span className="text-amber-600 font-semibold text-xs sm:text-sm tracking-wider uppercase">
                    Woodwork Collections
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
                    Popular Door Categories
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setActiveView('gallery');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-amber-700 hover:text-amber-800 font-semibold text-xs sm:text-sm flex items-center gap-1 group"
                >
                  <span>View All Categories</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
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
                  onClick={() => {
                    setActiveView('gallery');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-amber-700 hover:text-amber-800 font-semibold text-xs sm:text-sm flex items-center gap-1 group"
                >
                  <span>Explore Full Catalog ({doors.length})</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {(featuredDoors.length > 0 ? featuredDoors : doors.slice(0, 4)).map(door => (
                  <div
                    key={door.id}
                    id={`featured-card-${door.id}`}
                    className="group bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 flex flex-col overflow-hidden"
                  >
                    <div
                      className="relative aspect-[3/4] bg-stone-100 overflow-hidden cursor-pointer"
                      onClick={() => setSelectedDoorForDetail(door)}
                    >
                      <img
                        src={door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'}
                        alt={door.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded text-[11px] font-semibold bg-stone-900/85 backdrop-blur-md text-amber-300 border border-stone-700/50">
                        {door.category}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(door.id);
                        }}
                        title={favoriteDoorIds.includes(door.id) ? 'Remove from Saved' : 'Save Door'}
                        className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md transition-all ${
                          favoriteDoorIds.includes(door.id)
                            ? 'bg-stone-900/90 text-rose-500 shadow-md ring-1 ring-rose-500/50'
                            : 'bg-stone-900/60 hover:bg-stone-900/90 text-stone-300 hover:text-rose-400'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            favoriteDoorIds.includes(door.id) ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3
                          onClick={() => setSelectedDoorForDetail(door)}
                          className="font-serif text-base sm:text-lg font-bold text-stone-900 group-hover:text-amber-700 cursor-pointer transition-colors line-clamp-1"
                        >
                          {door.name}
                        </h3>
                        <p className="text-stone-500 text-xs mt-1 line-clamp-2 leading-relaxed">
                          {door.description}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-stone-100">
                        <div className="flex items-baseline justify-between mb-3">
                          <span className="text-xs text-stone-500">Starting from:</span>
                          <span className="text-lg font-bold text-amber-700 font-mono">
                            ₹{door.startingPrice.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedDoorForDetail(door)}
                            className="py-2 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-stone-600" />
                            Details
                          </button>

                          <button
                            onClick={() => handleCalculateDoor(door)}
                            className="py-2 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            Calculate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Choose Us / Trust Badges (Section 2) */}
            <div className="bg-stone-100/80 border-y border-stone-200/80 py-12 sm:py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-2xl mx-auto mb-10">
                  <span className="text-amber-600 font-semibold text-xs sm:text-sm tracking-wider uppercase">
                    Uncompromising Wood Standards
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
                    Why Indian Homeowners Trust Our Doors
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                      <TreePine className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      100% Seasoned Timber
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Kiln-dried wood with regulated moisture content below 10%, preventing seasonal warping and bending during Indian monsoons.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Termite & Borer Proof
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Vacuum pressure chemical impregnation treatment to protect against termites and subterranean insect attack for decades.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                      <Award className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Direct Factory Pricing
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      No intermediaries or showroom overheads. You get authentic CP Sagwan wood direct from our manufacturing facility.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Precision Custom Sizing
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Whether standard 36×78" or custom bungalow archway entrances, every shutter and Chaukhat is made to the exact millimetre.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Our Leadership Team Section */}
            <TeamSection teamMembers={teamMembers} settings={settings} />

            {/* Articles & Guides Preview */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="text-amber-600 font-semibold text-xs sm:text-sm tracking-wider uppercase">
                    Wood Wisdom
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
                    Door Buying & Maintenance Guides
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setActiveView('articles');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-amber-700 hover:text-amber-800 font-semibold text-xs sm:text-sm flex items-center gap-1 group"
                >
                  <span>View All Guides</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {articles.slice(0, 3).map(art => (
                  <div
                    key={art.id}
                    onClick={() => {
                      setActiveView('articles');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="cursor-pointer group bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[16/10] overflow-hidden bg-stone-100 relative">
                        <img
                          src={art.image}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {art.category && (
                          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-stone-900/80 backdrop-blur-sm text-amber-400 font-bold text-[10px] border border-amber-500/30">
                            {art.category}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <div className="text-[11px] text-amber-600 font-semibold mb-1">
                          {art.readTime || '4 min read'}
                        </div>
                        <h3 className="font-serif text-base font-bold text-stone-900 group-hover:text-amber-700 transition-colors line-clamp-2">
                          {art.title}
                        </h3>
                        <p className="text-xs text-stone-500 mt-2 line-clamp-2">
                          {art.excerpt}
                        </p>
                      </div>
                    </div>

                    <div className="px-5 pb-4 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400 font-mono">
                      <span>👁 {(art.views || 0).toLocaleString('en-IN')} views</span>
                      <span>❤️ {(art.likes || 0).toLocaleString('en-IN')} likes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: DOOR GALLERY (Section 3) */}
        {activeView === 'gallery' && (
          <DoorGallery
            doors={doors}
            categories={categories}
            onSelectDoor={door => setSelectedDoorForDetail(door)}
            onCalculateDoor={handleCalculateDoor}
            settings={settings}
            favoriteDoorIds={favoriteDoorIds}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {/* VIEW 3: DOOR PRICE CALCULATOR (Sections 4, 5, 6, 7, 8, 9, 10) */}
        {activeView === 'calculator' && (
          <DoorCalculator
            materials={materials}
            finishes={finishes}
            frames={frames}
            hardware={hardware}
            settings={settings}
            preselectedDoor={calculatorDoor}
            onClearPreselectedDoor={() => setCalculatorDoor(null)}
            onOpenQuotationModal={handleOpenQuotationModal}
            onOpenProfileHistory={() => handleOpenProfileModal('history')}
            initialCalculationRecord={loadedCalcRecord}
            onClearInitialRecord={() => setLoadedCalcRecord(null)}
          />
        )}

        {/* VIEW 4: ARTICLES & GUIDES (Section 17) */}
        {activeView === 'articles' && (
          <ArticlesSection
            articles={articles}
            doors={doors}
            settings={settings}
            onOpenCalculator={door => handleCalculateDoor(door)}
            onOpenDoorDetail={door => setSelectedDoorForDetail(door)}
          />
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
      </main>

      {/* Floating WhatsApp Quick Action Button (Sections 2 & 12) */}
      <a
        id="floating-whatsapp-btn"
        href={getWhatsAppUrl(
          settings?.whatsappNumber,
          `Hello ${settings?.businessName || 'Jai Hanuman Door'}, I have an inquiry regarding door prices and custom orders.`
        )}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-20 md:bottom-6 right-5 z-40 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-950/60 transition-transform active:scale-95 border-2 border-emerald-400/40 group"
      >
        <MessageCircle className="w-7 h-7 fill-white" />
        <span className="hidden group-hover:block absolute right-16 px-3 py-1.5 rounded-lg bg-stone-900 text-stone-100 text-xs font-semibold whitespace-nowrap shadow-lg border border-stone-700">
          WhatsApp Inquiry
        </span>
      </a>

      {/* Footer (Section 2) */}
      <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 pt-12 pb-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            
            {/* Business Brand (Hidden admin gesture access) */}
            <div className="space-y-3 sm:col-span-2 lg:col-span-1">
              <div
                id="footer-brand-logo"
                data-testid="footer-brand-logo"
                onClick={handleFooterLogoTap}
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                title={settings.businessName}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-stone-950 font-bold flex items-center justify-center font-serif text-lg group-hover:scale-105 transition-transform">
                  {(settings.businessName || 'J')[0]}
                </div>
                <span className="font-serif text-xl font-bold text-white tracking-tight group-hover:text-amber-400 transition-colors">
                  {settings.businessName}
                </span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                {settings.tagline || 'Direct manufacturer of seasoned Sagwan, Teak wood and designer entrance doors for homes and commercial estates.'}
              </p>
              {settings.gstNumber && (
                <div className="text-[11px] text-amber-400/90 font-mono">
                  GSTIN: {settings.gstNumber}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-serif text-sm font-bold text-white mb-3">
                Collections & Tools
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => { setActiveView('calculator'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-stone-400 hover:text-amber-400 transition-colors"
                  >
                    Door Price Calculator
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setActiveView('gallery'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-stone-400 hover:text-amber-400 transition-colors"
                  >
                    Door Catalog Gallery
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => { setActiveView('articles'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-stone-400 hover:text-amber-400 transition-colors"
                  >
                    Wood Care & Dimension Guides
                  </button>
                </li>
              </ul>
            </div>

            {/* Information & Legal Section */}
            <div>
              <h4 className="font-serif text-sm font-bold text-white mb-3">
                Information &amp; Legal
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    id="footer-link-about"
                    onClick={() => { setActiveView('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-stone-400 hover:text-amber-400 transition-colors text-left"
                  >
                    About Us &amp; Heritage
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-contact"
                    onClick={() => { setActiveView('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-stone-400 hover:text-amber-400 transition-colors text-left"
                  >
                    Contact Us &amp; Inquiries
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-privacy"
                    onClick={() => { setActiveView('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-stone-400 hover:text-amber-400 transition-colors text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    id="footer-link-disclaimer"
                    onClick={() => { setActiveView('disclaimer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="text-stone-400 hover:text-amber-400 transition-colors text-left"
                  >
                    Disclaimer &amp; Terms
                  </button>
                </li>
              </ul>
            </div>

            {/* Factory Location & Hours */}
            <div>
              <h4 className="font-serif text-sm font-bold text-white mb-3">
                Workshop & Showroom
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed mb-2">
                {settings.address}
              </p>
              <div className="text-xs text-stone-400 space-y-1 mb-3">
                <div>Mon – Sat: 9:00 AM – 8:00 PM</div>
                <div>Sunday: By Appointment</div>
              </div>
              <a
                id="footer-shop-location-btn"
                href={getGoogleMapsUrl(settings.googleMapsUrl || settings.legalSettings?.socialLinks?.googleBusiness)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>View Shop Location</span>
              </a>
            </div>

            {/* Direct Connect & Admin Access */}
            <div>
              <h4 className="font-serif text-sm font-bold text-white mb-3">
                Factory Assistance
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-stone-500">Phone:</span>{' '}
                  <a href={`tel:${settings.phone}`} className="text-stone-300 hover:text-amber-400 font-mono">
                    {settings.phone}
                  </a>
                </div>
                <div>
                  <span className="text-stone-500">WhatsApp:</span>{' '}
                  <a
                    id="footer-whatsapp-link"
                    href={getWhatsAppUrl(settings?.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 font-mono hover:underline"
                  >
                    {formatWhatsAppDisplay(settings?.whatsappNumber)}
                  </a>
                </div>
                <div>
                  <span className="text-stone-500">Email:</span>{' '}
                  <a href={`mailto:${settings.email}`} className="text-stone-300 hover:text-amber-400">
                    {settings.email}
                  </a>
                </div>
              </div>
            </div>

          </div>

          <div className="pt-8 border-t border-stone-800 text-center text-xs text-stone-500 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
            </div>

            {/* Quick Inline Legal Links */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <button
                onClick={() => { setActiveView('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-stone-400 hover:text-amber-400 transition-colors"
              >
                Privacy Policy
              </button>
              <span className="text-stone-700">•</span>
              <button
                onClick={() => { setActiveView('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-stone-400 hover:text-amber-400 transition-colors"
              >
                About Us
              </button>
              <span className="text-stone-700">•</span>
              <button
                onClick={() => { setActiveView('contact'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-stone-400 hover:text-amber-400 transition-colors"
              >
                Contact Us
              </button>
              <span className="text-stone-700">•</span>
              <button
                onClick={() => { setActiveView('disclaimer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-stone-400 hover:text-amber-400 transition-colors"
              >
                Disclaimer
              </button>
            </div>

            <div className="text-[11px] text-stone-500">
              Handcrafted in India • 100% Kiln-Dried Solid Timber
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Section 2 & 27) */}
      <BottomNav
        activeView={activeView}
        onNavigate={view => {
          setActiveView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenFavorites={() => handleOpenProfileModal('favorites')}
        onOpenProfile={handleOpenProfileModal}
        favoritesCount={favoriteDoorIds.length}
      />

      {/* MODAL 1: Door Detail Modal (Section 3) */}
      {selectedDoorForDetail && (
        <DoorDetailModal
          door={selectedDoorForDetail}
          onClose={() => setSelectedDoorForDetail(null)}
          onCalculateThisDoor={handleCalculateDoor}
          allDoors={doors}
          onSelectDoor={d => setSelectedDoorForDetail(d)}
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
            setSelectedDoorForDetail(door);
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
