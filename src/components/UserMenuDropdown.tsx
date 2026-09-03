import React, { useEffect, useRef, useState } from 'react';
import { User, Package, LogOut, ChevronDown, LogIn } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { UserProfile } from '../types';

type Props = {
  isSignedIn: boolean;
  profile: UserProfile;
  onSignIn: () => void;
  onOpenProfile: () => void;
  onOpenOrders: () => void;
  onSignOut: () => void;
  /** Show full control (avatar + name) vs compact avatar only */
  compact?: boolean;
  /** Open menu upward (mobile bottom bar) */
  dropUp?: boolean;
  className?: string;
};

export default function UserMenuDropdown({
  isSignedIn,
  profile,
  onSignIn,
  onOpenProfile,
  onOpenOrders,
  onSignOut,
  compact = false,
  dropUp = false,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!isSignedIn) {
    return (
      <button
        id="profile-toggle-btn"
        type="button"
        onClick={onSignIn}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-[#2d6a4f]/25 bg-white/80 dark:bg-[#121a16] text-[#1a2e24] dark:text-[#e7efe9] text-xs font-semibold hover:bg-white dark:hover:bg-[#1a2420] transition-colors cursor-pointer ${className}`}
        aria-label="Sign in or create account"
      >
        <LogIn className="w-4 h-4" />
        {!compact && <span>Sign in</span>}
      </button>
    );
  }

  const initial = (profile.name || 'A').charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id="profile-toggle-btn"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 border border-[#2d6a4f]/15 dark:border-white/10 p-1 pr-1.5 sm:pr-2 rounded-full hover:bg-white/80 dark:hover:bg-[#121a16] transition-colors cursor-pointer"
        aria-label="Account menu"
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="w-7 h-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d8f3dc] text-xs font-semibold text-[#2d6a4f]">
            {initial}
          </span>
        )}
        {!compact && (
          <span className="hidden md:block max-w-[7rem] truncate text-xs font-semibold text-[#1a2e24] dark:text-[#e7efe9]">
            {profile.name?.trim() || 'Account'}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#5c6f66] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 z-50 w-56 rounded-2xl border border-[#2d6a4f]/15 dark:border-white/10 bg-white dark:bg-[#121a16] shadow-market overflow-hidden ${
              dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <div className="px-3.5 py-3 border-b border-[#2d6a4f]/10 dark:border-white/8">
              <p className="text-sm font-semibold text-[#1a2e24] dark:text-[#e7efe9] truncate">
                {profile.name?.trim() || 'Aura Fresh customer'}
              </p>
              <p className="text-[11px] text-[#5c6f66] dark:text-[#8a9e94] truncate mt-0.5">
                {profile.email || 'Signed in'}
              </p>
            </div>

            <div className="p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onOpenProfile();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#1a2e24] dark:text-[#e7efe9] hover:bg-[#eef4ef] dark:hover:bg-[#1a2420] cursor-pointer text-left"
              >
                <User className="w-4 h-4 text-[#40916c]" />
                Profile & settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onOpenOrders();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#1a2e24] dark:text-[#e7efe9] hover:bg-[#eef4ef] dark:hover:bg-[#1a2420] cursor-pointer text-left"
              >
                <Package className="w-4 h-4 text-[#40916c]" />
                Order history
              </button>
            </div>

            <div className="p-1.5 border-t border-[#2d6a4f]/10 dark:border-white/8">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
