import type { ConfigurablePageId, NavDestinationId } from '@/types/navigation';

export interface NavigationDestinationDefinition {
  id: NavDestinationId;
  defaultLabel: string;
  href: string;
  icon: 'home' | 'flame' | 'calendar' | 'film' | 'list' | 'heart';
}

export const NAVIGATION_DESTINATIONS: readonly NavigationDestinationDefinition[] = [
  { id: 'home', defaultLabel: 'Início', href: '/', icon: 'home' },
  { id: 'popular', defaultLabel: 'Populares', href: '/populares', icon: 'flame' },
  { id: 'seasons', defaultLabel: 'Temporadas', href: '/temporadas', icon: 'calendar' },
  { id: 'calendar', defaultLabel: 'Calendário', href: '/calendario', icon: 'calendar' },
  { id: 'movies', defaultLabel: 'Filmes', href: '/filmes', icon: 'film' },
  { id: 'catalog', defaultLabel: 'Catálogo', href: '/lista', icon: 'list' },
  { id: 'favorites', defaultLabel: 'Favoritos', href: '/favoritos', icon: 'heart' },
];

export const NAVIGATION_DESTINATION_IDS = NAVIGATION_DESTINATIONS.map((item) => item.id) as [NavDestinationId, ...NavDestinationId[]];
export const CONFIGURABLE_PAGE_IDS = NAVIGATION_DESTINATIONS.filter((item) => item.id !== 'home').map((item) => item.id) as [ConfigurablePageId, ...ConfigurablePageId[]];

export const SEARCH_NAV_ITEM = { id: 'search' as const, label: 'Buscar' as const, href: '/pesquisa' as const, fixed: true as const };

export function getNavigationDestination(id: string) {
  return NAVIGATION_DESTINATIONS.find((item) => item.id === id);
}

export function getNavigationDestinationByHref(href: string) {
  return NAVIGATION_DESTINATIONS.find((item) => item.href === href);
}

export function isNavigationDestinationId(value: unknown): value is NavDestinationId {
  return typeof value === 'string' && NAVIGATION_DESTINATION_IDS.includes(value as NavDestinationId);
}

export function isConfigurablePageId(value: unknown): value is ConfigurablePageId {
  return typeof value === 'string' && CONFIGURABLE_PAGE_IDS.includes(value as ConfigurablePageId);
}
