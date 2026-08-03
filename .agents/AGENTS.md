# Guia de agentes do AniStream

Este arquivo é a referência operacional para agentes que trabalham neste repositório. Consulte também [`README.md`](../README.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/INDEX.md`](../docs/INDEX.md) e [`docs/KENJITSU-SELF-HOSTED.md`](../docs/KENJITSU-SELF-HOSTED.md) antes de alterar arquitetura, infraestrutura ou fluxos administrativos.

## Resumo do repositório

O AniStream é uma aplicação Next.js 15/React 19 para descoberta, acompanhamento e reprodução de animes. O Kenjitsu self-hosted é a única API de catálogo, metadados, episódios e mídia.

Princípios obrigatórios:

- não adicionar fallback silencioso para Jikan, AniList, Kitsu, Consumet, scrapers, M3U ou provedores legados;
- não adicionar configuração de Hosts de Mídia Autorizados, playlists M3U ou URLs manuais ao setup/painel novo;
- tratar extensões Kenjitsu como fontes operacionais habilitáveis, testáveis e auditáveis;
- manter os forks locais/self-hosted e nunca alterar os repositórios oficiais do Kenjitsu;
- validar localmente com Docker/PostgreSQL/Redis/Kenjitsu; Railway não faz parte do fluxo atual sem autorização explícita.

## Stack e caminhos reais

- **Framework**: Next.js 15 App Router, React 19 e TypeScript strict.
- **Estilo**: Tailwind CSS e tokens em `app/globals.css`; dark theme e laranja de playback.
- **Dados**: Prisma/PostgreSQL para catálogo operacional, usuários, episódios, configurações, auditoria e health.
- **Cache**: Redis do AniStream e Redis separado do Kenjitsu.
- **Cliente de dados**: `src/lib/kenjitsu/client.ts` e `src/lib/kenjitsu/catalog.ts`.
- **Mídia**: `src/lib/providers/kenjitsu.provider.ts`, `src/lib/streams/resolver.ts` e `src/lib/security/ssrf.ts`.
- **Offline**: `src/utils/offlineCacheDB.ts`; fallback técnico em memória quando IndexedDB não está disponível.
- **Componentes**: todos ficam em `src/components/`, não em `components/` na raiz.

## Estrutura do App Router

```text
app/
├── layout.tsx                  # shell raiz, providers, setup guard e PWA
├── (main)/
│   ├── layout.tsx              # chrome público
│   ├── page.tsx                # home
│   ├── anime/[id]/             # detalhes e player
│   ├── admin/                  # painel autenticado
│   └── ...                     # catálogo, favoritos, busca e calendário
└── setup/                      # instalação inicial
```

O shell do admin fica em `app/(main)/admin/layout.tsx`. As rotas administrativas canônicas são `/admin`, `/admin/animes`, `/admin/extensions`, `/admin/navigation`, `/admin/system`, `/admin/backups`, `/admin/integrations`, `/admin/broadcasts` e `/admin/releases`.

Aliases que devem ser preservados:

- `/admin/dashboard` → `/admin`;
- `/admin/sources` → `/admin/extensions`;
- `/admin/sources/tester` → `/admin/extensions`.

## Painel administrativo

O admin segue a direção visual **Livro de operações**: superfícies planas, tabelas, filas, divisórias, status semântico e ações explícitas. Cards glass não devem ser usados como material padrão do admin.

Primitives compartilhados em `src/components/admin/AdminPrimitives.tsx`:

- `AdminPanel`;
- `AdminPageHeader`;
- `AdminDataTable`;
- `AdminFilterBar`;
- `AdminStatusBadge`;
- `AdminFeedback`;
- `AdminEmptyState`;
- `AdminDrawer`;
- `AdminSaveBar`;
- `AdminCommandPalette`.

Regras de interação:

- toda ação assíncrona deve mostrar loading, sucesso ou erro recuperável;
- alterações não salvas devem ativar dirty state e save bar;
- exclusão, restore, manutenção e ações de lote destrutivas exigem confirmação;
- campos precisam de label, ajuda/erro associado, `aria-invalid` e `aria-describedby`;
- dialogs devem prender foco, responder a Escape e devolver foco ao acionador;
- navegação ativa usa `aria-current`; tabs usam `aria-selected`;
- respeitar reduced motion, teclado, foco visível e zoom de 200%.

## Kenjitsu e extensões

O Kenjitsu fornece catálogo, detalhes, episódios, relações, personagens e fontes live. As extensões são registradas pelo Kenjitsu e operadas pelo AniStream:

- habilitação/desabilitação individual e em lote;
- filtro por `enabled`, `nsfw`, status, origem e capacidade;
- teste individual via Kenjitsu;
- status `healthy`, `degraded`, `down` ou `unknown`;
- latência, timestamp e erro do último teste;
- histórico persistido em `ProviderHealthLog`.

O código de extensões vive nos forks locais `../kenjitsu`, `../kenjitsu-extensions` e `../extensions-source`. Use `origin` para o fork e `upstream` para o repositório oficial. Atualizações devem ser feitas em branch e PR próprios.

## Persistência e auditoria

`AdminAuditLog` registra ator, ação, recurso, resumo, metadata sanitizada e data. O helper `src/lib/admin/audit.ts` remove chaves sensíveis antes de persistir.

Audite mudanças de catálogo, episódios, extensões, navegação, manutenção, backups, webhooks, comunicados, releases, autopilot e testes de providers. Ao criar uma nova mutação administrativa, registre a ação depois que ela for concluída.

APIs administrativas principais:

| Endpoint | Contrato |
| :--- | :--- |
| `GET /api/admin/overview` | KPIs, serviços, extensões, alertas e atividade recente. |
| `GET /api/admin/metrics` | Contrato legado de métricas; preservar compatibilidade. |
| `GET /api/admin/audit` | Filtros por recurso, ação, período e paginação. |
| `GET /api/admin/animes` | Busca, status, episódios, ordenação e paginação. |
| `POST /api/admin/animes/bulk` | `sync` ou `delete` com resultado por item. |
| `GET /api/admin/extensions` | Filtros por habilitação, NSFW, status, origem e capacidade. |
| `POST /api/admin/extensions/bulk` | `enable` ou `disable` com falhas parciais. |
| `POST /api/admin/extensions` | Teste individual e persistência de health. |

Todas as rotas admin devem validar sessão com `verifyAdminAuth` e preservar mensagens/status compatíveis com os consumidores existentes.

## Segurança de mídia

- `src/lib/security/ssrf.ts` bloqueia protocolos indevidos, credenciais, portas não suportadas, redes privadas e DNS interno.
- HLS é validado em `src/lib/streams/hls-validator.ts` por status, content type e `#EXTM3U`.
- URLs de mídia são retornadas pelo Kenjitsu em tempo real.
- O relay usa descritor assinado e criptografia AES-GCM quando aplicável.
- Não cadastrar hosts, URLs manuais ou fontes externas para contornar o Kenjitsu.

## Execução local

Use os três repositórios irmãos e o Compose self-hosted:

```bash
docker compose up -d --build
```

Serviços padrão:

- AniStream: `http://localhost:3000`;
- Kenjitsu: `http://localhost:3001`;
- PostgreSQL: `localhost:5432`;
- Redis AniStream: `localhost:6379`;
- Redis Kenjitsu: `localhost:6380`.

Dentro dos containers, use os hosts `postgres`, `redis` e `kenjitsu`. `localhost` é para executar o Next.js diretamente na máquina.

## Comandos obrigatórios de verificação

Antes de finalizar uma mudança de código:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:e2e
npm run test:docker
npm run build
```

Para alterações de integração Kenjitsu, execute também:

```bash
npm run test:kenjitsu
```

O smoke pode ser reduzido com `KENJITSU_SMOKE_EXTENSIONS=anizone,animefire`. Falhas isoladas de upstream devem aparecer no resultado; não corrija isso adicionando fallback.

## Git, branches e PRs

- Preserve alterações existentes do usuário; não use `git reset --hard` ou `git checkout --` sem autorização explícita.
- Crie branches de feature a partir da base solicitada e mantenha commits focados.
- Para mudanças grandes, separe fundação visual, APIs/persistência e superfícies/fluxos quando isso ajudar a revisão.
- Abra PR draft quando a mudança ainda depender de validação local ou revisão.
- Nunca faça deploy Railway nesta fase.
- Não inclua `tsconfig.tsbuildinfo` gerado no PR quando ele estiver alterado fora do escopo.
- Não faça commits nos repositórios oficiais do Kenjitsu; atualizações entram pelos forks locais.

Definition of done:

1. contrato e impacto documentados;
2. implementação alinhada às rotas e tipos existentes;
3. loading, vazio, erro, sucesso e permissão considerados;
4. auditoria adicionada a toda nova mutação administrativa;
5. TypeScript, lint, testes relevantes, build e diff verificados;
6. branch e PR atualizados sem incluir artefatos gerados.
