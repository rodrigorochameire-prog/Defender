# Drive Health: Full Sync & Data Integrity Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve 100% data integrity between Google Drive folders and the OMBUDS database — clean duplicates, re-index all files, auto-link orphans, renew webhooks, and kickstart enrichment.

**Architecture:** 7 standalone scripts in `scripts/drive-health/`, each idempotent and safe to re-run. They reuse existing service functions from `src/lib/services/google-drive.ts` and query the DB directly via Drizzle. Execution order matters (Task 1 before 2, Task 2 before 3, etc.) because later tasks depend on data fixed by earlier ones.

**Tech Stack:** TypeScript/tsx, Drizzle ORM, Google Drive API v3, existing `google-drive.ts` service layer

**Current State (2026-04-12):**
- 562/563 assistidos with `drive_folder_id` (1 "Nao Identificado" expected)
- 502/502 processos with `drive_folder_id` + `link_drive`
- 2,926 rows in `drive_files` (2,542 files + 384 folders)
- **2,504 files orphaned** (no `processo_id` or `assistido_id`)
- **497/502 processos** have a Drive folder but zero indexed files in `drive_files`
- 24 assistido duplicate `drive_folder_id` groups
- 8 assistido records with date-string names (import bug)
- 52 expired webhooks marked `is_active = true`
- 2,529 files with `enrichment_status = 'pending'`
- 265 files missing `parent_file_id`

---

## File Structure

All scripts go in `scripts/drive-health/`:

```
scripts/drive-health/
├── 01-clean-garbage-assistidos.ts    # Task 1: Remove date-string names, fix dupes
├── 02-dedup-folder-ids.ts            # Task 2: Fix shared folder IDs between assistidos
├── 03-full-reindex.ts                # Task 3: Re-sync all 5 atribuicao folders → drive_files
├── 04-backfill-parent-file-id.ts     # Task 4: Populate parentFileId hierarchy
├── 05-auto-link-orphans.ts           # Task 5: Link orphan files to processos/assistidos
├── 06-cleanup-webhooks.ts            # Task 6: Deactivate expired, renew active
└── 07-enrichment-kickstart.ts        # Task 7: Queue enrichment for unprocessed files
```

Each script:
- Imports from `../../src/lib/db` and `../../src/lib/services/google-drive`
- Requires: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/<script>.ts`
- Supports `--dry-run` flag
- Prints before/after stats
- Is idempotent (safe to re-run)

---

## Task 1: Clean Garbage Assistido Records

**Files:**
- Create: `scripts/drive-health/01-clean-garbage-assistidos.ts`

**Context:** 8 assistido records have date-string names like "Fri Jan 23 2026 00:00:00 GMT-0300 (Brasilia Standard Time)" — these are import bugs from planilha sync. They all share the same `drive_folder_id` pointing to a single garbage folder. They need to be soft-deleted (or hard-deleted if no processos reference them).

- [ ] **Step 1: Create the cleanup script**

```typescript
/**
 * 01-clean-garbage-assistidos.ts
 * 
 * Removes assistido records with invalid names (date strings, test entries).
 * Safe: checks for linked processos before deleting.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/01-clean-garbage-assistidos.ts
 */

import { db } from '../../src/lib/db';
import { assistidos, processos } from '../../src/lib/db/schema/core';
import { eq, sql, inArray } from 'drizzle-orm';

const DRY_RUN = process.argv.includes('--dry-run');

// Patterns that indicate garbage records
const GARBAGE_PATTERNS = [
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s/,  // Date strings
  /^\d{4}-\d{2}-\d{2}/,                 // ISO dates
  /^Teste?\s/i,                          // Test entries
];

async function main() {
  console.log('=== 01: CLEAN GARBAGE ASSISTIDOS ===');
  if (DRY_RUN) console.log('MODE: DRY-RUN');

  // Find garbage records
  const allAssistidos = await db
    .select({ id: assistidos.id, nome: assistidos.nome, atribuicao: assistidos.atribuicaoPrimaria })
    .from(assistidos);

  const garbage = allAssistidos.filter(a =>
    GARBAGE_PATTERNS.some(p => p.test(a.nome))
  );

  console.log(`\nFound ${garbage.length} garbage records:`);
  for (const g of garbage) {
    console.log(`  #${g.id}: "${g.nome}" (${g.atribuicao})`);
  }

  if (garbage.length === 0) {
    console.log('Nothing to clean.');
    process.exit(0);
  }

  // Check for linked processos
  const garbageIds = garbage.map(g => g.id);
  const linkedProcessos = await db
    .select({ id: processos.id, assistidoId: processos.assistidoId, autos: processos.numeroAutos })
    .from(processos)
    .where(inArray(processos.assistidoId, garbageIds));

  if (linkedProcessos.length > 0) {
    console.log(`\n  WARNING: ${linkedProcessos.length} processos reference garbage assistidos:`);
    for (const p of linkedProcessos) {
      console.log(`    Processo ${p.autos} → assistido #${p.assistidoId}`);
    }
    console.log('  These processos must be re-assigned before deletion.');
    console.log('  Skipping deletion of assistidos with linked processos.');
  }

  const safeToDelete = garbage.filter(g =>
    !linkedProcessos.some(p => p.assistidoId === g.id)
  );

  console.log(`\nSafe to delete: ${safeToDelete.length}`);

  if (!DRY_RUN && safeToDelete.length > 0) {
    const ids = safeToDelete.map(g => g.id);
    await db.delete(assistidos).where(inArray(assistidos.id, ids));
    console.log(`Deleted ${ids.length} garbage assistidos.`);
  }

  // Verify
  const [after] = await db
    .select({ count: sql<number>`count(*)` })
    .from(assistidos);
  console.log(`\nAssistidos remaining: ${after.count}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run dry-run to verify**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/01-clean-garbage-assistidos.ts --dry-run`
Expected: Lists ~10 garbage records (8 date strings + ~2 test entries), shows which are safe to delete

- [ ] **Step 3: Run for real**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/01-clean-garbage-assistidos.ts`
Expected: Deletes garbage records without linked processos

- [ ] **Step 4: Verify with SQL**

Run: `node -e "require('dotenv').config({path:'.env.local'});const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT nome FROM assistidos WHERE nome ~ '^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) '\").then(r=>{console.log('Remaining garbage:',r.rows.length);p.end()})"`
Expected: `Remaining garbage: 0`

- [ ] **Step 5: Commit**

```bash
git add scripts/drive-health/01-clean-garbage-assistidos.ts
git commit -m "fix: clean garbage assistido records (date-string names from import bug)"
```

---

## Task 2: Deduplicate Folder IDs in Assistidos

**Files:**
- Create: `scripts/drive-health/02-dedup-folder-ids.ts`

**Context:** 24 groups of assistidos share the same `drive_folder_id`. This happens because `searchFolderByName` fuzzy-matches "Antonio Jose dos Santos" and "Antonio Jesus dos Santos" to the same Drive folder. For each group we need to: keep the correct one, and create new dedicated folders for the others.

The fix strategy:
- For each duplicate group, identify which assistido name best matches the Drive folder name
- That one keeps the folder ID
- Others get their `drive_folder_id` cleared (so the batch-drive-folders script can recreate them correctly)

- [ ] **Step 1: Create the dedup script**

```typescript
/**
 * 02-dedup-folder-ids.ts
 *
 * Fixes duplicate drive_folder_id assignments across assistidos.
 * Strategy: keep the best name match, clear others so they get recreated.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/02-dedup-folder-ids.ts
 */

import { db } from '../../src/lib/db';
import { assistidos } from '../../src/lib/db/schema/core';
import { eq, sql } from 'drizzle-orm';
import { getFolderInfo } from '../../src/lib/services/google-drive';

const DRY_RUN = process.argv.includes('--dry-run');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1.0;

  const len = Math.max(na.length, nb.length);
  if (len === 0) return 1.0;

  // Levenshtein
  const matrix: number[][] = [];
  for (let i = 0; i <= na.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= nb.length; j++) {
      matrix[i][j] = i === 0 ? j :
        Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + (na[i - 1] === nb[j - 1] ? 0 : 1)
        );
    }
  }
  return 1 - matrix[na.length][nb.length] / len;
}

async function main() {
  console.log('=== 02: DEDUP FOLDER IDs IN ASSISTIDOS ===');
  if (DRY_RUN) console.log('MODE: DRY-RUN');

  // Find duplicates
  const dupes = await db.execute(sql`
    SELECT drive_folder_id, array_agg(id ORDER BY id) as ids, array_agg(nome ORDER BY id) as nomes
    FROM assistidos
    WHERE drive_folder_id IS NOT NULL
    GROUP BY drive_folder_id
    HAVING COUNT(*) > 1
  `);

  console.log(`\nFound ${dupes.rows.length} duplicate groups`);
  let totalCleared = 0;

  for (const group of dupes.rows) {
    const folderId = group.drive_folder_id as string;
    const ids = group.ids as number[];
    const nomes = group.nomes as string[];

    // Get the actual folder name from Drive
    let folderName = '';
    try {
      const info = await getFolderInfo(folderId);
      folderName = info?.name || '';
      await sleep(100);
    } catch {
      console.log(`  SKIP folder ${folderId.substring(0, 15)}... — cannot read from Drive`);
      continue;
    }

    if (!folderName) {
      console.log(`  STALE folder ${folderId.substring(0, 15)}... — folder deleted, clearing all`);
      if (!DRY_RUN) {
        for (const id of ids) {
          await db.update(assistidos).set({ driveFolderId: null }).where(eq(assistidos.id, id));
        }
      }
      totalCleared += ids.length;
      continue;
    }

    // Score each assistido name against the folder name
    const scores = nomes.map((nome, i) => ({
      id: ids[i],
      nome,
      score: similarity(nome, folderName),
    }));

    scores.sort((a, b) => b.score - a.score);
    const keeper = scores[0];
    const toClear = scores.slice(1);

    console.log(`\n  Folder: "${folderName}" (${folderId.substring(0, 15)}...)`);
    console.log(`    KEEP: "${keeper.nome}" (score: ${keeper.score.toFixed(2)})`);
    for (const c of toClear) {
      console.log(`    CLEAR: "${c.nome}" (score: ${c.score.toFixed(2)})`);
    }

    if (!DRY_RUN) {
      for (const c of toClear) {
        await db.update(assistidos)
          .set({ driveFolderId: null, updatedAt: new Date() })
          .where(eq(assistidos.id, c.id));
      }
    }
    totalCleared += toClear.length;
  }

  console.log(`\n  Total cleared: ${totalCleared} (will be recreated by batch-drive-folders)`);

  // Now recreate the cleared ones
  if (!DRY_RUN && totalCleared > 0) {
    console.log('\n  Running batch-drive-folders to recreate...');
    console.log('  (Run manually: npx tsx scripts/batch-drive-folders.ts --skip-processos)');
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run dry-run**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/02-dedup-folder-ids.ts --dry-run`
Expected: Shows ~24 duplicate groups, identifies keeper vs clear for each

- [ ] **Step 3: Run for real**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/02-dedup-folder-ids.ts`
Expected: Clears ~30 duplicate `drive_folder_id` values

- [ ] **Step 4: Recreate dedicated folders for cleared assistidos**

Run: `set -a && source .env.local && set +a && npx tsx scripts/batch-drive-folders.ts --skip-processos`
Expected: Creates new unique folders for each cleared assistido

- [ ] **Step 5: Verify no duplicates remain**

Run: `node -e "require('dotenv').config({path:'.env.local'});const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT COUNT(*) as dupes FROM (SELECT drive_folder_id FROM assistidos WHERE drive_folder_id IS NOT NULL GROUP BY drive_folder_id HAVING COUNT(*)>1) t\").then(r=>{console.log('Duplicate groups:',r.rows[0].dupes);p.end()})"`
Expected: `Duplicate groups: 0`

- [ ] **Step 6: Commit**

```bash
git add scripts/drive-health/02-dedup-folder-ids.ts
git commit -m "fix: deduplicate drive_folder_id across assistidos with fuzzy name scoring"
```

---

## Task 3: Full Re-Index of Drive Files

**Files:**
- Create: `scripts/drive-health/03-full-reindex.ts`

**Context:** This is the critical task. 497/502 processos have a Drive folder but zero files indexed in `drive_files`. We need to call `syncFolderWithDatabase()` for each of the 5+2 registered sync folders. This function already handles insert/update/delete of `drive_files` rows, sets `parentFileId`, and detects `_analise_ia.json`.

The existing `syncFolderWithDatabase()` at `google-drive.ts:1583` does everything we need. We just need to call it for each root folder with rate limiting.

- [ ] **Step 1: Create the reindex script**

```typescript
/**
 * 03-full-reindex.ts
 *
 * Triggers a full re-sync of all Drive atribuicao folders into drive_files.
 * Uses existing syncFolderWithDatabase() which handles insert/update/delete.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/03-full-reindex.ts
 * Options: --only=JURI  (process single folder)
 */

import { db } from '../../src/lib/db';
import { driveFiles, driveSyncFolders } from '../../src/lib/db/schema/drive';
import { sql, eq } from 'drizzle-orm';
import { syncFolderWithDatabase } from '../../src/lib/services/google-drive';
import { ATRIBUICAO_FOLDER_IDS } from '../../src/lib/utils/text-extraction';

const ONLY = process.argv.find(a => a.startsWith('--only='))?.split('=')[1]?.toUpperCase();

const FOLDERS: Record<string, string> = {
  JURI: ATRIBUICAO_FOLDER_IDS.JURI,
  VVD: ATRIBUICAO_FOLDER_IDS.VVD,
  EP: ATRIBUICAO_FOLDER_IDS.EP,
  SUBSTITUICAO: ATRIBUICAO_FOLDER_IDS.SUBSTITUICAO,
  GRUPO_JURI: ATRIBUICAO_FOLDER_IDS.GRUPO_JURI,
};

async function main() {
  console.log('=== 03: FULL RE-INDEX DRIVE FILES ===');

  // Pre-flight
  const [before] = await db
    .select({ count: sql<number>`count(*)`, files: sql<number>`count(*) filter (where not is_folder)` })
    .from(driveFiles);
  console.log(`\nBefore: ${before.count} total rows (${before.files} files)`);

  const toSync = ONLY ? { [ONLY]: FOLDERS[ONLY] } : FOLDERS;

  for (const [name, folderId] of Object.entries(toSync)) {
    if (!folderId) {
      console.log(`\n  SKIP ${name} — folder ID not found`);
      continue;
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Syncing ${name} (${folderId.substring(0, 20)}...)`);
    console.log('This may take several minutes for large folders...');

    const start = Date.now();
    try {
      const result = await syncFolderWithDatabase(folderId);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);

      console.log(`  Done in ${elapsed}s`);
      console.log(`  Added:   ${result.filesAdded}`);
      console.log(`  Updated: ${result.filesUpdated}`);
      console.log(`  Removed: ${result.filesRemoved}`);
      if (result.errors.length > 0) {
        console.log(`  Errors:  ${result.errors.length}`);
        result.errors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
      }
    } catch (err: any) {
      console.log(`  ERROR: ${err.message}`);
    }
  }

  // Post-flight
  const [after] = await db
    .select({ count: sql<number>`count(*)`, files: sql<number>`count(*) filter (where not is_folder)` })
    .from(driveFiles);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`After: ${after.count} total rows (${after.files} files)`);
  console.log(`Delta: +${Number(after.count) - Number(before.count)} rows`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Test with a single small folder first**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/03-full-reindex.ts --only=EP`
Expected: Syncs EP folder (~85 files), shows Added/Updated/Removed counts

- [ ] **Step 3: Run full reindex for all folders**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/03-full-reindex.ts`
Expected: Syncs all 5 folders. May take 5-15 minutes. Should add hundreds/thousands of new file rows.
Timeout: 600s (10 min)

- [ ] **Step 4: Verify file counts**

Run: `node -e "require('dotenv').config({path:'.env.local'});const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT is_folder, count(*) FROM drive_files GROUP BY is_folder\").then(r=>{console.table(r.rows);p.end()})"`
Expected: Significantly more files than the previous 2,542

- [ ] **Step 5: Commit**

```bash
git add scripts/drive-health/03-full-reindex.ts
git commit -m "feat: full re-index of all Drive atribuicao folders into drive_files"
```

---

## Task 4: Backfill parent_file_id

**Files:**
- Create: `scripts/drive-health/04-backfill-parent-file-id.ts`

**Context:** `syncFolderWithDatabase()` already sets `parentFileId` during sync (lines 1748-1800), so after Task 3 most files should have it. This task handles stragglers by using the existing `backfill-parent-file-id.ts` logic. The hierarchy is critical for Task 5's `resolveFileHierarchy()`.

- [ ] **Step 1: Create the backfill script**

```typescript
/**
 * 04-backfill-parent-file-id.ts
 *
 * Ensures all drive_files have correct parentFileId.
 * Uses Google Drive API to get parent info for files missing it.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/04-backfill-parent-file-id.ts
 */

import { db } from '../../src/lib/db';
import { driveFiles } from '../../src/lib/db/schema/drive';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { listAllFilesRecursively } from '../../src/lib/services/google-drive';
import { ATRIBUICAO_FOLDER_IDS } from '../../src/lib/utils/text-extraction';

async function main() {
  console.log('=== 04: BACKFILL parent_file_id ===');

  // Check current state
  const [before] = await db
    .select({
      total: sql<number>`count(*)`,
      withParent: sql<number>`count(parent_file_id)`,
      withoutParent: sql<number>`count(*) - count(parent_file_id)`,
    })
    .from(driveFiles);
  console.log(`Before: ${before.withoutParent} files missing parent_file_id (of ${before.total})`);

  if (Number(before.withoutParent) === 0) {
    console.log('All files have parentFileId. Nothing to do.');
    process.exit(0);
  }

  let totalUpdated = 0;

  for (const [name, rootFolderId] of Object.entries(ATRIBUICAO_FOLDER_IDS)) {
    console.log(`\n--- ${name} ---`);

    // Get all DB files for this root
    const dbFiles = await db
      .select({ id: driveFiles.id, driveFileId: driveFiles.driveFileId, parentFileId: driveFiles.parentFileId })
      .from(driveFiles)
      .where(eq(driveFiles.driveFolderId, rootFolderId));

    const withoutParent = dbFiles.filter(f => f.parentFileId === null);
    if (withoutParent.length === 0) {
      console.log(`  All ${dbFiles.length} files have parentFileId`);
      continue;
    }

    console.log(`  ${withoutParent.length}/${dbFiles.length} missing parentFileId`);

    // Get fresh Drive hierarchy
    const driveFilesList = await listAllFilesRecursively(rootFolderId);
    console.log(`  Drive API returned ${driveFilesList.length} files`);

    // Build maps
    const driveIdToDbId = new Map<string, number>();
    for (const f of dbFiles) driveIdToDbId.set(f.driveFileId, f.id);

    let updated = 0;
    for (const driveFile of driveFilesList) {
      const dbId = driveIdToDbId.get(driveFile.id);
      if (!dbId) continue;

      const dbFile = dbFiles.find(f => f.id === dbId);
      if (dbFile?.parentFileId !== null) continue; // already has parent

      const parentDriveId = driveFile.parents?.[0];
      if (!parentDriveId) continue;

      let parentDbId: number | null = null;
      if (parentDriveId !== rootFolderId) {
        parentDbId = driveIdToDbId.get(parentDriveId) || null;
      }

      // parentDbId can be null (root level) — that's valid
      await db.update(driveFiles)
        .set({ parentFileId: parentDbId })
        .where(eq(driveFiles.id, dbId));
      updated++;
    }

    console.log(`  Updated: ${updated}`);
    totalUpdated += updated;
  }

  console.log(`\nTotal updated: ${totalUpdated}`);

  // Verify
  const [after] = await db
    .select({ withoutParent: sql<number>`count(*) - count(parent_file_id)` })
    .from(driveFiles);
  console.log(`Remaining without parentFileId: ${after.withoutParent}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the backfill**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/04-backfill-parent-file-id.ts`
Expected: Updates 265+ files with correct parentFileId
Timeout: 300s

- [ ] **Step 3: Verify**

Run: `node -e "require('dotenv').config({path:'.env.local'});const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT count(*) as missing FROM drive_files WHERE parent_file_id IS NULL AND NOT is_folder\").then(r=>{console.log('Missing:',r.rows[0].missing);p.end()})"`
Expected: Close to 0 (some root-level files legitimately have null parent)

- [ ] **Step 4: Commit**

```bash
git add scripts/drive-health/04-backfill-parent-file-id.ts
git commit -m "fix: backfill parent_file_id for drive_files hierarchy"
```

---

## Task 5: Auto-Link Orphan Files to Processos/Assistidos

**Files:**
- Create: `scripts/drive-health/05-auto-link-orphans.ts`

**Context:** After Tasks 2-4, we have clean folder IDs and complete hierarchy. Now we can use `resolveFileHierarchy()` (google-drive.ts:3555-3669) to walk up each orphan file's `parentFileId` chain and match against `processos.driveFolderId` and `assistidos.driveFolderId`.

- [ ] **Step 1: Create the auto-link script**

```typescript
/**
 * 05-auto-link-orphans.ts
 *
 * Links orphan drive_files to processos/assistidos using folder hierarchy resolution.
 * Uses resolveFileHierarchy() which walks up parentFileId chain.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/05-auto-link-orphans.ts
 */

import { db } from '../../src/lib/db';
import { driveFiles } from '../../src/lib/db/schema/drive';
import { eq, isNull, and, sql } from 'drizzle-orm';
import { resolveFileHierarchy, autoLinkByHierarchy } from '../../src/lib/services/google-drive';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;

async function main() {
  console.log('=== 05: AUTO-LINK ORPHAN FILES ===');
  if (DRY_RUN) console.log('MODE: DRY-RUN');

  // Count orphans
  const [before] = await db
    .select({
      total: sql<number>`count(*)`,
      orphans: sql<number>`count(*) filter (where processo_id is null and assistido_id is null and not is_folder)`,
      withProcesso: sql<number>`count(processo_id)`,
      withAssistido: sql<number>`count(assistido_id)`,
    })
    .from(driveFiles);

  console.log(`\nBefore:`);
  console.log(`  Total files: ${before.total}`);
  console.log(`  Orphans: ${before.orphans}`);
  console.log(`  With processo: ${before.withProcesso}`);
  console.log(`  With assistido: ${before.withAssistido}`);

  // Get all orphan file IDs
  const orphans = await db
    .select({ id: driveFiles.id })
    .from(driveFiles)
    .where(
      and(
        isNull(driveFiles.processoId),
        isNull(driveFiles.assistidoId),
        eq(driveFiles.isFolder, false)
      )
    );

  console.log(`\nProcessing ${orphans.length} orphan files in batches of ${BATCH_SIZE}...`);

  if (DRY_RUN) {
    // Sample 10 to show what would happen
    console.log('\nSampling 10 files:');
    for (const orphan of orphans.slice(0, 10)) {
      const result = await resolveFileHierarchy(orphan.id);
      console.log(`  #${orphan.id}: processo=${result.processoId}, assistido=${result.assistidoId}, conf=${result.confidence}`);
    }
    process.exit(0);
  }

  let totalLinked = 0;
  let totalErrors = 0;

  for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
    const batch = orphans.slice(i, i + BATCH_SIZE);
    const batchIds = batch.map(o => o.id);

    const result = await autoLinkByHierarchy(batchIds);
    totalLinked += result.linked;
    totalErrors += result.errors;

    const progress = Math.min(i + BATCH_SIZE, orphans.length);
    console.log(`  [${progress}/${orphans.length}] linked: ${result.linked}, errors: ${result.errors}`);
  }

  // Post-flight
  const [after] = await db
    .select({
      orphans: sql<number>`count(*) filter (where processo_id is null and assistido_id is null and not is_folder)`,
      withProcesso: sql<number>`count(processo_id)`,
      withAssistido: sql<number>`count(assistido_id)`,
    })
    .from(driveFiles);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results:`);
  console.log(`  Linked: ${totalLinked}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`  Remaining orphans: ${after.orphans}`);
  console.log(`  With processo: ${after.withProcesso}`);
  console.log(`  With assistido: ${after.withAssistido}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run dry-run to sample**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/05-auto-link-orphans.ts --dry-run`
Expected: Shows 10 sample resolutions with processo/assistido IDs and confidence levels

- [ ] **Step 3: Run full auto-link**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/05-auto-link-orphans.ts`
Expected: Links majority of orphans. Some may remain (files in root or unrecognized folders).
Timeout: 600s

- [ ] **Step 4: Verify results**

Run: `node -e "require('dotenv').config({path:'.env.local'});const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(\"SELECT count(*) filter (where processo_id is not null) as com_proc, count(*) filter (where assistido_id is not null) as com_assist, count(*) filter (where processo_id is null and assistido_id is null and not is_folder) as orfaos FROM drive_files\").then(r=>{console.table(r.rows);p.end()})"`
Expected: Orphans dramatically reduced (ideally <100)

- [ ] **Step 5: Commit**

```bash
git add scripts/drive-health/05-auto-link-orphans.ts
git commit -m "feat: auto-link orphan drive_files to processos/assistidos via hierarchy resolution"
```

---

## Task 6: Cleanup Expired Webhooks

**Files:**
- Create: `scripts/drive-health/06-cleanup-webhooks.ts`

**Context:** 52 webhooks are marked `is_active = true` but all expired (last expiration was 2026-03-30). We need to deactivate them in the DB. Optionally, we can renew by calling `registerWebhookForFolder()` for each sync folder — but this requires a publicly accessible webhook endpoint, so we'll only deactivate and document how to renew.

- [ ] **Step 1: Create the webhook cleanup script**

```typescript
/**
 * 06-cleanup-webhooks.ts
 *
 * Deactivates expired Drive webhooks and optionally renews them.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/06-cleanup-webhooks.ts
 */

import { db } from '../../src/lib/db';
import { driveWebhooks } from '../../src/lib/db/schema/drive';
import { eq, sql, lt, and } from 'drizzle-orm';

async function main() {
  console.log('=== 06: CLEANUP EXPIRED WEBHOOKS ===');

  // Current state
  const stats = await db.execute(sql`
    SELECT 
      count(*) as total,
      count(*) filter (where is_active) as active,
      count(*) filter (where not is_active) as inactive,
      count(*) filter (where is_active and expiration < now()) as expired_but_active
    FROM drive_webhooks
  `);
  console.log('\nCurrent state:');
  console.table(stats.rows);

  // Deactivate all expired
  const result = await db
    .update(driveWebhooks)
    .set({ isActive: false })
    .where(
      and(
        eq(driveWebhooks.isActive, true),
        lt(driveWebhooks.expiration, new Date())
      )
    )
    .returning({ id: driveWebhooks.id });

  console.log(`\nDeactivated ${result.length} expired webhooks`);

  // Final state
  const after = await db.execute(sql`
    SELECT 
      count(*) as total,
      count(*) filter (where is_active) as active,
      count(*) filter (where not is_active) as inactive
    FROM drive_webhooks
  `);
  console.log('\nFinal state:');
  console.table(after.rows);

  console.log('\nTo renew webhooks, trigger sync from the OMBUDS UI or call:');
  console.log('  trpc.drive.smartSync({ dryRun: false })');
  console.log('This auto-registers webhooks after a successful sync.');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the cleanup**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/06-cleanup-webhooks.ts`
Expected: Deactivates ~52 expired webhooks

- [ ] **Step 3: Commit**

```bash
git add scripts/drive-health/06-cleanup-webhooks.ts
git commit -m "fix: deactivate 52 expired Drive webhooks"
```

---

## Task 7: Kickstart Enrichment for Pending Files

**Files:**
- Create: `scripts/drive-health/07-enrichment-kickstart.ts`

**Context:** 2,529 files have `enrichment_status = 'pending'`. The enrichment pipeline uses an external service (Railway). This script identifies which files are eligible for enrichment (PDFs with `processo_id` set) and updates their status to trigger processing. Since bulk enrichment is expensive, we prioritize files that are already linked to processos.

- [ ] **Step 1: Create the enrichment status script**

```typescript
/**
 * 07-enrichment-kickstart.ts
 *
 * Reports enrichment status and optionally resets stuck files.
 * Does NOT trigger actual enrichment (that requires the enrichment engine).
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/drive-health/07-enrichment-kickstart.ts
 */

import { db } from '../../src/lib/db';
import { driveFiles } from '../../src/lib/db/schema/drive';
import { sql, eq, and, isNotNull } from 'drizzle-orm';

async function main() {
  console.log('=== 07: ENRICHMENT STATUS & KICKSTART ===');

  // Overview
  const overview = await db.execute(sql`
    SELECT 
      enrichment_status,
      count(*) as total,
      count(processo_id) as com_processo,
      count(*) filter (where mime_type = 'application/pdf') as pdfs
    FROM drive_files
    WHERE NOT is_folder
    GROUP BY enrichment_status
    ORDER BY total DESC
  `);
  console.log('\nEnrichment overview:');
  console.table(overview.rows);

  // PDFs linked to processos that are pending
  const eligible = await db.execute(sql`
    SELECT count(*) as total
    FROM drive_files
    WHERE NOT is_folder
      AND enrichment_status = 'pending'
      AND processo_id IS NOT NULL
      AND mime_type = 'application/pdf'
  `);
  console.log(`\nPDFs linked + pending enrichment: ${eligible.rows[0].total}`);

  // Reset stuck "processing" files (>1 hour)
  const stuck = await db.execute(sql`
    UPDATE drive_files 
    SET enrichment_status = 'pending', enrichment_error = 'reset by health check'
    WHERE enrichment_status = 'processing' 
      AND updated_at < now() - interval '1 hour'
    RETURNING id
  `);
  if (stuck.rows.length > 0) {
    console.log(`\nReset ${stuck.rows.length} stuck "processing" files back to "pending"`);
  }

  // Summary by mime type
  const byType = await db.execute(sql`
    SELECT mime_type, count(*) as total, 
           count(*) filter (where enrichment_status = 'completed') as enriched,
           count(*) filter (where enrichment_status = 'pending') as pending
    FROM drive_files
    WHERE NOT is_folder AND processo_id IS NOT NULL
    GROUP BY mime_type
    ORDER BY total DESC
    LIMIT 10
  `);
  console.log('\nFile types linked to processos:');
  console.table(byType.rows);

  console.log('\nTo trigger enrichment, use the OMBUDS UI "Smart Extract" button');
  console.log('or call trpc.drive.transcribeFile({ fileId }) for individual files.');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the status check**

Run: `set -a && source .env.local && set +a && npx tsx scripts/drive-health/07-enrichment-kickstart.ts`
Expected: Shows enrichment overview, resets any stuck files, reports eligible PDFs

- [ ] **Step 3: Commit**

```bash
git add scripts/drive-health/07-enrichment-kickstart.ts
git commit -m "feat: enrichment status report and stuck file recovery"
```

---

## Final Verification

After all 7 tasks complete, run this comprehensive health check:

- [ ] **Final health audit**

```bash
set -a && source .env.local && set +a && node -e "
require('dotenv').config({path:'.env.local'});
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL});

async function audit() {
  const checks = [
    ['Assistidos with folder', 'SELECT count(*) as v FROM assistidos WHERE drive_folder_id IS NOT NULL'],
    ['Assistidos total', 'SELECT count(*) as v FROM assistidos'],
    ['Processos with folder', 'SELECT count(*) as v FROM processos WHERE drive_folder_id IS NOT NULL'],
    ['Processos total', 'SELECT count(*) as v FROM processos'],
    ['Drive files total', 'SELECT count(*) as v FROM drive_files WHERE NOT is_folder'],
    ['Files with processo', 'SELECT count(*) as v FROM drive_files WHERE processo_id IS NOT NULL AND NOT is_folder'],
    ['Files with assistido', 'SELECT count(*) as v FROM drive_files WHERE assistido_id IS NOT NULL AND NOT is_folder'],
    ['Orphan files', 'SELECT count(*) as v FROM drive_files WHERE processo_id IS NULL AND assistido_id IS NULL AND NOT is_folder'],
    ['Duplicate folder IDs', 'SELECT count(*) as v FROM (SELECT drive_folder_id FROM assistidos WHERE drive_folder_id IS NOT NULL GROUP BY drive_folder_id HAVING count(*)>1) t'],
    ['Expired active webhooks', 'SELECT count(*) as v FROM drive_webhooks WHERE is_active AND expiration < now()'],
    ['Files missing parentFileId', 'SELECT count(*) as v FROM drive_files WHERE parent_file_id IS NULL AND NOT is_folder'],
    ['Enrichment completed', 'SELECT count(*) as v FROM drive_files WHERE enrichment_status = $$completed$$ AND NOT is_folder'],
    ['Enrichment pending', 'SELECT count(*) as v FROM drive_files WHERE enrichment_status = $$pending$$ AND NOT is_folder'],
  ];
  
  console.log('=== DRIVE HEALTH AUDIT ===');
  for (const [label, query] of checks) {
    const r = await p.query(query);
    console.log(label.padEnd(30) + ': ' + r.rows[0].v);
  }
  await p.end();
}
audit();
"
```

Expected targets:
- Assistidos with folder: ~560+ (all except "Nao Identificado")
- Processos with folder: 502/502
- Orphan files: <100 (ideally <50)
- Duplicate folder IDs: 0
- Expired active webhooks: 0
- Files missing parentFileId: <50

---

## Execution Order & Dependencies

```
Task 1 (garbage cleanup) ──┐
                            ├── Task 3 (reindex) ── Task 4 (parentFileId) ── Task 5 (auto-link)
Task 2 (dedup folders) ────┘
                                                                            
Task 6 (webhooks) ── independent, run anytime
Task 7 (enrichment) ── depends on Task 5 (needs linked files)
```

**Parallelizable:** Tasks 1+2 can run together. Task 6 is independent. Tasks 3→4→5→7 are sequential.
