# Agenda — Polish UX (calendário + sheet lateral)

**Data:** 2026-04-28
**Escopo:** `/admin/agenda` — month view + day events sheet
**Status:** Aprovado para implementação

## Motivação

A página de agenda tem três fricções recorrentes no uso diário:

1. **Calendário extrapola a viewport** — em meses de 6 semanas, o usuário precisa rolar a página inteira para ver as últimas linhas, perdendo o cabeçalho e o filtro.
2. **Sheet do dia exige clique extra para acessar ações** — cada card colapsa atrás de um chevron e só revela `Realizado / Cancelar / Detalhes / Editar / Excluir` depois de expandir, dobrando o nº de cliques para a operação mais comum (marcar realizado).
3. **Título do evento polui o card** — aparece truncado como `JUSTIFICAÇÃO — JADSO…` no lugar de só `Justificação`, repetindo o nome do assistido (que já está na linha de baixo) e em caixa alta sem necessidade.

## Mudanças

### 1. Faixa de ações sempre visível no card do sheet

Eliminar a expansão por chevron. O card colapsado passa a renderizar:

```
┌─────────────────────────────────────────────┐
│ ●  08:00  Justificação                      │
│    Jadson de Jesus Machado                  │
│    📄 8003440-27.2023.8.05.0039  [copy]     │
│    ─────────────────────────────────────    │
│    [✓ Realizado]  [↗ Detalhes]    [hover: ✕ ✏ 🗑] │
└─────────────────────────────────────────────┘
```

**Sempre visíveis** (operações cotidianas):
- `✓ Realizado` — quick-change de status, ação mais frequente após audiência
- `↗ Detalhes` — abre o modal completo (substitui o duplo clique atual)

**Visíveis em hover** do card (operações ocasionais/destrutivas):
- `✕ Cancelar` — quick-change para cancelado
- `👤 Assistido` — link para perfil
- `✏ Editar` — abre modal de edição
- `🗑 Excluir`

Quando o evento já está concluído, a faixa mostra apenas o badge `✓ Realizado` em verde (estado terminal). Quando cancelado/redesignado, mostra `↻ Restaurar` no lugar de `Realizado/Cancelar`.

Local, atribuição, horário-fim e observações deixam de aparecer no card — quem precisa desses detalhes clica em **Detalhes**, que já existe e abre o modal completo. Isso reduz altura do card em ~50% e permite mais eventos visíveis sem rolar.

### 2. Título do evento — só o tipo, em Title Case

**Bug atual:** `extrairTipo()` no `day-events-sheet.tsx:94` faz split em `\s*[-–]\s*` (hífen + en-dash), mas os títulos vindos do PJe usam `—` (em-dash, U+2014). O resultado é que `firstSegment` recebe o título inteiro (`"JUSTIFICAÇÃO — JADSON DE JESUS MACHADO"`), excede 20 chars e é truncado em `"JUSTIFICAÇÃO — JADSO…"`.

**Fix:**
1. Trocar regex para `\s*[-–—]\s*` (inclui em-dash) — `firstSegment` passa a ser `"JUSTIFICAÇÃO"`.
2. Aplicar helper `toTitleCase()` que respeita siglas:
   - **Whitelist explícita:** `AIJ`, `PAP`, `ANPP`, `ANPL`, `IRDR`, `JECRIM`, `DPE`, `MPBA`, `MP`, `TJ`, `STF`, `STJ`, `CNJ`
   - **Heurística:** se o token tem ≤ 4 chars e é todo maiúsculo na string original, mantém maiúsculo
   - Demais palavras: primeira letra maiúscula, resto minúsculo, com tratamento para conectivos (`de`, `da`, `do`, `e`) que ficam minúsculos exceto se for a primeira palavra
3. O helper é exportado de `src/lib/utils/title-case.ts` (novo) e reutilizado onde mais aparecer texto cru do PJe (atribuição, local — quando aparecem em outras telas).

**Resultados esperados:**
| Antes | Depois |
|---|---|
| `JUSTIFICAÇÃO — JADSO…` | `Justificação` |
| `AIJ` | `AIJ` |
| `AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO` | `AIJ` (já mapeado em `tipoAbreviacoes`) |
| `AUDIÊNCIA CONCENTRADA` | `Audiência Concentrada` |
| `ANPP` | `ANPP` |
| `MEDIDAS PROTETIVAS` | `Med. Protetivas` |

### 3. Calendário cabe na altura da viewport

**Estado atual:** células com `min-h-[80px] sm:min-h-[120px]` (`calendar-month-view.tsx:452`) e nenhum teto, então 6 semanas × 120px = 720px só de células, somado a header + nav, ultrapassa a viewport em laptops 13".

**Plano:**
- Container raiz da página passa a usar `h-[calc(100dvh-<topbar>)] flex flex-col`
- Header do mês (botões prev/next, label) fica fixo no topo, `shrink-0`
- Grid das semanas: `grid-rows-[auto_repeat(N,1fr)]` onde `N = nº de semanas exibidas (5 ou 6)` — usa `flex-1` no wrapper
- Células: trocar `min-h-[120px]` por `min-h-0 overflow-hidden` e deixar a altura ser determinada pelo grid
- Lista de chips dentro da célula: `space-y-0.5` com `max-h-full overflow-hidden` e o botão `+N` (que já existe) abre o sheet quando há mais eventos do que cabe

**Tradeoff aceito:** em meses de 6 semanas e dias muito cheios (10+ eventos), só 2-3 chips ficam visíveis por célula, mas o `+N` resolve isso e o sheet do dia tem TODOS os eventos. Em troca, ganha-se: cabeçalho sempre visível, sem rolar a página, transição entre meses sem layout shift.

### 4. Não-escopo

- View de semana — segue como está
- Filtros e topbar — seguem como estão
- Modal de detalhes — segue como está
- Lógica de status, sync com Google Calendar, cores por atribuição — sem mudança

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/agenda/day-events-sheet.tsx` | Reescrever bloco do card: remover expansão por chevron, montar faixa de ações sempre/hover, remover seção expandida com info redundante. Trocar regex em `extrairTipo()` (em-dash) e aplicar Title Case |
| `src/components/agenda/calendar-month-view.tsx` | Container `h-[calc(100dvh-...)]` + grid `flex-1` + células `min-h-0 overflow-hidden` |
| `src/lib/utils/title-case.ts` (novo) | Helper `toTitleCase()` com whitelist de siglas e heurística |
| `src/app/(dashboard)/admin/agenda/page.tsx` | Ajuste de wrapper para que a altura calculada considere o topbar/filtros corretamente |

## Critérios de aceite

- [ ] Marcar `✓ Realizado` no sheet leva 1 clique (não 2)
- [ ] Calendário em mês de 6 semanas (ex.: ago/2026) cabe em viewport 1366×768 sem scroll na página
- [ ] Card mostra `Justificação` no lugar de `JUSTIFICAÇÃO — JADSO…`
- [ ] `AIJ`, `ANPP`, `PAP` continuam em maiúsculo
- [ ] Hover no card revela ícones de Cancelar / Editar / Excluir / Assistido sem layout shift
- [ ] Build verde, type-check verde, sem regressão visual em outras telas que usem `extrairTipo` ou `toTitleCase`
