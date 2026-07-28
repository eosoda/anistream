import { z } from 'zod';
import { StreamSourceSchema } from './source';

export const ProviderHealthSchema = z.object({
  providerId: z.string(),
  name: z.string(),
  status: z.enum(['healthy', 'degraded', 'down']),
  latencyMs: z.number().int().min(0),
  lastChecked: z.string().datetime(),
  errorMessage: z.string().optional(),
});

export const ConfiguredJsonSourceSchema = z.object({
  anime: z.object({
    title: z.string().min(1),
    aliases: z.array(z.string()).optional(),
    externalIds: z.record(z.string(), z.string()).optional(),
  }),
  season: z.number().int().min(1).default(1),
  episode: z.number().min(0.1),
  audioLanguage: z.string().default('ja'),
  quality: z.string().optional(),
  type: z.enum(['hls', 'mp4', 'dash']),
  url: z.string().url(),
  subtitles: z
    .array(
      z.object({
        language: z.string(),
        label: z.string(),
        format: z.enum(['vtt', 'srt', 'ass']),
        url: z.string().url(),
      })
    )
    .optional(),
  headers: z.record(z.string(), z.string()).optional(),
  requiresProxy: z.boolean().default(false),
  priority: z.number().int().default(0),
});

export const ConfiguredJsonFileSchema = z.object({
  version: z.number().int().min(1),
  sources: z.array(ConfiguredJsonSourceSchema),
});
