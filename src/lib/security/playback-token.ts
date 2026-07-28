import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/env';

export interface PlaybackTokenPayload {
  sourceId: string;
  userId?: string;
  expiresAt: number;
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.PLAYBACK_TOKEN_SECRET);
}

export async function generatePlaybackToken(
  sourceId: string,
  userId?: string,
  expiresInMinutes = 15
): Promise<string> {
  const secret = getSecretKey();
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;

  const token = await new SignJWT({ sourceId, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(secret);

  return token;
}

export async function verifyPlaybackToken(
  token: string,
  expectedSourceId: string
): Promise<{ valid: boolean; reason?: string; payload?: PlaybackTokenPayload }> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);

    const sourceId = payload.sourceId as string;
    const userId = payload.userId as string | undefined;
    const exp = payload.exp as number;

    if (!sourceId || sourceId !== expectedSourceId) {
      return {
        valid: false,
        reason: 'Token de reprodução não corresponde ao ID da fonte solicitada',
      };
    }

    return {
      valid: true,
      payload: {
        sourceId,
        userId,
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
