/**
 * Migra pareceres (legado) para encaminhamentos (novo modelo).
 *
 * Uso:
 *   tsx scripts/migrate-pareceres-to-encaminhamentos.ts            # dry-run
 *   tsx scripts/migrate-pareceres-to-encaminhamentos.ts --apply    # aplica
 *
 * Idempotente: checa se já existe encaminhamento com
 * (remetenteId = solicitante, tipo='parecer', createdAt = dataSolicitacao)
 * e pula se sim. Pode ser rodado várias vezes sem duplicar.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "@/lib/db";
import {
  pareceres,
  encaminhamentos,
  encaminhamentoDestinatarios,
  encaminhamentoRespostas,
} from "@/lib/db/schema/cowork";
import { eq, and } from "drizzle-orm";

const APPLY = process.argv.includes("--apply");
const DRY = !APPLY;

async function main() {
  console.log(DRY ? "[DRY-RUN]" : "[APPLY]", "migrando pareceres → encaminhamentos");

  const all = await db.select().from(pareceres);
  console.log(`Encontrados ${all.length} pareceres`);

  let migrados = 0;
  let pulados = 0;

  for (const p of all) {
    const [existing] = await db
      .select()
      .from(encaminhamentos)
      .where(and(
        eq(encaminhamentos.remetenteId, p.solicitanteId),
        eq(encaminhamentos.tipo, "parecer"),
        eq(encaminhamentos.createdAt, p.dataSolicitacao),
      ))
      .limit(1);

    if (existing) {
      pulados++;
      continue;
    }

    const status =
      p.status === "respondido" && p.dataResposta ? "respondido" :
      p.status === "lido" ? "concluido" :
      "pendente";

    if (DRY) {
      console.log(`  would migrate parecer #${p.id} (status=${p.status} → ${status})`);
      migrados++;
      continue;
    }

    const [enc] = await db
      .insert(encaminhamentos)
      .values({
        workspaceId: 1,
        remetenteId: p.solicitanteId,
        tipo: "parecer",
        titulo: null,
        mensagem: p.pergunta,
        assistidoId: p.assistidoId,
        processoId: p.processoId,
        status,
        urgencia: p.urgencia,
        createdAt: p.dataSolicitacao,
        updatedAt: p.dataResposta ?? p.dataSolicitacao,
      })
      .returning();

    await db.insert(encaminhamentoDestinatarios).values({
      encaminhamentoId: enc.id,
      userId: p.respondedorId,
      estadoPessoal: p.status === "lido" ? "ciente" : "pendente",
      cienteEm: p.status === "lido" ? p.dataResposta : null,
    });

    if (p.resposta && p.dataResposta) {
      await db.insert(encaminhamentoRespostas).values({
        encaminhamentoId: enc.id,
        autorId: p.respondedorId,
        mensagem: p.resposta,
        createdAt: p.dataResposta,
      });
    }

    migrados++;
  }

  console.log(`\nMigrados: ${migrados} · Pulados (já existentes): ${pulados}`);
  if (DRY) console.log("Rode com --apply para aplicar de fato.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
