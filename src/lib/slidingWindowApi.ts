import type {
  FabricationProfile,
  NotebookExtractedRow,
  NotebookPhotoPageRecord,
  NotebookScanProjectRecord,
  SlidingWindowCalculationResult,
  SlidingWindowInput,
  SlidingWindowProject,
  SlidingWindowUserSettings,
  WindowMeasurementUnit,
} from '../types.ts';
import { getAdminToken, getCustomerMemoryToken, resolveApiUrl } from './api.ts';

export interface FabricatorIdentity {
  ownerId: string;
  role: 'admin' | 'user' | 'guest';
  email?: string;
  name: string;
}

export interface SlidingWindowWorkspacePayload {
  identity: FabricatorIdentity;
  profiles: FabricationProfile[];
  settings: SlidingWindowUserSettings;
  projects: SlidingWindowProject[];
}

export interface ScanNotebookResponse {
  success: true;
  data?: {
    windows: NotebookExtractedRow[];
    page: NotebookPhotoPageRecord;
    detectedProjectName?: string;
    detectedCustomerName?: string;
    summary: string;
    warnings: string[];
    modelUsed: string;
  };
  page: NotebookPhotoPageRecord;
  rows: NotebookExtractedRow[];
  detectedProjectName?: string;
  detectedCustomerName?: string;
  summary: string;
  warnings: string[];
  modelUsed: string;
}

// Keep Fabricator Bearer token strictly in memory (never in localStorage)
let inMemoryFabricatorToken: string | null = null;

export function getFabricatorToken(): string | null {
  return inMemoryFabricatorToken;
}

export function setFabricatorToken(token: string | null): void {
  inMemoryFabricatorToken = token;
}

function buildAuthHeaders(includeJsonContentType = true): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const fabToken = inMemoryFabricatorToken;
  const adminToken = getAdminToken();
  const customerToken = getCustomerMemoryToken();
  // IMPORTANT: Send custom X-Customer-Token / X-Fabricator-Token / X-Admin-Token headers instead of
  // standard "Authorization: Bearer ..." so Google Cloud Run / AI Studio's reverse proxy
  // never misinterprets our app session token as a Google OIDC token and redirects to
  // /__cookie_check.html (which fetch follows and receives as HTTP 200 text/html).
  if (customerToken) {
    headers['X-Customer-Token'] = customerToken;
  }
  if (fabToken) {
    headers['X-Fabricator-Token'] = fabToken;
  } else if (adminToken) {
    headers['X-Admin-Token'] = adminToken;
  }
  return headers;
}

function formatSlidingApiError(status: number, parsed: any, path: string): string {
  const serverMsg = typeof parsed?.error === 'string' && parsed.error.trim() ? parsed.error.trim() : '';
  const errorCode = typeof parsed?.errorCode === 'string' ? parsed.errorCode : '';

  if (status === 404) {
    return `Scanning API route (${path}) was not found on the server (HTTP 404). Please verify the latest backend deployment is active.`;
  }
  if (status === 413 || errorCode === 'IMAGE_TOO_LARGE') {
    return serverMsg || 'Notebook photo is too large (max 15 MB). Please take a smaller photo and try again.';
  }
  if (status === 400) {
    return serverMsg || 'Invalid notebook photo or request format. Please upload a valid JPG, PNG, WebP, or HEIC image.';
  }
  if (status === 401 || status === 403) {
    return serverMsg || 'Authentication error while accessing the Sliding Window workspace (HTTP ' + status + '). Please sign in or retry.';
  }
  if (status === 429 || errorCode === 'GEMINI_RATE_LIMIT') {
    return serverMsg || 'AI scanner rate limit reached (HTTP 429). Please wait a few seconds and retry.';
  }
  if (status === 408 || status === 504 || errorCode === 'GEMINI_TIMEOUT') {
    return serverMsg || 'AI notebook scan timed out. Please try again with a clearer or slightly smaller photo.';
  }
  if (status === 422 || errorCode === 'GEMINI_ANALYSIS_FAILED' || errorCode === 'GEMINI_INVALID_JSON') {
    return serverMsg || 'Gemini AI could not read measurements from this photo. Please try a clearer, well-lit notebook photograph.';
  }
  if (status === 502 || status === 503 || errorCode === 'GEMINI_UNAVAILABLE') {
    return serverMsg || 'Gemini AI scanner service is temporarily busy. Please retry in a few seconds.';
  }
  if (status >= 500) {
    return serverMsg || `Server error while processing your request (HTTP ${status}). Please try again.`;
  }
  return serverMsg || `Request failed with HTTP ${status}.`;
}

async function swFetch<T>(
  path: string,
  init: RequestInit = {},
  options?: { timeoutMs?: number }
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const timeoutMs = options?.timeoutMs ?? (isFormData ? 65000 : 25000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const resolvedUrl = resolveApiUrl(path);
  const isSameOrigin = resolvedUrl.startsWith('/');

  let res: Response;
  try {
    res = await fetch(resolvedUrl, {
      credentials: 'include',
      ...init,
      signal: init.signal || controller.signal,
      headers: {
        ...buildAuthHeaders(!isFormData),
        ...(init.headers || {}),
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s while connecting to the scanner service. Check your internet connection and try again.`
      );
    }
    throw new Error(
      err?.message && !String(err.message).toLowerCase().includes('failed to fetch')
        ? err.message
        : 'Network error: could not reach the WindowCut Pro backend server. Please check your connection and retry.'
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const text = await res.text();
  const trimmed = text.trim();
  const isHtmlResponse =
    contentType.includes('text/html') ||
    trimmed.startsWith('<!doctype html') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<');
  const isJsonContentType =
    contentType.includes('application/json') || contentType.includes('+json');

  if (isHtmlResponse || (!isJsonContentType && trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    const lowerTrimmed = trimmed.toLowerCase();
    const isProxyCookieRedirect =
      res.redirected ||
      (res.url && res.url.includes('__cookie_check')) ||
      lowerTrimmed.includes('<title>cookie check</title>');
    const isWarmupProxyHtml = lowerTrimmed.includes('<title>starting server...</title>');

    console.error('[SlidingWindowAPI] Non-JSON response received:', {
      requestedUrl: resolvedUrl,
      finalUrl: res.url,
      redirected: res.redirected,
      status: res.status,
      contentType: contentType || 'unknown',
      bodyPreview: trimmed.slice(0, 200),
    });

    if (res.status === 404) {
      throw new Error(formatSlidingApiError(404, null, path));
    }
    if (res.status === 413) {
      throw new Error(formatSlidingApiError(413, null, path));
    }
    if (isWarmupProxyHtml) {
      throw new Error(
        `Backend server is still starting or briefly unavailable while handling ${path} (proxy returned warmup HTML). Please wait 3 seconds and retry.`
      );
    }
    if (isProxyCookieRedirect) {
      throw new Error(
        `Preview authentication proxy intercepted ${path} and returned an HTML cookie-check page (HTTP ${res.status}). Please reload the Preview window or allow third-party cookies, then retry.`
      );
    }
    if (isHtmlResponse) {
      throw new Error(
        `Server returned HTML instead of JSON for ${path} (HTTP ${res.status}, Content-Type: ${contentType || 'text/html'}). Verify the backend API server is running and handling /api routes.`
      );
    }
    throw new Error(
      `Server returned a non-JSON response for ${path} (HTTP ${res.status}, Content-Type: ${contentType || 'unknown'}).`
    );
  }

  let parsed: any = null;
  try {
    parsed = trimmed ? JSON.parse(trimmed) : {};
  } catch (parseErr: any) {
    console.error('[SlidingWindowAPI] Malformed JSON response:', {
      requestedUrl: resolvedUrl,
      status: res.status,
      contentType: contentType || 'unknown',
      error: parseErr?.message,
      bodyPreview: trimmed.slice(0, 200),
    });
    if (res.status === 404) {
      throw new Error(formatSlidingApiError(404, null, path));
    }
    if (res.status === 413) {
      throw new Error(formatSlidingApiError(413, null, path));
    }
    throw new Error(
      `Server returned malformed JSON for ${path} (HTTP ${res.status}, Content-Type: ${contentType || 'unknown'}). Please try again.`
    );
  }

  if (!res.ok || parsed?.success === false) {
    const err = new Error(formatSlidingApiError(res.status, parsed, path)) as Error & {
      status?: number;
      errorCode?: string;
      code?: string;
    };
    err.status = res.status;
    err.errorCode = parsed?.errorCode;
    if (
      parsed?.errorCode === 'CUSTOMER_AUTH_REQUIRED' ||
      parsed?.errorCode === 'CUSTOMER_SESSION_EXPIRED'
    ) {
      err.code = 'CUSTOMER_AUTH_REQUIRED';
    }
    throw err;
  }
  return parsed as T;
}

export async function initOrLoadSlidingWorkspace(): Promise<SlidingWindowWorkspacePayload> {
  if (!inMemoryFabricatorToken && !getAdminToken()) {
    const guest = await swFetch<{
      success: true;
      token: string;
      identity: FabricatorIdentity;
      profiles: FabricationProfile[];
      settings: SlidingWindowUserSettings;
    }>('/api/sliding-window/auth/guest', { method: 'POST', body: '{}' });
    inMemoryFabricatorToken = guest.token;
    return {
      identity: guest.identity,
      profiles: guest.profiles,
      settings: guest.settings,
      projects: [],
    };
  }

  try {
    return await swFetch<SlidingWindowWorkspacePayload>('/api/sliding-window/workspace', {
      method: 'GET',
    });
  } catch {
    // Token expired or server restarted with new signing key -> establish fresh guest workspace
    inMemoryFabricatorToken = null;
    const guest = await swFetch<{
      success: true;
      token: string;
      identity: FabricatorIdentity;
      profiles: FabricationProfile[];
      settings: SlidingWindowUserSettings;
    }>('/api/sliding-window/auth/guest', { method: 'POST', body: '{}' });
    inMemoryFabricatorToken = guest.token;
    return {
      identity: guest.identity,
      profiles: guest.profiles,
      settings: guest.settings,
      projects: [],
    };
  }
}

export async function registerFabricatorAccount(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<SlidingWindowWorkspacePayload> {
  const res = await swFetch<{
    success: true;
    token: string;
    identity: FabricatorIdentity;
    profiles: FabricationProfile[];
    settings: SlidingWindowUserSettings;
  }>('/api/sliding-window/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  inMemoryFabricatorToken = res.token;
  return await swFetch<SlidingWindowWorkspacePayload>('/api/sliding-window/workspace', { method: 'GET' });
}

export async function loginFabricatorAccount(payload: {
  email: string;
  password: string;
}): Promise<SlidingWindowWorkspacePayload> {
  const res = await swFetch<{
    success: true;
    token: string;
    identity: FabricatorIdentity;
    profiles: FabricationProfile[];
    settings: SlidingWindowUserSettings;
  }>('/api/sliding-window/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  inMemoryFabricatorToken = res.token;
  return await swFetch<SlidingWindowWorkspacePayload>('/api/sliding-window/workspace', { method: 'GET' });
}

export async function logoutFabricatorAccount(): Promise<SlidingWindowWorkspacePayload> {
  inMemoryFabricatorToken = null;
  return initOrLoadSlidingWorkspace();
}

export async function createFabricationProfileApi(
  profile: Partial<FabricationProfile>
): Promise<FabricationProfile> {
  const res = await swFetch<{ success: true; profile: FabricationProfile }>('/api/sliding-window/profiles', {
    method: 'POST',
    body: JSON.stringify(profile),
  });
  return res.profile;
}

export async function updateFabricationProfileApi(
  id: string,
  updates: Partial<FabricationProfile>
): Promise<FabricationProfile> {
  const res = await swFetch<{ success: true; profile: FabricationProfile }>(
    `/api/sliding-window/profiles/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    }
  );
  return res.profile;
}

export async function duplicateFabricationProfileApi(
  id: string,
  name?: string
): Promise<FabricationProfile> {
  const res = await swFetch<{ success: true; profile: FabricationProfile }>(
    `/api/sliding-window/profiles/${encodeURIComponent(id)}/duplicate`,
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    }
  );
  return res.profile;
}

export async function setDefaultFabricationProfileApi(
  id: string
): Promise<{ profile: FabricationProfile; profiles: FabricationProfile[] }> {
  return swFetch<{ success: true; profile: FabricationProfile; profiles: FabricationProfile[] }>(
    `/api/sliding-window/profiles/${encodeURIComponent(id)}/set-default`,
    { method: 'POST', body: '{}' }
  );
}

export async function resetFabricationProfileApi(id: string): Promise<FabricationProfile> {
  const res = await swFetch<{ success: true; profile: FabricationProfile }>(
    `/api/sliding-window/profiles/${encodeURIComponent(id)}/reset`,
    { method: 'POST', body: '{}' }
  );
  return res.profile;
}

export async function deleteFabricationProfileApi(id: string): Promise<FabricationProfile[]> {
  const res = await swFetch<{ success: true; profiles: FabricationProfile[] }>(
    `/api/sliding-window/profiles/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
  return res.profiles;
}

export async function saveSlidingWindowSettingsApi(
  settings: Partial<SlidingWindowUserSettings>
): Promise<SlidingWindowUserSettings> {
  const res = await swFetch<{ success: true; settings: SlidingWindowUserSettings }>(
    '/api/sliding-window/settings',
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    }
  );
  return res.settings;
}

export async function saveSlidingWindowProjectApi(payload: {
  projectName: string;
  customerName: string;
  defaultUnit: WindowMeasurementUnit;
  windows: SlidingWindowInput[];
  notebookScan?: NotebookScanProjectRecord;
}): Promise<SlidingWindowProject> {
  const res = await swFetch<{ success: true; project: SlidingWindowProject }>('/api/sliding-window/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.project;
}

export async function deleteSlidingWindowProjectApi(id: string): Promise<void> {
  await swFetch<{ success: true }>(`/api/sliding-window/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function calculateSlidingWindowsServerApi(
  windows: SlidingWindowInput[]
): Promise<SlidingWindowCalculationResult[]> {
  const res = await swFetch<{ success: true; results: SlidingWindowCalculationResult[] }>(
    '/api/sliding-window/calculate',
    {
      method: 'POST',
      body: JSON.stringify({ windows }),
    }
  );
  return res.results;
}

function buildNotebookFormData(
  file: File,
  options?: {
    pageNumber?: number;
    existingWindowCount?: number;
    defaultUnit?: WindowMeasurementUnit;
  }
): FormData {
  const formData = new FormData();
  formData.append('photo', file, file.name || 'notebook-page.jpg');
  if (options?.pageNumber !== undefined) {
    formData.append('pageNumber', String(options.pageNumber));
  }
  if (options?.existingWindowCount !== undefined) {
    formData.append('existingWindowCount', String(options.existingWindowCount));
  }
  if (options?.defaultUnit) {
    formData.append('defaultUnit', options.defaultUnit);
  }
  return formData;
}

function validateScanNotebookResponse(payload: ScanNotebookResponse): ScanNotebookResponse {
  const windows = Array.isArray(payload?.data?.windows)
    ? payload.data.windows
    : Array.isArray(payload?.rows)
    ? payload.rows
    : null;
  const page = payload?.data?.page || payload?.page;

  if (!payload || payload.success !== true || !page || typeof page !== 'object' || !windows) {
    throw new Error(
      'AI Notebook Scanner returned an incomplete response payload. Please retry scanning the notebook photo.'
    );
  }
  return {
    ...payload,
    page,
    rows: windows,
    detectedProjectName: payload.data?.detectedProjectName ?? payload.detectedProjectName,
    detectedCustomerName: payload.data?.detectedCustomerName ?? payload.detectedCustomerName,
    summary: payload.data?.summary ?? payload.summary,
    warnings: payload.data?.warnings ?? payload.warnings ?? [],
    modelUsed: payload.data?.modelUsed ?? payload.modelUsed,
  };
}

export async function scanNotebookPhotoApi(
  file: File,
  options?: {
    pageNumber?: number;
    existingWindowCount?: number;
    defaultUnit?: WindowMeasurementUnit;
  }
): Promise<ScanNotebookResponse> {
  // Ensure a valid fabricator or admin session exists before uploading
  if (!inMemoryFabricatorToken && !getAdminToken()) {
    await initOrLoadSlidingWorkspace();
  }

  try {
    const res = await swFetch<ScanNotebookResponse>(
      '/api/sliding-window/scan-notebook',
      {
        method: 'POST',
        body: buildNotebookFormData(file, options),
      },
      { timeoutMs: 90000 }
    );
    return validateScanNotebookResponse(res);
  } catch (err: any) {
    // Do not swallow customer login requirement; let UI prompt OTP login
    if (err?.code === 'CUSTOMER_AUTH_REQUIRED') {
      throw err;
    }
    // Recover seamlessly once if server restarted and invalidated an older guest fabricator token
    if (err?.errorCode === 'FABRICATOR_AUTH_REQUIRED') {
      inMemoryFabricatorToken = null;
      await initOrLoadSlidingWorkspace();
      const retryRes = await swFetch<ScanNotebookResponse>(
        '/api/sliding-window/scan-notebook',
        {
          method: 'POST',
          body: buildNotebookFormData(file, options),
        },
        { timeoutMs: 90000 }
      );
      return validateScanNotebookResponse(retryRes);
    }
    throw err;
  }
}
