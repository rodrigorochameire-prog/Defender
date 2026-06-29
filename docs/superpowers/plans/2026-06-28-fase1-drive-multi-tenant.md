# Fase 1 — Drive Multi-Tenant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De-hardcode as pastas do Drive do Rodrigo para que cada defensor (ou grupo de defensores) tenha o próprio conjunto de pastas por atribuição, resolvidas do banco — sem mexer no daemon nem na IA.

**Architecture:** Introduz uma tabela `drive_groups` que guarda o mapa `{atribuicao → folderId}` por grupo; `users.driveGroupId` aponta cada defensor para um grupo (7ª+9ª DP compartilham o do Rodrigo, defensor novo ganha o próprio). Um resolver único (`resolveAtribuicaoFolder`) substitui a constante global `ATRIBUICAO_FOLDER_IDS`. O provisionamento cria a árvore de pastas na conta Google do defensor e grava os IDs no grupo. Caminhos locais (`process.env.HOME`, `DRIVE_BASE_PATH`) saem do código da nuvem.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM (schema em `src/lib/db/schema/*`), PostgreSQL (Supabase), Vitest. Migrações via `drizzle-kit` (`npm run db:generate` / `npm run db:push`).

**Spec de referência:** `docs/superpowers/specs/2026-06-28-ombuds-multi-defensor-drive-agente-skills-design.md` (§4.2, §4.9, §5 Fase 1).

---

## Estrutura de arquivos (o que cada arquivo faz)

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/lib/db/schema/drive.ts` | tabelas de Drive | **Modify**: nova `driveGroups`; add `userId` em `driveFiles` e `driveSyncFolders` |
| `src/lib/db/schema/core.ts` | tabela `users` | **Modify**: add `driveGroupId` (FK) |
| `src/lib/db/schema/relations.ts` | relations Drizzle | **Modify**: relations de `driveGroups` ↔ `users` |
| `src/lib/services/drive-folders.ts` | resolver de pastas por atribuição | **Create**: `pickAtribuicaoFolder` (puro) + `resolveAtribuicaoFolder` (DB) |
| `src/lib/services/__tests__/drive-folders.test.ts` | testes do resolver | **Create** |
| `src/lib/services/google-drive-peruser.ts` | provisionamento por usuário | **Modify**: `createUserDriveStructure` cria subpastas de atribuição e grava no grupo |
| `src/lib/utils/text-extraction.ts` | (atual) constante global de folders | **Modify**: marcar `ATRIBUICAO_FOLDER_IDS` como legado e remover usos |
| `src/lib/trpc/routers/drive.ts` | router tRPC de Drive | **Modify**: trocar TODOS (~15) os usos da constante pelo resolver; add mutation `provisionMyDrive` |
| `src/lib/trpc/routers/distribuicao.ts` | router de distribuição | **Modify**: trocar uso de `ATRIBUICAO_FOLDER_IDS` pelo resolver |
| `src/app/api/analyze/route.ts` | rota de análise premium | **Modify**: remover `process.env.HOME` e `drivePath` literais |
| `src/components/demandas-premium/pje-import-modal.tsx` | modal de import PJe | **Modify**: remover `DRIVE_BASE_PATH` hardcoded |
| `scripts/seed-drive-group-rodrigo.mjs` | seed do grupo do Rodrigo | **Create**: cria o grupo apontando para as pastas atuais |

---

## Pré-condições (rodar uma vez antes de começar)

- [ ] **Step 0a: Confirmar branch e árvore limpa**

Run: `git status --short && git branch --show-current`
Expected: working tree relevante limpo; criar branch de feature se necessário: `git checkout -b feat/fase1-drive-multitenant`

- [ ] **Step 0b: Baseline de testes verde**

Run: `npm test -- --run`
Expected: suíte passa (anotar testes já quarentenados que exigem Postgres).

---

## Task 1: Tabela `drive_groups` + colunas de escopo

**Files:**
- Modify: `src/lib/db/schema/drive.ts`
- Modify: `src/lib/db/schema/core.ts` (users)
- Modify: `src/lib/db/schema/relations.ts`

- [ ] **Step 1: Adicionar a tabela `driveGroups` em `drive.ts`**

No topo do arquivo, garantir imports de `jsonb`, `serial`, `text`, `integer`, `timestamp`, `index`, `foreignKey` (seguir o estilo já presente). Adicionar:

```typescript
// drive_groups — conjunto de pastas por atribuição compartilhável entre defensores.
// O mapa atribuicaoFolders substitui a constante global ATRIBUICAO_FOLDER_IDS.
export const driveGroups = pgTable("drive_groups", {
  id: serial("id").primaryKey().notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  label: text("label").notNull(),
  // IMPORTANTE: valores são ARRAYS — uma atribuição pode ter >1 pasta.
  // Ex. real do Rodrigo: VVD = [Criminal, MPU]; SUBSTITUICAO = [criminal, cível]; GRUPO_JURI = [grupo, extra].
  // { JURI: ["<id>"], VVD: ["<id1>","<id2>"], EP: ["<id>"], SUBSTITUICAO: [...], GRUPO_JURI: [...], CRIMINAL: ["<id>"] }
  atribuicaoFolders: jsonb("atribuicao_folders").$type<Record<string, string[]>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => [
  index("drive_groups_owner_idx").on(table.ownerUserId),
]);
```

> **Convenção de estilo:** `drive.ts` usa nomes de coluna explícitos (`serial("id")`) e extras de tabela em **forma de array** (`(table) => [ ... ]`). Seguir essa convenção em todas as edições de schema desta fase.

- [ ] **Step 2: Adicionar `userId` em `driveFiles` e `driveSyncFolders` (mesmo arquivo)**

Em `driveFiles`, adicionar a coluna (nullable para não quebrar linhas existentes):
```typescript
  userId: integer("user_id"),
```
Em `driveSyncFolders`, idem:
```typescript
  userId: integer("user_id"),
```
Adicionar índices na função de tabela respectiva:
```typescript
  userIdx: index("drive_files_user_idx").on(table.userId),
```
```typescript
  userIdx: index("drive_sync_folders_user_idx").on(table.userId),
```

- [ ] **Step 3: Adicionar `driveGroupId` em `users` (`core.ts`)**

Junto das colunas de Drive já existentes (`googleLinked`, `driveFolderId`), adicionar:
```typescript
  driveGroupId: integer("drive_group_id"),
```

- [ ] **Step 4: Relations (`relations.ts`)**

Seguindo o padrão do arquivo, adicionar **os dois lados** da relação:
```typescript
export const driveGroupsRelations = relations(driveGroups, ({ one, many }) => ({
  owner: one(users, { fields: [driveGroups.ownerUserId], references: [users.id] }),
  members: many(users),
}));
```
E o inverso em `usersRelations` (adicionar a chave; manter as demais que já existirem):
```typescript
  driveGroup: one(driveGroups, { fields: [users.driveGroupId], references: [driveGroups.id] }),
```
Garantir o import de `driveGroups` no topo de `relations.ts`.

- [ ] **Step 5: Gerar a migração**

Run: `npm run db:generate`
Expected: novo arquivo SQL em `drizzle/` criando `drive_groups`, colunas `user_id` em `drive_files`/`drive_sync_folders` e `drive_group_id` em `users`. Abrir e conferir que **não** há `DROP` inesperado.

- [ ] **Step 6: Aplicar no banco**

Run: `npm run db:push`
Expected: aplica sem erro. (Se o ambiente local não tiver `DATABASE_URL`, anotar e aplicar no momento do deploy.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/schema/drive.ts src/lib/db/schema/core.ts src/lib/db/schema/relations.ts drizzle/
git commit -m "feat(drive): tabela drive_groups + escopo userId em drive_files/sync_folders + users.driveGroupId"
```

---

## Task 2: Resolver de pastas por atribuição (TDD)

**Files:**
- Create: `src/lib/services/drive-folders.ts`
- Test: `src/lib/services/__tests__/drive-folders.test.ts`

A lógica pura (escolher o folderId do mapa) é testada sem banco; o wrapper que lê o DB fica fino.

- [ ] **Step 1: Escrever o teste que falha**

```typescript
// src/lib/services/__tests__/drive-folders.test.ts
import { describe, expect, it } from "vitest";
import { pickAtribuicaoFolders, pickAtribuicaoFolderPrimary, ATRIBUICOES } from "../drive-folders";

describe("pickAtribuicaoFolders (multi-pasta)", () => {
  const folders = { JURI: ["fJuri"], VVD: ["fVvdCrim", "fVvdMpu"], EP: ["fEp"] };

  it("retorna todas as pastas da atribuição (inclui extras)", () => {
    expect(pickAtribuicaoFolders(folders, "VVD")).toEqual(["fVvdCrim", "fVvdMpu"]);
  });

  it("retorna [] quando a atribuição não está mapeada", () => {
    expect(pickAtribuicaoFolders(folders, "CRIMINAL")).toEqual([]);
  });

  it("retorna [] para mapa vazio", () => {
    expect(pickAtribuicaoFolders({}, "JURI")).toEqual([]);
  });

  it("tolera valor string legado tratando como array de 1", () => {
    expect(pickAtribuicaoFolders({ EP: "fEpLegado" } as any, "EP")).toEqual(["fEpLegado"]);
  });

  it("primary retorna a primeira pasta, ou null se vazio", () => {
    expect(pickAtribuicaoFolderPrimary(folders, "VVD")).toBe("fVvdCrim");
    expect(pickAtribuicaoFolderPrimary({}, "VVD")).toBeNull();
  });

  it("ATRIBUICOES cobre as 6 atribuições do domínio", () => {
    expect([...ATRIBUICOES].sort()).toEqual(
      ["CRIMINAL", "EP", "GRUPO_JURI", "JURI", "SUBSTITUICAO", "VVD"].sort(),
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- --run src/lib/services/__tests__/drive-folders.test.ts`
Expected: FAIL ("Cannot find module '../drive-folders'").

- [ ] **Step 3: Implementar o módulo**

```typescript
// src/lib/services/drive-folders.ts
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema/core";
import { driveGroups } from "@/lib/db/schema/drive";

export const ATRIBUICOES = [
  "JURI", "VVD", "EP", "SUBSTITUICAO", "GRUPO_JURI", "CRIMINAL",
] as const;
export type Atribuicao = (typeof ATRIBUICOES)[number];

/** Mapa armazenado no grupo: atribuição → lista de pastas (>1 por causa de MPU/cível/extras). */
export type AtribuicaoFoldersMap = Record<string, string[] | string>;

/** Lógica pura: TODAS as pastas da atribuição (tolera valor string legado). */
export function pickAtribuicaoFolders(
  folders: AtribuicaoFoldersMap,
  atribuicao: Atribuicao,
): string[] {
  const v = folders?.[atribuicao];
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Lógica pura: pasta primária (primeira) ou null. */
export function pickAtribuicaoFolderPrimary(
  folders: AtribuicaoFoldersMap,
  atribuicao: Atribuicao,
): string | null {
  return pickAtribuicaoFolders(folders, atribuicao)[0] ?? null;
}

async function loadGroupFolders(userId: number): Promise<AtribuicaoFoldersMap> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { driveGroupId: true },
  });
  if (!user?.driveGroupId) return {};
  const group = await db.query.driveGroups.findFirst({
    where: eq(driveGroups.id, user.driveGroupId),
  });
  return (group?.atribuicaoFolders ?? {}) as AtribuicaoFoldersMap;
}

/** TODAS as pastas de uma atribuição para um defensor (use nos loops de sync/scan). */
export async function resolveAtribuicaoFolders(
  userId: number,
  atribuicao: Atribuicao,
): Promise<string[]> {
  return pickAtribuicaoFolders(await loadGroupFolders(userId), atribuicao);
}

/** Pasta primária de uma atribuição (use onde se espera 1 pasta, ex. prompt de análise). */
export async function resolveAtribuicaoFolder(
  userId: number,
  atribuicao: Atribuicao,
): Promise<string | null> {
  return pickAtribuicaoFolderPrimary(await loadGroupFolders(userId), atribuicao);
}

/** Mapa completo do grupo (use para iterar todas as atribuições de uma vez). */
export async function resolveAllAtribuicaoFolders(
  userId: number,
): Promise<AtribuicaoFoldersMap> {
  return loadGroupFolders(userId);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --run src/lib/services/__tests__/drive-folders.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/drive-folders.ts src/lib/services/__tests__/drive-folders.test.ts
git commit -m "feat(drive): resolver de pastas por grupo (multi-pasta por atribuição, TDD)"
```

---

## Task 3: Seed do grupo do Rodrigo (preserva o funcionamento atual)

**Files:**
- Create: `scripts/seed-drive-group-rodrigo.mjs`

Cria 1 grupo cujo `atribuicaoFolders` são exatamente as pastas hoje em `ATRIBUICAO_FOLDER_IDS`, e aponta o usuário do Rodrigo para ele. Isso garante que, ao trocar a constante pelo resolver, nada muda para ele.

- [ ] **Step 1: Escrever o script**

```javascript
// scripts/seed-drive-group-rodrigo.mjs
// Cria o drive_group do Rodrigo com as pastas atuais e vincula o usuário.
import { createClient } from "@supabase/supabase-js";

// ARRAYS — inclui as pastas primárias (ATRIBUICAO_FOLDER_IDS) E as extras
// (EXTRA_ATRIBUICAO_FOLDERS) de src/lib/utils/text-extraction.ts, para NÃO regredir
// o scan das pastas VVD-MPU / Substituição-cível / Grupo-Júri-extra.
const ATRIBUICAO_FOLDERS = {
  JURI: ["1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-"],
  VVD: ["1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti", "1D-tHrNqU0sAczQP4NAslm7ofthC73COe"], // Criminal + MPU
  EP: ["1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q"],
  SUBSTITUICAO: ["1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU", "1ym7x4l3w3I8ox_FCpZo3I-miDJSZ3E46"], // criminal + cível
  GRUPO_JURI: ["1LUW4yauxm6iaJYCrjRgXAnSgTZIbel2j", "1sET3k_-5c2Mo8D7xF-cJCKzxgI_yh4dW"], // grupo + extra
  CRIMINAL: ["1xMwqXkBgEc3bsJkO3ioPt4u50D4lpJ5u"],
};

const RODRIGO_EMAIL = "rodrigorochameire@gmail.com";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: user, error: uErr } = await supabase
  .from("users").select("id, drive_group_id").eq("email", RODRIGO_EMAIL).single();
if (uErr) throw uErr;

if (user.drive_group_id) {
  console.log(`Usuário ${user.id} já tem drive_group_id=${user.drive_group_id}; nada a fazer.`);
  process.exit(0);
}

const { data: group, error: gErr } = await supabase
  .from("drive_groups")
  .insert({ owner_user_id: user.id, label: "9ª DP Camaçari", atribuicao_folders: ATRIBUICAO_FOLDERS })
  .select("id").single();
if (gErr) throw gErr;

const { error: linkErr } = await supabase
  .from("users").update({ drive_group_id: group.id }).eq("id", user.id);
if (linkErr) throw linkErr;

console.log(`OK: grupo ${group.id} criado e vinculado ao usuário ${user.id}.`);
```

- [ ] **Step 2: Rodar o seed**

Run: `node scripts/seed-drive-group-rodrigo.mjs`
Expected: "OK: grupo N criado e vinculado…" (idempotente se rodar de novo).

- [ ] **Step 3: Verificar no banco**

Run: `node -e "import('@supabase/supabase-js').then(async({createClient})=>{const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);const{data}=await s.from('drive_groups').select('*');console.log(JSON.stringify(data,null,2))})"`
Expected: 1 linha; `atribuicao_folders` com arrays (VVD e SUBSTITUICAO com 2 IDs, GRUPO_JURI com 2).

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-drive-group-rodrigo.mjs
git commit -m "feat(drive): seed do grupo de Drive do Rodrigo com as pastas atuais"
```

---

## Task 4: Trocar TODOS os usos de `ATRIBUICAO_FOLDER_IDS` / `EXTRA_ATRIBUICAO_FOLDERS`

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts` (**~15 call-sites** — NÃO confiar em números de linha; mapear por Grep)
- Modify: `src/lib/trpc/routers/distribuicao.ts` (importa a constante — ~linha 20)
- Modify: `src/lib/utils/text-extraction.ts` (marcar constantes como legado)

> ⚠️ O escopo aqui é maior do que parece: além de acessos `ATRIBUICAO_FOLDER_IDS[atribuicao]`, há **loops** que iteram `Object.entries(ATRIBUICAO_FOLDER_IDS)` e usos de `EXTRA_ATRIBUICAO_FOLDERS` (pastas VVD-MPU / Substituição-cível / Grupo-Júri-extra). Migrar TODOS os **acessos diretos** em `drive.ts` + `distribuicao.ts`.

> 🟡 **DECISÃO (deferimento) — `google-drive.ts` fora desta task.** `src/lib/services/google-drive.ts` lê a constante em ~12 lugares (incl. o reverse-sync por webhook `FOLDER_ID_TO_ATRIBUICAO`). A migração dele exige design (atribuição por grupo no webhook) e fica para a **Fase 1.5**. Nesta task: **NÃO** alterar `google-drive.ts` nem as chamadas que `drive.ts` faz a funções dele (`criarPastaProcesso`, etc.) — essas continuam usando a constante, que passa a ser o **grupo padrão legado**. Migrar apenas os acessos **diretos** à constante dentro de `drive.ts`/`distribuicao.ts`.

- [ ] **Step 1: Mapear TODOS os usos (não usar números de linha fixos)**

Run: `Grep` por `ATRIBUICAO_FOLDER_IDS` **e** `EXTRA_ATRIBUICAO_FOLDERS` em `src/`, com `-n`, listando cada ocorrência.
Expected: ~15 sites em `drive.ts` (incluindo loops `Object.entries`), 1 em `distribuicao.ts`, usos em `drive-constants.ts`, `api/analyze/route.ts`, e o **duplicado local** em `admin/settings/drive/page.tsx` (define a própria cópia — tratar na Task 10). Anotar a lista completa antes de editar.

- [ ] **Step 2: No `drive.ts`, resolver por usuário (acessos diretos)**

Onde lê `ATRIBUICAO_FOLDER_IDS[atribuicao]`, trocar por `await resolveAtribuicaoFolders(ctx.session.user.id, atribuicao)` (array — importar de `@/lib/services/drive-folders`). Onde antes pegava 1 pasta, iterar o array.

- [ ] **Step 3: No `drive.ts`, migrar os loops `Object.entries(...)` + extras**

Onde o router itera todas as atribuições (e onde concatena `EXTRA_ATRIBUICAO_FOLDERS`), trocar por `const map = await resolveAllAtribuicaoFolders(ctx.session.user.id)` e iterar `Object.entries(map)` achatando os arrays (`Object.values(map).flat()`). Isso já inclui as extras (foram seedadas no mapa). Tratar mapa vazio (grupo ausente) retornando lista vazia + flag `needsProvisioning: true`.

- [ ] **Step 4: Migrar `distribuicao.ts`**

Mesmo tratamento: substituir o uso da constante pelo resolver (`resolveAtribuicaoFolders` / `resolveAllAtribuicaoFolders`) com o `userId` do contexto. Se o uso for só de *label*, usar `ATRIBUICAO_LABELS` (criado na Task 10) em vez de folderId.

- [ ] **Step 5: Marcar as constantes como legado em `text-extraction.ts`**

`@deprecated use resolveAtribuicaoFolder(s)` acima de `ATRIBUICAO_FOLDER_IDS` **e** `EXTRA_ATRIBUICAO_FOLDERS` (remoção total é a Task 10; aqui só marcar e zerar os leitores de folderId).

- [ ] **Step 6: Type-check**

Run: `npm run typecheck`
Expected: sem erros em `drive.ts` / `distribuicao.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/drive.ts src/lib/trpc/routers/distribuicao.ts src/lib/utils/text-extraction.ts
git commit -m "refactor(drive): resolve pastas por grupo em drive.ts/distribuicao.ts (inclui loops + extras)"
```

---

## Task 5: De-hardcode da rota de análise premium

**Files:**
- Modify: `src/app/api/analyze/route.ts` (linhas 34–35, 44–99, 132–134, 154)

A rota da nuvem não deve assumir `process.env.HOME` nem `Meu Drive/1 - Defensoria 9ª DP/...`. O caminho local é responsabilidade do agente (Fase 4); aqui passamos a referenciar a pasta da atribuição por **folderId** do grupo do usuário.

- [ ] **Step 1: Remover o fallback de HOME e os `drivePath` literais**

Em `ATRIBUICAO_CONFIG`, remover o campo `drivePath` de cada entrada (mantém `label`, `palette`, `skillPaths`). Remover o `DEFAULT_CONFIG.drivePath`.

- [ ] **Step 2: Resolver o folder da atribuição via grupo (thread do `userId` + async)**

O `drivePath` hoje é montado dentro da função builder do prompt (~linha 119), que recebe só `atribuicao`. É preciso: (a) **passar o `userId`** (obtido do `getSession` no handler `POST`, ~linha 765+) para o builder, e (b) tornar o builder **async**. Trocar a montagem do caminho por:
```typescript
import { resolveAtribuicaoFolder } from "@/lib/services/drive-folders";
// dentro do builder (agora async, recebendo userId):
const atribuicaoFolderId = await resolveAtribuicaoFolder(userId, atribuicaoKey); // pasta primária
// O prompt referencia a pasta por URL do Drive, não por caminho local:
// `Pasta da atribuição no Drive: https://drive.google.com/drive/folders/${atribuicaoFolderId}`
```
Ajustar o trecho do prompt (~linha 154) para usar a URL do Drive em vez de `${drivePath}/${assistidoNome}/`, e atualizar o(s) `await` no chamador do builder.

- [ ] **Step 3: `SKILLS_BASE` — remover o fallback fixo do home do Rodrigo**

Trocar `process.env.HOME ?? "/Users/rodrigorochameire"` por leitura de uma env explícita do servidor (`process.env.OMBUDS_SKILLS_BASE`) com erro claro se ausente; documentar no `.env.example`. (Na nuvem, as skills não vivem no FS da função — esta leitura só faz sentido no agente local; se a rota premium é server-side puro, marcar o trecho para mover ao agente na Fase 3 e isolar atrás de um guard.)

- [ ] **Step 4: Type-check + build da rota**

Run: `npm run typecheck`
Expected: sem erros em `route.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/analyze/route.ts .env.example
git commit -m "refactor(analyze): remove HOME/drivePath hardcoded; resolve pasta por folderId do grupo"
```

---

## Task 6: De-hardcode do modal de import PJe

**Files:**
- Modify: `src/components/demandas-premium/pje-import-modal.tsx` (linha ~184 e usos em ~305, 331)

- [ ] **Step 1: Remover `DRIVE_BASE_PATH`**

Remover a constante `DRIVE_BASE_PATH` (mount macOS do Rodrigo). O `driveBasePath` passado para `scanIntimacoesMutation` é um conceito **do agente local** (Fase 3/4). Para a Fase 1, parametrizar via uma config opcional vinda do servidor/usuário; se ausente, desabilitar o scan local com mensagem "Configure seu agente OMBUDS para habilitar a leitura local de documentos".

- [ ] **Step 2: Ajustar as chamadas**

Onde passa `driveBasePath: DRIVE_BASE_PATH`, passar `driveBasePath: agentConfig?.driveBasePath` (opcional) e guardar o botão atrás de `if (agentConfig?.driveBasePath)`.

- [ ] **Step 3: Type-check + lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros no arquivo.

- [ ] **Step 4: Commit**

```bash
git add src/components/demandas-premium/pje-import-modal.tsx
git commit -m "refactor(pje-import): remove DRIVE_BASE_PATH hardcoded; caminho local vira config do agente"
```

---

## Task 7: Provisionamento — `createUserDriveStructure` cria as subpastas de atribuição

**Files:**
- Modify: `src/lib/services/google-drive-peruser.ts` (`createUserDriveStructure`, linhas 59–95)

- [ ] **Step 1: Extrair helper de criação de subpasta**

Adicionar uma função interna `createSubfolder(accessToken, parentId, name)` reutilizando `driveRequest`, retornando o `id`.

- [ ] **Step 2: Criar as subpastas de atribuição e gravar no grupo**

Após criar a root folder, criar as subpastas padrão (labels iguais às do Rodrigo) e montar o mapa:
```typescript
const ATRIBUICAO_SUBFOLDERS: Array<{ key: string; name: string }> = [
  { key: "JURI", name: "Processos - Júri" },
  { key: "VVD", name: "Processos - VVD (Criminal)" },
  { key: "EP", name: "Processos - Execução Penal" },
  { key: "SUBSTITUICAO", name: "Processos - Substituição" },
  { key: "GRUPO_JURI", name: "Processos - Grupo do Júri" },
  { key: "CRIMINAL", name: "Processos" },
];

// valores são ARRAYS (consistente com o schema/resolver); defensor novo começa com 1 pasta cada.
const atribuicaoFolders: Record<string, string[]> = {};
for (const sf of ATRIBUICAO_SUBFOLDERS) {
  atribuicaoFolders[sf.key] = [await createSubfolder(accessToken, rootFolder.id, sf.name)];
}
```

- [ ] **Step 3: Criar/atualizar o `drive_group` do usuário e vincular**

```typescript
// cria o grupo do próprio defensor e aponta users.drive_group_id
const groupRows = await db.execute(sql`
  INSERT INTO drive_groups (owner_user_id, label, atribuicao_folders)
  VALUES (${userId}, ${`OMBUDS — ${user.name}`}, ${JSON.stringify(atribuicaoFolders)}::jsonb)
  RETURNING id
`);
const groupId = (groupRows[0] as any).id;
await db.execute(sql`UPDATE users SET drive_group_id = ${groupId}, google_linked = true WHERE id = ${userId}`);
```
Manter o `UPDATE users SET drive_folder_id = …` já existente. Tornar idempotente: se `user.driveGroupId` já existir, não recriar (retornar o existente).

- [ ] **Step 4: Type-check**

Run: `npm run typecheck`
Expected: sem erros em `google-drive-peruser.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/google-drive-peruser.ts
git commit -m "feat(drive): provisionamento cria subpastas de atribuição e grava drive_group do defensor"
```

---

## Task 8: tRPC + UI de onboarding "Conectar Google Drive"

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts` (nova mutation `provisionMyDrive` + query `myDriveStatus`)
- Create/Modify: card de onboarding na página de settings do usuário (seguir a página existente `src/app/(dashboard)/admin/settings/drive/page.tsx` como referência de layout)

- [ ] **Step 1: Mutation `provisionMyDrive`**

```typescript
provisionMyDrive: protectedProcedure.mutation(async ({ ctx }) => {
  return safeAsync(async () => {
    const { createUserDriveStructure } = await import("@/lib/services/google-drive-peruser");
    return await createUserDriveStructure(ctx.session.user.id);
  }, "Erro ao provisionar pastas do Drive");
}),
```

- [ ] **Step 2: Query `myDriveStatus`**

Retorna `{ googleLinked, driveGroupId, atribuicaoFolders }` do usuário logado (para a UI mostrar ✓/✗ e a árvore criada).

- [ ] **Step 3: Card de UI**

Card "Conectar Google Drive": se `!googleLinked` → botão que abre `/api/google/callback?userId=…&returnTo=…` (OAuth já existente); ao voltar, chama `provisionMyDrive`; mostra a árvore (links `https://drive.google.com/drive/folders/<id>`). Idempotente: se já provisionado, mostra os folders e botão "Re-verificar".

- [ ] **Step 4: Verificar no browser** (usar skill `dev-server` + `browser-test`)

Subir `npm run dev`, logar com uma 2ª conta de teste, conectar Google, confirmar criação da árvore e persistência em `drive_groups`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/drive.ts src/app/**/settings/**/*.tsx
git commit -m "feat(drive): onboarding 'Conectar Google Drive' (provisionMyDrive + myDriveStatus + card)"
```

---

## Task 9: Convenção de pastas (documento de onboarding)

**Files:**
- Create: `docs/onboarding/convencao-pastas-drive.md`

> Apenas o documento escrito — o verificador automático `ombuds-agent check-drive` é da Fase 4 (ver spec §5 Fase 4).

- [ ] **Step 1: Escrever a convenção**

Documentar a estrutura esperada (baseada na organização que funciona com o Rodrigo): nomes das subpastas de atribuição, pasta por assistido, convenção de nomes de arquivo (`[Unidade] Tipo - Fundamento - Nome (Sufixo).ext`), e como isso casa com o resolver/provisionamento. Incluir um exemplo de árvore.

- [ ] **Step 2: Commit**

```bash
git add docs/onboarding/convencao-pastas-drive.md
git commit -m "docs(onboarding): convenção de organização das pastas do Drive para o OMBUDS"
```

---

## Task 10: Constante vira "grupo padrão legado" + separar labels + verificação de fim de fase

> 🟡 **MUDANÇA vs. plano original:** NÃO removemos `ATRIBUICAO_FOLDER_IDS`/`EXTRA_ATRIBUICAO_FOLDERS` nesta fase. `google-drive.ts` ainda as consome (migração = **Fase 1.5**). Aqui a constante é **rebatizada conceitualmente como o "grupo padrão legado"** (as pastas do Rodrigo), mantida para `google-drive.ts`, e só separamos os *labels* dos *IDs* para limpeza.

**Files:**
- Modify: `src/lib/utils/text-extraction.ts` (extrair `ATRIBUICAO_LABELS`; documentar a constante como "grupo padrão legado")
- Modify: `src/components/drive/drive-constants.ts` (usar `ATRIBUICAO_LABELS` para rótulos)
- Modify: `src/app/(dashboard)/admin/settings/drive/page.tsx` (**duplicado local** — passar a refletir o grupo do usuário via `myDriveStatus`, não as pastas fixas)

> **NÃO remover `SPECIAL_FOLDER_IDS`**: em uso em `api/webhooks/drive/route.ts`, `api/drive/upload/route.ts`, `whatsapp-chat.ts`, `inngest/functions.ts`, `drive-constants.ts`. Fora do escopo.

- [ ] **Step 1: Mapear leitores restantes da constante**

Run: `Grep -n` por `ATRIBUICAO_FOLDER_IDS`/`EXTRA_ATRIBUICAO_FOLDERS`.
Expected: após Tasks 4–5, os acessos diretos em `drive.ts`/`distribuicao.ts`/`analyze` sumiram; restam `google-drive.ts` (deferido p/ 1.5), usos de *label* (`drive-constants.ts`), e o duplicado da página admin.

- [ ] **Step 2: Separar labels de IDs (sem remover IDs)**

Extrair `ATRIBUICAO_LABELS` (atribuição→rótulo) e apontar `drive-constants.ts` para ele. Acima de `ATRIBUICAO_FOLDER_IDS` em `text-extraction.ts`, documentar: `// GRUPO PADRÃO LEGADO (pastas da 9ª DP). Ainda consumido por google-drive.ts até a Fase 1.5.` **Manter** `ATRIBUICAO_FOLDER_IDS` e `EXTRA_ATRIBUICAO_FOLDERS`.

- [ ] **Step 3: Substituir o duplicado local da página admin**

Em `admin/settings/drive/page.tsx`, trocar a cópia local por dados do `myDriveStatus`/grupo (ou `ATRIBUICAO_LABELS` se for só exibição), refletindo o grupo do usuário logado.

- [ ] **Step 4: Suíte completa + typecheck + lint**

Run: `npm test -- --run && npm run typecheck && npm run lint`
Expected: tudo verde (exceto quarentena conhecida de Postgres).

- [ ] **Step 5: Verificação manual de não-regressão (conta do Rodrigo)**

Confirmar que, com o grupo seedado (Task 3, **com as extras**), o sync/análise via `drive.ts` (resolver) e os fluxos via `google-drive.ts` (grupo padrão legado) da conta do Rodrigo continuam varrendo exatamente as mesmas pastas — inclusive VVD-MPU, Substituição-cível e Grupo-Júri-extra.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(drive): separa labels; ATRIBUICAO_FOLDER_IDS vira grupo padrao legado (google-drive.ts -> Fase 1.5)"
```

---

## Critérios de aceite da Fase 1

- [ ] `drive_groups` existe; `users.driveGroupId`, `driveFiles.userId`, `driveSyncFolders.userId` aplicados.
- [ ] Resolver cobre as 6 atribuições com **multi-pasta** (`string[]`), com testes verdes.
- [ ] Grupo do Rodrigo seedado **com as pastas extras** (VVD-MPU, Substituição-cível, Grupo-Júri-extra) → **zero regressão** no fluxo atual dele.
- [ ] Acessos diretos a `ATRIBUICAO_FOLDER_IDS`/`EXTRA_ATRIBUICAO_FOLDERS` migrados em `drive.ts` **e** `distribuicao.ts`; `SPECIAL_FOLDER_IDS` preservada.
- [ ] Um 2º defensor consegue: conectar Google → provisionar árvore → ver folders no `drive_groups` próprio.
- [ ] Nenhum `process.env.HOME ?? "/Users/rodrigorochameire"`, `DRIVE_BASE_PATH` ou `Meu Drive/1 - Defensoria 9ª DP/...` literal restante em `drive.ts`/`distribuicao.ts`/`analyze`/`pje-import-modal`.
- [ ] `ATRIBUICAO_FOLDER_IDS` mantida como **grupo padrão legado** (consumida só por `google-drive.ts`); labels separados em `ATRIBUICAO_LABELS`.
- [ ] `npm test`, `npm run typecheck`, `npm run lint` verdes.

## Fase 1.5 (follow-up, fora desta fase)
- Migrar `src/lib/services/google-drive.ts` (~12 usos) para o resolver por grupo, incluindo o **design do reverse-sync por webhook** (`FOLDER_ID_TO_ATRIBUICAO`): resolver `folderId → (grupo, atribuição)` sem sessão de usuário.
- Só então remover `ATRIBUICAO_FOLDER_IDS`/`EXTRA_ATRIBUICAO_FOLDERS` de vez.

## Itens a confirmar antes/durante (do spec §9)

- **Labels das subpastas** fixas (iguais às do Rodrigo) vs. configuráveis — esta fase usa **fixas**; tornar configurável fica para evolução.
- **Comarca/unidade** do defensor novo (usada no nome da root folder) — vem de `users.comarcaId` → tabela `comarcas` (já existe).
