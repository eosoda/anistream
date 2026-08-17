import { describe, expect, it } from 'vitest';
import { DEFAULT_PUBLIC_EXPERIENCE_CONFIG, publicExperienceThemeVariables } from '@/lib/public-experience/defaults';
import { PublicExperienceConfigSchema } from '@/schemas/public-experience';
import { EditorialCollectionCreateSchema } from '@/schemas/editorial-collection';
import { HomepageLayoutDocumentSchema } from '@/schemas/homepage';
import { applyCatalogPresentation } from '@/lib/public-experience/catalog';

describe('public experience configuration', () => {
  it('keeps a complete safe default configuration', () => {
    const result = PublicExperienceConfigSchema.safeParse(DEFAULT_PUBLIC_EXPERIENCE_CONFIG);
    expect(result.success).toBe(true);
    expect(DEFAULT_PUBLIC_EXPERIENCE_CONFIG.player.cacheTtlSeconds).toBe(240);
    expect(publicExperienceThemeVariables(DEFAULT_PUBLIC_EXPERIENCE_CONFIG.theme)['--accent']).toBe('#ff6b00');
  });

  it('rejects arbitrary CSS, unsafe assets and invalid internal presentation values', () => {
    const invalid = structuredClone(DEFAULT_PUBLIC_EXPERIENCE_CONFIG) as typeof DEFAULT_PUBLIC_EXPERIENCE_CONFIG;
    invalid.branding.favicon = 'javascript:alert(1)';
    invalid.theme.accent = 'red';
    expect(PublicExperienceConfigSchema.safeParse(invalid).success).toBe(false);
  });

  it('accepts a collection source and applies defaults to older Home blocks', () => {
    const result = HomepageLayoutDocumentSchema.safeParse({
      schemaVersion: 1,
      blocks: [
        {
          id: 'collection',
          type: 'catalog_carousel',
          enabled: true,
          order: 1,
          frame: { width: 'content', variant: 'default', spacing: 'normal' },
          source: { mode: 'collection', slug: 'destaques-da-semana' },
          title: 'Destaques',
          limit: 6,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blocks[0].type === 'catalog_carousel' && result.data.blocks[0].layout).toBe('carousel');
      expect(result.data.blocks[0].type === 'catalog_carousel' && result.data.blocks[0].visibility.mobile).toBe(true);
    }
  });

  it('applies hidden and pinned catalog curation without changing the public item shape', () => {
    const config = structuredClone(DEFAULT_PUBLIC_EXPERIENCE_CONFIG.catalog);
    config.hiddenAnimeIds = [20];
    config.pinnedAnimeIds = [30, 10];
    const items = [{ mal_id: 10 }, { mal_id: 20 }, { mal_id: 30 }, { mal_id: 40 }] as never[];

    expect(applyCatalogPresentation(items, config).map((item) => item.mal_id)).toEqual([30, 10, 40]);
  });
});

describe('editorial collection validation', () => {
  it('accepts ordered IDs and rejects duplicates or invalid scheduling', () => {
    expect(EditorialCollectionCreateSchema.safeParse({ slug: 'semana-1', title: 'Semana 1', anilistIds: [21, 1535] }).success).toBe(true);
    expect(EditorialCollectionCreateSchema.safeParse({ slug: 'semana-1', title: 'Semana 1', anilistIds: [21, 21] }).success).toBe(false);
    expect(EditorialCollectionCreateSchema.safeParse({ slug: 'Semana 1', title: 'Semana 1', anilistIds: [21] }).success).toBe(false);
  });
});
