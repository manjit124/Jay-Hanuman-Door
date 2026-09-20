import fs from 'fs';
import path from 'path';
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
} from '../src/types.ts';

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
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure directories exist safely without crashing in restricted environments
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ Warning: Could not create DATA_DIR, will use in-memory fallback if needed:', err);
}

try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ Warning: Could not create UPLOAD_DIR:', err);
}

export const INITIAL_DATA: DatabaseSchema = {
  doors: [
    {
      id: 'door-1',
      name: 'Royal Sagwan Carved Main Door',
      category: 'Sagwan Door',
      description: 'Handcrafted solid Sagwan (CP Teak) wood main entrance door with intricate floral carving, brass studs, and deep natural polish. Built to withstand all seasons.',
      material: 'Sagwan',
      startingPrice: 15600,
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
    { id: 'mat-1', name: 'Sagwan', ratePerSqFt: 800, description: 'Premium grade Central Province (CP) Teak Wood with natural oil & high moisture resistance', active: true },
    { id: 'mat-2', name: 'Sal Wood', ratePerSqFt: 650, description: 'Heavy, durable Indian hardwood renowned for extreme load-bearing strength', active: true },
    { id: 'mat-3', name: 'Pine', ratePerSqFt: 450, description: 'Treated pine timber with light grain texture, kiln-dried for dimensional stability', active: true },
    { id: 'mat-4', name: 'Plywood', ratePerSqFt: 350, description: 'Boiling Waterproof (BWP) marine grade core with hardwood internal framing', active: true },
    { id: 'mat-5', name: 'Teak Veneer Flush Door', ratePerSqFt: 550, description: 'Solid core flush door with 4mm natural Burma teak wood veneer on both sides', active: true },
  ],
  finishes: [
    { id: 'fin-1', name: 'Normal Polish', ratePerSqFt: 110, description: 'Standard hand-rubbed spirit French polish for natural wood luster', active: true },
    { id: 'fin-2', name: 'Teak Polish', ratePerSqFt: 150, description: 'Deep teak oil stain with double protective sealant coat', active: true },
    { id: 'fin-3', name: 'Melamine', ratePerSqFt: 180, description: 'Hard gloss or matte scratch-resistant coat with UV protection', active: true },
    { id: 'fin-4', name: 'PU Finish', ratePerSqFt: 250, description: 'Premium Polyurethane Italian finish with anti-yellowing & waterproof coating', active: true },
    { id: 'fin-0', name: 'Raw / Unpolished', ratePerSqFt: 0, description: 'Sanded ready for site-polishing or custom client painting', active: true },
  ],
  frames: [
    { id: 'frm-1', name: 'Normal Frame', price: 3500, description: 'Standard 4×2.5 inch section plain timber Chaukhat with clean rebate', active: true },
    { id: 'frm-2', name: 'Designer Frame', price: 11025, description: '5×3 inch section with stepped moldings, beading, and corner grooving', active: true },
    { id: 'frm-3', name: 'Hand Carving Frame', price: 11637, description: 'Heavy 5×3.5 inch pure Sagwan Chaukhat with intricate hand-carved floral border', active: true },
    { id: 'frm-0', name: 'No Frame (Shutter Only)', price: 0, description: 'Only door shutter without Chaukhat frame', active: true },
  ],
  hardware: [
    { id: 'hwd-1', name: 'Aldrop Single', price: 700, description: 'Stainless steel 10-inch single aldrop bolt set with tower bolt and latch', active: true, defaultQty: 1 },
    { id: 'hwd-2', name: 'Heavy Aldrop', price: 1300, description: 'Heavy-gauge forged brass / SS 12-inch security aldrop kit with heavy duty staples', active: true, defaultQty: 1 },
    { id: 'hwd-3', name: 'Antique Heavy', price: 1700, description: 'Antique brass finished royal heavy aldrop with lion crest handles & decorative rosette plates', active: true, defaultQty: 1 },
    { id: 'hwd-4', name: 'Premium Mortise Handle Lock Set', price: 2400, description: 'High-security computer key double throw brass mortise lock with designer handles', active: true, defaultQty: 1 },
    { id: 'hwd-0', name: 'No Hardware Included', price: 0, description: 'Client supplies or fits own hardware', active: true, defaultQty: 0 },
  ],
  banners: [
    {
      id: 'ban-1',
      title: 'Direct From Manufacturer: Premium Sagwan Wood Doors',
      subtitle: 'Precision Handcrafted, Seasoned Timber & Transparent Square Feet Pricing',
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
      buttonText: 'Calculate Door Price',
      buttonAction: 'calculator',
      order: 1,
      active: true,
    },
    {
      id: 'ban-2',
      title: 'Explore 50+ Royal Heritage & Modern Door Designs',
      subtitle: 'From Grand Indian Double Entrances to Sleek Contemporary Fluted Teak',
      image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=80',
      buttonText: 'Browse Door Designs',
      buttonAction: 'gallery',
      order: 2,
      active: true,
    },
    {
      id: 'ban-3',
      title: 'Instant WhatsApp Quotations & Custom Sizes',
      subtitle: 'Get instant itemized cost estimate for any door size in seconds',
      image: 'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1600&q=80',
      buttonText: 'Open Calculator',
      buttonAction: 'calculator',
      order: 3,
      active: true,
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
      name: 'Sample Founder',
      designation: 'Founder & CEO',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      shortBio: 'Sample profile — replace this information from Admin Panel.',
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
};

// Database helper functions
export function getDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      saveDb(INITIAL_DATA);
      return INITIAL_DATA;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_DATA,
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : INITIAL_DATA.users,
      notificationTokens: Array.isArray(parsed.notificationTokens) ? parsed.notificationTokens : [],
      notificationCampaigns: Array.isArray(parsed.notificationCampaigns) ? parsed.notificationCampaigns : [],
      teamMembers: Array.isArray(parsed.teamMembers) ? parsed.teamMembers : INITIAL_DATA.teamMembers,
      articleComments: Array.isArray(parsed.articleComments) ? parsed.articleComments : INITIAL_DATA.articleComments,
      articleCategories: Array.isArray(parsed.articleCategories) ? parsed.articleCategories : INITIAL_DATA.articleCategories,
      articleViews: Array.isArray(parsed.articleViews) ? parsed.articleViews : [],
      articleLikes: Array.isArray(parsed.articleLikes) ? parsed.articleLikes : [],
      articleShares: Array.isArray(parsed.articleShares) ? parsed.articleShares : [],
      enquiries: Array.isArray(parsed.enquiries) ? parsed.enquiries : [],
      articles: Array.isArray(parsed.articles)
        ? parsed.articles.map((art: any, i: number) => {
            const initMatch = INITIAL_DATA.articles.find(a => a.id === art.id) || INITIAL_DATA.articles[i];
            return {
              ...initMatch,
              ...art,
              views: typeof art.views === 'number' ? art.views : (initMatch?.views ?? 250),
              likes: typeof art.likes === 'number' ? art.likes : (initMatch?.likes ?? 18),
              shares: typeof art.shares === 'number' ? art.shares : (initMatch?.shares ?? 9),
              commentCount: typeof art.commentCount === 'number' ? art.commentCount : (initMatch?.commentCount ?? 0),
              status: art.status || (art.published !== false ? 'published' : 'draft'),
              category: art.category || initMatch?.category || 'Door Guide',
              tags: Array.isArray(art.tags) && art.tags.length > 0 ? art.tags : (initMatch?.tags || ['Sagwan Door', 'Door Guide']),
            };
          })
        : INITIAL_DATA.articles,
      settings: {
        ...INITIAL_DATA.settings,
        ...(parsed.settings || {}),
        legalSettings: {
          ...INITIAL_DATA.settings.legalSettings,
          ...(parsed.settings?.legalSettings || {}),
          socialLinks: {
            ...INITIAL_DATA.settings.legalSettings?.socialLinks,
            ...(parsed.settings?.legalSettings?.socialLinks || {}),
          },
        },
        contentProtection: {
          ...INITIAL_DATA.settings.contentProtection,
          ...(parsed.settings?.contentProtection || {}),
        },
      },
    };
  } catch (err) {
    console.error('Error reading database file:', err);
    return INITIAL_DATA;
  }
}

export function saveDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}
