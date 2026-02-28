import React, { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'bg-green-500/15', border: 'border-green-500/40', icon: '✓' },
  error: { bg: 'bg-red-500/15', border: 'border-red-500/40', icon: '✕' },
  warning: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/40', icon: '⚠' },
  info: { bg: 'bg-blue-500/15', border: 'border-blue-500/40', icon: 'ℹ' },
};

const TOAST_TEXT: Record<ToastType, string> = {
  success: 'text-green-300',
  error: 'text-red-300',
  warning: 'text-yellow-300',
  info: 'text-blue-300',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration: number = 4000) => {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-4), { id, type, title, message, duration }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  const value: ToastContextValue = {
    showToast,
    success: (t, m) => showToast('success', t, m),
    error: (t, m) => showToast('error', t, m, 6000),
    info: (t, m) => showToast('info', t, m),
    warning: (t, m) => showToast('warning', t, m, 5000),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container — fixed top-right */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-96 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const style = TOAST_STYLES[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 80, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`pointer-events-auto ${style.bg} border ${style.border} backdrop-blur-md rounded-xl p-4 shadow-lg cursor-pointer`}
                onClick={() => removeToast(toast.id)}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-lg font-bold ${TOAST_TEXT[toast.type]}`}>
                    {style.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${TOAST_TEXT[toast.type]}`}>{toast.title}</p>
                    {toast.message && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{toast.message}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                    className="text-slate-500 hover:text-slate-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export default ToastContext;
