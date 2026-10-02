import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart, MapPin, WifiOff, Loader2, RefreshCw, Star,
} from 'lucide-react';
import { GroceryItem, DietaryRestriction } from '../types';
import { DIETARY_OPTIONS, ZONE_OPTIONS } from '../data/groceries';
import { fuzzySearchGroceries } from '../utils/fuzzySearch';
import { motion, AnimatePresence } from 'motion/react';
import { Select } from './Select';

interface GroceryCatalogProps {
  groceries: GroceryItem[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onAddToCart: (item: GroceryItem, qty: number, isSub: boolean, freq?: 'weekly' | 'biweekly' | 'monthly') => void;
  selectedZone: string;
  setSelectedZone: (zone: string) => void;
  searchQuery: string;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
}

export default function GroceryCatalog({
  groceries,
  isLoading = false,
  error = null,
  onRetry,
  onAddToCart,
  selectedZone,
  setSelectedZone,
  searchQuery,
  onAddToast,
}: GroceryCatalogProps) {
  const [selectedDietary, setSelectedDietary] = useState<DietaryRestriction[]>([]);
  const [quantities, setQuantities] = useState<{ [itemId: string]: number }>({});
  const [isOffline, setIsOffline] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.navigator) {
      setIsOffline(!window.navigator.onLine);
    }

    const handleOnline = () => {
      setIsOffline(false);
      onAddToast('Back online', 'Connection restored.', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      onAddToast('Offline', 'Connect to browse and checkout.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onAddToast]);

  const toggleDietary = (restriction: DietaryRestriction) => {
    setSelectedDietary((prev) =>
      prev.includes(restriction) ? prev.filter((r) => r !== restriction) : [...prev, restriction],
    );
  };

  const filteredGroceries = useMemo(() => {
    const q = searchQuery.trim();
    const bySearch = q
      ? fuzzySearchGroceries(q, groceries)
      : groceries;

    return bySearch.filter((item) => {
      const matchesDietary =
        selectedDietary.length === 0 ||
        selectedDietary.every((r) => item.dietaryRestrictions.includes(r));

      const matchesZone =
        selectedZone === 'All Zones' ||
        item.availabilityZone === 'All Zones' ||
        item.availabilityZone === selectedZone;

      return matchesDietary && matchesZone;
    });
  }, [groceries, searchQuery, selectedDietary, selectedZone]);

  const handleAddToCartClick = (item: GroceryItem) => {
    const qty = quantities[item.id] || 1;
    if (item.stock < qty) {
      onAddToast('Low stock', `Only ${item.stock} left.`, 'warning');
      return;
    }
    onAddToCart(item, qty, false);
    onAddToast('Added', `${qty}× ${item.name}`, 'success');
  };

  if (isLoading) {
    return (
      <div id="catalog-section" className="py-24 flex flex-col items-center justify-center gap-3 text-[#5c6f66]">
        <Loader2 className="w-7 h-7 text-[#40916c] animate-spin" />
        <p className="text-sm font-medium">Loading the market…</p>
      </div>
    );
  }

  if (error && groceries.length === 0) {
    return (
      <div
        id="catalog-section"
        className="py-16 px-4 flex flex-col items-center text-center gap-3 border border-[#c45c26]/25 bg-[#c45c26]/5 rounded-3xl"
      >
        <WifiOff className="w-8 h-8 text-[#c45c26]" />
        <h3 className="font-display font-semibold text-lg text-[#1a2e24] dark:text-[#e7efe9]">
          Catalog unavailable
        </h3>
        <p className="text-sm text-[#5c6f66] dark:text-[#8a9e94] max-w-md">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#2d6a4f] text-white text-sm font-semibold hover:bg-[#40916c] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="catalog-section" className="space-y-8 scroll-mt-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#1a2e24] dark:text-[#e7efe9] tracking-tight">
            Today&apos;s market
          </h2>
          <p className="mt-1 text-sm text-[#5c6f66] dark:text-[#8a9e94]">
            Fresh stock from our Yangon kitchen partners.
          </p>
        </div>
        <p className="text-xs font-medium text-[#5c6f66] dark:text-[#8a9e94]">
          {filteredGroceries.length} item{filteredGroceries.length === 1 ? '' : 's'}
          {searchQuery.trim() ? ` · “${searchQuery.trim()}”` : ''}
        </p>
      </div>

      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 text-sm text-[#8a5a2b] bg-[#f5e6d3]/80 dark:bg-[#2a2018] px-4 py-3 rounded-2xl border border-[#c45c26]/20">
              <WifiOff className="w-4 h-4 shrink-0" />
              You&apos;re offline — reconnect to add items and checkout.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone + diet — catalog filters only */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            id="zone-select"
            aria-label="Delivery zone"
            value={selectedZone}
            onChange={setSelectedZone}
            options={ZONE_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
            icon={<MapPin className="w-4 h-4 text-[#40916c] shrink-0" />}
            className="px-3 py-2 rounded-2xl border border-[#2d6a4f]/15 dark:border-white/10 bg-white/80 dark:bg-[#121a16] text-sm font-medium text-[#1a2e24] dark:text-[#e7efe9]"
          />

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`px-3 py-2 rounded-2xl text-sm font-medium border transition-colors cursor-pointer ${
              showFilters || selectedDietary.length > 0
                ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                : 'bg-white/80 dark:bg-[#121a16] border-[#2d6a4f]/15 dark:border-white/10 text-[#1a2e24] dark:text-[#e7efe9]'
            }`}
          >
            Diet{selectedDietary.length > 0 ? ` · ${selectedDietary.length}` : ''}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex flex-wrap gap-2"
            >
              {DIETARY_OPTIONS.map((diet) => {
                const active = selectedDietary.includes(diet.value as DietaryRestriction);
                return (
                  <button
                    key={diet.value}
                    type="button"
                    onClick={() => toggleDietary(diet.value as DietaryRestriction)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#d8f3dc] text-[#1b4332] dark:bg-[#1b4332] dark:text-[#d8f3dc]'
                        : 'bg-white/60 dark:bg-[#121a16] text-[#5c6f66] dark:text-[#8a9e94] hover:bg-[#d8f3dc]/50'
                    }`}
                  >
                    {diet.name}
                  </button>
                );
              })}
              {selectedDietary.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDietary([])}
                  className="px-3 py-1.5 text-xs font-medium text-[#c45c26] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {filteredGroceries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-lg font-semibold text-[#1a2e24] dark:text-[#e7efe9]">
            Nothing matches
          </p>
          <p className="mt-1 text-sm text-[#5c6f66]">Try another search or clear diet filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredGroceries.map((item, index) => {
            const qty = quantities[item.id] || 1;
            const out = item.stock === 0;
            const low = item.stock > 0 && item.stock <= 5;

            return (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: Math.min(index * 0.035, 0.25),
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group flex flex-col bg-white/90 dark:bg-[#121a16] rounded-2xl overflow-hidden shadow-market hover:shadow-market-hover transition-shadow duration-300"
              >
                <div className="relative aspect-[4/3] bg-[#e8f0ea] dark:bg-[#0c1410] overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  {out && (
                    <span className="absolute inset-0 flex items-center justify-center bg-[#0c1410]/45 text-white text-xs font-semibold tracking-wide">
                      Sold out
                    </span>
                  )}
                  {!out && low && (
                    <span className="absolute bottom-2 left-2 text-[10px] font-semibold text-white bg-[#1a2e24]/75 px-2 py-0.5 rounded-md">
                      {item.stock} left
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-3.5 sm:p-4 gap-2">
                  <div className="min-h-0">
                    <h3 className="font-display font-semibold text-[15px] sm:text-base text-[#1a2e24] dark:text-[#e7efe9] leading-snug line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-[#5c6f66] dark:text-[#8a9e94]">
                      {item.unit}
                      {item.rating > 0 && (
                        <span className="inline-flex items-center gap-0.5 ml-2 text-[#1a2e24]/70 dark:text-[#e7efe9]/70">
                          <Star className="w-3 h-3 fill-current" />
                          {item.rating.toFixed(1)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-auto flex items-baseline justify-between gap-2 pt-1">
                    <p className="font-semibold text-[#1a2e24] dark:text-[#e7efe9] tabular-nums">
                      <span className="text-base sm:text-lg">{item.price.toLocaleString()}</span>
                      <span className="ml-1 text-[10px] font-medium text-[#5c6f66]">MMK</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center rounded-xl border border-[#2d6a4f]/12 dark:border-white/10 overflow-hidden h-9 bg-[#eef4ef]/60 dark:bg-[#0c1410]">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.max(1, (prev[item.id] || 1) - 1),
                          }))
                        }
                        className="px-2.5 h-full text-[#5c6f66] hover:bg-[#d8f3dc]/50 font-medium"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-xs font-semibold tabular-nums">{qty}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.min(item.stock || 1, (prev[item.id] || 1) + 1),
                          }))
                        }
                        disabled={out || qty >= item.stock}
                        className="px-2.5 h-full text-[#5c6f66] hover:bg-[#d8f3dc]/50 font-medium disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <motion.button
                      type="button"
                      disabled={out}
                      onClick={() => handleAddToCartClick(item)}
                      whileTap={out ? undefined : { scale: 0.97 }}
                      className={`flex-1 h-9 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        out
                          ? 'bg-[#e8f0ea] dark:bg-[#1a2420] text-[#5c6f66]/50 cursor-not-allowed'
                          : 'bg-[#2d6a4f] hover:bg-[#40916c] text-white'
                      }`}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Add
                    </motion.button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
