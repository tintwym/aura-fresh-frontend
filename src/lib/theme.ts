export type ThemePref = 'auto' | 'light' | 'dark';

export const THEME_KEY = 'aura-fresh-theme';
const MIGRATION_KEY = 'aura-fresh-theme-v3';

/** Auto mode is light from DAY_START_HOUR until NIGHT_START_HOUR (device local time). */
export const DAY_START_HOUR = 6;
export const NIGHT_START_HOUR = 18;

// Keep in sync with the inline theme script in index.html.
export function isNightTime(date = new Date()): boolean {
  const hour = date.getHours();
  return hour < DAY_START_HOUR || hour >= NIGHT_START_HOUR;
}

export function readThemePref(): ThemePref {
  if (typeof window === 'undefined') return 'auto';
  // One-time reset: older builds followed the OS appearance, which kept the shop dark during the day.
  if (!window.localStorage.getItem(MIGRATION_KEY)) {
    window.localStorage.setItem(THEME_KEY, 'auto');
    window.localStorage.setItem(MIGRATION_KEY, '1');
    return 'auto';
  }
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'auto';
}
