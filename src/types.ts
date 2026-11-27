export type DoorPricingType = 'sqft' | 'fixed';

export interface Door {
  id: string;
  name: string;
  category: string;
  description: string;
  material: string;
  startingPrice: number;
  images: string[];
  image?: string;
  videoUrl?: string; // Product Video (MP4/WebM)
  availableSizes: string[];
  featured: boolean;
  popular: boolean;
  active: boolean;
  createdAt: string;
  model3d?: DoorModel3DConfig;
  transparentPngUrl?: string;

  // Product-Specific Pricing & Configuration Extensions
  pricingType?: DoorPricingType; // 'sqft' (default) | 'fixed'
  basePrice?: number; // Base rate (₹/sq.ft if 'sqft') or fixed price (₹ if 'fixed')
  priceIncludesMaterial?: boolean; // Defaults to true for catalogue doors (all-inclusive base price)
  craftsmanshipOnly?: boolean; // Set to true if door configuration explicitly separates craftsmanship from material
  minWidthInch?: number;
  maxWidthInch?: number;
  minHeightInch?: number;
  maxHeightInch?: number;
  minPrice?: number; // Minimum order price for this design
  availableMaterialIds?: string[]; // Allowed materials for this door (if empty, allows all active)
  materialPrices?: Record<string, number>; // materialId -> override rate
  availableFinishIds?: string[]; // Allowed finishes
  finishPrices?: Record<string, number>; // finishId -> override rate
  availableFrameIds?: string[]; // Allowed frames
  framePrices?: Record<string, number>; // frameId -> override price
  availableHardwareIds?: string[]; // Allowed hardware
  hardwarePrices?: Record<string, number>; // hardwareId -> override price
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface DoorMaterial {
  id: string;
  name: string;
  ratePerSqFt: number;
  description: string;
  image?: string;
  active: boolean;
}

export interface PolishFinish {
  id: string;
  name: string;
  ratePerSqFt: number;
  description: string;
  image?: string;
  active: boolean;
}

export interface ChaukhatFrame {
  id: string;
  name: string;
  price: number;
  image?: string;
  description: string;
  active: boolean;
}

export type ChaukhatPricingMethod = 'running_foot' | 'cubic_foot' | 'fixed';

export interface ChaukhatWoodType {
  id: string;
  name: string; // e.g. "Sagwan / Teak Wood", "Sal Wood"
  baseRatePerRft: number; // e.g. 450
  baseRatePerCuFt?: number; // e.g. 3600
  description?: string;
  active: boolean;
}

export interface ChaukhatSectionSize {
  id: string;
  name: string; // e.g. "5 inches × 4 inches"
  widthInch: number;
  depthInch: number;
  description?: string;
  isPopular?: boolean;
  active: boolean;
}

export interface ChaukhatDimensionPreset {
  id: string;
  label: string; // e.g. "7 ft × 4 ft"
  heightFt: number;
  widthFt: number;
  description?: string;
  active: boolean;
}

export interface ChaukhatDesignCard {
  id: 'plain' | 'diamond' | 'hand_carved';
  name: string;
  tagline: string;
  description: string;
  image: string;
  carvingChargePerRft: number;
  active: boolean;
}

export interface ChaukhatProduct {
  id: string;
  name: string;
  description: string;
  pricingMethod: ChaukhatPricingMethod;
  baseMaterialRate: number; // e.g. 450 per running foot
  fixedPrice?: number; // if fixed
  plainCarvingCharge: number; // e.g. 0
  diamondCarvingCharge: number; // e.g. 120
  handCarvedCharge: number; // e.g. 280
  plainImage?: string;
  diamondImage?: string;
  handCarvedImage?: string;
  active: boolean;
  displayOrder?: number;
}

export interface ChaukhatCalculationResult {
  id?: string;
  woodType: string;
  woodRatePerRft: number;
  sectionSizeName: string;
  sectionWidthInch: number;
  sectionDepthInch: number;
  isCustomSection?: boolean;
  heightFt: number;
  widthFt: number;
  heightInch: number;
  widthInch: number;
  isCustomDimensions?: boolean;
  runningLengthFt: number; // 2 * heightFt + widthFt
  cubicFeet?: number;
  selectedDesignId: 'plain' | 'diamond' | 'hand_carved';
  selectedDesignName: string;
  selectedDesignImage?: string;
  pricingMethod: ChaukhatPricingMethod;
  materialCost: number;
  designCarvingCharge: number;
  subtotal: number;
  additionalCharges: number;
  totalPrice: number;
  currency: string;
  isEstimate: boolean;
  timestamp?: string;
}

export interface CombinedQuotation {
  doorCalculation?: CalculationResult | null;
  chaukhatCalculation?: ChaukhatCalculationResult | null;
  doorCost: number;
  chaukhatCost: number;
  combinedSubtotal: number;
  additionalCharges: number;
  combinedTotal: number;
  timestamp: string;
}


export interface HardwareItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  description: string;
  active: boolean;
  defaultQty?: number;
}

export interface HomeBanner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  buttonText?: string;
  buttonAction?: string; // 'calculator' | 'gallery' | 'visualizer' | 'whatsapp' | 'contact' | 'custom'
  destinationUrl?: string; // Internal route (e.g. 'calculator', 'gallery', 'chaukhat-calculator') or external https:// URL
  openInNewTab?: boolean; // Open destination in new browser tab
  order: number;
  active: boolean;
  badge?: string;
  slot?: 'slot_1' | 'slot_2' | 'slot_3' | 'all' | 'hero' | string;
  bannerType?: 'main' | 'promotion';
}

export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export type CommentStatus = 'pending' | 'approved' | 'hidden' | 'spam';

export interface ArticleCommentReply {
  text: string;
  repliedAt: string;
  authorName: string;
}

export interface ArticleComment {
  id: string;
  articleId: string;
  authorName: string;
  authorEmail?: string;
  authorPhoto?: string;
  userId?: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  adminReply?: ArticleCommentReply;
  likes?: number;
}

export interface ArticleImageItem {
  id: string;
  url: string;
  caption?: string;
  alt?: string;
}

export type ArticleCTAType = 'calculator' | 'gallery' | 'whatsapp' | 'custom';

export interface ArticleCTAConfig {
  enabled: boolean;
  type: ArticleCTAType;
  title: string;
  subtitle?: string;
  buttonText: string;
  destination?: string;
  customUrl?: string;
  doorId?: string;
}

export interface ArticleSEOConfig {
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  secondaryKeywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
}

export type IndiaDeliveryZone = 'West' | 'North' | 'South' | 'East' | 'Central' | 'North-East';

export interface IndiaDeliveryState {
  id: string; // State code e.g. 'MH', 'GJ', 'RJ', 'DL', etc.
  code: string;
  name: string;
  zone: IndiaDeliveryZone;
  available: boolean;
  deliveryDays: string; // e.g. '3 to 5 Days'
  estimatedDays?: string;
  citiesServed: string[];
  majorCities?: string[];
  deliveryNote?: string;
  deliveryTier?: string;
  badge?: string; // e.g. 'Popular', 'Fast Dispatch', 'Direct Factory'
  hubAddress?: string;
}

export interface DeliveryStory {
  id: string;
  stateId?: string;
  stateName: string;
  city?: string;
  cityName?: string;
  customerFirstName?: string;
  customerInitial?: string;
  customerName?: string;
  orderTitle?: string;
  orderDescription?: string;
  doorThumbnail?: string;
  doorPhotoUrl?: string;
  deliveryPhoto?: string;
  deliveryPhotoUrl?: string;
  reviewText?: string;
  customerReview?: string;
  deliveryDate: string;
  deliveryStatus?: 'Delivered' | 'In Transit' | 'Dispatched';
  isVerified?: boolean;
  isVerifiedCustomer?: boolean;
  isSample?: boolean;
  published: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  image: string;
  gallery?: ArticleImageItem[];
  excerpt: string;
  content: string;
  author?: string;
  authorPhoto?: string;
  authorBio?: string;
  category?: string;
  categoryId?: string;
  tags?: string[];
  readTime?: string;
  status?: ArticleStatus;
  published: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  
  // Engagement Metrics
  views?: number;
  likes?: number;
  shares?: number;
  commentCount?: number;
  
  // YouTube Video Integration
  youtubeVideoId?: string;
  youtubeUrl?: string;
  youtubeTitle?: string;
  youtubeDescription?: string;

  // Interactivity & Connections
  relatedDoorIds?: string[];
  relatedArticleIds?: string[];
  cta?: ArticleCTAConfig;
  seo?: ArticleSEOConfig;

  createdAt: string;
  updatedAt?: string;
}

export interface ArticleAnalyticsSummary {
  totalArticles: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  overallEngagementRate: number;
  topViewed: Article[];
  topLiked: Article[];
  topShared: Article[];
  topCommented: Article[];
}

export interface CalculationInput {
  doorId?: string;
  doorName?: string;
  doorImage?: string;
  widthInch: number;
  heightInch: number;
  materialId: string;
  finishId: string;
  frameId: string; // Can be 'none'
  hardwareId: string; // Can be 'none'
  hardwareQty: number;
}

export interface CalculationResult {
  widthInch: number;
  heightInch: number;
  sqFt: number;

  doorId?: string;
  doorName?: string;
  doorImage?: string;
  doorCategory?: string;
  doorPricingType?: DoorPricingType;
  doorBaseRate?: number;
  doorCost: number;

  materialIncludedInDoorPrice?: boolean;
  materialAdjustmentPerSqFt?: number;

  materialName: string;
  materialRate: number;
  materialCost: number;

  finishName: string;
  finishRate: number;
  finishCost: number;

  frameName: string;
  frameCost: number;

  hardwareName: string;
  hardwarePrice: number;
  hardwareQty: number;
  hardwareCost: number;

  subtotal: number;
  additionalCharges: number;
  additionalChargeName: string;
  total: number;

  validationWarning?: string;
  hasMissingPrice?: boolean;
  missingPriceMessage?: string;
}

export interface Quotation extends CalculationResult {
  id: string;
  quoteNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  doorId?: string;
  doorName: string;
  doorImage?: string;
  notes?: string;
  status: 'new' | 'sent_whatsapp' | 'downloaded' | 'paid' | 'converted';
  createdAt: string;
}

export interface ContentProtectionSettings {
  enableImageProtection: boolean;
  enableWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number; // 0.05 to 0.60
  watermarkPattern: 'diagonal' | 'center' | 'repeated' | 'corner';
  enableAndroidFlagSecure: boolean;
  enableAndroidScreenRecordProtection: boolean;
}

export interface CustomerEnquiry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  enquiryType: string;
  doorId?: string;
  doorName?: string;
  message: string;
  status: 'new' | 'contacted' | 'resolved';
  createdAt: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  whatsapp?: string;
  googleBusiness?: string;
}

export interface LegalSettings {
  privacyPolicy?: string;
  aboutUs?: string;
  contactInfoNotes?: string;
  disclaimer?: string;
  lastUpdated?: string;
  socialLinks?: SocialLinks;
}

export type WoodSpeciesCategory =
  | 'Sagwan (Teak)'
  | 'Saal (Sal)'
  | 'Sheesham'
  | 'Jungle Wood'
  | 'Deodar'
  | 'Mango Wood'
  | 'Neem'
  | 'Pine'
  | 'Plywood'
  | 'Veneered Wood'
  | 'Laminated or engineered wood'
  | 'Other / Unknown';

export interface WoodReferenceSample {
  id: string;
  woodType: WoodSpeciesCategory | string;
  verifiedLabel: string;
  imageUrl: string;
  source: string;
  notes?: string;
  anatomicalFeatures?: {
    grainPattern?: string;
    poreDistribution?: string;
    colorVariation?: string;
    texture?: string;
    cutType?: 'radial' | 'tangential' | 'end-grain' | 'general';
    finishState?: 'unpolished' | 'raw_cut' | 'sanded' | 'clear_polish' | 'stained' | 'vintage';
  };
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WoodAccuracyBenchmarkResult {
  totalTests: number;
  correctIdentifications: number;
  accuracyRate: number; // 0 to 100
  sagwanSalConfusionCount: number;
  sagwanSheeshamConfusionCount: number;
  falseConfidentCount: number;
  honestRefusalCount: number;
  evaluatedAt: string;
  details: {
    sampleId: string;
    expectedSpecies: string;
    predictedSpecies: string;
    confidence: string;
    passed: boolean;
    isRefusal: boolean;
    notes: string;
  }[];
}

export interface AIWoodAnalysisResult {
  wood_category?: 'Sagwan / Sagwani (Teak)' | 'Other Wood (Non-Teak)' | 'Uncertain / Pehchan Confirm Nahi Ho Paayi';
  likely_wood_type: string;
  alternative_possibilities: string[];
  confidence_level: 'Low' | 'Moderate' | 'High';
  visual_observations: string[];
  visible_evidence?: string[];
  visible_reasons?: string[];
  features_unassessed?: string[];
  uncertainty_reasons?: string[];
  reasons_for_match: string[];
  limitations: string[];
  additional_photos_recommended: boolean;
  is_image_sufficient?: boolean;
  photo_recommendations?: string[];
  customer_explanation: string;
  anti_false_sagwan_notice?: string;
  comparison_notes?: Record<string, string>;
  disclaimer?: string;
  analyzed_at?: string;
}

export interface AIWoodDetectorSettings {
  enabled: boolean;
  maxDailyScans?: number;
  customNotice?: string;
}

export interface AIWoodDetectorLogItem {
  id: string;
  timestamp: string;
  likelyWoodType?: string;
  confidenceLevel?: string;
  success: boolean;
  errorMessage?: string;
  responseTimeMs?: number;
}

export interface AIWoodDetectorStats {
  enabled: boolean;
  totalScans: number;
  todayScans: number;
  successfulScans: number;
  failedScans: number;
  lastScanTimestamp?: string;
  recentLogs: AIWoodDetectorLogItem[];
}

export interface BrandHighlight {
  title: string;
  subtitle: string;
}

export interface CompanyStorySettings {
  sectionTitle?: string;
  subtitle?: string;
  storyHeading?: string;
  companyStory?: string;
  ownerName?: string;
  ownerDesignation?: string;
  ownerDescription?: string;
  ownerPhotoUrl?: string;
  highlights?: BrandHighlight[];
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  logoUrl?: string;
  productionApiUrl?: string;
  phone: string;
  whatsappNumber: string;
  googleMapsUrl?: string;
  email: string;
  address: string;
  gstNumber?: string;
  currencySymbol: string;
  quotePrefix: string;
  additionalChargeName: string;
  additionalChargePercentage: number;
  terms: string[];
  disclaimer: string;
  contentProtection?: ContentProtectionSettings;
  legalSettings?: LegalSettings;
  aiWoodDetector?: AIWoodDetectorSettings;
  storySettings?: CompanyStorySettings;
  adSettings?: AdMobSettings;
}

export interface AdMobSettings {
  enabled: boolean;
  testMode: boolean;
  appId?: string;
  bannerAdUnitId?: string;
  interstitialAdUnitId?: string;
  rewardedAdUnitId?: string;
  rewardedInterstitialAdUnitId?: string;
  nativeAdUnitId?: string;
  appOpenAdUnitId?: string;
  enableBanners: boolean;
  enableInterstitials: boolean;
  enableRewardedAds: boolean;
  enableRewardedInterstitialAds: boolean;
  enableCatalogNativeAds: boolean;
  enableAppOpenAds: boolean;
  catalogNativeAdFrequency: number; // e.g. 6 or 8
  interstitialMinIntervalSeconds: number; // e.g. 45 or 60
  appOpenMinIntervalSeconds: number; // e.g. 180
  // Centralized Smart Frequency & Session Management
  maxInterstitialsPerSession?: number; // e.g. 4
  maxAppOpenPerSession?: number; // e.g. 2
  enableNavTransitionInterstitials?: boolean; // natural section transition
  navTransitionMinViews?: number; // min screens navigated before eligible
  enableArticlesNativeAds?: boolean; // native ad in articles / guides feed
  articlesNativeAdFrequency?: number; // e.g. 3
  enableVisualizerRewardedBonus?: boolean; // optional 4K studio lighting unlock
  // Granular placement banner toggles
  bannerHome?: boolean;
  bannerCatalog?: boolean;
  bannerCalculator?: boolean;
  bannerSlidingWindow?: boolean;
  bannerWoodDetector?: boolean;
  bannerChaukhat?: boolean;
  bannerDetail?: boolean;
  bannerVisualizer?: boolean;
  bannerArticles?: boolean;
  bannerTracking?: boolean;
  bannerSaved?: boolean;
  // Granular placement interstitial & rewarded toggles
  interstitialSlidingWindow?: boolean;
  interstitialWoodDetector?: boolean;
  interstitialCalculator?: boolean;
  rewardedWoodDetector?: boolean;
}

export interface AdminStats {
  totalDoors: number;
  totalQuotes: number;
  totalMaterials: number;
  recentQuotes: Quotation[];
}

export interface AdminAuditLogItem {
  id: string;
  entity: string; // 'door' | 'material' | 'finish' | 'frame' | 'hardware' | 'banner' | 'article' | 'team' | 'settings' | 'backup'
  action: 'create' | 'update' | 'delete' | 'bulk_update' | 'restore';
  targetId?: string;
  targetName?: string;
  timestamp: string;
  success: boolean;
  details?: string;
}

export interface UserCalculationRecord {
  id: string;
  userId?: string;
  doorId?: string;
  doorName?: string;
  doorImage?: string;
  date: string;
  input: CalculationInput;
  result: CalculationResult;
  notes?: string;
  quotationId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  address?: string;
  pincode?: string;
  preferredWood?: string;
  favoriteDoorIds: string[];
  favoriteArticleIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface UserFavoriteDoor {
  doorId: string;
  doorName?: string;
  addedAt?: string;
}

export interface Point2D {
  x: number; // 0.0 to 1.0 (normalized relative to image width)
  y: number; // 0.0 to 1.0 (normalized relative to image height)
}

export interface EntranceCorners {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

export interface ThresholdLine {
  start: Point2D; // typically bottomLeft on floor
  end: Point2D;   // typically bottomRight on floor
  angleDeg?: number;
}

export interface DoorOpeningCoordinates {
  left: number; // 0.0 to 1.0
  top: number; // 0.0 to 1.0
  right: number; // 0.0 to 1.0
  bottom: number; // 0.0 to 1.0
}

export interface EntrancePerspective {
  horizontalAngle: number; // in degrees, e.g. -25 to +25
  verticalAngle: number; // in degrees, e.g. -15 to +15
  skewX?: number; // degrees
  skewY?: number; // degrees
}

export interface AIDetectionResult {
  entranceDetected: boolean;
  confidence: number; // 0.0 to 1.0
  doorOpening: DoorOpeningCoordinates;
  corners?: EntranceCorners; // AI-detected 4-corner entrance quad
  threshold?: ThresholdLine; // Floor threshold contact baseline
  frameDetected: boolean;
  perspective: EntrancePerspective;
  recommendedScale: number; // 0.3 to 1.5
  recommendedPosition: {
    x: number; // 0.0 to 1.0
    y: number; // 0.0 to 1.0
  };
  recommendedRotation: number; // in degrees
  lighting?: string;
  wallTone?: string;
  recommendation?: string;
  fallback?: boolean;
  note?: string;
  cached?: boolean;
  gateType?: string;
  detectedObjectLabel?: string;
  distance?: 'near' | 'medium' | 'distance';
}

// ---------------- Push Notification Types ----------------

export type NotificationCategory =
  | 'new_designs'
  | 'offers'
  | 'price_updates'
  | 'door_tips'
  | 'important_updates';

export type NotificationTargetAudience =
  | 'all'
  | 'new_designs'
  | 'offers'
  | 'price_updates'
  | 'door_tips'
  | 'important_updates';

export interface NotificationPreferences {
  enabled: boolean;
  newDesigns: boolean;
  offers: boolean;
  priceUpdates: boolean;
  doorTips: boolean;
  importantUpdates: boolean;
}

export interface NotificationTokenRecord {
  id: string;
  token: string;
  userId?: string;
  deviceId: string;
  platform: 'web' | 'android' | 'ios' | 'pwa';
  browser?: string;
  permission: 'granted' | 'denied' | 'default';
  active: boolean;
  preferences: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface NotificationCampaign {
  id: string;
  title: string;
  message: string;
  image?: string;
  category: NotificationCategory;
  targetAudience: NotificationTargetAudience;
  deepLink?: string;
  doorId?: string;
  status: 'sent' | 'scheduled' | 'draft' | 'failed';
  scheduledAt?: string; // ISO string in Asia/Kolkata timezone
  sentAt?: string;
  createdBy?: string;
  recipientCount?: number;
  successCount?: number;
  failureCount?: number;
  error?: string;
  createdAt: string;
}

export interface NotificationStats {
  totalSubscribers: number;
  activeSubscribers: number;
  campaignsCount: number;
  categorySubscribers: Record<NotificationCategory, number>;
  isFcmConfigured: boolean;
  fcmConfigDetails?: {
    projectId?: string;
    clientEmail?: string;
  };
}

// ---------------- Team Management Types ----------------

export interface TeamSocialLinks {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  email?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  designation: string;
  photo: string;
  shortBio: string;
  fullBio: string;
  experience?: string;
  specialization?: string;
  responsibilities?: string[];
  achievements?: string[];
  socialLinks?: TeamSocialLinks;
  videoUrl?: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------- Order Tracking & Manufacturing Progress Types ----------------

export type TrackingStageId =
  | 'order_confirmed'
  | 'transferred_to_workshop'
  | 'wood_selection'
  | 'mfg_25'
  | 'mfg_50'
  | 'mfg_75'
  | 'carving_design'
  | 'finishing_polishing'
  | 'mfg_100'
  | 'transferred_to_showroom'
  | 'searching_delivery_partner'
  | 'delivery_partner_confirmed'
  | 'dispatched'
  | 'on_the_way'
  | 'delivered';

export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'not_applicable';

export type OrderStatus = 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface StageConfigDefinition {
  id: TrackingStageId;
  stepNumber: number;
  name: string;
  customerDescription: string;
  category: 'order' | 'workshop' | 'manufacturing' | 'finishing' | 'showroom' | 'delivery';
  isMilestone: boolean;
  milestonePercent?: number; // 25, 50, 75, 100
  allowNotApplicable: boolean;
}

export const ORDER_TRACKING_STAGES: StageConfigDefinition[] = [
  {
    id: 'order_confirmed',
    stepNumber: 1,
    name: 'Order Confirmed',
    customerDescription: 'Your order has been confirmed by Jai Hanuman Door.',
    category: 'order',
    isMilestone: false,
    allowNotApplicable: false,
  },
  {
    id: 'transferred_to_workshop',
    stepNumber: 2,
    name: 'Transferred to Workshop',
    customerDescription: 'Your order has been transferred to our manufacturing workshop.',
    category: 'workshop',
    isMilestone: false,
    allowNotApplicable: false,
  },
  {
    id: 'wood_selection',
    stepNumber: 3,
    name: 'Wood Selection',
    customerDescription: 'Wood is being selected according to your order specifications.',
    category: 'workshop',
    isMilestone: false,
    allowNotApplicable: false,
  },
  {
    id: 'mfg_25',
    stepNumber: 4,
    name: '25% Manufacturing Completed',
    customerDescription: 'Initial manufacturing work on your door has been completed.',
    category: 'manufacturing',
    isMilestone: true,
    milestonePercent: 25,
    allowNotApplicable: false,
  },
  {
    id: 'mfg_50',
    stepNumber: 5,
    name: '50% Manufacturing Completed',
    customerDescription: 'Half of the door manufacturing work has been completed.',
    category: 'manufacturing',
    isMilestone: true,
    milestonePercent: 50,
    allowNotApplicable: false,
  },
  {
    id: 'mfg_75',
    stepNumber: 6,
    name: '75% Manufacturing Completed',
    customerDescription: 'Most of the main manufacturing work has been completed.',
    category: 'manufacturing',
    isMilestone: true,
    milestonePercent: 75,
    allowNotApplicable: false,
  },
  {
    id: 'carving_design',
    stepNumber: 7,
    name: 'Carving & Design Work',
    customerDescription: 'Carving and designer work is in progress, if applicable to your order.',
    category: 'manufacturing',
    isMilestone: false,
    allowNotApplicable: true,
  },
  {
    id: 'finishing_polishing',
    stepNumber: 8,
    name: 'Finishing & Polishing',
    customerDescription: 'Your door is undergoing finishing and polishing.',
    category: 'finishing',
    isMilestone: false,
    allowNotApplicable: true,
  },
  {
    id: 'mfg_100',
    stepNumber: 9,
    name: '100% Door Ready',
    customerDescription: 'Your door manufacturing is complete and the product is ready.',
    category: 'manufacturing',
    isMilestone: true,
    milestonePercent: 100,
    allowNotApplicable: false,
  },
  {
    id: 'transferred_to_showroom',
    stepNumber: 10,
    name: 'Transferred to Showroom',
    customerDescription: 'Your completed door has arrived at Jai Hanuman Door showroom.',
    category: 'showroom',
    isMilestone: false,
    allowNotApplicable: true,
  },
  {
    id: 'searching_delivery_partner',
    stepNumber: 11,
    name: 'Searching for Delivery Partner',
    customerDescription: 'We are arranging a suitable delivery or transport partner for your order.',
    category: 'delivery',
    isMilestone: false,
    allowNotApplicable: true,
  },
  {
    id: 'delivery_partner_confirmed',
    stepNumber: 12,
    name: 'Delivery Partner Confirmed',
    customerDescription: 'Your delivery or transport partner has been confirmed.',
    category: 'delivery',
    isMilestone: false,
    allowNotApplicable: true,
  },
  {
    id: 'dispatched',
    stepNumber: 13,
    name: 'Dispatched',
    customerDescription: 'Your order has been dispatched from our showroom.',
    category: 'delivery',
    isMilestone: false,
    allowNotApplicable: true,
  },
  {
    id: 'on_the_way',
    stepNumber: 14,
    name: 'On the Way to Your Address',
    customerDescription: 'Your order is on its way to the delivery address.',
    category: 'delivery',
    isMilestone: false,
    allowNotApplicable: true,
  },
  {
    id: 'delivered',
    stepNumber: 15,
    name: 'Delivered',
    customerDescription: 'Your order has been delivered.',
    category: 'delivery',
    isMilestone: false,
    allowNotApplicable: false,
  },
];

export interface OrderStageRecord {
  id: TrackingStageId;
  name: string;
  customerDescription: string;
  status: StageStatus;
  isMilestone: boolean;
  milestonePercent?: number;
  startedAt?: string;
  completedAt?: string;
  customerNote?: string;
  adminNote?: string; // PRIVATE to admin only
  notApplicableReason?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface TrackingMediaItem {
  id: string;
  stageId: TrackingStageId;
  url: string;
  type: 'image' | 'video';
  caption?: string;
  isCustomerVisible: boolean; // default: true
  uploadedAt: string;
}

export interface TrackingAuditItem {
  id: string;
  timestamp: string;
  action: string;
  stageId?: TrackingStageId;
  actor: string;
  details: string;
}

export interface TrackingDeliveryInfo {
  deliveryPartnerName?: string;
  transportCompany?: string;
  lrNumber?: string; // Lorry Receipt / Bilty No.
  trackingUrl?: string;
  deliveryContactNumber?: string;
  dispatchedAt?: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  showroomTransferDate?: string;
  workshopTransferDate?: string;
  transferNotes?: string;
}

export interface TrackingOrder {
  id: string; // Internal id (e.g. ord-1727878899)
  trackingId: string; // Unique public ID (e.g. JHD-2026-X8K92)
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCity: string;
  customerAddress?: string; // Private
  productName: string;
  productCategory?: string;
  productImage?: string;
  woodType?: string;
  finishType?: string;
  quantity: number;
  dimensions?: {
    widthInch?: number;
    heightInch?: number;
    sqFt?: number;
  };
  totalAmount?: number;
  advancePaid?: number;
  linkedQuotationId?: string;
  linkedEnquiryId?: string;
  status: OrderStatus;
  statusReason?: string;
  currentStageId: TrackingStageId;
  manufacturingPercent: number; // 0, 25, 50, 75, 100
  deliveryStatusText: string;
  stages: OrderStageRecord[];
  media: TrackingMediaItem[];
  delivery: TrackingDeliveryInfo;
  estimatedCompletionDate?: string;
  expectedDispatchDate?: string;
  workshopNotes?: string;
  showroomNotes?: string;
  adminInternalNotes?: string; // Private
  auditHistory: TrackingAuditItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicTrackingView {
  trackingId: string;
  customerName: string; // Masked or short, e.g. "Rahul P."
  customerCity?: string;
  productName: string;
  productCategory?: string;
  productImage?: string;
  woodType?: string;
  finishType?: string;
  quantity: number;
  dimensions?: {
    widthInch?: number;
    heightInch?: number;
    sqFt?: number;
  };
  orderDate: string;
  lastUpdated: string;
  status: OrderStatus;
  statusReason?: string;
  currentStage: {
    id: TrackingStageId;
    name: string;
    description: string;
    status: StageStatus;
  };
  manufacturingPercent: number; // 0, 25, 50, 75, 100
  deliveryStatusText: string;
  stages: {
    id: TrackingStageId;
    stepNumber: number;
    name: string;
    customerDescription: string;
    status: StageStatus;
    isMilestone: boolean;
    milestonePercent?: number;
    startedAt?: string;
    completedAt?: string;
    customerNote?: string;
    notApplicableReason?: string;
  }[];
  media: {
    id: string;
    stageId: TrackingStageId;
    url: string;
    type: 'image' | 'video';
    caption?: string;
    uploadedAt: string;
  }[];
  delivery?: {
    deliveryPartnerName?: string;
    transportCompany?: string;
    lrNumber?: string;
    trackingUrl?: string;
    dispatchedAt?: string;
    estimatedDeliveryAt?: string;
    deliveredAt?: string;
    showroomTransferDate?: string;
  };
  estimatedCompletionDate?: string;
  expectedDispatchDate?: string;
  officialWhatsApp: string;
  officialPhone: string;
}

// ============================================================================
// 3D & AR Door Fitting and Visualization Types
// ============================================================================

export type WoodColorTone =
  | 'natural_teak'
  | 'light_teak'
  | 'golden_teak'
  | 'dark_teak'
  | 'walnut'
  | 'rosewood'
  | 'custom';

export type DoorDesignStyle = 'plain' | 'modern' | 'traditional' | 'designer' | 'carving';

export type DoorHandleStyle = 'brass_antique' | 'brass_royal' | 'steel_modern' | 'minimal_black';

export interface DoorModel3DConfig {
  modelUrl?: string; // URL to uploaded .glb or .gltf
  textureUrl?: string; // High-resolution front face / carving texture
  woodGrainUrl?: string; // Optional normal / roughness wood grain texture
  defaultWoodType?: string; // e.g. 'Sagwan'
  defaultFinish?: string; // e.g. 'Teak Polish'
  defaultColor?: WoodColorTone;
  customHexColor?: string;
  defaultStyle?: DoorDesignStyle;
  defaultWidthInch?: number;
  defaultHeightInch?: number;
  defaultThicknessInch?: number;
  frameWidthInch?: number;
  frameDepthInch?: number;
  handleStyle?: DoorHandleStyle;
  allowDoubleDoor?: boolean;
  arEnabled?: boolean;
  transparentPngUrl?: string;
  isPublished?: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface CustomDoorFittingState {
  doorId: string;
  woodType: string;
  woodMaterialId: string;
  finishId: string;
  finishName: string;
  colorTone: WoodColorTone;
  customHexColor?: string;
  designStyle: DoorDesignStyle;
  widthInch: number;
  heightInch: number;
  thicknessInch: number;
  isDoubleDoor: boolean;
  frameId: string;
  frameName: string;
  hardwareId: string;
  hardwareName: string;
  hardwareQty: number;
  handleStyle: DoorHandleStyle;
  doorOpenAngle: number; // 0 to 90 degrees
  lightingIntensity: number; // 0.6 to 2.0
}

// ============================================================================
// Sliding Window Fabrication Calculator Types
// ============================================================================

export type WindowMeasurementUnit = 'inch' | 'feet' | 'mm';
export type SlidingTrackType = '2-track' | '3-track';
export type RuleOperator = '+' | '-';

export type FabricationRuleCategory =
  | '2-track'
  | '3-track'
  | 'glass'
  | 'mosquito-net'
  | 'handle'
  | 'interlock'
  | 'top-track'
  | 'bottom-track'
  | 'bearing';

export type FabricationRuleKey =
  | 'glassWidthDeduction'
  | 'glassWidthAddition'
  | 'glassHeightDeduction'
  | 'mosquitoNetWidthDeduction'
  | 'mosquitoNetWidthAddition'
  | 'mosquitoNetHeightDeduction'
  | 'handleHeightDeduction'
  | 'interlockHeightDeduction'
  | 'topTrackAdjustment'
  | 'bottomTrackAdjustment'
  | 'bearingWidthDeduction'
  | 'topBearingAdjustment'
  | 'bottomBearingAdjustment';

export interface FabricationRuleSetting {
  key: FabricationRuleKey;
  name: string;
  description: string;
  category: FabricationRuleCategory;
  value: number;
  unit: WindowMeasurementUnit;
  operator: RuleOperator;
  defaultValue: number;
  defaultUnit: WindowMeasurementUnit;
  defaultOperator: RuleOperator;
  appliesTo: 'all' | '2-track' | '3-track';
}

export interface PanelArrangementRule {
  id: string;
  label: string;
  panelType: 'glass' | 'mosquito_net';
  widthDivisor: number;
  extraWidthAdjustment: number;
  extraWidthOperator: RuleOperator;
  extraHeightAdjustment: number;
  extraHeightOperator: RuleOperator;
  adjustmentUnit: WindowMeasurementUnit;
}

export interface FabricationProfile {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  trackType: SlidingTrackType;
  isDefault: boolean;
  isSystemSeed?: boolean;
  glassPanelCount: number;
  mosquitoNetPanelCount: number;
  glassWidthDivisor: number;
  mosquitoNetWidthDivisor: number;
  bearingDivisor?: number;
  rules: Record<FabricationRuleKey, FabricationRuleSetting>;
  panelArrangements: PanelArrangementRule[];
  createdAt: string;
  updatedAt: string;
}

export interface SlidingWindowInput {
  id: string;
  windowNumber: string;
  width: number;
  height: number;
  unit: WindowMeasurementUnit;
  trackType: SlidingTrackType;
  configuration: string;
  glassThickness: string;
  mosquitoNetRequired: boolean;
  profileId?: string;
  notes?: string;
}

export interface CalculationFormulaStep {
  label: string;
  formula: string;
  valueInch: number;
  valueDisplay: number;
  unit: WindowMeasurementUnit;
}

export interface CalculatedPanelDimension {
  id: string;
  label: string;
  panelType: 'glass' | 'mosquito_net';
  widthInch: number;
  heightInch: number;
  widthDisplay: number;
  heightDisplay: number;
  widthMm: number;
  heightMm: number;
  displayUnit: WindowMeasurementUnit;
  breakdown: CalculationFormulaStep[];
}

export interface SlidingWindowCalculationResult {
  windowId: string;
  windowNumber: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  displayUnit: WindowMeasurementUnit;
  original: {
    width: number;
    height: number;
    unit: WindowMeasurementUnit;
    widthInch: number;
    heightInch: number;
    widthMm: number;
    heightMm: number;
    trackType: SlidingTrackType;
    configuration: string;
    glassThickness: string;
    mosquitoNetRequired: boolean;
  };
  profileUsed: {
    id: string;
    name: string;
    trackType: SlidingTrackType;
  };
  fabrication: {
    topTrackInch: number;
    topTrackDisplay: number;
    topTrackMm: number;
    bottomTrackInch: number;
    bottomTrackDisplay: number;
    bottomTrackMm: number;
    handleInch: number;
    handleDisplay: number;
    handleMm: number;
    interlockInch: number;
    interlockDisplay: number;
    interlockMm: number;
    bearingRemainingInch: number;
    bearingRemainingDisplay: number;
    bearingRemainingMm: number;
    topBearingInch: number;
    topBearingDisplay: number;
    topBearingMm: number;
    bottomBearingInch: number;
    bottomBearingDisplay: number;
    bottomBearingMm: number;
  };
  glassPanels: CalculatedPanelDimension[];
  mosquitoNetPanels: CalculatedPanelDimension[];
  breakdown: CalculationFormulaStep[];
  calculatedAt: string;
}

export type NotebookScanConfidence = 'High' | 'Review' | 'Unclear';

export interface NotebookExtractedRowSnapshot {
  windowNumber: string;
  rawText: string;
  width: number | null;
  height: number | null;
  unit: WindowMeasurementUnit;
  confidence: NotebookScanConfidence;
}

export interface NotebookExtractedRow {
  id: string;
  pageId: string;
  pageLabel: string;
  windowNumber: string;
  rawText: string;
  width: number | null;
  height: number | null;
  unit: WindowMeasurementUnit;
  unitAmbiguous?: boolean;
  confidence: NotebookScanConfidence;
  flags: string[];
  notes?: string;
  confirmed: boolean;
  originalAiSnapshot: NotebookExtractedRowSnapshot;
}

export interface NotebookPhotoPageRecord {
  id: string;
  pageNumber: number;
  fileName: string;
  mimeType: string;
  photoUrl: string;
  storageType: 'bunny_storage' | 'inline_preview';
  uploadedAt: string;
  detectedProjectName?: string;
  detectedCustomerName?: string;
  rawAiSummary?: string;
  warnings: string[];
}

export interface NotebookScanProjectRecord {
  pages: NotebookPhotoPageRecord[];
  extractedRows: NotebookExtractedRow[];
  verifiedByUser: boolean;
  verifiedAt: string;
  modelUsed: string;
}

export interface SlidingWindowProject {
  id: string;
  ownerId: string;
  projectName: string;
  customerName: string;
  defaultUnit: WindowMeasurementUnit;
  windows: SlidingWindowInput[];
  results: SlidingWindowCalculationResult[];
  profileSnapshots: Record<string, FabricationProfile>;
  notebookScan?: NotebookScanProjectRecord;
  createdAt: string;
  updatedAt: string;
}

export interface SlidingWindowUserSettings {
  ownerId: string;
  defaultUnit: WindowMeasurementUnit;
  default2TrackProfileId?: string;
  default3TrackProfileId?: string;
  defaultGlassThickness: string;
  showMmReference: boolean;
  updatedAt: string;
}

// ==========================================
// MOBILE OTP AUTHENTICATION & CUSTOMER PROFILE
// ==========================================

export type SubscriptionPlanTier = 'free' | 'premium';

export interface CustomerAccount {
  id: string;
  mobile: string; // Normalized 10-digit Indian mobile number (unique key)
  countryCode: string; // "+91"
  name: string;
  email?: string;
  city?: string;
  address?: string;
  woodScanCredits: number;
  subscriptionPlan: SubscriptionPlanTier; // Always defaults to 'free'; 'premium' ONLY after verified payment
  subscriptionStatus: PremiumSubscriptionStatus;
  subscriptionExpiryDate: string | null;
  verifiedAt: string;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OtpChallengeRecord {
  id: string;
  mobile: string; // Normalized 10-digit Indian mobile number
  otpHash: string; // scrypt salted hash (plaintext OTP never stored)
  otpSalt: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: string; // ISO timestamp (+5 minutes)
  resendAvailableAt: string; // ISO timestamp (+45 seconds)
  consumed: boolean;
  consumedAt?: string;
  provider: 'apitxt';
  providerRequestId?: string;
  createdAt: string;
}

export interface CustomerSessionRecord {
  id: string;
  customerId: string;
  mobile: string;
  tokenHash: string; // SHA-256 hash of bearer/cookie token
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
  revoked: boolean;
  userAgent?: string;
}

// ==========================================
// RAZORPAY ONLINE PAYMENTS & RECEIPTS
// ==========================================

export type RazorpayMode = 'test' | 'live';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export type PaymentItemType =
  | 'credit_pack'
  | 'quotation'
  | 'door_calculation'
  | 'chaukhat_calculation';

export interface PaymentTransaction {
  id: string;
  transactionId: string; // Unique internal transaction ID e.g. JHD-TXN-2026-...
  receiptNumber?: string; // Issued only after verified payment e.g. JHD-RCPT-2026-0001
  mode: RazorpayMode;
  status: PaymentStatus;
  itemType: PaymentItemType;
  itemReferenceId?: string; // packId, quoteId, doorId, etc.
  productName: string;
  productDescription?: string;
  amountInr: number; // Authoritative server-calculated INR amount
  amountPaise: number; // Authoritative server-calculated paise amount
  currency: 'INR';
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  customerCity?: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignatureVerified: boolean;
  webhookVerified?: boolean;
  paymentMethod?: string; // upi, card, netbanking, wallet
  failureReason?: string;
  failureCode?: string;
  fulfillmentApplied?: boolean; // Prevents duplicate credit/order fulfillment
  creditsAwarded?: number;
  pricingSnapshot?: Record<string, any>;
  createdAt: string;
  paidAt?: string;
  updatedAt: string;
}

export interface PaymentWebhookEventRecord {
  id: string;
  eventId: string; // Deduplication key (x-razorpay-event-id or event+order+payment)
  eventType: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  mode?: RazorpayMode;
  processedAt: string;
}

export interface PaymentGatewaySettings {
  mode: RazorpayMode; // Defaults to 'test'
  currency: 'INR';
  checkoutBrandName: string;
  checkoutDescription: string;
  checkoutThemeColor: string;
  smsProvider: 'apitxt';
  updatedAt?: string;
}

// ==========================================
// GOOGLE PLAY BILLING PREMIUM SUBSCRIPTIONS
// ==========================================

export type PremiumPlanId = 'JHD_ADFREE_MONTHLY' | 'JHD_ADFREE_YEARLY';

export type PremiumSubscriptionStatus =
  | 'none'
  | 'pending'
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'revoked';

export interface PremiumPlanDefinition {
  productId: PremiumPlanId;
  name: string;
  priceInr: number;
  billingCycle: 'monthly' | 'yearly';
  durationDays: number;
  billingLabel: string;
  savingsNote?: string;
}

export interface PremiumSubscriptionRecord {
  id: string;
  customerId: string;
  customerMobile: string;
  customerName: string;
  customerEmail?: string;
  productId: PremiumPlanId;
  planName: string;
  priceInr: number;
  billingCycle: 'monthly' | 'yearly';
  platform: 'android_google_play';
  packageName: string;
  purchaseTokenHash: string; // SHA-256 hash of Google Play purchaseToken
  purchaseTokenMasked: string; // Masked preview for admin diagnostics only
  orderId?: string;
  status: Exclude<PremiumSubscriptionStatus, 'none'>;
  autoRenewing: boolean;
  acknowledged: boolean;
  startTimeMillis: number;
  expiryTimeMillis: number;
  expiryDate: string; // ISO string
  cancelReason?: string;
  revokedAt?: string;
  verificationSource: 'google_play_api' | 'rtdn_webhook';
  lastVerifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PremiumEntitlementSummary {
  subscriptionPlan: SubscriptionPlanTier;
  subscriptionStatus: PremiumSubscriptionStatus;
  subscriptionExpiryDate: string | null;
  isPremium: boolean;
  adsRemoved: boolean;
  status: PremiumSubscriptionStatus;
  productId: PremiumPlanId | null;
  planName: string | null;
  priceInr: number | null;
  billingCycle: 'monthly' | 'yearly' | null;
  expiryTimeMillis: number | null;
  expiryDate: string | null;
  autoRenewing: boolean;
  lastVerifiedAt: string | null;
  source: 'google_play_billing' | 'none';
  message?: string;
}

export interface PremiumSubscriptionStats {
  activePremiumCustomers: number;
  activeAutoRenewingCount: number;
  cancelledActiveCount: number;
  expiredSubscriptions: number;
  pendingSubscriptions: number;
  refundedOrRevokedSubscriptions: number;
  monthlyActiveCount: number;
  yearlyActiveCount: number;
  monthlyTotalCount: number;
  yearlyTotalCount: number;
  totalRecords: number;
}

export interface GooglePlayBillingServerStatus {
  configured: boolean;
  packageName: string;
  hasServiceAccount: boolean;
  hasRtdnToken: boolean;
  missingEnvVars: string[];
}

export interface MonetizationPublicConfig {
  adSettings: AdMobSettings;
  entitlement: PremiumEntitlementSummary;
  plans: PremiumPlanDefinition[];
  googlePlayPackageName: string;
  googlePlayVerificationConfigured: boolean;
}

// ==========================================
// INDIAN ALUMINIUM WINDOW SYSTEMS & CONFIGURABLE CUTTING CALCULATOR
// ==========================================

export type WindowSystemCategoryId = 'sliding' | 'indian_aluminium' | 'special';

export type WindowIllustrationType =
  | '2-track'
  | '3-track'
  | '4-track'
  | '18-50'
  | 'heavy-sliding'
  | 'dhumal'
  | 'indian-standard'
  | 'aluminium-section'
  | 'local-fabrication'
  | 'custom-profile'
  | 'fixed-glass'
  | 'openable'
  | 'combination'
  | 'ventilator'
  | 'mosquito-net';

export type WindowSectionCategory =
  | 'top_track'
  | 'bottom_track'
  | 'side_frame'
  | 'interlock'
  | 'handle'
  | 'shutter_rail'
  | 'glass'
  | 'mosquito_net'
  | 'bearing'
  | 'other';

export type WindowRuleBaseDimension =
  | 'width'
  | 'height'
  | 'width_divided_by_shutters'
  | 'height_minus_handle';

export interface WindowSectionFormulaRule {
  id: string;
  name: string;
  sectionCode?: string;
  sectionDimensionSpec?: string; // e.g. "27mm x 18mm", optional admin-configured label
  category: WindowSectionCategory;
  baseDimension: WindowRuleBaseDimension;
  divisor: number; // e.g. 1 for full span, 2 or shutterCount for split panels
  useShutterCountAsDivisor?: boolean;
  minusDeductionInch: number; // Applied before division (or directly if divisor === 1)
  plusAdditionInch: number; // Applied after division (e.g. overlap/pocket allowance)
  piecesPerWindow: number; // Static piece count per window
  multiplyPiecesByShutters?: boolean; // If true, piecesPerWindow * shutterCount
  requiresMosquitoNet?: boolean; // Only included when mosquito net is checked
  notes?: string;
}

export interface WindowProfileSeriesConfig {
  id: string;
  name: string;
  code: string;
  sectionDimensions?: string; // e.g. Admin-configured aluminium extrusion specs
  isConfigured: boolean; // MUST be true only when verified formula rules are explicitly configured
  topTrackDeductionInch?: number | null;
  topTrackAdditionInch?: number | null;
  bottomTrackDeductionInch?: number | null;
  bottomTrackAdditionInch?: number | null;
  sideFrameDeductionInch?: number | null;
  sideFrameAdditionInch?: number | null;
  interlockDeductionInch?: number | null;
  interlockAdditionInch?: number | null;
  handleDeductionInch?: number | null;
  handleAdditionInch?: number | null;
  glassWidthDeductionInch?: number | null;
  glassWidthAdditionInch?: number | null;
  glassHeightDeductionInch?: number | null;
  glassHeightAdditionInch?: number | null;
  mosquitoNetWidthDeductionInch?: number | null;
  mosquitoNetWidthAdditionInch?: number | null;
  mosquitoNetHeightDeductionInch?: number | null;
  mosquitoNetHeightAdditionInch?: number | null;
  additionalSections: WindowSectionFormulaRule[];
  updatedAt?: string;
}

export interface WindowCuttingPreset {
  id: string;
  name: string;
  profileSeriesId: string;
  trackCount: number;
  shutterCount: number;
  includeMosquitoNet: boolean;
  notes?: string;
}

export interface WindowSystemDefinition {
  id: string;
  slug: string;
  name: string;
  categoryId: WindowSystemCategoryId;
  shortDescription: string;
  illustrationType: WindowIllustrationType;
  enabled: boolean;
  isSystemDefault?: boolean;
  /**
   * Only set for the existing verified 2-Track and 3-Track sliding window systems.
   * Ensures existing verified formulas remain 100% untouched.
   */
  usesLegacySlidingEngine?: '2-track' | '3-track';
  supportsTracks: boolean;
  defaultTrackCount: number;
  allowedTrackCounts: number[];
  defaultShutterCount: number;
  allowedShutterCounts: number[];
  supportsMosquitoNet: boolean;
  defaultMosquitoNet: boolean;
  formulaConfigured: boolean;
  profileSeries: WindowProfileSeriesConfig[];
  presets: WindowCuttingPreset[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface WindowCustomDeductionsInput {
  enabled: boolean;
  topTrackDeductionInch: number;
  topTrackAdditionInch: number;
  bottomTrackDeductionInch: number;
  bottomTrackAdditionInch: number;
  sideFrameDeductionInch: number;
  sideFrameAdditionInch: number;
  interlockDeductionInch: number;
  interlockAdditionInch: number;
  handleDeductionInch: number;
  handleAdditionInch: number;
  glassWidthDeductionInch: number;
  glassWidthAdditionInch: number;
  glassHeightDeductionInch: number;
  glassHeightAdditionInch: number;
  mosquitoNetWidthDeductionInch: number;
  mosquitoNetWidthAdditionInch: number;
  mosquitoNetHeightDeductionInch: number;
  mosquitoNetHeightAdditionInch: number;
}

export interface WindowSystemCalculationInput {
  systemId: string;
  profileSeriesId?: string;
  width: number;
  height: number;
  unit: WindowMeasurementUnit;
  quantity: number;
  trackCount: number;
  shutterCount: number;
  includeMosquitoNet: boolean;
  glassThickness?: string;
  windowLabel?: string;
  customDeductions?: WindowCustomDeductionsInput;
  /**
   * Optional legacy FabricationProfile override when calculating 2-track / 3-track
   * using the existing verified sliding window engine.
   */
  legacyProfile?: FabricationProfile | null;
}

export interface WindowCuttingMeasurementRow {
  id: string;
  name: string;
  category: WindowSectionCategory;
  sectionSpec?: string;
  lengthInch: number;
  lengthDecimalFormatted: string;
  lengthFractionFormatted: string | null;
  lengthMm: number;
  /** For 2D panel cuts (Glass & Mosquito Net), width & height are both populated */
  isTwoDimensional?: boolean;
  widthInch?: number;
  widthDecimalFormatted?: string;
  widthFractionFormatted?: string | null;
  widthMm?: number;
  heightInch?: number;
  heightDecimalFormatted?: string;
  heightFractionFormatted?: string | null;
  heightMm?: number;
  piecesPerWindow: number;
  totalPieces: number;
  formulaSummary: string;
  notes?: string;
}

export interface WindowMaterialSummaryItem {
  id: string;
  name: string;
  category: WindowSectionCategory;
  sectionSpec?: string;
  cutSizeDisplay: string;
  totalPieces: number;
  totalRunningInches?: number;
  totalRunningFeet?: number;
  totalAreaSqFt?: number;
}

export interface WindowSystemCalculationResult {
  status: 'calculated' | 'setup_required' | 'invalid';
  setupMessage?: string;
  errors: string[];
  warnings: string[];
  systemId: string;
  systemName: string;
  categoryId: WindowSystemCategoryId;
  profileSeriesName: string;
  formulaSource: 'verified_legacy_sliding' | 'admin_configured' | 'user_custom_deductions' | 'unconfigured';
  input: {
    windowLabel: string;
    width: number;
    height: number;
    unit: WindowMeasurementUnit;
    widthInch: number;
    heightInch: number;
    widthDecimalFormatted: string;
    widthFractionFormatted: string | null;
    heightDecimalFormatted: string;
    heightFractionFormatted: string | null;
    widthMm: number;
    heightMm: number;
    quantity: number;
    trackCount: number;
    shutterCount: number;
    includeMosquitoNet: boolean;
    glassThickness: string;
  };
  aluminiumSections: WindowCuttingMeasurementRow[];
  glassCutting: WindowCuttingMeasurementRow[];
  mosquitoNetCutting: WindowCuttingMeasurementRow[];
  materialSummary: WindowMaterialSummaryItem[];
  calculatedAt: string;
}

export interface SavedWindowSystemCalculation {
  id: string;
  customerId: string;
  projectName: string;
  customerName: string;
  systemId: string;
  systemName: string;
  categoryId: WindowSystemCategoryId;
  result: WindowSystemCalculationResult;
  createdAt: string;
  updatedAt: string;
}




