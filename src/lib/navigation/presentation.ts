import type { NavigationConfigDocument, NavigationPreview, NavItemConfig, PublicNavigationSettings } from '@/types/navigation';
import { SEARCH_NAV_ITEM } from './registry';

export function getVisibleNavigation(config: Pick<NavigationConfigDocument, 'navigation' | 'pages'>): NavItemConfig[] {
  const disabledPageIds = new Set<string>(config.pages.filter((page) => !page.enabled).map((page) => page.id));
  return config.navigation
    .filter((item) => item.enabled && !disabledPageIds.has(item.id))
    .slice()
    .sort((a, b) => a.order - b.order);
}

export function buildNavigationPreview(config: NavigationConfigDocument): NavigationPreview {
  const visible = getVisibleNavigation(config);
  const byId = new Map(config.navigation.map((item) => [item.id, item]));
  const mobileBottom = config.mobileBottomIds.map((id) => byId.get(id)).filter((item): item is NavItemConfig => Boolean(item && item.enabled && !config.pages.some((page) => page.id === item.id && !page.enabled)));
  return {
    desktop: visible,
    mobileBottom: [mobileBottom[0], SEARCH_NAV_ITEM, mobileBottom[1], mobileBottom[2]].filter(Boolean) as NavigationPreview['mobileBottom'],
    mobileMore: visible.filter((item) => !config.mobileBottomIds.includes(item.id)),
    footer: visible,
  };
}

export function toPublicNavigation(config: NavigationConfigDocument): PublicNavigationSettings {
  return {
    navigation: config.navigation.slice().sort((a, b) => a.order - b.order),
    mobileBottomIds: config.mobileBottomIds,
    pages: config.pages,
    revision: config.revision,
  };
}
