# Detalhes da Demanda — Redesign

**Data:** 2026-05-05
**Autor:** Rodrigo Rocha Meire (com Claude)
**Status:** Aprovado para implementação
**Branch:** `feat/detalhes-redesign`

## Objetivo

Reorganizar a seção "Detalhes" do `DemandaQuickPreview` em **3 blocos** (Identificação · Cronologia · Ações), corrigir o clipping do dropdown de Tipo de Processo, tornar o status prisional editável, adicionar um campo de Vara/Órgão Julgador, e introduzir uma ação rápida "Agendar audiência" que abre o `AudienciaConfirmModal`.

## Estado atual

Arquivo: `src/components/demandas-premium/DemandaQuickPreview.tsx` (linhas ~1049–1302).

Estrutura atual:
1. Assistido (editable)
2. Atribuição (editable)
3. Prazo (editable + badge)
4. Expedição (read-only)
5. Atualizado (read-only, formato relativo)
6. Providências (preview line-clamp-2)
7. **Metadados** (collapsible) → Importado, Prisional (read-only), Tipo processo (editable, **clipa**), Batch ID

Problemas:
- **Dropdown de Tipo de Processo clipa** ao abrir (print: "PAP" expande mas é cortado pelo `overflow-hidden` do container em `DemandaQuickPreview.tsx:1057`).
- **Status prisional não é editável** — está dentro de Metadados como read-only, sem fluxo de edição.
- **Ordem mistura tempo + identidade** — atribuição e prazo entre dados de identidade e cronologia.
- **Sem ações rápidas** — pra agendar uma audiência o usuário precisa marcar `ato = "Ciência designação de audiência"` e esperar o modal aparecer; falta um caminho direto.
- **Vara/órgão julgador** não aparece, mesmo o dado existindo no `processos` schema.

## Mudanças

### 1. Fix do clipping do `InlineDropdown`

Causa: `DemandaQuickPreview.tsx:1057` envolve a lista de campos com `overflow-hidden` (necessário pros cantos arredondados + divisores). O `InlineDropdown` usa `position: absolute` relativo ao trigger, ficando preso dentro do container.

Solução: portar o conteúdo do dropdown via **React Portal** (`createPortal(...)`) renderizando em `document.body`, com posicionamento calculado a partir do `getBoundingClientRect()` do trigger. O resto da API do componente (`value`, `options`, `onChange`, `compact`, `displayValue`, `layout`) permanece igual.

Implementação em `src/components/shared/inline-dropdown.tsx`:
- Adicionar `useLayoutEffect` que mede o trigger e calcula `top/left` (com `alignRight` se faltar espaço).
- Trocar o `<div className="absolute ...">` da lista por `createPortal(<div style={{ position: 'fixed', top, left, ... }}>...</div>, document.body)`.
- Manter o `click-outside` listener (já está em `document`).

Sem refator das chamadas existentes (~3 callers).

### 2. Reorganizar Detalhes em 3 blocos

Substituir a lista única por três cards visuais:

#### Bloco A — Identificação
- Assistido (editable, como hoje)
- **Atribuição** (editable — sai do meio do bloco antigo)
- **Tipo de processo** (editable, sobe pra esse bloco — sai do Metadados)
- **Status prisional** (editável agora — vide §3)
- **Vara/órgão julgador** (novo, vide §5)

#### Bloco B — Cronologia (ordem nova)
1. **Expedição** (read-only, vem antes do prazo)
2. **Prazo** (editable + badge)
3. **Próxima audiência** (read-only, link → sheet de agenda; só aparece se houver)
4. **Importado** (read-only, sai do Metadados)
5. **Atualizado** (read-only, formato relativo, fica por último)

#### Bloco C — Ações rápidas
- `[📅 Agendar audiência]` — abre `AudienciaConfirmModal` (vide §4)
- `[⏰ Adicionar prazo]` — abre `InlineDatePicker` no campo Prazo (focus + open)
- `[🔗 Abrir no PJe]` — link para `processo.pjeUrl` (se houver)

Os 3 blocos compartilham o estilo visual existente (`rounded-xl`, `border`, `divide-y`), mas cada um vira seu próprio card com header `text-[10px] uppercase` (mesmo padrão de "Detalhes" hoje, mas três sub-seções).

### 3. Status prisional editável inline

Hoje: linha read-only `Prisional · solto`. Vira:

```
Prisional   [InlineDropdown: SOLTO ▾]
```

Opções:
- `SOLTO` (verde)
- `PRESO_PROVISORIO` (vermelho)
- `PRESO_DEFINITIVO` (vermelho-escuro)
- `MONITORADO` (laranja)
- `OUTRO` (cinza)

Salva em `assistidos.statusPrisional` via mutation `assistidos.updateStatusPrisional` (criar se não existir; alternativamente reaproveitar `assistidos.update` se aceitar parcial).

A pill exibida usa cor do mapping. Click → dropdown via Portal (mesmo padrão da §1).

### 4. Botão "Agendar audiência" abre o modal

Reaproveita o `AudienciaConfirmModal` que já existe (`src/components/demandas-premium/audiencia-confirm-modal.tsx`). Adicionar um trigger no Bloco C que:

- Abre o modal com `sources=[demanda.providencias, demanda.ato]` (parser preenche se houver).
- `assistidoNome=demanda.assistido`, `numeroAutos=processo?.numeroAutos`.
- Em sucesso, dispara `createAudienciaMutation` (já existente em `demandas-premium-view.tsx:836`).

Após o PR-B (calendar sync) mergear, esse fluxo já cria evento Calendar automaticamente — esta PR não precisa fazer nada Calendar-related.

State management: `demanda-quick-preview` provavelmente não é o owner do modal; o modal vive em `demandas-premium-view`. Precisa de uma prop nova: `onAgendarAudiencia?: (demandaId: string) => void`. A callback levanta o estado pra pai abrir o modal.

### 5. Vara/Órgão Julgador (novo campo)

Read-only no Bloco A. Lê de `processo.orgaoJulgador` (verificar nome real no schema antes — provavelmente em `src/lib/db/schema/core.ts`).

Se o valor for null, esconder a linha (não mostrar `—`).

### 6. UX polish

- **Datas em formato relativo curto onde fizer sentido**:
  - Expedição: "há 12 dias" + tooltip com `DD/MM/YYYY` exato
  - Prazo: já tem (badge)
  - Importado/Atualizado: já tem
- **Ícones consistentes**: todos usam Lucide com `w-3 h-3 text-neutral-400`.
- **Pills clicáveis com hint visual**: campos editáveis ganham um `border-b-dotted` no hover (sutil).
- **Hover em datas**: revela horário inline (sem tooltip JS — só CSS `group-hover:opacity-100`).

## Não inclui (YAGNI)

- **Drag-and-drop dos blocos** ou customização de ordem por usuário.
- **Mais campos da lista E** (último ato, recursos pendentes, marco importante, origem, contagem registros) — fica para PRs específicas se justificar.
- **Reposicionar o "Ofício sugerido"** — continua fora dos 3 blocos, no formato atual.
- **Migrar `InlineDropdown` pra Radix Popover** — Portal resolve o clip; refator maior fica fora.
- **Editar Vara/órgão Julgador inline** — só read-only nesta PR (edição vem se houver demanda).
- **Histórico de mudanças do status prisional** — só edita o campo direto.

## Critérios de aceite

- [ ] Dropdown "Tipo do processo" abre sem ser cortado pelo container, em qualquer tamanho de sheet
- [ ] Detalhes mostra 3 cards visualmente distintos (Identificação · Cronologia · Ações)
- [ ] Ordem da Cronologia: Expedição · Prazo · Próx. audiência (se houver) · Importado · Atualizado
- [ ] Status prisional clicável → InlineDropdown → salva e re-renderiza com nova cor
- [ ] Botão "Agendar audiência" abre `AudienciaConfirmModal` pré-populado com dados da demanda
- [ ] Vara/órgão julgador aparece quando há dado, esconde quando null
- [ ] Botão "Abrir no PJe" leva pra URL do processo (ou esconde se não houver)
- [ ] Datas com formato relativo + tooltip de data exata onde aplicável
- [ ] Sem regressão em outros consumidores do `InlineDropdown` (3 chamadas verificáveis no codebase)
- [ ] Type-check e tests passam
- [ ] Vercel preview renderiza sem layout shift no quick-preview de demanda

## Self-review

**Placeholder scan:** sem TBD. Todas as mudanças têm caminho de implementação concreto.

**Internal consistency:** §1 (clipping fix) é pré-requisito de §2 e §3 (Tipo + Prisional ambos usam dropdown). Layout dos blocos coerente com padrão Defender existente. Schema `assistidos.statusPrisional` é reutilizado (já existe).

**Scope:** PR média. ~250 linhas alteradas estimadas. Cabe num plano único.

**Ambiguity:**
- O nome real da coluna "vara/órgão julgador" no schema precisa ser verificado no plano. Se não existir, vira out-of-scope explícito.
- A mutation pra atualizar status prisional pode reaproveitar `assistidos.update` existente — confirmar no plano antes de criar uma nova.
