# 10. Testes e scripts de validação local

Esta documentação descreve a validação local do AniStream, do painel operacional e da integração Kenjitsu. Nenhum comando desta página faz deploy em Railway.

## 1. Pré-requisitos

Para executar a validação completa:

- Node.js 22.19+;
- Docker Desktop com Compose;
- PostgreSQL e Redis locais, ou o stack definido em `docker-compose.yml`;
- repositórios irmãos `../kenjitsu`, `../kenjitsu-extensions` e `../extensions-source` para o Compose self-hosted;
- banco inicializado com `npx prisma db push` quando executar sem Docker.

## 2. Testes unitários

```bash
npm test
```

A suíte Vitest cobre, entre outros pontos:

- schemas administrativos;
- schema e migração idempotente da Home customizável;
- validação de composição, fontes Kenjitsu, limites de blocos e links internos;
- autenticação e criptografia de playback;
- proteção SSRF;
- circuit breaker;
- normalização de títulos;
- intervalos de abertura;
- parser M3U/HLS legado;
- lembretes e resolução de streams.

Comandos relacionados:

```bash
npm run test:watch
npm run test:coverage
```

## 3. TypeScript, lint e build

```bash
npx tsc --noEmit
npm run lint
npm run build
```

`npm run pre-deploy` é apenas um gate local que executa testes unitários, verificação Docker e build; ele não publica a aplicação.

## 4. Playwright e acessibilidade

```bash
npm run test:e2e
```

Os testes em `tests/e2e/` cobrem:

- home, catálogo, player e favoritos;
- auditoria de acessibilidade com axe;
- formulários administrativos;
- diálogos de confirmação e foco;
- rotas canônicas do admin;
- `/admin/homepage` e `/preview/homepage` com sessão administrativa;
- aliases `/admin/dashboard`, `/admin/sources` e `/admin/sources/tester`;
- rota de edição com recurso inexistente;
- command palette via teclado.

O painel deve ser revisado em 320, 360, 390, 768, 1024, 1280 e 1440px. Os critérios incluem loading, vazio, erro recuperável, sucesso, desabilitado, sem permissão, dirty state, confirmação destrutiva, `aria-live`, `aria-invalid`, `aria-describedby`, reduced motion e zoom de 200%.

## 5. Infraestrutura Docker

```bash
npm run test:docker
docker compose up -d --build
```

Verificações úteis:

```bash
curl http://localhost:3000/api/health
docker compose ps
docker logs anistream_selfhosted_app
docker logs anistream_selfhosted_kenjitsu
```

O health esperado confirma PostgreSQL, Redis, aplicação e Kenjitsu. O primeiro acesso pode redirecionar para `/setup` se não houver administrador. O primeiro acesso à Home ou ao builder cria automaticamente o singleton `HomepageLayout`; a chave legada `home_sections` é removida somente após a migração transacional.

## 6. Smoke do Kenjitsu

Smoke completo:

```bash
npm run test:kenjitsu
```

Smoke reduzido para diagnóstico local:

```powershell
$env:KENJITSU_SMOKE_EXTENSIONS="anizone,animefire"
npm run test:kenjitsu
```

O script exige que as extensões estejam registradas no health do Kenjitsu e testa busca, detalhes, episódios e sources. Fontes NSFW só entram quando `KENJITSU_SMOKE_INCLUDE_NSFW=true`.

Falhas de uma extensão devem ser tratadas como resultado de upstream: o painel mostra `degraded`, `down` ou `unknown`, registra `ProviderHealthLog` e preserva as demais fontes habilitadas.

O caminho padrao exige correspondencia exata do titulo para evitar que `Naruto` seja ligado a `Naruto Shippuden` ou `Boruto`. Extensoes nativas sao validadas pelo endpoint de mapping do AniList, que e o caminho usado pelo catalogo. Para diagnosticar uma fonte que possui busca ampla, mas nao retorna o titulo solicitado, use o probe explicito:

```powershell
$env:KENJITSU_SMOKE_EXTENSIONS="animeito,muitohentai,pifansubs"
$env:KENJITSU_SMOKE_PROBE_FALLBACK="true"
npm run test:kenjitsu
```

O probe usa apenas o primeiro resultado e o reporta como `WARN`; ele nao altera a resolucao segura do catalogo. `WARN` significa cadeia de episodios/sources funcional, mas busca ou taxonomia que precisa de revisao. `FAIL` significa erro no inventario, detalhes, episodios ou sources.

O inventário local deve anunciar 30 extensões. Fontes removidas por indisponibilidade do domínio não devem ser reativadas manualmente: primeiro confirme uma atualização no `extensions-source`, depois porte a correção para o fork self-hosted e repita o smoke.

## 7. Scripts auxiliares

- `scripts/verify-docker.js`: valida Dockerfile, Compose, Prisma e saída standalone.
- `scripts/smoke-kenjitsu.mjs`: executa o smoke do inventário de extensões.
- `scripts/deploy-local.js`: prepara a execução local; não publica em serviço externo.

Scripts de cadastro manual de fontes/M3U são históricos e não devem ser usados para validar a arquitetura atual.
