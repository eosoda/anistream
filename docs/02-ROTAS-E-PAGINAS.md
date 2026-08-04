# 02. Rotas e páginas

O AniStream usa o Next.js App Router em `app/`. As páginas públicas consultam o catálogo local e o Kenjitsu; as páginas administrativas exigem sessão.

## Rotas públicas

| Rota | Função |
| :--- | :--- |
| `/` | Home server-first, composta por blocos publicados e dados resolvidos pelo Kenjitsu. |
| `/lista` | Catálogo geral com ordenação e visualizações. |
| `/lista/importar` | Importação assistida de uma lista do usuário. |
| `/calendario` | Calendário semanal de lançamentos. |
| `/pesquisa` | Busca e filtros avançados. |
| `/populares` | Ranking e filtros de popularidade. |
| `/temporadas` | Animes por temporada e ano. |
| `/filmes` | Catálogo de filmes. |
| `/favoritos` | Favoritos, progresso e lembretes. |
| `/anime/[id]` | Detalhes, episódios, personagens e relações. |
| `/anime/[id]/episode/[epNum]` | Player e navegação de episódio. |
| `/changelog` | Releases e comunicados de versão. |
| `/manutencao` | Estado público durante manutenção. |

## Rotas de instalação e autenticação

| Rota | Função |
| :--- | :--- |
| `/setup` | Primeiro acesso, conexão e criação do administrador. |
| `/admin/login` | Login administrativo. |

## Rotas administrativas

O shell compartilhado fica em `app/(main)/admin/layout.tsx` e fornece navegação agrupada, breadcrumbs, sessão e command palette.

| Rota | Função |
| :--- | :--- |
| `/admin` | Dashboard com overview, saúde, alertas e auditoria recente. |
| `/admin/animes` | Catálogo com filtros, paginação e ações em lote. |
| `/admin/animes/novo` | Cadastro e autofill pelo Kenjitsu. |
| `/admin/animes/[id]/editar` | Identidade, metadata, playback e episódios. |
| `/admin/extensions` | Matriz de fontes/extensões Kenjitsu. |
| `/admin/homepage` | Construtor visual da Home: blocos, fontes Kenjitsu, rascunho, snapshots e publicação. |
| `/admin/navigation` | Navegação e disponibilidade de páginas; contém atalho para o construtor da Home. |
| `/admin/calendar` | Release Schedule: regras semanais, exceções, prévia e sincronização Kenjitsu. |
| `/admin/system` | Estado e manutenção. |
| `/admin/backups` | Exportação e restauração. |
| `/admin/integrations` | Webhooks e integrações. |
| `/admin/broadcasts` | Comunicados públicos. |
| `/admin/releases` | Changelog e releases. |
| `/admin/dashboard` | Alias que redireciona para `/admin`. |
| `/admin/sources` | Alias que redireciona para `/admin/extensions`. |
| `/admin/sources/tester` | Alias que redireciona para `/admin/extensions`. |

O painel `/admin/navigation` é o centro operacional de menu público, atalhos mobile, footer e disponibilidade de páginas. Ele usa somente destinos internos oficiais; a Busca permanece fixa no segundo slot mobile e os outros três slots são configuráveis.

## Preview protegido

| Rota | Função |
| :--- | :--- |
| `/preview/homepage` | Preview autenticado do rascunho atual, sem indexação e sem alterar a Home pública. |

## APIs da Home

| Endpoint | Função |
| :--- | :--- |
| `GET /api/homepage` | Retorna a composição publicada e os blocos resolvidos pelo Kenjitsu, com falha isolada por bloco. |
| `GET /api/admin/homepage` | Carrega rascunho, publicação, versões e resumo operacional. |
| `PUT /api/admin/homepage` | Salva o rascunho com controle otimista de versão. |
| `POST /api/admin/homepage/publish` | Publica o rascunho após confirmação e invalida o cache público. |
| `POST /api/admin/homepage/discard` | Restaura o rascunho para a última publicação. |
| `GET /api/admin/homepage/snapshots` | Lista snapshots publicados e snapshots manuais do rascunho. |
| `POST /api/admin/homepage/snapshots` | Registra um snapshot do rascunho salvo. |
| `GET /api/admin/homepage/snapshots/:id` | Consulta a composição completa de um snapshot. |
| `POST /api/admin/homepage/snapshots/:id/restore` | Copia um snapshot para o rascunho sem publicar. |

## APIs de navegação pública

| Endpoint | Função |
| :--- | :--- |
| `GET /api/admin/navigation` | Configuração autenticada, revisão, defaults materializados e preview. |
| `POST /api/admin/navigation` | Publica destinos, slots mobile e redirects com auditoria. |
| `GET /api/settings/public` | Entrega `navigation`, `mobileBottomIds`, `pages` e `revision` ao shell público. |

Páginas desativadas são removidas da navegação, redirecionam acessos diretos para uma rota interna habilitada e exibem um aviso breve acessível.

## APIs do calendário

| Endpoint | Função |
| :--- | :--- |
| `GET /api/calendar` | Retorna a semana convertida para o timezone do visitante, sem episódio ou playback. |
| `GET /api/admin/calendar` | Retorna configurações, regras, exceções e prévia autenticada. |
| `PUT /api/admin/calendar` | Salva a configuração completa e registra auditoria. |
| `POST /api/admin/calendar/sync` | Invalida a versão do calendário e consulta novamente o Kenjitsu. |

## Restrições de dados

O Kenjitsu é a fonte única de catálogo, episódios e mídia. Não há rota pública ou administrativa nova para configurar Hosts de Mídia Autorizados, playlists M3U ou URLs manuais de stream. A Home aceita apenas consultas tipadas do Kenjitsu ou IDs AniList manuais resolvidos pela mesma API.
