/**
 * Migra demandas já delegadas (delegadoParaId != null) para substatus="delegar".
 * Necessário porque, antes do commit que mudou a regra, demandas delegadas tinham
 * substatus="monitorar" e por isso apareciam no pipeline como "Monitorar ✓".
 *
 * Uso:
 *   npx tsx scripts/migrate-delegadas-substatus.ts          # DRY-RUN
 *   npx tsx scripts/migrate-delegadas-substatus.ts --apply  # APLICA
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";
import { demandas } from "@/lib/db/schema";
import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";

async function main() {
  const apply = process.argv.includes("--apply");

  const candidatos = await db
    .select({
      id: demandas.id,
      ato: demandas.ato,
      status: demandas.status,
      substatus: demandas.substatus,
      delegadoParaId: demandas.delegadoParaId,
    })
    .from(demandas)
    .where(
      and(
        isNotNull(demandas.delegadoParaId),
        isNull(demandas.deletedAt),
        eq(demandas.substatus, "monitorar"),
      ),
    );

  console.log(`Encontradas ${candidatos.length} demandas delegadas com substatus=monitorar.`);
  for (const c of candidatos.slice(0, 20)) {
    console.log(`  - id=${c.id}  ato="${c.ato}"  delegado=${c.delegadoParaId}`);
  }
  if (candidatos.length > 20) console.log(`  ... +${candidatos.length - 20} demandas`);

  if (!apply) {
    console.log("\nDRY-RUN. Rode com --apply pra migrar.");
    process.exit(0);
  }

  const ids = candidatos.map((c) => c.id);
  if (ids.length === 0) {
    console.log("Nada a fazer.");
    process.exit(0);
  }

  await db
    .update(demandas)
    .set({ substatus: "delegar", updatedAt: new Date() })
    .where(
      and(
        eq(demandas.substatus, "monitorar"),
        isNotNull(demandas.delegadoParaId),
        isNull(demandas.deletedAt),
      ),
    );

  console.log(`\n✓ Migradas ${ids.length} demandas para substatus="delegar".`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
