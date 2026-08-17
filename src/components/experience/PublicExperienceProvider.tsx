'use client';

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicExperienceConfigSchema } from '@/schemas/public-experience';
import { DEFAULT_PUBLIC_EXPERIENCE_CONFIG, publicExperienceThemeVariables } from '@/lib/public-experience/defaults';
import type { PublicExperienceConfig } from '@/types/public-experience';

interface PublicExperienceContextValue {
  config: PublicExperienceConfig;
  isLoading: boolean;
  isError: boolean;
  isFallback: boolean;
}

const PublicExperienceContext = createContext<PublicExperienceContextValue>({
  config: DEFAULT_PUBLIC_EXPERIENCE_CONFIG,
  isLoading: false,
  isError: false,
  isFallback: true,
});

function parseResponse(value: unknown): PublicExperienceConfig | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as { experience?: { config?: unknown } };
  const result = PublicExperienceConfigSchema.safeParse(data.experience?.config);
  return result.success ? (result.data as PublicExperienceConfig) : null;
}

export function PublicExperienceProvider({ children, initialConfig }: { children: ReactNode; initialConfig?: PublicExperienceConfig }) {
  const initial = initialConfig || DEFAULT_PUBLIC_EXPERIENCE_CONFIG;
  const query = useQuery({
    queryKey: ['publicExperience'],
    queryFn: async () => {
      const response = await fetch('/api/settings/public', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error('Não foi possível carregar a personalização pública.');
      const parsed = parseResponse(payload.data);
      if (!parsed) throw new Error('A personalização pública é inválida.');
      return parsed;
    },
    initialData: initial,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const config = query.data || initial;
  const value = useMemo<PublicExperienceContextValue>(
    () => ({ config, isLoading: query.isLoading, isError: query.isError, isFallback: !query.data }),
    [config, query.isError, query.isLoading, query.data],
  );
  const variables = publicExperienceThemeVariables(config.theme);

  return (
    <PublicExperienceContext.Provider value={value}>
      <div className="contents" style={variables as CSSProperties} data-public-experience-version={query.data ? 'published' : 'fallback'}>
        {children}
      </div>
    </PublicExperienceContext.Provider>
  );
}

export function usePublicExperience() {
  return useContext(PublicExperienceContext);
}
