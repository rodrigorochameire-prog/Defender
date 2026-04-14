/**
 * Preenche `demandas.dataExpedicao` com o valor de `dataEntrada` onde está
 * NULL. Uso pontual: após a mudança que passou a gravar `dataExpedicao`
 * explicitamente no import, para regularizar linhas antigas.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  const before = await db.execute(sql`
    SELECT count(*)::int AS c FROM demandas
    WHERE data_expedicao IS NULL AND data_entrada IS NOT NULL
  `);
  const pending = (before[0] as { c: number }).c;
  console.log(`Pendentes antes: ${pending}`);

  if (pending > 0) {
    await db.execute(sql`
      UPDATE demandas
      SET data_expedicao = data_entrada
      WHERE data_expedicao IS NULL AND data_entrada IS NOT NULL
    `);
  }

  const after = await db.execute(sql`
    SELECT count(*)::int AS c FROM demandas
    WHERE data_expedicao IS NULL AND data_entrada IS NOT NULL
  `);
  const remaining = (after[0] as { c: number }).c;
  console.log(`Pendentes depois: ${remaining}`);
  console.log(`Atualizadas: ${pending - remaining}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
