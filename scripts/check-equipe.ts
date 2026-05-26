/**
 * Diagnóstico: lista todos os users que aparecem como equipe (servidor/estagiario)
 * para identificar por que Emilly/Taíssa não aparecem no seletor.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isNull, or, eq } from "drizzle-orm";

async function main() {
  const all = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      email: users.email,
      supervisorId: users.supervisorId,
      deletedAt: users.deletedAt,
    })
    .from(users);

  console.log(`Total users: ${all.length}\n`);

  console.log("=== Por role ===");
  const byRole = new Map<string, typeof all>();
  for (const u of all) {
    if (!byRole.has(u.role)) byRole.set(u.role, []);
    byRole.get(u.role)!.push(u);
  }
  for (const [role, list] of byRole) {
    console.log(`\n${role} (${list.length}):`);
    for (const u of list) {
      const del = u.deletedAt ? " [DELETED]" : "";
      const sup = u.supervisorId ? ` sup=${u.supervisorId}` : "";
      console.log(`  - id=${u.id}  ${u.name}${sup}${del}  email=${u.email}`);
    }
  }

  console.log("\n=== Search Emilly/Taíssa ===");
  const candidatos = all.filter(u =>
    /emilly|emilli|taissa|taíssa/i.test(u.name)
  );
  if (candidatos.length === 0) {
    console.log("  Nenhum match");
  } else {
    for (const u of candidatos) {
      console.log(`  - id=${u.id}  ${u.name}  role="${u.role}"  deletedAt=${u.deletedAt}  supervisorId=${u.supervisorId}`);
    }
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
