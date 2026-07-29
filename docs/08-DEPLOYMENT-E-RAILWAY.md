# 08. Guia de Hospedagem & Deploy no Railway / Docker 🚆

Este documento registra a configuração de conteinerização Docker e o guia passo a passo para o deploy da aplicação **AniStream** no **Railway.app** ou infraestruturas próprias via Docker Compose.

---

## 🏗️ 1. Arquitetura de Produção Escolhida no Railway

Com base nas decisões alinhadas:
1. **Banco de Dados**: PostgreSQL em Serviço Gerenciado do Railway (separado da aplicação web e conectado diretamente via `DATABASE_URL`).
2. **Mecanismo de Build**: `Dockerfile` Multi-stage de alta performance utilizando a saída `standalone` do Next.js 15.
3. **Migrações Automáticas**: Atualização automática do schema do PostgreSQL durante o boot do container (`npx prisma db push --skip-generate`).
4. **Proteção do Primeiro Acesso (`/setup`)**: No primeiro boot do container, qualquer acesso à aplicação é redirecionado automaticamente para `/setup`. A instalação exige a `Setup Key` gerada e emitida nos logs do container (`docker logs anistream_app`) ou configurada via `INITIAL_SETUP_KEY`.

---

## 🐋 2. Arquivos de Containerização Criados

### 🔹 [`Dockerfile`](file:///c:/Users/junin/Documents/projetos/anistream/Dockerfile) — Compilação Multi-stage
- **Estágio 1 (deps)**: Instala dependências usando `npm ci` no Node.js 20 Alpine com `apk add --no-cache libc6-compat`.
- **Estágio 2 (builder)**: Gera os artefatos do Prisma (`npx prisma generate`) e realiza o build de produção `standalone`.
- **Estágio 3 (runner)**: Container leve com usuário de privilégio reduzido (`nextjs`), porta 3000 exposta e permissões `--chown=nextjs:nodejs` em todas as pastas compiladas.

### 🔹 [`docker-compose.yml`](file:///c:/Users/junin/Documents/projetos/anistream/docker-compose.yml) — Ambiente Local de Teste
- Inclui containers do PostgreSQL 16 Alpine, Redis 7 e da aplicação Web Next.js 15.
- Inclui monitoramento de integridade via `/api/health` (Deep Check do banco de dados).

### 🔹 [`.dockerignore`](file:///c:/Users/junin/Documents/projetos/anistream/.dockerignore)
- Ignora pastas desnecessárias (`node_modules`, `.next`, `.git`, `tests`, `docs`, `.setup-key`) acelerando o tempo de build.

---

## 🚀 3. Passo a Passo do Deploy no Railway.app

### 1️⃣ Criar Projeto no Railway
1. Acesse o painel [Railway.app](https://railway.app).
2. Clique em **"New Project"** -> **"Deploy from GitHub repo"** e selecione o repositório do **AniStream**.

### 2️⃣ Adicionar o Banco de Dados PostgreSQL Gerenciado
1. No painel do projeto no Railway, clique em **"New"** -> **"Database"** -> **"Add PostgreSQL"**.
2. O Railway criará uma instância dedicada do PostgreSQL e disponibilizará a variável `${{Postgres.DATABASE_URL}}`.

### 3️⃣ Configurar Variáveis de Ambiente no Serviço Web
Acesse as configurações do seu serviço Web no Railway (**Variables**) e adicione:

| Variável | Valor Recomendado |
| :--- | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `ADMIN_SESSION_SECRET` | `sua-chave-secreta-admin-com-mais-de-32-caracteres` |
| `PLAYBACK_TOKEN_SECRET` | `sua-chave-secreta-jwt-com-mais-de-32-caracteres` |
| `SOURCE_ENCRYPTION_KEY` | `sua-chave-de-criptografia-aes256-com-32-bytes` |
| `INITIAL_SETUP_KEY` | *(Opcional) Define a chave manual para liberar o /setup* |
| `AUTHORIZED_MEDIA_HOSTS` | `media.seudominio.com,cdn.seudominio.com,s3.amazonaws.com` *(Baseline estática; domínios adicionais podem ser autorizados dinamicamente pelo Painel Admin em `/admin/sources`)* |
| `NEXT_PUBLIC_APP_URL` | `https://seu-app-anistream.up.railway.app` |

### 4️⃣ Deploy Automático e Primeiro Acesso
O Railway detectará o `Dockerfile` automaticamente, executará a compilação multi-stage de alta velocidade e aplicará o schema no PostgreSQL durante a subida da instância.
Após a inicialização, o primeiro acesso redirecionará para `/setup`. Consulte os logs do Railway para copiar a `Setup Key` randômica gerada e liberar a configuração.

---

## 💻 4. Scripts de Automação de Deploy Local e VPS

Para testes no seu próprio computador ou implantação rápida em um servidor próprio (VPS Ubuntu/Linux), utilize os scripts automatizados criados na pasta [`scripts/`](file:///c:/Users/sodinha/Documents/projetos/anistream/scripts/):

- **Atalho Node.js**:
  ```bash
  npm run deploy:local
  ```
  *(Executa a verificação pré-flight do Docker e instrui a inicialização dos containers)*

- **Windows PowerShell (`scripts/deploy.ps1`)**:
  ```powershell
  ./scripts/deploy.ps1
  ```
  *(Valida o ambiente e compila/suba automaticamente o Docker Compose no Windows)*

- **Linux / VPS / macOS (`scripts/deploy.sh`)**:
  ```bash
  ./scripts/deploy.sh
  ```
  *(Valida o ambiente e compila/suba automaticamente os containers no Linux)*

