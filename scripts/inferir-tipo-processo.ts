/**
 * Infere `processos.tipoProcesso` a partir de `classeProcessual` e `assunto`
 * em processos antigos onde tipoProcesso='AP' (default) mas a classe sugere
 * outro tipo (REVOGACAO, HC, RECURSO, MPU, IP, EP).
 *
 * Uso:
 *   npx tsx scripts/inferir-tipo-processo.ts            # dry-run (sugere)
 *   npx tsx scripts/inferir-tipo-processo.ts --apply    # aplica updates
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");

const REGRAS: { match: RegExp; tipo: string; descricao: string }[] = [
  // MPU — Lei Maria da Penha (mais específico primeiro)
  { match: /medida.*protetiva|maria.*penha|lei.*11\.?340/i, tipo: "MPU", descricao: "Medida Protetiva" },
  // Habeas Corpus
  { match: /habeas.*corpus|\bhc\b/i, tipo: "HC", descricao: "Habeas Corpus" },
  // Revogação de prisão
  { match: /revoga[çc][ãa]o.*pris[ãa]o|revoga[çc][ãa]o.*preventiva/i, tipo: "REVOGACAO", descricao: "Revogação de Prisão" },
  // Recursos
  { match: /apela[çc][ãa]o|recurso.*estrito|recurso.*sentido|embargos|agravo/i, tipo: "RECURSO", descricao: "Recurso" },
  // Inquérito Policial
  { match: /inqu[ée]rito.*policial|^ip\s|\bipl\b/i, tipo: "IP", descricao: "Inquérito Policial" },
  // Execução Penal
  { match: /execu[çc][ãa]o.*penal|guia.*recolhimento/i, tipo: "EP", descricao: "Execução Penal" },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", connect_timeout: 10 });

  try {
    console.log(`==> Modo: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

    const processos = await sql<{
      id: number;
      numero_autos: string | null;
      classe_processual: string | null;
      assunto: string | null;
      tipo_processo: string | null;
    }[]>`
      SELECT id, numero_autos, classe_processual, assunto, tipo_processo
      FROM processos
      WHERE (tipo_processo = 'AP' OR tipo_processo IS NULL)
        AND deleted_at IS NULL
        AND (classe_processual IS NOT NULL OR assunto IS NOT NULL)
    `;

    console.log(`==> ${processos.length} processos com tipo='AP' candidatos a reanálise\n`);

    const sugestoes: { id: number; numero: string; classe: string; novoTipo: string; regra: string }[] = [];

    for (const p of processos) {
      const texto = `${p.classe_processual ?? ""} ${p.assunto ?? ""}`.trim();
      if (!texto) continue;

      for (const regra of REGRAS) {
        if (regra.match.test(texto)) {
          sugestoes.push({
            id: p.id,
            numero: p.numero_autos ?? "s/n",
            classe: (p.classe_processual ?? p.assunto ?? "").slice(0, 50),
            novoTipo: regra.tipo,
            regra: regra.descricao,
          });
          break; // primeira regra ganha (mais específica está no topo)
        }
      }
    }

    if (sugestoes.length === 0) {
      console.log("Nenhuma sugestão. Todos os processos já parecem corretamente tipados.");
      return;
    }

    console.log(`==> ${sugestoes.length} sugestões:\n`);
    console.table(sugestoes.slice(0, 50));
    if (sugestoes.length > 50) console.log(`(e mais ${sugestoes.length - 50}…)`);

    // Distribuição
    const dist = sugestoes.reduce<Record<string, number>>((acc, s) => {
      acc[s.novoTipo] = (acc[s.novoTipo] ?? 0) + 1;
      return acc;
    }, {});
    console.log("\n==> Distribuição:");
    Object.entries(dist).forEach(([tipo, count]) => console.log(`   ${tipo}: ${count}`));

    if (!APPLY) {
      console.log("\n(Dry-run. Para aplicar: npx tsx scripts/inferir-tipo-processo.ts --apply)");
      return;
    }

    console.log("\n==> Aplicando updates…");
    for (const s of sugestoes) {
      await sql`UPDATE processos SET tipo_processo = ${s.novoTipo}, updated_at = NOW() WHERE id = ${s.id}`;
    }
    console.log(`==> ${sugestoes.length} processos atualizados.`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
