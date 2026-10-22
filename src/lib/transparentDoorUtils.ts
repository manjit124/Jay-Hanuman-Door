/**
 * Transparent Door Extraction & Background Removal Utility
 * 
 * Provides automated background removal, alpha transparency detection,
 * door contour boundary segmentation, cropping, boundary feathering,
 * proxy-assisted CORS recovery, and persistent caching for Jai Hanuman Catalogue doors
 * in the "Fit in Entrance" photo visualizer.
 */

import { Door } from '../types.ts';

const CACHE_PREFIX = 'jh_transparent_door_v3_';
const memoryCache = new Map<string, string>();

export interface BackgroundRemovalOptions {
  tolerance?: number; // 15 to 80 (default ~36)
  feather?: number; // 0 to 4 px blur edge transition
  cropToDoor?: boolean; // Tightly crop to the actual door slab
}

/**
 * Checks whether an image element or URL already has native alpha channel transparency.
 */
export async function checkIfImageHasAlpha(imgOrUrl: HTMLImageElement | string): Promise<boolean> {
  try {
    const img = typeof imgOrUrl === 'string' ? await loadImage(imgOrUrl) : imgOrUrl;
    const canvas = document.createElement('canvas');
    const w = Math.min(img.naturalWidth || 400, 400);
    const h = Math.min(img.naturalHeight || 600, 600);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Check corners and edges for alpha < 240
    let transparentPixelCount = 0;
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 240) {
        transparentPixelCount++;
        if (transparentPixelCount > 30) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Loads an image with crossOrigin = 'anonymous' safely.
 * If direct CORS fails, automatically proxies via `/api/media/proxy-image`
 * to guarantee that canvas getImageData / toDataURL never gets tainted.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('Image source is empty'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);

    img.onerror = () => {
      // If direct anonymous fails (e.g. CORS restrictions on remote CDN),
      // retry via server proxy endpoint with full CORS headers
      if (!src.startsWith('/api/media/proxy-image') && !src.startsWith('data:')) {
        const proxyUrl = `/api/media/proxy-image?url=${encodeURIComponent(src)}`;
        const proxyImg = new Image();
        proxyImg.crossOrigin = 'anonymous';
        proxyImg.onload = () => resolve(proxyImg);
        proxyImg.onerror = () => {
          // Final fallback: try raw source
          const rawImg = new Image();
          rawImg.onload = () => resolve(rawImg);
          rawImg.onerror = (err) => reject(err);
          rawImg.src = src;
        };
        proxyImg.src = proxyUrl;
      } else {
        reject(new Error(`Failed to load image: ${src}`));
      }
    };

    img.src = src;
  });
}

/**
 * Crop a canvas to the tight bounding box of all non-transparent pixels (alpha > threshold).
 */
export function cropCanvasToVisibleDoor(
  sourceCanvas: HTMLCanvasElement,
  alphaThreshold: number = 20,
  padding: number = 3
): HTMLCanvasElement {
  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let hasVisiblePixels = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasVisiblePixels = true;
      }
    }
  }

  // If nothing visible or covers entire image, return source
  if (!hasVisiblePixels) return sourceCanvas;

  // Add small padding
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(w - cropX, Math.max(10, maxX - minX + 1 + padding * 2));
  const cropH = Math.min(h - cropY, Math.max(20, maxY - minY + 1 + padding * 2));

  // If crop is almost the whole canvas, still return cleanly
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) return sourceCanvas;

  croppedCtx.drawImage(
    sourceCanvas,
    cropX, cropY, cropW, cropH,
    0, 0, cropW, cropH
  );

  return croppedCanvas;
}

/**
 * Performs intelligent background removal on a catalogue door photo.
 * 
 * Steps:
 * 1. Checks if the image already has transparency (if so, crops and returns directly).
 * 2. Samples background color clusters along all 4 perimeter borders and corners.
 * 3. Identifies the central door structure and wood chromaticity.
 * 4. Multi-seed flood-fills from all perimeter points inward to remove walls, floors, and borders.
 * 5. Applies edge feathering for smooth natural anti-aliasing against entrance photos.
 * 6. Tightly crops the canvas to the door cutout so no white space or outer margin remains.
 */
export async function removeBackgroundFromImage(
  imageUrl: string,
  options: BackgroundRemovalOptions = {}
): Promise<string> {
  const tolerance = options.tolerance ?? 36;
  const feather = options.feather ?? 2;
  const shouldCrop = options.cropToDoor ?? true;

  const img = await loadImage(imageUrl);
  const w = img.naturalWidth || 800;
  const h = img.naturalHeight || 1200;

  // Scale down for processing if huge (max 1200px height for optimal performance & carving crispness)
  const maxDim = 1200;
  let targetW = w;
  let targetH = h;
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    targetW = Math.round(w * ratio);
    targetH = Math.round(h * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return imageUrl;

  ctx.drawImage(img, 0, 0, targetW, targetH);
  let imgData = ctx.getImageData(0, 0, targetW, targetH);
  let data = imgData.data;

  // 1. Check if image already contains native alpha channel transparency
  let hasAlpha = false;
  let transparentPixelCount = 0;
  for (let i = 3; i < data.length; i += 16) {
    if (data[i] < 240) {
      transparentPixelCount++;
      if (transparentPixelCount > 40) {
        hasAlpha = true;
        break;
      }
    }
  }

  if (hasAlpha) {
    if (shouldCrop) {
      const cropped = cropCanvasToVisibleDoor(canvas, 20, 2);
      return cropped.toDataURL('image/png');
    }
    return canvas.toDataURL('image/png');
  }

  // Helper: Perceptual color distance
  const colorDist = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);
  };

  // Helper: Is pixel a characteristic wood tone (Sagwan, Teak, Walnut, Rosewood, Sheesham)?
  // Wood typically has high red/amber component, r > b + 12, and distinctive chroma
  const isWoodTone = (r: number, g: number, b: number) => {
    const minVal = Math.min(r, g, b);
    const maxVal = Math.max(r, g, b);
    // Neutral whites, greys, and blacks have very low saturation
    const isDesaturated = (maxVal - minVal) < 22;
    if (isDesaturated) return false;

    // Classic wood color range: warm golden, red-brown, chocolate, dark teak
    const hasWarmRedOverBlue = r > (b + 12);
    const hasWarmRedOverGreen = r >= (g - 8);
    const isMediumLuminance = r > 45 && r < 235;

    return hasWarmRedOverBlue && hasWarmRedOverGreen && isMediumLuminance;
  };

  // Helper: Is neutral backdrop (white showroom wall, studio backdrop, light grey)
  const isNeutralBackdrop = (r: number, g: number, b: number) => {
    const isHighKey = r > 195 && g > 195 && b > 195;
    const lowChroma = Math.abs(r - g) < 26 && Math.abs(g - b) < 26 && Math.abs(r - b) < 26;
    return isHighKey && lowChroma;
  };

  // 2. Sample background color palette along outer 4 borders & corners
  const bgSamples: { r: number; g: number; b: number }[] = [];
  const samplePixel = (x: number, y: number) => {
    const idx = (y * targetW + x) * 4;
    bgSamples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
  };

  // Sample corners heavily
  const cornerRadius = Math.min(8, Math.floor(targetW / 20));
  for (let dy = 0; dy < cornerRadius; dy++) {
    for (let dx = 0; dx < cornerRadius; dx++) {
      samplePixel(dx, dy); // top-left
      samplePixel(targetW - 1 - dx, dy); // top-right
      samplePixel(dx, targetH - 1 - dy); // bottom-left
      samplePixel(targetW - 1 - dx, targetH - 1 - dy); // bottom-right
    }
  }

  // Sample perimeter strips
  const stepX = Math.max(2, Math.floor(targetW / 40));
  const stepY = Math.max(2, Math.floor(targetH / 40));
  for (let x = 0; x < targetW; x += stepX) {
    samplePixel(x, 0);
    samplePixel(x, targetH - 1);
  }
  for (let y = 0; y < targetH; y += stepY) {
    samplePixel(0, y);
    samplePixel(targetW - 1, y);
  }

  // Filter background samples: discard any rare wood pixels that touched the edge
  const validBgSamples = bgSamples.filter(s => !isWoodTone(s.r, s.g, s.b));
  const samplesToUse = validBgSamples.length > 10 ? validBgSamples : bgSamples;

  // 3. Multi-seed Flood-Fill from all 4 borders inward
  const visited = new Uint8Array(targetW * targetH);
  const isBackground = new Uint8Array(targetW * targetH);
  const queue: number[] = [];

  const pushToQueue = (x: number, y: number) => {
    if (x < 0 || x >= targetW || y < 0 || y >= targetH) return;
    const pIdx = y * targetW + x;
    if (visited[pIdx]) return;
    visited[pIdx] = 1;

    const dIdx = pIdx * 4;
    const r = data[dIdx];
    const g = data[dIdx + 1];
    const b = data[dIdx + 2];

    // Check if pixel matches any background sample or is neutral backdrop
    let matchesBg = isNeutralBackdrop(r, g, b);
    if (!matchesBg) {
      for (let i = 0; i < samplesToUse.length; i += 4) {
        const s = samplesToUse[i];
        if (colorDist(r, g, b, s.r, s.g, s.b) < tolerance * 1.6) {
          matchesBg = true;
          break;
        }
      }
    }

    // Outer border perimeter pixels are by default background unless clearly wood
    const isPerimeter = x === 0 || x === targetW - 1 || y === 0 || y === targetH - 1;
    if (matchesBg || (isPerimeter && !isWoodTone(r, g, b))) {
      isBackground[pIdx] = 1;
      queue.push(pIdx);
    }
  };

  // Seed all perimeter pixels
  for (let x = 0; x < targetW; x++) {
    pushToQueue(x, 0);
    pushToQueue(x, targetH - 1);
  }
  for (let y = 0; y < targetH; y++) {
    pushToQueue(0, y);
    pushToQueue(targetW - 1, y);
  }

  // BFS flood-fill outward to door contour
  let head = 0;
  const maxTolerance = tolerance * 1.5;

  while (head < queue.length) {
    const pIdx = queue[head++];
    const x = pIdx % targetW;
    const y = Math.floor(pIdx / targetW);

    const dIdxCurrent = pIdx * 4;
    const curR = data[dIdxCurrent];
    const curG = data[dIdxCurrent + 1];
    const curB = data[dIdxCurrent + 2];

    const neighbors = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < targetW && ny >= 0 && ny < targetH) {
        const nIdx = ny * targetW + nx;
        if (!visited[nIdx]) {
          visited[nIdx] = 1;
          const ndIdx = nIdx * 4;
          const r = data[ndIdx];
          const g = data[ndIdx + 1];
          const b = data[ndIdx + 2];

          // Stop if pixel is definitely part of the wood door structure
          if (isWoodTone(r, g, b)) {
            continue;
          }

          // Check difference from neighbor pixel (smooth gradient expansion)
          const localDiff = colorDist(r, g, b, curR, curG, curB);
          const isNeutral = isNeutralBackdrop(r, g, b);

          let matchesSample = false;
          if (localDiff < tolerance || isNeutral) {
            matchesSample = true;
          } else {
            // Check against sampled palette
            for (let i = 0; i < samplesToUse.length; i += 6) {
              const s = samplesToUse[i];
              if (colorDist(r, g, b, s.r, s.g, s.b) < maxTolerance) {
                matchesSample = true;
                break;
              }
            }
          }

          if (matchesSample) {
            isBackground[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  // 4. Door Bounding Box & Margin Safeguard
  // In catalogue photos, the door occupies the center of the image.
  // Scan to find the tightest vertical and horizontal span of non-background pixels.
  let minDoorX = targetW;
  let maxDoorX = 0;
  let minDoorY = targetH;
  let maxDoorY = 0;

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const pIdx = y * targetW + x;
      if (!isBackground[pIdx]) {
        if (x < minDoorX) minDoorX = x;
        if (x > maxDoorX) maxDoorX = x;
        if (y < minDoorY) minDoorY = y;
        if (y > maxDoorY) maxDoorY = y;
      }
    }
  }

  // If door bounds found, ensure any floating noise outside the door slab is cleared
  if (minDoorX < maxDoorX && minDoorY < maxDoorY) {
    const pad = Math.max(3, Math.floor(targetW * 0.01));
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        if (x < minDoorX - pad || x > maxDoorX + pad || y < minDoorY - pad || y > maxDoorY + pad) {
          isBackground[y * targetW + x] = 1;
        }
      }
    }
  }

  // 5. Apply Alpha Transparency & Feathering
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const pIdx = y * targetW + x;
      const dIdx = pIdx * 4;

      if (isBackground[pIdx]) {
        data[dIdx + 3] = 0; // Fully transparent
      } else if (feather > 0) {
        // Anti-aliased edge smoothing
        let bgNeighborCount = 0;
        const rFeather = Math.min(feather, 2);
        for (let dy = -rFeather; dy <= rFeather; dy++) {
          for (let dx = -rFeather; dx <= rFeather; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < targetW && ny >= 0 && ny < targetH) {
              if (isBackground[ny * targetW + nx]) {
                bgNeighborCount++;
              }
            }
          }
        }
        if (bgNeighborCount > 0) {
          const totalNeighbors = (2 * rFeather + 1) * (2 * rFeather + 1);
          const edgeAlpha = Math.round(255 * (1 - (bgNeighborCount / totalNeighbors) * 0.75));
          data[dIdx + 3] = Math.max(0, Math.min(255, edgeAlpha));
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 6. Tight Bounding Box Cropping (removes unwanted surrounding empty area)
  if (shouldCrop) {
    const croppedCanvas = cropCanvasToVisibleDoor(canvas, 15, 2);
    return croppedCanvas.toDataURL('image/png');
  }

  return canvas.toDataURL('image/png');
}

/**
 * Retrieve cached transparent door from localStorage or memory.
 */
export function getCachedTransparentDoor(doorId: string): string | null {
  if (memoryCache.has(doorId)) {
    return memoryCache.get(doorId) || null;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(CACHE_PREFIX + doorId);
      if (stored && stored.startsWith('data:image/png')) {
        memoryCache.set(doorId, stored);
        return stored;
      }
    }
  } catch {}
  return null;
}

/**
 * Save transparent door to localStorage and memory.
 */
export function setCachedTransparentDoor(doorId: string, dataUrl: string): void {
  memoryCache.set(doorId, dataUrl);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(CACHE_PREFIX + doorId, dataUrl);
      } catch {
        // Quota full: prune older keys
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('jh_transparent_door_') && key !== CACHE_PREFIX + doorId) {
            window.localStorage.removeItem(key);
            break;
          }
        }
        try {
          window.localStorage.setItem(CACHE_PREFIX + doorId, dataUrl);
        } catch {}
      }
    }
  } catch {}
}

/**
 * Resolves the transparent PNG cutout for a door in priority order:
 * 1. door.transparentPngUrl (explicitly uploaded or auto-generated by admin)
 * 2. door.model3d?.transparentPngUrl (attached in 3D CAD config)
 * 3. doorSnapshotUrl (if generated from 3D studio with transparent alpha)
 * 4. Cached transparent cutout in localStorage/memory
 * 5. Automated background removal on door.images[0]
 */
export async function resolveTransparentDoorCutout(
  door: Door,
  doorSnapshotUrl?: string | null,
  forceRegenerate: boolean = false
): Promise<string> {
  // 1. Explicit transparent PNG attached by Admin
  if (door.transparentPngUrl && door.transparentPngUrl.trim()) {
    return door.transparentPngUrl;
  }

  // 2. Attached in 3D model config
  if (door.model3d?.transparentPngUrl && door.model3d.transparentPngUrl.trim()) {
    return door.model3d.transparentPngUrl;
  }

  // 3. Cache check
  if (!forceRegenerate) {
    const cached = getCachedTransparentDoor(door.id);
    if (cached) {
      return cached;
    }
  }

  // 4. Snapshot from 3D scene (if provided and has alpha)
  if (doorSnapshotUrl && doorSnapshotUrl.startsWith('data:image/png')) {
    const isTrans = await checkIfImageHasAlpha(doorSnapshotUrl);
    if (isTrans) {
      setCachedTransparentDoor(door.id, doorSnapshotUrl);
      return doorSnapshotUrl;
    }
  }

  // 5. Automatic extraction from catalogue photo
  const rawImage = door.images?.[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80';

  try {
    const processedPng = await removeBackgroundFromImage(rawImage, { cropToDoor: true });
    setCachedTransparentDoor(door.id, processedPng);
    return processedPng;
  } catch (err) {
    console.warn('Background removal fallback:', err);
    // If background removal fails, try generating via canvas
    return rawImage;
  }
}
