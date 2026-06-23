/**
 * Backfill Pessoa 360° — popula o grafo a partir de dados existentes.
 * Roda: depoentes→pessoas (inclui case_personas + analysisData) e familiares.
 * Geocoding fica a cargo do cron /api/cron/geocode-faltantes.
 *
 * Uso:
 *   npx tsx scripts/backfill-pessoa-360.ts            # batch padrão (validação)
 *   LIMITE=1469 npx tsx scripts/backfill-pessoa-360.ts  # varredura completa
 *
 * Idempotente: re-rodar não duplica (fonteRef + flags pessoasPromovidasEm).
 */
import { join } from "path";

async function main() {
  const dotenv = await import("dotenv");
  dotenv.config({ path: join(process.cwd(), ".env.local") });

  const limite = Number(process.env.LIMITE ?? 15);
  console.log(`[backfill-pessoa-360] limite=${limite}`);

  // Import dinâmico DEPOIS do dotenv (o módulo db lê DATABASE_URL no import).
  const { backfillPromocaoPessoas, backfillPromocaoDepoentes } = await import("@/lib/promocao/backfill");
  const { backfillFamiliares } = await import("@/lib/promocao/backfill-familiares");

  // Amplo: processos com case_personas OU analysisData.pessoas (a maior parte da carga).
  // promoverProcesso já inclui depoentes (testemunhas) internamente.
  console.log("\n→ Promoção AMPLA de pessoas (case_personas + analysisData + depoentes)...");
  const pes = await backfillPromocaoPessoas({ limite });
  console.log("  contadores:", JSON.stringify(pes));

  // Catch: processos que SÓ têm testemunhas (sem case_personas/analysisData).
  console.log("\n→ Catch de processos só-depoentes...");
  const dep = await backfillPromocaoDepoentes({ limite });
  console.log("  contadores:", JSON.stringify(dep));

  // Familiares: roda para ambos os escopos de workspace (pessoas existem em null e 1).
  console.log("\n→ Backfill de familiares (workspace null)...");
  const famNull = await backfillFamiliares({ limite: 1000, workspaceId: null });
  console.log("  contadores:", JSON.stringify(famNull));
  console.log("\n→ Backfill de familiares (workspace 1)...");
  const fam1 = await backfillFamiliares({ limite: 1000, workspaceId: 1 });
  console.log("  contadores:", JSON.stringify(fam1));

  // Totais finais para conferência.
  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");
  const totals = await db.execute(sql`
    select
      (select count(*) from pessoas where merged_into is null) as pessoas,
      (select count(*) from participacoes_processo) as participacoes,
      (select count(*) from pessoa_relacoes) as relacoes,
      (select count(*) from processos where pessoas_promovidas_em is null) as processos_pendentes,
      (select count(*) from pessoas where confidence < 1 and merged_into is null) as pessoas_revisao
  `);
  console.log("\n📊 Totais:", JSON.stringify((totals as unknown as { rows?: unknown[] }).rows ?? totals));

  console.log("\n✅ Backfill concluído.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Backfill falhou:", e);
  process.exit(1);
});
