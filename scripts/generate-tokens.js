const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Script para gerar e popular tokens/chaves de segurança para o AniStream e Docker Compose.
 */
function generateSecureToken(prefix = '', bytes = 32) {
  const hex = crypto.randomBytes(bytes).toString('hex');
  return prefix ? `${prefix}_${hex}` : hex;
}

function run() {
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, '.env');
  const forceOverwrite = process.argv.includes('--force') || process.argv.includes('-f');

  if (fs.existsSync(envPath) && !forceOverwrite) {
    console.log('⚠️  O arquivo .env já existe na raiz do projeto.');
    console.log('💡 Para sobrescrever e gerar novos tokens, execute com o parâmetro --force:');
    console.log('   npm run generate-tokens -- --force\n');
  }

  // Manter credenciais do Postgres compatíveis com o volume docker existente
  const postgresUser = process.env.POSTGRES_USER || 'user';
  const postgresPassword = process.env.POSTGRES_PASSWORD || 'password';
  const postgresDb = process.env.POSTGRES_DB || 'anistream_db';

  const databaseUrl = `postgresql://${postgresUser}:${postgresPassword}@postgres:5432/${postgresDb}?schema=public`;
  const redisUrl = 'redis://redis:6379';

  const adminSessionSecret = generateSecureToken('adm_sec', 32);
  const playbackTokenSecret = generateSecureToken('pb_jwt', 32);
  const sourceEncryptionKey = generateSecureToken('enc', 32);
  const initialSetupKey = generateSecureToken('setup', 12);

  const mediaHosts = 'media.mydomain.com,cdn.mydomain.com,storage.googleapis.com,s3.amazonaws.com';
  const metadataApiUrl = 'https://api.jikan.moe/v4';
  const metadataApiKey = '';
  const appUrl = 'http://localhost:3000';

  const envContent = `# ===================================================================
# AniStream - Configuração do Ambiente e Docker Compose
# Gerado automaticamente em: ${new Date().toISOString()}
# ===================================================================

# Banco de Dados PostgreSQL (Docker Service)
POSTGRES_USER="${postgresUser}"
POSTGRES_PASSWORD="${postgresPassword}"
POSTGRES_DB="${postgresDb}"
DATABASE_URL="${databaseUrl}"

# Cache Redis (Docker Service)
REDIS_URL="${redisUrl}"

# Segurança & Chaves Secretas Criptográficas
ADMIN_SESSION_SECRET="${adminSessionSecret}"
PLAYBACK_TOKEN_SECRET="${playbackTokenSecret}"
SOURCE_ENCRYPTION_KEY="${sourceEncryptionKey}"

# Chave Inicial de Instalação (Proteção do assistente /setup)
INITIAL_SETUP_KEY="${initialSetupKey}"
SETUP_KEY="${initialSetupKey}"

# Segurança de Mídia e APIs
AUTHORIZED_MEDIA_HOSTS="${mediaHosts}"
AUTHORIZED_METADATA_API_URL="${metadataApiUrl}"
AUTHORIZED_METADATA_API_KEY="${metadataApiKey}"

# URL Base da Aplicação
NEXT_PUBLIC_APP_URL="${appUrl}"
`;

  // 2. Salvar ou atualizar arquivo .env
  if (!fs.existsSync(envPath) || forceOverwrite) {
    fs.writeFileSync(envPath, envContent, 'utf-8');
    console.log('✅ Arquivo .env gerado com sucesso na raiz do projeto!\n');
  } else {
    console.log('📋 Exibindo os novos tokens gerados (nenhum arquivo foi sobrescrito):\n');
  }

  // 3. Exibir painel com resumo das chaves geradas
  console.log('===================================================================');
  console.log('  [AniStream Security Generator] 🔑 TOKENS GERADOS PARA DOCKER');
  console.log('===================================================================');
  console.log(`  POSTGRES_USER            : ${postgresUser}`);
  console.log(`  POSTGRES_PASSWORD        : ${postgresPassword}`);
  console.log(`  ADMIN_SESSION_SECRET     : ${adminSessionSecret}`);
  console.log(`  PLAYBACK_TOKEN_SECRET    : ${playbackTokenSecret}`);
  console.log(`  SOURCE_ENCRYPTION_KEY    : ${sourceEncryptionKey}`);
  console.log(`  INITIAL_SETUP_KEY        : ${initialSetupKey}`);
  console.log('-------------------------------------------------------------------');
  console.log(`  URL de Instalação Direta : http://localhost:3000/setup?key=${initialSetupKey}`);
  console.log('===================================================================\n');
  console.log('🚀 Para iniciar o Docker com as novas variáveis, execute:');
  console.log('   docker compose up -d --build\n');
}

run();
