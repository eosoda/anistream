import { env } from '@/env';
import { prisma } from '@/lib/db/prisma';

let cachedAuthorizedHosts: Set<string> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minuto

/**
 * Limpa o cache de hosts autorizados em memória.
 * Deve ser chamado ao criar, atualizar ou remover um MediaProvider ou SystemSetting.
 */
export function invalidateAuthorizedHostsCache(): void {
  cachedAuthorizedHosts = null;
  lastFetchTime = 0;
}

/**
 * Obtém o conjunto unificado de hosts autorizados (3 camadas: .env, MediaProvider no DB, SystemSetting).
 */
export async function getAuthorizedHosts(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedAuthorizedHosts && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedAuthorizedHosts;
  }

  const hosts = new Set<string>();

  // 1. Camada Estática: .env
  if (env.AUTHORIZED_MEDIA_HOSTS && Array.isArray(env.AUTHORIZED_MEDIA_HOSTS)) {
    env.AUTHORIZED_MEDIA_HOSTS.forEach((allowedHost) => {
      const clean = allowedHost.toLowerCase().trim();
      if (clean) hosts.add(clean);
    });
  }

  // 2. e 3. Camadas Dinâmicas: DB (MediaProviders + SystemSetting)
  try {
    const [providers, customSetting] = await Promise.all([
      prisma.mediaProvider.findMany({
        where: { enabled: true },
        select: { url: true },
      }),
      prisma.systemSetting.findUnique({
        where: { key: 'AUTHORIZED_MEDIA_HOSTS' },
      }),
    ]);

    for (const provider of providers) {
      try {
        const parsedUrl = new URL(provider.url);
        const h = parsedUrl.hostname.toLowerCase().trim();
        if (h) {
          hosts.add(h);
        }
      } catch {
        // ignora se URL do provider for inválida
      }
    }

    if (customSetting?.value) {
      const settingsList = customSetting.value.split(',');
      for (const rawHost of settingsList) {
        const h = rawHost.toLowerCase().trim();
        if (h) {
          hosts.add(h);
        }
      }
    }
  } catch {
    // Fallback gracioso se o banco não estiver disponível ou inicializado
  }

  cachedAuthorizedHosts = hosts;
  lastFetchTime = now;
  return hosts;
}

/**
 * Verifica se um hostname está autorizador para acesso a mídias.
 */
export async function isAuthorizedHost(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase().trim();
  const cleanHost = host.replace(/^www\./, '');

  // Consultar lista unificada de hosts autorizados
  const allowedSet = await getAuthorizedHosts();

  for (const allowedHost of allowedSet) {
    const cleanAllowed = allowedHost.toLowerCase().trim().replace(/^www\./, '');
    if (
      cleanHost === cleanAllowed ||
      cleanHost.endsWith(`.${cleanAllowed}`) ||
      cleanAllowed.endsWith(`.${cleanHost}`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Adiciona novos hostnames dinamicamente na tabela SystemSetting e invalida o cache.
 */
export async function autoAuthorizeHostnames(rawInputs: string[]): Promise<string[]> {
  const newHostsToAuthorize = new Set<string>();

  for (const raw of rawInputs) {
    let hostname = raw.trim();
    if (!hostname) continue;

    if (hostname.includes('://')) {
      try {
        hostname = new URL(hostname).hostname;
      } catch {
        continue;
      }
    }

    const cleanHost = hostname.toLowerCase().trim();
    if (cleanHost) {
      newHostsToAuthorize.add(cleanHost);
    }
  }

  if (newHostsToAuthorize.size === 0) {
    return [];
  }

  try {
    const currentSetting = await prisma.systemSetting.findUnique({
      where: { key: 'AUTHORIZED_MEDIA_HOSTS' },
    });

    const existingManualHosts = currentSetting?.value
      ? new Set(
          currentSetting.value
            .split(',')
            .map((h: string) => h.toLowerCase().trim())
            .filter(Boolean)
        )
      : new Set<string>();

    const addedHosts: string[] = [];

    for (const h of newHostsToAuthorize) {
      if (!existingManualHosts.has(h)) {
        existingManualHosts.add(h);
        addedHosts.push(h);
      }
    }

    if (addedHosts.length > 0) {
      const updatedValue = Array.from(existingManualHosts).join(',');
      await prisma.systemSetting.upsert({
        where: { key: 'AUTHORIZED_MEDIA_HOSTS' },
        update: { value: updatedValue },
        create: {
          key: 'AUTHORIZED_MEDIA_HOSTS',
          value: updatedValue,
        },
      });

      invalidateAuthorizedHostsCache();
    }

    return addedHosts;
  } catch {
    return [];
  }
}


