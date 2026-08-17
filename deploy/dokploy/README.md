# Beta fechado no Dokploy

Esta pasta descreve a configuração do projeto `anistream-beta`. Os serviços
devem ser criados separadamente no Dokploy; o `docker-compose.yml` da raiz é
para desenvolvimento local e mantém apenas a porta do AniStream publicada.

## Serviços

| Serviço | Imagem/build | Porta interna | Volume | Exposição pública |
| --- | --- | ---: | --- | --- |
| `postgres` | `postgres:16-alpine` | 5432 | `/var/lib/postgresql/data` | não |
| `redis` | `redis:7-alpine` | 6379 | `/data` | não |
| `kenjitsu-redis` | `redis:7-alpine` com `--requirepass` | 6379 | `/data` | não |
| `kenjitsu` | tag imutável do GHCR | 3000 | nenhuma | não |
| `anistream` | Dockerfile deste repositório | 3000 | nenhuma | somente via Traefik |

Use a mesma rede privada do projeto. Os nomes de serviço acima são os nomes
DNS usados nas variáveis; se o Dokploy gerar nomes diferentes, substitua-os
consistentemente em todos os serviços e no script de backup.

Somente `anistream` recebe o domínio `https://anistream.giancarlojunior.com.br` e a porta
`3000`. Não crie `ports` para PostgreSQL, Redis, Kenjitsu Redis ou Kenjitsu;
use apenas a porta interna/expose do serviço.

## Imagem do Kenjitsu

O workflow `eosoda/kenjitsu/.github/workflows/selfhosted-image.yml` recebe os
dois refs, faz checkout dos repositórios irmãos, executa o build real e publica:

```text
ghcr.io/eosoda/kenjitsu-selfhosted:kenjitsu-<sha>-extensions-<sha>
```

No Dokploy, configure o registry GHCR como privado com uma credencial que
tenha somente leitura (`read:packages`) e use sempre a tag completa. Não use
`latest` no serviço do beta. O pacote deve permanecer privado enquanto o beta
for fechado. Se `kenjitsu-extensions` for privado, crie também no repositório
Kenjitsu um secret `CROSS_REPO_TOKEN` com acesso de leitura aos dois
repositórios; se forem públicos, o `GITHUB_TOKEN` padrão é suficiente.

## Variáveis

Defina os valores compartilhados no projeto Dokploy e injete os específicos em
cada serviço. Os arquivos `.env.example` nesta pasta são apenas um inventário;
não commite valores reais.

AniStream:

```text
DATABASE_URL=postgresql://<user>:<password-url-encoded>@postgres:5432/<db>?schema=public
REDIS_URL=redis://:<url-encoded-redis-password>@redis:6379
KENJITSU_BASE_URL=http://kenjitsu:3000
KENJITSU_API_KEY=<mesmo-segredo-do-kenjitsu>
INITIAL_SETUP_KEY=<segredo-de-uso-unico-com-24-ou-mais-caracteres>
PLAYBACK_TOKEN_SECRET=<segredo-aleatorio-com-32-ou-mais-caracteres>
SOURCE_ENCRYPTION_KEY=<segredo-aleatorio-com-32-ou-mais-caracteres>
NEXT_PUBLIC_APP_URL=https://anistream.giancarlojunior.com.br
TRUSTED_PROXY_IP_HEADER=CF-Connecting-IP
CACHE_WARM_WORKER_TOKEN=<segredo-aleatorio-com-32-ou-mais-caracteres>
```

Kenjitsu:

```text
PORT=3000
HOST=0.0.0.0
API_KEY=<mesmo-segredo-do-anistream>
REDIS_HOST=kenjitsu-redis
REDIS_PORT=6379
REDIS_PASSWORD=<senha-do-kenjitsu-redis>
REDIS_TLS=false
```

O container do Kenjitsu Redis deve usar:

```text
redis-server --appendonly yes --requirepass <senha-do-kenjitsu-redis>
```

Não reutilize `PLAYBACK_TOKEN_SECRET` ou `SOURCE_ENCRYPTION_KEY` como senha do
Redis. Gere cada segredo separadamente e guarde-os no gerenciador do Dokploy.

## Primeiro deploy

1. Aponte `anistream.giancarlojunior.com.br` para o IP da VPS.
2. Crie o projeto `anistream-beta` e os cinco serviços na mesma rede privada.
3. Crie os volumes persistentes do PostgreSQL, Redis AniStream e Redis Kenjitsu.
4. Configure o registry privado e publique uma tag imutável do Kenjitsu.
5. Faça o deploy do PostgreSQL, Redis e Kenjitsu Redis; depois do Kenjitsu; por fim do AniStream.
6. Execute `npm run deploy:migrate` como comando explícito de deploy do AniStream. O entrypoint não altera o banco e somente inicia o servidor.
7. Acesse `/setup`, informe `INITIAL_SETUP_KEY` e crie uma senha administrativa com pelo menos 12 caracteres.
8. Faça o smoke do Kenjitsu e mantenha inicialmente apenas a allowlist funcional registrada em `src/lib/kenjitsu/settings.ts`.
9. Não adicione Basic Auth: a página pública permanece aberta e somente `/admin` usa o login interno. Se for necessária uma restrição temporária, use uma allowlist de rede fora do fluxo público e documente a remoção.

## Pré-cache de reprodução

O painel em `/admin/cache` grava somente política e estado no PostgreSQL. URLs
temporárias e locks ficam no Redis AniStream e expiram em no máximo 240
segundos. As ações de aquecimento criam tarefas; um cron privado deve chamar o
worker, que não é exposto pelo Traefik:

```cron
*/5 * * * * curl -fsS -X POST http://anistream:3000/api/internal/cache/worker -H 'x-cache-worker-token: <segredo>' >/dev/null
```

Em um cron do host, execute o `curl` dentro da rede privada do projeto (ou use
o mecanismo de tarefas privadas do Dokploy). Nunca coloque o token no frontend
nem publique `/api/internal/cache/worker` na internet.

O endpoint `/api/health` só retorna `200` quando PostgreSQL, Redis AniStream e
Kenjitsu respondem. Ele expõe `services.kenjitsu` sem devolver mensagens de
erro internas.

Se um volume antigo já tiver tabelas criadas por uma ferramenta de push mas não tiver
`_prisma_migrations`, gere e verifique um dump antes de qualquer alteração.
Somente depois de comparar o schema e confirmar que a migration inicial
corresponde ao banco existente, faça o baseline uma única vez:

```bash
docker compose run --rm --no-deps app npx prisma migrate resolve --applied 20260816000000_initial
```

Não use esse baseline em um banco de produção desconhecido: ele registra a
migration como aplicada e não corrige diferenças de schema.

## Backups locais da VPS

O backup oficial é o dump custom do PostgreSQL. Configure um cron no host para
02:30 todos os dias:

```cron
30 2 * * * /opt/anistream/scripts/backup-postgres.sh >> /var/log/anistream-backup.log 2>&1
```

Antes, instale o script em `/opt/anistream/scripts/`, dê permissão de execução
e crie `/etc/anistream/postgres-backup.env` com as variáveis de
`backup.env.example`. O arquivo de ambiente deve ser `root:root` e `0600`.

O script grava em `/var/backups/anistream/postgres/`, usa `pg_dump --format=custom`,
gera SHA-256, aplica `0600`, mantém 14 dumps diários e 4 semanais. Ele precisa
da rede privada do Dokploy em `ANISTREAM_DOCKER_NETWORK` e do DNS interno do
PostgreSQL em `PGHOST`.

Teste a restauração em um banco temporário antes de liberar o beta:

```bash
set -a
. /etc/anistream/postgres-backup.env
set +a
PGDATABASE=anistream_restore_test \
  BACKUP_FILE=/var/backups/anistream/postgres/daily/<arquivo>.dump \
  /opt/anistream/scripts/restore-postgres.sh
```

Backups somente na mesma VPS não cobrem perda total do host. Esta é uma
limitação aceita para o beta; antes da abertura pública, copie os dumps para
um destino externo. Os backups de volume do Dokploy são voltados principalmente
para destinos S3: <https://docs.dokploy.com/docs/core/volume-backups>.

## Rollback e aceite

Para rollback, selecione no Dokploy a tag anterior completa do Kenjitsu e uma
imagem anterior do AniStream. Não aponte o serviço para `latest`.

O aceite mínimo é: HTTPS válido, health `200`, setup/login, catálogo, uma fonte
reproduzindo episódio, allowlist funcional, backup diário criado e restauração
em banco temporário validada.
