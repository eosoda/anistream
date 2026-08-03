# Arquitetura do AniStream

Este documento descreve a arquitetura atual do AniStream depois da migração para o Kenjitsu self-hosted. O Kenjitsu é a fonte única de catálogo, metadados, episódios e mídias; o AniStream mantém a experiência pública, a administração, o catálogo operacional local e a persistência de estado.

## 1. Visão geral

```mermaid
flowchart TD
    Browser["Navegador"] --> PublicUI["Next.js / React\nRotas públicas"]
    Browser --> AdminUI["Painel operacional\n/admin"]

    PublicUI --> AppAPI["Route Handlers\nAPI AniStream"]
    AdminUI --> AdminAPI["APIs administrativas\n/auth + auditoria"]

    AppAPI --> Catalog["Cliente Kenjitsu\ncatálogo, detalhes e episódios"]
    AppAPI --> Resolver["Resolvedor de mídia\nKenjitsu + extensões habilitadas"]
    AdminAPI --> Catalog
    AdminAPI --> ExtensionHealth["Health das extensões\nmanifest + testes"]

    Catalog --> Kenjitsu["Kenjitsu self-hosted"]
    Resolver --> Kenjitsu
    ExtensionHealth --> Kenjitsu
    Kenjitsu --> Extensions["Forks de extensões\nself-hosted"]

    AppAPI --> Postgres["PostgreSQL\ncatálogo local, usuários e estado"]
    AdminAPI --> Postgres
    AdminAPI --> Audit["AdminAuditLog\nações administrativas"]
    ExtensionHealth --> HealthLog["ProviderHealthLog\nhealthy/degraded/down/unknown"]
    AppAPI --> Redis["Redis\ncache e coordenação"]
    Kenjitsu --> KenjitsuRedis["Redis do Kenjitsu"]
```

## 2. Responsabilidade de cada camada

### Interface pública

- `app/(main)` contém home, catálogo, detalhes, favoritos, calendário e player.
- O catálogo público usa os dados sincronizados/administrados no AniStream e consulta o Kenjitsu para metadados, episódios e resolução de mídia.
- O player mantém HLS, embeds, legendas, seleção de qualidade, retomada, atalhos e pular abertura.

### Painel administrativo

- `app/(main)/admin/layout.tsx` fornece o shell autenticado, sidebar agrupada, breadcrumbs, sessão e command palette.
- `src/components/admin/AdminPrimitives.tsx` concentra tabela, filtros, estados, feedback, drawer, modal, save bar e zona de risco.
- A direção visual do admin é densa e plana: tabelas, filas, divisórias e status sem cards glass como material padrão.
- As superfícies principais são dashboard, catálogo/editor, extensões, navegação, sistema, backups, integrações, comunicados e releases.

### Integração Kenjitsu

- `src/lib/kenjitsu/client.ts` encapsula autenticação, timeout e chamadas HTTP.
- `src/lib/kenjitsu/catalog.ts` centraliza busca, detalhes, relações, personagens e episódios.
- `src/lib/providers/kenjitsu.provider.ts` traduz fontes retornadas pelo Kenjitsu para o resolvedor do AniStream.
- As extensões são tratadas como fontes: podem ser habilitadas, desabilitadas, filtradas, testadas e auditadas pelo painel.
- O AniStream não troca silenciosamente para Jikan, AniList, Kitsu, Consumet, scrapers ou M3U quando o Kenjitsu falha.

## 3. Extensões como fontes operacionais

O Kenjitsu registra os manifests das extensões e expõe o health agregado. O AniStream persiste somente o estado administrativo necessário para operar essas fontes:

- `enabled` e `nsfw`;
- status do último teste: `healthy`, `degraded`, `down` ou `unknown`;
- latência, data do teste e última mensagem de erro;
- origem e capacidades do manifest quando o Kenjitsu estiver disponível.

O código das extensões vive nos forks/self-hosted dos repositórios Kenjitsu. Atualizações devem ser feitas nos forks, em branches e PRs próprios, sem modificar os repositórios oficiais.

## 4. Persistência e auditoria

O PostgreSQL mantém o estado operacional do AniStream. Além das entidades de catálogo, usuários e episódios, a arquitetura atual usa:

- `AdminAuditLog`: ator, ação, tipo/id do recurso, resumo, metadata sanitizada e data;
- `ProviderHealthLog`: histórico de testes por extensão, latência, status e erro;
- configurações administrativas das extensões Kenjitsu;
- estado local de navegação, comunicados, releases, backups e integrações.

`src/lib/admin/audit.ts` remove chaves sensíveis e limita metadata antes de persistir. O histórico é consultável no dashboard e em `GET /api/admin/audit`.

## 5. Contratos administrativos principais

| Endpoint | Uso |
| :--- | :--- |
| `GET /api/admin/overview` | KPIs, serviços, extensões, alertas e atividade recente. |
| `GET /api/admin/metrics` | Contrato legado de métricas, mantido para consumidores existentes. |
| `GET /api/admin/audit` | Auditoria paginada com filtros por recurso, ação e período. |
| `GET /api/admin/animes` | Catálogo administrativo com busca, status, episódios, ordenação e paginação. |
| `POST /api/admin/animes/bulk` | Sincronização ou exclusão em lote, com resultados parciais. |
| `GET /api/admin/extensions` | Extensões com filtros de habilitação, NSFW, status, origem e capacidade. |
| `POST /api/admin/extensions/bulk` | Habilitação ou desabilitação em lote. |
| `POST /api/admin/extensions` | Teste individual com persistência de health. |
| `POST /api/admin/animes/[id]/sync` | Sincronização do anime usando o Kenjitsu. |
| `POST /api/admin/animes/[id]/episodes/[epId]/discover-sources` | Descoberta live das fontes pelas extensões habilitadas. |

Todas as rotas administrativas exigem sessão válida. A resposta pode indicar indisponibilidade do Kenjitsu sem apagar configurações locais nem inventar resultados.

## 6. Mídia e segurança

As URLs de reprodução são retornadas pelo Kenjitsu em tempo real. Não existe configuração administrativa de hosts autorizados, cadastro manual de URL de stream ou fallback de provedor externo.

Mesmo assim, cada URL passa por `src/lib/security/ssrf.ts`. A validação bloqueia protocolos indevidos, credenciais embutidas, portas não suportadas, redes privadas e resultados DNS internos. O relay mantém descritores assinados e criptografia AES-GCM quando aplicável.

HLS é validado por `src/lib/streams/hls-validator.ts`. A validação confirma status HTTP, content type compatível e a tag `#EXTM3U`; isso é uma proteção do playback, não uma fonte de catálogo.

## 7. Execução local e atualização

O ambiente oficial desta fase é local:

```bash
docker compose up -d --build
```

O Compose sobe AniStream, Kenjitsu, PostgreSQL e os dois Redis. Os três repositórios irmãos (`kenjitsu`, `kenjitsu-extensions` e `extensions-source`) são usados como contexto local para a imagem self-hosted.

Para atualizar sem tocar nos projetos oficiais:

```bash
git -C ../kenjitsu fetch upstream --tags
git -C ../kenjitsu-extensions fetch upstream --tags
git -C ../extensions-source fetch upstream --tags
```

Depois, cada atualização deve ser revisada no fork, validada localmente e integrada ao AniStream por PR. Railway não faz parte da validação atual.
