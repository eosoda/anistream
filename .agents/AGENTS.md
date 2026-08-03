# Guidelines & Architecture Reference for AI Agents (AGENTS.md)

## 📌 Repository Summary
**AniStream** is a modern Next.js 15 (App Router) web application for browsing, searching, and streaming anime. It features a rich dark-mode UI, offline IndexedDB caching, live search preview, custom video player with autoplay countdown, skip intro (+85s), picture-in-picture, and interactive quick multi-filters.

---

## 🛠️ Technology Stack
- **Framework**: Next.js 15 (App Router, Server & Client Components)
- **UI & Logic**: React 19, TypeScript (Strict Mode)
- **Styling**: Vanilla CSS (`app/globals.css`), TailwindCSS utilities, Glassmorphism, Dark Palette (`#0B0B0F`, `#FF6B00`)
- **Icons & Motion**: Lucide React icons, Motion (`motion/react`)
- **Data Fetching**: `@tanstack/react-query` (v5)
- **APIs & Metadata Layer**: Kenjitsu self-hosted API for catalog, metadata, episodes and sources
- **Stream Providers**: Kenjitsu native and ported extensions registered in the self-hosted fork
- **Offline Storage**: IndexedDB custom wrapper (`utils/offlineCacheDB.ts`)

---

## 📂 Layout Architecture & Route Groups (`app/`)
The application uses Next.js 15 App Router route groups to isolate page layouts:

```
app/
├── layout.tsx             # Root Shell (HTML, body, QueryProvider, SetupGuard, PwaRegister, OfflineStatusBanner)
├── (main)/                # Public & Admin Route Group
│   ├── layout.tsx         # Public Layout Chrome (Navbar, Footer, BroadcastBanner, FloatingRecommendationsWidget)
│   ├── page.tsx           # Home Page (/)
│   ├── admin/             # Administrative Panel (/admin/...)
│   ├── anime/             # Details & Player (/anime/[id]/...)
│   └── ...                # Other public routes (popular, search, movies, favorites, etc.)
└── setup/                 # Setup Wizard Route
    ├── layout.tsx         # Dedicated Setup Layout (Setup Header, Installation Shield, Ambient Glow, Minimal Footer)
    └── page.tsx           # Installation Wizard (/setup)
```

---

## 📂 Component Directory Structure (`components/`)
All UI components MUST follow the modular domain-driven architecture:

```
components/
├── anime/       # Anime cards, carousels, modals (AnimeCard, CompactAnimeCard, QuickViewModal, etc.)
├── player/      # Video playback (VideoPlayer, EpisodeList)
├── catalog/     # Search & filters (SearchBar, SearchFilters, QuickMultiFilter, ViewToggle)
├── home/        # Home sections (BannerHero, ContinueWatchingSection, ForYouSection, etc.)
├── layout/      # Structure (Navbar, Footer, QueryProvider, PwaRegister)
├── admin/       # Admin modals & tools (ImportAnimeModal, EpisodeSourcesModal, AutopilotPanel)
└── ui/          # Primitives & Atoms (SafeImage, Tooltip, RatingBadge, GenreBadge, EmptyState, LoadingSkeleton, OfflineStatusBanner)
```

> **Rule**: When adding new components, place them in the corresponding domain subfolder (or `components/ui/` if reusable atomic primitive) and export them from the subfolder's `index.ts` and root `components/index.ts`.

---

## 🌳 Context Hierarchy (`app/layout.tsx` & `QueryProvider.tsx`)

The context tree is organized as follows:

```
QueryClientProvider
└── ToastProvider          (Context: showToast, copyToClipboard, interactive onClick for PWA updates)
    └── ConfirmationProvider (Context: confirm dialogs)
        └── FavoritesProvider (Context: favorites list, new episode checks, recommendations toggle)
            └── {children}
```

> **Rule**: Hooks (`useToast()`, `useConfirmation()`, `useFavoritesContext()`) contain defensive fallback returns so they do not crash when rendered outside a provider during static page prerendering (SSG/404).

---

## ⚡ Kenjitsu Self-Hosted Metadata Layer (`src/lib/anime/metadata-fetcher.ts`)
- **Kenjitsu self-hosted**: Single source for catalog, metadata, episodes, characters, relations and media.
- **Kenjitsu client + timeout/cache**: Requests use `KENJITSU_REQUEST_TIMEOUT_MS` and Redis TTL settings; there is no silent API fallback.
- **Alias Pairing (`AnimeAlias`)**: Automatically saves all alternative names (English, Romaji, Native, synonyms) into PostgreSQL's `AnimeAlias` table for exact episode and media title matching.
- **Deterministic Import**: `ImportAnimeModal.tsx` sends the exact selected card metadata object directly to the backend.

## 🎬 Kenjitsu Extensions, HLS Validation & VideoPlayer
- **Kenjitsu extensions**: Native and ported extensions are enabled, disabled and tested in `/admin/extensions`; they are maintained in self-hosted local forks.
- **HLS Playlist Validation ([hls-validator.ts](file:///c:/Users/sodinha/Documents/projetos/anistream/src/lib/streams/hls-validator.ts))**: Validates HTTP status, `Content-Type`, and `#EXTM3U` header tag in the manifest.
- **On-Demand Lazy Resolution & Headers**: Video URL resolution runs exclusively when the user clicks "Play". The proxy faithfully forwards `User-Agent`, `Referer`, and `Origin` headers.
- **Admin Episode Manager (`EpisodeSourcesModal.tsx`)**:
  - Real-time Kenjitsu discovery, legacy-record maintenance, and **inline test player** directly inside the modal.

---

## 🔒 Segurança de mídia
- A aplicação não exige uma lista administrativa de hosts: o Kenjitsu retorna CDNs e URLs efêmeras.
- `src/lib/security/ssrf.ts` bloqueia protocolos, portas, credenciais, DNS para redes privadas e IPs reservados.
- O relay usa descritores AES-GCM assinados por token de playback; fontes manuais não são cadastradas.

---

## 🔌 API Architecture, Circuit Breaker & Resilience
- **Standardized Responses (`src/lib/api/response.ts`)**: All routes use `apiSuccess<T>` (`{ success: true, data: T, meta?: ... }`) and `apiError` (`{ success: false, error: { code, message, details }, timestamp }`).
- **Circuit Breaker (`src/lib/api/circuit-breaker.ts`)**: Protects Kenjitsu and its extensions. After repeated failures, the circuit opens for the configured cooldown; it reports upstream unavailability instead of switching to another API.
- **Edge Caching**: Public catalog routes use `Cache-Control: public, s-maxage=1800, stale-while-revalidate=86400`. Streaming and admin routes use `no-store, private`.

---

## 🚀 Registered NPM & Verification Commands (`package.json`)

All available npm scripts registered in `package.json`:

| Command | Action / Script | Description |
| :--- | :--- | :--- |
| **`npm run dev`** | `next dev` | Starts the Next.js development server. |
| **`npm run build`** | `next build` | Creates an optimized Next.js production build. |
| **`npm run start`** | `next start` | Starts the production server. |
| **`npm run db:generate`** | `prisma generate` | Generates Prisma Client types and models. |
| **`npm run generate-tokens`** | `node scripts/generate-tokens.js` | Generates security keys and tokens. |
| **`npm run test`** | `npx vitest run` | Runs the Vitest automated test suite once. |
| **`npm run test:watch`** | `npx vitest` | Runs Vitest in interactive watch mode. |
| **`npm run test:coverage`** | `npx vitest run --coverage` | Generates code coverage report via Vitest. |
| **`npm run test:docker`** | `node scripts/verify-docker.js` | Runs pre-deploy Docker build & container verification. |
| **`npm run test:e2e`** | `playwright test` | Executes Playwright end-to-end browser tests. |
| **`npm run pre-deploy`** | `npm run test && npm run test:docker && npm run build` | Full validation pipeline before production deployment. |
| **`npm run deploy:local`** | `node scripts/deploy-local.js` | Triggers a local container deployment. |
| **`npm run lint`** | `eslint .` | Runs ESLint syntax and code quality check. |
| **`npm run clean`** | `next clean` | Cleans Next.js build cache. |
| **`npx tsc --noEmit`** | `tsc --noEmit` | **Mandatory Type Check**: Always verify clean TypeScript compilation before finishing tasks. |
