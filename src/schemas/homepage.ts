import { z } from 'zod';
import type { HomepageLayoutDocument } from '@/types/homepage';

export const InternalHomepageRouteSchema = z
  .string()
  .trim()
  .min(1, 'A rota é obrigatória.')
  .max(180, 'A rota é muito longa.')
  .refine(
    (value) => value.startsWith('/') && !value.startsWith('//') && !/[\s<>]/.test(value),
    'Use somente uma rota interna do AniStream.'
  );

const HomepageFrameSchema = z.object({
  width: z.enum(['content', 'wide', 'full']).default('content'),
  variant: z.enum(['default', 'featured', 'muted', 'compact']).default('default'),
  spacing: z.enum(['compact', 'normal', 'airy']).default('normal'),
});

const HomepageBaseBlockSchema = z.object({
  id: z.string().trim().min(1).max(80),
  enabled: z.boolean().default(true),
  order: z.number().int().min(1).max(100),
  frame: HomepageFrameSchema,
});

const HomepageCatalogFiltersSchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: z.enum(['airing', 'complete', 'upcoming', 'all']).optional(),
  minScore: z.number().min(0).max(10).optional(),
  type: z.enum(['tv', 'movie', 'ova', 'special', 'ona', 'all']).optional(),
  orderBy: z.enum(['score', 'popularity', 'title', 'start_date']).optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  letter: z.string().regex(/^(?:all|#|[a-z])$/i).optional(),
  genres: z.string().regex(/^[0-9,\s]*$/).max(100).optional(),
});

const HomepageQuerySourceSchema = z
  .object({
    mode: z.literal('query'),
    source: z.enum(['top', 'season', 'catalog']),
    category: z.enum(['airing', 'trending', 'upcoming', 'popular', 'rating']).optional(),
    year: z.number().int().min(1900).max(2200).optional(),
    season: z.enum(['winter', 'spring', 'summer', 'fall']).optional(),
    filters: HomepageCatalogFiltersSchema.optional(),
  })
  .superRefine((source, context) => {
    if (source.source === 'top' && !source.category) {
      context.addIssue({ code: 'custom', path: ['category'], message: 'Escolha uma categoria Kenjitsu.' });
    }
    if (source.source === 'season' && (!source.year || !source.season)) {
      context.addIssue({ code: 'custom', path: ['season'], message: 'Temporada exige ano e estação.' });
    }
  });

const HomepageManualSourceSchema = z.object({
  mode: z.literal('manual'),
  anilistIds: z
    .array(z.string().regex(/^\d+$/, 'Use o anilistId numérico do Kenjitsu.'))
    .min(1, 'Selecione pelo menos um título.')
    .max(12, 'Uma coleção pode ter no máximo 12 títulos.'),
});

export const HomepageContentSourceSchema = z.discriminatedUnion('mode', [
  HomepageQuerySourceSchema,
  HomepageManualSourceSchema,
]);

const HomepageHeroBlockSchema = HomepageBaseBlockSchema.extend({
  type: z.literal('hero'),
  source: HomepageContentSourceSchema,
  slideLimit: z.number().int().min(1).max(5),
  autoplay: z.enum(['off', 'slow', 'standard']),
  titleOverride: z.string().trim().max(120).optional(),
  subtitleOverride: z.string().trim().max(240).optional(),
}).superRefine((block, context) => {
  if (block.source.mode === 'manual' && block.source.anilistIds.length > block.slideLimit) {
    context.addIssue({ code: 'custom', path: ['source', 'anilistIds'], message: 'A curadoria manual excede o limite de slides.' });
  }
});

const HomepageCatalogCarouselBlockSchema = HomepageBaseBlockSchema.extend({
  type: z.literal('catalog_carousel'),
  source: HomepageContentSourceSchema,
  title: z.string().trim().min(1).max(100),
  subtitle: z.string().trim().max(240).optional(),
  limit: z.number().int().min(6).max(12),
  ctaHref: InternalHomepageRouteSchema.optional(),
  ctaLabel: z.string().trim().max(60).optional(),
});

const HomepageContinueWatchingBlockSchema = HomepageBaseBlockSchema.extend({
  type: z.literal('continue_watching'),
  title: z.string().trim().max(100).optional(),
});

const HomepageQuickFiltersBlockSchema = HomepageBaseBlockSchema.extend({
  type: z.literal('quick_filters'),
  title: z.string().trim().max(100).optional(),
});

const HomepageEditorialNoticeBlockSchema = HomepageBaseBlockSchema.extend({
  type: z.literal('editorial_notice'),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(500),
  variant: z.enum(['info', 'warning', 'success']),
  active: z.boolean(),
  cta: z.object({
    label: z.string().trim().min(1).max(60),
    href: InternalHomepageRouteSchema,
  }).optional(),
});

const HomepageDividerBlockSchema = HomepageBaseBlockSchema.extend({
  type: z.literal('divider'),
  label: z.string().trim().max(80).optional(),
});

export const HomepageBlockSchema = z.discriminatedUnion('type', [
  HomepageHeroBlockSchema,
  HomepageCatalogCarouselBlockSchema,
  HomepageContinueWatchingBlockSchema,
  HomepageQuickFiltersBlockSchema,
  HomepageEditorialNoticeBlockSchema,
  HomepageDividerBlockSchema,
]);

export const HomepageLayoutDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  blocks: z.array(HomepageBlockSchema).min(1).max(12),
}).superRefine((document, context) => {
  const ids = new Set<string>();
  document.blocks.forEach((block, index) => {
    if (ids.has(block.id)) {
      context.addIssue({ code: 'custom', path: ['blocks', index, 'id'], message: 'Cada bloco precisa ter um ID único.' });
    }
    ids.add(block.id);
  });

  if (!document.blocks.some((block) => block.enabled)) {
    context.addIssue({ code: 'custom', path: ['blocks'], message: 'A publicação precisa ter pelo menos um bloco visível.' });
  }
});

export type ValidatedHomepageDocument = z.infer<typeof HomepageLayoutDocumentSchema>;

export function parseHomepageDocument(value: unknown): HomepageLayoutDocument {
  return HomepageLayoutDocumentSchema.parse(value) as HomepageLayoutDocument;
}

export function safeParseHomepageDocument(value: unknown) {
  return HomepageLayoutDocumentSchema.safeParse(value);
}

export type HomepageBlockInput = z.input<typeof HomepageBlockSchema>;
export type HomepageBlockOutput = z.output<typeof HomepageBlockSchema>;
export type HomepageBlock = z.infer<typeof HomepageBlockSchema>;
