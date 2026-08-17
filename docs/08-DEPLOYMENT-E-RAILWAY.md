# 08. Execução self-hosted e deployment no Dokploy

O foco desta etapa é validação local. O beta será publicado no Dokploy somente após autorização explícita; os comandos abaixo não fazem deploy por si só.

## 1. Stack local oficial

O Compose self-hosted sobe:

1. PostgreSQL 16 para dados do AniStream;
2. Redis 7 para cache e coordenação do AniStream;
3. Redis 7 protegido para o Kenjitsu;
4. Kenjitsu self-hosted com as extensões registradas;
5. AniStream Next.js em modo standalone.

```bash
docker compose up -d --build
```

Health checks:

```bash
curl http://localhost:3000/api/health
docker compose exec kenjitsu wget --no-verbose --header="x-api-key: ${KENJITSU_API_KEY}" --spider http://127.0.0.1:3000/api/extensions/health
docker compose ps
```

## 2. Contexto dos repositórios

O Compose espera os projetos irmãos:

```text
../anistream
../kenjitsu
../kenjitsu-extensions
```

O `kenjitsu/Dockerfile.selfhosted` é compilado com os forks locais. Para o Dokploy, a imagem é publicada pelo workflow do Kenjitsu com refs imutáveis dos dois repositórios.

## 3. Variáveis locais

As variáveis estão documentadas em `.env.example`:

| Variável | Finalidade |
| :--- | :--- |
| `DATABASE_URL` | Conexão PostgreSQL. |
| `REDIS_URL` | Redis do AniStream. |
| `KENJITSU_BASE_URL` | URL interna/externa do Kenjitsu. |
| `KENJITSU_API_KEY` | Chave do Kenjitsu, quando habilitada. |
| `REDIS_PASSWORD` | Senha do Redis do AniStream. |
| `PLAYBACK_TOKEN_SECRET` | Tokens do playback. |
| `SOURCE_ENCRYPTION_KEY` | Descritores criptografados de mídia. |
| `INITIAL_SETUP_KEY` | Chave obrigatória e de uso único do primeiro setup em produção. |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação. |

Quando a aplicação roda dentro do Compose, use os nomes dos serviços (`postgres`, `redis` e `kenjitsu`) como hosts. `localhost` é reservado para executar o Next.js diretamente na máquina.

Não há `AUTHORIZED_MEDIA_HOSTS`, lista M3U ou configuração equivalente. As URLs de mídia chegam pelo Kenjitsu e passam pela validação SSRF do AniStream.

## 4. Primeiro acesso

1. Suba o Compose.
2. Abra `http://localhost:3000`.
3. Se o banco estiver vazio, siga para `/setup`.
4. Informe `INITIAL_SETUP_KEY` no cabeçalho do assistente `/setup`; em produção ela não é impressa nos logs.
5. Crie o administrador e confirme a conexão Kenjitsu.
6. Abra `/admin/extensions` e valide o health das fontes.

## 5. Gates antes de qualquer deployment futuro

```bash
npx tsc --noEmit
npm run lint
npm test
npm run test:e2e
npm run test:docker
npm run build
npm run test:kenjitsu
```

O `npm run pre-deploy` agrupa parte desses gates, mas continua sendo um comando local.

## 6. Dokploy — procedimento do beta

No Dokploy, mantenha PostgreSQL, os dois Redis e Kenjitsu sem portas públicas; somente
o AniStream recebe o domínio e a porta interna `3000`. Configure o Cloudflare em
Full (Strict), permita somente 80/443 e SSH restrito no firewall da VPS e não use
Basic Auth no domínio público. O login protegido é exclusivamente o `/admin`.

O workflow `eosoda/kenjitsu/.github/workflows/selfhosted-image.yml` deve concluir o
health check e o smoke das 12 extensões aprovadas antes de publicar a tag
`kenjitsu-<sha>-extensions-<sha>`. No serviço AniStream, execute `npm run deploy:migrate`
como etapa explícita antes de iniciar/reiniciar a aplicação. O startup não altera o
schema.

Backups PostgreSQL custom devem ser criados diariamente às 02:30 em
`/var/backups/anistream/postgres/`, com checksum, retenção e restore temporário
validados antes do beta. A ausência de cópia fora da VPS é um risco aceito apenas
durante o beta fechado.
