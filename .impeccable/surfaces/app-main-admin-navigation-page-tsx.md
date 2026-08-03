---
version: 1
slug: "app-main-admin-navigation-page-tsx"
primary_target: "app/(main)/admin/navigation/page.tsx"
related_targets: ["app/api/admin/navigation/route.ts", "src/components/layout/Navbar.tsx", "src/components/layout/Footer.tsx"]
---

THESIS: Navegação é um contrato operacional da experiência pública: o operador compara destinos, publica uma revisão e verifica o efeito antes de sair do painel.

OWN-WORLD: Superfícies near-black opacas, tabelas e linhas comparáveis, laranja reservado para publicação e seleção, estados semânticos e Geist Mono para rotas e revisões.

STORY: O operador identifica o estado atual, ajusta o menu, escolhe os três atalhos mobile, define o comportamento de páginas indisponíveis, confere o preview e publica com recuperação clara em caso de conflito.

FIRST VIEWPORT: Cabeçalho com revisão e publicação, quatro indicadores compactos, tabs para Menu público, Atalhos mobile e Páginas, seguido pelo preview da experiência publicada.

FORM: Operate. Destinos internos oficiais são editáveis por rótulo, ordem e visibilidade; não há criação de URLs externas, editor da Home ou configuração de hosts.

STATES: loading, erro recuperável, defaults materializados, dirty state, validação inline, conflito de revisão, sucesso de publicação e fallback público seguro.

ACCESSIBILITY: Tabs com aria-selected/controls, campos com aria-invalid/aria-describedby, save bar com região de status, foco visível, controles de ordem por teclado e preview não interativo.
