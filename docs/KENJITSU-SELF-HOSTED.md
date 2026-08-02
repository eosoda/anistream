# Kenjitsu self-hosted

Esta branch usa o Kenjitsu como única API de catálogo, metadados, episódios e sources. O AniStream não mantém fallback de Jikan, AniList, Consumet, M3U ou provedores legados para o fluxo de produção.

## Repositórios locais

Os três repositórios são forks da conta `eosoda` e mantêm `upstream` apontando para os projetos oficiais:

- `../kenjitsu` -> `eosoda/kenjitsu`
- `../kenjitsu-extensions` -> `eosoda/kenjitsu-extensions`
- `../extensions-source` -> `eosoda/extensions-source`

O `extensions-source` é a referência Kotlin/AnYomi. Os módulos são portados para TypeScript no fork `kenjitsu-extensions`; o repositório oficial não é alterado.

## Subir localmente

Na pasta `anistream`:

```bash
docker compose -f docker-compose.selfhosted.yml up -d --build
```

Serviços:

- AniStream: `http://localhost:3000`
- Kenjitsu: `http://localhost:3001`
- Postgres: `localhost:5432`
- Redis do AniStream: `localhost:6379`
- Redis do Kenjitsu: `localhost:6380`

O Compose compila `kenjitsu/Dockerfile.selfhosted` usando os dois forks irmãos como contexto. A imagem final não possui symlink para o host.

## Smoke dos cinco provedores nativos

Com o Kenjitsu saudável:

```bash
npm run test:kenjitsu
```

O script executa busca, detalhes, episódios e sources em `anizone`, `anikoto`, `anidb`, `anibd` e `animeheaven`. O painel `/admin/extensions` controla habilitação, NSFW, health e teste individual.

## Atualizar dos upstreams

Cada fork deve permanecer com `origin` na conta `eosoda` e `upstream` no repositório oficial:

```bash
git fetch upstream --tags
git log --oneline HEAD..upstream/main
```

As atualizações entram em branches próprias e PRs draft. O merge só é liberado depois de `tsc`, testes unitários, build Docker e smoke dos cinco provedores. As portas dos módulos de `extensions-source` serão feitas em PRs separados por grupo, preservando a origem e facilitando revisões/updates futuros.

## Ordem dos PRs

1. contrato/registry de extensões;
2. API genérica do Kenjitsu;
3. imagem e Compose self-hosted;
4. migração do AniStream e cache TTL/Redis;
5. portas TypeScript das extensões-source por grupo;
6. smoke final e revisão de compatibilidade das funcionalidades existentes.
