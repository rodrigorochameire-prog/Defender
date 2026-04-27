# Briefing Polish + Preview de Documentos-Fonte

**Data:** 2026-04-18 (bloco 3 do redesign de agenda)
**Autor:** Rodrigo + Claude
**Escopo:** polir as seções expandidas da aba Briefing do modal de Registro (cockpit de audiência) + adicionar preview de laudos/termos de depoimento a partir do Drive.

## Contexto

No bloco 2 (2026-04-18 manhã) o header do modal, o sheet e a completude foram redesenhados. O modal foi reconceituado como **cockpit de audiência** — espaço de foco profundo em uma audiência específica, complementar ao sheet lateral (consulta rápida).

A Briefing é hoje a aba-central desse cockpit (9 seções em `SectionCard` colapsáveis). A estrutura funciona, mas o visual quando as seções estão expandidas é pálido, inconsistente com o design system (cores `zinc-*` em vez de `neutral-*`), e falta interação útil para o momento pré-audiência: marcar pendências, comparar versões lado-a-lado, consultar laudos direto da fonte.

## Problema

1. **Versão do Acusado** empilha Delegacia + Defensoria em cascata; comparar é trabalhoso.
2. **Depoentes** mostra cards sem agrupamento por lado nem status de oitiva visível.
3. **Pendências** é lista passiva — não dá para marcar como resolvida nem criar anotação rápida a partir dela.
4. **Laudos e termos** só existem como texto extraído pela IA — o defensor quer abrir o PDF-fonte para conferir durante a preparação.
5. **Polish geral** — Resumo Executivo, Fatos, Elementos, Contradições, Investigação Defensiva, Teses, Imputação precisam respirar mais, usar paleta correta, e trocar `SectionCard` local pelo `CollapsibleSection` do sheet para consistência.

## Não-objetivos

- Reestruturar a navegação da Briefing (sub-tabs, grid, reordenação). Estrutura atual fica.
- Tocar em mutations, schema, tRPC novos. Só consumir `trpc.drive.filesByProcesso` existente.
- Persistir vínculos documento→depoente/laudo em banco (fase 2 futura).
- Tocar nas outras abas do modal (Depoentes, Anotações, Resultado, Histórico) além do que é reflexo direto de mudanças nos componentes compartilhados.

## Design

### Parte 1 — Versão do Acusado (side-by-side)

**Arquivo:** `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx`

Bloco "Versão do Acusado" vira grid de 2 colunas em `md+`:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  <div className="rounded-lg bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 p-3">
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-2 h-2 rounded-full bg-blue-500" />
      <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500">Delegacia</span>
    </div>
    {/* conteúdo versaoDelegacia ou empty hint */}
  </div>
  <div className="rounded-lg bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 p-3">
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500">Defensoria ({atendimentos.length})</span>
    </div>
    {/* stack de atendimentos com data + badge tipo + resumo */}
  </div>
</div>
```

Em `<md` empilha (grid colapsa para 1 coluna). Cards com scroll vertical se conteúdo longo (`max-h-96 overflow-y-auto` por card).

### Parte 2 — Depoentes (mix B+C+A)

**Arquivo:** `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` (bloco Depoentes) + `src/components/agenda/registro-audiencia/shared/depoente-card.tsx` (botão "Ver termo")

**Toggle de vista no topo do bloco:**
```tsx
<div className="flex items-center gap-1 mb-3">
  <button className={isPorStatus ? "active" : ""} onClick={() => setVista("status")}>Por status</button>
  <button className={!isPorStatus ? "active" : ""} onClick={() => setVista("lado")}>Por lado</button>
</div>
```
Default: `"status"`. Estado local `useState<"status" | "lado">`.

**Agrupamentos:**
- Por status (ordem de precedência — evita overlap): (1) `Ouvidos` se `ouvidoEm` truthy **OU** `jaOuvido===true`; senão (2) `Ausentes` se `presente === false`; senão (3) `A ouvir`. Render na ordem `A ouvir → Ouvidos → Ausentes` (o que falta aparece primeiro).
- Por lado: `Acusação` (`lado="acusacao"` ou `tipo="VITIMA"`), `Defesa` (`lado="defesa"`), `Comum` (restante). Render na ordem `Acusação → Defesa → Comum`.

**Cada grupo** é um sub-accordion **leve e local** (não reusar `CollapsibleSection` aqui — ele foi desenhado para o top-level do sheet com `bg-white ring` e padding generoso; aninhar dentro da seção Depoentes fica muito pesado). Usar um `<details>`/`<summary>` nativo **ou** um mini-accordion custom `<button>` + chevron rotate, classes: `bg-neutral-50 dark:bg-neutral-900/50 rounded-lg px-2.5 py-1.5 text-xs font-semibold`. Header mostra `Nome do grupo (N)`, default aberto.

**Linha compacta** dentro do grupo:
```tsx
<div className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 rounded-lg cursor-pointer">
  <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
    <span className="text-[10px] font-semibold">{iniciais}</span>
  </div>
  <span className="flex-1 text-sm font-medium truncate">{nome}</span>
  <Badge className={ladoColor}>{ladoLabel}</Badge>
  <MailIcon className={intimado ? "text-emerald-500" : "text-neutral-300"} title="Intimado" />
  <CheckIcon className={ouvido ? "text-emerald-500" : "text-neutral-300"} title="Ouvido" />
  {termoDriveFileId && (
    <Button size="xs" variant="ghost" onClick={() => openPreview(termoDriveFileId)}>
      <FileText className="w-3 h-3" /> Ver termo
    </Button>
  )}
  <ChevronDown className={expanded ? "rotate-180" : ""} />
</div>
```

**Expandir** revela o `DepoenteCard variant="full"` existente abaixo, sem mudanças internas nele.

**Cores por lado:** Acusação `bg-rose-100 text-rose-700`, Defesa `bg-sky-100 text-sky-700`, Comum `bg-neutral-100 text-neutral-600`.

### Parte 3 — Pendências (A+B: checkbox + prioridade + ação)

**Arquivo:** `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` (bloco Pendências)

**Cada pendência vira card:**
```tsx
<div className="flex items-start gap-2.5 p-3 rounded-lg bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 hover:ring-neutral-300">
  <Checkbox checked={resolvido} onCheckedChange={toggleResolvido} className="mt-0.5" />
  <div className={cn("flex-1 min-w-0 space-y-1", resolvido && "opacity-60")}>
    <p className={cn("text-sm leading-relaxed", resolvido && "line-through")}>{texto}</p>
  </div>
  <Badge className={priorityColor}>{prioridadeLabel}</Badge>
  {!resolvido && (
    <Button size="sm" variant="outline" onClick={handleAbordar}>
      Abordar
    </Button>
  )}
</div>
```

**Estado resolvido:** `localStorage` com chave `pendencia-resolvida:${audienciaId}:${hash(texto)}`. `hash` simples: `texto.toLowerCase().slice(0,40)`. Lê no mount; persiste no toggle.

**Prioridade:** extraída de `pendencia.prioridade` (`"alta"|"media"|"baixa"`) quando IA classificou. Default `"media"`. Cores:
- `alta`: `bg-rose-100 text-rose-700 border-rose-200`
- `media`: `bg-amber-100 text-amber-700 border-amber-200`
- `baixa`: `bg-neutral-100 text-neutral-600 border-neutral-200`

**Botão "Abordar":**
1. Chama `trpc.audiencias.addQuickNote` (mutation que já existe) com `audienciaId` e `texto` = `"Pendência: ${textoDaPendencia}"`
2. Marca `resolvido=true` localmente + toast "Anotação criada"
3. Requer `audienciaId` — se `null` (fluxo raro), botão fica `disabled` com tooltip "Salve o registro primeiro".

### Parte 4 — Polish das outras seções

**Trocar em todo `tab-briefing.tsx`:**
- `zinc-*` → `neutral-*` (classes Tailwind equivalentes). Usar find/replace.
- Remover `SectionCard` local (linhas ~34-77). Substituir por `CollapsibleSection` de `@/components/agenda/sheet/collapsible-section`. API já é compatível (`id`, `label`, `count?`, `defaultOpen?`, `children`).

**Por seção:**

| Seção | Mudança |
|---|---|
| Resumo Executivo | `analyzedAt` do `ctx?.processo` passa para `<FreshnessBadge />` no header. Splita `resumoExecutivo` por `\n\n` em `<p>` separados com `space-y-2`. |
| Imputação | Se `imputacao` é array de strings, renderiza como badges `variant="outline"` separados. Se string com `;` ou `,` claros, splita. Caso contrário, texto cru. |
| Fatos | Split por `\n\n`. Não fazer cross-referencing com contradições agora (complexidade IA). |
| Elementos | Cards de laudo ganham: (1) ícone por tipo (match de keyword no `nome`/`titulo`: `dna`/`balistica`/`necropsia`/`toxicologico`/`psiquiatrico` → ícones respectivos de `lucide-react`; fallback `ClipboardList`); (2) botão "Ver laudo" à direita quando preview disponível (ver Parte 5). Lacunas ficam como estão, só troca cor para `neutral-*`. |
| Investigação Defensiva | `resultado` trunca em 3 linhas com `line-clamp-3` + botão "Ver mais" abre `Dialog` com texto completo. |
| Contradições | Mantém lógica emerald/rose. Só padroniza `p-3 rounded-lg` e troca cores neutras restantes. |
| Teses | Hoje `<Badge variant="outline">`. Vira cards `rounded-lg ring-1 ring-neutral-200 p-2.5` com `<p className="text-sm font-medium">{tese}</p>` + (se `justificativa`) `<p className="text-xs text-muted-foreground mt-1">{justificativa}</p>`. |

### Parte 5 — Preview de documentos-fonte

**Novos arquivos:**
- `src/lib/agenda/match-document.ts` — helper puro de matching por nome de arquivo.
- `src/lib/agenda/__tests__/match-document.test.ts` — unit tests.
- `src/components/agenda/registro-audiencia/shared/document-preview-dialog.tsx` — `Dialog` que envolve `DrivePreviewIframe`.

**Helper `match-document.ts`:**
```ts
type DriveFile = {
  driveFileId: string;
  name: string;
  mimeType?: string | null;
};

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchTermoDepoente(
  depoenteNome: string,
  files: DriveFile[],
): string | null {
  const nome = normalizeName(depoenteNome);
  if (!nome) return null;
  const tokens = nome.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;

  const candidates = files.filter((f) => {
    const n = normalizeName(f.name);
    const hasTermoKeyword = /\b(termo|depoimento|oitiva)\b/.test(n);
    if (!hasTermoKeyword) return false;
    return tokens.every((t) => n.includes(t));
  });

  if (candidates.length === 0) return null;
  return candidates[0].driveFileId;
}

export function matchLaudo(
  laudoDescricao: string,
  files: DriveFile[],
): string | null {
  const desc = normalizeName(laudoDescricao);
  if (!desc) return null;

  const LAUDO_KEYS = ["laudo", "pericia", "exame"];
  const typeHints = ["dna", "balistica", "necropsia", "toxicologico", "psiquiatrico", "cadaverico"];
  const typeInDesc = typeHints.find((t) => desc.includes(t));

  const candidates = files.filter((f) => {
    const n = normalizeName(f.name);
    const hasLaudoKeyword = LAUDO_KEYS.some((k) => n.includes(k));
    if (!hasLaudoKeyword) return false;
    if (typeInDesc && !n.includes(typeInDesc)) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  return candidates[0].driveFileId;
}
```

**Uso no tab-briefing.tsx:**
```ts
const filesByProcessoQuery = trpc.drive.filesByProcesso.useQuery(
  { processoId: ctx?.processo?.id ?? 0 },
  { enabled: !!ctx?.processo?.id },
);
const driveFiles = filesByProcessoQuery.data ?? [];
```

Para cada depoente: `const termoId = matchTermoDepoente(d.nome, driveFiles);`
Para cada laudo: `const laudoId = matchLaudo(laudoText, driveFiles);`

Se `!== null`, mostra botão "Ver termo" / "Ver laudo". Se `null`, botão some (fase 1: sem fallback manual — entra em bloco 4 futuro).

**`DocumentPreviewDialog` component:**
```tsx
interface Props {
  driveFileId: string | null;
  onClose: () => void;
  title?: string;
}

export function DocumentPreviewDialog({ driveFileId, onClose, title = "Documento" }: Props) {
  return (
    <Dialog open={!!driveFileId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-none w-[95vw] h-[95vh] p-0 gap-0">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="bg-neutral-900 text-white px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-semibold">{title}</span>
          <button onClick={onClose} aria-label="Fechar" className="w-7 h-7 rounded hover:bg-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-950">
          {driveFileId && <DrivePreviewIframe fileId={driveFileId} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

(`DrivePreviewIframe` já existe em `src/components/agenda/sheet/drive-preview-iframe.tsx`.)

**Controle de abertura** em `tab-briefing.tsx`:
```ts
const [previewFileId, setPreviewFileId] = useState<{ id: string; title: string } | null>(null);
```

Chamadas: `setPreviewFileId({ id: termoId, title: `Termo — ${depoente.nome}` })` etc.

No JSX, um único `<DocumentPreviewDialog ... />` no final da aba.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/lib/agenda/match-document.ts` | **Novo** — helpers puros |
| `src/lib/agenda/__tests__/match-document.test.ts` | **Novo** — ~10 testes |
| `src/components/agenda/registro-audiencia/shared/document-preview-dialog.tsx` | **Novo** — wrapper do DrivePreviewIframe |
| `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` | Reestrutura seções, troca `SectionCard` por `CollapsibleSection`, zinc→neutral, adiciona toggle depoentes/grupos/linha compacta, pendências card+checkbox+ação, preview buttons, `DocumentPreviewDialog` |
| `src/components/agenda/registro-audiencia/shared/depoente-card.tsx` | Adiciona prop `onVerTermo?: () => void` + botão inline na variante `full` |

Não toca: mutations, schema, tRPC router, hooks do form, outras abas.

## Testes

- **`match-document.test.ts`** (10 casos):
  - Nome com acento (`João da Silva` match com `Termo_Joao_da_Silva.pdf`)
  - Nome parcial (`J. da Silva` → deve falhar por falta de tokens ≥3)
  - Sem keyword `termo/depoimento/oitiva` → null
  - Múltiplos matches → retorna primeiro
  - Laudo com tipo específico (`laudo balístico` → match com `Laudo_Balistica.pdf`, não com `Laudo_DNA.pdf`)
  - Laudo genérico sem tipo detectável → match qualquer laudo
- **Visual smoke test** manual:
  - Abrir audiência com análise IA + com Drive populado (Caso Garrido é referência — memory tem `project_garrido_juri`)
  - Expandir Versão do Acusado → 2 colunas em desktop, 1 coluna em mobile
  - Expandir Depoentes → toggle funciona, linhas compactas, botão "Ver termo" aparece em quem tem match
  - Expandir Pendências → checkbox persiste em reload (localStorage), "Abordar" cria anotação rápida
  - Clicar "Ver laudo" → Dialog full-screen com iframe do PDF

## Rollout

Sem migration, sem env var, sem feature flag. Deploy direto em main.

## Fora de escopo (blocos futuros)

- **Bloco 4**: persistência de vínculos doc→depoente/laudo em schema (`testemunhas.termo_drive_file_id`, tabela de laudos com `drive_file_id`), fallback manual "Vincular documento" quando auto-match falha.
- **Bloco 5**: cross-referencing visual entre contradições e fatos (highlight de frases).
- **Bloco 6**: reestruturar Depoentes com a vista "status-first" também na aba Depoentes (hoje só no Briefing).
- Ícones automáticos de tipo de laudo poderão evoluir para classificação LLM-based se a heurística atual cobrir mal.
