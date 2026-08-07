import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Lock, Eye, EyeOff, AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import { GroceryItem, Order } from '../types';
import AdminDashboard from './AdminDashboard';
import { loginAdmin } from '../lib/authApi';
import { AuthApiError } from '../lib/authValidation';
import {
  DEMO_ADMIN_PASSWORD,
  clearAdminAuth,
  getAdminSession,
  setAdminSession,
  setAdminToken,
} from '../lib/adminAuth';

type AdminPageProps = {
  groceries: GroceryItem[];
  orders: Order[];
  onRestock: (itemId: string, amount: number) => void;
  onUpdateOrderStatus: (orderId: string, status: any, step: number) => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
  onAddNotification: (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'order' | 'inventory'
  ) => void;
};

export default function AdminPage({
  groceries,
  orders,
  onRestock,
  onUpdateOrderStatus,
  onAddToast,
  onAddNotification,
}: AdminPageProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getAdminSession());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const handleLogout = () => {
    clearAdminAuth();
    setSession(null);
    onAddToast('Admin signed out', 'You left the Admin Hub.', 'info');
    navigate('/');
  };

  const validate = () => {
    const next: { username?: string; password?: string } = {};
    if (!username.trim()) next.username = 'Please enter an admin username.';
    if (!password) next.password = 'Please enter your password.';
    else if (password.length < 4) next.password = 'Password looks too short.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      // Prefer Spring admin API when available
      const token = await loginAdmin(username.trim(), password);
      setAdminToken(token);
      const next = { username: username.trim(), via: 'api' as const };
      setAdminSession(next);
      setSession(next);
      onAddToast('Admin unlocked', 'Welcome to the Admin Hub.', 'success');
    } catch (err) {
      // Local demo fallback (no backend / wrong API admin)
      if (password === DEMO_ADMIN_PASSWORD) {
        setAdminToken(null);
        const next = {
          username: username.trim() || 'admin',
          via: 'demo' as const,
        };
        setAdminSession(next);
        setSession(next);
        onAddToast('Admin unlocked', 'Demo admin session started.', 'success');
      } else if (err instanceof AuthApiError && err.status === 0) {
        setError(
          `Can’t reach the API. For local demo, use password “${DEMO_ADMIN_PASSWORD}”.`
        );
      } else if (err instanceof AuthApiError && err.status === 401) {
        setError('Incorrect admin username or password.');
      } else {
        setError('Could not sign in. Check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (session) {
    return (
      <AdminDashboard
        variant="page"
        groceries={groceries}
        orders={orders}
        onRestock={onRestock}
        onUpdateOrderStatus={onUpdateOrderStatus}
        onAddToast={onAddToast}
        onAddNotification={onAddNotification}
        onClose={handleLogout}
        adminLabel={session.username}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F0F] text-slate-800 dark:text-slate-200 flex flex-col">
      <header className="border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#121212]/90 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to store
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            Admin route
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121212] shadow-xl p-6 sm:p-8 relative overflow-hidden">
          <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />

          <div className="relative flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
              <Leaf className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
                Admin Hub
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sign in at <code className="font-mono text-emerald-600 dark:text-emerald-400">/admin</code>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative space-y-3.5" noValidate>
            <div>
              <label className={`mb-1 block text-xs font-semibold ${fieldErrors.username ? 'text-red-600' : 'text-slate-500'}`}>
                Username
              </label>
              <input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) {
                    setFieldErrors((p) => ({ ...p, username: undefined }));
                  }
                }}
                autoComplete="username"
                placeholder="Admin username"
                className={`w-full rounded-xl border bg-white dark:bg-[#161616] px-3.5 py-3 text-sm outline-hidden placeholder:text-slate-400 ${
                  fieldErrors.username
                    ? 'border-red-400 ring-2 ring-red-400/25'
                    : 'border-slate-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                }`}
              />
              {fieldErrors.username && (
                <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label className={`mb-1 block text-xs font-semibold ${fieldErrors.password ? 'text-red-600' : 'text-slate-500'}`}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((p) => ({ ...p, password: undefined }));
                    }
                  }}
                  autoComplete="current-password"
                  placeholder="Admin password"
                  className={`w-full rounded-xl border bg-white dark:bg-[#161616] px-3.5 py-3 pr-11 text-sm outline-hidden placeholder:text-slate-400 ${
                    fieldErrors.password
                      ? 'border-red-400 ring-2 ring-red-400/25'
                      : 'border-slate-200 dark:border-white/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3.5 py-3 text-sm font-medium text-red-700 dark:text-red-300"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 py-3.5 text-sm font-extrabold text-black shadow-lg shadow-emerald-500/25 disabled:opacity-60 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              {isLoading ? 'Signing in…' : 'Sign in to Admin Hub'}
            </button>

            <p className="text-[11px] text-center text-slate-400 pt-1">
              Demo fallback password: <span className="font-mono text-slate-500">{DEMO_ADMIN_PASSWORD}</span>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
