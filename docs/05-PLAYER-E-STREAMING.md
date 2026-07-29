# 05. Player de Vídeo & Experiência de Streaming — AniStream 🎥

O player de vídeo do AniStream ([`src/components/VideoPlayer.tsx`](file:///c:/Users/junin/Documents/projetos/anistream/src/components/VideoPlayer.tsx)) foi atualizado na **Fase 1** com recursos avançados de usabilidade, atalhos globais, controle de velocidade e timestamps compartilháveis.

---

## 🚀 Recursos Avançados do Player

### 1. Menu Único de Configurações ⚙️ (Popover Multinível)
- **Design Limpo Estilo Netflix/YouTube**: Todos os controles avançados foram consolidados em um popover intuitivo com navegação multinível (Voltar `◄`):
  - 🎧 **Áudio & Legendas**: Seleção dinâmica de idiomas e faixas.
  - ⚡ **Velocidade de Reprodução**: `0.5x`, `0.75x`, `1.0x (Normal)`, `1.25x`, `1.5x`, `2.0x`.
  - 💡 **Apagar Luzes (Full-Page Blackout)**: Escurecimento de 95% de todo o layout da página web.
  - ⌨️ **Atalhos de Teclado**: Guia rápido de teclado integrado.
  - ⚠️ **Reportar Problema**: Formulário direto de feedback para o admin.

### 2. Pular Abertura (+85s) em Floating Pill
- **Pill Flutuante**: Posicionado estrategicamente no canto inferior direito sobre o canvas de vídeo ("Pular Abertura +85s").

### 3. Inicialização HLS (`hls.js`), Playlists `.m3u8` & Embeds iFrame
- **Suporte Adaptativo HLS**: Transmissão nativa de playlists HLS (`.m3u8`) via `hls.js` com controle automático de resolução e buffer.
- **Renderização Nativa de Embeds**: Fontes do tipo `embed` (como `2Embed`, `Xpass` e `ApiPlayer`) são renderizadas nativamente em um container `<iframe>` responsivo sem tentar forçar proxy de mídia.
- **Limite de Retentativas**: Máximo de 2 tentativas por servidor antes de realizar o fallback automático para a próxima fonte.
- **Auditoria de Erros HTML5 (`MediaError`)**: Mapeamento detalhado dos códigos de erro nativos (Rede, Decodificação, Codec Não Suportado) exibidos no Toast.

### 4. Carrossel de Binge-Watching de Episódios
- **Sliding Carousel abaixo do Player**: Carrossel horizontal deslizante com miniaturas, indicador *"Assistindo"* no episódio ativo e barra de progresso individual.


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
