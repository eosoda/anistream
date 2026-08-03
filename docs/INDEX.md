# Documentação do AniStream

Este índice organiza a documentação técnica, de produto, execução local e operação do AniStream. A arquitetura atual usa o Kenjitsu self-hosted como fonte única de catálogo, episódios e mídia.

## Sumário

| Arquivo | Tema | Quando consultar |
| :--- | :--- | :--- |
| [`01-VISAO-GERAL-E-STACK.md`](./01-VISAO-GERAL-E-STACK.md) | Visão geral e stack | Para entender o runtime, dados e tecnologias. |
| [`02-ROTAS-E-PAGINAS.md`](./02-ROTAS-E-PAGINAS.md) | Rotas públicas | Para localizar páginas do App Router. |
| [`03-COMPONENTES-E-DESIGN.md`](./03-COMPONENTES-E-DESIGN.md) | Componentes e design system | Para criar ou ajustar componentes. |
| [`04-ESTADO-E-CONTEXTOS.md`](./04-ESTADO-E-CONTEXTOS.md) | Estado e contextos | Para entender providers e hooks globais. |
| [`05-PLAYER-E-STREAMING.md`](./05-PLAYER-E-STREAMING.md) | Player e streaming | Para playback, HLS, embeds e atalhos. |
| [`06-SERVICOS-E-APIS.md`](./06-SERVICOS-E-APIS.md) | APIs e resiliência | Para Kenjitsu, Redis, SSRF e contratos administrativos. |
| [`07-OFFLINE-E-CACHE-IDB.md`](./07-OFFLINE-E-CACHE-IDB.md) | Offline e IndexedDB | Para cache local e funcionamento offline. |
| [`08-DEPLOYMENT-E-RAILWAY.md`](./08-DEPLOYMENT-E-RAILWAY.md) | Docker e deployment futuro | Para execução self-hosted e referência de hospedagem; Railway não é usado na validação atual. |
| [`09-PAINEL-ADMINISTRATIVO.md`](./09-PAINEL-ADMINISTRATIVO.md) | Painel operacional | Para setup, dashboard, catálogo, Home customizável, extensões, auditoria e rotas admin. |
| [`10-TESTES-E-SCRIPTS.md`](./10-TESTES-E-SCRIPTS.md) | Testes locais | Para Vitest, Playwright, Docker, TypeScript e smoke Kenjitsu. |
| [`11-CALENDARIO-RELEASE-SCHEDULE.md`](./11-CALENDARIO-RELEASE-SCHEDULE.md) | Calendário semanal | Para o contrato público, regras administrativas, timezones, cache e operação. |
| [`KENJITSU-SELF-HOSTED.md`](./KENJITSU-SELF-HOSTED.md) | Kenjitsu self-hosted | Para os três forks, Compose, health, smoke e atualização via upstream. |

## Ordem recomendada

1. Leia [`KENJITSU-SELF-HOSTED.md`](./KENJITSU-SELF-HOSTED.md) para subir as dependências locais.
2. Consulte [`01-VISAO-GERAL-E-STACK.md`](./01-VISAO-GERAL-E-STACK.md) e [`ARCHITECTURE.md`](../ARCHITECTURE.md) para o modelo técnico.
3. Leia [`09-PAINEL-ADMINISTRATIVO.md`](./09-PAINEL-ADMINISTRATIVO.md) para operar o admin.
4. Execute os gates de [`10-TESTES-E-SCRIPTS.md`](./10-TESTES-E-SCRIPTS.md) antes de abrir um PR.

Os links desta documentação são relativos ao repositório para continuarem válidos em Windows, Linux, GitHub e clones locais.
