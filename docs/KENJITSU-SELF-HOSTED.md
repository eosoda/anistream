# Kenjitsu self-hosted

O AniStream usa o Kenjitsu como única API de catálogo, metadados, episódios e sources. Não há fallback de Jikan, AniList, Consumet, M3U ou provedores legados no fluxo de produção.

## Repositórios locais

Os três projetos são mantidos em forks da conta `eosoda`, com `origin` apontando para o fork e `upstream` apontando para o projeto oficial:

- `../kenjitsu` → `eosoda/kenjitsu`;
- `../kenjitsu-extensions` → `eosoda/kenjitsu-extensions`;
O build self-hosted usa diretamente `kenjitsu-extensions` como contexto. O AniStream nunca altera repositórios oficiais.

## Subir localmente

Na pasta `anistream`:

```bash
docker compose up -d --build
```

Serviços padrão:

| Serviço | Endereço |
| :--- | :--- |
| AniStream | `http://localhost:3000` |
| Kenjitsu | rede interna `http://kenjitsu:3000` |
| PostgreSQL | rede interna `postgres:5432` |
| Redis do AniStream | rede interna `redis:6379` |
| Redis do Kenjitsu | rede interna `kenjitsu-redis:6379` |

O Compose compila `kenjitsu/Dockerfile.selfhosted` usando os dois forks irmãos como contexto. A imagem final é independente do caminho do host.

Somente a porta local do AniStream é publicada pelo Compose. Os demais serviços
continuam privados, como no Dokploy.

## Configuração do AniStream

O mínimo para execução local está em `.env.example`:

```dotenv
DATABASE_URL="postgresql://user:password@localhost:5432/anistream_db?schema=public"
REDIS_URL="redis://:password@localhost:6379"
KENJITSU_BASE_URL="http://localhost:3001"
KENJITSU_API_KEY=""
KENJITSU_REQUEST_TIMEOUT_MS="10000"
KENJITSU_CACHE_TTL_SECONDS="300"
```

O exemplo acima é para executar o AniStream fora do Compose. Dentro dos containers, use `DATABASE_URL` com host `postgres` e `KENJITSU_BASE_URL="http://kenjitsu:3000"`, conforme a rede do `docker-compose.yml`.

Não configure hosts autorizados de mídia, playlists M3U ou URLs manuais. As URLs de reprodução vêm do Kenjitsu e ainda passam pela proteção SSRF do AniStream.

## Health e extensões

Verifique o stack antes de testar o painel:

```bash
curl http://localhost:3000/api/health
docker compose exec kenjitsu wget --no-verbose --header="x-api-key: ${KENJITSU_API_KEY}" --spider http://127.0.0.1:3000/api/extensions/health
```

O painel `/admin/extensions` controla habilitação, NSFW, status, latência, versão, origem, capacidades e teste individual das extensões. A operação em lote usa a mesma matriz e registra alterações no `AdminAuditLog`.

Estados possíveis do health no AniStream:

- `healthy`: teste concluído com sucesso;
- `degraded`: resposta parcial ou resultado sem mídia utilizável;
- `down`: chamada falhou;
- `unknown`: ainda não há teste ou manifest disponível.

## Smoke do inventário

```bash
npm run test:kenjitsu
```

Para um diagnóstico rápido:

```powershell
$env:KENJITSU_SMOKE_EXTENSIONS="anizone,animefire,animesbr"
npm run test:kenjitsu
```

O smoke verifica registro das extensões e executa busca, detalhes, episódios e sources. As fontes NSFW ficam fora do smoke padrão e só entram com `KENJITSU_SMOKE_INCLUDE_NSFW=true`.

Uma falha isolada do upstream não deve ser transformada em fallback silencioso. O resultado deve ser investigado no manifest/endpoint da extensão e permanecer visível no painel.

Por segurança, o smoke normal exige correspondência exata para extensões portadas. As extensões nativas usam o mapping do AniList. Quando a busca de uma fonte retorna resultados genéricos ou páginas de episódio, é possível testar somente a cadeia da primeira entrada com `KENJITSU_SMOKE_PROBE_FALLBACK=true`; o resultado aparece como aviso e não vira fallback na resolução do catálogo.

O inventário self-hosted atual possui 30 extensões. A allowlist do beta é menor e
está definida no AniStream a partir do último smoke funcional; entradas fora dela
permanecem desabilitadas mesmo que existam em configurações antigas.

## Atualizar dos upstreams

Em cada fork:

```bash
git fetch upstream --tags
git log --oneline HEAD..upstream/main
```

O fluxo recomendado é:

1. criar uma branch de atualização no fork;
2. integrar a atualização do upstream;
3. executar testes do projeto e o smoke local;
4. abrir PR no fork;
5. atualizar o Compose/AniStream somente após revisão.

Não faça commits diretamente nos repositórios oficiais. A atualização do AniStream deve continuar em branch própria e PR separado, com testes locais antes de qualquer deploy futuro.
