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

async function testPublicStreamResolution() {
  console.log('====================================================');
  console.log('🧪 TESTE COMPLETO DE PROVEDORES E RESOLUÇÃO DE STREAM');
  console.log('====================================================\n');

  // 1. Consultar Provedores em /api/admin/providers
  console.log('📌 1. Verificando Provedores Cadastrados no Banco:');
  const providersRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/providers',
    method: 'GET',
  });

  const providers = providersRes.data?.providers || [];
  console.log(`   Total de Provedores: ${providers.length}\n`);

  for (const p of providers) {
    console.log(`   - [${p.enabled ? 'ATIVADO ✅' : 'DESATIVADO ❌'}] ${p.name} (Tipo: ${p.type}, Prioridade: ${p.priority})`);
  }

  // 2. Testar Resolução no Endpoint /api/streams/resolve
  console.log('\n----------------------------------------------------');
  console.log('📌 2. Testando Resolução de Stream em /api/streams/resolve:');
  console.log('----------------------------------------------------\n');

  const testAnimes = [
    { animeId: '52991', season: 1, episode: 1, animeTitle: 'Frieren: Beyond Journey\'s End' },
    { animeId: '20', season: 1, episode: 1, animeTitle: 'Naruto' },
  ];

  for (const item of testAnimes) {
    console.log(`🔍 Testando Anime: "${item.animeTitle}" (Episódio ${item.episode})...`);
    const resolveRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/streams/resolve',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      item
    );

    console.log(`⏱️ Status HTTP: ${resolveRes.status}`);

    if (resolveRes.status === 200 && resolveRes.data?.success) {
      const data = resolveRes.data.data;
      console.log('🎉 SUCESSO! Mídia de Stream Resolvida com Sucesso para o Player:');
      console.log(`   Provedor: ${data.provider}`);
      console.log(`   Playback URL (Proxy Seguro): ${data.playbackUrl}`);
      console.log(`   Tipo de Mídia: ${data.type}`);
      console.log(`   Qualidade: ${data.quality}`);
      console.log(`   Idioma de Áudio: ${data.audioLanguage}`);
    } else {
      console.log(`ℹ️ Resposta da API:`, resolveRes.data);
    }

    console.log('\n');
  }

  console.log('====================================================');
  console.log('✅ RELATÓRIO DO TESTE CONCLUÍDO');
  console.log('====================================================');
}

testPublicStreamResolution().catch(console.error);
