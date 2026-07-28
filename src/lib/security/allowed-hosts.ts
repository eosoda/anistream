import { env } from '@/env';

export const BLOCKED_LEGACY_PROVIDER_HOSTS = [
  'kenjitsu.koyeb.app',
  'api.anify.tv',
  'api.consumet.org',
  'mirurotvapi.vercel.app',
  'api.2embed.cc',
  'www.2embed.cc',
  'play.xpass.top',
  'apiplayer.ru',
  'animesonline.cloud',
  'warezcdn.lat',
  'superflixapi.pro',
  'animeworld.tv',
  'tioanime.com',
  'monoschinos.com',
] as const;

export function isLegacyHostBlocked(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();
  return BLOCKED_LEGACY_PROVIDER_HOSTS.some(
    (blocked) => host === blocked || host.endsWith(`.${blocked}`)
  );
}

export function isAuthorizedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  // 1. Verificar se está na lista de bloqueados legados
  if (isLegacyHostBlocked(host)) {
    return false;
  }

  // 2. Verificar se está na lista de hosts autorizados
  const allowed = env.AUTHORIZED_MEDIA_HOSTS;
  return allowed.some(
    (allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`)
  );
}
