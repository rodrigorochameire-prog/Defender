/**
 * Batch Drive Folder Creation
 *
 * Phase 0: Validate existing folder IDs, clear stale ones
 * Phase 1: Create/find folders for assistidos without drive_folder_id
 * Phase 2: Create/find subfolders for processos (auto-heals if assistido folder is stale)
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/batch-drive-folders.ts
 *
 * Options:
 *   --dry-run     Show what would be done without creating anything
 *   --only=JURI   Only process a specific atribuição (JURI, VVD, EP, SUBSTITUICAO)
 *   --skip-assistidos  Skip phase 1, only create processo folders
 *   --skip-processos   Skip phase 2, only create assistido folders
 *   --skip-validate    Skip phase 0 (stale folder validation)
 */

import { db } from '../src/lib/db';
import { assistidos, processos } from '../src/lib/db/schema/core';
import { eq, isNull, isNotNull, and, sql } from 'drizzle-orm';
import {
  createOrFindAssistidoFolder,
  createOrFindProcessoFolder,
  mapAtribuicaoToFolderKey,
  getFolderInfo,
} from '../src/lib/services/google-drive';

// Rate limit: Google Drive API has 300 requests per minute per user
const DELAY_MS = 250; // ~240 req/min, safe margin
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_ASSISTIDOS = args.includes('--skip-assistidos');
const SKIP_PROCESSOS = args.includes('--skip-processos');
const SKIP_VALIDATE = args.includes('--skip-validate');
const ONLY_ATRIB = args.find(a => a.startsWith('--only='))?.split('=')[1]?.toUpperCase();

interface Stats {
  total: number;
  created: number;
  found: number;
  skipped: number;
  errors: number;
}

function printStats(label: string, stats: Stats) {
  console.log(`\n  ${label}:`);
  console.log(`   Total:   ${stats.total}`);
  console.log(`   Criados: ${stats.created}`);
  console.log(`   Já existiam: ${stats.found}`);
  console.log(`   Pulados: ${stats.skipped}`);
  console.log(`   Erros:   ${stats.errors}`);
}

// ============================================================
// FASE 0: Validar folder IDs existentes
// ============================================================

async function phase0_validate(): Promise<{ cleared: number }> {
  console.log('\n' + '='.repeat(60));
  console.log('FASE 0: Validar drive_folder_id existentes (limpar stale)');
  console.log('='.repeat(60));

  let cleared = 0;

  // Get all assistidos with folder IDs
  const rows = await db
    .select({
      id: assistidos.id,
      nome: assistidos.nome,
      driveFolderId: assistidos.driveFolderId,
      atribuicao: assistidos.atribuicaoPrimaria,
    })
    .from(assistidos)
    .where(isNotNull(assistidos.driveFolderId));

  const filtered = ONLY_ATRIB
    ? rows.filter(r => {
        const key = mapAtribuicaoToFolderKey(r.atribuicao || 'SUBSTITUICAO');
        return key === ONLY_ATRIB;
      })
    : rows;

  console.log(`\nValidando ${filtered.length} assistidos com folder ID...`);

  for (let i = 0; i < filtered.length; i++) {
    const a = filtered[i];
    try {
      const info = await getFolderInfo(a.driveFolderId!);
      if (!info) {
        if (DRY_RUN) {
          console.log(`  [DRY] STALE ${a.nome} (${a.driveFolderId?.substring(0, 15)}...) — seria limpo`);
        } else {
          await db
            .update(assistidos)
            .set({ driveFolderId: null, updatedAt: new Date() })
            .where(eq(assistidos.id, a.id));
          console.log(`  LIMPO ${a.nome} — folder ${a.driveFolderId?.substring(0, 15)}... não existe mais`);
        }
        cleared++;
      }
      // Progress every 50
      if ((i + 1) % 50 === 0) {
        console.log(`  ... validados ${i + 1}/${filtered.length}`);
      }
      await sleep(100); // lighter delay for read-only checks
    } catch (err: any) {
      // 404 = folder doesn't exist
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        if (!DRY_RUN) {
          await db
            .update(assistidos)
            .set({ driveFolderId: null, updatedAt: new Date() })
            .where(eq(assistidos.id, a.id));
          console.log(`  LIMPO ${a.nome} — folder deletado`);
        }
        cleared++;
      }
    }
  }

  console.log(`\n  Resultado: ${cleared} folder IDs stale ${DRY_RUN ? 'encontrados' : 'limpos'}`);
  return { cleared };
}

// ============================================================
// FASE 1: Criar pastas para assistidos
// ============================================================

async function phase1_assistidos(): Promise<Stats> {
  console.log('\n' + '='.repeat(60));
  console.log('FASE 1: Criar pastas para ASSISTIDOS sem drive_folder_id');
  console.log('='.repeat(60));

  const stats: Stats = { total: 0, created: 0, found: 0, skipped: 0, errors: 0 };

  const rows = await db
    .select({
      id: assistidos.id,
      nome: assistidos.nome,
      atribuicao: assistidos.atribuicaoPrimaria,
    })
    .from(assistidos)
    .where(isNull(assistidos.driveFolderId))
    .orderBy(assistidos.atribuicaoPrimaria, assistidos.nome);

  const filtered = ONLY_ATRIB
    ? rows.filter(r => {
        const key = mapAtribuicaoToFolderKey(r.atribuicao || 'SUBSTITUICAO');
        return key === ONLY_ATRIB;
      })
    : rows;

  stats.total = filtered.length;
  console.log(`\nEncontrados: ${stats.total} assistidos sem pasta`);

  if (DRY_RUN) {
    for (const a of filtered) {
      const key = mapAtribuicaoToFolderKey(a.atribuicao || 'SUBSTITUICAO');
      console.log(`  [DRY] ${a.nome} (${a.atribuicao}) → pasta em ${key}/`);
    }
    return stats;
  }

  // Names to skip
  const SKIP_NAMES = ['Não Identificado', 'Autos', 'Jose da Silva Teste'];

  for (let i = 0; i < filtered.length; i++) {
    const a = filtered[i];
    const key = mapAtribuicaoToFolderKey(a.atribuicao || 'SUBSTITUICAO');
    const progress = `[${i + 1}/${filtered.length}]`;

    if (!key) {
      console.log(`  ${progress} SKIP ${a.nome} — atribuição "${a.atribuicao}" sem mapeamento`);
      stats.skipped++;
      continue;
    }

    if (SKIP_NAMES.includes(a.nome)) {
      console.log(`  ${progress} SKIP ${a.nome} — nome especial/teste`);
      stats.skipped++;
      continue;
    }

    try {
      const folder = await createOrFindAssistidoFolder(key, a.nome);
      if (!folder) {
        console.log(`  ${progress} ERRO ${a.nome} — API retornou null`);
        stats.errors++;
        continue;
      }

      await db
        .update(assistidos)
        .set({ driveFolderId: folder.id, updatedAt: new Date() })
        .where(eq(assistidos.id, a.id));

      console.log(`  ${progress} OK ${a.nome} → ${folder.id.substring(0, 15)}... (${key})`);
      stats.created++;

      await sleep(DELAY_MS);
    } catch (err: any) {
      console.log(`  ${progress} ERRO ${a.nome}: ${err.message}`);
      stats.errors++;

      if (err.message?.includes('429') || err.message?.includes('Rate Limit')) {
        console.log('  Rate limit, aguardando 30s...');
        await sleep(30000);
      }
    }
  }

  return stats;
}

// ============================================================
// FASE 2: Criar subpastas para processos (com auto-heal)
// ============================================================

async function phase2_processos(): Promise<Stats> {
  console.log('\n' + '='.repeat(60));
  console.log('FASE 2: Criar subpastas para PROCESSOS sem drive_folder_id');
  console.log('='.repeat(60));

  const stats: Stats = { total: 0, created: 0, found: 0, skipped: 0, errors: 0 };

  const rows = await db
    .select({
      processoId: processos.id,
      numeroAutos: processos.numeroAutos,
      atribuicao: processos.atribuicao,
      assistidoId: processos.assistidoId,
      assistidoNome: assistidos.nome,
      assistidoFolderId: assistidos.driveFolderId,
      assistidoAtribuicao: assistidos.atribuicaoPrimaria,
    })
    .from(processos)
    .leftJoin(assistidos, eq(processos.assistidoId, assistidos.id))
    .where(isNull(processos.driveFolderId))
    .orderBy(processos.atribuicao, assistidos.nome);

  const filtered = ONLY_ATRIB
    ? rows.filter(r => {
        const key = mapAtribuicaoToFolderKey(r.atribuicao || 'SUBSTITUICAO');
        return key === ONLY_ATRIB;
      })
    : rows;

  stats.total = filtered.length;

  const comPasta = filtered.filter(r => r.assistidoFolderId);
  const semPastaComAssistido = filtered.filter(r => !r.assistidoFolderId && r.assistidoId && r.assistidoNome);
  const semAssistido = filtered.filter(r => !r.assistidoId);

  console.log(`\nEncontrados: ${stats.total} processos sem pasta`);
  console.log(`  Com assistido vinculado ao Drive: ${comPasta.length}`);
  console.log(`  Assistido sem pasta (auto-heal): ${semPastaComAssistido.length}`);
  console.log(`  Sem assistido vinculado: ${semAssistido.length}`);

  if (DRY_RUN) {
    for (const p of [...comPasta, ...semPastaComAssistido]) {
      console.log(`  [DRY] ${p.numeroAutos} → subpasta em ${p.assistidoNome}/`);
    }
    stats.skipped = semAssistido.length;
    return stats;
  }

  // Process both: those with folder and those needing auto-heal
  const toProcess = [...comPasta, ...semPastaComAssistido];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    if (!p.numeroAutos || p.numeroAutos.trim() === '') {
      console.log(`  ${progress} SKIP processo #${p.processoId} — sem número de autos`);
      stats.skipped++;
      continue;
    }

    try {
      let assistidoFolderId = p.assistidoFolderId;

      // Auto-heal: if assistido has no folder, create it first
      if (!assistidoFolderId && p.assistidoId && p.assistidoNome) {
        const key = mapAtribuicaoToFolderKey(p.assistidoAtribuicao || p.atribuicao || 'SUBSTITUICAO');
        if (!key) {
          console.log(`  ${progress} SKIP ${p.numeroAutos} — atribuição sem mapeamento`);
          stats.skipped++;
          continue;
        }

        console.log(`  ${progress} AUTO-HEAL: criando pasta para ${p.assistidoNome}...`);
        const assistidoFolder = await createOrFindAssistidoFolder(key, p.assistidoNome);
        if (!assistidoFolder) {
          console.log(`  ${progress} ERRO ao criar pasta do assistido ${p.assistidoNome}`);
          stats.errors++;
          continue;
        }

        await db
          .update(assistidos)
          .set({ driveFolderId: assistidoFolder.id, updatedAt: new Date() })
          .where(eq(assistidos.id, p.assistidoId));

        assistidoFolderId = assistidoFolder.id;
        await sleep(DELAY_MS);
      }

      if (!assistidoFolderId) {
        stats.skipped++;
        continue;
      }

      // Now create the processo folder
      const folder = await createOrFindProcessoFolder(assistidoFolderId, p.numeroAutos);

      if (!folder) {
        // Folder might be stale — try auto-heal
        console.log(`  ${progress} HEAL: pasta do assistido ${p.assistidoNome} pode estar stale, recriando...`);
        const key = mapAtribuicaoToFolderKey(p.assistidoAtribuicao || p.atribuicao || 'SUBSTITUICAO');
        if (key) {
          const newFolder = await createOrFindAssistidoFolder(key, p.assistidoNome || '');
          if (newFolder && p.assistidoId) {
            await db
              .update(assistidos)
              .set({ driveFolderId: newFolder.id, updatedAt: new Date() })
              .where(eq(assistidos.id, p.assistidoId));

            await sleep(DELAY_MS);
            const retryFolder = await createOrFindProcessoFolder(newFolder.id, p.numeroAutos);
            if (retryFolder) {
              await db
                .update(processos)
                .set({
                  driveFolderId: retryFolder.id,
                  linkDrive: retryFolder.webViewLink,
                  updatedAt: new Date(),
                })
                .where(eq(processos.id, p.processoId));

              console.log(`  ${progress} HEALED ${p.numeroAutos} → ${p.assistidoNome}/ (${retryFolder.id.substring(0, 15)}...)`);
              stats.created++;
              await sleep(DELAY_MS);
              continue;
            }
          }
        }

        console.log(`  ${progress} ERRO ${p.numeroAutos} (${p.assistidoNome}) — não conseguiu criar`);
        stats.errors++;
        continue;
      }

      await db
        .update(processos)
        .set({
          driveFolderId: folder.id,
          linkDrive: folder.webViewLink,
          updatedAt: new Date(),
        })
        .where(eq(processos.id, p.processoId));

      console.log(`  ${progress} OK ${p.numeroAutos} → ${p.assistidoNome}/ (${folder.id.substring(0, 15)}...)`);
      stats.created++;

      await sleep(DELAY_MS);
    } catch (err: any) {
      console.log(`  ${progress} ERRO ${p.numeroAutos}: ${err.message}`);
      stats.errors++;

      if (err.message?.includes('429') || err.message?.includes('Rate Limit')) {
        console.log('  Rate limit, aguardando 30s...');
        await sleep(30000);
      }
    }
  }

  stats.skipped += semAssistido.length;
  return stats;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('=== BATCH DRIVE FOLDER CREATION ===');
  console.log(`Data: ${new Date().toISOString()}`);
  if (DRY_RUN) console.log('MODE: DRY-RUN (nenhuma alteração)');
  if (ONLY_ATRIB) console.log(`FILTRO: ${ONLY_ATRIB}`);

  // Pre-flight
  const [assistidoStats] = await db
    .select({
      total: sql<number>`count(*)`,
      com: sql<number>`count(drive_folder_id)`,
      sem: sql<number>`count(*) - count(drive_folder_id)`,
    })
    .from(assistidos);

  const [processoStats] = await db
    .select({
      total: sql<number>`count(*)`,
      com: sql<number>`count(drive_folder_id)`,
      sem: sql<number>`count(*) - count(drive_folder_id)`,
    })
    .from(processos);

  console.log(`\nEstado atual:`);
  console.log(`  Assistidos: ${assistidoStats.com}/${assistidoStats.total} com pasta (${assistidoStats.sem} sem)`);
  console.log(`  Processos:  ${processoStats.com}/${processoStats.total} com pasta (${processoStats.sem} sem)`);

  // Phase 0: Validate
  if (!SKIP_VALIDATE) {
    await phase0_validate();
  }

  // Phase 1: Assistidos
  let statsA: Stats | null = null;
  if (!SKIP_ASSISTIDOS) {
    statsA = await phase1_assistidos();
    printStats('FASE 1 — Assistidos', statsA);
  }

  // Phase 2: Processos
  let statsP: Stats | null = null;
  if (!SKIP_PROCESSOS) {
    statsP = await phase2_processos();
    printStats('FASE 2 — Processos', statsP);
  }

  // Post-flight
  const [finalA] = await db
    .select({
      total: sql<number>`count(*)`,
      com: sql<number>`count(drive_folder_id)`,
    })
    .from(assistidos);

  const [finalP] = await db
    .select({
      total: sql<number>`count(*)`,
      com: sql<number>`count(drive_folder_id)`,
    })
    .from(processos);

  console.log('\n' + '='.repeat(60));
  console.log('RESULTADO FINAL');
  console.log('='.repeat(60));
  console.log(`  Assistidos: ${finalA.com}/${finalA.total} com pasta (${Number(finalA.total) - Number(finalA.com)} restantes)`);
  console.log(`  Processos:  ${finalP.com}/${finalP.total} com pasta (${Number(finalP.total) - Number(finalP.com)} restantes)`);
  console.log('\nDone!');

  process.exit(0);
}

main().catch(err => {
  console.error('\nErro fatal:', err);
  process.exit(1);
});
