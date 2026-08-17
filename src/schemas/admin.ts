import { z } from 'zod';

export const CreateAnnouncementSchema = z
  .object({
    title: z.string().min(2, 'O título deve ter pelo menos 2 caracteres').max(100, 'Título muito longo'),
    content: z.string().min(5, 'O conteúdo deve ter pelo menos 5 caracteres').max(500, 'Conteúdo muito longo'),
    type: z.enum(['INFO', 'WARNING', 'SUCCESS']).default('INFO'),
    targetGroup: z.string().optional().default('all'),
    startsAt: z.string().datetime({ local: true }).optional().nullable(),
    endsAt: z.string().datetime({ local: true }).optional().nullable(),
    priority: z.number().int().min(0).max(100).default(0),
    placement: z.enum(['banner', 'home', 'player']).default('banner'),
    ctaLabel: z.string().trim().max(60).optional().nullable(),
    ctaHref: z
      .string()
      .trim()
      .regex(/^\/(?!\/)[^\s<>]*$/, 'Use uma rota interna.')
      .max(180)
      .optional()
      .nullable(),
  })
  .superRefine((value, context) => {
    if (value.startsAt && value.endsAt && new Date(value.endsAt) < new Date(value.startsAt)) {
      context.addIssue({
        code: 'custom',
        path: ['endsAt'],
        message: 'O término precisa ser posterior ao início.',
      });
    }
    if (value.ctaLabel && !value.ctaHref)
      context.addIssue({
        code: 'custom',
        path: ['ctaHref'],
        message: 'Informe a rota do CTA.',
      });
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
