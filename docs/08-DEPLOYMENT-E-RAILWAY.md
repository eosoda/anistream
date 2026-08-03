# 08. Execução self-hosted e deployment futuro

O foco atual do AniStream é validação local. Railway não é usado nesta fase e nenhum comando deste guia deve ser executado como deploy sem uma decisão posterior explícita.

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
curl http://localhost:3001/api/extensions/health
docker compose ps
```

## 2. Contexto dos repositórios

O Compose espera os projetos irmãos:

```text
../anistream
../kenjitsu
../kenjitsu-extensions
../extensions-source
```

O `kenjitsu/Dockerfile.selfhosted` é compilado com os forks locais. A atualização deve acontecer no fork e entrar por PR; os repositórios oficiais não são alterados.

## 3. Variáveis locais

As variáveis estão documentadas em `.env.example`:

| Variável | Finalidade |
| :--- | :--- |
| `DATABASE_URL` | Conexão PostgreSQL. |
| `REDIS_URL` | Redis do AniStream. |
| `KENJITSU_BASE_URL` | URL interna/externa do Kenjitsu. |
| `KENJITSU_API_KEY` | Chave do Kenjitsu, quando habilitada. |
| `ADMIN_SESSION_SECRET` | Sessões administrativas. |
| `PLAYBACK_TOKEN_SECRET` | Tokens do playback. |
| `SOURCE_ENCRYPTION_KEY` | Descritores criptografados de mídia. |
| `INITIAL_SETUP_KEY` | Chave opcional do primeiro setup. |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação. |

Quando a aplicação roda dentro do Compose, use os nomes dos serviços (`postgres`, `redis` e `kenjitsu`) como hosts. `localhost` é reservado para executar o Next.js diretamente na máquina.

Não há `AUTHORIZED_MEDIA_HOSTS`, lista M3U ou configuração equivalente. As URLs de mídia chegam pelo Kenjitsu e passam pela validação SSRF do AniStream.

## 4. Primeiro acesso

1. Suba o Compose.
2. Abra `http://localhost:3000`.
3. Se o banco estiver vazio, siga para `/setup`.
4. Obtenha a chave nos logs de `anistream_selfhosted_app` se `INITIAL_SETUP_KEY` não estiver definida.
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

## 6. Railway — referência futura

Se houver decisão futura de hospedar no Railway, a adaptação deve preservar:

- PostgreSQL gerenciado e `DATABASE_URL` privado;
- Redis compatível com o cache do AniStream;
- Kenjitsu self-hosted acessível pela rede privada ou serviço separado;
- segredos fortes, sem valores padrão;
- health check em `/api/health`;
- execução de `prisma db push --skip-generate` somente após revisão do schema;
- smoke Kenjitsu e E2E antes de promover a versão.

Essa seção não autoriza deploy nem substitui um plano de infraestrutura aprovado. O ambiente de desenvolvimento e os testes desta branch são exclusivamente locais.
