/**
 * Production server entry point for Hostinger / cloud deployments.
 * This wrapper loads the production server bundle built in dist/server.cjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distServerPath = path.join(__dirname, 'dist', 'server.cjs');

if (!fs.existsSync(distServerPath)) {
  console.error(
    '❌ dist/server.cjs not found! Please make sure "npm run build" executes during deployment.'
  );
  process.exit(1);
}

await import('./dist/server.cjs');
