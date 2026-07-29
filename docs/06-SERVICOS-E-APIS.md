# 06. Serviços de API & Resiliência — AniStream 🌐

 O AniStream utiliza **duas APIs públicas externas** para alimentar os dados de catálogo, rankings, fotos e contagem de episódios.

---

### 3. Provedores de Streaming e Episódios Externos (`services/providers/externalProviders.ts`)
- **Provedores Suportados**: `AniZone/Kenjitsu`, `Miruro`, `Anify`, `Consumet/Gogoanime`, `TVmaze` (episódios), `2Embed`, `Xpass`, `ApiPlayer`.
- **Arquitetura de Requisição**: AbortController com timeout de 10s, `cache: "no-store"`, `encodeURIComponent` e tratamento de erros para HTTP 404, 429, 5xx e SyntaxError no parsing JSON.
- **Pipeline de Fallback Dinâmico**: O `ExternalApisProvider` lê apenas registros ativados (`enabled: true`) no banco de dados, respeitando a ordem de prioridade definida no admin/setup.

---

## ⚡ Fila de Engarrafamento e Rate Limiting (`services/jikan.ts`)

A API Jikan v4 possui limite público severo de **3 requisições por segundo**. Para evitar bloqueios por erro HTTP 429 (`Too Many Requests`), todas as chamadas no arquivo [`services/jikan.ts`](file:///c:/Users/junin/Documents/projetos/anistream/services/jikan.ts) passam obrigatoriamente pela função `throttleRequest()`:

```typescript
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 350; // Intervalo mínimo garantido entre requisições

async function throttleRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - timeSinceLast));
  }
  lastRequestTime = Date.now();
  try {
    return await requestFn();
  } catch (error: any) {
    if (error?.response?.status === 429) {
      // Backoff e nova tentativa após 1.5s em caso de estouro de limite
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return await requestFn();
    }
    throw error;
  }
}
```

---

## ⚡ Circuit Breaker & Resiliência Externa (`src/lib/api/circuit-breaker.ts`)

Para proteger a aplicação de falhas ou degradações de rede no Jikan API e AniList, o AniStream implementa o padrão **Circuit Breaker**:

1. **Monitoramento**: Registra falhas consecutivas em uma janela de 60 segundos.
2. **Abertura de Circuito (OPEN)**: Se ocorrerem 5 falhas no período, o circuito é aberto por 30 segundos.
3. **Fallback Automático**: Durante a abertura, requisições servem dados direto do banco local (PostgreSQL) / IndexedDB sem tentar conectar à API indisponível, retornando a flag `meta: { cached: true, offline: true }`.

---

## 📐 Padronização de Respostas HTTP (`src/lib/api/response.ts`)

Todas as rotas da API pública e administrativa utilizam o módulo centralizado de respostas:

- **Sucesso (`apiSuccess<T>`)**:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": { "total": 24, "offline": false }
  }
  ```
- **Erro (`apiError`)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "RATE_LIMITED" | "INVALID_INPUT" | "NO_SOURCES_AVAILABLE",
      "message": "Mensagem detalhada",
      "details": { ... }
    },
    "timestamp": "2026-07-29T16:00:00Z"
  }
  ```

---

## ⚡ Edge Caching (CDN Headers)

- **Rotas de Catálogo Público (`/api/anime/*`)**: `Cache-Control: public, s-maxage=1800, stale-while-revalidate=86400`.
- **Rotas de Streaming & Admin (`/api/streams/*`, `/api/admin/*`)**: `Cache-Control: no-store, private`.

