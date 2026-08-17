import type { HomeSectionConfig } from '@/types/navigation';
import type { HomepageBlock, HomepageCatalogCarouselBlock, HomepageLayoutDocument } from '@/types/homepage';
import { parseHomepageDocument } from '@/schemas/homepage';

const frame = (variant: HomepageBlock['frame']['variant'] = 'default'): HomepageBlock['frame'] => ({
  width: variant === 'featured' ? 'full' : 'content',
  variant,
  spacing: variant === 'compact' ? 'compact' : 'normal',
});

const visibility = { desktop: true, mobile: true } as const;

const catalogBlock = (
  id: string,
  order: number,
  title: string,
  subtitle: string,
  category: 'airing' | 'trending' | 'upcoming' | 'popular' | 'rating',
): HomepageCatalogCarouselBlock => ({
  id,
  type: 'catalog_carousel',
  enabled: true,
  order,
  frame: frame(),
  visibility,
  source: { mode: 'query', source: 'top', category },
  title,
  subtitle,
  limit: 8,
  layout: 'carousel',
  preCache: false,
  ctaHref: category === 'airing' ? '/temporadas' : '/populares',
  ctaLabel: 'Ver todos',
});

export const DEFAULT_HOMEPAGE_DOCUMENT: HomepageLayoutDocument = parseHomepageDocument({
  schemaVersion: 1,
  blocks: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      order: 1,
      frame: frame('featured'),
      source: { mode: 'query', source: 'top', category: 'trending' },
      slideLimit: 5,
      autoplay: 'standard',
    },
    {
      id: 'quick-filter',
      type: 'quick_filters',
      enabled: true,
      order: 2,
      frame: frame('compact'),
      title: 'Explore por filtro',
    },
    {
      id: 'continue-watching',
      type: 'continue_watching',
      enabled: true,
      order: 3,
      frame: frame(),
      title: 'Continuar Assistindo',
    },
    catalogBlock('trending', 4, 'Em Alta', 'Os animes mais comentados e assistidos do momento.', 'trending'),
    catalogBlock('season-now', 5, 'Temporada Atual', 'Episódios semanais sendo exibidos agora no Japão.', 'airing'),
    catalogBlock('top-popular', 6, 'Mais Populares', 'Os clássicos e grandes sucessos aclamados pela comunidade.', 'popular'),
    catalogBlock('top-rated', 7, 'Mais Bem Avaliados', 'Títulos com as maiores notas e qualificações de fãs.', 'rating'),
  ],
});

const DEFAULT_BY_LEGACY_ID = new Map<string, HomepageBlock>([
  ['hero', DEFAULT_HOMEPAGE_DOCUMENT.blocks[0]],
  ['quick_filter', DEFAULT_HOMEPAGE_DOCUMENT.blocks[1]],
  ['continue_watching', DEFAULT_HOMEPAGE_DOCUMENT.blocks[2]],
  ['trending', DEFAULT_HOMEPAGE_DOCUMENT.blocks[3]],
  ['season_now', DEFAULT_HOMEPAGE_DOCUMENT.blocks[4]],
  ['top_popular', DEFAULT_HOMEPAGE_DOCUMENT.blocks[5]],
  ['top_rated', DEFAULT_HOMEPAGE_DOCUMENT.blocks[6]],
]);

function cloneBlock(block: HomepageBlock, order: number, enabled: boolean): HomepageBlock {
  return { ...structuredClone(block), order, enabled } as HomepageBlock;
}

export function migrateLegacyHomeSections(sections: unknown): HomepageLayoutDocument {
  if (!Array.isArray(sections)) return DEFAULT_HOMEPAGE_DOCUMENT;

  const migratedBlocks = sections
    .filter((section): section is HomeSectionConfig => Boolean(section && typeof section === 'object' && 'id' in section))
    .map((section, index) => {
      const template = DEFAULT_BY_LEGACY_ID.get(section.id);
      return template ? cloneBlock(template, Number.isInteger(section.order) ? section.order : index + 1, section.enabled !== false) : null;
    })
    .filter((block): block is HomepageBlock => Boolean(block));

  if (!migratedBlocks.length) return DEFAULT_HOMEPAGE_DOCUMENT;

  const normalized = migratedBlocks.sort((a, b) => a.order - b.order).map((block, index) => ({ ...block, order: index + 1 }));

  return parseHomepageDocument({ schemaVersion: 1, blocks: normalized });
}

export function homepageSummary(document: HomepageLayoutDocument, version: number, publishedAt: Date, publishedBy?: string | null) {
  return {
    version,
    publishedAt: publishedAt.toISOString(),
    publishedBy: publishedBy || null,
    visibleBlockCount: document.blocks.filter((block) => block.enabled).length,
    blockTypes: Array.from(new Set(document.blocks.filter((block) => block.enabled).map((block) => block.type))),
  };
}

export function homepageSectionSummary(document: HomepageLayoutDocument): HomeSectionConfig[] {
  return document.blocks
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((block, index) => ({
      id: block.id,
      name:
        block.type === 'catalog_carousel'
          ? block.title
          : block.type === 'hero'
            ? 'Banner Hero (Destaques)'
            : block.type === 'continue_watching'
              ? block.title || 'Continuar Assistindo'
              : block.type === 'quick_filters'
                ? block.title || 'Filtros Rápidos'
                : block.type === 'editorial_notice'
                  ? block.title
                  : block.label || 'Separador',
      enabled: block.enabled,
      order: index + 1,
    }));
}
