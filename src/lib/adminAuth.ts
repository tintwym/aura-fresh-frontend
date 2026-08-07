const ADMIN_SESSION_KEY = 'aura-fresh-admin-session';
const ADMIN_TOKEN_KEY = 'aura-fresh-admin-token';

export type AdminSession = {
  username: string;
  via: 'api' | 'demo';
};

export function getAdminSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession & { via?: string };
    // Drop legacy demo sessions
    if (parsed?.via === 'demo') {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }
    return parsed as AdminSession;
  } catch {
    return null;
  }
}

export function setAdminSession(session: AdminSession | null) {
  try {
    if (session) sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    else sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAdminAuth() {
  setAdminSession(null);
  setAdminToken(null);
}
