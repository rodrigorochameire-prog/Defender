import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.production.local") });
config({ path: resolve(process.cwd(), ".env.local") });

import { readSheet } from "@/lib/services/google-sheets";

async function main() {
  const rows = await readSheet("Violência Doméstica");
  console.log(`Total: ${rows.length} linhas\n`);
  rows.forEach((r, i) => {
    if (!r) return;
    const id = (r[0] ?? "").padEnd(5);
    const status = (r[1] ?? "").padEnd(15);
    const assistido = (r[4] ?? "").padEnd(40);
    const autos = (r[5] ?? "").padEnd(28);
    const ato = (r[6] ?? "").padEnd(35);
    console.log(`row=${(i + 1).toString().padStart(2)}  id=${id}  ${status}  ${assistido}  ${autos}  ${ato}`);
  });
}
main().then(() => process.exit(0));
