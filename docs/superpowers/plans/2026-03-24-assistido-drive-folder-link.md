# Assistido ↔ Pasta Drive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada assistido seja vinculado à sua pasta no Google Drive, com auto-match por nome normalizado e UI de confirmação/picker manual.

**Architecture:** (1) Utilitário de normalização de nomes centralizado; (2) mutations tRPC para vincular e fazer backfill; (3) query para sugerir pasta candidata; (4) UI na tab Drive que detecta ausência de vínculo e mostra sugestão ou picker; (5) botão de backfill na página admin.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM (PostgreSQL/Supabase), Tailwind CSS, shadcn/ui (Button, Command, Popover, toast/sonner)

**Spec:** `docs/superpowers/specs/2026-03-24-assistido-drive-folder-link-design.md`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/lib/utils/name-matching.ts` | **Criar** | `normalizeNameForMatch`, `calculateSimilarity` |
| `src/lib/trpc/routers/drive.ts` | **Modificar** | Importar de name-matching; adicionar `getSuggestedFolderForAssistido`, `listUnlinkedFoldersByAtribuicao`, `backfillAssistidoLinks` |
| `src/lib/services/google-drive.ts` | **Modificar** | Substituir `calculateSimilarityNormalized` por import de name-matching |
| `src/lib/trpc/routers/assistidos.ts` | **Modificar** | Adicionar mutation `linkDriveFolder` |
| `src/components/drive/DriveTabEnhanced.tsx` | **Modificar** | Novo prop `driveFolderId`; UI de sugestão/picker quando sem vínculo |
| `src/app/(dashboard)/admin/assistidos/[id]/page.tsx` | **Modificar** | Passar `driveFolderId={data.driveFolderId}` para `DriveTabEnhanced` |
| `src/app/(dashboard)/admin/assistidos/page.tsx` | **Modificar** | Botão "Vincular pastas Drive automaticamente" + resultado |

---

## Task 1: Criar utilitário `name-matching.ts`

**Files:**
- Create: `src/lib/utils/name-matching.ts`

- [ ] **Step 1: Criar o arquivo com as funções exportadas**

```typescript
// src/lib/utils/name-matching.ts

/**
 * Normaliza um nome para comparação: lowercase, remove acentos, trim.
 * "Francisco Ferreira Henriques Rabelo" → "francisco ferreira henriques rabelo"
 */
export function normalizeNameForMatch(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Levenshtein similarity entre 0 e 1.
 * Migrado de drive.ts (linhas 61-91) e google-drive.ts (~4179).
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(s1.length, s2.length);
  return 1 - matrix[s1.length][s2.length] / maxLen;
}
```

- [ ] **Step 2: Verificar build**

```bash
cd /Users/rodrigorochameire/Projetos/Defender
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros relacionados a `name-matching.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/name-matching.ts
git commit -m "feat: add name-matching utility (normalizeNameForMatch, calculateSimilarity)"
```

---

## Task 2: Refatorar funções duplicadas de similaridade

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts:61-91`
- Modify: `src/lib/services/google-drive.ts` (linha ~4179)

- [ ] **Step 1: Substituir `calculateSimilarity` em `drive.ts`**

Em `src/lib/trpc/routers/drive.ts`:

1. Adicionar no topo (após os outros imports):
```typescript
import { calculateSimilarity } from "@/lib/utils/name-matching";
```

2. Deletar as linhas 61-91 (a função `calculateSimilarity` local). Verificar no arquivo todas as chamadas — elas passam a usar o import.

- [ ] **Step 2: Substituir `calculateSimilarityNormalized` em `google-drive.ts`**

Em `src/lib/services/google-drive.ts`:

1. Adicionar import no topo do arquivo (junto com outros imports de utils):
```typescript
import { calculateSimilarity } from "@/lib/utils/name-matching";
```

2. Localizar `function calculateSimilarityNormalized` (~linha 4179) e deletar a função.
3. Substituir cada chamada `calculateSimilarityNormalized(a, b)` por `calculateSimilarity(a, b)` (a assinatura é idêntica).

- [ ] **Step 3: Verificar build**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros de `calculateSimilarity` ou `calculateSimilarityNormalized`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/drive.ts src/lib/services/google-drive.ts
git commit -m "refactor: consolidate calculateSimilarity into name-matching utility"
```

---

## Task 3: Mutation `assistidos.linkDriveFolder`

**Files:**
- Modify: `src/lib/trpc/routers/assistidos.ts`

- [ ] **Step 1: Adicionar a mutation no router de assistidos**

Em `src/lib/trpc/routers/assistidos.ts`, localizar o final do objeto do router (antes do `}`  de fechamento do `createTRPCRouter({...})`). Adicionar após a última mutation existente (ex: após `exportarViaSigad`):

```typescript
linkDriveFolder: protectedProcedure
  .input(
    z.object({
      assistidoId: z.number(),
      driveFileId: z.string(), // driveFiles.driveFileId da pasta a vincular
    })
  )
  .mutation(async ({ input }) => {
    await db.transaction(async (tx) => {
      // 1. Atualiza o assistido
      await tx
        .update(assistidos)
        .set({ driveFolderId: input.driveFileId, updatedAt: new Date() })
        .where(eq(assistidos.id, input.assistidoId));

      // 2. Marca a pasta em driveFiles com o assistidoId
      await tx
        .update(driveFiles)
        .set({ assistidoId: input.assistidoId, updatedAt: new Date() })
        .where(eq(driveFiles.driveFileId, input.driveFileId));

      // 3. Vincula os arquivos filhos diretos (aqueles cujo driveFolderId aponta para esta pasta)
      await tx
        .update(driveFiles)
        .set({ assistidoId: input.assistidoId, updatedAt: new Date() })
        .where(
          and(
            eq(driveFiles.driveFolderId, input.driveFileId),
            isNull(driveFiles.assistidoId)
          )
        );
    });

    return { success: true };
  }),
```

> **Nota de imports**: Verificar que `driveFiles` (schema), `and`, `isNull`, `eq` já estão importados no arquivo. Se não, adicionar:
> ```typescript
> import { driveFiles } from "@/lib/db/schema/drive";
> import { and, isNull } from "drizzle-orm";
> ```

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/assistidos.ts
git commit -m "feat(trpc): add assistidos.linkDriveFolder mutation"
```

---

## Task 4: Queries `drive.getSuggestedFolderForAssistido` e `drive.listUnlinkedFoldersByAtribuicao`

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts`

> O router de drive é longo. Adicionar as novas queries/mutations ao final do objeto `createTRPCRouter({...})`.

-- [ ] **Step 1: Verificar imports necessários em `drive.ts`**

O arquivo `drive.ts` já importa de `@/lib/services/google-drive` (linhas 7-51) e de `@/lib/db/schema` (linha 52). Adicionar apenas o que está faltando:

```typescript
// 1. No bloco de import de google-drive (linhas 7-51), adicionar ATRIBUICAO_FOLDER_IDS
//    (já re-exportado de google-drive.ts na linha 14 daquele arquivo):
import {
  // ...imports existentes...
  ATRIBUICAO_FOLDER_IDS,  // ← adicionar aqui
} from "@/lib/services/google-drive";

// 2. Adicionar import separado para getFolderIdForAtribuicao (NÃO re-exportado pelo google-drive.ts):
import { getFolderIdForAtribuicao } from "@/lib/utils/text-extraction";

// 3. Adicionar imports do name-matching:
import { normalizeNameForMatch, calculateSimilarity } from "@/lib/utils/name-matching";

// 4. Garantir que `type SQL` está importado do drizzle-orm (para o whereConditions array):
import { type SQL, eq, and, isNull, sql } from "drizzle-orm";
// (eq, and, isNull, sql já estão na linha 5 do arquivo — apenas adicionar `type SQL`)
```

- [ ] **Step 2: Adicionar `getSuggestedFolderForAssistido` ao router**

```typescript
getSuggestedFolderForAssistido: protectedProcedure
  .input(z.object({ assistidoId: z.number() }))
  .query(async ({ input }) => {
    // 1. Busca o assistido
    const assistido = await db.query.assistidos.findFirst({
      where: eq(assistidos.id, input.assistidoId),
      columns: { nome: true, atribuicaoPrimaria: true },
    });

    if (!assistido?.atribuicaoPrimaria || !assistido.nome) return null;

    // 2. Obtém o Drive folder ID da pasta raiz da atribuição
    const atribuicao = assistido.atribuicaoPrimaria as keyof typeof ATRIBUICAO_FOLDER_IDS;
    if (!(atribuicao in ATRIBUICAO_FOLDER_IDS)) return null;
    const rootFolderId = getFolderIdForAtribuicao(atribuicao);

    // 3. Busca pastas não vinculadas dentro dessa raiz
    const candidates = await db
      .select({
        driveFileId: driveFiles.driveFileId,
        name: driveFiles.name,
        webViewLink: driveFiles.webViewLink,
        fileCount: sql<number>`(
          SELECT COUNT(*) FROM drive_files cf
          WHERE cf.drive_folder_id = ${driveFiles.driveFileId}
        )`.mapWith(Number),
      })
      .from(driveFiles)
      .where(
        and(
          eq(driveFiles.isFolder, true),
          isNull(driveFiles.assistidoId),
          eq(driveFiles.driveFolderId, rootFolderId)
        )
      );

    if (candidates.length === 0) return null;

    // 4. Calcula scores e retorna o melhor >= 0.8
    const normalizedTarget = normalizeNameForMatch(assistido.nome);
    let best: (typeof candidates[0] & { score: number }) | null = null;

    for (const c of candidates) {
      const score = calculateSimilarity(
        normalizeNameForMatch(c.name ?? ""),
        normalizedTarget
      );
      if (score >= 0.8 && (!best || score > best.score)) {
        best = { ...c, score };
      }
    }

    return best;
  }),
```

- [ ] **Step 3: Adicionar `listUnlinkedFoldersByAtribuicao` (para o picker manual)**

```typescript
listUnlinkedFoldersByAtribuicao: protectedProcedure
  .input(
    z.object({
      atribuicaoPrimaria: z.string().nullable(),
    })
  )
  .query(async ({ input }) => {
    const atribuicao = input.atribuicaoPrimaria as keyof typeof ATRIBUICAO_FOLDER_IDS | null;
    const rootFolderId =
      atribuicao && atribuicao in ATRIBUICAO_FOLDER_IDS
        ? getFolderIdForAtribuicao(atribuicao)
        : null;

    const whereConditions: SQL[] = [
      eq(driveFiles.isFolder, true),
      isNull(driveFiles.assistidoId),
    ];

    if (rootFolderId) {
      whereConditions.push(eq(driveFiles.driveFolderId, rootFolderId));
    }

    return db
      .select({
        driveFileId: driveFiles.driveFileId,
        name: driveFiles.name,
        webViewLink: driveFiles.webViewLink,
        driveFolderId: driveFiles.driveFolderId,
      })
      .from(driveFiles)
      .where(and(...whereConditions))
      .orderBy(driveFiles.name);
  }),
```

- [ ] **Step 4: Verificar build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/drive.ts
git commit -m "feat(trpc): add drive.getSuggestedFolderForAssistido and listUnlinkedFoldersByAtribuicao"
```

---

## Task 5: Mutation `drive.backfillAssistidoLinks`

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts`

- [ ] **Step 1: Adicionar a mutation ao final do router**

```typescript
backfillAssistidoLinks: protectedProcedure
  .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
  .mutation(async ({ input }) => {
    // 1. Busca assistidos sem pasta vinculada
    const unlinked = await db
      .select({
        id: assistidos.id,
        nome: assistidos.nome,
        atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
      })
      .from(assistidos)
      .where(isNull(assistidos.driveFolderId))
      .limit(input.limit + 1); // +1 para saber se hasMore

    const hasMore = unlinked.length > input.limit;
    const batch = unlinked.slice(0, input.limit);

    let linked = 0;
    let skipped = 0;
    let errors = 0;

    for (const assistido of batch) {
      try {
        const atribuicao = assistido.atribuicaoPrimaria as keyof typeof ATRIBUICAO_FOLDER_IDS | null;
        if (!atribuicao || !(atribuicao in ATRIBUICAO_FOLDER_IDS) || !assistido.nome) {
          skipped++;
          continue;
        }

        const rootFolderId = getFolderIdForAtribuicao(atribuicao);
        const normalizedTarget = normalizeNameForMatch(assistido.nome);

        // Busca pastas não vinculadas na pasta raiz da atribuição
        const candidates = await db
          .select({ driveFileId: driveFiles.driveFileId, name: driveFiles.name })
          .from(driveFiles)
          .where(
            and(
              eq(driveFiles.isFolder, true),
              isNull(driveFiles.assistidoId),
              eq(driveFiles.driveFolderId, rootFolderId)
            )
          );

        // Procura match exato normalizado
        const exactMatch = candidates.find(
          (c) => normalizeNameForMatch(c.name ?? "") === normalizedTarget
        );

        if (!exactMatch) {
          skipped++;
          continue;
        }

        // Executa o vínculo (mesma lógica de linkDriveFolder)
        await db.transaction(async (tx) => {
          await tx
            .update(assistidos)
            .set({ driveFolderId: exactMatch.driveFileId, updatedAt: new Date() })
            .where(eq(assistidos.id, assistido.id));

          await tx
            .update(driveFiles)
            .set({ assistidoId: assistido.id })
            .where(eq(driveFiles.driveFileId, exactMatch.driveFileId));

          await tx
            .update(driveFiles)
            .set({ assistidoId: assistido.id })
            .where(
              and(
                eq(driveFiles.driveFolderId, exactMatch.driveFileId),
                isNull(driveFiles.assistidoId)
              )
            );
        });

        linked++;
      } catch {
        errors++;
      }
    }

    return { linked, skipped, errors, hasMore };
  }),
```

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/drive.ts
git commit -m "feat(trpc): add drive.backfillAssistidoLinks mutation"
```

---

## Task 6: UI — DriveTabEnhanced com estados de vínculo

**Files:**
- Modify: `src/components/drive/DriveTabEnhanced.tsx`

A lógica atual: o componente renderiza a árvore de arquivos quando `files.length > 0`. Quando `files` está vazio, não mostra nada útil. Adicionaremos o novo fluxo de vinculação quando `driveFolderId` for null/undefined.

- [ ] **Step 1: Adicionar novos imports ao topo do arquivo**

Em `src/components/drive/DriveTabEnhanced.tsx`, adicionar aos imports existentes:

```typescript
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FolderOpen, Link2 } from "lucide-react";
// (FolderTree, ExternalLink, Loader2, Button já estão importados)
```

- [ ] **Step 2: Atualizar as interfaces**

**2a. Adicionar `driveFileId` à interface `DriveFileData`** (linha 38):

```typescript
interface DriveFileData {
  id: number;
  driveFileId?: string | null;   // NOVO — já retornado pelo getById (linha 375 do router)
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  isFolder: boolean | null;
  parentFileId: number | null;
  driveFolderId: string | null;
  lastModifiedTime: string | Date | null;
  enrichmentStatus?: string | null;
  documentType?: string | null;
  categoria?: string | null;
  enrichmentData?: unknown;
}
```

**2b. Adicionar novos props à interface `DriveTabEnhancedProps`** (linha 53):

```typescript
interface DriveTabEnhancedProps {
  files: DriveFileData[];
  assistidoId?: number;
  processoId?: number;
  driveFolderId?: string | null;        // NOVO
  atribuicaoPrimaria?: string | null;   // NOVO (para filtrar picker)
}
```

- [ ] **Step 3: Atualizar a assinatura da função exportada**

Localizar `export function DriveTabEnhanced({ files, assistidoId, processoId }` (linha 404) e atualizar:

```typescript
export function DriveTabEnhanced({
  files,
  assistidoId,
  processoId,
  driveFolderId,
  atribuicaoPrimaria,
}: DriveTabEnhancedProps) {
```

- [ ] **Step 4: Adicionar estado e queries para o fluxo de vinculação**

Logo após a linha com `const [selectedFile, setSelectedFile] = useState...`, adicionar:

```typescript
  // --- Fluxo de vinculação de pasta ---
  const [pickerOpen, setPickerOpen] = useState(false);
  const showLinkFlow = assistidoId != null && !driveFolderId;

  const { data: suggestion, isLoading: loadingSuggestion, refetch: refetchSuggestion } =
    trpc.drive.getSuggestedFolderForAssistido.useQuery(
      { assistidoId: assistidoId! },
      { enabled: showLinkFlow }
    );

  const { data: unlinkedFolders } =
    trpc.drive.listUnlinkedFoldersByAtribuicao.useQuery(
      { atribuicaoPrimaria: atribuicaoPrimaria ?? null },
      { enabled: showLinkFlow && pickerOpen }
    );

  // useUtils é uma nova declaração — não existe ainda no componente
  const utils = trpc.useUtils();
  const linkFolder = trpc.assistidos.linkDriveFolder.useMutation({
    onSuccess: () => {
      toast.success("Pasta vinculada com sucesso.");
      setPickerOpen(false);
      utils.assistidos.getById.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
```

- [ ] **Step 5: Adicionar o JSX do fluxo de vinculação**

Encontrar o início do `return (` na função `DriveTabEnhanced`. Logo após a abertura do wrapper principal (primeira `<div>`), adicionar o bloco de vinculação **antes** dos VIEW_MODES tabs:

```tsx
  {/* Fluxo de vinculação quando sem pasta vinculada */}
  {showLinkFlow && (
    <div className="p-4 border rounded-lg bg-zinc-50 mb-4">
      {loadingSuggestion ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Procurando pasta correspondente…
        </div>
      ) : suggestion ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <FolderOpen className="w-4 h-4 text-emerald-600" />
            Pasta sugerida encontrada
          </div>
          <p className="text-sm text-zinc-600">
            &ldquo;{suggestion.name}&rdquo; &middot; {suggestion.fileCount} arquivo(s)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={linkFolder.isPending}
              onClick={() =>
                linkFolder.mutate({
                  assistidoId: assistidoId!,
                  driveFileId: suggestion.driveFileId,
                })
              }
            >
              {linkFolder.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Link2 className="w-3 h-3 mr-1" />
              )}
              Confirmar vínculo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPickerOpen(true)}
            >
              Escolher outra
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">Nenhuma pasta Drive vinculada.</p>
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <FolderOpen className="w-3 h-3 mr-1" />
            Vincular pasta manualmente
          </Button>
        </div>
      )}

      {/* Picker de pastas */}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <span />
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar pasta…" />
            <CommandList>
              <CommandEmpty>Nenhuma pasta disponível.</CommandEmpty>
              <CommandGroup>
                {(unlinkedFolders ?? []).map((folder) => (
                  <CommandItem
                    key={folder.driveFileId}
                    value={folder.name ?? ""}
                    onSelect={() =>
                      linkFolder.mutate({
                        assistidoId: assistidoId!,
                        driveFileId: folder.driveFileId,
                      })
                    }
                  >
                    <FolderOpen className="w-3 h-3 mr-2 text-zinc-400" />
                    {folder.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )}
```

- [ ] **Step 6: Adicionar link "Abrir no Drive" e "Alterar pasta" quando vinculado**

Quando `driveFolderId` está preenchido, encontrar onde a tab "tree" é renderizada e adicionar no topo.

> `driveFileId` foi adicionado à `DriveFileData` no Step 2. O `getById` já retorna esse campo (linha 375 do assistidos router). Use-o para localizar a pasta raiz dentro do array `files`.

```tsx
  {/* Link para o Drive quando vinculado */}
  {driveFolderId && (
    <div className="flex items-center justify-between mb-2 pb-2 border-b">
      <span className="text-xs text-zinc-500">Pasta vinculada</span>
      <div className="flex gap-2">
        {(() => {
          const rootFolder = files.find(
            (f) => f.isFolder && f.driveFileId === driveFolderId
          );
          return rootFolder?.webViewLink ? (
            <a
              href={rootFolder.webViewLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
            >
              Abrir no Drive <ExternalLink className="w-3 h-3" />
            </a>
          ) : null;
        })()}
        {assistidoId && (
          <button
            className="text-xs text-zinc-400 hover:text-zinc-600"
            onClick={() => setPickerOpen(true)}
          >
            Alterar pasta
          </button>
        )}
      </div>
    </div>
  )}
```

- [ ] **Step 7: Verificar build**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Corrigir quaisquer erros de tipo (ex: `Popover`/`Command` não instalados → verificar se estão em `src/components/ui/`).

- [ ] **Step 8: Commit**

```bash
git add src/components/drive/DriveTabEnhanced.tsx
git commit -m "feat(ui): DriveTabEnhanced - fluxo de vinculação de pasta para assistidos"
```

---

## Task 7: Passar `driveFolderId` na página de detalhe do assistido

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx:733-737`

- [ ] **Step 1: Atualizar a chamada do DriveTabEnhanced**

Localizar (linha ~734):
```tsx
{tab === "drive" && (
  <DriveTabEnhanced
    files={data.driveFiles}
    assistidoId={Number(id)}
  />
```

Substituir por:
```tsx
{tab === "drive" && (
  <DriveTabEnhanced
    files={data.driveFiles}
    assistidoId={Number(id)}
    driveFolderId={data.driveFolderId}
    atribuicaoPrimaria={data.atribuicaoPrimaria}
  />
```

> `data` vem de `trpc.assistidos.getById`. Os campos `driveFolderId` e `atribuicaoPrimaria` já existem no schema e são retornados pela query.

- [ ] **Step 2: Verificar build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/assistidos/[id]/page.tsx
git commit -m "feat: pass driveFolderId and atribuicaoPrimaria to DriveTabEnhanced"
```

---

## Task 8: Botão de backfill na página admin de assistidos

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/page.tsx`

- [ ] **Step 1: Adicionar estado e mutation para o backfill**

No bloco de estados (próximo ao `batchSelectMode`), adicionar:

```typescript
const [backfillResult, setBackfillResult] = useState<{
  linked: number;
  skipped: number;
  errors: number;
  hasMore: boolean;
} | null>(null);

const backfillDriveMutation = trpc.drive.backfillAssistidoLinks.useMutation({
  onSuccess: (result) => {
    setBackfillResult(result);
    if (result.linked > 0) {
      utils.assistidos.list.invalidate();
    }
    toast.success(
      `${result.linked} assistido(s) vinculado(s). ${result.skipped} sem correspondência.`
    );
  },
  onError: (err) => toast.error(err.message),
});
```

- [ ] **Step 2: Adicionar o botão de backfill no painel de ações**

Localizar o botão "Seleção em lote" / batch panel (~linha 1074) e adicionar ao lado:

```tsx
<Button
  variant="outline"
  size="sm"
  disabled={backfillDriveMutation.isPending}
  onClick={() => backfillDriveMutation.mutate({ limit: 50 })}
>
  {backfillDriveMutation.isPending ? (
    <>
      <Loader2 className="w-3 h-3 animate-spin mr-1" />
      Vinculando…
    </>
  ) : (
    <>
      <FolderOpen className="w-3 h-3 mr-1" />
      Vincular pastas Drive
    </>
  )}
</Button>

{backfillResult?.hasMore && (
  <Button
    variant="outline"
    size="sm"
    disabled={backfillDriveMutation.isPending}
    onClick={() => backfillDriveMutation.mutate({ limit: 50 })}
  >
    Continuar ({backfillResult.linked} vinculados até agora)
  </Button>
)}
```

> Verificar se `FolderOpen` já está nos imports de lucide-react. Se não: `import { ..., FolderOpen } from "lucide-react"`.

- [ ] **Step 3: Verificar build**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/admin/assistidos/page.tsx
git commit -m "feat(admin): add backfill Drive folders button to assistidos page"
```

---

## Task 9: Validação final

- [ ] **Step 1: Build de produção**

```bash
npm run build 2>&1 | tail -20
```

Esperado: build concluído sem erros.

- [ ] **Step 2: Testar manualmente**

1. Abrir `http://localhost:3000/admin/assistidos`
2. Clicar em "Vincular pastas Drive" → verificar toast com resultado
3. Abrir o assistido Francisco Ferreira Henriques Rabelo → tab Drive
4. Se ainda não vinculado: verificar sugestão aparece; clicar "Confirmar vínculo"
5. Tab recarrega com os arquivos da pasta

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: assistido ↔ Drive folder linking (auto-match + UI suggestion/picker)"
```

---

## Checklist de Revisão

- [ ] `name-matching.ts` criado com `normalizeNameForMatch` e `calculateSimilarity`
- [ ] Duplicatas de similaridade removidas de `drive.ts` e `google-drive.ts`
- [ ] Mutation `assistidos.linkDriveFolder` vincula pasta + filhos em transação
- [ ] Query `getSuggestedFolderForAssistido` retorna melhor match ≥ 0.8
- [ ] Query `listUnlinkedFoldersByAtribuicao` lista pastas para picker
- [ ] Mutation `backfillAssistidoLinks` com `limit` e `hasMore`
- [ ] `DriveTabEnhanced` exibe sugestão, picker, e link "Abrir no Drive"
- [ ] Página de detalhe passa `driveFolderId` e `atribuicaoPrimaria`
- [ ] Botão de backfill na página admin funcional
