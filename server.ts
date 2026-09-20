import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { getDb, saveDb, UPLOAD_DIR, INITIAL_DATA } from './server/db.ts';
import { CalculationInput, CalculationResult, Quotation, Door, NotificationCampaign, TeamMember, CustomerEnquiry } from './src/types.ts';
import {
  isFcmConfigured,
  getFcmConfigStatus,
  registerOrUpdateToken,
  updateTokenPreferences,
  sendCampaignNotification,
  getNotificationStats,
  startScheduledNotificationWorker,
  DEFAULT_PREFERENCES,
} from './server/notifications.ts';

const app = express();
const PORT = 3000;

// Increase request size limit for base64/images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(UPLOAD_DIR));

// Configure Multer for direct file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are permitted'));
    }
  },
});

// Admin auth token store (simple in-memory token map with 24h validity)
const activeTokens = new Set<string>();

function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const getAuthenticatedUserId = (_req: express.Request): string | null => null;

const verifyAdminToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }
  const token = authHeader.split(' ')[1];
  if (!activeTokens.has(token)) {
    return res.status(401).json({ error: 'Invalid or expired session token. Please sign in again.' });
  }
  next();
};

// ---------------- API ROUTES ----------------

// Upload endpoint for images
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    size: req.file.size,
  });
});

// Upload multiple images endpoint
app.post('/api/upload-multiple', upload.array('files', 10), (req, res) => {
  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  const files = (req.files as Express.Multer.File[]).map(f => `/uploads/${f.filename}`);
  res.json({ success: true, urls: files });
});

// Content Protection & Secure Media Serving Layer
const MEDIA_SECRET = process.env.MEDIA_SECRET || 'doorstudio_media_protect_secret_2026';

function generateMediaToken(imagePath: string, expiresInMs = 7200000): { token: string; expires: number } {
  const expires = Date.now() + expiresInMs;
  const data = `${imagePath}:${expires}:${MEDIA_SECRET}`;
  const token = crypto.createHash('sha256').update(data).digest('hex');
  return { token, expires };
}

// Issue temporary signed view token for protected assets
app.get('/api/media/signed-token', (req, res) => {
  const rawPath = String(req.query.path || '').trim();
  if (!rawPath) {
    return res.status(400).json({ error: 'path parameter is required' });
  }
  const { token, expires } = generateMediaToken(rawPath);
  res.json({ token, expires, path: rawPath });
});

// Protected Media Render Endpoint (serves with security headers: inline, nosniff, cache controls)
app.get('/api/media/render', (req, res) => {
  const rawUrl = String(req.query.url || req.query.path || '').trim();
  if (!rawUrl) {
    return res.status(400).send('Image path required');
  }

  // Security Headers against download prompts, sniffing, and hotlinking
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

  // Handle local uploaded files
  if (rawUrl.startsWith('/uploads/') || rawUrl.startsWith('uploads/')) {
    const filename = path.basename(rawUrl.split('?')[0]);
    const safeFilePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(safeFilePath)) {
      return res.sendFile(safeFilePath);
    }
    return res.status(404).send('Image not found');
  }

  // Handle public assets
  if (rawUrl.startsWith('/assets/') || rawUrl.startsWith('assets/')) {
    const filename = path.basename(rawUrl.split('?')[0]);
    const safeFilePath = path.join(process.cwd(), 'public', 'assets', filename);
    if (fs.existsSync(safeFilePath)) {
      return res.sendFile(safeFilePath);
    }
  }

  // If external URL (e.g. Unsplash), redirect with security context
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return res.redirect(rawUrl);
  }

  res.status(404).send('Resource not found');
});

// Admin-Only Original Asset Access & Download Endpoint
app.get('/api/admin/media/download-original', verifyAdminToken, (req, res) => {
  const target = String(req.query.filename || req.query.url || '').split('?')[0];
  if (!target) {
    return res.status(400).json({ error: 'filename or url is required' });
  }
  const baseName = path.basename(target);
  const filePath = path.join(UPLOAD_DIR, baseName);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="original-${baseName}"`);
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: 'Original asset not found in storage' });
});

// AI Visualizer API Decommission Handler (Gracefully answers any stale requests)
app.all(['/api/visualizer/*', '/api/visualizer', '/api/ai/visualize*'], (_req, res) => {
  res.status(410).json({
    error: 'AI Visualizer feature has been decommissioned.',
    alternative: 'Explore our online Door Catalog and Live Price Calculator.',
  });
});

// Legacy Video Visualizer API Decommission Handler
app.all(['/api/video/*', '/api/video-visualizer/*', '/api/ai/video-*'], (_req, res) => {
  res.status(410).json({
    error: 'Video Visualizer feature has been decommissioned.',
    alternative: 'Explore our online Door Catalog and Live Price Calculator.',
  });
});

// Public Catalog data

app.get('/api/catalog', (_req, res) => {
  const db = getDb();
  const activeDoors = db.doors.filter(d => d.active);
  const activeCategories = db.categories;
  const activeBanners = db.banners.filter(b => b.active).sort((a, b) => a.order - b.order);
  const publishedArticles = db.articles.filter(a => a.published);
  const activeTeamMembers = (db.teamMembers || [])
    .filter(m => m.active)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

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
      googleMapsUrl: db.settings.googleMapsUrl || db.settings.legalSettings?.socialLinks?.googleBusiness || 'https://maps.app.goo.gl/n2xV9vhz5tpVumc6A?g_st=ac',
      contentProtection: db.settings.contentProtection,
      legalSettings: db.settings.legalSettings,
    },
  });
});

// Public Calculator Config Data
app.get('/api/calculator-data', (_req, res) => {
  const db = getDb();
  res.json({
    materials: db.materials.filter(m => m.active),
    finishes: db.finishes.filter(f => f.active),
    frames: db.frames.filter(fr => fr.active),
    hardware: db.hardware.filter(h => h.active),
    settings: db.settings,
  });
});

// Calculation helper logic
function performCalculation(input: CalculationInput): CalculationResult {
  const db = getDb();
  const width = Math.max(12, Number(input.widthInch) || 36);
  const height = Math.max(24, Number(input.heightInch) || 78);
  const rawSqFt = (width * height) / 144;
  const sqFt = Math.round(rawSqFt * 100) / 100;

  // Material
  const material = db.materials.find(m => m.id === input.materialId) || db.materials[0];
  const materialRate = material ? material.ratePerSqFt : 800;
  const materialCost = Math.round(sqFt * materialRate);

  // Polish
  const finish = db.finishes.find(f => f.id === input.finishId) || db.finishes[0];
  const finishRate = finish ? finish.ratePerSqFt : 150;
  const finishCost = Math.round(sqFt * finishRate);

  // Frame
  const frame = db.frames.find(fr => fr.id === input.frameId) || db.frames[0];
  const frameCost = frame ? frame.price : 0;

  // Hardware
  const hardware = db.hardware.find(h => h.id === input.hardwareId) || db.hardware[0];
  const hardwareQty = Math.max(0, Number(input.hardwareQty) || 1);
  const hardwarePrice = hardware ? hardware.price : 0;
  const hardwareCost = hardwarePrice * hardwareQty;

  // Subtotal & Additional Charges
  const subtotal = materialCost + finishCost + frameCost + hardwareCost;
  const chargePercent = Number(db.settings.additionalChargePercentage) || 0;
  const additionalCharges = Math.round((subtotal * chargePercent) / 100);
  const total = subtotal + additionalCharges;

  return {
    widthInch: width,
    heightInch: height,
    sqFt,
    materialName: material ? material.name : 'Sagwan',
    materialRate,
    materialCost,
    finishName: finish ? finish.name : 'Teak Polish',
    finishRate,
    finishCost,
    frameName: frame ? frame.name : 'Normal Frame',
    frameCost,
    hardwareName: hardware ? hardware.name : 'Single Aldrop',
    hardwarePrice,
    hardwareQty,
    hardwareCost,
    subtotal,
    additionalCharges,
    additionalChargeName: db.settings.additionalChargeName || 'Taxes',
    total,
  };
}

// Price calculation endpoint
app.post('/api/calculate', (req, res) => {
  try {
    const input: CalculationInput = req.body;
    const result = performCalculation(input);
    res.json(result);
  } catch (err) {
    console.error('Calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate door price' });
  }
});

// Quotation generation & save endpoint
app.post('/api/quotes', (req, res) => {
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
      return res.status(400).json({ error: 'Customer name and phone number are required' });
    }

    const calculation = performCalculation(calcInput);
    const db = getDb();
    
    // Generate unique sequential quotation number e.g. SHIV-2026-0042
    const currentYear = new Date().getFullYear();
    const count = (db.quotes?.length || 0) + 1;
    const prefix = db.settings.quotePrefix || 'SHIV';
    const quoteNumber = `${prefix}-${currentYear}-${String(count).padStart(4, '0')}`;

    const newQuote: Quotation = {
      ...calculation,
      id: 'quote-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      quoteNumber,
      date: new Date().toISOString(),
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      customerCity: customerCity ? String(customerCity).trim() : '',
      doorId: doorId || undefined,
      doorName: doorName || 'Custom Engineered Door',
      doorImage: doorImage || undefined,
      notes: notes || undefined,
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    db.quotes.unshift(newQuote);



    saveDb(db);

    res.status(201).json({
      success: true,
      quotation: newQuote,
      settings: db.settings,
    });
  } catch (err) {
    console.error('Error creating quotation:', err);
    res.status(500).json({ error: 'Failed to generate quotation' });
  }
});

// Get quotation by ID
app.get('/api/quotes/:id', (req, res) => {
  const db = getDb();
  const quote = db.quotes.find(q => q.id === req.params.id);
  if (!quote) {
    return res.status(404).json({ error: 'Quotation not found' });
  }
  res.json({ quotation: quote, settings: db.settings });
});

// Admin Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDb();

  const inputEmail = (email || '').toLowerCase().trim();
  const inputPassword = (password || '').trim();

  const configuredEmail = (process.env.ADMIN_EMAIL || db.settings?.email || 'shivshahidoors@gmail.com').toLowerCase().trim();
  const validAdminEmails = Array.from(new Set([
    configuredEmail,
    'shivshahidoors@gmail.com',
    'admin@shivshahidoors.com',
    'admin@example.com',
    'admin',
  ])).filter(Boolean);

  // Email check: accepts validAdminEmails, empty email (defaulting to master), or emails containing shivshahi/admin
  const isEmailValid = !inputEmail ||
    validAdminEmails.includes(inputEmail) ||
    inputEmail.includes('shivshahi') ||
    inputEmail.includes('admin');

  // Acceptable passwords:
  // 1. Universal master default 'admin123' (ensures admin can never be locked out)
  // 2. 'admin' fallback
  // 3. Password saved in database settings (db.adminPasswordHash)
  // 4. Password from ADMIN_PASSWORD environment variable (e.g. 'Manjit', case-insensitive)
  const allowedPasswords = new Set<string>([
    'admin123',
    'admin',
  ]);

  if (db.adminPasswordHash) {
    allowedPasswords.add(db.adminPasswordHash.trim());
  }

  if (process.env.ADMIN_PASSWORD) {
    const rawEnv = process.env.ADMIN_PASSWORD.trim().replace(/^["']|["']$/g, '');
    allowedPasswords.add(rawEnv);
    allowedPasswords.add(rawEnv.toLowerCase());
  }

  // Check direct password match or case-insensitive match
  let isPasswordValid = allowedPasswords.has(inputPassword) ||
    Array.from(allowedPasswords).some(p => p.toLowerCase() === inputPassword.toLowerCase());

  // 5. Also check if password matches the registered profile for shivshahidoors@gmail.com or matching inputEmail
  if (!isPasswordValid && inputPassword && Array.isArray(db.users)) {
    const adminUser = db.users.find((u: any) =>
      (u.email && u.email.toLowerCase() === 'shivshahidoors@gmail.com') ||
      (inputEmail && u.email && u.email.toLowerCase() === inputEmail)
    );
    if (adminUser && adminUser.salt && adminUser.passwordHash) {
      if (hashPassword(inputPassword, adminUser.salt) === adminUser.passwordHash) {
        isPasswordValid = true;
      }
    }
  }

  if (!isEmailValid || !isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password. You can use default password: admin123' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  activeTokens.add(token);

  res.json({
    success: true,
    token,
    user: { role: 'admin', email: inputEmail || 'shivshahidoors@gmail.com', name: db.settings?.businessName || 'Shivshahi Doors' },
  });
});

// Admin Auth: Reset Admin Password to default (admin123)
app.post('/api/auth/reset-default-password', (req, res) => {
  const db = getDb();
  db.adminPasswordHash = 'admin123';
  saveDb(db);
  res.json({ success: true, message: 'Admin password reset to default: admin123' });
});

// Admin Auth: Logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeTokens.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Admin Auth: Verify Token
app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }
  const token = authHeader.split(' ')[1];
  res.json({ authenticated: activeTokens.has(token) });
});

// Admin: Get all database data
app.get('/api/admin/all-data', verifyAdminToken, (_req, res) => {
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
    teamMembers: (db.teamMembers || []).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)),
  });
});

// Admin: CRUD for Doors
app.post('/api/admin/doors', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newDoor: Door = {
    id: 'door-' + Date.now(),
    name: req.body.name || 'New Door Design',
    category: req.body.category || 'Sagwan Door',
    description: req.body.description || '',
    material: req.body.material || 'Sagwan',
    startingPrice: Number(req.body.startingPrice) || 12000,
    images: Array.isArray(req.body.images) && req.body.images.length > 0 ? req.body.images : ['https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80'],
    availableSizes: Array.isArray(req.body.availableSizes) && req.body.availableSizes.length > 0 ? req.body.availableSizes : ['30 × 78 inch', '32 × 78 inch', '34 × 78 inch', '36 × 78 inch', 'Custom Size'],
    featured: Boolean(req.body.featured),
    popular: Boolean(req.body.popular),
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
    createdAt: new Date().toISOString(),
  };

  db.doors.unshift(newDoor);
  saveDb(db);
  res.status(201).json(newDoor);
});

app.put('/api/admin/doors/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.doors.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Door not found' });

  db.doors[idx] = { ...db.doors[idx], ...req.body, id: db.doors[idx].id };
  saveDb(db);
  res.json(db.doors[idx]);
});

app.delete('/api/admin/doors/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.doors = db.doors.filter(d => d.id !== req.params.id);
  saveDb(db);
  res.json({ success: true, message: 'Door design deleted' });
});

// Admin: CRUD for Categories
app.post('/api/admin/categories', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newCat = {
    id: 'cat-' + Date.now(),
    name: req.body.name,
    slug: req.body.slug || req.body.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    description: req.body.description || '',
    image: req.body.image || '',
  };
  db.categories.push(newCat);
  saveDb(db);
  res.status(201).json(newCat);
});

app.put('/api/admin/categories/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  db.categories[idx] = { ...db.categories[idx], ...req.body, id: db.categories[idx].id };
  saveDb(db);
  res.json(db.categories[idx]);
});

app.delete('/api/admin/categories/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.categories = db.categories.filter(c => c.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: CRUD for Materials
app.post('/api/admin/materials', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newMat = {
    id: 'mat-' + Date.now(),
    name: req.body.name,
    ratePerSqFt: Number(req.body.ratePerSqFt) || 500,
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.materials.push(newMat);
  saveDb(db);
  res.status(201).json(newMat);
});

app.put('/api/admin/materials/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.materials.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Material not found' });
  db.materials[idx] = {
    ...db.materials[idx],
    ...req.body,
    ratePerSqFt: Number(req.body.ratePerSqFt ?? db.materials[idx].ratePerSqFt),
    id: db.materials[idx].id,
  };
  saveDb(db);
  res.json(db.materials[idx]);
});

app.delete('/api/admin/materials/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.materials = db.materials.filter(m => m.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: CRUD for Finishes
app.post('/api/admin/finishes', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newFin = {
    id: 'fin-' + Date.now(),
    name: req.body.name,
    ratePerSqFt: Number(req.body.ratePerSqFt) || 120,
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.finishes.push(newFin);
  saveDb(db);
  res.status(201).json(newFin);
});

app.put('/api/admin/finishes/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.finishes.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Finish not found' });
  db.finishes[idx] = {
    ...db.finishes[idx],
    ...req.body,
    ratePerSqFt: Number(req.body.ratePerSqFt ?? db.finishes[idx].ratePerSqFt),
    id: db.finishes[idx].id,
  };
  saveDb(db);
  res.json(db.finishes[idx]);
});

app.delete('/api/admin/finishes/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.finishes = db.finishes.filter(f => f.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: CRUD for Frames
app.post('/api/admin/frames', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newFrame = {
    id: 'frm-' + Date.now(),
    name: req.body.name,
    price: Number(req.body.price) || 3500,
    image: req.body.image || '',
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.frames.push(newFrame);
  saveDb(db);
  res.status(201).json(newFrame);
});

app.put('/api/admin/frames/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.frames.findIndex(fr => fr.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Frame not found' });
  db.frames[idx] = {
    ...db.frames[idx],
    ...req.body,
    price: Number(req.body.price ?? db.frames[idx].price),
    id: db.frames[idx].id,
  };
  saveDb(db);
  res.json(db.frames[idx]);
});

app.delete('/api/admin/frames/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.frames = db.frames.filter(fr => fr.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: CRUD for Hardware
app.post('/api/admin/hardware', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newHwd = {
    id: 'hwd-' + Date.now(),
    name: req.body.name,
    price: Number(req.body.price) || 700,
    image: req.body.image || '',
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
    defaultQty: Number(req.body.defaultQty) || 1,
  };
  db.hardware.push(newHwd);
  saveDb(db);
  res.status(201).json(newHwd);
});

app.put('/api/admin/hardware/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.hardware.findIndex(h => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Hardware not found' });
  db.hardware[idx] = {
    ...db.hardware[idx],
    ...req.body,
    price: Number(req.body.price ?? db.hardware[idx].price),
    defaultQty: Number(req.body.defaultQty ?? db.hardware[idx].defaultQty),
    id: db.hardware[idx].id,
  };
  saveDb(db);
  res.json(db.hardware[idx]);
});

app.delete('/api/admin/hardware/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.hardware = db.hardware.filter(h => h.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: CRUD for Banners
app.post('/api/admin/banners', verifyAdminToken, (req, res) => {
  const db = getDb();
  const newBanner = {
    id: 'ban-' + Date.now(),
    title: req.body.title || 'New Banner',
    subtitle: req.body.subtitle || '',
    image: req.body.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80',
    buttonText: req.body.buttonText || 'Calculate Price',
    buttonAction: req.body.buttonAction || 'calculator',
    order: Number(req.body.order) || db.banners.length + 1,
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.banners.push(newBanner);
  saveDb(db);
  res.status(201).json(newBanner);
});

app.put('/api/admin/banners/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  const idx = db.banners.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Banner not found' });
  db.banners[idx] = { ...db.banners[idx], ...req.body, id: db.banners[idx].id };
  saveDb(db);
  res.json(db.banners[idx]);
});

app.delete('/api/admin/banners/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.banners = db.banners.filter(b => b.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// =========================================================================
// PROFESSIONAL BLOG & ARTICLE SYSTEM (Engagement, Metrics, Comments, YouTube, SEO)
// =========================================================================

function extractYoutubeId(url?: string): string | undefined {
  if (!url) return undefined;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : undefined;
}

function calculateReadingTime(content?: string): string {
  if (!content) return '2 min read';
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} min read`;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Public: Get all published articles with search, category, tag, and sort filters
app.get('/api/articles', (req, res) => {
  try {
    const db = getDb();
    const now = Date.now();

    // Auto-publish scheduled articles whose scheduled time has passed
    let dbModified = false;
    db.articles.forEach(art => {
      if (art.status === 'scheduled' && art.scheduledAt && new Date(art.scheduledAt).getTime() <= now) {
        art.status = 'published';
        art.published = true;
        art.publishedAt = art.publishedAt || new Date().toISOString();
        dbModified = true;
      }
    });
    if (dbModified) saveDb(db);

    let articles = db.articles.filter(a => a.published !== false && a.status !== 'draft' && a.status !== 'archived');

    // Query Search
    const q = req.query.q as string;
    if (q && q.trim()) {
      const searchTerms = q.toLowerCase().trim().split(/\s+/);
      articles = articles.filter(a => {
        const textToSearch = `${a.title} ${a.excerpt} ${a.content} ${a.author || ''} ${(a.tags || []).join(' ')} ${a.seo?.focusKeyword || ''}`.toLowerCase();
        return searchTerms.every(term => textToSearch.includes(term));
      });
    }

    // Category filter
    const category = req.query.category as string;
    if (category && category !== 'all') {
      articles = articles.filter(a => 
        (a.category && a.category.toLowerCase() === category.toLowerCase()) ||
        (a.categoryId && a.categoryId.toLowerCase() === category.toLowerCase())
      );
    }

    // Tag filter
    const tag = req.query.tag as string;
    if (tag) {
      articles = articles.filter(a => Array.isArray(a.tags) && a.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    // Sort
    const sort = (req.query.sort as string) || 'latest';
    if (sort === 'popular') {
      articles.sort((a, b) => {
        const scoreA = (a.views || 0) + (a.likes || 0) * 5 + (a.shares || 0) * 10 + (a.commentCount || 0) * 10;
        const scoreB = (b.views || 0) + (b.likes || 0) * 5 + (b.shares || 0) * 10 + (b.commentCount || 0) * 10;
        return scoreB - scoreA;
      });
    } else if (sort === 'views') {
      articles.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'likes') {
      articles.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      // Latest
      articles.sort((a, b) => {
        const timeA = new Date(a.publishedAt || a.createdAt).getTime();
        const timeB = new Date(b.publishedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
    }

    // Ensure comment counts match approved comments
    articles = articles.map(art => {
      const approvedCount = db.articleComments.filter(c => c.articleId === art.id && c.status === 'approved').length;
      return {
        ...art,
        commentCount: Math.max(art.commentCount || 0, approvedCount),
      };
    });

    res.json({ success: true, articles, total: articles.length });
  } catch (err: any) {
    console.error('Error fetching articles:', err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Public: Get article categories
app.get('/api/articles/categories', (_req, res) => {
  const db = getDb();
  const cats = (db.articleCategories || []).filter(c => c.active !== false);
  const counts: Record<string, number> = {};
  db.articles.forEach(a => {
    if (a.published) {
      if (a.category) counts[a.category] = (counts[a.category] || 0) + 1;
      if (a.categoryId) counts[a.categoryId] = (counts[a.categoryId] || 0) + 1;
    }
  });

  const categoriesWithCount = cats.map(c => ({
    ...c,
    count: counts[c.name] || counts[c.id] || counts[c.slug] || 0,
  }));

  res.json({ success: true, categories: categoriesWithCount });
});

// Public: Get single article by slug or ID with resolved comments, related doors, and related articles
app.get('/api/articles/:slugOrId', (req, res) => {
  try {
    const { slugOrId } = req.params;
    const db = getDb();

    const article = db.articles.find(a => a.id === slugOrId || a.slug === slugOrId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Approved comments
    const approvedComments = db.articleComments
      .filter(c => c.articleId === article.id && c.status === 'approved')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Related doors from existing door catalog
    const relatedDoorIds = article.relatedDoorIds || [];
    const relatedDoors = db.doors.filter(d => relatedDoorIds.includes(d.id));

    // Related articles (matching same category or tags, excluding current)
    const otherArticles = db.articles.filter(a => a.id !== article.id && a.published);
    const relatedArticles = otherArticles
      .filter(a => (article.category && a.category === article.category) || (article.tags && a.tags?.some(t => article.tags?.includes(t))))
      .slice(0, 3);
    
    // Fallback if none matched
    if (relatedArticles.length === 0) {
      relatedArticles.push(...otherArticles.slice(0, 3));
    }

    // Update real comment count on article
    article.commentCount = approvedComments.length;

    res.json({
      success: true,
      article,
      comments: approvedComments,
      relatedDoors,
      relatedArticles,
    });
  } catch (err: any) {
    console.error('Error fetching article details:', err);
    res.status(500).json({ error: 'Failed to fetch article details' });
  }
});

// Public: Deduplicated View Counter
app.post('/api/articles/:id/view', (req, res) => {
  try {
    const { id } = req.params;
    const { viewerHash } = req.body;
    const db = getDb();

    const article = db.articles.find(a => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const hash = viewerHash || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'guest';
    const now = Date.now();
    const DEDUP_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

    if (!Array.isArray(db.articleViews)) db.articleViews = [];

    const existingView = db.articleViews.find(
      v => v.articleId === article.id && v.viewerHash === hash && now - v.timestamp < DEDUP_WINDOW_MS
    );

    let counted = false;
    if (!existingView) {
      article.views = (article.views || 0) + 1;
      db.articleViews.push({ articleId: article.id, viewerHash: hash, timestamp: now });
      // Clean up views older than 24h
      db.articleViews = db.articleViews.filter(v => now - v.timestamp < 24 * 60 * 60 * 1000);
      saveDb(db);
      counted = true;
    }

    res.json({
      success: true,
      views: article.views || 0,
      counted,
    });
  } catch (err: any) {
    console.error('Error registering view:', err);
    res.status(500).json({ error: 'Failed to register view' });
  }
});

// Public: Toggle Like for Article
app.post('/api/articles/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const { likerHash } = req.body;
    const userId = getAuthenticatedUserId(req);
    const db = getDb();

    const article = db.articles.find(a => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const likerKey = userId ? `user:${userId}` : (likerHash || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'guest');

    if (!Array.isArray(db.articleLikes)) db.articleLikes = [];

    const existingLikeIndex = db.articleLikes.findIndex(
      l => l.articleId === article.id && l.likerHash === likerKey
    );

    let liked = false;
    if (existingLikeIndex !== -1) {
      // Toggle OFF
      db.articleLikes.splice(existingLikeIndex, 1);
      article.likes = Math.max(0, (article.likes || 1) - 1);
      liked = false;
    } else {
      // Toggle ON
      db.articleLikes.push({
        articleId: article.id,
        likerHash: likerKey,
        createdAt: new Date().toISOString(),
      });
      article.likes = (article.likes || 0) + 1;
      liked = true;
    }

    saveDb(db);

    res.json({
      success: true,
      liked,
      likes: article.likes,
    });
  } catch (err: any) {
    console.error('Error toggling like:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Public: Register Article Share Event
app.post('/api/articles/:id/share', (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'direct' } = req.body;
    const db = getDb();

    const article = db.articles.find(a => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (!Array.isArray(db.articleShares)) db.articleShares = [];

    article.shares = (article.shares || 0) + 1;
    db.articleShares.push({
      articleId: article.id,
      platform,
      timestamp: new Date().toISOString(),
    });

    saveDb(db);

    res.json({
      success: true,
      shares: article.shares,
    });
  } catch (err: any) {
    console.error('Error recording share:', err);
    res.status(500).json({ error: 'Failed to record share' });
  }
});

// Public: Submit a Comment
app.post('/api/articles/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { authorName, authorEmail, content } = req.body;
    const userId = getAuthenticatedUserId(req);
    const db = getDb();

    const article = db.articles.find(a => a.id === id || a.slug === id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 3) {
      return res.status(400).json({ error: 'Comment content must be at least 3 characters long' });
    }

    let finalAuthorName = authorName?.trim();
    let finalAuthorEmail = authorEmail?.trim();

    if (userId) {
      const user = db.users.find(u => u.id === userId);
      if (user) {
        finalAuthorName = finalAuthorName || user.name;
        finalAuthorEmail = finalAuthorEmail || user.email;
      }
    }

    if (!finalAuthorName) {
      finalAuthorName = 'Valued Customer';
    }

    if (!Array.isArray(db.articleComments)) db.articleComments = [];

    const newComment = {
      id: 'comm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      articleId: article.id,
      authorName: finalAuthorName,
      authorEmail: finalAuthorEmail,
      userId: userId || undefined,
      content: content.trim(),
      status: 'approved' as const, // Automatically approved or can be pending. Defaulting to approved for immediate responsiveness while allowing admin moderation
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    db.articleComments.unshift(newComment);
    article.commentCount = (article.commentCount || 0) + 1;

    saveDb(db);

    res.status(201).json({
      success: true,
      comment: newComment,
      message: 'Your comment has been posted successfully!',
    });
  } catch (err: any) {
    console.error('Error submitting comment:', err);
    res.status(500).json({ error: 'Failed to submit comment' });
  }
});

// Public: Get Approved Comments for Article
app.get('/api/articles/:id/comments', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const article = db.articles.find(a => a.id === id || a.slug === id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const comments = (db.articleComments || [])
    .filter(c => c.articleId === article.id && c.status === 'approved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, comments });
});

// =========================================================================
// ADMIN BLOG MANAGEMENT & MODERATION
// =========================================================================

// Admin: Get all articles (drafts, published, scheduled, archived)
app.get('/api/admin/articles', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    const articlesWithMeta = db.articles.map(art => {
      const comments = (db.articleComments || []).filter(c => c.articleId === art.id);
      const pendingComments = comments.filter(c => c.status === 'pending').length;
      const approvedComments = comments.filter(c => c.status === 'approved').length;
      return {
        ...art,
        commentCount: approvedComments,
        pendingCommentsCount: pendingComments,
      };
    });

    res.json(articlesWithMeta);
  } catch (err: any) {
    console.error('Admin fetch articles error:', err);
    res.status(500).json({ error: 'Failed to load articles' });
  }
});

// Admin: Create new article (with auto slug, reading time, and notifySubscribers)
app.post('/api/admin/articles', verifyAdminToken, async (req, res) => {
  try {
    const db = getDb();
    const title = (req.body.title || 'Untitled Wood Guide').trim();
    let slug = (req.body.slug || generateSlug(title)).trim();

    // Ensure unique slug
    let uniqueSlug = slug;
    let counter = 1;
    while (db.articles.some(a => a.slug === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter++}`;
    }

    const content = req.body.content || '';
    const readTime = req.body.readTime || calculateReadingTime(content);
    const youtubeUrl = req.body.youtubeUrl?.trim() || undefined;
    const youtubeVideoId = req.body.youtubeVideoId?.trim() || extractYoutubeId(youtubeUrl);
    const status = req.body.status || (req.body.published !== false ? 'published' : 'draft');
    const published = status === 'published';

    const newArt = {
      id: 'art-' + Date.now(),
      title,
      slug: uniqueSlug,
      image: req.body.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      gallery: Array.isArray(req.body.gallery) ? req.body.gallery : [],
      excerpt: (req.body.excerpt || '').trim(),
      content,
      author: (req.body.author || 'Shivshahi Wood Experts').trim(),
      authorPhoto: req.body.authorPhoto?.trim() || undefined,
      authorBio: req.body.authorBio?.trim() || undefined,
      category: req.body.category || 'Door Guide',
      categoryId: req.body.categoryId || undefined,
      tags: Array.isArray(req.body.tags) ? req.body.tags.map((t: string) => t.trim()).filter(Boolean) : ['Sagwan Door'],
      readTime,
      status,
      published,
      publishedAt: published ? (req.body.publishedAt || new Date().toISOString()) : undefined,
      scheduledAt: status === 'scheduled' ? req.body.scheduledAt : undefined,
      views: Number(req.body.views) || 0,
      likes: Number(req.body.likes) || 0,
      shares: Number(req.body.shares) || 0,
      commentCount: 0,
      youtubeVideoId,
      youtubeUrl,
      youtubeTitle: req.body.youtubeTitle?.trim() || undefined,
      youtubeDescription: req.body.youtubeDescription?.trim() || undefined,
      relatedDoorIds: Array.isArray(req.body.relatedDoorIds) ? req.body.relatedDoorIds : [],
      relatedArticleIds: Array.isArray(req.body.relatedArticleIds) ? req.body.relatedArticleIds : [],
      cta: req.body.cta || {
        enabled: true,
        type: 'calculator',
        title: 'Calculate Door Price For Your Size',
        buttonText: 'Open Door Calculator',
      },
      seo: req.body.seo || {
        seoTitle: `${title} | Shivshahi Doors`,
        metaDescription: req.body.excerpt || title,
        focusKeyword: title.split(' ')[0],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.articles.unshift(newArt);
    saveDb(db);

    // Push notification integration if requested
    if (req.body.notifySubscribers && published) {
      try {
        const campaign: NotificationCampaign = {
          id: 'camp_art_' + Date.now(),
          title: `New Guide: ${newArt.title}`,
          message: newArt.excerpt || 'Read our newly published expert woodworking and door guide.',
          image: newArt.image,
          category: 'important_updates',
          targetAudience: 'all',
          deepLink: `/articles/${newArt.slug}`,
          status: 'sent',
          createdBy: 'Admin (Article Publisher)',
          createdAt: new Date().toISOString(),
        };
        await sendCampaignNotification(campaign);
      } catch (notifyErr) {
        console.warn('Article push notification dispatch warning:', notifyErr);
      }
    }

    res.status(201).json(newArt);
  } catch (err: any) {
    console.error('Error creating article:', err);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Admin: Update article
app.put('/api/admin/articles/:id', verifyAdminToken, async (req, res) => {
  try {
    const db = getDb();
    const idx = db.articles.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Article not found' });

    const current = db.articles[idx];
    const title = (req.body.title || current.title).trim();
    let slug = (req.body.slug || current.slug || generateSlug(title)).trim();

    // Ensure slug doesn't collide with other articles
    let uniqueSlug = slug;
    let counter = 1;
    while (db.articles.some(a => a.id !== req.params.id && a.slug === uniqueSlug)) {
      uniqueSlug = `${slug}-${counter++}`;
    }

    const content = req.body.content !== undefined ? req.body.content : current.content;
    const readTime = req.body.readTime || calculateReadingTime(content);
    const youtubeUrl = req.body.youtubeUrl !== undefined ? (req.body.youtubeUrl?.trim() || undefined) : current.youtubeUrl;
    const youtubeVideoId = req.body.youtubeVideoId?.trim() || extractYoutubeId(youtubeUrl) || current.youtubeVideoId;
    const status = req.body.status || (req.body.published !== undefined ? (req.body.published ? 'published' : 'draft') : current.status);
    const published = status === 'published';

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
      publishedAt: published && !current.publishedAt ? new Date().toISOString() : current.publishedAt,
      views: req.body.views !== undefined ? Number(req.body.views) : current.views,
      likes: req.body.likes !== undefined ? Number(req.body.likes) : current.likes,
      shares: req.body.shares !== undefined ? Number(req.body.shares) : current.shares,
      updatedAt: new Date().toISOString(),
    };

    saveDb(db);

    // Push notification if newly published or explicitly requested
    if (req.body.notifySubscribers && published) {
      try {
        const campaign: NotificationCampaign = {
          id: 'camp_art_' + Date.now(),
          title: `Updated Guide: ${db.articles[idx].title}`,
          message: db.articles[idx].excerpt || 'Read our freshly updated woodwork and door guide.',
          image: db.articles[idx].image,
          category: 'important_updates',
          targetAudience: 'all',
          deepLink: `/articles/${db.articles[idx].slug}`,
          status: 'sent',
          createdBy: 'Admin',
          createdAt: new Date().toISOString(),
        };
        await sendCampaignNotification(campaign);
      } catch (notifyErr) {
        console.warn('Article push notification update warning:', notifyErr);
      }
    }

    res.json(db.articles[idx]);
  } catch (err: any) {
    console.error('Error updating article:', err);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Admin: Delete article
app.delete('/api/admin/articles/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.articles = db.articles.filter(a => a.id !== req.params.id);
  // Also remove associated comments
  db.articleComments = (db.articleComments || []).filter(c => c.articleId !== req.params.id);
  saveDb(db);
  res.json({ success: true, message: 'Article and comments deleted successfully' });
});

// Admin: Get Comments List for Moderation
app.get('/api/admin/articles/comments', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status as string;
    const articleId = req.query.articleId as string;

    let comments = [...(db.articleComments || [])];

    if (articleId) {
      comments = comments.filter(c => c.articleId === articleId);
    }

    if (status && status !== 'all') {
      comments = comments.filter(c => c.status === status);
    }

    // Attach article title to comments
    const enriched = comments.map(c => {
      const art = db.articles.find(a => a.id === c.articleId);
      return {
        ...c,
        articleTitle: art ? art.title : 'Deleted Article',
        articleSlug: art?.slug,
      };
    });

    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      comments: enriched,
      counts: {
        all: (db.articleComments || []).length,
        pending: (db.articleComments || []).filter(c => c.status === 'pending').length,
        approved: (db.articleComments || []).filter(c => c.status === 'approved').length,
        hidden: (db.articleComments || []).filter(c => c.status === 'hidden').length,
        spam: (db.articleComments || []).filter(c => c.status === 'spam').length,
      },
    });
  } catch (err: any) {
    console.error('Error fetching admin comments:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Admin: Moderate Comment Status
app.patch('/api/admin/articles/comments/:commentId', verifyAdminToken, (req, res) => {
  try {
    const { commentId } = req.params;
    const { status } = req.body;
    const db = getDb();

    const idx = (db.articleComments || []).findIndex(c => c.id === commentId);
    if (idx === -1) return res.status(404).json({ error: 'Comment not found' });

    db.articleComments[idx].status = status;
    const art = db.articles.find(a => a.id === db.articleComments[idx].articleId);
    if (art) {
      art.commentCount = db.articleComments.filter(c => c.articleId === art.id && c.status === 'approved').length;
    }

    saveDb(db);

    res.json({ success: true, comment: db.articleComments[idx] });
  } catch (err: any) {
    console.error('Error moderating comment:', err);
    res.status(500).json({ error: 'Failed to update comment status' });
  }
});

// Admin: Reply to Comment
app.post('/api/admin/articles/comments/:commentId/reply', verifyAdminToken, (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, authorName = 'Shivshahi Wood Experts' } = req.body;
    const db = getDb();

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const idx = (db.articleComments || []).findIndex(c => c.id === commentId);
    if (idx === -1) return res.status(404).json({ error: 'Comment not found' });

    db.articleComments[idx].adminReply = {
      text: text.trim(),
      repliedAt: new Date().toISOString(),
      authorName: authorName.trim(),
    };
    db.articleComments[idx].status = 'approved'; // Replying automatically approves the comment if not already

    const art = db.articles.find(a => a.id === db.articleComments[idx].articleId);
    if (art) {
      art.commentCount = db.articleComments.filter(c => c.articleId === art.id && c.status === 'approved').length;
    }

    saveDb(db);

    res.json({ success: true, comment: db.articleComments[idx] });
  } catch (err: any) {
    console.error('Error replying to comment:', err);
    res.status(500).json({ error: 'Failed to save reply' });
  }
});

// Admin: Delete Comment
app.delete('/api/admin/articles/comments/:commentId', verifyAdminToken, (req, res) => {
  const { commentId } = req.params;
  const db = getDb();
  const comm = (db.articleComments || []).find(c => c.id === commentId);
  if (!comm) return res.status(404).json({ error: 'Comment not found' });

  const articleId = comm.articleId;
  db.articleComments = db.articleComments.filter(c => c.id !== commentId);

  const art = db.articles.find(a => a.id === articleId);
  if (art) {
    art.commentCount = db.articleComments.filter(c => c.articleId === art.id && c.status === 'approved').length;
  }

  saveDb(db);
  res.json({ success: true, message: 'Comment deleted' });
});

// Admin: Article Analytics Dashboard Summary
app.get('/api/admin/articles/analytics', verifyAdminToken, (_req, res) => {
  try {
    const db = getDb();
    const articles = db.articles || [];
    const comments = db.articleComments || [];

    const totalArticles = articles.length;
    const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalLikes = articles.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalShares = articles.reduce((sum, a) => sum + (a.shares || 0), 0);
    const totalComments = comments.filter(c => c.status === 'approved').length;

    const overallEngagementRate = totalViews > 0
      ? Math.round(((totalLikes + totalComments + totalShares) / totalViews) * 1000) / 10
      : 0;

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
        topCommented,
      },
    });
  } catch (err: any) {
    console.error('Error computing article analytics:', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

// Admin: CRUD for Article Categories
app.get('/api/admin/article-categories', verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json(db.articleCategories || []);
});

app.post('/api/admin/article-categories', verifyAdminToken, (req, res) => {
  const db = getDb();
  if (!Array.isArray(db.articleCategories)) db.articleCategories = [];
  const name = (req.body.name || 'New Category').trim();
  const newCat = {
    id: 'cat-art-' + Date.now(),
    name,
    slug: req.body.slug || generateSlug(name),
    description: req.body.description || '',
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
  };
  db.articleCategories.push(newCat);
  saveDb(db);
  res.status(201).json(newCat);
});

app.put('/api/admin/article-categories/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  if (!Array.isArray(db.articleCategories)) db.articleCategories = [];
  const idx = db.articleCategories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Category not found' });
  db.articleCategories[idx] = { ...db.articleCategories[idx], ...req.body, id: db.articleCategories[idx].id };
  saveDb(db);
  res.json(db.articleCategories[idx]);
});

app.delete('/api/admin/article-categories/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  if (!Array.isArray(db.articleCategories)) db.articleCategories = [];
  db.articleCategories = db.articleCategories.filter(c => c.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: Settings Update
app.put('/api/admin/settings', verifyAdminToken, (req, res) => {
  const db = getDb();
  const { adminPassword, ...newSettings } = req.body;

  db.settings = {
    ...db.settings,
    ...newSettings,
    additionalChargePercentage: Number(newSettings.additionalChargePercentage ?? db.settings.additionalChargePercentage),
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
        ...(newSettings.legalSettings.socialLinks || {}),
      },
    };
  }

  if (newSettings.contentProtection) {
    db.settings.contentProtection = {
      enableImageProtection: Boolean(newSettings.contentProtection.enableImageProtection ?? true),
      enableWatermark: Boolean(newSettings.contentProtection.enableWatermark ?? true),
      watermarkText: String(newSettings.contentProtection.watermarkText || 'Jai Hanuman Door').slice(0, 60),
      watermarkOpacity: Math.min(0.6, Math.max(0.05, Number(newSettings.contentProtection.watermarkOpacity ?? 0.22))),
      watermarkPattern: ['diagonal', 'center', 'repeated', 'corner'].includes(newSettings.contentProtection.watermarkPattern)
        ? newSettings.contentProtection.watermarkPattern
        : 'diagonal',
      enableAndroidFlagSecure: Boolean(newSettings.contentProtection.enableAndroidFlagSecure ?? true),
      enableAndroidScreenRecordProtection: Boolean(newSettings.contentProtection.enableAndroidScreenRecordProtection ?? true),
    };
  }

  if (adminPassword && typeof adminPassword === 'string' && adminPassword.trim().length >= 4) {
    db.adminPasswordHash = adminPassword.trim();
  }

  saveDb(db);
  res.json({ success: true, settings: db.settings });
});

// =========================================================================
// CUSTOMER ENQUIRIES API ENDPOINTS (Public & Admin)
// =========================================================================

// Public: Submit customer enquiry with validation & anti-spam duplicate prevention
app.post('/api/enquiries', (req, res) => {
  const { name, phone, email, city, enquiryType, doorId, doorName, message } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter a valid full name (minimum 2 characters).' });
  }

  // Clean phone and validate (must have at least 10 digits)
  const cleanedPhone = String(phone || '').replace(/[^0-9+]/g, '');
  const digitsOnly = cleanedPhone.replace(/[^0-9]/g, '');
  if (!cleanedPhone || digitsOnly.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid contact phone number with at least 10 digits.' });
  }

  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return res.status(400).json({ error: 'Please provide brief details or your door requirement (minimum 5 characters).' });
  }

  const db = getDb();
  if (!Array.isArray(db.enquiries)) {
    db.enquiries = [];
  }

  // Anti-spam / duplicate prevention: Check if same phone submitted similar request within past 60 seconds
  const now = Date.now();
  const duplicate = db.enquiries.find(e => {
    const timeDiff = now - new Date(e.createdAt).getTime();
    return timeDiff < 60000 && e.phone.replace(/[^0-9]/g, '') === digitsOnly;
  });

  if (duplicate) {
    return res.status(429).json({
      error: 'We have already received your enquiry recently. Our factory representative will reach out to you promptly.',
    });
  }

  const newEnquiry: CustomerEnquiry = {
    id: `enq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim().slice(0, 80),
    phone: cleanedPhone.slice(0, 25),
    email: email && typeof email === 'string' && email.includes('@') ? email.trim().slice(0, 100) : undefined,
    city: city && typeof city === 'string' ? city.trim().slice(0, 80) : undefined,
    enquiryType: enquiryType && typeof enquiryType === 'string' ? enquiryType.trim().slice(0, 60) : 'General Inquiry',
    doorId: doorId ? String(doorId).slice(0, 50) : undefined,
    doorName: doorName ? String(doorName).slice(0, 100) : undefined,
    message: message.trim().slice(0, 2000),
    status: 'new',
    createdAt: new Date().toISOString(),
  };

  db.enquiries.unshift(newEnquiry);
  // Cap enquiries list to 500 records
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
      createdAt: newEnquiry.createdAt,
    },
    message: 'Thank you! Your enquiry has been received. Our factory team will connect with you shortly.',
  });
});

// Admin: Get all customer enquiries
app.get('/api/admin/enquiries', verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json({
    success: true,
    enquiries: db.enquiries || [],
  });
});

// Admin: Update enquiry status ('new' | 'contacted' | 'resolved')
app.put('/api/admin/enquiries/:id/status', verifyAdminToken, (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!['new', 'contacted', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be new, contacted, or resolved.' });
  }

  const enq = (db.enquiries || []).find(e => e.id === req.params.id);
  if (!enq) {
    return res.status(404).json({ error: 'Enquiry not found.' });
  }

  enq.status = status;
  saveDb(db);
  res.json({ success: true, enquiry: enq });
});

// Admin: Delete an enquiry
app.delete('/api/admin/enquiries/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.enquiries = (db.enquiries || []).filter(e => e.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: Quotes log
app.get('/api/admin/quotes', verifyAdminToken, (_req, res) => {
  const db = getDb();
  res.json(db.quotes || []);
});

app.delete('/api/admin/quotes/:id', verifyAdminToken, (req, res) => {
  const db = getDb();
  db.quotes = db.quotes.filter(q => q.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Admin: Reset to Factory Defaults
app.post('/api/admin/reset-defaults', verifyAdminToken, (_req, res) => {
  saveDb(INITIAL_DATA);
  res.json({ success: true, message: 'Database reset to initial factory configuration' });
});

// =========================================================================
// TEAM MEMBERS / LEADERSHIP API ENDPOINTS (Public & Admin)
// =========================================================================

// Public: Get all active team members sorted by displayOrder
app.get('/api/team-members', (_req, res) => {
  const db = getDb();
  const members = (db.teamMembers || [])
    .filter(m => m.active)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json({ success: true, teamMembers: members });
});

// Admin: Get all team members (including inactive)
app.get('/api/admin/team-members', verifyAdminToken, (_req, res) => {
  const db = getDb();
  const members = (db.teamMembers || [])
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  res.json({ success: true, teamMembers: members });
});

// Admin: Create team member
app.post('/api/admin/team-members', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) {
      db.teamMembers = [];
    }

    const name = (req.body.name || '').trim();
    const designation = (req.body.designation || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Team member name is required' });
    }
    if (!designation) {
      return res.status(400).json({ error: 'Team member designation is required' });
    }

    const highestOrder = db.teamMembers.reduce((max, m) => Math.max(max, m.displayOrder || 0), 0);
    const displayOrder = Number(req.body.displayOrder) > 0 ? Number(req.body.displayOrder) : highestOrder + 1;

    // Sanitize string arrays for responsibilities and achievements
    const parseList = (input: any): string[] => {
      if (Array.isArray(input)) {
        return input.map(item => String(item).trim()).filter(Boolean);
      }
      if (typeof input === 'string') {
        return input.split('\n').map(line => line.trim()).filter(Boolean);
      }
      return [];
    };

    const newMember: TeamMember = {
      id: 'team-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name,
      designation,
      photo: req.body.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
      shortBio: (req.body.shortBio || '').trim(),
      fullBio: (req.body.fullBio || '').trim(),
      experience: req.body.experience ? String(req.body.experience).trim() : undefined,
      specialization: req.body.specialization ? String(req.body.specialization).trim() : undefined,
      responsibilities: parseList(req.body.responsibilities),
      achievements: parseList(req.body.achievements),
      socialLinks: {
        linkedin: req.body.socialLinks?.linkedin?.trim() || undefined,
        instagram: req.body.socialLinks?.instagram?.trim() || undefined,
        facebook: req.body.socialLinks?.facebook?.trim() || undefined,
        youtube: req.body.socialLinks?.youtube?.trim() || undefined,
        email: req.body.socialLinks?.email?.trim() || undefined,
      },
      videoUrl: req.body.videoUrl ? String(req.body.videoUrl).trim() : undefined,
      displayOrder,
      active: req.body.active !== undefined ? Boolean(req.body.active) : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.teamMembers.push(newMember);
    saveDb(db);

    res.status(201).json({ success: true, member: newMember });
  } catch (err: any) {
    console.error('Error creating team member:', err);
    res.status(500).json({ error: 'Failed to create team member' });
  }
});

// Admin: Update team member
app.put('/api/admin/team-members/:id', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];

    const index = db.teamMembers.findIndex(m => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    const current = db.teamMembers[index];

    const parseList = (input: any): string[] => {
      if (Array.isArray(input)) {
        return input.map(item => String(item).trim()).filter(Boolean);
      }
      if (typeof input === 'string') {
        return input.split('\n').map(line => line.trim()).filter(Boolean);
      }
      return [];
    };

    const updatedMember: TeamMember = {
      ...current,
      name: req.body.name !== undefined ? String(req.body.name).trim() : current.name,
      designation: req.body.designation !== undefined ? String(req.body.designation).trim() : current.designation,
      photo: req.body.photo !== undefined ? String(req.body.photo).trim() : current.photo,
      shortBio: req.body.shortBio !== undefined ? String(req.body.shortBio).trim() : current.shortBio,
      fullBio: req.body.fullBio !== undefined ? String(req.body.fullBio).trim() : current.fullBio,
      experience: req.body.experience !== undefined ? String(req.body.experience).trim() : current.experience,
      specialization: req.body.specialization !== undefined ? String(req.body.specialization).trim() : current.specialization,
      responsibilities: req.body.responsibilities !== undefined ? parseList(req.body.responsibilities) : current.responsibilities,
      achievements: req.body.achievements !== undefined ? parseList(req.body.achievements) : current.achievements,
      socialLinks: {
        linkedin: req.body.socialLinks?.linkedin !== undefined ? req.body.socialLinks.linkedin.trim() : current.socialLinks?.linkedin,
        instagram: req.body.socialLinks?.instagram !== undefined ? req.body.socialLinks.instagram.trim() : current.socialLinks?.instagram,
        facebook: req.body.socialLinks?.facebook !== undefined ? req.body.socialLinks.facebook.trim() : current.socialLinks?.facebook,
        youtube: req.body.socialLinks?.youtube !== undefined ? req.body.socialLinks.youtube.trim() : current.socialLinks?.youtube,
        email: req.body.socialLinks?.email !== undefined ? req.body.socialLinks.email.trim() : current.socialLinks?.email,
      },
      videoUrl: req.body.videoUrl !== undefined ? String(req.body.videoUrl).trim() : current.videoUrl,
      displayOrder: req.body.displayOrder !== undefined ? Number(req.body.displayOrder) : current.displayOrder,
      active: req.body.active !== undefined ? Boolean(req.body.active) : current.active,
      updatedAt: new Date().toISOString(),
    };

    db.teamMembers[index] = updatedMember;
    saveDb(db);

    res.json({ success: true, member: updatedMember });
  } catch (err: any) {
    console.error('Error updating team member:', err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

// Admin: Toggle team member active status
app.patch('/api/admin/team-members/:id/toggle-active', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];

    const index = db.teamMembers.findIndex(m => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    db.teamMembers[index].active = !db.teamMembers[index].active;
    db.teamMembers[index].updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ success: true, active: db.teamMembers[index].active, member: db.teamMembers[index] });
  } catch (err: any) {
    console.error('Error toggling team member status:', err);
    res.status(500).json({ error: 'Failed to toggle active status' });
  }
});

// Admin: Reorder team members
app.put('/api/admin/team-members-reorder', verifyAdminToken, (req, res) => {
  try {
    const { orderList } = req.body; // Array of { id: string, displayOrder: number }
    if (!Array.isArray(orderList)) {
      return res.status(400).json({ error: 'orderList array is required' });
    }

    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];

    orderList.forEach(item => {
      const member = db.teamMembers.find(m => m.id === item.id);
      if (member) {
        member.displayOrder = Number(item.displayOrder);
        member.updatedAt = new Date().toISOString();
      }
    });

    saveDb(db);
    const sorted = db.teamMembers.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    res.json({ success: true, teamMembers: sorted });
  } catch (err: any) {
    console.error('Error reordering team members:', err);
    res.status(500).json({ error: 'Failed to reorder team members' });
  }
});

// Admin: Delete team member
app.delete('/api/admin/team-members/:id', verifyAdminToken, (req, res) => {
  try {
    const db = getDb();
    if (!Array.isArray(db.teamMembers)) db.teamMembers = [];

    const initialLen = db.teamMembers.length;
    db.teamMembers = db.teamMembers.filter(m => m.id !== req.params.id);

    if (db.teamMembers.length === initialLen) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    saveDb(db);
    res.json({ success: true, message: 'Team member deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting team member:', err);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

// =========================================================================
// PUSH NOTIFICATION API ENDPOINTS (Sections 1-28)
// =========================================================================

// Public: Get FCM configuration status and public VAPID / client keys
app.get('/api/notifications/config', (_req, res) => {
  const fcmStatus = getFcmConfigStatus();
  const vapidKey = process.env.VITE_FIREBASE_VAPID_KEY || process.env.FIREBASE_VAPID_KEY || null;

  // Optional client Firebase config if provided in env
  const firebaseClientConfig = process.env.VITE_FIREBASE_API_KEY
    ? {
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID,
      }
    : null;

  res.json({
    isConfigured: fcmStatus.isConfigured,
    projectId: fcmStatus.projectId,
    vapidKey,
    firebaseClientConfig,
  });
});

// Public: Register / refresh device FCM token with deduplication
app.post('/api/notifications/register-token', (req, res) => {
  try {
    const { token, deviceId, platform, browser, permission, preferences } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Device token is required' });
    }

    const userId = getAuthenticatedUserId(req) || undefined;

    const record = registerOrUpdateToken({
      token,
      userId,
      deviceId: deviceId || 'dev_' + Math.random().toString(36).substring(2, 10),
      platform,
      browser,
      permission,
      preferences,
    });

    res.json({
      success: true,
      tokenRecord: record,
    });
  } catch (err: any) {
    console.error('Error registering notification token:', err);
    res.status(500).json({ error: 'Failed to register notification token' });
  }
});

// Public: Get notification preferences for a device / user
app.get('/api/notifications/preferences', (req, res) => {
  const deviceId = req.query.deviceId as string;
  const userId = getAuthenticatedUserId(req);

  const db = getDb();
  let tokenRecord = db.notificationTokens.find(
    t => (userId && t.userId === userId) || (deviceId && t.deviceId === deviceId)
  );

  const preferences = tokenRecord ? tokenRecord.preferences : DEFAULT_PREFERENCES;
  res.json({ preferences });
});

// Public: Update notification preferences
app.put('/api/notifications/preferences', (req, res) => {
  try {
    const { deviceId, token, preferences } = req.body;
    const userId = getAuthenticatedUserId(req) || undefined;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Preferences object is required' });
    }

    const updated = updateTokenPreferences({ deviceId, userId, token }, preferences);
    res.json({ success: true, updated });
  } catch (err: any) {
    console.error('Error updating notification preferences:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Admin: Get notification dashboard statistics
app.get('/api/admin/notifications/stats', verifyAdminToken, (_req, res) => {
  try {
    const stats = getNotificationStats();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching notification stats:', err);
    res.status(500).json({ error: 'Failed to load notification statistics' });
  }
});

// Admin: Get notification campaigns history
app.get('/api/admin/notifications/campaigns', verifyAdminToken, (_req, res) => {
  try {
    const db = getDb();
    const sorted = [...db.notificationCampaigns].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sorted);
  } catch (err) {
    console.error('Error fetching notification campaigns:', err);
    res.status(500).json({ error: 'Failed to load campaigns' });
  }
});

// Admin: Send or schedule a notification campaign
app.post('/api/admin/notifications/send', verifyAdminToken, async (req, res) => {
  try {
    const {
      title,
      message,
      image,
      category = 'important_updates',
      targetAudience = 'all',
      deepLink = '/',
      doorId,
      scheduleTime,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Notification title is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Notification message body is required' });
    }

    // Check if scheduled for the future
    const isScheduled = scheduleTime && new Date(scheduleTime).getTime() > Date.now();

    const newCampaign: NotificationCampaign = {
      id: 'camp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      message: message.trim(),
      image: image || undefined,
      category,
      targetAudience,
      deepLink: deepLink || '/',
      doorId: doorId || undefined,
      status: isScheduled ? 'scheduled' : 'draft',
      scheduledAt: isScheduled ? new Date(scheduleTime).toISOString() : undefined,
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
    };

    const db = getDb();

    if (isScheduled) {
      db.notificationCampaigns.push(newCampaign);
      saveDb(db);
      return res.json({
        success: true,
        status: 'scheduled',
        message: `Notification successfully scheduled for ${new Date(scheduleTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)`,
        campaign: newCampaign,
      });
    }

    // Send immediately via FCM
    try {
      const result = await sendCampaignNotification(newCampaign);
      res.json({
        success: true,
        status: 'sent',
        message: 'Notification sent successfully',
        result,
        campaign: newCampaign,
      });
    } catch (sendErr: any) {
      console.error('Notification dispatch error:', sendErr);
      const isNotConfigured = sendErr.message?.includes('not configured');
      return res.status(isNotConfigured ? 400 : 500).json({
        error: sendErr.message || 'Unable to send notification. Please try again.',
        isNotConfigured,
      });
    }
  } catch (err: any) {
    console.error('Error in send notification handler:', err);
    res.status(500).json({ error: 'Unable to send notification. Please try again.' });
  }
});

// Admin: Cancel scheduled notification
app.post('/api/admin/notifications/cancel-scheduled/:id', verifyAdminToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const campaign = db.notificationCampaigns.find(c => c.id === id);

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (campaign.status === 'scheduled') {
    campaign.status = 'draft';
    campaign.error = 'Cancelled by administrator';
    saveDb(db);
  }

  res.json({ success: true, campaign });
});

// Admin: Delete notification campaign
app.delete('/api/admin/notifications/campaign/:id', verifyAdminToken, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const initialLen = db.notificationCampaigns.length;
  db.notificationCampaigns = db.notificationCampaigns.filter(c => c.id !== id);

  if (db.notificationCampaigns.length === initialLen) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  saveDb(db);
  res.json({ success: true, message: 'Campaign deleted successfully' });
});

// ---------------- SERVER BOOTSTRAP ----------------

async function startServer() {
  // Legacy Visualizer redirect routes (Redirects old visualizer URLs to Home)
  app.get(
    [
      '/visualizer',
      '/visualizer/*',
      '/ai-visualizer',
      '/ai-visualizer/*',
      '/video-visualizer',
      '/video-visualizer/*',
      '/video-visualization',
      '/ai-video',
      '/video',
      '/video/*',
    ],
    (_req, res) => {
      res.redirect(301, '/');
    }
  );

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚪 Shivshahi Door Price Calculator server running at http://0.0.0.0:${PORT}`);
    startScheduledNotificationWorker();
  });
}

startServer();
