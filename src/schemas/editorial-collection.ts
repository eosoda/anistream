import { z } from 'zod';
import { SafeAssetSchema } from '@/schemas/public-experience';

const DateInputSchema = z
  .string()
  .trim()
  .max(40)
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Use uma data válida.')
  .optional()
  .nullable();

const CollectionSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'O slug precisa ter pelo menos 2 caracteres.')
  .max(80, 'O slug é muito longo.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use somente letras minúsculas, números e hífens.');

const AnimeIdsSchema = z
  .array(z.number().int().positive().max(10_000_000))
  .max(100, 'Uma coleção pode ter no máximo 100 animes.')
  .refine((ids) => new Set(ids).size === ids.length, 'Não repita o mesmo anime na coleção.');

export const EditorialCollectionCreateSchema = z.object({
  slug: CollectionSlugSchema,
  title: z.string().trim().min(1, 'O título é obrigatório.').max(120, 'O título é muito longo.'),
  description: z.string().trim().max(500, 'A descrição é muito longa.').optional().nullable(),
  coverUrl: SafeAssetSchema.optional().nullable(),
  active: z.boolean().default(true),
  publishedFrom: DateInputSchema,
  publishedUntil: DateInputSchema,
  anilistIds: AnimeIdsSchema,
});

export const EditorialCollectionUpdateSchema = EditorialCollectionCreateSchema.partial();

export type EditorialCollectionCreateInput = z.infer<typeof EditorialCollectionCreateSchema>;
export type EditorialCollectionUpdateInput = z.infer<typeof EditorialCollectionUpdateSchema>;
