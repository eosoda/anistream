# 03. Componentes e design system

Os componentes ficam em `src/components/` e são organizados por domínio. As páginas públicas e o painel administrativo compartilham tokens, tipografia e acessibilidade, mas usam densidades diferentes.

## Domínios

```text
src/components/
├── anime/       # cards, carrosséis e detalhes de anime
├── player/      # player, episódios e controles de playback
├── catalog/     # busca, filtros e alternância de visualização
├── home/        # hero, continuidade e lembretes
├── layout/      # Navbar, Footer, providers e PWA
├── admin/       # shell, operações, editor e primitives do painel
└── ui/          # componentes atômicos compartilhados
```

## Painel administrativo

O admin usa a direção **Livro de operações**. Em vez de repetir cards glass, as superfícies priorizam tabelas, filas, grupos de formulário e divisórias.

- [`AdminSidebar.tsx`](../src/components/admin/AdminSidebar.tsx): navegação agrupada e responsiva;
- [`AdminHeader.tsx`](../src/components/admin/AdminHeader.tsx): breadcrumbs, sessão e command palette;
- [`AdminPrimitives.tsx`](../src/components/admin/AdminPrimitives.tsx): painel, tabela, filtro, status, feedback, drawer, modal, save bar e estados vazios;
- [`OperationalPage.tsx`](../src/components/admin/OperationalPage.tsx): cabeçalho e estado das superfícies operacionais;
- [`AdminOperations.tsx`](../src/components/admin/AdminOperations.tsx): operações de sistema, backup, broadcast, integração e release.

### Regras de composição do admin

- Use `AdminPageHeader` para título, descrição, breadcrumb e ação principal;
- use `AdminPanel` para agrupar conteúdo relacionado, não para decorar cada campo;
- use `AdminDataTable` em desktop e uma composição compacta em telas menores;
- use `AdminFilterBar` para filtros que alteram a consulta da API;
- use `AdminStatusBadge` para `healthy`, `degraded`, `down`, `unknown`, enabled e estados de risco;
- use `AdminFeedback` para loading, erro recuperável e sucesso;
- use `AdminSaveBar` quando houver dirty state;
- coloque exclusões, restore e manutenção em uma zona de risco com confirmação explícita.

## Domínio público

- `src/components/anime/`: cards de poster, compact cards, carrosséis e personagens;
- `src/components/player/`: `VideoPlayer`, `EpisodeList` e controles HLS/atualização;
- `src/components/catalog/`: `SearchBar`, filtros avançados e alternância grid/lista;
- `src/components/home/`: banner, continuar assistindo e lembretes;
- `src/components/ui/`: `SafeImage`, tooltips, badges, skeletons, empty states e banners offline.

## Acessibilidade e responsividade

- Todo campo precisa de label programático e relação com ajuda/erro;
- dialogs devem prender foco, responder a Escape e devolver foco ao acionador;
- alterações assíncronas usam `aria-live` ou `role="alert"`;
- navegação ativa usa `aria-current` e tabs usam `aria-selected`;
- testar 320, 360, 390, 768, 1024, 1280 e 1440px;
- respeitar reduced motion e zoom de 200% sem esconder conteúdo por overflow global.

O contrato visual completo está em [`../DESIGN.md`](../DESIGN.md) e o brief específico do admin em [`../.impeccable/surfaces/app-main-admin-page-tsx.md`](../.impeccable/surfaces/app-main-admin-page-tsx.md).
