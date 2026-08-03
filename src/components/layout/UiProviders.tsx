'use client';

import type { ReactNode } from 'react';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { ConfirmationProvider } from '@/context/ConfirmationContext';
import { ToastProvider } from '@/context/ToastContext';
import QueryProvider from '@/components/layout/QueryProvider';
import { PublicNavigationProvider } from '@/components/navigation';

export default function UiProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <PublicNavigationProvider>
          <ConfirmationProvider>
            <FavoritesProvider>{children}</FavoritesProvider>
          </ConfirmationProvider>
        </PublicNavigationProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
