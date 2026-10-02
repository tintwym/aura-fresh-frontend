import React, { useState, useMemo } from 'react';
import {
  X, ShoppingCart, ShieldCheck, MapPin, Lock, ArrowRight, ArrowLeft,
  Smartphone, Calendar, Clock, Truck, Timer, Navigation, Zap, BadgeCheck
} from 'lucide-react';
import { CartItem, UserProfile, DeliveryAddress, GroceryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { createCheckoutSession, syncCartToApi } from '../lib/shopApi';
import { persistDefaultAddress } from '../lib/profileApi';
import {
  DELIVERY_ZONES,
  FREE_DELIVERY_OVER_MMK,
  deliveryEtaFor,
  deliveryFeeFor,
  normalizeDeliveryZone,
  type DeliveryZone,
} from '../lib/deliveryZones';
import { AuthApiError } from '../lib/authValidation';
import { Select } from './Select';

interface CartAndCheckoutProps {
  cart: CartItem[];
  groceries: GroceryItem[];
  onUpdateCartQty: (itemId: string, isSub: boolean, qty: number) => void;
  onRemoveFromCart: (itemId: string, isSub: boolean) => void;
  onClearCart: () => void;
  profile: UserProfile;
  onUpdateProfile: (updatedProfile: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
  onClose: () => void;
  isSignedIn: boolean;
  onRequestSignIn: () => void;
}

export default function CartAndCheckout({
  cart,
  groceries,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  profile,
  onUpdateProfile,
  onAddToast,
  onClose,
  isSignedIn,
  onRequestSignIn,
}: CartAndCheckoutProps) {
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'shipping' | 'confirm'>('cart');

  // Address selection
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    profile.addresses.find(a => a.isDefault)?.id || profile.addresses[0]?.id || ''
  );
  // Manual address fallback
  const [manualAddress, setManualAddress] = useState({
    name: profile.name,
    addressLine: '',
    city: 'Yangon',
    state: 'Yangon Region',
    zipCode: '',
    phone: '',
    zone: 'Yankin' as DeliveryZone,
  });

  // Secure processing animation state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Delivery arrival window states
  const availableDates = useMemo(() => {
    const dates = [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 1; i <= 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        value: d.toISOString().split('T')[0],
        label: `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`
      });
    }
    return dates;
  }, []);

  const timeSlots = [
    '08:00 AM - 11:00 AM (Morning Fresh)',
    '11:00 AM - 02:00 PM (Midday Express)',
    '02:00 PM - 05:00 PM (Afternoon Pack)',
    '05:00 PM - 08:00 PM (Sunset Delivery)'
  ];

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0]?.value || '');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(timeSlots[0]);

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.item.price * item.quantity), 0);
  }, [cart]);

  const hasSubscription = useMemo(() => {
    return cart.some(item => item.isSubscription);
  }, [cart]);

  // Address & Payment Resolver
  const activeAddress = useMemo<DeliveryAddress | null>(() => {
    if (selectedAddressId && selectedAddressId !== 'manual') {
      return profile.addresses.find(a => a.id === selectedAddressId) || null;
    }
    if (!manualAddress.addressLine || !manualAddress.phone) return null;
    return {
      id: 'addr_temp',
      name: manualAddress.name,
      addressLine: `${manualAddress.addressLine} (${manualAddress.zone})`,
      city: manualAddress.city,
      state: manualAddress.state,
      zipCode: manualAddress.zipCode || '11201',
      phone: manualAddress.phone,
      isDefault: false
    };
  }, [selectedAddressId, profile.addresses, manualAddress]);

  // Delivery fee by Yangon zone — charged via Stripe with the cart.
  const checkoutZone = useMemo(() => {
    if (selectedAddressId === 'manual') {
      return normalizeDeliveryZone(manualAddress.zone);
    }
    if (activeAddress) {
      return normalizeDeliveryZone(activeAddress.addressLine + ' ' + activeAddress.city);
    }
    return 'Yankin' as DeliveryZone;
  }, [selectedAddressId, manualAddress.zone, activeAddress]);

  const deliveryFee = deliveryFeeFor(checkoutZone, subtotal);
  const grandTotal = subtotal + deliveryFee;

  // Dynamic Expected Delivery Time calculation based on Zone and Time of Day
  const estimatedDeliveryInfo = useMemo(() => {
    let zoneName = 'Yankin';
    if (selectedAddressId === 'manual') {
      zoneName = manualAddress.zone || 'Yankin';
    } else if (activeAddress) {
      const line = activeAddress.addressLine.toLowerCase();
      if (line.includes('downtown')) zoneName = 'Downtown Yangon';
      else if (line.includes('bahan')) zoneName = 'Bahan';
      else if (line.includes('hlaing')) zoneName = 'Hlaing';
      else if (line.includes('yankin')) zoneName = 'Yankin';
      else zoneName = 'Yankin';
    }

    const zoneSpecs: Record<string, { min: number; max: number; km: number; hub: string }> = {
      'Downtown Yangon': { min: 25, max: 35, km: 2.8, hub: 'Downtown Hub' },
      'Yankin': { min: 30, max: 40, km: 3.5, hub: 'Yankin Express Depot' },
      'Bahan': { min: 35, max: 45, km: 4.2, hub: 'Golden Valley Depot' },
      'Hlaing': { min: 45, max: 55, km: 6.1, hub: 'West Campus Station' },
      'All Zones': { min: 35, max: 45, km: 4.0, hub: 'Central Yangon Hub' }
    };

    const spec = zoneSpecs[zoneName] || zoneSpecs['Yankin'];

    const now = new Date();
    const currentHour = now.getHours();
    let delayMins = 0;
    let trafficCondition = 'Optimal Clear Flow';
    let trafficTag = 'Fast Dispatch';
    let trafficBadgeStyle = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';

    if (currentHour >= 7 && currentHour < 10) {
      delayMins = 15;
      trafficCondition = 'Morning Peak Commute (+15m traffic)';
      trafficTag = 'Heavy Traffic';
      trafficBadgeStyle = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    } else if (currentHour >= 16 && currentHour < 20) {
      delayMins = 20;
      trafficCondition = 'Evening Rush Hour (+20m traffic)';
      trafficTag = 'Peak Rush';
      trafficBadgeStyle = 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    } else if (currentHour >= 20 || currentHour < 7) {
      delayMins = 5;
      trafficCondition = 'Night Express Cold-Chain (+5m)';
      trafficTag = 'Night Routing';
      trafficBadgeStyle = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    } else {
      delayMins = 0;
      trafficCondition = 'Standard Midday Traffic (On Time)';
      trafficTag = 'Optimal Flow';
      trafficBadgeStyle = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }

    const minMins = spec.min + delayMins;
    const maxMins = spec.max + delayMins;

    const startTime = new Date(now.getTime() + minMins * 60 * 1000);
    const endTime = new Date(now.getTime() + maxMins * 60 * 1000);

    const formatClock = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const clockRange = `${formatClock(startTime)} – ${formatClock(endTime)}`;
    const durationRange = `${minMins}–${maxMins} mins`;

    const isToday = !selectedDate || selectedDate === availableDates[0]?.value;

    return {
      zone: zoneName,
      distanceKm: spec.km,
      hub: spec.hub,
      trafficCondition,
      trafficTag,
      trafficBadgeStyle,
      minMins,
      maxMins,
      durationRange,
      clockRange,
      isToday,
      formattedDate: selectedDate,
      selectedSlot: selectedTimeSlot
    };
  }, [selectedAddressId, activeAddress, manualAddress.zone, selectedDate, selectedTimeSlot, availableDates]);

  const formatPrice = (mmkAmount: number) => `${mmkAmount.toLocaleString()} MMK`;

  const handleCheckoutSubmit = async () => {
    if (!activeAddress) {
      onAddToast('Missing Address', 'Please configure your delivery destination.', 'warning');
      setCheckoutStep('shipping');
      return;
    }

    for (const line of cart) {
      const live = groceries.find(g => g.id === line.item.id);
      if (!live || live.stock < line.quantity) {
        onAddToast(
          'Stock changed',
          `${line.item.name} only has ${live?.stock ?? 0} left. Update your cart.`,
          'warning'
        );
        setCheckoutStep('cart');
        return;
      }
    }

    if (!isSignedIn) {
      onAddToast('Sign in required', 'Please sign in to pay securely with Stripe.', 'warning');
      onRequestSignIn();
      return;
    }

    setIsProcessing(true);
    try {
      setProcessingStatus('Saving delivery address…');
      await persistDefaultAddress([activeAddress]);

      setProcessingStatus('Syncing your cart with Aura Fresh…');
      const merged = new Map<string, number>();
      for (const line of cart) {
        merged.set(line.item.id, (merged.get(line.item.id) || 0) + line.quantity);
      }
      await syncCartToApi(
        [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity })),
      );

      setProcessingStatus('Creating secure Stripe Checkout…');
      const { checkoutUrl } = await createCheckoutSession(checkoutZone);
      setProcessingStatus('Redirecting to Stripe…');
      window.location.assign(checkoutUrl);
    } catch (err) {
      const msg =
        err instanceof AuthApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Checkout failed';
      onAddToast('Checkout failed', msg, 'warning');
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-white dark:bg-[#0F0F0F] w-full max-w-xl h-full flex flex-col overflow-hidden shadow-2xl border-l border-slate-200 dark:border-white/10 font-sans"
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-2 bg-slate-50 dark:bg-[#121212] shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 pr-1">
            <ShoppingCart className="w-5 h-5 text-emerald-500 shrink-0" />
            <h3 className="font-display font-bold text-base sm:text-lg text-slate-800 dark:text-white truncate">
              {checkoutStep === 'cart' ? 'Your Grocery Bag' : 'Secured Checkout'}
            </h3>
            <span className="text-[11px] sm:text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Multi Currency Switcher */}
            

            <button
              id="close-cart-btn"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-[#1f1f1f] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors shrink-0"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Indicator Panel */}
        {checkoutStep !== 'cart' && (
          <div className="bg-indigo-50/50 dark:bg-[#121212] p-3 border-b border-slate-100 dark:border-white/10 flex justify-between items-center text-xs shrink-0 font-medium">
            {[
              { id: 'shipping', label: '1. Shipping' },
              { id: 'confirm', label: '2. Pay' }
            ].map((step, idx) => {
              const active = checkoutStep === step.id;
              const completed = checkoutStep === 'confirm' && idx < 1;

              return (
                <div key={step.id} className="flex items-center gap-1">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    active ? 'bg-emerald-500 text-black font-extrabold' : completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                  }`}>
                    {completed ? '✓' : idx + 1}
                  </span>
                  <span className={active ? 'text-emerald-500 font-semibold' : 'text-slate-400'}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* STEP 1: CART DETAILS */}
          {checkoutStep === 'cart' && (
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-300" />
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Your shopping bag is empty</p>
                    <p className="text-xs text-slate-400 mt-1">Add organic groceries or specialty Shan tofu to get started.</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-lg"
                  >
                    Browse Groceries
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={`${item.item.id}-${item.isSubscription}`}
                      className="p-3 bg-white dark:bg-[#121212] border border-slate-100 dark:border-white/5 rounded-xl flex gap-3 relative"
                    >
                      <img
                        src={item.item.imageUrl}
                        alt={item.item.name}
                        className="w-16 h-16 rounded-lg object-cover bg-slate-50 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-tight truncate">
                            {item.item.name}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">Unit: {item.item.unit}</p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50 dark:border-white/5">
                          {/* Qty edit */}
                          <div className="flex items-center border border-slate-100 dark:border-white/10 rounded-md bg-slate-50 dark:bg-[#161616] overflow-hidden text-xs">
                            <button
                              onClick={() => onUpdateCartQty(item.item.id, item.isSubscription, item.quantity - 1)}
                              className="px-2 py-0.5 font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateCartQty(item.item.id, item.isSubscription, item.quantity + 1)}
                              className="px-2 py-0.5 font-bold hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-slate-400 font-mono block">
                              {item.quantity}x {item.item.price.toLocaleString()} MMK
                            </span>
                            <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                              {formatPrice(item.item.price * item.quantity)}
                            </span>
                          </div>
                        </div>

                        {/* Subscription badge details */}
                        {item.isSubscription && (
                          <div className="bg-emerald-500/5 px-2 py-1 rounded-md text-[10px] text-emerald-400 font-bold uppercase mt-2 border border-emerald-500/10 flex justify-between items-center">
                            <span>🔁 Subscription: {item.frequency}</span>
                            <span className="text-[9px] lowercase text-slate-400">Cancel or skip anytime</span>
                          </div>
                        )}
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => onRemoveFromCart(item.item.id, item.isSubscription)}
                        className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1f1f1f] hover:text-slate-600 dark:hover:text-white transition-colors"
                        aria-label="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dynamic Expected Delivery Time Feature Card in Step 1 */}
              {cart.length > 0 && (
                <div className="bg-linear-to-r from-emerald-950/20 via-slate-900/40 to-slate-900/40 border border-emerald-500/20 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                        <Timer className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          Expected Delivery Time
                        </h5>
                        <p className="text-[11px] text-slate-400">Calculated for {estimatedDeliveryInfo.zone}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${estimatedDeliveryInfo.trafficBadgeStyle}`}>
                      {estimatedDeliveryInfo.trafficTag}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-black/30 p-3 rounded-xl border border-slate-200/80 dark:border-white/5 grid grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Arrival Window</span>
                      <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        {estimatedDeliveryInfo.isToday ? estimatedDeliveryInfo.clockRange : estimatedDeliveryInfo.durationRange}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block font-mono">
                        {estimatedDeliveryInfo.isToday ? `Dispatch window: ${estimatedDeliveryInfo.durationRange}` : `Scheduled: ${estimatedDeliveryInfo.formattedDate}`}
                      </span>
                    </div>
                    <div className="border-l border-slate-200 dark:border-white/10 pl-3 space-y-1 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{estimatedDeliveryInfo.hub} ({estimatedDeliveryInfo.distanceKm} km)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{estimatedDeliveryInfo.trafficCondition}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: SHIPPING & DELIVERY */}
          {checkoutStep === 'shipping' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-display font-bold text-base text-slate-800 dark:text-white">Where should we deliver?</h4>
                <p className="text-xs text-slate-400">Select a pre-saved secure coordinate, or enter a new address.</p>
              </div>

              <div className="space-y-2.5">
                {profile.addresses.map(addr => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                      selectedAddressId === addr.id
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : 'border-slate-200 dark:border-white/10 hover:bg-[#161616]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryAddress"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white">{addr.name}</span>
                        {addr.isDefault && <span className="text-[9px] bg-white/10 text-slate-500 border px-1 rounded-sm">Default</span>}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">{addr.addressLine}, {addr.city}</p>
                      <p className="text-slate-400 font-mono mt-1">📞 {addr.phone}</p>
                    </div>
                  </label>
                ))}

                {/* Manual Address Selector */}
                <label
                  className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                    selectedAddressId === 'manual'
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-slate-200 dark:border-white/10 hover:bg-[#161616]'
                  }`}
                >
                  <input
                    type="radio"
                    name="deliveryAddress"
                    checked={selectedAddressId === 'manual'}
                    onChange={() => setSelectedAddressId('manual')}
                    className="mt-1"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-800 dark:text-white">Custom / New Delivery Coordinates</span>
                    <p className="text-slate-400">Input a new delivery address.</p>
                  </div>
                </label>
              </div>

              {selectedAddressId === 'manual' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-xl space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Recipient Name</label>
                      <input
                        type="text"
                        value={manualAddress.name}
                        onChange={e => setManualAddress({ ...manualAddress, name: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] text-xs text-slate-800 dark:text-white rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Availability Zone</label>
                      <Select
                        aria-label="Availability zone"
                        value={manualAddress.zone}
                        onChange={zone => setManualAddress({ ...manualAddress, zone })}
                        options={DELIVERY_ZONES.map(zone => ({
                          value: zone,
                          label: `${zone} — ${deliveryFeeFor(zone, 0).toLocaleString()} Ks`,
                        }))}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] text-xs text-slate-800 dark:text-white rounded-md"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Delivery Address</label>
                      <input
                        type="text"
                        placeholder="No. 45, Golden Valley Road, Bahan"
                        value={manualAddress.addressLine}
                        onChange={e => setManualAddress({ ...manualAddress, addressLine: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] text-xs text-slate-800 dark:text-white rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Contact Phone</label>
                      <input
                        type="tel"
                        placeholder="09971234567"
                        value={manualAddress.phone}
                        onChange={e => setManualAddress({ ...manualAddress, phone: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] text-xs text-slate-800 dark:text-white rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Zip Code</label>
                      <input
                        type="text"
                        placeholder="11201"
                        value={manualAddress.zipCode}
                        onChange={e => setManualAddress({ ...manualAddress, zipCode: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] text-xs text-slate-800 dark:text-white rounded-md"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Dynamic Expected Delivery Time Indicator */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-lg">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-white block">
                      Estimated Arrival: {estimatedDeliveryInfo.clockRange}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {estimatedDeliveryInfo.zone} Zone • {estimatedDeliveryInfo.durationRange} ({estimatedDeliveryInfo.trafficCondition})
                    </span>
                  </div>
                </div>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${estimatedDeliveryInfo.trafficBadgeStyle}`}>
                  {estimatedDeliveryInfo.trafficTag}
                </span>
              </div>

              {/* Delivery Scheduling picker */}
              <div className="border-t border-slate-150 dark:border-white/5 pt-4 mt-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <h5 className="font-display font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">
                    Schedule Your Delivery
                  </h5>
                </div>
                <p className="text-[11px] text-slate-400">
                  Select your preferred dispatch arrival window. Our cold-chain delivery maintains organic freshness.
                </p>

                {/* Date select row */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Available Dates</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableDates.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setSelectedDate(d.value)}
                        className={`p-2.5 border rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex flex-col items-center justify-center ${
                          selectedDate === d.value
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-extrabold shadow-xs'
                            : 'border-slate-200 dark:border-white/5 bg-white dark:bg-[#161616] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/10'
                        }`}
                      >
                        <span className="text-[10px] opacity-75 font-mono">{d.value}</span>
                        <span className="mt-0.5 leading-none">{d.label.split(',')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time slot select row */}
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Choose Time Slot
                  </label>
                  <div className="space-y-1.5">
                    {timeSlots.map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`w-full p-2.5 border rounded-xl text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                          selectedTimeSlot === slot
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 font-bold shadow-xs'
                            : 'border-slate-200 dark:border-white/5 bg-white dark:bg-[#161616] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/10'
                        }`}
                      >
                        <span className="font-mono">{slot.split(' (')[0]}</span>
                        <span className="text-[9px] font-semibold opacity-75 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                          {slot.substring(slot.indexOf('(') + 1, slot.indexOf(')'))}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: ORDER CONFIRMATION & BILLING DISCLOSURES */}
          {checkoutStep === 'confirm' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-display font-bold text-base text-slate-800 dark:text-white">Review & pay with Stripe</h4>
                <p className="text-xs text-slate-400">Confirm delivery details, then you will be redirected to Stripe Checkout.</p>
              </div>

              {/* Order summaries */}
              <div className="bg-slate-50 dark:bg-[#121212] p-4 border border-slate-200 dark:border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                  <div>
                    <span className="font-semibold block text-slate-500">DELIVER TO</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeAddress?.name}</span>
                    <p className="text-slate-400">{activeAddress?.addressLine}</p>
                  </div>
                  <div>
                    <span className="font-semibold block text-slate-500">BILLING VIA</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Stripe Checkout</span>
                    <p className="text-slate-400 font-mono text-[10px]">Card / wallet on Stripe</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                  <div>
                    <span className="font-semibold block text-slate-500">SCHEDULED ARRIVAL</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {selectedDate}
                    </span>
                    <p className="text-slate-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> {selectedTimeSlot}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold block text-slate-500">EXPECTED DELIVERY WINDOW</span>
                    <span className="font-extrabold font-mono text-emerald-500 dark:text-emerald-400 text-xs block mt-0.5">
                      {estimatedDeliveryInfo.clockRange}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {estimatedDeliveryInfo.durationRange} ({estimatedDeliveryInfo.zone})
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  {cart.map(itm => (
                    <div key={itm.item.id} className="flex justify-between items-baseline">
                      <span className="text-slate-600 dark:text-slate-300 truncate max-w-xs">
                        {itm.quantity}x {itm.item.name}
                      </span>
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                        {formatPrice(itm.item.price * itm.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recurring Subscription Disclosures */}
              {hasSubscription && (
                <div className="p-3.5 bg-emerald-50/5 border border-emerald-500/10 rounded-xl flex gap-3">
                  <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-200 space-y-1.5">
                    <p className="font-semibold uppercase tracking-wider text-[10px]">Recurring Subscription Disclosure</p>
                    <p className="leading-relaxed">
                      By placing this order, you authorize the secure payment gateway to bill your chosen method automatically. Your next delivery cycle begins in 7 days, fully customizable from your profile tab. Cancel or modify anytime with zero penalty.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Invoice Summary and action footer */}
        <div className="p-4 md:p-6 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#121212] space-y-4 shrink-0">
          {cart.length > 0 && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Groceries</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery ({checkoutZone})</span>
                <span className={`font-mono ${deliveryFee === 0 ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>
                  {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-bold">
                <span className="text-slate-800 dark:text-white">Pay with Stripe</span>
                <span className="font-mono text-emerald-400 font-extrabold text-base">
                  {formatPrice(grandTotal)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {deliveryFee === 0
                  ? `Free delivery over ${FREE_DELIVERY_OVER_MMK.toLocaleString()} MMK · ETA ${deliveryEtaFor(checkoutZone)}`
                  : `Delivery for ${checkoutZone} is charged with Stripe · ETA ${deliveryEtaFor(checkoutZone)}`}
              </p>
            </div>
          )}

          {/* Secure Gate Banner */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span>256-bit SSL Encrypted Payments compliant with PCI-DSS & GDPR</span>
          </div>

          {/* Checkout Steps Control Buttons */}
          {cart.length > 0 && (
            <div className="flex gap-3">
              {checkoutStep !== 'cart' && (
                <button
                  onClick={() => {
                    if (checkoutStep === 'shipping') setCheckoutStep('cart');
                    else if (checkoutStep === 'confirm') setCheckoutStep('shipping');
                  }}
                  className="px-4 py-3 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#161616] text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}

              <button
                id="main-checkout-action"
                onClick={() => {
                  if (checkoutStep === 'cart') setCheckoutStep('shipping');
                  else if (checkoutStep === 'shipping') {
                    if (!activeAddress) {
                      onAddToast('Missing Address', 'Add or select a delivery address first.', 'warning');
                      return;
                    }
                    setCheckoutStep('confirm');
                  } else if (checkoutStep === 'confirm') handleCheckoutSubmit();
                }}
                disabled={isProcessing}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-colors"
              >
                <span>
                  {checkoutStep === 'cart' && 'Proceed to Shipping'}
                  {checkoutStep === 'shipping' && 'Review & pay with Stripe'}
                  {checkoutStep === 'confirm' && (isProcessing ? 'Opening Stripe…' : `Pay ${formatPrice(grandTotal)} with Stripe`)}
                </span>
                {checkoutStep !== 'confirm' && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Secure Authorization Overlay */}
        <AnimatePresence>
          {isProcessing && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <Lock className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h4 className="font-display font-extrabold text-lg text-white">Preparing Stripe Checkout</h4>
              <p className="text-xs text-emerald-400 font-mono max-w-sm mt-3 animate-pulse">
                {processingStatus}
              </p>
              <p className="text-[10px] text-slate-500 mt-8">
                You will be redirected to Stripe to complete payment securely.
              </p>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
