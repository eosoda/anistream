# 10. Testes Automatizados & Scripts de Validação — AniStream 🧪

Este documento especifica a estratégia de testes unitários, scripts de automação, validação pré-deploy da infraestrutura Docker e comandos disponíveis no `package.json` do projeto **AniStream**.

---

## 🛠️ 1. Estrutura de Testes Automatizados (Vitest)

O AniStream utiliza o **Vitest** como test runner de alta performance integrado ao TypeScript. Todos os testes unitários residem no diretório [`src/__tests__/`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/__tests__/).

### Suítes de Testes Disponíveis

| Arquivo de Teste | Módulo Testado | Descrição dos Testes |
| :--- | :--- | :--- |
| **[`crypto.test.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/__tests__/crypto.test.ts)** | [`src/lib/security/crypto.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/lib/security/crypto.ts) | Criptografia/descriptografia AES-256-GCM de URLs de vídeo e headers sensíveis. |
| **[`admin-schemas.test.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/__tests__/admin-schemas.test.ts)** | [`schemas/admin.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/schemas/admin.ts) | Validação Zod de formulários e requisições para Broadcast, Webhooks, Releases e Manutenção. |
| **[`ssrf.test.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/__tests__/ssrf.test.ts)** | [`src/lib/security/ssrf.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/lib/security/ssrf.ts) | Bloqueio antifraude de URLs para IPs locais (`127.0.0.1`, `localhost`) e redes privadas. |
| **[`m3u-parser.test.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/__tests__/m3u-parser.test.ts)** | [`src/lib/streams/m3u-parser.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/lib/streams/m3u-parser.ts) | Parsing de playlists M3U brutos e extração de temporadas e episódios (`S01E01`, `1x05`). |
| **[`normalize-title.test.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/__tests__/normalize-title.test.ts)** | [`src/lib/anime/normalize-title.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/lib/anime/normalize-title.ts) | Normalização de títulos de animes, remoção de acentos, ordinais (`2ª Temporada`) e dublagem. |

---

## 🐳 2. Diagnóstico Pré-Deploy Docker (`scripts/verify-docker.js`)

O script [`scripts/verify-docker.js`](file:///c:/Users/sodinha/Documents/projetos/anistream/scripts/verify-docker.js) executa uma validação pré-flight completa da infraestrutura Docker em 5 etapas sem precisar rodar containers ativos:

1. **Dockerfile Multi-Stage**: Validação dos estágios `deps`, `builder`, `runner`, usuário seguro não-root `nextjs:nodejs`, exposição da porta `3000` e comando de boot com migração Prisma.
2. **docker-compose.yml**: Validação do PostgreSQL 16, Redis 7, variáveis de ambiente de produção e healthchecks.
3. **.dockerignore**: Confirmação do descarte de `node_modules`, `.next`, `.git` para manter a imagem enxuta.
4. **next.config.ts**: Validação do modo `output: 'standalone'`.
5. **Prisma Schema**: Confirmação dos modelos `Anime`, `Episode`, `EpisodeSource`, `MediaProvider`, `AutoIndexerQueue`, `AdminUser`.

---

## 📜 3. Guia de Execução dos Scripts (`package.json`)

Para rodar os testes e ferramentas no terminal, utilize os comandos mapeados no `package.json`:

```bash
# Executar toda a suíte de testes unitários
npm run test

# Executar testes em modo interativo (Watch Mode para desenvolvimento)
npm run test:watch

# Gerar relatório de cobertura de código dos testes
npm run test:coverage

# Executar diagnóstico pré-deploy da infraestrutura Docker
npm run test:docker

# Comando único Pré-Deploy (Roda os testes + diagnóstico Docker + Build de Produção)
npm run pre-deploy
```

---

## 🔄 4. Recomendações de Workflow Integrado

Antes de realizar um push para o repositório ou publicar em um ambiente de staging/produção, execute sempre o comando único:

```bash
npm run pre-deploy
```

Se o script retornar sucesso em todas as etapas, a aplicação estará 100% pronta e segura para ser implantada em produção.
