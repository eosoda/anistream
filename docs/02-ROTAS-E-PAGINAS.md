# 02. Rotas e Páginas (App Router) — AniStream 🗺️

O AniStream utiliza o **Next.js 15 App Router** localizado na pasta `app/`. A estrutura de rotas organiza as páginas principais da aplicação.

---

## 🗺️ Mapeamento de Rotas

```text
app/
├── page.tsx                           # Rota "/" - Página Inicial (Home)
├── lista/page.tsx                     # Rota "/lista" - Catálogo Alfabético Geral
├── lista/importar/page.tsx            # Rota "/lista/importar" - Importador de Lista MAL
├── calendario/page.tsx                # Rota "/calendario" - Calendário Semanal de Lançamentos
├── pesquisa/page.tsx                  # Rota "/pesquisa" - Busca & Filtros Avançados
├── populares/page.tsx                 # Rota "/populares" - Ranking dos Mais Populares
├── temporadas/page.tsx                # Rota "/temporadas" - Lançamentos por Temporada/Ano
├── filmes/page.tsx                    # Rota "/filmes" - Catálogo Exclusivo de Filmes
├── favoritos/page.tsx                 # Rota "/favoritos" - Meus Favoritos & Novos Episódios
├── anime/[id]/page.tsx                # Rota "/anime/[id]" - Detalhes do Anime
├── anime/[id]/episode/[epNum]/page.tsx# Rota "/anime/[id]/episode/[epNum]" - Player de Episódio
├── error.tsx                          # Captura de Erros Nativos
├── global-error.tsx                   # Captura de Erros Globais da Aplicação
└── not-found.tsx                      # Página 404 Estilizada Nativa
```

---

## 📑 Descrição das Páginas

### 1. Página Inicial (`app/page.tsx`)
- **Banner Hero Carousel**: Carrossel em destaque no topo exibindo animes em alta da temporada com botões para assistir, sinopse curta e nota.
- **Carrosséis Temáticos**: Animes da Temporada Atual, Lançamentos da Semana, Filmes em Alta.
- **Seção Continuar Assistindo**: Card com barra de progresso dos animes iniciados pelo usuário.
- **Seção Recomendados Para Você**: Algoritmo de sugestão baseado no histórico do usuário.

### 2. Catálogo Geral (`app/lista/page.tsx`)
- **Filtro Alfabético (A-Z, #, Todos)**: Barra de letras rápida com arraste de cursor/touch.
- **Quick Multi-Filter**: Barra interativa no topo combinando Gênero, Status e Ordenação.
- **Alternador de Exibição**: Alterna entre Grade de Capas e Lista Compacta.

### 3. Busca e Filtros (`app/pesquisa/page.tsx`)
- **Pesquisa via Texto e Voz**: Integração com a Web Speech API para busca falada.
- **Filtros Avançados**: Status, Nota Mínima, Formato (TV, Filme, OVA), Idioma de Áudio.
- **Live Search Preview**: Busca rápida no Navbar com Top 5 resultados dinâmicos.

### 4. Mais Populares (`app/populares/page.tsx`)
- **Ranking Global**: Lista dos animes mais votados e favoritados no mundo segundo o MyAnimeList.
- **Filtros de Formato**: Séries TV, Filmes, OVAs, ONAs, Especiais.

### 5. Favoritos (`app/favoritos/page.tsx`)
- **Verificação de Novos Episódios**: Consulta automática à API Jikan indicando animes que receberam novos episódios recentemente (`NOVO EP`).
- **Lembretes de Lançamento**: Painel para gerenciar notificações semanais.
- **Configuração de Recomendações**: Toggle para ativar/desativar recomendações personalizadas.

### 6. Detalhes do Anime (`app/anime/[id]/page.tsx`)
- **Informações Completas**: Banner de capa, trailer oficial em modal, nota, estúdio, número de episódios, sinopse traduzida e tags de áudio (DUB/LEG).
- **Abas Internas**: Lista de Episódios com progresso de leitura, Elenco de Personagens e Dubladores, Animes Relacionados e Recomendações.

### 7. Reprodução de Episódio (`app/anime/[id]/episode/[epNum]/page.tsx`)
- **Player de Vídeo Customizado**: Player HTML5 totalmente customizado com navegação entre episódios, lista lateral, atalhos de teclado e contagem regressiva.
