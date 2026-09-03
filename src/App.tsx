import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Bell, ShoppingCart, Moon, Sun, MapPin, Search,
  Home, Truck, Mic, FileText, LogIn, Monitor, ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { GroceryItem, CartItem, Order, UserProfile, OrderStatus } from './types';

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
import PaymentSuccessPage from './components/PaymentSuccessPage';
import StatusPage, {
  NotFoundPage,
  BadRequestPage,
  UnauthorizedPage,
  ForbiddenPage,
  TimeoutPage,
  TooManyRequestsPage,
  ServerErrorPage,
  BadGatewayPage,
  ServiceUnavailablePage,
  GatewayTimeoutPage,
  OfflinePage,
  MaintenancePage,
  SessionExpiredPage,
  PaymentFailedPage,
} from './components/StatusPage';
import {
  createEmptyProfile,
  displayNameFromUser,
  fetchCurrentUser,
  getStoredToken,
  profileFromAuthUser,
  storeToken,
} from './lib/authApi';
import { fetchOrderHistory, fetchProducts, fetchCart, syncCartToApi } from './lib/shopApi';
import {
  mapApiOrderToUiOrder,
  mapApiCartToCartItems,
  mapProductToGrocery,
  purchaseCountsFromOrders,
} from './lib/mapProduct';
import {
  fetchProfile,
  persistDefaultAddress,
  profileToAddresses,
} from './lib/profileApi';
import { submitReview } from './lib/reviewApi';
import { fetchNotifications, markAllNotificationsRead } from './lib/notificationApi';
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

  // Core data — catalog starts empty until the API responds (no mock products).
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const purchaseCounts = useMemo(() => purchaseCountsFromOrders(orders), [orders]);

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
      } catch (err) {
        if (cancelled) return;
        storeToken(null);
        setIsSignedIn(false);
        setProfile(createEmptyProfile());
        if (err instanceof AuthApiError && (err.status === 401 || err.status === 403)) {
          navigate('/error/session', { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load live catalog from Spring Boot API only.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const products = await fetchProducts();
        if (cancelled) return;
        const mapped = products.map(mapProductToGrocery);
        setGroceries(mapped);
        setCart((prev) =>
          prev
            .map((line) => {
              const match = mapped.find((g) => g.id === line.item.id);
              return match ? { ...line, item: { ...match } } : null;
            })
            .filter((line): line is CartItem => line != null),
        );
        if (mapped.length === 0) {
          setCatalogError('No products are listed yet. Check back soon.');
        }
      } catch (err) {
        if (!cancelled) {
          setGroceries([]);
          const msg =
            err instanceof AuthApiError
              ? err.message
              : 'Could not reach the Aura Fresh API. Please try again.';
          setCatalogError(msg);
          const id = `toast_catalog_${Date.now()}`;
          setToasts((prev) => [
            ...prev,
            { id, title: 'Catalog unavailable', message: msg, type: 'warning' },
          ]);
          setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
          }, 4000);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
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

  // Poll in-app order notifications from the API
  useEffect(() => {
    if (!isSignedIn || !getStoredToken()) {
      setNotifications([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const list = await fetchNotifications();
        if (cancelled) return;
        setNotifications(
          list.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: (n.type as NotificationMsg['type']) || 'order',
            timestamp: n.createdAt
              ? new Date(n.createdAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Just now',
            read: Boolean(n.read),
          })),
        );
      } catch {
        /* ignore — inbox stays as-is */
      }
    };
    void load();
    const timer = window.setInterval(load, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isSignedIn]);

  // Stripe cancel historically used /cart
  useEffect(() => {
    if (window.location.pathname === '/cart') {
      navigate('/payment/cancelled', { replace: true });
    }
  }, [navigate]);

  // Deep-link: /?auth=1 opens sign-in
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === '1' && window.location.pathname === '/') {
      if (!getStoredToken()) setIsAuthOpen(true);
      params.delete('auth');
      const next = params.toString();
      navigate(next ? `/?${next}` : '/', { replace: true });
    }
  }, [navigate]);

  // Offline → dedicated status page (skip on payment success flow)
  useEffect(() => {
    const goOffline = () => {
      const path = window.location.pathname;
      if (path.startsWith('/payment/') || path.startsWith('/error/')) return;
      navigate('/error/offline', { replace: false });
    };
    const goOnline = () => {
      if (window.location.pathname === '/error/offline') {
        navigate('/', { replace: true });
      }
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    if (typeof navigator !== 'undefined' && !navigator.onLine) goOffline();
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [navigate]);

  const openAccount = () => {
    if (isSignedIn) setIsProfileOpen(true);
    else setIsAuthOpen(true);
  };

  // Notifications — only real session events (no seeded demo inbox)
  const [notifications, setNotifications] = useState<NotificationMsg[]>([]);

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
    // Reflect stock sold until next catalog refresh from API
    setGroceries(prevGroceries =>
      prevGroceries.map(gItem => {
        const totalQty = order.items
          .filter(cItem => cItem.item.id === gItem.id)
          .reduce((sum, cItem) => sum + cItem.quantity, 0);
        if (totalQty > 0) {
          const newStock = Math.max(0, gItem.stock - totalQty);
          if (newStock <= 5 && newStock > 0) {
            handleAddNotification(
              'Low stock',
              `${gItem.name} has only ${newStock} left.`,
              'inventory'
            );
          }
          return { ...gItem, stock: newStock };
        }
        return gItem;
      })
    );
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
          path="/payment/cancelled"
          element={
            <StatusPage
              kind="payment-cancelled"
              onOpenCart={() => {
                setIsCartOpen(true);
                navigate('/', { replace: true });
              }}
            />
          }
        />
        <Route
          path="/payment/failed"
          element={
            <PaymentFailedPage
              onOpenCart={() => {
                setIsCartOpen(true);
                navigate('/', { replace: true });
              }}
            />
          }
        />

        {/* HTTP status pages — short paths */}
        <Route path="/400" element={<BadRequestPage />} />
        <Route
          path="/401"
          element={
            <UnauthorizedPage
              onSignIn={() => {
                navigate('/', { replace: true });
                setIsAuthOpen(true);
              }}
            />
          }
        />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/408" element={<TimeoutPage />} />
        <Route path="/429" element={<TooManyRequestsPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="/502" element={<BadGatewayPage />} />
        <Route path="/503" element={<ServiceUnavailablePage />} />
        <Route path="/504" element={<GatewayTimeoutPage />} />

        {/* Named aliases */}
        <Route path="/error/bad-request" element={<BadRequestPage />} />
        <Route
          path="/error/unauthorized"
          element={
            <UnauthorizedPage
              onSignIn={() => {
                navigate('/', { replace: true });
                setIsAuthOpen(true);
              }}
            />
          }
        />
        <Route path="/error/forbidden" element={<ForbiddenPage />} />
        <Route path="/error/not-found" element={<NotFoundPage />} />
        <Route path="/error/timeout" element={<TimeoutPage />} />
        <Route path="/error/too-many-requests" element={<TooManyRequestsPage />} />
        <Route path="/error/server" element={<ServerErrorPage />} />
        <Route path="/error/bad-gateway" element={<BadGatewayPage />} />
        <Route path="/error/unavailable" element={<ServiceUnavailablePage />} />
        <Route path="/error/gateway-timeout" element={<GatewayTimeoutPage />} />
        <Route path="/error/offline" element={<OfflinePage />} />
        <Route path="/error/maintenance" element={<MaintenancePage />} />
        <Route
          path="/error/session"
          element={
            <SessionExpiredPage
              onSignIn={() => {
                storeToken(null);
                setIsSignedIn(false);
                navigate('/', { replace: true });
                setIsAuthOpen(true);
              }}
            />
          }
        />
        <Route path="/error" element={<StatusPage kind="unexpected" />} />
        <Route
          path="/"
          element={
    <div className="min-h-screen pb-20 sm:pb-8 text-[#1a2e24] dark:text-[#e7efe9] transition-colors duration-300">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-[#eef4ef]/85 dark:bg-[#0c1410]/90 backdrop-blur-md border-b border-[#2d6a4f]/12 dark:border-white/8 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Platform Name */}
          <a href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 no-underline">
            <img
              src="/icon-192.png"
              alt=""
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover ring-1 ring-[#2d6a4f]/20"
              width={40}
              height={40}
            />
            <div className="hidden min-[380px]:block">
              <h1 className="font-display font-semibold text-lg sm:text-xl tracking-tight leading-none text-[#1a2e24] dark:text-[#e7efe9]">
                Aura Fresh
              </h1>
              <span className="text-[10px] font-medium text-[#5c6f66] dark:text-[#8a9e94] block mt-0.5">
                Yangon groceries
              </span>
            </div>
          </a>

          {/* Spacer keeps logo left / actions right on wide screens */}
          <div className="flex-1 min-w-2" aria-hidden />

          {/* Nav Actions - Desktop & Mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                window.setTimeout(() => document.getElementById('grocery-search')?.focus(), 450);
              }}
              className="p-2 rounded-2xl border border-[#2d6a4f]/15 dark:border-white/10 bg-white/70 dark:bg-[#121a16] hover:bg-white dark:hover:bg-[#1a2420] text-[#5c6f66] dark:text-[#8a9e94] cursor-pointer transition-colors"
              aria-label="Search the market"
              title="Search"
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            <button
              onClick={() => setIsOrderDetailsOpen(true)}
              className="p-2 sm:px-3 sm:py-1.5 bg-white/70 hover:bg-white dark:bg-[#121a16] dark:hover:bg-[#1a2420] border border-[#2d6a4f]/12 dark:border-white/10 text-[#1a2e24] dark:text-[#e7efe9] font-semibold text-xs rounded-2xl flex items-center gap-1.5 cursor-pointer transition-colors"
              title="View past order receipts & reorder"
            >
              <FileText className="w-4 h-4 text-[#40916c]" />
              <span className="hidden lg:inline">Orders</span>
            </button>

            {/* Theme toggle — cycles System (auto) → Light → Dark */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-2xl border border-[#2d6a4f]/15 dark:border-white/10 bg-white/70 dark:bg-[#121a16] hover:bg-white dark:hover:bg-[#1a2420] text-[#5c6f66] dark:text-[#8a9e94] cursor-pointer transition-colors"
              aria-label={themeLabel}
              title={themeLabel}
            >
              {themePref === 'system' ? (
                <Monitor className="w-4.5 h-4.5 text-[#2d6a4f]" />
              ) : isDarkMode ? (
                <Sun className="w-4.5 h-4.5 text-amber-300" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-[#5c6f66]" />
              )}
            </button>

            {/* Desktop Bell Notifications Toggle */}
            <button
              id="notif-toggle-btn"
              onClick={() => setIsNotificationOpen(true)}
              className="hidden sm:flex p-2 rounded-2xl border border-[#2d6a4f]/12 dark:border-white/10 hover:bg-white/80 dark:hover:bg-[#121a16] text-[#5c6f66] dark:text-[#8a9e94] relative cursor-pointer"
              aria-label="Open notifications box"
            >
              <Bell className="w-4.5 h-4.5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#c45c26] rounded-full" />
              )}
            </button>

            {/* Cart Button */}
            <button
              id="cart-toggle-btn"
              onClick={() => setIsCartOpen(true)}
              className="p-2 sm:px-3.5 sm:py-2 bg-[#2d6a4f] text-white font-semibold rounded-2xl hover:bg-[#40916c] transition-colors relative flex items-center gap-1.5 cursor-pointer shadow-market"
              aria-label="View shopping cart"
            >
              <ShoppingCart className="w-4.5 h-4.5" />
              <span className="hidden sm:inline text-xs font-semibold tracking-wide">Cart</span>
              {cart.length > 0 && (
                <span className="bg-white text-[#2d6a4f] text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            {/* Account / Sign in (Desktop) */}
            {isSignedIn ? (
              <button
                id="profile-toggle-btn"
                onClick={() => setIsProfileOpen(true)}
                className="hidden sm:flex items-center gap-2 border border-[#2d6a4f]/15 dark:border-white/10 p-1 rounded-full hover:bg-white/80 dark:hover:bg-[#121a16] transition-colors cursor-pointer"
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
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d8f3dc] text-xs font-semibold text-[#2d6a4f]">
                    {(profile.name || 'A').charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            ) : (
              <button
                id="profile-toggle-btn"
                onClick={() => setIsAuthOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-[#2d6a4f]/25 bg-white/80 dark:bg-[#121a16] text-[#1a2e24] dark:text-[#e7efe9] text-xs font-semibold hover:bg-white dark:hover:bg-[#1a2420] transition-colors cursor-pointer"
                aria-label="Sign in or create account"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* FULL-BLEED HERO — brand first */}
      <section className="relative isolate min-h-[88vh] sm:min-h-[92vh] w-full overflow-hidden">
        <motion.img
          initial={{ scale: 1.08, opacity: 0.85 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2400&q=80"
          alt="Fresh produce at a morning market"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0 bg-linear-to-t from-[#0c1410]/92 via-[#0c1410]/45 to-[#0c1410]/25"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-[88vh] sm:min-h-[92vh] flex-col justify-end px-5 pb-16 pt-28 sm:px-10 sm:pb-20 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <p className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-white text-balance leading-[0.95]">
              Aura Fresh
            </p>
            <h2 className="mt-5 font-display text-xl sm:text-2xl md:text-3xl font-medium text-[#d8f3dc] text-balance leading-snug">
              Morning-market groceries, delivered across Yangon.
            </h2>
            <p className="mt-3 max-w-md text-sm sm:text-base text-white/75 leading-relaxed">
              Local produce, pantry staples, and everyday essentials — paid securely in MMK.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#catalog-section"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#40916c] px-5 py-3 text-sm font-semibold text-white shadow-market hover:bg-[#52b788] transition-colors"
              >
                Shop the market
                <ArrowDown className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Active orders — only when present */}
      {orders.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2d6a4f]/15 dark:border-white/10 pb-5">
            <div>
              <h3 className="font-display font-semibold text-lg text-[#1a2e24] dark:text-[#e7efe9]">Your deliveries</h3>
              <p className="text-sm text-[#5c6f66] dark:text-[#8a9e94]">Track an active order anytime.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {orders.map(o => (
                <button
                  key={o.id}
                  onClick={() => setActiveTrackingOrder(o)}
                  className="px-3 py-1.5 bg-white/80 dark:bg-[#121a16] hover:bg-white dark:hover:bg-[#1a2420] text-[#1a2e24] dark:text-[#e7efe9] border border-[#2d6a4f]/15 dark:border-white/10 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#40916c]" />
                  <span>{o.id} · {o.status}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRODUCT CATALOG CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 pt-8 pb-20">
        <QuickReorder
          groceries={groceries}
          purchaseCounts={purchaseCounts}
          onAddToCart={handleAddToCart}
          onAddToast={handleAddToast}
        />
        <GroceryCatalog
          groceries={groceries}
          isLoading={catalogLoading}
          error={catalogError}
          onRetry={() => {
            setCatalogLoading(true);
            setCatalogError(null);
            fetchProducts()
              .then((products) => {
                setGroceries(products.map(mapProductToGrocery));
                if (products.length === 0) {
                  setCatalogError('No products are listed yet. Check back soon.');
                }
              })
              .catch((err) => {
                setGroceries([]);
                setCatalogError(
                  err instanceof AuthApiError
                    ? err.message
                    : 'Could not reach the Aura Fresh API. Please try again.',
                );
              })
              .finally(() => setCatalogLoading(false));
          }}
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

      {/* Privacy consent — quiet first-visit notice */}
      <AnimatePresence>
        {!gdprBannerAccepted && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-xl z-999 rounded-2xl bg-[#1a2e24]/95 backdrop-blur-md text-white p-4 shadow-market border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          >
            <p className="text-xs text-white/80 leading-relaxed flex-1">
              We use your delivery details to fulfill orders and process Stripe payments. By continuing, you agree to our privacy policy.
            </p>
            <div className="flex gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={dismissGdprBanner}
                className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={dismissGdprBanner}
                className="flex-1 sm:flex-none px-4 py-1.5 bg-[#40916c] hover:bg-[#52b788] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Got it
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
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          markAllNotificationsRead().catch(() => undefined);
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#eef4ef]/95 dark:bg-[#0c1410]/95 backdrop-blur-md border-t border-[#2d6a4f]/12 dark:border-white/10 sm:hidden flex justify-around items-center py-1.5 px-1">
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
