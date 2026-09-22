import {
  Door,
  Category,
  DoorMaterial,
  PolishFinish,
  ChaukhatFrame,
  HardwareItem,
  HomeBanner,
  Article,
  Quotation,
  BusinessSettings,
  CalculationInput,
  CalculationResult,
  UserCalculationRecord,
  NotificationCampaign,
  NotificationPreferences,
  NotificationStats,
  NotificationTokenRecord,
  TeamMember,
  ArticleComment,
  ArticleCategory,
  ArticleAnalyticsSummary,
  CustomerEnquiry,
} from '../types.ts';

const ADMIN_TOKEN_KEY = 'shivshahi_admin_token';
const GUEST_FAVORITES_KEY = 'shivshahi_guest_favorites';
const GUEST_CALCULATIONS_KEY = 'shivshahi_guest_calculations';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Guest Favorites (LocalStorage)
export function getGuestFavorites(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setGuestFavorites(ids: string[]): void {
  try {
    localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function toggleGuestFavorite(doorId: string): string[] {
  const current = getGuestFavorites();
  const exists = current.includes(doorId);
  const updated = exists ? current.filter(id => id !== doorId) : [...current, doorId];
  setGuestFavorites(updated);
  return updated;
}

// Guest Calculation History (LocalStorage)
export function getGuestCalculations(): UserCalculationRecord[] {
  try {
    const raw = localStorage.getItem(GUEST_CALCULATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestCalculation(data: {
  input: CalculationInput;
  result: CalculationResult;
  doorId?: string;
  doorName?: string;
  doorImage?: string;
  notes?: string;
  quotationId?: string;
}): { calculation: UserCalculationRecord; history: UserCalculationRecord[] } {
  const current = getGuestCalculations();
  const newRecord: UserCalculationRecord = {
    id: 'calc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    userId: 'guest',
    doorId: data.doorId,
    doorName: data.doorName || 'Custom Engineered Door',
    doorImage: data.doorImage,
    date: new Date().toISOString(),
    input: data.input,
    result: data.result,
    notes: data.notes,
    quotationId: data.quotationId,
  };
  const updated = [newRecord, ...current].slice(0, 50);
  try {
    localStorage.setItem(GUEST_CALCULATIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return { calculation: newRecord, history: updated };
}

export function deleteGuestCalculation(id: string): UserCalculationRecord[] {
  const current = getGuestCalculations();
  const updated = current.filter(c => c.id !== id);
  try {
    localStorage.setItem(GUEST_CALCULATIONS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function clearGuestCalculations(): void {
  try {
    localStorage.removeItem(GUEST_CALCULATIONS_KEY);
  } catch {
    // ignore
  }
}

// ---------------- Public Endpoints ----------------

export async function fetchCatalog(): Promise<{
  doors: Door[];
  categories: Category[];
  banners: HomeBanner[];
  articles: Article[];
  teamMembers?: TeamMember[];
  settings: BusinessSettings;
}> {
  const res = await fetch('/api/catalog');
  if (!res.ok) throw new Error('Failed to fetch catalog');
  return res.json();
}

export async function fetchCalculatorData(): Promise<{
  materials: DoorMaterial[];
  finishes: PolishFinish[];
  frames: ChaukhatFrame[];
  hardware: HardwareItem[];
  settings: BusinessSettings;
}> {
  const res = await fetch('/api/calculator-data');
  if (!res.ok) throw new Error('Failed to fetch calculator data');
  return res.json();
}

export async function calculatePrice(input: CalculationInput): Promise<CalculationResult> {
  const res = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Calculation failed');
  return res.json();
}

export async function createQuotation(data: {
  customerName: string;
  customerPhone: string;
  customerCity?: string;
  doorId?: string;
  doorName?: string;
  doorImage?: string;
  notes?: string;
  widthInch: number;
  heightInch: number;
  materialId: string;
  finishId: string;
  frameId: string;
  hardwareId: string;
  hardwareQty: number;
}): Promise<{ quotation: Quotation; settings: BusinessSettings }> {
  const res = await fetch('/api/quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create quotation' }));
    throw new Error(err.error || 'Failed to create quotation');
  }
  return res.json();
}

// ---------------- Customer Favorites & Calculations (Client Storage) ----------------

export async function toggleUserFavorite(doorId: string): Promise<{
  favoriteDoorIds: string[];
  isFavorite: boolean;
}> {
  const updated = toggleGuestFavorite(doorId);
  return {
    favoriteDoorIds: updated,
    isFavorite: updated.includes(doorId),
  };
}

export async function fetchUserFavorites(): Promise<Door[]> {
  const guestIds = getGuestFavorites();
  if (guestIds.length === 0) return [];
  const catalog = await fetchCatalog();
  return catalog.doors.filter(d => guestIds.includes(d.id));
}

export async function saveUserCalculation(data: {
  input: CalculationInput;
  result: CalculationResult;
  doorId?: string;
  doorName?: string;
  doorImage?: string;
  notes?: string;
  quotationId?: string;
}): Promise<{ calculation: UserCalculationRecord; history: UserCalculationRecord[] }> {
  return saveGuestCalculation(data);
}

export async function fetchUserCalculations(): Promise<UserCalculationRecord[]> {
  return getGuestCalculations();
}

export async function deleteUserCalculation(id: string): Promise<UserCalculationRecord[]> {
  return deleteGuestCalculation(id);
}

export async function clearUserCalculations(): Promise<void> {
  clearGuestCalculations();
}


export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Image upload failed');
  }
  return res.json();
}

// ---------------- Admin Endpoints ----------------

export async function adminLogin(emailOrPassword: string, password?: string): Promise<boolean> {
  const payload = password !== undefined
    ? { email: emailOrPassword, password }
    : { email: 'shivshahidoors@gmail.com', password: emailOrPassword };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return false;
    }
    const data = await res.json();
    if (data.token) {
      setAdminToken(data.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function resetAdminDefaultPassword(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/reset-default-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminLogout(): Promise<void> {
  const token = getAdminToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {
      // ignore network errors on logout
    }
  }
  clearAdminToken();
}

export async function checkAdminAuth(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/auth/verify', {
      headers: authHeaders(),
    });
    const data = await res.json();
    return Boolean(data.authenticated);
  } catch {
    return false;
  }
}

export async function fetchAdminAllData(): Promise<{
  doors: Door[];
  categories: Category[];
  materials: DoorMaterial[];
  finishes: PolishFinish[];
  frames: ChaukhatFrame[];
  hardware: HardwareItem[];
  banners: HomeBanner[];
  articles: Article[];
  quotes: Quotation[];
  settings: BusinessSettings;
  teamMembers?: TeamMember[];
}> {
  const res = await fetch('/api/admin/all-data', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Unauthorized or failed to fetch admin data');
  return res.json();
}

// Door CRUD
export async function createDoor(door: Partial<Door>): Promise<Door> {
  const res = await fetch('/api/admin/doors', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(door),
  });
  if (!res.ok) throw new Error('Failed to create door');
  return res.json();
}

export async function updateDoor(id: string, door: Partial<Door>): Promise<Door> {
  const res = await fetch(`/api/admin/doors/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(door),
  });
  if (!res.ok) throw new Error('Failed to update door');
  return res.json();
}

export async function deleteDoor(id: string): Promise<void> {
  const res = await fetch(`/api/admin/doors/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete door');
}

// Material CRUD
export async function createMaterial(data: Partial<DoorMaterial>): Promise<DoorMaterial> {
  const res = await fetch('/api/admin/materials', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create material');
  return res.json();
}

export async function updateMaterial(id: string, data: Partial<DoorMaterial>): Promise<DoorMaterial> {
  const res = await fetch(`/api/admin/materials/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update material');
  return res.json();
}

export async function deleteMaterial(id: string): Promise<void> {
  const res = await fetch(`/api/admin/materials/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete material');
}

// Finish CRUD
export async function createFinish(data: Partial<PolishFinish>): Promise<PolishFinish> {
  const res = await fetch('/api/admin/finishes', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create finish');
  return res.json();
}

export async function updateFinish(id: string, data: Partial<PolishFinish>): Promise<PolishFinish> {
  const res = await fetch(`/api/admin/finishes/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update finish');
  return res.json();
}

export async function deleteFinish(id: string): Promise<void> {
  const res = await fetch(`/api/admin/finishes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete finish');
}

// Frame CRUD
export async function createFrame(data: Partial<ChaukhatFrame>): Promise<ChaukhatFrame> {
  const res = await fetch('/api/admin/frames', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create frame');
  return res.json();
}

export async function updateFrame(id: string, data: Partial<ChaukhatFrame>): Promise<ChaukhatFrame> {
  const res = await fetch(`/api/admin/frames/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update frame');
  return res.json();
}

export async function deleteFrame(id: string): Promise<void> {
  const res = await fetch(`/api/admin/frames/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete frame');
}

// Hardware CRUD
export async function createHardware(data: Partial<HardwareItem>): Promise<HardwareItem> {
  const res = await fetch('/api/admin/hardware', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create hardware item');
  return res.json();
}

export async function updateHardware(id: string, data: Partial<HardwareItem>): Promise<HardwareItem> {
  const res = await fetch(`/api/admin/hardware/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update hardware');
  return res.json();
}

export async function deleteHardware(id: string): Promise<void> {
  const res = await fetch(`/api/admin/hardware/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete hardware');
}

// Banner CRUD
export async function createBanner(data: Partial<HomeBanner>): Promise<HomeBanner> {
  const res = await fetch('/api/admin/banners', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create banner');
  return res.json();
}

export async function updateBanner(id: string, data: Partial<HomeBanner>): Promise<HomeBanner> {
  const res = await fetch(`/api/admin/banners/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update banner');
  return res.json();
}

export async function deleteBanner(id: string): Promise<void> {
  const res = await fetch(`/api/admin/banners/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete banner');
}

// Article CRUD
export async function createArticle(data: Partial<Article>): Promise<Article> {
  const res = await fetch('/api/admin/articles', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create article');
  return res.json();
}

export async function updateArticle(id: string, data: Partial<Article>): Promise<Article> {
  const res = await fetch(`/api/admin/articles/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update article');
  return res.json();
}

export async function deleteArticle(id: string): Promise<void> {
  const res = await fetch(`/api/admin/articles/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete article');
}

// ---------------- Blog & Article Endpoints ----------------

// Fetch full articles with search, category, tag, sort
export async function fetchArticles(params?: {
  q?: string;
  category?: string;
  tag?: string;
  sort?: 'latest' | 'popular' | 'views' | 'likes';
}): Promise<{ articles: Article[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.category) query.set('category', params.category);
  if (params?.tag) query.set('tag', params.tag);
  if (params?.sort) query.set('sort', params.sort);

  const res = await fetch(`/api/articles?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch articles');
  return res.json();
}

export async function fetchArticleCategories(): Promise<ArticleCategory[]> {
  const res = await fetch('/api/articles/categories');
  if (!res.ok) throw new Error('Failed to fetch article categories');
  const json = await res.json();
  return json.categories || [];
}

export async function fetchArticleDetails(slugOrId: string): Promise<{
  article: Article;
  comments: ArticleComment[];
  relatedDoors: Door[];
  relatedArticles: Article[];
}> {
  const res = await fetch(`/api/articles/${encodeURIComponent(slugOrId)}`);
  if (!res.ok) throw new Error('Failed to fetch article details');
  return res.json();
}

export async function registerArticleView(id: string, viewerHash?: string): Promise<{ views: number; counted: boolean }> {
  const res = await fetch(`/api/articles/${id}/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ viewerHash }),
  });
  if (!res.ok) return { views: 0, counted: false };
  return res.json();
}

export async function toggleArticleLike(id: string, likerHash?: string): Promise<{ liked: boolean; likes: number }> {
  const res = await fetch(`/api/articles/${id}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ likerHash }),
  });
  if (!res.ok) throw new Error('Failed to toggle like');
  return res.json();
}

export async function registerArticleShare(id: string, platform?: string): Promise<{ shares: number }> {
  const res = await fetch(`/api/articles/${id}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform }),
  });
  if (!res.ok) return { shares: 0 };
  return res.json();
}

export async function submitArticleComment(
  id: string,
  data: { authorName?: string; authorEmail?: string; content: string }
): Promise<{ success: boolean; comment: ArticleComment; message: string }> {
  const res = await fetch(`/api/articles/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to submit comment');
  return json;
}

export async function fetchArticleComments(id: string): Promise<ArticleComment[]> {
  const res = await fetch(`/api/articles/${id}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  const json = await res.json();
  return json.comments || [];
}

// User Bookmarks (Article Favorites)
const GUEST_SAVED_ARTICLES_KEY = 'shivshahi_guest_saved_articles';

export function getGuestSavedArticles(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_SAVED_ARTICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleGuestSavedArticle(articleId: string): string[] {
  const current = getGuestSavedArticles();
  const exists = current.includes(articleId);
  const updated = exists ? current.filter(id => id !== articleId) : [...current, articleId];
  try {
    localStorage.setItem(GUEST_SAVED_ARTICLES_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export async function toggleUserArticleBookmark(articleId: string): Promise<{ isFavorite: boolean; favoriteArticleIds: string[] }> {
  const updated = toggleGuestSavedArticle(articleId);
  return { isFavorite: updated.includes(articleId), favoriteArticleIds: updated };
}

export async function fetchUserSavedArticles(): Promise<{ favoriteArticles: Article[]; favoriteArticleIds: string[] }> {
  const ids = getGuestSavedArticles();
  return { favoriteArticles: [], favoriteArticleIds: ids };
}

// Admin Article Management
export async function fetchAdminArticles(): Promise<Article[]> {
  const res = await fetch('/api/admin/articles', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load articles');
  return res.json();
}

export async function fetchAdminArticleComments(params?: {
  status?: string;
  articleId?: string;
}): Promise<{
  comments: (ArticleComment & { articleTitle?: string; articleSlug?: string })[];
  counts: { all: number; pending: number; approved: number; hidden: number; spam: number };
}> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.articleId) query.set('articleId', params.articleId);

  const res = await fetch(`/api/admin/articles/comments?${query.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load comments');
  return res.json();
}

export async function moderateArticleComment(commentId: string, status: string): Promise<ArticleComment> {
  const res = await fetch(`/api/admin/articles/comments/${commentId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update comment status');
  return json.comment;
}

export async function replyToArticleComment(
  commentId: string,
  text: string,
  authorName?: string
): Promise<ArticleComment> {
  const res = await fetch(`/api/admin/articles/comments/${commentId}/reply`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text, authorName }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to reply to comment');
  return json.comment;
}

export async function deleteArticleComment(commentId: string): Promise<void> {
  const res = await fetch(`/api/admin/articles/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete comment');
}

export async function fetchArticleAnalytics(): Promise<ArticleAnalyticsSummary> {
  const res = await fetch('/api/admin/articles/analytics', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  const json = await res.json();
  return json.summary;
}

export async function fetchAdminArticleCategories(): Promise<ArticleCategory[]> {
  const res = await fetch('/api/admin/article-categories', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function createArticleCategory(data: Partial<ArticleCategory>): Promise<ArticleCategory> {
  const res = await fetch('/api/admin/article-categories', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create category');
  return res.json();
}

export async function updateArticleCategory(id: string, data: Partial<ArticleCategory>): Promise<ArticleCategory> {
  const res = await fetch(`/api/admin/article-categories/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update category');
  return res.json();
}

export async function deleteArticleCategory(id: string): Promise<void> {
  const res = await fetch(`/api/admin/article-categories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete category');
}

// Settings
export async function updateSettings(data: Partial<BusinessSettings> & { adminPassword?: string }): Promise<BusinessSettings> {
  const res = await fetch('/api/admin/settings', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  const resData = await res.json();
  return resData.settings;
}

// Quotes
export async function fetchQuotes(): Promise<Quotation[]> {
  const res = await fetch('/api/admin/quotes', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch quotes');
  return res.json();
}

export async function deleteQuote(id: string): Promise<void> {
  const res = await fetch(`/api/admin/quotes/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete quote');
}

// ---------------- Database Backup & Restore Endpoints ----------------

export interface BackupSummary {
  filename: string;
  timestamp: string;
  sizeBytes: number;
  doorCount: number;
  articleCount: number;
  teamCount: number;
}

export async function exportDatabaseBackup(): Promise<Blob> {
  const res = await fetch('/api/admin/backup/export', {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to export backup');
  }
  return res.blob();
}

export async function importDatabaseBackup(backupData: any): Promise<{ success: boolean; message: string; doorCount: number }> {
  const res = await fetch('/api/admin/backup/import', {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(backupData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to restore backup');
  }
  return res.json();
}

export async function fetchBackupsList(): Promise<BackupSummary[]> {
  const res = await fetch('/api/admin/backup/list', {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch backups list');
  }
  const data = await res.json();
  return data.backups || [];
}

export async function restoreLocalBackup(filename: string): Promise<{ success: boolean; message: string; doorCount: number }> {
  const res = await fetch('/api/admin/backup/restore-local', {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to restore snapshot');
  }
  return res.json();
}

// Protected reset defaults (deprecated - protected on server)
export async function resetDatabase(): Promise<void> {
  const res = await fetch('/api/admin/reset-defaults', {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Direct factory reset is disabled in production to protect data');
  }
}

// ---------------- Push Notification Endpoints ----------------

export async function fetchNotificationConfig(): Promise<{
  isConfigured: boolean;
  projectId?: string;
  vapidKey: string | null;
  firebaseClientConfig: any | null;
}> {
  const res = await fetch('/api/notifications/config');
  if (!res.ok) throw new Error('Failed to fetch notification config');
  return res.json();
}

export async function registerDeviceToken(data: {
  token: string;
  deviceId: string;
  platform?: 'web' | 'android' | 'ios' | 'pwa';
  browser?: string;
  permission?: 'granted' | 'denied' | 'default';
  preferences?: Partial<NotificationPreferences>;
}): Promise<{ success: boolean; tokenRecord: NotificationTokenRecord }> {
  const res = await fetch('/api/notifications/register-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to register notification token');
  }
  return res.json();
}

export async function fetchNotificationPreferences(deviceId?: string): Promise<{
  preferences: NotificationPreferences;
}> {
  const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
  const res = await fetch(`/api/notifications/preferences${query}`);
  if (!res.ok) throw new Error('Failed to fetch notification preferences');
  return res.json();
}

export async function updateNotificationPreferences(data: {
  deviceId?: string;
  token?: string;
  preferences: Partial<NotificationPreferences>;
}): Promise<{ success: boolean }> {
  const res = await fetch('/api/notifications/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update notification preferences');
  return res.json();
}

// Admin Notification Endpoints
export async function fetchAdminNotificationStats(): Promise<NotificationStats> {
  const res = await fetch('/api/admin/notifications/stats', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load notification statistics');
  return res.json();
}

export async function fetchAdminNotificationCampaigns(): Promise<NotificationCampaign[]> {
  const res = await fetch('/api/admin/notifications/campaigns', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load notification campaigns');
  return res.json();
}

export async function sendAdminNotification(data: {
  title: string;
  message: string;
  image?: string;
  category?: string;
  targetAudience?: string;
  deepLink?: string;
  doorId?: string;
  scheduleTime?: string;
}): Promise<{
  success: boolean;
  status: 'sent' | 'scheduled';
  message: string;
  result?: any;
  campaign: NotificationCampaign;
}> {
  const res = await fetch('/api/admin/notifications/send', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const resJson = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resJson.error || 'Unable to send notification. Please try again.');
  }
  return resJson;
}

export async function cancelAdminScheduledNotification(id: string): Promise<{ success: boolean; campaign: NotificationCampaign }> {
  const res = await fetch(`/api/admin/notifications/cancel-scheduled/${id}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to cancel scheduled notification');
  return res.json();
}

export async function deleteAdminNotificationCampaign(id: string): Promise<void> {
  const res = await fetch(`/api/admin/notifications/campaign/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete notification campaign');
}

// ---------------- Team Management Endpoints ----------------

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch('/api/team-members');
  if (!res.ok) throw new Error('Failed to fetch team members');
  const data = await res.json();
  return data.teamMembers || [];
}

export async function fetchAdminTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch('/api/admin/team-members', {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch team members');
  const data = await res.json();
  return data.teamMembers || [];
}

export async function createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
  const res = await fetch('/api/admin/team-members', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create team member');
  }
  const json = await res.json();
  return json.member;
}

export async function updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
  const res = await fetch(`/api/admin/team-members/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update team member');
  }
  const json = await res.json();
  return json.member;
}

export async function toggleTeamMemberActive(id: string): Promise<{ success: boolean; active: boolean; member: TeamMember }> {
  const res = await fetch(`/api/admin/team-members/${id}/toggle-active`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to toggle team member active status');
  }
  return res.json();
}

export async function reorderTeamMembers(orderList: { id: string; displayOrder: number }[]): Promise<TeamMember[]> {
  const res = await fetch('/api/admin/team-members-reorder', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ orderList }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reorder team members');
  }
  const json = await res.json();
  return json.teamMembers || [];
}

export async function deleteTeamMember(id: string): Promise<void> {
  const res = await fetch(`/api/admin/team-members/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete team member');
  }
}

// ---------------- Customer Enquiries & Contact Us Endpoints ----------------

export async function submitCustomerEnquiry(data: {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  enquiryType?: string;
  doorId?: string;
  doorName?: string;
  message: string;
}): Promise<{ success: boolean; enquiry: { id: string; name: string }; message: string }> {
  const res = await fetch('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit enquiry. Please try again.');
  }
  return res.json();
}

export async function fetchAdminEnquiries(): Promise<CustomerEnquiry[]> {
  const res = await fetch('/api/admin/enquiries', {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch customer enquiries');
  }
  const json = await res.json();
  return json.enquiries || [];
}

export async function updateAdminEnquiryStatus(
  id: string,
  status: 'new' | 'contacted' | 'resolved'
): Promise<CustomerEnquiry> {
  const res = await fetch(`/api/admin/enquiries/${id}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update enquiry status');
  }
  const json = await res.json();
  return json.enquiry;
}

export async function deleteAdminEnquiry(id: string): Promise<void> {
  const res = await fetch(`/api/admin/enquiries/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete enquiry');
  }
}



