import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Mic, ShoppingCart, Sparkles, Tag, Check, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GroceryItem } from '../types';
import { fuzzySearchGroceries } from '../utils/fuzzySearch';

interface NavbarSearchProps {
  groceries: GroceryItem[];
  onAddToCart: (item: GroceryItem, qty: number, isSub: boolean) => void;
  onOpenVoiceModal: () => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
}

export default function NavbarSearch({
  groceries,
  onAddToCart,
  onOpenVoiceModal,
  onAddToast
}: NavbarSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const results = fuzzySearchGroceries(query, groceries);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddToCartQuick = (e: React.MouseEvent, item: GroceryItem) => {
    e.stopPropagation();
    onAddToCart(item, 1, false);
    setAddedItems(prev => ({ ...prev, [item.id]: true }));
    onAddToast('Added to Cart', `1x ${item.name} added to cart`, 'success');
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [item.id]: false }));
    }, 1500);
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md mx-2 sm:mx-4 font-sans">
      {/* Global Search Bar Input */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder="Search by item, category or dietary (e.g. Rice, Vegan, Avocados)..."
          className="w-full pl-9 pr-16 py-1.5 sm:py-2 bg-slate-100 dark:bg-[#161616] hover:bg-slate-200/70 dark:hover:bg-[#1f1f1f] border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setIsOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Voice Search Mic Button in Search Bar */}
          <button
            onClick={onOpenVoiceModal}
            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition-colors cursor-pointer"
            title="Voice Search & Commands"
          >
            <Mic className="w-3.5 h-3.5 animate-pulse" />
          </button>
        </div>
      </div>

      {/* Fuzzy Suggestions Dropdown */}
      <AnimatePresence>
        {isOpen && query.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute top-full left-0 right-0 mt-2 z-90 bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto"
          >
            <div className="p-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#181818] flex items-center justify-between text-[11px] text-slate-400 font-bold">
              <span>Fuzzy Results ({results.length})</span>
              <span className="text-[10px] text-emerald-500 font-mono">Matched by Name / Dietary / Category</span>
            </div>

            {results.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching groceries found for "{query}". Try "Vegan", "Rice", or "Coffee".
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {results.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate">
                          {item.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-medium">{item.category}</span>
                          <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                            {item.price.toLocaleString()} MMK
                          </span>
                          {item.dietaryRestrictions.slice(0, 2).map((d, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md font-semibold">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* One-click Add to Cart in Search Dropdown */}
                    <button
                      onClick={(e) => handleAddToCartQuick(e, item)}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                        addedItems[item.id]
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-xs'
                      }`}
                    >
                      {addedItems[item.id] ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" /> Add
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
