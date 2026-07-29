# Documentação Oficial do AniStream — Índice Geral 📚

Bem-vindo à documentação modular oficial do **AniStream**. Esta pasta contém guias detalhados sobre cada módulo, padrão arquitetural e recurso da aplicação.

---

## 📑 Sumário da Documentação

| Arquivo | Título | Descrição |
| :--- | :--- | :--- |
| [`01-VISAO-GERAL-E-STACK.md`](file:///c:/Users/junin/Documents/projetos/anistream/docs/01-VISAO-GERAL-E-STACK.md) | **Visão Geral e Stack Tecnológica** | Objetivos do projeto, stack principal, dependências e padrões de estilização. |
| [`02-ROTAS-E-PAGINAS.md`](file:///c:/Users/junin/Documents/projetos/anistream/docs/02-ROTAS-E-PAGINAS.md) | **Rotas e Páginas (App Router)** | Mapeamento detalhado de cada página (`/`, `/anime/[id]`, `/favoritos`, `/lista`, etc.). |
| [`03-COMPONENTES-E-DESIGN.md`](file:///c:/Users/junin/Documents/projetos/anistream/docs/03-COMPONENTES-E-DESIGN.md) | **Componentes & Design System** | Estrutura modular (`anime/`, `player/`, `catalog/`, `home/`, `layout/`, `ui/`). |
| [`04-ESTADO-E-CONTEXTOS.md`](file:///c:/Users/junin/Documents/projetos/anistream/docs/04-ESTADO-E-CONTEXTOS.md) | **Gerenciamento de Estado & Contextos** | Provedores globais (`ToastContext`, `ConfirmationContext`, `FavoritesContext`) e Hooks. |
| [`05-PLAYER-E-STREAMING.md`](file:///c:/Users/junin/Documents/projetos/anistream/docs/05-PLAYER-E-STREAMING.md) | **Player de Vídeo & Experiência de Streaming** | Atalhos, Pular Abertura (+85s), PiP Nativo, Light Dimmer e Autoplay. |
| [`06-SERVICOS-E-APIS.md`](file:///c:/Users/junin/Documents/projetos/anistream/docs/06-SERVICOS-E-APIS.md) | **Serviços de API & Resiliência** | Fila de Throttling (350ms) da API Jikan v4, AniList GraphQL e tratamento de erros. |
| [`07-OFFLINE-E-CACHE-IDB.md`](file:///c:/Users/junin/Documents/projetos/anistream/docs/07-OFFLINE-E-CACHE-IDB.md) | **Armazenamento Offline e IndexedDB** | Estrutura das stores no IndexedDB, sincronia e fallback com dados estáticos. |
| [`08-DEPLOYMENT-E-RAILWAY.md`](file:///c:/Users/junin/Documents/projetos/anistream/docs/08-DEPLOYMENT-E-RAILWAY.md) | **Guia de Hospedagem & Deploy no Railway** | Configuração do Docker Multi-stage, PostgreSQL Gerenciado e Deploy. |
| [`09-PAINEL-ADMINISTRATIVO.md`](file:///c:/Users/sodinha/Documents/projetos/anistream/docs/09-PAINEL-ADMINISTRATIVO.md) | **Painel Administrativo & Gestão de Catálogo** | CRUD de Animes, Auto-preenchimento Jikan/MAL, episódios e fontes M3U. |
| [`10-TESTES-E-SCRIPTS.md`](file:///c:/Users/sodinha/Documents/projetos/anistream/docs/10-TESTES-E-SCRIPTS.md) | **Testes Automatizados & Scripts de Validação** | Suítes de testes Vitest, validação pré-deploy Docker e guias de comandos. |

---

## ⚡ Como Navegar nesta Documentação
- Para entender a **estrutura de pastas e tecnologias**, comece pelo guia **[01-VISAO-GERAL-E-STACK.md](file:///c:/Users/sodinha/Documents/projetos/anistream/docs/01-VISAO-GERAL-E-STACK.md)**.
- Para contribuir adicionando novos **recursos ou componentes**, leia **[03-COMPONENTES-E-DESIGN.md](file:///c:/Users/sodinha/Documents/projetos/anistream/docs/03-COMPONENTES-E-DESIGN.md)**.
- Para entender o funcionamento do **player de reprodução**, consulte **[05-PLAYER-E-STREAMING.md](file:///c:/Users/sodinha/Documents/projetos/anistream/docs/05-PLAYER-E-STREAMING.md)**.
- Para rodar **testes unitários e diagnósticos pré-deploy**, consulte **[10-TESTES-E-SCRIPTS.md](file:///c:/Users/sodinha/Documents/projetos/anistream/docs/10-TESTES-E-SCRIPTS.md)**.
