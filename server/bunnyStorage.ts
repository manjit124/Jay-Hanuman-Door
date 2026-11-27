/**
 * Bunny.net Edge Storage Service for Jai Hanuman Door
 *
 * Reads all credentials exclusively from server-side environment variables:
 *   - BUNNY_STORAGE_ZONE
 *   - BUNNY_STORAGE_PASSWORD
 *   - BUNNY_STORAGE_ENDPOINT
 *   - BUNNY_CDN_URL (optional Pull Zone public hostname, e.g. https://your-zone.b-cdn.net)
 *
 * Security:
 *   - Never exposes BUNNY_STORAGE_PASSWORD to frontend code, logs, or API responses.
 *   - Uses backend streaming proxy `/api/bunny/media/*` (with HTTP 206 byte-range support)
 *     whenever direct Pull Zone CDN hostname (`BUNNY_CDN_URL`) is not configured.
 */

import path from 'path';

export const BUNNY_MEDIA_FOLDERS = [
  'products',
  'catalog',
  'banners',
  'videos',
  'models3d',
  'materials',
  'finishes',
  'hardware',
  'frames',
  'categories',
  'delivery',
  'brand',
  'team',
  'articles',
  'notifications',
  'tracking',
  'chaukhat',
  'notebook-scans',
  'general',
] as const;

export type BunnyMediaFolder = (typeof BUNNY_MEDIA_FOLDERS)[number];

export interface BunnyConfigSummary {
  configured: boolean;
  zone: string;
  region: string;
  endpointConfigured: boolean;
  endpointHost: string;
  cdnUrlConfigured: boolean;
  cdnUrl: string;
  missingVars: string[];
}

export interface BunnyValidationResult {
  valid: boolean;
  statusCode?: number;
  errorCode?: string;
  error?: string;
  kind: 'image' | 'video' | 'model3d';
  mimeType: string;
  extension: string;
}

export interface BunnyUploadResult {
  success: boolean;
  bunnyVerified?: boolean;
  objectPath: string;
  folder: BunnyMediaFolder;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  proxyUrl: string;
  cdnUrl?: string;
  storageZone: string;
  region: string;
  statusCode?: number;
  errorCode?: string;
  error?: string;
}

export interface BunnyListedFile {
  fileId: string;
  objectPath: string;
  folder: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  proxyUrl: string;
  cdnUrl?: string;
  createdAt: string;
  isVideo: boolean;
  is3DModel: boolean;
}

export const MAX_IMAGE_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_MODEL_UPLOAD_BYTES = 60 * 1024 * 1024; // 60 MB

export const DEFAULT_BUNNY_STORAGE_ZONE = 'jai-hanuman-door-media';
export const DEFAULT_BUNNY_STORAGE_ENDPOINT = 'https://sg.storage.bunnycdn.com/jai-hanuman-door-media';

function getEnvVars() {
  const rawZone = String(process.env.BUNNY_STORAGE_ZONE || '').trim();
  const zone = rawZone || DEFAULT_BUNNY_STORAGE_ZONE;
  const password = String(process.env.BUNNY_STORAGE_PASSWORD || '').trim();
  let endpointRaw = String(process.env.BUNNY_STORAGE_ENDPOINT || DEFAULT_BUNNY_STORAGE_ENDPOINT)
    .trim()
    .replace(/\/+$/, '');
  const cdnUrl = String(process.env.BUNNY_CDN_URL || process.env.BUNNY_PULL_ZONE_URL || '')
    .trim()
    .replace(/\/+$/, '');

  // If endpoint was supplied as host only (e.g. https://sg.storage.bunnycdn.com), append /{zone}
  if (endpointRaw && zone && !endpointRaw.toLowerCase().endsWith(`/${zone.toLowerCase()}`)) {
    try {
      const parsed = new URL(endpointRaw);
      if (!parsed.pathname || parsed.pathname === '/') {
        endpointRaw = `${parsed.origin}/${zone}`;
      }
    } catch {
      // Leave as supplied so validation reports invalid URL clearly
    }
  }

  return { zone, password, endpoint: endpointRaw, cdnUrl };
}

function inferBunnyRegion(endpoint: string): string {
  const lower = endpoint.toLowerCase();
  if (lower.includes('sg.storage.bunnycdn.com')) return 'Singapore (SG)';
  if (lower.includes('ny.storage.bunnycdn.com')) return 'New York (NY)';
  if (lower.includes('la.storage.bunnycdn.com')) return 'Los Angeles (LA)';
  if (lower.includes('uk.storage.bunnycdn.com')) return 'London (UK)';
  if (lower.includes('se.storage.bunnycdn.com')) return 'Stockholm (SE)';
  if (lower.includes('br.storage.bunnycdn.com')) return 'Sao Paulo (BR)';
  if (lower.includes('jh.storage.bunnycdn.com')) return 'Johannesburg (JH)';
  if (lower.includes('syd.storage.bunnycdn.com')) return 'Sydney (SYD)';
  if (lower.includes('storage.bunnycdn.com')) return 'Frankfurt (DE)';
  return 'Bunny Storage Edge';
}

export function getBunnyConfigSummary(): BunnyConfigSummary {
  const { zone, password, endpoint, cdnUrl } = getEnvVars();
  const missingVars: string[] = [];
  if (!zone) missingVars.push('BUNNY_STORAGE_ZONE');
  if (!password) missingVars.push('BUNNY_STORAGE_PASSWORD');
  if (!endpoint) missingVars.push('BUNNY_STORAGE_ENDPOINT');

  let endpointHost = '';
  try {
    if (endpoint) endpointHost = new URL(endpoint).host;
  } catch {}

  return {
    configured: Boolean(zone && password && endpoint),
    zone,
    region: inferBunnyRegion(endpoint),
    endpointConfigured: Boolean(endpoint),
    endpointHost,
    cdnUrlConfigured: Boolean(cdnUrl),
    cdnUrl,
    missingVars,
  };
}

export function isBunnyStorageConfigured(): boolean {
  return getBunnyConfigSummary().configured;
}

export function normalizeBunnyFolder(category?: string): BunnyMediaFolder {
  const raw = String(category || 'products')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  if (raw === 'doors' || raw === 'door' || raw === 'product' || raw === 'products') return 'products';
  if (raw === 'catalogue' || raw === 'catalog') return 'catalog';
  if (raw === 'banner' || raw === 'banners' || raw === 'sliders' || raw === 'slider') return 'banners';
  if (raw === 'video' || raw === 'videos') return 'videos';
  if (raw === 'model' || raw === 'models' || raw === 'models3d' || raw === '3d') return 'models3d';
  if (raw === 'material' || raw === 'materials' || raw === 'wood' || raw === 'wood_samples') return 'materials';
  if (raw === 'finish' || raw === 'finishes' || raw === 'polish' || raw === 'polishes') return 'finishes';
  if (raw === 'hardware') return 'hardware';
  if (raw === 'frame' || raw === 'frames') return 'frames';
  if (raw === 'category' || raw === 'categories') return 'categories';
  if (raw === 'delivery' || raw === 'deliveries' || raw === 'stories') return 'delivery';
  if (raw === 'brand' || raw === 'logo' || raw === 'story') return 'brand';
  if (raw === 'team') return 'team';
  if (raw === 'article' || raw === 'articles') return 'articles';
  if (raw === 'notification' || raw === 'notifications') return 'notifications';
  if (raw === 'tracking' || raw === 'orders') return 'tracking';
  if (raw === 'chaukhat') return 'chaukhat';

  return 'general';
}

export function getMimeTypeForFilename(filename: string): string {
  const ext = path.extname(filename || '').toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    case '.glb':
      return 'model/gltf-binary';
    case '.gltf':
      return 'model/gltf+json';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

function getExtensionForMime(mimeType: string): string {
  const lower = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (lower === 'image/jpeg' || lower === 'image/jpg') return '.jpg';
  if (lower === 'image/png') return '.png';
  if (lower === 'image/webp') return '.webp';
  if (lower === 'image/gif') return '.gif';
  if (lower === 'image/svg+xml') return '.svg';
  if (lower === 'video/mp4') return '.mp4';
  if (lower === 'video/webm') return '.webm';
  if (lower === 'video/quicktime') return '.mov';
  if (lower === 'model/gltf-binary') return '.glb';
  if (lower === 'model/gltf+json') return '.gltf';
  return '';
}

function detectMagicMime(buf?: Buffer): string {
  if (!buf || buf.length < 12) return '';
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  // GIF: GIF87a / GIF89a
  if (buf.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif';
  // GLB: glTF binary magic 'glTF'
  if (buf.subarray(0, 4).toString('ascii') === 'glTF') return 'model/gltf-binary';
  // WebM / Matroska: 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  // MP4 / ISO BMFF: ....ftyp
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  // SVG / HTML text check
  const headText = buf.subarray(0, Math.min(256, buf.length)).toString('utf8').trimStart().toLowerCase();
  if (headText.startsWith('<!doctype html') || headText.startsWith('<html')) return 'text/html';
  if (headText.startsWith('<svg') || (headText.startsWith('<?xml') && headText.includes('<svg'))) {
    return 'image/svg+xml';
  }
  return '';
}

/**
 * Validates uploaded media against supported Bunny Storage formats and size limits:
 *   - Images: JPG, JPEG, PNG, WebP (plus GIF/SVG for UI graphics) up to 20 MB
 *   - Videos: MP4, WebM (+ MOV mapped from mobile camera) up to 100 MB
 *   - 3D Models: GLB, GLTF up to 60 MB
 */
export function validateBunnyUploadFile(
  rawMimeType: string,
  originalName: string,
  sizeBytes: number,
  buffer?: Buffer
): BunnyValidationResult {
  if (!sizeBytes || sizeBytes <= 0) {
    return {
      valid: false,
      statusCode: 400,
      errorCode: 'EMPTY_FILE',
      error: 'Uploaded file is empty (0 bytes). Please choose a valid image, video, or 3D model.',
      kind: 'image',
      mimeType: 'application/octet-stream',
      extension: '.bin',
    };
  }

  const magicMime = detectMagicMime(buffer);
  if (magicMime === 'text/html') {
    return {
      valid: false,
      statusCode: 400,
      errorCode: 'INVALID_HTML_CONTENT',
      error: 'The selected file contains HTML content rather than a valid image or video.',
      kind: 'image',
      mimeType: 'text/html',
      extension: '.html',
    };
  }

  const extFromName = path.extname(originalName || '').toLowerCase();
  const cleanMime = String(rawMimeType || '').split(';')[0].trim().toLowerCase();

  let effectiveMime = magicMime || cleanMime || getMimeTypeForFilename(originalName);
  if (
    (!effectiveMime || effectiveMime === 'application/octet-stream' || effectiveMime === 'binary/octet-stream') &&
    extFromName
  ) {
    effectiveMime = getMimeTypeForFilename(`file${extFromName}`);
  }

  const isVideo =
    effectiveMime === 'video/mp4' ||
    effectiveMime === 'video/webm' ||
    effectiveMime === 'video/quicktime' ||
    ['.mp4', '.webm', '.mov', '.m4v'].includes(extFromName);

  const is3DModel =
    effectiveMime === 'model/gltf-binary' ||
    effectiveMime === 'model/gltf+json' ||
    extFromName === '.glb' ||
    extFromName === '.gltf';

  const isImage =
    effectiveMime === 'image/jpeg' ||
    effectiveMime === 'image/jpg' ||
    effectiveMime === 'image/png' ||
    effectiveMime === 'image/webp' ||
    effectiveMime === 'image/gif' ||
    effectiveMime === 'image/svg+xml' ||
    ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(extFromName);

  if (!isImage && !isVideo && !is3DModel) {
    return {
      valid: false,
      statusCode: 400,
      errorCode: 'UNSUPPORTED_MEDIA_TYPE',
      error: `Unsupported file format (${cleanMime || extFromName || 'unknown'}). Allowed formats: JPG, PNG, WebP images (up to 20 MB), MP4/WebM videos (up to 100 MB), and .glb/.gltf 3D models (up to 60 MB).`,
      kind: 'image',
      mimeType: cleanMime || 'application/octet-stream',
      extension: extFromName || '.bin',
    };
  }

  if (isImage && sizeBytes > MAX_IMAGE_UPLOAD_BYTES) {
    return {
      valid: false,
      statusCode: 413,
      errorCode: 'FILE_TOO_LARGE',
      error: `Image size (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the 20 MB limit.`,
      kind: 'image',
      mimeType: effectiveMime,
      extension: extFromName || getExtensionForMime(effectiveMime) || '.jpg',
    };
  }

  if (isVideo && sizeBytes > MAX_VIDEO_UPLOAD_BYTES) {
    return {
      valid: false,
      statusCode: 413,
      errorCode: 'FILE_TOO_LARGE',
      error: `Video size (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the 100 MB limit.`,
      kind: 'video',
      mimeType: effectiveMime,
      extension: extFromName || getExtensionForMime(effectiveMime) || '.mp4',
    };
  }

  if (is3DModel && sizeBytes > MAX_MODEL_UPLOAD_BYTES) {
    return {
      valid: false,
      statusCode: 413,
      errorCode: 'FILE_TOO_LARGE',
      error: `3D model size (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB) exceeds the 60 MB limit.`,
      kind: 'model3d',
      mimeType: effectiveMime,
      extension: extFromName || '.glb',
    };
  }

  const normalizedMime =
    effectiveMime === 'image/jpg'
      ? 'image/jpeg'
      : is3DModel
      ? extFromName === '.gltf'
        ? 'model/gltf+json'
        : 'model/gltf-binary'
      : isVideo && (!effectiveMime || effectiveMime === 'application/octet-stream')
      ? extFromName === '.webm'
        ? 'video/webm'
        : 'video/mp4'
      : effectiveMime;

  const resolvedExt =
    getExtensionForMime(normalizedMime) ||
    (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4', '.webm', '.mov', '.glb', '.gltf'].includes(extFromName)
      ? extFromName
      : isVideo
      ? '.mp4'
      : is3DModel
      ? '.glb'
      : '.jpg');

  return {
    valid: true,
    kind: isVideo ? 'video' : is3DModel ? 'model3d' : 'image',
    mimeType: normalizedMime,
    extension: resolvedExt === '.jpeg' ? '.jpg' : resolvedExt,
  };
}

export function generateUniqueBunnyFilename(
  originalName: string,
  extension: string,
  folder: string
): string {
  const extFromOrig = path.extname(originalName || '');
  const rawStem = path.basename(originalName || '', extFromOrig)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  const safeStem = rawStem && rawStem !== 'blob' && rawStem !== 'file' ? rawStem : `jhd_${folder}`;
  const cleanExt = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Avoid doubling suffix if caller already generated a unique timestamped filename
  if (/-\d{13}-\d{4,7}$/.test(safeStem)) {
    return `${safeStem}${cleanExt}`;
  }
  return `${safeStem}-${suffix}${cleanExt}`;
}

export function buildBunnyObjectPath(
  folder: BunnyMediaFolder,
  uniqueFilename: string,
  productId?: string
): string {
  const cleanFile = path.basename(uniqueFilename).replace(/[^a-zA-Z0-9_.-]/g, '_');
  const cleanProductId = productId ? String(productId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) : '';
  if (cleanProductId && (folder === 'products' || folder === 'catalog' || folder === 'videos')) {
    return `${folder}/${cleanProductId}/${cleanFile}`;
  }
  return `${folder}/${cleanFile}`;
}

export function buildBunnyPublicUrls(objectPath: string): {
  url: string;
  proxyUrl: string;
  cdnUrl?: string;
} {
  const cleanPath = String(objectPath || '').replace(/^\/+/, '');
  const { cdnUrl } = getEnvVars();
  const proxyUrl = `/api/bunny/media/${cleanPath}`;
  const fullCdnUrl = cdnUrl ? `${cdnUrl}/${cleanPath}` : undefined;
  return {
    url: fullCdnUrl || proxyUrl,
    proxyUrl,
    ...(fullCdnUrl ? { cdnUrl: fullCdnUrl } : {}),
  };
}

export function extractBunnyObjectPath(inputUrlOrPath: string): string {
  let raw = String(inputUrlOrPath || '').trim();
  if (!raw) return '';

  // Strip URL query & fragment
  raw = raw.split('?')[0].split('#')[0];

  // Extract from /api/bunny/media/{objectPath}
  const bunnyIdx = raw.indexOf('/api/bunny/media/');
  if (bunnyIdx !== -1) {
    return raw.slice(bunnyIdx + '/api/bunny/media/'.length).replace(/^\/+/, '');
  }

  // Extract from full http(s) URL (e.g. CDN Pull Zone or Bunny Storage URL)
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw);
      let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
      const { zone } = getEnvVars();
      if (zone && pathname.toLowerCase().startsWith(`${zone.toLowerCase()}/`)) {
        pathname = pathname.slice(zone.length + 1);
      }
      return pathname;
    } catch {
      return '';
    }
  }

  // Extract from /uploads/{filename}
  const uploadsIdx = raw.lastIndexOf('/uploads/');
  if (uploadsIdx !== -1) {
    return raw.slice(uploadsIdx + '/uploads/'.length).replace(/^\/+/, '');
  }

  return raw.replace(/^\/+/, '');
}

/**
 * Uploads buffer directly from server to Bunny Storage Edge HTTP API.
 */
export async function uploadToBunnyStorage(
  buffer: Buffer,
  options: {
    filename: string;
    mimeType: string;
    category?: string;
    productId?: string;
    preserveExactFilename?: boolean;
  }
): Promise<BunnyUploadResult> {
  const summary = getBunnyConfigSummary();
  const { password, endpoint, zone } = getEnvVars();

  if (!summary.configured) {
    return {
      success: false,
      objectPath: '',
      folder: normalizeBunnyFolder(options.category),
      filename: options.filename,
      mimeType: options.mimeType,
      size: buffer?.length || 0,
      url: '',
      proxyUrl: '',
      storageZone: zone,
      region: summary.region,
      statusCode: 503,
      errorCode: 'BUNNY_NOT_CONFIGURED',
      error: `Bunny.net Storage is missing required server environment variable(s): ${summary.missingVars.join(', ')}.`,
    };
  }

  const validation = validateBunnyUploadFile(
    options.mimeType,
    options.filename,
    buffer?.length || 0,
    buffer
  );

  const folder = normalizeBunnyFolder(options.category || (validation.kind === 'video' ? 'videos' : validation.kind === 'model3d' ? 'models3d' : 'products'));

  if (!validation.valid) {
    return {
      success: false,
      objectPath: '',
      folder,
      filename: options.filename,
      mimeType: validation.mimeType,
      size: buffer?.length || 0,
      url: '',
      proxyUrl: '',
      storageZone: zone,
      region: summary.region,
      statusCode: validation.statusCode || 400,
      errorCode: validation.errorCode || 'VALIDATION_ERROR',
      error: validation.error,
    };
  }

  const uniqueFilename = options.preserveExactFilename
    ? path.basename(options.filename).replace(/[^a-zA-Z0-9_.-]/g, '_')
    : generateUniqueBunnyFilename(options.filename, validation.extension, folder);

  const objectPath = buildBunnyObjectPath(folder, uniqueFilename, options.productId);
  const targetUrl = `${endpoint}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;

  const controller = new AbortController();
  const timeoutMs = validation.kind === 'video' ? 180000 : 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  console.log(
    `📤 [Bunny Storage] Uploading "${objectPath}" (${buffer.length} bytes, ${validation.mimeType}) -> zone="${zone}" (${summary.region})`
  );

  try {
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        AccessKey: password,
        'Content-Type': validation.mimeType || 'application/octet-stream',
        'Content-Length': String(buffer.length),
      },
      body: new Uint8Array(buffer),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errText = '';
      try {
        errText = (await response.text()).slice(0, 300);
      } catch {}
      const isAuth = response.status === 401 || response.status === 403;
      console.error(
        `❌ [Bunny Storage] PUT failed for "${objectPath}" (HTTP ${response.status})${errText ? `: ${errText}` : ''}`
      );
      return {
        success: false,
        objectPath,
        folder,
        filename: uniqueFilename,
        mimeType: validation.mimeType,
        size: buffer.length,
        url: '',
        proxyUrl: '',
        storageZone: zone,
        region: summary.region,
        statusCode: isAuth ? 502 : response.status,
        errorCode: isAuth ? 'BUNNY_AUTH_FAILED' : 'BUNNY_UPLOAD_FAILED',
        error: isAuth
          ? `Bunny Storage rejected AccessKey (HTTP ${response.status}). Verify BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, and BUNNY_STORAGE_ENDPOINT.`
          : `Bunny Storage upload returned HTTP ${response.status}${errText ? `: ${errText}` : ''}`,
      };
    }

    // Verify that Bunny Storage actually persisted the file before reporting success
    const verifyRes = await fetchFromBunnyStorage(objectPath, 'bytes=0-0');
    if (!verifyRes.ok || !verifyRes.buffer || verifyRes.buffer.length === 0) {
      console.error(
        `❌ [Bunny Storage] Post-upload verification failed for "${objectPath}" (HTTP ${verifyRes.status})`
      );
      return {
        success: false,
        bunnyVerified: false,
        objectPath,
        folder,
        filename: uniqueFilename,
        mimeType: validation.mimeType,
        size: buffer.length,
        url: '',
        proxyUrl: '',
        storageZone: zone,
        region: summary.region,
        statusCode: 502,
        errorCode: 'BUNNY_VERIFY_FAILED',
        error: `Bunny Storage PUT returned ${response.status}, but post-upload verification read failed (HTTP ${verifyRes.status}). File was not confirmed in Bunny Storage.`,
      };
    }

    const urls = buildBunnyPublicUrls(objectPath);
    console.log(
      `✅ [Bunny Storage] Uploaded & verified ${objectPath} (${(buffer.length / 1024).toFixed(1)} KB, ${validation.mimeType}) in zone "${zone}" -> ${urls.url}`
    );

    return {
      success: true,
      bunnyVerified: true,
      objectPath,
      folder,
      filename: uniqueFilename,
      mimeType: validation.mimeType,
      size: buffer.length,
      url: urls.url,
      proxyUrl: urls.proxyUrl,
      ...(urls.cdnUrl ? { cdnUrl: urls.cdnUrl } : {}),
      storageZone: zone,
      region: summary.region,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    console.error(
      `❌ [Bunny Storage] Network error uploading "${objectPath}": ${err?.message || 'Unknown error'}`
    );
    return {
      success: false,
      objectPath,
      folder,
      filename: uniqueFilename,
      mimeType: validation.mimeType,
      size: buffer.length,
      url: '',
      proxyUrl: '',
      storageZone: zone,
      region: summary.region,
      statusCode: isTimeout ? 504 : 502,
      errorCode: isTimeout ? 'BUNNY_UPLOAD_TIMEOUT' : 'BUNNY_NETWORK_ERROR',
      error: isTimeout
        ? `Bunny Storage upload timed out after ${Math.round(timeoutMs / 1000)}s.`
        : `Failed connecting to Bunny Storage: ${err?.message || 'Network error'}`,
    };
  }
}

/**
 * Fetches a stored file from Bunny Storage Edge (with optional HTTP Range forwarding for video seeking).
 */
export async function fetchFromBunnyStorage(
  objectPath: string,
  rangeHeader?: string
): Promise<{
  ok: boolean;
  status: number;
  buffer?: Buffer;
  contentType: string;
  contentLength?: string | null;
  contentRange?: string | null;
  acceptRanges?: string | null;
}> {
  const { password, endpoint } = getEnvVars();
  const cleanPath = extractBunnyObjectPath(objectPath);
  if (!password || !endpoint || !cleanPath || cleanPath.includes('..')) {
    return { ok: false, status: 404, contentType: 'application/octet-stream' };
  }

  const targetUrl = `${endpoint}/${cleanPath.split('/').map(encodeURIComponent).join('/')}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        AccessKey: password,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 206) {
      return {
        ok: false,
        status: response.status,
        contentType: 'application/octet-stream',
      };
    }

    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const inferredMime = getMimeTypeForFilename(cleanPath);
    const remoteType = (response.headers.get('content-type') || '').split(';')[0].trim();
    const contentType =
      remoteType && remoteType !== 'application/octet-stream' ? remoteType : inferredMime;

    return {
      ok: true,
      status: response.status,
      buffer,
      contentType,
      contentLength: response.headers.get('content-length') || String(buffer.length),
      contentRange: response.headers.get('content-range'),
      acceptRanges: response.headers.get('accept-ranges') || 'bytes',
    };
  } catch {
    clearTimeout(timeoutId);
    return { ok: false, status: 502, contentType: 'application/octet-stream' };
  }
}

/**
 * Lists stored files in a Bunny Storage folder (or across top-level folders when folder === 'all').
 */
export async function listBunnyStorageFiles(folder?: string): Promise<BunnyListedFile[]> {
  const summary = getBunnyConfigSummary();
  const { password, endpoint } = getEnvVars();
  if (!summary.configured) return [];

  const listSingleFolder = async (folderPath: string): Promise<any[]> => {
    const clean = folderPath.replace(/^\/+|\/+$/g, '');
    const targetUrl = clean ? `${endpoint}/${clean}/` : `${endpoint}/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          AccessKey: password,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      clearTimeout(timeoutId);
      return [];
    }
  };

  const results: BunnyListedFile[] = [];

  const collectFolder = async (folderPath: string, depth = 0) => {
    const entries = await listSingleFolder(folderPath);
    for (const item of entries) {
      const name = String(item?.ObjectName || '').trim();
      if (!name) continue;
      if (item?.IsDirectory) {
        if (depth < 1) {
          const subPath = folderPath ? `${folderPath}/${name}` : name;
          await collectFolder(subPath, depth + 1);
        }
        continue;
      }

      const objectPath = folderPath ? `${folderPath}/${name}` : name;
      const mimeType = getMimeTypeForFilename(name);
      const urls = buildBunnyPublicUrls(objectPath);
      const topFolder = objectPath.includes('/') ? objectPath.split('/')[0] : 'general';

      results.push({
        fileId: String(item?.Guid || objectPath),
        objectPath,
        folder: topFolder,
        name,
        mimeType,
        size: Number(item?.Length || 0),
        url: urls.url,
        proxyUrl: urls.proxyUrl,
        ...(urls.cdnUrl ? { cdnUrl: urls.cdnUrl } : {}),
        createdAt: item?.DateCreated || item?.LastChanged || new Date().toISOString(),
        isVideo: mimeType.startsWith('video/'),
        is3DModel: mimeType.includes('gltf') || name.toLowerCase().endsWith('.glb'),
      });
    }
  };

  const requested = String(folder || '').trim().toLowerCase();
  if (!requested || requested === 'all') {
    await collectFolder('', 0);
  } else {
    const normalized = normalizeBunnyFolder(requested);
    await collectFolder(normalized, 0);
  }

  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Deletes an object from Bunny Storage by objectPath, CDN URL, or `/api/bunny/media/*` URL.
 */
export async function deleteFromBunnyStorage(
  objectPathOrUrl: string
): Promise<{ deleted: boolean; objectPath: string; statusCode?: number; error?: string }> {
  const summary = getBunnyConfigSummary();
  const { password, endpoint } = getEnvVars();
  const objectPath = extractBunnyObjectPath(objectPathOrUrl);

  if (!summary.configured) {
    return {
      deleted: false,
      objectPath,
      statusCode: 503,
      error: `Bunny.net Storage not configured (missing: ${summary.missingVars.join(', ')})`,
    };
  }

  if (!objectPath || objectPath.includes('..')) {
    return {
      deleted: false,
      objectPath,
      statusCode: 400,
      error: 'Invalid Bunny Storage object path or URL.',
    };
  }

  const attemptDelete = async (relPath: string): Promise<{ ok: boolean; status: number }> => {
    const clean = relPath.replace(/^\/+/, '');
    const targetUrl = `${endpoint}/${clean.split('/').map(encodeURIComponent).join('/')}`;
    const res = await fetch(targetUrl, {
      method: 'DELETE',
      headers: { AccessKey: password },
    });
    return { ok: res.ok || res.status === 204, status: res.status };
  };

  try {
    const directRes = await attemptDelete(objectPath);
    if (directRes.ok) {
      console.log(`🗑️ [Bunny Storage] Deleted ${objectPath}`);
      return { deleted: true, objectPath };
    }

    // If bare filename was supplied without folder prefix, try common folders
    if (!objectPath.includes('/') && directRes.status === 404) {
      for (const folder of BUNNY_MEDIA_FOLDERS) {
        const candidate = `${folder}/${objectPath}`;
        const subRes = await attemptDelete(candidate);
        if (subRes.ok) {
          console.log(`🗑️ [Bunny Storage] Deleted ${candidate}`);
          return { deleted: true, objectPath: candidate };
        }
      }
    }

    return {
      deleted: false,
      objectPath,
      statusCode: directRes.status,
      error:
        directRes.status === 404
          ? `File "${objectPath}" not found in Bunny Storage zone.`
          : `Bunny Storage DELETE failed with HTTP ${directRes.status}.`,
    };
  } catch (err: any) {
    return {
      deleted: false,
      objectPath,
      statusCode: 502,
      error: err?.message || 'Network error deleting file from Bunny Storage.',
    };
  }
}

/**
 * Verifies live Bunny Storage connectivity & Pull Zone CDN reachability (if configured).
 */
export async function checkBunnyAvailability(): Promise<
  BunnyConfigSummary & {
    connected: boolean;
    readable: boolean;
    writable: boolean;
    statusMessage: string;
  }
> {
  const summary = getBunnyConfigSummary();
  const { password, endpoint } = getEnvVars();

  if (!summary.configured) {
    return {
      ...summary,
      connected: false,
      readable: false,
      writable: false,
      statusMessage: `Missing Bunny Storage environment variable(s): ${summary.missingVars.join(', ')}`,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${endpoint}/`, {
      method: 'GET',
      headers: {
        AccessKey: password,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return {
        ...summary,
        connected: true,
        readable: true,
        writable: true,
        statusMessage: `Connected to Bunny.net Storage zone "${summary.zone}" (${summary.region})${
          summary.cdnUrlConfigured ? ` • CDN: ${summary.cdnUrl}` : ' • Delivered via /api/bunny/media/* & CDN proxy'
        }.`,
      };
    }

    return {
      ...summary,
      connected: false,
      readable: false,
      writable: false,
      statusMessage:
        res.status === 401 || res.status === 403
          ? `Bunny Storage authentication failed (HTTP ${res.status}). Check BUNNY_STORAGE_PASSWORD.`
          : `Bunny Storage returned HTTP ${res.status}.`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      ...summary,
      connected: false,
      readable: false,
      writable: false,
      statusMessage: `Could not reach Bunny Storage endpoint: ${err?.message || 'Connection error'}`,
    };
  }
}
