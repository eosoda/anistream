# 09. Painel Administrativo & Gestão de Catálogo 🛡️

Este documento descreve a arquitetura, rotas e fluxos do **Painel Administrativo (`/admin`)** e do **Assistente de Instalação Inicial (`/setup`)** do AniStream.

---

## 🛠️ 1. Funcionalidades do Painel & Setup

1. **Assistente de Instalação Inicial (`/setup`)**:
   - **Redirecionamento Automático**: O componente `<SetupGuard />` no layout raiz força o redirecionamento para `/setup` no primeiro acesso enquanto não houver administradores cadastrados (`isInitialized === false`).
   - **Proteção por Chave Randômica (Setup Key)**: Protege a instalação contra acessos não autorizados por robôs. A chave é exibida no console/logs (`docker logs anistream_app`) ou configurada via `INITIAL_SETUP_KEY`.
   - **Fluxo em 5 Passos**: Validação de banco PostgreSQL -> Cadastro da conta do Administrador Mestre -> Hosts de Mídia Autorizados -> Importação de Playlist M3U inicial -> Conclusão.

2. **Gestão de Animes (CRUD Completo)**:
   - Visualização em grid paginado com busca por título e slug.
   - Cadastro de novos animes com **Auto-Preenchimento via API Jikan (MyAnimeList)** em 1 clique.
   - Edição de títulos, capas, banners, ano e sinopses.
   - Exclusão com limpeza em cascata dos episódios associados.

3. **Dashboard de Observabilidade & Métricas (`/admin/dashboard`)**:
   - KPIs em tempo real (total de animes, episódios, fontes ativas, índice de saúde do sistema).
   - Relatórios de latência média dos provedores (`local-database`, `configured-json`, `authorized-m3u`).

4. **Testador Avançado de Fontes de Vídeo (`/admin/sources/tester`)**:
   - Diagnóstico server-side de URLs de streaming HLS `.m3u8` e MP4.
   - Verificação de segurança antifraude SSRF e IP de resolução.
   - **Mini-player de pré-visualização** embutido para testar a reprodução do vídeo no painel.

5. **Gerenciador de Episódios & Fontes de Mídia**:
   - Organização de episódios por temporada (S01E01, S01E02, etc.).
   - Cadastro de fontes de streaming vinculadas aos episódios (HLS / MP4).
   - Suporte à importação em lote via playlists **M3U / M3U8**.

6. **Provedores Configuráveis, Domínios Confiáveis & Teste Ao Vivo (`/admin/sources`)**:
   - Tabela de provedores cadastrados (M3U, JSON, APIs REST) com controle de prioridades.
   - Botões de alternar status (Ativo/Inativo) e Auto-Robô (ON/OFF).
   - Botão **"Testar Conexão"** ao vivo medindo resposta HTTP e latência em ms.
   - **Gestão de Domínios Confiáveis / Mídias Autorizadas (`/api/admin/media-hosts`)**: Aba dedicada para visualização e autorização de hosts em 3 camadas (`.env`, `MediaProvider` e registros `MANUAL`), com remoção de trava rígida estática para que o administrador decida e autorize quais fontes utilizar após o teste.

7. **Robô de Auto-Indexação (*Autopilot Indexer*)**:
   - **Modo Automático**: Varredura em segundo plano das fontes ativas buscando metadados oficiais (Jikan/AniList) e auto-criação de animes e episódios no PostgreSQL.
   - **Modo Fila de Revisão**: Varredura com adição a uma fila de candidatos no admin para aprovação manual em 1 clique.

8. **Recursos de Gestão Avançada no Dashboard**:
   - **Gerenciador de Broadcast System**: Envio de notificações e alertas superiores em lote para todos os usuários.
   - **Detector de Links Quebrados (Dead Link Finder)**: Varredura em segundo plano com auto-desativação após 3 falhas consecutivas.
   - **Backup e Restauração em Dump JSON**: Download de backup completo do banco de dados em JSON e restauração com lógica de *upsert*.
   - **Controle de Banda & Proxy Meter**: Medição do volume de dados (MB/GB) trafegados no proxy SSRF por domínio com botão de pausa de servidor.
   - **Modo Manutenção Agendado**: Bloqueio de acessos públicos durante atualizações com mensagem e previsão de término em `/manutencao`.
   - **Publicador de Release Notes**: Gestão e linha do tempo de notas de versão em `/changelog`.

---

## 🗺️ 2. Mapeamento de Rotas Administrativas

| Rota UI | Descrição |
| :--- | :--- |
| **`/admin/login`** | Página de login para administradores. |
| **`/setup`** | Assistente de instalação inicial com fontes configuráveis e testáveis ao vivo (desativado após criação do primeiro admin). |
| **`/admin/dashboard`** | Dashboard de observabilidade, KPIs, Broadcast, Backup, Dead Links, Reports, Manutenção e Releases. |
| **`/admin/animes`** | Catálogo interativo de animes cadastrados. |
| **`/admin/animes/novo`** | Formulário de criação com busca automática no MyAnimeList. |
| **`/admin/animes/[id]/editar`** | Edição de metadados e adição de episódios. |
| **`/admin/sources`** | Painel de gestão de provedores de mídia, Domínios Confiáveis (Mídias Autorizadas), teste de conexão e Robô Autopilot. |
| **`/admin/sources/tester`** | Testador avançado de fontes de mídia com mini-player de preview. |
| **`/manutencao`** | Tela pública do Modo Manutenção (redirecionada quando ativada no admin). |
| **`/changelog`** | Linha do tempo pública de lançamentos e notas de versão. |

### Endpoints da API Administrativa & Setup

- `GET /api/setup/status` — Verifica se o sistema está inicializado e valida a chave de setup.
- `POST /api/setup/initialize` — Cadastra o admin mestre, autoriza os domínios do M3U e conclui a instalação (exige `setupKey`).
- `GET /api/admin/providers` — CRUD de provedores de mídia (`MediaProvider`).
- `POST /api/admin/providers/test` — Teste de conexão e latência ao vivo de um provedor de mídia.
- `GET /api/admin/media-hosts` / `POST` / `DELETE` — Listagem, autorização dinâmica e remoção manual de domínios de mídia autorizados em `SystemSetting`.
- `GET /api/admin/autopilot` / `POST` / `PATCH` — Controle do Robô de Auto-Indexação e Fila de Revisão.
- `GET /api/admin/broadcast` / `POST` — Gerenciador de anúncios globais e notificações em lote.
- `GET /api/admin/backup` / `POST` — Dump e restauração do banco de dados em JSON.
- `POST /api/admin/dead-links` — Executa varredura de links quebrados e desativa fontes falhas.
- `GET /api/reports` / `POST` / `PATCH` — Fila de suporte para chamados e relatos de erros no player.
- `GET /api/maintenance` / `POST` — Status e controle do Modo Manutenção global.
- `GET /api/changelog` / `POST` — Leitura e publicação de release notes.

