import { describe, expect, it } from 'vitest';
import { DEFAULT_HOMEPAGE_DOCUMENT, migrateLegacyHomeSections } from '@/lib/homepage/defaults';
import { HomepageLayoutDocumentSchema } from '@/schemas/homepage';

describe('Homepage layout contract', () => {
  it('provides the current Home as the initial typed composition', () => {
    expect(DEFAULT_HOMEPAGE_DOCUMENT.schemaVersion).toBe(1);
    expect(DEFAULT_HOMEPAGE_DOCUMENT.blocks).toHaveLength(7);
    expect(DEFAULT_HOMEPAGE_DOCUMENT.blocks.map((block) => block.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('migrates legacy section IDs and keeps visibility/order', () => {
    const document = migrateLegacyHomeSections([
      { id: 'top_rated', name: 'Rating', enabled: false, order: 1 },
      { id: 'quick_filter', name: 'Filters', enabled: true, order: 2 },
      { id: 'hero', name: 'Hero', enabled: true, order: 3 },
    ]);

    expect(document.blocks.map((block) => block.id)).toEqual(['top-rated', 'quick-filter', 'hero']);
    expect(document.blocks[0].enabled).toBe(false);
    expect(document.blocks[2].type).toBe('hero');
  });

  it('accepts duplicated typed blocks with independent IDs', () => {
    const result = HomepageLayoutDocumentSchema.safeParse({
      schemaVersion: 1,
      blocks: [
        {
          id: 'one', type: 'catalog_carousel', enabled: true, order: 1,
          frame: { width: 'content', variant: 'default', spacing: 'normal' },
          source: { mode: 'query', source: 'top', category: 'popular' }, title: 'Um', limit: 6,
        },
        {
          id: 'two', type: 'catalog_carousel', enabled: true, order: 2,
          frame: { width: 'wide', variant: 'muted', spacing: 'airy' },
          source: { mode: 'manual', anilistIds: ['52991'] }, title: 'Dois', limit: 8,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects unsafe links, duplicated IDs and an empty visible Home', () => {
    const result = HomepageLayoutDocumentSchema.safeParse({
      schemaVersion: 1,
      blocks: [
        {
          id: 'same', type: 'editorial_notice', enabled: false, order: 1,
          frame: { width: 'content', variant: 'default', spacing: 'normal' },
          title: 'Aviso', body: 'Texto', variant: 'info', active: true,
          cta: { label: 'Abrir', href: 'https://example.com' },
        },
        {
          id: 'same', type: 'divider', enabled: false, order: 2,
          frame: { width: 'content', variant: 'default', spacing: 'normal' },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

