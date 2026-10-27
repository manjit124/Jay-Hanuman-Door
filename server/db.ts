import fs from 'fs';
import path from 'path';
import {
  fetchAuthoritativeFirestoreDb,
  saveAuthoritativeFirestoreDb,
  saveEntityToFirestore,
  deleteEntityFromFirestore,
} from './firestoreDb.ts';
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
  UserCalculationRecord,
  NotificationTokenRecord,
  NotificationCampaign,
  NotificationPreferences,
  TeamMember,
  ArticleComment,
  ArticleCategory,
  CustomerEnquiry,
  LegalSettings,
  AIWoodDetectorLogItem,
  AIWoodDetectorStats,
  AIWoodDetectorSettings,
  AdminAuditLogItem,
  WoodReferenceSample,
  TrackingOrder,
  IndiaDeliveryState,
  DeliveryStory,
  ChaukhatProduct,
  ChaukhatSectionSize,
  ChaukhatDimensionPreset,
  ChaukhatWoodType,
} from '../src/types.ts';
import {
  DEFAULT_INDIA_STATES,
  DEFAULT_DELIVERY_STORIES,
} from '../src/data/indiaDeliveryData.ts';
import {
  DEFAULT_CHAUKHAT_WOOD_TYPES,
  DEFAULT_CHAUKHAT_SECTION_SIZES,
  DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
  DEFAULT_CHAUKHAT_PRODUCT,
} from '../src/data/chaukhatDefaults.ts';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  salt: string;
  city?: string;
  address?: string;
  pincode?: string;
  preferredWood?: string;
  favoriteDoorIds: string[];
  favoriteArticleIds?: string[];
  calculationHistory: UserCalculationRecord[];
  resetCode?: string;
  resetCodeExpires?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DatabaseSchema {
  doors: Door[];
  categories: Category[];
  materials: DoorMaterial[];
  finishes: PolishFinish[];
  frames: ChaukhatFrame[];
  hardware: HardwareItem[];
  banners: HomeBanner[];
  articles: Article[];
  quotes: Quotation[];
  enquiries: CustomerEnquiry[];
  settings: BusinessSettings;
  adminPasswordHash: string;
  users: UserRecord[];
  notificationTokens: NotificationTokenRecord[];
  notificationCampaigns: NotificationCampaign[];
  teamMembers: TeamMember[];
  articleComments: ArticleComment[];
  articleCategories: ArticleCategory[];
  articleViews: { articleId: string; viewerHash: string; timestamp: number }[];
  articleLikes: { articleId: string; likerHash: string; createdAt: string }[];
  articleShares: { articleId: string; platform: string; timestamp: string }[];
  aiWoodDetectorLogs?: AIWoodDetectorLogItem[];
  woodReferences?: WoodReferenceSample[];
  trackingOrders?: TrackingOrder[];
  deliveryStates?: IndiaDeliveryState[];
  deliveryStories?: DeliveryStory[];
  chaukhatProducts?: ChaukhatProduct[];
  chaukhatSectionSizes?: ChaukhatSectionSize[];
  chaukhatPresets?: ChaukhatDimensionPreset[];
  chaukhatWoodTypes?: ChaukhatWoodType[];
  version?: number;
  lastModified?: string;
  auditLogs?: AdminAuditLogItem[];
}

function findAppRoot(): string {
  const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd()),
    path.resolve(currentDir, '..'),
    path.resolve(currentDir),
    '/app/applet',
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'package.json')) || fs.existsSync(path.join(c, 'data'))) {
      return c;
    }
  }
  return process.cwd();
}

export const APP_ROOT = findAppRoot();
export const DATA_DIR = process.env.PERSISTENT_DATA_DIR || process.env.DATA_DIR || path.join(APP_ROOT, 'data');
export const SERVER_DATA_DIR = path.join(APP_ROOT, 'server', 'data');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const SERVER_BACKUPS_DIR = path.join(SERVER_DATA_DIR, 'backups');
export const PERMANENT_BACKUPS_DIR = path.join(DATA_DIR, 'permanent_backups');

export const DB_FILE = path.join(DATA_DIR, 'database.json');
export const ADMIN_STORE_FILE = path.join(SERVER_DATA_DIR, 'admin_store.json');
export const MIRROR_FILE = path.join(DATA_DIR, 'production_data_store.json');

export const UPLOAD_DIR = process.env.PERSISTENT_UPLOADS_DIR || path.join(APP_ROOT, 'public', 'uploads');
export const UPLOAD_BACKUP_DIR = path.join(DATA_DIR, 'uploads');
export const SERVER_UPLOAD_DIR = path.join(SERVER_DATA_DIR, 'uploads');
export const DIST_UPLOAD_DIR = path.join(APP_ROOT, 'dist', 'uploads');

// Ensure all persistent and backup directories exist safely across primary, server, and backup tiers
[
  DATA_DIR,
  SERVER_DATA_DIR,
  BACKUPS_DIR,
  SERVER_BACKUPS_DIR,
  PERMANENT_BACKUPS_DIR,
  UPLOAD_DIR,
  UPLOAD_BACKUP_DIR,
  SERVER_UPLOAD_DIR,
  DIST_UPLOAD_DIR,
].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Could not create directory ${dir}:`, err);
  }
});

// Synchronize uploaded images between live public/uploads, server uploads, and persistent data/uploads
export function syncUploadedImages(): void {
  const dirs = [UPLOAD_DIR, UPLOAD_BACKUP_DIR, SERVER_UPLOAD_DIR, DIST_UPLOAD_DIR];
  const allFiles = new Map<string, string>(); // filename -> source path

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (!f.startsWith('.')) {
          const fullPath = path.join(dir, f);
          try {
            if (fs.statSync(fullPath).isFile() && !allFiles.has(f)) {
              allFiles.set(f, fullPath);
            }
          } catch {}
        }
      }
    } catch {}
  }

  // Cross-copy all images to every directory so they are always accessible
  for (const [filename, sourcePath] of allFiles.entries()) {
    for (const targetDir of dirs) {
      const targetPath = path.join(targetDir, filename);
      if (!fs.existsSync(targetPath)) {
        try {
          fs.copyFileSync(sourcePath, targetPath);
        } catch {}
      }
    }
  }
}

export const INITIAL_TRACKING_ORDERS: TrackingOrder[] = [
  {
    id: 'ord-101',
    trackingId: 'JHD-2026-H8K24',
    customerName: 'Rahul Patil',
    customerPhone: '+91 98224 88712',
    customerEmail: 'rahul.patil@example.com',
    customerCity: 'Pune',
    customerAddress: 'Bungalow No. 7, Baner Hills, Pune, Maharashtra 411045',
    productName: 'Royal Sagwan Carved Main Door',
    productCategory: 'Sagwan Door',
    productImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    woodType: 'Sagwan (CP Teak)',
    finishType: 'Natural Teak Wood Polish',
    quantity: 1,
    dimensions: {
      widthInch: 36,
      heightInch: 78,
      sqFt: 19.5,
    },
    totalAmount: 18500,
    advancePaid: 10000,
    status: 'active',
    currentStageId: 'mfg_25',
    manufacturingPercent: 25,
    deliveryStatusText: 'In Workshop (Manufacturing)',
    stages: [
      {
        id: 'order_confirmed',
        name: 'Order Confirmed',
        customerDescription: 'Your order has been confirmed by Jai Hanuman Door.',
        status: 'completed',
        isMilestone: false,
        startedAt: '2026-09-28T09:30:00.000Z',
        completedAt: '2026-09-28T10:15:00.000Z',
        customerNote: 'Order verified and technical measurements confirmed for Baner residence.',
        updatedAt: '2026-09-28T10:15:00.000Z',
      },
      {
        id: 'transferred_to_workshop',
        name: 'Transferred to Workshop',
        customerDescription: 'Your order has been transferred to our manufacturing workshop.',
        status: 'completed',
        isMilestone: false,
        startedAt: '2026-09-28T11:00:00.000Z',
        completedAt: '2026-09-28T12:00:00.000Z',
        customerNote: 'Job card #JHD-W-881 issued to master craftsman Santosh Suthar.',
        updatedAt: '2026-09-28T12:00:00.000Z',
      },
      {
        id: 'wood_selection',
        name: 'Wood Selection',
        customerDescription: 'Wood is being selected according to your order specifications.',
        status: 'completed',
        isMilestone: false,
        startedAt: '2026-09-29T08:00:00.000Z',
        completedAt: '2026-09-29T16:30:00.000Z',
        customerNote: 'Selected premium Grade-A seasoned Central Province Teak with 11% moisture balance.',
        updatedAt: '2026-09-29T16:30:00.000Z',
      },
      {
        id: 'mfg_25',
        name: '25% Manufacturing Completed',
        customerDescription: 'Initial manufacturing work on your door has been completed.',
        status: 'completed',
        isMilestone: true,
        milestonePercent: 25,
        startedAt: '2026-09-30T09:00:00.000Z',
        completedAt: '2026-10-01T15:00:00.000Z',
        customerNote: 'Frame timber planed, perimeter core joined and base panel dimensioning completed.',
        updatedAt: '2026-10-01T15:00:00.000Z',
      },
      {
        id: 'mfg_50',
        name: '50% Manufacturing Completed',
        customerDescription: 'Half of the door manufacturing work has been completed.',
        status: 'in_progress',
        isMilestone: true,
        milestonePercent: 50,
        startedAt: '2026-10-02T08:30:00.000Z',
        customerNote: 'Joinery mortise & tenon interlocking in progress.',
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'mfg_75',
        name: '75% Manufacturing Completed',
        customerDescription: 'Most of the main manufacturing work has been completed.',
        status: 'pending',
        isMilestone: true,
        milestonePercent: 75,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'carving_design',
        name: 'Carving & Design Work',
        customerDescription: 'Carving and designer work is in progress, if applicable to your order.',
        status: 'pending',
        isMilestone: false,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'finishing_polishing',
        name: 'Finishing & Polishing',
        customerDescription: 'Your door is undergoing finishing and polishing.',
        status: 'pending',
        isMilestone: false,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'mfg_100',
        name: '100% Door Ready',
        customerDescription: 'Your door manufacturing is complete and the product is ready.',
        status: 'pending',
        isMilestone: true,
        milestonePercent: 100,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'transferred_to_showroom',
        name: 'Transferred to Showroom',
        customerDescription: 'Your completed door has arrived at Jai Hanuman Door showroom.',
        status: 'pending',
        isMilestone: false,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'searching_delivery_partner',
        name: 'Searching for Delivery Partner',
        customerDescription: 'We are arranging a suitable delivery or transport partner for your order.',
        status: 'pending',
        isMilestone: false,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'delivery_partner_confirmed',
        name: 'Delivery Partner Confirmed',
        customerDescription: 'Your delivery or transport partner has been confirmed.',
        status: 'pending',
        isMilestone: false,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'dispatched',
        name: 'Dispatched',
        customerDescription: 'Your order has been dispatched from our showroom.',
        status: 'pending',
        isMilestone: false,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'on_the_way',
        name: 'On the Way to Your Address',
        customerDescription: 'Your order is on its way to the delivery address.',
        status: 'pending',
        isMilestone: false,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
      {
        id: 'delivered',
        name: 'Delivered',
        customerDescription: 'Your order has been delivered.',
        status: 'pending',
        isMilestone: false,
        updatedAt: '2026-10-02T08:30:00.000Z',
      },
    ],
    media: [
      {
        id: 'med-1',
        stageId: 'wood_selection',
        url: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=1200&q=80',
        type: 'image',
        caption: 'Central Province seasoned Teak planks selected for frame & core',
        isCustomerVisible: true,
        uploadedAt: '2026-09-29T16:00:00.000Z',
      },
      {
        id: 'med-2',
        stageId: 'mfg_25',
        url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
        type: 'image',
        caption: '25% milestone reached: Core framing and precision mortise jointing',
        isCustomerVisible: true,
        uploadedAt: '2026-10-01T14:30:00.000Z',
      },
    ],
    delivery: {
      workshopTransferDate: '2026-09-28T12:00:00.000Z',
      transferNotes: 'Workshop Unit 2, Artisan Bay #4',
    },
    estimatedCompletionDate: '2026-10-10',
    expectedDispatchDate: '2026-10-12',
    workshopNotes: 'Client requested extra care on bottom teak moisture sealant coat.',
    adminInternalNotes: 'Customer advance received via UPI ₹10,000 on 28 Sep. Balance ₹8,500 on delivery.',
    auditHistory: [
      {
        id: 'aud-1',
        timestamp: '2026-09-28T10:15:00.000Z',
        action: 'Created order & confirmed',
        actor: 'Admin (shivshahidoors@gmail.com)',
        details: 'Initial order created with Tracking ID JHD-2026-H8K24',
      },
      {
        id: 'aud-2',
        timestamp: '2026-09-28T12:00:00.000Z',
        action: 'Transferred to workshop',
        actor: 'Admin (shivshahidoors@gmail.com)',
        details: 'Transferred to Workshop Unit 2',
      },
      {
        id: 'aud-3',
        timestamp: '2026-09-29T16:30:00.000Z',
        action: 'Completed wood selection',
        actor: 'Admin (shivshahidoors@gmail.com)',
        details: 'Selected Grade-A Sagwan wood & uploaded proof photo',
      },
      {
        id: 'aud-4',
        timestamp: '2026-10-01T15:00:00.000Z',
        action: '25% Manufacturing Completed',
        actor: 'Admin (shivshahidoors@gmail.com)',
        details: 'Milestone 25% marked completed and progress photo added',
      },
    ],
    createdAt: '2026-09-28T10:15:00.000Z',
    updatedAt: '2026-10-02T08:30:00.000Z',
  },
];

export const INITIAL_DATA: DatabaseSchema = {
  doors: [
    {
      id: 'door-1',
      name: 'Royal Sagwan Carved Main Door',
      category: 'Sagwan Door',
      description: 'Handcrafted solid Sagwan (CP Teak) wood main entrance door with intricate floral carving, brass studs, and deep natural polish. Built to withstand all seasons.',
      material: 'Sagwan',
      startingPrice: 21000,
      images: [
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=80',
      ],
      availableSizes: ['30 × 78 inch', '32 × 78 inch', '34 × 78 inch', '36 × 78 inch', 'Custom Size'],
      featured: true,
      popular: true,
      active: true,
      createdAt: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'door-2',
      name: 'Maharaja Heritage Double Teak Door',
      category: 'Double Door',
      description: 'Regal double entrance door with traditional jharokha motif, authentic brass rivets, and heavy-duty frame alignment. Ideal for bungalows and luxury villas.',
      material: 'Sagwan',
      startingPrice: 32000,
      images: [
        'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=1200&q=80',
      ],
      availableSizes: ['48 × 78 inch', '60 × 84 inch', '72 × 84 inch', 'Custom Size'],
      featured: true,
      popular: true,
      active: true,
      createdAt: '2026-08-18T12:30:00.000Z',
    },
    {
      id: 'door-3',
      name: 'Contemporary Fluted Teak Door',
      category: 'Modern Door',
      description: 'Modern vertical ribbed fluted door panel crafted in seasoned teak with recessed warm gold metal inlay strip. Perfect for modern apartment entrances.',
      material: 'Sagwan',
      startingPrice: 18500,
      images: [
        'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      ],
      availableSizes: ['32 × 78 inch', '34 × 78 inch', '36 × 78 inch', '36 × 84 inch', 'Custom Size'],
      featured: true,
      popular: true,
      active: true,
      createdAt: '2026-08-20T14:15:00.000Z',
    },
    {
      id: 'door-4',
      name: 'Heritage Traditional Kalash Carved Door',
      category: 'Traditional Door',
      description: 'Auspicious Kalash and peacock hand-carved entrance door in authentic Indian Vastu compliant craftsmanship. Made from mature teak wood.',
      material: 'Sagwan',
      startingPrice: 21000,
      images: [
        'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
      ],
      availableSizes: ['32 × 78 inch', '36 × 78 inch', '36 × 84 inch', 'Custom Size'],
      featured: false,
      popular: true,
      active: true,
      createdAt: '2026-08-22T09:00:00.000Z',
    },
    {
      id: 'door-5',
      name: 'Designer CNC Geometric Grooved Door',
      category: 'Designer Door',
      description: 'Precision CNC routing with asymmetric geometric lines and dual-tone walnut & teak melamine coat. Water resistant and sturdy core.',
      material: 'Plywood',
      startingPrice: 9500,
      images: [
        'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=1200&q=80',
      ],
      availableSizes: ['30 × 78 inch', '32 × 78 inch', '34 × 78 inch', '36 × 78 inch'],
      featured: false,
      popular: false,
      active: true,
      createdAt: '2026-08-24T11:20:00.000Z',
    },
    {
      id: 'door-6',
      name: 'Solid Sal Wood Heavy Duty Door',
      category: 'Wooden Door',
      description: 'High-density Sal wood construction with termite-proof vacuum pressure treatment. Excellent strength and weather durability for rear and main gates.',
      material: 'Sal Wood',
      startingPrice: 12600,
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      ],
      availableSizes: ['32 × 78 inch', '34 × 78 inch', '36 × 78 inch', 'Custom Size'],
      featured: false,
      popular: true,
      active: true,
      createdAt: '2026-08-25T16:45:00.000Z',
    },
    {
      id: 'door-7',
      name: 'Grand Arch Double Entrance Door',
      category: 'Double Door',
      description: 'Arch-head double door ensemble with frosted bevelled glass panel insert and hand-forged antique iron pull handles. A grand statement entrance.',
      material: 'Sagwan',
      startingPrice: 42000,
      images: [
        'https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=1200&q=80',
      ],
      availableSizes: ['60 × 84 inch', '72 × 96 inch', 'Custom Size'],
      featured: true,
      popular: true,
      active: true,
      createdAt: '2026-08-28T18:00:00.000Z',
    },
    {
      id: 'door-8',
      name: 'Royal Hand Carving Sagwan Chaukhat Frame',
      category: 'Door Frame / Chaukhat',
      description: 'Heavy 5×3 inch or 5×4 inch section pure Sagwan Chaukhat with traditional border carvings and threshold beadings.',
      material: 'Sagwan',
      startingPrice: 11637,
      images: [
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
      ],
      availableSizes: ['36 × 78 inch frame', '48 × 78 inch frame', 'Custom Size'],
      featured: false,
      popular: true,
      active: true,
      createdAt: '2026-08-30T10:00:00.000Z',
    },
  ],
  categories: [
    { id: 'cat-1', name: 'Sagwan Door', slug: 'sagwan-door', description: 'Pure CP & Burma Teak Wood handcrafted doors' },
    { id: 'cat-2', name: 'Designer Door', slug: 'designer-door', description: 'Modern CNC and grooved geometric doors' },
    { id: 'cat-3', name: 'Main Door', slug: 'main-door', description: 'Grand single & 1.5 shutter main entrances' },
    { id: 'cat-4', name: 'Double Door', slug: 'double-door', description: 'Bungalow & villa double shutter doors' },
    { id: 'cat-5', name: 'Wooden Door', slug: 'wooden-door', description: '100% solid natural wood seasoned doors' },
    { id: 'cat-6', name: 'Traditional Door', slug: 'traditional-door', description: 'Heritage Indian temple & classical carvings' },
    { id: 'cat-7', name: 'Modern Door', slug: 'modern-door', description: 'Minimalist, fluted, and metallic accent doors' },
    { id: 'cat-8', name: 'Premium Door', slug: 'premium-door', description: 'Exclusive luxury crafted statement doors' },
    { id: 'cat-9', name: 'Door Frame / Chaukhat', slug: 'door-frame-chaukhat', description: 'Heavy timber frames in Sagwan & Sal wood' },
  ],
  materials: [
    { id: 'mat-1', name: 'Sagwan', ratePerSqFt: 800, image: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=600&q=80', description: 'Premium grade Central Province (CP) Teak Wood with natural oil & high moisture resistance', active: true },
    { id: 'mat-2', name: 'Sal Wood', ratePerSqFt: 650, image: 'https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=600&q=80', description: 'Heavy, durable Indian hardwood renowned for extreme load-bearing strength', active: true },
    { id: 'mat-3', name: 'Pine', ratePerSqFt: 450, image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80', description: 'Treated pine timber with light grain texture, kiln-dried for dimensional stability', active: true },
    { id: 'mat-4', name: 'Plywood', ratePerSqFt: 350, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80', description: 'Boiling Waterproof (BWP) marine grade core with hardwood internal framing', active: true },
    { id: 'mat-5', name: 'Teak Veneer Flush Door', ratePerSqFt: 550, image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80', description: 'Solid core flush door with 4mm natural Burma teak wood veneer on both sides', active: true },
  ],
  finishes: [
    { id: 'fin-1', name: 'Normal Polish', ratePerSqFt: 110, image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80', description: 'Standard hand-rubbed spirit French polish for natural wood luster', active: true },
    { id: 'fin-2', name: 'Teak Polish', ratePerSqFt: 150, image: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=600&q=80', description: 'Deep teak oil stain with double protective sealant coat', active: true },
    { id: 'fin-3', name: 'Melamine', ratePerSqFt: 180, image: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=600&q=80', description: 'Hard gloss or matte scratch-resistant coat with UV protection', active: true },
    { id: 'fin-4', name: 'PU Finish', ratePerSqFt: 250, image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80', description: 'Premium Polyurethane Italian finish with anti-yellowing & waterproof coating', active: true },
    { id: 'fin-0', name: 'Raw / Unpolished', ratePerSqFt: 0, image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80', description: 'Sanded ready for site-polishing or custom client painting', active: true },
  ],
  frames: [
    { id: 'frm-1', name: 'Normal Frame', price: 3500, image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80', description: 'Standard 4×2.5 inch section plain timber Chaukhat with clean rebate', active: true },
    { id: 'frm-2', name: 'Designer Frame', price: 11025, image: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=80', description: '5×3 inch section with stepped moldings, beading, and corner grooving', active: true },
    { id: 'frm-3', name: 'Hand Carving Frame', price: 11637, image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80', description: 'Heavy 5×3.5 inch pure Sagwan Chaukhat with intricate hand-carved floral border', active: true },
    { id: 'frm-0', name: 'No Frame (Shutter Only)', price: 0, description: 'Only door shutter without Chaukhat frame', active: true },
  ],
  hardware: [
    { id: 'hwd-1', name: 'Aldrop Single', price: 700, image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80', description: 'Stainless steel 10-inch single aldrop bolt set with tower bolt and latch', active: true, defaultQty: 1 },
    { id: 'hwd-2', name: 'Heavy Aldrop', price: 1300, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80', description: 'Heavy-gauge forged brass / SS 12-inch security aldrop kit with heavy duty staples', active: true, defaultQty: 1 },
    { id: 'hwd-3', name: 'Antique Heavy', price: 1700, image: 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=1200&q=80', description: 'Antique brass finished royal heavy aldrop with lion crest handles & decorative rosette plates', active: true, defaultQty: 1 },
    { id: 'hwd-4', name: 'Premium Mortise Handle Lock Set', price: 2400, image: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=1200&q=80', description: 'High-security computer key double throw brass mortise lock with designer handles', active: true, defaultQty: 1 },
    { id: 'hwd-0', name: 'No Hardware Included', price: 0, description: 'Client supplies or fits own hardware', active: true, defaultQty: 0 },
  ],
  banners: [
    {
      id: 'ban-main-1',
      bannerType: 'main',
      title: 'Direct From Manufacturer: Premium Sagwan Wood Doors',
      subtitle: 'Pure CP Teak Wood • 100% Kiln-Seasoned Core • Lifetime Anti-Termite Guarantee',
      badge: 'Direct From Factory',
      image: '/uploads/184809-1792324353484-424213.png',
      buttonText: 'Explore Collection',
      buttonAction: 'gallery',
      destinationUrl: 'gallery',
      openInNewTab: false,
      order: 1,
      active: true,
      slot: 'hero',
    },
    {
      id: 'ban-main-2',
      bannerType: 'main',
      title: 'Precision Door & Chaukhat Price Calculator',
      subtitle: 'Instant Factory Price Estimation by Height, Width and Wood Grade',
      badge: 'Live Pricing Tool',
      image: 'https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=1600&q=80',
      buttonText: 'Calculate Price',
      buttonAction: 'calculator',
      destinationUrl: 'calculator',
      openInNewTab: false,
      order: 2,
      active: true,
      slot: 'hero',
    },
    {
      id: 'ban-promo-slot-1',
      bannerType: 'promotion',
      title: 'Diwali Teak Door Mega Deal - Flat 30% Off',
      subtitle: 'Direct Factory Offer on All Heavy Carved Entrance Doors',
      badge: 'Special Deal',
      image: '/uploads/184853-1792327641084-964640.png',
      buttonText: 'View Designs',
      buttonAction: 'gallery',
      destinationUrl: 'gallery',
      openInNewTab: false,
      order: 1,
      active: true,
      slot: 'slot_1',
    },
    {
      id: 'ban-promo-slot-2',
      bannerType: 'promotion',
      title: 'Door + Chaukhat Complete Combo Package Deal',
      subtitle: 'Seasoned Teak Frame with Handcrafted Matching Shutter',
      badge: 'Combo Offer',
      image: '/uploads/184849-1792327505463-568059.png',
      buttonText: 'Calculate Price',
      buttonAction: 'calculator',
      destinationUrl: 'calculator',
      openInNewTab: false,
      order: 1,
      active: true,
      slot: 'slot_2',
    },
  ],
  articles: [
    {
      id: 'art-1',
      title: 'Sagwan Door Maintenance Tips: How to Keep Teak Wood Glowing for Decades',
      slug: 'sagwan-door-maintenance-tips',
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Learn the essential oiling, cleaning, and seasonal protection routines that preserve the golden honey grain of authentic Sagwan teak doors.',
      content: `Sagwan (Teak Wood) is globally revered for its high natural silica and oil content, making it exceptionally resistant to warping, termites, and harsh monsoon rains. However, to maintain its breathtaking warmth and rich patina for 40+ years, follow these master carpenter recommendations:

1. **Gentle Dusting**: Wipe the carved crevices once weekly with a soft microfiber cloth or soft-bristled artist brush. Avoid harsh detergents or ammonia-based sprays that strip the natural polish.
2. **Annual Teak Oil Nourishment**: Once a year before the dry summer season, apply a thin coat of pure boiled linseed oil or genuine teak oil using a cotton rag. This rejuvenates the wood cell elasticity and prevents micro-fissures.
3. **Moisture Defense in Monsoons**: Check the bottom edge of your door shutter. Always ensure the bottom grain is sealed with PU or Melamine lacquer so standing rainwater never seeps upwards through capillary action.
4. **Hardware Lubrication**: Use brass or silicon lubricant for heavy aldrop hinges rather than cooking oils that attract dust.`,
      author: 'Master Craftsman Rajesh',
      authorBio: 'Senior wood restoration specialist with 20+ years experience in Indian teakwood carving and seasoning.',
      category: 'Door Maintenance',
      categoryId: 'cat-maintenance',
      tags: ['Sagwan Door', 'Door Maintenance', 'Teak Wood'],
      readTime: '4 min read',
      status: 'published',
      published: true,
      publishedAt: '2026-08-10T10:00:00.000Z',
      views: 2458,
      likes: 184,
      shares: 96,
      commentCount: 2,
      youtubeVideoId: 'dQw4w9WgXcQ',
      youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtubeTitle: 'Step-by-Step Sagwan Door Oiling & Polishing Workshop',
      relatedDoorIds: ['door-1'],
      cta: {
        enabled: true,
        type: 'calculator',
        title: 'Calculate Estimated Price for Custom Sagwan Doors',
        subtitle: 'Get factory-direct pricing for custom sizes in seconds',
        buttonText: 'Open Price Calculator',
      },
      seo: {
        seoTitle: 'Sagwan Door Maintenance Tips | Shivshahi Wood Works',
        metaDescription: 'Expert guidance on oiling, moisture protection, and preserving solid Sagwan teak doors for 40+ years.',
        focusKeyword: 'Sagwan door maintenance',
      },
      createdAt: '2026-08-10T10:00:00.000Z',
    },
    {
      id: 'art-2',
      title: 'Sagwan vs Plywood Door: Which is Better for Your Home Entrance?',
      slug: 'sagwan-vs-plywood-door',
      image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Compare lifespan, security, acoustics, weather resistance, and resale value between solid Sagwan wood and BWP engineered flush doors.',
      content: `Choosing between 100% solid Sagwan (Teak) and high-density marine Plywood with veneer is one of the most critical decisions for Indian homeowners.

### Solid Sagwan Doors
- **Lifespan**: 50 to 100+ years. Can be re-polished multiple times to look brand new.
- **Strength & Security**: Exceptional structural density, virtually impossible to kick or break through.
- **Aesthetic**: Deep, three-dimensional carvings, authentic grain variations, and natural warm wood fragrance.
- **Best For**: Main entrance doors, puja room doors, grand double doors, and luxury bungalows.

### Plywood Flush Doors
- **Lifespan**: 15 to 25 years.
- **Cost**: 40-50% lower initial investment.
- **Weight**: Lighter, putting less strain on bedroom hinges.
- **Best For**: Internal bedrooms, bathrooms, and utility access where carved depth is not required.`,
      author: 'Technical Architecture Team',
      category: 'Door Guide',
      categoryId: 'cat-guide',
      tags: ['Sagwan Door', 'Door Guide', 'Wooden Door'],
      readTime: '5 min read',
      status: 'published',
      published: true,
      publishedAt: '2026-08-14T11:00:00.000Z',
      views: 1840,
      likes: 142,
      shares: 54,
      commentCount: 1,
      relatedDoorIds: ['door-1', 'door-2'],
      cta: {
        enabled: true,
        type: 'calculator',
        title: 'Calculate Royal Sagwan Door Price For Your Size',
        subtitle: 'Instant estimate including seasoned teak wood, chaukhat frame, and PU polish.',
        buttonText: 'Open Door Price Calculator',
      },
      createdAt: '2026-08-14T11:00:00.000Z',
    },
    {
      id: 'art-3',
      title: 'Main Door Size Guide: Standard Indian Door Dimensions Explained',
      slug: 'main-door-size-guide',
      image: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Understanding standard Indian residential door sizes: 30x78, 32x78, 36x78, 36x84, and how to measure rough openings correctly.',
      content: `Accurate measurements prevent costly site alterations and frame misalignment. Here is the standard dimension breakdown used across Indian architecture:

- **Standard Main Single Door**: 36 inches × 78 inches (3 ft × 6.5 ft) or modern high-ceiling 36 inches × 84 inches (3 ft × 7 ft). This provides a comfortable opening for carrying furniture.
- **Master Bedroom Doors**: 32 inches × 78 inches (2.67 ft × 6.5 ft).
- **Bathroom / Balcony Doors**: 28 or 30 inches × 78 inches.
- **Grand Double Main Doors**: 48 × 84 inches (two 24-inch shutters) or 60 × 84 inches (two 30-inch shutters).

**How to calculate Square Feet accurately:**
Multiply Width in inches by Height in inches, then divide by 144:
*Example*: 36" × 78" = 2808 ÷ 144 = **19.50 sq.ft.**`,
      author: 'Shivshahi Design Studio',
      category: 'Door Guide',
      categoryId: 'cat-guide',
      tags: ['Door Guide', 'Door Price', 'Main Door'],
      readTime: '3 min read',
      status: 'published',
      published: true,
      views: 1250,
      likes: 98,
      shares: 38,
      commentCount: 0,
      createdAt: '2026-08-20T08:30:00.000Z',
    },
    {
      id: 'art-4',
      title: 'Wooden Door Buying Guide: Crucial Things to Check Before Ordering',
      slug: 'wooden-door-buying-guide',
      image: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
      excerpt: 'Moisture content, seasoning certificates, joinery techniques, and how to verify authentic CP Sagwan wood against inferior substitutes.',
      content: `Before transferring an advance payment for your custom door, ensure you verify these four golden checkpoints:

1. **Moisture Content (Kiln Seasoning)**: Ensure the wood is seasoned down to 8%–12% moisture level. Green or unseasoned timber will bend and expand during monsoon humidity.
2. **Authentic CP Teak Identification**: Pure Central Province Sagwan features tight annual rings, distinct honey-golden to medium brown color, and a greasy tactile feel from its natural oils.
3. **Mortise and Tenon Joinery**: Inspect whether the door frames and panel joints use traditional interlocking joints rather than just surface nails.
4. **Chaukhat Fitting Sequence**: Always install the timber Chaukhat prior to plastering or tile skirting to ensure a flawless water-tight fit.`,
      author: 'Shivshahi Quality Team',
      category: 'Wood Knowledge',
      categoryId: 'cat-wood',
      tags: ['Wood Knowledge', 'Sagwan Door', 'Teak Wood'],
      readTime: '6 min read',
      status: 'published',
      published: true,
      views: 940,
      likes: 85,
      shares: 22,
      commentCount: 0,
      createdAt: '2026-08-27T15:00:00.000Z',
    },
  ],
  quotes: [],
  enquiries: [],
  settings: {
    businessName: 'Jai Hanuman Door',
    tagline: 'Master Craftsmen in Handcrafted Sagwan & Teak Wood Doors',
    logoUrl: '',
    phone: '+91 98765 43210',
    whatsappNumber: '7887412884',
    googleMapsUrl: 'https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac',
    email: 'orders@jaihanumandoor.com',
    address: 'Near Old Timber Market, Industrial Estate, Pune, Maharashtra 411002, India',
    gstNumber: '27AABCS1429B1Z8',
    currencySymbol: '₹',
    quotePrefix: 'JHD',
    additionalChargeName: 'GST (18%) / Tax',
    additionalChargePercentage: 0, // Configurable by admin (set to 0 by default so basic subtotal matches exact user formula)
    terms: [
      'Price shown is an estimated price and may vary according to final design, material quality, hardware and customization.',
      'Quotation estimate is valid for 30 days from the date of generation.',
      'Standard shutter thickness is 35mm. Heavy 38mm / 45mm available on request.',
      '100% seasoned timber chemically treated against borer and termite infestation.',
      'Transportation, site measurements and fitting charges are extra as per actual site location.',
      '50% advance payment required upon order confirmation; balance prior to delivery.',
    ],
    disclaimer: 'Price shown is an estimated price and may vary according to final design, material quality, hardware and customization.',
    legalSettings: {
      lastUpdated: 'September 2026',
      privacyPolicy: `Jai Hanuman Door is committed to protecting your privacy and treating your data with complete transparency. We collect customer contact details (name, phone number, email, and city) solely when you request a price quotation, submit a contact inquiry, or register an account. All customer information and quote requests are handled confidentially and are never sold, rented, or distributed to third parties. All user credentials and passwords are encrypted using cryptographic salt and hash algorithms. You have the right to request deletion or inspection of your submitted inquiry data at any time.`,
      aboutUs: `Jai Hanuman Door is a renowned woodcraft workshop and manufacturer specializing in 100% kiln-dried seasoned Sagwan (CP Teak), traditional double entry doors (Jodi Darwaja), designer CNC carvings, and custom timber chaukhats. Backed by decades of master carpentry heritage, Jai Hanuman Door brings direct factory pricing, genuine material specifications, and custom door designs right to your screen. Whether crafting an ornate temple entrance or sleek contemporary fluted doors, we guarantee authentic timber, structural mortise-and-tenon joinery, and durable natural finishes.`,
      contactInfoNotes: `Visit our factory workshop to inspect raw timber logs, compare teak grains, and consult with master carpenters. For site measurement appointments across Maharashtra or bulk inquiries for villas and apartments, reach out via our contact form, phone, or WhatsApp.`,
      disclaimer: `The price calculations generated by Jai Hanuman Door are informative estimates formulated from base wood rates per square foot, hardware selections, and selected polish finishes. Final billing may reflect specialized site conditions, exact custom carving depths, frame jamb thickness, and transportation logistics. Real solid timber possesses natural organic variations in grain, tone, and texture. On-site tape measurements by our team or your carpenter are recommended before final fabrication.`,
      socialLinks: {
        instagram: 'https://instagram.com/jaihanumandoor',
        facebook: 'https://facebook.com/jaihanumandoor',
        youtube: 'https://youtube.com/@jaihanumandoor',
        whatsapp: 'https://wa.me/917887412884',
        googleBusiness: 'https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac',
      },
    },
    contentProtection: {
      enableImageProtection: true,
      enableWatermark: true,
      watermarkText: 'Jai Hanuman Door',
      watermarkOpacity: 0.22,
      watermarkPattern: 'diagonal',
      enableAndroidFlagSecure: true,
      enableAndroidScreenRecordProtection: true,
    },
    aiWoodDetector: {
      enabled: true,
      maxDailyScans: 150,
      customNotice: '',
    },
    storySettings: {
      sectionTitle: 'Our Story & Heritage',
      subtitle: 'A journey of craftsmanship, trust & quality',
      storyHeading: 'From Craftsmanship to Trusted Door Manufacturing',
      companyStory: `Jai Hanuman Door is a family-driven wooden door manufacturing business built on craftsmanship, quality and customer trust.\n\nWe specialize in handcrafted Sagwan (Teak) wood doors, custom main doors, wooden frames and premium entrance solutions.\n\nOur journey has grown from traditional woodworking and hands-on craftsmanship into a modern door manufacturing and customer service experience — while keeping the quality of real wood at the heart of our work.`,
      ownerName: 'Manjeet Prajapati',
      ownerDesignation: 'Founder & Owner — Jai Hanuman Door',
      ownerDescription: 'Building Jai Hanuman Door with a focus on genuine wood quality, custom craftsmanship and transparent service for every customer.',
      ownerPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      highlights: [
        { title: '100% Genuine', subtitle: 'CP Teak & Hardwood' },
        { title: 'Precision Fit', subtitle: 'Custom Millimetre Sizing' },
        { title: 'Direct Factory', subtitle: 'Transparent Pricing' },
      ],
    },
  },
  adminPasswordHash: 'admin123', // Can be customized in Settings or via ADMIN_PASSWORD env
  users: [
    {
      id: 'user-demo-1',
      name: 'Ramesh Kulkarni',
      email: 'ramesh@example.com',
      phone: '9822012345',
      // sha256 hash of 'password123' + 'salt_shivshahi'
      passwordHash: 'b78a9c2989c02d184cf43d2c801533ad0ec9b8d2eb97530663dbdb67f7bb187a',
      salt: 'salt_shivshahi',
      city: 'Pune',
      address: 'Flat 402, Shivajinagar, Near Model Colony',
      pincode: '411005',
      preferredWood: 'Sagwan (Teak Wood)',
      favoriteDoorIds: ['door-1', 'door-4'],
      calculationHistory: [
        {
          id: 'calc-demo-1',
          doorId: 'door-1',
          doorName: 'Royal Sagwan Carved Main Door',
          doorImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
          date: '2026-08-28T10:30:00.000Z',
          input: {
            doorId: 'door-1',
            doorName: 'Royal Sagwan Carved Main Door',
            widthInch: 36,
            heightInch: 78,
            materialId: 'mat-1',
            finishId: 'fin-2',
            frameId: 'frm-1',
            hardwareId: 'hwd-1',
            hardwareQty: 1,
          },
          result: {
            widthInch: 36,
            heightInch: 78,
            sqFt: 19.5,
            doorBaseRate: 800,
            doorCost: 0,
            materialName: 'Sagwan (CP Teak)',
            materialRate: 800,
            materialCost: 15600,
            finishName: 'Teak Polish',
            finishRate: 150,
            finishCost: 2925,
            frameName: 'Normal Frame (Chaukhat)',
            frameCost: 3500,
            hardwareName: 'Single Aldrop',
            hardwarePrice: 700,
            hardwareQty: 1,
            hardwareCost: 700,
            subtotal: 22725,
            additionalCharges: 0,
            additionalChargeName: 'Taxes',
            total: 22725,
          },
          notes: 'Main bungalow front entrance requirement',
        },
      ],
      createdAt: '2026-08-20T10:00:00.000Z',
    },
  ],
  notificationTokens: [],
  notificationCampaigns: [],
  teamMembers: [
    {
      id: 'team-1',
      name: 'Manjeet Prajapati',
      designation: 'Founder & CEO',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      shortBio: '7+ Years Carpenter Experience',
      fullBio: 'Sample profile created for initial preview. You can edit, customize, or delete this profile directly in Admin Panel under Team Management. Add real leadership, craftsmen, and workshop heads anytime.',
      experience: '10+ Years',
      specialization: 'Sagwan Door Architecture & Timber Seasoning',
      responsibilities: [
        'Master wood seasoning & quality assurance',
        'Architectural door customization & client consultation',
        'Workshop craftsmanship supervision',
      ],
      achievements: [
        'Over 10,000+ premium doors engineered across Maharashtra',
        'Established vacuum-pressure termite protection standards',
      ],
      socialLinks: {
        linkedin: 'https://linkedin.com',
        instagram: 'https://instagram.com',
        email: 'shivshahidoors@gmail.com',
      },
      displayOrder: 1,
      active: true,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
    },
  ],
  articleCategories: [
    { id: 'cat-guide', name: 'Door Guide', slug: 'door-guide', active: true },
    { id: 'cat-sagwan', name: 'Sagwan Wood', slug: 'sagwan-wood', active: true },
    { id: 'cat-maintenance', name: 'Door Maintenance', slug: 'door-maintenance', active: true },
    { id: 'cat-price', name: 'Door Price', slug: 'door-price', active: true },
    { id: 'cat-design', name: 'Door Design', slug: 'door-design', active: true },
    { id: 'cat-chaukhat', name: 'Chaukhat & Frames', slug: 'chaukhat-frames', active: true },
    { id: 'cat-home', name: 'Home Design', slug: 'home-design', active: true },
    { id: 'cat-wood', name: 'Wood Knowledge', slug: 'wood-knowledge', active: true },
    { id: 'cat-updates', name: 'Company Updates', slug: 'company-updates', active: true },
  ],
  articleComments: [
    {
      id: 'comm-1',
      articleId: 'art-1',
      authorName: 'Rajesh Kulkarni',
      authorEmail: 'rajesh@example.com',
      content: 'Very useful information about Sagwan doors! Does applying teak oil darken the shade significantly?',
      status: 'approved',
      createdAt: '2026-09-01T10:30:00.000Z',
      adminReply: {
        text: 'Hello Rajesh! Genuine boiled teak oil enhances the natural golden-honey grain without unnaturally darkening the wood. Just ensure a thin coat is applied evenly.',
        repliedAt: '2026-09-01T14:15:00.000Z',
        authorName: 'Shivshahi Wood Experts',
      },
      likes: 5,
    },
    {
      id: 'comm-2',
      articleId: 'art-1',
      authorName: 'Amit Deshmukh',
      authorEmail: 'amit@example.com',
      content: 'Is this door available in custom bungalow sizes like 42x84 inches?',
      status: 'approved',
      createdAt: '2026-09-03T16:20:00.000Z',
      adminReply: {
        text: 'Yes Amit! We manufacture custom bungalow sizes up to 48x96 inches with seasoned Sagwan timber. You can use our live Door Price Calculator to configure this exact size.',
        repliedAt: '2026-09-03T18:00:00.000Z',
        authorName: 'Shivshahi Wood Experts',
      },
      likes: 2,
    },
  ],
  articleViews: [],
  articleLikes: [],
  articleShares: [],
  aiWoodDetectorLogs: [],
  trackingOrders: INITIAL_TRACKING_ORDERS,
  deliveryStates: DEFAULT_INDIA_STATES,
  deliveryStories: DEFAULT_DELIVERY_STORIES,
};

// ---------------- PERSISTENT PRODUCTION DATA ENGINE ----------------

let inMemoryDb: DatabaseSchema | null = null;
let lastBackupTime = 0;
let lastLoadedMtime = 0;

/**
 * Atomically writes data to disk using fsync and atomic rename.
 * Guarantees zero file corruption and confirms bytes are committed to physical storage.
 */
function writeAtomicJson(filePath: string, data: any): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const jsonStr = JSON.stringify(data, null, 2);

  // Write and flush to disk
  const fd = fs.openSync(tempPath, 'w');
  try {
    fs.writeFileSync(fd, jsonStr, 'utf-8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  // Atomic rename
  fs.renameSync(tempPath, filePath);

  // Verify non-empty file on disk
  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    throw new Error(`Write verification failed: atomic write resulted in empty file at ${filePath}`);
  }
}

function parseDatabaseJson(rawContent: string): DatabaseSchema | null {
  try {
    const parsed = JSON.parse(rawContent);
    if (!parsed || typeof parsed !== 'object') return null;
    const hasDoors = Array.isArray(parsed.doors) && parsed.doors.length > 0;
    const hasSettings = parsed.settings && typeof parsed.settings === 'object';
    if (!hasDoors && !hasSettings) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface CandidateSnapshot {
  source: string;
  data: DatabaseSchema;
  mtimeMs: number;
  version: number;
  lastModifiedMs: number;
  doorCount: number;
}

/**
 * Keeps backup directories compact by retaining only the newest maxFiles snapshots.
 * Prevents disk bloat and slow container provisioning during deployment.
 */
export function pruneExcessBackups(maxFiles: number = 6): void {
  [BACKUPS_DIR, SERVER_BACKUPS_DIR].forEach(dir => {
    try {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const full = path.join(dir, f);
          let mtimeMs = 0;
          try { mtimeMs = fs.statSync(full).mtimeMs; } catch {}
          return { f, full, mtimeMs };
        })
        .sort((a, b) => a.mtimeMs - b.mtimeMs);

      if (files.length > maxFiles) {
        const toRemove = files.slice(0, files.length - maxFiles);
        for (const item of toRemove) {
          try { fs.unlinkSync(item.full); } catch {}
        }
      }
    } catch {}
  });
}

// Prune accumulated historical snapshots once on module load
pruneExcessBackups(6);

/**
 * Scans multi-tier persistent storage across primary, server store, mirror, and rolling backups:
 * Always loads the genuinely NEWEST and most complete dataset.
 * NEVER overwrites customized data with older snapshots or defaults.
 */
function findBestAvailableData(): DatabaseSchema | null {
  const candidates: CandidateSnapshot[] = [];
  const candidateFilePaths = new Set<string>();

  // Primary store files
  candidateFilePaths.add(DB_FILE);
  candidateFilePaths.add(ADMIN_STORE_FILE);
  candidateFilePaths.add(MIRROR_FILE);
  if (process.env.PERSISTENT_DATA_DIR) {
    candidateFilePaths.add(path.join(process.env.PERSISTENT_DATA_DIR, 'database.json'));
    candidateFilePaths.add(path.join(process.env.PERSISTENT_DATA_DIR, 'admin_store.json'));
  }

  // Inspect only the 3 newest backup files per backup directory for fast O(1) startup
  [BACKUPS_DIR, SERVER_BACKUPS_DIR, PERMANENT_BACKUPS_DIR].forEach(bDir => {
    if (fs.existsSync(bDir)) {
      try {
        const recentFiles = fs.readdirSync(bDir)
          .filter(f => f.endsWith('.json'))
          .sort()
          .slice(-3);
        recentFiles.forEach(f => candidateFilePaths.add(path.join(bDir, f)));
      } catch {}
    }
  });

  for (const filePath of candidateFilePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > 100) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = parseDatabaseJson(content);
          if (parsed && Array.isArray(parsed.doors) && parsed.doors.length > 0) {
            const lastModStr = parsed.lastModified || stat.mtime.toISOString();
            const lastModifiedMs = new Date(lastModStr).getTime() || stat.mtimeMs;
            candidates.push({
              source: filePath,
              data: parsed,
              mtimeMs: stat.mtimeMs,
              version: Number(parsed.version) || 0,
              lastModifiedMs,
              doorCount: parsed.doors.length,
            });
          }
        }
      } catch {}
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort candidates to find the genuinely newest & most complete version
  candidates.sort((a, b) => {
    // 1. Higher version takes priority
    if (b.version !== a.version) {
      return b.version - a.version;
    }
    // 2. Newer lastModified takes priority
    if (Math.abs(b.lastModifiedMs - a.lastModifiedMs) > 1000) {
      return b.lastModifiedMs - a.lastModifiedMs;
    }
    // 3. Newer file modification time
    return b.mtimeMs - a.mtimeMs;
  });

  const best = candidates[0];
  console.log(`🛡️ Loaded authoritative production database from: ${best.source} (Version: ${best.version}, Last Modified: ${new Date(best.lastModifiedMs).toISOString()}, Doors: ${best.doorCount})`);
  return best.data;
}

function normalizeDatabaseSchema(existingData: DatabaseSchema): DatabaseSchema {
  return {
    ...existingData,
    version: Number(existingData.version) || 1,
    lastModified: existingData.lastModified || new Date().toISOString(),
    auditLogs: Array.isArray(existingData.auditLogs) ? existingData.auditLogs : [],
    doors: (Array.isArray(existingData.doors) ? existingData.doors : INITIAL_DATA.doors).map(d => ({
      ...d,
      pricingType: d.pricingType || (d.id === 'door-7' || d.id === 'door-8' ? 'fixed' : 'sqft'),
      basePrice: d.basePrice !== undefined ? Number(d.basePrice) : (d.pricingType === 'fixed' || d.id === 'door-7' || d.id === 'door-8' ? d.startingPrice : Math.round(d.startingPrice / 19.5)),
      minWidthInch: d.minWidthInch !== undefined ? Number(d.minWidthInch) : 24,
      maxWidthInch: d.maxWidthInch !== undefined ? Number(d.maxWidthInch) : 72,
      minHeightInch: d.minHeightInch !== undefined ? Number(d.minHeightInch) : 60,
      maxHeightInch: d.maxHeightInch !== undefined ? Number(d.maxHeightInch) : 96,
      minPrice: d.minPrice !== undefined ? Number(d.minPrice) : 0,
      availableMaterialIds: Array.isArray(d.availableMaterialIds) ? d.availableMaterialIds : undefined,
      materialPrices: d.materialPrices && typeof d.materialPrices === 'object' ? d.materialPrices : undefined,
      availableFinishIds: Array.isArray(d.availableFinishIds) ? d.availableFinishIds : undefined,
      finishPrices: d.finishPrices && typeof d.finishPrices === 'object' ? d.finishPrices : undefined,
      availableFrameIds: Array.isArray(d.availableFrameIds) ? d.availableFrameIds : undefined,
      framePrices: d.framePrices && typeof d.framePrices === 'object' ? d.framePrices : undefined,
      availableHardwareIds: Array.isArray(d.availableHardwareIds) ? d.availableHardwareIds : undefined,
      hardwarePrices: d.hardwarePrices && typeof d.hardwarePrices === 'object' ? d.hardwarePrices : undefined,
    })),
    categories: Array.isArray(existingData.categories) ? existingData.categories : INITIAL_DATA.categories,
    materials: (Array.isArray(existingData.materials) ? existingData.materials : INITIAL_DATA.materials).map(m => {
      const def = INITIAL_DATA.materials.find(dm => dm.id === m.id || dm.name.toLowerCase() === m.name.toLowerCase());
      return {
        ...m,
        image: m.image || def?.image || 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?auto=format&fit=crop&w=600&q=80',
      };
    }),
    finishes: (Array.isArray(existingData.finishes) ? existingData.finishes : INITIAL_DATA.finishes).map(f => {
      const def = INITIAL_DATA.finishes.find(df => df.id === f.id || df.name.toLowerCase() === f.name.toLowerCase());
      return {
        ...f,
        image: f.image || def?.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80',
      };
    }),
    frames: (Array.isArray(existingData.frames) ? existingData.frames : INITIAL_DATA.frames).map(fr => {
      const def = INITIAL_DATA.frames.find(df => df.id === fr.id);
      return {
        ...fr,
        image: fr.image || def?.image,
      };
    }),
    hardware: (Array.isArray(existingData.hardware) ? existingData.hardware : INITIAL_DATA.hardware).map(h => {
      const def = INITIAL_DATA.hardware.find(dh => dh.id === h.id);
      return {
        ...h,
        image: h.image || def?.image,
      };
    }),
    banners: (() => {
      const source = Array.isArray(existingData.banners) ? existingData.banners : INITIAL_DATA.banners;
      return source.map(b => ({
        ...b,
        bannerType: b.bannerType || (b.slot === 'hero' || b.slot === 'main' || b.id === 'ban-1' || b.id === 'ban-3' ? 'main' : 'promotion'),
      }));
    })(),
    articles: Array.isArray(existingData.articles) ? existingData.articles : INITIAL_DATA.articles,
    teamMembers: Array.isArray(existingData.teamMembers) ? existingData.teamMembers : INITIAL_DATA.teamMembers,
    quotes: Array.isArray(existingData.quotes) ? existingData.quotes : [],
    enquiries: Array.isArray(existingData.enquiries) ? existingData.enquiries : [],
    settings: existingData.settings
      ? {
          ...existingData.settings,
          storySettings: existingData.settings.storySettings || INITIAL_DATA.settings.storySettings,
          aiWoodDetector: existingData.settings.aiWoodDetector || {
            enabled: true,
            maxDailyScans: 150,
            customNotice: '',
          },
        }
      : INITIAL_DATA.settings,
    adminPasswordHash: existingData.adminPasswordHash || INITIAL_DATA.adminPasswordHash,
    users: Array.isArray(existingData.users) ? existingData.users : [],
    notificationTokens: Array.isArray(existingData.notificationTokens) ? existingData.notificationTokens : [],
    notificationCampaigns: Array.isArray(existingData.notificationCampaigns) ? existingData.notificationCampaigns : [],
    articleCategories: Array.isArray(existingData.articleCategories) ? existingData.articleCategories : INITIAL_DATA.articleCategories,
    articleComments: Array.isArray(existingData.articleComments) ? existingData.articleComments : [],
    articleViews: Array.isArray(existingData.articleViews) ? existingData.articleViews : [],
    articleLikes: Array.isArray(existingData.articleLikes) ? existingData.articleLikes : [],
    articleShares: Array.isArray(existingData.articleShares) ? existingData.articleShares : [],
    aiWoodDetectorLogs: Array.isArray(existingData.aiWoodDetectorLogs) ? existingData.aiWoodDetectorLogs : [],
    woodReferences: Array.isArray(existingData.woodReferences) ? existingData.woodReferences : [],
    trackingOrders: Array.isArray(existingData.trackingOrders) ? existingData.trackingOrders : (INITIAL_DATA.trackingOrders || []),
    deliveryStates: Array.isArray(existingData.deliveryStates) && existingData.deliveryStates.length > 0
      ? existingData.deliveryStates
      : (INITIAL_DATA.deliveryStates || DEFAULT_INDIA_STATES),
    deliveryStories: Array.isArray(existingData.deliveryStories)
      ? existingData.deliveryStories
      : (INITIAL_DATA.deliveryStories || DEFAULT_DELIVERY_STORIES),
    chaukhatProducts: Array.isArray(existingData.chaukhatProducts) && existingData.chaukhatProducts.length > 0
      ? existingData.chaukhatProducts
      : [DEFAULT_CHAUKHAT_PRODUCT],
    chaukhatSectionSizes: Array.isArray(existingData.chaukhatSectionSizes) && existingData.chaukhatSectionSizes.length > 0
      ? existingData.chaukhatSectionSizes
      : DEFAULT_CHAUKHAT_SECTION_SIZES,
    chaukhatPresets: Array.isArray(existingData.chaukhatPresets) && existingData.chaukhatPresets.length > 0
      ? existingData.chaukhatPresets
      : DEFAULT_CHAUKHAT_DIMENSION_PRESETS,
    chaukhatWoodTypes: Array.isArray(existingData.chaukhatWoodTypes) && existingData.chaukhatWoodTypes.length > 0
      ? existingData.chaukhatWoodTypes
      : DEFAULT_CHAUKHAT_WOOD_TYPES,
  };
}

/**
 * Asynchronously initializes authoritative database from persistent Firestore.
 * Ensures Cloud Run container restarts NEVER reset to old image build defaults,
 * while preserving newer local disk state if local saves occurred during cloud quota limits.
 */
export async function initCloudDatabase(): Promise<DatabaseSchema> {
  const localDiskExisted = fs.existsSync(DB_FILE) || fs.existsSync(ADMIN_STORE_FILE);
  const localCandidate = findBestAvailableData();

  try {
    const cloudData = await fetchAuthoritativeFirestoreDb();
    if (cloudData && Array.isArray(cloudData.doors) && cloudData.doors.length > 0) {
      const cloudVersion = Number(cloudData.version) || 0;
      const localVersion = Number(localCandidate?.version) || 0;
      const cloudModMs = cloudData.lastModified ? new Date(cloudData.lastModified).getTime() : 0;
      const localModMs = localCandidate?.lastModified ? new Date(localCandidate.lastModified).getTime() : 0;

      // If local disk has a newer version (e.g., saved while cloud write quota was reached), keep local
      if (localCandidate && (localVersion > cloudVersion || localModMs > cloudModMs + 2000)) {
        console.log(`🛡️ [PERSISTENCE] Using newer local authoritative database (Local v${localVersion} > Cloud v${cloudVersion})`);
        inMemoryDb = normalizeDatabaseSchema(localCandidate);
        lastLoadedMtime = Date.now();
        return inMemoryDb;
      }

      console.log(`🛡️ [PERSISTENCE] Hydrated application state from Firestore cloud store (Doors: ${cloudData.doors.length}, Version: ${cloudData.version})`);
      inMemoryDb = normalizeDatabaseSchema(cloudData);
      lastLoadedMtime = Date.now();

      if (!inMemoryDb.settings?.productionApiUrl && process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
        inMemoryDb.settings = inMemoryDb.settings || {} as any;
        inMemoryDb.settings.productionApiUrl = process.env.APP_URL.trim().replace(/\/$/, '');
      }

      // Mirror to local disk cache synchronously for instant cold reads
      try {
        writeAtomicJson(DB_FILE, inMemoryDb);
        writeAtomicJson(ADMIN_STORE_FILE, inMemoryDb);
        writeAtomicJson(MIRROR_FILE, inMemoryDb);
      } catch {}

      return inMemoryDb;
    }
  } catch (err: any) {
    console.warn('⚠️ [PERSISTENCE] Firestore initialization check warning:', err.message);
  }

  const localData = getDb();
  if (!localDiskExisted) {
    try {
      await saveAuthoritativeFirestoreDb(localData);
    } catch {}
  }

  return localData;
}

/**
 * Returns current production database.
 * Auto-detects on-disk changes to avoid multi-instance desynchronization.
 * NEVER overwrites existing data with defaults on server start or restarts.
 */
export function getDb(): DatabaseSchema {
  if (inMemoryDb) {
    try {
      if (fs.existsSync(DB_FILE)) {
        const stat = fs.statSync(DB_FILE);
        if (stat.mtimeMs > lastLoadedMtime + 500) {
          const fresh = findBestAvailableData();
          if (fresh && (fresh.version || 0) >= (inMemoryDb.version || 0)) {
            inMemoryDb = normalizeDatabaseSchema(fresh);
            lastLoadedMtime = stat.mtimeMs;
          }
        }
      }
    } catch {}
    return inMemoryDb;
  }

  const existingData = findBestAvailableData();

  if (existingData) {
    inMemoryDb = normalizeDatabaseSchema(existingData);
    lastLoadedMtime = Date.now();

    // Mirror to all targets synchronously so all files stay 100% in sync
    try {
      if (!fs.existsSync(DB_FILE)) writeAtomicJson(DB_FILE, inMemoryDb);
      if (!fs.existsSync(ADMIN_STORE_FILE)) writeAtomicJson(ADMIN_STORE_FILE, inMemoryDb);
      if (!fs.existsSync(MIRROR_FILE)) writeAtomicJson(MIRROR_FILE, inMemoryDb);
    } catch {}

    return inMemoryDb;
  }

  // First-time initialization only when no existing store or backup exists
  console.log('🆕 First-time initialization: No existing production data or backup found. Initializing seed structure.');
  inMemoryDb = normalizeDatabaseSchema(INITIAL_DATA);
  saveDb(inMemoryDb, {
    entity: 'system',
    action: 'create',
    details: 'Initial database bootstrap',
  });
  return inMemoryDb;
}

export interface SaveAuditContext {
  entity: string; // 'door' | 'material' | 'finish' | 'frame' | 'hardware' | 'banner' | 'article' | 'team' | 'settings' | 'backup'
  action: 'create' | 'update' | 'delete' | 'bulk_update' | 'restore';
  targetId?: string;
  targetName?: string;
  details?: string;
}

/**
 * Saves database state using verified atomic writes across primary, server store, mirror, and rolling backups.
 * Synchronizes to Firestore persistent cloud store so data survives Cloud Run redeployments.
 * Records change audit history and throws if physical write fails.
 */
export function saveDb(data: DatabaseSchema, auditContext?: SaveAuditContext): void {
  // 1. Increment version & timestamp
  data.version = (Number(data.version) || 0) + 1;
  data.lastModified = new Date().toISOString();

  // 2. Append audit log entry if context provided
  if (auditContext) {
    if (!Array.isArray(data.auditLogs)) {
      data.auditLogs = [];
    }
    const auditItem: AdminAuditLogItem = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      entity: auditContext.entity,
      action: auditContext.action,
      targetId: auditContext.targetId,
      targetName: auditContext.targetName,
      timestamp: new Date().toISOString(),
      success: true,
      details: auditContext.details,
    };
    data.auditLogs.unshift(auditItem);
    // Retain newest 300 audit logs
    if (data.auditLogs.length > 300) {
      data.auditLogs = data.auditLogs.slice(0, 300);
    }
  }

  // Update in-memory reference immediately
  inMemoryDb = data;
  lastLoadedMtime = Date.now();

  const targetFiles = [
    DB_FILE,
    ADMIN_STORE_FILE,
    MIRROR_FILE,
  ];

  if (process.env.PERSISTENT_DATA_DIR) {
    const extFile = path.join(process.env.PERSISTENT_DATA_DIR, 'database.json');
    if (!targetFiles.includes(extFile)) {
      targetFiles.push(extFile);
    }
  }

  let successCount = 0;
  let lastError: Error | null = null;

  for (const file of targetFiles) {
    try {
      writeAtomicJson(file, data);
      successCount++;
    } catch (err: any) {
      console.error(`❌ Error writing database to ${file}:`, err.message);
      lastError = err;
    }
  }

  if (successCount === 0 && lastError) {
    throw new Error(`CRITICAL: Failed to write database to any persistent location! ${lastError.message}`);
  }

  // 3. Persist to Firestore cloud database (non-blocking, quota-aware)
  saveAuthoritativeFirestoreDb(data).catch(() => {});

  // 4. Granular atomic update for specific entity in Firestore
  if (auditContext?.entity && auditContext?.targetId) {
    const { entity, targetId, action } = auditContext;
    const collectionName =
      entity === 'delivery_story'
        ? 'delivery_stories'
        : entity === 'category'
        ? 'categories'
        : entity === 'finish'
        ? 'finishes'
        : entity === 'settings'
        ? 'settings'
        : entity + 's';

    if (action === 'delete') {
      deleteEntityFromFirestore(collectionName, targetId).catch(() => {});
      if (entity === 'delivery_story') {
        deleteEntityFromFirestore('delivery_storys', targetId).catch(() => {});
      }
    } else {
      let entityData: any = null;
      if (entity === 'door') entityData = data.doors.find(d => d.id === targetId);
      else if (entity === 'material') entityData = data.materials.find(m => m.id === targetId);
      else if (entity === 'finish') entityData = data.finishes.find(f => f.id === targetId);
      else if (entity === 'frame') entityData = data.frames.find(fr => fr.id === targetId);
      else if (entity === 'hardware') entityData = data.hardware.find(h => h.id === targetId);
      else if (entity === 'banner') entityData = data.banners.find(b => b.id === targetId);
      else if (entity === 'article') entityData = data.articles.find(a => a.id === targetId);
      else if (entity === 'settings') entityData = data.settings;
      else if (entity === 'team_member') entityData = (data.teamMembers || []).find(tm => tm.id === targetId);
      else if (entity === 'delivery_state') entityData = (data.deliveryStates || []).find(s => s.id === targetId);
      else if (entity === 'delivery_story') entityData = (data.deliveryStories || []).find(s => s.id === targetId);

      if (entityData) {
        saveEntityToFirestore(collectionName, targetId, entityData).catch(() => {});
      }
    }
  }

  // 3. Automated Rolling Backup (throttle to at most one snapshot per 3 seconds)
  const now = Date.now();
  if (now - lastBackupTime > 3000) {
    lastBackupTime = now;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUPS_DIR, `snapshot-${ts}.json`);
    const serverBackupFile = path.join(SERVER_BACKUPS_DIR, `snapshot-${ts}.json`);

    try { writeAtomicJson(backupFile, data); } catch {}
    try { writeAtomicJson(serverBackupFile, data); } catch {}

    // Rotate backups: retain newest 6 snapshots in each directory
    pruneExcessBackups(6);
  }
}

// ---------------- BACKUP & RESTORE UTILITIES ----------------

export interface DatabaseBackupSummary {
  filename: string;
  timestamp: string;
  sizeBytes: number;
  doorCount: number;
  articleCount: number;
  teamCount: number;
}

export function exportDatabaseBackup(): { meta: any; data: DatabaseSchema } {
  const db = getDb();
  return {
    meta: {
      exportedAt: new Date().toISOString(),
      businessName: db.settings?.businessName || 'Jai Hanuman Door',
      schemaVersion: '1.0.0',
      doorCount: db.doors?.length || 0,
      articleCount: db.articles?.length || 0,
      teamCount: db.teamMembers?.length || 0,
      quotesCount: db.quotes?.length || 0,
    },
    data: db,
  };
}

export function importDatabaseBackup(backupPayload: any): { success: boolean; message: string; doorCount: number } {
  if (!backupPayload || typeof backupPayload !== 'object') {
    throw new Error('Invalid backup format: Expected JSON object');
  }

  const incomingData = backupPayload.data || backupPayload;

  if (!incomingData || !Array.isArray(incomingData.doors)) {
    throw new Error('Invalid backup format: Missing required "doors" collection');
  }

  // Pre-restore safety snapshot of current data before overwriting
  const currentDb = getDb();
  const preRestoreTs = new Date().toISOString().replace(/[:.]/g, '-');
  const preRestorePath = path.join(BACKUPS_DIR, `pre-restore-${preRestoreTs}.json`);
  writeAtomicJson(preRestorePath, currentDb);

  // Restore data safely
  const restoredDb: DatabaseSchema = {
    ...incomingData,
    doors: Array.isArray(incomingData.doors) ? incomingData.doors : currentDb.doors,
    categories: Array.isArray(incomingData.categories) ? incomingData.categories : currentDb.categories,
    materials: Array.isArray(incomingData.materials) ? incomingData.materials : currentDb.materials,
    finishes: Array.isArray(incomingData.finishes) ? incomingData.finishes : currentDb.finishes,
    frames: Array.isArray(incomingData.frames) ? incomingData.frames : currentDb.frames,
    hardware: Array.isArray(incomingData.hardware) ? incomingData.hardware : currentDb.hardware,
    banners: Array.isArray(incomingData.banners) ? incomingData.banners : currentDb.banners,
    articles: Array.isArray(incomingData.articles) ? incomingData.articles : currentDb.articles,
    teamMembers: Array.isArray(incomingData.teamMembers) ? incomingData.teamMembers : currentDb.teamMembers,
    quotes: Array.isArray(incomingData.quotes) ? incomingData.quotes : currentDb.quotes,
    enquiries: Array.isArray(incomingData.enquiries) ? incomingData.enquiries : currentDb.enquiries,
    settings: incomingData.settings || currentDb.settings,
    adminPasswordHash: incomingData.adminPasswordHash || currentDb.adminPasswordHash,
    users: Array.isArray(incomingData.users) ? incomingData.users : currentDb.users,
    notificationTokens: Array.isArray(incomingData.notificationTokens) ? incomingData.notificationTokens : currentDb.notificationTokens,
    notificationCampaigns: Array.isArray(incomingData.notificationCampaigns) ? incomingData.notificationCampaigns : currentDb.notificationCampaigns,
    articleCategories: Array.isArray(incomingData.articleCategories) ? incomingData.articleCategories : currentDb.articleCategories,
    articleComments: Array.isArray(incomingData.articleComments) ? incomingData.articleComments : currentDb.articleComments,
    articleViews: Array.isArray(incomingData.articleViews) ? incomingData.articleViews : currentDb.articleViews,
    articleLikes: Array.isArray(incomingData.articleLikes) ? incomingData.articleLikes : currentDb.articleLikes,
    articleShares: Array.isArray(incomingData.articleShares) ? incomingData.articleShares : currentDb.articleShares,
    trackingOrders: Array.isArray(incomingData.trackingOrders) ? incomingData.trackingOrders : currentDb.trackingOrders || [],
  };

  saveDb(restoredDb);

  return {
    success: true,
    message: `Database successfully restored (${restoredDb.doors.length} doors, ${restoredDb.articles.length} articles)`,
    doorCount: restoredDb.doors.length,
  };
}

export function listAvailableBackups(): DatabaseBackupSummary[] {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    return files.slice(0, 25).map(filename => {
      const fullPath = path.join(BACKUPS_DIR, filename);
      const stat = fs.statSync(fullPath);
      let doorCount = 0;
      let articleCount = 0;
      let teamCount = 0;
      try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const data = parsed.data || parsed;
        doorCount = Array.isArray(data.doors) ? data.doors.length : 0;
        articleCount = Array.isArray(data.articles) ? data.articles.length : 0;
        teamCount = Array.isArray(data.teamMembers) ? data.teamMembers.length : 0;
      } catch {}

      return {
        filename,
        timestamp: stat.mtime.toISOString(),
        sizeBytes: stat.size,
        doorCount,
        articleCount,
        teamCount,
      };
    });
  } catch (err) {
    console.error('Error listing backups:', err);
    return [];
  }
}

export function restoreBackupFile(filename: string): { success: boolean; message: string; doorCount: number } {
  const safeFilename = path.basename(filename);
  const filePath = path.join(BACKUPS_DIR, safeFilename);
  if (!fs.existsSync(filePath)) {
    throw new Error('Backup file not found: ' + safeFilename);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  return importDatabaseBackup(parsed);
}

// ---------------- AI WOOD DETECTOR PERSISTENCE & MONITORING ----------------

export function logWoodDetectorScan(entry: Omit<AIWoodDetectorLogItem, 'id' | 'timestamp'>): AIWoodDetectorLogItem {
  const db = getDb();
  if (!Array.isArray(db.aiWoodDetectorLogs)) {
    db.aiWoodDetectorLogs = [];
  }
  const item: AIWoodDetectorLogItem = {
    id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  // Store rolling log of scans (privacy-safe: only technical metadata and species name, NO customer image data)
  db.aiWoodDetectorLogs.unshift(item);
  if (db.aiWoodDetectorLogs.length > 500) {
    db.aiWoodDetectorLogs = db.aiWoodDetectorLogs.slice(0, 500);
  }
  saveDb(db);
  return item;
}

export function getWoodDetectorStats(): AIWoodDetectorStats {
  const db = getDb();
  const logs = Array.isArray(db.aiWoodDetectorLogs) ? db.aiWoodDetectorLogs : [];
  const enabled = db.settings?.aiWoodDetector?.enabled !== false;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayScans = logs.filter(l => l.timestamp && l.timestamp.startsWith(todayStr)).length;
  const successfulScans = logs.filter(l => l.success).length;
  const failedScans = logs.filter(l => !l.success).length;

  return {
    enabled,
    totalScans: logs.length,
    todayScans,
    successfulScans,
    failedScans,
    lastScanTimestamp: logs[0]?.timestamp,
    recentLogs: logs.slice(0, 50),
  };
}

export function updateWoodDetectorSettings(detectorSettings: Partial<AIWoodDetectorSettings>): AIWoodDetectorSettings {
  const db = getDb();
  if (!db.settings) {
    db.settings = { ...INITIAL_DATA.settings };
  }
  db.settings.aiWoodDetector = {
    enabled: true,
    ...(db.settings.aiWoodDetector || {}),
    ...detectorSettings,
  };
  saveDb(db);
  return db.settings.aiWoodDetector;
}

// ---------------- VERIFIED WOOD REFERENCE DATASET ----------------

export function getWoodReferences(verifiedOnly: boolean = false): WoodReferenceSample[] {
  const db = getDb();
  const list = Array.isArray(db.woodReferences) ? db.woodReferences : [];
  if (verifiedOnly) {
    return list.filter(item => item.isVerified);
  }
  return list;
}

export function addWoodReference(
  sample: Omit<WoodReferenceSample, 'id' | 'createdAt' | 'updatedAt'>
): WoodReferenceSample {
  const db = getDb();
  if (!Array.isArray(db.woodReferences)) {
    db.woodReferences = [];
  }
  const now = new Date().toISOString();
  const newRef: WoodReferenceSample = {
    id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...sample,
    createdAt: now,
    updatedAt: now,
  };
  db.woodReferences.push(newRef);
  saveDb(db);
  return newRef;
}

export function updateWoodReference(
  id: string,
  updates: Partial<WoodReferenceSample>
): WoodReferenceSample | null {
  const db = getDb();
  if (!Array.isArray(db.woodReferences)) return null;
  const idx = db.woodReferences.findIndex(r => r.id === id);
  if (idx === -1) return null;

  db.woodReferences[idx] = {
    ...db.woodReferences[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveDb(db);
  return db.woodReferences[idx];
}

export function deleteWoodReference(id: string): boolean {
  const db = getDb();
  if (!Array.isArray(db.woodReferences)) return false;
  const initialLen = db.woodReferences.length;
  db.woodReferences = db.woodReferences.filter(r => r.id !== id);
  if (db.woodReferences.length !== initialLen) {
    saveDb(db);
    return true;
  }
  return false;
}

export function toggleVerifyWoodReference(
  id: string,
  verifiedBy: string = 'Administrator'
): WoodReferenceSample | null {
  const db = getDb();
  if (!Array.isArray(db.woodReferences)) return null;
  const idx = db.woodReferences.findIndex(r => r.id === id);
  if (idx === -1) return null;

  const current = db.woodReferences[idx];
  const newStatus = !current.isVerified;
  db.woodReferences[idx] = {
    ...current,
    isVerified: newStatus,
    verifiedBy: newStatus ? verifiedBy : undefined,
    verifiedAt: newStatus ? new Date().toISOString() : undefined,
    updatedAt: new Date().toISOString(),
  };
  saveDb(db);
  return db.woodReferences[idx];
}

// ---------------- ALL INDIA DELIVERY MANAGEMENT ----------------

export function getDeliveryStates(): IndiaDeliveryState[] {
  const db = getDb();
  return Array.isArray(db.deliveryStates) && db.deliveryStates.length > 0
    ? db.deliveryStates
    : DEFAULT_INDIA_STATES;
}

export function toggleStateDelivery(stateId: string): IndiaDeliveryState | null {
  const db = getDb();
  if (!Array.isArray(db.deliveryStates) || db.deliveryStates.length === 0) {
    db.deliveryStates = [...DEFAULT_INDIA_STATES];
  }
  const idx = db.deliveryStates.findIndex(s => s.id === stateId || s.code === stateId);
  if (idx === -1) return null;
  db.deliveryStates[idx] = {
    ...db.deliveryStates[idx],
    available: !db.deliveryStates[idx].available,
  };
  saveDb(db, {
    entity: 'delivery_state',
    action: 'update',
    targetId: stateId,
    targetName: db.deliveryStates[idx].name,
    details: `Toggled delivery availability to ${db.deliveryStates[idx].available ? 'Available' : 'Unavailable'}`,
  });
  return db.deliveryStates[idx];
}

export function updateStateDelivery(
  stateId: string,
  updates: Partial<IndiaDeliveryState>
): IndiaDeliveryState | null {
  const db = getDb();
  if (!Array.isArray(db.deliveryStates) || db.deliveryStates.length === 0) {
    db.deliveryStates = [...DEFAULT_INDIA_STATES];
  }
  const idx = db.deliveryStates.findIndex(s => s.id === stateId || s.code === stateId);
  if (idx === -1) return null;
  db.deliveryStates[idx] = {
    ...db.deliveryStates[idx],
    ...updates,
  };
  saveDb(db, {
    entity: 'delivery_state',
    action: 'update',
    targetId: stateId,
    targetName: db.deliveryStates[idx].name,
    details: `Updated delivery details for ${db.deliveryStates[idx].name}`,
  });
  return db.deliveryStates[idx];
}

export function getDeliveryStories(publishedOnly: boolean = false): DeliveryStory[] {
  const db = getDb();
  const list = Array.isArray(db.deliveryStories) ? db.deliveryStories : DEFAULT_DELIVERY_STORIES;
  if (publishedOnly) {
    return list.filter(s => s.published !== false);
  }
  return list;
}

function normalizeStoryFields(story: any): any {
  const city = story.cityName || story.city || '';
  const customerName = story.customerName || (story.customerFirstName ? `${story.customerFirstName} ${story.customerInitial || ''}`.trim() : '');
  const parts = customerName.split(' ');
  const customerFirstName = story.customerFirstName || parts[0] || 'Customer';
  const customerInitial = story.customerInitial || (parts.length > 1 ? parts.slice(1).join(' ') : '');
  const orderTitle = story.orderDescription || story.orderTitle || 'Handcrafted Sagwan Door';
  const rawDoor = story.doorPhotoUrl !== undefined ? story.doorPhotoUrl : (story.doorThumbnail !== undefined ? story.doorThumbnail : '');
  const doorThumbnail = typeof rawDoor === 'string' ? (rawDoor === '[object Object]' ? '' : rawDoor.trim()) : (rawDoor?.url || '');
  const rawDelivery = story.deliveryPhotoUrl !== undefined ? story.deliveryPhotoUrl : (story.deliveryPhoto !== undefined ? story.deliveryPhoto : '');
  const deliveryPhoto = typeof rawDelivery === 'string' ? (rawDelivery === '[object Object]' ? '' : rawDelivery.trim()) : (rawDelivery?.url || '');
  const reviewText = story.customerReview || story.reviewText || '';
  const isVerified = story.isVerifiedCustomer !== undefined ? !!story.isVerifiedCustomer : (story.isVerified !== undefined ? !!story.isVerified : false);
  const isSample = story.isSample !== undefined ? !!story.isSample : !isVerified;

  return {
    ...story,
    city,
    cityName: city,
    customerName,
    customerFirstName,
    customerInitial,
    orderTitle,
    orderDescription: orderTitle,
    doorThumbnail,
    doorPhotoUrl: doorThumbnail,
    deliveryPhoto,
    deliveryPhotoUrl: deliveryPhoto,
    reviewText,
    customerReview: reviewText,
    isVerified,
    isVerifiedCustomer: isVerified,
    isSample,
  };
}

export function createDeliveryStory(
  story: Omit<DeliveryStory, 'id' | 'createdAt'>
): DeliveryStory {
  const db = getDb();
  if (!Array.isArray(db.deliveryStories)) {
    db.deliveryStories = [...DEFAULT_DELIVERY_STORIES];
  }
  const normalized = normalizeStoryFields(story);
  const newStory: DeliveryStory = {
    ...normalized,
    id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    published: story.published !== undefined ? story.published : true,
  };
  db.deliveryStories.unshift(newStory);
  saveDb(db, {
    entity: 'delivery_story',
    action: 'create',
    targetId: newStory.id,
    targetName: `${newStory.customerFirstName} ${newStory.customerInitial} (${newStory.city})`,
    details: `Created delivery story for ${newStory.stateName}`,
  });
  return newStory;
}

export function updateDeliveryStory(
  id: string,
  updates: Partial<DeliveryStory>
): DeliveryStory | null {
  const db = getDb();
  if (!Array.isArray(db.deliveryStories)) return null;
  const idx = db.deliveryStories.findIndex(s => s.id === id);
  if (idx === -1) return null;
  const current = db.deliveryStories[idx];
  const merged: any = {
    ...current,
    ...updates,
  };
  if (updates.doorPhotoUrl !== undefined) {
    merged.doorThumbnail = updates.doorPhotoUrl;
  }
  if (updates.deliveryPhotoUrl !== undefined) {
    merged.deliveryPhoto = updates.deliveryPhotoUrl;
  }
  const normalizedUpdates = normalizeStoryFields(merged);
  db.deliveryStories[idx] = {
    ...normalizedUpdates,
    id,
    updatedAt: new Date().toISOString(),
  };
  saveDb(db, {
    entity: 'delivery_story',
    action: 'update',
    targetId: id,
    targetName: db.deliveryStories[idx].orderTitle,
    details: `Updated delivery story ${id}`,
  });
  return db.deliveryStories[idx];
}

export function deleteDeliveryStory(id: string): boolean {
  const db = getDb();
  if (!Array.isArray(db.deliveryStories)) return false;
  const initialLen = db.deliveryStories.length;
  db.deliveryStories = db.deliveryStories.filter(s => s.id !== id);
  if (db.deliveryStories.length !== initialLen) {
    saveDb(db, {
      entity: 'delivery_story',
      action: 'delete',
      targetId: id,
      details: `Deleted delivery story ${id}`,
    });
    return true;
  }
  return false;
}

/**
 * Checks whether an uploaded media URL (e.g. /uploads/photo-123.jpg) is still referenced
 * anywhere in the current database across banners, doors, delivery stories, articles,
 * team members, wood references, or business settings.
 * Returns true if referenced (shared) or if not a dedicated local /uploads/ path.
 */
export function isMediaUrlReferencedInDb(db: DatabaseSchema, candidateUrl?: string | null): boolean {
  if (!candidateUrl || typeof candidateUrl !== 'string') return true;
  const trimmed = candidateUrl.trim();
  const uploadsIdx = trimmed.lastIndexOf('/uploads/');
  if (uploadsIdx === -1) {
    // External URL (e.g. Unsplash) or data URL — never treat as dedicated storage file to delete
    return true;
  }
  const filename = trimmed.slice(uploadsIdx + '/uploads/'.length).split('?')[0].split('#')[0];
  if (!filename) return true;

  const needle = `/uploads/${filename}`;
  const matchesUrl = (val?: string | null) => typeof val === 'string' && val.includes(needle);

  // 1. Check banners
  if (Array.isArray(db.banners) && db.banners.some(b => matchesUrl(b.image))) return true;

  // 2. Check doors
  if (
    Array.isArray(db.doors) &&
    db.doors.some((d: any) =>
      matchesUrl(d.image) ||
      matchesUrl(d.transparentPngUrl) ||
      matchesUrl(d.videoUrl) ||
      matchesUrl(d.model3d?.modelUrl) ||
      matchesUrl(d.model3d?.glbUrl) ||
      matchesUrl(d.model3d?.textureUrl) ||
      matchesUrl(d.model3d?.frontTextureUrl) ||
      matchesUrl(d.model3d?.backTextureUrl) ||
      matchesUrl(d.model3d?.sideEdgeTextureUrl) ||
      (Array.isArray(d.images) && d.images.some((img: string) => matchesUrl(img)))
    )
  ) {
    return true;
  }

  // 3. Check delivery stories
  if (
    Array.isArray(db.deliveryStories) &&
    db.deliveryStories.some(
      (s: any) =>
        matchesUrl(s.doorThumbnail) ||
        matchesUrl(s.doorPhotoUrl) ||
        matchesUrl(s.deliveryPhoto) ||
        matchesUrl(s.deliveryPhotoUrl) ||
        (Array.isArray(s.images) && s.images.some((img: string) => matchesUrl(img)))
    )
  ) {
    return true;
  }

  // 4. Check articles
  if (
    Array.isArray(db.articles) &&
    db.articles.some((a: any) =>
      matchesUrl(a.image) ||
      matchesUrl(a.featuredImage) ||
      matchesUrl(a.coverImage) ||
      matchesUrl(a.videoUrl) ||
      (Array.isArray(a.galleryImages) && a.galleryImages.some((g: string) => matchesUrl(g)))
    )
  ) {
    return true;
  }

  // 5. Check team members & settings
  if (Array.isArray(db.teamMembers) && db.teamMembers.some(tm => matchesUrl(tm.photo))) return true;
  const storySettings = db.settings?.storySettings as any;
  if (matchesUrl(storySettings?.founderPhoto) || matchesUrl(storySettings?.ownerPhotoUrl)) return true;
  if (
    Array.isArray(storySettings?.workshopGallery) &&
    storySettings.workshopGallery.some((g: any) => matchesUrl(typeof g === 'string' ? g : g?.url))
  ) {
    return true;
  }

  // 6. Check wood references, materials, finishes, frames, hardware
  if (Array.isArray(db.woodReferences) && db.woodReferences.some(w => matchesUrl(w.imageUrl))) return true;
  if (Array.isArray(db.materials) && db.materials.some(m => matchesUrl(m.image))) return true;
  if (Array.isArray(db.finishes) && db.finishes.some(f => matchesUrl(f.image))) return true;
  if (Array.isArray(db.frames) && db.frames.some(fr => matchesUrl(fr.image))) return true;
  if (Array.isArray(db.hardware) && db.hardware.some(h => matchesUrl(h.image))) return true;

  return false;
}


