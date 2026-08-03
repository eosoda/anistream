import { prisma } from '@/lib/db/prisma';

export interface AdminAuditInput {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
}

const sensitiveKey = /(token|secret|password|authorization|cookie|encrypted|api.?key)/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]';
  if (typeof value === 'string') return value.length > 800 ? `${value.slice(0, 797)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 40).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).slice(0, 40).map(([key, child]) => [key, sensitiveKey.test(key) ? '[redacted]' : sanitize(child, depth + 1)]),
    );
  }
  return value;
}

export async function recordAdminAudit(input: AdminAuditInput) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: input.actorId && input.actorId !== 'admin-master' ? input.actorId : null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId || null,
        summary: input.summary,
        metadataJson: input.metadata ? JSON.stringify(sanitize(input.metadata)) : null,
      },
    });
  } catch (error) {
    console.error('[admin-audit] Não foi possível registrar a atividade administrativa.', error);
  }
}

export function parseAuditMetadata(metadataJson?: string | null): Record<string, unknown> | null {
  if (!metadataJson) return null;
  try {
    const parsed = JSON.parse(metadataJson);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
