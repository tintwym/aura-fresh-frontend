import { AuthApiError } from './authValidation';
import { getStoredToken, storeToken } from './authApi';

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  '/api';

export type SubmitReviewPayload = {
  productId: string;
  orderItemId: string;
  rating: number;
  comment: string;
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
    if (typeof data === 'string') return data;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

export async function submitReview(payload: SubmitReviewPayload): Promise<void> {
  const token = getStoredToken();
  if (!token) throw new AuthApiError(401, 'Please sign in to leave a review.');

  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  });

  let res: Response;
  try {
    res = await fetch(apiUrl('/reviews/store'), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
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
}
