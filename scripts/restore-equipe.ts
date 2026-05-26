/**
 * Restaura Amanda, Emilly e Taíssa (limpa deletedAt) e ajusta role/supervisor:
 *   - Emilly Santos (id=14): deletedAt=NULL, role=estagiario, supervisorId=1 (Rodrigo)
 *   - Taíssa Oliveira (id=15): deletedAt=NULL, supervisorId=4 (Juliane)
 *   - Amanda Silva (id=13): deletedAt=NULL (mantém role=servidor)
 *
 * Uso:
 *   npx tsx scripts/restore-equipe.ts           # DRY-RUN
 *   npx tsx scripts/restore-equipe.ts --apply   # APLICA
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface Update {
  id: number;
  patch: { deletedAt: null; role?: "estagiario" | "servidor"; supervisorId?: number };
  expectedName: string;
}

const UPDATES: Update[] = [
  { id: 13, patch: { deletedAt: null }, expectedName: "Amanda" },
  { id: 14, patch: { deletedAt: null, role: "estagiario", supervisorId: 1 }, expectedName: "Emilly" },
  { id: 15, patch: { deletedAt: null, supervisorId: 4 }, expectedName: "Taíssa" },
];

async function main() {
  const apply = process.argv.includes("--apply");

  for (const u of UPDATES) {
    const [current] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
    if (!current) {
      console.log(`  ❌ id=${u.id} não encontrado (esperado: ${u.expectedName})`);
      continue;
    }
    if (!current.name.toLowerCase().startsWith(u.expectedName.toLowerCase())) {
      console.log(`  ⚠ id=${u.id} é "${current.name}", esperava começar com "${u.expectedName}". Abortando.`);
      process.exit(1);
    }
    console.log(`  • id=${u.id} ${current.name}`);
    console.log(`      antes: role=${current.role}  sup=${current.supervisorId}  deletedAt=${current.deletedAt}`);
    console.log(`      patch: ${JSON.stringify(u.patch)}`);

    if (apply) {
      await db.update(users).set(u.patch as any).where(eq(users.id, u.id));
      console.log(`      ✓ aplicado`);
    }
  }

  if (!apply) {
    console.log("\nDRY-RUN. Rode com --apply pra executar.");
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
