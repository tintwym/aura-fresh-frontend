import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SelectProps<T extends string> {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Classes for the trigger button (border, padding, text size, background). */
  className?: string;
  /** Shown before the selected label, e.g. a map pin. */
  icon?: ReactNode;
  id?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

interface MenuPosition {
  left: number;
  minWidth: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

const GAP = 6;
const VIEWPORT_MARGIN = 8;
const MAX_MENU_HEIGHT = 288;

/**
 * Styled replacement for the native <select>, whose OS menu ignores the app theme.
 * The menu renders in a portal so overflow-hidden modals and drawers don't clip it.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  className = '',
  icon,
  id,
  disabled,
  'aria-label': ariaLabel,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    setPosition({
      left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - rect.width - VIEWPORT_MARGIN)),
      minWidth: rect.width,
      maxHeight: Math.min(MAX_MENU_HEIGHT, openUp ? spaceAbove : spaceBelow),
      ...(openUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
    });
  }, []);

  const openMenu = () => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (option.value !== value) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, listId]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`inline-flex items-center gap-2 text-left cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {icon}
        <span className="flex-1 min-w-0 truncate">{selected?.label ?? ''}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open &&
        position &&
        createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              left: position.left,
              top: position.top,
              bottom: position.bottom,
              minWidth: position.minWidth,
              maxHeight: position.maxHeight,
            }}
            className="z-[100] overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] p-1 shadow-xl shadow-black/10 dark:shadow-black/40 text-sm text-slate-700 dark:text-slate-200"
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              const isActive = index === activeIndex;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(index)}
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer whitespace-nowrap ${
                    isActive ? 'bg-emerald-50 dark:bg-white/5' : ''
                  } ${isSelected ? 'font-semibold text-emerald-700 dark:text-emerald-400' : ''}`}
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check className="w-4 h-4 shrink-0" aria-hidden /> : <span className="w-4 shrink-0" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
