#!/usr/bin/env node
/**
 * Backfill: transforma strings existentes em entidades pessoas.
 * Fontes:
 *   1. testemunhas (nome + processo_id + tipo)
 *   2. processos.juiz (distinct string)
 *   3. processos.promotor (distinct string)
 *   4. audiencias.juiz / audiencias.promotor (dedup com #2/#3)
 *   5. processos.vitima (se coluna existir)
 *   6. atendimentos.enrichment_data.persons_mentioned[] (sem participação — fica em limbo)
 *
 * Idempotente: re-run não duplica (checa por nome_normalizado + papel + processo).
 * Suporta --dry-run.
 */
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const DRY = process.argv.includes("--dry-run");

function normalizarNome(s) {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\b(dr|dra|sr|sra|pm|pc|pf|cb|sgt|sub|insp|esc|inv|tte|cabo|soldado)\.?\s+/gi,
      " ",
    )
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const sql = postgres(process.env.DATABASE_URL, { max: 3 });

const counters = {
  pessoasCriadas: 0,
  pessoasExistentes: 0,
  participacoesCriadas: 0,
  participacoesExistentes: 0,
  warnings: 0,
};

async function getOrCreatePessoa({ nome, fonte, categoriaPrimaria, confidence = 0.9 }) {
  const nomeNorm = normalizarNome(nome);
  if (!nomeNorm || nomeNorm.length < 2) {
    counters.warnings++;
    return null;
  }
  const existing = await sql`
    SELECT id FROM pessoas
    WHERE nome_normalizado = ${nomeNorm}
      AND merged_into IS NULL
    LIMIT 1
  `;
  if (existing.length > 0) {
    counters.pessoasExistentes++;
    return existing[0].id;
  }
  if (DRY) {
    counters.pessoasCriadas++;
    return -1;
  }
  const [row] = await sql`
    INSERT INTO pessoas (nome, nome_normalizado, fonte_criacao, categoria_primaria, confidence)
    VALUES (${nome.trim()}, ${nomeNorm}, ${fonte}, ${categoriaPrimaria}, ${confidence})
    RETURNING id
  `;
  counters.pessoasCriadas++;
  return row.id;
}

async function addParticipacao({ pessoaId, processoId, papel, fonte, testemunhaId = null, lado = null, confidence = 0.9 }) {
  if (!pessoaId || pessoaId === -1) return;
  const exists = await sql`
    SELECT id FROM participacoes_processo
    WHERE pessoa_id = ${pessoaId} AND processo_id = ${processoId} AND papel = ${papel}
    LIMIT 1
  `;
  if (exists.length > 0) {
    counters.participacoesExistentes++;
    return;
  }
  if (DRY) {
    counters.participacoesCriadas++;
    return;
  }
  try {
    await sql`
      INSERT INTO participacoes_processo
        (pessoa_id, processo_id, papel, lado, testemunha_id, fonte, confidence)
      VALUES
        (${pessoaId}, ${processoId}, ${papel}, ${lado}, ${testemunhaId}, ${fonte}, ${confidence})
      ON CONFLICT DO NOTHING
    `;
    counters.participacoesCriadas++;
  } catch (e) {
    counters.warnings++;
  }
}

function papelFromTestemunhaTipo(tipo) {
  const t = (tipo || "").toString().toLowerCase();
  switch (t) {
    case "vitima":
    case "vítima":
      return { papel: "vitima", lado: "acusacao" };
    case "acusacao":
    case "acusação":
      return { papel: "testemunha", lado: "acusacao" };
    case "defesa":
      return { papel: "testemunha-defesa", lado: "defesa" };
    case "informante":
      return { papel: "informante", lado: "neutro" };
    case "perito":
      return { papel: "perito-criminal", lado: "neutro" };
    default:
      return { papel: "testemunha", lado: null };
  }
}

async function columnExists(table, column) {
  const res = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  return res.length > 0;
}

async function main() {
  console.log(DRY ? "DRY RUN — nenhuma inserção real\n" : "BACKFILL\n");

  // 1. Testemunhas
  console.log("1/5 Testemunhas...");
  const testemunhas = await sql`
    SELECT id, processo_id, nome, tipo
    FROM testemunhas
    WHERE nome IS NOT NULL AND nome != ''
  `;
  console.log(`  encontradas: ${testemunhas.length}`);
  for (const t of testemunhas) {
    const { papel, lado } = papelFromTestemunhaTipo(t.tipo);
    const pessoaId = await getOrCreatePessoa({
      nome: t.nome,
      fonte: "backfill",
      categoriaPrimaria: papel,
      confidence: 0.9,
    });
    if (t.processo_id) {
      await addParticipacao({
        pessoaId,
        processoId: t.processo_id,
        papel,
        lado,
        testemunhaId: t.id,
        fonte: "backfill",
      });
    }
  }

  // 2. Juízes dos processos
  console.log("2/5 Juízes...");
  const hasJuiz = await columnExists("processos", "juiz");
  if (hasJuiz) {
    const juizesProc = await sql`
      SELECT id, juiz FROM processos WHERE juiz IS NOT NULL AND juiz != ''
    `;
    console.log(`  processos com juiz: ${juizesProc.length}`);
    for (const p of juizesProc) {
      const pessoaId = await getOrCreatePessoa({
        nome: p.juiz,
        fonte: "backfill",
        categoriaPrimaria: "juiz",
        confidence: 0.85,
      });
      await addParticipacao({
        pessoaId,
        processoId: p.id,
        papel: "juiz",
        fonte: "backfill",
        confidence: 0.85,
      });
    }
  } else {
    console.log("  coluna processos.juiz não existe — skip");
  }

  // 3. Promotores dos processos
  console.log("3/5 Promotores...");
  const hasPromotor = await columnExists("processos", "promotor");
  if (hasPromotor) {
    const promotoresProc = await sql`
      SELECT id, promotor FROM processos WHERE promotor IS NOT NULL AND promotor != ''
    `;
    console.log(`  processos com promotor: ${promotoresProc.length}`);
    for (const p of promotoresProc) {
      const pessoaId = await getOrCreatePessoa({
        nome: p.promotor,
        fonte: "backfill",
        categoriaPrimaria: "promotor",
        confidence: 0.85,
      });
      await addParticipacao({
        pessoaId,
        processoId: p.id,
        papel: "promotor",
        fonte: "backfill",
        confidence: 0.85,
      });
    }
  } else {
    console.log("  coluna processos.promotor não existe — skip");
  }

  // 4. Vítimas (string em processos.vitima)
  console.log("4/5 Vítimas (string)...");
  const hasVitima = await columnExists("processos", "vitima");
  if (hasVitima) {
    const vitimas = await sql`
      SELECT id, vitima FROM processos WHERE vitima IS NOT NULL AND vitima != ''
    `;
    console.log(`  processos com vítima: ${vitimas.length}`);
    for (const v of vitimas) {
      const pessoaId = await getOrCreatePessoa({
        nome: v.vitima,
        fonte: "backfill",
        categoriaPrimaria: "vitima",
        confidence: 0.8,
      });
      await addParticipacao({
        pessoaId,
        processoId: v.id,
        papel: "vitima",
        lado: "acusacao",
        fonte: "backfill",
        confidence: 0.8,
      });
    }
  } else {
    console.log("  coluna processos.vitima não existe — skip");
  }

  // 5. Persons mentioned em atendimentos.enrichment_data
  console.log("5/5 Persons mentioned (IA)...");
  const hasEnrichment = await columnExists("atendimentos", "enrichment_data");
  if (hasEnrichment) {
    const atendimentos = await sql`
      SELECT id, enrichment_data FROM atendimentos
      WHERE enrichment_data IS NOT NULL
        AND enrichment_data::text LIKE '%persons_mentioned%'
    `;
    console.log(`  atendimentos candidatos: ${atendimentos.length}`);
    for (const a of atendimentos) {
      const ed = a.enrichment_data || {};
      const mentioned = Array.isArray(ed.persons_mentioned) ? ed.persons_mentioned : [];
      for (const m of mentioned) {
        const nome = typeof m === "string" ? m : m?.nome;
        if (!nome) continue;
        await getOrCreatePessoa({
          nome,
          fonte: "ia-atendimento",
          categoriaPrimaria: null,
          confidence: 0.5,
        });
      }
    }
  } else {
    console.log("  coluna atendimentos.enrichment_data não existe — skip");
  }

  console.log("\n=== Resultado ===");
  console.log(`Pessoas criadas:          ${counters.pessoasCriadas}`);
  console.log(`Pessoas já existentes:    ${counters.pessoasExistentes}`);
  console.log(`Participações criadas:    ${counters.participacoesCriadas}`);
  console.log(`Participações existentes: ${counters.participacoesExistentes}`);
  console.log(`Warnings (nome vazio):    ${counters.warnings}`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
