/**
 * Production server entry point for Cloud Run / cloud deployments.
 * Strictly loads the compiled production server bundle in dist/server.cjs
 * (never executes server.ts directly in production).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Ensure production mode is active by default in production hosting environments
if (process.env.NODE_ENV !== 'test') {
  process.env.NODE_ENV = 'production';
}

const currentFileUrl = typeof import.meta !== 'undefined' && import.meta.url ? import.meta.url : null;
const __dirname = currentFileUrl ? path.dirname(fileURLToPath(currentFileUrl)) : process.cwd();
const distDir = path.join(__dirname, 'dist');
const distServerPath = path.join(distDir, 'server.cjs');
const distIndexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(distServerPath)) {
  console.error(
    `❌ Startup aborted: compiled production bundle not found at "${distServerPath}".\n` +
      '   Run "npm run build" before starting the production server (direct execution of server.ts is disabled in production).'
  );
  process.exit(1);
}

if (!fs.existsSync(distIndexPath)) {
  console.warn(
    `⚠️ Warning: frontend build index not found at "${distIndexPath}". Run "npm run build" to build static assets.`
  );
}

const require = createRequire(currentFileUrl || path.join(__dirname, 'package.json'));
try {
  require(distServerPath);
} catch (err) {
  console.error('❌ Failed to start production server from dist/server.cjs:', err);
  process.exit(1);
}
