import React, { useState, useEffect, useTransition } from 'react';
import { ChefHat, Clock, Utensils, BookOpen, Plus, Check, Loader2 } from 'lucide-react';
import { GroceryItem, CartItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface Recipe {
  name: string;
  description: string;
  cookingTime: string;
  difficulty: string;
  matchingIngredients: string[];
  missingIngredients: string[];
  instructions: string[];
}

interface SmartRecipesProps {
  cart: CartItem[];
  groceries: GroceryItem[];
  onAddToCart: (item: GroceryItem, qty: number, isSub: boolean) => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
}

export default function SmartRecipes({
  cart,
  groceries,
  onAddToCart,
  onAddToast
}: SmartRecipesProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cartItemNames = cart.map(c => c.item.name);

  // Load initial/default recipes or fetch when cart changes
  const fetchRecipes = async (items: string[], signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
        signal,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch smart recipes');
      }
      const data = await response.json();
      if (signal.aborted) return;
      if (data.recipes) {
        setRecipes(data.recipes);
      } else {
        throw new Error('No recipes returned');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Error in fetchRecipes:', err);
      setError(err.message || 'Something went wrong while generating recipes.');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  const refreshRecipes = () => {
    const controller = new AbortController();
    fetchRecipes(cartItemNames, controller.signal);
  };

  useEffect(() => {
    if (cartItemNames.length === 0) {
      setRecipes([]);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    startTransition(() => {
      fetchRecipes(cartItemNames, controller.signal);
    });
    return () => controller.abort();
  }, [cartItemNames.join(',')]);

  // Find matches in grocery catalog for a missing ingredient name
  const findCatalogMatch = (ingredientName: string): GroceryItem | null => {
    const cleanName = ingredientName.toLowerCase().trim();
    
    // First pass: exact or substring match in name
    let match = groceries.find(g => 
      g.name.toLowerCase().includes(cleanName) || 
      cleanName.includes(g.name.toLowerCase())
    );
    if (match) return match;

    // Second pass: split words and match
    const words = cleanName.split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      match = groceries.find(g => g.name.toLowerCase().includes(word));
      if (match) return match;
    }

    // Third pass: find by supermarket aisle fallback
    if (cleanName.includes('vegetable') || cleanName.includes('lettuce') || cleanName.includes('tomato') || cleanName.includes('cabbage') || cleanName.includes('onion') || cleanName.includes('garlic') || cleanName.includes('spinach')) {
      match = groceries.find(g => {
        const c = g.category.toLowerCase();
        return c.includes('vegetable') || c.includes('herb') || c.includes('fresh fruit');
      });
    } else if (cleanName.includes('fruit') || cleanName.includes('mango') || cleanName.includes('banana') || cleanName.includes('apple') || cleanName.includes('avocado')) {
      match = groceries.find(g => g.category.toLowerCase().includes('fruit'));
    } else if (cleanName.includes('chicken') || cleanName.includes('poultry')) {
      match = groceries.find(g => g.category.toLowerCase().includes('poultry'));
    } else if (cleanName.includes('fish') || cleanName.includes('prawn') || cleanName.includes('shrimp') || cleanName.includes('seafood')) {
      match = groceries.find(g => g.category.toLowerCase().includes('seafood'));
    } else if (cleanName.includes('meat') || cleanName.includes('beef') || cleanName.includes('pork')) {
      match = groceries.find(g => {
        const c = g.category.toLowerCase();
        return c.includes('fresh meat') || c.includes('poultry') || c.includes('meat');
      });
    } else if (cleanName.includes('coffee') || cleanName.includes('tea')) {
      match = groceries.find(g => {
        const c = g.category.toLowerCase();
        return c.includes('tea') || c.includes('coffee') || c.includes('drink') || c.includes('juice');
      });
    } else if (cleanName.includes('milk') || cleanName.includes('yogurt') || cleanName.includes('egg')) {
      match = groceries.find(g => g.category.toLowerCase().includes('dairy'));
    }

    return match || null;
  };

  const handleAddMissingIngredient = (ingredientName: string) => {
    const match = findCatalogMatch(ingredientName);
    if (match) {
      onAddToCart(match, 1, false);
      onAddToast(
        'Ingredient Added',
        `Matched "${ingredientName}" with "${match.name}" and added to cart.`,
        'success'
      );
    } else {
      onAddToast(
        'Product Not Found',
        `We couldn't find an exact match for "${ingredientName}" in our catalog.`,
        'warning'
      );
    }
  };

  const handleAddAllMissing = (missingIngredients: string[]) => {
    let addedCount = 0;
    let notFound: string[] = [];

    missingIngredients.forEach(ing => {
      const match = findCatalogMatch(ing);
      if (match) {
        onAddToCart(match, 1, false);
        addedCount++;
      } else {
        notFound.push(ing);
      }
    });

    if (addedCount > 0) {
      onAddToast(
        'Added Ingredients',
        `Successfully added ${addedCount} matching ingredients to your active cart!`,
        'success'
      );
    }
    if (notFound.length > 0) {
      onAddToast(
        'Some Items Unavailable',
        `Could not match: ${notFound.slice(0, 2).join(', ')}${notFound.length > 2 ? '...' : ''}`,
        'warning'
      );
    }
  };

  return (
    <section className="mt-16 pt-10 border-t border-[#2d6a4f]/12 dark:border-white/10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h3 className="font-display font-semibold text-2xl text-[#1a2e24] dark:text-[#e7efe9]">
            Cook from your cart
          </h3>
          <p className="mt-1 text-sm text-[#5c6f66] dark:text-[#8a9e94]">
            Meal ideas from what you&apos;ve already picked.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshRecipes}
          disabled={loading || cartItemNames.length === 0}
          className="px-4 py-2.5 bg-[#2d6a4f] hover:bg-[#40916c] text-white rounded-2xl text-sm font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ChefHat className="w-3.5 h-3.5" />
          )}
          <span>Refresh ideas</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 space-y-3"
          >
            <div className="relative">
              <div className="w-12 h-12 border-4 border-[#2d6a4f]/20 border-t-[#40916c] rounded-full animate-spin"></div>
              <ChefHat className="w-6 h-6 text-[#40916c] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
            </div>
            <p className="text-xs font-medium text-[#40916c] dark:text-[#52b788] animate-pulse">
              Consulting Gemini culinary chef...
            </p>
            <p className="text-[10px] text-slate-400 max-w-xs text-center">
              Analyzing ingredients in your basket to suggest perfect Myanmar local meals and pairings.
            </p>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center py-8"
          >
            <p className="text-xs text-red-500 font-semibold mb-2">{error}</p>
            <button
              onClick={refreshRecipes}
              className="text-xs font-bold text-[#40916c] underline hover:text-[#52b788]"
            >
              Retry generating recipes
            </button>
          </motion.div>
        ) : recipes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl text-center py-12"
          >
            <Utensils className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#5c6f66]">Add a few groceries first</p>
            <p className="text-xs text-[#5c6f66]/80 mt-1 max-w-sm mx-auto">
              We&apos;ll suggest meals from what&apos;s in your cart.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {recipes.map((recipe, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#161616] border border-slate-100 dark:border-white/5 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-display font-extrabold text-sm md:text-base text-slate-800 dark:text-white leading-tight">
                      {recipe.name}
                    </h4>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#d8f3dc] text-[#2d6a4f] dark:text-[#52b788]">
                      {recipe.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {recipe.description}
                  </p>

                  <div className="flex items-center gap-3 mb-4 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {recipe.cookingTime}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 dark:bg-white/10 rounded-full"></span>
                    <span className="flex items-center gap-1 text-emerald-500 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      {recipe.matchingIngredients.length} cart match
                    </span>
                  </div>

                  {/* Matching Ingredients list */}
                  {recipe.matchingIngredients.length > 0 && (
                    <div className="mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">In Your Cart</span>
                      <div className="flex flex-wrap gap-1.5">
                        {recipe.matchingIngredients.map((item, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full"
                          >
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Ingredients list */}
                  {recipe.missingIngredients.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Missing Ingredients</span>
                      <div className="flex flex-wrap gap-1.5">
                        {recipe.missingIngredients.map((item, i) => {
                          const catalogItem = findCatalogMatch(item);
                          return (
                            <button
                              key={i}
                              onClick={() => handleAddMissingIngredient(item)}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer ${
                                catalogItem
                                  ? 'bg-[#d8f3dc]/60 hover:bg-[#2d6a4f]/20 text-[#2d6a4f] dark:text-[#52b788] border border-[#2d6a4f]/20'
                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 border border-transparent'
                              }`}
                              title={catalogItem ? `Add ${catalogItem.name} (${catalogItem.price.toLocaleString()} MMK)` : `Ingredient not available directly`}
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>{item}</span>
                              {catalogItem && (
                                <span className="text-[9px] opacity-70 font-mono">({catalogItem.price.toLocaleString()} MMK)</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cooking Instructions preview */}
                  <div className="border-t border-slate-50 dark:border-white/5 pt-3 mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Preparation Steps
                    </span>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {recipe.instructions.map((step, i) => (
                        <li key={i} className="leading-relaxed">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {recipe.missingIngredients.length > 0 && (
                  <button
                    onClick={() => handleAddAllMissing(recipe.missingIngredients)}
                    className="w-full mt-2 py-2.5 bg-[#2d6a4f] hover:bg-[#40916c] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-white stroke-[2.5px]" />
                    <span>Add All Available Missing Ingredients</span>
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
