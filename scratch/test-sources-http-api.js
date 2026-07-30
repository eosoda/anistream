const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function testApiSources() {
  console.log('====================================================');
  console.log('🧪 TESTE COMPLETO DAS FONTES DE MÍDIA VIA HTTP API');
  console.log('====================================================\n');

  // 1. Testar Rota de Provedores Administrativos
  console.log('📌 1. Consultando Provedores Ativos em /api/admin/providers...');
  const providersRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/providers',
    method: 'GET',
  });

  console.log(`Status HTTP: ${providersRes.status}`);
  const providers = providersRes.data?.providers || [];
  console.log(`Provedores cadastrados no sistema: ${providers.length}\n`);

  for (const p of providers) {
    console.log(`  - [${p.enabled ? 'ATIVADO ✅' : 'DESATIVADO ❌'}] ${p.name}`);
    console.log(`    Tipo: ${p.type} | Prioridade: ${p.priority} | URL: ${p.url}`);
  }

  console.log('\n----------------------------------------------------');
  console.log('📌 2. Testando Resolução de Stream em Tempo Real em /api/streams/resolve...');
  console.log('----------------------------------------------------\n');

  const testCases = [
    { title: 'Frieren: Beyond Journey\'s End', animeId: '52991', episode: 1 },
    { title: 'Naruto', animeId: '20', episode: 1 },
    { title: 'One Piece', animeId: '21', episode: 1 },
  ];

  for (const tc of testCases) {
    console.log(`🔍 Testando Anime: "${tc.title}" (Episódio ${tc.episode})...`);
    const startTime = Date.now();

    const resolveRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/streams/resolve',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        animeId: tc.animeId,
        season: 1,
        episode: tc.episode,
        animeTitle: tc.title,
      }
    );

    const durationMs = Date.now() - startTime;
    console.log(`⏱️ Status HTTP: ${resolveRes.status} (${durationMs}ms)`);

    if (resolveRes.status === 200 && resolveRes.data?.success) {
      const data = resolveRes.data.data;
      console.log(`✅ Fonte Principal Retornada:`);
      console.log(`   Provedor: ${data.provider}`);
      console.log(`   Playback URL: ${data.playbackUrl}`);
      console.log(`   Tipo: ${data.type} | Qualidade: ${data.quality} | Áudio: ${data.audioLanguage}`);

      if (Array.isArray(data.alternatives) && data.alternatives.length > 0) {
        console.log(`   Fontes Alternativas (${data.alternatives.length}):`);
        for (const alt of data.alternatives) {
          console.log(`     - [${alt.provider}] (${alt.quality}) -> ${alt.playbackUrl}`);
        }
      }
    } else {
      console.log(`⚠️ Resposta do Servidor:`, resolveRes.data);
    }

    console.log('\n');
  }

  console.log('====================================================');
  console.log('✅ TESTE DE FONTES FINALIZADO');
  console.log('====================================================');
}

testApiSources().catch(console.error);
