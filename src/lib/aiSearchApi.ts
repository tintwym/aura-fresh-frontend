const API_BASE = String(
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) || '/api',
).replace(/\/$/, '');

export type AiSearchPick = {
  product: { id: string; name: string; price: number; imageUrl?: string | null };
  reason: string;
};

export type AiSearchResult = {
  summary: string;
  products: AiSearchPick[];
};

/** Natural-language product search (POST /api/ai/search); Gemini runs on the backend. */
export async function aiSearch(query: string): Promise<AiSearchResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/ai/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query }),
    });
  } catch {
    throw new Error('Network error — check your connection.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'AI search is unavailable right now.');
  }
  const data = await res.json();
  return {
    summary: typeof data?.summary === 'string' ? data.summary : '',
    products: Array.isArray(data?.products) ? data.products : [],
  };
}
