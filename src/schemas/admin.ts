import { z } from 'zod';

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(2, 'O título deve ter pelo menos 2 caracteres').max(100, 'Título muito longo'),
  content: z.string().min(5, 'O conteúdo deve ter pelo menos 5 caracteres').max(500, 'Conteúdo muito longo'),
  type: z.enum(['INFO', 'WARNING', 'SUCCESS']).default('INFO'),
  targetGroup: z.string().optional().default('all'),
});

export const CreateWebhookSchema = z.object({
  name: z.string().min(2, 'O nome da integração deve ter pelo menos 2 caracteres').max(60),
  url: z.string().url('URL inválida. Deve iniciar com http:// ou https://'),
  platform: z.enum(['DISCORD', 'TELEGRAM']).default('DISCORD'),
});

export const CreateReleaseSchema = z.object({
  version: z.string().min(1, 'Versão é obrigatória').max(20),
  title: z.string().min(3, 'Título é obrigatório').max(120),
  content: z.string().min(5, 'Descrição é obrigatória').max(2000),
  type: z.enum(['FEATURE', 'FIX', 'IMPROVEMENT']).default('FEATURE'),
});

export const MaintenanceSettingSchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(300).optional(),
});

export const CreateEpisodeReportSchema = z.object({
  episodeId: z.string().trim().min(1).max(64),
  type: z.enum(['NO_AUDIO', 'BROKEN_LINK', 'DESYNC_SUBTITLE', 'OTHER']).default('OTHER'),
  description: z.string().trim().max(1000).optional(),
});

export const UpdateEpisodeReportSchema = z.object({
  id: z.string().trim().min(1).max(64),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'RESOLVED']),
});
