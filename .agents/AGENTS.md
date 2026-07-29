# Guidelines & Architecture Reference for AI Agents (AGENTS.md)

## 📌 Repository Summary
**AniStream** is a modern Next.js 15 (App Router) web application for browsing, searching, and streaming anime. It features a rich dark-mode UI, offline IndexedDB caching, live search preview, custom video player with autoplay countdown, skip intro, picture-in-picture, and interactive quick multi-filters.

---

## 🛠️ Technology Stack
- **Framework**: Next.js 15 (App Router, Server & Client Components)
- **UI & Logic**: React 19, TypeScript (Strict Mode)
- **Styling**: Vanilla CSS (`app/globals.css`), TailwindCSS utilities, Glassmorphism, Dark Palette (`#0B0B0F`, `#FF6B00`)
- **Icons & Motion**: Lucide React icons, Motion (`motion/react`)
- **Data Fetching**: `@tanstack/react-query` (v5)
- **APIs & Services**: Jikan API v4 (`https://api.jikan.moe/v4`), AniList GraphQL (`https://graphql.anilist.co`)
- **Offline Storage**: IndexedDB custom wrapper (`utils/offlineCacheDB.ts`)

---

## 📂 Component Directory Structure (`components/`)
All UI components MUST follow the modular domain-driven architecture:

```
components/
├── anime/       # Anime cards, carousels, modals (AnimeCard, CompactAnimeCard, QuickViewModal, etc.)
├── player/      # Video playback (VideoPlayer, EpisodeList)
├── catalog/     # Search & filters (SearchBar, SearchFilters, QuickMultiFilter, ViewToggle)
├── home/        # Home sections (BannerHero, ContinueWatchingSection, ForYouSection, etc.)
├── layout/      # Structure (Navbar, Footer, QueryProvider)
└── ui/          # Primitives & Atoms (SafeImage, Tooltip, RatingBadge, GenreBadge, EmptyState, LoadingSkeleton, OfflineStatusBanner)
```

> **Rule**: When adding new components, place them in the corresponding domain subfolder (or `components/ui/` if reusable atomic primitive) and export them from the subfolder's `index.ts` and root `components/index.ts`.

---

## 🌳 Context Hierarchy (`app/layout.tsx` & `QueryProvider.tsx`)

The context tree is organized as follows:

```
QueryClientProvider
└── ToastProvider          (Context: showToast, copyToClipboard)
    └── ConfirmationProvider (Context: confirm dialogs)
        └── FavoritesProvider (Context: favorites list, new ep checks, recommendations toggle)
            └── {children}
```

> **Rule**: Hooks (`useToast()`, `useConfirmation()`, `useFavoritesContext()`) contain defensive fallback returns so they do not crash when rendered outside a provider during static page prerendering (SSG/404).

---

## ⚡ Jikan API Throttling & Offline Fallback Rules
- **Rate Limit**: Jikan API strictly rate-limits at ~3 requests/second.
- **Throttling Queue**: All requests in [`services/jikan.ts`](file:///c:/Users/junin/Documents/projetos/anistream/services/jikan.ts) MUST go through `throttleRequest()` with a minimum 350ms interval.
- **Offline Fallback**: If offline or on API failure, `searchAnime` falls back to IndexedDB catalog cache and local [`FALLBACK_ANIMES`](file:///c:/Users/junin/Documents/projetos/anistream/data/fallbackAnime.ts).

---

## 🔒 Segurança de Mídias e Hosts Autorizados (`AUTHORIZED_MEDIA_HOSTS`)
- **Resolução Dinâmica em 3 Camadas**: A validação SSRF (`src/lib/security/ssrf.ts`) unifica domínios autorizados provenientes do `.env`, extração automática de `MediaProvider` (DB) e cadastros manuais em `SystemSetting`.
- **Controle do Administrador**: Bloqueios estáticos legados foram removidos para que o administrador tenha autonomia total de testar e decidir quais fontes autorizar no Painel Admin (`/admin/sources`).
- **Cache em Memória**: As verificações de segurança utilizam cache em memória com TTL (60s) e invalidação reativa em tempo real.

---

## 🔌 Arquitetura de API, Circuit Breaker & Resiliência
- **Padronização de Respostas (`src/lib/api/response.ts`)**: Todas as rotas usam `apiSuccess<T>` (`{ success: true, data: T, meta?: ... }`) e `apiError` (`{ success: false, error: { code, message, details }, timestamp }`).
- **Circuit Breaker (`src/lib/api/circuit-breaker.ts`)**: Protege chamadas de APIs externas (Jikan / AniList). Após 5 falhas seguidas em 60s, o circuito abre por 30s e ativa automaticamente o fallback local do PostgreSQL/IndexedDB sem causar timeouts na interface.
- **Edge Caching**: Rotas públicas de catálogo usam `Cache-Control: public, s-maxage=1800, stale-while-revalidate=86400`. Rotas de streaming e admin usam `no-store, private`.

---

## 🎬 Sistema de Streaming & Redesign do VideoPlayer
- **Resolução de Fontes (`/api/streams/resolve`)**: Conectado ao banco de dados e proxy de mídias (`/api/streams/proxy/[sourceId]`).
- **Suporte HLS (`hls.js`)**: Reprodução adaptativa de playlists `.m3u8` com limite de 2 retentativas por CDN antes da troca para servidor reserva.
- **Menu Único de Configurações ⚙️**: Abas multinível para Áudio/Legendas, Velocidade, Apagar Luzes, Teclas de Atalho e Reportar Problemas.
- **UX do Player**: Carrossel horizontal deslizante de episódios abaixo do vídeo com miniaturas, indicador *"Assistindo"* e barras de progresso salvas.

---

## 🚀 Build & Verification Commands
- **Local Production Build**: `node ./node_modules/next/dist/bin/next build`
- **Vitest Suite**: `npm run test`
- **TypeScript Check**: Always verify clean compilation without type errors before finishing a task.
