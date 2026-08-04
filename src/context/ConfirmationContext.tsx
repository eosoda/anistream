'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from 'react';
import { SafeImage } from '@/components/ui/SafeImage';
import { AlertTriangle, Trash2, Check } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

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
  const closeWithoutConfirmation = useCallback(() => closeDialog(false), [closeDialog]);

  return (
    <ConfirmationContext.Provider value={{ confirm, alert }}>
      {children}

      {isOpen && options && (
        <Dialog
          open
          onClose={closeWithoutConfirmation}
          title={options.title}
          description={options.description}
          variant={mode === 'confirm' ? 'alertdialog' : 'dialog'}
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] pb-4">
              <span className={`grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] border ${
                options.variant === 'danger'
                  ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                  : options.variant === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                    : 'border-[var(--accent)]/30 bg-[var(--accent)]/15 text-[var(--accent)]'
              }`} aria-hidden="true">
                {options.variant === 'danger' ? <Trash2 size={21} /> : options.variant === 'warning' ? <AlertTriangle size={21} /> : <Check size={21} />}
              </span>
              <p className="text-xs text-[var(--text-secondary)]">Confirme a ação antes de continuar.</p>
            </div>

            {options.animeTitle && (
              <div className="flex items-center gap-3 border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3">
                {options.animeImage && (
                  <div className="relative size-12 shrink-0 overflow-hidden border border-[var(--border-subtle)] bg-[var(--background)]">
                    <SafeImage src={options.animeImage} animeId={options.animeId} alt={options.animeTitle} fill className="object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Item selecionado</p>
                  <h4 className="truncate text-sm font-bold text-[var(--text-primary)]">{options.animeTitle}</h4>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
              {mode === 'confirm' && <button type="button" onClick={() => closeDialog(false)} className="admin-button is-ghost">{options.cancelText || 'Cancelar'}</button>}
              <button type="button" onClick={() => closeDialog(true)} className={`admin-button ${options.variant === 'danger' ? 'is-danger' : 'is-primary'}`}>
                {options.variant === 'danger' ? <Trash2 size={15} /> : <Check size={15} />}
                {options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </Dialog>
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
