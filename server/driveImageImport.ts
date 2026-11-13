import dns from 'dns';
import net from 'net';
import {
  getDriveFileMetadataWithOAuth,
  downloadDriveFileWithOAuth,
  hasServerDriveOAuthCredentials,
} from './googleDriveStorage.ts';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export class DriveImportError extends Error {
  statusCode: number;
  errorCode: string;
  fileId?: string | null;

  constructor(message: string, errorCode = 'DRIVE_IMPORT_FAILED', statusCode = 422, fileId?: string | null) {
    super(message);
    this.name = 'DriveImportError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.fileId = fileId;
  }
}

export interface ValidatedImageBuffer {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  size: number;
  width: number;
  height: number;
  fileId?: string;
  sourceUrl: string;
}

export interface ValidatedMediaBuffer {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  originalName?: string;
  isVideo?: boolean;
  is3DModel?: boolean;
  isDriveEmbed?: boolean;
  embedUrl?: string;
  fileId?: string;
  sourceUrl: string;
  previewDataUrl?: string;
  previewPosterUrl?: string;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB max for images
const MAX_MEDIA_BYTES = 55 * 1024 * 1024; // 55 MB max for videos and 3D models
const MIN_MEDIA_BYTES = 16;
const FETCH_TIMEOUT_MS = 25000;
const MAX_REDIRECTS = 6;

/**
 * Checks if an IP address is private, loopback, link-local, or reserved (SSRF protection).
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const cleanIp = ip.trim().toLowerCase();
  if (!cleanIp) return true;

  if (cleanIp === 'localhost' || cleanIp === '::1' || cleanIp === '0.0.0.0') {
    return true;
  }

  // IPv6 checks
  if (net.isIPv6(cleanIp)) {
    if (
      cleanIp === '::1' ||
      cleanIp === '::' ||
      cleanIp.startsWith('fe80:') || // link-local
      cleanIp.startsWith('fc') || // unique local
      cleanIp.startsWith('fd') || // unique local
      cleanIp.startsWith('::ffff:127.') ||
      cleanIp.startsWith('::ffff:10.') ||
      cleanIp.startsWith('::ffff:192.168.') ||
      cleanIp.startsWith('::ffff:169.254.')
    ) {
      return true;
    }
    return false;
  }

  // IPv4 checks
  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // Cloud metadata / link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // Multicast / reserved
    return false;
  }

  return true;
}

/**
 * Validates that a URL is safe to fetch (HTTPS/HTTP public hostname, no private IPs or internal hosts).
 */
export async function validateSafeRemoteUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL format. Please enter a valid Google Drive link or https:// image URL.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTPS or HTTP image URLs are supported.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs containing embedded credentials are not allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost') ||
    hostname === 'metadata.google.internal'
  ) {
    throw new Error('Access to local or internal network hosts is forbidden.');
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error('Access to private or reserved IP addresses is forbidden.');
    }
    return parsed;
  }

  // Resolve DNS to prevent DNS rebinding / private IP resolution
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`Could not resolve hostname "${hostname}".`);
    }
    for (const addr of addresses) {
      if (isPrivateOrReservedIp(addr.address)) {
        throw new Error('Hostname resolves to a restricted private network address.');
      }
    }
  } catch (err: any) {
    if (err.message?.includes('restricted') || err.message?.includes('forbidden')) {
      throw err;
    }
    throw new Error(`Unable to resolve host "${hostname}": ${err.message || 'DNS lookup failed'}`);
  }

  return parsed;
}

/**
 * Extracts Google Drive File ID from common Google Drive sharing URLs.
 * Supports:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID&export=download
 * - https://drive.usercontent.google.com/download?id=FILE_ID
 * - https://lh3.googleusercontent.com/d/FILE_ID
 */
export function isGoogleDriveFolderUrl(inputUrl: string): boolean {
  const trimmed = String(inputUrl || '').trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'drive.google.com') return false;
    return /\/drive\/(?:u\/\d+\/)?folders\/[a-zA-Z0-9_-]{8,120}/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function extractGoogleDriveFileId(inputUrl: string): string | null {
  const trimmed = String(inputUrl || '').trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const isDriveHost =
    host === 'drive.google.com' ||
    host === 'docs.google.com' ||
    host === 'drive.usercontent.google.com' ||
    host.endsWith('.googleusercontent.com');

  if (!isDriveHost) {
    return null;
  }

  if (isGoogleDriveFolderUrl(trimmed)) {
    return null;
  }

  // Pattern 1: /file/d/{fileId} or /d/{fileId}
  const pathMatch = parsed.pathname.match(/\/(?:file\/)?d\/([a-zA-Z0-9_-]{10,120})(?:\/|$|=)/);
  if (pathMatch && pathMatch[1]) {
    return pathMatch[1];
  }

  // Pattern 2: ?id={fileId}
  const idParam = parsed.searchParams.get('id');
  if (idParam && /^[a-zA-Z0-9_-]{10,120}$/.test(idParam.trim())) {
    return idParam.trim();
  }

  return null;
}

/**
 * Detects media format (images, videos, 3D models) & dimensions from binary magic bytes.
 * Rejects HTML pages, text files, scripts, or corrupted buffers.
 */
export function inspectMediaBuffer(
  buf: Buffer,
  expectedType: 'image' | 'video' | 'model3d' | 'any' = 'any'
): {
  valid: boolean;
  mimeType?: string;
  extension?: string;
  width?: number;
  height?: number;
  isVideo?: boolean;
  is3DModel?: boolean;
  isHtml?: boolean;
  error?: string;
} {
  if (!Buffer.isBuffer(buf) || buf.length < MIN_MEDIA_BYTES) {
    return { valid: false, error: 'Downloaded file is empty or too small to be valid media.' };
  }

  // Check if response is an HTML page (e.g. Google Drive sign-in / permission denied / preview page)
  const headAscii = buf.subarray(0, Math.min(1024, buf.length)).toString('utf8').trimStart().toLowerCase();
  if (
    headAscii.startsWith('<!doctype html') ||
    headAscii.startsWith('<html') ||
    headAscii.startsWith('<head') ||
    headAscii.startsWith('<script') ||
    headAscii.includes('accounts.google.com') ||
    headAscii.includes('google drive - quota exceeded') ||
    headAscii.includes('sign in to continue') ||
    headAscii.includes('access denied')
  ) {
    return {
      valid: false,
      isHtml: true,
      error:
        'Google Drive returned an HTML sign-in/preview page instead of direct file bytes. Please set sharing in Google Drive to "Anyone with the link can view", or use "Upload From Device".',
    };
  }

  // 1. PNG image: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    if (expectedType === 'video') {
      return { valid: false, error: 'File is a PNG image, but a video file was expected.' };
    }
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width > 0 && height > 0 && width <= 20000 && height <= 20000) {
      return { valid: true, mimeType: 'image/png', extension: '.png', width, height };
    }
    return { valid: false, error: 'Invalid PNG image dimensions.' };
  }

  // 2. JPEG image: FF D8 FF
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    if (expectedType === 'video') {
      return { valid: false, error: 'File is a JPEG photo, but a video file was expected.' };
    }
    let offset = 2;
    while (offset + 4 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      if (marker === 0xff) {
        offset++;
        continue;
      }
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        if (offset + 9 <= buf.length) {
          const height = buf.readUInt16BE(offset + 5);
          const width = buf.readUInt16BE(offset + 7);
          if (width > 0 && height > 0 && width <= 20000 && height <= 20000) {
            return { valid: true, mimeType: 'image/jpeg', extension: '.jpg', width, height };
          }
        }
        break;
      }
      if (marker === 0xd9 || marker === 0xda) break;
      const segmentLength = buf.readUInt16BE(offset + 2);
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
    return { valid: true, mimeType: 'image/jpeg', extension: '.jpg', width: 1200, height: 1600 };
  }

  // 3. WebP: "RIFF" .... "WEBP"
  if (
    buf.length >= 30 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    if (expectedType === 'video') {
      return { valid: false, error: 'File is a WebP image, but a video file was expected.' };
    }
    const chunkHeader = buf.toString('ascii', 12, 16);
    let width = 0;
    let height = 0;
    if (chunkHeader === 'VP8 ' && buf.length >= 30) {
      width = buf.readUInt16LE(26) & 0x3fff;
      height = buf.readUInt16LE(28) & 0x3fff;
    } else if (chunkHeader === 'VP8L' && buf.length >= 25) {
      const b0 = buf[21];
      const b1 = buf[22];
      const b2 = buf[23];
      const b3 = buf[24];
      width = 1 + (((b1 & 0x3f) << 8) | b0);
      height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    } else if (chunkHeader === 'VP8X' && buf.length >= 30) {
      width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    }
    return {
      valid: true,
      mimeType: 'image/webp',
      extension: '.webp',
      width: width || 1200,
      height: height || 1600,
    };
  }

  // 4. GIF: "GIF87a" or "GIF89a"
  if (
    buf.length >= 10 &&
    buf.toString('ascii', 0, 3) === 'GIF' &&
    (buf.toString('ascii', 3, 6) === '87a' || buf.toString('ascii', 3, 6) === '89a')
  ) {
    const width = buf.readUInt16LE(6);
    const height = buf.readUInt16LE(8);
    return { valid: true, mimeType: 'image/gif', extension: '.gif', width, height };
  }

  // 5. ISOBMFF ftyp container (distinguish AVIF images, QuickTime MOV, and MP4 videos!)
  if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const majorBrand = buf.subarray(8, 12).toString('ascii').toLowerCase();
    const compatWindow = buf.subarray(8, Math.min(64, buf.length)).toString('ascii').toLowerCase();
    if (majorBrand === 'avif' || majorBrand === 'avis' || compatWindow.includes('avif')) {
      if (expectedType === 'video') {
        return { valid: false, error: 'File is an AVIF image, but a video file was expected.' };
      }
      return {
        valid: true,
        mimeType: 'image/avif',
        extension: '.avif',
        width: 1200,
        height: 1600,
      };
    }
    if (majorBrand === 'qt  ') {
      if (expectedType === 'image') {
        return { valid: false, error: 'File is a QuickTime MOV video, but an image file was expected.' };
      }
      return {
        valid: true,
        isVideo: true,
        mimeType: 'video/quicktime',
        extension: '.mov',
        width: 1920,
        height: 1080,
      };
    }
    if (expectedType === 'image') {
      return { valid: false, error: 'File is an MP4 video, but an image file was expected.' };
    }
    return {
      valid: true,
      isVideo: true,
      mimeType: 'video/mp4',
      extension: '.mp4',
      width: 1920,
      height: 1080,
    };
  }

  // 6. WebM Video: 0x1A 0x45 0xDF 0xA3 (EBML Header)
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    if (expectedType === 'image') {
      return { valid: false, error: 'File is a WebM video, but an image file was expected.' };
    }
    return {
      valid: true,
      isVideo: true,
      mimeType: 'video/webm',
      extension: '.webm',
      width: 1920,
      height: 1080,
    };
  }

  // 7. QuickTime MOV Video: moov / free / wide box
  if (
    buf.length >= 8 &&
    (buf.subarray(4, 8).toString('ascii') === 'moov' ||
      buf.subarray(4, 8).toString('ascii') === 'free' ||
      buf.subarray(4, 8).toString('ascii') === 'wide')
  ) {
    if (expectedType === 'image') {
      return { valid: false, error: 'File is a QuickTime MOV video, but an image file was expected.' };
    }
    return {
      valid: true,
      isVideo: true,
      mimeType: 'video/quicktime',
      extension: '.mov',
      width: 1920,
      height: 1080,
    };
  }

  // 8. 3D Model GLB (Binary glTF): magic 0x46546C67 ("glTF")
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'glTF') {
    return {
      valid: true,
      is3DModel: true,
      mimeType: 'model/gltf-binary',
      extension: '.glb',
    };
  }

  // 9. 3D Model GLTF (JSON): starts with { and contains "asset"
  if (headAscii.startsWith('{') && (headAscii.includes('"asset"') || headAscii.includes('"scene"'))) {
    return {
      valid: true,
      is3DModel: true,
      mimeType: 'model/gltf+json',
      extension: '.gltf',
    };
  }

  return {
    valid: false,
    error: `Unsupported media format. Expected ${expectedType === 'video' ? 'MP4 or WebM video' : expectedType === 'image' ? 'JPEG, PNG, WebP or GIF image' : 'supported image, video (MP4/WebM), or 3D model (.glb)'}.`,
  };
}

/**
 * Detects image format & dimensions from binary magic bytes (backward compatibility).
 */
export function inspectImageBuffer(buf: Buffer): {
  valid: boolean;
  mimeType?: string;
  extension?: string;
  width?: number;
  height?: number;
  isHtml?: boolean;
  error?: string;
} {
  return inspectMediaBuffer(buf, 'image');
}

/**
 * Safely downloads a URL with redirect validation, timeout, and byte size limit.
 */
async function fetchBufferSafely(
  targetUrl: string,
  maxBytes: number = MAX_IMAGE_BYTES
): Promise<{ buffer: Buffer; contentType: string; status: number }> {
  let currentUrl = targetUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const validatedUrl = await validateSafeRemoteUrl(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(validatedUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/png,image/jpeg,image/apng,image/*,video/mp4,video/webm,*/*;q=0.8',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Redirect response (${response.status}) missing Location header.`);
        }
        currentUrl = new URL(location, validatedUrl).toString();
        continue;
      }

      if (!response.ok) {
        return {
          buffer: Buffer.alloc(0),
          contentType: response.headers.get('content-type') || '',
          status: response.status,
        };
      }

      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const declaredSize = Number(contentLengthHeader);
        if (!isNaN(declaredSize) && declaredSize > maxBytes) {
          throw new Error(`File size (${(declaredSize / (1024 * 1024)).toFixed(1)} MB) exceeds the ${(maxBytes / (1024 * 1024)).toFixed(0)} MB limit.`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const arrayBuf = await response.arrayBuffer();
        if (arrayBuf.byteLength > maxBytes) {
          throw new Error(`File size exceeds the ${(maxBytes / (1024 * 1024)).toFixed(0)} MB limit.`);
        }
        return {
          buffer: Buffer.from(arrayBuf),
          contentType: response.headers.get('content-type') || '',
          status: response.status,
        };
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel();
            throw new Error(`File size exceeds the ${(maxBytes / (1024 * 1024)).toFixed(0)} MB maximum limit.`);
          }
          chunks.push(Buffer.from(value));
        }
      }

      return {
        buffer: Buffer.concat(chunks),
        contentType: response.headers.get('content-type') || '',
        status: response.status,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Too many redirects while fetching remote URL.');
}

function extractDriveConfirmationUrl(html: string, fileId: string): string | null {
  if (!html) return null;
  const hasDownloadForm =
    html.includes('drive.usercontent.google.com/download') ||
    html.includes('id="download-form"') ||
    html.includes('export=download');
  if (!hasDownloadForm) {
    return null;
  }

  const actionMatch = html.match(/<form[^>]+action="([^"]+)"/i);
  const baseAction =
    actionMatch?.[1] && actionMatch[1].startsWith('https://')
      ? actionMatch[1].replace(/&amp;/g, '&')
      : 'https://drive.usercontent.google.com/download';

  const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i) || html.match(/[?&]uuid=([^&"'\s]+)/i);
  const confirmMatch = html.match(/name="confirm"\s+value="([^"]+)"/i) || html.match(/[?&]confirm=([^&"'\s]+)/i);
  const atMatch = html.match(/name="at"\s+value="([^"]+)"/i);

  const confirmVal = confirmMatch?.[1] || 't';
  const uuidVal = uuidMatch?.[1] || '';

  try {
    const targetUrl = new URL(baseAction);
    targetUrl.searchParams.set('id', fileId);
    targetUrl.searchParams.set('export', 'download');
    targetUrl.searchParams.set('confirm', confirmVal);
    if (uuidVal) targetUrl.searchParams.set('uuid', uuidVal);
    if (atMatch?.[1]) targetUrl.searchParams.set('at', atMatch[1]);
    return targetUrl.toString();
  } catch {
    const params = new URLSearchParams({
      id: fileId,
      export: 'download',
      confirm: confirmVal,
    });
    if (uuidVal) params.set('uuid', uuidVal);
    return `https://drive.usercontent.google.com/download?${params.toString()}`;
  }
}

/**
 * Verifies whether a Google Drive /preview embed page is publicly playable as a video
 * without a Google sign-in wall or access-denied error.
 */
async function verifyDriveVideoEmbedPage(fileId: string): Promise<{
  accessible: boolean;
  isVideo: boolean;
  isPrivate?: boolean;
  isNotFound?: boolean;
  reason?: string;
}> {
  const previewUrl = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(previewUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        accessible: false,
        isVideo: false,
        isPrivate: true,
        reason: 'This Google Drive file is private or requires permission.',
      };
    }
    if (res.status === 404) {
      return {
        accessible: false,
        isVideo: false,
        isNotFound: true,
        reason: 'Google Drive file not found (HTTP 404).',
      };
    }

    const finalUrl = (res.url || '').toLowerCase();
    const html = (await res.text()).slice(0, 120000);
    const lowerHtml = html.toLowerCase();

    if (
      finalUrl.includes('accounts.google.com') ||
      lowerHtml.includes('you need access') ||
      lowerHtml.includes('request access') ||
      lowerHtml.includes('sign in to continue')
    ) {
      return {
        accessible: false,
        isVideo: false,
        isPrivate: true,
        reason: 'Google Drive file is private. Set sharing to "Anyone with the link can view" or connect Google Drive in Admin.',
      };
    }

    if (lowerHtml.includes('file you have requested does not exist') || lowerHtml.includes('sorry, unable to open')) {
      return {
        accessible: false,
        isVideo: false,
        isNotFound: true,
        reason: 'Google Drive file does not exist or has been deleted.',
      };
    }

    const looksLikeVideo =
      lowerHtml.includes('fmt_stream_map') ||
      lowerHtml.includes('video/mp4') ||
      lowerHtml.includes('video/webm') ||
      lowerHtml.includes('video/quicktime') ||
      lowerHtml.includes('"video"') ||
      lowerHtml.includes('drive-viewer-video-player');

    return {
      accessible: res.ok,
      isVideo: looksLikeVideo,
    };
  } catch (err: any) {
    return {
      accessible: false,
      isVideo: false,
      reason: err?.message || 'Unable to verify Google Drive video preview',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isMimeCompatible(mimeType: string, expectedType: 'image' | 'video' | 'model3d' | 'any'): {
  ok: boolean;
  error?: string;
} {
  const lower = (mimeType || '').toLowerCase();
  if (!lower) return { ok: true };

  if (lower === 'application/vnd.google-apps.folder') {
    return {
      ok: false,
      error: 'This link points to a Google Drive folder. Please select an individual image or video file link instead.',
    };
  }
  if (lower.startsWith('application/vnd.google-apps.')) {
    return {
      ok: false,
      error: `Google Workspace document (${lower}) cannot be imported into an image/video slot.`,
    };
  }

  const isImg = lower.startsWith('image/');
  const isVid = lower.startsWith('video/');
  const is3d = lower.includes('gltf') || lower.includes('glb') || lower === 'application/octet-stream';

  if (expectedType === 'image' && !isImg) {
    return { ok: false, error: `Selected Google Drive file is "${lower}", but an image (JPG/PNG/WebP) was expected.` };
  }
  if (expectedType === 'video' && !isVid) {
    return { ok: false, error: `Selected Google Drive file is "${lower}", but a video (MP4/WebM/MOV) was expected.` };
  }
  if (expectedType === 'model3d' && !is3d) {
    return { ok: false, error: `Selected Google Drive file is "${lower}", but a 3D CAD model (.glb/.gltf) was expected.` };
  }
  if (expectedType === 'any' && !isImg && !isVid && !is3d) {
    return { ok: false, error: `Unsupported Google Drive file type "${lower}". Please select an image, video, or 3D model.` };
  }
  return { ok: true };
}

/**
 * Fetches and validates media (image, video, or 3D model) from a Google Drive sharing link or direct HTTPS URL.
 */
export async function fetchAndValidateExternalMedia(
  rawUrl: string,
  expectedType: 'image' | 'video' | 'model3d' | 'any' = 'any'
): Promise<ValidatedMediaBuffer> {
  const cleanInput = String(rawUrl || '').trim();
  if (!cleanInput) {
    throw new DriveImportError(
      'Please paste a Google Drive sharing link or media URL.',
      'EMPTY_URL',
      400,
      null
    );
  }

  if (isGoogleDriveFolderUrl(cleanInput)) {
    throw new DriveImportError(
      'This link points to a Google Drive folder. Folder links cannot be imported into single-file upload fields — please open the folder and copy the link of an individual image or video file.',
      'DRIVE_FOLDER_NOT_SUPPORTED',
      422,
      null
    );
  }

  const fileId = extractGoogleDriveFileId(cleanInput);

  try {
    await validateSafeRemoteUrl(cleanInput);
  } catch (urlErr: any) {
    const msg = urlErr?.message || 'Invalid or restricted URL.';
    const isSsrf = msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('restricted');
    throw new DriveImportError(
      msg,
      isSsrf ? 'SSRF_BLOCKED' : 'INVALID_URL',
      422,
      fileId
    );
  }

  const maxBytes = expectedType === 'image' ? MAX_IMAGE_BYTES : MAX_MEDIA_BYTES;

  if (fileId) {
    let originalName: string | undefined;
    let oauthMetaWidth: number | undefined;
    let oauthMetaHeight: number | undefined;
    let oauthDurationSec: number | undefined;
    let oauthMimeType: string | undefined;
    let oauthDeclaredSize: number | undefined;
    let oauthThumbnailLink: string | undefined;

    // Step A: Try existing authorized backend Google Drive OAuth connection first (supports private & shared Drive files)
    if (hasServerDriveOAuthCredentials()) {
      const metaCheck = await getDriveFileMetadataWithOAuth(fileId);
      if (metaCheck.found && metaCheck.metadata) {
        const meta = metaCheck.metadata;
        originalName = meta.name;
        oauthMimeType = meta.mimeType;
        oauthDeclaredSize = meta.size;
        oauthMetaWidth = meta.width;
        oauthMetaHeight = meta.height;
        oauthDurationSec = meta.durationMillis ? Math.round(meta.durationMillis / 1000) : undefined;
        oauthThumbnailLink = meta.thumbnailLink;

        const compat = isMimeCompatible(meta.mimeType || '', expectedType);
        if (!compat.ok) {
          throw new DriveImportError(
            compat.error || 'Unsupported Google Drive file type.',
            meta.mimeType === 'application/vnd.google-apps.folder' ? 'DRIVE_FOLDER_NOT_SUPPORTED' : 'UNSUPPORTED_FILE_TYPE',
            422,
            fileId
          );
        }

        const isVideoMeta = Boolean(meta.mimeType?.startsWith('video/'));
        if (meta.size && meta.size > maxBytes) {
          if (isVideoMeta) {
            const embedUrl = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
            return {
              buffer: Buffer.alloc(0),
              mimeType: meta.mimeType || 'video/mp4',
              extension: '.mp4',
              size: meta.size,
              width: oauthMetaWidth || 1920,
              height: oauthMetaHeight || 1080,
              duration: oauthDurationSec,
              originalName,
              isVideo: true,
              isDriveEmbed: true,
              embedUrl,
              fileId,
              sourceUrl: cleanInput,
              previewPosterUrl: oauthThumbnailLink || `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`,
              previewDataUrl: oauthThumbnailLink,
            };
          }
          throw new DriveImportError(
            `Google Drive file "${meta.name || fileId}" (${(meta.size / (1024 * 1024)).toFixed(1)} MB) exceeds the ${(maxBytes / (1024 * 1024)).toFixed(0)} MB limit.`,
            'FILE_TOO_LARGE',
            422,
            fileId
          );
        }

        // Download private or shared file directly via OAuth without modifying permissions
        const oauthDl = await downloadDriveFileWithOAuth(fileId, maxBytes);
        if (oauthDl.ok && oauthDl.buffer && oauthDl.buffer.length > 0) {
          const inspection = inspectMediaBuffer(oauthDl.buffer, expectedType);
          if (inspection.valid && inspection.mimeType && inspection.extension) {
            const isVideo = Boolean(inspection.isVideo);
            const is3DModel = Boolean(inspection.is3DModel);
            return {
              buffer: oauthDl.buffer,
              mimeType: inspection.mimeType,
              extension: inspection.extension,
              size: oauthDl.buffer.length,
              width: inspection.width || oauthMetaWidth,
              height: inspection.height || oauthMetaHeight,
              duration: oauthDurationSec,
              originalName,
              isVideo,
              is3DModel,
              fileId,
              sourceUrl: cleanInput,
              previewPosterUrl: oauthThumbnailLink,
              previewDataUrl: isVideo || is3DModel
                ? oauthThumbnailLink
                : `data:${inspection.mimeType};base64,${oauthDl.buffer.toString('base64')}`,
            };
          }
        }
      }
    }

    // Step B: Public Google Drive endpoints fallback (works for "Anyone with the link can view" files even outside drive.file scope)
    const candidateUrls: string[] = [
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w2000`,
      `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w2000`,
    ];

    if (expectedType === 'image') {
      candidateUrls.unshift(`https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w2000`);
    }

    let lastError =
      'Unable to access this Google Drive file. Please verify the file sharing permission is set to "Anyone with the link can view", or connect Google Drive OAuth in Admin Settings.';
    let lastCode = 'DRIVE_ACCESS_FAILED';
    let saw404 = false;
    let saw403 = false;
    let sawHtmlPreview = false;
    let sawQuotaExceeded = false;
    let thumbnailPosterUrl: string | undefined = oauthThumbnailLink;

    if (!thumbnailPosterUrl && expectedType !== 'model3d') {
      try {
        const thumbUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`;
        const thumbRes = await fetchBufferSafely(thumbUrl, 5 * 1024 * 1024);
        if (thumbRes.status === 200 && thumbRes.buffer.length > 100) {
          const thumbInsp = inspectMediaBuffer(thumbRes.buffer, 'image');
          if (thumbInsp.valid) {
            thumbnailPosterUrl = `data:${thumbInsp.mimeType};base64,${thumbRes.buffer.toString('base64')}`;
          }
        }
      } catch {}
    }

    for (let i = 0; i < candidateUrls.length; i++) {
      const candidateUrl = candidateUrls[i];
      // For video-only or 3d-model-only expectations, skip thumbnail/image-conversion endpoints so we never return a poster JPEG instead of real bytes
      if (
        (expectedType === 'video' || expectedType === 'model3d') &&
        (candidateUrl.includes('/thumbnail?') || candidateUrl.includes('lh3.googleusercontent.com'))
      ) {
        continue;
      }

      try {
        const { buffer, status } = await fetchBufferSafely(candidateUrl, maxBytes);
        if (status === 401 || status === 403) {
          saw403 = true;
          lastCode = 'DRIVE_PERMISSION_DENIED';
          lastError =
            `Google Drive access denied (HTTP ${status}). This file is private or lacks permission. Set sharing in Google Drive to "Anyone with the link can view", or upload directly from your device.`;
          continue;
        }
        if (status === 404) {
          saw404 = true;
          lastCode = 'DRIVE_NOT_FOUND';
          lastError =
            'Google Drive file not found (HTTP 404) or sharing is restricted. Please verify the link and ensure sharing is set to "Anyone with the link can view".';
          continue;
        }
        if (status === 429) {
          sawQuotaExceeded = true;
          lastCode = 'DRIVE_QUOTA_EXCEEDED';
          lastError =
            'Google Drive download quota exceeded (HTTP 429). Please wait a few minutes or download the file and use "Upload From Device".';
          continue;
        }
        if (status !== 200 || buffer.length === 0) {
          continue;
        }

        const inspection = inspectMediaBuffer(buffer, expectedType);
        if (inspection.valid && inspection.mimeType && inspection.extension) {
          const isVideo = Boolean(inspection.isVideo);
          const is3DModel = Boolean(inspection.is3DModel);

          return {
            buffer,
            mimeType: inspection.mimeType,
            extension: inspection.extension,
            size: buffer.length,
            width: inspection.width || oauthMetaWidth,
            height: inspection.height || oauthMetaHeight,
            duration: oauthDurationSec,
            originalName,
            isVideo,
            is3DModel,
            fileId,
            sourceUrl: cleanInput,
            previewPosterUrl: thumbnailPosterUrl,
            previewDataUrl: isVideo || is3DModel
              ? thumbnailPosterUrl
              : `data:${inspection.mimeType};base64,${buffer.toString('base64')}`,
          };
        }

        if (inspection.isHtml) {
          sawHtmlPreview = true;
          const htmlPreview = buffer.subarray(0, Math.min(24576, buffer.length)).toString('utf8');
          if (htmlPreview.toLowerCase().includes('quota exceeded') || htmlPreview.toLowerCase().includes('too many users')) {
            sawQuotaExceeded = true;
            lastCode = 'DRIVE_QUOTA_EXCEEDED';
            lastError =
              'Google Drive download quota exceeded for this file. Please download the file to your device and use "Upload From Device".';
          } else {
            const confirmUrl = extractDriveConfirmationUrl(htmlPreview, fileId);
            if (confirmUrl && !candidateUrls.includes(confirmUrl)) {
              candidateUrls.splice(i + 1, 0, confirmUrl);
              continue;
            }
            lastCode = 'DRIVE_HTML_PREVIEW';
            lastError =
              inspection.error ||
              'Google Drive returned an HTML sign-in/preview page instead of direct media bytes. Please ensure sharing is set to "Anyone with the link can view".';
          }
        } else if (inspection.error) {
          lastCode = 'UNSUPPORTED_FILE_TYPE';
          lastError = inspection.error;
        }
      } catch (err: any) {
        const rawMsg = String(err?.message || '');
        if (rawMsg && rawMsg !== 'fetch failed') {
          lastError = rawMsg;
        }
      }
    }

    // Step C: Verified Google Drive Video Embed fallback ONLY when file is genuinely verified as a playable video on Drive /preview
    if (expectedType === 'video' || expectedType === 'any') {
      const embedCheck = await verifyDriveVideoEmbedPage(fileId);
      if (embedCheck.accessible && (embedCheck.isVideo || oauthMimeType?.startsWith('video/'))) {
        const embedUrl = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
        return {
          buffer: Buffer.alloc(0),
          mimeType: oauthMimeType || 'video/mp4',
          extension: '.mp4',
          size: oauthDeclaredSize || 0,
          width: oauthMetaWidth || 1920,
          height: oauthMetaHeight || 1080,
          duration: oauthDurationSec,
          originalName,
          isVideo: true,
          isDriveEmbed: true,
          embedUrl,
          fileId,
          sourceUrl: cleanInput,
          previewPosterUrl: thumbnailPosterUrl || `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`,
          previewDataUrl: thumbnailPosterUrl,
        };
      }
      if (embedCheck.isPrivate) {
        throw new DriveImportError(
          embedCheck.reason || 'Google Drive file is private and cannot be accessed.',
          'DRIVE_PERMISSION_DENIED',
          422,
          fileId
        );
      }
      if (embedCheck.isNotFound) {
        throw new DriveImportError(
          embedCheck.reason || 'Google Drive file not found.',
          'DRIVE_NOT_FOUND',
          422,
          fileId
        );
      }
    }

    if (sawQuotaExceeded) {
      throw new DriveImportError(lastError, 'DRIVE_QUOTA_EXCEEDED', 422, fileId);
    }
    if (sawHtmlPreview || saw403) {
      throw new DriveImportError(lastError, saw403 ? 'DRIVE_PERMISSION_DENIED' : 'DRIVE_HTML_PREVIEW', 422, fileId);
    }
    if (saw404) {
      throw new DriveImportError(lastError, 'DRIVE_NOT_FOUND', 422, fileId);
    }
    throw new DriveImportError(lastError, lastCode, 422, fileId);
  }

  // Standard direct HTTPS URL flow
  let fetchResult: { buffer: Buffer; contentType: string; status: number };
  try {
    fetchResult = await fetchBufferSafely(cleanInput, maxBytes);
  } catch (err: any) {
    throw new DriveImportError(
      `Unable to download media from remote server: ${err?.message || 'Network connection failed'}.`,
      'REMOTE_FETCH_FAILED',
      422,
      null
    );
  }

  const { buffer, status } = fetchResult;
  if (status === 401 || status === 403) {
    throw new DriveImportError(
      `Access denied by remote server (HTTP ${status}). The media URL is not publicly accessible.`,
      'REMOTE_ACCESS_DENIED',
      422,
      null
    );
  }
  if (status === 404) {
    throw new DriveImportError(
      'Media not found at the provided URL (HTTP 404).',
      'REMOTE_NOT_FOUND',
      422,
      null
    );
  }
  if (status !== 200 || buffer.length === 0) {
    throw new DriveImportError(
      `Failed to download media from URL (HTTP ${status}).`,
      'REMOTE_HTTP_ERROR',
      422,
      null
    );
  }

  const inspection = inspectMediaBuffer(buffer, expectedType);
  if (!inspection.valid || !inspection.mimeType || !inspection.extension) {
    throw new DriveImportError(
      inspection.error || 'The URL did not return valid media bytes (received non-media content).',
      inspection.isHtml ? 'HTML_NOT_MEDIA' : 'INVALID_MEDIA_BYTES',
      422,
      null
    );
  }

  const isVideo = Boolean(inspection.isVideo);
  const is3DModel = Boolean(inspection.is3DModel);

  return {
    buffer,
    mimeType: inspection.mimeType,
    extension: inspection.extension,
    size: buffer.length,
    width: inspection.width,
    height: inspection.height,
    isVideo,
    is3DModel,
    sourceUrl: cleanInput,
    previewDataUrl: isVideo ? undefined : `data:${inspection.mimeType};base64,${buffer.toString('base64')}`,
  };
}

/**
 * Fetches and validates an image from a Google Drive sharing link or direct HTTPS image URL.
 * Preserves strict backward compatibility.
 */
export async function fetchAndValidateExternalImage(rawUrl: string): Promise<ValidatedImageBuffer> {
  const result = await fetchAndValidateExternalMedia(rawUrl, 'image');
  return {
    buffer: result.buffer,
    mimeType: result.mimeType,
    extension: result.extension,
    size: result.size,
    width: result.width || 1200,
    height: result.height || 1600,
    fileId: result.fileId,
    sourceUrl: result.sourceUrl,
  };
}
