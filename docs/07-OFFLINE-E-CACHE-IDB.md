# 07. Armazenamento Offline e IndexedDB — AniStream 💾

O AniStream conta com um sistema de **suporte offline** que permite aos usuários navegar em catálogos e acessar informações salvas mesmo sem conexão com a internet.

---

## 🗄️ Estrutura do Banco IndexedDB (`utils/offlineCacheDB.ts`)

O utilitário [`utils/offlineCacheDB.ts`](file:///c:/Users/junin/Documents/projetos/anistream/utils/offlineCacheDB.ts) encapsula o uso da API nativa IndexedDB do navegador.

- **Nome do Banco**: `AniStreamOfflineDB`
- **Versão**: `1`

### Object Stores (Tabelas)

1. **`catalog`** (KeyPath: `key`)
   - Armazena listas de busca, temporais e rankings populares.
   - Campos: `key`, `data`, `updatedAt`.
2. **`favorites`** (KeyPath: `mal_id`)
   - Armazena lista de animes favoritados para acesso instantâneo offline.
3. **`anime_details`** (KeyPath: `mal_id`)
   - Armazena metadados detalhados de cada anime individual visualizado.
4. **`episodes`** (KeyPath: `animeId`)
   - Armazena a lista de episódios indexados por anime.

### 🛡️ Resiliência: Fallback Transparente em Memória (`memoryCacheMap`)
Caso o navegador esteja rodando em **Modo Anônimo / Privado** (onde a abertura do IndexedDB pode ser bloqueada) ou com quota de disco excedida (`QuotaExceededError`), o utilitário intercepta o erro via `try...catch` e redireciona a persistência transparente para um `Map` em memória (`memoryCacheMap`). Isso garante zero travamentos na aplicação.


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

## 📱 Suporte PWA Instalável & Service Worker (Fase 3)

1. **Manifest Web App (`public/manifest.json`)**:
   - Define nome, ícones, cor de tema (`#FF6B00`), cor de fundo (`#0B0B0F`) e exibição `standalone`.
2. **Service Worker (`public/sw.js`)**:
   - Cache de rotas HTML e ativos estáticos com estratégia **Stale-While-Revalidate**.
3. **PWA Registration Component (`PwaRegister.tsx`)**:
   - Registra `/sw.js` e intercepta o evento `beforeinstallprompt` exibindo o botão de instalação nativa no celular ou desktop.
4. **Notificações Web Push (`useWebNotifications.ts`)**:
   - Hook nativo para gerenciar permissões de notificação do navegador e enviar alertas de lançamentos de episódios favoritados.
