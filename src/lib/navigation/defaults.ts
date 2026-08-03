import type { NavigationConfigDocument, NavItemConfig, PageFeatureConfig } from '@/types/navigation';
import { CONFIGURABLE_PAGE_IDS, NAVIGATION_DESTINATIONS, getNavigationDestination, isConfigurablePageId, isNavigationDestinationId } from './registry';

const DEFAULT_DISABLED_MESSAGES: Record<string, string> = {
  popular: 'A área de Populares está temporariamente indisponível.',
  seasons: 'A programação de temporadas está sendo atualizada.',
  calendar: 'O calendário semanal está temporariamente indisponível.',
  movies: 'A seção de filmes está temporariamente indisponível.',
  catalog: 'O catálogo está temporariamente indisponível.',
  favorites: 'A área de favoritos está temporariamente indisponível.',
};

export const DEFAULT_NAVIGATION: NavItemConfig[] = NAVIGATION_DESTINATIONS.map((destination, index) => ({
  id: destination.id,
  label: destination.defaultLabel,
  href: destination.href,
  enabled: true,
  order: index + 1,
}));

export const DEFAULT_PAGES: PageFeatureConfig[] = CONFIGURABLE_PAGE_IDS.map((id) => {
  const destination = getNavigationDestination(id);
  return {
    id,
    name: destination?.defaultLabel || id,
    href: destination?.href || '/',
    enabled: true,
    redirectHref: '/',
    disabledMessage: DEFAULT_DISABLED_MESSAGES[id] || 'Esta seção está temporariamente indisponível.',
  };
});

export const DEFAULT_NAVIGATION_CONFIG: NavigationConfigDocument = {
  schemaVersion: 2,
  revision: 1,
  navigation: DEFAULT_NAVIGATION,
  mobileBottomIds: ['home', 'catalog', 'favorites'],
  pages: DEFAULT_PAGES,
};

function readString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readBoolean(value: unknown, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function mergeNavigation(legacy: unknown): NavItemConfig[] {
  const entries = Array.isArray(legacy) ? legacy : [];
  const legacyById = new Map<string, Record<string, unknown>>();
  entries.forEach((entry) => {
    if (entry && typeof entry === 'object' && 'id' in entry && isNavigationDestinationId(entry.id)) {
      legacyById.set(entry.id, entry as Record<string, unknown>);
    }
  });

  const orderedIds = [
    ...entries
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object' && 'id' in entry && isNavigationDestinationId(entry.id)))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((entry) => String(entry.id)),
    ...NAVIGATION_DESTINATIONS.map((destination) => destination.id),
  ];
  const uniqueIds = Array.from(new Set(orderedIds));

  return uniqueIds.map((id, index) => {
    const destination = getNavigationDestination(id)!;
    const legacyEntry = legacyById.get(id);
    return {
      id: destination.id,
      label: readString(legacyEntry?.label, destination.defaultLabel).slice(0, 40),
      href: destination.href,
      enabled: readBoolean(legacyEntry?.enabled, true),
      order: index + 1,
    };
  });
}

function mergePages(legacy: unknown): PageFeatureConfig[] {
  const entries = Array.isArray(legacy) ? legacy : [];
  const legacyById = new Map<string, Record<string, unknown>>();
  entries.forEach((entry) => {
    if (entry && typeof entry === 'object' && 'id' in entry && isConfigurablePageId(entry.id)) {
      legacyById.set(entry.id, entry as Record<string, unknown>);
    }
  });

  return DEFAULT_PAGES.map((page) => {
    const legacyEntry = legacyById.get(page.id);
    const redirectHref = readString(legacyEntry?.redirectHref, page.redirectHref);
    return {
      ...page,
      name: readString(legacyEntry?.name, page.name).slice(0, 80),
      enabled: readBoolean(legacyEntry?.enabled, true),
      redirectHref: getNavigationDestination(redirectHref.replace(/\/$/, '') || 'home')?.href || '/',
      disabledMessage: readString(legacyEntry?.disabledMessage, page.disabledMessage).slice(0, 300),
    };
  });
}

export function migrateLegacyNavigation(legacyNavigation: unknown, legacyPages: unknown): NavigationConfigDocument {
  const navigation = mergeNavigation(legacyNavigation);
  const pages = mergePages(legacyPages);
  const disabledPages = new Set<string>(pages.filter((page) => !page.enabled).map((page) => page.id));
  const enabled = new Set(navigation.filter((item) => item.enabled && !disabledPages.has(item.id)).map((item) => item.id));
  const mobileBottomIds: NavItemConfig['id'][] = DEFAULT_NAVIGATION_CONFIG.mobileBottomIds.filter((id) => enabled.has(id));
  const available = navigation.filter((item) => item.enabled && !disabledPages.has(item.id) && !mobileBottomIds.includes(item.id)).map((item) => item.id);
  while (mobileBottomIds.length < 3 && available.length) mobileBottomIds.push(available.shift()!);

  if (mobileBottomIds.length < 3) {
    navigation.filter((item) => item.enabled && !mobileBottomIds.includes(item.id)).slice(0, 3 - mobileBottomIds.length).forEach((item) => mobileBottomIds.push(item.id));
    mobileBottomIds.forEach((id) => {
      const page = pages.find((page) => page.id === id);
      if (page) page.enabled = true;
    });
  }

  return {
    schemaVersion: 2,
    revision: 1,
    navigation,
    mobileBottomIds: (mobileBottomIds.length === 3 ? mobileBottomIds : DEFAULT_NAVIGATION_CONFIG.mobileBottomIds) as NavigationConfigDocument['mobileBottomIds'],
    pages,
  };
}
