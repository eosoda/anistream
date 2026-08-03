import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { NavigationConfigDocument } from '@/types/navigation';
import { NavigationDocumentSchema, type NavigationSaveInput, parseNavigationDocument } from '@/schemas/navigation';
import { DEFAULT_NAVIGATION_CONFIG, migrateLegacyNavigation } from './defaults';
import { NAVIGATION_DESTINATIONS } from './registry';
import { buildNavigationPreview } from './presentation';

export const NAVIGATION_SETTING_KEY = 'public_navigation_config';
export const LEGACY_NAVIGATION_KEY = 'public_navigation';
export const LEGACY_PAGE_FEATURES_KEY = 'page_features';

export class NavigationConflictError extends Error {
  constructor(message = 'A navegação foi alterada por outro administrador. Recarregue os dados antes de salvar.') {
    super(message);
    this.name = 'NavigationConflictError';
  }
}

export class NavigationValidationError extends Error {
  constructor(message = 'A configuração de navegação é inválida.') {
    super(message);
    this.name = 'NavigationValidationError';
  }
}

function parseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseCanonical(value: string | null | undefined): NavigationConfigDocument | null {
  const parsed = NavigationDocumentSchema.safeParse(parseJson(value));
  return parsed.success ? parsed.data as NavigationConfigDocument : null;
}

export async function ensureNavigationConfiguration(): Promise<NavigationConfigDocument> {
  const canonical = await prisma.systemSetting.findUnique({ where: { key: NAVIGATION_SETTING_KEY } });
  const parsedCanonical = parseCanonical(canonical?.value);
  if (parsedCanonical) return parsedCanonical;

  const legacy = await prisma.systemSetting.findMany({ where: { key: { in: [LEGACY_NAVIGATION_KEY, LEGACY_PAGE_FEATURES_KEY] } } });
  const legacyMap = new Map(legacy.map((item) => [item.key, parseJson(item.value)]));
  const migrated = migrateLegacyNavigation(legacyMap.get(LEGACY_NAVIGATION_KEY), legacyMap.get(LEGACY_PAGE_FEATURES_KEY));

  try {
    return await prisma.$transaction(async (transaction) => {
      const raced = await transaction.systemSetting.findUnique({ where: { key: NAVIGATION_SETTING_KEY } });
      const racedCanonical = parseCanonical(raced?.value);
      if (racedCanonical) return racedCanonical;
      await transaction.systemSetting.upsert({
        where: { key: NAVIGATION_SETTING_KEY },
        update: { value: JSON.stringify(migrated) },
        create: { key: NAVIGATION_SETTING_KEY, value: JSON.stringify(migrated) },
      });
      return migrated;
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const raced = await prisma.systemSetting.findUnique({ where: { key: NAVIGATION_SETTING_KEY } });
      const racedCanonical = parseCanonical(raced?.value);
      if (racedCanonical) return racedCanonical;
    }
    throw error;
  }
}

export async function getNavigationConfiguration(): Promise<NavigationConfigDocument> {
  return ensureNavigationConfiguration();
}

async function writeLegacyMirrors(transaction: Pick<Prisma.TransactionClient, 'systemSetting'>, config: NavigationConfigDocument) {
  await transaction.systemSetting.upsert({
    where: { key: LEGACY_NAVIGATION_KEY },
    update: { value: JSON.stringify(config.navigation) },
    create: { key: LEGACY_NAVIGATION_KEY, value: JSON.stringify(config.navigation) },
  });
  await transaction.systemSetting.upsert({
    where: { key: LEGACY_PAGE_FEATURES_KEY },
    update: { value: JSON.stringify(config.pages) },
    create: { key: LEGACY_PAGE_FEATURES_KEY, value: JSON.stringify(config.pages) },
  });
}

export async function saveNavigationConfiguration(input: NavigationSaveInput): Promise<NavigationConfigDocument> {
  const current = await ensureNavigationConfiguration();
  if (current.revision !== input.expectedRevision) throw new NavigationConflictError();

  const next: NavigationConfigDocument = {
    schemaVersion: 2,
    revision: current.revision + 1,
    navigation: input.navigation as NavigationConfigDocument['navigation'],
    mobileBottomIds: input.mobileBottomIds as NavigationConfigDocument['mobileBottomIds'],
    pages: input.pages as NavigationConfigDocument['pages'],
  };
  const validation = NavigationDocumentSchema.safeParse(next);
  if (!validation.success) throw new NavigationValidationError(validation.error.issues[0]?.message || 'A configuração de navegação é inválida.');

  await prisma.$transaction(async (transaction) => {
    const row = await transaction.systemSetting.findUnique({ where: { key: NAVIGATION_SETTING_KEY } });
    const stored = parseCanonical(row?.value);
    if (!row || !stored || stored.revision !== input.expectedRevision) throw new NavigationConflictError();

    const updated = await transaction.systemSetting.updateMany({
      where: { key: NAVIGATION_SETTING_KEY, value: row.value },
      data: { value: JSON.stringify(next) },
    });
    if (updated.count !== 1) throw new NavigationConflictError();
    await writeLegacyMirrors(transaction, next);
  });

  return next;
}

export function getNavigationDestinationDefinitions() {
  return NAVIGATION_DESTINATIONS;
}
