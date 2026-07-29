# 06. Serviços de API & Resiliência — AniStream 🌐

 O AniStream utiliza **duas APIs públicas externas** para alimentar os dados de catálogo, rankings, fotos e contagem de episódios.

---

## 📡 APIs Utilizadas

### 1. Jikan API v4 (MyAnimeList Unofficial REST API)
- **URL Base**: `https://api.jikan.moe/v4`
- **Responsabilidade**: Fornecer a maioria dos dados de animes, incluindo busca por texto, filtros por gênero/status, ranking dos populares, episódios, personagens e programação de lançamentos por temporada.

### 2. AniList GraphQL API v2
- **URL Base**: `https://graphql.anilist.co`
- **Responsabilidade**: Fornecer banners em altíssima resolução, dados de tendências globais e recomendações personalizadas.

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

## 🛡️ Tratamento de Erros e Cache Estruturado

1. **React Query Caching**: As requisições são mantidas em cache na memória do navegador pelo `@tanstack/react-query` com `staleTime` de 5 a 15 minutos, evitando chamadas repetidas ao navegar entre páginas.
2. **IndexedDB Fallback**: Se uma requisição à API falhar ou a internet do usuário cair, o serviço consulta o catálogo local no IndexedDB antes de retornar erro.
3. **Pacing no Robô Autopilot**: A API de auto-indexação ([`app/api/admin/autopilot/route.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/app/api/admin/autopilot/route.ts)) insere um intervalo mínimo de `1000ms` entre requisições em lote à API Jikan v4 e executa retentativa com backoff de `2000ms` em respostas HTTP 429.
4. **Validação Estrita Zod (`schemas/admin.ts`)**: Validação e sanitização estrita de dados nas APIs administrativas de Broadcast (`CreateAnnouncementSchema`), Webhooks (`CreateWebhookSchema`), Manutenção (`MaintenanceSettingSchema`) e Releases (`CreateReleaseSchema`).

