const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(data),
          });
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

async function run() {
  console.log('--- TESTANDO FLUXO DE FONTES DE EPISÓDIO NO ADMIN ---');

  // 1. Login Admin
  const loginRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'admin@anistream.com', password: 'admin123456' }
  );

  console.log('Login Status:', loginRes.status);
  const rawCookies = loginRes.headers['set-cookie'] || [];
  const cookieHeader = Array.isArray(rawCookies) ? rawCookies.join('; ') : rawCookies;

  if (!cookieHeader) {
    console.error('Falha no login admin!');
    return;
  }

  // 2. Listar Animes para pegar um ID
  const animesRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/animes',
    method: 'GET',
    headers: { Cookie: cookieHeader },
  });

  const animeList = animesRes.data?.animes || [];
  if (animeList.length === 0) {
    console.log('Nenhum anime no banco para testar.');
    return;
  }

  const testAnime = animeList[0];
  console.log(`Anime Selecionado: "${testAnime.title}" (ID: ${testAnime.id})`);

  // Detalhes do anime
  const detailRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/admin/animes/${testAnime.id}`,
    method: 'GET',
    headers: { Cookie: cookieHeader },
  });

  const episodes = detailRes.data?.anime?.episodes || [];
  console.log(`Episódios encontrados: ${episodes.length}`);

  if (episodes.length > 0) {
    const ep = episodes[0];
    console.log(`Testando Episódio 1 (ID: ${ep.id})`);

    // 3. Cadastrar fonte manual
    const addSourceRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: `/api/admin/animes/${testAnime.id}/episodes/${ep.id}/sources`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        },
      },
      {
        provider: 'Provedor Teste Auto',
        url: 'https://test-stream.com/hls/ep1.m3u8',
        type: 'hls',
        quality: '1080p',
        audioLanguage: 'pt-BR',
        enabled: true,
      }
    );

    console.log('Criar Fonte Status:', addSourceRes.status, addSourceRes.data);

    // 4. Varredura de fontes
    const discoverRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: `/api/admin/animes/${testAnime.id}/episodes/${ep.id}/discover-sources`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        },
      },
      {}
    );

    console.log('Varredura Fontes Status:', discoverRes.status, discoverRes.data);
  }

  console.log('--- TESTE CONCLUÍDO COM SUCESSO ---');
}

run().catch(console.error);
