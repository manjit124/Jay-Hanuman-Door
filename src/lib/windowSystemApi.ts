import {
  getAdminToken,
  getApiBaseUrl,
  getCustomerMemoryToken,
} from './api.ts';
import {
  WINDOW_SYSTEM_CATEGORIES,
  createDefaultIndianWindowSystems,
} from '../data/indianWindowSystemsDefaults.ts';
import type {
  SavedWindowSystemCalculation,
  WindowSystemCalculationResult,
  WindowSystemDefinition,
} from '../types.ts';

function resolveUrl(path: string): string {
  const base = getApiBaseUrl();
  return base ? `${base}${path}` : path;
}

function adminHeaders(includeJson = true): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Admin-Token'] = token;
  }
  return headers;
}

function customerHeaders(includeJson = true): Record<string, string> {
  const token = getCustomerMemoryToken();
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-Customer-Token'] = token;
  }
  return headers;
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected server response (HTTP ${res.status}).`);
  }
}

export async function fetchPublicWindowSystems(): Promise<{
  categories: typeof WINDOW_SYSTEM_CATEGORIES;
  systems: WindowSystemDefinition[];
}> {
  try {
    const res = await fetch(resolveUrl('/api/window-systems'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const data = await parseJsonSafe(res);
    if (res.ok && data?.success && Array.isArray(data.systems)) {
      return {
        categories: WINDOW_SYSTEM_CATEGORIES,
        systems: data.systems,
      };
    }
  } catch (err) {
    console.warn('Falling back to default window systems catalog:', err);
  }
  return {
    categories: WINDOW_SYSTEM_CATEGORIES,
    systems: createDefaultIndianWindowSystems(),
  };
}

export async function fetchSavedWindowSystemCalcs(): Promise<SavedWindowSystemCalculation[]> {
  const res = await fetch(resolveUrl('/api/window-systems/saved'), {
    method: 'GET',
    credentials: 'include',
    headers: customerHeaders(false),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to load saved cutting lists.');
  }
  return Array.isArray(data.savedCalculations) ? data.savedCalculations : [];
}

export async function saveWindowSystemCalculation(payload: {
  projectName: string;
  customerName: string;
  result: WindowSystemCalculationResult;
}): Promise<SavedWindowSystemCalculation> {
  const res = await fetch(resolveUrl('/api/window-systems/saved'), {
    method: 'POST',
    credentials: 'include',
    headers: customerHeaders(true),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to save cutting list.');
  }
  return data.savedCalculation;
}

export async function deleteSavedWindowSystemCalc(id: string): Promise<void> {
  const res = await fetch(resolveUrl(`/api/window-systems/saved/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: customerHeaders(false),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to delete saved cutting list.');
  }
}

export async function fetchAdminWindowSystems(): Promise<WindowSystemDefinition[]> {
  const res = await fetch(resolveUrl('/api/admin/window-systems'), {
    method: 'GET',
    credentials: 'include',
    headers: adminHeaders(false),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to fetch admin window systems.');
  }
  return Array.isArray(data.systems) ? data.systems : [];
}

export async function createAdminWindowSystem(
  payload: Partial<WindowSystemDefinition>
): Promise<WindowSystemDefinition> {
  const res = await fetch(resolveUrl('/api/admin/window-systems'), {
    method: 'POST',
    credentials: 'include',
    headers: adminHeaders(true),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to add window system.');
  }
  return data.system;
}

export async function updateAdminWindowSystem(
  id: string,
  payload: Partial<WindowSystemDefinition>
): Promise<WindowSystemDefinition> {
  const res = await fetch(resolveUrl(`/api/admin/window-systems/${encodeURIComponent(id)}`), {
    method: 'PUT',
    credentials: 'include',
    headers: adminHeaders(true),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to update window system.');
  }
  return data.system;
}

export async function deleteAdminWindowSystem(id: string): Promise<void> {
  const res = await fetch(resolveUrl(`/api/admin/window-systems/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    credentials: 'include',
    headers: adminHeaders(false),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to delete window system.');
  }
}
