/**
 * Cadastra Juliane, Cristiane, e Danilo como parceiros defensores do Rodrigo.
 *
 * Uso:
 *   npx tsx scripts/seed-parceiros-rodrigo.ts            # DRY-RUN (não escreve)
 *   npx tsx scripts/seed-parceiros-rodrigo.ts --apply    # Insere de verdade
 *
 * Reaproveitável para adicionar novos parceiros depois — basta editar PARCEIRO_NOMES.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "@/lib/db";
import { defensorParceiros, users } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

const RODRIGO_EMAIL = "rodrigorochameire@gmail.com";
const PARCEIRO_NOMES = ["Juliane", "Cristiane", "Danilo"];

async function main() {
  const apply = process.argv.includes("--apply");

  const [rodrigo] = await db
    .select()
    .from(users)
    .where(eq(users.email, RODRIGO_EMAIL))
    .limit(1);
  if (!rodrigo) {
    console.error(`Rodrigo nao encontrado (email ${RODRIGO_EMAIL}).`);
    process.exit(1);
  }
  console.log(`Rodrigo encontrado: id=${rodrigo.id}, name="${rodrigo.name}"`);

  const candidatos = await db
    .select({ id: users.id, name: users.name, role: users.role, comarcaId: users.comarcaId })
    .from(users)
    .where(and(eq(users.role, "defensor"), isNull(users.deletedAt)));

  const matches = candidatos.filter((u) =>
    PARCEIRO_NOMES.some((n) => u.name.toLowerCase().startsWith(n.toLowerCase()))
  );

  if (matches.length === 0) {
    console.error("Nenhum dos nomes alvo (Juliane, Cristiane, Danilo) encontrado entre defensores.");
    process.exit(1);
  }

  console.log(`\nMatches encontrados (${matches.length}):`);
  for (const m of matches) {
    console.log(`  - id=${m.id}  name="${m.name}"  comarca_id=${m.comarcaId}`);
  }

  // Filtro adicional: nunca registrar o proprio Rodrigo como parceiro de si mesmo.
  const toInsert = matches.filter((m) => m.id !== rodrigo.id);

  if (!apply) {
    console.log(`\nDRY-RUN. Para inserir: rode novamente com --apply.`);
    console.log(`Vai inserir ${toInsert.length} parceiros para Rodrigo (id=${rodrigo.id}).`);
    process.exit(0);
  }

  let inserted = 0;
  for (const p of toInsert) {
    const result = await db
      .insert(defensorParceiros)
      .values({ defensorId: rodrigo.id, parceiroId: p.id })
      .onConflictDoNothing()
      .returning({ id: defensorParceiros.id });
    if (result.length > 0) {
      console.log(`  Inserido: ${p.name} (id=${p.id}) -> row id=${result[0].id}`);
      inserted++;
    } else {
      console.log(`  Ja existia: ${p.name} (id=${p.id})`);
    }
  }
  console.log(`\nTotal inserido: ${inserted}/${toInsert.length}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
