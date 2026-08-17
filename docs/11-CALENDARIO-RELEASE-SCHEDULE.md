# Calendário semanal / Release Schedule

O calendário do AniStream exibe somente a programação aproximada dos animes: poster, título, dia da semana, horário convertido para o timezone do visitante e link para o título. Número de episódio, fonte e playback não fazem parte do contrato público.

## Fonte e projeção

O AniStream consulta exclusivamente o Kenjitsu self-hosted em:

```text
GET /api/anilist/airing/date/YYYY-MM-DD?page=1&perPage=50
```

O contrato do Kenjitsu Extensions inclui `airingAt` em cada evento. O app consulta todos os dias UTC necessários para cobrir a semana local, pagina até o fim da resposta, converte o timestamp para o timezone solicitado e arredonda para blocos de 30 ou 60 minutos. Eventos sem `airingAt` válido são descartados, nunca recebem um horário inventado.

O timezone do visitante vem de `Intl.DateTimeFormat().resolvedOptions().timeZone`. O fallback público é `America/Sao_Paulo`. A origem das regras manuais usa `Asia/Tokyo` por padrão.

## Persistência local

O banco mantém somente ajustes administrativos e não transforma o Kenjitsu em uma segunda fonte de catálogo:

- `ReleaseScheduleRule`: uma regra recorrente por anime, com `ADD`, `OVERRIDE` ou `HIDE`, dia, minutos, timezone de origem e estado ativo;
- `ReleaseScheduleException`: alteração pontual por anime/data, com `ADD`, `MOVE` ou `HIDE`.

A projeção segue esta prioridade:

```text
exceção da data → regra recorrente manual → Kenjitsu → oculto
```

O painel só permite selecionar animes existentes no catálogo local. A metadata continua sendo lida do catálogo/Kenjitsu.

## APIs

### Público

```text
GET /api/calendar?timezone=America/Sao_Paulo&weekStart=YYYY-MM-DD
```

`timezone` e `weekStart` são opcionais. A resposta contém `days`, `state`, `warnings`, `stale`, `weekStart`, `timezone` e `roundingMinutes`. Cada item de `days[].items` contém apenas `id`, `animeId`, `anilistId`, `title`, `posterUrl`, `date`, `weekday`, `time`, `origin` e `approximate`.

### Administração

```text
GET  /api/admin/calendar?timezone=America/Sao_Paulo
PUT  /api/admin/calendar
POST /api/admin/calendar/sync
```

As três rotas exigem `verifyAdminAuth`. O `PUT` recebe a configuração completa usada pela save bar (`settings`, `rules` e `exceptions`) e registra `calendar.updated` em `AdminAuditLog`. A sincronização manual invalida a versão do calendário, reconstrói a prévia e registra `calendar.sync_requested`.

## Cache e falhas

O resultado é cacheado no Redis por versão, semana, timezone, arredondamento e estado de sincronização. O TTL padrão é 30 minutos e pode ser alterado por `CALENDAR_CACHE_TTL_SECONDS`. Qualquer alteração salva no painel gera uma nova versão e evita servir a projeção anterior.

Se um dia consultado falhar no Kenjitsu, o resultado permanece disponível com `state: degraded` e aviso parcial. Regras manuais continuam aparecendo. Se não houver dados, a interface diferencia carregamento, vazio, indisponibilidade temporária e calendário parcial.

## Operação no painel

A rota `/admin/calendar` fica no grupo Gerenciar / Experiência e oferece:

- sincronização automática ligada/desligada;
- arredondamento de 30 ou 60 minutos;
- disponibilidade da página pública;
- prévia semanal em timezone selecionável;
- seleção de animes do catálogo para regra ou exceção;
- ativação, desativação, edição e remoção com confirmação;
- dirty state, save bar, feedback de sincronização e auditoria.

O formulário de regra usa um timezone de origem e um horário semanal. A exceção usa uma data no timezone de origem e pode mover, adicionar ou ocultar o anime naquele dia.

## Validação local

```bash
npx vitest run src/__tests__/calendar-time.test.ts
npx tsc --noEmit
npm run lint
npm test
npm run test:docker
npm run build
npm run test:e2e
```

O fluxo não exige cron local nem deploy automático. O stack local usa PostgreSQL, Redis, AniStream e Kenjitsu self-hosted pelo único `docker-compose.yml`; o cron de backup só é configurado no host da VPS durante o rollout autorizado.
