/**
 * Production server entry point for Hostinger / cloud deployments.
 * This wrapper loads the production server bundle built in dist/server.cjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// Ensure production mode is active by default in production hosting environments
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distServerPath = path.join(__dirname, 'dist', 'server.cjs');

if (!fs.existsSync(distServerPath)) {
  console.error(
    '❌ dist/server.cjs not found! Please ensure "npm run build" runs before starting the server.'
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
try {
  require(distServerPath);
} catch (err) {
  console.error('❌ Failed to start production server from dist/server.cjs:', err);
  process.exit(1);
}

