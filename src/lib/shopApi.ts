import { AuthApiError } from './authValidation';
import { getStoredToken, storeToken } from './authApi';

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  '/api';

export type ApiProductImage = {
  id?: string;
  path?: string;
  altText?: string;
};

export type ApiProduct = {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  stock: number;
  deleted?: boolean;
  images?: ApiProductImage[];
};

export type ApiCartItem = {
  id: string;
  quantity: number;
  price?: number;
  product: ApiProduct;
};

export type ApiCart = {
  id: string;
  totalPrice?: number;
  cartItems?: ApiCartItem[];
};

export type ApiOrderItem = {
  id: string;
  quantity: number;
  price: number;
  product?: ApiProduct;
};

export type ApiOrder = {
  id: string;
  totalPrice: number;
  status?: string;
  createdAt?: string;
  orderItems?: ApiOrderItem[];
  stripeCheckoutSessionId?: string;
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
    if (typeof data?.error === 'string') return data.error;
  } catch {
    try {
      const text = await res.text();
      if (text && text.length < 300) return text;
    } catch {
      /* ignore */
    }
  }
  return res.statusText || 'Request failed';
}

function captureRefreshedToken(res: Response) {
  const refreshed = res.headers.get('Authorization');
  if (refreshed?.toLowerCase().startsWith('bearer ')) {
    storeToken(refreshed.slice(7).trim());
  }
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

  captureRefreshedToken(res);

  if (!res.ok) {
    throw new AuthApiError(res.status, await parseErrorMessage(res));
  }
  return res;
}

export async function fetchProducts(): Promise<ApiProduct[]> {
  let res: Response;
  try {
    res = await fetch(apiUrl('/products/index'), { headers: { Accept: 'application/json' } });
  } catch {
    throw new AuthApiError(0, 'Network error');
  }
  if (!res.ok) throw new AuthApiError(res.status, await parseErrorMessage(res));
  const data = (await res.json()) as ApiProduct[];
  return Array.isArray(data) ? data.filter((p) => !p.deleted) : [];
}

export async function fetchCart(): Promise<ApiCart | null> {
  const res = await authFetch('/carts/show');
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as ApiCart;
}

export async function addCartItem(productId: string, quantity: number): Promise<void> {
  const params = new URLSearchParams({
    productId,
    quantity: String(quantity),
  });
  await authFetch(`/carts/store?${params.toString()}`, { method: 'POST' });
}

export async function updateCartItem(productId: string, quantity: number): Promise<void> {
  const params = new URLSearchParams({
    productId,
    quantity: String(quantity),
  });
  await authFetch(`/carts/update?${params.toString()}`, { method: 'PUT' });
}

export async function deleteCartItem(productId: string): Promise<void> {
  const params = new URLSearchParams({ productId });
  await authFetch(`/carts/delete?${params.toString()}`, { method: 'DELETE' });
}

/** Rebuild server cart to match UI lines (merged by productId). */
export async function syncCartToApi(
  lines: { productId: string; quantity: number }[],
): Promise<void> {
  const existing = await fetchCart();
  const existingItems = existing?.cartItems ?? [];

  for (const line of existingItems) {
    const pid = String(line.product?.id ?? '');
    if (!pid) continue;
    const stillWanted = lines.find((l) => l.productId === pid);
    if (!stillWanted) {
      await deleteCartItem(pid);
    }
  }

  const fresh = await fetchCart();
  const freshMap = new Map(
    (fresh?.cartItems ?? []).map((i) => [String(i.product?.id ?? ''), i.quantity] as const),
  );

  for (const line of lines) {
    if (line.quantity <= 0) continue;
    const current = freshMap.get(line.productId);
    if (current == null) {
      await addCartItem(line.productId, line.quantity);
    } else if (current !== line.quantity) {
      await updateCartItem(line.productId, line.quantity);
    }
  }
}

export async function createCheckoutSession(): Promise<{ sessionId: string; checkoutUrl: string }> {
  const res = await authFetch('/checkout', { method: 'POST' });
  const data = (await res.json()) as { sessionId?: string; checkoutUrl?: string };
  if (!data.checkoutUrl || !data.sessionId) {
    throw new AuthApiError(500, 'Checkout session missing URL');
  }
  return { sessionId: data.sessionId, checkoutUrl: data.checkoutUrl };
}

export async function confirmCheckoutSession(sessionId: string): Promise<void> {
  const params = new URLSearchParams({ sessionId });
  await authFetch(`/checkout/confirm?${params.toString()}`, { method: 'POST' });
}

export async function fetchOrderHistory(): Promise<ApiOrder[]> {
  const res = await authFetch('/orders/history');
  const data = (await res.json()) as ApiOrder[];
  return Array.isArray(data) ? data : [];
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { getAdminToken } = await import('./adminAuth');
  const token = getAdminToken();
  if (!token) throw new AuthApiError(401, 'Admin sign-in required.');

  const headers = new Headers(init.headers || {});
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(apiUrl(path), { ...init, headers });
  } catch {
    throw new AuthApiError(0, 'Network error');
  }
  if (!res.ok) {
    throw new AuthApiError(res.status, await parseErrorMessage(res));
  }
  return res;
}

/** Absolute stock update via admin product update (multipart). */
export async function adminUpdateProductStock(
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
  },
): Promise<ApiProduct> {
  const form = new FormData();
  form.set('name', product.name);
  form.set('description', product.description || '');
  form.set('price', String(product.price));
  form.set('stock', String(product.stock));
  const res = await adminFetch(`/products/update/${product.id}`, {
    method: 'PUT',
    body: form,
  });
  return (await res.json()) as ApiProduct;
}

export async function fetchAdminOrders(): Promise<ApiOrder[]> {
  const res = await adminFetch('/orders/admin');
  const data = (await res.json()) as ApiOrder[];
  return Array.isArray(data) ? data : [];
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: string,
): Promise<ApiOrder> {
  const res = await adminFetch(`/orders/admin/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return (await res.json()) as ApiOrder;
}
