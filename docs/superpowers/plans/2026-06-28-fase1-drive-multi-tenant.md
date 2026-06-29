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
| `src/lib/trpc/routers/drive.ts` | router tRPC de Drive | **Modify**: trocar usos da constante pelo resolver; add mutation `provisionMyDrive` |
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
  id: serial().primaryKey().notNull(),
  ownerUserId: integer("owner_user_id").notNull(),
  label: text().notNull(),
  // { JURI: "<folderId>", VVD: "...", EP: "...", SUBSTITUICAO: "...", GRUPO_JURI: "...", CRIMINAL: "..." }
  atribuicaoFolders: jsonb("atribuicao_folders").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
}, (table) => ({
  ownerIdx: index("drive_groups_owner_idx").on(table.ownerUserId),
}));
```

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

Seguindo o padrão do arquivo, adicionar (e referenciar em `usersRelations` se existir):
```typescript
export const driveGroupsRelations = relations(driveGroups, ({ one, many }) => ({
  owner: one(users, { fields: [driveGroups.ownerUserId], references: [users.id] }),
  members: many(users),
}));
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
import { pickAtribuicaoFolder, ATRIBUICOES } from "../drive-folders";

describe("pickAtribuicaoFolder", () => {
  const folders = { JURI: "fJuri", VVD: "fVvd", EP: "fEp" };

  it("retorna o folderId da atribuição quando existe", () => {
    expect(pickAtribuicaoFolder(folders, "VVD")).toBe("fVvd");
  });

  it("retorna null quando a atribuição não está mapeada", () => {
    expect(pickAtribuicaoFolder(folders, "CRIMINAL")).toBeNull();
  });

  it("retorna null para mapa vazio", () => {
    expect(pickAtribuicaoFolder({}, "JURI")).toBeNull();
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

/** Lógica pura: escolhe o folderId da atribuição no mapa do grupo. */
export function pickAtribuicaoFolder(
  folders: Record<string, string>,
  atribuicao: Atribuicao,
): string | null {
  return folders?.[atribuicao] ?? null;
}

/** Resolve a pasta de uma atribuição para um defensor, via o grupo de Drive dele. */
export async function resolveAtribuicaoFolder(
  userId: number,
  atribuicao: Atribuicao,
): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { driveGroupId: true },
  });
  if (!user?.driveGroupId) return null;

  const group = await db.query.driveGroups.findFirst({
    where: eq(driveGroups.id, user.driveGroupId),
  });
  const folders = (group?.atribuicaoFolders ?? {}) as Record<string, string>;
  return pickAtribuicaoFolder(folders, atribuicao);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- --run src/lib/services/__tests__/drive-folders.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/drive-folders.ts src/lib/services/__tests__/drive-folders.test.ts
git commit -m "feat(drive): resolver resolveAtribuicaoFolder por grupo de Drive (TDD)"
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

const ATRIBUICAO_FOLDERS = {
  JURI: "1_S-2qdqO0n1npNcs0PnoagBM4ZtwKhk-",
  VVD: "1fN2GiGlNzc61g01ZeBMg9ZBy1hexx0ti",
  EP: "1-mbwgP3-ygVVjoN9RPTbHwnaicnBAv0q",
  SUBSTITUICAO: "1eNDT0j-5KQkzYXbqK6IBa9sIMT3QFWVU",
  GRUPO_JURI: "1LUW4yauxm6iaJYCrjRgXAnSgTZIbel2j",
  CRIMINAL: "1xMwqXkBgEc3bsJkO3ioPt4u50D4lpJ5u",
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

Run: `node -e "import('@supabase/supabase-js').then(async({createClient})=>{const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);const{data}=await s.from('drive_groups').select('*');console.log(data)})"`
Expected: 1 linha com os 6 folderIds.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-drive-group-rodrigo.mjs
git commit -m "feat(drive): seed do grupo de Drive do Rodrigo com as pastas atuais"
```

---

## Task 4: Trocar os usos de `ATRIBUICAO_FOLDER_IDS` no router de Drive

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts` (usos em ~linhas 53, 56, 125–132)
- Modify: `src/lib/utils/text-extraction.ts` (marcar constante como legado)

- [ ] **Step 1: Mapear os usos atuais**

Run: `Grep` por `ATRIBUICAO_FOLDER_IDS` em `src/` e listar cada ocorrência.
Expected: ocorrências em `drive.ts`, `drive-constants.ts`, `admin/settings/drive/page.tsx`, `api/analyze/route.ts`.

- [ ] **Step 2: No `drive.ts`, resolver por usuário**

Onde hoje o router lê `ATRIBUICAO_FOLDER_IDS[atribuicao]`, trocar por `await resolveAtribuicaoFolder(ctx.session.user.id, atribuicao)` (importar de `@/lib/services/drive-folders`). Onde o router itera todas as atribuições, montar o conjunto a partir do `driveGroups.atribuicaoFolders` do usuário (uma leitura do grupo) em vez da constante. Tratar `null` (grupo ausente) retornando lista vazia + flag `needsProvisioning: true`.

- [ ] **Step 3: Type-check**

Run: `npm run typecheck` (ou `npx tsc --noEmit`)
Expected: sem erros relacionados a `drive.ts`.

- [ ] **Step 4: Marcar a constante como legado em `text-extraction.ts`**

Adicionar comentário `@deprecated use resolveAtribuicaoFolder` acima de `ATRIBUICAO_FOLDER_IDS` (não remover ainda — `drive-constants.ts` / página admin ainda usam para *labels*; a remoção total é a última task).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/drive.ts src/lib/utils/text-extraction.ts
git commit -m "refactor(drive): router resolve pastas por grupo do usuário (substitui constante global)"
```

---

## Task 5: De-hardcode da rota de análise premium

**Files:**
- Modify: `src/app/api/analyze/route.ts` (linhas 34–35, 44–99, 132–134, 154)

A rota da nuvem não deve assumir `process.env.HOME` nem `Meu Drive/1 - Defensoria 9ª DP/...`. O caminho local é responsabilidade do agente (Fase 4); aqui passamos a referenciar a pasta da atribuição por **folderId** do grupo do usuário.

- [ ] **Step 1: Remover o fallback de HOME e os `drivePath` literais**

Em `ATRIBUICAO_CONFIG`, remover o campo `drivePath` de cada entrada (mantém `label`, `palette`, `skillPaths`). Remover o `DEFAULT_CONFIG.drivePath`.

- [ ] **Step 2: Resolver o folder da atribuição via grupo**

Onde hoje monta `const drivePath = join(homePath, config.drivePath)`, trocar por:
```typescript
import { resolveAtribuicaoFolder } from "@/lib/services/drive-folders";
// ...
const atribuicaoFolderId = await resolveAtribuicaoFolder(userId, atribuicaoKey);
// O prompt passa a referenciar a pasta por ID/URL do Drive, não por caminho local:
// `Pasta da atribuição no Drive: https://drive.google.com/drive/folders/${atribuicaoFolderId}`
```
Ajustar o trecho do prompt (linha ~154) para usar a URL do Drive em vez de `${drivePath}/${assistidoNome}/`.

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

const atribuicaoFolders: Record<string, string> = {};
for (const sf of ATRIBUICAO_SUBFOLDERS) {
  atribuicaoFolders[sf.key] = await createSubfolder(accessToken, rootFolder.id, sf.name);
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

## Task 10: Remoção final da constante global + verificação de fim de fase

**Files:**
- Modify: `src/components/drive/drive-constants.ts`, `src/app/(dashboard)/admin/settings/drive/page.tsx` (parar de depender de `ATRIBUICAO_FOLDER_IDS` para *dados*; manter só labels se necessário)
- Modify: `src/lib/utils/text-extraction.ts` (remover `ATRIBUICAO_FOLDER_IDS`/`EXTRA_ATRIBUICAO_FOLDERS` se não houver mais leitores de folderId)

- [ ] **Step 1: Reconfirmar que não há leitor de folderId pela constante**

Run: `Grep` por `ATRIBUICAO_FOLDER_IDS` e `EXTRA_ATRIBUICAO_FOLDERS`.
Expected: nenhum uso que leia folderId para sync/análise (só labels, se restar).

- [ ] **Step 2: Remover/segregar a constante**

Se restarem só usos de *label*, extrair um `ATRIBUICAO_LABELS` separado e remover os IDs. Se nada restar, remover as duas constantes e o `SPECIAL_FOLDER_IDS` se órfão.

- [ ] **Step 3: Suíte completa + typecheck + lint**

Run: `npm test -- --run && npm run typecheck && npm run lint`
Expected: tudo verde (exceto quarentena conhecida de Postgres).

- [ ] **Step 4: Verificação manual de não-regressão (conta do Rodrigo)**

Confirmar que, com o grupo seedado (Task 3), o sync e a análise da conta do Rodrigo continuam usando exatamente as mesmas pastas de antes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(drive): remove ATRIBUICAO_FOLDER_IDS global; folders 100% por grupo (fim da Fase 1)"
```

---

## Critérios de aceite da Fase 1

- [ ] `drive_groups` existe; `users.driveGroupId`, `driveFiles.userId`, `driveSyncFolders.userId` aplicados.
- [ ] Resolver `resolveAtribuicaoFolder` cobre as 6 atribuições, com testes verdes.
- [ ] Grupo do Rodrigo seedado → **zero regressão** no fluxo atual dele.
- [ ] Um 2º defensor consegue: conectar Google → provisionar árvore → ver folders no `drive_groups` próprio.
- [ ] Nenhum `process.env.HOME ?? "/Users/rodrigorochameire"`, `DRIVE_BASE_PATH` ou `Meu Drive/1 - Defensoria 9ª DP/...` literal restante no código da nuvem.
- [ ] `ATRIBUICAO_FOLDER_IDS` removida (ou reduzida a labels).
- [ ] `npm test`, `npm run typecheck`, `npm run lint` verdes.

## Itens a confirmar antes/durante (do spec §9)

- **Labels das subpastas** fixas (iguais às do Rodrigo) vs. configuráveis — esta fase usa **fixas**; tornar configurável fica para evolução.
- **Comarca/unidade** do defensor novo (usada no nome da root folder) — vem de `users.comarcaId` → tabela `comarcas` (já existe).
