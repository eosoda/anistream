export type ThemePreset = 'anistream-dark' | 'midnight' | 'high-contrast' | 'custom';
export type ThemeDensity = 'compact' | 'comfortable' | 'airy';
export type FontFamily = 'geist' | 'system' | 'mono';
export type CardDensity = 'compact' | 'comfortable' | 'spacious';
export type CatalogSort = 'popularity' | 'score' | 'title' | 'year';
export type PlayerAudio = 'auto' | 'ja' | 'pt' | 'en' | 'es';
export type PlayerSubtitle = 'auto' | 'off' | 'pt' | 'en' | 'id' | 'th';
export type PlayerQuality = 'auto' | '360p' | '480p' | '720p' | '1080p';

export interface BrandingConfig {
  appName: string;
  brandText: string;
  description: string;
  logoLight: string;
  logoDark: string;
  favicon: string;
  showFooter: boolean;
  showMobileBrand: boolean;
}

export interface ThemeConfig {
  preset: ThemePreset;
  fontFamily: FontFamily;
  density: ThemeDensity;
  accent: string;
  accentHover: string;
  pageBackground: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  focus: string;
  success: string;
  warning: string;
  danger: string;
  radiusControl: 'sharp' | 'rounded' | 'pill';
  radiusPanel: 'sharp' | 'rounded' | 'soft';
}

export interface CatalogPresentationConfig {
  defaultPageSize: number;
  columns: { mobile: 2 | 3; tablet: 3 | 4 | 5; desktop: 4 | 5 | 6 | 7 };
  cardDensity: CardDensity;
  defaultSort: CatalogSort;
  showScore: boolean;
  showYear: boolean;
  showType: boolean;
  showStatus: boolean;
  showEpisodes: boolean;
  showGenres: boolean;
  availableFilters: Array<'search' | 'status' | 'type' | 'genre' | 'year' | 'score'>;
  pageHeadings: Record<'catalog' | 'popular' | 'seasons' | 'movies' | 'search', string>;
  placeholderImage: string;
  pinnedAnimeIds: number[];
  hiddenAnimeIds: number[];
}

export interface PlayerDefaultsConfig {
  autoplay: boolean;
  defaultAudio: PlayerAudio;
  defaultSubtitle: PlayerSubtitle;
  defaultQuality: PlayerQuality;
  defaultSpeed: number;
  showSourcePicker: boolean;
  showReport: boolean;
  keyboardShortcuts: boolean;
  markCompleted: boolean;
  skipOpeningSeconds: number;
  skipEndingSeconds: number;
  preCacheNextEpisode: boolean;
  cacheTtlSeconds: number;
  preferredExtensions: string[];
}

export interface FeatureFlagsConfig {
  favorites: boolean;
  watchHistory: boolean;
  reports: boolean;
  pwa: boolean;
  notifications: boolean;
  calendar: boolean;
  advancedPlayer: boolean;
  search: boolean;
  seasons: boolean;
  movies: boolean;
  releases: boolean;
  maintenanceBanner: boolean;
  publicAnnouncements: boolean;
  changelog: boolean;
}

export interface CommunicationConfig {
  footerDescription: string;
  footerCredit: string;
  showVersionBadge: boolean;
  versionLabel: string;
}

export interface PublicExperienceConfig {
  schemaVersion: 1;
  branding: BrandingConfig;
  theme: ThemeConfig;
  catalog: CatalogPresentationConfig;
  player: PlayerDefaultsConfig;
  features: FeatureFlagsConfig;
  communication: CommunicationConfig;
}

export type PublicExperienceSnapshotKind = 'PUBLISHED' | 'DRAFT';

export interface PublicExperienceSnapshotSummary {
  id: string;
  version: number;
  kind: PublicExperienceSnapshotKind;
  label: string;
  createdAt: string;
  createdBy?: string | null;
}

export interface PublicExperienceAdminState {
  key: 'main';
  draft: PublicExperienceConfig;
  published: PublicExperienceConfig;
  draftVersion: number;
  publishedVersion: number;
  draftUpdatedAt: string;
  publishedAt: string;
  draftUpdatedBy?: string | null;
  publishedBy?: string | null;
  snapshots: PublicExperienceSnapshotSummary[];
}

export interface EditorialCollection {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  active: boolean;
  publishedFrom?: string | null;
  publishedUntil?: string | null;
  items: Array<{ id: string; anilistId: number; order: number }>;
  createdAt: string;
  updatedAt: string;
}
