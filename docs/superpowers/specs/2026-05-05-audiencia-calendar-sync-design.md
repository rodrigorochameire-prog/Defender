# Audiência Calendar Sync — Design

**Data:** 2026-05-05
**Autor:** Rodrigo Rocha Meire (com Claude)
**Status:** Aprovado para implementação
**Branch:** `feat/audiencia-calendar-sync`

## Objetivo

Quando o defensor confirma uma audiência (via `AudienciaConfirmModal` ou criação direta), criar automaticamente o evento no **calendário Google certo** (por área: Júri, VVD, EP, Criminal), com **título, cor, local e lembretes coerentes** com a rotina da DPE. Atualizar / deletar o evento quando a audiência é redesignada ou cancelada.

## Estado atual (já mapeado)

- Schema `audiencias` **já tem `googleCalendarEventId: text`** (`src/lib/db/schema/agenda.ts:51`) + índice — sem migration necessária.
- `criarEventoAudiencia()` em `src/lib/services/google-calendar.ts:357` **existe**, mas:
  - Lê `GOOGLE_CALENDAR_ID` do env via `getConfig()` (single calendar)
  - Cor fixa azul (`CalendarColors.AZUL`) — não varia por tipo
  - Não conhece `area` da demanda
- `audiencias.create` (`src/lib/trpc/routers/audiencias.ts:692`) **só insere na tabela** — nunca chama o serviço Calendar.
- `audiencias.update`, `redesignarAudiencia` e `delete` **idem** — não tocam Calendar.
- `AudienciaConfirmModal` chama `audiencias.create` via `onConfirm` em `DemandaQuickPreview`/`demandas-premium-view`.
- OAuth é per-user (`user_google_tokens`), mas o serviço Calendar usa **refresh token compartilhado** via `GOOGLE_REFRESH_TOKEN`. Mantemos esse padrão (ainda single-tenant pra Rodrigo); per-user fica fora desta PR.

## Mudanças

### 1. Mapeamento `area → calendarId` (env-driven)

Novo módulo `src/lib/services/calendar-mapping.ts`:

```ts
export type AreaCalendar = "JURI" | "VIOLENCIA_DOMESTICA" | "EXECUCAO_PENAL" | "CRIMINAL" | "CRIMINAL_2_GRAU" | "DEFAULT";

const ENV_KEY: Record<AreaCalendar, string> = {
  JURI:                 "GOOGLE_CALENDAR_ID_JURI",
  VIOLENCIA_DOMESTICA:  "GOOGLE_CALENDAR_ID_VVD",
  EXECUCAO_PENAL:       "GOOGLE_CALENDAR_ID_EP",
  CRIMINAL:             "GOOGLE_CALENDAR_ID_CRIMINAL",
  CRIMINAL_2_GRAU:      "GOOGLE_CALENDAR_ID_CRIMINAL_2",
  DEFAULT:              "GOOGLE_CALENDAR_ID",
};

export function resolveCalendarId(area: string | null | undefined): string {
  const key = (area as AreaCalendar) ?? "DEFAULT";
  const envName = ENV_KEY[key] ?? ENV_KEY.DEFAULT;
  return process.env[envName] || process.env.GOOGLE_CALENDAR_ID || "primary";
}
```

Usuário configura as env vars no Vercel; sem var, cai no `GOOGLE_CALENDAR_ID` global, depois `"primary"`. Sem migration.

### 2. `createCalendarEvent` / `updateCalendarEvent` / `deleteCalendarEvent` aceitam `calendarId` opcional

Em `src/lib/services/google-calendar.ts`, adicionar parâmetro `calendarId?: string` em cada uma das 3 funções. Quando passado, sobrepõe `config.calendarId`. Sem mudança comportamental para chamadas existentes (omitido = comportamento antigo).

### 3. Cor do evento por tipo de audiência

Novo helper em `src/lib/services/calendar-mapping.ts`:

```ts
export function colorIdForAudiencia(tipo: string): number {
  const t = tipo.toLowerCase();
  if (/plen[áa]rio|j[úu]ri/.test(t))                      return CalendarColors.ROXO;
  if (/cust[óo]dia/.test(t))                              return CalendarColors.VERMELHO;
  if (/oitiva\s+especial|depoimento\s+sem\s+dano/.test(t)) return CalendarColors.LARANJA;
  if (/preliminar.*maria/.test(t))                        return CalendarColors.AMARELO;
  return CalendarColors.AZUL; // default
}
```

Reaproveita a paleta `CalendarColors` que já existe em `google-calendar.ts`.

### 4. `criarEventoAudiencia` evolui

Nova assinatura:

```ts
export async function criarEventoAudiencia(input: {
  assistidoNome: string;
  tipoAudiencia: string;
  dataAudiencia: Date;
  duracaoMinutos?: number; // default 60
  local?: string;
  numeroAutos?: string;
  area?: string;
}): Promise<CalendarEvent | null>;
```

Internamente:
- `calendarId = resolveCalendarId(input.area)`
- `colorId = colorIdForAudiencia(input.tipoAudiencia)`
- `endDate = startDate + duracaoMinutos`
- `summary = "🏛 {Tipo} — {Assistido}"` (Júri usa "⚖️", Plenário do Júri ainda mais distinto)
- Description inclui processo + tipo + atribuição
- Lembretes preservados (1 dia, 2h, 30min)

Mantém-se backward-compat aceitando os params antigos posicionais? **Não** — só uma chamada existente em `demandas.ts` (que mexe com prazo, não audiência). Quebrar é seguro.

### 5. `audiencias.create` chama Calendar e grava ID

Em `src/lib/trpc/routers/audiencias.ts:692-730`:

```ts
const [audiencia] = await db.insert(audiencias).values({...}).returning();

// Tentativa silenciosa de agendar no Calendar
const demanda = await db.query.demandas.findFirst({
  where: eq(demandas.processoId, input.processoId),
  columns: { area: true },
});

const evento = await criarEventoAudiencia({
  assistidoNome: assistidoNome ?? "",
  tipoAudiencia: input.tipo,
  dataAudiencia: new Date(input.dataAudiencia),
  local: input.local,
  numeroAutos: numeroAutos ?? undefined,
  area: demanda?.area,
});

if (evento?.id) {
  await db.update(audiencias)
    .set({ googleCalendarEventId: evento.id })
    .where(eq(audiencias.id, audiencia.id));
  return { ...audiencia, googleCalendarEventId: evento.id, calendarSyncOk: true };
}

return { ...audiencia, calendarSyncOk: false };
```

`assistidoNome` e `numeroAutos` precisam ser carregados — fazer JOIN ou query adicional dentro da mutation.

### 6. `audiencias.update`/`redesignarAudiencia` espelham mudanças no Calendar

- Quando `dataAudiencia`, `tipo`, `local` ou `horario` mudam, chamar `updateCalendarEvent(audiencia.googleCalendarEventId, {...novosDados})`.
- Se `googleCalendarEventId` for null (sync falhou na criação ou audiência legada), tentar criar agora — segunda chance.
- Sem evento e Calendar offline → continuar a operação local; o front exibe toast warning.

### 7. `audiencias.delete` remove o evento

Quando soft/hard-delete, chamar `deleteCalendarEvent(googleCalendarEventId)` se houver. Falha do Calendar não bloqueia o delete local.

### 8. Toast feedback no front

`AudienciaConfirmModal` recebe `calendarSyncOk` no callback do `mutate.onSuccess` e mostra:
- `calendarSyncOk: true` → toast.success "Audiência registrada e agendada no calendário"
- `calendarSyncOk: false` → toast.warning "Audiência registrada. Falha ao agendar no Google Calendar — verifique a integração"

Mesmo padrão para update.

## Não inclui (YAGNI)

- **Per-defensor calendars** — exige refatorar OAuth + revogar uso do refresh token global. Fica para a fase OMBUDS Scaling (memory `project_ombuds_scaling`).
- **Sync bidirecional** (Calendar → OMBUDS via webhook) — só one-way OMBUDS → Calendar.
- **UI de "agendar/não agendar"** — auto-schedule é sempre default ON; pra desligar, basta o usuário deletar o evento manualmente. Toggle adiciona ruído.
- **Inngest retry** quando Calendar offline — fail-silent + toast já cobre 95% dos casos.
- **Audiências múltiplas no mesmo dia** (conflito de horário) — não validamos; Calendar do Google já alerta.
- **Validação "data no passado"** — se o defensor está registrando uma audiência passada, é registro retroativo legítimo (raro mas existe). Sem warning.

## Edge cases tratados

| Caso | Comportamento |
|---|---|
| Sem `GOOGLE_CALENDAR_ID_<AREA>` | Cai em `GOOGLE_CALENDAR_ID` (default), depois `"primary"` |
| Calendar API offline | `audiencias.create` retorna `calendarSyncOk: false`; UI mostra warning toast |
| `googleCalendarEventId` null no update | Tenta criar evento agora ("segunda chance") |
| Redesignação (`update` data) | `updateCalendarEvent` move o evento existente |
| Delete | Remove evento e zera o campo |
| Audiência sem demanda vinculada | Sem `area` → cai no calendário default |

## Critérios de aceite

- [ ] Env var `GOOGLE_CALENDAR_ID_JURI` etc. respeitada por área
- [ ] Audiência confirmada via modal cria evento no calendário **da área** correspondente
- [ ] Cor do evento varia: Júri/Plenário = roxo, Custódia = vermelho, Oitiva Especial = laranja, Maria da Penha = amarelo, demais = azul
- [ ] `googleCalendarEventId` salva no row da audiência após sucesso
- [ ] Redesignação muda `dateTime` no evento existente (não duplica)
- [ ] Delete remove evento do Calendar e zera o campo
- [ ] Toast `success` quando Calendar sincroniza, `warning` quando falha
- [ ] Falha do Calendar **NÃO** bloqueia a criação local da audiência
- [ ] Sem regressão em `criarEventoPrazo` ou `criarEventoJuri` (que continuam usando o calendário default)
- [ ] Type-check + tests passam

## Self-review

**Placeholder scan:** sem TBD/TODO. Helper `resolveCalendarId` e `colorIdForAudiencia` definidos integralmente.

**Internal consistency:** todas as mutations (create/update/redesignar/delete) têm comportamento Calendar definido. Schema reaproveitado (campo `googleCalendarEventId` já existia).

**Scope:** PR maior que o action-card mas ainda focada (1 sub-feature). Cabe em plano único.

**Ambiguity:** "tipo audiência" usado pra cor é uma string livre vinda do modal — regex no helper já cobre os casos conhecidos; default azul é fail-safe. `area` da demanda é enum no banco, sem ambiguidade.
