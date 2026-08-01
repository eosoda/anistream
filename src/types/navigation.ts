export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  order: number;
}

export interface PageFeatureConfig {
  id: string;
  name: string;
  href: string;
  enabled: boolean;
  disabledMessage: string;
}

export interface HomeSectionConfig {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
}
