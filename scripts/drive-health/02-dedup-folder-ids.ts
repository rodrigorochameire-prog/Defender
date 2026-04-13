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

  const dupes = await db.execute(sql`
    SELECT drive_folder_id, array_agg(id ORDER BY id) as ids, array_agg(nome ORDER BY id) as nomes
    FROM assistidos
    WHERE drive_folder_id IS NOT NULL
    GROUP BY drive_folder_id
    HAVING COUNT(*) > 1
  `) as unknown as Array<{ drive_folder_id: string; ids: number[]; nomes: string[] }>;

  console.log(`\nFound ${dupes.length} duplicate groups`);
  let totalCleared = 0;

  for (const group of dupes) {
    const folderId = group.drive_folder_id;
    const ids = group.ids;
    const nomes = group.nomes;

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

  console.log(`\nTotal cleared: ${totalCleared}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
