# 07. Armazenamento Offline e IndexedDB — AniStream 💾

O AniStream conta com um sistema de **suporte offline** que permite aos usuários navegar em catálogos e acessar informações salvas mesmo sem conexão com a internet.

---

## 🗄️ Estrutura do Banco IndexedDB (`utils/offlineCacheDB.ts`)

O utilitário [`utils/offlineCacheDB.ts`](file:///c:/Users/junin/Documents/projetos/anistream/utils/offlineCacheDB.ts) encapsula o uso da API nativa IndexedDB do navegador.

- **Nome do Banco**: `AniStreamOfflineDB`
- **Versão**: `1`

### Object Stores (Tabelas)

1. **`catalog`** (KeyPath: `cacheKey`)
   - Armazena listas de busca, temporais e rankings populares.
   - Campos: `cacheKey`, `data`, `updatedAt`.
2. **`animes`** (KeyPath: `id`)
   - Armazena metadados detalhados de cada anime individual visualizado.
   - Campos: `id`, `title`, `synopsis`, `images`, `updatedAt`.

---

## 🔄 Fluxo de Resolução de Dados (Online vs Offline)

```mermaid
graph TD
    Req[Requisição de Dados do Anime] --> OnlineCheck{Navegador está Online?}
    OnlineCheck -- Sim --> FetchAPI[Chamada à API Jikan / AniList via Throttle]
    FetchAPI -- Sucesso --> SaveIDB[Salvar Resposta no IndexedDB] --> ReturnData[Exibir na Tela]
    FetchAPI -- Falha / HTTP 429 --> ReadIDB[Ler do Cache IndexedDB]
    OnlineCheck -- Não --> ReadIDB
    ReadIDB -- Encontrado no IDB --> ReturnData
    ReadIDB -- Não Encontrado --> FallbackData[Usar FALLBACK_ANIMES em data/fallbackAnime.ts] --> ReturnData
```

---

## 🔔 Componente de Banner Offline

Quando a conexão de internet é interrompida, o componente [`components/ui/OfflineStatusBanner.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/ui/OfflineStatusBanner.tsx) é ativado automaticamente no topo da tela, informando que a aplicação está operando em modo de cache offline.
