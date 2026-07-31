import { describe, it, expect } from 'vitest';
import {
  CreateAnnouncementSchema,
  CreateWebhookSchema,
  CreateReleaseSchema,
  MaintenanceSettingSchema,
} from '@/schemas/admin';

describe('Admin Zod Schemas', () => {
  describe('CreateAnnouncementSchema', () => {
    it('deve validar um anúncio broadcast válido', () => {
      const valid = {
        title: 'Manutenção Programada',
        content: 'O sistema estará em manutenção às 03:00.',
        type: 'WARNING',
      };
      const res = CreateAnnouncementSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('deve rejeitar anúncio com título muito curto', () => {
      const invalid = { title: 'A', content: 'Conteúdo válido' };
      const res = CreateAnnouncementSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('CreateWebhookSchema', () => {
    it('deve validar um webhook Discord válido', () => {
      const valid = {
        name: 'Discord Notificações',
        url: 'https://discord.com/api/webhooks/123/abc',
        platform: 'DISCORD',
      };
      const res = CreateWebhookSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('deve rejeitar URL malformada de webhook', () => {
      const invalid = { name: 'Discord', url: 'not-a-url' };
      const res = CreateWebhookSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('CreateReleaseSchema & MaintenanceSettingSchema', () => {
    it('deve validar uma nota de versão (Changelog)', () => {
      const valid = {
        version: 'v1.5.0',
        title: 'Suíte de Provedores e Autopilot',
        content: 'Adicionados provedores configuráveis e robô de auto-indexação.',
        type: 'FEATURE',
      };
      const res = CreateReleaseSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('deve validar a configuração do Modo Manutenção', () => {
      const valid = { enabled: true, message: 'Voltamos em breve' };
      const res = MaintenanceSettingSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });
  });
});
