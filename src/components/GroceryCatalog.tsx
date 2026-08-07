import React, { useState, useMemo, useEffect } from 'react';
import { Search, SlidersHorizontal, ShoppingCart, Calendar, Star, MapPin, Mic, TrendingUp, WifiOff, AlertTriangle, Sparkles } from 'lucide-react';
import { GroceryItem, DietaryRestriction } from '../types';
import { DIETARY_OPTIONS, ZONE_OPTIONS, ZONE_DELIVERY_STATUS } from '../data/groceries';
import { motion, AnimatePresence } from 'motion/react';
import PriceSparkline from './PriceSparkline';

interface GroceryCatalogProps {
  groceries: GroceryItem[];
  onAddToCart: (item: GroceryItem, qty: number, isSub: boolean, freq?: 'weekly' | 'biweekly' | 'monthly') => void;
  selectedZone: string;
  setSelectedZone: (zone: string) => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
}

export interface BestValueInfo {
  unitPrice: number;
  label: string;
  unitType: 'mass' | 'volume' | 'count';
}

export function calculateUnitPrice(price: number, unitStr: string): BestValueInfo {
  const lower = unitStr.toLowerCase().trim();

  // Mass in kg e.g. "5kg", "1.2kg", "1kg"
  const kgMatch = lower.match(/^([\d.]+)\s*kg$/);
  if (kgMatch) {
    const kg = parseFloat(kgMatch[1]);
    if (kg > 0) {
      const perKg = Math.round(price / kg);
      return { unitPrice: perKg, label: `${perKg.toLocaleString()} MMK/kg`, unitType: 'mass' };
    }
  }

  // Mass in g e.g. "500g", "250g", "400g"
  const gMatch = lower.match(/^([\d.]+)\s*g$/);
  if (gMatch) {
    const g = parseFloat(gMatch[1]);
    if (g > 0) {
      const perKg = Math.round(price / (g / 1000));
      return { unitPrice: perKg, label: `${perKg.toLocaleString()} MMK/kg`, unitType: 'mass' };
    }
  }

  // Volume in Liter e.g. "1 liter", "1l"
  const literMatch = lower.match(/^([\d.]+)\s*(liter|l)$/);
  if (literMatch) {
    const l = parseFloat(literMatch[1]);
    if (l > 0) {
      const perL = Math.round(price / l);
      return { unitPrice: perL, label: `${perL.toLocaleString()} MMK/L`, unitType: 'volume' };
    }
  }

  // Volume in ml e.g. "500ml", "250ml"
  const mlMatch = lower.match(/^([\d.]+)\s*ml$/);
  if (mlMatch) {
    const ml = parseFloat(mlMatch[1]);
    if (ml > 0) {
      const perL = Math.round(price / (ml / 1000));
      return { unitPrice: perL, label: `${perL.toLocaleString()} MMK/L`, unitType: 'volume' };
    }
  }

  return { unitPrice: price, label: `${price.toLocaleString()} MMK/unit`, unitType: 'count' };
}

export default function GroceryCatalog({
  groceries,
  onAddToCart,
  selectedZone,
  setSelectedZone,
  onAddToast
}: GroceryCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDietary, setSelectedDietary] = useState<DietaryRestriction[]>([]);
  const [onlySubscription, setOnlySubscription] = useState(false);
  const [onlyBestValue, setOnlyBestValue] = useState(false);
  const [frequencies, setFrequencies] = useState<{ [itemId: string]: 'weekly' | 'biweekly' | 'monthly' }>({});
  const [buyTypes, setBuyTypes] = useState<{ [itemId: string]: 'once' | 'sub' }>({});
  const [quantities, setQuantities] = useState<{ [itemId: string]: number }>({});
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [expandedSparklines, setExpandedSparklines] = useState<{ [itemId: string]: boolean }>({});
  const [isOffline, setIsOffline] = useState(false);

  // Best value = lowest unit price within the same category (not global unit-type)
  const bestValueMap = useMemo(() => {
    const minPriceCategory: { [cat: string]: number } = {};
    const map: { [itemId: string]: { unitPrice: number; label: string; isBestValue: boolean } } = {};

    groceries.forEach(item => {
      const info = calculateUnitPrice(item.price, item.unit);
      if (!(item.category in minPriceCategory) || info.unitPrice < minPriceCategory[item.category]) {
        minPriceCategory[item.category] = info.unitPrice;
      }
    });

    groceries.forEach(item => {
      const info = calculateUnitPrice(item.price, item.unit);
      map[item.id] = {
        unitPrice: info.unitPrice,
        label: info.label,
        isBestValue: info.unitPrice === minPriceCategory[item.category]
      };
    });

    return map;
  }, [groceries]);

  useEffect(() => {
    // Determine initial online/offline state
    if (typeof window !== 'undefined' && window.navigator) {
      setIsOffline(!window.navigator.onLine);
    }

    const handleOnline = () => {
      setIsOffline(false);
      onAddToast('Online Mode', 'Encrypted connection re-established. Syncing active inventories.', 'success');
    };

    const handleOffline = () => {
      setIsOffline(true);
      onAddToast('Offline Mode', 'Your network is offline. Switched to local offline cache.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onAddToast]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      onAddToast('Listening...', 'Speak the grocery item name to search.', 'info');
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      onAddToast('Voice Search', `Searching for: "${transcript}"`, 'success');
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        onAddToast('Access Denied', 'Please enable microphone permission to use voice search.', 'warning');
      } else if (event.error !== 'aborted') {
        onAddToast('Search Error', `Voice search error: ${event.error}`, 'warning');
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    setRecognition(rec);
    return () => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      setRecognition(null);
    };
  }, [onAddToast]);

  const handleToggleSpeech = () => {
    if (!recognition) {
      onAddToast('Not Supported', 'Speech recognition is not supported on this browser.', 'warning');
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error('Speech recognition failed to start:', err);
      }
    }
  };

  const toggleDietary = (restriction: DietaryRestriction) => {
    setSelectedDietary(prev =>
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const filteredGroceries = useMemo(() => {
    return groceries.filter(item => {
      // Search text match
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Dietary restriction match (must match ALL selected restrictions)
      const matchesDietary = selectedDietary.length === 0 ||
                             selectedDietary.every(r => item.dietaryRestrictions.includes(r));

      // Zone match
      const matchesZone = selectedZone === 'All Zones' ||
                          item.availabilityZone === 'All Zones' ||
                          item.availabilityZone === selectedZone;

      // Subscription option match
      const matchesSub = !onlySubscription || item.isSubscriptionAvailable;

      // Best Value match
      const matchesBestValue = !onlyBestValue || bestValueMap[item.id]?.isBestValue;

      return matchesSearch && matchesDietary && matchesZone && matchesSub && matchesBestValue;
    });
  }, [groceries, searchQuery, selectedDietary, selectedZone, onlySubscription, onlyBestValue, bestValueMap]);

  const handleAddToCartClick = (item: GroceryItem) => {
    const qty = quantities[item.id] || 1;
    const isSub = buyTypes[item.id] === 'sub';
    const freq = isSub ? (frequencies[item.id] || 'weekly') : undefined;

    if (item.stock < qty) {
      onAddToast('Insufficient Stock', `Only ${item.stock} items left in inventory.`, 'warning');
      return;
    }

    onAddToCart(item, qty, isSub, freq);
    onAddToast(
      'Added to Cart',
      `${qty}x ${item.name} ${isSub ? `(${freq} Subscription)` : ''} added successfully.`,
      'success'
    );
  };

  const zoneDeliveryInfo = ZONE_DELIVERY_STATUS[selectedZone] || ZONE_DELIVERY_STATUS['All Zones'];

  return (
    <div id="catalog-section" className="space-y-6 font-sans">
      {/* Real-Time Zone Delivery Status Indicator Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs transition-all ${
        zoneDeliveryInfo.status === 'delayed'
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl text-black shrink-0 ${zoneDeliveryInfo.status === 'delayed' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
            <MapPin className="w-4 h-4 font-extrabold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold uppercase tracking-wider text-[10px] opacity-80">
                Real-Time Delivery Availability • {selectedZone}
              </span>
              {zoneDeliveryInfo.status === 'delayed' ? (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black rounded-full uppercase border border-amber-500/40">
                  ⚠️ Service Delayed
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-black rounded-full uppercase border border-emerald-500/40">
                  ⚡ On-Time Dispatch
                </span>
              )}
            </div>
            <p className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">{zoneDeliveryInfo.title}</p>
            <p className="text-slate-600 dark:text-slate-400 text-xs">{zoneDeliveryInfo.description}</p>
          </div>
        </div>

        {zoneDeliveryInfo.delayMinutes > 0 && (
          <div className="px-3 py-1.5 bg-amber-500 text-black font-extrabold text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>+{zoneDeliveryInfo.delayMinutes}m Delivery Delay</span>
          </div>
        )}
      </div>

      {/* Offline Mode Warning Banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-4 rounded-2xl flex items-center gap-3.5 text-xs leading-relaxed shadow-sm">
              <div className="bg-amber-500 text-black p-2 rounded-xl shrink-0">
                <WifiOff className="w-4 h-4 font-bold" />
              </div>
              <div className="flex-1">
                <p className="font-extrabold uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Offline Mode Enabled
                </p>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                  Your network connection is offline. Operating on secured, local database caches. <strong>Only cached grocery items are currently visible and available</strong>.
                </p>
              </div>
              <span className="font-mono text-[9px] px-2.5 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg font-bold shrink-0">
                CACHED MODE
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner and Filter controls */}
      <div className="bg-slate-50 dark:bg-[#121212] p-4 md:p-6 rounded-2xl shadow-hollow flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input
              id="grocery-search"
              type="text"
              placeholder="Search premium groceries, Shan specialties, local organic greens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-12 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] text-slate-800 dark:text-white rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all shadow-xs"
            />
            <button
              type="button"
              onClick={handleToggleSpeech}
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
                isListening
                  ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse'
                  : 'text-slate-400 dark:text-slate-500 hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              title={isListening ? 'Stop voice search' : 'Search by speaking'}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Zone Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#161616] px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <select
                id="zone-select"
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="text-xs bg-transparent text-slate-700 dark:text-slate-300 font-semibold focus:outline-hidden border-none"
              >
                {ZONE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Best Value Toggle */}
            <button
              id="best-value-toggle"
              onClick={() => setOnlyBestValue(!onlyBestValue)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                onlyBestValue
                  ? 'bg-amber-400 border-amber-400 text-slate-950 font-extrabold shadow-sm'
                  : 'bg-white dark:bg-[#161616] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Best Value</span>
            </button>

            {/* Subscription toggle */}
            <button
              id="sub-only-toggle"
              onClick={() => setOnlySubscription(!onlySubscription)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                onlySubscription
                  ? 'bg-emerald-500 border-emerald-500 text-black font-extrabold'
                  : 'bg-white dark:bg-[#161616] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Subscription Items</span>
            </button>
          </div>
        </div>

        {/* Dietary Filters */}
        <div className="border-t border-slate-200/50 dark:border-white/5 pt-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>Filter by Dietary Restrictions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((diet) => {
              const active = selectedDietary.includes(diet.value as DietaryRestriction);
              return (
                <button
                  key={diet.value}
                  onClick={() => toggleDietary(diet.value as DietaryRestriction)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'bg-white dark:bg-[#161616] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {diet.name}
                </button>
              );
            })}
            {selectedDietary.length > 0 && (
              <button
                onClick={() => setSelectedDietary([])}
                className="text-xs font-bold text-red-500 hover:underline px-2 cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Catalog items Grid */}
      {filteredGroceries.length === 0 ? (
        <div className="p-12 border border-slate-100 dark:border-slate-800 rounded-3xl text-center bg-slate-50/50 dark:bg-slate-900/10">
          <SlidersHorizontal className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No grocery items match your selection</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your dietary filters, availability zone, or query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredGroceries.map((item, index) => {
            const isSubAvailable = item.isSubscriptionAvailable;
            const currentBuyType = buyTypes[item.id] || 'once';
            const currentFreq = frequencies[item.id] || 'weekly';
            const qty = quantities[item.id] || 1;
            const isLowStock = item.stock > 0 && item.stock <= 5;
            const itemBestValue = bestValueMap[item.id];

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.35,
                  delay: Math.min(index * 0.04, 0.28),
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -6, transition: { duration: 0.22 } }}
                className="group h-full bg-white dark:bg-[#121212] rounded-2xl overflow-hidden shadow-hollow hover:shadow-hollow-hover transition-shadow duration-300 flex flex-col will-change-transform"
              >
                {/* Product Image Panel — fixed height */}
                <div className="relative h-48 w-full shrink-0 bg-slate-100 dark:bg-[#161616] overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />

                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
                    {itemBestValue?.isBestValue && (
                      <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 uppercase tracking-wider border border-amber-300">
                        <Sparkles className="w-3 h-3 fill-slate-950" /> Best Value
                      </span>
                    )}
                    {item.stock === 0 ? (
                      <span className="bg-slate-800 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-red-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-md">
                        ONLY {item.stock} LEFT
                      </span>
                    ) : null}
                  </div>

                  <span className="absolute bottom-3 right-3 bg-white/90 dark:bg-[#161616]/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-800 dark:text-amber-400 flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {item.rating}
                  </span>

                  <span className="absolute top-3 right-3 bg-emerald-500 text-black text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                    <MapPin className="w-3 h-3" /> {item.availabilityZone}
                  </span>
                </div>

                {/* Body — shared column so footers align across the grid */}
                <div className="p-5 flex-1 flex flex-col min-h-0">
                  {/* Tags: single row, overflow as +N */}
                  <div className="flex items-center gap-1 mb-2 h-6 overflow-hidden">
                    <span className="shrink-0 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold tracking-wide uppercase bg-emerald-500/10 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                    {item.dietaryRestrictions.slice(0, 2).map((r) => (
                      <span
                        key={r}
                        className="shrink-0 text-[9px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full"
                      >
                        {r}
                      </span>
                    ))}
                    {item.dietaryRestrictions.length > 2 && (
                      <span className="shrink-0 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        +{item.dietaryRestrictions.length - 2}
                      </span>
                    )}
                  </div>

                  <h4 className="font-display font-bold text-base text-slate-800 dark:text-white leading-snug line-clamp-2 min-h-10">
                    {item.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2 min-h-8">
                    {item.description}
                  </p>

                  {/* Reserve delay-banner height so cards stay even when the zone is delayed */}
                  <div
                    className={`mt-2.5 p-2 rounded-xl flex items-center gap-1.5 text-[11px] font-bold min-h-9 ${
                      zoneDeliveryInfo.status === 'delayed'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300'
                        : 'invisible border border-transparent'
                    }`}
                    aria-hidden={zoneDeliveryInfo.status !== 'delayed'}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>Zone Service Delayed (+{zoneDeliveryInfo.delayMinutes}m)</span>
                  </div>

                  {/* Footer block pinned to bottom */}
                  <div className="mt-auto pt-3 space-y-3">
                    <div className="flex items-end justify-between border-t border-slate-100 dark:border-white/5 pt-3 gap-2 min-h-14">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-400">Unit: {item.unit}</span>
                        <span
                          className={`text-[10px] font-mono font-bold mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded w-fit max-w-full truncate ${
                            itemBestValue?.isBestValue
                              ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/40'
                              : 'text-slate-500 bg-slate-100 dark:bg-white/5'
                          }`}
                        >
                          {itemBestValue?.isBestValue && (
                            <Sparkles className="w-2.5 h-2.5 fill-current text-amber-500 shrink-0" />
                          )}
                          {itemBestValue?.label ?? '—'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-slate-900 dark:text-white font-mono text-lg font-extrabold">
                          {item.price.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                          MMK
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-white/5 pt-2 min-h-8">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSparklines((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {expandedSparklines[item.id] ? 'Hide Price History' : 'View Price Trend (30d)'}
                        </span>
                      </button>
                      {expandedSparklines[item.id] && (
                        <PriceSparkline itemId={item.id} basePrice={item.price} />
                      )}
                    </div>

                    {/* Always reserve subscription slot so Add row lines up */}
                    <div
                      className={`p-2.5 rounded-xl min-h-13 flex flex-col justify-center ${
                        isSubAvailable
                          ? 'bg-emerald-500/5 dark:bg-emerald-950/5 border border-emerald-500/10 dark:border-white/5 space-y-2'
                          : 'bg-slate-50 dark:bg-white/2 border border-slate-100 dark:border-white/5'
                      }`}
                    >
                      {isSubAvailable ? (
                        <>
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 min-w-0">
                              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">Recurring Subscription</span>
                            </span>
                            <div className="flex border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-[#161616] text-[10px] shrink-0">
                              <button
                                type="button"
                                onClick={() => setBuyTypes((prev) => ({ ...prev, [item.id]: 'once' }))}
                                className={`px-2 py-0.5 font-bold ${
                                  currentBuyType === 'once' ? 'bg-emerald-500 text-black' : 'text-slate-500'
                                }`}
                              >
                                Once
                              </button>
                              <button
                                type="button"
                                onClick={() => setBuyTypes((prev) => ({ ...prev, [item.id]: 'sub' }))}
                                className={`px-2 py-0.5 font-bold ${
                                  currentBuyType === 'sub' ? 'bg-emerald-500 text-black' : 'text-emerald-400'
                                }`}
                              >
                                Subscribe
                              </button>
                            </div>
                          </div>

                          {currentBuyType === 'sub' && (
                            <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-slate-100 dark:border-white/5">
                              <span className="text-slate-400 font-medium">Deliver interval:</span>
                              <div className="flex gap-1">
                                {['weekly', 'biweekly', 'monthly'].map((f) => (
                                  <button
                                    key={f}
                                    type="button"
                                    onClick={() =>
                                      setFrequencies((prev) => ({ ...prev, [item.id]: f as any }))
                                    }
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      currentFreq === f
                                        ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                                        : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100'
                                    }`}
                                  >
                                    {f.slice(0, 3)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 text-center">
                          One-time purchase only
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-[#161616] overflow-hidden h-9">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantities((prev) => ({
                              ...prev,
                              [item.id]: Math.max(1, (prev[item.id] || 1) - 1),
                            }))
                          }
                          className="px-2.5 h-full font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-[#1f1f1f] transition-colors"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono text-xs font-bold text-slate-800 dark:text-white w-8 text-center">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantities((prev) => ({
                              ...prev,
                              [item.id]: Math.min(item.stock || 1, (prev[item.id] || 1) + 1),
                            }))
                          }
                          className="px-2.5 h-full font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-[#1f1f1f] transition-colors disabled:opacity-40"
                          disabled={item.stock === 0 || qty >= item.stock}
                        >
                          +
                        </button>
                      </div>

                      <motion.button
                        type="button"
                        disabled={item.stock === 0}
                        onClick={() => handleAddToCartClick(item)}
                        whileTap={item.stock === 0 ? undefined : { scale: 0.97 }}
                        whileHover={item.stock === 0 ? undefined : { scale: 1.02 }}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          item.stock === 0
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold shadow-[0_8px_20px_-6px_rgba(16,185,129,0.45)]'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{currentBuyType === 'sub' ? 'Subscribe Now' : 'Add once'}</span>
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
