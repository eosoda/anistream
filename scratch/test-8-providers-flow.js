const { validateHlsPlaylist } = require('../src/lib/streams/hls-validator');

async function testHlsValidator() {
  console.log('--- TESTANDO VALIDADOR HLS #EXTM3U ---');

  const testUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  console.log(`Validando URL Mux Test: ${testUrl}`);

  const result = await validateHlsPlaylist(testUrl);
  console.log('Resultado Validação HLS:', result);

  if (result.isValid) {
    console.log('✅ HLS Playlist válida (#EXTM3U confirmado)!');
  } else {
    console.log('⚠️ Validação HLS (esperado se offline):', result.error);
  }
}

testHlsValidator().catch(console.error);
