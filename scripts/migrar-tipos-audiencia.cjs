// Canoniza audiencias.tipo (SÓ a coluna; NÃO mexe no título).
// Dry-run por padrão; --apply grava. Espelha o catálogo src/lib/agenda/tipos-audiencia.ts
// (a consistência do mapa é travada pelo teste src/lib/agenda/__tests__/migracao-tipos.test.ts).
//
// Por que não reescrever o título: desde o PR #108/PR-A a badge da agenda resolve o tipo
// pela COLUNA `tipo` (extrairTipoEvento), não pelo título. Reescrever o título normalizaria
// o prefixo de sigla à força e destruiria texto informativo (ex.: "Depoimento Especial
// (Mutirão VVD) - Nome" viraria "Oitiva Especial - Nome", perdendo a anotação do mutirão).
// "Depoimento Especial" e "Oitiva Especial" são sinônimos — manter o título descritivo.
//
// Env: lê .env.local da raiz do repo (o worktree não tem o arquivo, que é gitignored).
const path = require("path");
const ROOT_ENV = path.resolve(__dirname, "..", ".env.local");
require("dotenv").config({ path: ROOT_ENV, quiet: true });
// Fallback: se rodando a partir da raiz, o caminho acima já resolve; senão tenta o cwd.
if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  require("dotenv").config({ path: ".env.local", quiet: true });
}
const postgres = require("postgres");
const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("SEM DATABASE_URL/POSTGRES_URL no ambiente.");
  process.exit(2);
}
const sql = postgres(url, { ssl: "require" });

// origem (lower, trim) → [descrição canônica, sigla]
const MAPA = {
  "audiência de instrução e julgamento": ["Audiência de Instrução e Julgamento", "AIJ"],
  "instrução e julgamento": ["Audiência de Instrução e Julgamento", "AIJ"],
  "instrução": ["Audiência de Instrução e Julgamento", "AIJ"],
  "instrucao": ["Audiência de Instrução e Julgamento", "AIJ"],
  "aij": ["Audiência de Instrução e Julgamento", "AIJ"],
  "continuação de instrução / acareação": ["Audiência de Instrução e Julgamento", "AIJ"],
  "oitiva especial": ["Oitiva Especial", "Oitiva Especial"],
  "depoimento especial": ["Oitiva Especial", "Oitiva Especial"],
  "oitiva_especializada": ["Oitiva Especial", "Oitiva Especial"],
  "justificação": ["Justificação", "Justificação"],
  "audiência de justificação": ["Justificação", "Justificação"],
  "sessão de julgamento do tribunal do júri": ["Sessão de Julgamento do Tribunal do Júri", "Júri"],
  "audiência admonitória": ["Audiência Admonitória", "Admonitória"],
  "produção antecipada de provas": ["Produção Antecipada de Provas", "PAP"],
  "instrução + depoimento especial": ["Instrução + Depoimento Especial", "Instrução + Oitiva"],
  "audiencia": ["Audiência", "Audiência"],
  "audiência": ["Audiência", "Audiência"],
};

(async () => {
  const rows = await sql`select id, tipo from audiencias`;
  const resumo = {};
  let mudancas = 0;
  for (const r of rows) {
    const chave = (r.tipo ?? "").trim().toLowerCase();
    const alvo = MAPA[chave];
    if (!alvo) continue; // já canônico ou desconhecido — não toca
    const descricao = alvo[0];
    if (r.tipo === descricao) continue; // já está na forma canônica
    resumo[r.tipo] = (resumo[r.tipo] || 0) + 1;
    mudancas++;
    if (APPLY) {
      await sql`update audiencias set tipo = ${descricao} where id = ${r.id}`;
    }
  }
  console.log(`Linhas a alterar: ${mudancas}`);
  for (const [origem, n] of Object.entries(resumo).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${origem}`);
  }
  console.log(APPLY ? "\n[APPLY] gravado." : "\n[DRY-RUN] nada gravado. Rode com --apply para aplicar.");
  await sql.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
