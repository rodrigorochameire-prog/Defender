/**
 * Enriquece via DataJud os processos com tipo_processo NULL ou divergente.
 *
 * Usa a APIKey pública vigente do DataJud (CNJ rotaciona — cf.
 * https://datajud-wiki.cnj.jus.br/api-publica/acesso). Para cada processo:
 *   1. Normaliza CNJ pra 20 dígitos (sem pontuação)
 *   2. Query DataJud TJBA → classe.nome, orgaoJulgador.nome, assuntos
 *   3. Mapeia classe.nome → tipo curto via classifyTipoProcesso
 *   4. UPDATE processos SET tipo_processo, classe_processual, vara, assunto
 *
 * Idempotente: respeita campos já preenchidos (não sobrescreve classe/vara
 * existentes), só completa o que está NULL.
 */
import postgres from "postgres";
import { config } from "dotenv";
config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });

const DATAJUD_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

// Mapeamento idêntico ao `src/lib/utils/processo-classification.ts`. Mantido
// duplicado aqui pra script standalone — sincronize ao alterar o canônico.
const EXACT_MAP = {
  "Ação Penal": "AP",
  "Ação Penal - Procedimento Ordinário": "AP",
  "Ação Penal - Procedimento do Júri": "AP",
  "Ação Penal - Procedimento Sumário": "AP",
  "Ação Penal - Procedimento Sumaríssimo": "AP",
  "Inquérito Policial": "IP",
  "Auto de Prisão em Flagrante": "APF",
  "Medidas Protetivas de Urgência": "MPU",
  "Medida Protetiva de Urgência": "MPU",
  "Medida Cautelar": "CAUTELAR",
  "Medida Cautelar Inominada": "CAUTELAR",
  "Cautelar Inominada Criminal": "CAUTELAR",
  "Prisão Preventiva": "PPP",
  "Produção Antecipada de Provas": "PAP",
  "Liberdade Provisória": "LP",
  "Pedido de Liberdade Provisória": "LP",
  "Pedido de Revogação de Prisão Preventiva": "LP",
  "Revogação de Prisão Preventiva": "LP",
  "Pedido de Revogação de Medida Protetiva": "LP",
  "Revogação de Medida Protetiva": "LP",
  "Execução Penal": "EP",
  "Execução da Pena": "EP",
  "Execução de ANPP": "EANPP",
  "Acordo de Não Persecução Penal": "EANPP",
  "Habeas Corpus": "HC",
  "Recurso em Sentido Estrito": "RESE",
  "Apelação Criminal": "APELACAO",
  "Agravo em Execução Penal": "AGRAVO",
};

const PARTIAL_MAP = [
  [/liberdade\s+provis/i, "LP"],
  [/revoga[çc][aã]o.*pris/i, "LP"],
  [/revoga[çc][aã]o.*(medida\s+)?protet/i, "LP"],
  [/pedido.*revoga/i, "LP"],
  [/med.*protet/i, "MPU"],
  [/inqu[eé]rito/i, "IP"],
  [/flagrante/i, "APF"],
  [/execu[çc][aã]o.*penal/i, "EP"],
  [/execu[çc][aã]o.*pena/i, "EP"],
  [/execu[çc][aã]o.*anpp/i, "EANPP"],
  [/habeas/i, "HC"],
  [/cautelar/i, "CAUTELAR"],
  [/protetiva/i, "MPU"],
  [/produ[çc][aã]o.*antecipada/i, "PAP"],
  [/pris[aã]o.*preventiva/i, "PPP"],
  [/a[çc][aã]o\s+penal/i, "AP"],
  [/apela[çc][aã]o/i, "APELACAO"],
  [/agravo/i, "AGRAVO"],
];

function classify(classe) {
  if (!classe) return null;
  const trimmed = classe.trim();
  if (EXACT_MAP[trimmed]) return EXACT_MAP[trimmed];
  for (const [re, t] of PARTIAL_MAP) if (re.test(trimmed)) return t;
  return null;
}

function normalizeCnj(cnj) {
  return cnj.replace(/[^0-9]/g, "");
}

async function fetchDatajud(cnj) {
  const numero = normalizeCnj(cnj);
  if (numero.length !== 20) return { error: `cnj_inválido (${numero.length} dígitos)` };
  const r = await fetch("https://api-publica.datajud.cnj.jus.br/api_publica_tjba/_search", {
    method: "POST",
    headers: {
      Authorization: `APIKey ${DATAJUD_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: numero } } }),
  });
  if (!r.ok) return { error: `http_${r.status}` };
  const data = await r.json();
  const hit = data?.hits?.hits?.[0]?._source;
  if (!hit) return { error: "not_indexed" };
  return {
    classe: hit.classe?.nome || null,
    vara: hit.orgaoJulgador?.nome || null,
    assunto: (hit.assuntos || []).map((a) => a.nome).join("; ") || null,
  };
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

  const targets = await sql`
    SELECT id, numero_autos
    FROM processos
    WHERE tipo_processo IS NULL
      AND classe_processual IS NULL
      AND created_at >= '2026-05-04'
    ORDER BY id
  `;
  console.log(`> ${targets.length} processos pendentes`);

  let ok = 0, miss = 0, err = 0;
  const sample = process.argv.includes("--dry-run");

  for (const p of targets) {
    process.stdout.write(`  ${p.id} | ${p.numero_autos} ... `);
    try {
      const r = await fetchDatajud(p.numero_autos);
      if (r.error) {
        console.log(`SKIP (${r.error})`);
        miss++;
        continue;
      }
      const tipo = classify(r.classe);
      console.log(`classe="${r.classe}" → tipo=${tipo || "?"} | vara=${r.vara}`);
      if (!sample) {
        await sql`
          UPDATE processos
             SET classe_processual = ${r.classe},
                 tipo_processo = ${tipo},
                 vara = ${r.vara},
                 assunto = COALESCE(assunto, ${r.assunto}),
                 updated_at = NOW()
           WHERE id = ${p.id}
        `;
      }
      ok++;
    } catch (e) {
      console.log(`ERR ${e.message}`);
      err++;
    }
    await new Promise((r) => setTimeout(r, 250)); // gentil com a API
  }

  console.log(`\n> done: ${ok} atualizados, ${miss} not_indexed, ${err} errors${sample ? " [DRY RUN]" : ""}`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
