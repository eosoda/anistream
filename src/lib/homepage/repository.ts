import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/env';
import { redisDelete, redisGetJson, redisSetJson } from '@/lib/cache/redis';
import { parseHomepageDocument } from '@/schemas/homepage';
import { DEFAULT_HOMEPAGE_DOCUMENT, homepageSummary, migrateLegacyHomeSections } from './defaults';
import type { HomepageAdminState, HomepageLayoutDocument, HomepageSnapshotDetail, HomepageSnapshotKind, HomepageSnapshotSummary } from '@/types/homepage';

export const HOMEPAGE_LAYOUT_KEY = 'main' as const;
const HOMEPAGE_CACHE_KEY = 'anistream:homepage:published:main';

export class HomepageConflictError extends Error {
  constructor(message = 'O rascunho da Home foi alterado por outro administrador.') {
    super(message);
    this.name = 'HomepageConflictError';
  }
}

export class HomepageValidationError extends Error {
  constructor(message = 'A composição da Home é inválida.') {
    super(message);
    this.name = 'HomepageValidationError';
  }
}

export class HomepageSnapshotNotFoundError extends Error {
  constructor(message = 'Snapshot da Home não encontrado.') {
    super(message);
    this.name = 'HomepageSnapshotNotFoundError';
  }
}

interface CachedPublishedHomepage {
  document: HomepageLayoutDocument;
  publishedVersion: number;
  publishedAt: string;
  publishedBy?: string | null;
}

let localPublishedCache: CachedPublishedHomepage | null = null;

function jsonValue(value: HomepageLayoutDocument): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function parseJsonDocument(value: unknown): HomepageLayoutDocument {
  try {
    return parseHomepageDocument(value);
  } catch (error) {
    throw new HomepageValidationError(error instanceof Error ? error.message : 'Documento da Home inválido.');
  }
}

function parseSetting(value: string | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function findLayout() {
  return prisma.homepageLayout.findUnique({ where: { key: HOMEPAGE_LAYOUT_KEY } });
}

function snapshotKind(value: string): HomepageSnapshotKind {
  return value === 'DRAFT' ? 'DRAFT' : 'PUBLISHED';
}

function toSnapshotSummary(snapshot: {
  id: string;
  version: number;
  kind: string;
  label: string;
  documentJson: unknown;
  createdAt: Date;
  createdBy: string | null;
}): HomepageSnapshotSummary {
  const document = parseJsonDocument(snapshot.documentJson);
  const summary = homepageSummary(document, snapshot.version, snapshot.createdAt, snapshot.createdBy);
  return {
    id: snapshot.id,
    version: snapshot.version,
    kind: snapshotKind(snapshot.kind),
    label: snapshot.label,
    createdAt: snapshot.createdAt.toISOString(),
    createdBy: snapshot.createdBy,
    visibleBlockCount: summary.visibleBlockCount,
    blockTypes: summary.blockTypes,
  };
}

async function ensurePublishedSnapshot(layout: {
  key: string;
  publishedJson: unknown;
  publishedVersion: number;
  publishedAt: Date;
  publishedBy: string | null;
}) {
  const where = {
    layoutKey_version_kind: {
      layoutKey: layout.key,
      version: layout.publishedVersion,
      kind: 'PUBLISHED',
    },
  } as const;
  const existing = await prisma.homepageSnapshot.findUnique({ where });
  if (existing) return existing;

  const document = parseJsonDocument(layout.publishedJson);
  try {
    return await prisma.homepageSnapshot.create({
      data: {
        layoutKey: layout.key,
        version: layout.publishedVersion,
        kind: 'PUBLISHED',
        label: `Publicada v${layout.publishedVersion}`,
        documentJson: jsonValue(document),
        createdAt: layout.publishedAt,
        createdBy: layout.publishedBy,
      },
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return prisma.homepageSnapshot.findUnique({ where });
    }
    throw error;
  }
}

export async function ensureHomepageLayout() {
  const existing = await findLayout();
  if (existing) {
    await ensurePublishedSnapshot(existing);
    return existing;
  }

  const legacy = await prisma.systemSetting.findUnique({ where: { key: 'home_sections' } });
  const document = migrateLegacyHomeSections(parseSetting(legacy?.value));

  try {
    return await prisma.$transaction(async (transaction) => {
      const raced = await transaction.homepageLayout.findUnique({ where: { key: HOMEPAGE_LAYOUT_KEY } });
      if (raced) return raced;

      const created = await transaction.homepageLayout.create({
        data: {
          key: HOMEPAGE_LAYOUT_KEY,
          draftJson: jsonValue(document),
          publishedJson: jsonValue(document),
          draftVersion: 1,
          publishedVersion: 1,
          draftUpdatedBy: 'system:migration',
          publishedBy: 'system:migration',
        },
      });

      await transaction.homepageSnapshot.create({
        data: {
          layoutKey: created.key,
          version: created.publishedVersion,
          kind: 'PUBLISHED',
          label: `Publicada v${created.publishedVersion}`,
          documentJson: jsonValue(document),
          createdAt: created.publishedAt,
          createdBy: created.publishedBy,
        },
      });

      if (legacy) {
        await transaction.systemSetting.delete({ where: { key: 'home_sections' } });
      }

      localPublishedCache = {
        document,
        publishedVersion: created.publishedVersion,
        publishedAt: created.publishedAt.toISOString(),
        publishedBy: created.publishedBy,
      };
      await redisSetJson(HOMEPAGE_CACHE_KEY, localPublishedCache, env.KENJITSU_CACHE_TTL_SECONDS);
      return created;
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const raced = await findLayout();
      if (raced) return raced;
    }
    throw error;
  }
}

export async function getHomepageLayout() {
  await ensureHomepageLayout();
  return findLayout();
}

export async function getAdminHomepageState(): Promise<HomepageAdminState> {
  const layout = await getHomepageLayout();
  if (!layout) throw new Error('Layout principal da Home não encontrado.');

  const draft = parseJsonDocument(layout.draftJson);
  const published = parseJsonDocument(layout.publishedJson);
  const snapshots = await prisma.homepageSnapshot.findMany({
    where: { layoutKey: HOMEPAGE_LAYOUT_KEY },
    orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
  });
  return {
    key: HOMEPAGE_LAYOUT_KEY,
    draft,
    published,
    draftVersion: layout.draftVersion,
    publishedVersion: layout.publishedVersion,
    draftUpdatedAt: layout.draftUpdatedAt.toISOString(),
    publishedAt: layout.publishedAt.toISOString(),
    draftUpdatedBy: layout.draftUpdatedBy,
    publishedBy: layout.publishedBy,
    summary: homepageSummary(published, layout.publishedVersion, layout.publishedAt, layout.publishedBy),
    snapshots: snapshots.map(toSnapshotSummary),
  };
}

export async function listHomepageSnapshots() {
  await ensureHomepageLayout();
  const snapshots = await prisma.homepageSnapshot.findMany({
    where: { layoutKey: HOMEPAGE_LAYOUT_KEY },
    orderBy: [{ createdAt: 'desc' }, { version: 'desc' }],
  });
  return snapshots.map(toSnapshotSummary);
}

export async function getHomepageSnapshot(id: string): Promise<HomepageSnapshotDetail> {
  await ensureHomepageLayout();
  const snapshot = await prisma.homepageSnapshot.findFirst({ where: { id, layoutKey: HOMEPAGE_LAYOUT_KEY } });
  if (!snapshot) throw new HomepageSnapshotNotFoundError();
  const document = parseJsonDocument(snapshot.documentJson);
  return { ...toSnapshotSummary(snapshot), document };
}

export async function createHomepageDraftSnapshot(input: {
  expectedDraftVersion: number;
  actorId?: string | null;
  label?: string | null;
}) {
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.homepageLayout.findUnique({ where: { key: HOMEPAGE_LAYOUT_KEY } });
    if (!current) throw new Error('Layout principal da Home não encontrado.');
    if (current.draftVersion !== input.expectedDraftVersion) throw new HomepageConflictError();

    const document = parseJsonDocument(current.draftJson);
    const existing = await transaction.homepageSnapshot.findUnique({
      where: {
        layoutKey_version_kind: {
          layoutKey: HOMEPAGE_LAYOUT_KEY,
          version: current.draftVersion,
          kind: 'DRAFT',
        },
      },
    });
    if (existing) return existing;

    const label = input.label?.trim().slice(0, 80) || `Rascunho v${current.draftVersion}`;
    return transaction.homepageSnapshot.create({
      data: {
        layoutKey: HOMEPAGE_LAYOUT_KEY,
        version: current.draftVersion,
        kind: 'DRAFT',
        label,
        documentJson: jsonValue(document),
        createdBy: input.actorId || null,
      },
    });
  });
}

export async function restoreHomepageSnapshot(input: {
  id: string;
  expectedDraftVersion: number;
  actorId?: string | null;
}) {
  const snapshot = await prisma.homepageSnapshot.findFirst({ where: { id: input.id, layoutKey: HOMEPAGE_LAYOUT_KEY } });
  if (!snapshot) throw new HomepageSnapshotNotFoundError();
  const document = parseJsonDocument(snapshot.documentJson);

  return prisma.$transaction(async (transaction) => {
    const current = await transaction.homepageLayout.findUnique({ where: { key: HOMEPAGE_LAYOUT_KEY } });
    if (!current) throw new Error('Layout principal da Home não encontrado.');
    if (current.draftVersion !== input.expectedDraftVersion) throw new HomepageConflictError();

    return transaction.homepageLayout.update({
      where: { key: HOMEPAGE_LAYOUT_KEY },
      data: {
        draftJson: jsonValue(document),
        draftVersion: { increment: 1 },
        draftUpdatedBy: input.actorId || null,
      },
    });
  });
}

export async function getPublishedHomepageDocument(): Promise<{
  document: HomepageLayoutDocument;
  publishedVersion: number;
  publishedAt: string;
  publishedBy?: string | null;
  source: 'database' | 'cache' | 'emergency';
}> {
  try {
    const cached = await redisGetJson<CachedPublishedHomepage>(HOMEPAGE_CACHE_KEY);
    if (cached?.document) {
      localPublishedCache = cached;
      return { ...cached, source: 'cache' };
    }

    if (localPublishedCache?.document) {
      return { ...localPublishedCache, source: 'cache' };
    }

    const layout = await getHomepageLayout();
    if (!layout) throw new Error('Layout principal da Home não encontrado.');
    const document = parseJsonDocument(layout.publishedJson);
    const payload: CachedPublishedHomepage = {
      document,
      publishedVersion: layout.publishedVersion,
      publishedAt: layout.publishedAt.toISOString(),
      publishedBy: layout.publishedBy,
    };
    localPublishedCache = payload;
    await redisSetJson(HOMEPAGE_CACHE_KEY, payload, env.KENJITSU_CACHE_TTL_SECONDS);
    return { ...payload, source: 'database' };
  } catch {
    if (localPublishedCache?.document) return { ...localPublishedCache, source: 'cache' };
    return {
      document: DEFAULT_HOMEPAGE_DOCUMENT,
      publishedVersion: 0,
      publishedAt: new Date(0).toISOString(),
      publishedBy: 'system:emergency',
      source: 'emergency',
    };
  }
}

export async function saveHomepageDraft(input: {
  document: unknown;
  expectedDraftVersion: number;
  actorId?: string | null;
}) {
  const document = parseJsonDocument(input.document);
  const updated = await prisma.$transaction(async (transaction) => {
    const current = await transaction.homepageLayout.findUnique({ where: { key: HOMEPAGE_LAYOUT_KEY } });
    if (!current) throw new Error('Layout principal da Home não encontrado.');
    if (current.draftVersion !== input.expectedDraftVersion) throw new HomepageConflictError();

    return transaction.homepageLayout.update({
      where: { key: HOMEPAGE_LAYOUT_KEY },
      data: {
        draftJson: jsonValue(document),
        draftVersion: { increment: 1 },
        draftUpdatedBy: input.actorId || null,
      },
    });
  });

  return getAdminHomepageState().then((state) => ({ state, updated }));
}

export async function publishHomepage(input: {
  expectedDraftVersion: number;
  expectedPublishedVersion: number;
  actorId?: string | null;
}) {
  const published = await prisma.$transaction(async (transaction) => {
    const current = await transaction.homepageLayout.findUnique({ where: { key: HOMEPAGE_LAYOUT_KEY } });
    if (!current) throw new Error('Layout principal da Home não encontrado.');
    if (current.draftVersion !== input.expectedDraftVersion || current.publishedVersion !== input.expectedPublishedVersion) {
      throw new HomepageConflictError();
    }

    const document = parseJsonDocument(current.draftJson);
    const nextPublishedVersion = current.publishedVersion + 1;
    const updated = await transaction.homepageLayout.update({
      where: { key: HOMEPAGE_LAYOUT_KEY },
      data: {
        publishedJson: jsonValue(document),
        publishedVersion: { increment: 1 },
        publishedAt: new Date(),
        publishedBy: input.actorId || null,
      },
    });
    await transaction.homepageSnapshot.create({
      data: {
        layoutKey: HOMEPAGE_LAYOUT_KEY,
        version: nextPublishedVersion,
        kind: 'PUBLISHED',
        label: `Publicada v${nextPublishedVersion}`,
        documentJson: jsonValue(document),
        createdAt: updated.publishedAt,
        createdBy: updated.publishedBy,
      },
    });
    return updated;
  });

  await invalidateHomepageCache();
  return published;
}

export async function discardHomepageDraft(input: {
  expectedDraftVersion: number;
  expectedPublishedVersion: number;
  actorId?: string | null;
}) {
  const updated = await prisma.$transaction(async (transaction) => {
    const current = await transaction.homepageLayout.findUnique({ where: { key: HOMEPAGE_LAYOUT_KEY } });
    if (!current) throw new Error('Layout principal da Home não encontrado.');
    if (current.draftVersion !== input.expectedDraftVersion || current.publishedVersion !== input.expectedPublishedVersion) {
      throw new HomepageConflictError();
    }

    return transaction.homepageLayout.update({
      where: { key: HOMEPAGE_LAYOUT_KEY },
      data: {
        draftJson: current.publishedJson as Prisma.InputJsonValue,
        draftVersion: { increment: 1 },
        draftUpdatedBy: input.actorId || null,
      },
    });
  });

  return updated;
}

export async function invalidateHomepageCache() {
  localPublishedCache = null;
  await redisDelete(HOMEPAGE_CACHE_KEY);
}
