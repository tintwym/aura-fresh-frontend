import React, { useState, useEffect, useTransition } from 'react';
import { Sparkles, ChefHat, Clock, Utensils, BookOpen, Plus, Check, Loader2 } from 'lucide-react';
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

    // Third pass: find by category fallback
    if (cleanName.includes('vegetable') || cleanName.includes('lettuce') || cleanName.includes('tomato') || cleanName.includes('cabbage') || cleanName.includes('onion') || cleanName.includes('garlic')) {
      match = groceries.find(g => g.category.toLowerCase().includes('fresh') || g.category.toLowerCase().includes('organic'));
    } else if (cleanName.includes('meat') || cleanName.includes('chicken') || cleanName.includes('beef') || cleanName.includes('pork')) {
      match = groceries.find(g => g.category.toLowerCase().includes('meat') || g.category.toLowerCase().includes('protein'));
    } else if (cleanName.includes('coffee') || cleanName.includes('tea')) {
      match = groceries.find(g => g.category.toLowerCase().includes('bever') || g.category.toLowerCase().includes('coffee'));
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
    <div className="bg-slate-50 dark:bg-[#121212] border border-slate-200/60 dark:border-white/5 rounded-3xl p-6 shadow-xs mt-12 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 dark:bg-purple-950/20 rounded-lg text-purple-500">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base md:text-lg text-slate-800 dark:text-white flex items-center gap-2">
                Gemini Smart Recipes <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">AI Powered</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dynamic meal ideas based on the organic produce and premium ingredients currently in your cart.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={refreshRecipes}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ChefHat className="w-3.5 h-3.5" />
          )}
          <span>Refresh Ideas</span>
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
              <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
              <ChefHat className="w-6 h-6 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
            </div>
            <p className="text-xs font-medium text-purple-500 dark:text-purple-400 animate-pulse">
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
              className="text-xs font-bold text-purple-500 underline hover:text-purple-400"
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
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Your basket is empty!</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              Add delicious groceries, fresh Shan state avocados, or local organic greens to your cart to receive customized culinary recipes.
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
                    <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400">
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
                                  ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20'
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
                    className="w-full mt-2 py-2 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
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
    </div>
  );
}
