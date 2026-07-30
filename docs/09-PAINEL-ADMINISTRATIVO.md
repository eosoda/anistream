# 09. Painel Administrativo & Gestão de Catálogo 🛡️

Este documento descreve a arquitetura, rotas e fluxos do **Painel Administrativo (`/admin`)** e do **Assistente de Instalação Inicial (`/setup`)** do AniStream.

---

## 🛠️ 1. Funcionalidades do Painel & Setup

1. **Assistente de Instalação Inicial (`/setup`)**:
   - **Layout Isolado**: O assistente `/setup` roda em um layout minimalista sem cabeçalho/rodapé públicos do site.
   - **Redirecionamento Automático**: O componente `<SetupGuard />` força o redirecionamento para `/setup` enquanto não houver administradores cadastrados.
   - **Proteção por Chave Randômica (Setup Key)**: Chave exibida nos logs (`docker logs anistream_app`) ou configurada via `INITIAL_SETUP_KEY`.
   - **Fluxo em 5 Passos**: Validação de banco PostgreSQL -> Cadastro da conta do Administrador Mestre -> 8 Provedores de Mídia & Embeds -> Importação M3U opcional -> Conclusão.

2. **Gerenciador de Fontes do Episódio & Player de Teste Inline (`/admin/animes/[id]/editar`)**:
   - Cada episódio possui o modal [`EpisodeSourcesModal`](file:///c:/Users/sodinha/Documents/projetos/anistream/components/admin/EpisodeSourcesModal.tsx).
   - **Fontes Cadastradas**: Exibe cada fonte vinculada com chave ON/OFF (`enabled`), alteração de qualidade, idioma de áudio (`pt-BR`, `ja`) e exclusão.
   - **Varredura em Tempo Real**: Varre os provedores autorizados em tempo real e permite selecionar com checkboxes quais fontes cadastrar.
   - **Adicionar Manualmente**: Formulário para cadastrar URLs diretas (`.m3u8`, `.mp4`) ou iFrames de embeds externos.
   - **Player de Teste Inline**: Overlay com o `VideoPlayer` oficial da aplicação para testar a reprodução do vídeo ou embed em tempo real antes de salvar.

3. **Importação Determinística de Animes (`ImportAnimeModal.tsx`)**:
   - Permite pesquisar animes por título (AniList GraphQL / Jikan / Kitsu) e importar em 1 clique.
   - Os metadados exatos do card selecionado pelo usuário (título, capas, sinopse, ano, episódios) são salvos diretamente no PostgreSQL sem ambiguidades.

4. **Provedores Configuráveis & Domínios Confiáveis (`/admin/sources`)**:
   - Tabela de provedores cadastrados com suporte aos 8 provedores especificados (`Kenjitsu/AniZone`, `GogoAnime Consumet`, `HiAnime/Zoro`, `Anify`, `AnimesOnline`, `WarezCDN`, `XPass/2Embed`, `Catálogo M3U`).
   - Gestão de Domínios Confiáveis / Mídias Autorizadas (`/api/admin/media-hosts`) em 3 camadas (`.env`, `MediaProvider` e registros `MANUAL`).

---

## 🗺️ 2. Mapeamento de Rotas Administrativas

| Rota UI | Descrição |
| :--- | :--- |
| **`/admin/login`** | Página de login para administradores. |
| **`/setup`** | Assistente de instalação inicial com fontes configuráveis e testáveis ao vivo. |
| **`/admin/dashboard`** | Dashboard de observabilidade, KPIs, Broadcast, Backup, Dead Links, Reports, Manutenção e Releases. |
| **`/admin/animes`** | Catálogo interativo de animes cadastrados. |
| **`/admin/animes/novo`** | Formulário de criação com busca e auto-preenchimento. |
| **`/admin/animes/[id]/editar`** | Edição de metadados, gestão de episódios e modal `EpisodeSourcesModal` com player de teste inline. |
| **`/admin/sources`** | Painel de gestão de provedores de mídia, Domínios Confiáveis (Mídias Autorizadas), teste de conexão e Robô Autopilot. |

### Endpoints de Fontes e Episódios por Episódio

- `POST /api/admin/animes/[id]/episodes/[epId]/discover-sources` — Executa a varredura de mídias candidatas nos provedores ativos sem persisti-las automaticamente.
- `POST /api/admin/animes/[id]/episodes/[epId]/sources` — Cadastra fontes manuais ou selecionadas em lote.
- `PUT /api/admin/animes/[id]/episodes/[epId]/sources` — Altera propriedades da fonte (`enabled`, `quality`, `audioLanguage`, `urlEncrypted`, `provider`, `type`).
- `DELETE /api/admin/animes/[id]/episodes/[epId]/sources` — Exclui uma fonte do episódio.
