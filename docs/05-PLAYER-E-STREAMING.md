# 05. Player de Vídeo & Experiência de Streaming — AniStream 🎥

O player de vídeo do AniStream ([`components/player/VideoPlayer.tsx`](file:///c:/Users/sodinha/Documents/projetos/anistream/components/player/VideoPlayer.tsx)) e o sistema de resolvedor de mídias ([`src/lib/streams/resolver.ts`](file:///c:/Users/sodinha/Documents/projetos/anistream/src/lib/streams/resolver.ts)) oferecem uma experiência completa de reprodução com suporte adaptativo, proxy seguro e múltiplos provedores.

---

## 🚀 1. Recursos Avançados do Player

### 1. Menu Único de Configurações ⚙️ (Popover Multinível)
- **Design Estilo OTT**: Todos os controles avançados foram consolidados em um popover intuitivo com navegação multinível:
  - 🎧 **Áudio & Legendas**: Seleção dinâmica de idiomas (`Dublado PT-BR`, `Legendado JA`) e faixas.
  - ⚡ **Velocidade de Reprodução**: `0.5x`, `0.75x`, `1.0x (Normal)`, `1.25x`, `1.5x`, `2.0x`.
  - 💡 **Apagar Luzes (Full-Page Blackout)**: Escurecimento de 95% do layout da página web.
  - ⌨️ **Atalhos de Teclado**: Guia rápido de atalhos.
  - ⚠️ **Reportar Problema**: Formulário direto de feedback para o admin.

### 2. Pular Abertura (+85s) em Floating Pill
- **Pill Flutuante**: Botão flutuante posicionado no canto inferior direito ("Pular Abertura +85s").

### 3. Validação HLS `#EXTM3U`, Proxy Seguro & Embeds iFrame
- **Validação de Playlists HLS ([hls-validator.ts](file:///c:/Users/sodinha/Documents/projetos/anistream/src/lib/streams/hls-validator.ts))**: Validação automática do status HTTP, `Content-Type` (`application/x-mpegurl`, `application/vnd.apple.mpegurl`) e tag `#EXTM3U` no manifesto.
- **Preservação de Cabeçalhos**: O proxy seguro `/api/streams/proxy/[sourceId]` repassa fidedignamente os cabeçalhos `User-Agent`, `Referer` e `Origin` exigidos pelo provedor de origem.
- **Renderização Nativa de Embeds**: Fontes do tipo `embed` (como `2Embed`, `Xpass`, `WarezCDN` e `AnimesOnline`) são renderizadas nativamente em elementos `<iframe>` responsivos.
- **Resolução On-Demand**: A URL de mídia é resolvida dinamicamente no momento do clique em "Assistir".

### 4. Player de Teste Inline no Admin (`EpisodeSourcesModal`)
- No Painel Admin (`/admin/animes/[id]/editar`), o modal [`EpisodeSourcesModal`](file:///c:/Users/sodinha/Documents/projetos/anistream/components/admin/EpisodeSourcesModal.tsx) possui um player inline integrado para o administrador testar a reprodução do vídeo ou embed em tempo real antes de salvar.

---

## ⌨️ 2. Tabela de Atalhos de Teclado

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
