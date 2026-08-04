---
version: 1
slug: "admin-operational-system"
primary_target: "src/components/admin/AdminPrimitives.tsx"
related_targets: ["app/globals.css", "src/components/admin/AdminAuthGuard.tsx", "src/components/ui/Dialog.tsx", "src/context/ToastContext.tsx", "src/components/layout/Navbar.tsx"]
---

THESIS: O painel administrativo funciona como um livro de operações: estado, prioridade, ação e recuperação devem ser compreendidos sem depender de memória visual.

OWN-WORLD: Superfícies near-black opacas, divisórias finas, laranja apenas para ação e seleção, estados semânticos explícitos e números operacionais em Geist Mono. O sistema não usa glassmorphism para agrupar cada campo.

STORY: O operador entra, localiza o contexto, executa uma mudança segura e recebe confirmação ou recuperação clara. A mesma leitura funciona em desktop e em telas estreitas.

FIRST VIEWPORT: Shell agrupado, breadcrumb, sessão, cabeçalho de página, feedback assíncrono e conteúdo operacional. Tabelas viram cartões compactos abaixo de 640px sem perder seleção, ações ou rótulos.

FORM: Operate. `AdminPanel`, `AdminDataTable`, `AdminFilterBar`, `AdminStatusBadge`, `AdminFeedback`, `AdminSaveBar`, `Dialog` e `Toast` são as primitivas de composição; páginas específicas preservam os contratos Kenjitsu e de catálogo.

STATES: loading, vazio, erro recuperável, sucesso, desabilitado, sem permissão, dirty state, conflito e confirmação destrutiva. Toda transição assíncrona anuncia o resultado em uma região apropriada.

ACCESSIBILITY: Um landmark principal por rota, `aria-current` na navegação, labels programáticos, `aria-invalid`/`aria-describedby` para erros, foco visível, dialogs com foco preso e devolvido, controles de ordem por teclado, reduced motion e zoom de 200%.

QA: Validar rotas administrativas e públicas em 320, 360, 390, 768, 1024, 1280 e 1440px. O detector Impeccable deve ser executado nos targets finais após a última alteração visual.
