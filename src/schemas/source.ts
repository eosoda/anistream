import { z } from 'zod';
import { AudioLanguageSchema } from './anime';

export const StreamTypeSchema = z.enum(['hls', 'mp4', 'dash']);
export const SubtitleFormatSchema = z.enum(['vtt', 'srt', 'ass']);

export const SubtitleTrackSchema = z.object({
  language: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url('URL da legenda deve ser válida'),
  format: SubtitleFormatSchema,
});

export const StreamSourceSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  url: z.string().url('URL do stream deve ser válida'),
  type: StreamTypeSchema,
  quality: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  bitrate: z.number().int().positive().optional(),
  audioLanguage: AudioLanguageSchema.optional(),
  subtitles: z.array(SubtitleTrackSchema).optional(),
  requiresProxy: z.boolean().optional().default(false),
  headers: z.record(z.string(), z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  priority: z.number().int().optional().default(0),
});

export const CreateEpisodeSourceSchema = z.object({
  episodeId: z.string().min(1),
  provider: z.string().min(1),
  url: z.string().url('URL do vídeo deve ser autorizada e válida'),
  type: StreamTypeSchema,
  quality: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  bitrate: z.number().int().positive().optional(),
  audioLanguage: AudioLanguageSchema.default('ja'),
  requiresProxy: z.boolean().default(false),
  headers: z.record(z.string(), z.string()).optional(),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
  expiresAt: z.string().datetime().optional(),
  subtitles: z.array(SubtitleTrackSchema).optional(),
});
