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
import { sql } from 'drizzle-orm';

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
  console.table(overview);

  // PDFs linked to processos that are pending
  const eligible = await db.execute(sql`
    SELECT count(*) as total
    FROM drive_files
    WHERE NOT is_folder
      AND enrichment_status = 'pending'
      AND processo_id IS NOT NULL
      AND mime_type = 'application/pdf'
  `);
  console.log(`\nPDFs linked + pending enrichment: ${(eligible as any)[0]?.total ?? eligible}`);

  // Reset stuck "processing" files (>1 hour)
  const stuck = await db.execute(sql`
    UPDATE drive_files
    SET enrichment_status = 'pending', enrichment_error = 'reset by health check'
    WHERE enrichment_status = 'processing'
      AND updated_at < now() - interval '1 hour'
    RETURNING id
  `);
  const stuckCount = Array.isArray(stuck) ? stuck.length : 0;
  if (stuckCount > 0) {
    console.log(`\nReset ${stuckCount} stuck "processing" files back to "pending"`);
  }

  // Summary by mime type for linked files
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
  console.table(byType);

  console.log('\nTo trigger enrichment, use the OMBUDS UI "Smart Extract" button');
  console.log('or call trpc.drive.transcribeFile({ fileId }) for individual files.');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
