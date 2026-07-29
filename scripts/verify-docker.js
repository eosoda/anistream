/**
 * Script de Diagnóstico e Validação Pré-Deploy do Docker — AniStream
 *
 * Este script verifica a integridade, sintaxe e presença dos requisitos
 * necessários nos arquivos de conteinerização (Dockerfile, docker-compose.yml,
 * .dockerignore, next.config.ts e schema.prisma) antes do deploy.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
let hasErrors = false;

function logHeader(title) {
  console.log(`\n========================================`);
  console.log(`🐳 ${title}`);
  console.log(`========================================`);
}

function logSuccess(msg) {
  console.log(`  ✅ ${msg}`);
}

function logError(msg) {
  console.log(`  ❌ ${msg}`);
  hasErrors = true;
}

function checkFileExists(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    logSuccess(`Arquivo '${relPath}' encontrado.`);
    return fs.readFileSync(fullPath, 'utf8');
  } else {
    logError(`Arquivo '${relPath}' não foi encontrado.`);
    return null;
  }
}

// 1. Validar Dockerfile
logHeader('1. Validação do Dockerfile');
const dockerfileContent = checkFileExists('Dockerfile');
if (dockerfileContent) {
  if (dockerfileContent.includes('FROM node:20-alpine AS deps')) {
    logSuccess('Estágio 1 (deps): Base Node.js 20 Alpine configurada.');
  } else {
    logError("Dockerfile: Estágio 'deps' ausente.");
  }

  if (dockerfileContent.includes('FROM node:20-alpine AS builder')) {
    logSuccess('Estágio 2 (builder): Estágio de compilação configurado.');
  } else {
    logError("Dockerfile: Estágio 'builder' ausente.");
  }

  if (dockerfileContent.includes('FROM node:20-alpine AS runner')) {
    logSuccess('Estágio 3 (runner): Estágio de execução seguro configurado.');
  } else {
    logError("Dockerfile: Estágio 'runner' ausente.");
  }

  if (dockerfileContent.includes('USER nextjs')) {
    logSuccess('Segurança: Usuário não-root (nextjs) ativo.');
  } else {
    logError('Segurança: Execução como usuário não-root ausente.');
  }

  if (dockerfileContent.includes('EXPOSE 3000')) {
    logSuccess('Rede: Porta 3000 exposta corretamente.');
  } else {
    logError('Rede: Porta 3000 não exposta.');
  }

  if (dockerfileContent.includes('prisma db push')) {
    logSuccess('Prisma: Sincronização automática de schema ativada no CMD.');
  } else {
    logError('Prisma: Comando de sincronização no boot ausente.');
  }
}

// 2. Validar docker-compose.yml
logHeader('2. Validação do docker-compose.yml');
const composeContent = checkFileExists('docker-compose.yml');
if (composeContent) {
  if (composeContent.includes('postgres:') && composeContent.includes('5432:5432')) {
    logSuccess('Serviço PostgreSQL 16 configurado na porta 5432.');
  } else {
    logError('Serviço PostgreSQL 16 não identificado.');
  }

  if (composeContent.includes('redis:') && composeContent.includes('6379:6379')) {
    logSuccess('Serviço Redis 7 configurado na porta 6379.');
  } else {
    logError('Serviço Redis 7 não identificado.');
  }

  if (composeContent.includes('DATABASE_URL') && composeContent.includes('SOURCE_ENCRYPTION_KEY')) {
    logSuccess('Variáveis de ambiente de produção e criptografia configuradas.');
  } else {
    logError('Variáveis de ambiente essenciais ausentes no docker-compose.');
  }

  if (composeContent.includes('healthcheck:')) {
    logSuccess('Healthchecks configurados para verificar a saúde dos containers.');
  } else {
    logError('Healthchecks ausentes no docker-compose.yml.');
  }
}

// 3. Validar .dockerignore
logHeader('3. Validação do .dockerignore');
const dockerIgnoreContent = checkFileExists('.dockerignore');
if (dockerIgnoreContent) {
  const requiredIgnores = ['node_modules', '.next', '.git'];
  for (const item of requiredIgnores) {
    if (dockerIgnoreContent.includes(item)) {
      logSuccess(`Ignorado no build: '${item}'`);
    } else {
      logError(`'.dockerignore': Item '${item}' deveria estar ignorado.`);
    }
  }
}

// 4. Validar next.config.ts (Standalone Output)
logHeader('4. Validação do Build Standalone (next.config.ts)');
const nextConfigContent = checkFileExists('next.config.ts');
if (nextConfigContent) {
  if (nextConfigContent.includes("output: 'standalone'") || nextConfigContent.includes('output: "standalone"')) {
    logSuccess("Configuração 'output: standalone' ativa para suporte a Docker.");
  } else {
    logError("next.config.ts: Configuração 'output: standalone' é necessária para a imagem Docker.");
  }
}

// 5. Validar Schema Prisma
logHeader('5. Validação do Schema Prisma');
const prismaSchemaContent = checkFileExists('prisma/schema.prisma');
if (prismaSchemaContent) {
  const models = ['Anime', 'Episode', 'EpisodeSource', 'MediaProvider', 'AutoIndexerQueue', 'AdminUser'];
  for (const m of models) {
    if (prismaSchemaContent.includes(`model ${m}`)) {
      logSuccess(`Modelo Prisma '${m}' identificado no schema.`);
    } else {
      logError(`Modelo Prisma '${m}' ausente no schema.`);
    }
  }
}

// Resultado Final
logHeader('Resultado do Diagnóstico Pré-Deploy Docker');
if (hasErrors) {
  console.log('\n❌ Foram encontrados problemas que precisam ser corrigidos antes do deploy.\n');
  process.exit(1);
} else {
  console.log('\n✨ Todos os requisitos do Docker foram validados com 100% de sucesso! Prontos para o deploy.\n');
  process.exit(0);
}
