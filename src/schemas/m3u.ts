import { z } from 'zod';

export const M3uItemSchema = z.object({
  rawTitle: z.string().min(1),
  normalizedTitle: z.string().min(1),
  detectedSeason: z.number().int().min(1).default(1),
  detectedEpisode: z.number().min(0.1),
  logoUrl: z.string().url().optional(),
  groupTitle: z.string().optional(),
  streamUrl: z.string().url(),
  isValidUrl: z.boolean(),
  isDuplicate: z.boolean().default(false),
});

export const M3uImportInputSchema = z.object({
  content: z.string().min(1, 'O conteúdo M3U não pode estar vazio'),
  defaultProviderName: z
    .string()
    .min(1)
    .default('authorized-m3u-import'),
  defaultAudioLanguage: z.string().default('ja'),
  defaultQuality: z.string().default('1080p'),
  requiresProxy: z.boolean().default(false),
  priority: z.number().int().default(50),
});
