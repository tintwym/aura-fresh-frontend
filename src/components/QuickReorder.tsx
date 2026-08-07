import React from 'react';
import { RefreshCw, ShoppingBag, Plus } from 'lucide-react';
import { GroceryItem } from '../types';
import { motion } from 'motion/react';

interface QuickReorderProps {
  groceries: GroceryItem[];
  purchaseCounts: Record<string, number>;
  onAddToCart: (item: GroceryItem, qty: number, isSub: boolean) => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
}

export default function QuickReorder({
  groceries,
  purchaseCounts,
  onAddToCart,
  onAddToast
}: QuickReorderProps) {
  // Map and sort groceries by purchase count, descending. Only show those with count > 0.
  const reorderItems = groceries
    .map(g => ({ ...g, count: purchaseCounts[g.id] || 0 }))
    .filter(g => g.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  if (reorderItems.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-[#121212] border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 mb-8 text-center">
        <div className="flex flex-col items-center max-w-sm mx-auto space-y-2">
          <RefreshCw className="w-8 h-8 text-slate-300 dark:text-slate-700" />
          <h4 className="font-display font-bold text-sm text-slate-700 dark:text-slate-300">Quick Reorder Ready</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            Your most frequently purchased products will show up here for one-click reordering once you make your first purchase!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#121212] border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-md mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-950/20 rounded-lg text-emerald-500">
            <RefreshCw className="w-4 h-4 animate-spin-slow text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm md:text-base text-slate-800 dark:text-white">
              Quick Reorder Essentials
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              One-click addition of your most frequently bought groceries.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {reorderItems.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ y: -2 }}
            className="p-3 bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-white/5 rounded-2xl flex items-center gap-3 relative overflow-hidden group"
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200/40 dark:border-white/5"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate" title={item.name}>
                {item.name}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {item.price.toLocaleString()} MMK / {item.unit}
              </p>
              <span className="inline-block mt-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                Ordered {item.count}x
              </span>
            </div>

            <button
              onClick={() => {
                onAddToCart(item, 1, false);
                onAddToast(
                  'Added to Cart',
                  `${item.name} has been added back to your active cart.`,
                  'success'
                );
              }}
              className="p-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl shadow-xs cursor-pointer transition-colors shrink-0 flex items-center justify-center group-hover:scale-105"
              title={`Add ${item.name} to active cart`}
            >
              <Plus className="w-4 h-4 text-black stroke-[3px]" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
