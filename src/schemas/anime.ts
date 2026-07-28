import { z } from 'zod';

export const AudioLanguageSchema = z.enum([
  'ja',
  'pt-BR',
  'en',
  'es',
  'unknown',
]);

export const AnimeSearchInputSchema = z.object({
  query: z.string().min(1, 'A consulta de busca não pode estar vazia'),
  language: AudioLanguageSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export const CreateAnimeSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  originalTitle: z.string().optional(),
  slug: z.string().min(1, 'Slug é obrigatório'),
  description: z.string().optional(),
  posterUrl: z.string().url('URL do poster deve ser válida').optional(),
  bannerUrl: z.string().url('URL do banner deve ser válida').optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  status: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  externalIds: z.record(z.string(), z.string()).optional(),
});

export const UpdateAnimeSchema = CreateAnimeSchema.partial();
