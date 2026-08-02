# 06. Serviços de API e resiliência — AniStream

O AniStream usa o Kenjitsu self-hosted como fonte única do catálogo, metadados, episódios e mídias. A aplicação não consulta Jikan, AniList, Kitsu, Consumet, scrapers externos ou playlists M3U como fallback de produção.

## 1. Kenjitsu self-hosted

- Cliente central: `src/lib/kenjitsu/client.ts`.
- Catálogo, busca, detalhes, relações, personagens e episódios: `src/lib/kenjitsu/catalog.ts`.
- Descoberta e resolução de mídia: `src/lib/providers/kenjitsu.provider.ts` e `src/lib/streams/resolver.ts`.
- Saúde e controle das extensões: `/admin/extensions`, `/api/admin/extensions` e `/api/admin/providers`.
- Cache de respostas: Redis, com TTL configurável por `KENJITSU_CACHE_TTL_SECONDS`.

As extensões são mantidas nos forks/self-hosted do projeto Kenjitsu. O painel AniStream apenas habilita, desabilita, testa e consulta o estado delas; atualização de código acontece no fork local, sem alterações nos repositórios oficiais.

## 2. Mídia e segurança

As URLs de reprodução são retornadas pelo Kenjitsu em tempo real. Não existe mais uma lista administrativa de hosts autorizados e não há cadastro manual de URL de stream.

Mesmo sem allowlist de hosts, toda URL recebida passa por `validateUrlSsrf` em `src/lib/security/ssrf.ts`. A validação bloqueia protocolos indevidos, credenciais embutidas, portas não suportadas, redes privadas e resultados DNS internos. O relay continua exigindo descritor assinado e URL protegida por AES-GCM quando aplicável.

## 3. Resiliência

- Timeout de requisição: `KENJITSU_REQUEST_TIMEOUT_MS`.
- Cache distribuído: Redis, quando configurado.
- Circuit breaker: `src/lib/api/circuit-breaker.ts`, usado para sinalizar indisponibilidade do Kenjitsu e de suas extensões.
- Erros de upstream são propagados como falhas do Kenjitsu; a aplicação não troca silenciosamente para outra API.

## 4. Contratos internos

As rotas internas mantêm respostas JSON com mensagens orientadas ao painel. Endpoints legados de cadastro manual/M3U respondem `410 Gone` para deixar explícita a migração. A descoberta de fontes de um episódio usa `POST /api/admin/animes/[id]/episodes/[epId]/discover-sources` e retorna candidatos live para teste no player.
