'use client';

import { ReactNode, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useDialogAccessibility } from '@/hooks/useDialogAccessibility';

export function Dialog({ open, onClose, title, description, children, initialFocusRef, variant = 'dialog' }: { open: boolean; onClose: () => void; title: string; description?: ReactNode; children: ReactNode; initialFocusRef?: React.RefObject<HTMLElement | null>; variant?: 'dialog' | 'alertdialog' }) {
  const titleId = useId();
  const descriptionId = useId();
  const { panelRef } = useDialogAccessibility(open, onClose);

  useEffect(() => {
    if (!open || !initialFocusRef?.current) return;
    const timer = window.setTimeout(() => initialFocusRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [initialFocusRef, open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(<div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
    <div ref={panelRef} role={variant} aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className="surface-panel max-h-[min(90dvh,48rem)] w-full max-w-lg overflow-y-auto rounded-[var(--radius-media)] p-5 shadow-2xl" tabIndex={-1}>
      <div className="flex items-start justify-between gap-4"><div><h2 id={titleId} className="text-lg font-bold">{title}</h2>{description && <div id={descriptionId} className="mt-1 text-sm text-[var(--text-secondary)]">{description}</div>}</div><button type="button" onClick={onClose} aria-label="Fechar diálogo" className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-[var(--text-secondary)] hover:bg-white/7 hover:text-white"><X size={20} /></button></div>
      <div className="mt-5">{children}</div>
    </div>
  </div>, document.body);
}
