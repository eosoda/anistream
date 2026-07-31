import { z } from 'zod';
import { AudioLanguageSchema } from './anime';

export const EpisodeLookupInputSchema = z
  .object({
    animeId: z.string().min(1, 'ID do anime é obrigatório'),
    season: z.number().int().min(1, 'Temporada deve ser pelo menos 1').default(1),
    episode: z.number().min(0.1, 'Número do episódio inválido').optional(),
    episodeNumber: z.number().min(0.1, 'Número do episódio inválido').optional(),
    preferredAudio: AudioLanguageSchema.optional(),
    animeTitle: z.string().trim().min(1).optional(),
    originalTitle: z.string().trim().min(1).optional(),
    aliases: z.array(z.string().trim().min(1)).optional(),
  })
  .transform((data) => ({
    ...data,
    episode: data.episode ?? data.episodeNumber ?? 1,
  }));

export const CreateEpisodeSchema = z.object({
  animeId: z.string().min(1, 'ID do anime é obrigatório'),
  season: z.number().int().min(1).default(1),
  number: z.number().min(0.1),
  title: z.string().optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  durationSeconds: z.number().int().positive().optional(),
  airedAt: z.string().datetime().optional(),
});
