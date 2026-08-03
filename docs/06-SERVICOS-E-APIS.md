# 06. Serviços de API e resiliência

O AniStream usa o Kenjitsu self-hosted como fonte única do catálogo, metadados, episódios e mídias. Não há fallback de Jikan, AniList, Kitsu, Consumet, scrapers externos ou playlists M3U no fluxo de produção.

## 1. Kenjitsu self-hosted

- Cliente HTTP: `src/lib/kenjitsu/client.ts`.
- Catálogo, busca, detalhes, relações, personagens e episódios: `src/lib/kenjitsu/catalog.ts`.
- Tipos compartilhados: `src/lib/kenjitsu/types.ts`.
- Descoberta e resolução de mídia: `src/lib/providers/kenjitsu.provider.ts` e `src/lib/streams/resolver.ts`.
- Health das extensões: `GET /api/extensions/health` no Kenjitsu e `GET /api/admin/extensions` no AniStream.
- Cache de respostas: Redis, com TTL configurável por `KENJITSU_CACHE_TTL_SECONDS`.

As extensões são fontes registradas no Kenjitsu. O painel AniStream altera somente habilitação, NSFW e estado operacional; o código é atualizado nos forks self-hosted, sem alterações nos repositórios oficiais.

## 2. Contratos administrativos

As rotas administrativas exigem sessão válida e retornam JSON orientado ao painel.

| Endpoint | Contrato |
| :--- | :--- |
| `GET /api/admin/overview` | Agrega KPIs, banco, Kenjitsu, extensões, alertas e auditoria recente. |
| `GET /api/admin/metrics` | Mantém métricas legadas para consumidores existentes. |
| `GET /api/admin/animes` | Aceita `q`, `status`, `hasEpisodes`, `sort`, `page` e `pageSize`. |
| `POST /api/admin/animes/bulk` | Aceita `ids` e `action: sync|delete`; retorna resultado por item. |
| `GET /api/admin/extensions` | Aceita `enabled`, `nsfw`, `status`, `source` e `capability`. |
| `POST /api/admin/extensions/bulk` | Aceita `ids` e `action: enable|disable`. |
| `GET /api/admin/audit` | Aceita `resourceType`, `resourceId`, `action`, `from`, `to`, `page` e `pageSize`. |
| `GET /api/admin/homepage` | Retorna rascunho, publicação, versões e resumo do layout. |
| `PUT /api/admin/homepage` | Salva documento tipado com `expectedDraftVersion`. |
| `POST /api/admin/homepage/publish` | Publica com `expectedDraftVersion` e `expectedPublishedVersion`. |
| `POST /api/admin/homepage/discard` | Restaura o rascunho para a última publicação. |
| `GET /api/homepage` | Resolve a composição publicada por bloco usando o Kenjitsu. |

Falhas parciais de bulk retornam os itens que concluíram e os erros individuais. A indisponibilidade do Kenjitsu é representada explicitamente por `down` ou `unknown`; o app não troca silenciosamente de fonte.

## 3. Extensões como fontes

O painel combina as configurações persistidas com o manifest/health retornado pelo Kenjitsu. Cada extensão pode ter:

- status `healthy`, `degraded`, `down` ou `unknown`;
- latência e timestamp do último teste;
- erro recuperável para diagnóstico;
- capacidades e origem do manifest;
- habilitação e política NSFW.

O teste individual em `POST /api/admin/extensions` consulta a extensão, grava `ProviderHealthLog` e atualiza a configuração administrativa. A mesma informação aparece no overview e na matriz de extensões.

## 4. Mídia e segurança

As URLs de reprodução vêm do Kenjitsu em tempo real. Não existe lista de **Hosts de Mídia Autorizados**, cadastro manual de URL de stream ou configuração de fonte externa no setup/painel novo.

Todas as URLs passam por `src/lib/security/ssrf.ts`, que bloqueia protocolos indevidos, credenciais embutidas, portas não suportadas, redes privadas e resultados DNS internos. O relay também exige descritor assinado e usa AES-GCM quando aplicável.

`src/lib/streams/hls-validator.ts` valida status HTTP, content type compatível e a tag `#EXTM3U`. O parser M3U permanece coberto por testes de compatibilidade, mas não é uma fonte de produção.

## 5. Resiliência

- `KENJITSU_REQUEST_TIMEOUT_MS` limita a duração da chamada upstream.
- Redis armazena cache e ajuda a coordenar requisições quando configurado.
- `src/lib/api/circuit-breaker.ts` sinaliza falhas repetidas do Kenjitsu/extensões.
- O dashboard mostra saúde do banco e Kenjitsu separadamente.
- Erros upstream permanecem visíveis para o operador e podem ser auditados; não são mascarados por fallback.

## 6. Auditoria e persistência

`AdminAuditLog` registra ator, ação, recurso, resumo, metadata sanitizada e data. O helper `src/lib/admin/audit.ts` remove chaves sensíveis antes de salvar. Catálogo, extensões, navegação, manutenção, backups, webhooks, comunicados e releases passam por esse registro.

`ProviderHealthLog` mantém o histórico de testes de fontes Kenjitsu com status, latência e erro. A retenção e consultas são locais ao AniStream; a origem dos manifests continua sendo o Kenjitsu.
