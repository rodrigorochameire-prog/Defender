# Agenda Sheet + Registro Modal — Redesign

**Data:** 2026-04-18
**Autor:** Rodrigo + Claude (brainstorming)
**Escopo:** melhorar UI/UX do `EventDetailSheet` e `RegistroAudienciaModal`

## Problema

Três atritos convergem na experiência de agenda:

1. **Botão invisível** — o "Abrir registro completo" vive no dropdown `⋯` do footer do sheet (`sheet-action-footer.tsx:76-78`), lado a lado com itens desabilitados ("em breve"). Usuário precisa conhecer o ícone e adivinhar que existe um modal mais completo.
2. **Header do sheet dissonante** — hoje competem três cinzas em ~80px: `bg-neutral-100/95` (header), `bg-[#f7f7f7]` (SheetContent) e `bg-[#c8c8cc]` hardcoded (card do assistido). O último está fora do Padrão Defender.
3. **Modal barulhento** — header com 7+ informações empilhadas, inputs de Juiz/MP inline no header, tabs sem sinal de completude, botão "Atualizar" duplicado, largura `98vw` sem respiro.

## Não-objetivos

- Refatorar lógica de mutations, schema de dados ou queries tRPC.
- Mudar comportamento das tabs `Briefing/Depoentes/Anotações/Resultado/Histórico` (conteúdo permanece).
- Tocar em `DepoenteCardV2`, `DocumentosBlock`, `MidiaBlock`, `AnalyzeCTA` — componentes de Fase 1-4 do redesign anterior ficam como estão.

## Design

### Parte 1 — Sheet footer: 3 botões iguais

**Arquivo:** `src/components/agenda/sheet/sheet-action-footer.tsx`

**Antes:**
```
[✓ Concluir] [↷ Redesignar] [⋯]   ← dropdown esconde "Abrir registro completo"
```

**Depois:**
```
[✓ Concluir] [↷ Redesignar] [📖 Registrar]
  emerald      outline        outline
```

- Dropdown `⋯` removido. Itens "em breve" (Decretar revelia, Suspender) saem — reaparecem quando implementados.
- Botão `Registrar` usa ícone `BookOpen` de `lucide-react`, chama `onAbrirRegistroCompleto` diretamente (prop já existe).
- Quick-note (Input + Send) acima permanece inalterado.
- Estados:
  - Audiência sem ID: todos disabled (comportamento atual).
  - Audiência concluída: `Concluir` fica disabled (atual); `Registrar` fica habilitado (usuário pode revisar/editar ata).

### Parte 2 — Sheet header e card assistido

**Arquivo:** `src/components/agenda/event-detail-sheet.tsx:225-294`

**Header superior (linha 231-242):**
- `bg-neutral-100/95 dark:bg-neutral-900/95` → `bg-neutral-900 dark:bg-neutral-950 text-white`
- Mantém: `backdrop-blur-md`, label "Evento", botão X.
- Altura compacta (~44px, `py-2.5`).
- Border-bottom some (dark header não precisa).
- X passa a ter `hover:bg-neutral-800` (no dark `hover:bg-neutral-800`).

**SheetContent (linha 227):**
- `bg-[#f7f7f7]` → `bg-white dark:bg-neutral-950`. Remove o off-white.

**Card do assistido (linha 247-294):**
- `bg-[#c8c8cc] dark:bg-neutral-800/60 border-neutral-300/40` → `bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800`
- **Nova faixa lateral de 3px na cor da atribuição:** `border-l-[3px]` usando o mesmo `SOLID_COLOR_MAP[filterKey]` que hoje vai no `boxShadow` do avatar (linha 255).
- Avatar perde o `boxShadow` colorido — fica `bg-neutral-100 dark:bg-neutral-800` simples. A faixa lateral assume a identidade da cor.
- Padding interno permanece (`px-4 py-4 rounded-xl`).

**ToC (linha 244):**
- Wrapper ganha `bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200`, para separar visualmente do conteúdo branco abaixo. Sem mudanças internas no componente `SheetToC`.

### Parte 3 — Modal header enxuto

**Arquivo:** `src/components/agenda/registro-audiencia/registro-modal.tsx:60-173`

**Estrutura nova (3 linhas):**

**Linha 1 — Ação/identidade (flex items-center):**
- Ícone `Gavel` em container `bg-foreground` (atual, linha 62-64, mantido).
- Título fixo: `"Registro de Audiência"` (não mais `evento.titulo`, que é redundante com a Linha 2).
- Badge `Salvo` ao lado do título, se `form.registroSalvo` (atual).
- Botão X à direita.
- Botão `Atualizar` do header **removido** (deduplica com footer).

**Linha 2 — Identificação (text-sm):**
- Assistido linkado (se `assistidoId`) · processo linkado (se `processoId`) · data formatada · horário.
- Uma linha só, truncate em telas pequenas. Separadores `·`.

**Linha 3 — Faixa de contexto (bg-neutral-50 dark:bg-neutral-900/40, py-1.5 px-4):**
- Badge `atribuição` (atual).
- Badge `vara` (novo — hoje vive dentro de "evento.local" via sheet, mas modal não mostra).
- **Juiz/MP removidos do header** — movem para aba Resultado em bloco 2 (este spec não toca neles; ficam onde estão no header até lá).

> **Decisão intermediária:** como mover Juiz/MP para aba Resultado é parte do Eixo 2 (bloco 2), **neste spec os inputs permanecem na Linha 3** para não deixar o formulário inacessível. Ficam em `px-4 py-1.5` mais compactos, mas sem mudança funcional. A migração para a aba Resultado vira um spec separado depois.

### Parte 4 — Completude visível

**Arquivos:**
- `src/components/agenda/registro-audiencia/historico/count-completude.ts` (helper existente)
- `src/components/agenda/registro-audiencia/registro-modal.tsx` (tabs + footer)

**Helper — refatorar retorno:**

Hoje retorna `number` (quantos de 5 preenchidos). Passa a retornar:
```ts
type CompletudeResult = {
  total: number;                              // 5
  filled: number;                             // 0..5
  byTab: Record<TabKey, "full" | "partial" | "empty">;
};
```

Lógica por aba (definir no próprio helper):
- **briefing**: `full` se `imputacao` + `fatos` existirem na análise IA consumida; `partial` se só um; `empty` se nenhum.
- **depoentes**: `full` se `depoentes.length > 0` e todos têm `tipo`; `partial` se existem mas algum sem tipo; `empty` se vazio.
- **anotacoes**: `full` se `registro.anotacoes.length > 0`; `empty` caso contrário.
- **resultado**: `full` se `statusAudiencia` !== `"pendente"`; `partial` se status definido mas sem campos complementares; `empty` se pendente.
- **historico**: `full` sempre que `registrosAnteriores.length > 0` ou `registroSalvo`; `empty` caso contrário.

**Visual nas tabs:**

No `registro-modal.tsx:178-202`, adicionar bolinha de 6px após o label/count:
- `full` → `bg-emerald-500`
- `partial` → `bg-amber-400`
- `empty` → `bg-neutral-300 dark:bg-neutral-700`

**Footer — popover de completude:**

O texto `2/5 preenchidos` (linha 291-295) vira um `Popover` (shadcn) trigger. Conteúdo:

```
Completude do registro
─────────────────────
✓ Briefing        (jump to tab)
✓ Depoentes (3)   (jump to tab)
○ Anotações       (jump to tab)
○ Resultado       (jump to tab)
○ Histórico       (jump to tab)
```

- Clicar num item chama `form.setActiveTab(key)` e fecha popover.
- Ícones: `Check` emerald (full), `CircleDashed` amber (partial), `Circle` neutral (empty).
- Popover com `align="start" side="top"` para não sair da tela.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/components/agenda/sheet/sheet-action-footer.tsx` | Remove dropdown `⋯`, troca por botão `Registrar` |
| `src/components/agenda/event-detail-sheet.tsx` | Header dark, card assistido com faixa lateral, remove `#c8c8cc` e `#f7f7f7` |
| `src/components/agenda/registro-audiencia/registro-modal.tsx` | Header reestruturado (3 linhas), bolinhas de completude nas tabs, footer com popover |
| `src/components/agenda/registro-audiencia/historico/count-completude.ts` | Muda assinatura: retorna `CompletudeResult` ao invés de `number` |

## Design tokens e regras

- Paleta: `neutral-*` do Padrão Defender + accent `emerald-500` (sucesso) e `amber-400` (parcial).
- Cor da atribuição vem do `SOLID_COLOR_MAP` já existente em `@/lib/config/atribuicoes`.
- Dark mode: toda classe clara tem contrapartida `dark:` testada.
- Cursor: `cursor-pointer` em todos os botões/trigger clicáveis (Padrão Defender).
- Transições: `transition-colors` 150ms nos hovers.

## Testing

- **Visual inspection**: rodar dev server em `~/projetos/Defender`, abrir agenda, clicar num evento:
  - Sheet abre com header escuro, card branco com faixa colorida.
  - Footer mostra 3 botões. `Registrar` abre modal.
- **Modal**:
  - Header em 3 linhas, sem botão Atualizar no topo.
  - Bolinhas aparecem em cada tab.
  - Clicar no `2/5 preenchidos` abre popover navegável.
- **Dark mode**: alternar tema e verificar contraste.
- **Regressão**: `concluir`, `redesignar`, `quick-note`, `abrir registro completo` continuam funcionando.

## Rollout

Mudança puramente visual/de componentes. Sem migration, sem env var, sem feature flag. Deploy via `/merge-main-push` direto no main (padrão do Defender).

## Fora de escopo (bloco 2 futuro)

- Mover inputs Juiz/MP do header do modal para a aba Resultado (Eixo 2).
- Reduzir largura do modal para `min(1280px, 95vw)` (Eixo 4).
- Timeline visual horizontal no lugar das tabs (Eixo 1 alt B).
- Timeline/wizard de completude expandida com campos faltantes clicáveis.
