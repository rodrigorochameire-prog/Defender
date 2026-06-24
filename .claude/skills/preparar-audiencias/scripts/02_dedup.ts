/**
 * De-dup de calendar_events e processos espelho para um dia.
 * Lê a pauta gerada em 01_buscar_pauta.ts e aplica:
 *   - soft-delete dos calendar_events redundantes (mesmo processo + mesma data com audiência)
 *   - merge de processos espelho (mesmo numero_autos): migra demandas/registros e soft-delete
 *
 * Roda em transação atômica. Imprime relatório de mudanças.
 *
 * Uso:
 *   npx tsx .claude/skills-cowork/preparar-audiencias/scripts/02_dedup.ts 2026-05-05 [--dry-run]
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });

import postgres from "postgres";
import * as fs from "fs";

const sql = postgres(process.env.DATABASE_URL!);
const dia = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!dia) {
  console.error("Uso: ... 02_dedup.ts <YYYY-MM-DD> [--dry-run]");
  process.exit(1);
}

(async () => {
  const pauta = JSON.parse(fs.readFileSync(`/tmp/pauta-${dia}.json`, "utf8"));
  const eventosRedundantes = pauta.eventos_redundantes as any[];

  // Detectar processos espelho: mesmo numero_autos (em audiencias.processo_id e calendar_events.processo_id)
  const audProcs = new Set(pauta.audiencias.map((a: any) => a.numero_autos).filter(Boolean));
  const espelhos: { id: number; numero: string }[] = [];
  for (const evt of pauta.eventos_orfaos) {
    const [p] = await sql`SELECT id, numero_autos FROM processos WHERE id = ${evt.processo_id}`;
    if (p && audProcs.has(p.numero_autos)) {
      espelhos.push({ id: p.id, numero: p.numero_autos });
    }
  }

  console.log(`Plano para ${dia}:`);
  console.log(`  ✗ soft-delete calendar_events: ${eventosRedundantes.map((e) => e.id).join(", ") || "—"}`);
  console.log(`  ✗ soft-delete processos espelho: ${espelhos.map((e) => `#${e.id}(${e.numero})`).join(", ") || "—"}`);

  if (dryRun) {
    console.log("\n--dry-run: nenhuma alteração feita.");
    await sql.end();
    return;
  }

  await sql.begin(async (tx) => {
    // 1. Soft-delete calendar_events redundantes
    if (eventosRedundantes.length > 0) {
      const ids = eventosRedundantes.map((e) => e.id);
      const r = await tx`
        UPDATE calendar_events
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ANY(${ids}::int[]) AND deleted_at IS NULL
        RETURNING id, title
      `;
      console.log(`[1] calendar_events soft-deleted: ${r.length}`);
    }

    // 2. Para cada processo espelho: migrar demandas/registros para o canônico, soft-delete o espelho
    for (const esp of espelhos) {
      const [canonico] = await tx`
        SELECT p.id, p.assistido_id
        FROM processos p
        WHERE p.numero_autos = ${esp.numero}
          AND p.id != ${esp.id}
          AND p.deleted_at IS NULL
        ORDER BY p.id
        LIMIT 1
      `;
      if (!canonico) {
        console.warn(`[!] sem canônico para ${esp.numero} — pulando`);
        continue;
      }

      const dem = await tx`
        UPDATE demandas
        SET processo_id = ${canonico.id}, assistido_id = ${canonico.assistido_id}, updated_at = NOW()
        WHERE processo_id = ${esp.id} AND deleted_at IS NULL
        RETURNING id
      `;
      const reg = await tx`
        UPDATE registros
        SET processo_id = ${canonico.id}, assistido_id = ${canonico.assistido_id}, updated_at = NOW()
        WHERE processo_id = ${esp.id}
        RETURNING id
      `;
      const espP = await tx`
        UPDATE processos SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = ${esp.id}
        RETURNING id, numero_autos
      `;
      console.log(`[2] proc espelho ${esp.id} → canônico ${canonico.id}: ${dem.length} demandas + ${reg.length} registros migrados`);
    }
  });

  console.log("\nDe-dup concluído.");
  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
