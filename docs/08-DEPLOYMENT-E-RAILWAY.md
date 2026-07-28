# 08. Guia de Hospedagem & Deploy no Railway / Docker 🚆

Este documento registra a configuração de conteinerização Docker e o guia passo a passo para o deploy da aplicação **AniStream** no **Railway.app**.

---

## 🏗️ 1. Arquitetura de Produção Escolhida no Railway

Com base nas decisões alinhadas:
1. **Banco de Dados**: PostgreSQL em Serviço Gerenciado do Railway (separado da aplicação web e conectado diretamente via `DATABASE_URL`).
2. **Mecanismo de Build**: `Dockerfile` Multi-stage de alta performance utilizando a saída `standalone` do Next.js 15.
3. **Migrações Automáticas**: Atualização automática do schema do PostgreSQL durante o boot do container (`npx prisma db push --skip-generate`).

---

## 🐋 2. Arquivos de Containerização Criados

### 🔹 [`Dockerfile`](file:///c:/Users/junin/Documents/projetos/anistream/Dockerfile) — Compilação Multi-stage
- **Estágio 1 (deps)**: Instala dependências usando `npm ci` no Node.js 20 Alpine.
- **Estágio 2 (builder)**: Gera os artefatos do Prisma (`npx prisma generate`) e realiza o build de produção `standalone`.
- **Estágio 3 (runner)**: Container leve com usuário de privilégio reduzido (`nextjs`), porta 3000 exposta e inicialização de migrações automáticas no boot.

### 🔹 [`docker-compose.yml`](file:///c:/Users/junin/Documents/projetos/anistream/docker-compose.yml) — Ambiente Local de Teste
- Inclui container do PostgreSQL 16 Alpine, Redis 7 e da aplicação Web Next.js 15.
- Permite testar localmente todo o ambiente antes de subir para a nuvem.

### 🔹 [`.dockerignore`](file:///c:/Users/junin/Documents/projetos/anistream/.dockerignore)
- Ignora pastas desnecessárias (`node_modules`, `.next`, `.git`, `tests`, `docs`) acelerando o tempo de build no Railway.

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
| `AUTHORIZED_MEDIA_HOSTS` | `media.seudominio.com,cdn.seudominio.com,s3.amazonaws.com` |
| `NEXT_PUBLIC_APP_URL` | `https://seu-app-anistream.up.railway.app` |

### 4️⃣ Deploy Automático
O Railway detectará o `Dockerfile` automaticamente, executará a compilação multi-stage de alta velocidade e aplicará o schema no PostgreSQL durante a subida da instância.
