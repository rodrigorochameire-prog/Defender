#!/usr/bin/env node
/**
 * Re-enfileira análises (skill `analise-autos`) para processos ÓRFÃOS sem
 * análise, alimentando o cockpit do processo. Dedup-safe: 1 task por assistido
 * (a análise é por assistido e cobre todos os autos dele); pula quem já tem task
 * pending/processing.
 *
 * Roda VIA DAEMON (conta Max, sem custo de API): apenas insere linhas em
 * claude_code_tasks; o daemon do M4 as processa com `claude -p`.
 *
 * Uso:
 *   node scripts/enqueue-analise-orfaos.mjs --dry            # só conta (não insere)
 *   node scripts/enqueue-analise-orfaos.mjs --priority       # presos + audiência ≤30d
 *   node scripts/enqueue-analise-orfaos.mjs --priority --limit 50
 *   node scripts/enqueue-analise-orfaos.mjs --all            # todos os órfãos sem análise
 *   node scripts/enqueue-analise-orfaos.mjs --all --limit 200
 *
 * Pré-requisito: o daemon do M4 precisa estar SAUDÁVEL (login Max OK) — confira
 * com `node scripts/m4-bootstrap.mjs`. Sem isso, as tasks falham.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

// --- args ---
const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const DRY = has("--dry");
const ALL = has("--all");
const PRIORITY = has("--priority") || !ALL; // default = prioridade
const limIdx = ARGS.indexOf("--limit");
const LIMIT = limIdx >= 0 ? parseInt(ARGS[limIdx + 1], 10) : null;
const CREATED_BY = 1; // admin (Rodrigo)

// --- DATABASE_URL via .env.local ---
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
      if (m) {
        return m[1]
          .trim()
          .replace(/^["']|["']$/g, "") // remove aspas externas
          .replace(/\\[rn]/g, "")       // remove escapes literais \n \r (dotenv)
          .trim();
      }
    }
  }
  return null;
}

const DATABASE_URL = loadDatabaseUrl();
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrada (.env.local).");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

// CTE base: processos órfãos SEM análise (sem analises_cowork e sem analysisData),
// resolvendo o assistido (principal da M2M, fallback FK direto) e flags de prioridade.
const baseCte = `
  WITH uncovered AS (
    SELECT p.id AS processo_id, p.numero_autos,
      COALESCE(
        (SELECT ap.assistido_id FROM assistidos_processos ap WHERE ap.processo_id=p.id AND ap.is_principal=true LIMIT 1),
        (SELECT ap.assistido_id FROM assistidos_processos ap WHERE ap.processo_id=p.id LIMIT 1),
        p.assistido_id
      ) AS assistido_id,
      EXISTS (
        SELECT 1 FROM audiencias a WHERE a.processo_id=p.id
          AND a.data_audiencia >= now() AND a.data_audiencia <= now()+interval '30 days'
          AND COALESCE(a.aguardando_nova_data,false)=false
          AND (a.status IS NULL OR a.status NOT IN ('cancelada','realizada','redesignada'))
      ) AS aud_30d
    FROM processos p
    WHERE p.caso_id IS NULL AND p.analysis_data IS NULL
      AND p.id NOT IN (SELECT processo_id FROM analises_cowork WHERE processo_id IS NOT NULL)
  ),
  ranked AS (
    SELECT u.*, a.nome,
      (a.status_prisional::text IN ('CADEIA_PUBLICA','PENITENCIARIA')) AS preso,
      row_number() OVER (PARTITION BY u.assistido_id ORDER BY u.aud_30d DESC, u.processo_id DESC) AS rn
    FROM uncovered u
    JOIN assistidos a ON a.id = u.assistido_id
    WHERE u.assistido_id IS NOT NULL AND a.deleted_at IS NULL
  ),
  elegiveis AS (
    SELECT assistido_id FROM ranked
    GROUP BY assistido_id
    HAVING assistido_id NOT IN (
      SELECT assistido_id FROM claude_code_tasks
      WHERE status IN ('pending','processing') AND assistido_id IS NOT NULL
    )
    ${PRIORITY ? "AND (bool_or(preso) OR bool_or(aud_30d))" : ""}
  )
`;

try {
  const count = (await sql.unsafe(`${baseCte} SELECT count(*)::int AS n FROM elegiveis`))[0].n;
  const escopo = PRIORITY ? "prioritários (preso/audiência ≤30d)" : "todos os órfãos sem análise";
  console.log(`Elegíveis (${escopo}): ${count}${LIMIT ? ` · limite ${LIMIT}` : ""}`);

  if (DRY) {
    console.log("--dry: nada inserido.");
  } else if (count === 0) {
    console.log("Nada a enfileirar.");
  } else {
    const limitClause = LIMIT && LIMIT > 0 ? `LIMIT ${LIMIT}` : "";
    const inserted = await sql.unsafe(`
      ${baseCte}
      INSERT INTO claude_code_tasks (assistido_id, processo_id, skill, lane, prompt, status, created_by)
      SELECT r.assistido_id, r.processo_id, 'analise-autos', 'ai',
             'Assistido: ' || r.nome || E'\\nProcesso: ' || COALESCE(r.numero_autos,'—'),
             'pending', ${CREATED_BY}
      FROM ranked r
      JOIN elegiveis e ON e.assistido_id = r.assistido_id
      WHERE r.rn = 1
      ${limitClause}
      RETURNING id
    `);
    console.log(`✓ ${inserted.length} task(s) analise-autos enfileiradas (status pending). O daemon do M4 as processa.`);
  }
} catch (err) {
  console.error("❌ erro:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
