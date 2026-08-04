'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, RefreshCw, Sparkles, X } from 'lucide-react';
import { SafeImage } from '@/components/ui/SafeImage';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  animeImage?: string;
  animeId?: number;
  duration?: number;
  onClick?: () => void;
  actionText?: string;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  copyToClipboard: (text: string, customMessage?: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function toastIcon(type: ToastType) {
  if (type === 'success') return <CheckCircle2 size={18} aria-hidden="true" />;
  if (type === 'error') return <AlertCircle size={18} aria-hidden="true" />;
  if (type === 'warning') return <AlertTriangle size={18} aria-hidden="true" />;
  return <Sparkles size={18} aria-hidden="true" />;
}

function toastTone(type: ToastType) {
  if (type === 'success') return 'border-emerald-500/40 bg-emerald-950/70 text-emerald-300';
  if (type === 'error') return 'border-rose-500/45 bg-rose-950/70 text-rose-300';
  if (type === 'warning') return 'border-amber-500/45 bg-amber-950/70 text-amber-300';
  return 'border-[var(--accent)]/45 bg-[var(--surface-2)] text-[var(--accent)]';
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastNumber = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const removeToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${toastNumber.current++}`;
    const newToast: ToastItem = { ...toast, id };
    const duration = toast.duration ?? 4500;
    setToasts((prev) => [...prev.slice(-4), newToast]);
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, duration));
  }, []);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
  }, []);

  const copyToClipboard = useCallback(async (text: string, customMessage?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ type: 'success', title: 'Link copiado', message: customMessage || 'Copiado para a área de transferência.', duration: 3000 });
      return true;
    } catch (error) {
      console.error('Failed to copy text:', error);
      showToast({ type: 'error', title: 'Erro ao copiar', message: 'Não foi possível copiar o link.', duration: 3000 });
      return false;
    }
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, copyToClipboard }}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-[min(calc(100vw-2rem),24rem)] flex-col gap-2.5 lg:bottom-6" role="region" aria-label="Notificações" aria-live="polite">
        {toasts.map((toast) => {
          const isInteractive = Boolean(toast.onClick);
          const body = (
            <>
              {toast.animeImage ? (
                <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-neutral-800">
                  <SafeImage src={toast.animeImage} animeId={toast.animeId} alt="" fill sizes="40px" className="object-cover" />
                </span>
              ) : (
                <span className={`shrink-0 rounded-lg border p-2 ${toastTone(toast.type)}`}>{toastIcon(toast.type)}</span>
              )}
              <span className="min-w-0 flex-1 pr-5 text-left">
                <strong className="block truncate text-xs font-bold leading-snug text-white">{toast.title}</strong>
                {toast.message && <span className="mt-1 block line-clamp-2 text-[11px] font-medium leading-tight text-gray-300">{toast.message}</span>}
                {toast.actionText && <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[var(--accent)]"><RefreshCw size={11} aria-hidden="true" />{toast.actionText}</span>}
              </span>
            </>
          );

          return (
            <article key={toast.id} className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border p-3.5 shadow-2xl ${toastTone(toast.type)}`}>
              {isInteractive ? (
                <button type="button" className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" onClick={() => { toast.onClick?.(); removeToast(toast.id); }}>
                  {body}
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-3" role="status">{body}</div>
              )}
              <button type="button" onClick={() => removeToast(toast.id)} className="absolute right-2.5 top-2.5 grid min-h-8 min-w-8 place-items-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" aria-label={`Fechar notificação: ${toast.title}`}>
                <X size={14} aria-hidden="true" />
              </button>
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10" aria-hidden="true">
                <div className={`h-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-rose-400' : toast.type === 'warning' ? 'bg-amber-400' : 'bg-[var(--accent)]'}`} style={{ animation: `toast-progress ${toast.duration ?? 4500}ms linear forwards` }} />
              </div>
            </article>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) return { showToast: () => {}, copyToClipboard: async () => false };
  return context;
}
