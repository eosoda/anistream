/**
 * Validacao estrutural do runtime Docker self-hosted do AniStream.
 *
 * Este script nao faz deploy. Ele verifica a imagem standalone, o Compose
 * canonico com Kenjitsu, o schema Prisma e os arquivos necessarios ao build.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
let hasErrors = false;

function logHeader(title) {
  console.log(`\n========================================`);
  console.log(title);
  console.log(`========================================`);
}

function logSuccess(message) {
  console.log(`  [OK] ${message}`);
}

function logError(message) {
  console.error(`  [ERRO] ${message}`);
  hasErrors = true;
}

function readFile(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    logError(`Arquivo ausente: ${relativePath}`);
    return null;
  }

  logSuccess(`Arquivo encontrado: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function requireText(content, expected, label) {
  if (content && content.includes(expected)) {
    logSuccess(label);
  } else {
    logError(`Requisito ausente: ${label}`);
  }
}

logHeader('1. Dockerfile standalone');
const dockerfile = readFile('Dockerfile');
requireText(dockerfile, 'FROM node:22-alpine AS deps', 'Estagio deps com Node 22 Alpine');
requireText(dockerfile, 'FROM node:22-alpine AS builder', 'Estagio builder presente');
requireText(dockerfile, 'FROM node:22-alpine AS runner', 'Estagio runner presente');
requireText(dockerfile, 'COPY package.json package-lock.json ./', 'Build usa lockfile');
requireText(dockerfile, 'RUN npm ci', 'Dependencias instaladas de forma reproduzivel');
requireText(dockerfile, 'RUN npx prisma generate', 'Prisma Client gerado no builder');
requireText(dockerfile, 'USER nextjs', 'Runner sem privilegios');
requireText(dockerfile, 'HEALTHCHECK', 'Healthcheck da imagem configurado');
requireText(dockerfile, 'npx prisma db push --skip-generate && exec node server.js', 'Boot falha explicitamente quando o schema nao pode ser sincronizado');

logHeader('2. Compose unico');
const compose = readFile('docker-compose.yml');
requireText(compose, 'postgres:', 'PostgreSQL presente');
requireText(compose, 'redis:', 'Redis do AniStream presente');
requireText(compose, 'kenjitsu-redis:', 'Redis dedicado do Kenjitsu presente');
requireText(compose, 'kenjitsu:', 'Servico Kenjitsu presente');
requireText(compose, 'app:', 'Servico AniStream presente');
requireText(compose, 'KENJITSU_BASE_URL', 'URL interna do Kenjitsu configurada');
requireText(compose, 'SOURCE_ENCRYPTION_KEY', 'Criptografia de playback configurada');
requireText(compose, 'healthcheck:', 'Healthchecks configurados');
requireText(compose, 'condition: service_healthy', 'Dependencias aguardam health');

logHeader('3. Contexto de build');
const dockerIgnore = readFile('.dockerignore');
for (const ignored of ['node_modules', '.next', '.git', 'docs', 'tests']) {
  requireText(dockerIgnore, ignored, `.dockerignore ignora ${ignored}`);
}

logHeader('4. Next.js e Prisma');
const nextConfig = readFile('next.config.ts');
requireText(nextConfig, "output: 'standalone'", 'Next.js standalone habilitado');

const schema = readFile('prisma/schema.prisma');
for (const model of ['Anime', 'Episode', 'EpisodeSource', 'MediaProvider', 'AutoIndexerQueue', 'AdminUser', 'AdminAuditLog', 'ProviderHealthLog', 'HomepageLayout']) {
  requireText(schema, `model ${model}`, `Modelo Prisma ${model} presente`);
}

const packageJson = readFile('package.json');
for (const dependency of ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'zod']) {
  requireText(packageJson, `"${dependency}"`, `Dependência ${dependency} presente`);
}

const homepageRepository = readFile('src/lib/homepage/repository.ts');
requireText(homepageRepository, 'ensureHomepageLayout', 'Bootstrap idempotente do layout da Home presente');
requireText(homepageRepository, 'invalidateHomepageCache', 'Invalidação do cache da Home após publicação presente');

logHeader('Resultado da validacao Docker local');
if (hasErrors) {
  console.error('\nForam encontrados problemas no runtime Docker.\n');
  process.exit(1);
}

console.log('\nRuntime Docker self-hosted validado com sucesso.\n');
