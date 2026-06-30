# Drive Multi-Defensor — Continuação (handoff 2026-06-29)

Ponto de retomada para a expansão multi-defensor do Drive. Ler primeiro: o design mestre em
`docs/superpowers/specs/2026-06-28-ombuds-multi-defensor-drive-agente-skills-design.md`
(roadmap de 5 fases) e o spec/plano da Fase 1.5 em
`docs/superpowers/{specs,plans}/2026-06-29-fase1.5-google-drive-de-hardcode*`.

## Estado atual (LIVE em produção)

**Fase 1 + Fase 1.5 MERJADAS** — PR #297 (merge commit `5adfe7d9`), deployadas em `ombuds.vercel.app`.

- **Resolver por grupo** (`src/lib/services/drive-folders.ts`): `resolveAtribuicaoFolder(s)`, `resolveAllAtribuicaoFolders`, `findAtribuicaoForFolder` (puro), `resolveFolderToAtribuicao` (folderId→`{ownerUserId,atribuicao}`), `loadUserGroupFolders` (discriminador sem-grupo vs grupo-sem-chave).
- **`google-drive.ts` de-hardcoded**: reverse-sync (`handleNewAssistidoFolder`) atribui `defensorId=ownerUserId`; `resolveFolderToAtribuicaoOrLegacy` (fallback legado, não fica dormente pré-seed); forward `folderForAtribuicaoOrLegacy` com **fail-safe** (usuário com grupo nunca cai no Drive de outro defensor) + `ownerUserId?` opcional nas 3 funções.
- **`assistidos.ts`** resolve dono pelo `defensorId` do próprio assistido.
- `SPECIAL_FOLDER_IDS` intocado. Assistidos seguem **compartilhados** (só atribuição de dono, não isolamento — decisão de design).

**Verificado em prod (2026-06-29):** `users.drive_group_id` EXISTE; `/api/auth/debug` (login) OK; `drive_groups` id=1 (owner_user_id=1, label set, 6 atribuições EP/VVD/JURI/CRIMINAL/GRUPO_JURI/SUBSTITUICAO); `users.id=1 → drive_group_id=1`. **Single-tenant (Rodrigo) 100% ativo, reverse-sync incluído.**

## ⚠️ Lição (outage do #297) — ler antes de mexer em schema

O #297 foi deployado **antes** de a migração `0066` ter sido aplicada em prod (o gate foi marcado ✅ por engano). Resultado: `users.drive_group_id` não existia → **toda** `db.query.users.findFirst` lançava `column does not exist` → **login/getSession quebrados em produção** (outage). Diagnóstico: `GET /api/auth/debug` (mesma query do login). Fix: aplicar o `0066` (idempotente/aditivo).

**Regra:** migração schema-acoplada NUNCA é ✅ sem provar na base de prod (`information_schema` ou a debug route). Idealmente, plugar migrações no pipeline de deploy (Vercel build step ou release gate) para o código não subir à frente das colunas. Migrações aqui são **SQL incremental idempotente** em `drizzle/NNNN_*.sql` (NÃO usar `drizzle-kit generate`); `drizzle/meta/` não é versionado. Números em uso: até `0066` (drive). `0067` reservado pela branch `feat/sentenca-intelligence` — conferir o maior número antes de numerar.

## PRÓXIMO PASSO (retomar aqui) — Fase 2: onboarding do 2º defensor

Único item pendente da Fase 1/1.5. Objetivo: provar o fluxo multi-tenant ponta-a-ponta com um defensor que **não** é o Rodrigo.

1. Logar como um 2º defensor (criar/usar uma conta `role=defensor` distinta).
2. Rodar o onboarding OAuth do Google Drive (página de settings/planilha → `googleIntegration.myStatus`).
3. Disparar o provisionamento (`createUserDriveStructure` em `src/lib/services/google-drive-peruser.ts`) → deve criar a árvore de pastas de atribuição NO Drive do 2º defensor e gravar um novo `drive_groups` + `users.drive_group_id`.
4. Validar isolamento: criar/mover uma pasta de assistido como o 2º defensor → cai no Drive DELE, nunca no do Rodrigo (é o que o fail-safe garante; confirmar na prática).
5. **Risco conhecido a corrigir** (achado do review final, deferido): `createUserDriveStructure` NÃO é transacional — se morrer entre criar as pastas e gravar `drive_group_id`, um retry cria pastas/grupo duplicados. Envolver as 2 escritas de DB em transação e/ou tornar a criação de pasta idempotente (search-before-create) ANTES de expor a vários defensores.

## Roadmap restante (do design mestre 2026-06-28)

- **Fase 2** — visibilidade em 2 níveis derivada da atuação (além do onboarding acima).
- **Fase 3** — agente local HTTP por token (Approach A): cada defensor roda um agente que acessa o Drive dele.
- **Fase 4** — instalador 1-comando.
- **Fase 5** — marketplace de skills em camadas (curado + comunidade).

## Achados menores deferidos (do review final do #297)

- Testes de contrato da Fase 1.5 são string-scan; vale adicionar testes de runtime para a matriz do `folderForAtribuicaoOrLegacy` e o LINK `bestMatch.defensorId ?? ownerUserId`.
- Código morto a remover na varredura: `getFolderIdForAtribuicao` e `EXTRA_ATRIBUICAO_FOLDERS` (sem call sites).
- `mapAtribuicaoEnumToSimple` colapsa `CRIMINAL → SUBSTITUICAO` (default) — agora em caminho vivo (`analyze`, `getSuggestedFolderForAssistido`); idealmente ganhar um case `CRIMINAL`.

## Comandos úteis

```bash
# Verificar prod (coluna + seed) — rodar do root do projeto (precisa DATABASE_URL no .env.local)
# (script ad-hoc com `postgres`: information_schema.columns users.drive_group_id + select * from drive_groups)

# Seed do grupo (idempotente; no-op se já vinculado)
node scripts/seed-drive-group-rodrigo.mjs

# Aplicar migração (quando houver nova)
npm run db:push   # drizzle-kit push (schema-diff) — ou aplicar o SQL incremental direto
```

## Pointers

- Resolver: `src/lib/services/drive-folders.ts`
- Drive ops de-hardcoded: `src/lib/services/google-drive.ts`
- Provisionamento/onboarding: `src/lib/services/google-drive-peruser.ts`
- Caller canônico: `src/lib/trpc/routers/assistidos.ts` (`ensureDriveFolderForAssistido`)
- Schema: `src/lib/db/schema/drive.ts` (`driveGroups`, `atribuicaoFolders` jsonb)
- Migração: `drizzle/0066_drive_groups.sql` | Seed: `scripts/seed-drive-group-rodrigo.mjs`
- Design mestre: `docs/superpowers/specs/2026-06-28-ombuds-multi-defensor-drive-agente-skills-design.md`
- Memória: `project_multidefensor_fase1` (estado merjado + lição do outage)
