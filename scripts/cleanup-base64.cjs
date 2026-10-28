const fs = require('fs');
const path = require('path');

// Target database files across all storage locations
const appRoot = process.cwd();
const dataDir = path.join(appRoot, 'data');
const serverDataDir = path.join(appRoot, 'server', 'data');
const backupsDir = path.join(dataDir, 'backups');
const serverBackupsDir = path.join(serverDataDir, 'backups');
const uploadsDirs = [
  path.join(dataDir, 'uploads'),
  path.join(appRoot, 'public', 'uploads'),
  path.join(serverDataDir, 'uploads'),
];

// Ensure required directories exist
[dataDir, serverDataDir, backupsDir, serverBackupsDir, ...uploadsDirs].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Primary database path
const dbPath = path.join(dataDir, 'database.json');
if (!fs.existsSync(dbPath)) {
  console.log('⚠️ No database.json found at:', dbPath);
  process.exit(0);
}

// 1. Read existing database and create a pre-migration safety backup
let db;
try {
  const dbRaw = fs.readFileSync(dbPath, 'utf8');
  db = JSON.parse(dbRaw);
} catch (err) {
  console.error('❌ Failed to parse database.json:', err.message);
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilename = `pre-migration-${timestamp}.json`;
const backupPath = path.join(backupsDir, backupFilename);
const serverBackupPath = path.join(serverBackupsDir, backupFilename);

fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf8');
fs.writeFileSync(serverBackupPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`🛡️ Created pre-migration backup at: ${backupPath}`);

// Try loading S3 client for R2 upload if environment variables exist
let s3Client = null;
let r2Bucket = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || 'jai-hanuman-door-media';
try {
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '').trim();
  const accountId = (process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  
  if (accessKeyId && secretAccessKey && accountId) {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    console.log(`✅ [Migration] Initialized R2 S3 Client for bucket "${r2Bucket}"`);
  }
} catch (r2InitErr) {
  console.log('ℹ️ [Migration] R2 S3 Client not initialized:', r2InitErr.message);
}

// Helper: Convert Base64 data URL to local disk file & upload to R2 if available
async function processBase64Image(base64Str, prefix) {
  if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:')) {
    return base64Str;
  }
  try {
    const match = base64Str.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return base64Str;

    const mimeType = match[1];
    let ext = mimeType.split('/')[1] || 'jpg';
    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';

    const buffer = Buffer.from(match[2], 'base64');
    const filename = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    
    // Save to all local upload directories
    for (const dir of uploadsDirs) {
      fs.writeFileSync(path.join(dir, filename), buffer);
    }

    // Try uploading to R2
    if (s3Client) {
      try {
        const { PutObjectCommand } = require('@aws-sdk/client-s3');
        await s3Client.send(new PutObjectCommand({
          Bucket: r2Bucket,
          Key: `uploads/${filename}`,
          Body: buffer,
          ContentType: mimeType,
        }));
        console.log(`☁️ Uploaded migrated image ${filename} to Cloudflare R2`);
      } catch (r2Err) {
        console.warn(`⚠️ R2 upload warning for ${filename}:`, r2Err.message);
      }
    }

    console.log(`✅ Converted Base64 (${base64Str.length} chars) -> /uploads/${filename}`);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error('❌ Failed to convert Base64 string:', err.message);
    return base64Str;
  }
}

// Missing asset tracking report
const missingAssets = [];

function verifyOrTrackLocalImage(urlStr, contextInfo) {
  if (!urlStr || typeof urlStr !== 'string') return urlStr;
  const trimmed = urlStr.trim();
  
  // Ignore external URLs (e.g. Unsplash) or Data URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const uploadsIdx = trimmed.lastIndexOf('/uploads/');
  if (uploadsIdx !== -1) {
    const filename = trimmed.slice(uploadsIdx + '/uploads/'.length).split('?')[0].split('#')[0];
    if (filename) {
      let foundLocal = false;
      for (const dir of uploadsDirs) {
        if (fs.existsSync(path.join(dir, filename))) {
          foundLocal = true;
          break;
        }
      }

      if (!foundLocal) {
        missingAssets.push({
          entity: contextInfo.entity,
          recordId: contextInfo.id,
          recordTitle: contextInfo.title || contextInfo.name || 'Unknown',
          field: contextInfo.field,
          missingPath: trimmed,
          filename,
        });
        console.warn(`⚠️ [MISSING ASSET] ${contextInfo.entity} (${contextInfo.id}) field "${contextInfo.field}": ${filename} not found in local disk upload cache`);
      }
      return `/uploads/${filename}`;
    }
  }

  return trimmed;
}

async function runMigration() {
  console.log('🔄 Starting comprehensive multi-collection Base64 & Image reference migration...');

  // 1. DOORS
  if (Array.isArray(db.doors)) {
    for (const d of db.doors) {
      if (d.image) {
        if (d.image.startsWith('data:')) {
          d.image = await processBase64Image(d.image, `door_${d.id}`);
        } else {
          d.image = verifyOrTrackLocalImage(d.image, { entity: 'doors', id: d.id, name: d.name, field: 'image' });
        }
      }
      if (Array.isArray(d.images)) {
        for (let i = 0; i < d.images.length; i++) {
          if (d.images[i] && d.images[i].startsWith('data:')) {
            d.images[i] = await processBase64Image(d.images[i], `door_${d.id}_img${i}`);
          } else if (d.images[i]) {
            d.images[i] = verifyOrTrackLocalImage(d.images[i], { entity: 'doors', id: d.id, name: d.name, field: `images[${i}]` });
          }
        }
      }
      if (d.transparentPngUrl) {
        if (d.transparentPngUrl.startsWith('data:')) {
          d.transparentPngUrl = await processBase64Image(d.transparentPngUrl, `door_trans_${d.id}`);
        } else {
          d.transparentPngUrl = verifyOrTrackLocalImage(d.transparentPngUrl, { entity: 'doors', id: d.id, name: d.name, field: 'transparentPngUrl' });
        }
      }
    }
  }

  // 2. BANNERS
  if (Array.isArray(db.banners)) {
    for (const b of db.banners) {
      if (b.image) {
        if (b.image.startsWith('data:')) {
          b.image = await processBase64Image(b.image, `banner_${b.id}`);
        } else {
          b.image = verifyOrTrackLocalImage(b.image, { entity: 'banners', id: b.id, name: b.title, field: 'image' });
        }
      }
    }
  }

  // 3. MATERIALS
  if (Array.isArray(db.materials)) {
    for (const m of db.materials) {
      if (m.image) {
        if (m.image.startsWith('data:')) {
          m.image = await processBase64Image(m.image, `mat_${m.id}`);
        } else {
          m.image = verifyOrTrackLocalImage(m.image, { entity: 'materials', id: m.id, name: m.name, field: 'image' });
        }
      }
    }
  }

  // 4. FINISHES
  if (Array.isArray(db.finishes)) {
    for (const f of db.finishes) {
      if (f.image) {
        if (f.image.startsWith('data:')) {
          f.image = await processBase64Image(f.image, `fin_${f.id}`);
        } else {
          f.image = verifyOrTrackLocalImage(f.image, { entity: 'finishes', id: f.id, name: f.name, field: 'image' });
        }
      }
    }
  }

  // 5. FRAMES
  if (Array.isArray(db.frames)) {
    for (const fr of db.frames) {
      if (fr.image) {
        if (fr.image.startsWith('data:')) {
          fr.image = await processBase64Image(fr.image, `frame_${fr.id}`);
        } else {
          fr.image = verifyOrTrackLocalImage(fr.image, { entity: 'frames', id: fr.id, name: fr.name, field: 'image' });
        }
      }
    }
  }

  // 6. HARDWARE
  if (Array.isArray(db.hardware)) {
    for (const h of db.hardware) {
      if (h.image) {
        if (h.image.startsWith('data:')) {
          h.image = await processBase64Image(h.image, `hardware_${h.id}`);
        } else {
          h.image = verifyOrTrackLocalImage(h.image, { entity: 'hardware', id: h.id, name: h.name, field: 'image' });
        }
      }
    }
  }

  // 7. DELIVERY STORIES
  if (Array.isArray(db.deliveryStories)) {
    for (const s of db.deliveryStories) {
      const storyTitle = s.orderTitle || s.customerName || s.id;
      if (s.doorThumbnail) {
        if (s.doorThumbnail.startsWith('data:')) {
          s.doorThumbnail = await processBase64Image(s.doorThumbnail, `story_door_${s.id}`);
        } else {
          s.doorThumbnail = verifyOrTrackLocalImage(s.doorThumbnail, { entity: 'deliveryStories', id: s.id, name: storyTitle, field: 'doorThumbnail' });
        }
      }
      if (s.doorPhotoUrl) {
        if (s.doorPhotoUrl.startsWith('data:')) {
          s.doorPhotoUrl = await processBase64Image(s.doorPhotoUrl, `story_door_${s.id}`);
        } else {
          s.doorPhotoUrl = verifyOrTrackLocalImage(s.doorPhotoUrl, { entity: 'deliveryStories', id: s.id, name: storyTitle, field: 'doorPhotoUrl' });
        }
      }
      if (s.deliveryPhoto) {
        if (s.deliveryPhoto.startsWith('data:')) {
          s.deliveryPhoto = await processBase64Image(s.deliveryPhoto, `story_delivery_${s.id}`);
        } else {
          s.deliveryPhoto = verifyOrTrackLocalImage(s.deliveryPhoto, { entity: 'deliveryStories', id: s.id, name: storyTitle, field: 'deliveryPhoto' });
        }
      }
      if (s.deliveryPhotoUrl) {
        if (s.deliveryPhotoUrl.startsWith('data:')) {
          s.deliveryPhotoUrl = await processBase64Image(s.deliveryPhotoUrl, `story_delivery_${s.id}`);
        } else {
          s.deliveryPhotoUrl = verifyOrTrackLocalImage(s.deliveryPhotoUrl, { entity: 'deliveryStories', id: s.id, name: storyTitle, field: 'deliveryPhotoUrl' });
        }
      }
    }
  }

  // 8. CHAUKHAT PRODUCTS
  if (Array.isArray(db.chaukhatProducts)) {
    for (const c of db.chaukhatProducts) {
      if (c.image) {
        if (c.image.startsWith('data:')) {
          c.image = await processBase64Image(c.image, `chaukhat_${c.id}`);
        } else {
          c.image = verifyOrTrackLocalImage(c.image, { entity: 'chaukhatProducts', id: c.id, name: c.name, field: 'image' });
        }
      }
      if (c.primaryImage) {
        if (c.primaryImage.startsWith('data:')) {
          c.primaryImage = await processBase64Image(c.primaryImage, `chaukhat_${c.id}`);
        } else {
          c.primaryImage = verifyOrTrackLocalImage(c.primaryImage, { entity: 'chaukhatProducts', id: c.id, name: c.name, field: 'primaryImage' });
        }
      }
      if (c.plainImage) {
        if (c.plainImage.startsWith('data:')) {
          c.plainImage = await processBase64Image(c.plainImage, `chaukhat_plain_${c.id}`);
        } else {
          c.plainImage = verifyOrTrackLocalImage(c.plainImage, { entity: 'chaukhatProducts', id: c.id, name: c.name, field: 'plainImage' });
        }
      }
      if (c.diamondImage) {
        if (c.diamondImage.startsWith('data:')) {
          c.diamondImage = await processBase64Image(c.diamondImage, `chaukhat_diamond_${c.id}`);
        } else {
          c.diamondImage = verifyOrTrackLocalImage(c.diamondImage, { entity: 'chaukhatProducts', id: c.id, name: c.name, field: 'diamondImage' });
        }
      }
      if (c.handCarvedImage) {
        if (c.handCarvedImage.startsWith('data:')) {
          c.handCarvedImage = await processBase64Image(c.handCarvedImage, `chaukhat_carved_${c.id}`);
        } else {
          c.handCarvedImage = verifyOrTrackLocalImage(c.handCarvedImage, { entity: 'chaukhatProducts', id: c.id, name: c.name, field: 'handCarvedImage' });
        }
      }
    }
  }

  // 9. SETTINGS & BRAND STORY
  if (db.settings?.storySettings) {
    const st = db.settings.storySettings;
    if (st.ownerPhotoUrl) {
      if (st.ownerPhotoUrl.startsWith('data:')) {
        st.ownerPhotoUrl = await processBase64Image(st.ownerPhotoUrl, 'owner_photo');
      } else {
        st.ownerPhotoUrl = verifyOrTrackLocalImage(st.ownerPhotoUrl, { entity: 'settings.storySettings', id: 'ownerPhoto', name: 'Owner Photo', field: 'ownerPhotoUrl' });
      }
    }
    if (st.founderPhoto) {
      if (st.founderPhoto.startsWith('data:')) {
        st.founderPhoto = await processBase64Image(st.founderPhoto, 'founder_photo');
      } else {
        st.founderPhoto = verifyOrTrackLocalImage(st.founderPhoto, { entity: 'settings.storySettings', id: 'founderPhoto', name: 'Founder Photo', field: 'founderPhoto' });
      }
    }
  }

  // 10. TEAM MEMBERS
  if (Array.isArray(db.teamMembers)) {
    for (const tm of db.teamMembers) {
      if (tm.photo) {
        if (tm.photo.startsWith('data:')) {
          tm.photo = await processBase64Image(tm.photo, `team_${tm.id}`);
        } else {
          tm.photo = verifyOrTrackLocalImage(tm.photo, { entity: 'teamMembers', id: tm.id, name: tm.name, field: 'photo' });
        }
      }
    }
  }

  // Synchronize updated database across all copies
  const dbContent = JSON.stringify(db, null, 2);
  const targetDbFiles = [
    path.join(dataDir, 'database.json'),
    path.join(dataDir, 'production_data_store.json'),
    path.join(serverDataDir, 'admin_store.json'),
    path.join(appRoot, 'public', 'database.json'),
  ];

  for (const targetFile of targetDbFiles) {
    try {
      fs.writeFileSync(targetFile, dbContent, 'utf8');
      console.log(`💾 Synchronized database copy: ${targetFile}`);
    } catch (writeErr) {
      console.warn(`⚠️ Failed writing to ${targetFile}:`, writeErr.message);
    }
  }

  // Write Missing Assets Report
  const reportPath = path.join(dataDir, 'missing_assets_report.json');
  const reportData = {
    generatedAt: new Date().toISOString(),
    missingCount: missingAssets.length,
    missingAssets,
  };
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');

  console.log('--------------------------------------------------');
  console.log(`✅ Base64 & Storage Migration Completed Successfully!`);
  console.log(`📊 Missing Assets Recorded: ${missingAssets.length} items (saved to ${reportPath})`);
  console.log('--------------------------------------------------');
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
