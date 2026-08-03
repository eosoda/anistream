# Painel administrativo operacional

O painel administrativo do AniStream usa o Kenjitsu self-hosted como fonte única de catálogo, metadados, episódios e mídia. A interface segue a direção **Livro de operações**: informações comparáveis, filas, tabelas, divisórias e feedback explícito para cada ação.

## 1. Setup inicial

O assistente `/setup` é usado somente para preparar a instalação:

1. validar a chave de instalação e a conexão com PostgreSQL;
2. criar a conta de administrador;
3. confirmar a integração com a API Kenjitsu;
4. concluir e abrir o painel.

Não existe mais configuração de **Hosts de Mídia Autorizados**, lista M3U, cadastro manual de URL de stream ou escolha de provedores externos no setup. O Kenjitsu retorna os hosts de reprodução; o AniStream mantém apenas as proteções de sessão, SSRF e playback.

## 2. Shell e navegação

O shell compartilhado fica em `app/(main)/admin/layout.tsx` e fornece:

- navegação agrupada em Monitorar, Gerenciar e Operar;
- breadcrumbs e estado da sessão;
- sidebar responsiva com `aria-current`;
- command palette acionada por `Ctrl/Cmd + K`;
- suporte a foco, Escape, reduced motion e zoom de 200%.

O grupo de Experiência inclui `/admin/calendar`, onde o operador configura o Release Schedule semanal, seleciona o timezone da prévia e controla regras recorrentes e exceções pontuais. A página pública correspondente é `/calendario`.

As rotas legadas continuam funcionando como aliases:

| Alias | Destino canônico |
| :--- | :--- |
| `/admin/dashboard` | `/admin` |
| `/admin/sources` | `/admin/extensions` |
| `/admin/sources/tester` | `/admin/extensions` |

## Centro de experiência pública

`/admin/navigation` materializa defaults legados na chave canônica `public_navigation_config`, controla os sete destinos internos oficiais, escolhe três atalhos mobile além da Busca fixa e define disponibilidade/redirect de cada página de conteúdo. O preview mostra desktop, barra mobile, menu Mais e footer antes da publicação. A Home continua sendo editada exclusivamente em `/admin/homepage`.

## 3. Dashboard operacional

`/admin` consulta `GET /api/admin/overview` e exibe:

- faixa de saúde do PostgreSQL e Kenjitsu;
- KPIs de animes, episódios, extensões e alertas;
- score agregado de saúde das extensões;
- fila de relatos pendentes;
- atividade administrativa recente;
- ações rápidas para catálogo, extensões, backups e manutenção.

`GET /api/admin/metrics` permanece compatível para consumidores existentes. Falhas parciais do Kenjitsu aparecem como status `down` ou `unknown`, sem substituir o resultado por outra API.

## 4. Catálogo e editor

`/admin/animes` oferece:

- busca por título, título original e título normalizado;
- filtros por status, presença de episódios, ordenação e paginação;
- seleção em lote para sincronizar ou excluir;
- confirmação para ações destrutivas;
- tabela desktop e cartões compactos em telas menores.

O editor `/admin/animes/[id]/editar` é dividido em Identidade, Metadata, Playback e Episódios. Alterações não salvas ativam dirty state e uma save bar fixa. A sincronização pelo Kenjitsu fica bloqueada enquanto houver alterações locais pendentes para evitar sobrescrita acidental.

As operações em lote usam `POST /api/admin/animes/bulk` com `action: sync|delete`. Cada item retorna sucesso ou erro, permitindo tratar falhas parciais.

## 5. Home customizável

`/admin/homepage` é o editor operacional da página inicial. A Home pública não lê mais `SystemSetting.home_sections` em runtime: a migração idempotente cria `HomepageLayout`, importa a configuração legada uma vez e remove a chave antiga após a transação.

O editor trabalha com até 12 blocos tipados em uma única composição responsiva:

- hero de destaques Kenjitsu, com 1–5 slides e autoplay configurável;
- carrossel de catálogo Kenjitsu, com consulta tipada ou IDs AniList manuais;
- continuar assistindo, hidratado no navegador para cada visitante;
- filtros rápidos, aviso editorial e separador.

O fluxo de publicação é explícito:

1. editar o rascunho no canvas e inspector;
2. reordenar por mouse ou teclado, duplicar, ocultar ou remover blocos;
3. salvar o rascunho, com controle otimista de versão;
4. abrir `/preview/homepage` para revisar o rascunho autenticado;
5. confirmar a publicação.

O rascunho pode ser descartado para restaurar a última publicação. Conflitos de versão, publicação e descarte entram no `AdminAuditLog`. A falha de uma consulta Kenjitsu afeta somente o bloco correspondente; não há fallback para outra API. Blocos manuais com IDs ausentes são ignorados e sinalizados na prévia pública.

Endpoints dedicados:

- `GET /api/admin/homepage` carrega rascunho e publicação;
- `PUT /api/admin/homepage` salva o rascunho;
- `POST /api/admin/homepage/publish` publica e invalida o cache;
- `POST /api/admin/homepage/discard` restaura o rascunho;
- `GET /api/homepage` entrega a Home publicada resolvida pelo Kenjitsu.

## 6. Extensões Kenjitsu

`/admin/extensions` trata cada extensão como uma fonte operacional. A matriz permite filtrar por:

- habilitação;
- NSFW;
- status `healthy`, `degraded`, `down` ou `unknown`;
- origem do manifest;
- capacidade declarada.

O operador pode habilitar/desabilitar uma ou várias extensões, alternar o bloqueio NSFW e executar teste individual. O teste consulta o Kenjitsu, registra latência e resultado em `ProviderHealthLog` e mostra a última mensagem de erro.

Endpoints:

- `GET /api/admin/extensions?enabled=yes&nsfw=no&status=healthy` lista extensões filtradas;
- `PATCH /api/admin/extensions` altera habilitação ou NSFW;
- `POST /api/admin/extensions` testa uma extensão;
- `POST /api/admin/extensions/bulk` executa `action: enable|disable`.

Não há campos para hosts, M3U, URL externa ou configuração de fontes fora do Kenjitsu.

## 7. Auditoria

Toda mudança administrativa relevante registra um `AdminAuditLog` com:

- ator e data;
- ação e recurso;
- resumo legível;
- metadata sanitizada e limitada.

São auditados catálogo, episódios, extensões, navegação, manutenção, backup, webhooks, comunicados, releases, autopilot e testes de providers.

`GET /api/admin/audit` aceita:

```text
resourceType, resourceId, action, from, to, page, pageSize
```

O dashboard mostra as últimas entradas e as superfícies operacionais exibem o histórico relacionado quando aplicável.

## 8. Outras superfícies

As páginas `/admin/navigation`, `/admin/system`, `/admin/backups`, `/admin/integrations`, `/admin/broadcasts` e `/admin/releases` usam o mesmo contrato visual e comportamental:

- formulário com label, ajuda e estado inválido;
- feedback de carregamento, sucesso e erro recuperável;
- save bar quando há alterações pendentes;
- confirmação para exclusões, restore, manutenção e outras zonas de risco;
- histórico ou feedback assíncrono visível.

## 9. Contratos úteis

| Endpoint | Função |
| :--- | :--- |
| `GET /api/admin/overview` | Visão consolidada do painel. |
| `GET /api/admin/navigation` | Configuração canônica, revisão e preview da experiência pública. |
| `POST /api/admin/navigation` | Publica menu, mobile e páginas com validação otimista. |
| `GET /api/settings/public` | Configuração pública compatível para Navbar, mobile e footer. |
| `GET /api/admin/metrics` | Métricas legadas compatíveis. |
| `GET /api/admin/audit` | Auditoria filtrada e paginada. |
| `GET /api/admin/animes` | Catálogo com filtros e paginação. |
| `POST /api/admin/animes/bulk` | `sync` ou `delete` em lote. |
| `GET /api/admin/extensions` | Matriz de extensões filtrável. |
| `POST /api/admin/extensions/bulk` | `enable` ou `disable` em lote. |
| `GET /api/admin/homepage` | Estado do builder, versões e resumo publicado. |
| `PUT /api/admin/homepage` | Salva o documento de rascunho validado. |
| `POST /api/admin/homepage/publish` | Publica o rascunho com controle de versão. |
| `POST /api/admin/homepage/discard` | Descarta o rascunho e restaura a última publicação. |
| `GET /api/homepage` | Composição pública resolvida pelo Kenjitsu. |
| `POST /api/admin/animes/[id]/sync` | Sincronização Kenjitsu de um anime. |
| `POST /api/admin/animes/[id]/episodes/[epId]/discover-sources` | Candidatos live de mídia. |

Endpoints legados de fontes manuais/M3U continuam identificáveis, mas não fazem parte do fluxo atual e respondem com migração ou indisponibilidade conforme o contrato da rota.
