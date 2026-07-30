const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('====================================================');
  console.log('🧪 TESTE COMPLETO DE VERIFICAÇÃO DAS FONTES DE MÍDIA');
  console.log('====================================================\n');

  // 1. Verificar Provedores Cadastrados no Banco
  const providers = await prisma.mediaProvider.findMany({
    orderBy: { priority: 'desc' },
  });

  console.log(`📌 Total de Provedores de Mídia no PostgreSQL: ${providers.length}\n`);

  for (const p of providers) {
    console.log(`- [${p.enabled ? 'ONLINE ✅' : 'OFFLINE ❌'}] ${p.name}`);
    console.log(`  Tipo: ${p.type} | Prioridade: ${p.priority} | URL: ${p.url}`);
  }

  console.log('\n----------------------------------------------------');
  console.log('📌 Testando Resolução de Fontes para Episódio 1 (Frieren / Naruto / One Piece)...');
  console.log('----------------------------------------------------\n');

  // Importar resolvedor
  const { defaultStreamResolver } = require('./src/lib/streams/resolver');

  const testCases = [
    { title: 'Frieren: Beyond Journey\'s End', animeId: '52991', episode: 1 },
    { title: 'Naruto', animeId: '20', episode: 1 },
    { title: 'One Piece', animeId: '21', episode: 1 },
  ];

  for (const tc of testCases) {
    console.log(`🔍 Testando Anime: "${tc.title}" (Episódio ${tc.episode})...`);
    const startTime = Date.now();

    try {
      const result = await defaultStreamResolver.resolveEpisodeStream({
        animeId: tc.animeId,
        season: 1,
        episode: tc.episode,
        animeTitle: tc.title,
      });

      const durationMs = Date.now() - startTime;
      console.log(`⏱️ Tempo de Resolução: ${durationMs}ms`);
      console.log(`📊 Provedor Selecionado: ${result.selected ? result.selected.provider : 'Nenhum'}`);

      if (result.selected) {
        console.log(`  URL Selecionada: ${result.selected.url}`);
        console.log(`  Tipo: ${result.selected.type} | Qualidade: ${result.selected.quality || 'Auto'} | Áudio: ${result.selected.audioLanguage}`);
      }

      console.log(`🌐 Fontes Alternativas Encontradas: ${result.alternatives.length}`);
      for (const alt of result.alternatives) {
        console.log(`  - [${alt.provider}] (${alt.type}) -> ${alt.url}`);
      }

      console.log(`📝 Tentativas por Provedor:`);
      for (const att of result.attempts) {
        console.log(`  - Provedor ID: ${att.provider} | Sucesso: ${att.success ? '✅' : '❌'} (${att.durationMs}ms) | Fontes: ${att.sourceCount} ${att.error ? `| Erro: ${att.error}` : ''}`);
      }
    } catch (err) {
      console.error(`❌ Erro no teste do anime "${tc.title}":`, err.message);
    }

    console.log('\n');
  }

  console.log('====================================================');
  console.log('✅ TESTE FINALIZADO');
  console.log('====================================================');
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
