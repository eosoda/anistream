# 03. Componentes e design system

Os componentes ficam em `src/components/` e são organizados por domínio. As páginas públicas e o painel administrativo compartilham tokens, tipografia e acessibilidade, mas usam densidades diferentes.

## Domínios

```text
src/components/
├── anime/       # cards, carrosséis e detalhes de anime
├── player/      # player, episódios e controles de playback
├── catalog/     # busca, filtros e alternância de visualização
├── home/        # renderer, hero, filtros, continuidade e avisos
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
- [`app/(main)/admin/homepage/page.tsx`](../app/(main)/admin/homepage/page.tsx): editor visual da composição da Home.

### Regras de composição do admin

- Use `AdminPageHeader` para título, descrição, breadcrumb e ação principal;
- use `AdminPanel` para agrupar conteúdo relacionado, não para decorar cada campo;
- use `AdminDataTable` em desktop e uma composição compacta em telas menores;
- use `AdminFilterBar` para filtros que alteram a consulta da API;
- use `AdminStatusBadge` para `healthy`, `degraded`, `down`, `unknown`, enabled e estados de risco;
- use `AdminFeedback` para loading, erro recuperável e sucesso;
- use `AdminSaveBar` quando houver dirty state;
- coloque exclusões, restore e manutenção em uma zona de risco com confirmação explícita.

### Builder da Home

O construtor usa uma composição única e responsiva de blocos tipados. Não aceita HTML, CSS, JavaScript, Markdown, upload ou links externos.

- `hero`: destaques Kenjitsu, de 1 a 5 slides, com autoplay controlado e respeito a reduced motion;
- `catalog_carousel`: 6 a 12 itens, via consulta Kenjitsu ou IDs AniList manuais resolvidos pela API;
- `continue_watching`: estado pessoal hidratado no navegador;
- `quick_filters`: atalhos internos para pesquisa;
- `editorial_notice`: aviso de texto simples e CTA interno;
- `divider`: separador visual sem dados externos.

O canvas permite reordenar por mouse/teclado, duplicar, ocultar e remover até 12 blocos. O inspector edita somente campos validados pelo schema Zod. O fluxo é `rascunho → salvar → snapshot opcional → preview público → publicar`; a publicação exige confirmação, gera um `HomepageSnapshot`, preserva as versões anteriores e invalida o cache Redis da Home. O construtor não mantém preview local duplicado.

## Domínio público

- `src/components/anime/`: cards de poster, compact cards, carrosséis e personagens;
- `src/components/player/`: `VideoPlayer`, `EpisodeList` e controles HLS/atualização;
- `src/components/catalog/`: `SearchBar`, filtros avançados e alternância grid/lista;
- `src/components/home/`: `HomepageRenderer`, preview, banner, carrosséis, filtros rápidos, continuar assistindo e avisos;
- `src/components/ui/`: `SafeImage`, tooltips, badges, skeletons, empty states e banners offline.

## Acessibilidade e responsividade

- Todo campo precisa de label programático e relação com ajuda/erro;
- dialogs devem prender foco, responder a Escape e devolver foco ao acionador;
- alterações assíncronas usam `aria-live` ou `role="alert"`;
- navegação ativa usa `aria-current` e tabs usam `aria-selected`;
- testar 320, 360, 390, 768, 1024, 1280 e 1440px;
- respeitar reduced motion e zoom de 200% sem esconder conteúdo por overflow global.

O contrato visual completo está em [`../DESIGN.md`](../DESIGN.md), o brief da visão geral em [`../.impeccable/surfaces/app-main-admin-page-tsx.md`](../.impeccable/surfaces/app-main-admin-page-tsx.md), o brief de navegação em [`../.impeccable/surfaces/app-main-admin-navigation-page-tsx.md`](../.impeccable/surfaces/app-main-admin-navigation-page-tsx.md) e o contrato compartilhado em [`../.impeccable/surfaces/admin-operational-system.md`](../.impeccable/surfaces/admin-operational-system.md).
