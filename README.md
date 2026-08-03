# AniStream — Catálogo & Streaming de Animes 🎬

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)
![Status](https://img.shields.io/badge/Status-Ativo-emerald?style=for-the-badge)

**AniStream** é uma plataforma web moderna, rápida e responsiva para exploração, acompanhamento e reprodução de animes. Desenvolvida com Next.js 15 (App Router), React 19, TypeScript e dados consumidos exclusivamente pela API Kenjitsu self-hosted.

---

## 🌟 Funcionalidades Principais

### 🛡️ Primeiro Acesso & Assistente de Instalação (`/setup`)
- **Layout de Setup Isolado**: A página `/setup` possui um layout exclusivo de configuração, sem cabeçalho, rodapé ou elementos da navegação pública do site.
- **Redirecionamento Automático**: No primeiro boot da aplicação com banco virgem (`0` administradores), qualquer acesso é direcionado automaticamente para `/setup`.
- **Proteção por Chave Randômica (Setup Key)**: A rota `/setup` é protegida contra acessos não autorizados por uma chave única (`Setup Key`) exibida nos logs do container Docker (`docker logs anistream_app`).

### 📡 Extensões Kenjitsu (`/admin/extensions`)
- **Fontes nativas**: AniZone, AniKoto, AniDB, AniBD e AnimeHeaven são gerenciadas pelo fork self-hosted do Kenjitsu.
- **Ativação e teste ao vivo**: cada extensão pode ser ativada/desativada, marcada como NSFW e testada pelo painel, sem cadeia de fallback externa.

### 🎥 Player de Vídeo Avançado, Streams HLS & Embeds
- **Suporte HLS Adaptativo & iFrames**: Suporte a playlists HLS `.m3u8` via `hls.js` e renderização nativa em elementos `<iframe>` para provedores de embed.
- **Pular Abertura (+85s)**: Botão no player + atalho de teclado `S`.
- **Picture-in-Picture (PiP) Nativo**: Player flutuante desacoplado da janela.
- **Autoplay & Contagem Regressiva**: Contagem regressiva ao término de episódios.
- **Retomada de Precisão Automática**: Notificação toast e marcação do tempo de reprodução.
- **Modo Apagar as Luzes e Modo Cinema**: Fundo escuro focado no vídeo.

### 📢 Notificações em Lote (*Broadcast System*)
- Envio de alertas globais, avisos informativos e comunicados exibidos no banner superior do site.

### ✂️ Editor Visual de Capas e Posters (*Crop Editor*)
- Ferramenta de ajuste e recorte visual interativo para proporções 3:4 (Pôster) e 16:9 (Banner).

### 🔗 Detector de Links Quebrados (*Dead Link Finder*)
- Robô de varredura que desativa automaticamente fontes com 3 falhas consecutivas e alerta no painel.

### 💾 Backup e Restauração (Dump JSON)
- Exportação completa do banco de dados em JSON em 1 clique e restauração com suporte a *upsert*.

### 🚨 Reports de Erro pelo Usuário & Suporte
- Botão "Reportar Erro" no player de vídeo e fila de suporte no painel admin para resolução rápida.

### 🛠️ Modo Manutenção Agendado & Página de Changelog (`/changelog`)
- Bloqueio de acessos públicos durante atualizações (`/manutencao`) e linha do tempo de notas de versão em `/changelog`.

---

## 🧪 Testes Automatizados & Scripts de Validação

O AniStream conta com uma suíte completa de testes unitários integrados ao **Vitest** e um script de diagnóstico pré-deploy da infraestrutura Docker:

```bash
# Executar suíte de testes unitários (Crypto, Zod Schemas, SSRF, M3U, Title Normalizer)
npm run test

# Executar testes em modo interativo (Watch Mode)
npm run test:watch

# Gerar relatório de cobertura de código
npm run test:coverage

# Executar diagnóstico pré-deploy da infraestrutura Docker (Dockerfile, Compose, Prisma, Standalone)
npm run test:docker

# Comando Único Pré-Deploy (Testes Unitários + Diagnóstico Docker + Build Next.js)
npm run pre-deploy
```

Mais detalhes na documentação dedicada: [10-TESTES-E-SCRIPTS.md](file:///c:/Users/sodinha/Documents/projetos/anistream/docs/10-TESTES-E-SCRIPTS.md).



## 🐳 Execução via Docker Compose (Recomendado)

Suba toda a infraestrutura (PostgreSQL 16, Redis 7 e AniStream Web) com um único comando:

```bash
docker compose -f docker-compose.selfhosted.yml up -d --build
```

### Configuração Inicial (Primeiro Acesso):
1. Ao iniciar o container pela primeira vez, acesse `http://localhost:3000`.
2. O sistema redirecionará automaticamente para `http://localhost:3000/setup`.
3. Obtenha a **Chave de Instalação (Setup Key)** exibida nos logs do Docker:
   ```bash
   docker logs anistream_app
   ```
4. Insira a chave no assistente e cadastre a conta do Administrador Mestre.

---

## ⚡ Execução Local Sem Docker

### Pré-requisitos
- Node.js 20+ ou Bun
- PostgreSQL ativo

### 1. Instalar dependências:
```bash
npm install
```

### 2. Rodar migrações do banco e servidor de desenvolvimento:
```bash
npx prisma db push
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🛠️ Tecnologias Utilizadas

- **Core**: Next.js 15 (Standalone Mode), React 19, TypeScript
- **Banco de Dados & ORM**: PostgreSQL, Prisma ORM
- **Conteinerização**: Docker Multi-stage (`Alpine Linux`), Docker Compose
- **Estilização**: TailwindCSS, Vanilla CSS, Glassmorphic UI Design
- **Ícones & Animações**: Lucide React, Motion (`motion/react`)
- **Data Fetching**: `@tanstack/react-query` v5
- **Armazenamento**: LocalStorage, IndexedDB (`utils/offlineCacheDB.ts`)
- **API de dados e mídia**: [Kenjitsu](https://github.com/eosoda/kenjitsu) com [documentação](https://kenjitsu-docs.vercel.app/)
