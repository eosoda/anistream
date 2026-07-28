# 09. Painel Administrativo & Gestão de Catálogo 🛡️

Este documento descreve a arquitetura, rotas e fluxos do **Painel Administrativo (`/admin`)** do AniStream.

---

## 🛠️ 1. Funcionalidades do Painel

1. **Gestão de Animes (CRUD Completo)**:
   - Visualização em grid paginado com busca por título e slug.
   - Cadastro de novos animes com **Auto-Preenchimento via API Jikan (MyAnimeList)** em 1 clique.
   - Edição de títulos, capas, banners, ano e sinopses.
   - Exclusão com limpeza em cascata dos episódios associados.

2. **Dashboard de Observabilidade & Métricas (`/admin/dashboard`)**:
   - KPIs em tempo real (total de animes, episódios, fontes ativas, índice de saúde do sistema).
   - Relatórios de latência média dos provedores (`local-database`, `configured-json`, `authorized-m3u`).
   - Atalhos para ferramentas administrativas.

3. **Testador Avançado de Fontes de Vídeo (`/admin/sources/tester`)**:
   - Diagnóstico server-side de URLs de streaming HLS `.m3u8` e MP4.
   - Verificação de segurança antifraude SSRF e IP de resolução.
   - **Mini-player de pré-visualização** embutido para testar a reprodução do vídeo no painel.

4. **Gerenciador de Episódios & Fontes de Mídia**:
   - Organização de episódios por temporada (S01E01, S01E02, etc.).
   - Cadastro de fontes de streaming vinculadas aos episódios (HLS / MP4).
   - Suporte à importação em lote via playlists **M3U / M3U8**.

5. **Autenticação Administrativa & Segurança**:
   - Login seguro em `/admin/login` com tokens gravados na tabela `AdminSession`.
   - Assistente de Instalação Inicial em `/setup`.

---

## 🗺️ 2. Mapeamento de Rotas Administrativas

| Rota UI | Descrição |
| :--- | :--- |
| **`/admin/login`** | Página de login para administradores. |
| **`/setup`** | Assistente de instalação inicial (desativado após criação do primeiro admin). |
| **`/admin/dashboard`** | Dashboard de observabilidade, KPIs e métricas dos provedores. |
| **`/admin/animes`** | Catálogo interativo de animes cadastrados. |
| **`/admin/animes/novo`** | Formulário de criação com busca automática no MyAnimeList. |
| **`/admin/animes/[id]/editar`** | Edição de metadados e adição de episódios. |
| **`/admin/sources`** | Painel de gestão de fontes de mídia e importação M3U. |
| **`/admin/sources/tester`** | Testador avançado de fontes de mídia com mini-player de preview. |

### Endpoints da API Administrativa (`/api/admin/`)

- `GET /api/admin/metrics` — Retorna métricas de observabilidade e saúde dos provedores.
- `POST /api/admin/sources/test-url` — Executa diagnóstico de URL de vídeo sob demanda.
- `GET /api/admin/animes/autofill?title={termo}` — Busca metadados automáticos na API Jikan/MAL.
- `GET /api/admin/animes` — Lista animes paginados com filtro.
- `POST /api/admin/animes` — Cria um novo anime.
- `GET /api/admin/animes/[id]` — Obtém detalhes do anime com episódios e fontes.
- `PUT /api/admin/animes/[id]` — Atualiza metadados do anime.
- `DELETE /api/admin/animes/[id]` — Exclui o anime do banco de dados.
- `POST /api/admin/animes/[id]/episodes` — Cria um novo episódio para o anime.
