export type NavDestinationId =
  | 'home'
  | 'popular'
  | 'seasons'
  | 'calendar'
  | 'movies'
  | 'catalog'
  | 'favorites';

export type ConfigurablePageId = Exclude<NavDestinationId, 'home'>;

export interface NavItemConfig {
  id: NavDestinationId;
  label: string;
  href: string;
  enabled: boolean;
  order: number;
}

export interface PageFeatureConfig {
  id: ConfigurablePageId;
  name: string;
  href: string;
  enabled: boolean;
  redirectHref: string;
  disabledMessage: string;
}

export type MobileBottomIds = [NavDestinationId, NavDestinationId, NavDestinationId];

export interface NavigationConfigDocument {
  schemaVersion: 2;
  revision: number;
  navigation: NavItemConfig[];
  mobileBottomIds: MobileBottomIds;
  pages: PageFeatureConfig[];
}

export interface NavigationPreview {
  desktop: NavItemConfig[];
  mobileBottom: Array<NavItemConfig | { id: 'search'; label: 'Buscar'; href: '/pesquisa'; fixed: true }>;
  mobileMore: NavItemConfig[];
  footer: NavItemConfig[];
}

export interface PublicNavigationSettings {
  navigation: NavItemConfig[];
  mobileBottomIds: MobileBottomIds;
  pages: PageFeatureConfig[];
  revision: number;
}

export interface HomeSectionConfig {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}
