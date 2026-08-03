'use client';

import type { ReactNode } from 'react';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { ConfirmationProvider } from '@/context/ConfirmationContext';
import { ToastProvider } from '@/context/ToastContext';
import QueryProvider from '@/components/layout/QueryProvider';

export default function UiProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <ConfirmationProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </ConfirmationProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
