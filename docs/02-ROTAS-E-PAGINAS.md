# 02. Rotas e páginas

O AniStream usa o Next.js App Router em `app/`. As páginas públicas consultam o catálogo local e o Kenjitsu; as páginas administrativas exigem sessão.

## Rotas públicas

| Rota | Função |
| :--- | :--- |
| `/` | Home, destaques, lançamentos e continuar assistindo. |
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
| `/admin/navigation` | Navegação, páginas e home. |
| `/admin/system` | Estado e manutenção. |
| `/admin/backups` | Exportação e restauração. |
| `/admin/integrations` | Webhooks e integrações. |
| `/admin/broadcasts` | Comunicados públicos. |
| `/admin/releases` | Changelog e releases. |
| `/admin/dashboard` | Alias que redireciona para `/admin`. |
| `/admin/sources` | Alias que redireciona para `/admin/extensions`. |
| `/admin/sources/tester` | Alias que redireciona para `/admin/extensions`. |

## Restrições de dados

O Kenjitsu é a fonte única de catálogo, episódios e mídia. Não há rota pública ou administrativa nova para configurar Hosts de Mídia Autorizados, playlists M3U ou URLs manuais de stream.
