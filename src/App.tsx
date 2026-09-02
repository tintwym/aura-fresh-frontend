import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Bell, ShoppingCart, Moon, Sun, ShieldAlert, Sparkles, MapPin,
  Check, Home, Truck, Mic, FileText, LogIn, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Domain types & Mock data
import { GroceryItem, CartItem, Order, UserProfile, OrderStatus } from './types';
import { INITIAL_GROCERIES } from './data/groceries';

// Subcomponents
import GroceryCatalog from './components/GroceryCatalog';
import CartAndCheckout from './components/CartAndCheckout';
import OrderTracker from './components/OrderTracker';
import UserProfileModal from './components/UserProfileModal';
import AuthModal from './components/AuthModal';
import NotificationCenter, { NotificationMsg } from './components/NotificationCenter';
import ToastContainer, { ToastMessage } from './components/ToastContainer';
import QuickReorder from './components/QuickReorder';
import SmartRecipes from './components/SmartRecipes';
import FeedbackModal from './components/FeedbackModal';
import VoiceSearchModal from './components/VoiceSearchModal';
import OrderCelebrationModal from './components/OrderCelebrationModal';
import OrderDetailsModal from './components/OrderDetailsModal';
import NavbarSearch from './components/NavbarSearch';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import {
  createEmptyProfile,
  displayNameFromUser,
  fetchCurrentUser,
  getStoredToken,
  profileFromAuthUser,
  storeToken,
} from './lib/authApi';
import { fetchOrderHistory, fetchProducts, fetchCart, syncCartToApi } from './lib/shopApi';
import { mapApiOrderToUiOrder, mapApiCartToCartItems, mapProductToGrocery } from './lib/mapProduct';
import {
  fetchProfile,
  persistDefaultAddress,
  profileToAddresses,
} from './lib/profileApi';
import { submitReview } from './lib/reviewApi';
import { AuthApiError } from './lib/authValidation';

export default function App() {
  type ThemePref = 'system' | 'light' | 'dark';
  const THEME_KEY = 'aura-fresh-theme';

  const readThemePref = (): ThemePref => {
    if (typeof window === 'undefined') return 'system';
    // One-time migration: old toggle locked OS sync off — restore System as default.
    const migrated = window.localStorage.getItem('aura-fresh-theme-v2');
    if (!migrated) {
      window.localStorage.setItem(THEME_KEY, 'system');
      window.localStorage.setItem('aura-fresh-theme-v2', '1');
      return 'system';
    }
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  };

  const [themePref, setThemePref] = useState<ThemePref>(readThemePref);
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const isDarkMode = themePref === 'system' ? systemDark : themePref === 'dark';

  const [selectedZone, setSelectedZone] = useState('All Zones');
  const [gdprBannerAccepted, setGdprBannerAccepted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('aura-fresh-gdpr-consent') === '1';
  });

  const dismissGdprBanner = () => {
    setGdprBannerAccepted(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('aura-fresh-gdpr-consent', '1');
    }
  };

  // Always track OS preference so “system” mode stays in sync
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    setSystemDark(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', onChange);
    } else {
      mediaQuery.addListener(onChange);
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', onChange);
      } else {
        mediaQuery.removeListener(onChange);
      }
    };
  }, []);

  // Drive Tailwind `dark:` via <html class="dark"> (class strategy)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    root.style.colorScheme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);

  // Cycle: System (auto) → Light → Dark → System
  const toggleTheme = () => {
    setThemePref((prev) => {
      const next: ThemePref =
        prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system';
      window.localStorage.setItem(THEME_KEY, next);
      return next;
    });
  };

  const themeLabel =
    themePref === 'system'
      ? `Theme: System (${isDarkMode ? 'dark' : 'light'})`
      : themePref === 'dark'
        ? 'Theme: Dark'
        : 'Theme: Light';
  // Modal Open/Close States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(() => !!getStoredToken());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [showFeedbackOrder, setShowFeedbackOrder] = useState<Order | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [celebratingOrder, setCelebratingOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  // Core Data States
  const [groceries, setGroceries] = useState<GroceryItem[]>(INITIAL_GROCERIES);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [purchaseCounts, setPurchaseCounts] = useState<Record<string, number>>({
    'g1': 5, // Shwe Bo Paw San Premium Rice
    'g6': 4, // Pyin Oo Lwin Highland Coffee Beans
    'g2': 3, // Shan State Organic Avocados
    'g8': 2  // Milk
  });

  // Real account fields come from the API after sign-in (no demo customer).
  const [profile, setProfile] = useState<UserProfile>(() => createEmptyProfile());

  const navigate = useNavigate();

  // Restore session from stored JWT (Spring API)
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsSignedIn(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const user = await fetchCurrentUser(token);
        if (cancelled) return;
        setIsSignedIn(true);
        setProfile((prev) => profileFromAuthUser(user, displayNameFromUser(user), prev));
        const [apiProfile, apiCart] = await Promise.all([
          fetchProfile().catch(() => null),
          fetchCart().catch(() => null),
        ]);
        if (cancelled) return;
        if (apiProfile) {
          const addresses = profileToAddresses(apiProfile);
          if (addresses.length) {
            setProfile((prev) => ({ ...prev, addresses }));
          }
        }
        if (apiCart?.cartItems?.length) {
          setCart((prev) => {
            const fromApi = mapApiCartToCartItems(apiCart, groceries);
            return fromApi.length ? fromApi : prev;
          });
        }
      } catch {
        if (cancelled) return;
        storeToken(null);
        setIsSignedIn(false);
        setProfile(createEmptyProfile());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load real catalog from Spring Boot (seeded groceries). Keep mock only as offline fallback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const products = await fetchProducts();
        if (cancelled || products.length === 0) return;
        const mapped = products.map(mapProductToGrocery);
        setGroceries(mapped);
        // Rematch open cart lines to API product UUIDs (mock ids cannot checkout)
        setCart((prev) =>
          prev
            .map((line) => {
              const match = mapped.find(
                (g) => g.name.toLowerCase() === line.item.name.toLowerCase(),
              );
              return match ? { ...line, item: { ...match } } : null;
            })
            .filter((line): line is CartItem => line != null),
        );
        // Remap quick-reorder counts from demo ids → live product ids
        setPurchaseCounts((prev) => {
          const next: Record<string, number> = {};
          for (const [oldId, count] of Object.entries(prev)) {
            const n = Number(count);
            if (!Number.isFinite(n)) continue;
            const demo = INITIAL_GROCERIES.find((g) => g.id === oldId);
            const live = mapped.find(
              (g) =>
                g.id === oldId ||
                (demo && g.name.toLowerCase() === demo.name.toLowerCase()),
            );
            if (live) next[live.id] = n;
          }
          return Object.keys(next).length ? next : prev;
        });
      } catch {
        if (!cancelled) {
          const id = `toast_catalog_${Date.now()}`;
          setToasts((prev) => [
            ...prev,
            {
              id,
              title: 'Catalog offline',
              message: 'Showing demo products. Could not reach the Aura Fresh API — check your connection or try again shortly.',
              type: 'warning',
            },
          ]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }, 4000);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load order history when signed in
  useEffect(() => {
    if (!isSignedIn || !getStoredToken()) return;
    let cancelled = false;
    fetchOrderHistory()
      .then((apiOrders) => {
        if (cancelled) return;
        setOrders(apiOrders.map((o) => mapApiOrderToUiOrder(o, groceries)));
      })
      .catch(() => {
        /* keep local orders if API fails */
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, groceries]);

  // Open cart when returning from Stripe cancel URL /cart
  useEffect(() => {
    if (window.location.pathname === '/cart') {
      setIsCartOpen(true);
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const openAccount = () => {
    if (isSignedIn) setIsProfileOpen(true);
    else setIsAuthOpen(true);
  };

  // Push notifications inbox
  const [notifications, setNotifications] = useState<NotificationMsg[]>([
    {
      id: 'notif_welcome',
      title: 'Welcome to Aura Fresh! 🎉',
      message: 'Earn points on fresh organic Shan avocados and Shwe Bo premium rice instantly. Your GDPR cookies are securely stored.',
      type: 'info',
      timestamp: 'Just now',
      read: false
    },
    {
      id: 'notif_low_stock',
      title: '⚡ Critical Stock Alert',
      message: 'Only 4 bags remaining of Pyin Oo Lwin Highland Coffee. Set a repeat weekly subscription to secure your stock!',
      type: 'inventory',
      timestamp: '2 hours ago',
      read: false
    }
  ]);

  // Handle Toasts & Notifications
  const handleAddToast = (title: string, message: string, type: 'success' | 'warning' | 'info' | 'inventory') => {
    const id = 'toast_' + Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    // Auto clear toast in 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleAddNotification = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'order' | 'inventory'
  ) => {
    const newMsg: NotificationMsg = {
      id: 'notif_' + Date.now(),
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newMsg, ...prev]);
  };

  // Cart operations — always resolve live stock from the groceries catalog
  const handleAddToCart = (item: GroceryItem, qty: number, isSub: boolean, freq?: 'weekly' | 'biweekly' | 'monthly') => {
    const live = groceries.find(g => g.id === item.id) || item;
    if (live.stock <= 0 || qty <= 0) return;

    // Haptic vibration feedback on supported mobile devices
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(40);
      } catch (e) {
        // Ignore restricted vibration permissions
      }
    }

    setCart(prev => {
      const existing = prev.find(i => i.item.id === live.id && i.isSubscription === isSub);
      if (existing) {
        return prev.map(i =>
          (i.item.id === live.id && i.isSubscription === isSub)
            ? { ...i, item: live, quantity: Math.min(live.stock, i.quantity + qty) }
            : i
        );
      }
      return [...prev, { item: live, quantity: Math.min(live.stock, qty), isSubscription: isSub, frequency: freq }];
    });
  };

  const handleUpdateCartQty = (itemId: string, isSub: boolean, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(itemId, isSub);
      return;
    }
    const liveStock = groceries.find(g => g.id === itemId)?.stock ?? 0;
    setCart(prev => prev.map(i =>
      (i.item.id === itemId && i.isSubscription === isSub)
        ? {
            ...i,
            item: groceries.find(g => g.id === itemId) || i.item,
            quantity: Math.min(liveStock, qty)
          }
        : i
    ));
  };

  const handleRemoveFromCart = (itemId: string, isSub: boolean) => {
    setCart(prev => prev.filter(i => !(i.item.id === itemId && i.isSubscription === isSub)));
    handleAddToast('Item Removed', 'Grocery item subtracted from cart.', 'info');
  };

  const handleClearCart = () => {
    setCart([]);
    if (isSignedIn && getStoredToken()) {
      syncCartToApi([]).catch(() => undefined);
    }
  };

  const handleUpdateProfile = (
    updater: UserProfile | ((prev: UserProfile) => UserProfile),
  ) => {
    setProfile((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (isSignedIn && next.addresses !== prev.addresses && next.addresses.length > 0) {
        persistDefaultAddress(next.addresses).catch((err) => {
          const msg = err instanceof AuthApiError ? err.message : 'Could not save address';
          handleAddToast('Profile sync failed', msg, 'warning');
        });
      }
      return next;
    });
  };

  const hydrateAfterSignIn = async () => {
    try {
      const [apiProfile, apiCart, apiOrders] = await Promise.all([
        fetchProfile().catch(() => null),
        fetchCart().catch(() => null),
        fetchOrderHistory().catch(() => []),
      ]);
      if (apiProfile) {
        const addresses = profileToAddresses(apiProfile);
        if (addresses.length) {
          setProfile((prev) => ({ ...prev, addresses }));
        }
      }
      if (apiCart?.cartItems?.length) {
        setCart((prev) => {
          const fromApi = mapApiCartToCartItems(apiCart, groceries);
          return fromApi.length ? fromApi : prev;
        });
      }
      if (apiOrders.length) {
        setOrders(apiOrders.map((o) => mapApiOrderToUiOrder(o, groceries)));
      }
    } catch {
      /* non-fatal */
    }
  };

  // Order status management
  const handleAddOrder = (order: Order) => {
    // Haptic vibration pulse for successful purchase completion on mobile devices
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 120]);
      } catch (e) {
        // Ignore restricted vibration permissions
      }
    }

    setOrders(prev => [order, ...prev]);
    // Deduct stock levels in local store (sum all cart lines for the same SKU)
    setGroceries(prevGroceries =>
      prevGroceries.map(gItem => {
        const totalQty = order.items
          .filter(cItem => cItem.item.id === gItem.id)
          .reduce((sum, cItem) => sum + cItem.quantity, 0);
        if (totalQty > 0) {
          const newStock = Math.max(0, gItem.stock - totalQty);
          if (newStock <= 5 && newStock > 0) {
            // Trigger automatic low inventory warning
            handleAddNotification(
              '⚠️ Critical Inventory warning',
              `Stock levels for ${gItem.name} have collapsed to ${newStock} units left!`,
              'inventory'
            );
          }
          return { ...gItem, stock: newStock };
        }
        return gItem;
      })
    );
    // Update purchase counts for Quick Reorder
    setPurchaseCounts(prev => {
      const updated = { ...prev };
      order.items.forEach(cItem => {
        updated[cItem.item.id] = (updated[cItem.item.id] || 0) + cItem.quantity;
      });
      return updated;
    });
    // Set active tracking modal & trigger celebratory animation
    setActiveTrackingOrder(order);
    setCelebratingOrder(order);
  };

  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus, step: number) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, step } : o));
    setActiveTrackingOrder(prev => {
      if (prev && prev.id === orderId) {
        return { ...prev, status, step };
      }
      return prev;
    });
    if (status === 'delivered') {
      setShowFeedbackOrder(prev => {
        if (prev?.id === orderId) return prev;
        const fromList = orders.find(o => o.id === orderId);
        const target = fromList ? { ...fromList, status, step } : (activeTrackingOrder?.id === orderId ? { ...activeTrackingOrder, status, step } : null);
        if (target && !target.feedback) return target;
        return prev;
      });
    }
  };

  const handleSubmitFeedback = async (orderId: string, rating: number, comment: string) => {
    const order = orders.find((o) => o.id === orderId) || showFeedbackOrder;
    const line = order?.items.find((i) => i.orderItemId);
    if (!line?.orderItemId) {
      handleAddToast('Review unavailable', 'This order cannot be reviewed yet.', 'warning');
      return;
    }
    try {
      await submitReview({
        productId: line.item.id,
        orderItemId: line.orderItemId,
        rating,
        comment: comment.trim() || 'No comment',
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, feedback: { rating, comment } } : o)),
      );
      handleAddToast('Review shared', 'Thank you — your feedback helps our team.', 'success');
    } catch (err) {
      const msg = err instanceof AuthApiError ? err.message : 'Could not submit review';
      handleAddToast('Review failed', msg, 'warning');
      throw err;
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      <Routes>
        <Route
          path="/payment/success"
          element={
            <PaymentSuccessPage
              onOrdersLoaded={setOrders}
              onGroceriesLoaded={setGroceries}
              onClearCart={handleClearCart}
              onAddToast={handleAddToast}
            />
          }
        />
        <Route
          path="*"
          element={
    <div className={`min-h-screen pb-20 sm:pb-8 transition-colors duration-300 ${isDarkMode ? 'bg-[#0F0F0F] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0F0F0F]/90 backdrop-blur-md border-b border-slate-200/60 dark:border-white/10 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <img
              src="/icon-192.png"
              alt="Aura Fresh"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md shadow-emerald-500/15 object-cover"
              width={40}
              height={40}
            />
            <div className="hidden min-[380px]:block">
              <h1 className="font-display font-black text-base sm:text-lg tracking-tight leading-none bg-linear-to-r from-emerald-500 to-emerald-600 dark:from-white dark:to-emerald-400 bg-clip-text text-transparent">
                AURA FRESH
              </h1>
              <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mt-0.5">
                Myanmar Groceries
              </span>
            </div>
          </div>

          {/* Global Fuzzy Search Bar */}
          <NavbarSearch
            groceries={groceries}
            onAddToCart={(item, qty) => handleAddToCart(item, qty, false)}
            onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
            onAddToast={handleAddToast}
          />

          {/* Nav Actions - Desktop & Mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Voice Mic Button */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="flex sm:hidden p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-colors cursor-pointer"
              title="Voice Search & Commands"
            >
              <Mic className="w-4 h-4 animate-pulse" />
            </button>

            {/* Order Details & Receipts Modal Toggle */}
            <button
              onClick={() => setIsOrderDetailsOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#161616] dark:hover:bg-[#202020] border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              title="View past order receipts & reorder"
            >
              <FileText className="w-4 h-4 text-emerald-500" />
              <span className="hidden lg:inline">Order History</span>
            </button>

            {/* Theme toggle — cycles System (auto) → Light → Dark */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-[#202020] text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              aria-label={themeLabel}
              title={themeLabel}
            >
              {themePref === 'system' ? (
                <Monitor className="w-4.5 h-4.5 text-emerald-500" />
              ) : isDarkMode ? (
                <Sun className="w-4.5 h-4.5 text-amber-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-slate-600" />
              )}
            </button>

            {/* Desktop Bell Notifications Toggle */}
            <button
              id="notif-toggle-btn"
              onClick={() => setIsNotificationOpen(true)}
              className="hidden sm:flex p-2 rounded-xl border border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#161616] text-slate-500 dark:text-slate-400 relative cursor-pointer"
              aria-label="Open notifications box"
            >
              <Bell className="w-4.5 h-4.5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
              )}
            </button>

            {/* Cart Button */}
            <button
              id="cart-toggle-btn"
              onClick={() => setIsCartOpen(true)}
              className="p-2 sm:px-3 sm:py-2 bg-emerald-500 text-black font-extrabold rounded-xl shadow-md hover:bg-emerald-400 transition-colors relative flex items-center gap-1.5 cursor-pointer"
              aria-label="View shopping cart"
            >
              <ShoppingCart className="w-4.5 h-4.5" />
              <span className="hidden sm:inline text-xs font-black">Cart</span>
              {cart.length > 0 && (
                <span className="bg-white text-emerald-600 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            {/* Account / Sign in (Desktop) */}
            {isSignedIn ? (
              <button
                id="profile-toggle-btn"
                onClick={() => setIsProfileOpen(true)}
                className="hidden sm:flex items-center gap-2 border border-slate-200 dark:border-white/10 p-1 rounded-full hover:bg-slate-50 dark:hover:bg-[#161616] transition-colors cursor-pointer"
                aria-label="Open customer profile"
              >
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-600">
                    {(profile.name || 'A').charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            ) : (
              <button
                id="profile-toggle-btn"
                onClick={() => setIsAuthOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-black text-xs font-extrabold shadow-md hover:bg-emerald-400 transition-colors cursor-pointer"
                aria-label="Sign in or create account"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CORE HERO PANEL */}
      <section className="max-w-7xl mx-auto px-4 py-8 font-sans">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-neutral-950 via-[#121212] to-neutral-950 text-white p-6 md:p-10 shadow-xl border border-white/5">
          {/* background design assets */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-[#10b981]/5 blur-3xl translate-y-20" />

          <div className="max-w-xl space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider border border-emerald-500/25">
              <Sparkles className="w-3 h-3 animate-spin" /> Gold Premium Food Club
            </span>
            <h2 className="font-display font-extrabold text-2xl md:text-4xl leading-tight text-white">
              Aura Fresh — organic groceries, delivered.
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-md">
              Order premium Shan State avocados, traditional handmade chickpea tofu, and aromatic Shwe Bo Paw San rice securely. Pay with Stripe Checkout (MMK). Fully compliant with GDPR data policies.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Check className="w-4 h-4 text-emerald-400" /> Free delivery above 15,000 MMK
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Check className="w-4 h-4 text-emerald-400" /> Secure 256-bit bank encryption
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECENT DELIVERIES LOG (Customer convenience) */}
      {orders.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-4">
          <div className="p-4 bg-emerald-500/5 dark:bg-[#121212] border border-emerald-500/10 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-xs">
              <span className="font-bold text-emerald-500 dark:text-emerald-400">Active Delivery Trackers</span>
              <p className="text-slate-500 dark:text-slate-400">You have active grocery shipments. Track them on our GIS interactive street map.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {orders.map(o => (
                <button
                  key={o.id}
                  onClick={() => setActiveTrackingOrder(o)}
                  className="px-3 py-1.5 bg-white dark:bg-[#161616] hover:bg-slate-50 dark:hover:bg-[#1f1f1f] text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Track {o.id} ({o.status})</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRODUCT CATALOG CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 pb-16">
        <QuickReorder
          groceries={groceries}
          purchaseCounts={purchaseCounts}
          onAddToCart={handleAddToCart}
          onAddToast={handleAddToast}
        />
        <GroceryCatalog
          groceries={groceries}
          onAddToCart={handleAddToCart}
          selectedZone={selectedZone}
          setSelectedZone={setSelectedZone}
          onAddToast={handleAddToast}
        />
        <SmartRecipes
          cart={cart}
          groceries={groceries}
          onAddToCart={handleAddToCart}
          onAddToast={handleAddToast}
        />
      </main>

      {/* GDPR FIRST-TIME CONSENT BANNER */}
      <AnimatePresence>
        {!gdprBannerAccepted && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 bg-slate-900 dark:bg-black text-white p-4 border-t border-white/10 z-999 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl font-sans"
          >
            <div className="flex items-start gap-3 max-w-3xl">
              <ShieldAlert className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-bold text-white">General Data Protection Regulation (GDPR) Invariant Notice</p>
                <p className="leading-relaxed">
                  We collect delivery zones and contact details to fulfill orders and process Stripe payments. Data is stored securely on Aura Fresh servers. By clicking accept, you consent to our privacy policy.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  setProfile({
                    ...profile,
                    addresses: [],
                    paymentMethods: []
                  });
                  handleAddToast('Privacy Purge Approved', 'Nonspecific billing details permanently erased.', 'info');
                  dismissGdprBanner();
                }}
                className="px-3 py-1.5 border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs font-semibold rounded-lg transition-all"
              >
                Decline & Restrict
              </button>
              <button
                onClick={() => {
                  dismissGdprBanner();
                  handleAddToast('GDPR Complied', 'Data policies and caching verified.', 'success');
                }}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
              >
                Accept & Consented
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS LAYER */}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAddToast={handleAddToast}
        onAuthenticated={(user, displayName) => {
          setIsSignedIn(true);
          setProfile((prev) => profileFromAuthUser(user, displayName, prev));
          void hydrateAfterSignIn();
        }}
      />

      {/* User Profile Preferences Modal */}
      <UserProfileModal
        profile={profile}
        orders={orders}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onClearOrders={() => setOrders([])}
        onAddToast={handleAddToast}
        onSignOut={() => {
          storeToken(null);
          setIsSignedIn(false);
          setIsProfileOpen(false);
          setProfile(createEmptyProfile());
          handleAddToast('Signed out', 'Come back anytime for fresh groceries.', 'info');
        }}
      />

      {/* Post-order feedback modal */}
      {showFeedbackOrder && (
        <FeedbackModal
          order={showFeedbackOrder}
          isOpen={!!showFeedbackOrder}
          onClose={() => setShowFeedbackOrder(null)}
          onSubmitFeedback={handleSubmitFeedback}
        />
      )}

      {/* Secure Cart and Checkout Side-Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <CartAndCheckout
            cart={cart}
            groceries={groceries}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveFromCart={handleRemoveFromCart}
            onClearCart={handleClearCart}
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onAddToast={handleAddToast}
            onClose={() => setIsCartOpen(false)}
            isSignedIn={isSignedIn}
            onRequestSignIn={() => {
              setIsCartOpen(false);
              setIsAuthOpen(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Active Order Tracker live SVG map modal */}
      <AnimatePresence>
        {activeTrackingOrder && (
          <OrderTracker
            order={activeTrackingOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onAddToast={handleAddToast}
            onAddNotification={handleAddNotification}
            onClose={() => setActiveTrackingOrder(null)}
          />
        )}
      </AnimatePresence>

      {/* Push Bell Notifications Inbox Drawer */}
      <NotificationCenter
        notifications={notifications}
        onMarkAllAsRead={() => {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          handleAddToast('Inbox Cleared', 'Marked all notifications as read.', 'success');
        }}
        onClearAll={() => {
          setNotifications([]);
          handleAddToast('Inbox Emptied', 'All notifications cleared.', 'info');
        }}
        onToggleRead={(id) => {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
        }}
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      {/* Voice Assistant & Command Search Modal */}
      <VoiceSearchModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        groceries={groceries}
        onAddToCart={handleAddToCart}
        onAddToast={handleAddToast}
      />

      {/* Order Celebration Animation Modal */}
      <OrderCelebrationModal
        order={celebratingOrder}
        onClose={() => setCelebratingOrder(null)}
        onTrackOrder={(o) => setActiveTrackingOrder(o)}
      />

      {/* Order History Details & Reorder Basket Modal */}
      <OrderDetailsModal
        isOpen={isOrderDetailsOpen}
        onClose={() => setIsOrderDetailsOpen(false)}
        orders={orders}
        groceries={groceries}
        onAddToCart={handleAddToCart}
        onOpenCart={() => setIsCartOpen(true)}
        onAddToast={handleAddToast}
      />

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0F0F0F]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 sm:hidden flex justify-around items-center py-1.5 px-1 shadow-2xl">
        <button
          onClick={() => {
            setIsProfileOpen(false);
            setIsCartOpen(false);
            setIsNotificationOpen(false);
            setActiveTrackingOrder(null);
            setIsVoiceModalOpen(false);
            setIsOrderDetailsOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors min-w-12 min-h-11 ${
            !isCartOpen && !isProfileOpen && !isNotificationOpen && !activeTrackingOrder && !isVoiceModalOpen && !isOrderDetailsOpen
              ? 'text-emerald-500 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">Catalog</span>
        </button>

        {/* Voice Search Command Button in Mobile Navbar */}
        <button
          onClick={() => setIsVoiceModalOpen(true)}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors min-w-12 min-h-11 ${
            isVoiceModalOpen
              ? 'text-emerald-500 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
          }`}
        >
          <div className="relative">
            <Mic className="w-5 h-5 text-emerald-500" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <span className="text-[9px] font-bold mt-0.5">Voice Order</span>
        </button>

        {/* Dedicated Order History & Reorder Button */}
        <button
          onClick={() => setIsOrderDetailsOpen(true)}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors min-w-12 min-h-11 ${
            isOrderDetailsOpen
              ? 'text-emerald-500 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">Reorder</span>
        </button>

        <button
          onClick={() => {
            const active = orders.find(
              (o) => o.status === 'pending' || o.status === 'processing' || o.status === 'out_for_delivery',
            ) || orders[0];
            if (active) {
              setActiveTrackingOrder(active);
            } else {
              handleAddToast(
                'No active delivery',
                isSignedIn
                  ? 'Place an order to track your delivery here.'
                  : 'Sign in and checkout to track live deliveries.',
                'info',
              );
              if (!isSignedIn) setIsAuthOpen(true);
            }
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors relative min-w-12 min-h-11 ${
            activeTrackingOrder
              ? 'text-emerald-500 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
          }`}
        >
          <div className="relative">
            <Truck className="w-5 h-5 text-emerald-500" />
            {orders.some(
              (o) => o.status === 'pending' || o.status === 'processing' || o.status === 'out_for_delivery',
            ) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-slate-900 animate-pulse" />
            )}
          </div>
          <span className="text-[9px] font-bold mt-0.5">Track</span>
        </button>

        <button
          onClick={() => setIsCartOpen(true)}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors relative min-w-12 min-h-11 ${
            isCartOpen
              ? 'text-emerald-500 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </div>
          <span className="text-[9px] font-bold mt-0.5">Cart</span>
        </button>

        <button
          onClick={openAccount}
          className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors min-w-12 min-h-11 ${
            isProfileOpen || isAuthOpen
              ? 'text-emerald-500 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
          }`}
        >
          {isSignedIn ? (
            profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                className={`w-5 h-5 rounded-full object-cover border ${
                  isProfileOpen ? 'border-emerald-500' : 'border-slate-300 dark:border-white/20'
                }`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${
                  isProfileOpen
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-slate-300 text-slate-500 dark:border-white/20'
                }`}
              >
                {(profile.name || 'A').charAt(0).toUpperCase()}
              </span>
            )
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          <span className="text-[9px] font-bold mt-0.5">{isSignedIn ? 'Profile' : 'Sign in'}</span>
        </button>
      </nav>
    </div>
          }
        />
      </Routes>
    </>
  );
}
