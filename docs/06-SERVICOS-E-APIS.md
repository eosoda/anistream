# 06. Serviços de API & Resiliência — AniStream 🌐

O AniStream possui uma arquitetura de dados e streaming multi-fonte projetada para alta resiliência, velocidade e tolerância a falhas.

---

## 🌐 1. Camada de Metadados Multi-Fonte ([metadata-fetcher.ts](file:///c:/Users/sodinha/Documents/projetos/anistream/src/lib/anime/metadata-fetcher.ts))

Para evitar travamentos e erros 504/503 em buscas de animes, o sistema consulta metadados em 3 camadas de fallback:

1. **AniList GraphQL API (Prioridade Principal)**: Resposta em **~100ms** sem passar pelos bloqueios do MyAnimeList.
2. **Jikan v4 + Timeout (4.5s)**: Fila de engarrafamento (350ms) com cancelamento rápido por `AbortController`.
3. **Kitsu API (Fallback Terciário)**: Resposta alternativa para garantir retorno dos dados.
4. **Extração de Aliases**: Salva automaticamente todos os nomes alternativos (romaji, native, english, synonyms) na tabela `AnimeAlias` do PostgreSQL para pareamento de episódios.

---

## 🎬 2. 8 Provedores de Streaming e Episódios Externos ([externalProviders.ts](file:///c:/Users/sodinha/Documents/projetos/anistream/services/providers/externalProviders.ts))

O backend implementa 8 provedores independentes de reprodução:

1. **Kenjitsu / AniZone**: Busca `/api/anizone/anime/search`, legendados (`-episode-{episode}`) e dublados (`-dub`, `-dublado`).
2. **GogoAnime (Consumet com 5 Instâncias Fallback)**:
   - Alterna em sequência entre:
     - `https://api-consumet-org-five.vercel.app`
     - `https://consumet-api-1.vercel.app`
     - `https://anime-api-iota.vercel.app`
     - `https://consumet-api-zeta.vercel.app`
     - `https://consumet-api-ecru.vercel.app`
   - Extrai `sources`, `headers` e `subtitles`.
3. **HiAnime / Zoro (Consumet / Zoro)**: Extração de playlists HLS (`.m3u8`).
4. **Anify**: Extração por `aniListId` via `api.anify.tv`.
5. **AnimesOnline (Scraper HTML + AJAX)**: Busca HTML e rotas `wp-admin/admin-ajax.php`.
6. **WarezCDN / Superflix**: Suporte aos 4 domínios (`warezcdn.lat`, `warezcdn.site`, `superflixapi.pro`, `superflixapi.rest`).
7. **XPass / 2Embed**: Embeds `/e/tv/`, `/e/movie/` e arquivos de playlist JSON.
8. **Catálogo M3U Autorizado**: Playlists M3U/M3U8 personalizadas por URL.

---

## ⚡ 3. Fila de Engarrafamento e Circuit Breaker

- **Jikan API Throttling (`services/jikan.ts`)**: Garante um intervalo mínimo de 350ms entre chamadas com backoff em erros 429.
- **Circuit Breaker (`src/lib/api/circuit-breaker.ts`)**: Se ocorrerem 5 falhas seguidas em 60s, o circuito abre por 30s e serve dados do banco local sem causar timeouts na interface.

---

## 📐 4. Padronização de Respostas HTTP (`src/lib/api/response.ts`)

- **Sucesso (`apiSuccess<T>`)**: `{ success: true, data: T, meta?: ... }`
- **Erro (`apiError`)**: `{ success: false, error: { code, message, details }, timestamp }`
