import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Lock, Eye, EyeOff, AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import { GroceryItem, Order, OrderStatus } from '../types';
import AdminDashboard from './AdminDashboard';
import { loginAdmin } from '../lib/authApi';
import { AuthApiError } from '../lib/authValidation';
import {
  clearAdminAuth,
  getAdminSession,
  getAdminToken,
  setAdminSession,
  setAdminToken,
} from '../lib/adminAuth';
import {
  adminUpdateOrderStatus,
  adminUpdateProductStock,
  fetchAdminOrders,
  fetchProducts,
} from '../lib/shopApi';
import { mapApiOrderToUiOrder, mapProductToGrocery } from '../lib/mapProduct';

type AdminPageProps = {
  groceries: GroceryItem[];
  orders: Order[];
  onRestock: (itemId: string, amount: number) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus, step: number) => void;
  onGroceriesLoaded: (items: GroceryItem[]) => void;
  onOrdersLoaded: (orders: Order[]) => void;
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
  onGroceriesLoaded,
  onOrdersLoaded,
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
  const [adminOrders, setAdminOrders] = useState<Order[]>(orders);
  const [busy, setBusy] = useState(false);

  const refreshAdminData = useCallback(async () => {
    if (!getAdminToken()) return;
    try {
      const [apiOrders, apiProducts] = await Promise.all([
        fetchAdminOrders(),
        fetchProducts(),
      ]);
      const mappedGroceries = apiProducts.map(mapProductToGrocery);
      const mappedOrders = apiOrders.map((o) => mapApiOrderToUiOrder(o, mappedGroceries));
      setAdminOrders(mappedOrders);
      onGroceriesLoaded(mappedGroceries);
      onOrdersLoaded(mappedOrders);
    } catch (err) {
      onAddToast(
        'Admin sync failed',
        err instanceof Error ? err.message : 'Could not refresh admin data.',
        'warning',
      );
    }
  }, [onAddToast, onGroceriesLoaded, onOrdersLoaded]);

  useEffect(() => {
    if (session && getAdminToken()) {
      void refreshAdminData();
    }
  }, [session, refreshAdminData]);

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
      const token = await loginAdmin(username.trim(), password);
      setAdminToken(token);
      const next = { username: username.trim(), via: 'api' as const };
      setAdminSession(next);
      setSession(next);
      onAddToast('Admin unlocked', 'Welcome to the Admin Hub.', 'success');
      await refreshAdminData();
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 0) {
        setError('Can’t reach the API. Start the Spring Boot backend and try again.');
      } else if (err instanceof AuthApiError && err.status === 401) {
        setError('Incorrect admin username or password.');
      } else {
        setError('Could not sign in. Check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestock = async (itemId: string, amount: number) => {
    const item = groceries.find((g) => g.id === itemId);
    if (!item) return;
    const newStock = Math.min(item.maxStock, item.stock + amount);
    setBusy(true);
    try {
      if (getAdminToken()) {
        await adminUpdateProductStock({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          stock: newStock,
        });
        const products = await fetchProducts();
        onGroceriesLoaded(products.map(mapProductToGrocery));
        onAddToast('Stock updated', `${item.name} → ${newStock} units (saved to API).`, 'success');
      } else {
        onRestock(itemId, amount);
        onAddToast('Local restock only', 'Sign in as admin to persist stock.', 'warning');
      }
    } catch (err) {
      onAddToast(
        'Restock failed',
        err instanceof Error ? err.message : 'Could not update stock.',
        'warning',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAdvanceOrder = async (orderId: string, status: OrderStatus, step: number) => {
    // Dashboard already computes next status; persist when admin token present
    setBusy(true);
    try {
      if (getAdminToken()) {
        const api = await adminUpdateOrderStatus(orderId, status);
        const mapped = mapApiOrderToUiOrder(api, groceries);
        setAdminOrders((prev) => prev.map((o) => (o.id === orderId ? mapped : o)));
        onUpdateOrderStatus(orderId, mapped.status, mapped.step ?? step);
        onAddToast('Order updated', `Status → ${mapped.status}`, 'success');
        await refreshAdminData();
      } else {
        onUpdateOrderStatus(orderId, status, step);
      }
    } catch (err) {
      onAddToast(
        'Order update failed',
        err instanceof Error ? err.message : 'Could not update order.',
        'warning',
      );
    } finally {
      setBusy(false);
    }
  };

  if (session) {
    return (
      <div className={busy ? 'opacity-90 pointer-events-none' : undefined}>
        <AdminDashboard
          variant="page"
          groceries={groceries}
          orders={adminOrders.length ? adminOrders : orders}
          onRestock={handleRestock}
          onUpdateOrderStatus={handleAdvanceOrder}
          onAddToast={onAddToast}
          onAddNotification={onAddNotification}
          onClose={handleLogout}
          adminLabel={session.username}
        />
      </div>
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
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-black">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-black text-lg">Admin Hub</h1>
              <p className="text-xs text-slate-500">Sign in with seeded admin credentials</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0F0F0F] px-3 py-2.5 text-sm"
                autoComplete="username"
              />
              {fieldErrors.username && (
                <p className="text-[11px] text-red-500 mt-1">{fieldErrors.username}</p>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0F0F0F] px-3 py-2.5 text-sm pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-red-500 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {error && (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
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
              Use the admin account from <code className="font-mono">ADMIN_SEED_*</code> in backend{' '}
              <code className="font-mono">.env</code>.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
