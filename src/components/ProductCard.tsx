import { useState } from 'react';
import { Clock, Minus, Plus, ShoppingBasket, Star } from 'lucide-react';
import { motion } from 'motion/react';
import type { GroceryItem } from '../types';

interface ProductCardProps {
  item: GroceryItem;
  /** Quantity of this product already in the cart (0 when not added). */
  cartQty: number;
  onAdd: () => void;
  onSetQty: (qty: number) => void;
  /** Position in the grid, used to stagger the entrance animation. */
  index?: number;
}

const LOW_STOCK = 5;

export default function ProductCard({ item, cartQty, onAdd, onSetQty, index = 0 }: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const out = item.stock <= 0;
  const low = !out && item.stock <= LOW_STOCK;
  const atMax = cartQty >= item.stock;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.035, 0.25), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group flex flex-col rounded-3xl bg-white dark:bg-[#121a16] p-2 shadow-market hover:shadow-market-hover ring-1 ring-[#2d6a4f]/5 dark:ring-white/5 transition-shadow duration-300"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#eef4ef] dark:bg-[#0c1410]">
        {imageFailed || !item.imageUrl ? (
          <div className="h-full w-full flex items-center justify-center text-[#2d6a4f]/30 dark:text-[#95d5b2]/25">
            <ShoppingBasket className="w-12 h-12" strokeWidth={1.5} aria-hidden />
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.name}
            onError={() => setImageFailed(true)}
            className={`h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] ${
              out ? 'grayscale-[60%]' : ''
            }`}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />

        <span className="absolute top-2 left-2 max-w-[65%] truncate rounded-full bg-white/85 dark:bg-[#0c1410]/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-[#2d6a4f] dark:text-[#95d5b2]">
          {item.category}
        </span>

        {item.rating > 0 && (
          <span
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/85 dark:bg-[#0c1410]/80 backdrop-blur-sm px-2 py-1 text-[10px] font-semibold text-[#1a2e24] dark:text-[#e7efe9]"
            aria-label={`Rated ${item.rating.toFixed(1)} from ${item.reviewCount ?? 0} reviews`}
          >
            <Star className="w-3 h-3 fill-[#f4a261] text-[#f4a261]" />
            {item.rating.toFixed(1)}
            {item.reviewCount ? <span className="font-medium text-[#5c6f66] dark:text-[#8a9e94]">({item.reviewCount})</span> : null}
          </span>
        )}

        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5">
          {item.expiryDate && !out && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#2d6a4f]/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Clock className="w-3 h-3" />
              Best before {item.expiryDate}
            </span>
          )}
          {low && (
            <span className="rounded-full bg-[#f4a261] px-2 py-0.5 text-[10px] font-semibold text-[#1a2e24]">
              Only {item.stock} left
            </span>
          )}
        </div>

        {out && (
          <span className="absolute inset-0 flex items-center justify-center bg-[#0c1410]/45">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#1a2e24]">Sold out</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1.5 pt-3 pb-1">
        <h3 className="font-display font-semibold text-[15px] sm:text-base leading-snug text-[#1a2e24] dark:text-[#e7efe9] line-clamp-2">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1 text-xs leading-relaxed text-[#5c6f66] dark:text-[#8a9e94] line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <p className="tabular-nums text-[#1a2e24] dark:text-[#e7efe9] leading-none">
            <span className="text-lg sm:text-xl font-bold">{item.price.toLocaleString()}</span>
            <span className="ml-1 text-[10px] font-semibold text-[#5c6f66] dark:text-[#8a9e94]">MMK</span>
          </p>

          {cartQty > 0 ? (
            <div className="flex items-center h-9 rounded-full bg-[#2d6a4f] text-white shadow-sm">
              <button
                type="button"
                onClick={() => onSetQty(cartQty - 1)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-white/15 cursor-pointer"
                aria-label={`Remove one ${item.name}`}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="min-w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                {cartQty}
              </span>
              <button
                type="button"
                onClick={() => onSetQty(cartQty + 1)}
                disabled={atMax}
                className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label={`Add one more ${item.name}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <motion.button
              type="button"
              disabled={out}
              onClick={onAdd}
              whileTap={out ? undefined : { scale: 0.95 }}
              className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full text-xs font-semibold bg-[#2d6a4f] hover:bg-[#40916c] text-white shadow-sm disabled:bg-[#e8f0ea] dark:disabled:bg-[#1a2420] disabled:text-[#5c6f66]/60 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
