import { GroceryItem } from '../types';

export interface VoiceCommandResult {
  action: 'add_to_cart' | 'search';
  item?: GroceryItem;
  quantity: number;
  searchTerm: string;
  transcript: string;
}

/**
 * Myanmar / local grocery aliases → English catalog terms.
 * Both Burmese script and common romanizations expand the query.
 */
const SEARCH_ALIASES: Record<string, string[]> = {
  // Rice & grains
  ဆန်: ['rice', 'paw san', 'shwe bo'],
  'ဆန်ကြမ်း': ['rice'],
  'ပေါ်ဆန်း': ['paw san', 'rice'],
  'ရွှေဘို': ['shwe bo', 'rice'],
  san: ['rice'],
  'paw san': ['rice', 'paw san'],
  // Produce
  ငရုတ်: ['chili', 'chilli', 'pepper'],
  ကြက်သွန်: ['onion', 'shallot'],
  'ကြက်သွန်နီ': ['onion'],
  'ကြက်သွန်ဖြူ': ['garlic'],
  ကြက်သီး: ['garlic'],
  ခရမ်းချဉ်: ['tomato'],
  ခရမ်း: ['eggplant', 'aubergine'],
  ဗူး: ['gourd', 'bottle gourd'],
  ဟင်းသီးဟင်းရွက်: ['vegetable', 'greens', 'produce'],
  နာနတ်: ['pineapple'],
  ငှက်ပျော: ['banana'],
  သရက်: ['mango'],
  ထောပတ်: ['avocado'],
  avocado: ['avocado'],
  avacado: ['avocado'],
  // Protein / tofu
  ပဲပြား: ['tofu', 'chickpea'],
  'ပဲပိစပ်': ['tofu', 'bean'],
  tofu: ['tofu'],
  ကြက်: ['chicken'],
  ငါး: ['fish'],
  အမဲ: ['beef'],
  ဝက်: ['pork'],
  ဥ: ['egg'],
  // Pantry / dairy
  ဆီ: ['oil'],
  နှစ်: ['milk'],
  နို့: ['milk'],
  ဒိန်ချဉ်: ['yogurt', 'yoghurt'],
  ကော်ဖီ: ['coffee'],
  လက်ဖက်: ['tea', 'lahpet'],
  လက်ဖက်ရည်: ['tea'],
  ချိုချဉ်: ['pickle', 'chutney'],
  ငံပြာရည်: ['fish sauce'],
  ပဲငံပြာရည်: ['soy sauce'],
  ဆား: ['salt'],
  သကြား: ['sugar'],
  // Categories / diet (romanized shortcuts)
  vegan: ['vegan'],
  vegetarian: ['vegetarian'],
  organic: ['organic'],
  halal: ['halal'],
  gluten: ['gluten-free', 'gluten'],
};

function normalizeToken(token: string): string {
  return token.toLowerCase().trim();
}

/** Expand a user query with alias targets (deduped). */
export function expandSearchQuery(query: string): string {
  const raw = query.trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  const extras: string[] = [];

  // Phrase / full-query aliases first
  for (const [alias, targets] of Object.entries(SEARCH_ALIASES)) {
    const aliasLower = alias.toLowerCase();
    if (lower === aliasLower || lower.includes(aliasLower) || raw.includes(alias)) {
      extras.push(...targets);
    }
  }

  // Per-token aliases
  const tokens = lower.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const mapped = SEARCH_ALIASES[token];
    if (mapped) extras.push(...mapped);
  }

  const all = [raw, ...extras].map(normalizeToken).filter(Boolean);
  return [...new Set(all)].join(' ');
}

export function fuzzySearchGroceries(query: string, groceries: GroceryItem[]): GroceryItem[] {
  if (!query || !query.trim()) return [];

  const expanded = expandSearchQuery(query);
  const cleanQuery = expanded.toLowerCase().trim();
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);
  // Prefer original typed phrase for exact-name boosts
  const original = query.toLowerCase().trim();

  const scored = groceries.map((item) => {
    let score = 0;
    const name = item.name.toLowerCase();
    const category = item.category.toLowerCase();
    const description = item.description.toLowerCase();
    const dietary = item.dietaryRestrictions.map((d) => d.toLowerCase());
    const unit = item.unit.toLowerCase();
    const haystack = `${name} ${category} ${description} ${dietary.join(' ')}`;

    if (name === original) score += 120;
    else if (name.startsWith(original)) score += 90;
    else if (name.includes(original)) score += 70;

    if (category === original) score += 80;
    if (dietary.some((d) => d === original || d.includes(original))) score += 80;

    for (const token of queryTokens) {
      if (token.length < 2) continue;
      if (name.includes(token)) score += 30;
      if (category.includes(token)) score += 20;
      if (dietary.some((d) => d.includes(token))) score += 25;
      if (unit.includes(token)) score += 15;
      if (description.includes(token)) score += 10;
      // Alias hit anywhere in product text
      if (haystack.includes(token) && !name.includes(token) && !category.includes(token)) {
        score += 18;
      }
    }

    // Typo tolerance
    for (const token of queryTokens) {
      if (token.length < 3) continue;
      const words = [
        ...name.split(/[\s,&/-]+/),
        ...category.split(/[\s,&/-]+/),
      ].map((w) => w.toLowerCase().replace(/[^a-z0-9\u1000-\u109f]/g, ''));

      for (const word of words) {
        if (word.length < 3) continue;
        const dist = levenshteinDistance(token, word);
        if (dist === 1) score += 20;
        else if (dist === 2 && token.length >= 4) score += 10;
      }
    }

    return { item, score };
  });

  return scored
    .filter((res) => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((res) => res.item);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3; // early exit — we only care about dist ≤ 2

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, a: 1, an: 1, single: 1,
  two: 2, double: 2, pair: 2,
  three: 3, triple: 3,
  four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

export function parseVoiceCommand(transcript: string, groceries: GroceryItem[]): VoiceCommandResult {
  const clean = transcript.toLowerCase().trim();

  const addIntentMatch = clean.match(
    /(?:add|buy|get|put|order|want)\s+(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+)?(?:bag|bags|kg|pack|packs|bottle|bottles|loaf|loaves|box|boxes|of\s+)?(.+?)(?:\s+(?:to|in|into)\s+(?:my\s+)?(?:cart|basket))?$/i,
  );

  let quantity = 1;
  let targetSearchText = clean;
  let isAddAction = false;

  if (addIntentMatch) {
    isAddAction = true;
    const numStr = addIntentMatch[1];
    if (numStr) {
      if (/^\d+$/.test(numStr)) quantity = parseInt(numStr, 10);
      else if (numStr in NUMBER_WORDS) quantity = NUMBER_WORDS[numStr];
    }
    if (addIntentMatch[2]) {
      targetSearchText = addIntentMatch[2]
        .replace(/\s+(?:to|in|into)\s+(?:my\s+)?(?:cart|basket)/g, '')
        .trim();
    }
  }

  const matches = fuzzySearchGroceries(targetSearchText, groceries);
  const bestItem = matches.length > 0 ? matches[0] : undefined;

  return {
    action: isAddAction && bestItem ? 'add_to_cart' : 'search',
    item: bestItem,
    quantity,
    searchTerm: targetSearchText,
    transcript,
  };
}
