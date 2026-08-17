# AniStream — catálogo e streaming de animes

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)

O **AniStream** é uma aplicação web para descoberta, acompanhamento e reprodução de animes. Usa Next.js 15, React 19, TypeScript e o Kenjitsu self-hosted como fonte única de catálogo, metadados, episódios e mídia.

## Funcionalidades

### Setup e execução

- Assistente `/setup` isolado e protegido por `Setup Key`.
- PostgreSQL, Redis, AniStream e Kenjitsu executados localmente por Docker Compose.
- Sem configuração de Hosts de Mídia Autorizados, M3U, URL manual ou provedor externo no setup.

### Operação Kenjitsu

- Extensões tratadas como fontes e controladas em `/admin/extensions`.
- Habilitação/desabilitação individual ou em lote.
- Filtros por status, NSFW, origem e capacidade.
- Testes com latência, erro, status e histórico em `ProviderHealthLog`.
- Atualizações feitas nos forks self-hosted, sem alterar repositórios oficiais.

### Painel administrativo

- Dashboard com saúde do sistema, KPIs, alertas, extensões e atividade recente.
- Catálogo com filtros, seleção em lote, sync/delete e confirmação destrutiva.
- Editor dividido em Identidade, Metadata, Playback e Episódios, com dirty state e save bar.
- Home inicial customizável em `/admin/homepage`, com blocos tipados, preview protegido, rascunho e publicação explícita.
- Release Schedule em `/calendario`, alimentado pelo Kenjitsu, convertido para o timezone do visitante e configurável em `/admin/calendar`.
- Navegação, sistema, backups, integrações, comunicados e releases com feedback consistente.
- `AdminAuditLog` para catálogo, extensões, navegação, manutenção, backups e integrações.
- Aliases preservados: `/admin/dashboard`, `/admin/sources` e `/admin/sources/tester`.

### Player

- HLS adaptativo via `hls.js` e embeds quando retornados pelo Kenjitsu.
- Retomada de reprodução, Picture-in-Picture, autoplay, atalhos e pular abertura.
- Validação HLS, relay seguro e proteção SSRF para URLs recebidas do upstream.

## Estado atual do stack self-hosted

- O único Compose mantido é `docker-compose.yml`, compatível com execução local e futura hospedagem containerizada.
- O Kenjitsu é a API única de catálogo, metadados, episódios e playback.
- O registro atual possui 30 extensões: 25 portadas no fork `kenjitsu-extensions` e 5 nativas no Kenjitsu.
- Extensões com domínios indisponíveis permanecem fora da allowlist do beta até uma nova revisão de smoke.
- O fluxo de atualização passa por `upstream` → fork self-hosted → smoke local → merge na `main`; os repositórios oficiais não são alterados.

## Requisitos

- Node.js 22.19+;
- Docker Desktop com Compose;
- os repositórios irmãos `../kenjitsu` e `../kenjitsu-extensions` para o stack self-hosted;
- PostgreSQL/Redis locais quando executar sem Docker.

## Execução local recomendada

Copie `.env.example` para `.env` e ajuste apenas segredos, portas ou endpoints necessários. No Compose, o host do PostgreSQL deve ser `postgres`; use `localhost` somente quando o Next.js estiver rodando fora do Docker. Não adicione allowlist de hosts de mídia: as URLs são retornadas pelo Kenjitsu.

```bash
npm install
docker compose up -d --build
```

Para o Compose, confirme em `.env`:

```dotenv
DATABASE_URL="postgresql://user:password@postgres:5432/anistream_db?schema=public"
KENJITSU_BASE_URL="http://kenjitsu:3000"
```

Acesse `http://localhost:3000`. Em uma instalação nova, a aplicação redireciona para `/setup`; em desenvolvimento, consulte a chave no log do serviço:

```bash
docker compose logs app
```

Depois da instalação, abra `/admin/homepage` para ajustar a composição da Home. O layout é migrado automaticamente da configuração legada na primeira leitura, e a publicação só acontece após salvar o rascunho e confirmar a ação.

O stack padrão expõe apenas o AniStream para a máquina local:

- AniStream: `http://localhost:3000`;
- Kenjitsu, PostgreSQL e Redis ficam acessíveis somente na rede privada do Compose.

## Execução sem Docker

```bash
npm install
npm run db:migrate
npm run dev
```

Configure `DATABASE_URL`, `REDIS_URL`, `KENJITSU_BASE_URL`, `KENJITSU_API_KEY`, `KENJITSU_REQUEST_TIMEOUT_MS` e `KENJITSU_CACHE_TTL_SECONDS` no `.env`.

## Validação local

```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:e2e
npm run test:docker
npm run build
```

Para validar o inventário Kenjitsu:

```bash
npm run test:kenjitsu
```

O smoke pode ser reduzido com `KENJITSU_SMOKE_EXTENSIONS=anizone,animefire`. Falhas de upstream aparecem como estado operacional e não ativam fallback silencioso.

Para fontes cuja busca nao retorna o titulo de teste, `KENJITSU_SMOKE_PROBE_FALLBACK=true` executa uma verificacao explicita pela primeira entrada e marca o resultado como aviso; isso nao relaxa a resolucao exata usada pelo catalogo.

Mais detalhes em [`docs/10-TESTES-E-SCRIPTS.md`](./docs/10-TESTES-E-SCRIPTS.md).

## Variáveis principais

| Variável | Uso |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL do AniStream. |
| `REDIS_URL` | Cache e coordenação do AniStream. |
| `KENJITSU_BASE_URL` | URL da API Kenjitsu self-hosted. |
| `KENJITSU_API_KEY` | Chave opcional da API Kenjitsu. |
| `KENJITSU_REQUEST_TIMEOUT_MS` | Timeout de chamadas upstream. |
| `KENJITSU_CACHE_TTL_SECONDS` | TTL do cache Kenjitsu. |
| `CALENDAR_CACHE_TTL_SECONDS` | TTL do cache do calendário semanal; padrão de 1800 segundos. |
| `REDIS_PASSWORD` | Senha do Redis do AniStream. |
| `PLAYBACK_TOKEN_SECRET` | Tokens do playback. |
| `SOURCE_ENCRYPTION_KEY` | Criptografia de descritores de mídia. |
| `INITIAL_SETUP_KEY` | Chave obrigatória no primeiro setup de produção. |
| `NEXT_PUBLIC_APP_URL` | URL pública/local da aplicação. |

As portas locais podem ser alteradas por `ANISTREAM_APP_PORT`, `ANISTREAM_POSTGRES_PORT`, `ANISTREAM_REDIS_PORT`, `KENJITSU_PORT` e `KENJITSU_REDIS_PORT`.

## Documentação

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — arquitetura e contratos técnicos.
- [`docs/INDEX.md`](./docs/INDEX.md) — índice completo.
- [`docs/KENJITSU-SELF-HOSTED.md`](./docs/KENJITSU-SELF-HOSTED.md) — forks, Compose e atualizações.
- [`docs/09-PAINEL-ADMINISTRATIVO.md`](./docs/09-PAINEL-ADMINISTRATIVO.md) — operação do painel.
- [`docs/06-SERVICOS-E-APIS.md`](./docs/06-SERVICOS-E-APIS.md) — APIs, resiliência e segurança.
- [`docs/10-TESTES-E-SCRIPTS.md`](./docs/10-TESTES-E-SCRIPTS.md) — gates de validação local.
- [Kenjitsu](https://github.com/eosoda/kenjitsu) e [documentação do Kenjitsu](https://kenjitsu-docs.vercel.app/).

O beta self-hosted será publicado no Dokploy somente após os gates locais e autorização explícita. A topologia e o procedimento estão em [`deploy/dokploy/README.md`](./deploy/dokploy/README.md) e [`docs/08-DEPLOYMENT-E-RAILWAY.md`](./docs/08-DEPLOYMENT-E-RAILWAY.md).
