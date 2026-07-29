# 05. Player de Vídeo & Experiência de Streaming — AniStream 🎥

O player de vídeo do AniStream ([`src/components/VideoPlayer.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/src/components/VideoPlayer.tsx)) foi atualizado na **Fase 1** com recursos avançados de usabilidade, atalhos globais, controle de velocidade e timestamps compartilháveis.

---

## 🚀 Recursos Avançados do Player

### 1. Pular Abertura (+85s)
- **Botão dedicado**: Localizado na barra de controles do player ("Pular Intro +85s").
- **Avanço instantâneo**: Salta 85 segundos na linha do tempo.

### 2. Seletor de Velocidade de Reprodução (`SpeedSelector.tsx`)
- Opções disponíveis: `0.5x`, `0.75x`, `1.0x (Normal)`, `1.25x`, `1.5x`, `2.0x`.
- Atualização em tempo real via `video.playbackRate`.

### 3. Links com Timestamp Compartilhável (`?t=124`)
- Botão de compartilhamento no player gera a URL com o segundo exato (ex: `https://anistream.com/anime/123/episode/1?t=142`).
- Ao abrir o link, o player inicia automaticamente no timestamp definido.

### 4. Retomada de Precisão Automática (`usePlaybackProgress.ts`)
- Salva o progresso no `localStorage` a cada 5 segundos.
- Exibe barra de progresso visual nos cards dos episódios.

### 5. Modo Cinema (Dim Lights) (`CinemaOverlay.tsx`)
- Escurece a página com transição suave (`backdrop-blur-md`), focando a atenção no player.
- Atalho rápido via tecla **`D`**.

### 6. Autoplay e Contagem Regressiva para Próximo Episódio
- Exibe modal com contagem de 5 segundos no final do vídeo com opção de cancelar ou avançar imediatamente.

### 7. Resiliência no Proxy SSRF & Troca Automática de Servidor
- **Proxy SSRF (`/api/streams/proxy/[sourceId]`)**: Função `fetchUpstreamWithRetry()` com 2 retentativas automáticas e backoff exponencial (100ms, 300ms) quando o servidor de vídeo de origem responder com status 502/503/504 ou timeout.
- **Alternância Automática no Player**: Ao detectar falha no carregamento do stream (`onError`), o player alterna automaticamente para o servidor espelho seguinte e exibe um aviso toast: *"Servidor Instável. Alternando automaticamente para o servidor espelho..."*.


---

## ⌨️ Tabela de Atalhos de Teclado

| Tecla | Ação |
| :--- | :--- |
| **`Espaço`** / **`K`** | Play / Pausar Vídeo |
| **`F`** | Alternar Tela Cheia |
| **`M`** | Mutar / Ativar Som |
| **`C`** | Alternar Legendas |
| **`D`** | Alternar Modo Cinema (Dim Lights) |
| **`J`** / **`Seta Esquerda` (◄)** | Voltar 10 segundos |
| **`L`** / **`Seta Direita` (►)** | Avançar 10 segundos |
| **`N`** | Ir para o Próximo Episódio |
