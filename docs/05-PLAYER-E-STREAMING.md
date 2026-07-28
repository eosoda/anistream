# 05. Player de Vídeo & Experiência de Streaming — AniStream 🎥

O player de vídeo do AniStream ([`components/player/VideoPlayer.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/components/player/VideoPlayer.tsx)) foi construído com foco em **maratonas (binge-watching)** e alta usabilidade, integrando atalhos de teclado e recursos inspirados em plataformas de streaming líderes de mercado.

---

## 🚀 Recursos Avançados do Player

### 1. Pular Abertura (+85s)
- **Botão dedicado**: Localizado na barra de controles do player ("Pular +85s").
- **Atalho de teclado**: Pressionar a tecla **`S`** avança instantaneamente 85 segundos.
- **Feedback visual**: Toast exibindo `Abertura Pulada (+85s)`.

### 2. Picture-in-Picture (PiP) Nativo
- **Botão nos controles**: Ícone de tela flutuante aciona a API nativa do navegador (`requestPictureInPicture()`).
- **Navegação Livre**: O vídeo continua sendo reproduzido em uma janela flutuante no canto da tela do sistema operacional enquanto o usuário navega em outras guias.

### 3. Retomada de Precisão Automática
- **Rastreamento de Progresso**: O player salva o tempo assistido no `localStorage` a cada 3 segundos via `useWatchProgress`.
- **Auto-seek**: Ao abrir um episódio previamente iniciado (> 10s), o vídeo busca e posiciona automaticamente no segundo exato onde parou.
- **Notificação**: Exibe toast informando que o vídeo foi retomado com opção de reiniciar do zero.

### 4. Modo Apagar as Luzes (Light Dimmer)
- **Destaque Visual**: Ao clicar em "Luzes Off" ou pressionar a tecla de luzes, uma camada escura 90% com efeito `backdrop-blur-md` cobre a página inteira, focando os olhos apenas no vídeo.
- **Desativação**: Pode ser desligado clicando no fundo escuro ou pressionando a tecla `Esc`.

### 5. Autoplay e Contagem Regressiva para Próximo Episódio
- Ao finalizar um vídeo (ou ao clicar em "Concluir Episódio"), um mini card flutuante aparece sobre o player exibindo uma contagem regressiva de 5 segundos.
- O usuário pode cancelar a transição ou clicar para ir imediatamente ao próximo episódio.

---

## ⌨️ Tabela de Atalhos de Teclado

| Tecla | Ação |
| :--- | :--- |
| **`Espaço`** / **`K`** | Play / Pausar Vídeo |
| **`S`** | Pular Abertura (+85s) |
| **`F`** | Alternar Tela Cheia |
| **`M`** | Mutar / Ativar Som |
| **`C`** | Alternar Modo Cinema |
| **`Seta Esquerda` (◄)** | Voltar 10 segundos |
| **`Seta Direita` (►)** | Avançar 10 segundos |
| **`Seta Cima` (▲)** | Aumentar Volume em 10% |
| **`Seta Baixo` (▼)** | Diminuir Volume em 10% |
| **`Esc`** | Sair do Modo Cinema ou Apagar as Luzes |
| **`?`** / **`H`** | Abrir Modal de Atalhos de Teclado |
