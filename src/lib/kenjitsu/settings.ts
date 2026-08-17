import { prisma } from '@/lib/db/prisma';
import { KENJITSU_EXTENSION_IDS, KENJITSU_NSFW_EXTENSION_IDS, type KenjitsuExtensionId } from './types';

export const KENJITSU_EXTENSION_SETTING_KEY = 'kenjitsu_extensions';

// Allowlist inicial do beta. Ela é derivada do último smoke funcional e deixa
// extensões instáveis desativadas até uma aprovação explícita no painel.
export const KENJITSU_BETA_ALLOWLIST = [
  'anikoto',
  'anidb',
  'anibd',
  'animeheaven',
  'animefire',
  'animeplay',
  'animesdrive',
  'animesonlinecc',
  'animesonlinecloud',
  'anitube',
  'dattebayobr',
  'goyabu',
] as const satisfies readonly KenjitsuExtensionId[];

export interface KenjitsuExtensionSetting {
  id: KenjitsuExtensionId;
  enabled: boolean;
  nsfw: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: 'healthy' | 'degraded' | 'down' | 'unknown' | null;
  lastLatencyMs?: number | null;
  lastError?: string | null;
}

const defaults: KenjitsuExtensionSetting[] = KENJITSU_EXTENSION_IDS.map((id) => ({
  id,
  enabled: KENJITSU_BETA_ALLOWLIST.includes(id as (typeof KENJITSU_BETA_ALLOWLIST)[number]),
  nsfw: KENJITSU_NSFW_EXTENSION_IDS.includes(id as (typeof KENJITSU_NSFW_EXTENSION_IDS)[number]),
}));

function normalize(value: unknown): KenjitsuExtensionSetting[] {
  if (!Array.isArray(value)) return defaults;
  const byId = new Map(value.map((item) => [item?.id, item]));
  return defaults.map((fallback) => {
    const current = byId.get(fallback.id);
    const isAllowedInBeta = KENJITSU_BETA_ALLOWLIST.includes(fallback.id as (typeof KENJITSU_BETA_ALLOWLIST)[number]);
    return {
      id: fallback.id,
      // Persisted settings cannot re-enable an extension outside the tested
      // beta allowlist, even after an older database is restored.
      enabled: isAllowedInBeta && (typeof current?.enabled === 'boolean' ? current.enabled : fallback.enabled),
      nsfw: typeof current?.nsfw === 'boolean' ? current.nsfw : fallback.nsfw,
      lastTestedAt: typeof current?.lastTestedAt === 'string' ? current.lastTestedAt : null,
      lastTestStatus: ['healthy', 'degraded', 'down', 'unknown'].includes(current?.lastTestStatus) ? current.lastTestStatus : null,
      lastLatencyMs: typeof current?.lastLatencyMs === 'number' ? current.lastLatencyMs : null,
      lastError: typeof current?.lastError === 'string' ? current.lastError : null,
    };
  });
}

export async function getKenjitsuExtensionSettings(): Promise<KenjitsuExtensionSetting[]> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: KENJITSU_EXTENSION_SETTING_KEY } });
  if (!setting) return defaults;
  try {
    return normalize(JSON.parse(setting.value));
  } catch {
    return defaults;
  }
}

export async function getEnabledKenjitsuExtensions(): Promise<KenjitsuExtensionId[]> {
  const settings = await getKenjitsuExtensionSettings();
  return settings.filter((item) => item.enabled && !item.nsfw).map((item) => item.id);
}

export function normalizeKenjitsuExtensionSettings(value: unknown): KenjitsuExtensionSetting[] {
  return normalize(value);
}

export async function saveKenjitsuExtensionSettings(settings: KenjitsuExtensionSetting[]): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: KENJITSU_EXTENSION_SETTING_KEY },
    create: { key: KENJITSU_EXTENSION_SETTING_KEY, value: JSON.stringify(normalize(settings)) },
    update: { value: JSON.stringify(normalize(settings)) },
  });
  // O conjunto de extensões faz parte da chave do cache de reprodução. A
  // versão muda sem tentar apagar chaves temporárias concorrentes.
  await import('@/lib/streams/playback-cache').then(({ bumpPlaybackCacheVersion }) => bumpPlaybackCacheVersion()).catch(() => undefined);
}
