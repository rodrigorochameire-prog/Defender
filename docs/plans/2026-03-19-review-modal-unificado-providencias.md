# Review Modal Unificado + Providências Expansível

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Todos os modais de importação (PJe, SEEU, Sheets, Excel) exibem etapa de revisão com tabela editável idêntica em UX, e cada linha tem ícone expansível para editar providências sem ocupar espaço fixo na tabela.

**Architecture:** Adicionar `providencias` ao tipo `PjeReviewRow` e ao componente `PjeReviewRowComponent` (expandable sub-row com `<tr>` extra via `React.Fragment`). SEEU e Sheets já têm tabelas customizadas — adicionar o mesmo ícone+sub-row nelas sem refatorar toda a tabela. Excel ganha etapa `"revisar"` completa.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui (Dialog, Button), Lucide React

---

## Visão Geral das Mudanças por Arquivo

| Arquivo | Tipo de mudança |
|---------|-----------------|
| `src/components/demandas-premium/pje-review-table.tsx` | Adicionar campo + sub-row expansível |
| `src/lib/pje-parser.ts` | Adicionar `providencias` aos overrides |
| `src/components/demandas-premium/pje-import-modal.tsx` | Inicializar e repassar `providencias` |
| `src/components/demandas-premium/seeu-import-modal.tsx` | Converter `observacao` col → ícone expansível |
| `src/components/demandas-premium/sheets-import-modal.tsx` | Adicionar ícone + sub-row para `providencias` |
| `src/components/demandas-premium/import-modal.tsx` | Adicionar etapa `"revisar"` |

---

## Task 1: Adicionar `providencias` ao `PjeReviewRow` e sub-row expansível no `pje-review-table.tsx`

**Files:**
- Modify: `src/components/demandas-premium/pje-review-table.tsx`

### Step 1: Adicionar campo `providencias` à interface `PjeReviewRow`

Localizar (linha ~30):
```ts
export interface PjeReviewRow {
  // ... campos existentes ...
  prazoManual: boolean;
  assistidoMatch: AssistidoMatch;
}
```
Adicionar ao final (antes do fechamento `}`):
```ts
  providencias?: string;
```

### Step 2: Adicionar `onProvidenciasChange` à interface `PjeReviewTableProps`

Localizar (linha ~53):
```ts
interface PjeReviewTableProps {
  rows: PjeReviewRow[];
  onRowsChange: (rows: PjeReviewRow[]) => void;
  atribuicao: string;
  showTipoProcesso?: boolean;
}
```
Substituir por:
```ts
interface PjeReviewTableProps {
  rows: PjeReviewRow[];
  onRowsChange: (rows: PjeReviewRow[]) => void;
  atribuicao: string;
  showTipoProcesso?: boolean;
}
```
(sem mudança na interface principal — o handler será interno via `updateRow`)

### Step 3: Adicionar `handleProvidenciasChange` no corpo de `PjeReviewTable`

Após o `handleToggleExclude` (linha ~210), adicionar:
```ts
const handleProvidenciasChange = (index: number, value: string) => {
  updateRow(index, { providencias: value });
};
```

### Step 4: Adicionar `onProvidenciasChange` à interface `PjeReviewRowProps`

Localizar (linha ~467):
```ts
interface PjeReviewRowProps {
  // ...
  onToggleExclude: (index: number) => void;
  showTipoProcesso?: boolean;
}
```
Adicionar antes do fechamento:
```ts
  onProvidenciasChange: (index: number, value: string) => void;
```

### Step 5: Passar `onProvidenciasChange` na renderização das linhas

Localizar no `<tbody>` (linha ~433):
```tsx
<PjeReviewRowComponent
  key={row.ordemOriginal}
  row={row}
  index={originalIndex}
  atoOptions={atoOptions}
  statusOptions={statusOptions}
  estadoPrisionalOptions={estadoPrisionalOptions}
  onAtoChange={handleAtoChange}
  onPrazoChange={handlePrazoChange}
  onStatusChange={(i, v) => updateRow(i, { status: v })}
  onEstadoPrisionalChange={(i, v) => updateRow(i, { estadoPrisional: v })}
  onToggleExclude={handleToggleExclude}
  showTipoProcesso={showTipoProcesso}
/>
```
Adicionar a prop:
```tsx
  onProvidenciasChange={handleProvidenciasChange}
```

### Step 6: Adicionar cabeçalho da coluna de providências na `<thead>`

Após o `<th>` de "Preso" (última `<th>` existente), adicionar:
```tsx
<th className="w-8 px-2 py-2 text-center text-zinc-500 dark:text-zinc-400 font-medium">
  <StickyNote className="h-3 w-3 inline" />
</th>
```
E adicionar `StickyNote` aos imports do Lucide no topo do arquivo.

> **Nota sobre imports:** O arquivo já importa `FileText` — usar `FileText` ao invés de `StickyNote` para não adicionar novo import.

### Step 7: Refatorar `PjeReviewRowComponent` para retornar `React.Fragment`

O componente atualmente retorna um único `<tr>`. Mudar para:

```tsx
function PjeReviewRowComponent({
  row,
  index,
  // ... props existentes ...
  onProvidenciasChange,
}: PjeReviewRowProps) {
  // estados existentes...
  const [expandedProv, setExpandedProv] = useState(false);
  const [provDraft, setProvDraft] = useState(row.providencias ?? "");

  const hasProvidencias = Boolean(row.providencias?.trim());

  return (
    <>
      <tr className={/* classes existentes */}>
        {/* ... todas as <td> existentes mantidas inalteradas ... */}

        {/* Nova última coluna: ícone de providências */}
        <td className="px-2 py-1.5 text-center">
          <button
            onClick={() => setExpandedProv((v) => !v)}
            title={hasProvidencias ? "Ver/editar providências" : "Adicionar providências"}
            className={`transition-colors rounded p-0.5 ${
              hasProvidencias
                ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
        </td>
      </tr>

      {/* Sub-row de providências — só aparece quando expandedProv === true */}
      {expandedProv && (
        <tr className={`${row.excluded ? "opacity-40" : ""}`}>
          <td
            colSpan={/* número total de colunas, calcular dinamicamente */ 10}
            className="px-3 pb-2 pt-0 bg-zinc-50/70 dark:bg-zinc-800/30"
          >
            <div className="flex items-start gap-2">
              <FileText className="h-3 w-3 text-zinc-400 mt-1.5 flex-shrink-0" />
              <textarea
                autoFocus
                value={provDraft}
                rows={2}
                onChange={(e) => setProvDraft(e.target.value)}
                onBlur={() => {
                  if (provDraft !== (row.providencias ?? "")) {
                    onProvidenciasChange(index, provDraft);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setExpandedProv(false);
                    setProvDraft(row.providencias ?? "");
                  }
                }}
                placeholder="Providências para esta demanda..."
                className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 outline-none resize-none w-full"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
```

> **Sobre `colSpan`:** O número de colunas varia com `showTipoProcesso`. Calcular como:
> `const colCount = 9 + (showTipoProcesso ? 1 : 0) + 1; // +1 pela nova coluna de providências`
> E passar como prop `showTipoProcesso` que já existe.

### Step 8: Verificar visualmente no browser

Abrir `http://localhost:3000/admin/demandas`, clicar em "Importar PJe", colar texto de teste, avançar para "Revisar". Verificar:
- Ícone FileText aparece na última coluna
- Cinza quando sem providências, emerald quando preenchido
- Click expande sub-row com textarea
- Escape fecha sem salvar
- Blur salva o conteúdo

---

## Task 2: Thread `providencias` pelo pipeline PJe

**Files:**
- Modify: `src/lib/pje-parser.ts`
- Modify: `src/components/demandas-premium/pje-import-modal.tsx`

### Step 1: Adicionar `providencias` ao tipo de overrides em `intimacaoToDemanda`

Em `src/lib/pje-parser.ts`, localizar (linha ~910):
```ts
export function intimacaoToDemanda(
  intimacao: IntimacaoPJeSimples,
  atribuicao: string,
  overrides?: {
    ato?: string;
    status?: string;
    prazo?: string;
    estadoPrisional?: string;
    assistidoMatchId?: number;
  }
```
Adicionar `providencias?: string;` aos overrides:
```ts
  overrides?: {
    ato?: string;
    status?: string;
    prazo?: string;
    estadoPrisional?: string;
    assistidoMatchId?: number;
    providencias?: string;
  }
```

### Step 2: Usar o override em vez de sempre auto-gerar

No corpo da função, localizar (linha ~944):
```ts
    providencias: gerarProvidencias(intimacao),
```
Substituir por:
```ts
    providencias: overrides?.providencias !== undefined && overrides.providencias.trim() !== ""
      ? overrides.providencias
      : gerarProvidencias(intimacao),
```
> Regra: se o usuário editou as providências na review table (não vazio), usar o que ele digitou. Caso contrário, manter o auto-gerado.

### Step 3: Inicializar `providencias: ""` ao construir os `reviewRows` no modal PJe

Em `src/components/demandas-premium/pje-import-modal.tsx`, localizar o objeto retornado no `rows` map (linha ~238):
```ts
return {
  assistidoNome: intimacao.assistido,
  // ...
  prazoManual: false,
  assistidoMatch: { type: "new" },
};
```
Adicionar antes do fechamento `};`:
```ts
  providencias: "",
```

### Step 4: Passar `providencias` nos overrides das chamadas a `intimacaoToDemanda`

Há 3 chamadas a `intimacaoToDemanda` no modal (`geraisRows.map`, `rowsToImport.map`):

Em cada `intimacaoToDemanda(intimacao, atribuicao, { ato: row.ato, ... })`, adicionar:
```ts
  providencias: row.providencias,
```

### Step 5: Verificar que build TypeScript passa

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | head -30
```
Expected: sem erros relacionados a `providencias` ou `overrides`.

---

## Task 3: SEEU modal — converter coluna `observacao` para ícone + sub-row expansível

**Files:**
- Modify: `src/components/demandas-premium/seeu-import-modal.tsx`

### Step 1: Entender a estrutura atual

O SEEU modal tem uma tabela na etapa `"revisar"` com as colunas:
`Assistido | Processo | Classe | Assunto | Data envio | Último dia | Observação | ✓`

A coluna "Observação" usa `EditableTextarea` e está sempre visível. O objetivo é converter para ícone expansível (mesma UX do PJe).

### Step 2: Localizar a renderização das linhas na tabela de novas intimações

Buscar no arquivo por `observacao` dentro do JSX da tabela. Há uma `<td>` com `EditableTextarea`:
```tsx
<td className="...">
  <EditableTextarea
    value={intimacao.observacao ?? ""}
    onChange={(v) => handleUpdateNova(idx, "observacao", v)}
    placeholder="Adicionar observação..."
  />
</td>
```

### Step 3: Substituir pela coluna de ícone + sub-row

**3a.** Remover o `<th>Observação</th>` do cabeçalho e substituir por:
```tsx
<th className="w-8 px-2 py-1.5 text-center">
  <FileText className="h-3 w-3 inline text-zinc-400" />
</th>
```

**3b.** Substituir o `<td>` com `EditableTextarea` por:
```tsx
<td className="px-2 py-1.5 text-center">
  <button
    onClick={() => setExpandedObs((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    })}
    className={`rounded p-0.5 transition-colors ${
      intimacao.observacao?.trim()
        ? "text-emerald-600 hover:text-emerald-700"
        : "text-zinc-300 hover:text-zinc-500"
    }`}
  >
    <FileText className="h-3.5 w-3.5" />
  </button>
</td>
```

**3c.** Logo após o `<tr>` principal (dentro do `.map`), adicionar sub-row:
```tsx
{expandedObs.has(idx) && (
  <tr>
    <td colSpan={/* número de colunas da tabela SEEU */} className="px-3 pb-2 pt-0 bg-zinc-50/70 dark:bg-zinc-800/30">
      <div className="flex items-start gap-2">
        <FileText className="h-3 w-3 text-zinc-400 mt-1.5 flex-shrink-0" />
        <textarea
          autoFocus
          rows={2}
          defaultValue={intimacao.observacao ?? ""}
          onBlur={(e) => handleUpdateNova(idx, "observacao", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setExpandedObs((prev) => {
              const next = new Set(prev);
              next.delete(idx);
              return next;
            });
          }}
          placeholder="Observações / providências para esta demanda..."
          className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 outline-none resize-none w-full"
        />
      </div>
    </td>
  </tr>
)}
```

**3d.** Adicionar state `expandedObs` no corpo do componente `SEEUImportModal`:
```ts
const [expandedObs, setExpandedObs] = useState<Set<number>>(new Set());
```
E resetar no `resetModal`:
```ts
setExpandedObs(new Set());
```

**3e.** Fazer o mesmo para a tabela de **duplicatas** (tem estrutura similar com `handleUpdateDup`).

### Step 4: Verificar no browser

Abrir modal SEEU, colar texto, avançar. A tabela de revisão não deve mais mostrar coluna de observação aberta. O ícone FileText deve aparecer na última coluna, expansível ao clicar.

---

## Task 4: Sheets modal — adicionar ícone + sub-row para `providencias`

**Files:**
- Modify: `src/components/demandas-premium/sheets-import-modal.tsx`

### Step 1: Verificar que `parsedDemandas` já tem `providencias`

Confirmado: o parser já popula `providencias` em cada `ParsedDemanda`. O campo existe no estado, só não é exibido na review table.

### Step 2: Adicionar `expandedProv` state

No corpo de `SheetsImportModal`:
```ts
const [expandedProv, setExpandedProv] = useState<Set<string>>(new Set()); // key = demanda.id
```
Resetar em `handleClose`/`handleReset`:
```ts
setExpandedProv(new Set());
```

### Step 3: Adicionar coluna de ícone no `<thead>` da tabela editável

Localizar o `<thead>` da tabela (linha ~885). Após o último `<th>` vazio (de ações), adicionar:
```tsx
<th className="px-2 py-1.5 text-center w-8">
  <FileText className="h-3 w-3 inline text-zinc-400" />
</th>
```

### Step 4: Adicionar `<td>` de ícone em cada linha

No `parsedDemandas.map`, cada `<tr>` tem um `<td>` de ações no final (com botão de remover). Antes desse `<td>`, adicionar:
```tsx
<td className="px-2 py-1.5 text-center">
  <button
    onClick={() => setExpandedProv((prev) => {
      const next = new Set(prev);
      next.has(demanda.id) ? next.delete(demanda.id) : next.add(demanda.id);
      return next;
    })}
    className={`rounded p-0.5 transition-colors ${
      demanda.providencias?.trim()
        ? "text-emerald-600 hover:text-emerald-700"
        : "text-zinc-300 hover:text-zinc-500"
    }`}
  >
    <FileText className="h-3.5 w-3.5" />
  </button>
</td>
```

### Step 5: Adicionar sub-row de providências após cada `<tr>` principal

```tsx
{expandedProv.has(demanda.id) && (
  <tr>
    <td colSpan={9} className="px-3 pb-2 pt-0 bg-zinc-50/70 dark:bg-zinc-800/30">
      <div className="flex items-start gap-2">
        <FileText className="h-3 w-3 text-zinc-400 mt-1.5 flex-shrink-0" />
        <textarea
          autoFocus
          rows={2}
          defaultValue={demanda.providencias ?? ""}
          onBlur={(e) => handleUpdateField(demanda.id, "providencias", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setExpandedProv((prev) => {
              const next = new Set(prev);
              next.delete(demanda.id);
              return next;
            });
          }}
          placeholder="Providências para esta demanda..."
          className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 outline-none resize-none w-full"
        />
      </div>
    </td>
  </tr>
)}
```

### Step 6: Adicionar import do `FileText` no topo do arquivo

Verificar se `FileText` já está nos imports do Lucide. Se não:
```ts
import { ..., FileText } from "lucide-react";
```

---

## Task 5: Excel modal — adicionar etapa de revisão

**Files:**
- Modify: `src/components/demandas-premium/import-modal.tsx`

### Step 1: Entender o fluxo atual

O modal atualmente:
1. Usuário seleciona arquivo + tipo de template
2. Click "Importar" → parseia XLSX → chama `onImport(data)` imediatamente

### Step 2: Adicionar estado de etapa e dados parseados

```ts
const [etapa, setEtapa] = useState<"upload" | "revisar">("upload");
const [parsedRows, setParsedRows] = useState<any[]>([]);
const [expandedProv, setExpandedProv] = useState<Set<number>>(new Set());
```

### Step 3: Mover lógica de parse para função separada (`handleParse`)

Renomear `handleImport` atual para `handleParse`, mudando o final de:
```ts
// ao invés de chamar onImport aqui:
onImport(importedData);
```
Para:
```ts
setParsedRows(importedData);
setEtapa("revisar");
```

### Step 4: Criar nova função `handleConfirmImport`

```ts
const handleConfirmImport = () => {
  onImport(parsedRows);
  setEtapa("upload");
  setParsedRows([]);
  setFile(null);
};
```

### Step 5: Renderizar etapa "upload" vs "revisar"

Na etapa `"upload"`: mostrar o formulário atual (sem alteração).

Na etapa `"revisar"`: mostrar tabela de revisão com colunas:
```
# | Assistido | Processo | Ato | Prazo | Status | 📝
```

Tabela simples similar à do Sheets, com `EditableCell` inline e ícone de providências expansível por linha.

Código da tabela:
```tsx
{etapa === "revisar" && (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium">{parsedRows.length} demandas identificadas</p>
      <Button variant="ghost" size="sm" onClick={() => setEtapa("upload")}>
        ← Voltar
      </Button>
    </div>

    <div className="max-h-[350px] overflow-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0">
          <tr>
            <th className="px-2 py-1.5 text-left w-8">#</th>
            <th className="px-2 py-1.5 text-left">Assistido</th>
            <th className="px-2 py-1.5 text-left">Processo</th>
            <th className="px-2 py-1.5 text-left">Ato</th>
            <th className="px-2 py-1.5 text-left w-20">Prazo</th>
            <th className="px-2 py-1.5 text-left w-20">Status</th>
            <th className="px-2 py-1.5 text-center w-8">
              <FileText className="h-3 w-3 inline text-zinc-400" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {parsedRows.map((row, i) => (
            <React.Fragment key={i}>
              <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                <td className="px-2 py-1.5 text-zinc-400 font-mono">{i + 1}</td>
                <td className="px-2 py-1.5 font-medium truncate max-w-[140px]">
                  {row.assistido || "—"}
                </td>
                <td className="px-2 py-1.5 font-mono text-zinc-500 text-[10px]">
                  {row.processos?.[0]?.numero || "—"}
                </td>
                <td className="px-2 py-1.5">{row.ato || "—"}</td>
                <td className="px-2 py-1.5 text-zinc-500">{row.prazo || "—"}</td>
                <td className="px-2 py-1.5 text-zinc-500">{row.status || "—"}</td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => setExpandedProv((prev) => {
                      const next = new Set(prev);
                      next.has(i) ? next.delete(i) : next.add(i);
                      return next;
                    })}
                    className={`rounded p-0.5 transition-colors ${
                      row.providencias?.trim()
                        ? "text-emerald-600 hover:text-emerald-700"
                        : "text-zinc-300 hover:text-zinc-500"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
              {expandedProv.has(i) && (
                <tr>
                  <td colSpan={7} className="px-3 pb-2 pt-0 bg-zinc-50/70 dark:bg-zinc-800/30">
                    <div className="flex items-start gap-2">
                      <FileText className="h-3 w-3 text-zinc-400 mt-1.5 flex-shrink-0" />
                      <textarea
                        autoFocus
                        rows={2}
                        defaultValue={row.providencias ?? ""}
                        onBlur={(e) => {
                          const newRows = [...parsedRows];
                          newRows[i] = { ...newRows[i], providencias: e.target.value };
                          setParsedRows(newRows);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setExpandedProv((prev) => {
                            const next = new Set(prev);
                            next.delete(i);
                            return next;
                          });
                        }}
                        placeholder="Providências para esta demanda..."
                        className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 outline-none resize-none w-full"
                      />
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>

    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setEtapa("upload")}>
        Voltar
      </Button>
      <Button size="sm" onClick={handleConfirmImport}>
        Importar {parsedRows.length} demandas
      </Button>
    </div>
  </div>
)}
```

### Step 6: Adicionar `FileText` e `React` aos imports

```ts
import React from "react";
import { Upload, FileSpreadsheet, AlertCircle, Download, FileText } from "lucide-react";
```

### Step 7: Verificar build TypeScript

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 6: Commit

```bash
cd /Users/rodrigorochameire/Projetos/Defender
git add src/components/demandas-premium/pje-review-table.tsx \
        src/lib/pje-parser.ts \
        src/components/demandas-premium/pje-import-modal.tsx \
        src/components/demandas-premium/seeu-import-modal.tsx \
        src/components/demandas-premium/sheets-import-modal.tsx \
        src/components/demandas-premium/import-modal.tsx
git commit -m "feat: review modal unificado com providencias expansível em todos os modais de importação"
```

---

## Checklist de QA pós-implementação

- [ ] PJe: ícone FileText aparece na última coluna da review table
- [ ] PJe: ícone cinza quando vazio, emerald quando preenchido
- [ ] PJe: click expande sub-row com textarea
- [ ] PJe: Escape fecha sem salvar; blur salva
- [ ] PJe: providencias editadas aparecem no objeto demanda importado
- [ ] SEEU: tabela não tem mais coluna "Observação" aberta; tem ícone
- [ ] SEEU: expandido funciona igual ao PJe
- [ ] Sheets: ícone aparece na tabela de prévia
- [ ] Sheets: providencias da planilha aparecem pré-preenchidas (campo já vem populado do parser)
- [ ] Excel: etapa "revisar" aparece após parse
- [ ] Excel: botão "Voltar" retorna para upload
- [ ] Excel: botão "Importar N demandas" chama onImport com dados editados
- [ ] Nenhum erro TypeScript (`tsc --noEmit`)
- [ ] Sem regressão nos outros modais (quick-edit, demanda-create, duplicates)
