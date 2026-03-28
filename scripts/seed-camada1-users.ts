/**
 * Script de Seed - Camada 1 (Primeira Onda de Escalada)
 *
 * Cria 5 usuários para a primeira onda de expansão do OMBUDS:
 *   1. Danilo       — defensor, Varas Criminais Camaçari
 *   2. Cristiane    — defensora, Varas Criminais Camaçari
 *   3. Est. Danilo  — estagiario, supervisor: Danilo
 *   4. Est. Cristiane — estagiario, supervisor: Cristiane
 *   5. Renan        — servidor, defensoresVinculados: [Danilo, Cristiane]
 *
 * Uso:
 *   npx tsx scripts/seed-camada1-users.ts
 */

import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const DEFAULT_PASSWORD = "Ombuds2026!";
const COMARCA_ID = 1; // Camaçari

async function seedCamada1() {
  console.log("Iniciando seed Camada 1...\n");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // -------------------------------------------------------
  // 1. Danilo — defensor
  // -------------------------------------------------------
  let daniloId: number;
  {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, "danilo@defensoria.ba.def.br"),
    });

    if (existing) {
      daniloId = existing.id;
      console.log(`[SKIP] Danilo já existe (id=${daniloId})`);
    } else {
      const [created] = await db
        .insert(users)
        .values({
          name: "Danilo",
          email: "danilo@defensoria.ba.def.br",
          passwordHash,
          role: "defensor",
          comarca: "Varas Criminais Camaçari",
          comarcaId: COMARCA_ID,
          emailVerified: true,
          approvalStatus: "approved",
          podeVerTodosAssistidos: false,
          podeVerTodosProcessos: false,
        })
        .returning();

      daniloId = created.id;
      console.log(`[OK] Danilo criado — id=${daniloId}`);
    }
  }

  // -------------------------------------------------------
  // 2. Cristiane — defensora
  // -------------------------------------------------------
  let cristianeId: number;
  {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, "cristiane@defensoria.ba.def.br"),
    });

    if (existing) {
      cristianeId = existing.id;
      console.log(`[SKIP] Cristiane já existe (id=${cristianeId})`);
    } else {
      const [created] = await db
        .insert(users)
        .values({
          name: "Cristiane",
          email: "cristiane@defensoria.ba.def.br",
          passwordHash,
          role: "defensor",
          comarca: "Varas Criminais Camaçari",
          comarcaId: COMARCA_ID,
          emailVerified: true,
          approvalStatus: "approved",
          podeVerTodosAssistidos: false,
          podeVerTodosProcessos: false,
        })
        .returning();

      cristianeId = created.id;
      console.log(`[OK] Cristiane criada — id=${cristianeId}`);
    }
  }

  // -------------------------------------------------------
  // 3. Estagiário(a) de Danilo — estagiario
  // -------------------------------------------------------
  {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, "est.danilo@defensoria.ba.def.br"),
    });

    if (existing) {
      console.log(`[SKIP] Estagiário(a) de Danilo já existe (id=${existing.id})`);
    } else {
      const [created] = await db
        .insert(users)
        .values({
          name: "Estagiário(a) de Danilo",
          email: "est.danilo@defensoria.ba.def.br",
          passwordHash,
          role: "estagiario",
          comarca: "Varas Criminais Camaçari",
          comarcaId: COMARCA_ID,
          emailVerified: true,
          approvalStatus: "approved",
          supervisorId: daniloId,
        })
        .returning();

      console.log(
        `[OK] Estagiário(a) de Danilo criado(a) — id=${created.id}, supervisorId=${daniloId}`
      );
    }
  }

  // -------------------------------------------------------
  // 4. Estagiário(a) de Cristiane — estagiario
  // -------------------------------------------------------
  {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, "est.cristiane@defensoria.ba.def.br"),
    });

    if (existing) {
      console.log(
        `[SKIP] Estagiário(a) de Cristiane já existe (id=${existing.id})`
      );
    } else {
      const [created] = await db
        .insert(users)
        .values({
          name: "Estagiário(a) de Cristiane",
          email: "est.cristiane@defensoria.ba.def.br",
          passwordHash,
          role: "estagiario",
          comarca: "Varas Criminais Camaçari",
          comarcaId: COMARCA_ID,
          emailVerified: true,
          approvalStatus: "approved",
          supervisorId: cristianeId,
        })
        .returning();

      console.log(
        `[OK] Estagiário(a) de Cristiane criado(a) — id=${created.id}, supervisorId=${cristianeId}`
      );
    }
  }

  // -------------------------------------------------------
  // 5. Renan — servidor vinculado a Danilo e Cristiane
  // -------------------------------------------------------
  {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, "renan@defensoria.ba.def.br"),
    });

    if (existing) {
      console.log(`[SKIP] Renan já existe (id=${existing.id})`);
    } else {
      const [created] = await db
        .insert(users)
        .values({
          name: "Renan",
          email: "renan@defensoria.ba.def.br",
          passwordHash,
          role: "servidor",
          comarca: "Varas Criminais Camaçari",
          comarcaId: COMARCA_ID,
          emailVerified: true,
          approvalStatus: "approved",
          defensoresVinculados: [daniloId, cristianeId],
        })
        .returning();

      console.log(
        `[OK] Renan criado — id=${created.id}, defensoresVinculados=[${daniloId}, ${cristianeId}]`
      );
    }
  }

  console.log("\nSeed Camada 1 concluido.");
  console.log(`Senha padrao: ${DEFAULT_PASSWORD}`);

  process.exit(0);
}

seedCamada1().catch((error) => {
  console.error("Erro fatal:", error);
  process.exit(1);
});
