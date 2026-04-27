# Agenda · Fase 4 · Povoamento

**Data:** 2026-04-16
**Status:** Design aprovado — aguardando plano de implementação
**Escopo:** CTAs ativos para enfileirar análise IA nos empty states, link explícito áudio↔depoente (substituindo heurística), badges de frescor da análise.
**Fases anteriores:** Fase 1 Sheet UX, Fase 2 Documentos & Mídia, Fase 3 Histórico redesign.
**Fase seguinte:** nenhuma planejada. Fase 4 fecha o ciclo de pain-points levantados originalmente.

---

## Contexto

Fases 1-3 entregaram:
- Sheet lateral redesenhado com ToC, blocos colapsáveis, card de depoente rico e ações rápidas (Fase 1)
- Bloco de Documentos (tabs Autos/Assistido + preview + upload) e bloco de Mídia com player inline (Fase 2)
- Aba Histórico refeita com sub-tabs "Em edição" / "Anteriores" + timeline compacta (Fase 3)

Ficaram três gaps de UX que a Fase 4 resolve:

1. **Empty states passivos.** Campos como Imputação, Fatos, Laudos, Teses mostram "não disponível — rode a análise IA" como texto. Não há botão para rodar a análise de dentro da agenda; usuário precisa saber do `batch_juri_cowork.py` e rodá-lo na linha de comando.
2. **Link áudio↔depoente é só heurística.** Fase 2 introduziu `matchDepoenteAudio` que procura arquivo de áudio com nome parecido com o do depoente. Falha com homônimos ou nomes parciais. Nenhum jeito de corrigir manualmente.
3. **Zero sinal de frescor.** Não dá pra saber se os dados analisados são de hoje, da semana passada ou de três meses atrás. Análise antiga pode estar desatualizada sem aviso visual.

A infraestrutura de análise IA **já existe**:

- Tabela `claude_code_tasks` (fila canônica) em `src/lib/db/schema/casos.ts`.
- Endpoint `/api/analyze` (POST) enfileira jobs, deduplicando pending/processing.
- Worker `claude-code-daemon.mjs` processa jobs e atualiza `processos.analysisData` + `analysisStatus` + `analyzedAt`.
- Skill-por-atribuição e prompts já mapeados no endpoint.

Fase 4 apenas consome essa infra via UI.

## Objetivo

Fechar o ciclo: nenhum campo vazio sem ação clara, nenhuma heurística sem override manual, nenhuma análise sem indicador de frescor.

## Decisões de design (brainstorming validado)

| Área | Escolha | Racional |
|---|---|---|
| Trigger de análise | **CTA inline no empty state + polling 5s** | Mantém usuário no sheet; não bloqueia UI; auto-refresh ao concluir |
| Skill da análise | **Derivada da atribuição do evento** | Mesma lógica já existente em `/api/analyze` |
| Link áudio | **Coluna explícita + fallback heurístico** | Ground truth quando informado; heurística preserva funcionalidade quando ausente |
| UI de link | **Popover com lista de mídias do assistido/processo** | Reusa `midiasByAssistido` (já existe); não precisa inventar busca global |
| Frescor | **Badge pequeno com 4 faixas (hoje / semana / mês / stale)** | Faixas comunicam urgência de re-análise visualmente |

## Arquitetura

### Schema (1 coluna nova, zero tabelas)

```
testemunhas.audio_drive_file_id   varchar(100) NULL
```

Migration manual seguindo padrão da Fase 1 (`drizzle/NNNN_testemunha_audio_link.sql` aplicada via script node → postgres).

### Componentes novos (`src/components/agenda/sheet/`)

```
sheet/
├── analyze-cta.tsx           [new]
├── freshness-badge.tsx       [new]
└── vincular-audio-popover.tsx [new]
```

### Helpers novos

```
src/lib/agenda/
├── freshness-label.ts        [new pure helper]
└── match-depoente-audio.ts   [modify — prioriza audioDriveFileId]
```

### Mutations tRPC (1 nova)

`src/lib/trpc/routers/audiencias.ts` ganha:

```ts
vincularAudioDepoente: protectedProcedure
  .input(z.object({
    depoenteId: z.number(),
    audioDriveFileId: z.string().nullable(),
  }))
  .mutation(/* set/unset testemunhas.audioDriveFileId */)
```

Zero outras mutations. `/api/analyze` já existe e é chamado via `fetch` do cliente (ou via nova query em `trpc.analise.criarTask` se existir — verificar implementação atual).

---

### `AnalyzeCTA`

```tsx
interface Props {
  processoId: number | null;
  skill?: string;            // se omitido, deriva da atribuição do processo
  analysisStatus?: "idle" | "queued" | "processing" | "completed" | "failed";
  onTriggered?: () => void;  // pai inicia polling
}
```

Estados visuais:

- **idle / null / completed**: botão outline `⚡ Rodar análise IA` (emerald border, hover emerald bg).
- **queued**: spinner + texto "Enfileirada…" + tempo decorrido ("há 12s").
- **processing**: spinner + "Analisando…" + tempo decorrido.
- **failed**: ícone alerta + "Análise falhou" + botão retry.

`onClick` quando idle → `POST /api/analyze { processoId, skill }` → `onTriggered?.()` para pai ativar polling.

### `FreshnessBadge`

```tsx
interface Props {
  analyzedAt?: Date | string | null;
  className?: string;
}
```

Usa helper `freshnessLabel(analyzedAt)` → `{ label: string, tone: "emerald" | "neutral" | "amber" | "rose" } | null`:

| Delta | Tone | Label |
|---|---|---|
| `analyzedAt` null | — | oculto (retorna null) |
| `< 24h` | emerald | "hoje" (ou "agora" se < 1h) |
| `< 7d` | neutral | "Nd atrás" |
| `< 30d` | amber | "Nd atrás" |
| `>= 30d` | rose | "Nd atrás · reanalisar?" |

Badge rounded-full 9px, cores do `TONE_BG` (existente da Fase 3).

### `VincularAudioPopover`

```tsx
interface Props {
  depoenteId: number;
  currentAudioId: string | null;
  assistidoId: number;
  onChange?: () => void;
}
```

- Trigger: chip ou botão pequeno no `DepoenteCardV2` (aberto).
- Content: `Popover` (Radix) com `<Command>` (shadcn) listando mídias:
  - Busca `trpc.drive.midiasByAssistido({ assistidoId })` (existente).
  - Filtra apenas áudios (mimeType `audio/*`).
  - Input de busca simples.
  - Item: nome + data.
  - Opção "Nenhum (desvincular)" se já linkado.
- Click → `trpc.audiencias.vincularAudioDepoente.useMutation` → invalidate `getAudienciaContext`.

### `freshnessLabel` helper

```ts
// src/lib/agenda/freshness-label.ts
export interface FreshnessOutput {
  label: string;
  tone: "emerald" | "neutral" | "amber" | "rose";
}

export function freshnessLabel(analyzedAt?: Date | string | null): FreshnessOutput | null {
  if (!analyzedAt) return null;
  const ts = new Date(analyzedAt).getTime();
  if (Number.isNaN(ts)) return null;
  const deltaMs = Date.now() - ts;
  const h = deltaMs / 3_600_000;
  const d = h / 24;

  if (h < 1) return { label: "agora", tone: "emerald" };
  if (h < 24) return { label: "hoje", tone: "emerald" };
  if (d < 7) return { label: `${Math.floor(d)}d atrás`, tone: "neutral" };
  if (d < 30) return { label: `${Math.floor(d)}d atrás`, tone: "amber" };
  return { label: `${Math.floor(d)}d · reanalisar?`, tone: "rose" };
}
```

### Atualização `matchDepoenteAudio`

```ts
// src/lib/agenda/match-depoente-audio.ts (modified)
export function matchDepoenteAudio(
  depoenteNome: string,
  candidates: MediaFileCandidate[],
  explicitAudioId?: string | null   // novo parâmetro opcional
): string | null {
  if (explicitAudioId) return explicitAudioId;  // prioridade
  // ... resto igual (heurística fallback)
}
```

Chamada em `event-detail-sheet.tsx` passa `d.audioDriveFileId` como terceiro argumento.

## Fluxo de dados

### Trigger de análise

```
[AnalyzeCTA click] 
    ↓
POST /api/analyze { processoId, skill? }
    ↓
Insert claude_code_tasks (status=pending)
    ↓
UPDATE processos.analysisStatus = "queued"
    ↓
CTA muda pra "Enfileirada…" 
    ↓
Sheet ativa polling: refetch(getAudienciaContext) a cada 5s
    ↓
[daemon pega task, roda Claude Sonnet, grava analysisData + analyzedAt + analysisStatus=completed]
    ↓
Próximo refetch retorna dados novos
    ↓
Sheet re-renderiza blocos, empty states somem, badges de frescor aparecem
    ↓
Polling para (status=completed ou failed)
```

### Vincular áudio

```
[Click "🔗 Vincular áudio" no DepoenteCardV2]
    ↓
Abre VincularAudioPopover (buscar midias do assistido)
    ↓
Click num áudio
    ↓
trpc.audiencias.vincularAudioDepoente({ depoenteId, audioDriveFileId })
    ↓
UPDATE testemunhas SET audio_drive_file_id = X
    ↓
Invalidate getAudienciaContext
    ↓
Re-render DepoenteCardV2 com audioDriveFileId preenchido
    ↓
Botão "▶ Áudio" (Fase 2) fica ativo via match direto (prioridade sobre heurística)
```

## Padrão Defender v5

- `AnalyzeCTA`: outline emerald, `Loader2` spinner w/ animate-spin + motion-reduce fallback, `text-[11px] font-medium`.
- `FreshnessBadge`: `rounded-full px-1.5 py-0.5 text-[9px] tabular-nums`, cores de TONE_BG.
- `VincularAudioPopover`: Radix Popover width 280px, item height 32px, hover neutral-50, selected state border-emerald-400.

## Testes

### Unit (Vitest)

- `freshness-label.test.ts`: 6 casos (null, <1h, <24h, <7d, <30d, >30d).
- `match-depoente-audio.test.ts` (update): 2 novos casos (explicitAudioId presente → retorna ele; vazio → cai na heurística existente).

### Component (RTL + happy-dom)

- `analyze-cta.test.tsx`: 4 estados (idle, queued, processing, failed) + retry dispatches mutation.
- `freshness-badge.test.tsx`: 4 faixas + oculto quando null.
- `vincular-audio-popover.test.tsx`: abre popover, lista áudios filtrados, click seleciona, "Nenhum" desvincula.

### Integration (tRPC test caller)

- `vincularAudioDepoente`: grava audio_drive_file_id; passa null desvincula.

### Regression (event-detail-sheet)

- Empty state de Imputação mostra `AnalyzeCTA` (não mais texto passivo).
- Bloco com `analysisData.analyzedAt` recente mostra badge "hoje".
- Bloco com `analyzedAt > 30d` mostra badge "reanalisar?".

### Manual

- Sheet: click "⚡ Rodar análise" em caso sem imputação. CTA muda pra "Analisando…". Sheet refresca em até 5s após daemon completar.
- DepoenteCardV2 sem áudio: click "🔗 Vincular". Popover mostra 2-3 áudios do assistido. Select um. Depoente card atualiza, botão "▶ Áudio" ativa.
- Abrir evento de caso analisado há ~3 dias: badge neutral "3d atrás" aparece nos blocos analisados.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `/api/analyze` falha por skill não mapeada para certas atribuições | Frontend envia skill explícita quando sabe; fallback: endpoint retorna 400 e CTA mostra erro legível |
| Polling de 5s consome DB desnecessariamente | Polling só ativa enquanto status é queued/processing; para ao completar |
| Daemon offline: job nunca sai de queued | CTA de "retry" após timeout de 10min — descartar job antigo e enfileirar novo |
| Áudio linkado é deletado no Drive | Heurística continua como fallback; link explícito fica "morto" mas não quebra (só não reproduz) |
| `processos.analyzedAt` está null mas `analysisData` tem dados (legado) | `FreshnessBadge` simplesmente não renderiza; dados continuam visíveis |
| Popover com 50+ áudios fica lento | Input de busca + virtualização não necessária até passar de 100 itens; incluir note no código |

## Critérios de aceitação

1. Empty state de Imputação mostra botão "⚡ Rodar análise IA" em vez de texto passivo.
2. Idem para Fatos, Versão, Laudos, Contradições, Pendências, Teses.
3. Click no CTA enfileira job e muda UI para "Enfileirada…" / "Analisando…" com tempo decorrido.
4. Sheet refaz query a cada 5s enquanto status é queued/processing.
5. Sheet para de polling e atualiza blocos quando status é completed.
6. Erro (status=failed) mostra botão retry.
7. Coluna `testemunhas.audio_drive_file_id` aplicada no DB.
8. Mutation `vincularAudioDepoente` grava/desvincula.
9. `VincularAudioPopover` lista mídias do assistido via `midiasByAssistido`.
10. Link explícito prevalece sobre heurística em `matchDepoenteAudio`.
11. `FreshnessBadge` mostra faixa correta (emerald/neutral/amber/rose) por delta de tempo.
12. Badge some quando `analyzedAt` é null.
13. Zero regressão nas Fases 1-3.
14. Tests unitários, componentes e regressão verdes.

## Não-escopo

- Unificação de `DepoenteCard` (shared vs V2) — refactor sem valor UX, fica para limpeza futura.
- Bulk analyze (selecionar N audiências e enfileirar em lote) — pode ser feito via script até virar dor.
- Inline edit dos campos analisados (sobrescrever IA manualmente) — não foi pedido.
- Diff de reanálise (ver o que mudou entre análise antiga e nova) — fora do alvo.
