import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import {
  TrackingOrder,
  OrderStageRecord,
  TrackingMediaItem,
  TrackingAuditItem,
  TrackingDeliveryInfo,
  PublicTrackingView,
  ORDER_TRACKING_STAGES,
  TrackingStageId,
  StageStatus,
  OrderStatus,
} from '../src/types.ts';
import { getDb, saveDb, UPLOAD_DIR, UPLOAD_BACKUP_DIR } from './db.ts';
import { saveMedia } from './storageService.ts';

// ---------------- Helpers & Generators ----------------

/**
 * Generates an unpredictable, professional Tracking ID.
 * Example: JHD-2026-X8K92
 */
export function generateUniqueTrackingId(existingOrders: TrackingOrder[]): string {
  const currentYear = new Date().getFullYear();
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Omits 0, 1, O, I for human clarity
  const existingSet = new Set((existingOrders || []).map(o => o.trackingId.toUpperCase()));

  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `JHD-${currentYear}-${code}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }
  // Fallback timestamp if collision loop exceeds
  return `JHD-${currentYear}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

/**
 * Initializes default 15 stages for a new order.
 */
export function createDefaultStages(): OrderStageRecord[] {
  const now = new Date().toISOString();
  return ORDER_TRACKING_STAGES.map((st, index) => ({
    id: st.id,
    name: st.name,
    customerDescription: st.customerDescription,
    status: index === 0 ? ('completed' as StageStatus) : ('pending' as StageStatus),
    isMilestone: st.isMilestone,
    milestonePercent: st.milestonePercent,
    startedAt: index === 0 ? now : undefined,
    completedAt: index === 0 ? now : undefined,
    customerNote: index === 0 ? 'Your order has been officially verified and recorded at Jai Hanuman Door.' : undefined,
    updatedAt: now,
  }));
}

/**
 * Calculates manufacturing progress milestone percentage (0, 25, 50, 75, 100).
 * Strictly based on manufacturing milestones and NOT delivery stages.
 */
export function calculateManufacturingPercent(stages: OrderStageRecord[]): number {
  if (!Array.isArray(stages)) return 0;
  const stageMap = new Map(stages.map(s => [s.id, s.status]));

  if (stageMap.get('mfg_100') === 'completed') return 100;
  if (stageMap.get('mfg_75') === 'completed') return 75;
  if (stageMap.get('mfg_50') === 'completed') return 50;
  if (stageMap.get('mfg_25') === 'completed') return 25;
  return 0;
}

/**
 * Calculates current delivery status display text.
 */
export function calculateDeliveryStatusText(order: {
  status: OrderStatus;
  currentStageId: TrackingStageId;
  stages: OrderStageRecord[];
}): string {
  if (order.status === 'cancelled') return 'Cancelled';
  if (order.status === 'on_hold') return 'On Hold';

  const stageMap = new Map((order.stages || []).map(s => [s.id, s.status]));

  if (stageMap.get('delivered') === 'completed') return 'Delivered';
  if (stageMap.get('on_the_way') === 'in_progress' || stageMap.get('on_the_way') === 'completed') {
    return 'On the Way to Your Address';
  }
  if (stageMap.get('dispatched') === 'in_progress' || stageMap.get('dispatched') === 'completed') {
    return 'Dispatched from Showroom';
  }
  if (stageMap.get('delivery_partner_confirmed') === 'in_progress' || stageMap.get('delivery_partner_confirmed') === 'completed') {
    return 'Delivery Partner Confirmed';
  }
  if (stageMap.get('searching_delivery_partner') === 'in_progress') {
    return 'Arranging Delivery Partner';
  }
  if (stageMap.get('transferred_to_showroom') === 'completed' || stageMap.get('transferred_to_showroom') === 'in_progress') {
    return 'At Showroom (Jai Hanuman Door)';
  }
  if (stageMap.get('mfg_100') === 'completed') {
    return '100% Ready (At Workshop)';
  }
  return 'In Workshop (Manufacturing)';
}

/**
 * Sanitizes order object for public customer-facing view.
 * Removes private admin notes, phone, exact address, audit history, and pricing internals.
 */
export function sanitizeForPublicView(order: TrackingOrder, officialWhatsApp = '7887412884'): PublicTrackingView {
  // Mask customer name (e.g. "Rahul Patil" -> "Rahul P.")
  let maskedName = 'Valued Customer';
  if (order.customerName && order.customerName.trim()) {
    const parts = order.customerName.trim().split(/\s+/);
    if (parts.length > 1) {
      maskedName = `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
    } else {
      maskedName = parts[0];
    }
  }

  // Find current stage details
  const currentStageDef = ORDER_TRACKING_STAGES.find(s => s.id === order.currentStageId) || ORDER_TRACKING_STAGES[0];
  const currentStageRec = order.stages?.find(s => s.id === order.currentStageId);

  // Map stages safely
  const publicStages = ORDER_TRACKING_STAGES.map(def => {
    const rec = order.stages?.find(s => s.id === def.id);
    return {
      id: def.id,
      stepNumber: def.stepNumber,
      name: def.name,
      customerDescription: def.customerDescription,
      status: rec?.status || ('pending' as StageStatus),
      isMilestone: def.isMilestone,
      milestonePercent: def.milestonePercent,
      startedAt: rec?.startedAt,
      completedAt: rec?.completedAt,
      customerNote: rec?.customerNote || undefined,
      notApplicableReason: rec?.status === 'not_applicable' ? rec.notApplicableReason : undefined,
    };
  });

  // Filter media: only customer visible
  const publicMedia = (order.media || [])
    .filter(m => m.isCustomerVisible !== false)
    .map(m => ({
      id: m.id,
      stageId: m.stageId,
      url: m.url,
      type: m.type,
      caption: m.caption,
      uploadedAt: m.uploadedAt,
    }));

  return {
    trackingId: order.trackingId,
    customerName: maskedName,
    customerCity: order.customerCity || undefined,
    productName: order.productName,
    productCategory: order.productCategory,
    productImage: order.productImage,
    woodType: order.woodType,
    finishType: order.finishType,
    quantity: order.quantity || 1,
    dimensions: order.dimensions,
    orderDate: order.createdAt,
    lastUpdated: order.updatedAt,
    status: order.status,
    statusReason: order.statusReason,
    currentStage: {
      id: currentStageDef.id,
      name: currentStageDef.name,
      description: currentStageDef.customerDescription,
      status: currentStageRec?.status || 'in_progress',
    },
    manufacturingPercent: order.manufacturingPercent,
    deliveryStatusText: order.deliveryStatusText,
    stages: publicStages,
    media: publicMedia,
    delivery: order.delivery
      ? {
          deliveryPartnerName: order.delivery.deliveryPartnerName,
          transportCompany: order.delivery.transportCompany,
          lrNumber: order.delivery.lrNumber,
          trackingUrl: order.delivery.trackingUrl,
          dispatchedAt: order.delivery.dispatchedAt,
          estimatedDeliveryAt: order.delivery.estimatedDeliveryAt,
          deliveredAt: order.delivery.deliveredAt,
          showroomTransferDate: order.delivery.showroomTransferDate,
        }
      : undefined,
    estimatedCompletionDate: order.estimatedCompletionDate,
    expectedDispatchDate: order.expectedDispatchDate,
    officialWhatsApp,
    officialPhone: '+91 78874 12884',
  };
}

// ---------------- Media Upload Config ----------------

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanExt = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm', '.gif'].includes(ext) ? ext : '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `track-${uniqueSuffix}${cleanExt}`);
  },
});

const mediaUpload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 }, // 40MB for photo & short progress clip
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|mp4|webm|quicktime/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPG, PNG, WebP) and videos (MP4, WebM) are allowed'));
  },
});

// ---------------- Route Handlers Setup ----------------

export function initTrackingRoutes(
  app: express.Application,
  verifyAdminToken: (req: express.Request, res: express.Response, next: express.NextFunction) => void
): void {
  // Simple in-memory rate limiter for public tracking lookups
  const publicRateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const isRateLimited = (ip: string): boolean => {
    const now = Date.now();
    const record = publicRateLimitMap.get(ip);
    if (!record || now > record.resetAt) {
      publicRateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
      return false;
    }
    record.count++;
    return record.count > 60; // Max 60 requests per minute
  };

  // 1. PUBLIC: Get Customer Order Tracking Details
  app.get('/api/tracking/:trackingId', (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        error: 'Too many tracking requests. Please try again after 1 minute.',
      });
    }

    const rawId = req.params.trackingId;
    if (!rawId || typeof rawId !== 'string' || rawId.trim().length < 3) {
      return res.status(400).json({ error: 'Valid Tracking ID is required.' });
    }

    const cleanId = rawId.trim().toUpperCase();
    const db = getDb();
    const orders = db.trackingOrders || [];

    const order = orders.find(
      o => o.trackingId.toUpperCase() === cleanId || o.id.toLowerCase() === rawId.trim().toLowerCase()
    );

    if (!order) {
      return res.status(404).json({
        error: 'No order found with this Tracking ID. Please verify your ID or contact Jai Hanuman Door on WhatsApp.',
      });
    }

    const whatsappNumber = db.settings?.whatsappNumber || '7887412884';
    const publicView = sanitizeForPublicView(order, whatsappNumber);
    return res.json({ success: true, tracking: publicView });
  });

  // 2. ADMIN: List & Search Tracking Orders
  app.get('/api/admin/tracking-orders', verifyAdminToken, (req, res) => {
    const db = getDb();
    let orders = [...(db.trackingOrders || [])];

    const { search, status, stage } = req.query;

    if (status && typeof status === 'string' && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }

    if (stage && typeof stage === 'string' && stage !== 'all') {
      orders = orders.filter(o => o.currentStageId === stage);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter(
        o =>
          o.trackingId.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q) ||
          (o.customerCity && o.customerCity.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      orders,
      totalCount: orders.length,
    });
  });

  // 3. ADMIN: Get Single Full Tracking Order
  app.get('/api/admin/tracking-orders/:id', verifyAdminToken, (req, res) => {
    const { id } = req.params;
    const db = getDb();
    const order = (db.trackingOrders || []).find(
      o => o.id === id || o.trackingId.toUpperCase() === id.toUpperCase()
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order });
  });

  // 4. ADMIN: Create New Trackable Order
  app.post('/api/admin/tracking-orders', verifyAdminToken, (req, res) => {
    try {
      const {
        customerName,
        customerPhone,
        customerEmail,
        customerCity,
        customerAddress,
        productName,
        productCategory,
        productImage,
        woodType,
        finishType,
        quantity,
        dimensions,
        totalAmount,
        advancePaid,
        linkedQuotationId,
        linkedEnquiryId,
        estimatedCompletionDate,
        expectedDispatchDate,
        workshopNotes,
        showroomNotes,
        adminInternalNotes,
      } = req.body;

      if (!customerName || !customerName.trim()) {
        return res.status(400).json({ error: 'Customer Name is required' });
      }
      if (!productName || !productName.trim()) {
        return res.status(400).json({ error: 'Product Name is required' });
      }

      const db = getDb();
      const existingOrders = db.trackingOrders || [];
      const trackingId = generateUniqueTrackingId(existingOrders);
      const now = new Date().toISOString();

      const stages = createDefaultStages();
      const mfgPercent = calculateManufacturingPercent(stages);
      const deliveryStatus = calculateDeliveryStatusText({
        status: 'active',
        currentStageId: 'order_confirmed',
        stages,
      });

      const newOrder: TrackingOrder = {
        id: `ord-${Date.now()}`,
        trackingId,
        customerName: customerName.trim(),
        customerPhone: (customerPhone || '').trim(),
        customerEmail: (customerEmail || '').trim() || undefined,
        customerCity: (customerCity || '').trim() || 'Pune',
        customerAddress: (customerAddress || '').trim() || undefined,
        productName: productName.trim(),
        productCategory: (productCategory || 'Main Door').trim(),
        productImage: productImage || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        woodType: (woodType || 'Sagwan (Teak Wood)').trim(),
        finishType: (finishType || 'Natural Teak Wood Polish').trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        dimensions: dimensions || { widthInch: 36, heightInch: 78, sqFt: 19.5 },
        totalAmount: Number(totalAmount) || 0,
        advancePaid: Number(advancePaid) || 0,
        linkedQuotationId: linkedQuotationId || undefined,
        linkedEnquiryId: linkedEnquiryId || undefined,
        status: 'active',
        currentStageId: 'order_confirmed',
        manufacturingPercent: mfgPercent,
        deliveryStatusText: deliveryStatus,
        stages,
        media: [],
        delivery: {},
        estimatedCompletionDate: estimatedCompletionDate || undefined,
        expectedDispatchDate: expectedDispatchDate || undefined,
        workshopNotes: (workshopNotes || '').trim() || undefined,
        showroomNotes: (showroomNotes || '').trim() || undefined,
        adminInternalNotes: (adminInternalNotes || '').trim() || undefined,
        auditHistory: [
          {
            id: `aud-${Date.now()}`,
            timestamp: now,
            action: 'Order Created',
            stageId: 'order_confirmed',
            actor: 'Admin (shivshahidoors@gmail.com)',
            details: `Created trackable order ${trackingId} for ${customerName.trim()} (${productName.trim()})`,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      db.trackingOrders = [newOrder, ...existingOrders];
      saveDb(db, {
        entity: 'orders',
        action: 'create',
        details: `Created trackable order ${trackingId}`,
      });

      res.status(201).json({ success: true, order: newOrder });
    } catch (err: any) {
      console.error('Error creating tracking order:', err);
      res.status(500).json({ error: err.message || 'Failed to create tracking order' });
    }
  });

  // 5. ADMIN: Update General Order Details
  app.put('/api/admin/tracking-orders/:id', verifyAdminToken, (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const orders = db.trackingOrders || [];
      const index = orders.findIndex(o => o.id === id || o.trackingId.toUpperCase() === id.toUpperCase());

      if (index === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const existing = orders[index];
      const now = new Date().toISOString();

      const updated: TrackingOrder = {
        ...existing,
        ...req.body,
        id: existing.id,
        trackingId: existing.trackingId, // Tracking ID cannot be altered
        stages: existing.stages, // Handled by separate stage endpoint
        media: existing.media, // Handled by media endpoint
        auditHistory: [
          ...existing.auditHistory,
          {
            id: `aud-${Date.now()}`,
            timestamp: now,
            action: 'Order Updated',
            actor: 'Admin (shivshahidoors@gmail.com)',
            details: req.body.updateSummary || 'Updated general order details',
          },
        ],
        updatedAt: now,
      };

      updated.manufacturingPercent = calculateManufacturingPercent(updated.stages);
      updated.deliveryStatusText = calculateDeliveryStatusText(updated);

      orders[index] = updated;
      db.trackingOrders = orders;
      saveDb(db);

      res.json({ success: true, order: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update order' });
    }
  });

  // 6. ADMIN: Update Stage Status & Progress
  app.put('/api/admin/tracking-orders/:id/stage', verifyAdminToken, (req, res) => {
    try {
      const { id } = req.params;
      const { stageId, status, customerNote, adminNote, notApplicableReason, moveNext } = req.body;

      if (!stageId || !status) {
        return res.status(400).json({ error: 'stageId and status are required' });
      }

      const validStatuses: StageStatus[] = ['pending', 'in_progress', 'completed', 'on_hold', 'not_applicable'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const db = getDb();
      const orders = db.trackingOrders || [];
      const orderIndex = orders.findIndex(o => o.id === id || o.trackingId.toUpperCase() === id.toUpperCase());

      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orders[orderIndex];
      const now = new Date().toISOString();

      const stageIndex = order.stages.findIndex(s => s.id === stageId);
      if (stageIndex === -1) {
        return res.status(404).json({ error: 'Stage not found in order' });
      }

      const stage = order.stages[stageIndex];
      const oldStatus = stage.status;

      // Update stage record
      stage.status = status;
      stage.updatedAt = now;
      if (customerNote !== undefined) stage.customerNote = customerNote;
      if (adminNote !== undefined) stage.adminNote = adminNote;
      if (notApplicableReason !== undefined) stage.notApplicableReason = notApplicableReason;

      if (status === 'in_progress' && !stage.startedAt) {
        stage.startedAt = now;
      }
      if (status === 'completed' && !stage.completedAt) {
        stage.completedAt = now;
      }
      if (status === 'pending') {
        stage.completedAt = undefined;
      }

      // If moveNext requested or stage completed, smoothly advance currentStageId
      if (moveNext || (status === 'completed' && order.currentStageId === stageId)) {
        // Find next non-skipped stage
        const nextStage = order.stages.slice(stageIndex + 1).find(s => s.status !== 'not_applicable');
        if (nextStage) {
          order.currentStageId = nextStage.id;
          if (nextStage.status === 'pending') {
            nextStage.status = 'in_progress';
            nextStage.startedAt = now;
            nextStage.updatedAt = now;
          }
        }
      } else if (status === 'in_progress') {
        order.currentStageId = stageId;
      }

      // If stage is 'delivered' and marked completed, set order status completed
      if (stageId === 'delivered' && status === 'completed') {
        order.status = 'completed';
        if (!order.delivery) order.delivery = {};
        order.delivery.deliveredAt = now;
      }

      // Re-calculate manufacturing & delivery status
      order.manufacturingPercent = calculateManufacturingPercent(order.stages);
      order.deliveryStatusText = calculateDeliveryStatusText(order);
      order.updatedAt = now;

      // Audit log
      const auditDetails = `Stage '${stage.name}' changed from ${oldStatus} to ${status}${customerNote ? ` (Note: ${customerNote})` : ''}`;
      order.auditHistory.push({
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: `Stage: ${stage.name}`,
        stageId,
        actor: 'Admin (shivshahidoors@gmail.com)',
        details: auditDetails,
      });

      orders[orderIndex] = order;
      db.trackingOrders = orders;
      saveDb(db, {
        entity: 'orders',
        action: 'update',
        details: `Updated stage ${stageId} for order ${order.trackingId}`,
      });

      res.json({ success: true, order });
    } catch (err: any) {
      console.error('Error updating stage:', err);
      res.status(500).json({ error: err.message || 'Failed to update stage' });
    }
  });

  // 7. ADMIN: Upload Progress Proof Photo / Video
  app.post(
    '/api/admin/tracking-orders/:id/media',
    verifyAdminToken,
    mediaUpload.single('file'),
    (req, res) => {
      try {
        const { id } = req.params;
        const { stageId, caption, isCustomerVisible } = req.body;

        if (!req.file) {
          return res.status(400).json({ error: 'No media file provided' });
        }

        // Mirror to backup uploads dir & persist via storageService
        try {
          const backupPath = path.join(UPLOAD_BACKUP_DIR, req.file.filename);
          fs.copyFileSync(req.file.path, backupPath);
          const fileBuf = fs.readFileSync(req.file.path);
          saveMedia(req.file.filename, req.file.mimetype || 'image/jpeg', fileBuf).catch(() => {});
        } catch {}

        const db = getDb();
        const orders = db.trackingOrders || [];
        const orderIndex = orders.findIndex(o => o.id === id || o.trackingId.toUpperCase() === id.toUpperCase());

        if (orderIndex === -1) {
          return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[orderIndex];
        const isVideo = req.file.mimetype.startsWith('video/') || req.file.filename.endsWith('.mp4') || req.file.filename.endsWith('.webm');
        const mediaUrl = `/uploads/${req.file.filename}`;
        const now = new Date().toISOString();

        const newMedia: TrackingMediaItem = {
          id: `med-${Date.now()}`,
          stageId: stageId || order.currentStageId,
          url: mediaUrl,
          type: isVideo ? 'video' : 'image',
          caption: (caption || '').trim() || undefined,
          isCustomerVisible: isCustomerVisible === 'false' ? false : true,
          uploadedAt: now,
        };

        order.media = [...(order.media || []), newMedia];
        order.updatedAt = now;
        order.auditHistory.push({
          id: `aud-${Date.now()}`,
          timestamp: now,
          action: 'Media Uploaded',
          stageId: newMedia.stageId,
          actor: 'Admin (shivshahidoors@gmail.com)',
          details: `Uploaded ${isVideo ? 'video' : 'photo'} for stage ${newMedia.stageId}`,
        });

        orders[orderIndex] = order;
        db.trackingOrders = orders;
        saveDb(db);

        res.status(201).json({ success: true, media: newMedia, order });
      } catch (err: any) {
        console.error('Error uploading tracking media:', err);
        res.status(500).json({ error: err.message || 'Failed to upload media' });
      }
    }
  );

  // 8. ADMIN: Delete Progress Media
  app.delete('/api/admin/tracking-orders/:id/media/:mediaId', verifyAdminToken, (req, res) => {
    try {
      const { id, mediaId } = req.params;
      const db = getDb();
      const orders = db.trackingOrders || [];
      const orderIndex = orders.findIndex(o => o.id === id || o.trackingId.toUpperCase() === id.toUpperCase());

      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orders[orderIndex];
      const now = new Date().toISOString();

      order.media = (order.media || []).filter(m => m.id !== mediaId);
      order.updatedAt = now;
      order.auditHistory.push({
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'Media Deleted',
        actor: 'Admin (shivshahidoors@gmail.com)',
        details: `Deleted media item ${mediaId}`,
      });

      orders[orderIndex] = order;
      db.trackingOrders = orders;
      saveDb(db);

      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete media' });
    }
  });

  // 9. ADMIN: Update Delivery & Transport Details
  app.put('/api/admin/tracking-orders/:id/delivery', verifyAdminToken, (req, res) => {
    try {
      const { id } = req.params;
      const deliveryData: Partial<TrackingDeliveryInfo> = req.body;

      const db = getDb();
      const orders = db.trackingOrders || [];
      const orderIndex = orders.findIndex(o => o.id === id || o.trackingId.toUpperCase() === id.toUpperCase());

      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orders[orderIndex];
      const now = new Date().toISOString();

      order.delivery = {
        ...order.delivery,
        ...deliveryData,
      };

      order.updatedAt = now;
      order.auditHistory.push({
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'Delivery Info Updated',
        actor: 'Admin (shivshahidoors@gmail.com)',
        details: `Updated delivery partner / dispatch info: ${deliveryData.deliveryPartnerName || deliveryData.transportCompany || 'Details updated'}`,
      });

      orders[orderIndex] = order;
      db.trackingOrders = orders;
      saveDb(db);

      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update delivery info' });
    }
  });

  // 10. ADMIN: Mark Order as Delivered
  app.post('/api/admin/tracking-orders/:id/deliver', verifyAdminToken, (req, res) => {
    try {
      const { id } = req.params;
      const { deliveryNotes } = req.body;

      const db = getDb();
      const orders = db.trackingOrders || [];
      const orderIndex = orders.findIndex(o => o.id === id || o.trackingId.toUpperCase() === id.toUpperCase());

      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orders[orderIndex];
      const now = new Date().toISOString();

      // Mark stage 15 'delivered' completed
      const deliveredStage = order.stages.find(s => s.id === 'delivered');
      if (deliveredStage) {
        deliveredStage.status = 'completed';
        deliveredStage.completedAt = now;
        deliveredStage.updatedAt = now;
        if (deliveryNotes) deliveredStage.customerNote = deliveryNotes;
      }

      order.status = 'completed';
      order.currentStageId = 'delivered';
      if (!order.delivery) order.delivery = {};
      order.delivery.deliveredAt = now;
      order.deliveryStatusText = 'Delivered';
      order.updatedAt = now;

      order.auditHistory.push({
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'Order Delivered',
        stageId: 'delivered',
        actor: 'Admin (shivshahidoors@gmail.com)',
        details: `Order marked as successfully delivered to customer. ${deliveryNotes ? `Note: ${deliveryNotes}` : ''}`,
      });

      orders[orderIndex] = order;
      db.trackingOrders = orders;
      saveDb(db);

      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to mark as delivered' });
    }
  });

  // 11. ADMIN: Cancel Order
  app.post('/api/admin/tracking-orders/:id/cancel', verifyAdminToken, (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Cancellation reason is required' });
      }

      const db = getDb();
      const orders = db.trackingOrders || [];
      const orderIndex = orders.findIndex(o => o.id === id || o.trackingId.toUpperCase() === id.toUpperCase());

      if (orderIndex === -1) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orders[orderIndex];
      const now = new Date().toISOString();

      order.status = 'cancelled';
      order.statusReason = reason.trim();
      order.deliveryStatusText = 'Cancelled';
      order.updatedAt = now;

      order.auditHistory.push({
        id: `aud-${Date.now()}`,
        timestamp: now,
        action: 'Order Cancelled',
        actor: 'Admin (shivshahidoors@gmail.com)',
        details: `Order cancelled. Reason: ${reason.trim()}`,
      });

      orders[orderIndex] = order;
      db.trackingOrders = orders;
      saveDb(db);

      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to cancel order' });
    }
  });

  // 12. ADMIN: Delete Order
  app.delete('/api/admin/tracking-orders/:id', verifyAdminToken, (req, res) => {
    try {
      const { id } = req.params;
      const db = getDb();
      const orders = db.trackingOrders || [];
      const order = orders.find(o => o.id === id || o.trackingId.toUpperCase() === id.toUpperCase());

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      db.trackingOrders = orders.filter(o => o.id !== order.id);
      saveDb(db, {
        entity: 'orders',
        action: 'delete',
        details: `Deleted order ${order.trackingId} (${order.customerName})`,
      });

      res.json({ success: true, message: `Order ${order.trackingId} deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete order' });
    }
  });
}
