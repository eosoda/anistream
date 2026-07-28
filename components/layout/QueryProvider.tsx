'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { ConfirmationProvider } from '@/context/ConfirmationContext';
import { ToastProvider } from '@/context/ToastContext';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 10, // 10 minutes cache to avoid Jikan rate limits
            gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmationProvider>
          <FavoritesProvider>{children}</FavoritesProvider>
        </ConfirmationProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}


