import dns from 'dns';
import net from 'net';

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

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB max
const MIN_IMAGE_BYTES = 64;
const FETCH_TIMEOUT_MS = 15000;
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
 * Detects image format & dimensions from binary magic bytes.
 * Rejects HTML pages, text files, scripts, or corrupted buffers.
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
  if (!Buffer.isBuffer(buf) || buf.length < MIN_IMAGE_BYTES) {
    return { valid: false, error: 'Downloaded file is empty or too small to be a valid image.' };
  }

  // Check if response is an HTML page (e.g. Google Drive sign-in / permission denied / preview page)
  const headAscii = buf.subarray(0, Math.min(512, buf.length)).toString('utf8').trimStart().toLowerCase();
  if (
    headAscii.startsWith('<!doctype html') ||
    headAscii.startsWith('<html') ||
    headAscii.startsWith('<head') ||
    headAscii.startsWith('<script') ||
    headAscii.includes('accounts.google.com') ||
    headAscii.includes('google drive - quota exceeded') ||
    headAscii.includes('sign in to continue')
  ) {
    return {
      valid: false,
      isHtml: true,
      error:
        'Google Drive returned an HTML page instead of image bytes. Please ensure the file sharing permission in Google Drive is set to "Anyone with the link can view", or download the photo and use "Upload Image".',
    };
  }

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
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
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    if (width > 0 && height > 0 && width <= 20000 && height <= 20000) {
      return { valid: true, mimeType: 'image/png', extension: '.png', width, height };
    }
    return { valid: false, error: 'Invalid PNG image dimensions.' };
  }

  // 2. JPEG: FF D8 FF
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
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
      // SOF markers (Baseline, Extended, Progressive, etc.)
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
      if (marker === 0xd9 || marker === 0xda) {
        break;
      }
      const segmentLength = buf.readUInt16BE(offset + 2);
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
    return { valid: false, error: 'Corrupted or incomplete JPEG image.' };
  }

  // 3. WebP: "RIFF" .... "WEBP"
  if (
    buf.length >= 30 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
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
    if (width > 0 && height > 0 && width <= 20000 && height <= 20000) {
      return { valid: true, mimeType: 'image/webp', extension: '.webp', width, height };
    }
    return { valid: false, error: 'Invalid WebP image dimensions.' };
  }

  // 4. GIF: "GIF87a" or "GIF89a"
  if (
    buf.length >= 10 &&
    buf.toString('ascii', 0, 3) === 'GIF' &&
    (buf.toString('ascii', 3, 6) === '87a' || buf.toString('ascii', 3, 6) === '89a')
  ) {
    const width = buf.readUInt16LE(6);
    const height = buf.readUInt16LE(8);
    if (width > 0 && height > 0 && width <= 20000 && height <= 20000) {
      return { valid: true, mimeType: 'image/gif', extension: '.gif', width, height };
    }
  }

  return {
    valid: false,
    error: 'File is not a supported image format (JPEG, PNG, WebP, or GIF).',
  };
}

/**
 * Safely downloads a URL with redirect validation, timeout, and byte size limit.
 */
async function fetchBufferSafely(targetUrl: string): Promise<{ buffer: Buffer; contentType: string; status: number }> {
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
          'User-Agent': 'Mozilla/5.0 (compatible; JaiHanumanDoorMediaImporter/1.0)',
          'Accept': 'image/jpeg,image/png,image/webp,image/gif;q=0.9,*/*;q=0.5',
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
        if (!isNaN(declaredSize) && declaredSize > MAX_IMAGE_BYTES) {
          throw new Error(`Image file size (${(declaredSize / (1024 * 1024)).toFixed(1)} MB) exceeds the 15 MB limit.`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const arrayBuf = await response.arrayBuffer();
        if (arrayBuf.byteLength > MAX_IMAGE_BYTES) {
          throw new Error('Image file size exceeds the 15 MB limit.');
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
          if (totalBytes > MAX_IMAGE_BYTES) {
            await reader.cancel();
            throw new Error('Image file size exceeds the 15 MB maximum limit.');
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

  throw new Error('Too many redirects while fetching image URL.');
}

function extractDriveConfirmationUrl(html: string, fileId: string): string | null {
  if (!html || !html.includes('drive.usercontent.google.com/download')) {
    return null;
  }
  const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i) || html.match(/[?&]uuid=([^&"'\s]+)/i);
  const confirmMatch = html.match(/name="confirm"\s+value="([^"]+)"/i) || html.match(/[?&]confirm=([^&"'\s]+)/i);
  const confirmVal = confirmMatch?.[1] || 't';
  const uuidVal = uuidMatch?.[1] || '';
  const params = new URLSearchParams({
    id: fileId,
    export: 'download',
    confirm: confirmVal,
  });
  if (uuidVal) {
    params.set('uuid', uuidVal);
  }
  return `https://drive.usercontent.google.com/download?${params.toString()}`;
}

/**
 * Fetches and validates an image from a Google Drive sharing link or direct HTTPS image URL.
 */
export async function fetchAndValidateExternalImage(rawUrl: string): Promise<ValidatedImageBuffer> {
  const cleanInput = String(rawUrl || '').trim();
  if (!cleanInput) {
    throw new DriveImportError(
      'Please paste a Google Drive sharing link or image URL.',
      'EMPTY_URL',
      400,
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

  if (fileId) {
    // Candidate Google Drive download endpoints in order of fidelity
    const candidateUrls: string[] = [
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
      `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w2000`,
      `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w2000`,
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
    ];

    let lastError =
      'Unable to access this Google Drive file. Please make sure the file sharing is set to "Anyone with the link can view", or download the image and upload it directly.';
    let lastCode = 'DRIVE_ACCESS_FAILED';
    let saw404 = false;
    let saw403 = false;
    let sawHtmlPreview = false;
    let sawQuotaExceeded = false;

    for (let i = 0; i < candidateUrls.length; i++) {
      const candidateUrl = candidateUrls[i];
      try {
        const { buffer, status } = await fetchBufferSafely(candidateUrl);
        if (status === 401 || status === 403) {
          saw403 = true;
          lastCode = 'DRIVE_PERMISSION_DENIED';
          lastError =
            `Google Drive access denied (HTTP ${status}). Please set the file sharing permission in Google Drive to "Anyone with the link can view", or download and upload the photo using "Upload Image".`;
          continue;
        }
        if (status === 404) {
          saw404 = true;
          lastCode = 'DRIVE_NOT_FOUND';
          lastError =
            'Google Drive file not found (HTTP 404) or sharing is set to "Restricted". Please set Google Drive sharing to "Anyone with the link can view", or verify the link.';
          continue;
        }
        if (status === 429) {
          sawQuotaExceeded = true;
          lastCode = 'DRIVE_QUOTA_EXCEEDED';
          lastError =
            'Google Drive download quota exceeded (HTTP 429). Please wait a few minutes or download the image and use "Upload Image".';
          continue;
        }
        if (status !== 200 || buffer.length === 0) {
          continue;
        }

        const inspection = inspectImageBuffer(buffer);
        if (inspection.valid && inspection.mimeType && inspection.extension && inspection.width && inspection.height) {
          return {
            buffer,
            mimeType: inspection.mimeType,
            extension: inspection.extension,
            size: buffer.length,
            width: inspection.width,
            height: inspection.height,
            fileId,
            sourceUrl: cleanInput,
          };
        }

        if (inspection.isHtml) {
          sawHtmlPreview = true;
          const htmlPreview = buffer.subarray(0, Math.min(16384, buffer.length)).toString('utf8');
          if (htmlPreview.toLowerCase().includes('quota exceeded') || htmlPreview.toLowerCase().includes('too many users')) {
            sawQuotaExceeded = true;
            lastCode = 'DRIVE_QUOTA_EXCEEDED';
            lastError =
              'Google Drive download quota exceeded for this file. Please download the photo to your device and use "Upload Image".';
          } else {
            const confirmUrl = extractDriveConfirmationUrl(htmlPreview, fileId);
            if (confirmUrl && !candidateUrls.includes(confirmUrl)) {
              candidateUrls.splice(i + 1, 0, confirmUrl);
              continue;
            }
            lastCode = 'DRIVE_HTML_PREVIEW';
            lastError =
              inspection.error ||
              'Google Drive returned an HTML sign-in/preview page instead of image bytes. Please set sharing in Google Drive to "Anyone with the link can view", or download and upload the photo directly.';
          }
        } else if (inspection.error) {
          lastCode = 'INVALID_IMAGE_BYTES';
          lastError = inspection.error;
        }
      } catch (err: any) {
        const rawMsg = String(err?.message || '');
        if (rawMsg && rawMsg !== 'fetch failed') {
          lastError = rawMsg;
        }
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

  // Standard direct image URL flow
  let fetchResult: { buffer: Buffer; contentType: string; status: number };
  try {
    fetchResult = await fetchBufferSafely(cleanInput);
  } catch (err: any) {
    throw new DriveImportError(
      `Unable to download image from remote server: ${err?.message || 'Network connection failed'}.`,
      'REMOTE_FETCH_FAILED',
      422,
      null
    );
  }

  const { buffer, status } = fetchResult;
  if (status === 401 || status === 403) {
    throw new DriveImportError(
      `Access denied by remote server (HTTP ${status}). The image URL is not publicly accessible.`,
      'REMOTE_ACCESS_DENIED',
      422,
      null
    );
  }
  if (status === 404) {
    throw new DriveImportError(
      'Image not found at the provided URL (HTTP 404).',
      'REMOTE_NOT_FOUND',
      422,
      null
    );
  }
  if (status !== 200 || buffer.length === 0) {
    throw new DriveImportError(
      `Failed to download image from URL (HTTP ${status}).`,
      'REMOTE_HTTP_ERROR',
      422,
      null
    );
  }

  const inspection = inspectImageBuffer(buffer);
  if (!inspection.valid || !inspection.mimeType || !inspection.extension || !inspection.width || !inspection.height) {
    throw new DriveImportError(
      inspection.error || 'The URL did not return valid image bytes (received non-image content).',
      inspection.isHtml ? 'HTML_NOT_IMAGE' : 'INVALID_IMAGE_BYTES',
      422,
      null
    );
  }

  return {
    buffer,
    mimeType: inspection.mimeType,
    extension: inspection.extension,
    size: buffer.length,
    width: inspection.width,
    height: inspection.height,
    sourceUrl: cleanInput,
  };
}
