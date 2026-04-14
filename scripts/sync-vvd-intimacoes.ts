/**
 * Push manual de todas as intimações VVD ativas (sem demandaId) para a aba
 * "Violência Doméstica". Usado para reconciliar a planilha com as intimações
 * já importadas antes do auto-sync existir.
 *
 * Uso:
 *   npx tsx scripts/sync-vvd-intimacoes.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env.local") });

import { syncVVDIntimacoesToSheet } from "@/lib/services/vvd-sync";

async function main() {
  console.log("Sincronizando intimações VVD para a planilha...");
  const stats = await syncVVDIntimacoesToSheet();
  console.log(`Consideradas: ${stats.considered}`);
  console.log(`Enviadas:     ${stats.pushed}`);
  if (stats.errors.length > 0) {
    console.log(`Erros:        ${stats.errors.length}`);
    for (const e of stats.errors) console.log("  -", e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ERRO:", err);
    process.exit(1);
  });
