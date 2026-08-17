import { prisma } from '@/lib/db/prisma';
import type { EditorialCollection as EditorialCollectionType } from '@/types/public-experience';
import type { EditorialCollectionCreateInput, EditorialCollectionUpdateInput } from '@/schemas/editorial-collection';

type CollectionRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  active: boolean;
  publishedFrom: Date | null;
  publishedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{ id: string; anilistId: number; order: number }>;
};

function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeItems(ids: number[] | undefined) {
  return ids?.map((anilistId, index) => ({ anilistId, order: index + 1 })) ?? [];
}

function toCollection(record: CollectionRecord): EditorialCollectionType {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    description: record.description,
    coverUrl: record.coverUrl,
    active: record.active,
    publishedFrom: record.publishedFrom?.toISOString() ?? null,
    publishedUntil: record.publishedUntil?.toISOString() ?? null,
    items: record.items.map((item) => ({
      id: item.id,
      anilistId: item.anilistId,
      order: item.order,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

const collectionInclude = { items: { orderBy: { order: 'asc' as const } } };

export async function listEditorialCollections(): Promise<EditorialCollectionType[]> {
  const records = await prisma.editorialCollection.findMany({
    orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    include: collectionInclude,
  });
  return records.map((record) => toCollection(record as CollectionRecord));
}

export async function getEditorialCollectionById(id: string): Promise<EditorialCollectionType | null> {
  const record = await prisma.editorialCollection.findUnique({
    where: { id },
    include: collectionInclude,
  });
  return record ? toCollection(record as CollectionRecord) : null;
}

export async function getPublishedEditorialCollection(slug: string): Promise<EditorialCollectionType | null> {
  const now = new Date();
  const record = await prisma.editorialCollection.findFirst({
    where: {
      slug,
      active: true,
      AND: [{ OR: [{ publishedFrom: null }, { publishedFrom: { lte: now } }] }, { OR: [{ publishedUntil: null }, { publishedUntil: { gte: now } }] }],
    },
    include: collectionInclude,
  });
  return record ? toCollection(record as CollectionRecord) : null;
}

export async function createEditorialCollection(input: EditorialCollectionCreateInput): Promise<EditorialCollectionType> {
  const record = await prisma.editorialCollection.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      coverUrl: input.coverUrl ?? null,
      active: input.active,
      publishedFrom: toDate(input.publishedFrom),
      publishedUntil: toDate(input.publishedUntil),
      items: { create: normalizeItems(input.anilistIds) },
    },
    include: collectionInclude,
  });
  return toCollection(record as CollectionRecord);
}

export async function updateEditorialCollection(id: string, input: EditorialCollectionUpdateInput): Promise<EditorialCollectionType> {
  const record = await prisma.$transaction(async (transaction) => {
    const current = await transaction.editorialCollection.findUnique({
      where: { id },
    });
    if (!current) throw new Error('Coleção não encontrada.');

    if (input.anilistIds !== undefined) {
      await transaction.editorialCollectionItem.deleteMany({
        where: { collectionId: id },
      });
    }

    return transaction.editorialCollection.update({
      where: { id },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.coverUrl !== undefined ? { coverUrl: input.coverUrl ?? null } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.publishedFrom !== undefined ? { publishedFrom: toDate(input.publishedFrom) } : {}),
        ...(input.publishedUntil !== undefined ? { publishedUntil: toDate(input.publishedUntil) } : {}),
        ...(input.anilistIds !== undefined ? { items: { create: normalizeItems(input.anilistIds) } } : {}),
      },
      include: collectionInclude,
    });
  });
  return toCollection(record as CollectionRecord);
}

export async function deleteEditorialCollection(id: string) {
  await prisma.editorialCollection.delete({ where: { id } });
}
