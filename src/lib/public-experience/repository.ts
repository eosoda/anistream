import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/env';
import { redisDelete, redisGetJson, redisSetJson } from '@/lib/cache/redis';
import { PublicExperienceConfigSchema, parsePublicExperienceConfig } from '@/schemas/public-experience';
import { DEFAULT_PUBLIC_EXPERIENCE_CONFIG } from './defaults';
import type {
  PublicExperienceAdminState,
  PublicExperienceConfig,
  PublicExperienceSnapshotKind,
  PublicExperienceSnapshotSummary,
} from '@/types/public-experience';

export const PUBLIC_EXPERIENCE_KEY = 'main' as const;
export const PUBLIC_EXPERIENCE_CACHE_KEY = 'anistream:public-experience:published:main';

export class PublicExperienceConflictError extends Error {
  constructor(message = 'A configuração pública foi alterada por outra sessão.') {
    super(message);
    this.name = 'PublicExperienceConflictError';
  }
}

export class PublicExperienceValidationError extends Error {
  constructor(message = 'A configuração pública é inválida.') {
    super(message);
    this.name = 'PublicExperienceValidationError';
  }
}

export class PublicExperienceSnapshotNotFoundError extends Error {
  constructor(message = 'Snapshot da configuração pública não encontrado.') {
    super(message);
    this.name = 'PublicExperienceSnapshotNotFoundError';
  }
}

interface CachedPublicExperience {
  config: PublicExperienceConfig;
  publishedVersion: number;
  publishedAt: string;
  publishedBy?: string | null;
}

let localPublishedCache: CachedPublicExperience | null = null;

function jsonValue(value: PublicExperienceConfig): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function parseStoredConfig(value: unknown): PublicExperienceConfig {
  const result = PublicExperienceConfigSchema.safeParse(value);
  if (!result.success) throw new PublicExperienceValidationError(result.error.issues[0]?.message || undefined);
  return result.data as PublicExperienceConfig;
}

function snapshotKind(value: string): PublicExperienceSnapshotKind {
  return value === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
}

function toSnapshotSummary(snapshot: {
  id: string;
  version: number;
  kind: string;
  label: string;
  createdAt: Date;
  createdBy: string | null;
}): PublicExperienceSnapshotSummary {
  return {
    id: snapshot.id,
    version: snapshot.version,
    kind: snapshotKind(snapshot.kind),
    label: snapshot.label,
    createdAt: snapshot.createdAt.toISOString(),
    createdBy: snapshot.createdBy,
  };
}

async function findConfig() {
  return prisma.publicExperienceConfig.findUnique({ where: { key: PUBLIC_EXPERIENCE_KEY } });
}

async function ensurePublishedSnapshot(config: {
  key: string;
  publishedJson: unknown;
  publishedVersion: number;
  publishedAt: Date;
  publishedBy: string | null;
}) {
  const where = { configKey_version_kind: { configKey: config.key, version: config.publishedVersion, kind: 'PUBLISHED' } } as const;
  const existing = await prisma.publicExperienceSnapshot.findUnique({ where });
  if (existing) return existing;

  try {
    return await prisma.publicExperienceSnapshot.create({
      data: {
        configKey: config.key,
        version: config.publishedVersion,
        kind: 'PUBLISHED',
        label: `Publicada v${config.publishedVersion}`,
        documentJson: jsonValue(parseStoredConfig(config.publishedJson)),
        createdAt: config.publishedAt,
        createdBy: config.publishedBy,
      },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return prisma.publicExperienceSnapshot.findUnique({ where });
    throw error;
  }
}

export async function ensurePublicExperienceConfig() {
  const existing = await findConfig();
  if (existing) {
    await ensurePublishedSnapshot(existing);
    return existing;
  }

  try {
    return await prisma.$transaction(async (transaction) => {
      const raced = await transaction.publicExperienceConfig.findUnique({ where: { key: PUBLIC_EXPERIENCE_KEY } });
      if (raced) return raced;

      const created = await transaction.publicExperienceConfig.create({
        data: {
          key: PUBLIC_EXPERIENCE_KEY,
          draftJson: jsonValue(DEFAULT_PUBLIC_EXPERIENCE_CONFIG),
          publishedJson: jsonValue(DEFAULT_PUBLIC_EXPERIENCE_CONFIG),
          draftVersion: 1,
          publishedVersion: 1,
          draftUpdatedBy: 'system:default',
          publishedBy: 'system:default',
        },
      });

      await transaction.publicExperienceSnapshot.create({
        data: {
          configKey: created.key,
          version: created.publishedVersion,
          kind: 'PUBLISHED',
          label: 'Publicada v1',
          documentJson: jsonValue(DEFAULT_PUBLIC_EXPERIENCE_CONFIG),
          createdAt: created.publishedAt,
          createdBy: created.publishedBy,
        },
      });
      return created;
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const raced = await findConfig();
      if (raced) return raced;
    }
    throw error;
  }
}

export async function getPublicExperience(): Promise<{
  config: PublicExperienceConfig;
  publishedVersion: number;
  publishedAt: string;
  publishedBy?: string | null;
  source: 'database' | 'cache' | 'emergency';
}> {
  try {
    const cached = await redisGetJson<CachedPublicExperience>(PUBLIC_EXPERIENCE_CACHE_KEY);
    if (cached?.config) {
      localPublishedCache = cached;
      return { ...cached, source: 'cache' };
    }
    if (localPublishedCache?.config) return { ...localPublishedCache, source: 'cache' };

    const stored = await ensurePublicExperienceConfig();
    const payload: CachedPublicExperience = {
      config: parseStoredConfig(stored.publishedJson),
      publishedVersion: stored.publishedVersion,
      publishedAt: stored.publishedAt.toISOString(),
      publishedBy: stored.publishedBy,
    };
    localPublishedCache = payload;
    await redisSetJson(PUBLIC_EXPERIENCE_CACHE_KEY, payload, Math.max(60, env.KENJITSU_CACHE_TTL_SECONDS));
    return { ...payload, source: 'database' };
  } catch (error) {
    console.error('[Public Experience Read Error]', error);
    if (localPublishedCache?.config) return { ...localPublishedCache, source: 'cache' };
    return {
      config: DEFAULT_PUBLIC_EXPERIENCE_CONFIG,
      publishedVersion: 0,
      publishedAt: new Date(0).toISOString(),
      publishedBy: 'system:emergency',
      source: 'emergency',
    };
  }
}

export async function getPublicExperienceAdminState(): Promise<PublicExperienceAdminState> {
  const config = await ensurePublicExperienceConfig();
  const snapshots = await prisma.publicExperienceSnapshot.findMany({
    where: { configKey: PUBLIC_EXPERIENCE_KEY },
    orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
  });
  return {
    key: PUBLIC_EXPERIENCE_KEY,
    draft: parseStoredConfig(config.draftJson),
    published: parseStoredConfig(config.publishedJson),
    draftVersion: config.draftVersion,
    publishedVersion: config.publishedVersion,
    draftUpdatedAt: config.draftUpdatedAt.toISOString(),
    publishedAt: config.publishedAt.toISOString(),
    draftUpdatedBy: config.draftUpdatedBy,
    publishedBy: config.publishedBy,
    snapshots: snapshots.map(toSnapshotSummary),
  };
}

export async function savePublicExperienceDraft(input: { config: unknown; expectedDraftVersion: number; actorId?: string | null }) {
  const document = parsePublicExperienceConfig(input.config);
  const updated = await prisma.$transaction(async (transaction) => {
    const current = await transaction.publicExperienceConfig.findUnique({ where: { key: PUBLIC_EXPERIENCE_KEY } });
    if (!current) throw new PublicExperienceValidationError('Configuração pública não inicializada.');
    if (current.draftVersion !== input.expectedDraftVersion) throw new PublicExperienceConflictError();
    return transaction.publicExperienceConfig.update({
      where: { key: PUBLIC_EXPERIENCE_KEY },
      data: { draftJson: jsonValue(document), draftVersion: { increment: 1 }, draftUpdatedBy: input.actorId || null },
    });
  });
  return { state: await getPublicExperienceAdminState(), updatedAt: updated.draftUpdatedAt.toISOString() };
}

export async function publishPublicExperience(input: { expectedDraftVersion: number; expectedPublishedVersion: number; actorId?: string | null }) {
  const published = await prisma.$transaction(async (transaction) => {
    const current = await transaction.publicExperienceConfig.findUnique({ where: { key: PUBLIC_EXPERIENCE_KEY } });
    if (!current) throw new PublicExperienceValidationError('Configuração pública não inicializada.');
    if (current.draftVersion !== input.expectedDraftVersion || current.publishedVersion !== input.expectedPublishedVersion)
      throw new PublicExperienceConflictError();
    const document = parseStoredConfig(current.draftJson);
    const nextVersion = current.publishedVersion + 1;
    const updated = await transaction.publicExperienceConfig.update({
      where: { key: PUBLIC_EXPERIENCE_KEY },
      data: { publishedJson: jsonValue(document), publishedVersion: { increment: 1 }, publishedAt: new Date(), publishedBy: input.actorId || null },
    });
    await transaction.publicExperienceSnapshot.create({
      data: {
        configKey: PUBLIC_EXPERIENCE_KEY,
        version: nextVersion,
        kind: 'PUBLISHED',
        label: `Publicada v${nextVersion}`,
        documentJson: jsonValue(document),
        createdAt: updated.publishedAt,
        createdBy: updated.publishedBy,
      },
    });
    return updated;
  });
  await invalidatePublicExperienceCache();
  return published;
}

export async function createPublicExperienceSnapshot(input: { expectedDraftVersion: number; actorId?: string | null; label?: string | null }) {
  const current = await ensurePublicExperienceConfig();
  if (current.draftVersion !== input.expectedDraftVersion) throw new PublicExperienceConflictError();
  const existing = await prisma.publicExperienceSnapshot.findUnique({
    where: { configKey_version_kind: { configKey: PUBLIC_EXPERIENCE_KEY, version: current.draftVersion, kind: 'DRAFT' } },
  });
  if (existing) return existing;
  return prisma.publicExperienceSnapshot.create({
    data: {
      configKey: PUBLIC_EXPERIENCE_KEY,
      version: current.draftVersion,
      kind: 'DRAFT',
      label: input.label?.trim().slice(0, 80) || `Rascunho v${current.draftVersion}`,
      documentJson: jsonValue(parseStoredConfig(current.draftJson)),
      createdBy: input.actorId || null,
    },
  });
}

export async function getPublicExperienceSnapshot(id: string) {
  const snapshot = await prisma.publicExperienceSnapshot.findFirst({ where: { id, configKey: PUBLIC_EXPERIENCE_KEY } });
  if (!snapshot) throw new PublicExperienceSnapshotNotFoundError();
  return { ...toSnapshotSummary(snapshot), config: parseStoredConfig(snapshot.documentJson) };
}

export async function restorePublicExperienceSnapshot(input: { id: string; expectedDraftVersion: number; actorId?: string | null }) {
  const snapshot = await prisma.publicExperienceSnapshot.findFirst({ where: { id: input.id, configKey: PUBLIC_EXPERIENCE_KEY } });
  if (!snapshot) throw new PublicExperienceSnapshotNotFoundError();
  const document = parseStoredConfig(snapshot.documentJson);
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.publicExperienceConfig.findUnique({ where: { key: PUBLIC_EXPERIENCE_KEY } });
    if (!current || current.draftVersion !== input.expectedDraftVersion) throw new PublicExperienceConflictError();
    return transaction.publicExperienceConfig.update({
      where: { key: PUBLIC_EXPERIENCE_KEY },
      data: { draftJson: jsonValue(document), draftVersion: { increment: 1 }, draftUpdatedBy: input.actorId || null },
    });
  });
}

export async function invalidatePublicExperienceCache() {
  localPublishedCache = null;
  await redisDelete(PUBLIC_EXPERIENCE_CACHE_KEY);
}
