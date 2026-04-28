/**
 * Backfill: converte demandas.providencias (text legado) em eventos
 * estruturados na tabela demanda_eventos.
 *
 * - Idempotente: usa NOT EXISTS para evitar duplicação caso o script
 *   seja executado mais de uma vez.
 * - Suporta `--dry-run` para reportar contagem sem inserir.
 *
 * Uso:
 *   npx tsx scripts/backfill-demanda-eventos.ts --dry-run
 *   npx tsx scripts/backfill-demanda-eventos.ts
 */
import * as dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });

const COUNT_SQL = `
  SELECT COUNT(*)::int AS count
  FROM demandas d
  WHERE d.providencias IS NOT NULL
    AND d.providencias <> ''
    AND d.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM demanda_eventos e
      WHERE e.demanda_id = d.id
        AND e.tipo = 'diligencia'
        AND e.subtipo = 'outro'
        AND e.descricao = d.providencias
    );
`;

const INSERT_SQL = `
  INSERT INTO demanda_eventos (
    demanda_id, tipo, subtipo, status,
    resumo, descricao, autor_id,
    created_at, updated_at, data_conclusao
  )
  SELECT
    d.id,
    'diligencia',
    'outro',
    'feita',
    COALESCE(NULLIF(TRIM(d.providencia_resumo), ''), LEFT(d.providencias, 140)),
    d.providencias,
    COALESCE(d.defensor_id, 1),
    COALESCE(d.updated_at, NOW()),
    COALESCE(d.updated_at, NOW()),
    COALESCE(d.updated_at, NOW())
  FROM demandas d
  WHERE d.providencias IS NOT NULL
    AND d.providencias <> ''
    AND d.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM demanda_eventos e
      WHERE e.demanda_id = d.id
        AND e.tipo = 'diligencia'
        AND e.subtipo = 'outro'
        AND e.descricao = d.providencias
    );
`;

export interface BackfillOptions {
  dryRun?: boolean;
}

export interface BackfillResult {
  wouldInsert: number;
  inserted: number;
  dryRun: boolean;
}

export async function main(options: BackfillOptions = {}): Promise<BackfillResult> {
  const dryRun = options.dryRun ?? process.argv.includes("--dry-run");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set in .env.local");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const countRes = await client.query<{ count: number }>(COUNT_SQL);
    const wouldInsert = countRes.rows[0]?.count ?? 0;
    console.log(`[backfill] would insert ${wouldInsert} events`);

    if (wouldInsert > 10000) {
      throw new Error(
        `[backfill] Refusing to proceed: count ${wouldInsert} > 10000. Investigate before running.`
      );
    }

    if (dryRun) {
      console.log("[backfill] dry-run mode — no changes applied");
      return { wouldInsert, inserted: 0, dryRun: true };
    }

    await client.query("BEGIN");
    let inserted = 0;
    try {
      const insRes = await client.query(INSERT_SQL);
      inserted = insRes.rowCount ?? 0;
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    console.log(`[backfill] inserted ${inserted} events`);
    return { wouldInsert, inserted, dryRun: false };
  } finally {
    await client.end();
  }
}

// Só roda quando executado diretamente (não em import de testes).
const isMain = (() => {
  try {
    const argv1 = process.argv[1] ?? "";
    return argv1.includes("backfill-demanda-eventos");
  } catch {
    return false;
  }
})();

if (isMain) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("[backfill] error:", e);
      process.exit(1);
    });
}
