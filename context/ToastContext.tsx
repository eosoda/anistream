'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Sparkles, RefreshCw } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  animeImage?: string;
  animeId?: number;
  duration?: number; // ms
  onClick?: () => void;
  actionText?: string;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  copyToClipboard: (text: string, customMessage?: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { ...toast, id };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 toasts

      const duration = toast.duration || 4500;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const copyToClipboard = useCallback(
    async (text: string, customMessage?: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast({
          type: 'success',
          title: 'Link Copiado!',
          message: customMessage || 'Copiado para a área de transferência.',
          duration: 3000,
        });
        return true;
      } catch (err) {
        console.error('Failed to copy text:', err);
        showToast({
          type: 'error',
          title: 'Erro ao copiar',
          message: 'Não foi possível copiar o link.',
          duration: 3000,
        });
        return false;
      }
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, copyToClipboard }}>
      {children}

      {/* Floating Toasts Container */}
      <div
        className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isInteractive = Boolean(toast.onClick);

          return (
            <div
              key={toast.id}
              onClick={() => {
                if (toast.onClick) {
                  toast.onClick();
                  removeToast(toast.id);
                }
              }}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl glass-panel p-3.5 shadow-2xl border transition-all duration-300 transform translate-y-0 animate-slide-up flex items-start gap-3 text-white ${
                isInteractive ? 'cursor-pointer hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]' : ''
              } ${
                toast.type === 'success'
                  ? 'bg-neutral-900/95 border-emerald-500/40 shadow-emerald-500/10'
                  : toast.type === 'error'
                  ? 'bg-rose-500/20 border-rose-500/40 shadow-rose-500/10'
                  : toast.type === 'warning'
                  ? 'bg-amber-500/20 border-amber-500/40 shadow-amber-500/10'
                  : 'bg-neutral-900/95 border-[#FF6B00]/40 shadow-[#FF6B00]/10'
              }`}
            >
              {/* Optional Thumbnail */}
              {toast.animeImage ? (
                <div className="relative w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800 border border-white/10">
                  <SafeImage
                    src={toast.animeImage}
                    animeId={toast.animeId}
                    alt={toast.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`p-2 rounded-xl flex-shrink-0 border ${
                    toast.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : toast.type === 'error'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : toast.type === 'warning'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/30'
                  }`}
                >
                  {toast.type === 'success' ? (
                    <CheckCircle2 size={18} />
                  ) : toast.type === 'error' ? (
                    <AlertCircle size={18} />
                  ) : toast.type === 'warning' ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                </div>
              )}

              {/* Toast Text Content */}
              <div className="flex-1 min-w-0 pr-4 space-y-1">
                <h4 className="text-xs font-black text-white leading-snug truncate">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-[11px] text-gray-300 font-medium leading-tight line-clamp-2">
                    {toast.message}
                  </p>
                )}
                {toast.actionText && (
                  <div className="inline-flex items-center gap-1.5 pt-1 text-[10px] font-extrabold text-[#FF6B00] hover:underline">
                    <RefreshCw size={11} className="animate-spin" />
                    <span>{toast.actionText}</span>
                  </div>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X size={14} />
              </button>

              {/* Bottom Progress Bar */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
                <div
                  className={`h-full animate-toast-progress ${
                    toast.type === 'success'
                      ? 'bg-emerald-400'
                      : toast.type === 'error'
                      ? 'bg-rose-400'
                      : toast.type === 'warning'
                      ? 'bg-amber-400'
                      : 'bg-[#FF6B00]'
                  }`}
                  style={{ animationDuration: `${toast.duration || 4500}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      copyToClipboard: async () => false,
    };
  }
  return context;
}
