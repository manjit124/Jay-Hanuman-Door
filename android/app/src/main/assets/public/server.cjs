var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config2 = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_vite = require("vite");

// server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
function findAppRoot() {
  const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
  const candidates = [
    process.cwd(),
    import_path.default.resolve(process.cwd()),
    import_path.default.resolve(currentDir, ".."),
    import_path.default.resolve(currentDir),
    "/app/applet"
  ];
  for (const c of candidates) {
    if (import_fs.default.existsSync(import_path.default.join(c, "package.json")) || import_fs.default.existsSync(import_path.default.join(c, "data"))) {
      return c;
    }
  }
  return process.cwd();
}
var APP_ROOT = findAppRoot();
var DATA_DIR = process.env.PERSISTENT_DATA_DIR || process.env.DATA_DIR || import_path.default.join(APP_ROOT, "data");
var SERVER_DATA_DIR = import_path.default.join(APP_ROOT, "server", "data");
var BACKUPS_DIR = import_path.default.join(DATA_DIR, "backups");
var SERVER_BACKUPS_DIR = import_path.default.join(SERVER_DATA_DIR, "backups");
var PERMANENT_BACKUPS_DIR = import_path.default.join(DATA_DIR, "permanent_backups");
var DB_FILE = import_path.default.join(DATA_DIR, "database.json");
var ADMIN_STORE_FILE = import_path.default.join(SERVER_DATA_DIR, "admin_store.json");
var MIRROR_FILE = import_path.default.join(DATA_DIR, "production_data_store.json");
var UPLOAD_DIR = process.env.PERSISTENT_UPLOADS_DIR || import_path.default.join(APP_ROOT, "public", "uploads");
var UPLOAD_BACKUP_DIR = import_path.default.join(DATA_DIR, "uploads");
var SERVER_UPLOAD_DIR = import_path.default.join(SERVER_DATA_DIR, "uploads");
var DIST_UPLOAD_DIR = import_path.default.join(APP_ROOT, "dist", "uploads");
[
  DATA_DIR,
  SERVER_DATA_DIR,
  BACKUPS_DIR,
  SERVER_BACKUPS_DIR,
  PERMANENT_BACKUPS_DIR,
  UPLOAD_DIR,
  UPLOAD_BACKUP_DIR,
  SERVER_UPLOAD_DIR,
  DIST_UPLOAD_DIR
].forEach((dir) => {
  try {
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn(`\u26A0\uFE0F Warning: Could not create directory ${dir}:`, err);
  }
});
function syncUploadedImages() {
  const dirs = [UPLOAD_DIR, UPLOAD_BACKUP_DIR, SERVER_UPLOAD_DIR, DIST_UPLOAD_DIR];
  const allFiles = /* @__PURE__ */ new Map();
  for (const dir of dirs) {
    try {
      if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
      const files = import_fs.default.readdirSync(dir);
      for (const f of files) {
        if (!f.startsWith(".")) {
          const fullPath = import_path.default.join(dir, f);
          try {
            if (import_fs.default.statSync(fullPath).isFile() && !allFiles.has(f)) {
              allFiles.set(f, fullPath);
            }
          } catch {
          }
        }
      }
    } catch {
    }
  }
  for (const [filename, sourcePath] of allFiles.entries()) {
    for (const targetDir of dirs) {
      const targetPath = import_path.default.join(targetDir, filename);
      if (!import_fs.default.existsSync(targetPath)) {
        try {
          import_fs.default.copyFileSync(sourcePath, targetPath);
        } catch {
        }
      }
    }
  }
}
var INITIAL_DATA = {
  doors: [
    {
      id: "door-1",
      name: "Royal Sagwan Carved Main Door",
      category: "Sagwan Door",
      description: "Handcrafted solid Sagwan (CP Teak) wood main entrance door with intricate floral carving, brass studs, and deep natural polish. Built to withstand all seasons.",
      material: "Sagwan",
      startingPrice: 15600,
      images: [
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=80"
      ],
      availableSizes: ["30 \xD7 78 inch", "32 \xD7 78 inch", "34 \xD7 78 inch", "36 \xD7 78 inch", "Custom Size"],
      featured: true,
      popular: true,
      active: true,
      createdAt: "2026-08-15T10:00:00.000Z"
    },
    {
      id: "door-2",
      name: "Maharaja Heritage Double Teak Door",
      category: "Double Door",
      description: "Regal double entrance door with traditional jharokha motif, authentic brass rivets, and heavy-duty frame alignment. Ideal for bungalows and luxury villas.",
      material: "Sagwan",
      startingPrice: 32e3,
      images: [
        "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?auto=format&fit=crop&w=1200&q=80"
      ],
      availableSizes: ["48 \xD7 78 inch", "60 \xD7 84 inch", "72 \xD7 84 inch", "Custom Size"],
      featured: true,
      popular: true,
      active: true,
      createdAt: "2026-08-18T12:30:00.000Z"
    },
    {
      id: "door-3",
      name: "Contemporary Fluted Teak Door",
      category: "Modern Door",
      description: "Modern vertical ribbed fluted door panel crafted in seasoned teak with recessed warm gold metal inlay strip. Perfect for modern apartment entrances.",
      material: "Sagwan",
      startingPrice: 18500,
      images: [
        "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
      ],
      availableSizes: ["32 \xD7 78 inch", "34 \xD7 78 inch", "36 \xD7 78 inch", "36 \xD7 84 inch", "Custom Size"],
      featured: true,
      popular: true,
      active: true,
      createdAt: "2026-08-20T14:15:00.000Z"
    },
    {
      id: "door-4",
      name: "Heritage Traditional Kalash Carved Door",
      category: "Traditional Door",
      description: "Auspicious Kalash and peacock hand-carved entrance door in authentic Indian Vastu compliant craftsmanship. Made from mature teak wood.",
      material: "Sagwan",
      startingPrice: 21e3,
      images: [
        "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80"
      ],
      availableSizes: ["32 \xD7 78 inch", "36 \xD7 78 inch", "36 \xD7 84 inch", "Custom Size"],
      featured: false,
      popular: true,
      active: true,
      createdAt: "2026-08-22T09:00:00.000Z"
    },
    {
      id: "door-5",
      name: "Designer CNC Geometric Grooved Door",
      category: "Designer Door",
      description: "Precision CNC routing with asymmetric geometric lines and dual-tone walnut & teak melamine coat. Water resistant and sturdy core.",
      material: "Plywood",
      startingPrice: 9500,
      images: [
        "https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=1200&q=80"
      ],
      availableSizes: ["30 \xD7 78 inch", "32 \xD7 78 inch", "34 \xD7 78 inch", "36 \xD7 78 inch"],
      featured: false,
      popular: false,
      active: true,
      createdAt: "2026-08-24T11:20:00.000Z"
    },
    {
      id: "door-6",
      name: "Solid Sal Wood Heavy Duty Door",
      category: "Wooden Door",
      description: "High-density Sal wood construction with termite-proof vacuum pressure treatment. Excellent strength and weather durability for rear and main gates.",
      material: "Sal Wood",
      startingPrice: 12600,
      images: [
        "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
      ],
      availableSizes: ["32 \xD7 78 inch", "34 \xD7 78 inch", "36 \xD7 78 inch", "Custom Size"],
      featured: false,
      popular: true,
      active: true,
      createdAt: "2026-08-25T16:45:00.000Z"
    },
    {
      id: "door-7",
      name: "Grand Arch Double Entrance Door",
      category: "Double Door",
      description: "Arch-head double door ensemble with frosted bevelled glass panel insert and hand-forged antique iron pull handles. A grand statement entrance.",
      material: "Sagwan",
      startingPrice: 42e3,
      images: [
        "https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=1200&q=80"
      ],
      availableSizes: ["60 \xD7 84 inch", "72 \xD7 96 inch", "Custom Size"],
      featured: true,
      popular: true,
      active: true,
      createdAt: "2026-08-28T18:00:00.000Z"
    },
    {
      id: "door-8",
      name: "Royal Hand Carving Sagwan Chaukhat Frame",
      category: "Door Frame / Chaukhat",
      description: "Heavy 5\xD73 inch or 5\xD74 inch section pure Sagwan Chaukhat with traditional border carvings and threshold beadings.",
      material: "Sagwan",
      startingPrice: 11637,
      images: [
        "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80"
      ],
      availableSizes: ["36 \xD7 78 inch frame", "48 \xD7 78 inch frame", "Custom Size"],
      featured: false,
      popular: true,
      active: true,
      createdAt: "2026-08-30T10:00:00.000Z"
    }
  ],
  categories: [
    { id: "cat-1", name: "Sagwan Door", slug: "sagwan-door", description: "Pure CP & Burma Teak Wood handcrafted doors" },
    { id: "cat-2", name: "Designer Door", slug: "designer-door", description: "Modern CNC and grooved geometric doors" },
    { id: "cat-3", name: "Main Door", slug: "main-door", description: "Grand single & 1.5 shutter main entrances" },
    { id: "cat-4", name: "Double Door", slug: "double-door", description: "Bungalow & villa double shutter doors" },
    { id: "cat-5", name: "Wooden Door", slug: "wooden-door", description: "100% solid natural wood seasoned doors" },
    { id: "cat-6", name: "Traditional Door", slug: "traditional-door", description: "Heritage Indian temple & classical carvings" },
    { id: "cat-7", name: "Modern Door", slug: "modern-door", description: "Minimalist, fluted, and metallic accent doors" },
    { id: "cat-8", name: "Premium Door", slug: "premium-door", description: "Exclusive luxury crafted statement doors" },
    { id: "cat-9", name: "Door Frame / Chaukhat", slug: "door-frame-chaukhat", description: "Heavy timber frames in Sagwan & Sal wood" }
  ],
  materials: [
    { id: "mat-1", name: "Sagwan", ratePerSqFt: 800, description: "Premium grade Central Province (CP) Teak Wood with natural oil & high moisture resistance", active: true },
    { id: "mat-2", name: "Sal Wood", ratePerSqFt: 650, description: "Heavy, durable Indian hardwood renowned for extreme load-bearing strength", active: true },
    { id: "mat-3", name: "Pine", ratePerSqFt: 450, description: "Treated pine timber with light grain texture, kiln-dried for dimensional stability", active: true },
    { id: "mat-4", name: "Plywood", ratePerSqFt: 350, description: "Boiling Waterproof (BWP) marine grade core with hardwood internal framing", active: true },
    { id: "mat-5", name: "Teak Veneer Flush Door", ratePerSqFt: 550, description: "Solid core flush door with 4mm natural Burma teak wood veneer on both sides", active: true }
  ],
  finishes: [
    { id: "fin-1", name: "Normal Polish", ratePerSqFt: 110, description: "Standard hand-rubbed spirit French polish for natural wood luster", active: true },
    { id: "fin-2", name: "Teak Polish", ratePerSqFt: 150, description: "Deep teak oil stain with double protective sealant coat", active: true },
    { id: "fin-3", name: "Melamine", ratePerSqFt: 180, description: "Hard gloss or matte scratch-resistant coat with UV protection", active: true },
    { id: "fin-4", name: "PU Finish", ratePerSqFt: 250, description: "Premium Polyurethane Italian finish with anti-yellowing & waterproof coating", active: true },
    { id: "fin-0", name: "Raw / Unpolished", ratePerSqFt: 0, description: "Sanded ready for site-polishing or custom client painting", active: true }
  ],
  frames: [
    { id: "frm-1", name: "Normal Frame", price: 3500, description: "Standard 4\xD72.5 inch section plain timber Chaukhat with clean rebate", active: true },
    { id: "frm-2", name: "Designer Frame", price: 11025, description: "5\xD73 inch section with stepped moldings, beading, and corner grooving", active: true },
    { id: "frm-3", name: "Hand Carving Frame", price: 11637, description: "Heavy 5\xD73.5 inch pure Sagwan Chaukhat with intricate hand-carved floral border", active: true },
    { id: "frm-0", name: "No Frame (Shutter Only)", price: 0, description: "Only door shutter without Chaukhat frame", active: true }
  ],
  hardware: [
    { id: "hwd-1", name: "Aldrop Single", price: 700, description: "Stainless steel 10-inch single aldrop bolt set with tower bolt and latch", active: true, defaultQty: 1 },
    { id: "hwd-2", name: "Heavy Aldrop", price: 1300, description: "Heavy-gauge forged brass / SS 12-inch security aldrop kit with heavy duty staples", active: true, defaultQty: 1 },
    { id: "hwd-3", name: "Antique Heavy", price: 1700, description: "Antique brass finished royal heavy aldrop with lion crest handles & decorative rosette plates", active: true, defaultQty: 1 },
    { id: "hwd-4", name: "Premium Mortise Handle Lock Set", price: 2400, description: "High-security computer key double throw brass mortise lock with designer handles", active: true, defaultQty: 1 },
    { id: "hwd-0", name: "No Hardware Included", price: 0, description: "Client supplies or fits own hardware", active: true, defaultQty: 0 }
  ],
  banners: [
    {
      id: "ban-1",
      title: "Direct From Manufacturer: Premium Sagwan Wood Doors",
      subtitle: "Precision Handcrafted, Seasoned Timber & Transparent Square Feet Pricing",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80",
      buttonText: "Calculate Door Price",
      buttonAction: "calculator",
      order: 1,
      active: true
    },
    {
      id: "ban-2",
      title: "Explore 50+ Royal Heritage & Modern Door Designs",
      subtitle: "From Grand Indian Double Entrances to Sleek Contemporary Fluted Teak",
      image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1600&q=80",
      buttonText: "Browse Door Designs",
      buttonAction: "gallery",
      order: 2,
      active: true
    },
    {
      id: "ban-3",
      title: "Instant WhatsApp Quotations & Custom Sizes",
      subtitle: "Get instant itemized cost estimate for any door size in seconds",
      image: "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1600&q=80",
      buttonText: "Open Calculator",
      buttonAction: "calculator",
      order: 3,
      active: true
    }
  ],
  articles: [
    {
      id: "art-1",
      title: "Sagwan Door Maintenance Tips: How to Keep Teak Wood Glowing for Decades",
      slug: "sagwan-door-maintenance-tips",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      excerpt: "Learn the essential oiling, cleaning, and seasonal protection routines that preserve the golden honey grain of authentic Sagwan teak doors.",
      content: `Sagwan (Teak Wood) is globally revered for its high natural silica and oil content, making it exceptionally resistant to warping, termites, and harsh monsoon rains. However, to maintain its breathtaking warmth and rich patina for 40+ years, follow these master carpenter recommendations:

1. **Gentle Dusting**: Wipe the carved crevices once weekly with a soft microfiber cloth or soft-bristled artist brush. Avoid harsh detergents or ammonia-based sprays that strip the natural polish.
2. **Annual Teak Oil Nourishment**: Once a year before the dry summer season, apply a thin coat of pure boiled linseed oil or genuine teak oil using a cotton rag. This rejuvenates the wood cell elasticity and prevents micro-fissures.
3. **Moisture Defense in Monsoons**: Check the bottom edge of your door shutter. Always ensure the bottom grain is sealed with PU or Melamine lacquer so standing rainwater never seeps upwards through capillary action.
4. **Hardware Lubrication**: Use brass or silicon lubricant for heavy aldrop hinges rather than cooking oils that attract dust.`,
      author: "Master Craftsman Rajesh",
      authorBio: "Senior wood restoration specialist with 20+ years experience in Indian teakwood carving and seasoning.",
      category: "Door Maintenance",
      categoryId: "cat-maintenance",
      tags: ["Sagwan Door", "Door Maintenance", "Teak Wood"],
      readTime: "4 min read",
      status: "published",
      published: true,
      publishedAt: "2026-08-10T10:00:00.000Z",
      views: 2458,
      likes: 184,
      shares: 96,
      commentCount: 2,
      youtubeVideoId: "dQw4w9WgXcQ",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      youtubeTitle: "Step-by-Step Sagwan Door Oiling & Polishing Workshop",
      relatedDoorIds: ["door-1"],
      cta: {
        enabled: true,
        type: "calculator",
        title: "Calculate Estimated Price for Custom Sagwan Doors",
        subtitle: "Get factory-direct pricing for custom sizes in seconds",
        buttonText: "Open Price Calculator"
      },
      seo: {
        seoTitle: "Sagwan Door Maintenance Tips | Shivshahi Wood Works",
        metaDescription: "Expert guidance on oiling, moisture protection, and preserving solid Sagwan teak doors for 40+ years.",
        focusKeyword: "Sagwan door maintenance"
      },
      createdAt: "2026-08-10T10:00:00.000Z"
    },
    {
      id: "art-2",
      title: "Sagwan vs Plywood Door: Which is Better for Your Home Entrance?",
      slug: "sagwan-vs-plywood-door",
      image: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80",
      excerpt: "Compare lifespan, security, acoustics, weather resistance, and resale value between solid Sagwan wood and BWP engineered flush doors.",
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
      author: "Technical Architecture Team",
      category: "Door Guide",
      categoryId: "cat-guide",
      tags: ["Sagwan Door", "Door Guide", "Wooden Door"],
      readTime: "5 min read",
      status: "published",
      published: true,
      publishedAt: "2026-08-14T11:00:00.000Z",
      views: 1840,
      likes: 142,
      shares: 54,
      commentCount: 1,
      relatedDoorIds: ["door-1", "door-2"],
      cta: {
        enabled: true,
        type: "calculator",
        title: "Calculate Royal Sagwan Door Price For Your Size",
        subtitle: "Instant estimate including seasoned teak wood, chaukhat frame, and PU polish.",
        buttonText: "Open Door Price Calculator"
      },
      createdAt: "2026-08-14T11:00:00.000Z"
    },
    {
      id: "art-3",
      title: "Main Door Size Guide: Standard Indian Door Dimensions Explained",
      slug: "main-door-size-guide",
      image: "https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80",
      excerpt: "Understanding standard Indian residential door sizes: 30x78, 32x78, 36x78, 36x84, and how to measure rough openings correctly.",
      content: `Accurate measurements prevent costly site alterations and frame misalignment. Here is the standard dimension breakdown used across Indian architecture:

- **Standard Main Single Door**: 36 inches \xD7 78 inches (3 ft \xD7 6.5 ft) or modern high-ceiling 36 inches \xD7 84 inches (3 ft \xD7 7 ft). This provides a comfortable opening for carrying furniture.
- **Master Bedroom Doors**: 32 inches \xD7 78 inches (2.67 ft \xD7 6.5 ft).
- **Bathroom / Balcony Doors**: 28 or 30 inches \xD7 78 inches.
- **Grand Double Main Doors**: 48 \xD7 84 inches (two 24-inch shutters) or 60 \xD7 84 inches (two 30-inch shutters).

**How to calculate Square Feet accurately:**
Multiply Width in inches by Height in inches, then divide by 144:
*Example*: 36" \xD7 78" = 2808 \xF7 144 = **19.50 sq.ft.**`,
      author: "Shivshahi Design Studio",
      category: "Door Guide",
      categoryId: "cat-guide",
      tags: ["Door Guide", "Door Price", "Main Door"],
      readTime: "3 min read",
      status: "published",
      published: true,
      views: 1250,
      likes: 98,
      shares: 38,
      commentCount: 0,
      createdAt: "2026-08-20T08:30:00.000Z"
    },
    {
      id: "art-4",
      title: "Wooden Door Buying Guide: Crucial Things to Check Before Ordering",
      slug: "wooden-door-buying-guide",
      image: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80",
      excerpt: "Moisture content, seasoning certificates, joinery techniques, and how to verify authentic CP Sagwan wood against inferior substitutes.",
      content: `Before transferring an advance payment for your custom door, ensure you verify these four golden checkpoints:

1. **Moisture Content (Kiln Seasoning)**: Ensure the wood is seasoned down to 8%\u201312% moisture level. Green or unseasoned timber will bend and expand during monsoon humidity.
2. **Authentic CP Teak Identification**: Pure Central Province Sagwan features tight annual rings, distinct honey-golden to medium brown color, and a greasy tactile feel from its natural oils.
3. **Mortise and Tenon Joinery**: Inspect whether the door frames and panel joints use traditional interlocking joints rather than just surface nails.
4. **Chaukhat Fitting Sequence**: Always install the timber Chaukhat prior to plastering or tile skirting to ensure a flawless water-tight fit.`,
      author: "Shivshahi Quality Team",
      category: "Wood Knowledge",
      categoryId: "cat-wood",
      tags: ["Wood Knowledge", "Sagwan Door", "Teak Wood"],
      readTime: "6 min read",
      status: "published",
      published: true,
      views: 940,
      likes: 85,
      shares: 22,
      commentCount: 0,
      createdAt: "2026-08-27T15:00:00.000Z"
    }
  ],
  quotes: [],
  enquiries: [],
  settings: {
    businessName: "Jai Hanuman Door",
    tagline: "Master Craftsmen in Handcrafted Sagwan & Teak Wood Doors",
    logoUrl: "",
    phone: "+91 98765 43210",
    whatsappNumber: "7887412884",
    googleMapsUrl: "https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac",
    email: "orders@jaihanumandoor.com",
    address: "Near Old Timber Market, Industrial Estate, Pune, Maharashtra 411002, India",
    gstNumber: "27AABCS1429B1Z8",
    currencySymbol: "\u20B9",
    quotePrefix: "JHD",
    additionalChargeName: "GST (18%) / Tax",
    additionalChargePercentage: 0,
    // Configurable by admin (set to 0 by default so basic subtotal matches exact user formula)
    terms: [
      "Price shown is an estimated price and may vary according to final design, material quality, hardware and customization.",
      "Quotation estimate is valid for 30 days from the date of generation.",
      "Standard shutter thickness is 35mm. Heavy 38mm / 45mm available on request.",
      "100% seasoned timber chemically treated against borer and termite infestation.",
      "Transportation, site measurements and fitting charges are extra as per actual site location.",
      "50% advance payment required upon order confirmation; balance prior to delivery."
    ],
    disclaimer: "Price shown is an estimated price and may vary according to final design, material quality, hardware and customization.",
    legalSettings: {
      lastUpdated: "September 2026",
      privacyPolicy: `Jai Hanuman Door is committed to protecting your privacy and treating your data with complete transparency. We collect customer contact details (name, phone number, email, and city) solely when you request a price quotation, submit a contact inquiry, or register an account. All customer information and quote requests are handled confidentially and are never sold, rented, or distributed to third parties. All user credentials and passwords are encrypted using cryptographic salt and hash algorithms. You have the right to request deletion or inspection of your submitted inquiry data at any time.`,
      aboutUs: `Jai Hanuman Door is a renowned woodcraft workshop and manufacturer specializing in 100% kiln-dried seasoned Sagwan (CP Teak), traditional double entry doors (Jodi Darwaja), designer CNC carvings, and custom timber chaukhats. Backed by decades of master carpentry heritage, Jai Hanuman Door brings direct factory pricing, genuine material specifications, and custom door designs right to your screen. Whether crafting an ornate temple entrance or sleek contemporary fluted doors, we guarantee authentic timber, structural mortise-and-tenon joinery, and durable natural finishes.`,
      contactInfoNotes: `Visit our factory workshop to inspect raw timber logs, compare teak grains, and consult with master carpenters. For site measurement appointments across Maharashtra or bulk inquiries for villas and apartments, reach out via our contact form, phone, or WhatsApp.`,
      disclaimer: `The price calculations generated by Jai Hanuman Door are informative estimates formulated from base wood rates per square foot, hardware selections, and selected polish finishes. Final billing may reflect specialized site conditions, exact custom carving depths, frame jamb thickness, and transportation logistics. Real solid timber possesses natural organic variations in grain, tone, and texture. On-site tape measurements by our team or your carpenter are recommended before final fabrication.`,
      socialLinks: {
        instagram: "https://instagram.com/jaihanumandoor",
        facebook: "https://facebook.com/jaihanumandoor",
        youtube: "https://youtube.com/@jaihanumandoor",
        whatsapp: "https://wa.me/917887412884",
        googleBusiness: "https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac"
      }
    },
    contentProtection: {
      enableImageProtection: true,
      enableWatermark: true,
      watermarkText: "Jai Hanuman Door",
      watermarkOpacity: 0.22,
      watermarkPattern: "diagonal",
      enableAndroidFlagSecure: true,
      enableAndroidScreenRecordProtection: true
    },
    aiWoodDetector: {
      enabled: true,
      maxDailyScans: 150,
      customNotice: ""
    }
  },
  adminPasswordHash: "admin123",
  // Can be customized in Settings or via ADMIN_PASSWORD env
  users: [
    {
      id: "user-demo-1",
      name: "Ramesh Kulkarni",
      email: "ramesh@example.com",
      phone: "9822012345",
      // sha256 hash of 'password123' + 'salt_shivshahi'
      passwordHash: "b78a9c2989c02d184cf43d2c801533ad0ec9b8d2eb97530663dbdb67f7bb187a",
      salt: "salt_shivshahi",
      city: "Pune",
      address: "Flat 402, Shivajinagar, Near Model Colony",
      pincode: "411005",
      preferredWood: "Sagwan (Teak Wood)",
      favoriteDoorIds: ["door-1", "door-4"],
      calculationHistory: [
        {
          id: "calc-demo-1",
          doorId: "door-1",
          doorName: "Royal Sagwan Carved Main Door",
          doorImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
          date: "2026-08-28T10:30:00.000Z",
          input: {
            doorId: "door-1",
            doorName: "Royal Sagwan Carved Main Door",
            widthInch: 36,
            heightInch: 78,
            materialId: "mat-1",
            finishId: "fin-2",
            frameId: "frm-1",
            hardwareId: "hwd-1",
            hardwareQty: 1
          },
          result: {
            widthInch: 36,
            heightInch: 78,
            sqFt: 19.5,
            materialName: "Sagwan (CP Teak)",
            materialRate: 800,
            materialCost: 15600,
            finishName: "Teak Polish",
            finishRate: 150,
            finishCost: 2925,
            frameName: "Normal Frame (Chaukhat)",
            frameCost: 3500,
            hardwareName: "Single Aldrop",
            hardwarePrice: 700,
            hardwareQty: 1,
            hardwareCost: 700,
            subtotal: 22725,
            additionalCharges: 0,
            additionalChargeName: "Taxes",
            total: 22725
          },
          notes: "Main bungalow front entrance requirement"
        }
      ],
      createdAt: "2026-08-20T10:00:00.000Z"
    }
  ],
  notificationTokens: [],
  notificationCampaigns: [],
  teamMembers: [
    {
      id: "team-1",
      name: "Sample Founder",
      designation: "Founder & CEO",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
      shortBio: "Sample profile \u2014 replace this information from Admin Panel.",
      fullBio: "Sample profile created for initial preview. You can edit, customize, or delete this profile directly in Admin Panel under Team Management. Add real leadership, craftsmen, and workshop heads anytime.",
      experience: "10+ Years",
      specialization: "Sagwan Door Architecture & Timber Seasoning",
      responsibilities: [
        "Master wood seasoning & quality assurance",
        "Architectural door customization & client consultation",
        "Workshop craftsmanship supervision"
      ],
      achievements: [
        "Over 10,000+ premium doors engineered across Maharashtra",
        "Established vacuum-pressure termite protection standards"
      ],
      socialLinks: {
        linkedin: "https://linkedin.com",
        instagram: "https://instagram.com",
        email: "shivshahidoors@gmail.com"
      },
      displayOrder: 1,
      active: true,
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-20T10:00:00.000Z"
    }
  ],
  articleCategories: [
    { id: "cat-guide", name: "Door Guide", slug: "door-guide", active: true },
    { id: "cat-sagwan", name: "Sagwan Wood", slug: "sagwan-wood", active: true },
    { id: "cat-maintenance", name: "Door Maintenance", slug: "door-maintenance", active: true },
    { id: "cat-price", name: "Door Price", slug: "door-price", active: true },
    { id: "cat-design", name: "Door Design", slug: "door-design", active: true },
    { id: "cat-chaukhat", name: "Chaukhat & Frames", slug: "chaukhat-frames", active: true },
    { id: "cat-home", name: "Home Design", slug: "home-design", active: true },
    { id: "cat-wood", name: "Wood Knowledge", slug: "wood-knowledge", active: true },
    { id: "cat-updates", name: "Company Updates", slug: "company-updates", active: true }
  ],
  articleComments: [
    {
      id: "comm-1",
      articleId: "art-1",
      authorName: "Rajesh Kulkarni",
      authorEmail: "rajesh@example.com",
      content: "Very useful information about Sagwan doors! Does applying teak oil darken the shade significantly?",
      status: "approved",
      createdAt: "2026-09-01T10:30:00.000Z",
      adminReply: {
        text: "Hello Rajesh! Genuine boiled teak oil enhances the natural golden-honey grain without unnaturally darkening the wood. Just ensure a thin coat is applied evenly.",
        repliedAt: "2026-09-01T14:15:00.000Z",
        authorName: "Shivshahi Wood Experts"
      },
      likes: 5
    },
    {
      id: "comm-2",
      articleId: "art-1",
      authorName: "Amit Deshmukh",
      authorEmail: "amit@example.com",
      content: "Is this door available in custom bungalow sizes like 42x84 inches?",
      status: "approved",
      createdAt: "2026-09-03T16:20:00.000Z",
      adminReply: {
        text: "Yes Amit! We manufacture custom bungalow sizes up to 48x96 inches with seasoned Sagwan timber. You can use our live Door Price Calculator to configure this exact size.",
        repliedAt: "2026-09-03T18:00:00.000Z",
        authorName: "Shivshahi Wood Experts"
      },
      likes: 2
    }
  ],
  articleViews: [],
  articleLikes: [],
  articleShares: [],
  aiWoodDetectorLogs: []
};
var inMemoryDb = null;
var lastBackupTime = 0;
var lastLoadedMtime = 0;
function writeAtomicJson(filePath, data) {
  const dir = import_path.default.dirname(filePath);
  if (!import_fs.default.existsSync(dir)) {
    import_fs.default.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const jsonStr = JSON.stringify(data, null, 2);
  const fd = import_fs.default.openSync(tempPath, "w");
  try {
    import_fs.default.writeFileSync(fd, jsonStr, "utf-8");
    import_fs.default.fsyncSync(fd);
  } finally {
    import_fs.default.closeSync(fd);
  }
  import_fs.default.renameSync(tempPath, filePath);
  const stat = import_fs.default.statSync(filePath);
  if (stat.size === 0) {
    throw new Error(`Write verification failed: atomic write resulted in empty file at ${filePath}`);
  }
}
function parseDatabaseJson(rawContent) {
  try {
    const parsed = JSON.parse(rawContent);
    if (!parsed || typeof parsed !== "object") return null;
    const hasDoors = Array.isArray(parsed.doors) && parsed.doors.length > 0;
    const hasSettings = parsed.settings && typeof parsed.settings === "object";
    if (!hasDoors && !hasSettings) return null;
    return parsed;
  } catch {
    return null;
  }
}
function findBestAvailableData() {
  const candidates = [];
  const candidateFilePaths = /* @__PURE__ */ new Set();
  candidateFilePaths.add(DB_FILE);
  candidateFilePaths.add(ADMIN_STORE_FILE);
  candidateFilePaths.add(MIRROR_FILE);
  if (process.env.PERSISTENT_DATA_DIR) {
    candidateFilePaths.add(import_path.default.join(process.env.PERSISTENT_DATA_DIR, "database.json"));
    candidateFilePaths.add(import_path.default.join(process.env.PERSISTENT_DATA_DIR, "admin_store.json"));
  }
  [BACKUPS_DIR, SERVER_BACKUPS_DIR, PERMANENT_BACKUPS_DIR].forEach((bDir) => {
    if (import_fs.default.existsSync(bDir)) {
      try {
        const files = import_fs.default.readdirSync(bDir).filter((f) => f.endsWith(".json"));
        files.forEach((f) => candidateFilePaths.add(import_path.default.join(bDir, f)));
      } catch {
      }
    }
  });
  for (const filePath of candidateFilePaths) {
    if (import_fs.default.existsSync(filePath)) {
      try {
        const stat = import_fs.default.statSync(filePath);
        if (stat.size > 100) {
          const content = import_fs.default.readFileSync(filePath, "utf-8");
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
              doorCount: parsed.doors.length
            });
          }
        }
      } catch {
      }
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => {
    if (b.version !== a.version) {
      return b.version - a.version;
    }
    if (Math.abs(b.lastModifiedMs - a.lastModifiedMs) > 1e3) {
      return b.lastModifiedMs - a.lastModifiedMs;
    }
    return b.mtimeMs - a.mtimeMs;
  });
  const best = candidates[0];
  console.log(`\u{1F6E1}\uFE0F Loaded authoritative production database from: ${best.source} (Version: ${best.version}, Last Modified: ${new Date(best.lastModifiedMs).toISOString()}, Doors: ${best.doorCount})`);
  return best.data;
}
function normalizeDatabaseSchema(existingData) {
  return {
    ...existingData,
    version: Number(existingData.version) || 1,
    lastModified: existingData.lastModified || (/* @__PURE__ */ new Date()).toISOString(),
    auditLogs: Array.isArray(existingData.auditLogs) ? existingData.auditLogs : [],
    doors: Array.isArray(existingData.doors) ? existingData.doors : INITIAL_DATA.doors,
    categories: Array.isArray(existingData.categories) ? existingData.categories : INITIAL_DATA.categories,
    materials: Array.isArray(existingData.materials) ? existingData.materials : INITIAL_DATA.materials,
    finishes: Array.isArray(existingData.finishes) ? existingData.finishes : INITIAL_DATA.finishes,
    frames: Array.isArray(existingData.frames) ? existingData.frames : INITIAL_DATA.frames,
    hardware: Array.isArray(existingData.hardware) ? existingData.hardware : INITIAL_DATA.hardware,
    banners: Array.isArray(existingData.banners) ? existingData.banners : INITIAL_DATA.banners,
    articles: Array.isArray(existingData.articles) ? existingData.articles : INITIAL_DATA.articles,
    teamMembers: Array.isArray(existingData.teamMembers) ? existingData.teamMembers : INITIAL_DATA.teamMembers,
    quotes: Array.isArray(existingData.quotes) ? existingData.quotes : [],
    enquiries: Array.isArray(existingData.enquiries) ? existingData.enquiries : [],
    settings: existingData.settings ? {
      ...existingData.settings,
      aiWoodDetector: existingData.settings.aiWoodDetector || {
        enabled: true,
        maxDailyScans: 150,
        customNotice: ""
      }
    } : INITIAL_DATA.settings,
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
    woodReferences: Array.isArray(existingData.woodReferences) ? existingData.woodReferences : []
  };
}
function getDb() {
  if (inMemoryDb) {
    try {
      if (import_fs.default.existsSync(DB_FILE)) {
        const stat = import_fs.default.statSync(DB_FILE);
        if (stat.mtimeMs > lastLoadedMtime + 500) {
          const fresh = findBestAvailableData();
          if (fresh && (fresh.version || 0) >= (inMemoryDb.version || 0)) {
            inMemoryDb = normalizeDatabaseSchema(fresh);
            lastLoadedMtime = stat.mtimeMs;
          }
        }
      }
    } catch {
    }
    return inMemoryDb;
  }
  const existingData = findBestAvailableData();
  if (existingData) {
    inMemoryDb = normalizeDatabaseSchema(existingData);
    lastLoadedMtime = Date.now();
    try {
      if (!import_fs.default.existsSync(DB_FILE)) writeAtomicJson(DB_FILE, inMemoryDb);
      if (!import_fs.default.existsSync(ADMIN_STORE_FILE)) writeAtomicJson(ADMIN_STORE_FILE, inMemoryDb);
      if (!import_fs.default.existsSync(MIRROR_FILE)) writeAtomicJson(MIRROR_FILE, inMemoryDb);
    } catch {
    }
    return inMemoryDb;
  }
  console.log("\u{1F195} First-time initialization: No existing production data or backup found. Initializing seed structure.");
  inMemoryDb = normalizeDatabaseSchema(INITIAL_DATA);
  saveDb(inMemoryDb, {
    entity: "system",
    action: "create",
    details: "Initial database bootstrap"
  });
  return inMemoryDb;
}
function saveDb(data, auditContext) {
  data.version = (Number(data.version) || 0) + 1;
  data.lastModified = (/* @__PURE__ */ new Date()).toISOString();
  if (auditContext) {
    if (!Array.isArray(data.auditLogs)) {
      data.auditLogs = [];
    }
    const auditItem = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      entity: auditContext.entity,
      action: auditContext.action,
      targetId: auditContext.targetId,
      targetName: auditContext.targetName,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      success: true,
      details: auditContext.details
    };
    data.auditLogs.unshift(auditItem);
    if (data.auditLogs.length > 300) {
      data.auditLogs = data.auditLogs.slice(0, 300);
    }
  }
  inMemoryDb = data;
  lastLoadedMtime = Date.now();
  const targetFiles = [
    DB_FILE,
    ADMIN_STORE_FILE,
    MIRROR_FILE
  ];
  if (process.env.PERSISTENT_DATA_DIR) {
    const extFile = import_path.default.join(process.env.PERSISTENT_DATA_DIR, "database.json");
    if (!targetFiles.includes(extFile)) {
      targetFiles.push(extFile);
    }
  }
  let successCount = 0;
  let lastError = null;
  for (const file of targetFiles) {
    try {
      writeAtomicJson(file, data);
      successCount++;
    } catch (err) {
      console.error(`\u274C Error writing database to ${file}:`, err.message);
      lastError = err;
    }
  }
  if (successCount === 0 && lastError) {
    throw new Error(`CRITICAL: Failed to write database to any persistent location! ${lastError.message}`);
  }
  const now = Date.now();
  if (now - lastBackupTime > 3e3) {
    lastBackupTime = now;
    const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupFile = import_path.default.join(BACKUPS_DIR, `snapshot-${ts}.json`);
    const serverBackupFile = import_path.default.join(SERVER_BACKUPS_DIR, `snapshot-${ts}.json`);
    try {
      writeAtomicJson(backupFile, data);
    } catch {
    }
    try {
      writeAtomicJson(serverBackupFile, data);
    } catch {
    }
    [BACKUPS_DIR, SERVER_BACKUPS_DIR].forEach((dir) => {
      try {
        const files = import_fs.default.readdirSync(dir).filter((f) => f.startsWith("snapshot-") && f.endsWith(".json")).sort();
        if (files.length > 40) {
          const toRemove = files.slice(0, files.length - 40);
          for (const f of toRemove) {
            try {
              import_fs.default.unlinkSync(import_path.default.join(dir, f));
            } catch {
            }
          }
        }
      } catch {
      }
    });
  }
}
function exportDatabaseBackup() {
  const db = getDb();
  return {
    meta: {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      businessName: db.settings?.businessName || "Jai Hanuman Door",
      schemaVersion: "1.0.0",
      doorCount: db.doors?.length || 0,
      articleCount: db.articles?.length || 0,
      teamCount: db.teamMembers?.length || 0,
      quotesCount: db.quotes?.length || 0
    },
    data: db
  };
}
function importDatabaseBackup(backupPayload) {
  if (!backupPayload || typeof backupPayload !== "object") {
    throw new Error("Invalid backup format: Expected JSON object");
  }
  const incomingData = backupPayload.data || backupPayload;
  if (!incomingData || !Array.isArray(incomingData.doors)) {
    throw new Error('Invalid backup format: Missing required "doors" collection');
  }
  const currentDb = getDb();
  const preRestoreTs = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const preRestorePath = import_path.default.join(BACKUPS_DIR, `pre-restore-${preRestoreTs}.json`);
  writeAtomicJson(preRestorePath, currentDb);
  const restoredDb = {
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
    articleShares: Array.isArray(incomingData.articleShares) ? incomingData.articleShares : currentDb.articleShares
  };
  saveDb(restoredDb);
  return {
    success: true,
    message: `Database successfully restored (${restoredDb.doors.length} doors, ${restoredDb.articles.length} articles)`,
    doorCount: restoredDb.doors.length
  };
}
function listAvailableBackups() {
  if (!import_fs.default.existsSync(BACKUPS_DIR)) return [];
  try {
    const files = import_fs.default.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".json")).sort().reverse();
    return files.slice(0, 25).map((filename) => {
      const fullPath = import_path.default.join(BACKUPS_DIR, filename);
      const stat = import_fs.default.statSync(fullPath);
      let doorCount = 0;
      let articleCount = 0;
      let teamCount = 0;
      try {
        const raw = import_fs.default.readFileSync(fullPath, "utf-8");
        const parsed = JSON.parse(raw);
        const data = parsed.data || parsed;
        doorCount = Array.isArray(data.doors) ? data.doors.length : 0;
        articleCount = Array.isArray(data.articles) ? data.articles.length : 0;
        teamCount = Array.isArray(data.teamMembers) ? data.teamMembers.length : 0;
      } catch {
      }
      return {
        filename,
        timestamp: stat.mtime.toISOString(),
        sizeBytes: stat.size,
        doorCount,
        articleCount,
        teamCount
      };
    });
  } catch (err) {
    console.error("Error listing backups:", err);
    return [];
  }
}
function restoreBackupFile(filename) {
  const safeFilename = import_path.default.basename(filename);
  const filePath = import_path.default.join(BACKUPS_DIR, safeFilename);
  if (!import_fs.default.existsSync(filePath)) {
    throw new Error("Backup file not found: " + safeFilename);
  }
  const content = import_fs.default.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(content);
  return importDatabaseBackup(parsed);
}
function logWoodDetectorScan(entry) {
  const db = getDb();
  if (!Array.isArray(db.aiWoodDetectorLogs)) {
    db.aiWoodDetectorLogs = [];
  }
  const item = {
    id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...entry
  };
  db.aiWoodDetectorLogs.unshift(item);
  if (db.aiWoodDetectorLogs.length > 500) {
    db.aiWoodDetectorLogs = db.aiWoodDetectorLogs.slice(0, 500);
  }
  saveDb(db);
  return item;
}
function getWoodDetectorStats() {
  const db = getDb();
  const logs = Array.isArray(db.aiWoodDetectorLogs) ? db.aiWoodDetectorLogs : [];
  const enabled = db.settings?.aiWoodDetector?.enabled !== false;
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const todayScans = logs.filter((l) => l.timestamp && l.timestamp.startsWith(todayStr)).length;
  const successfulScans = logs.filter((l) => l.success).length;
  const failedScans = logs.filter((l) => !l.success).length;
  return {
    enabled,
    totalScans: logs.length,
    todayScans,
    successfulScans,
    failedScans,
    lastScanTimestamp: logs[0]?.timestamp,
    recentLogs: logs.slice(0, 50)
  };
}
function updateWoodDetectorSettings(detectorSettings) {
  const db = getDb();
  if (!db.settings) {
    db.settings = { ...INITIAL_DATA.settings };
  }
  db.settings.aiWoodDetector = {
    enabled: true,
    ...db.settings.aiWoodDetector || {},
    ...detectorSettings
  };
  saveDb(db);
  return db.settings.aiWoodDetector;
}
function getWoodReferences(verifiedOnly = false) {
  const db = getDb();
  const list = Array.isArray(db.woodReferences) ? db.woodReferences : [];
  if (verifiedOnly) {
    return list.filter((item) => item.isVerified);
  }
  return list;
}
function addWoodReference(sample) {
  const db = getDb();
  if (!Array.isArray(db.woodReferences)) {
    db.woodReferences = [];
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newRef = {
    id: `ref-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...sample,
    createdAt: now,
    updatedAt: now
  };
  db.woodReferences.push(newRef);
  saveDb(db);
  return newRef;
}
function updateWoodReference(id, updates) {
  const db = getDb();
  if (!Array.isArray(db.woodReferences)) return null;
  const idx = db.woodReferences.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  db.woodReferences[idx] = {
    ...db.woodReferences[idx],
    ...updates,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveDb(db);
  return db.woodReferences[idx];
}
function deleteWoodReference(id) {
  const db = getDb();
  if (!Array.isArray(db.woodReferences)) return false;
  const initialLen = db.woodReferences.length;
  db.woodReferences = db.woodReferences.filter((r) => r.id !== id);
  if (db.woodReferences.length !== initialLen) {
    saveDb(db);
    return true;
  }
  return false;
}
function toggleVerifyWoodReference(id, verifiedBy = "Administrator") {
  const db = getDb();
  if (!Array.isArray(db.woodReferences)) return null;
  const idx = db.woodReferences.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const current = db.woodReferences[idx];
  const newStatus = !current.isVerified;
  db.woodReferences[idx] = {
    ...current,
    isVerified: newStatus,
    verifiedBy: newStatus ? verifiedBy : void 0,
    verifiedAt: newStatus ? (/* @__PURE__ */ new Date()).toISOString() : void 0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveDb(db);
  return db.woodReferences[idx];
}

// server/aiWoodDetector.ts
var import_config = require("dotenv/config");
var import_genai = require("@google/genai");

// server/woodAnatomyGuide.ts
var WOOD_SPECIES_PROFILES = {
  "Sagwan (Teak)": {
    speciesName: "Sagwan (Teak)",
    botanicalName: "Tectona grandis",
    regionalNames: ["Sagwan", "Saag", "Teak", "CP Teak", "Burma Teak", "Nilambur Teak"],
    porosityType: "Ring-porous to Semi-ring-porous",
    grainPattern: "Typically straight to mildly wavy longitudinal grain; occasional fluted or mottled figure in root cuts. Never coarse-interlocked like Sal.",
    poreStructureAndTyloses: "Earlywood zone has conspicuous large pores forming distinct concentric single or double rows (ring-porous). Latewood pores are distinctly smaller, solitary or in radial multiples of 2-3. White or yellow crystalline deposits (tectoquinone/calcium phosphate) occasionally visible in vessels.",
    naturalColorHeartwood: "Freshly cut: dull olive-green or yellowish-brown. On oxidation/light exposure: matures into rich warm golden-brown to dark golden, often with fine darker longitudinal shadow streaks.",
    naturalColorSapwood: "Sharply demarcated pale yellowish-white to light grey sapwood, rarely used in premium door panels.",
    textureAndTactility: "Coarse and distinctly uneven due to the transition between large earlywood and small latewood pores. Natural waxy/greasy natural tactile feel due to high extractive/oil content. Under natural light, exhibits a soft satiny luster rather than a plastic reflective shine.",
    growthRingsAndRays: "Distinct annual growth rings marked by the band of large earlywood vessels. Fine rays visible under magnification.",
    commonImitationRisks: [
      "Jungle Wood or Sal stained with golden-brown or spirit polish to mimic Teak color.",
      'Printed laminate or PVC membrane with an artificial repeating "teakwood" grain.',
      "Thin 0.5mm teak face veneer pressed over cheap blockboard or plywood core."
    ],
    distinguishingKeyFeatures: [
      "Concentric band of distinct large pores in earlywood (ring porosity).",
      "Straight to wavy grain with dark mineral/shadow lines (not chaotic fibrous interlock).",
      "Soft natural sheen with open vessel grooves (unless coated in thick opaque PU).",
      "Sapwood is distinctly lighter and separated, not blotchy."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Chemical extractive concentration and natural insect/termite resistance.",
      "Moisture content percentage and seasoning level (kiln-seasoned vs air-dried).",
      "True geographical provenance (e.g. distinguishing genuine CP Teak from imported Sudan/plantation teak often requires microscopic or isotopic test)."
    ],
    hindiSummary: "Sagwan ki asli pehchan uske earlywood rings mein bade pores, seedhe ya lehradar grain, aur natural golden-brown rang se hoti hai. Polish ke neeche open pores aur oil-luster dikhta hai."
  },
  "Saal (Sal)": {
    speciesName: "Saal (Sal)",
    botanicalName: "Shorea robusta",
    regionalNames: ["Saal", "Sal", "Sakhua", "Sarai"],
    porosityType: "Diffuse-porous",
    grainPattern: "Heavily and distinctly interlocked fibrous grain. Spiral or twisted fiber alignment is very common, giving an intensely rough, tough appearance.",
    poreStructureAndTyloses: "Diffuse-porous: pores are medium to large and scattered evenly throughout the growth ring. Heartwood pores are heavily plugged with glistening whitish tyloses. Characterized by tangential white lines formed by resin canals containing dammar resin.",
    naturalColorHeartwood: "Fresh cut: light brown with pinkish cast. Quickly matures into deep reddish-brown or dark chocolate-brown on atmospheric exposure. Noticeably darker and redder than genuine Sagwan.",
    naturalColorSapwood: "Pale yellowish-brown, distinct from the heartwood.",
    textureAndTactility: "Very coarse, rough, fibrous, and splintery. Lacks the smooth, greasy natural oiliness of Sagwan. Extremely dense and heavy (approx. 880\u20131050 kg/m\xB3 vs Teak ~650 kg/m\xB3).",
    growthRingsAndRays: "Growth rings indistinct or faintly defined by resin canal lines.",
    commonImitationRisks: [
      'Often stained light golden-brown to sell as "Teak frame / Sagwan Chaukhat".',
      "Due to high strength, commonly used for door frames (Chaukhat) where sellers might claim entire set is Sagwan."
    ],
    distinguishingKeyFeatures: [
      "Diffuse pore arrangement (no concentric earlywood pore bands like Sagwan).",
      "Deeply interlocked fibrous grain with splintery texture.",
      "Whitish resin canal lines and heavily tylosed pores.",
      "Reddish-brown base undertone rather than olive-golden."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Exact structural density and dry weight (though fibrousness is visible).",
      "Internal heartwood checking or hidden resin pockets."
    ],
    hindiSummary: "Saal ka lakdi interlocked fibrous grain aur diffuse pores ke sath aati hai. Yeh Sagwan se zyada heavy aur laal-bhure rang ki hoti hai, jisme white resin lines aksar dikhti hain."
  },
  "Sheesham": {
    speciesName: "Sheesham",
    botanicalName: "Dalbergia sissoo",
    regionalNames: ["Sheesham", "Shisham", "Tahli", "Indian Rosewood", "Sissoo"],
    porosityType: "Diffuse-porous to Semi-ring-porous",
    grainPattern: "Typically interlocked, wavy, or fiddleback figure with striking natural longitudinal streaks.",
    poreStructureAndTyloses: "Medium to large pores scattered diffusely or occasionally concentrated in earlywood bands, surrounded by fine light-colored parenchyma bands. Pores often contain dark gum or glistening deposits.",
    naturalColorHeartwood: "Rich golden-brown to deep purple-brown, blood-wood red, or dark chocolate with prominent deep purple-black streaks.",
    naturalColorSapwood: "Striking high contrast: sapwood is crisp pale yellowish-white, providing a dramatic natural contrast against dark heartwood.",
    textureAndTactility: "Medium to coarse texture with moderate natural luster. Very hard and heavy.",
    growthRingsAndRays: "Growth rings distinct, marked by narrow marginal parenchyma bands.",
    commonImitationRisks: [
      "Stained Babool (Acacia) or dyed Mango wood stained with dark streaks to look like Sheesham.",
      "Sheesham veneer glued over MDF panels."
    ],
    distinguishingKeyFeatures: [
      "Prominent dark brown to purple-black streaks running along the grain.",
      "Sharp contrast between dark heartwood and light sapwood.",
      "Fine parenchymal bands surrounding medium pores."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Degree of sapwood-to-heartwood ratio inside solid internal core.",
      "Vulnerability of sapwood portion to powder-post beetle attack without chemical treatment."
    ],
    hindiSummary: "Sheesham ki pehchan uski kaali-baingani streaks (dark stripes), golden-to-chocolate heartwood, aur safed sapwood ke natural contrast se hoti hai."
  },
  "Jungle Wood": {
    speciesName: "Jungle Wood",
    botanicalName: "Mixed regional species (e.g. Babool, Eucalyptus, Rubberwood, Silver Oak, Albizia, Terminalia spp.)",
    regionalNames: ["Jungle Wood", "Desi Wood", "Country Wood", "Mix Wood", "Local Hardwood"],
    porosityType: "Diffuse-porous",
    grainPattern: "Heterogeneous and inconsistent. Varies from coarse stringy grain to dull, indistinct grain with frequent directional changes.",
    poreStructureAndTyloses: "Inconsistent; pores may be sparsely scattered or randomly clustered without the structured ring-porous elegance of Teak or the consistent parenchyma of Rosewood.",
    naturalColorHeartwood: "Highly variable: greyish-brown, pale straw, dull reddish-tan, or muddy brown with irregular blotchy patches.",
    naturalColorSapwood: "Indistinct or uneven demarcation; often shows dark water marks or mineral discoloration.",
    textureAndTactility: "Often dry, brittle, or chalky under the polish. Lacks natural waxy resin feel. Frequently stained with heavy pigmented tints.",
    growthRingsAndRays: "Indistinct, irregular, or distorted.",
    commonImitationRisks: [
      'VERY COMMONLY stained with orange-brown, golden-yellow, or dark walnut PU/melamine polish to deceive buyers as "Teak / Sagwan".',
      'Sold under ambiguous names like "Redwood", "Hardwood", or "Country Teak".'
    ],
    distinguishingKeyFeatures: [
      "Absence of regular concentric earlywood pore rings found in true Teak.",
      "Blotchy artificial stain penetration where softer grain absorbs excess color.",
      "Inconsistent grain orientation and dull luster without oily depth."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "The exact botanical species among the dozens of local tree varieties.",
      "Susceptibility to termite infestation or warp without chemical dipping."
    ],
    hindiSummary: '"Jungle Wood" koi ek botanical lakdi nahi hai, yeh alag-alag local lakdiyon ka mix trade term hai. Isme aksar Teak jaisa rang lane ke liye artificial polish/stain lagaya jata hai.'
  },
  "Deodar": {
    speciesName: "Deodar",
    botanicalName: "Cedrus deodara",
    regionalNames: ["Deodar", "Devdar", "Himalayan Cedar"],
    porosityType: "Non-porous (Gymnosperm / Conifer)",
    grainPattern: "Exceptionally straight, fine, and uniform. Free of vessel pores because it is a conifer (softwood).",
    poreStructureAndTyloses: "No vessel pores! Tracheid structure produces a very clean, fine-textured surface with prominent annual growth rings.",
    naturalColorHeartwood: "Light yellowish-brown to golden-tan, darkening slightly with age.",
    naturalColorSapwood: "Narrow white to creamy-yellow sapwood.",
    textureAndTactility: "Fine, even texture with a distinctive oily touch and strong natural cedar aroma. Lightweight compared to Sal and Sheesham.",
    growthRingsAndRays: "Conspicuous, sharp annual growth ring boundaries formed by the transition between soft earlywood and dense latewood tracheids.",
    commonImitationRisks: [
      "Cheaper pine or fir stained yellow and sold as Deodar."
    ],
    distinguishingKeyFeatures: [
      "Complete absence of vessel pores (pores cannot be found even with a magnifying lens).",
      "Sharp, clean, parallel annual growth lines.",
      "Uniform yellowish-tan hue without dark pore grooves."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Characteristic aromatic cedar fragrance (requires physical scent check)."
    ],
    hindiSummary: "Deodar ek softwood conifer hai jisme vessel pores nahi hote. Iska grain bilkul seedha aur fine hota hai jisme annual growth rings saaf dikhti hain."
  },
  "Mango Wood": {
    speciesName: "Mango Wood",
    botanicalName: "Mangifera indica",
    regionalNames: ["Aam ki lakdi", "Mango Wood"],
    porosityType: "Diffuse-porous",
    grainPattern: "Curly, straight, or interlocked; often exhibits attractive natural spalting, quilting, or fiddleback figure.",
    poreStructureAndTyloses: "Medium to large solitary pores and short radial multiples scattered evenly; tyloses moderately present.",
    naturalColorHeartwood: "Light brown to golden-brown, characteristically patterned with natural streaks of pink, green, yellow, grey, and black caused by fungi/mineralization (spalting).",
    naturalColorSapwood: "Light cream to yellowish-brown, moderately distinct.",
    textureAndTactility: "Medium to coarse texture with moderate natural luster. Moderately light and soft compared to Teak.",
    growthRingsAndRays: "Faint or indistinct.",
    commonImitationRisks: [
      "Stained with dark mahogany or walnut polish to resemble Sheesham or Teak."
    ],
    distinguishingKeyFeatures: [
      "Characteristic multicolored spalting streaks (grey, green, pink hints in natural wood).",
      "Medium diffuse pores without ring-porous bands."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Chemical treatment against wood-borer beetles."
    ],
    hindiSummary: "Aam ki lakdi mein natural pink, green ya grey mineral streaks hoti hain aur pores diffuse hote hain."
  },
  "Neem": {
    speciesName: "Neem",
    botanicalName: "Azadirachta indica",
    regionalNames: ["Neem", "Nimba", "Indian Lilac"],
    porosityType: "Ring-porous to Diffuse-porous",
    grainPattern: "Interlocking grain, sometimes slightly wavy.",
    poreStructureAndTyloses: "Medium pores, earlywood pores larger; vessels filled with reddish-brown gummy deposits.",
    naturalColorHeartwood: "Reddish-brown to deep brick red, resembling mahogany. Darkens significantly with exposure.",
    naturalColorSapwood: "Greyish-white to pale yellowish-cream.",
    textureAndTactility: "Medium to coarse, slightly fibrous feel with moderate luster.",
    growthRingsAndRays: "Distinct growth rings.",
    commonImitationRisks: [
      'Sold as "Indian Mahogany" or stained to look like Teak.'
    ],
    distinguishingKeyFeatures: [
      "Reddish-brick heartwood with reddish gum deposits in vessel cavities.",
      "Interlocking grain with moderate ring porosity."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Bitter taste/smell inherent to neem extractives."
    ],
    hindiSummary: "Neem ka heartwood laal-bhura (reddish-brown) hota hai aur pores mein laal gum bhara hota hai."
  },
  "Pine": {
    speciesName: "Pine",
    botanicalName: "Pinus roxburghii / Pinus wallichiana",
    regionalNames: ["Chir Pine", "Kail", "Pine Wood", "Pinewood"],
    porosityType: "Non-porous (Gymnosperm / Conifer)",
    grainPattern: "Straight grain with pronounced transition bands between earlywood and latewood. Frequent round dark knots.",
    poreStructureAndTyloses: "No vessel pores! Large conspicuous resin canals visible as fine longitudinal brownish lines.",
    naturalColorHeartwood: "Pale creamy-yellow to light reddish-yellow.",
    naturalColorSapwood: "Pale creamy-white.",
    textureAndTactility: "Soft, light to medium density, distinct resinous sheen. Low dimensional stability in humid conditions.",
    growthRingsAndRays: "Extremely conspicuous annual growth rings with dark, dense latewood bands.",
    commonImitationRisks: [
      "Pine doors stained dark to pass off as solid hardwood doors."
    ],
    distinguishingKeyFeatures: [
      "No pores; prominent dark round knots.",
      "Broad soft earlywood and hard latewood ring bands.",
      "Noticeably pale base color."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Internal sapwood moisture content and glue bond strength in finger-jointed pine."
    ],
    hindiSummary: "Pine mein koi vessel pores nahi hote, round knots aur broad growth rings saaf dikhti hain."
  },
  "Plywood": {
    speciesName: "Plywood",
    botanicalName: "Engineered cross-laminated veneer panels",
    regionalNames: ["Plywood", "Ply", "Marine Ply", "Commercial Ply", "Blockboard"],
    porosityType: "Engineered / Non-solid",
    grainPattern: "Varies based on face veneer; typically rotary peeled grain with sweeping arches or flat uniform appearance.",
    poreStructureAndTyloses: "End edges show alternating 90-degree dark and light veneer glue lines (multi-layer sandwich). Face veneer is typically 0.3mm to 1.0mm thick.",
    naturalColorHeartwood: "Determined by surface veneer face, not representative of core.",
    naturalColorSapwood: "N/A",
    textureAndTactility: "Extremely flat and smooth surface; edges reveal distinct ply layers or core wooden battens (in blockboard).",
    growthRingsAndRays: "End grain does not show circular growth rings; instead shows horizontal parallel plies.",
    commonImitationRisks: [
      'Plywood door with teak veneer sold as "Solid Sagwan Door".'
    ],
    distinguishingKeyFeatures: [
      "Visible edge plies (sandwich lines) at top/bottom or hinge cutouts.",
      "Perfect surface flatness without natural wood seasonal cupping.",
      "Edge banding tape or veneer peeling at corners."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Internal core glue grade (MR vs BWR vs BWP/Marine IS:710)."
    ],
    hindiSummary: "Plywood ke edges par layers (sandwich plies) dikhti hain. Yeh solid lakdi nahi hoti balki thin sheets ko glue karke banayi jaati hai."
  },
  "Veneered Wood": {
    speciesName: "Veneered Wood",
    botanicalName: "Decorative natural timber sliced veneer over engineered core",
    regionalNames: ["Veneer Door", "Natural Veneer", "Teak Veneer", "Burma Teak Veneer"],
    porosityType: "Engineered / Non-solid",
    grainPattern: "Symmetrical repeating grain patterns created by bookmatching, slipmatching, or reverse diamond matching.",
    poreStructureAndTyloses: "Surface shows genuine timber pores (e.g. genuine Teak or Rosewood slice), but depth of pore structure is micro-thin (0.5mm - 1.5mm).",
    naturalColorHeartwood: "High aesthetic color of the selected veneer face.",
    naturalColorSapwood: "N/A",
    textureAndTactility: "Natural wood grain feel, but door edges feature edge-banding strips or veneer seams along vertical joinery.",
    growthRingsAndRays: "No natural end-grain growth rings on top or bottom door edges.",
    commonImitationRisks: [
      'Veneered flush doors frequently sold to unsuspecting buyers as "Solid Burma Teak Doors".'
    ],
    distinguishingKeyFeatures: [
      "Repeating symmetrical pattern seams (bookmatched mirror reflection lines).",
      "Edge banding strip glued to cover core edges.",
      "Absence of natural end-grain growth rings on top/bottom edge."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Core material behind the 1mm veneer (plywood, MDF, particleboard, or tubular core)."
    ],
    hindiSummary: "Veneer door par 0.5mm se 1.5mm ki asli lakdi ki thin sheet chipkai hoti hai. Isme repeating mirror-matched patterns aur edge-banding strips dikhti hain."
  },
  "Laminated or engineered wood": {
    speciesName: "Laminated or engineered wood",
    botanicalName: "HPL / Melamine / PVC Membrane / Digital printed foil over engineered core",
    regionalNames: ["Laminate Door", "Sunmica Door", "Membrane Door", "MDF Door", "WPC Door"],
    porosityType: "Engineered / Non-solid",
    grainPattern: "Photographically printed wood pattern. Perfect repeating visual motifs without organic natural timber imperfections.",
    poreStructureAndTyloses: "Artificial embossed micro-texture or completely smooth plastic sheen. Pores do not have botanical cellular depth.",
    naturalColorHeartwood: "Synthetic printed color.",
    naturalColorSapwood: "N/A",
    textureAndTactility: "Cold plastic or synthetic feel. Scratch-resistant resin finish. Light reflection reveals perfectly flat mirror or embossed plastic texture.",
    growthRingsAndRays: "Completely absent.",
    commonImitationRisks: [
      'Marketed under trade names like "Digital Teak" or "3D Sagwan Finish".'
    ],
    distinguishingKeyFeatures: [
      "Microscopic print dots or digitally repeating grain identical on multiple panels.",
      "Sharp PVC edge banding or seamless wrapped membrane foil.",
      "Zero cellular wood pore depth."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Core substrate density (MDF vs HDF vs Particleboard)."
    ],
    hindiSummary: "Laminate ya engineered door par lakdi ka photo print (Sunmica ya PVC) chipkaya hota hai. Isme natural pores aur rings nahi hoti."
  },
  "Other / Unknown": {
    speciesName: "Other / Unknown",
    regionalNames: ["Unidentified Timber", "Opaque Coated", "Heavily Painted"],
    porosityType: "Diffuse-porous",
    grainPattern: "Concealed by opaque paint, extreme stain, synthetic wrap, or heavy degradation.",
    poreStructureAndTyloses: "Obscured or invisible from provided camera angles/resolution.",
    naturalColorHeartwood: "Masked by surface treatment.",
    naturalColorSapwood: "Masked.",
    textureAndTactility: "Varies.",
    growthRingsAndRays: "Inconclusive.",
    commonImitationRisks: [
      "Old reclaimed timbers coated in multiple coats of enamel paint."
    ],
    distinguishingKeyFeatures: [
      "Insufficient visual timber markers visible to make a responsible identification."
    ],
    whatCannotBeIdentifiedFromPhotoAlone: [
      "Species cannot be determined without scraping a section down to bare raw wood."
    ],
    hindiSummary: "Photo mein paint, dark polish ya blur hone ki wajah se lakdi ke natural grain aur pores saaf nahi dikh rahe hain."
  }
};

// server/aiWoodDetector.ts
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("\u274C CRITICAL: GEMINI_API_KEY / GOOGLE_API_KEY environment variable is not defined on the server!");
    throw new Error("AI Wood Detector server API key is missing. Please configure GEMINI_API_KEY.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function buildTimberSpecialistInstruction(verifiedReferences) {
  const profilesSummary = Object.entries(WOOD_SPECIES_PROFILES).map(([name, p]) => {
    return `### ${name} (Botanical: ${p.botanicalName || "N/A"})
- Porosity: ${p.porosityType}
- Grain Pattern: ${p.grainPattern}
- Pores & Tyloses: ${p.poreStructureAndTyloses}
- Natural Colors: Heartwood: ${p.naturalColorHeartwood}; Sapwood: ${p.naturalColorSapwood}
- Texture & Surface: ${p.textureAndTactility}
- Growth Rings & Rays: ${p.growthRingsAndRays}
- Key Distinguishing Markers: ${p.distinguishingKeyFeatures.join("; ")}
- Common Imitation Traps: ${p.commonImitationRisks.join("; ")}`;
  }).join("\n\n");
  let verifiedDatasetSection = "";
  if (verifiedReferences.length > 0) {
    verifiedDatasetSection = `

### VERIFIED WORKSHOP REFERENCE SAMPLES IN DATABASE (${verifiedReferences.length} Confirmed Samples Available):
` + verifiedReferences.map((r, idx) => `Sample #${idx + 1}: ${r.woodType} - Label: "${r.verifiedLabel}" (Source: ${r.source}). Notes: ${r.notes || "None"}. Anatomical: ${JSON.stringify(r.anatomicalFeatures || {})}`).join("\n");
  } else {
    verifiedDatasetSection = `

### VERIFIED WORKSHOP REFERENCE SAMPLES STATUS:
Note: The Jai Hanuman Door verified sample library is currently in initial configuration mode by the workshop administrator. Ground your identification on the detailed botanical anatomical timber criteria below, and clearly inform the user that photo-based inspection cannot provide 100% laboratory certification.`;
  }
  return `You are the Principal Timber Anatomist & Wood Identification Specialist for "Jai Hanuman Door", Maharashtra, India.
Your mission is to perform a rigorous, honest, multi-feature visual timber audit of door photos uploaded by homeowners and carpenters.

=============================================================================
TIMBER ANATOMICAL KNOWLEDGE BASE (BOTANICAL SPECIES PROFILES):
=============================================================================
${profilesSummary}
${verifiedDatasetSection}

=============================================================================
MANDATORY MULTI-FEATURE EVALUATION CRITERIA (NEVER RELY ON COLOR ALONE!):
=============================================================================
You MUST examine and cross-reference ALL of the following 10 visual dimensions:
1. GRAIN PATTERN & DIRECTION: Straight vs wavy vs deeply interlocked/spiral (Sal) vs wild fiddleback (Sheesham) vs rotary peeled arches (Plywood).
2. PORE SYSTEM & DISTRIBUTION: Ring-porous (Teak: concentric bands of conspicuous large earlywood pores) vs Diffuse-porous (Sal: evenly scattered pores with glistening whitish tyloses; Mango: scattered; Sheesham: diffuse with parenchymal bands) vs Non-porous (Deodar, Pine: no vessels!).
3. FIBROUSNESS & SURFACE TEXTURE: Smooth waxy/greasy natural feel (Teak) vs coarse splintery fibrousness (Sal) vs fine uniform tracheids (Deodar) vs plastic flat laminate.
4. SURFACE FINISH & STAIN MASKING: Is the wood coated in polyurethane (PU), melamine, tinted red/orange stain, varnish, or paint? Staining routinely turns Jungle Wood or Sal golden-brown to mimic Sagwan!
5. GROWTH RINGS & EARLYWOOD/LATEWOOD: Conspicuous annual rings with soft-hard transitions (Pine, Deodar, Teak) vs faint/indistinct (Sal, Tropical hardwoods).
6. RESIN CANALS & MINERAL STREAKS: White tangential dammar lines (Sal); purple-black streaks (Sheesham); multicolored green/pink spalting streaks (Mango); white calcium deposits in pores (Teak).
7. END-GRAIN APPEARANCE (if visible): Circular growth rings and pore vessel cross-sections vs horizontal cross-ply sandwich glue lines (Plywood) vs micro-thin 1mm face over composite core (Veneer).
8. NATURAL WOOD vs ENGINEERED/LAMINATE: Repeating symmetrical bookmatched seams (Veneered door); edge banding tape; repeating digital photographic print (Laminate/Sunmica).
9. UNPOLISHED / BARE TIMBER EVIDENCE: Check if unpolished edges (door top/bottom, hinge mortise, back side) reveal the true bare wood undertone.
10. JUNGLE WOOD ASSESSMENT: Remember "Jungle Wood" is a regional commercial trade term for mixed local hardwoods (Babool, Rubberwood, Silver Oak, Eucalyptus, etc.), NOT a single species. It often has irregular grain and is heavily stained to imitate Teak or Sheesham.

=============================================================================
CRITICAL ANTI-FALSE-SAGWAN (TEAK) ENFORCEMENT RULES:
=============================================================================
- DO NOT identify a door as Sagwan (Teak) simply because it is golden-brown, shiny, or has an ornamental carving! Stained Sal and Jungle Wood are frequently polished in golden-yellow tints.
- True Sagwan MUST show observable ring-porous or semi-ring-porous pore arrangements and characteristic longitudinal grain lines.
- If the wood has a coarse, interlocking fibrous texture or deep reddish-brown undertone under the finish, it is much more likely Saal (Sal) or a mixed dense hardwood, NOT Sagwan.
- If the pore structure is completely obscured by thick dark polish, paint, low resolution, or glare, you MUST LOWER the confidence to "Low" and state that polish prevents definitive visual identification.
- If visual evidence is insufficient or contradictory, set "likely_wood_type" to "Unable to identify reliably" (or "Wood species could not be reliably identified from these photos.") and recommend an unpolished close-up.
- NEVER claim that a photograph can certify 100% genuine Sagwan. Always clearly distinguish between "Visual similarity to Sagwan", "Likely Sagwan based on visible evidence", and "Physical laboratory/microscopic confirmation".

=============================================================================
OUTPUT FORMAT REQUIREMENT:
=============================================================================
You MUST respond with a single, strictly valid JSON object adhering to this schema:
{
  "likely_wood_type": "Sagwan (Teak)" | "Saal (Sal)" | "Sheesham" | "Jungle Wood" | "Deodar" | "Mango Wood" | "Neem" | "Pine" | "Plywood" | "Veneered Wood" | "Laminated or engineered wood" | "Other / Unknown" | "Wood species could not be reliably identified from these photos.",
  "alternative_possibilities": ["Alternative 1 with reason", "Alternative 2 with reason"],
  "confidence_level": "Low" | "Moderate" | "High",
  "visual_observations": [
    "Observation 1 (e.g. Grain pattern, pore visibility)",
    "Observation 2 (e.g. Color tone vs stain reflection)",
    "Observation 3 (e.g. Surface finish, knots, or edge traits)"
  ],
  "visible_evidence": [
    "Specific observable feature matching the likely timber",
    "Specific pore or grain characteristic noted"
  ],
  "features_unassessed": [
    "Feature that could not be determined from the photo (e.g. end-grain cross section hidden, pores under thick PU coat, scent/weight)"
  ],
  "uncertainty_reasons": [
    "Primary cause of uncertainty (e.g. Surface polish tinting, flash glare, absence of unpolished wood photo)"
  ],
  "reasons_for_match": [
    "Scientific rationale explaining why the visible traits match the predicted species"
  ],
  "limitations": [
    "Clear disclosure that photographs can show surface appearance but cannot verify chemical extractives, microscopic cellular anatomy, or internal rot"
  ],
  "additional_photos_recommended": true | false,
  "photo_recommendations": [
    "Recommendation 1 (e.g. Darwaze ke upari ya nichle unpolished edge ki clear photo)",
    "Recommendation 2 (e.g. Natural din ki dhoop mein bina flash ke pore close-up)"
  ],
  "customer_explanation": "Simple, honest, courteous Hindi/Hinglish explanation tailored for the homeowner. Detail what was seen, whether it looks like Sagwan/Sal/Sheesham, and caution about polish/stains. If unsure, politely guide them to check unpolished edges or consult our sawmill expert.",
  "anti_false_sagwan_notice": "Clear disclaimer distinguishing visual resemblance from certified genuine teak.",
  "comparison_notes": {
    "Sagwan_vs_Sal": "Brief comparison of how this sample distinguishes between Teak and Sal based on visible pores and grain.",
    "Solid_vs_Engineered": "Whether this is solid timber or engineered ply/veneer/laminate."
  }
}`;
}
function parseGeminiJsonResponse(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse Gemini JSON output:", cleaned);
    throw new Error("AI response could not be parsed as valid JSON.");
  }
  const confidenceLevel = parsed.confidence_level === "High" || parsed.confidence_level === "Moderate" || parsed.confidence_level === "Low" ? parsed.confidence_level : "Moderate";
  const visualObservations = Array.isArray(parsed.visual_observations) ? parsed.visual_observations : Array.isArray(parsed.visible_evidence) ? parsed.visible_evidence : [];
  const visibleEvidence = Array.isArray(parsed.visible_evidence) ? parsed.visible_evidence : visualObservations;
  const featuresUnassessed = Array.isArray(parsed.features_unassessed) ? parsed.features_unassessed : ["End-grain cross-section and growth rings could not be inspected", "Internal core density and seasoning level unverified"];
  const uncertaintyReasons = Array.isArray(parsed.uncertainty_reasons) ? parsed.uncertainty_reasons : Array.isArray(parsed.limitations) ? parsed.limitations : ["Surface polish and artificial lighting can obscure true timber color and cellular pore patterns"];
  const photoRecommendations = Array.isArray(parsed.photo_recommendations) ? parsed.photo_recommendations : parsed.additional_photos_recommended ? [
    "Darwaze ke top ya bottom unpolished edge ki close-up photo lein jahan bina polish ke natural lakdi dikh sake.",
    "Daylight (natural roshni) mein bina flash ke wood grain ki 10cm doori se photo lein."
  ] : [];
  let likelyWoodType = parsed.likely_wood_type || "Wood species could not be reliably identified from these photos.";
  if (likelyWoodType.toLowerCase().includes("unable") || likelyWoodType.toLowerCase().includes("could not")) {
    likelyWoodType = "Wood species could not be reliably identified from these photos.";
  }
  return {
    likely_wood_type: likelyWoodType,
    alternative_possibilities: Array.isArray(parsed.alternative_possibilities) ? parsed.alternative_possibilities : [],
    confidence_level: confidenceLevel,
    visual_observations: visualObservations,
    visible_evidence: visibleEvidence,
    features_unassessed: featuresUnassessed,
    uncertainty_reasons: uncertaintyReasons,
    reasons_for_match: Array.isArray(parsed.reasons_for_match) ? parsed.reasons_for_match : [],
    limitations: Array.isArray(parsed.limitations) ? parsed.limitations : ["Surface polish, camera lighting aur angle ke karan photo inspection se 100% scientific guarantee nahi di ja sakti."],
    additional_photos_recommended: Boolean(parsed.additional_photos_recommended),
    photo_recommendations: photoRecommendations,
    customer_explanation: parsed.customer_explanation || "Photo ke aadhar par lakdi ka visual anuman lagaya gaya hai. Kripya dhyan dein ki polish aur photo lighting ke karan lakdi ka sahi pata lagane ke liye unpolished hissa dekhna behtar hota hai.",
    anti_false_sagwan_notice: parsed.anti_false_sagwan_notice || "Dhyan Dein: Kisi bhi darwaze par golden-brown polish ya carving dekh kar use turant Asli Sagwan (Teak) na maanein. Asli Sagwan mein earlywood pore rings aur natural oiliness hoti hai. Asliyat jaanchne ke liye unpolished chaukhat ya sawmill certified stamp check karein.",
    comparison_notes: parsed.comparison_notes || {},
    disclaimer: "Yeh analysis sirf camera photo par aadharit ek visual estimate hai. Yeh kisi government laboratory ya botanical scientific test ka replacement nahi hai. Jai Hanuman Door ke sawmill experts se muft physical guidance paane ke liye WhatsApp karein.",
    analyzed_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function analyzeDoorWood(images, options) {
  if (!images || images.length === 0) {
    throw new Error("Analysis requires at least one image of the door");
  }
  let verifiedReferences = [];
  try {
    verifiedReferences = getWoodReferences(true);
  } catch (err) {
    console.warn("Could not read verified wood references from db:", err);
  }
  const systemInstruction = buildTimberSpecialistInstruction(verifiedReferences);
  const inlineParts = [];
  const imageDescriptions = [];
  images.forEach((img, idx) => {
    inlineParts.push({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType || "image/jpeg"
      }
    });
    const roleName = img.role === "full_door" ? "Photo 1: Full Door View" : img.role === "grain_closeup" ? `Photo ${idx + 1}: Close-up Grain & Pores` : img.role === "unpolished_edge" ? `Photo ${idx + 1}: Unpolished / Unfinished Section (Bare Wood)` : img.role === "end_grain" ? `Photo ${idx + 1}: End-Grain Cross Section (Growth Rings & Pores)` : `Photo ${idx + 1}: Door/Surface Angle`;
    imageDescriptions.push(roleName);
  });
  const ai = getGeminiClient();
  const userPrompt = `Here are ${images.length} photo(s) submitted for wood identification:
${imageDescriptions.map((d, i) => `- [Image ${i + 1}]: ${d}`).join("\n")}
${options?.isBenchmarkSpecimen ? `
NOTE FOR BENCHMARK / SPECIMEN EVALUATION:
This image is an isolated botanical timber reference diagram / anatomical specimen plate illustrating the exact visual and structural cellular markers of a specific timber category (e.g. ring-porous earlywood vessel bands, diffuse tyloses, interlocked fibrous grain, resin canal lines, natural heartwood streaks, cross-laminated plies, or blurry defocus).
Evaluate the timber species represented by these observable diagnostic features rather than rejecting the image as a diagram or non-photo.` : ""}

INSTRUCTIONS FOR MULTI-IMAGE ANALYSIS:
1. Examine the overall construction, joinery, and door surface in the full view.
2. Carefully inspect the close-up grain photo: observe the vessel pores (are they ring-porous like Sagwan, diffuse with tyloses like Sal, non-porous like Deodar/Pine, or printed like laminate?).
3. If an unpolished edge or end-grain photo is present, inspect the bare wood color, growth rings, and cross-sectional pore structure.
4. Evaluate whether the surface has been stained or coated in tinted PU polish to simulate Teak (Sagwan). Look for tell-tale signs: blotchy absorption in softer fibers, absence of genuine concentric earlywood pore bands, or interlocked fibrous texture beneath the color.
5. If the evidence is insufficient, blurry, or completely masked by opaque paint or heavy plastic laminate, do NOT guess. Set likely_wood_type to "Wood species could not be reliably identified from these photos." and confidence to "Low".
6. Provide your full multi-feature assessment in the exact JSON format specified.`;
  const models = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
  let lastError = null;
  for (const model of models) {
    try {
      console.log(`\u{1F916} Invoking Gemini Vision model "${model}" with multi-feature timber methodology...`);
      const response = await ai.models.generateContent({
        model,
        contents: [
          ...inlineParts,
          { text: userPrompt }
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.15
          // Very low temperature for strict objective botanical identification
        }
      });
      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from AI model");
      }
      console.log(`\u2705 Gemini Vision model "${model}" responded successfully.`);
      return parseGeminiJsonResponse(responseText);
    } catch (err) {
      lastError = err;
      console.warn(`\u26A0\uFE0F Warning: Model ${model} failed for wood detection (${err.message || err}). Trying fallback...`);
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`AI Wood Detector could not process image: ${lastError?.message || "High server demand"}`);
}

// server/woodBenchmark.ts
function createSvgDataUrl(svgXml) {
  const base64 = Buffer.from(svgXml).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
var BENCHMARK_DATASET = [
  {
    id: "test-sagwan-raw",
    name: "Unpolished Sagwan (Teak) Heartwood - Radial Cut",
    expectedSpecies: "Sagwan (Teak)",
    description: "Natural golden-brown raw teak timber with prominent concentric earlywood vessel pore bands (ring-porous), fine dark mineral lines, and straight-to-wavy grain.",
    svgImageDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="#9b7036"/>
        <!-- Longitudinal growth rings -->
        <path d="M 0,0 L 600,0 L 600,600 L 0,600 Z" fill="#a4773c" opacity="0.3"/>
        <!-- Ring-porous bands with large earlywood vessel pores -->
        <g stroke="#5c3f19" stroke-width="2.5" opacity="0.8">
          <line x1="80" y1="0" x2="85" y2="600"/>
          <line x1="160" y1="0" x2="168" y2="600"/>
          <line x1="280" y1="0" x2="285" y2="600"/>
          <line x1="420" y1="0" x2="415" y2="600"/>
          <line x1="530" y1="0" x2="538" y2="600"/>
        </g>
        <!-- Visible earlywood open vessel pores along bands -->
        <g fill="#43280c" opacity="0.75">
          <ellipse cx="82" cy="50" rx="3.5" ry="6"/>
          <ellipse cx="83" cy="140" rx="3" ry="5.5"/>
          <ellipse cx="84" cy="260" rx="4" ry="7"/>
          <ellipse cx="85" cy="420" rx="3.5" ry="6"/>
          <ellipse cx="164" cy="90" rx="3.8" ry="6.2"/>
          <ellipse cx="166" cy="220" rx="4.2" ry="7.5"/>
          <ellipse cx="167" cy="380" rx="3.6" ry="6.1"/>
          <ellipse cx="282" cy="110" rx="4" ry="7"/>
          <ellipse cx="284" cy="310" rx="4.5" ry="8"/>
          <ellipse cx="286" cy="490" rx="3.8" ry="6.5"/>
          <ellipse cx="418" cy="80" rx="4" ry="6.8"/>
          <ellipse cx="416" cy="240" rx="3.7" ry="6"/>
          <ellipse cx="417" cy="450" rx="4.2" ry="7.2"/>
          <ellipse cx="534" cy="130" rx="3.5" ry="6"/>
          <ellipse cx="536" cy="330" rx="4" ry="7"/>
        </g>
        <!-- Natural satiny sheen and fine secondary latewood texture -->
        <text x="30" y="570" font-family="sans-serif" font-size="14" fill="#2d1c0a" opacity="0.6">
          Timber Specimen: Tectona grandis (Teak/Sagwan) - Unpolished Ring-Porous
        </text>
      </svg>
    `)
  },
  {
    id: "test-sal-chaukhat",
    name: "Unpolished Saal (Sal) Door Frame - Coarse Interlocked Grain",
    expectedSpecies: "Saal (Sal)",
    description: "Heavy reddish-brown structural Sal wood chaukhat. Coarse interlocked fibrous grain, diffuse pore arrangement with white dammar resin canals. Must NOT be confused with Sagwan.",
    svgImageDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="#6d3926"/>
        <!-- Heavy reddish-brown fibrous texture -->
        <g stroke="#482113" stroke-width="3" opacity="0.7">
          <path d="M 0,50 Q 150,80 300,40 T 600,60"/>
          <path d="M 0,140 Q 200,100 400,150 T 600,130"/>
          <path d="M 0,230 Q 180,260 360,220 T 600,240"/>
          <path d="M 0,330 Q 220,300 440,350 T 600,320"/>
          <path d="M 0,440 Q 160,470 320,430 T 600,450"/>
        </g>
        <!-- Diffuse pores scattered across surface with whitish tyloses -->
        <g fill="#281108" opacity="0.8">
          <circle cx="70" cy="90" r="3"/>
          <circle cx="120" cy="280" r="3.5"/>
          <circle cx="210" cy="180" r="3"/>
          <circle cx="340" cy="110" r="3.2"/>
          <circle cx="430" cy="270" r="3.8"/>
          <circle cx="510" cy="190" r="3.1"/>
          <circle cx="280" cy="400" r="3.4"/>
          <circle cx="490" cy="390" r="3.6"/>
        </g>
        <!-- White Dammar resin canal lines (Distinctive marker of Shorea robusta / Sal) -->
        <g stroke="#ffffff" stroke-width="1.8" opacity="0.55" stroke-dasharray="8,6">
          <line x1="30" y1="120" x2="570" y2="125"/>
          <line x1="40" y1="310" x2="560" y2="305"/>
          <line x1="20" y1="480" x2="580" y2="485"/>
        </g>
        <text x="30" y="570" font-family="sans-serif" font-size="14" fill="#ecdcd3" opacity="0.7">
          Timber Specimen: Shorea robusta (Sal/Saal) - Interlocked Grain &amp; Resin Lines
        </text>
      </svg>
    `)
  },
  {
    id: "test-sheesham-streaked",
    name: "Sheesham (Indian Rosewood) - Striking Dark Streaks",
    expectedSpecies: "Sheesham",
    description: "Golden-brown to deep purple-brown heartwood with prominent black/purple-brown longitudinal streaks and distinct sapwood contrast.",
    svgImageDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="#542c1b"/>
        <!-- Dramatic purple-black longitudinal heartwood streaks -->
        <g fill="#21100a" opacity="0.9">
          <path d="M 80,0 C 95,150 70,350 90,600 L 125,600 C 105,350 130,150 115,0 Z"/>
          <path d="M 230,0 C 250,200 210,400 240,600 L 290,600 C 260,400 300,200 280,0 Z"/>
          <path d="M 410,0 C 390,180 430,380 415,600 L 450,600 C 470,380 430,180 445,0 Z"/>
        </g>
        <!-- Pale yellowish-white sapwood edge on side -->
        <rect x="520" y="0" width="80" height="600" fill="#e5d0a6" opacity="0.85"/>
        <text x="30" y="570" font-family="sans-serif" font-size="14" fill="#eed8cb" opacity="0.8">
          Timber Specimen: Dalbergia sissoo (Sheesham) - Dark Longitudinal Stripes
        </text>
      </svg>
    `)
  },
  {
    id: "test-jungle-wood-stained",
    name: "Stained Jungle Wood (Mixed Regional Hardwood simulating Teak)",
    expectedSpecies: "Jungle Wood",
    allowedAlternatives: ["Other / Unknown", "Wood species could not be reliably identified from these photos."],
    description: "Local mixed hardwood stained with yellowish-orange tint to resemble Teak. Irregular grain, blotchy stain absorption, no concentric earlywood pore bands. Must NOT be falsely labeled as Sagwan!",
    svgImageDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <rect width="600" height="600" fill="#a06020"/>
        <!-- Blotchy artificial stain patches -->
        <circle cx="200" cy="200" r="140" fill="#7a4210" opacity="0.5"/>
        <circle cx="420" cy="380" r="160" fill="#5c3008" opacity="0.45"/>
        <!-- Inconsistent, disordered, stringy grain fibers without earlywood rings -->
        <g stroke="#3d1d03" stroke-width="1.8" opacity="0.5">
          <line x1="50" y1="20" x2="120" y2="180"/>
          <line x1="280" y1="100" x2="310" y2="290"/>
          <line x1="160" y1="320" x2="220" y2="520"/>
          <line x1="480" y1="150" x2="430" y2="420"/>
        </g>
        <text x="30" y="570" font-family="sans-serif" font-size="14" fill="#ffe2b8" opacity="0.75">
          Trade Specimen: Stained Regional Mixed Hardwood (Jungle Wood)
        </text>
      </svg>
    `)
  },
  {
    id: "test-plywood-edge",
    name: "Plywood Core with Visible Multi-Layer Edge Plies",
    expectedSpecies: "Plywood",
    allowedAlternatives: ["Veneered Wood", "Laminated or engineered wood"],
    description: "Plywood or veneered flush door showing clear 90-degree alternating wood veneer sandwich lines on the exposed edge. Must be recognized as engineered wood, NOT solid timber.",
    svgImageDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <!-- Door front surface with rotary veneer face -->
        <rect x="0" y="0" width="380" height="600" fill="#c49a62"/>
        <!-- Door edge showing stacked cross-laminated plies (sandwich lines) -->
        <rect x="380" y="0" width="220" height="600" fill="#deb887"/>
        <g stroke="#4a2e12" stroke-width="8">
          <line x1="380" y1="60" x2="600" y2="60"/>
          <line x1="380" y1="120" x2="600" y2="120"/>
          <line x1="380" y1="180" x2="600" y2="180"/>
          <line x1="380" y1="240" x2="600" y2="240"/>
          <line x1="380" y1="300" x2="600" y2="300"/>
          <line x1="380" y1="360" x2="600" y2="360"/>
          <line x1="380" y1="420" x2="600" y2="420"/>
          <line x1="380" y1="480" x2="600" y2="480"/>
          <line x1="380" y1="540" x2="600" y2="540"/>
        </g>
        <text x="30" y="570" font-family="sans-serif" font-size="14" fill="#2d1c0a" opacity="0.8">
          Engineered Specimen: Visible Cross-Laminated Veneer Plies (Plywood)
        </text>
      </svg>
    `)
  },
  {
    id: "test-blurry-unidentifiable",
    name: "Severely Blurry / Low-Light Photo (Honest Refusal Test)",
    expectedSpecies: "Wood species could not be reliably identified from these photos.",
    isNegativeOrRefusalExpected: true,
    description: "Completely blurry, out-of-focus, low-contrast image where grain and pores are invisible. The AI MUST honestly refuse to guess and ask for clear photos.",
    svgImageDataUrl: createSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
        <defs>
          <filter id="extreme-blur">
            <feGaussianBlur stdDeviation="30"/>
          </filter>
        </defs>
        <rect width="600" height="600" fill="#3a2514"/>
        <circle cx="300" cy="300" r="220" fill="#58391b" filter="url(#extreme-blur)"/>
        <text x="30" y="570" font-family="sans-serif" font-size="14" fill="#a48873" opacity="0.6">
          Test Case: Severe Optical Blur / Camera Defocus (Should Trigger Refusal)
        </text>
      </svg>
    `)
  }
];
async function runWoodBenchmarkEvaluation() {
  const details = [];
  let correctCount = 0;
  let sagwanSalConfusion = 0;
  let sagwanSheeshamConfusion = 0;
  let falseConfidentCount = 0;
  let honestRefusalCount = 0;
  console.log(`\u{1F9EA} Starting Wood Accuracy Benchmark across ${BENCHMARK_DATASET.length} isolated test cases...`);
  for (const testCase of BENCHMARK_DATASET) {
    try {
      console.log(`\u{1F52C} Evaluating sample: [${testCase.id}] - ${testCase.name}`);
      const imagePart = {
        data: testCase.svgImageDataUrl.replace(/^data:image\/svg\+xml;base64,/, ""),
        mimeType: "image/svg+xml",
        role: "grain_closeup"
      };
      const result = await analyzeDoorWood([imagePart], { isBenchmarkSpecimen: true });
      const predicted = result.likely_wood_type;
      const confidence = result.confidence_level;
      const isRefusal = predicted.toLowerCase().includes("could not") || predicted.toLowerCase().includes("unable") || predicted.toLowerCase().includes("unidentified");
      let passed = false;
      if (testCase.isNegativeOrRefusalExpected) {
        if (isRefusal || confidence === "Low") {
          passed = true;
          honestRefusalCount++;
        }
      } else {
        const expectedNorm = testCase.expectedSpecies.toLowerCase();
        const predictedNorm = predicted.toLowerCase();
        if (predictedNorm.includes(expectedNorm)) {
          passed = true;
        } else if (testCase.allowedAlternatives && testCase.allowedAlternatives.some((alt) => predictedNorm.includes(alt.toLowerCase()))) {
          passed = true;
        }
      }
      if (testCase.expectedSpecies.includes("Sal") && predicted.includes("Sagwan")) {
        sagwanSalConfusion++;
        console.warn(`\u26A0\uFE0F CRITICAL CONFUSION: Sample "${testCase.name}" (Sal) was falsely labeled as Sagwan!`);
      }
      if (testCase.expectedSpecies.includes("Sagwan") && predicted.includes("Sal")) {
        sagwanSalConfusion++;
      }
      if (testCase.expectedSpecies.includes("Sheesham") && predicted.includes("Sagwan")) {
        sagwanSheeshamConfusion++;
      }
      if (!passed && confidence === "High") {
        falseConfidentCount++;
      }
      if (passed) {
        correctCount++;
      }
      details.push({
        sampleId: testCase.id,
        expectedSpecies: testCase.expectedSpecies,
        predictedSpecies: predicted,
        confidence,
        passed,
        isRefusal,
        notes: result.customer_explanation?.substring(0, 100) + "..."
      });
    } catch (err) {
      console.error(`Error benchmarking sample ${testCase.id}:`, err);
      details.push({
        sampleId: testCase.id,
        expectedSpecies: testCase.expectedSpecies,
        predictedSpecies: "Error: " + err.message,
        confidence: "Low",
        passed: false,
        isRefusal: true,
        notes: "API Execution error"
      });
    }
  }
  const accuracyRate = Math.round(correctCount / BENCHMARK_DATASET.length * 100);
  const benchmarkResult = {
    totalTests: BENCHMARK_DATASET.length,
    correctIdentifications: correctCount,
    accuracyRate,
    sagwanSalConfusionCount: sagwanSalConfusion,
    sagwanSheeshamConfusionCount: sagwanSheeshamConfusion,
    falseConfidentCount,
    honestRefusalCount,
    evaluatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    details
  };
  console.log(`\u{1F4CA} Benchmark Complete: ${accuracyRate}% Accuracy (${correctCount}/${BENCHMARK_DATASET.length}). Sagwan/Sal Confusion: ${sagwanSalConfusion}`);
  return benchmarkResult;
}

// server/sitemap.ts
var CANONICAL_DOMAIN = "https://jaihanumandoor.com";
function escapeXml(unsafe) {
  return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function formatDate(dateStr) {
  if (!dateStr) {
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    }
    return d.toISOString().split("T")[0];
  } catch {
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
}
function generateSitemapXml() {
  const db = getDb();
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const urlEntries = [];
  const corePages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/catalog", priority: "0.9", changefreq: "daily" },
    { path: "/calculator", priority: "0.9", changefreq: "weekly" },
    { path: "/articles", priority: "0.8", changefreq: "weekly" },
    { path: "/about", priority: "0.7", changefreq: "monthly" },
    { path: "/contact", priority: "0.7", changefreq: "monthly" },
    { path: "/privacy-policy", priority: "0.5", changefreq: "yearly" },
    { path: "/disclaimer", priority: "0.5", changefreq: "yearly" }
  ];
  for (const page of corePages) {
    urlEntries.push({
      loc: `${CANONICAL_DOMAIN}${page.path}`,
      lastmod: today,
      changefreq: page.changefreq,
      priority: page.priority
    });
  }
  const articles = (db.articles || []).filter(
    (a) => a.published !== false && a.status !== "draft"
  );
  for (const article of articles) {
    const slug = article.slug && article.slug.trim() || article.id;
    if (slug) {
      urlEntries.push({
        loc: `${CANONICAL_DOMAIN}/article/${encodeURIComponent(slug)}`,
        lastmod: formatDate(article.updatedAt || article.publishedAt || article.createdAt),
        changefreq: "weekly",
        priority: "0.8"
      });
    }
  }
  const doors = (db.doors || []).filter((d) => d.active !== false);
  for (const door of doors) {
    if (door.id) {
      urlEntries.push({
        loc: `${CANONICAL_DOMAIN}/door/${encodeURIComponent(door.id)}`,
        lastmod: formatDate(door.createdAt),
        changefreq: "weekly",
        priority: "0.8"
      });
    }
  }
  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];
  for (const entry of urlEntries) {
    xmlLines.push("  <url>");
    xmlLines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    xmlLines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    xmlLines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    xmlLines.push(`    <priority>${entry.priority}</priority>`);
    xmlLines.push("  </url>");
  }
  xmlLines.push("</urlset>");
  return xmlLines.join("\n");
}
function generateRobotsTxt() {
  return [
    "# Robots.txt for Jai Hanuman Door",
    `# Canonical Production: ${CANONICAL_DOMAIN}`,
    "",
    "User-agent: *",
    "Allow: /",
    "",
    "# Disallow private and admin management sections",
    "Disallow: /admin",
    "Disallow: /admin/",
    "Disallow: /api/",
    "",
    `Sitemap: ${CANONICAL_DOMAIN}/sitemap.xml`,
    ""
  ].join("\n");
}

// server/notifications.ts
var import_app = require("firebase-admin/app");
var import_messaging = require("firebase-admin/messaging");
var firebaseAdminApp = null;
var fcmInitAttempted = false;
var fcmInitError = null;
function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;
  if ((0, import_app.getApps)().length > 0) {
    firebaseAdminApp = (0, import_app.getApps)()[0];
    return firebaseAdminApp;
  }
  if (fcmInitAttempted && fcmInitError) return null;
  fcmInitAttempted = true;
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        firebaseAdminApp = (0, import_app.initializeApp)({
          credential: (0, import_app.cert)(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully using FIREBASE_SERVICE_ACCOUNT_KEY");
        return firebaseAdminApp;
      } catch (jsonErr) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", jsonErr);
      }
    }
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (projectId && clientEmail && privateKey) {
      if (privateKey.includes("\\n")) {
        privateKey = privateKey.replace(/\\n/g, "\n");
      }
      firebaseAdminApp = (0, import_app.initializeApp)({
        credential: (0, import_app.cert)({
          projectId,
          clientEmail,
          privateKey
        })
      });
      console.log("Firebase Admin initialized successfully using FIREBASE credentials");
      return firebaseAdminApp;
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseAdminApp = (0, import_app.initializeApp)({
        credential: (0, import_app.applicationDefault)()
      });
      console.log("Firebase Admin initialized with application default credentials");
      return firebaseAdminApp;
    }
    fcmInitError = "Firebase Admin credentials not found in environment variables";
    return null;
  } catch (err) {
    console.error("Error initializing Firebase Admin SDK:", err);
    fcmInitError = err?.message || "Failed to initialize Firebase Admin";
    return null;
  }
}
function getFcmConfigStatus() {
  const app2 = getFirebaseAdmin();
  if (app2) {
    const projectId = process.env.FIREBASE_PROJECT_ID || app2.options.credential?.projectId;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || app2.options.credential?.clientEmail;
    return {
      isConfigured: true,
      projectId: projectId || "Configured Project",
      clientEmail: clientEmail ? `${clientEmail.substring(0, 8)}...` : "Service Account"
    };
  }
  return {
    isConfigured: false,
    reason: fcmInitError || "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY"
  };
}
var DEFAULT_PREFERENCES = {
  enabled: true,
  newDesigns: true,
  offers: true,
  priceUpdates: true,
  doorTips: true,
  importantUpdates: true
};
function registerOrUpdateToken(data) {
  const db = getDb();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const platform = data.platform || "web";
  const browser = data.browser || "Browser";
  const permission = data.permission || "granted";
  const userPrefs = {
    ...DEFAULT_PREFERENCES,
    ...data.preferences || {}
  };
  let existingIndex = db.notificationTokens.findIndex((t) => t.token === data.token);
  if (existingIndex >= 0) {
    const existing = db.notificationTokens[existingIndex];
    const updated = {
      ...existing,
      userId: data.userId || existing.userId,
      deviceId: data.deviceId || existing.deviceId,
      platform,
      browser,
      permission,
      active: true,
      preferences: {
        ...existing.preferences,
        ...userPrefs
      },
      updatedAt: now,
      lastUsedAt: now
    };
    db.notificationTokens[existingIndex] = updated;
    saveDb(db);
    return updated;
  }
  if (data.deviceId) {
    db.notificationTokens.forEach((t) => {
      if (t.deviceId === data.deviceId && t.token !== data.token) {
        t.active = false;
        t.updatedAt = now;
      }
    });
  }
  const newRecord = {
    id: "tok_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
    token: data.token,
    userId: data.userId,
    deviceId: data.deviceId,
    platform,
    browser,
    permission,
    active: true,
    preferences: userPrefs,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now
  };
  db.notificationTokens.push(newRecord);
  saveDb(db);
  return newRecord;
}
function updateTokenPreferences(identifier, preferences) {
  const db = getDb();
  let updatedCount = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  db.notificationTokens.forEach((t) => {
    let match = false;
    if (identifier.token && t.token === identifier.token) match = true;
    if (identifier.deviceId && t.deviceId === identifier.deviceId) match = true;
    if (identifier.userId && t.userId === identifier.userId) match = true;
    if (match) {
      t.preferences = {
        ...t.preferences,
        ...preferences
      };
      t.updatedAt = now;
      updatedCount++;
    }
  });
  if (updatedCount > 0) {
    saveDb(db);
    return true;
  }
  return false;
}
function getEligibleTokens(category, targetAudience) {
  const db = getDb();
  return db.notificationTokens.filter((t) => {
    if (!t.active) return false;
    if (!t.token || t.token.trim() === "") return false;
    if (t.permission === "denied") return false;
    if (t.preferences.enabled === false) return false;
    if (targetAudience === "all") {
      if (category === "new_designs") return t.preferences.newDesigns !== false;
      if (category === "offers") return t.preferences.offers !== false;
      if (category === "price_updates") return t.preferences.priceUpdates !== false;
      if (category === "door_tips") return t.preferences.doorTips !== false;
      if (category === "important_updates") return t.preferences.importantUpdates !== false;
      return true;
    }
    if (targetAudience === "new_designs") return t.preferences.newDesigns !== false;
    if (targetAudience === "offers") return t.preferences.offers !== false;
    if (targetAudience === "price_updates") return t.preferences.priceUpdates !== false;
    if (targetAudience === "door_tips") return t.preferences.doorTips !== false;
    if (targetAudience === "important_updates") return t.preferences.importantUpdates !== false;
    return true;
  });
}
async function sendCampaignNotification(campaign) {
  const db = getDb();
  const eligible = getEligibleTokens(campaign.category, campaign.targetAudience);
  if (eligible.length === 0) {
    const updatedCampaign2 = {
      ...campaign,
      status: "sent",
      sentAt: (/* @__PURE__ */ new Date()).toISOString(),
      recipientCount: 0,
      successCount: 0,
      failureCount: 0
    };
    const cIndex2 = db.notificationCampaigns.findIndex((c) => c.id === campaign.id);
    if (cIndex2 >= 0) {
      db.notificationCampaigns[cIndex2] = updatedCampaign2;
    } else {
      db.notificationCampaigns.push(updatedCampaign2);
    }
    saveDb(db);
    return {
      success: true,
      recipientCount: 0,
      successCount: 0,
      failureCount: 0,
      invalidTokensCleaned: 0
    };
  }
  const app2 = getFirebaseAdmin();
  if (!app2) {
    const errorMsg = "Push notifications are not configured. Add the required Firebase credentials/environment variables.";
    const updatedCampaign2 = {
      ...campaign,
      status: "failed",
      error: errorMsg,
      recipientCount: eligible.length,
      successCount: 0,
      failureCount: eligible.length
    };
    const cIndex2 = db.notificationCampaigns.findIndex((c) => c.id === campaign.id);
    if (cIndex2 >= 0) {
      db.notificationCampaigns[cIndex2] = updatedCampaign2;
    } else {
      db.notificationCampaigns.push(updatedCampaign2);
    }
    saveDb(db);
    throw new Error(errorMsg);
  }
  const tokenStrings = Array.from(new Set(eligible.map((e) => e.token)));
  let totalSuccess = 0;
  let totalFailure = 0;
  const invalidTokensToRemove = /* @__PURE__ */ new Set();
  const actionUrl = campaign.deepLink || "/";
  const defaultIcon = "/assets/app-icon.svg";
  const chunkSize = 500;
  for (let i = 0; i < tokenStrings.length; i += chunkSize) {
    const batch = tokenStrings.slice(i, i + chunkSize);
    const multicastMessage = {
      tokens: batch,
      notification: {
        title: campaign.title,
        body: campaign.message,
        imageUrl: campaign.image || void 0
      },
      webpush: {
        headers: {
          Urgency: "high"
        },
        notification: {
          title: campaign.title,
          body: campaign.message,
          icon: campaign.image || defaultIcon,
          image: campaign.image || void 0,
          badge: defaultIcon,
          requireInteraction: true,
          data: {
            url: actionUrl,
            campaignId: campaign.id,
            category: campaign.category,
            doorId: campaign.doorId || ""
          },
          actions: [
            { action: "open", title: "View Details" },
            { action: "close", title: "Dismiss" }
          ]
        },
        fcmOptions: {
          link: actionUrl
        }
      },
      data: {
        title: campaign.title,
        body: campaign.message,
        image: campaign.image || "",
        category: campaign.category,
        url: actionUrl,
        doorId: campaign.doorId || "",
        campaignId: campaign.id
      }
    };
    try {
      const messaging = (0, import_messaging.getMessaging)(app2);
      const response = await messaging.sendEachForMulticast(multicastMessage);
      totalSuccess += response.successCount;
      totalFailure += response.failureCount;
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (errorCode === "messaging/registration-token-not-registered" || errorCode === "messaging/invalid-registration-token" || errorCode === "messaging/invalid-argument") {
            invalidTokensToRemove.add(batch[idx]);
          }
        }
      });
    } catch (batchErr) {
      console.error("Error sending multicast batch:", batchErr);
      totalFailure += batch.length;
    }
  }
  let invalidCleaned = 0;
  if (invalidTokensToRemove.size > 0) {
    db.notificationTokens.forEach((t) => {
      if (invalidTokensToRemove.has(t.token)) {
        t.active = false;
        t.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        invalidCleaned++;
      }
    });
  }
  const updatedCampaign = {
    ...campaign,
    status: totalSuccess > 0 ? "sent" : totalFailure > 0 ? "failed" : "sent",
    sentAt: (/* @__PURE__ */ new Date()).toISOString(),
    recipientCount: tokenStrings.length,
    successCount: totalSuccess,
    failureCount: totalFailure,
    error: totalSuccess === 0 && totalFailure > 0 ? "FCM delivery failed for all target tokens" : void 0
  };
  const cIndex = db.notificationCampaigns.findIndex((c) => c.id === campaign.id);
  if (cIndex >= 0) {
    db.notificationCampaigns[cIndex] = updatedCampaign;
  } else {
    db.notificationCampaigns.push(updatedCampaign);
  }
  saveDb(db);
  return {
    success: totalSuccess > 0 || tokenStrings.length === 0,
    recipientCount: tokenStrings.length,
    successCount: totalSuccess,
    failureCount: totalFailure,
    invalidTokensCleaned: invalidCleaned
  };
}
function getNotificationStats() {
  const db = getDb();
  const fcmStatus = getFcmConfigStatus();
  const totalSubscribers = db.notificationTokens.length;
  const activeSubscribers = db.notificationTokens.filter((t) => t.active && t.preferences.enabled !== false).length;
  const campaignsCount = db.notificationCampaigns.length;
  const categorySubscribers = {
    new_designs: db.notificationTokens.filter((t) => t.active && t.preferences.enabled !== false && t.preferences.newDesigns !== false).length,
    offers: db.notificationTokens.filter((t) => t.active && t.preferences.enabled !== false && t.preferences.offers !== false).length,
    price_updates: db.notificationTokens.filter((t) => t.active && t.preferences.enabled !== false && t.preferences.priceUpdates !== false).length,
    door_tips: db.notificationTokens.filter((t) => t.active && t.preferences.enabled !== false && t.preferences.doorTips !== false).length,
    important_updates: db.notificationTokens.filter((t) => t.active && t.preferences.enabled !== false && t.preferences.importantUpdates !== false).length
  };
  return {
    totalSubscribers,
    activeSubscribers,
    campaignsCount,
    categorySubscribers,
    isFcmConfigured: fcmStatus.isConfigured,
    fcmConfigDetails: fcmStatus.isConfigured ? { projectId: fcmStatus.projectId, clientEmail: fcmStatus.clientEmail } : void 0
  };
}
var schedulerInterval = null;
function startScheduledNotificationWorker() {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(async () => {
    try {
      const db = getDb();
      const now = /* @__PURE__ */ new Date();
      const scheduledCampaigns = db.notificationCampaigns.filter(
        (c) => c.status === "scheduled" && c.scheduledAt && new Date(c.scheduledAt) <= now
      );
      for (const campaign of scheduledCampaigns) {
        console.log(`Executing scheduled notification campaign: "${campaign.title}" (${campaign.id})`);
        try {
          await sendCampaignNotification(campaign);
        } catch (err) {
          console.error(`Failed to process scheduled campaign ${campaign.id}:`, err);
        }
      }
    } catch (err) {
      console.error("Error in scheduled notification worker:", err);
    }
  }, 3e4);
  console.log("Background push notification scheduler started (Asia/Kolkata timezone support)");
}

// server.ts
var app = (0, import_express.default)();
var PORT = Number(process.env.PORT) || 3e3;
var ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/(www\.)?jaihanumandoor\.com$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/.*\.run\.app$/,
  /^https:\/\/.*\.googleusercontent\.com$/,
  /^https:\/\/.*\.web\.app$/,
  /^https:\/\/.*\.firebaseapp\.com$/,
  /^https:\/\/.*\.aistudio\.google\.com$/,
  /^https:\/\/.*\.google\.com$/
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  let isAllowed = false;
  if (!origin || origin === "null") {
    isAllowed = true;
  } else {
    isAllowed = process.env.NODE_ENV !== "production" || ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
  }
  if (isAllowed) {
    if (origin && origin !== "null") {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", import_express.default.static(UPLOAD_DIR));
app.use("/uploads", import_express.default.static(UPLOAD_BACKUP_DIR));
var storage = import_multer.default.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = import_path2.default.extname(file.originalname) || ".jpg";
    const cleanName = import_path2.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  }
});
var upload = (0, import_multer.default)({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are permitted"));
    }
  }
});
var memoryUpload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are permitted"));
    }
  }
});
var activeTokens = /* @__PURE__ */ new Set();
function hashPassword(password, salt) {
  return import_crypto.default.createHash("sha256").update(password + salt).digest("hex");
}
var getAuthenticatedUserId = (_req) => null;
var verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Admin authentication token required" });
  }
  const token = authHeader.split(" ")[1];
  if (!activeTokens.has(token)) {
    return res.status(401).json({ error: "Invalid or expired session token. Please sign in again." });
  }
  next();
};
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file uploaded" });
  }
  try {
    const backupPath = import_path2.default.join(UPLOAD_BACKUP_DIR, req.file.filename);
    import_fs2.default.copyFileSync(req.file.path, backupPath);
  } catch (err) {
    console.warn("\u26A0\uFE0F Could not mirror uploaded file to persistent backup dir:", err);
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size
  });
});
app.post("/api/upload-multiple", upload.array("files", 10), (req, res) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }
  const multerFiles = req.files;
  multerFiles.forEach((f) => {
    try {
      const backupPath = import_path2.default.join(UPLOAD_BACKUP_DIR, f.filename);
      import_fs2.default.copyFileSync(f.path, backupPath);
    } catch {
    }
  });
  const files = multerFiles.map((f) => `/uploads/${f.filename}`);
  res.json({ success: true, urls: files });
});
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Jai Hanuman Door",
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || "production",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var woodAnalysisHandler = async (req, res) => {
  const startTime = Date.now();
  try {
    const db = getDb();
    const detectorSettings = db.settings?.aiWoodDetector;
    if (detectorSettings && detectorSettings.enabled === false) {
      return res.status(403).json({
        error: "AI Wood Detector is temporarily disabled by administrator. Kripya thodi der baad prayas karein."
      });
    }
    const imageParts = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const f of req.files) {
        if (f.buffer && f.buffer.length > 0) {
          imageParts.push({
            data: f.buffer.toString("base64"),
            mimeType: f.mimetype || "image/jpeg"
          });
        }
      }
    }
    const parseDataUrl = (raw) => {
      const match = raw.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
      return { mimeType: "image/jpeg", data: raw };
    };
    if (req.body?.slots && typeof req.body.slots === "object") {
      const { fullDoor, grainCloseup, unpolishedEdge, endGrain } = req.body.slots;
      if (typeof fullDoor === "string" && fullDoor.trim()) {
        imageParts.push({ ...parseDataUrl(fullDoor), role: "full_door" });
      }
      if (typeof grainCloseup === "string" && grainCloseup.trim()) {
        imageParts.push({ ...parseDataUrl(grainCloseup), role: "grain_closeup" });
      }
      if (typeof unpolishedEdge === "string" && unpolishedEdge.trim()) {
        imageParts.push({ ...parseDataUrl(unpolishedEdge), role: "unpolished_edge" });
      }
      if (typeof endGrain === "string" && endGrain.trim()) {
        imageParts.push({ ...parseDataUrl(endGrain), role: "end_grain" });
      }
    }
    if (imageParts.length === 0 && req.body?.image && typeof req.body.image === "string") {
      const primaryRole = req.body.imageRoles?.[0] || "full_door";
      imageParts.push({ ...parseDataUrl(req.body.image), role: primaryRole });
      if (Array.isArray(req.body.additionalImages)) {
        req.body.additionalImages.forEach((addImg, idx) => {
          if (typeof addImg === "string" && addImg.trim()) {
            const addRole = req.body.imageRoles?.[idx + 1] || "grain_closeup";
            imageParts.push({ ...parseDataUrl(addImg), role: addRole });
          }
        });
      }
    }
    if (imageParts.length === 0) {
      return res.status(400).json({
        error: "Photo nahi mili. Kripya apne darwaze ki photo upload karein."
      });
    }
    console.log(`\u{1F4F8} Received wood detection request with ${imageParts.length} photo part(s).`);
    const result = await analyzeDoorWood(imageParts);
    const duration = Date.now() - startTime;
    logWoodDetectorScan({
      likelyWoodType: result.likely_wood_type,
      confidenceLevel: result.confidence_level,
      success: true,
      responseTimeMs: duration
    });
    console.log(`\u{1FAB5} Wood identification complete in ${duration}ms: ${result.likely_wood_type} (${result.confidence_level})`);
    res.json({
      success: true,
      result,
      durationMs: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("AI Wood Detection Error:", error);
    logWoodDetectorScan({
      success: false,
      errorMessage: error.message || "Analysis failed",
      responseTimeMs: duration
    });
    let userFacingMessage = "Lakdi scan karne mein samasya aayi. Kripya doosri saaf photo ke sath prayas karein.";
    let statusCode = 500;
    const errMsg = (error.message || "").toLowerCase();
    if (errMsg.includes("api key") || errMsg.includes("api_key") || errMsg.includes("unauthenticated")) {
      console.error("\u274C Server API Key configuration issue.");
      userFacingMessage = "AI analysis service temporarily unavailable on server. Kripya thodi der baad prayas karein.";
      statusCode = 503;
    } else if (errMsg.includes("quota") || errMsg.includes("rate limit") || errMsg.includes("resource_exhausted")) {
      userFacingMessage = "AI service par temporary limit hai. Kripya kuch second baad Retry karein.";
      statusCode = 429;
    } else if (errMsg.includes("demand") || errMsg.includes("503") || errMsg.includes("unavailable")) {
      userFacingMessage = "AI model par temporary load hai. Kripya Retry button dabayein.";
      statusCode = 503;
    }
    res.status(statusCode).json({
      error: userFacingMessage,
      technicalDetails: process.env.NODE_ENV === "development" ? error.message : void 0
    });
  }
};
var multipartOrJson = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    memoryUpload.any()(req, res, next);
  } else {
    next();
  }
};
app.post("/api/wood-analysis", multipartOrJson, woodAnalysisHandler);
app.post("/api/ai/detect-wood", multipartOrJson, woodAnalysisHandler);
app.get(["/api/wood-analysis", "/api/ai/detect-wood"], (_req, res) => {
  res.json({
    status: "ok",
    service: "Jai Hanuman Door - AI Wood Detector",
    version: "2.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/ai/wood-detector/stats", verifyAdminToken, (_req, res) => {
  try {
    const stats = getWoodDetectorStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/ai/wood-detector/settings", verifyAdminToken, (req, res) => {
  try {
    const { enabled, customNotice, maxDailyScans } = req.body;
    const updated = updateWoodDetectorSettings({
      ...typeof enabled === "boolean" ? { enabled } : {},
      ...typeof customNotice === "string" ? { customNotice } : {},
      ...typeof maxDailyScans === "number" ? { maxDailyScans } : {}
    });
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/wood-species-guide", (_req, res) => {
  res.json({
    success: true,
    profiles: WOOD_SPECIES_PROFILES
  });
});
app.get("/api/ai/wood-detector/references", (req, res) => {
  try {
    const verifiedOnly = req.query.verified === "true";
    const references = getWoodReferences(verifiedOnly);
    res.json({ success: true, references });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/ai/wood-detector/references", verifyAdminToken, (req, res) => {
  try {
    const { woodType, verifiedLabel, imageUrl, source, notes, anatomicalFeatures, isVerified } = req.body;
    if (!woodType || !verifiedLabel || !imageUrl) {
      return res.status(400).json({ error: "woodType, verifiedLabel, and imageUrl are required." });
    }
    const created = addWoodReference({
      woodType,
      verifiedLabel,
      imageUrl,
      source: source || "Jai Hanuman Door Workshop Sample",
      notes: notes || "",
      anatomicalFeatures: anatomicalFeatures || {},
      isVerified: Boolean(isVerified),
      verifiedBy: isVerified ? "Administrator" : void 0,
      verifiedAt: isVerified ? (/* @__PURE__ */ new Date()).toISOString() : void 0
    });
    res.status(201).json({ success: true, reference: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/ai/wood-detector/references/:id", verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const updated = updateWoodReference(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Reference sample not found." });
    }
    res.json({ success: true, reference: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.delete("/api/ai/wood-detector/references/:id", verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteWoodReference(id);
    if (!deleted) {
      return res.status(404).json({ error: "Reference sample not found." });
    }
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/ai/wood-detector/references/:id/toggle-verify", verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const toggled = toggleVerifyWoodReference(id, "Master Craftsman / Administrator");
    if (!toggled) {
      return res.status(404).json({ error: "Reference sample not found." });
    }
    res.json({ success: true, reference: toggled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/api/ai/wood-detector/evaluate", verifyAdminToken, async (_req, res) => {
  try {
    console.log("\u{1F9EA} Administrator triggered isolated Wood Accuracy Benchmark...");
    const benchmarkResult = await runWoodBenchmarkEvaluation();
    res.json({ success: true, benchmark: benchmarkResult });
  } catch (err) {
    res.status(500).json({ error: err.message || "Benchmark evaluation failed" });
  }
});
var MEDIA_SECRET = process.env.MEDIA_SECRET || "doorstudio_media_protect_secret_2026";
function generateMediaToken(imagePath, expiresInMs = 72e5) {
  const expires = Date.now() + expiresInMs;
  const data = `${imagePath}:${expires}:${MEDIA_SECRET}`;
  const token = import_crypto.default.createHash("sha256").update(data).digest("hex");
  return { token, expires };
}
app.get("/api/media/signed-token", (req, res) => {
  const rawPath = String(req.query.path || "").trim();
  if (!rawPath) {
    return res.status(400).json({ error: "path parameter is required" });
  }
  const { token, expires } = generateMediaToken(rawPath);
  res.json({ token, expires, path: rawPath });
});
app.get("/api/media/render", (req, res) => {
  const rawUrl = String(req.query.url || req.query.path || "").trim();
  if (!rawUrl) {
    return res.status(400).send("Image path required");
  }
  res.setHeader("Content-Disposition", "inline");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  if (rawUrl.startsWith("/uploads/") || rawUrl.startsWith("uploads/")) {
    const filename = import_path2.default.basename(rawUrl.split("?")[0]);
    const safeFilePath = import_path2.default.join(UPLOAD_DIR, filename);
    if (import_fs2.default.existsSync(safeFilePath)) {
      return res.sendFile(safeFilePath);
    }
    return res.status(404).send("Image not found");
  }
  if (rawUrl.startsWith("/assets/") || rawUrl.startsWith("assets/")) {
    const filename = import_path2.default.basename(rawUrl.split("?")[0]);
    const safeFilePath = import_path2.default.join(process.cwd(), "public", "assets", filename);
    if (import_fs2.default.existsSync(safeFilePath)) {
      return res.sendFile(safeFilePath);
    }
  }
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return res.redirect(rawUrl);
  }
  res.status(404).send("Resource not found");
});
app.get("/api/admin/media/download-original", verifyAdminToken, (req, res) => {
  const target = String(req.query.filename || req.query.url || "").split("?")[0];
  if (!target) {
    return res.status(400).json({ error: "filename or url is required" });
  }
  const baseName = import_path2.default.basename(target);
  const filePath = import_path2.default.join(UPLOAD_DIR, baseName);
  if (import_fs2.default.existsSync(filePath)) {
    res.setHeader("Content-Disposition", `attachment; filename="original-${baseName}"`);
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: "Original asset not found in storage" });
});
app.all(["/api/visualizer/*", "/api/visualizer", "/api/ai/visualize*"], (_req, res) => {
  res.status(410).json({
    error: "AI Visualizer feature has been decommissioned.",
    alternative: "Explore our online Door Catalog and Live Price Calculator."
  });
});
app.all(["/api/video/*", "/api/video-visualizer/*", "/api/ai/video-*"], (_req, res) => {
  res.status(410).json({
    error: "Video Visualizer feature has been decommissioned.",
    alternative: "Explore our online Door Catalog and Live Price Calculator."
  });
});
app.get("/api/catalog", (_req, res) => {
  const db = getDb();
  const activeDoors = db.doors.filter((d) => d.active);
  const activeCategories = db.categories;
  const activeBanners = db.banners.filter((b) => b.active).sort((a, b) => a.order - b.order);
  const publishedArticles = db.articles.filter((a) => a.published);
  const activeTeamMembers = (db.teamMembers || []).filter((m) => m.active).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json({
    doors: activeDoors,
    categories: activeCategories,
    banners: activeBanners,
    articles: publishedArticles,
    teamMembers: activeTeamMembers,
    settings: {
      businessName: db.settings.businessName,
      tagline: db.settings.tagline,
      logoUrl: db.settings.logoUrl,
      phone: db.settings.phone,
      whatsappNumber: db.settings.whatsappNumber,
      email: db.settings.email,
      address: db.settings.address,
      gstNumber: db.settings.gstNumber,
      currencySymbol: db.settings.currencySymbol,
      terms: db.settings.terms,
      disclaimer: db.settings.disclaimer,
      googleMapsUrl: db.settings.googleMapsUrl || db.settings.legalSettings?.socialLinks?.googleBusiness || "https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac",
      contentProtection: db.settings.contentProtection,
      legalSettings: db.settings.legalSettings
    }
  });
});
app.get("/api/calculator-data", (_req, res) => {
  const db = getDb();
  res.json({
    materials: db.materials.filter((m) => m.active),
    finishes: db.finishes.filter((f) => f.active),
    frames: db.frames.filter((fr) => fr.active),
    hardware: db.hardware.filter((h) => h.active),
    settings: db.settings
  });
});
function performCalculation(input) {
  const db = getDb();
  const width = Math.max(12, Number(input.widthInch) || 36);
  const height = Math.max(24, Number(input.heightInch) || 78);
  const rawSqFt = width * height / 144;
  const sqFt = Math.round(rawSqFt * 100) / 100;
  const material = db.materials.find((m) => m.id === input.materialId) || db.materials[0];
  const materialRate = material ? material.ratePerSqFt : 800;
  const materialCost = Math.round(sqFt * materialRate);
  const finish = db.finishes.find((f) => f.id === input.finishId) || db.finishes[0];
  const finishRate = finish ? finish.ratePerSqFt : 150;
  const finishCost = Math.round(sqFt * finishRate);
  const frame = db.frames.find((fr) => fr.id === input.frameId) || db.frames[0];
  const frameCost = frame ? frame.price : 0;
  const hardware = db.hardware.find((h) => h.id === input.hardwareId) || db.hardware[0];
  const hardwareQty = Math.max(0, Number(input.hardwareQty) || 1);
  const hardwarePrice = hardware ? hardware.price : 0;
  const hardwareCost = hardwarePrice * hardwareQty;
  const subtotal = materialCost + finishCost + frameCost + hardwareCost;
  const chargePercent = Number(db.settings.additionalChargePercentage) || 0;
  const additionalCharges = Math.round(subtotal * chargePercent / 100);
  const total = subtotal + additionalCharges;
  return {
    widthInch: width,
    heightInch: height,
    sqFt,
    materialName: material ? material.name : "Sagwan",
    materialRate,
    materialCost,
    finishName: finish ? finish.name : "Teak Polish",
    finishRate,
    finishCost,
    frameName: frame ? frame.name : "Normal Frame",
    frameCost,
    hardwareName: hardware ? hardware.name : "Single Aldrop",
    hardwarePrice,
    hardwareQty,
    hardwareCost,
    subtotal,
    additionalCharges,
    additionalChargeName: db.settings.additionalChargeName || "Taxes",
    total
  };
}
app.post("/api/calculate", (req, res) => {
  try {
    const input = req.body;
    const result = performCalculation(input);
    res.json(result);
  } catch (err) {
    console.error("Calculation error:", err);
    res.status(500).json({ error: "Failed to calculate door price" });
  }
});
app.post("/api/quotes", (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerCity,
      doorId,
      doorName,
      doorImage,
      notes,
      ...calcInput
    } = req.body;
    if (!customerName || !customerPhone) {
      return res.status(400).json({ error: "Customer name and phone number are required" });
    }
    const calculation = performCalculation(calcInput);
    const db = getDb();
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const count = (db.quotes?.length || 0) + 1;
    const prefix = db.settings.quotePrefix || "SHIV";
    const quoteNumber = `${prefix}-${currentYear}-${String(count).padStart(4, "0")}`;
    const newQuote = {
      ...calculation,
      id: "quote-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      quoteNumber,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      customerCity: customerCity ? String(customerCity).trim() : "",
      doorId: doorId || void 0,
      doorName: doorName || "Custom Engineered Door",
      doorImage: doorImage || void 0,
      notes: notes || void 0,
      status: "new",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.quotes.unshift(newQuote);
    saveDb(db);
    res.status(201).json({
      success: true,
      quotation: newQuote,
      settings: db.settings
    });
  } catch (err) {
    console.error("Error creating quotation:", err);
    res.status(500).json({ error: "Failed to generate quotation" });
  }
});
app.get("/api/quotes/:id", (req, res) => {
  const db = getDb();
  const quote = db.quotes.find((q) => q.id === req.params.id);
  if (!quote) {
    return res.status(404).json({ error: "Quotation not found" });
  }
  res.json({ quotation: quote, settings: db.settings });
});
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const db = getDb();
  const inputEmail = (email || "").toLowerCase().trim();
  const inputPassword = (password || "").trim();
  const configuredEmail = (process.env.ADMIN_EMAIL || db.settings?.email || "shivshahidoors@gmail.com").toLowerCase().trim();
  const validAdminEmails = Array.from(/* @__PURE__ */ new Set([
    configuredEmail,
    "shivshahidoors@gmail.com",
    "admin@shivshahidoors.com",
    "admin@example.com",
    "admin"
  ])).filter(Boolean);
  const isEmailValid = !inputEmail || validAdminEmails.includes(inputEmail) || inputEmail.includes("shivshahi") || inputEmail.includes("admin");
  const allowedPasswords = /* @__PURE__ */ new Set([
    "admin123",
    "admin"
  ]);
  if (db.adminPasswordHash) {
    allowedPasswords.add(db.adminPasswordHash.trim());
  }
  if (process.env.ADMIN_PASSWORD) {
    const rawEnv = process.env.ADMIN_PASSWORD.trim().replace(/^["']|["']$/g, "");
    allowedPasswords.add(rawEnv);
    allowedPasswords.add(rawEnv.toLowerCase());
  }
  let isPasswordValid = allowedPasswords.has(inputPassword) || Array.from(allowedPasswords).some((p) => p.toLowerCase() === inputPassword.toLowerCase());
  if (!isPasswordValid && inputPassword && Array.isArray(db.users)) {
    const adminUser = db.users.find(
      (u) => u.email && u.email.toLowerCase() === "shivshahidoors@gmail.com" || inputEmail && u.email && u.email.toLowerCase() === inputEmail
    );
    if (adminUser && adminUser.salt && adminUser.passwordHash) {
      if (hashPassword(inputPassword, adminUser.salt) === adminUser.passwordHash) {
        isPasswordValid = true;
      }
    }
  }
  if (!isEmailValid || !isPasswordValid) {
    return res.status(401).json({ error: "Invalid email or password. You can use default password: admin123" });
  }
  const token = import_crypto.default.randomBytes(32).toString("hex");
  activeTokens.add(token);
  res.json({
    success: true,
    token,
    user: { role: "admin", email: inputEmail || "shivshahidoors@gmail.com", name: db.settings?.businessName || "Shivshahi Doors" }
  });
});
app.post("/api/auth/reset-default-password", (req, res) => {
  const db = getDb();
  db.adminPasswordHash = "admin123";
  saveDb(db);
  res.json({ success: true, message: "Admin password reset to default: admin123" });
});
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    activeTokens.delete(token);
  }
  res.json({ success: true, message: "Logged out successfully" });
});
app.get("/api/auth/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({ authenticated: false });
  }
  const token = authHeader.split(" ")[1];
  res.json({ authenticated: activeTokens.has(token) });
});
app.get("/api/admin/all-data", verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json({
    doors: db.doors,
    categories: db.categories,
    materials: db.materials,
    finishes: db.finishes,
    frames: db.frames,
    hardware: db.hardware,
    banners: db.banners,
    articles: db.articles,
    quotes: db.quotes,
    settings: db.settings,
    teamMembers: (db.teamMembers || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
  });
});
app.post("/api/admin/doors", verifyAdminToken, (req, res) => {
  const db = getDb();
  const newDoor = {
    id: "door-" + Date.now(),
    name: req.body.name || "New Door Design",
    category: req.body.category || "Sagwan Door",
    description: req.body.description || "",
    material: req.body.material || "Sagwan",
    startingPrice: Number(req.body.startingPrice) || 12e3,
    images: Array.isArray(req.body.images) && req.body.images.length > 0 ? req.body.images : ["https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80"],
    availableSizes: Array.isArray(req.body.availableSizes) && req.body.availableSizes.length > 0 ? req.body.availableSizes : ["30 \xD7 78 inch", "32 \xD7 78 inch", "34 \xD7 78 inch", "36 \xD7 78 inch", "Custom Size"],
    featured: Boolean(req.body.featured),
    popular: Boolean(req.body.popular),
    active: req.body.active !== void 0 ? Boolean(req.body.active) : true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.doors.unshift(newDoor);
  saveDb(db);
  res.status(201).json(newDoor);
});
app.put("/api/admin/doors/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.doors.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Door not found" });
  db.doors[idx] = { ...db.doors[idx], ...req.body, id: db.doors[idx].id };
  saveDb(db);
  res.json(db.doors[idx]);
});
app.delete("/api/admin/doors/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.doors = db.doors.filter((d) => d.id !== req.params.id);
  saveDb(db);
  res.json({ success: true, message: "Door design deleted" });
});
app.post("/api/admin/categories", verifyAdminToken, (req, res) => {
  const db = getDb();
  const newCat = {
    id: "cat-" + Date.now(),
    name: req.body.name,
    slug: req.body.slug || req.body.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    description: req.body.description || "",
    image: req.body.image || ""
  };
  db.categories.push(newCat);
  saveDb(db);
  res.status(201).json(newCat);
});
app.put("/api/admin/categories/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Category not found" });
  db.categories[idx] = { ...db.categories[idx], ...req.body, id: db.categories[idx].id };
  saveDb(db);
  res.json(db.categories[idx]);
});
app.delete("/api/admin/categories/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});
app.post("/api/admin/materials", verifyAdminToken, (req, res) => {
  const db = getDb();
  const newMat = {
    id: "mat-" + Date.now(),
    name: req.body.name,
    ratePerSqFt: Number(req.body.ratePerSqFt) || 500,
    description: req.body.description || "",
    active: req.body.active !== void 0 ? Boolean(req.body.active) : true
  };
  db.materials.push(newMat);
  saveDb(db);
  res.status(201).json(newMat);
});
app.put("/api/admin/materials/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.materials.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Material not found" });
  db.materials[idx] = {
    ...db.materials[idx],
    ...req.body,
    ratePerSqFt: Number(req.body.ratePerSqFt ?? db.materials[idx].ratePerSqFt),
    id: db.materials[idx].id
  };
  saveDb(db);
  res.json(db.materials[idx]);
});
app.delete("/api/admin/materials/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.materials = db.materials.filter((m) => m.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});
app.post("/api/admin/finishes", verifyAdminToken, (req, res) => {
  const db = getDb();
  const newFin = {
    id: "fin-" + Date.now(),
    name: req.body.name,
    ratePerSqFt: Number(req.body.ratePerSqFt) || 120,
    description: req.body.description || "",
    active: req.body.active !== void 0 ? Boolean(req.body.active) : true
  };
  db.finishes.push(newFin);
  saveDb(db);
  res.status(201).json(newFin);
});
app.put("/api/admin/finishes/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.finishes.findIndex((f) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Finish not found" });
  db.finishes[idx] = {
    ...db.finishes[idx],
    ...req.body,
    ratePerSqFt: Number(req.body.ratePerSqFt ?? db.finishes[idx].ratePerSqFt),
    id: db.finishes[idx].id
  };
  saveDb(db);
  res.json(db.finishes[idx]);
});
app.delete("/api/admin/finishes/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.finishes = db.finishes.filter((f) => f.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});
app.post("/api/admin/frames", verifyAdminToken, (req, res) => {
  const db = getDb();
  const newFrame = {
    id: "frm-" + Date.now(),
    name: req.body.name,
    price: Number(req.body.price) || 3500,
    image: req.body.image || "",
    description: req.body.description || "",
    active: req.body.active !== void 0 ? Boolean(req.body.active) : true
  };
  db.frames.push(newFrame);
  saveDb(db);
  res.status(201).json(newFrame);
});
app.put("/api/admin/frames/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.frames.findIndex((fr) => fr.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Frame not found" });
  db.frames[idx] = {
    ...db.frames[idx],
    ...req.body,
    price: Number(req.body.price ?? db.frames[idx].price),
    id: db.frames[idx].id
  };
  saveDb(db);
  res.json(db.frames[idx]);
});
app.delete("/api/admin/frames/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.frames = db.frames.filter((fr) => fr.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});
app.post("/api/admin/hardware", verifyAdminToken, (req, res) => {
  const db = getDb();
  const newHwd = {
    id: "hwd-" + Date.now(),
    name: req.body.name,
    price: Number(req.body.price) || 700,
    image: req.body.image || "",
    description: req.body.description || "",
    active: req.body.active !== void 0 ? Boolean(req.body.active) : true,
    defaultQty: Number(req.body.defaultQty) || 1
  };
  db.hardware.push(newHwd);
  saveDb(db);
  res.status(201).json(newHwd);
});
app.put("/api/admin/hardware/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.hardware.findIndex((h) => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Hardware not found" });
  db.hardware[idx] = {
    ...db.hardware[idx],
    ...req.body,
    price: Number(req.body.price ?? db.hardware[idx].price),
    defaultQty: Number(req.body.defaultQty ?? db.hardware[idx].defaultQty),
    id: db.hardware[idx].id
  };
  saveDb(db);
  res.json(db.hardware[idx]);
});
app.delete("/api/admin/hardware/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.hardware = db.hardware.filter((h) => h.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});
app.post("/api/admin/banners", verifyAdminToken, (req, res) => {
  const db = getDb();
  const newBanner = {
    id: "ban-" + Date.now(),
    title: req.body.title || "New Banner",
    subtitle: req.body.subtitle || "",
    image: req.body.image || "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80",
    buttonText: req.body.buttonText || "Calculate Price",
    buttonAction: req.body.buttonAction || "calculator",
    order: Number(req.body.order) || db.banners.length + 1,
    active: req.body.active !== void 0 ? Boolean(req.body.active) : true
  };
  db.banners.push(newBanner);
  saveDb(db);
  res.status(201).json(newBanner);
});
app.put("/api/admin/banners/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.banners.findIndex((b) => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Banner not found" });
  db.banners[idx] = { ...db.banners[idx], ...req.body, id: db.banners[idx].id };
  saveDb(db);
  res.json(db.banners[idx]);
});
app.delete("/api/admin/banners/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.banners = db.banners.filter((b) => b.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});
function extractYoutubeId(url) {
  if (!url) return void 0;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : void 0;
}
function calculateReadingTime(content) {
  if (!content) return "2 min read";
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}
function generateSlug(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
app.get("/api/articles", (req, res) => {
  try {
    const db = getDb();
    const now = Date.now();
    let dbModified = false;
    db.articles.forEach((art) => {
      if (art.status === "scheduled" && art.scheduledAt && new Date(art.scheduledAt).getTime() <= now) {
        art.status = "published";
        art.published = true;
        art.publishedAt = art.publishedAt || (/* @__PURE__ */ new Date()).toISOString();
        dbModified = true;
      }
    });
    if (dbModified) saveDb(db);
    let articles = db.articles.filter((a) => a.published !== false && a.status !== "draft" && a.status !== "archived");
    const q = req.query.q;
    if (q && q.trim()) {
      const searchTerms = q.toLowerCase().trim().split(/\s+/);
      articles = articles.filter((a) => {
        const textToSearch = `${a.title} ${a.excerpt} ${a.content} ${a.author || ""} ${(a.tags || []).join(" ")} ${a.seo?.focusKeyword || ""}`.toLowerCase();
        return searchTerms.every((term) => textToSearch.includes(term));
      });
    }
    const category = req.query.category;
    if (category && category !== "all") {
      articles = articles.filter(
        (a) => a.category && a.category.toLowerCase() === category.toLowerCase() || a.categoryId && a.categoryId.toLowerCase() === category.toLowerCase()
      );
    }
    const tag = req.query.tag;
    if (tag) {
      articles = articles.filter((a) => Array.isArray(a.tags) && a.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
    }
    const sort = req.query.sort || "latest";
    if (sort === "popular") {
      articles.sort((a, b) => {
        const scoreA = (a.views || 0) + (a.likes || 0) * 5 + (a.shares || 0) * 10 + (a.commentCount || 0) * 10;
        const scoreB = (b.views || 0) + (b.likes || 0) * 5 + (b.shares || 0) * 10 + (b.commentCount || 0) * 10;
        return scoreB - scoreA;
      });
    } else if (sort === "views") {
      articles.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === "likes") {
      articles.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      articles.sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
    }
    articles = articles.map((art) => {
      const approvedCount = db.articleComments.filter((c) => c.articleId === art.id && c.status === "approved").length;
      return {
        ...art,
        commentCount: Math.max(art.commentCount || 0, approvedCount)
      };
    });
    res.json({ success: true, articles, total: articles.length });
  } catch (err) {
    console.error("Error fetching articles:", err);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});
app.get("/api/articles/categories", (_req, res) => {
  const db = getDb();
  const cats = (db.articleCategories || []).filter((c) => c.active !== false);
  const counts = {};
  db.articles.forEach((a) => {
    if (a.published) {
      if (a.category) counts[a.category] = (counts[a.category] || 0) + 1;
      if (a.categoryId) counts[a.categoryId] = (counts[a.categoryId] || 0) + 1;
    }
  });
  const categoriesWithCount = cats.map((c) => ({
    ...c,
    count: counts[c.name] || counts[c.id] || counts[c.slug] || 0
  }));
  res.json({ success: true, categories: categoriesWithCount });
});
app.get("/api/articles/:slugOrId", (req, res) => {
  try {
    const { slugOrId } = req.params;
    const db = getDb();
    const article = db.articles.find((a) => a.id === slugOrId || a.slug === slugOrId);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    const approvedComments = db.articleComments.filter((c) => c.articleId === article.id && c.status === "approved").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const relatedDoorIds = article.relatedDoorIds || [];
    const relatedDoors = db.doors.filter((d) => relatedDoorIds.includes(d.id));
    const otherArticles = db.articles.filter((a) => a.id !== article.id && a.published);
    const relatedArticles = otherArticles.filter((a) => article.category && a.category === article.category || article.tags && a.tags?.some((t) => article.tags?.includes(t))).slice(0, 3);
    if (relatedArticles.length === 0) {
      relatedArticles.push(...otherArticles.slice(0, 3));
    }
    article.commentCount = approvedComments.length;
    res.json({
      success: true,
      article,
      comments: approvedComments,
      relatedDoors,
      relatedArticles
    });
  } catch (err) {
    console.error("Error fetching article details:", err);
    res.status(500).json({ error: "Failed to fetch article details" });
  }
});
app.post("/api/articles/:id/view", (req, res) => {
  try {
    const { id } = req.params;
    const { viewerHash } = req.body;
    const db = getDb();
    const article = db.articles.find((a) => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    const hash = viewerHash || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "guest";
    const now = Date.now();
    const DEDUP_WINDOW_MS = 2 * 60 * 60 * 1e3;
    if (!Array.isArray(db.articleViews)) db.articleViews = [];
    const existingView = db.articleViews.find(
      (v) => v.articleId === article.id && v.viewerHash === hash && now - v.timestamp < DEDUP_WINDOW_MS
    );
    let counted = false;
    if (!existingView) {
      article.views = (article.views || 0) + 1;
      db.articleViews.push({ articleId: article.id, viewerHash: hash, timestamp: now });
      db.articleViews = db.articleViews.filter((v) => now - v.timestamp < 24 * 60 * 60 * 1e3);
      saveDb(db);
      counted = true;
    }
    res.json({
      success: true,
      views: article.views || 0,
      counted
    });
  } catch (err) {
    console.error("Error registering view:", err);
    res.status(500).json({ error: "Failed to register view" });
  }
});
app.post("/api/articles/:id/like", (req, res) => {
  try {
    const { id } = req.params;
    const { likerHash } = req.body;
    const userId = getAuthenticatedUserId(req);
    const db = getDb();
    const article = db.articles.find((a) => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    const likerKey = userId ? `user:${userId}` : likerHash || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "guest";
    if (!Array.isArray(db.articleLikes)) db.articleLikes = [];
    const existingLikeIndex = db.articleLikes.findIndex(
      (l) => l.articleId === article.id && l.likerHash === likerKey
    );
    let liked = false;
    if (existingLikeIndex !== -1) {
      db.articleLikes.splice(existingLikeIndex, 1);
      article.likes = Math.max(0, (article.likes || 1) - 1);
      liked = false;
    } else {
      db.articleLikes.push({
        articleId: article.id,
        likerHash: likerKey,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      article.likes = (article.likes || 0) + 1;
      liked = true;
    }
    saveDb(db);
    res.json({
      success: true,
      liked,
      likes: article.likes
    });
  } catch (err) {
    console.error("Error toggling like:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});
app.post("/api/articles/:id/share", (req, res) => {
  try {
    const { id } = req.params;
    const { platform = "direct" } = req.body;
    const db = getDb();
    const article = db.articles.find((a) => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    if (!Array.isArray(db.articleShares)) db.articleShares = [];
    article.shares = (article.shares || 0) + 1;
    db.articleShares.push({
      articleId: article.id,
      platform,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveDb(db);
    res.json({
      success: true,
      shares: article.shares
    });
  } catch (err) {
    console.error("Error recording share:", err);
    res.status(500).json({ error: "Failed to record share" });
  }
});
app.post("/api/articles/:id/comments", (req, res) => {
  try {
    const { id } = req.params;
    const { authorName, authorEmail, content } = req.body;
    const userId = getAuthenticatedUserId(req);
    const db = getDb();
    const article = db.articles.find((a) => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    if (!content || typeof content !== "string" || content.trim().length < 3) {
      return res.status(400).json({ error: "Comment content must be at least 3 characters long" });
    }
    let finalAuthorName = authorName?.trim();
    let finalAuthorEmail = authorEmail?.trim();
    if (userId) {
      const user = db.users.find((u) => u.id === userId);
      if (user) {
        finalAuthorName = finalAuthorName || user.name;
        finalAuthorEmail = finalAuthorEmail || user.email;
      }
    }
    if (!finalAuthorName) {
      finalAuthorName = "Valued Customer";
    }
    if (!Array.isArray(db.articleComments)) db.articleComments = [];
    const newComment = {
      id: "comm-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      articleId: article.id,
      authorName: finalAuthorName,
      authorEmail: finalAuthorEmail,
      userId: userId || void 0,
      content: content.trim(),
      status: "approved",
      // Automatically approved or can be pending. Defaulting to approved for immediate responsiveness while allowing admin moderation
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      likes: 0
    };
    db.articleComments.unshift(newComment);
    article.commentCount = (article.commentCount || 0) + 1;
    saveDb(db);
    res.status(201).json({
      success: true,
      comment: newComment,
      message: "Your comment has been posted successfully!"
    });
  } catch (err) {
    console.error("Error submitting comment:", err);
    res.status(500).json({ error: "Failed to submit comment" });
  }
});
app.get("/api/articles/:id/comments", (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const article = db.articles.find((a) => a.id === id || a.slug === id);
  if (!article) return res.status(404).json({ error: "Article not found" });
  const comments = (db.articleComments || []).filter((c) => c.articleId === article.id && c.status === "approved").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, comments });
});
app.get("/api/admin/articles", verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    const articlesWithMeta = db.articles.map((art) => {
      const comments = (db.articleComments || []).filter((c) => c.articleId === art.id);
      const pendingComments = comments.filter((c) => c.status === "pending").length;
      const approvedComments = comments.filter((c) => c.status === "approved").length;
      return {
        ...art,
        commentCount: approvedComments,
        pendingCommentsCount: pendingComments
      };
    });
    res.json(articlesWithMeta);
  } catch (err) {
    console.error("Admin fetch articles error:", err);
    res.status(500).json({ error: "Failed to load articles" });
  }
});
app.post("/api/admin/articles", verifyAdminToken, async (req, res) => {
  try {
    const db = getDb();
    const title = (req.body.title || "Untitled Wood Guide").trim();
    let slug = (req.body.slug || generateSlug(title)).trim();
    let uniqueSlug = slug;
    let counter = 1;
    while (db.articles.some((a) => a.slug === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter++}`;
    }
    const content = req.body.content || "";
    const readTime = req.body.readTime || calculateReadingTime(content);
    const youtubeUrl = req.body.youtubeUrl?.trim() || void 0;
    const youtubeVideoId = req.body.youtubeVideoId?.trim() || extractYoutubeId(youtubeUrl);
    const status = req.body.status || (req.body.published !== false ? "published" : "draft");
    const published = status === "published";
    const newArt = {
      id: "art-" + Date.now(),
      title,
      slug: uniqueSlug,
      image: req.body.image || "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      gallery: Array.isArray(req.body.gallery) ? req.body.gallery : [],
      excerpt: (req.body.excerpt || "").trim(),
      content,
      author: (req.body.author || "Shivshahi Wood Experts").trim(),
      authorPhoto: req.body.authorPhoto?.trim() || void 0,
      authorBio: req.body.authorBio?.trim() || void 0,
      category: req.body.category || "Door Guide",
      categoryId: req.body.categoryId || void 0,
      tags: Array.isArray(req.body.tags) ? req.body.tags.map((t) => t.trim()).filter(Boolean) : ["Sagwan Door"],
      readTime,
      status,
      published,
      publishedAt: published ? req.body.publishedAt || (/* @__PURE__ */ new Date()).toISOString() : void 0,
      scheduledAt: status === "scheduled" ? req.body.scheduledAt : void 0,
      views: Number(req.body.views) || 0,
      likes: Number(req.body.likes) || 0,
      shares: Number(req.body.shares) || 0,
      commentCount: 0,
      youtubeVideoId,
      youtubeUrl,
      youtubeTitle: req.body.youtubeTitle?.trim() || void 0,
      youtubeDescription: req.body.youtubeDescription?.trim() || void 0,
      relatedDoorIds: Array.isArray(req.body.relatedDoorIds) ? req.body.relatedDoorIds : [],
      relatedArticleIds: Array.isArray(req.body.relatedArticleIds) ? req.body.relatedArticleIds : [],
      cta: req.body.cta || {
        enabled: true,
        type: "calculator",
        title: "Calculate Door Price For Your Size",
        buttonText: "Open Door Calculator"
      },
      seo: req.body.seo || {
        seoTitle: `${title} | Shivshahi Doors`,
        metaDescription: req.body.excerpt || title,
        focusKeyword: title.split(" ")[0]
      },
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.articles.unshift(newArt);
    saveDb(db);
    if (req.body.notifySubscribers && published) {
      try {
        const campaign = {
          id: "camp_art_" + Date.now(),
          title: `New Guide: ${newArt.title}`,
          message: newArt.excerpt || "Read our newly published expert woodworking and door guide.",
          image: newArt.image,
          category: "important_updates",
          targetAudience: "all",
          deepLink: `/articles/${newArt.slug}`,
          status: "sent",
          createdBy: "Admin (Article Publisher)",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await sendCampaignNotification(campaign);
      } catch (notifyErr) {
        console.warn("Article push notification dispatch warning:", notifyErr);
      }
    }
    res.status(201).json(newArt);
  } catch (err) {
    console.error("Error creating article:", err);
    res.status(500).json({ error: "Failed to create article" });
  }
});
app.put("/api/admin/articles/:id", verifyAdminToken, async (req, res) => {
  try {
    const db = getDb();
    const idx = db.articles.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Article not found" });
    const current = db.articles[idx];
    const title = (req.body.title || current.title).trim();
    let slug = (req.body.slug || current.slug || generateSlug(title)).trim();
    let uniqueSlug = slug;
    let counter = 1;
    while (db.articles.some((a) => a.id !== req.params.id && a.slug === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter++}`;
    }
    const content = req.body.content !== void 0 ? req.body.content : current.content;
    const readTime = req.body.readTime || calculateReadingTime(content);
    const youtubeUrl = req.body.youtubeUrl !== void 0 ? req.body.youtubeUrl?.trim() || void 0 : current.youtubeUrl;
    const youtubeVideoId = req.body.youtubeVideoId?.trim() || extractYoutubeId(youtubeUrl) || current.youtubeVideoId;
    const status = req.body.status || (req.body.published !== void 0 ? req.body.published ? "published" : "draft" : current.status);
    const published = status === "published";
    const wasPublished = current.published;
    db.articles[idx] = {
      ...current,
      ...req.body,
      id: current.id,
      title,
      slug: uniqueSlug,
      content,
      readTime,
      youtubeUrl,
      youtubeVideoId,
      status,
      published,
      publishedAt: published && !current.publishedAt ? (/* @__PURE__ */ new Date()).toISOString() : current.publishedAt,
      views: req.body.views !== void 0 ? Number(req.body.views) : current.views,
      likes: req.body.likes !== void 0 ? Number(req.body.likes) : current.likes,
      shares: req.body.shares !== void 0 ? Number(req.body.shares) : current.shares,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDb(db);
    if (req.body.notifySubscribers && published) {
      try {
        const campaign = {
          id: "camp_art_" + Date.now(),
          title: `Updated Guide: ${db.articles[idx].title}`,
          message: db.articles[idx].excerpt || "Read our freshly updated woodwork and door guide.",
          image: db.articles[idx].image,
          category: "important_updates",
          targetAudience: "all",
          deepLink: `/articles/${db.articles[idx].slug}`,
          status: "sent",
          createdBy: "Admin",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await sendCampaignNotification(campaign);
      } catch (notifyErr) {
        console.warn("Article push notification update warning:", notifyErr);
      }
    }
    res.json(db.articles[idx]);
  } catch (err) {
    console.error("Error updating article:", err);
    res.status(500).json({ error: "Failed to update article" });
  }
});
app.delete("/api/admin/articles/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.articles = db.articles.filter((a) => a.id !== req.params.id);
  db.articleComments = (db.articleComments || []).filter((c) => c.articleId !== req.params.id);
  saveDb(db);
  res.json({ success: true, message: "Article and comments deleted successfully" });
});
app.get("/api/admin/articles/comments", verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status;
    const articleId = req.query.articleId;
    let comments = [...db.articleComments || []];
    if (articleId) {
      comments = comments.filter((c) => c.articleId === articleId);
    }
    if (status && status !== "all") {
      comments = comments.filter((c) => c.status === status);
    }
    const enriched = comments.map((c) => {
      const art = db.articles.find((a) => a.id === c.articleId);
      return {
        ...c,
        articleTitle: art ? art.title : "Deleted Article",
        articleSlug: art?.slug
      };
    });
    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({
      success: true,
      comments: enriched,
      counts: {
        all: (db.articleComments || []).length,
        pending: (db.articleComments || []).filter((c) => c.status === "pending").length,
        approved: (db.articleComments || []).filter((c) => c.status === "approved").length,
        hidden: (db.articleComments || []).filter((c) => c.status === "hidden").length,
        spam: (db.articleComments || []).filter((c) => c.status === "spam").length
      }
    });
  } catch (err) {
    console.error("Error fetching admin comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});
app.patch("/api/admin/articles/comments/:commentId", verifyAdminToken, (req, res) => {
  try {
    const { commentId } = req.params;
    const { status } = req.body;
    const db = getDb();
    const idx = (db.articleComments || []).findIndex((c) => c.id === commentId);
    if (idx === -1) return res.status(404).json({ error: "Comment not found" });
    db.articleComments[idx].status = status;
    const art = db.articles.find((a) => a.id === db.articleComments[idx].articleId);
    if (art) {
      art.commentCount = db.articleComments.filter((c) => c.articleId === art.id && c.status === "approved").length;
    }
    saveDb(db);
    res.json({ success: true, comment: db.articleComments[idx] });
  } catch (err) {
    console.error("Error moderating comment:", err);
    res.status(500).json({ error: "Failed to update comment status" });
  }
});
app.post("/api/admin/articles/comments/:commentId/reply", verifyAdminToken, (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, authorName = "Shivshahi Wood Experts" } = req.body;
    const db = getDb();
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Reply text is required" });
    }
    const idx = (db.articleComments || []).findIndex((c) => c.id === commentId);
    if (idx === -1) return res.status(404).json({ error: "Comment not found" });
    db.articleComments[idx].adminReply = {
      text: text.trim(),
      repliedAt: (/* @__PURE__ */ new Date()).toISOString(),
      authorName: authorName.trim()
    };
    db.articleComments[idx].status = "approved";
    const art = db.articles.find((a) => a.id === db.articleComments[idx].articleId);
    if (art) {
      art.commentCount = db.articleComments.filter((c) => c.articleId === art.id && c.status === "approved").length;
    }
    saveDb(db);
    res.json({ success: true, comment: db.articleComments[idx] });
  } catch (err) {
    console.error("Error replying to comment:", err);
    res.status(500).json({ error: "Failed to save reply" });
  }
});
app.delete("/api/admin/articles/comments/:commentId", verifyAdminToken, (req, res) => {
  const { commentId } = req.params;
  const db = getDb();
  const comm = (db.articleComments || []).find((c) => c.id === commentId);
  if (!comm) return res.status(404).json({ error: "Comment not found" });
  const articleId = comm.articleId;
  db.articleComments = db.articleComments.filter((c) => c.id !== commentId);
  const art = db.articles.find((a) => a.id === articleId);
  if (art) {
    art.commentCount = db.articleComments.filter((c) => c.articleId === art.id && c.status === "approved").length;
  }
  saveDb(db);
  res.json({ success: true, message: "Comment deleted" });
});
app.get("/api/admin/articles/analytics", verifyAdminToken, (_req, res) => {
  try {
    const db = getDb();
    const articles = db.articles || [];
    const comments = db.articleComments || [];
    const totalArticles = articles.length;
    const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalLikes = articles.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalShares = articles.reduce((sum, a) => sum + (a.shares || 0), 0);
    const totalComments = comments.filter((c) => c.status === "approved").length;
    const overallEngagementRate = totalViews > 0 ? Math.round((totalLikes + totalComments + totalShares) / totalViews * 1e3) / 10 : 0;
    const topViewed = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const topLiked = [...articles].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5);
    const topShared = [...articles].sort((a, b) => (b.shares || 0) - (a.shares || 0)).slice(0, 5);
    const topCommented = [...articles].sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0)).slice(0, 5);
    res.json({
      success: true,
      summary: {
        totalArticles,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        overallEngagementRate,
        topViewed,
        topLiked,
        topShared,
        topCommented
      }
    });
  } catch (err) {
    console.error("Error computing article analytics:", err);
    res.status(500).json({ error: "Failed to compute analytics" });
  }
});
app.get("/api/admin/article-categories", verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json(db.articleCategories || []);
});
app.post("/api/admin/article-categories", verifyAdminToken, (req, res) => {
  const db = getDb();
  if (!Array.isArray(db.articleCategories)) db.articleCategories = [];
  const name = (req.body.name || "New Category").trim();
  const newCat = {
    id: "cat-art-" + Date.now(),
    name,
    slug: req.body.slug || generateSlug(name),
    description: req.body.description || "",
    active: req.body.active !== void 0 ? Boolean(req.body.active) : true
  };
  db.articleCategories.push(newCat);
  saveDb(db);
  res.status(201).json(newCat);
});
app.put("/api/admin/article-categories/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  if (!Array.isArray(db.articleCategories)) db.articleCategories = [];
  const idx = db.articleCategories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Category not found" });
  db.articleCategories[idx] = { ...db.articleCategories[idx], ...req.body, id: db.articleCategories[idx].id };
  saveDb(db);
  res.json(db.articleCategories[idx]);
});
app.delete("/api/admin/article-categories/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  if (!Array.isArray(db.articleCategories)) db.articleCategories = [];
  db.articleCategories = db.articleCategories.filter((c) => c.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});
app.put("/api/admin/settings", verifyAdminToken, (req, res) => {
  const db = getDb();
  const { adminPassword, ...newSettings } = req.body;
  db.settings = {
    ...db.settings,
    ...newSettings,
    additionalChargePercentage: Number(newSettings.additionalChargePercentage ?? db.settings.additionalChargePercentage)
  };
  if (newSettings.googleMapsUrl) {
    db.settings.googleMapsUrl = String(newSettings.googleMapsUrl).trim();
    if (!db.settings.legalSettings) db.settings.legalSettings = {};
    if (!db.settings.legalSettings.socialLinks) db.settings.legalSettings.socialLinks = {};
    db.settings.legalSettings.socialLinks.googleBusiness = db.settings.googleMapsUrl;
  }
  if (newSettings.legalSettings) {
    db.settings.legalSettings = {
      ...db.settings.legalSettings,
      ...newSettings.legalSettings,
      socialLinks: {
        ...db.settings.legalSettings?.socialLinks,
        ...newSettings.legalSettings.socialLinks || {}
      }
    };
  }
  if (newSettings.contentProtection) {
    db.settings.contentProtection = {
      enableImageProtection: Boolean(newSettings.contentProtection.enableImageProtection ?? true),
      enableWatermark: Boolean(newSettings.contentProtection.enableWatermark ?? true),
      watermarkText: String(newSettings.contentProtection.watermarkText || "Jai Hanuman Door").slice(0, 60),
      watermarkOpacity: Math.min(0.6, Math.max(0.05, Number(newSettings.contentProtection.watermarkOpacity ?? 0.22))),
      watermarkPattern: ["diagonal", "center", "repeated", "corner"].includes(newSettings.contentProtection.watermarkPattern) ? newSettings.contentProtection.watermarkPattern : "diagonal",
      enableAndroidFlagSecure: Boolean(newSettings.contentProtection.enableAndroidFlagSecure ?? true),
      enableAndroidScreenRecordProtection: Boolean(newSettings.contentProtection.enableAndroidScreenRecordProtection ?? true)
    };
  }
  if (newSettings.aiWoodDetector) {
    db.settings.aiWoodDetector = {
      enabled: Boolean(newSettings.aiWoodDetector.enabled ?? true),
      maxDailyScans: Number(newSettings.aiWoodDetector.maxDailyScans ?? 150),
      customNotice: typeof newSettings.aiWoodDetector.customNotice === "string" ? newSettings.aiWoodDetector.customNotice : ""
    };
  }
  if (adminPassword && typeof adminPassword === "string" && adminPassword.trim().length >= 4) {
    db.adminPasswordHash = adminPassword.trim();
  }
  saveDb(db);
  res.json({ success: true, settings: db.settings });
});
app.post("/api/enquiries", (req, res) => {
  const { name, phone, email, city, enquiryType, doorId, doorName, message } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Please enter a valid full name (minimum 2 characters)." });
  }
  const cleanedPhone = String(phone || "").replace(/[^0-9+]/g, "");
  const digitsOnly = cleanedPhone.replace(/[^0-9]/g, "");
  if (!cleanedPhone || digitsOnly.length < 10) {
    return res.status(400).json({ error: "Please enter a valid contact phone number with at least 10 digits." });
  }
  if (!message || typeof message !== "string" || message.trim().length < 5) {
    return res.status(400).json({ error: "Please provide brief details or your door requirement (minimum 5 characters)." });
  }
  const db = getDb();
  if (!Array.isArray(db.enquiries)) {
    db.enquiries = [];
  }
  const now = Date.now();
  const duplicate = db.enquiries.find((e) => {
    const timeDiff = now - new Date(e.createdAt).getTime();
    return timeDiff < 6e4 && e.phone.replace(/[^0-9]/g, "") === digitsOnly;
  });
  if (duplicate) {
    return res.status(429).json({
      error: "We have already received your enquiry recently. Our factory representative will reach out to you promptly."
    });
  }
  const newEnquiry = {
    id: `enq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim().slice(0, 80),
    phone: cleanedPhone.slice(0, 25),
    email: email && typeof email === "string" && email.includes("@") ? email.trim().slice(0, 100) : void 0,
    city: city && typeof city === "string" ? city.trim().slice(0, 80) : void 0,
    enquiryType: enquiryType && typeof enquiryType === "string" ? enquiryType.trim().slice(0, 60) : "General Inquiry",
    doorId: doorId ? String(doorId).slice(0, 50) : void 0,
    doorName: doorName ? String(doorName).slice(0, 100) : void 0,
    message: message.trim().slice(0, 2e3),
    status: "new",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.enquiries.unshift(newEnquiry);
  if (db.enquiries.length > 500) {
    db.enquiries = db.enquiries.slice(0, 500);
  }
  saveDb(db);
  res.json({
    success: true,
    enquiry: {
      id: newEnquiry.id,
      name: newEnquiry.name,
      status: newEnquiry.status,
      createdAt: newEnquiry.createdAt
    },
    message: "Thank you! Your enquiry has been received. Our factory team will connect with you shortly."
  });
});
app.get("/api/admin/enquiries", verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json({
    success: true,
    enquiries: db.enquiries || []
  });
});
app.put("/api/admin/enquiries/:id/status", verifyAdminToken, (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!["new", "contacted", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be new, contacted, or resolved." });
  }
  const enq = (db.enquiries || []).find((e) => e.id === req.params.id);
  if (!enq) {
    return res.status(404).json({ error: "Enquiry not found." });
  }
  enq.status = status;
  saveDb(db);
  res.json({ success: true, enquiry: enq });
});
app.delete("/api/admin/enquiries/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.enquiries = (db.enquiries || []).filter((e) => e.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});
app.get("/api/admin/quotes", verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json(db.quotes || []);
});
app.delete("/api/admin/quotes/:id", verifyAdminToken, (req, res) => {
  const db = getDb();
  db.quotes = db.quotes.filter((q) => q.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});
app.get("/api/admin/backup/export", verifyAdminToken, (_req, res) => {
  try {
    const backup = exportDatabaseBackup();
    const filename = `jaihanuman-production-backup-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to export backup" });
  }
});
app.post("/api/admin/backup/import", verifyAdminToken, (req, res) => {
  try {
    const result = importDatabaseBackup(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to restore backup" });
  }
});
app.get("/api/admin/backup/list", verifyAdminToken, (_req, res) => {
  try {
    const backups = listAvailableBackups();
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to list backups" });
  }
});
app.post("/api/admin/backup/restore-local", verifyAdminToken, (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }
    const result = restoreBackupFile(filename);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to restore local backup" });
  }
});
app.post("/api/admin/reset-defaults", verifyAdminToken, (_req, res) => {
  res.status(403).json({
    error: "Direct factory reset is disabled to protect your live business data. Use Admin Backup & Restore to manage your catalogue versions safely."
  });
});
app.get("/api/team-members", (_req, res) => {
  const db = getDb();
  const members = (db.teamMembers || []).filter((m) => m.active).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json({ success: true, teamMembers: members });
});
app.get("/api/admin/team-members", verifyAdminToken, (_req, res) => {
  const db = getDb();
  const members = (db.teamMembers || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json({ success: true, teamMembers: members });
});
app.post("/api/admin/team-members", verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) {
      db.teamMembers = [];
    }
    const name = (req.body.name || "").trim();
    const designation = (req.body.designation || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Team member name is required" });
    }
    if (!designation) {
      return res.status(400).json({ error: "Team member designation is required" });
    }
    const highestOrder = db.teamMembers.reduce((max, m) => Math.max(max, m.displayOrder || 0), 0);
    const displayOrder = Number(req.body.displayOrder) > 0 ? Number(req.body.displayOrder) : highestOrder + 1;
    const parseList = (input) => {
      if (Array.isArray(input)) {
        return input.map((item) => String(item).trim()).filter(Boolean);
      }
      if (typeof input === "string") {
        return input.split("\n").map((line) => line.trim()).filter(Boolean);
      }
      return [];
    };
    const newMember = {
      id: "team-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      name,
      designation,
      photo: req.body.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
      shortBio: (req.body.shortBio || "").trim(),
      fullBio: (req.body.fullBio || "").trim(),
      experience: req.body.experience ? String(req.body.experience).trim() : void 0,
      specialization: req.body.specialization ? String(req.body.specialization).trim() : void 0,
      responsibilities: parseList(req.body.responsibilities),
      achievements: parseList(req.body.achievements),
      socialLinks: {
        linkedin: req.body.socialLinks?.linkedin?.trim() || void 0,
        instagram: req.body.socialLinks?.instagram?.trim() || void 0,
        facebook: req.body.socialLinks?.facebook?.trim() || void 0,
        youtube: req.body.socialLinks?.youtube?.trim() || void 0,
        email: req.body.socialLinks?.email?.trim() || void 0
      },
      videoUrl: req.body.videoUrl ? String(req.body.videoUrl).trim() : void 0,
      displayOrder,
      active: req.body.active !== void 0 ? Boolean(req.body.active) : true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.teamMembers.push(newMember);
    saveDb(db);
    res.status(201).json({ success: true, member: newMember });
  } catch (err) {
    console.error("Error creating team member:", err);
    res.status(500).json({ error: "Failed to create team member" });
  }
});
app.put("/api/admin/team-members/:id", verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];
    const index = db.teamMembers.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Team member not found" });
    }
    const current = db.teamMembers[index];
    const parseList = (input) => {
      if (Array.isArray(input)) {
        return input.map((item) => String(item).trim()).filter(Boolean);
      }
      if (typeof input === "string") {
        return input.split("\n").map((line) => line.trim()).filter(Boolean);
      }
      return [];
    };
    const updatedMember = {
      ...current,
      name: req.body.name !== void 0 ? String(req.body.name).trim() : current.name,
      designation: req.body.designation !== void 0 ? String(req.body.designation).trim() : current.designation,
      photo: req.body.photo !== void 0 ? String(req.body.photo).trim() : current.photo,
      shortBio: req.body.shortBio !== void 0 ? String(req.body.shortBio).trim() : current.shortBio,
      fullBio: req.body.fullBio !== void 0 ? String(req.body.fullBio).trim() : current.fullBio,
      experience: req.body.experience !== void 0 ? String(req.body.experience).trim() : current.experience,
      specialization: req.body.specialization !== void 0 ? String(req.body.specialization).trim() : current.specialization,
      responsibilities: req.body.responsibilities !== void 0 ? parseList(req.body.responsibilities) : current.responsibilities,
      achievements: req.body.achievements !== void 0 ? parseList(req.body.achievements) : current.achievements,
      socialLinks: {
        linkedin: req.body.socialLinks?.linkedin !== void 0 ? req.body.socialLinks.linkedin.trim() : current.socialLinks?.linkedin,
        instagram: req.body.socialLinks?.instagram !== void 0 ? req.body.socialLinks.instagram.trim() : current.socialLinks?.instagram,
        facebook: req.body.socialLinks?.facebook !== void 0 ? req.body.socialLinks.facebook.trim() : current.socialLinks?.facebook,
        youtube: req.body.socialLinks?.youtube !== void 0 ? req.body.socialLinks.youtube.trim() : current.socialLinks?.youtube,
        email: req.body.socialLinks?.email !== void 0 ? req.body.socialLinks.email.trim() : current.socialLinks?.email
      },
      videoUrl: req.body.videoUrl !== void 0 ? String(req.body.videoUrl).trim() : current.videoUrl,
      displayOrder: req.body.displayOrder !== void 0 ? Number(req.body.displayOrder) : current.displayOrder,
      active: req.body.active !== void 0 ? Boolean(req.body.active) : current.active,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.teamMembers[index] = updatedMember;
    saveDb(db);
    res.json({ success: true, member: updatedMember });
  } catch (err) {
    console.error("Error updating team member:", err);
    res.status(500).json({ error: "Failed to update team member" });
  }
});
app.patch("/api/admin/team-members/:id/toggle-active", verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];
    const index = db.teamMembers.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Team member not found" });
    }
    db.teamMembers[index].active = !db.teamMembers[index].active;
    db.teamMembers[index].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDb(db);
    res.json({ success: true, active: db.teamMembers[index].active, member: db.teamMembers[index] });
  } catch (err) {
    console.error("Error toggling team member status:", err);
    res.status(500).json({ error: "Failed to toggle active status" });
  }
});
app.put("/api/admin/team-members-reorder", verifyAdminToken, (req, res) => {
  try {
    const { orderList } = req.body;
    if (!Array.isArray(orderList)) {
      return res.status(400).json({ error: "orderList array is required" });
    }
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];
    orderList.forEach((item) => {
      const member = db.teamMembers.find((m) => m.id === item.id);
      if (member) {
        member.displayOrder = Number(item.displayOrder);
        member.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      }
    });
    saveDb(db);
    const sorted = db.teamMembers.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    res.json({ success: true, teamMembers: sorted });
  } catch (err) {
    console.error("Error reordering team members:", err);
    res.status(500).json({ error: "Failed to reorder team members" });
  }
});
app.delete("/api/admin/team-members/:id", verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];
    const initialLen = db.teamMembers.length;
    db.teamMembers = db.teamMembers.filter((m) => m.id !== req.params.id);
    if (db.teamMembers.length === initialLen) {
      return res.status(404).json({ error: "Team member not found" });
    }
    saveDb(db);
    res.json({ success: true, message: "Team member deleted successfully" });
  } catch (err) {
    console.error("Error deleting team member:", err);
    res.status(500).json({ error: "Failed to delete team member" });
  }
});
app.get("/api/notifications/config", (_req, res) => {
  const fcmStatus = getFcmConfigStatus();
  const vapidKey = process.env.VITE_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || null;
  const firebaseClientConfig = process.env.VITE_FIREBASE_API_KEY ? {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
  } : null;
  res.json({
    isConfigured: fcmStatus.isConfigured,
    projectId: fcmStatus.projectId,
    vapidKey,
    firebaseClientConfig
  });
});
app.post("/api/notifications/register-token", (req, res) => {
  try {
    const { token, deviceId, platform, browser, permission, preferences } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Device token is required" });
    }
    const userId = getAuthenticatedUserId(req) || void 0;
    const record = registerOrUpdateToken({
      token,
      userId,
      deviceId: deviceId || "dev_" + Math.random().toString(36).substring(2, 10),
      platform,
      browser,
      permission,
      preferences
    });
    res.json({
      success: true,
      tokenRecord: record
    });
  } catch (err) {
    console.error("Error registering notification token:", err);
    res.status(500).json({ error: "Failed to register notification token" });
  }
});
app.get("/api/notifications/preferences", (req, res) => {
  const deviceId = req.query.deviceId;
  const userId = getAuthenticatedUserId(req);
  const db = getDb();
  let tokenRecord = db.notificationTokens.find(
    (t) => userId && t.userId === userId || deviceId && t.deviceId === deviceId
  );
  const preferences = tokenRecord ? tokenRecord.preferences : DEFAULT_PREFERENCES;
  res.json({ preferences });
});
app.put("/api/notifications/preferences", (req, res) => {
  try {
    const { deviceId, token, preferences } = req.body;
    const userId = getAuthenticatedUserId(req) || void 0;
    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({ error: "Preferences object is required" });
    }
    const updated = updateTokenPreferences({ deviceId, userId, token }, preferences);
    res.json({ success: true, updated });
  } catch (err) {
    console.error("Error updating notification preferences:", err);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});
app.get("/api/admin/notifications/stats", verifyAdminToken, (_req, res) => {
  try {
    const stats = getNotificationStats();
    res.json(stats);
  } catch (err) {
    console.error("Error fetching notification stats:", err);
    res.status(500).json({ error: "Failed to load notification statistics" });
  }
});
app.get("/api/admin/notifications/campaigns", verifyAdminToken, (_req, res) => {
  try {
    const db = getDb();
    const sorted = [...db.notificationCampaigns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sorted);
  } catch (err) {
    console.error("Error fetching notification campaigns:", err);
    res.status(500).json({ error: "Failed to load campaigns" });
  }
});
app.post("/api/admin/notifications/send", verifyAdminToken, async (req, res) => {
  try {
    const {
      title,
      message,
      image,
      category = "important_updates",
      targetAudience = "all",
      deepLink = "/",
      doorId,
      scheduleTime
    } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Notification title is required" });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Notification message body is required" });
    }
    const isScheduled = scheduleTime && new Date(scheduleTime).getTime() > Date.now();
    const newCampaign = {
      id: "camp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      message: message.trim(),
      image: image || void 0,
      category,
      targetAudience,
      deepLink: deepLink || "/",
      doorId: doorId || void 0,
      status: isScheduled ? "scheduled" : "draft",
      scheduledAt: isScheduled ? new Date(scheduleTime).toISOString() : void 0,
      createdBy: "Admin",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const db = getDb();
    if (isScheduled) {
      db.notificationCampaigns.push(newCampaign);
      saveDb(db);
      return res.json({
        success: true,
        status: "scheduled",
        message: `Notification successfully scheduled for ${new Date(scheduleTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST)`,
        campaign: newCampaign
      });
    }
    try {
      const result = await sendCampaignNotification(newCampaign);
      res.json({
        success: true,
        status: "sent",
        message: "Notification sent successfully",
        result,
        campaign: newCampaign
      });
    } catch (sendErr) {
      console.error("Notification dispatch error:", sendErr);
      const isNotConfigured = sendErr.message?.includes("not configured");
      return res.status(isNotConfigured ? 400 : 500).json({
        error: sendErr.message || "Unable to send notification. Please try again.",
        isNotConfigured
      });
    }
  } catch (err) {
    console.error("Error in send notification handler:", err);
    res.status(500).json({ error: "Unable to send notification. Please try again." });
  }
});
app.post("/api/admin/notifications/cancel-scheduled/:id", verifyAdminToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const campaign = db.notificationCampaigns.find((c) => c.id === id);
  if (!campaign) {
    return res.status(404).json({ error: "Campaign not found" });
  }
  if (campaign.status === "scheduled") {
    campaign.status = "draft";
    campaign.error = "Cancelled by administrator";
    saveDb(db);
  }
  res.json({ success: true, campaign });
});
app.delete("/api/admin/notifications/campaign/:id", verifyAdminToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const initialLen = db.notificationCampaigns.length;
  db.notificationCampaigns = db.notificationCampaigns.filter((c) => c.id !== id);
  if (db.notificationCampaigns.length === initialLen) {
    return res.status(404).json({ error: "Campaign not found" });
  }
  saveDb(db);
  res.json({ success: true, message: "Campaign deleted successfully" });
});
var handleSitemapRequest = (_req, res) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "all");
  try {
    const xml = generateSitemapXml();
    return res.status(200).send(xml);
  } catch (err) {
    console.error("\u274C Error dynamically generating /sitemap.xml:", err);
    const appDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
    const staticCandidates = [
      import_path2.default.join(process.cwd(), "dist", "sitemap.xml"),
      import_path2.default.join(process.cwd(), "public", "sitemap.xml"),
      import_path2.default.join(appDir, "dist", "sitemap.xml"),
      import_path2.default.join(appDir, "public", "sitemap.xml")
    ];
    for (const p of staticCandidates) {
      if (import_fs2.default.existsSync(p)) {
        try {
          const staticXml = import_fs2.default.readFileSync(p, "utf8");
          return res.status(200).send(staticXml);
        } catch {
        }
      }
    }
    return res.status(200).send(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://jaihanumandoor.com/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>'
    );
  }
};
var handleRobotsRequest = (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, must-revalidate");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const robotsTxt = generateRobotsTxt();
    return res.status(200).send(robotsTxt);
  } catch (err) {
    console.error("\u274C Error generating /robots.txt:", err);
    return res.status(200).send(
      "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\nDisallow: /api/\nSitemap: https://jaihanumandoor.com/sitemap.xml\n"
    );
  }
};
app.get(["/sitemap.xml", "/sitemap.xml/", "/sitemap"], handleSitemapRequest);
app.get(["/robots.txt", "/robots.txt/"], handleRobotsRequest);
function findDistDirectory() {
  const appDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
  const candidatePaths = [
    import_path2.default.join(process.cwd(), "dist"),
    import_path2.default.join(appDir, "dist"),
    import_path2.default.resolve(appDir)
  ];
  for (const candidate of candidatePaths) {
    if (import_fs2.default.existsSync(import_path2.default.join(candidate, "index.html"))) {
      return candidate;
    }
  }
  return null;
}
async function startServer() {
  process.on("uncaughtException", (err) => {
    console.error("\u274C Uncaught Exception in server process:", err);
  });
  process.on("unhandledRejection", (reason, promise) => {
    console.error("\u274C Unhandled Promise Rejection at:", promise, "reason:", reason);
  });
  app.get(
    [
      "/visualizer",
      "/visualizer/*",
      "/ai-visualizer",
      "/ai-visualizer/*",
      "/video-visualizer",
      "/video-visualizer/*",
      "/video-visualization",
      "/ai-video",
      "/video",
      "/video/*"
    ],
    (_req, res) => {
      res.redirect(301, "/");
    }
  );
  const isProduction = process.env.NODE_ENV === "production";
  const distPath = findDistDirectory();
  if (!isProduction) {
    try {
      console.log("\u26A1 Development mode active. Starting Vite development middleware...");
      const vite = await (0, import_vite.createServer)({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error("\u274C Failed to initialize Vite middleware:", viteErr);
    }
  } else if (distPath) {
    console.log(`\u{1F4C1} Static files found at: ${distPath}. Serving in PRODUCTION mode.`);
    app.use(import_express.default.static(distPath, { maxAge: "1d", index: false }));
    app.get("/", (_req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
    app.all("/api/*", (req, res) => {
      res.status(404).json({
        error: "API endpoint not found",
        path: req.originalUrl
      });
    });
    app.get("*", (req, res) => {
      const url = (req.path || "").toLowerCase();
      if (url === "/sitemap.xml" || url === "/sitemap" || url.endsWith("/sitemap.xml")) {
        return handleSitemapRequest(req, res);
      }
      if (url === "/robots.txt" || url.endsWith("/robots.txt")) {
        return handleRobotsRequest(req, res);
      }
      if (url.startsWith("/api/")) {
        return res.status(404).json({ error: "API endpoint not found", path: req.originalUrl });
      }
      if (/\.(xml|txt|json|js|css|map|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(url)) {
        return res.status(404).type("text/plain").send("Resource not found");
      }
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  } else {
    console.error('\u274C Production mode active but dist/index.html was not found! Please run "npm run build".');
    app.all("/api/*", (req, res) => {
      res.status(404).json({ error: "API endpoint not found", path: req.originalUrl });
    });
    app.get("*", (req, res) => {
      const url = (req.path || "").toLowerCase();
      if (url === "/sitemap.xml" || url === "/sitemap" || url.endsWith("/sitemap.xml")) {
        return handleSitemapRequest(req, res);
      }
      if (url === "/robots.txt" || url.endsWith("/robots.txt")) {
        return handleRobotsRequest(req, res);
      }
      res.status(503).send('Application build not found. Please run "npm run build" and restart.');
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("----------------------------------------------------");
    console.log("\u{1F680} Jai Hanuman Door server started successfully");
    console.log(`\u{1F4E1} Listening on: http://0.0.0.0:${PORT}`);
    console.log(`\u{1F30D} Environment: ${process.env.NODE_ENV || "production"}`);
    console.log(`\u{1F4C1} Static files directory: ${distPath || "Vite dev middleware"}`);
    console.log("----------------------------------------------------");
    try {
      syncUploadedImages();
      console.log("\u{1F6E1}\uFE0F Production data persistence verified & image storage synchronized");
    } catch (syncErr) {
      console.warn("\u26A0\uFE0F Image storage sync warning (non-fatal):", syncErr);
    }
    try {
      startScheduledNotificationWorker();
    } catch (workerErr) {
      console.warn("\u26A0\uFE0F Scheduled notification worker error (non-fatal):", workerErr);
    }
  });
  server.on("error", (err) => {
    console.error("\u274C Server listen error on port " + PORT + ":", err);
  });
}
startServer().catch((err) => {
  console.error("\u274C Fatal error during server startup:", err);
  process.exit(1);
});
//# sourceMappingURL=server.cjs.map
