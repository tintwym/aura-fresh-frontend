import { Loader2, ShoppingCart, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { GroceryItem } from '../types';
import type { AiSearchResult } from '../lib/aiSearchApi';

export type AiSearchState = {
  query: string;
  status: 'loading' | 'done' | 'error';
  result?: AiSearchResult;
  error?: string;
};

interface AiSearchResultsProps {
  state: AiSearchState;
  groceries: GroceryItem[];
  onAddToCart: (item: GroceryItem) => void;
  onRetry: () => void;
  onClose: () => void;
}

/** "AI picks" panel shown above the catalog after the shopper asks AI (Enter or the ✨ button). */
export default function AiSearchResults({ state, groceries, onAddToCart, onRetry, onClose }: AiSearchResultsProps) {
  const picks = (state.result?.products ?? [])
    .map((pick) => ({ pick, item: groceries.find((g) => g.id === String(pick.product.id)) }))
    .filter((entry): entry is { pick: typeof entry.pick; item: GroceryItem } => Boolean(entry.item));

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      aria-live="polite"
      className="rounded-3xl border border-[#40916c]/25 bg-gradient-to-br from-[#d8f3dc]/60 to-white/70 dark:from-[#1b4332]/40 dark:to-[#121a16] p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#2d6a4f] dark:text-[#95d5b2]">
            <Sparkles className="w-3.5 h-3.5" /> AI picks
          </p>
          <p className="mt-1 text-sm text-[#1a2e24] dark:text-[#e7efe9] truncate">
            for “{state.query}”
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#5c6f66] hover:text-[#1a2e24] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          aria-label="Close AI picks"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {state.status === 'loading' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-[#5c6f66] dark:text-[#8a9e94]">
          <Loader2 className="w-4 h-4 animate-spin text-[#40916c]" />
          Finding the best matches…
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[#c45c26]">{state.error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 rounded-xl bg-[#2d6a4f] hover:bg-[#40916c] text-white text-xs font-semibold cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {state.status === 'done' && (
        <>
          {state.result?.summary && (
            <p className="mt-3 text-sm text-[#5c6f66] dark:text-[#8a9e94]">{state.result.summary}</p>
          )}
          {picks.length === 0 ? (
            <p className="mt-3 text-sm text-[#5c6f66] dark:text-[#8a9e94]">
              No products fit that request — try describing it differently.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {picks.map(({ pick, item }) => {
                const out = item.stock === 0;
                return (
                  <li
                    key={item.id}
                    className="flex gap-3 p-2.5 rounded-2xl bg-white/90 dark:bg-[#0c1410] shadow-market"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 overflow-hidden text-[0px] bg-[#e8f0ea] dark:bg-[#121a16]"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1 flex flex-col">
                      <p className="text-sm font-semibold text-[#1a2e24] dark:text-[#e7efe9] leading-snug line-clamp-1">
                        {item.name}
                      </p>
                      {pick.reason && (
                        <p className="text-[11px] text-[#5c6f66] dark:text-[#8a9e94] leading-snug line-clamp-2">
                          {pick.reason}
                        </p>
                      )}
                      <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold tabular-nums text-[#1a2e24] dark:text-[#e7efe9]">
                          {item.price.toLocaleString()} <span className="text-[10px] font-medium text-[#5c6f66]">MMK</span>
                        </span>
                        <button
                          type="button"
                          disabled={out}
                          onClick={() => onAddToCart(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#2d6a4f] hover:bg-[#40916c] text-white disabled:bg-[#e8f0ea] disabled:text-[#5c6f66]/60 dark:disabled:bg-[#1a2420] disabled:cursor-not-allowed cursor-pointer"
                          aria-label={`Add ${item.name} to cart`}
                        >
                          <ShoppingCart className="w-3 h-3" />
                          {out ? 'Sold out' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </motion.section>
  );
}
