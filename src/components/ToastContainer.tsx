import React from 'react';
import { CheckCircle, AlertTriangle, Info, X, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'inventory';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div id="toast-container" className="fixed top-4 right-4 z-9999 pointer-events-none flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = {
            success: CheckCircle,
            warning: AlertTriangle,
            info: Info,
            inventory: Radio
          }[toast.type];

          const colors = {
            success: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-100 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200',
            warning: 'bg-amber-50 dark:bg-amber-950 border-amber-100 dark:border-amber-900 text-amber-800 dark:text-amber-200',
            info: 'bg-indigo-50 dark:bg-indigo-950 border-indigo-100 dark:border-indigo-900 text-indigo-800 dark:text-indigo-200',
            inventory: 'bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-900 text-red-800 dark:text-red-200'
          }[toast.type];

          const iconColor = {
            success: 'text-emerald-500',
            warning: 'text-amber-500',
            info: 'text-indigo-500',
            inventory: 'text-red-500'
          }[toast.type];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${colors}`}
              role="alert"
            >
              <div className={`shrink-0 mt-0.5 ${iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">{toast.title}</p>
                <p className="text-xs mt-1 opacity-90 leading-normal">{toast.message}</p>
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="shrink-0 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
