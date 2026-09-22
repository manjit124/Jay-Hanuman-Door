/**
 * Data Protection Script for Production Builds and Deployments
 * 
 * Ensures:
 * 1. Production database is never wiped or replaced during build or deployment.
 * 2. Pre-build snapshot is saved in data/backups/
 * 3. Uploaded media is preserved and mirrored between public/uploads, data/uploads, and dist/uploads.
 */

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const backupsDir = path.join(dataDir, 'backups');
const dbFile = path.join(dataDir, 'database.json');
const mirrorFile = path.join(dataDir, 'production_data_store.json');
const uploadsDir = path.join(rootDir, 'public', 'uploads');
const dataUploadsDir = path.join(dataDir, 'uploads');
const distUploadsDir = path.join(rootDir, 'dist', 'uploads');

// Ensure directories exist
[dataDir, backupsDir, uploadsDir, dataUploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
});

const isPostBuild = process.argv.includes('--post-build');

if (!isPostBuild) {
  console.log('🛡️ [Pre-Build] Checking production data protection...');

  // 1. Verify database exists and create pre-build backup
  if (fs.existsSync(dbFile)) {
    try {
      const raw = fs.readFileSync(dbFile, 'utf8');
      const parsed = JSON.parse(raw);
      const doorCount = Array.isArray(parsed.doors) ? parsed.doors.length : 0;
      console.log(`✅ [Pre-Build] Production database verified (${doorCount} doors)`);

      // Write snapshot
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotPath = path.join(backupsDir, `pre-build-snapshot-${ts}.json`);
      fs.writeFileSync(snapshotPath, raw, 'utf8');

      // Ensure mirror file is up to date
      fs.writeFileSync(mirrorFile, raw, 'utf8');
      console.log(`📦 [Pre-Build] Snapshot saved to: data/backups/pre-build-snapshot-${ts}.json`);
    } catch (err) {
      console.warn('⚠️ [Pre-Build] Could not parse database.json for snapshot:', err.message);
    }
  } else if (fs.existsSync(mirrorFile)) {
    console.log('🛡️ [Pre-Build] database.json missing, restoring from production_data_store.json mirror...');
    fs.copyFileSync(mirrorFile, dbFile);
  }

  // 2. Sync uploads between public/uploads and data/uploads
  try {
    const backupFiles = fs.readdirSync(dataUploadsDir);
    for (const f of backupFiles) {
      const src = path.join(dataUploadsDir, f);
      const dest = path.join(uploadsDir, f);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }
    const publicFiles = fs.readdirSync(uploadsDir);
    for (const f of publicFiles) {
      const src = path.join(uploadsDir, f);
      const dest = path.join(dataUploadsDir, f);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }
  } catch (err) {
    console.warn('⚠️ [Pre-Build] Uploads sync warning:', err.message);
  }
} else {
  console.log('🛡️ [Post-Build] Verifying and synchronizing build assets...');

  // Ensure dist/uploads has all images
  if (fs.existsSync(path.join(rootDir, 'dist'))) {
    if (!fs.existsSync(distUploadsDir)) {
      try { fs.mkdirSync(distUploadsDir, { recursive: true }); } catch {}
    }

    try {
      const sources = [uploadsDir, dataUploadsDir];
      for (const srcDir of sources) {
        if (fs.existsSync(srcDir)) {
          const files = fs.readdirSync(srcDir);
          for (const f of files) {
            const src = path.join(srcDir, f);
            const dest = path.join(distUploadsDir, f);
            if (fs.existsSync(src) && !fs.existsSync(dest)) {
              fs.copyFileSync(src, dest);
            }
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ [Post-Build] Dist uploads sync warning:', err.message);
    }
  }

  // Verify database is still intact
  if (fs.existsSync(dbFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      const doorCount = Array.isArray(parsed.doors) ? parsed.doors.length : 0;
      console.log(`✅ [Post-Build] Production database intact with ${doorCount} doors.`);
    } catch (err) {
      console.error('❌ [Post-Build] Database validation failed after build:', err.message);
    }
  }
}
