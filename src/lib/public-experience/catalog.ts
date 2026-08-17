import type { JikanAnime } from '@/types/anime';
import type { CatalogPresentationConfig } from '@/types/public-experience';

/**
 * Applies the public catalog curation after Kenjitsu has returned a page.
 * IDs are kept under `mal_id` for UI compatibility, even when the value is
 * the AniList identifier used by the self-hosted catalog.
 */
export function applyCatalogPresentation(
  animes: JikanAnime[] | null | undefined,
  config: CatalogPresentationConfig,
): JikanAnime[] {
  if (!animes?.length) return [];

  const hidden = new Set(config.hiddenAnimeIds);
  const pinned = new Map(config.pinnedAnimeIds.map((id, index) => [id, index]));

  return animes
    .filter((anime) => !hidden.has(anime.mal_id))
    .sort((left, right) => {
      const leftOrder = pinned.get(left.mal_id);
      const rightOrder = pinned.get(right.mal_id);

      if (leftOrder !== undefined && rightOrder !== undefined) {
        return leftOrder - rightOrder;
      }
      if (leftOrder !== undefined) return -1;
      if (rightOrder !== undefined) return 1;
      return 0;
    });
}
