# 03. Componentes e Design System — AniStream 🧩

A pasta `components/` adota uma arquitetura **Modular Orientada por Domínio**, onde cada componente está agrupado de acordo com a sua responsabilidade na aplicação.

---

## 📂 Subpastas por Domínio

```text
components/
├── anime/       # Componentes de cards, carrosséis e exibição de animes
├── player/      # Componentes do player de vídeo e episódios
├── catalog/     # Componentes de busca, filtros e alternador de lista
├── home/        # Componentes exclusivos da tela inicial
├── layout/      # Estrutura base da aplicação (Navbar, Footer, QueryProvider)
└── ui/          # Primitivos e elementos atômicos reutilizáveis
```

---

## 📌 Detalhamento dos Componentes

### 🎭 Domínio Anime (`components/anime/`)
- [`AnimeCard.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/anime/AnimeCard.tsx): Card visual em formato portrait/wide com poster, badge de nota, botão rápido de favorito e pré-visualização.
- [`CompactAnimeCard.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/anime/CompactAnimeCard.tsx): Card compacto em linha para exibição densa de listas e busca rápida com botão "Marcar Visto".
- [`AnimeCarousel.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/anime/AnimeCarousel.tsx): Carrossel horizontal responsivo com controle por setas e suporte a arraste por mouse/touch (`useDraggableScroll`).
- [`QuickViewModal.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/anime/QuickViewModal.tsx): Modal flutuante para ver sinopse, trailer e detalhes de um anime sem sair da página atual.
- [`CharacterCard.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/anime/CharacterCard.tsx) & [`RecommendationCard.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/anime/RecommendationCard.tsx): Cards de personagens/dubladores e animes sugeridos.

### 🎬 Domínio Player (`components/player/`)
- [`VideoPlayer.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/player/VideoPlayer.tsx): Player de vídeo completo com controles personalizados, Pular Abertura (+85s), PiP Nativo, Light Dimmer e Autoplay countdown.
- [`EpisodeList.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/player/EpisodeList.tsx): Lista interativa de episódios com barras de progresso salvas e indicação de episódios concluídos.

### 🔍 Domínio Catálogo (`components/catalog/`)
- [`SearchBar.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/catalog/SearchBar.tsx): Barra de pesquisa com **Live Search Preview** (dropdown instantâneo dos 5 primeiros resultados) e suporte a pesquisa por voz.
- [`QuickMultiFilter.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/catalog/QuickMultiFilter.tsx): Barra de chips interativos para filtragem múltipla rápida.
- [`SearchFilters.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/catalog/SearchFilters.tsx): Painel retrátil de filtros avançados.
- [`ViewToggle.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/catalog/ViewToggle.tsx): Alternador visual entre os modos Grid e Lista Compacta.

### 🏠 Domínio Home (`components/home/`)
- [`BannerHero.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/home/BannerHero.tsx): Banner principal da Home com background em blur e trocas automáticas de destaques.
- [`ContinueWatchingSection.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/home/ContinueWatchingSection.tsx): Carrossel de animes que o usuário começou a assistir com porcentagem concluída.
- [`EpisodeRemindersPanel.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/home/EpisodeRemindersPanel.tsx): Painel de gerenciamento de lembretes e lançamentos semanais.
- [`FloatingRecommendationsWidget.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/home/FloatingRecommendationsWidget.tsx): Widget flutuante no canto inferior para recomendações em tempo real.

### ⚛️ Domínio UI (`components/ui/`)
- [`SafeImage.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/ui/SafeImage.tsx): Componente seguro de imagem com fallback automático contra links quebrados ou 404.
- [`Tooltip.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/ui/Tooltip.tsx): Tooltip flutuante com suporte a posições `top`, `bottom`, `left`, `right`.
- [`RatingBadge.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/ui/RatingBadge.tsx) & [`GenreBadge.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/ui/GenreBadge.tsx): Badges visuais estilizados.
- [`LoadingSkeleton.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/ui/LoadingSkeleton.tsx): Skeletons de carregamento com animação pulse.
- [`EmptyState.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/ui/EmptyState.tsx): Tela vazia customizável para buscas sem resultado.
- [`OfflineStatusBanner.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/ui/OfflineStatusBanner.tsx): Banner discreto informando perda de conexão de internet.
