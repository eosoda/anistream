import { z } from 'zod';

const isBuild = process.env.ANISTREAM_BUILD === 'true' || process.env.NEXT_PHASE === 'phase-production-build';
const isProductionRuntime = process.env.NODE_ENV === 'production' && !isBuild;

const envSchema = z.object({
  DATABASE_URL: isProductionRuntime
    ? z.string().url('DATABASE_URL deve ser uma URL de conexão válida')
    : z.string().url('DATABASE_URL deve ser uma URL de conexão válida').default('postgresql://user:password@localhost:5432/anistream_db?schema=public'),
  REDIS_URL: isProductionRuntime
    ? z.string().url('REDIS_URL deve ser uma URL redis:// válida')
    : z.string().url('REDIS_URL deve ser uma URL redis:// válida').optional(),
  KENJITSU_BASE_URL: isProductionRuntime
    ? z.string().url('KENJITSU_BASE_URL deve ser uma URL válida')
    : z.string().url('KENJITSU_BASE_URL deve ser uma URL válida').default('http://localhost:3001'),
  KENJITSU_API_KEY: isProductionRuntime
    ? z.string().min(16, 'KENJITSU_API_KEY deve ter pelo menos 16 caracteres')
    : z.string().optional(),
  KENJITSU_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  KENJITSU_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).max(86400).default(300),
  CALENDAR_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(1800),
  INITIAL_SETUP_KEY: isProductionRuntime
    ? z.string().min(24, 'INITIAL_SETUP_KEY deve ter pelo menos 24 caracteres')
    : z.string().min(24, 'INITIAL_SETUP_KEY deve ter pelo menos 24 caracteres').default('setup-local-development-key'),
  PLAYBACK_TOKEN_SECRET: isProductionRuntime
    ? z.string().min(32, 'PLAYBACK_TOKEN_SECRET deve ter pelo menos 32 caracteres')
    : z.string().min(32, 'PLAYBACK_TOKEN_SECRET deve ter pelo menos 32 caracteres').default('local-playback-token-secret-for-development'),
  SOURCE_ENCRYPTION_KEY: isProductionRuntime
    ? z.string().min(32, 'SOURCE_ENCRYPTION_KEY chave de criptografia de no mínimo 32 caracteres')
    : z.string().min(32, 'SOURCE_ENCRYPTION_KEY chave de criptografia de no mínimo 32 caracteres').default('local-source-encryption-key-for-development-32'),
  NEXT_PUBLIC_APP_URL: isProductionRuntime
    ? z.string().url('NEXT_PUBLIC_APP_URL deve ser uma URL válida')
    : z.string().url('NEXT_PUBLIC_APP_URL deve ser uma URL válida').default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const buildDefaults = isBuild
    ? {
        DATABASE_URL: 'postgresql://build:build@127.0.0.1:5432/anistream_build?schema=public',
        REDIS_URL: 'redis://127.0.0.1:6379',
        KENJITSU_BASE_URL: 'http://127.0.0.1:3001',
        KENJITSU_API_KEY: 'build-only-kenjitsu-key',
        INITIAL_SETUP_KEY: 'build-only-initial-setup-key-32-chars',
        PLAYBACK_TOKEN_SECRET: 'build-only-playback-token-secret-32-chars',
        SOURCE_ENCRYPTION_KEY: 'build-only-source-encryption-key-32-chars',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      }
    : {};
  const input: Record<string, string | undefined> = { ...process.env };
  if (isBuild) {
    for (const [key, value] of Object.entries(buildDefaults)) {
      if (!input[key]) input[key] = value;
    }
  }
  const result = envSchema.safeParse(input);

  if (!result.success) {
    console.error('❌ Configuração inválida das variáveis de ambiente:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Falha na validação das Variáveis de Ambiente.');
  }

  return result.data;
}

export const env = parseEnv();
