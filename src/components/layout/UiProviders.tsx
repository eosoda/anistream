'use client';

import type { ReactNode } from 'react';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { ConfirmationProvider } from '@/context/ConfirmationContext';
import { ToastProvider } from '@/context/ToastContext';

export default function UiProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmationProvider>
        <FavoritesProvider>{children}</FavoritesProvider>
      </ConfirmationProvider>
    </ToastProvider>
  );
}
