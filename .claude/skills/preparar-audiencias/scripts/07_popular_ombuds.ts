/**
 * Popula audiencias.registro_audiencia (JSON) e audiencias.resumo_defesa (TEXT)
 * a partir de um arquivo JSON contendo o registro estruturado por audiência.
 *
 * Schema do JSON de entrada: ver references/schema_registro_audiencia.md
 *
 * Uso:
 *   npx tsx .claude/skills-cowork/preparar-audiencias/scripts/07_popular_ombuds.ts /path/to/registros.json
 *
 * Estrutura esperada:
 *   [{ "audiencia_id": 530, "registro_audiencia": {...}, "resumo_defesa": "..." }, ...]
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });

import postgres from "postgres";
import * as fs from "fs";

const sql = postgres(process.env.DATABASE_URL!);

const inputPath = process.argv[2];
if (!inputPath) { console.error("Uso: ... 07_popular_ombuds.ts <input.json>"); process.exit(1); }
const items = JSON.parse(fs.readFileSync(inputPath, "utf8")) as any[];

function validarRegistro(r: any): string[] {
  const erros: string[] = [];
  const subtipo = r.subtipo_audiencia ?? "indefinido";
  if (!r.depoentes && !["custodia", "qualificacao"].includes(subtipo)) {
    erros.push(`depoentes ausente (subtipo=${subtipo})`);
  }
  for (const d of r.depoentes ?? []) {
    if (d.intimacao === "nao_intimado" && !d.motivo_nao_intimacao) {
      erros.push(`depoente '${d.nome}' nao_intimado sem motivo`);
    }
    if (d.ja_ouvido?.sim && !d.ja_ouvido.data) {
      erros.push(`depoente '${d.nome}' ja_ouvido sem data`);
    }
  }
  if (!r.tese_defesa?.principal) {
    erros.push("tese_defesa.principal vazia");
  }
  return erros;
}

(async () => {
  let ok = 0;
  let erro = 0;
  await sql.begin(async (tx) => {
    for (const item of items) {
      const erros = validarRegistro(item.registro_audiencia ?? {});
      if (erros.length > 0) {
        console.warn(`#${item.audiencia_id} INVÁLIDO:\n  - ${erros.join("\n  - ")}`);
        erro++;
        continue;
      }
      const r = await tx`
        UPDATE audiencias
        SET registro_audiencia = ${item.registro_audiencia}::jsonb,
            resumo_defesa = ${item.resumo_defesa ?? null},
            anotacoes_versao = anotacoes_versao + 1,
            updated_at = NOW()
        WHERE id = ${item.audiencia_id}
        RETURNING id
      `;
      if (r.length > 0) {
        console.log(`#${item.audiencia_id} ✓ atualizada`);
        ok++;
      } else {
        console.warn(`#${item.audiencia_id} NÃO ENCONTRADA`);
        erro++;
      }
    }
  });
  console.log(`\nResumo: ${ok} ok, ${erro} com erro/inválida.`);
  await sql.end();
})().catch((e) => { console.error(e); process.exit(1); });
