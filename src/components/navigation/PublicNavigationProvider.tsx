'use client';

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ConfigurablePageId, PublicNavigationSettings } from '@/types/navigation';
import { DEFAULT_NAVIGATION_CONFIG } from '@/lib/navigation/defaults';
import { getVisibleNavigation, toPublicNavigation } from '@/lib/navigation/presentation';
import { NAVIGATION_DESTINATIONS, isConfigurablePageId } from '@/lib/navigation/registry';
import { useToast } from '@/context/ToastContext';

interface PublicNavigationContextValue {
  settings: PublicNavigationSettings;
  isLoading: boolean;
  isError: boolean;
  isFallback: boolean;
}

const fallbackSettings = toPublicNavigation(DEFAULT_NAVIGATION_CONFIG);
const PublicNavigationContext = createContext<PublicNavigationContextValue>({
  settings: fallbackSettings,
  isLoading: false,
  isError: false,
  isFallback: true,
});

function parsePublicSettings(value: unknown): PublicNavigationSettings | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<PublicNavigationSettings>;
  if (!Array.isArray(data.navigation) || !Array.isArray(data.mobileBottomIds) || data.mobileBottomIds.length !== 3 || !Array.isArray(data.pages)) return null;
  return {
    navigation: data.navigation as PublicNavigationSettings['navigation'],
    mobileBottomIds: data.mobileBottomIds as PublicNavigationSettings['mobileBottomIds'],
    pages: data.pages as PublicNavigationSettings['pages'],
    revision: typeof data.revision === 'number' ? data.revision : fallbackSettings.revision,
  };
}

function createNoticeUrl(href: string, pageId: string) {
  if (typeof window === 'undefined') return href;
  const url = new URL(href, window.location.origin);
  url.searchParams.set('navigation_notice', pageId);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function getPublicPageIdForPath(pathname: string): ConfigurablePageId | null {
  const destination = NAVIGATION_DESTINATIONS.find((item) => item.id !== 'home' && item.href === pathname);
  return destination && isConfigurablePageId(destination.id) ? destination.id : null;
}

export function PublicNavigationProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const pathname = usePathname();
  const shownNotice = useRef<string | null>(null);
  const query = useQuery({
    queryKey: ['publicNavigation'],
    queryFn: async () => {
      const response = await fetch('/api/settings/public', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || 'Não foi possível carregar a navegação pública.');
      const parsed = parsePublicSettings(payload.data);
      if (!parsed) throw new Error('A configuração pública de navegação é inválida.');
      return parsed;
    },
  });
  const settings = query.data || fallbackSettings;

  useEffect(() => {
    if (typeof window === 'undefined' || query.isLoading) return;
    const url = new URL(window.location.href);
    const pageId = url.searchParams.get('navigation_notice');
    if (!pageId || shownNotice.current === pageId) return;
    const page = settings.pages.find((item) => item.id === pageId);
    showToast({
      type: 'warning',
      title: 'Seção indisponível',
      message: page?.disabledMessage || 'Esta seção foi desativada temporariamente pelo administrador.',
      duration: 5200,
    });
    shownNotice.current = pageId;
    url.searchParams.delete('navigation_notice');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [pathname, query.isLoading, settings.pages, showToast]);

  const value = useMemo<PublicNavigationContextValue>(() => ({
    settings,
    isLoading: query.isLoading,
    isError: query.isError,
    isFallback: !query.data,
  }), [query.data, query.isError, query.isLoading, settings]);

  return <PublicNavigationContext.Provider value={value}>{children}</PublicNavigationContext.Provider>;
}

export function usePublicNavigation() {
  return useContext(PublicNavigationContext);
}

export function useVisiblePublicNavigation() {
  const { settings, ...state } = usePublicNavigation();
  return {
    ...state,
    settings,
    items: getVisibleNavigation({ navigation: settings.navigation, pages: settings.pages }),
  };
}

export function PublicPageGate({ pageId, children }: { pageId: ConfigurablePageId | null; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { settings, isLoading } = usePublicNavigation();
  const page = pageId ? settings.pages.find((item) => item.id === pageId) : undefined;
  const redirecting = Boolean(page && !page.enabled);

  useEffect(() => {
    if (!redirecting || !page || pathname === page.redirectHref) return;
    router.replace(createNoticeUrl(page.redirectHref, page.id));
  }, [page, pathname, redirecting, router]);

  if (!pageId || isLoading || !redirecting) return <>{children}</>;

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-6 text-center" role="status" aria-live="polite">
      <div className="space-y-2">
        <p className="text-sm font-bold text-white">Redirecionando</p>
        <p className="text-xs text-gray-400">Esta área está temporariamente indisponível.</p>
      </div>
    </div>
  );
}
