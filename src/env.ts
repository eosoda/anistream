import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL deve ser uma URL de conexão válida')
    .default('postgresql://user:password@localhost:5432/anistream_db?schema=public'),
  REDIS_URL: z.string().optional(),
  KENJITSU_BASE_URL: z
    .string()
    .url('KENJITSU_BASE_URL deve ser uma URL vÃ¡lida')
    .default('http://localhost:3001'),
  KENJITSU_API_KEY: z.string().optional(),
  KENJITSU_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  KENJITSU_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).max(86400).default(300),
  ADMIN_SESSION_SECRET: z
    .string()
    .min(16, 'ADMIN_SESSION_SECRET deve ter pelo menos 16 caracteres')
    .default('super-secret-admin-key-min-32-chars-long'),
  PLAYBACK_TOKEN_SECRET: z
    .string()
    .min(16, 'PLAYBACK_TOKEN_SECRET deve ter pelo menos 16 caracteres')
    .default('super-secret-playback-jwt-key-min-32-chars'),
  SOURCE_ENCRYPTION_KEY: z
    .string()
    .min(16, 'SOURCE_ENCRYPTION_KEY chave de criptografia de no mínimo 16 caracteres')
    .default('32-bytes-encryption-key-for-aes-256-gcm!'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Configuração inválida das variáveis de ambiente:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Falha na validação das Variáveis de Ambiente.');
  }

  return result.data;
}

export const env = parseEnv();
