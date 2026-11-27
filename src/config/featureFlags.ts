/**
 * Central Feature Flags & Storage Governance Configuration
 * ---------------------------------------------------------
 * Temporarily suspended modules are controlled here so all source code,
 * database records, historical customer orders, and storage assets remain
 * 100% preserved for future reactivation. Flip any flag to `true` to restore.
 */

export const FEATURE_FLAGS = {
  // === TEMPORARILY DISABLED MODULES (Suspended - Preserved for Reactivation) ===
  appMessages: false, // App Messages / Push Notifications (customer UI, admin campaigns, 30s scheduler)
  doorCatalogue: false, // Door Catalogue, Gallery, Categories, Door Detail Modal, Admin Door Designs
  visualizer3dAr: false, // 3D / AR Door Visualizer, 3D Models (.glb/.gltf), AR Fitting & Admin 3D/AR Manager
  homeBanners: false, // Home Page Hero Slider, Promotional Banner Carousels & Admin Main/Promo Banner Management
  articlesBlog: false, // Articles / Blog / Wood Guides, Home Carousel & Admin Articles Management
  catalogueMediaImport: false, // External Google Drive / URL media import, legacy pending-sync, disabled folder uploads
  bootImageSync: false, // Automatic legacy upload folder copy/sync on server startup
  allIndiaDelivery: false, // Door Delivery Across India (home slider, delivery stories, Admin Delivery tab & APIs)
  ourStoryAndTeam: false, // Our Story & Heritage, Owner / Team Leadership (home section, About page, Admin Story & Team tabs)
  orderTracking: false, // Track Order / Live Manufacturing (customer nav/form/page, Admin Tracking tab & APIs; orders preserved)
  copyrightFooter: false, // Design & Content Protection copyright section, copyright footer bar, Admin Legal & Copyright editors

  // === ACTIVE CORE APPLICATION MODULES (Must remain fully operational) ===
  doorPriceCalculator: true,
  chaukhatCalculator: true,
  slidingWindowCalculator: true,
  aiNotebookScanner: true,
  aiWoodDetector: true,
  savedEstimates: true,
  quotationsAndEnquiries: true,
  bunnyStorageActiveModules: true,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return Boolean(FEATURE_FLAGS[key]);
}

/**
 * Bunny.net / Media storage folders restricted while their owning modules are suspended.
 * Existing files in these folders are preserved, while NEW uploads/writes are blocked.
 */
export function getDisabledStorageFolders(): string[] {
  const disabled: string[] = [];
  if (!FEATURE_FLAGS.doorCatalogue) {
    disabled.push('products', 'catalog', 'categories');
  }
  if (!FEATURE_FLAGS.visualizer3dAr) {
    disabled.push('models3d');
  }
  if (!FEATURE_FLAGS.homeBanners) {
    disabled.push('banners');
  }
  if (!FEATURE_FLAGS.articlesBlog) {
    disabled.push('articles');
  }
  if (!FEATURE_FLAGS.appMessages) {
    disabled.push('notifications');
  }
  if (!FEATURE_FLAGS.allIndiaDelivery) {
    disabled.push('delivery');
  }
  if (!FEATURE_FLAGS.ourStoryAndTeam) {
    disabled.push('team');
  }
  if (!FEATURE_FLAGS.orderTracking) {
    disabled.push('tracking');
  }
  return disabled;
}

export function isStorageFolderDisabled(folder?: string | null): boolean {
  if (!folder) return false;
  const clean = String(folder).trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!clean) return false;
  return getDisabledStorageFolders().includes(clean);
}

/**
 * Customer views that are currently disabled and should redirect cleanly to Home.
 */
export function isCustomerViewDisabled(view: string): boolean {
  const v = String(view || '').trim().toLowerCase();
  if (!FEATURE_FLAGS.doorCatalogue && (v === 'gallery' || v === 'catalog' || v === 'catalogue' || v === 'doors')) {
    return true;
  }
  if (!FEATURE_FLAGS.visualizer3dAr && (v === 'visualizer' || v === 'fitting' || v === '3d' || v === 'ar')) {
    return true;
  }
  if (!FEATURE_FLAGS.articlesBlog && (v === 'articles' || v === 'blog' || v === 'guides')) {
    return true;
  }
  if (!FEATURE_FLAGS.orderTracking && (v === 'tracking' || v === 'track' || v === 'order-track')) {
    return true;
  }
  if (!FEATURE_FLAGS.ourStoryAndTeam && (v === 'story' || v === 'owner')) {
    return true;
  }
  if (!FEATURE_FLAGS.allIndiaDelivery && (v === 'delivery' || v === 'india-delivery')) {
    return true;
  }
  if (!FEATURE_FLAGS.copyrightFooter && v === 'disclaimer') {
    return true;
  }
  return false;
}

/**
 * Admin panel tabs that are currently disabled and should fall back to Dashboard.
 */
export function isAdminTabDisabled(tab: string): boolean {
  const t = String(tab || '').trim().toLowerCase();
  if (!FEATURE_FLAGS.doorCatalogue && t === 'doors') return true;
  if (!FEATURE_FLAGS.visualizer3dAr && (t === 'visualizer' || t === '3d' || t === 'ar')) return true;
  if (!FEATURE_FLAGS.homeBanners && (t === 'banners' || t === 'main-banners' || t === 'promotion-banners')) return true;
  if (!FEATURE_FLAGS.articlesBlog && t === 'articles') return true;
  if (!FEATURE_FLAGS.appMessages && t === 'notifications') return true;
  if (!FEATURE_FLAGS.orderTracking && (t === 'tracking' || t === 'orders')) return true;
  if (!FEATURE_FLAGS.allIndiaDelivery && (t === 'delivery' || t === 'deliveries' || t === 'delivery-stories' || t === 'shipping')) {
    return true;
  }
  if (!FEATURE_FLAGS.ourStoryAndTeam && (t === 'team' || t === 'story')) return true;
  if (!FEATURE_FLAGS.copyrightFooter && t === 'legal') return true;
  return false;
}
