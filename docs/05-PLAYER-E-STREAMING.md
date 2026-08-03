# 05. Player e experiência de streaming

O player do AniStream (`src/components/player/VideoPlayer.tsx`) recebe descritores de mídia resolvidos pelo Kenjitsu e pelas extensões habilitadas. A URL é resolvida on-demand quando o usuário inicia a reprodução; não há cadastro manual de stream no fluxo atual.

## 1. Recursos do player

- HLS adaptativo com `hls.js`;
- embeds retornados por extensões Kenjitsu;
- seleção de áudio, legendas e qualidade quando disponíveis;
- retomada de progresso e autoplay;
- Picture-in-Picture;
- modo cinema/apagar luzes;
- botão e atalho para pular abertura;
- relatório de problema conectado à fila administrativa;
- contagem regressiva e navegação para o próximo episódio.

## 2. Resolução e segurança

O caminho de mídia é:

```text
Episódio local
    ↓
Kenjitsu + extensões habilitadas
    ↓
descritores de mídia
    ↓
validateUrlSsrf + token/relay quando necessário
    ↓
VideoPlayer
```

`src/lib/streams/hls-validator.ts` valida status HTTP, `Content-Type` compatível e a tag `#EXTM3U`. `src/lib/security/ssrf.ts` bloqueia protocolos, portas e redes privadas indevidas.

## 3. Teste no painel

Em `/admin/animes/[id]/editar`, o `EpisodeSourcesModal` consulta candidatos live usando as extensões habilitadas e permite testar a reprodução antes de confirmar a seleção. O teste não cria uma lista de hosts nem transforma uma URL temporária em configuração permanente.

O painel `/admin/extensions` permite testar a fonte individualmente. O resultado é persistido como `ProviderHealthLog` com status `healthy`, `degraded`, `down` ou `unknown`, latência e erro.

## 4. Atalhos de teclado

| Tecla | Ação |
| :--- | :--- |
| `Espaço` / `K` | Reproduzir ou pausar. |
| `F` | Alternar tela cheia. |
| `M` | Mutar ou ativar som. |
| `C` | Alternar legendas. |
| `D` | Alternar modo cinema. |
| `J` / seta esquerda | Voltar 10 segundos. |
| `L` / seta direita | Avançar 10 segundos. |
| `N` | Ir para o próximo episódio. |
| `S` | Pular abertura quando houver intervalo configurado. |

## 5. Falhas

Falha de uma extensão não ativa fallback externo. O player mostra uma mensagem recuperável e o operador pode testar outra extensão habilitada, enquanto o admin exibe o health e o erro upstream.
