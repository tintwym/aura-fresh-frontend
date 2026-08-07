import React from 'react';
import { Bell, X, Info, CheckCircle, AlertTriangle, ShoppingBag, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface NotificationMsg {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'order' | 'inventory';
  timestamp: string;
  read: boolean;
}

interface NotificationCenterProps {
  notifications: NotificationMsg[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onToggleRead: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onToggleRead,
  isOpen,
  onClose
}: NotificationCenterProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            id="notif-backdrop"
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            id="notif-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-[#121212] border-l border-slate-200 dark:border-white/10 shadow-2xl z-50 flex flex-col font-sans"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#0F0F0F]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <button
                id="close-notif-btn"
                onClick={onClose}
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-[#161616] text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                aria-label="Close notifications panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions bar */}
            {notifications.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-[#121212]/50 border-b border-slate-100 dark:border-white/10 flex justify-between text-xs font-medium">
                <button
                  id="mark-read-btn"
                  onClick={onMarkAllAsRead}
                  className="text-emerald-500 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
                <button
                  id="clear-all-btn"
                  onClick={onClearAll}
                  className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">No notifications yet</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                    Order status updates and stock alerts will appear here in real-time.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const Icon = {
                    info: Info,
                    success: CheckCircle,
                    warning: AlertTriangle,
                    order: ShoppingBag,
                    inventory: Radio
                  }[notif.type];

                  const iconColor = {
                    info: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
                    success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
                    warning: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
                    order: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/40',
                    inventory: 'text-red-500 bg-red-50 dark:bg-red-950/40'
                  }[notif.type];

                  return (
                    <div
                      key={notif.id}
                      onClick={() => onToggleRead(notif.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 relative ${
                        notif.read
                          ? 'bg-white dark:bg-[#161616] border-slate-100 dark:border-white/5 opacity-70'
                          : 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/20 dark:border-white/10 shadow-xs'
                      }`}
                    >
                      <div className={`p-2 rounded-lg h-fit ${iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`text-sm font-semibold truncate ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {notif.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!notif.read && (
                        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer info (GDPR and accessibility notice) */}
            <div className="p-4 bg-slate-50 dark:bg-[#0F0F0F] border-t border-slate-100 dark:border-white/10 text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
              <p>🔔 Real-time push alerts use local web sockets simulation.</p>
              <p className="mt-1">
                Fully compliant with GDPR. Your notification preferences are saved locally and fully secure.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
