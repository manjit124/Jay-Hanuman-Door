export interface Door {
  id: string;
  name: string;
  category: string;
  description: string;
  material: string;
  startingPrice: number;
  images: string[];
  availableSizes: string[];
  featured: boolean;
  popular: boolean;
  active: boolean;
  createdAt: string;
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
  active: boolean;
}

export interface PolishFinish {
  id: string;
  name: string;
  ratePerSqFt: number;
  description: string;
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
  subtitle: string;
  image: string;
  buttonText: string;
  buttonAction: string; // 'calculator' | 'gallery' | 'whatsapp' | 'contact'
  order: number;
  active: boolean;
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
  status: 'new' | 'sent_whatsapp' | 'downloaded';
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

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  logoUrl?: string;
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
}

export interface AdminStats {
  totalDoors: number;
  totalQuotes: number;
  totalMaterials: number;
  recentQuotes: Quotation[];
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



