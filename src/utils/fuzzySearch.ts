import { GroceryItem } from '../types';

export interface VoiceCommandResult {
  action: 'add_to_cart' | 'search';
  item?: GroceryItem;
  quantity: number;
  searchTerm: string;
  transcript: string;
}

export function fuzzySearchGroceries(query: string, groceries: GroceryItem[]): GroceryItem[] {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.toLowerCase().trim();
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  const scored = groceries.map(item => {
    let score = 0;
    const name = item.name.toLowerCase();
    const category = item.category.toLowerCase();
    const description = item.description.toLowerCase();
    const dietary = item.dietaryRestrictions.map(d => d.toLowerCase());
    const unit = item.unit.toLowerCase();

    // Direct name exact / prefix / substring match
    if (name === cleanQuery) score += 120;
    else if (name.startsWith(cleanQuery)) score += 90;
    else if (name.includes(cleanQuery)) score += 70;

    // Category / Dietary direct match
    if (category === cleanQuery) score += 80;
    if (dietary.some(d => d === cleanQuery)) score += 80;

    // Token matching
    for (const token of queryTokens) {
      if (name.includes(token)) score += 30;
      if (category.includes(token)) score += 20;
      if (dietary.some(d => d.includes(token))) score += 25;
      if (unit.includes(token)) score += 15;
      if (description.includes(token)) score += 10;
    }

    // Levenshtein distance for typos (e.g., "avacado", "rce", "chiken")
    for (const token of queryTokens) {
      if (token.length >= 3) {
        const words = [...name.split(/[\s,&]+/), ...category.split(/[\s,&]+/)].map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''));
        for (const word of words) {
          if (word.length >= 3) {
            const dist = levenshteinDistance(token, word);
            if (dist === 1) score += 20;
            else if (dist === 2) score += 10;
          }
        }
      }
    }

    return { item, score };
  });

  return scored
    .filter(res => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(res => res.item);
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
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
  four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10
};

export function parseVoiceCommand(transcript: string, groceries: GroceryItem[]): VoiceCommandResult {
  const clean = transcript.toLowerCase().trim();

  // Detect explicit add/buy intent
  const addIntentMatch = clean.match(/(?:add|buy|get|put|order|want)\s+(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+)?(?:bag|bags|kg|pack|packs|bottle|bottles|loaf|loaves|box|boxes|of\s+)?(.+?)(?:\s+(?:to|in|into)\s+(?:my\s+)?(?:cart|basket))?$/i);

  let quantity = 1;
  let targetSearchText = clean;
  let isAddAction = false;

  if (addIntentMatch) {
    isAddAction = true;
    const numStr = addIntentMatch[1];
    if (numStr) {
      if (/^\d+$/.test(numStr)) {
        quantity = parseInt(numStr, 10);
      } else if (numStr in NUMBER_WORDS) {
        quantity = NUMBER_WORDS[numStr];
      }
    }
    if (addIntentMatch[2]) {
      targetSearchText = addIntentMatch[2].replace(/\s+(?:to|in|into)\s+(?:my\s+)?(?:cart|basket)/g, '').trim();
    }
  }

  // Find best matching grocery item
  const matches = fuzzySearchGroceries(targetSearchText, groceries);
  const bestItem = matches.length > 0 ? matches[0] : undefined;

  return {
    action: isAddAction && bestItem ? 'add_to_cart' : 'search',
    item: bestItem,
    quantity,
    searchTerm: targetSearchText,
    transcript
  };
}
