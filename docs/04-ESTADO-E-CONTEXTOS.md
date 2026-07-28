# 04. Gerenciamento de Estado & Contextos — AniStream 🌳

O AniStream gerencia seu estado global por meio de **React Contexts** encadeados no `app/layout.tsx` e **Custom Hooks** reutilizáveis.

---

## 🌳 Hierarquia da Árvore de Contextos

```text
QueryClientProvider (@tanstack/react-query)
└── ToastProvider (ToastContext.tsx)
    └── ConfirmationProvider (ConfirmationContext.tsx)
        └── FavoritesProvider (FavoritesContext.tsx)
            └── {app children}
```

---

## 📌 Contextos Globais

### 1. `ToastContext.tsx`
Fornece notificações flutuantes com temporizador visual e animação de entrada/saída.
- **Funções expostas**:
  - `showToast({ type, title, message, duration })`: Dispara um toast do tipo `success`, `info`, `warning` ou `error`.
  - `copyToClipboard(text, message)`: Utilitário para copiar links e avisar o usuário.

### 2. `ConfirmationContext.tsx`
Gerencia caixas de diálogo e confirmações personalizadas (ex: confirmação para remover favorito ou apagar progresso).
- **Funções expostas**:
  - `confirm({ title, description, confirmText, cancelText, variant, animeTitle, animeImage })`: Retorna uma `Promise<boolean>` resolvida com `true` se o usuário confirmar ou `false` se cancelar.

### 3. `FavoritesContext.tsx`
Armazena os animes favoritados pelo usuário e executa checagens periódicas de novos episódios.
- **Funções expostas**:
  - `favorites`: Lista de animes salvos.
  - `toggleFavoriteWithConfirm(anime)`: Adiciona/remove favoritos acionando diálogo de confirmação.
  - `newEpisodesMap`: Objeto rastreando quais favoritos ganharam novos episódios.
  - `markAsSeen(animeId)`: Limpa a notificação de novo episódio de um anime.

---

## 🪝 Custom Hooks

| Hook | Arquivo | Responsabilidade |
| :--- | :--- | :--- |
| `useFavorites` | `hooks/useFavorites.ts` | Interface direta para consumir `FavoritesContext` com fallbacks seguros contra React SSG. |
| `usePlaybackProgress` | `hooks/usePlaybackProgress.ts` | Salva o tempo exato assistido via LocalStorage + IndexedDB a cada 5s e restaura timestamp. |
| `useWebNotifications` | `hooks/useWebNotifications.ts` | Gerencia permissões e dispara Notificações Web Push de novos episódios. |
| `useDraggableScroll` | `hooks/useDraggableScroll.ts` | Permite rolar listas e carrosséis horizontais clicando e arrastando com o mouse. |
| `useMobile` | `hooks/use-mobile.ts` | Detecta se a largura de tela atual é menor que 768px (Mobile Breakpoint). |
