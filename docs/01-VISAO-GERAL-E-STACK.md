# 01. Visão Geral e Stack Tecnológica — AniStream 🚀

## 📌 Visão Geral do Projeto
**AniStream** é uma aplicação web moderna voltada para fãs de animes, combinando navegação fluida, catálogo completo, suporte a reprodução de vídeo personalizada e recursos avançados de usabilidade (UI/UX) como busca instantânea por pré-visualização, contagem regressiva de episódios, alternador de visualização e funcionamento offline.

---

## 🛠️ Stack Tecnológica

### Core & Framework
- **Next.js 15 (App Router)**: Roteamento baseado em pastas, Server Components, Client Components e geração de páginas estáticas e dinâmicas.
- **React 19**: Biblioteca de interface de usuário com suporte às APIs modernas e hooks otimizados.
- **TypeScript 5 (Strict Mode)**: Tipagem estática para prever erros em tempo de desenvolvimento.

### Interface & Estilização
- **TailwindCSS**: Utilitários para criação rápida de layouts responsivos.
- **Vanilla CSS (`app/globals.css`)**: Tokens de design personalizáveis, temas escuros com cores `#0B0B0F` (Dark Canvas) e `#FF6B00` (Accent Orange), além de efeitos de Glassmorphism.
- **Lucide React**: Biblioteca de ícones SVG consistentes e leves.
- **Motion (`motion/react`)**: Animações de entrada, micro-interações e transições de layout.

### Consumo de Dados & Estado
- **@tanstack/react-query (v5)**: Gerenciamento avançado de estado de servidor, cache, invalidação e refetching automático.
- **Kenjitsu self-hosted**: Fonte única de catálogo, metadados, episódios, personagens, relações e mídias.
- **Extensões Kenjitsu**: Fontes de reprodução habilitáveis e testáveis pelo painel administrativo.
- **Redis**: Cache de respostas do Kenjitsu e coordenação de requisições quando configurado.

### Armazenamento Local & Offline
- **LocalStorage**: Persistência de favoritos do usuário, preferências de visualização e progresso de vídeos.
- **IndexedDB (`utils/offlineCacheDB.ts`)**: Armazenamento local de catálogo e animes para consumo em ambiente offline.

---

## 🎨 Diretrizes de Design & Estética
1. **Tema Escuro Nativo**: Paleta visual confortável para visualização noturna.
2. **Glassmorphism**: Painéis com fundo translúcido e `backdrop-blur-md` com bordas sutis (`border-white/10`).
3. **Micro-interações**: Feedback instantâneo ao passar o cursor, clicar ou realizar ações.
4. **Sem Placeholders Genéricos**: Imagens padrão e fallbacks visuais elegantes integrados via `SafeImage`.
