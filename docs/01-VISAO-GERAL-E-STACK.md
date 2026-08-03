# 01. Visão geral e stack tecnológica

O AniStream é uma aplicação web para descoberta, acompanhamento e reprodução de animes. A arquitetura combina uma experiência pública cinematográfica com um painel administrativo denso e operacional.

## Stack principal

### Core

- **Next.js 15 App Router** para páginas, layouts e Route Handlers;
- **React 19** para componentes client/server;
- **TypeScript 5** em modo strict;
- **Prisma ORM** com PostgreSQL 16.

### Interface

- **Tailwind CSS** e tokens em `app/globals.css`;
- **Lucide React** para ícones;
- **Motion** para feedback e transições com reduced motion;
- **@tanstack/react-query** para cache e estado de servidor.

O produto mantém o tema dark e o laranja de playback. O modo público é image-led; o modo player é silencioso; o modo admin usa tabelas, filas, superfícies planas, status semântico e divisórias. Blur fica reservado a overlays, não é o material padrão de cards administrativos.

### Dados e mídia

- **Kenjitsu self-hosted**: fonte única de catálogo, metadados, episódios, personagens, relações e mídias;
- **Extensões Kenjitsu**: fontes habilitáveis, filtráveis e testáveis pelo admin;
- **Redis**: cache e coordenação do AniStream;
- **Redis do Kenjitsu**: cache/estado do serviço self-hosted;
- **PostgreSQL**: catálogo operacional local, usuários, episódios, configurações, auditoria e health;
- **LocalStorage/IndexedDB**: favoritos, progresso, preferências e cache offline do cliente.

## Fluxo de dados

```text
UI pública/admin
    ↓
Route Handlers do AniStream
    ├── PostgreSQL: estado local e operação
    ├── Redis: cache e coordenação
    └── Cliente Kenjitsu: catálogo, episódios e fontes live
             ↓
        Kenjitsu self-hosted
             ↓
        extensões habilitadas
```

Não existe fallback silencioso para APIs externas, scrapers, listas M3U ou fontes legadas. Uma falha upstream deve aparecer como erro, `degraded`, `down` ou `unknown` e ser tratada pelo operador.

## Design e acessibilidade

- Produto em português brasileiro;
- áreas operacionais com leitura rápida e ações explícitas;
- alvos de toque de pelo menos 44px;
- foco visível, `aria-current`, labels associados, live regions e dialogs acessíveis;
- suporte a teclado, reduced motion, 200% de zoom e larguras de 320 a 1440px;
- evitar placeholders genéricos e claims de disponibilidade que não estejam nos dados reais.

Consulte [`../DESIGN.md`](../DESIGN.md) para o contrato visual completo e [`09-PAINEL-ADMINISTRATIVO.md`](./09-PAINEL-ADMINISTRATIVO.md) para a composição do admin.
