import type { UserProfile } from '../types';
import { AuthApiError } from './authValidation';

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  '/api';

const TOKEN_KEY = 'aura-fresh-auth-token';

export type AuthProvider = 'LOCAL' | 'GOOGLE' | 'APPLE';

export type AuthUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  provider?: AuthProvider | string;
};

/** Guest / signed-out profile — no demo customer data. */
export function createEmptyProfile(): UserProfile {
  return {
    id: '',
    name: '',
    email: '',
    avatarUrl: '',
    loyaltyPoints: 0,
    balance: 0,
    orderHistory: [],
    redeemedCoupons: [],
    walletTopUpsUsed: 0,
    addresses: [],
    paymentMethods: [],
  };
}

export function avatarUrlForName(name: string): string {
  const label = name.trim() || 'Aura';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=10b981&color=ffffff&size=128`;
}

/** Map API auth user onto UI profile, clearing leftover demo fields for new accounts. */
export function profileFromAuthUser(user: AuthUser, displayName: string, prev?: UserProfile): UserProfile {
  const sameUser = Boolean(prev?.id && user.id && prev.id === user.id);
  const base = sameUser && prev ? prev : createEmptyProfile();
  const name = displayName.trim() || displayNameFromUser(user);
  return {
    ...base,
    id: user.id || base.id,
    name,
    email: user.email?.trim() || (sameUser ? base.email : ''),
    authProvider: user.provider || base.authProvider,
    avatarUrl: sameUser && prev?.avatarUrl ? prev.avatarUrl : avatarUrlForName(name),
  };
}

function apiUrl(path: string): string {
  const base = String(API_BASE).replace(/\/$/, '');
  const relative = path.startsWith('/') ? path : `/${path}`;
  return `${base}${relative}`;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.error === 'string') return data.error;
    if (typeof data === 'string') return data;
  } catch {
    try {
      const text = await res.text();
      if (text && text.length < 300) return text;
    } catch {
      /* ignore */
    }
  }
  return '';
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new AuthApiError(0, 'Network error');
  }

  if (!res.ok) {
    throw new AuthApiError(res.status, await parseErrorMessage(res));
  }

  return res.json() as Promise<T>;
}

export async function loginUser(username: string, password: string): Promise<string> {
  const data = await postJson<{ token: string }>('/auth/users/login', { username, password });
  if (!data?.token) throw new AuthApiError(500, 'Missing token');
  storeToken(data.token);
  return data.token;
}

export async function registerUser(payload: {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}): Promise<string> {
  const data = await postJson<{ token: string }>('/auth/users/register', payload);
  if (!data?.token) throw new AuthApiError(500, 'Missing token');
  storeToken(data.token);
  return data.token;
}

export async function loginWithSocial(
  provider: 'GOOGLE' | 'APPLE',
  idToken: string
): Promise<string> {
  const data = await postJson<{ token: string }>('/auth/social', { provider, idToken });
  if (!data?.token) throw new AuthApiError(500, 'Missing token');
  storeToken(data.token);
  return data.token;
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  let res: Response;
  try {
    res = await fetch(apiUrl('/users/token'), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new AuthApiError(0, 'Network error');
  }

  if (!res.ok) {
    throw new AuthApiError(res.status, await parseErrorMessage(res));
  }

  const user = (await res.json()) as AuthUser & { id?: string };
  return {
    id: String(user.id ?? ''),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    provider: user.provider,
  };
}

export function displayNameFromUser(user: AuthUser): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || user.username || user.email || 'Customer';
}
