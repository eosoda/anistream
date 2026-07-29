import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/env';

export interface PlaybackTokenPayload {
  sourceId: string;
  userId?: string;
  clientSubnet?: string;
  expiresAt: number;
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.PLAYBACK_TOKEN_SECRET);
}

/**
 * Calcula a sub-rede do cliente (/24 IPv4 ou /64 IPv6) para permitir rotação de IP móvel (4G/5G)
 * sem quebrar a sessão do usuário.
 */
export function getClientSubnet(ip: string): string {
  if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') return 'local';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) return parts.slice(0, 4).join(':');
  }
  return ip;
}

export async function generatePlaybackToken(
  sourceId: string,
  userId?: string,
  expiresInMinutes = 15,
  clientIp?: string
): Promise<string> {
  const secret = getSecretKey();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
  const clientSubnet = clientIp ? getClientSubnet(clientIp) : undefined;

  const token = await new SignJWT({ sourceId, userId, clientSubnet })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(secret);

  return token;
}

export async function verifyPlaybackToken(
  token: string,
  expectedSourceId: string,
  clientIp?: string
): Promise<{ valid: boolean; reason?: string; payload?: PlaybackTokenPayload }> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);

    const sourceId = payload.sourceId as string;
    const userId = payload.userId as string | undefined;
    const tokenSubnet = payload.clientSubnet as string | undefined;
    const exp = payload.exp as number;

    if (!sourceId || sourceId !== expectedSourceId) {
      return {
        valid: false,
        reason: 'Token de reprodução não corresponde ao ID da fonte solicitada',
      };
    }

    // Se a sub-rede tiver sido vinculada, valida contra a sub-rede atual do IP requisitante
    if (tokenSubnet && clientIp) {
      const currentSubnet = getClientSubnet(clientIp);
      if (tokenSubnet !== 'local' && currentSubnet !== 'local' && tokenSubnet !== currentSubnet) {
        return {
          valid: false,
          reason: 'Token de reprodução gerado para outra rede ou dispositivo',
        };
      }
    }

    return {
      valid: true,
      payload: {
        sourceId,
        userId,
        clientSubnet: tokenSubnet,
        expiresAt: exp,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      reason: `Token de reprodução inválido ou expirado: ${err.message}`,
    };
  }
}
