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

async function testResolutionFlow() {
  console.log('====================================================');
  console.log('🧪 TESTANDO CRIAÇÃO DE FONTE E RESOLUÇÃO DE STREAM');
  console.log('====================================================\n');

  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para executar este teste.');
    process.exitCode = 1;
    return;
  }

  // 1. Admin Login
  const loginRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    },
    { email, password }
  );

  const rawCookies = loginRes.headers['set-cookie'] || [];
  const cookieHeader = Array.isArray(rawCookies) ? rawCookies.join('; ') : rawCookies;

  if (!cookieHeader) {
    console.error('Login falhou');
    return;
  }

  // 2. Listar animes do banco
  const animesRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/animes',
    method: 'GET',
    headers: { Cookie: cookieHeader },
  });

  const anime = (animesRes.data?.animes || [])[0];
  if (!anime) {
    console.log('Nenhum anime cadastrado no banco para testar.');
    return;
  }

  console.log(`📌 Anime Selecionado: "${anime.title}" (ID: ${anime.id})`);

  // Detalhes do anime
  const detailRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/animes/${anime.id}`,
    method: 'GET',
    headers: { Cookie: cookieHeader },
  });

  const episodes = detailRes.data?.anime?.episodes || [];
  if (episodes.length === 0) {
    console.log('Nenhum episódio cadastrado.');
    return;
  }

  const ep = episodes[0];
  console.log(`📌 Episódio Selecionado: Ep ${ep.number} (ID: ${ep.id})`);

  // 3. Adicionar Fonte Manual para o Episódio 1
  const addSourceRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/api/admin/animes/${anime.id}/episodes/${ep.id}/sources`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
    },
    {
      provider: 'Kenjitsu / AniZone',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      type: 'hls',
      quality: '1080p',
      audioLanguage: 'ja',
      enabled: true,
    }
  );

  console.log(`📌 Adicionar Fonte Status: ${addSourceRes.status}`, addSourceRes.data);

  // 4. Testar Resolução no Endpoint Público /api/streams/resolve
  console.log('\n🔍 Testando Resolução no Endpoint /api/streams/resolve...');
  const resolveRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/streams/resolve',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      animeId: anime.id,
      season: ep.season || 1,
      episode: ep.number || 1,
      animeTitle: anime.title,
    }
  );

  console.log(`⏱️ Status HTTP: ${resolveRes.status}`);
  if (resolveRes.status === 200 && resolveRes.data?.success) {
    const stream = resolveRes.data.data;
    console.log('🎉 SUCESSO! Mídia Resolvida com Sucesso para o Player:');
    console.log(`   Provedor: ${stream.provider}`);
    console.log(`   Playback URL (Proxy Seguro): ${stream.playbackUrl}`);
    console.log(`   Tipo: ${stream.type} | Qualidade: ${stream.quality} | Áudio: ${stream.audioLanguage}`);
  } else {
    console.log('⚠️ Resultado:', resolveRes.data);
  }

  console.log('\n====================================================');
}

testResolutionFlow().catch(console.error);
