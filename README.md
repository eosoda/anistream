# AniStream — Catálogo & Streaming de Animes 🎬

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Status](https://img.shields.io/badge/Status-Ativo-emerald?style=for-the-badge)

**AniStream** é uma plataforma web moderna, rápida e responsiva para exploração, acompanhamento e reprodução de animes. Desenvolvida com Next.js 15 (App Router), React 19, TypeScript e dados consumidos em tempo real das APIs MyAnimeList (Jikan v4) e AniList GraphQL.

---

## 🌟 Funcionalidades Principais

### 🔍 Busca & Navegação Inteligente
- **Live Search Preview**: Busca instantânea no Navbar exibindo os top 5 resultados (miniatura, nota, ano, formato e status) com navegação completa por teclado (`Seta Cima/Baixo`, `Enter`, `Esc`).
- **Pesquisa por Voz**: Suporte a busca por áudio via Web Speech API.
- **Filtros Avançados & Quick Multi-Filter**: Filtragem combinada por gênero, status (Em Exibição/Finalizado) e ordenação (Populares, Recentes, Melhor Avaliados).
- **Alternador de Visualização (Grid vs. Lista Compacta)**: Escolha entre Grade de Capas e Lista Compacta em linhas finas com persistência em `localStorage`.

### 🎥 Player de Vídeo Avançado & Binge-Watching
- **Pular Abertura (+85s)**: Botão no player + atalho de teclado `S` para avançar aberturas rapidamente.
- **Picture-in-Picture (PiP) Nativo**: Player flutuante desacoplado da janela com 1 clique.
- **Autoplay & Contagem Regressiva**: Mini card flutuante com contagem de 5s ao término do vídeo ou ao clicar em "Concluir Episódio".
- **Retomada de Precisão Automática**: Retoma vídeos salvos de onde você parou com notificação toast informando o tempo exato.
- **Modo Apagar as Luzes (Light Dimmer)**: Camada de fundo escuro 90% com `backdrop-blur` focando apenas no vídeo.
- **Modo Cinema e Tela Cheia**: Suporte a atalhos de teclado (`Espaço`, `F`, `M`, `C`, `S`, `?`).

### 💖 Favoritos & Notificações
- **Verificação Automática de Novos Episódios**: Checagem de datas de novos episódios via API Jikan com selo visual `NOVO EP`.
- **Lembretes Semanal de Lançamento**: Painel interativo para configurar notificações de lançamentos.
- **Sistema de Toast Notifications**: Notificações flutuantes com barra de tempo para feedbacks (favoritar, concluir episódios, copiar links).
- **Suporte Offline com IndexedDB**: Cache automático de catálogos e suporte a navegação quando a conexão cair.

---

## 📂 Arquitetura de Pastas

```text
anistream/
├── app/                        # Rotas e páginas do Next.js App Router
│   ├── anime/[id]/             # Detalhes do anime (sinopse, episódios, personagens, recomendações)
│   ├── anime/[id]/episode/[ep]/# Player de vídeo e reprodução de episódios
│   ├── favoritos/              # Gerenciamento de animes salvos e novos episódios
│   ├── filmes/                 # Catálogo exclusivo de filmes de anime
│   ├── lista/                  # Catálogo geral alfabético com filtros
│   ├── pesquisa/               # Página de resultados e filtros avançados
│   ├── populares/              # Ranking dos animes mais populares
│   ├── temporadas/             # Lançamentos da temporada atual e anteriores
│   ├── error.tsx               # Tratamento nativo de erros do App Router
│   ├── global-error.tsx        # Captura de erros globais da aplicação
│   ├── not-found.tsx           # Página 404 nativa estilizada
│   ├── layout.tsx              # Root Layout da aplicação com Navbar/Footer/Providers
│   └── page.tsx                # Home Page com Hero Banner, Carrosséis e Continue Assistindo
│
├── components/                 # Componentes modulares agrupados por domínio
│   ├── anime/                  # AnimeCard, CompactAnimeCard, QuickViewModal, SeasonSelector...
│   ├── catalog/                # SearchBar, SearchFilters, QuickMultiFilter, ViewToggle...
│   ├── home/                   # BannerHero, ContinueWatchingSection, EpisodeRemindersPanel...
│   ├── layout/                 # Navbar, Footer, QueryProvider
│   ├── player/                 # VideoPlayer, EpisodeList
│   └── ui/                     # SafeImage, Tooltip, RatingBadge, GenreBadge, EmptyState, LoadingSkeleton...
│
├── context/                    # Contextos globais da aplicação
│   ├── ToastContext.tsx        # Provedor global de notificações Toast
│   ├── ConfirmationContext.tsx # Provedor global de modais de confirmação
│   └── FavoritesContext.tsx    # Provedor de lista de favoritos e checagem de novos episódios
│
├── hooks/                      # Custom React Hooks
│   ├── useFavorites.ts         # Hook de favoritos
│   ├── useWatchProgress.ts     # Hook de progresso de episódios
│   ├── useDraggableScroll.ts   # Hook de rolagem arrastável por mouse
│   └── use-mobile.ts           # Hook de detecção de tela mobile
│
├── services/                   # Integrações com APIs externas
│   ├── jikan.ts                # Cliente Jikan v4 com fila de rate limit e cache IndexedDB
│   └── anilist.ts              # Cliente AniList GraphQL
│
├── data/                       # Dados estáticos e backups de fallback
├── types/                      # Definições de tipos TypeScript (`anime.ts`)
└── utils/                      # Utilitários de formatação e banco IndexedDB (`offlineCacheDB.ts`)
```

---

## ⚡ Como Rodar o Projeto

### Pré-requisitos
- Node.js 18+ ou Bun
- npm / yarn / pnpm / bun

### 1. Clonar o repositório e instalar dependências:
```bash
npm install
```

### 2. Rodar o servidor de desenvolvimento:
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### 3. Gerar o Build de Produção:
```bash
node ./node_modules/next/dist/bin/next build
```

---

## 🛠️ Tecnologias Utilizadas

- **Core**: Next.js 15, React 19, TypeScript
- **Estilização**: TailwindCSS, Vanilla CSS, Glassmorphic UI Design
- **Ícones & Animações**: Lucide React, Motion (`motion/react`)
- **Data Fetching**: `@tanstack/react-query` v5
- **Armazenamento**: LocalStorage, IndexedDB (`utils/offlineCacheDB.ts`)
- **APIs**: [Jikan REST API v4](https://jikan.moe), [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs)
