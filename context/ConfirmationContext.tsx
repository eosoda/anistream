'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useId,
} from 'react';
import { SafeImage } from '@/components/ui/SafeImage';
import { AlertTriangle, Trash2, Check, X } from 'lucide-react';

export interface ConfirmationOptions {
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  animeImage?: string;
  animeTitle?: string;
  animeId?: number;
}

export interface AlertOptions {
  title: string;
  description: React.ReactNode;
  buttonText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [mode, setMode] = useState<'confirm' | 'alert'>('confirm');
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const confirm = useCallback((opts: ConfirmationOptions): Promise<boolean> => {
    resolveRef.current?.(false);
    setMode('confirm');
    setOptions(opts);
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const alert = useCallback((opts: AlertOptions): Promise<void> => {
    resolveRef.current?.(false);
    setMode('alert');
    setOptions({
      title: opts.title,
      description: opts.description,
      confirmText: opts.buttonText || 'Entendi',
      variant: opts.variant || 'primary',
    });
    setIsOpen(true);

    return new Promise<void>((resolve) => {
      resolveRef.current = () => resolve();
    });
  }, []);

  const closeDialog = useCallback((result: boolean) => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => primaryButtonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeDialog, isOpen]);

  return (
    <ConfirmationContext.Provider value={{ confirm, alert }}>
      {children}

      {/* Confirmation Modal Backdrop & Dialog */}
      {isOpen && options && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeDialog(false);
          }}
        >
          <div
            role={mode === 'confirm' ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="relative w-full max-w-md bg-[#12131C] border border-white/10 rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.55)] p-6 space-y-5 transform transition-all scale-100 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Icon & Close Button */}
            <div className="flex items-start justify-between">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  options.variant === 'danger'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : options.variant === 'warning'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/30'
                }`}
              >
                {options.variant === 'danger' ? (
                  <Trash2 size={24} />
                ) : options.variant === 'warning' ? (
                  <AlertTriangle size={24} />
                ) : (
                  <Trash2 size={24} />
                )}
              </div>

              <button
                onClick={() => closeDialog(false)}
                aria-label="Fechar diálogo"
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Anime Preview snippet if present */}
            {options.animeTitle && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                {options.animeImage && (
                  <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-900 border border-white/10">
                    <SafeImage
                      src={options.animeImage}
                      animeId={options.animeId}
                      alt={options.animeTitle}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#FF6B00] uppercase tracking-wider">
                    Item selecionado
                  </p>
                  <h4 className="text-sm font-bold text-white truncate">
                    {options.animeTitle}
                  </h4>
                </div>
              </div>
            )}

            {/* Content Title & Description */}
            <div className="space-y-1.5">
              <h3 id={titleId} className="text-lg font-black text-white tracking-tight">
                {options.title}
              </h3>
              <div id={descriptionId} className="text-sm text-gray-300 leading-relaxed">
                {options.description}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {mode === 'confirm' && (
                <button
                  onClick={() => closeDialog(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  {options.cancelText || 'Cancelar'}
                </button>
              )}

              <button
                ref={primaryButtonRef}
                onClick={() => closeDialog(true)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12131C] ${
                  options.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : options.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                    : 'bg-[#FF6B00] hover:bg-[#FF7A1A] shadow-[#FF6B00]/30'
                }`}
              >
                {options.variant === 'danger' ? <Trash2 size={15} /> : <Check size={15} />}
                {options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    return { confirm: async () => false, alert: async () => {} };
  }
  return context;
}
