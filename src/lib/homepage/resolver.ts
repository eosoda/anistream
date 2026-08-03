import type { JikanAnime } from '@/types/anime';
import { localSearchItemToAnime } from '@/types/local-search';
import type {
  HomepageBlock,
  HomepageCatalogFilters,
  HomepageContentSource,
  HomepageLayoutDocument,
  HomepageResolvedBlock,
} from '@/types/homepage';
import {
  getAnimeCatalog,
  getSeasonAnime,
  getTopAnime,
  searchAnimeCatalog,
  type KenjitsuCatalogFilters,
} from '@/lib/kenjitsu/catalog';

const DEFAULT_LIMIT = 8;

function toKenjitsuFilters(filters?: HomepageCatalogFilters): KenjitsuCatalogFilters | undefined {
  if (!filters) return undefined;
  return {
    status: filters.status,
    minScore: filters.minScore,
    type: filters.type,
    orderBy: filters.orderBy,
    sort: filters.sort,
    letter: filters.letter,
    genres: filters.genres,
  };
}

async function resolveSource(source: HomepageContentSource, limit: number): Promise<{ items: JikanAnime[]; missing: number }> {
  if (source.mode === 'query') {
    if (source.source === 'top') {
      if (!source.category) throw new Error('Categoria Kenjitsu ausente.');
      const result = await getTopAnime(source.category, 1, limit);
      return { items: result.data.slice(0, limit), missing: 0 };
    }

    if (source.source === 'season') {
      if (!source.year || !source.season) throw new Error('Temporada Kenjitsu incompleta.');
      const result = await getSeasonAnime(source.year, source.season, 1, limit);
      return { items: result.data.slice(0, limit), missing: 0 };
    }

    const result = await searchAnimeCatalog(source.filters?.query || '', 1, limit, toKenjitsuFilters(source.filters));
    return { items: result.data.slice(0, limit).map(localSearchItemToAnime), missing: 0 };
  }

  const settled = await Promise.allSettled(source.anilistIds.slice(0, limit).map((id) => getAnimeCatalog(id)));
  const items: JikanAnime[] = [];
  settled.forEach((result) => {
    if (result.status === 'fulfilled') items.push(result.value);
  });
  return { items, missing: settled.length - items.length };
}

function resultFor(block: HomepageBlock, status: HomepageResolvedBlock['status'], data?: JikanAnime[], error?: string): HomepageResolvedBlock {
  return {
    id: block.id,
    type: block.type,
    status,
    ...(data ? { data } : {}),
    ...(error ? { error } : {}),
  };
}

async function resolveContentBlock(block: Extract<HomepageBlock, { type: 'hero' | 'catalog_carousel' }>): Promise<HomepageResolvedBlock> {
  const limit = block.type === 'hero' ? block.slideLimit : block.limit || DEFAULT_LIMIT;
  try {
    const result = await resolveSource(block.source, limit);
    if (result.items.length === 0) {
      return resultFor(block, 'empty', [], result.missing ? `${result.missing} título(s) não foram encontrados no Kenjitsu.` : undefined);
    }
    return resultFor(
      block,
      'ready',
      result.items,
      result.missing ? `${result.missing} título(s) foram ignorados por indisponibilidade no Kenjitsu.` : undefined,
    );
  } catch (error) {
    return resultFor(block, 'error', [], error instanceof Error ? error.message : 'Não foi possível consultar o Kenjitsu.');
  }
}

export async function resolveHomepageDocument(document: HomepageLayoutDocument) {
  const blocks = document.blocks
    .filter((block) => block.enabled)
    .sort((a, b) => a.order - b.order);

  const resolved = await Promise.all(blocks.map(async (block) => {
    if (block.type === 'hero' || block.type === 'catalog_carousel') return resolveContentBlock(block);
    if (block.type === 'continue_watching') return resultFor(block, 'client');
    return resultFor(block, 'ready');
  }));

  return {
    layout: document,
    blocks: resolved,
    generatedAt: new Date().toISOString(),
  };
}
