# 10. Testes Automatizados & Scripts de Validação — AniStream 🧪

Este documento lista todas as suítes de testes unitários do Vitest e scripts de diagnóstico pré-deploy para verificação do AniStream.

---

## 🧪 1. Suíte de Testes Unitários (Vitest)

Para rodar a suíte completa de testes automatizados:

```bash
npm run test
```

### Arquivos de Teste (`src/__tests__/`)

1. **`hls-validator.test.ts`**: Valida a checagem de playlists HLS (`.m3u8`), status HTTP, `Content-Type` e presenças da tag `#EXTM3U`.
2. **`normalize-title.test.ts`**: Testa a normalização de títulos de animes, remoção de diacríticos, temporadas e termos de dublagem.
3. **`circuit-breaker.test.ts`**: Testa o padrão Circuit Breaker, contagem de falhas, abertura de circuito (OPEN) e fallback offline.
4. **`m3u-parser.test.ts`**: Testa o parser de listas M3U/M3U8 e extração de metadados.
5. **`admin-schemas.test.ts`**: Valida schemas Zod para rotas administrativas.
6. **`crypto.test.ts`**: Testa a criptografia AES-256-GCM para URLs de mídias (`encryptData` / `decryptData`).
7. **`ssrf.test.ts`**: Testa a proteção de validação SSRF contra endereços IP internos / privados.

---

## 📜 2. Scripts de Diagnóstico e Integração (`scratch/`)

- `scratch/test-episode-sources-flow.js` — Script HTTP legado; a descoberta atual é live pelo Kenjitsu e não cadastra URLs manuais.
- `scratch/test-sources-http-api.js` — Script HTTP legado; a resolução atual usa somente o Kenjitsu e suas extensões habilitadas.
- `scratch/init-admin-and-test.js` — Script de validação da rota de setup, autenticação de admin e resolução de stream.

---

## ⚡ 3. Comandos de Verificação Pré-Deploy

```bash
# 1. Checagem estrita de tipos TypeScript
npx tsc --noEmit

# 2. Rodar suíte de testes Vitest
npm run test

# 3. Build limpo da imagem Docker sem cache
docker compose build --no-cache app

# 4. Inicialização dos containers em background
docker compose up -d
```
