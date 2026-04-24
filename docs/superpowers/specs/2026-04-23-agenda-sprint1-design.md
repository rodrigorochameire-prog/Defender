# Agenda — Sprint 1 (encaixe, padronização, prazos opt-in, criar rápido, Google sync)

**Data:** 2026-04-23
**Autor:** Rodrigo Rocha Meire (com Claude)
**Escopo:** redesign da página `/admin/agenda` para "facilitar o dia a dia" — sem refatorar a arquitetura geral.
**Prazo estimado:** ~1 sprint focado.
**Status:** brainstorming concluído, aguardando review.

---

## 1. Contexto e motivação

A agenda é a primeira tela de contato do dia. Hoje ela tem **3 problemas estruturais**:

1. **Não encaixa na tela** — header (~64px) + KPIs cards (~96px) + filtros (~48px) + padding consomem ~280px da vertical, sobrando pouco pro calendário; eventos cortam.
2. **Inconsistências entre views** — `calendar-week-view.tsx` (625 linhas) e `calendar-month-view.tsx` (545 linhas) evoluíram separadas. Mesmo evento aparece com cor, layout e indicadores diferentes; click abre popover (Week) vs sheet (Month).
3. **Falta integração** — prazos vivem em `calculos_prazos`, isolados do calendário. Google Calendar tem UI e schema prontos, mas falta o motor de sync.

Queixas concretas validadas pelo usuário:
- Encaixe na tela
- Padronização week ≡ month
- View "Próximos 7 dias" como default
- Prazos no calendário (opt-in)
- Criar evento rápido
- Google Calendar sync confiável

**Out of scope** deste sprint:
- Refatorar `agenda/page.tsx` (2.130 linhas) em componentes menores — fica pra Sprint 2 caso necessário
- Mobile-first da agenda (vai junto com o redesign mobile geral)
- View "Cockpit do dia" — boa parte dela já é coberta pela view "Próximos 7 dias"

---

## 2. Arquitetura geral

```
src/app/(dashboard)/admin/agenda/page.tsx        (header compacto + tabs de view + state)
src/components/agenda/
├── event-chip.tsx                               (NOVO — componente único, density compact|expanded)
├── upcoming-7-view.tsx                          (NOVO — view "Próximos 7 dias")
├── calendar-week-view.tsx                       (refatorado — usa EventChip)
├── calendar-month-view.tsx                      (refatorado — usa EventChip)
├── tipo-toggle-chips.tsx                        (NOVO — toggles audiência/prazo/atend/reuniao)
├── quick-add-inline.tsx                         (NOVO — input flutuante)
├── google-calendar-config-modal.tsx             (existente — completar wiring)
└── google-calendar-sync-modal.tsx               (existente — completar wiring)

src/components/shared/
├── processo-combo.tsx                           (NOVO — autocomplete de processo, reutilizável)
└── keyboard-shortcuts-dialog.tsx                (NOVO — modal "?")

src/hooks/
├── use-agenda-preferences.ts                    (NOVO — persiste tipos visíveis em localStorage)
└── use-agenda-shortcuts.ts                      (NOVO — registra atalhos)

src/lib/agenda/
├── event-style.ts                               (NOVO — mapa central tipo → cor/ícone)
├── event-indicators.ts                          (NOVO — bolinhas urgência/advogado/registro)
└── quick-add-parser.ts                          (NOVO — extrai tipo/hora/CNJ do texto livre)

src/lib/integrations/
└── google-calendar.ts                           (NOVO — service OAuth + upsert/delete)

src/lib/trpc/routers/
└── calendar.ts                                  (modificado — query unificada eventos+aud+prazos com filtro tiposVisiveis)
```

---

## 3. Seção 1 — Layout compacto

### Comportamento

- **Header colapsado em ~64px:** título + tabs de view (`7d` | `Sem` | `Mês` | `Lista`) + KPI chips inline (📅 12 / ⚖ 5 / 👥 4 / ⏱ 3) + botões `Hoje · ‹ ›` + `+ Novo` à direita.
- **Pills de atribuição** (Júri / VVD / EP / Criminal) numa barra dedicada (~36px) — sempre visíveis, 1-clique liga/desliga (componente `AtribuicaoPills` já existe).
- **Toggles de tipo** (linha seguinte, ~36px) — ver Seção 4.
- **Filtros secundários** (Tipo de evento detalhado, Defensor, Status) viram popover acionado por botão `⚙ Filtros` no header. Filtros ativos aparecem como pills inline removíveis.
- **KPIs cards removidos** — viram chips no header. Detalhe acessível via drawer "Estatísticas" (botão na direita do header).
- **Calendário usa `flex:1`** para ocupar toda a vertical restante.
- **Vertical total gasta:** ~100px (vs ~280px hoje). Recupera ~180px de calendário.

### Mudanças de código

- `agenda/page.tsx`: refatorar JSX do header (não mexer em state ou queries). Remover bloco `<KPIGrid>` da renderização principal.
- Manter `<CollapsiblePageHeader>` se já existe; senão criar bloco inline simples.
- Filtros secundários: extrair `AgendaFilters` para popover (componente já existe).

### Acceptance criteria

- [ ] Calendário Mês visível inteiro em viewport 1080p sem scroll vertical.
- [ ] Pills de atribuição clicáveis sem recarregar página.
- [ ] KPIs visíveis no header como chips.
- [ ] Filtros secundários acessíveis em ≤ 2 cliques.

---

## 4. Seção 2 — Padronizar Week ≡ Month

### Componente único `EventChip`

```tsx
type EventChipProps = {
  item: AgendaItem;                    // discriminated union (kind: evento|audiencia|prazo)
  density: "compact" | "expanded";     // compact = Month, expanded = Week | 7d
  onClick: () => void;                 // sempre abre EventDetailSheet
};
```

### Mapa central de cores e ícones

`lib/agenda/event-style.ts`:

```ts
export const EVENT_STYLE = {
  audiencia:   { color: "amber",   icon: "⚖", label: "Audiência" },
  prazo:       { color: "rose",    icon: "⏱", label: "Prazo" },
  atendimento: { color: "blue",    icon: "👥", label: "Atendimento" },
  reuniao:     { color: "violet",  icon: "📅", label: "Reunião" },
  outro:       { color: "neutral", icon: "•",  label: "Outro" },
} as const;
```

### Indicadores (bolinhas)

`lib/agenda/event-indicators.ts`:

- 🔴 Urgência (rose) — flag manual ou urgência derivada
- 🟡 Advogado constituído (amber) — campo no processo
- 🟢 Registro feito (emerald) — `audiencias_historico` tem entrada

Disponíveis em qualquer densidade. No `compact` aparecem como dots na linha; no `expanded`, como dots à direita do título.

### Refatoração

- `calendar-week-view.tsx`: substituir cards inline por `<EventChip density="expanded" />`. Remover popover de 320px; click chama `onClick` que abre `EventDetailSheet` (já usado pelo Month).
- `calendar-month-view.tsx`: substituir chips inline por `<EventChip density="compact" />`.

### Acceptance criteria

- [ ] Mesmo evento renderizado em Week e Month tem cor, ícone e indicadores idênticos.
- [ ] Click em qualquer view abre o mesmo `EventDetailSheet`.
- [ ] Mudar cor de um tipo (ex: prazo: rose → red) é uma única edição em `event-style.ts`.

---

## 5. Seção 3 — View "Próximos 7 dias" (default)

### Comportamento

- Lista vertical agrupada por dia: **Hoje** (badge verde) → **Amanhã** → datas nominais ("SEX, 25/abr") → **Fim de semana** colapsado em uma linha quando vazio.
- Range: hoje 00:00 → hoje + 7d 23:59.
- Cada dia mostra count ("3 eventos · 1 prazo").
- Dia vazio mostra "livre" (afirmativo, não silencioso).
- Cards usam `<EventChip density="expanded" />` da Seção 2.
- **Ações inline contextuais** nos cards:
  - Audiência → `📄 Dossiê` `📥 Autos`
  - Prazo → `✍ Peça` `✓ Marcar`
  - Atendimento → (sem ação inline, click abre sheet)
- Default da agenda: vira `7d`, mas `localStorage` lembra última escolha.

### Mudanças de código

- Adicionar `"7d"` ao tipo `viewMode`: `"calendar" | "week" | "list" | "7d"`.
- Novo `components/agenda/upcoming-7-view.tsx`.
- Atualizar `ViewModeDropdown` (já existe) com a nova opção.
- Default na primeira visita: `"7d"`.

### Acceptance criteria

- [ ] View "Próximos 7 dias" disponível e selecionável.
- [ ] Hoje destacado com badge verde.
- [ ] Fim de semana colapsa quando vazio.
- [ ] Ações inline funcionam (ao menos abrir destino correto).

---

## 6. Seção 4 — Prazos opt-in

### Regra principal

**Audiências sempre aparecem.** Demais tipos (prazos, atendimentos, reuniões, outros) são toggles off por default, ligados pelo usuário.

### `TipoToggleChips`

Linha logo abaixo das pills de atribuição:

| Chip | Default | Visual on | Visual off |
|---|---|---|---|
| ⚖ Audiências 🔒 | sempre on (não desliga) | amber preenchido | — |
| ⏱ Prazos | off | rose preenchido | branco com borda |
| 👥 Atendimentos | off | blue preenchido | branco com borda |
| 📅 Reuniões | off | violet preenchido | branco com borda |
| ⋯ Outros | off | neutral preenchido | branco com borda |

### Hook `useAgendaPreferences`

```ts
const { tiposVisiveis, toggleTipo } = useAgendaPreferences();
// tiposVisiveis: { audiencias: true, prazos: bool, atendimentos: bool, reunioes: bool, outros: bool }
// persistido em localStorage["agenda:tipos-visiveis"]
```

### Backend — query unificada

Endpoint `calendar.list` recebe `tiposVisiveis` e roda `Promise.all` condicional:

```ts
const [eventos, audiencias, prazos] = await Promise.all([
  tiposVisiveis.atendimentos || tiposVisiveis.reunioes || tiposVisiveis.outros
    ? db.select().from(calendarEvents).where(...)
    : Promise.resolve([]),
  // audiências sempre
  db.select().from(audiencias).where(...),
  tiposVisiveis.prazos
    ? db.select().from(calculosPrazos)
        .innerJoin(demandas, eq(calculosPrazos.demandaId, demandas.id))
        .where(and(
          gte(calculosPrazos.dataTermoFinal, dataInicio),
          lte(calculosPrazos.dataTermoFinal, dataFim),
          ne(demandas.status, "concluida"),
        ))
    : Promise.resolve([]),
]);

return [
  ...audiencias.map(a => ({ kind: "audiencia" as const, ...a })),
  ...eventos.map(e => ({ kind: "evento" as const, ...e })),
  ...prazos.map(p => ({ kind: "prazo" as const, ...p })),
];
```

### Visual de urgência (prazos)

3 níveis derivados de `dataTermoFinal - hoje`:

| Faixa | Cor | Badge |
|---|---|---|
| ≤ 1 dia | rose | "HOJE" / "AMANHÃ" |
| 2-5 dias | amber | "3D" |
| 6+ dias | neutral | "8d" |

### Notificação

Push in-app + WhatsApp 24h antes de prazos com urgência ≤ 1 dia (infra de notificação já existe).

### Acceptance criteria

- [ ] Audiências aparecem sem precisar ligar nada.
- [ ] Toggles ligam/desligam sem recarregar.
- [ ] Backend não consulta tabelas dos toggles desligados.
- [ ] Prazos aparecem com cor por urgência.
- [ ] Click em prazo abre `EventDetailSheet` com aba "Prazo".
- [ ] Ação `✍ Peça` abre editor com template do tipo de prazo.

---

## 7. Seção 5 — Criar evento rápido + atalhos

### Quick-add inline

- Em qualquer view, espaço vazio do dia mostra `+ clique aqui pra adicionar` (border dashed sutil).
- Click → input flutuante posicionado in-place, com placeholder "Audiência 14h Maria Santos 0009876".
- Parser (`lib/agenda/quick-add-parser.ts`) extrai:
  - **Tipo:** "audiência" | "atendimento" | "reunião" → mapeia
  - **Hora:** "14h" | "14:00" | "às 9h30" → `HH:MM`
  - **Processo:** regex CNJ `\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}` → vincula automático
  - **Resto:** título
- Sem CNJ: autocomplete por nome de assistido/réu (debounce 200ms, query em `assistidos`).
- Preview do parsed antes do Enter.
- `Enter` cria; `Esc` cancela; `⋯ Abrir modal completo` migra dados pro modal full.

### Modal completo — autocomplete de processo

- Substituir input texto livre (linha 386 de `evento-create-modal.tsx`) por `<ProcessoCombo />`.
- `components/shared/processo-combo.tsx` — combobox searchable, busca em `processos`, mostra nome do assistido + número CNJ + atribuição.
- Reutilizável em outras telas (demandas, atendimentos).

### Atalhos de teclado

| Categoria | Atalho | Ação |
|---|---|---|
| Navegação | `T` | Voltar pra hoje |
| Navegação | `J` ou `→` | Próximo período |
| Navegação | `K` ou `←` | Período anterior |
| Navegação | `1` `2` `3` `4` | View 7d / Sem / Mês / Lista |
| Ações | `N` | Novo evento (modal) |
| Ações | `/` | Buscar evento |
| Ações | `?` | Mostrar atalhos |
| Ações | `Esc` | Fechar modal/popover |

Hook `use-agenda-shortcuts.ts` registra com cleanup; **não dispara quando foco está em `<input>` ou `<textarea>`** (evita conflito de digitação).

### Acceptance criteria

- [ ] Click em espaço vazio do dia abre quick-add inline.
- [ ] Parser identifica tipo/hora/CNJ corretamente em ≥ 90% dos casos comuns.
- [ ] Modal completo usa autocomplete, não texto livre.
- [ ] Todos atalhos funcionam e não conflitam com inputs.
- [ ] `?` abre dialog listando atalhos.

---

## 8. Seção 6 — Google Calendar (Fase 1: export only)

### Decisões confirmadas

- **(A)** Apenas Fase 1 (OMBUDS → Google, export only). Fase 2 (Google → OMBUDS read-only) fica pra próxima rodada.
- **(B)** Sincronizar audiências e eventos. **Prazos NÃO** vão pro Google (são alertas internos, virariam ruído no calendário pessoal).
- **(C)** **Um calendário por atribuição** no Google: "OMBUDS — Júri", "OMBUDS — VVD", "OMBUDS — EP", "OMBUDS — Criminal". Cor por atribuição (emerald / amber / blue / slate).

### Service `lib/integrations/google-calendar.ts`

```ts
export class GoogleCalendarService {
  constructor(private userId: number) {}

  async ensureCalendar(atribuicao: Atribuicao): Promise<string>; // retorna googleCalendarId
  async upsertEvent(localItem: AgendaItem, googleEventId?: string): Promise<string>;
  async deleteEvent(googleEventId: string, googleCalendarId: string): Promise<void>;
}
```

### OAuth

- Adicionar scope `https://www.googleapis.com/auth/calendar.events` ao OAuth do Google (já existe pra Drive em `user_google_tokens`).
- Reuso do refresh-token existente.
- Token expirado → notificação WhatsApp + indicador vermelho no header.

### Hooks de sincronização

- `eventos.create` / `eventos.update` / `audiencias.create` / `audiencias.update` → após commit local, chama `googleCalendar.upsertEvent()` em `Promise.allSettled` (não bloqueia o save).
- `eventos.delete` / `audiencias.delete` → após commit local, chama `googleCalendar.deleteEvent()`.
- Falha → enfileira em nova tabela `sync_queue` para retry com backoff exponencial.

### Schema

- Reaproveitar `google_calendar_event_id` em `audiencias` e `calendar_events` (já existe).
- Nova tabela `sync_queue`:

```sql
CREATE TABLE sync_queue (
  id            SERIAL PRIMARY KEY,
  user_id       INT REFERENCES users(id),
  operation     VARCHAR(20),         -- 'upsert' | 'delete'
  entity_type   VARCHAR(20),         -- 'audiencia' | 'evento'
  entity_id     INT,
  payload       JSONB,
  attempts      INT DEFAULT 0,
  last_error    TEXT,
  next_retry_at TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### Cron de retry

- Novo cron horário em `inngest` (já usado): processa `sync_queue` com `attempts < 5`, backoff `2^attempts` minutos.
- Após 5 tentativas, marca como `failed` e notifica usuário.

### Indicador no header da agenda

| Estado | Visual |
|---|---|
| Conectado, sync ok | dot verde + "última sync 2 min atrás" |
| Pendente | dot amarelo + "sincronizando 3 itens..." |
| Falha (token expirado) | dot vermelho + botão "Reconectar" |
| Não conectado | botão sutil "Conectar Google Calendar" |

### Acceptance criteria

- [ ] Audiência criada no OMBUDS aparece no calendário "OMBUDS — &lt;Atribuição&gt;" do Google em ≤ 30s.
- [ ] Edição local reflete no Google.
- [ ] Exclusão local remove do Google.
- [ ] Falha de sync não bloqueia save local.
- [ ] Token expirado → notificação WhatsApp.
- [ ] Calendários no Google têm cor por atribuição.

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Refatorar componentes Week/Month quebra fluxos existentes | Manter testes manuais smoke (week + month + list) antes de cada commit; PR pequeno por seção |
| Quick-add parser interpreta texto errado | Mostrar preview antes do Enter; permitir editar antes de criar |
| Google Calendar API rate limit (atende muitos defensores) | `Promise.allSettled` + `sync_queue` com backoff; quota é por usuário OAuth (não compartilhada) |
| Localstorage de preferências corrompido | Try/catch + fallback para defaults |
| Atalhos conflitam com fluxos existentes (input, textarea, modal aberto) | Hook ignora eventos quando `document.activeElement` é input/textarea ou existe modal aberto |
| Token Google expira sem usuário perceber | Notificação WhatsApp + badge vermelho no header |

---

## 10. Ordem de implementação sugerida

1. **Seção 2** (EventChip + event-style) — base para 3 e 4
2. **Seção 1** (layout compacto) — entrega visual rápida, valida UX
3. **Seção 3** (view 7d) — usa EventChip
4. **Seção 4** (toggles + prazos integrados) — usa query unificada
5. **Seção 5** (quick-add + atalhos) — independente
6. **Seção 6** (Google sync Fase 1) — backend isolado, plugagem nos hooks tRPC

---

## 11. Métricas de sucesso

Após o sprint, espera-se:

- Tempo médio para criar audiência: **3-5 cliques → 1 atalho `N` ou clique + Enter**
- Cliques pra ver "o que tenho hoje": **0** (view 7d default já mostra)
- Eventos cortados na agenda: **0** em viewport 1080p
- Visualização de prazos no calendário: **possível** (era impossível)
- Audiências sincronizadas no Google Calendar do celular: **automático**
