import { createConnection, type Socket } from 'node:net';
import { env } from '@/env';

type RedisValue = string | number | null;

function encodeCommand(parts: string[]): Buffer {
  const encoded = parts.map((part) => Buffer.from(String(part), 'utf8'));
  const chunks = [Buffer.from(`*${encoded.length}\r\n`, 'ascii')];
  for (const part of encoded) {
    chunks.push(Buffer.from(`$${part.length}\r\n`, 'ascii'), part, Buffer.from('\r\n', 'ascii'));
  }
  return Buffer.concat(chunks);
}

function parseResponse(buffer: Buffer, offset = 0): { value: RedisValue; next: number } | null {
  if (offset >= buffer.length) return null;
  const marker = String.fromCharCode(buffer[offset]);
  const lineEnd = buffer.indexOf('\r\n', offset + 1);
  if (lineEnd < 0) return null;
  const line = buffer.subarray(offset + 1, lineEnd).toString('utf8');
  if (marker === '+' || marker === '-') return { value: marker === '-' ? null : line, next: lineEnd + 2 };
  if (marker === ':') return { value: Number(line), next: lineEnd + 2 };
  if (marker === '$') {
    const length = Number(line);
    if (length < 0) return { value: null, next: lineEnd + 2 };
    const start = lineEnd + 2;
    const end = start + length;
    if (buffer.length < end + 2) return null;
    return { value: buffer.subarray(start, end).toString('utf8'), next: end + 2 };
  }
  return null;
}

function openSocket(host: string, port: number, timeoutMs: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Redis connection timeout'));
    }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function readResponse(socket: Socket, timeoutMs: number): Promise<RedisValue> {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Redis response timeout'));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const parsed = parseResponse(buffer);
      if (parsed) {
        cleanup();
        resolve(parsed.value);
      }
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onClose = () => {
      cleanup();
      reject(new Error('Redis socket closed before response'));
    };
    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('close', onClose);
  });
}

async function execute(parts: string[]): Promise<RedisValue> {
  if (!env.REDIS_URL) return null;
  const redisUrl = new URL(env.REDIS_URL);
  if (redisUrl.protocol !== 'redis:') return null;

  // Redis is a coordination/cache dependency, not a reason to stall a live
  // source lookup for several seconds when it is temporarily unavailable.
  const timeoutMs = Math.min(env.KENJITSU_REQUEST_TIMEOUT_MS, 1500);
  const socket = await openSocket(redisUrl.hostname, Number(redisUrl.port || 6379), timeoutMs);
  try {
    const auth = redisUrl.username || redisUrl.password ? [
      'AUTH',
      ...(redisUrl.username ? [decodeURIComponent(redisUrl.username)] : []),
      decodeURIComponent(redisUrl.password),
    ] : null;
    if (auth) {
      socket.write(encodeCommand(auth));
      await readResponse(socket, timeoutMs);
    }
    const database = redisUrl.pathname.replace(/^\//, '');
    if (database) {
      socket.write(encodeCommand(['SELECT', database]));
      await readResponse(socket, timeoutMs);
    }
    socket.write(encodeCommand(parts));
    return await readResponse(socket, timeoutMs);
  } finally {
    socket.end();
  }
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  try {
    const value = await execute(['GET', key]);
    return typeof value === 'string' ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function redisSetJson(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return false;
  try {
    const result = await execute(['SETEX', key, String(Math.max(1, Math.ceil(ttlSeconds))), JSON.stringify(value)]);
    return result === 'OK';
  } catch {
    return false;
  }
}

export async function redisDelete(key: string): Promise<boolean> {
  try {
    const result = await execute(['DEL', key]);
    return typeof result === 'number' && result > 0;
  } catch {
    return false;
  }
}

/** Read a scalar value without trying to parse it as JSON. */
export async function redisGet(key: string): Promise<string | null> {
  try {
    const value = await execute(['GET', key]);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Incrementa uma chave e aplica TTL somente na primeira gravação. A operação
 * é usada por rate limits porque INCR/EXPIRE permanecem atômicos por comando
 * no Redis e não dependem de estado em memória do processo web.
 */
export async function redisIncrement(key: string, windowSeconds: number): Promise<number | null> {
  if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) return null;
  try {
    const script = 'local current = redis.call("INCR", KEYS[1]); if current == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]); end; return current';
    const value = await execute(['EVAL', script, '1', key, String(Math.max(1, Math.ceil(windowSeconds)))]);
    return typeof value === 'number' ? value : null;
  } catch {
    return null;
  }
}

export async function redisSetIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return false;
  try {
    const result = await execute(['SET', key, value, 'EX', String(Math.max(1, Math.ceil(ttlSeconds))), 'NX']);
    return result === 'OK';
  } catch {
    return false;
  }
}

/** Delete a lock only when it still belongs to the caller. */
export async function redisDeleteIfValue(key: string, value: string): Promise<boolean> {
  try {
    const script = 'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end';
    const result = await execute(['EVAL', script, '1', key, value]);
    return typeof result === 'number' && result > 0;
  } catch {
    return false;
  }
}

export async function redisListPush(key: string, value: string): Promise<boolean> {
  try {
    const result = await execute(['LPUSH', key, value]);
    return typeof result === 'number' && result > 0;
  } catch {
    return false;
  }
}

export async function redisListPop(key: string): Promise<string | null> {
  try {
    const result = await execute(['RPOP', key]);
    return typeof result === 'string' ? result : null;
  } catch {
    return null;
  }
}

export async function redisPing(): Promise<boolean> {
  if (!env.REDIS_URL) return false;
  try {
    return (await execute(['PING'])) === 'PONG';
  } catch {
    return false;
  }
}
