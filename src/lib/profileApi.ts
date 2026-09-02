import { AuthApiError } from './authValidation';
import { getStoredToken, storeToken } from './authApi';
import type { DeliveryAddress } from '../types';

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  '/api';

export type ApiProfile = {
  id?: string;
  address1?: string;
  address2?: string;
  unit?: string;
  floor?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
};

export type UpdateProfilePayload = {
  address1?: string;
  address2?: string;
  unit?: string;
  floor?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
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

export async function fetchProfile(): Promise<ApiProfile | null> {
  const res = await authFetch('/users/profiles/show');
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as ApiProfile;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<void> {
  await authFetch('/users/profiles/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/** Map API profile (single address) into the UI address list. */
export function profileToAddresses(profile: ApiProfile | null): DeliveryAddress[] {
  if (!profile?.address1?.trim()) return [];
  const line = [profile.address1, profile.address2, profile.unit, profile.floor]
    .filter(Boolean)
    .join(', ');
  return [
    {
      id: 'addr_primary',
      name: 'Primary delivery',
      addressLine: line,
      city: profile.city || 'Yangon',
      state: profile.state || 'Yangon Region',
      zipCode: profile.zipCode || '',
      phone: '',
      isDefault: true,
    },
  ];
}

/** Convert a UI delivery address into the backend profile update shape. */
export function addressToProfileUpdate(address: DeliveryAddress): UpdateProfilePayload {
  const baseLine = address.addressLine.split(' (')[0]?.trim() || address.addressLine;
  return {
    address1: baseLine,
    city: address.city,
    state: address.state,
    country: 'Myanmar',
    zipCode: address.zipCode || undefined,
  };
}

export async function persistDefaultAddress(addresses: DeliveryAddress[]): Promise<void> {
  const target = addresses.find((a) => a.isDefault) || addresses[0];
  if (!target?.addressLine?.trim()) return;
  await updateProfile(addressToProfileUpdate(target));
}
