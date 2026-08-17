import type { JikanAnime } from './anime';

export type HomepageBlockType = 'hero' | 'catalog_carousel' | 'continue_watching' | 'quick_filters' | 'editorial_notice' | 'divider';

export type HomepageFrameWidth = 'content' | 'wide' | 'full';
export type HomepageFrameVariant = 'default' | 'featured' | 'muted' | 'compact';
export type HomepageFrameSpacing = 'compact' | 'normal' | 'airy';

export interface HomepageFrame {
  width: HomepageFrameWidth;
  variant: HomepageFrameVariant;
  spacing: HomepageFrameSpacing;
}

export interface HomepageBaseBlock {
  id: string;
  enabled: boolean;
  order: number;
  frame: HomepageFrame;
  visibility: {
    desktop: boolean;
    mobile: boolean;
  };
  background?: string;
}

export type HomepageTopCategory = 'airing' | 'trending' | 'upcoming' | 'popular' | 'rating';
export type HomepageCatalogType = 'tv' | 'movie' | 'ova' | 'special' | 'ona' | 'all';
export type HomepageCatalogStatus = 'airing' | 'complete' | 'upcoming' | 'all';
export type HomepageCatalogOrder = 'score' | 'popularity' | 'title' | 'start_date';
export type HomepageCatalogSort = 'asc' | 'desc';
export type HomepageSeason = 'winter' | 'spring' | 'summer' | 'fall';

export interface HomepageCatalogFilters {
  query?: string;
  status?: HomepageCatalogStatus;
  minScore?: number;
  type?: HomepageCatalogType;
  orderBy?: HomepageCatalogOrder;
  sort?: HomepageCatalogSort;
  letter?: string;
  genres?: string;
}

export interface HomepageQuerySource {
  mode: 'query';
  source: 'top' | 'season' | 'catalog';
  category?: HomepageTopCategory;
  year?: number;
  season?: HomepageSeason;
  filters?: HomepageCatalogFilters;
}

export interface HomepageManualSource {
  mode: 'manual';
  anilistIds: string[];
}

export interface HomepageCollectionSource {
  mode: 'collection';
  slug: string;
}

export type HomepageContentSource = HomepageQuerySource | HomepageManualSource | HomepageCollectionSource;

export interface HomepageHeroBlock extends HomepageBaseBlock {
  type: 'hero';
  source: HomepageContentSource;
  slideLimit: number;
  autoplay: 'off' | 'slow' | 'standard';
  titleOverride?: string;
  subtitleOverride?: string;
}

export interface HomepageCatalogCarouselBlock extends HomepageBaseBlock {
  type: 'catalog_carousel';
  source: HomepageContentSource;
  title: string;
  subtitle?: string;
  limit: number;
  layout: 'carousel' | 'grid' | 'horizontal';
  preCache: boolean;
  emptyState?: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export interface HomepageContinueWatchingBlock extends HomepageBaseBlock {
  type: 'continue_watching';
  title?: string;
}

export interface HomepageQuickFiltersBlock extends HomepageBaseBlock {
  type: 'quick_filters';
  title?: string;
}

export type HomepageNoticeVariant = 'info' | 'warning' | 'success';

export interface HomepageEditorialNoticeBlock extends HomepageBaseBlock {
  type: 'editorial_notice';
  title: string;
  body: string;
  variant: HomepageNoticeVariant;
  active: boolean;
  cta?: {
    label: string;
    href: string;
  };
}

export interface HomepageDividerBlock extends HomepageBaseBlock {
  type: 'divider';
  label?: string;
}

export type HomepageBlock =
  | HomepageHeroBlock
  | HomepageCatalogCarouselBlock
  | HomepageContinueWatchingBlock
  | HomepageQuickFiltersBlock
  | HomepageEditorialNoticeBlock
  | HomepageDividerBlock;

export interface HomepageLayoutDocument {
  schemaVersion: 1;
  blocks: HomepageBlock[];
}

export interface HomepagePublishedSummary {
  version: number;
  publishedAt: string;
  publishedBy?: string | null;
  visibleBlockCount: number;
  blockTypes: HomepageBlockType[];
}

export type HomepageSnapshotKind = 'PUBLISHED' | 'DRAFT';

export interface HomepageSnapshotSummary {
  id: string;
  version: number;
  kind: HomepageSnapshotKind;
  label: string;
  createdAt: string;
  createdBy?: string | null;
  visibleBlockCount: number;
  blockTypes: HomepageBlockType[];
}

export interface HomepageSnapshotDetail extends HomepageSnapshotSummary {
  document: HomepageLayoutDocument;
}

export interface HomepageAdminState {
  key: 'main';
  draft: HomepageLayoutDocument;
  published: HomepageLayoutDocument;
  draftVersion: number;
  publishedVersion: number;
  draftUpdatedAt: string;
  publishedAt: string;
  draftUpdatedBy?: string | null;
  publishedBy?: string | null;
  summary: HomepagePublishedSummary;
  snapshots: HomepageSnapshotSummary[];
}

export type HomepageBlockStatus = 'ready' | 'empty' | 'error' | 'client';

export interface HomepageResolvedBlock {
  id: string;
  type: HomepageBlockType;
  status: HomepageBlockStatus;
  data?: JikanAnime[];
  error?: string;
}

export interface HomepageResolvedPayload {
  layout: HomepageLayoutDocument;
  blocks: HomepageResolvedBlock[];
  generatedAt: string;
  source: 'published' | 'draft' | 'emergency';
}
