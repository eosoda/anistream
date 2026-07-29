/**
 * Script de Automação de Deploy Local / VPS — AniStream
 *
 * Este script executa a suíte de verificações pré-deploy e exibe as instruções
 * ou o comando exato para compilar e iniciar o Docker Compose localmente.
 */

const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('\n========================================');
console.log('🚀 Iniciando Processo de Deploy Local Docker');
console.log('========================================\n');

// 1. Executar Verificação de Saúde Pré-Deploy
try {
  console.log('📦 Passo 1: Executando verificações pré-flight do Docker...\n');
  execSync('node scripts/verify-docker.js', { cwd: rootDir, stdio: 'inherit' });
} catch (e) {
  console.error('\n❌ Falha nas verificações pré-deploy. Deploy abortado por segurança.\n');
  process.exit(1);
}

console.log('\n========================================');
console.log('🐳 Passo 2: Comando de Inicialização do Docker Compose');
console.log('========================================\n');
console.log('Para iniciar ou atualizar os containers no seu ambiente local/VPS, execute:\n');
console.log('👉 docker compose up -d --build --remove-orphans\n');
console.log('Se você estiver em um ambiente PowerShell no Windows:');
console.log('👉 ./scripts/deploy.ps1\n');
console.log('Se estiver em um terminal Linux / Bash:');
console.log('👉 ./scripts/deploy.sh\n');
console.log('✨ Preparação concluída com sucesso!');
