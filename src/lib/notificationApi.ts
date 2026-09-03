import { AuthApiError } from './authValidation';
import { getStoredToken, storeToken } from './authApi';

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  '/api';

export type ApiNotification = {
  id: string;
  title: string;
  message: string;
  type?: string;
  relatedOrderId?: string;
  read?: boolean;
  createdAt?: string;
};

function apiUrl(path: string): string {
  const base = String(API_BASE).replace(/\/$/, '');
  const relative = path.startsWith('/') ? path : `/${path}`;
  return `${base}${relative}`;
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.message === 'string') return data.message;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  if (!token) throw new AuthApiError(401, 'Please sign in to continue.');

  const headers = new Headers(init.headers || {});
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(apiUrl(path), { ...init, headers });
  } catch {
    throw new AuthApiError(0, 'Network error');
  }

  const refreshed = res.headers.get('Authorization');
  if (refreshed?.toLowerCase().startsWith('bearer ')) {
    storeToken(refreshed.slice(7).trim());
  }

  if (!res.ok) {
    throw new AuthApiError(res.status, await parseErrorMessage(res));
  }
  return res;
}

export async function fetchNotifications(): Promise<ApiNotification[]> {
  const res = await authFetch('/notifications');
  const data = (await res.json()) as ApiNotification[];
  return Array.isArray(data) ? data : [];
}

export async function markAllNotificationsRead(): Promise<void> {
  await authFetch('/notifications/read-all', { method: 'POST' });
}
