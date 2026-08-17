'use client';

import type { ReactNode } from 'react';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { ConfirmationProvider } from '@/context/ConfirmationContext';
import { ToastProvider } from '@/context/ToastContext';
import QueryProvider from '@/components/layout/QueryProvider';
import { PublicNavigationProvider } from '@/components/navigation';
import { PublicExperienceProvider } from '@/components/experience/PublicExperienceProvider';
import type { PublicExperienceConfig } from '@/types/public-experience';

export default function UiProviders({ children, initialExperience }: { children: ReactNode; initialExperience?: PublicExperienceConfig }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <PublicExperienceProvider initialConfig={initialExperience}>
          <PublicNavigationProvider>
            <ConfirmationProvider>
              <FavoritesProvider>{children}</FavoritesProvider>
            </ConfirmationProvider>
          </PublicNavigationProvider>
        </PublicExperienceProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
